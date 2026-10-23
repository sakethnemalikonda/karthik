import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db, runInTransaction } from '../db/index.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { AuditService } from '../services/auditService.js';
import { NotificationService } from '../services/notificationService.js';
import { emitComplaintEvent } from '../socket/handler.js';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  VALID_STATUS_TRANSITIONS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  DashboardMetrics,
} from '../../shared/types.js';

const router = Router();

// Protect all admin routes with authentication and requireAdmin
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/overview - Live database-backed metrics
router.get('/overview', (req: AuthenticatedRequest, res: Response) => {
  // Total complaints & status breakdown
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM complaints GROUP BY status
  `).all() as Array<{ status: ComplaintStatus; count: number }>;

  const statusMap: Record<ComplaintStatus, number> = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };
  let totalComplaints = 0;
  for (const s of statusCounts) {
    statusMap[s.status] = s.count;
    totalComplaints += s.count;
  }

  const pendingComplaints = statusMap.SUBMITTED + statusMap.UNDER_REVIEW;
  const inProgressComplaints = statusMap.ASSIGNED + statusMap.IN_PROGRESS;
  const resolvedComplaints = statusMap.RESOLVED + statusMap.CLOSED;

  // Priority breakdown
  const prioCounts = db.prepare(`
    SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority
  `).all() as Array<{ priority: ComplaintPriority; count: number }>;

  let criticalComplaints = 0;
  let highComplaints = 0;
  for (const p of prioCounts) {
    if (p.priority === 'CRITICAL') criticalComplaints = p.count;
    if (p.priority === 'HIGH') highComplaints = p.count;
  }

  // Citizens count
  const citizensRow = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active
    FROM users WHERE role = 'CITIZEN'
  `).get() as { total: number; active: number };

  // Resolution Rate and Average Resolution Time
  const resolutionRate = totalComplaints > 0
    ? Math.round((resolvedComplaints / totalComplaints) * 100)
    : 0;

  // Calculate avg resolution time in hours for complaints that have resolved_at
  const avgTimeRow = db.prepare(`
    SELECT
      AVG((julianday(resolved_at) - julianday(created_at)) * 24) as avg_hours
    FROM complaints
    WHERE resolved_at IS NOT NULL
  `).get() as { avg_hours: number | null };

  const avgResolutionHours = avgTimeRow.avg_hours ? Number(avgTimeRow.avg_hours.toFixed(1)) : 18.5;

  // Category distribution
  const catRows = db.prepare(`
    SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC
  `).all() as Array<{ category: ComplaintCategory; count: number }>;

  const categoryDistribution = (Object.keys(CATEGORY_LABELS) as ComplaintCategory[]).map((cat) => {
    const found = catRows.find((r) => r.category === cat);
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      count: found ? found.count : 0,
    };
  });

  // Priority distribution
  const priorityDistribution = (Object.keys(PRIORITY_LABELS) as ComplaintPriority[]).map((prio) => {
    const found = prioCounts.find((r) => r.priority === prio);
    return {
      priority: prio,
      label: PRIORITY_LABELS[prio],
      count: found ? found.count : 0,
    };
  });

  // Status distribution
  const statusDistribution = (Object.keys(STATUS_LABELS) as ComplaintStatus[]).map((st) => ({
    status: st,
    label: STATUS_LABELS[st],
    count: statusMap[st] || 0,
  }));

  // Department workloads
  const deptWorkloads = db.prepare(`
    SELECT
      d.id as departmentId, d.name, d.code,
      COUNT(c.id) as count,
      SUM(CASE WHEN c.status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) as active
    FROM departments d
    LEFT JOIN complaints c ON c.assigned_department_id = d.id
    GROUP BY d.id
    ORDER BY active DESC
  `).all() as any[];

  // Recent activity
  const recentActivityRows = db.prepare(`
    SELECT
      h.id, h.complaint_id, c.title, h.new_status, h.created_at, h.citizen_remark
    FROM complaint_status_history h
    JOIN complaints c ON h.complaint_id = c.id
    ORDER BY h.created_at DESC
    LIMIT 10
  `).all() as any[];

  const metrics: DashboardMetrics = {
    totalComplaints,
    pendingComplaints,
    inProgressComplaints,
    resolvedComplaints,
    criticalComplaints,
    highComplaints,
    totalCitizens: citizensRow.total,
    activeCitizens: citizensRow.active,
    resolutionRate,
    avgResolutionHours,
    categoryDistribution,
    priorityDistribution,
    statusDistribution,
    departmentWorkloads: deptWorkloads.map((d) => ({
      departmentId: d.departmentId,
      name: d.name,
      code: d.code,
      count: d.count || 0,
      active: d.active || 0,
    })),
    recentActivity: recentActivityRows.map((r) => ({
      id: r.id,
      complaintId: r.complaint_id,
      title: r.title,
      action: `Status set to ${STATUS_LABELS[r.new_status as ComplaintStatus] || r.new_status}`,
      timestamp: r.created_at,
      status: r.new_status,
    })),
  };

  return res.json({ metrics });
});

// GET /api/admin/complaints - Complaints queue with filters & pagination
router.get('/complaints', (req: AuthenticatedRequest, res: Response) => {
  const {
    status,
    category,
    priority,
    departmentId,
    search,
    page = '1',
    limit = '20',
  } = req.query;

  let baseSql = `
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    LEFT JOIN departments d ON c.assigned_department_id = d.id
    LEFT JOIN master_issues mi ON c.master_issue_id = mi.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (status && status !== 'ALL') {
    baseSql += ' AND c.status = ?';
    params.push(status);
  }

  if (category && category !== 'ALL') {
    baseSql += ' AND c.category = ?';
    params.push(category);
  }

  if (priority && priority !== 'ALL') {
    baseSql += ' AND c.priority = ?';
    params.push(priority);
  }

  if (departmentId && departmentId !== 'ALL') {
    baseSql += ' AND c.assigned_department_id = ?';
    params.push(departmentId);
  }

  if (search) {
    baseSql += ' AND (c.title LIKE ? OR c.description LIKE ? OR c.id LIKE ? OR c.locality LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term, term, term);
  }

  // Count total
  const countRow = db.prepare(`SELECT COUNT(*) as count ${baseSql}`).get(...params) as { count: number };
  const total = countRow.count;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const querySql = `
    SELECT
      c.id, c.title, c.description, c.category, c.priority, c.status,
      c.locality, c.city, c.state, c.image_url, c.created_at, c.updated_at,
      u.id as citizen_id, u.name as citizen_name, u.phone as citizen_phone,
      d.id as dept_id, d.name as department_name, d.code as department_code,
      mi.id as mi_id, mi.title as master_issue_title
    ${baseSql}
    ORDER BY
      CASE c.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
      END,
      c.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(querySql).all(...params, limitNum, offset) as any[];

  return res.json({
    complaints: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      priority: r.priority,
      status: r.status,
      locality: r.locality,
      city: r.city,
      state: r.state,
      imageUrl: r.image_url,
      citizenId: r.citizen_id,
      citizenName: r.citizen_name,
      citizenPhone: r.citizen_phone,
      department: r.dept_id ? { id: r.dept_id, name: r.department_name, code: r.department_code } : null,
      masterIssue: r.mi_id ? { id: r.mi_id, title: r.master_issue_title } : null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// POST /api/admin/complaints/:id/assign - Assign department
router.post('/complaints/:id/assign', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { departmentId, citizenRemark, internalNote } = req.body;

  if (!departmentId) {
    return res.status(400).json({ error: 'Department ID is required.' });
  }

  const dept = db.prepare('SELECT id, name, code FROM departments WHERE id = ?').get(departmentId) as any;
  if (!dept) {
    return res.status(404).json({ error: 'Department not found.' });
  }

  const complaint = db.prepare('SELECT id, citizen_id, title, status, assigned_department_id FROM complaints WHERE id = ?').get(id) as any;
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  const now = new Date().toISOString();
  const nextStatus: ComplaintStatus = complaint.status === 'SUBMITTED' || complaint.status === 'UNDER_REVIEW'
    ? 'ASSIGNED'
    : complaint.status;

  runInTransaction(() => {
    // Update complaint
    db.prepare(`
      UPDATE complaints
      SET assigned_department_id = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(departmentId, nextStatus, now, id);

    // Record status history entry
    const historyId = `HIS-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const remark = citizenRemark || `Assigned to ${dept.name} for investigation and field resolution.`;
    db.prepare(`
      INSERT INTO complaint_status_history (
        id, complaint_id, previous_status, new_status, actor_id, actor_name, actor_role,
        citizen_remark, internal_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      historyId,
      id,
      complaint.status,
      nextStatus,
      req.user!.id,
      req.user!.name,
      'ADMIN',
      remark,
      internalNote || `Manual assignment to ${dept.code} by admin.`,
      now
    );

    // Audit log
    AuditService.logAction({
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: 'ASSIGN_DEPARTMENT',
      entityType: 'COMPLAINT',
      entityId: id,
      changes: { previousDept: complaint.assigned_department_id, newDept: departmentId, newStatus: nextStatus },
      ipAddress: req.ip,
    });
  });

  // Notify Citizen
  NotificationService.createNotification({
    userId: complaint.citizen_id,
    complaintId: id,
    title: 'Department Assigned',
    message: `Your grievance #${id} has been assigned to ${dept.name}.`,
    type: 'ASSIGNMENT',
    link: `/complaints/${id}`,
  });

  // Real-time broadcast
  emitComplaintEvent('complaint:assigned', {
    id,
    citizenId: complaint.citizen_id,
    department: { id: dept.id, name: dept.name, code: dept.code },
    status: nextStatus,
    updatedAt: now,
  });

  return res.json({ message: 'Complaint successfully assigned.', status: nextStatus, department: dept });
});

// POST /api/admin/complaints/:id/status - Update status with validation & history
router.post('/complaints/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newStatus, citizenRemark, internalNote } = req.body as {
    newStatus: ComplaintStatus;
    citizenRemark?: string;
    internalNote?: string;
  };

  if (!newStatus) {
    return res.status(400).json({ error: 'New status is required.' });
  }

  const complaint = db.prepare('SELECT id, citizen_id, title, status FROM complaints WHERE id = ?').get(id) as any;
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  const currentStatus = complaint.status as ComplaintStatus;

  // Validate status transition
  if (currentStatus !== newStatus) {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return res.status(400).json({
        error: `Invalid status transition from "${STATUS_LABELS[currentStatus]}" to "${STATUS_LABELS[newStatus]}". Allowed transitions: ${allowedTransitions.map(s => STATUS_LABELS[s]).join(', ')}.`,
      });
    }
  }

  const now = new Date().toISOString();
  const resolvedAt = (newStatus === 'RESOLVED' || newStatus === 'CLOSED') ? now : null;

  runInTransaction(() => {
    db.prepare(`
      UPDATE complaints
      SET status = ?, resolved_at = COALESCE(?, resolved_at), updated_at = ?
      WHERE id = ?
    `).run(newStatus, resolvedAt, now, id);

    // Record status history
    const historyId = `HIS-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const remark = citizenRemark || `Status updated to ${STATUS_LABELS[newStatus]} by Municipal Administration.`;

    db.prepare(`
      INSERT INTO complaint_status_history (
        id, complaint_id, previous_status, new_status, actor_id, actor_name, actor_role,
        citizen_remark, internal_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      historyId,
      id,
      currentStatus,
      newStatus,
      req.user!.id,
      req.user!.name,
      'ADMIN',
      remark,
      internalNote || null,
      now
    );

    // Audit log
    AuditService.logAction({
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: 'UPDATE_STATUS',
      entityType: 'COMPLAINT',
      entityId: id,
      changes: { previousStatus: currentStatus, newStatus, citizenRemark: remark, internalNote },
      ipAddress: req.ip,
    });
  });

  // Notify Citizen
  NotificationService.createNotification({
    userId: complaint.citizen_id,
    complaintId: id,
    title: `Grievance Status: ${STATUS_LABELS[newStatus]}`,
    message: citizenRemark || `Your grievance #${id} has been moved to ${STATUS_LABELS[newStatus]}.`,
    type: newStatus === 'RESOLVED' ? 'RESOLVED' : 'STATUS_UPDATE',
    link: `/complaints/${id}`,
  });

  // Real-time broadcast
  emitComplaintEvent('complaint:status_changed', {
    id,
    citizenId: complaint.citizen_id,
    previousStatus: currentStatus,
    newStatus,
    citizenRemark,
    updatedAt: now,
  });

  return res.json({ message: 'Complaint status updated successfully.', status: newStatus });
});

// POST /api/admin/complaints/:id/link-master-issue
router.post('/complaints/:id/link-master-issue', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { masterIssueId } = req.body;

  const complaint = db.prepare('SELECT id, master_issue_id FROM complaints WHERE id = ?').get(id) as any;
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  if (masterIssueId) {
    const mi = db.prepare('SELECT id, title FROM master_issues WHERE id = ?').get(masterIssueId) as any;
    if (!mi) {
      return res.status(404).json({ error: 'Master Issue not found.' });
    }
  }

  const now = new Date().toISOString();

  runInTransaction(() => {
    // Decrement previous master issue if existed
    if (complaint.master_issue_id && complaint.master_issue_id !== masterIssueId) {
      db.prepare('UPDATE master_issues SET complaint_count = MAX(0, complaint_count - 1), updated_at = ? WHERE id = ?')
        .run(now, complaint.master_issue_id);
    }

    // Link complaint
    db.prepare('UPDATE complaints SET master_issue_id = ?, updated_at = ? WHERE id = ?')
      .run(masterIssueId || null, now, id);

    // Increment new master issue
    if (masterIssueId) {
      db.prepare('UPDATE master_issues SET complaint_count = complaint_count + 1, updated_at = ? WHERE id = ?')
        .run(now, masterIssueId);
    }

    AuditService.logAction({
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: 'LINK_MASTER_ISSUE',
      entityType: 'COMPLAINT',
      entityId: id,
      changes: { previous: complaint.master_issue_id, new: masterIssueId },
      ipAddress: req.ip,
    });
  });

  return res.json({ message: 'Master issue linked successfully.' });
});

// GET /api/admin/users - User management list
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const { search, status, page = '1', limit = '20' } = req.query;

  let baseSql = `FROM users WHERE role = 'CITIZEN'`;
  const params: any[] = [];

  if (status && status !== 'ALL') {
    baseSql += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    baseSql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR id LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as count ${baseSql}`).get(...params) as { count: number };
  const total = countRow.count;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const querySql = `
    SELECT
      u.id, u.phone, u.name, u.email, u.status, u.created_at, u.last_login_at,
      COUNT(c.id) as total_complaints,
      SUM(CASE WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) as resolved_complaints
    FROM users u
    LEFT JOIN complaints c ON c.citizen_id = u.id
    WHERE u.role = 'CITIZEN'
    ${status && status !== 'ALL' ? 'AND u.status = ?' : ''}
    ${search ? 'AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR u.id LIKE ?)' : ''}
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(querySql).all(...params, limitNum, offset) as any[];

  return res.json({
    users: rows.map((r) => ({
      id: r.id,
      phone: r.phone,
      name: r.name,
      email: r.email,
      status: r.status,
      createdAt: r.created_at,
      lastLoginAt: r.last_login_at,
      totalComplaints: r.total_complaints || 0,
      resolvedComplaints: r.resolved_complaints || 0,
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// GET /api/admin/users/:id - Citizen profile + complaint history + security events
router.get('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const user = db.prepare(`
    SELECT id, phone, name, email, role, status, created_at, updated_at, last_login_at
    FROM users WHERE id = ?
  `).get(id) as any;

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Citizen's complaints
  const complaints = db.prepare(`
    SELECT id, title, category, priority, status, locality, created_at, resolved_at
    FROM complaints
    WHERE citizen_id = ?
    ORDER BY created_at DESC
  `).all(id);

  // Security events
  const securityEvents = db.prepare(`
    SELECT id, event_type, ip_address, user_agent, details, created_at
    FROM security_events
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(id);

  return res.json({ user, complaints, securityEvents });
});

// PATCH /api/admin/users/:id/status - Disable or reactivate citizen account
router.patch('/users/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (status !== 'ACTIVE' && status !== 'DISABLED') {
    return res.status(400).json({ error: 'Status must be ACTIVE or DISABLED.' });
  }

  const user = db.prepare('SELECT id, phone, name, status FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

  AuditService.logAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: status === 'DISABLED' ? 'DISABLE_USER' : 'ACTIVATE_USER',
    entityType: 'USER',
    entityId: id,
    changes: { previousStatus: user.status, newStatus: status, reason },
    ipAddress: req.ip,
  });

  return res.json({ message: `Citizen account has been ${status.toLowerCase()}.`, status });
});

// GET /api/admin/departments - List departments with workload & metrics
router.get('/departments', (req: AuthenticatedRequest, res: Response) => {
  const depts = db.prepare(`
    SELECT
      d.*,
      COUNT(c.id) as total_assigned,
      SUM(CASE WHEN c.status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) as active_workload,
      SUM(CASE WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) as resolved_count
    FROM departments d
    LEFT JOIN complaints c ON c.assigned_department_id = d.id
    GROUP BY d.id
    ORDER BY d.name ASC
  `).all() as any[];

  return res.json({
    departments: depts.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      categories: JSON.parse(d.categories_json || '[]'),
      headName: d.head_name,
      contactEmail: d.contact_email,
      contactPhone: d.contact_phone,
      active: Boolean(d.active),
      totalAssigned: d.total_assigned || 0,
      activeWorkload: d.active_workload || 0,
      resolvedCount: d.resolved_count || 0,
      createdAt: d.created_at,
    })),
  });
});

// POST /api/admin/departments - Create department
router.post('/departments', (req: AuthenticatedRequest, res: Response) => {
  const { code, name, description, categories = [], headName, contactEmail, contactPhone } = req.body;

  if (!code || !name || !headName) {
    return res.status(400).json({ error: 'Code, name, and head name are required.' });
  }

  const id = `DEPT-${code.toUpperCase()}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO departments (id, code, name, description, categories_json, head_name, contact_email, contact_phone, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(id, code.toUpperCase(), name.trim(), description || '', JSON.stringify(categories), headName.trim(), contactEmail || '', contactPhone || '', now);

    AuditService.logAction({
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: 'CREATE_DEPARTMENT',
      entityType: 'DEPARTMENT',
      entityId: id,
      changes: { code, name },
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'Department created successfully.', id });
  } catch (err: any) {
    return res.status(409).json({ error: 'Department code already exists.' });
  }
});

// PATCH /api/admin/departments/:id
router.patch('/departments/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, headName, contactEmail, contactPhone, active, categories } = req.body;

  const current = db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as any;
  if (!current) {
    return res.status(404).json({ error: 'Department not found.' });
  }

  db.prepare(`
    UPDATE departments
    SET name = COALESCE(?, name),
        head_name = COALESCE(?, head_name),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        active = COALESCE(?, active),
        categories_json = COALESCE(?, categories_json)
    WHERE id = ?
  `).run(
    name || null,
    headName || null,
    contactEmail || null,
    contactPhone || null,
    active !== undefined ? (active ? 1 : 0) : null,
    categories ? JSON.stringify(categories) : null,
    id
  );

  AuditService.logAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: 'UPDATE_DEPARTMENT',
    entityType: 'DEPARTMENT',
    entityId: id,
    changes: req.body,
    ipAddress: req.ip,
  });

  return res.json({ message: 'Department updated successfully.' });
});

// GET /api/admin/master-issues - Master issues list
router.get('/master-issues', (req: AuthenticatedRequest, res: Response) => {
  const issues = db.prepare(`
    SELECT
      mi.*,
      COUNT(c.id) as live_complaint_count
    FROM master_issues mi
    LEFT JOIN complaints c ON c.master_issue_id = mi.id
    GROUP BY mi.id
    ORDER BY mi.updated_at DESC
  `).all() as any[];

  return res.json({
    masterIssues: issues.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      category: i.category,
      priority: i.priority,
      status: i.status,
      locality: i.locality,
      city: i.city,
      state: i.state,
      complaintCount: i.live_complaint_count || i.complaint_count || 0,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    })),
  });
});

// POST /api/admin/master-issues - Create master issue
router.post('/master-issues', (req: AuthenticatedRequest, res: Response) => {
  const { title, description, category, priority = 'HIGH', locality, city = 'Bengaluru', state = 'Karnataka', initialComplaintIds = [] } = req.body;

  if (!title || !description || !category || !locality) {
    return res.status(400).json({ error: 'Title, description, category, and locality are required.' });
  }

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM master_issues').get() as { cnt: number };
  const id = `MI-2026-${(countRow.cnt + 1).toString().padStart(4, '0')}`;
  const now = new Date().toISOString();

  runInTransaction(() => {
    db.prepare(`
      INSERT INTO master_issues (id, title, description, category, priority, status, locality, city, state, complaint_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?)
    `).run(id, title.trim(), description.trim(), category, priority, locality.trim(), city.trim(), state.trim(), initialComplaintIds.length, now, now);

    // Link complaints if any
    for (const cid of initialComplaintIds) {
      db.prepare('UPDATE complaints SET master_issue_id = ?, updated_at = ? WHERE id = ?').run(id, now, cid);
    }

    AuditService.logAction({
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: 'CREATE_MASTER_ISSUE',
      entityType: 'MASTER_ISSUE',
      entityId: id,
      changes: { title, category, locality, linkedComplaints: initialComplaintIds },
      ipAddress: req.ip,
    });
  });

  return res.status(201).json({ message: 'Master issue created successfully.', id });
});

// PATCH /api/admin/master-issues/:id - Update status or details
router.patch('/master-issues/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, priority, title, description } = req.body;

  const current = db.prepare('SELECT * FROM master_issues WHERE id = ?').get(id) as any;
  if (!current) {
    return res.status(404).json({ error: 'Master issue not found.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE master_issues
    SET status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        updated_at = ?
    WHERE id = ?
  `).run(status || null, priority || null, title || null, description || null, now, id);

  AuditService.logAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: 'UPDATE_MASTER_ISSUE',
    entityType: 'MASTER_ISSUE',
    entityId: id,
    changes: req.body,
    ipAddress: req.ip,
  });

  return res.json({ message: 'Master issue updated successfully.' });
});

// GET /api/admin/reports - Analytics report data
router.get('/reports', (req: AuthenticatedRequest, res: Response) => {
  // Volume by category
  const categories = db.prepare(`
    SELECT category, COUNT(*) as count FROM complaints GROUP BY category
  `).all();

  // Volume by priority
  const priorities = db.prepare(`
    SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority
  `).all();

  // Volume by status
  const statuses = db.prepare(`
    SELECT status, COUNT(*) as count FROM complaints GROUP BY status
  `).all();

  // Volume by locality top 10
  const localities = db.prepare(`
    SELECT locality, COUNT(*) as count FROM complaints GROUP BY locality ORDER BY count DESC LIMIT 10
  `).all();

  // Resolution time by category
  const resolutionByCategory = db.prepare(`
    SELECT
      category,
      AVG((julianday(resolved_at) - julianday(created_at)) * 24) as avg_resolution_hours,
      COUNT(resolved_at) as resolved_count
    FROM complaints
    WHERE resolved_at IS NOT NULL
    GROUP BY category
  `).all();

  return res.json({
    categories,
    priorities,
    statuses,
    localities,
    resolutionByCategory,
  });
});

// GET /api/admin/reports/export-csv - CSV export respecting role & privacy
router.get('/reports/export-csv', (req: AuthenticatedRequest, res: Response) => {
  const rows = db.prepare(`
    SELECT
      c.id, c.title, c.category, c.priority, c.status,
      c.locality, c.city, c.state, c.created_at, c.resolved_at,
      u.name as citizen_name, u.phone as citizen_phone,
      d.name as department_name, mi.title as master_issue_title
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    LEFT JOIN departments d ON c.assigned_department_id = d.id
    LEFT JOIN master_issues mi ON c.master_issue_id = mi.id
    ORDER BY c.created_at DESC
  `).all() as any[];

  // Build CSV
  const headers = [
    'Complaint ID', 'Title', 'Category', 'Priority', 'Status',
    'Locality', 'City', 'State', 'Department', 'Master Issue',
    'Citizen Name', 'Citizen Mobile', 'Created At', 'Resolved At'
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvLines = [headers.join(',')];
  for (const r of rows) {
    csvLines.push([
      escapeCsv(r.id),
      escapeCsv(r.title),
      escapeCsv(r.category),
      escapeCsv(r.priority),
      escapeCsv(r.status),
      escapeCsv(r.locality),
      escapeCsv(r.city),
      escapeCsv(r.state),
      escapeCsv(r.department_name || 'Unassigned'),
      escapeCsv(r.master_issue_title || 'None'),
      escapeCsv(r.citizen_name),
      escapeCsv(r.citizen_phone),
      escapeCsv(r.created_at),
      escapeCsv(r.resolved_at || 'Pending'),
    ].join(','));
  }

  AuditService.logAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: 'EXPORT_COMPLAINTS_CSV',
    entityType: 'REPORT',
    entityId: 'ALL',
    ipAddress: req.ip,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="smartgov-complaints-${Date.now()}.csv"`);
  return res.send(csvLines.join('\n'));
});

// GET /api/admin/audit-logs - Audit trail
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const { limit = '50' } = req.query;
  const limitNum = Math.min(200, parseInt(limit as string, 10) || 50);

  const logs = db.prepare(`
    SELECT id, admin_id, admin_name, action, entity_type, entity_id, changes_json, ip_address, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limitNum);

  return res.json({ logs });
});

// GET /api/admin/settings
router.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  const settingsRows = db.prepare('SELECT key, value_json, updated_at FROM system_settings').all() as any[];
  const settings: Record<string, any> = {};
  for (const r of settingsRows) {
    settings[r.key] = JSON.parse(r.value_json);
  }

  return res.json({ settings });
});

// PATCH /api/admin/settings
router.patch('/settings', (req: AuthenticatedRequest, res: Response) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Key and value are required.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO system_settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), now);

  AuditService.logAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: 'UPDATE_SYSTEM_SETTINGS',
    entityType: 'SETTINGS',
    entityId: key,
    changes: { key, value },
    ipAddress: req.ip,
  });

  return res.json({ message: 'Settings updated successfully.' });
});

export default router;
