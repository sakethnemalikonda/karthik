import { Router, Response } from 'express';
import { db, runInTransaction } from '../db/index.js';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { uploadComplaintImage } from '../middleware/upload.js';
import { AIEngineService } from '../services/aiEngine.js';
import { NotificationService } from '../services/notificationService.js';
import { emitComplaintEvent } from '../socket/handler.js';
import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  AIAnalysisResult,
  StatusHistoryEntry,
  SupportedLanguage,
} from '../../shared/types.js';

const router = Router();

// POST /api/complaints/upload - Safe file upload
router.post('/upload', authenticateToken, uploadComplaintImage.single('image'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// POST /api/complaints - Submit complaint
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      state = 'Karnataka',
      city = 'Bengaluru',
      locality,
      address,
      latitude,
      longitude,
      language = 'en',
      imageUrl,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Complaint title is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Detailed complaint description is required.' });
    }
    if (!locality || !locality.trim()) {
      return res.status(400).json({ error: 'Locality/Ward is required.' });
    }

    const citizenId = req.user!.id;

    // 1. Generate unique sequential complaint ID: SGC-YYYY-XXXXX
    const countRow = db.prepare('SELECT COUNT(*) as cnt FROM complaints').get() as { cnt: number };
    const nextNum = (countRow.cnt + 1).toString().padStart(5, '0');
    const complaintId = `SGC-2026-${nextNum}`;

    // 2. Run AI Complaint Processing Engine
    const analysis = AIEngineService.analyzeComplaint({
      complaintId,
      title: title.trim(),
      description: description.trim(),
      userCategory: category && category !== 'AUTO_DETECT' ? category : undefined,
      locality: locality.trim(),
      city: city.trim(),
    });

    const finalCategory: ComplaintCategory = (category && category !== 'AUTO_DETECT')
      ? category
      : analysis.categoryPredicted;
    const finalPriority: ComplaintPriority = analysis.priorityPredicted;

    // Find recommended department record
    const deptRow = db.prepare('SELECT id FROM departments WHERE code = ?').get(analysis.recommendedDepartmentCode) as { id: string } | undefined;
    const recommendedDeptId = deptRow ? deptRow.id : null;

    const now = new Date().toISOString();

    // 3. Persist Complaint, AI Analysis, Status History in a Transaction
    runInTransaction(() => {
      // Insert complaint
      const insertComplaint = db.prepare(`
        INSERT INTO complaints (
          id, citizen_id, title, description, category, predicted_category, priority,
          status, state, city, locality, address, latitude, longitude,
          language, image_url, recommended_department_id, master_issue_id,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          'SUBMITTED', ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
      `);

      insertComplaint.run(
        complaintId,
        citizenId,
        title.trim(),
        description.trim(),
        finalCategory,
        analysis.categoryPredicted,
        finalPriority,
        state.trim(),
        city.trim(),
        locality.trim(),
        address ? address.trim() : null,
        latitude ? Number(latitude) : null,
        longitude ? Number(longitude) : null,
        language,
        imageUrl || null,
        recommendedDeptId,
        analysis.suggestedMasterIssueId || null,
        now,
        now
      );

      // Insert AI analysis
      const insertAnalysis = db.prepare(`
        INSERT INTO complaint_analyses (
          id, complaint_id, cleaned_text, tokens_count, language_detected,
          category_predicted, category_confidence, category_explanation,
          priority_predicted, priority_confidence, priority_reasons_json,
          recommended_department_code, recommended_department_name,
          urgency_score, sentiment_score, sentiment_label,
          potential_duplicates_json, master_issue_suggested, suggested_master_issue_id,
          processed_at, engine_version
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?
        )
      `);

      insertAnalysis.run(
        analysis.id,
        complaintId,
        analysis.cleanedText,
        analysis.tokensCount,
        analysis.languageDetected,
        analysis.categoryPredicted,
        analysis.categoryConfidence,
        analysis.categoryExplanation,
        analysis.priorityPredicted,
        analysis.priorityConfidence,
        JSON.stringify(analysis.priorityReasons),
        analysis.recommendedDepartmentCode,
        analysis.recommendedDepartmentName,
        analysis.urgencyScore,
        analysis.sentimentScore,
        analysis.sentimentLabel,
        JSON.stringify(analysis.potentialDuplicates),
        analysis.masterIssueSuggested ? 1 : 0,
        analysis.suggestedMasterIssueId || null,
        analysis.processedAt,
        analysis.engineVersion
      );

      // Insert Initial Status History
      const historyId = `HIS-${Date.now()}-001`;
      const insertHistory = db.prepare(`
        INSERT INTO complaint_status_history (
          id, complaint_id, previous_status, new_status, actor_id, actor_name, actor_role, citizen_remark, created_at
        ) VALUES (?, ?, NULL, 'SUBMITTED', ?, ?, ?, ?, ?)
      `);

      insertHistory.run(
        historyId,
        complaintId,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'Grievance registered in SmartGov Connect AI. Under automated civic classification & routing.',
        now
      );

      // If associated with existing master issue, increment complaint count
      if (analysis.suggestedMasterIssueId) {
        db.prepare('UPDATE master_issues SET complaint_count = complaint_count + 1, updated_at = ? WHERE id = ?')
          .run(now, analysis.suggestedMasterIssueId);
      }
    });

    // 4. Create Acknowledgement Notification for Citizen
    NotificationService.createNotification({
      userId: citizenId,
      complaintId,
      title: 'Grievance Registered Successfully',
      message: `Your grievance #${complaintId} regarding "${title.slice(0, 40)}..." has been logged. Automated priority: ${finalPriority}.`,
      type: 'GENERAL',
      link: `/complaints/${complaintId}`,
    });

    // 5. Emit real-time socket event
    emitComplaintEvent('complaint:created', {
      id: complaintId,
      citizenId,
      title: title.trim(),
      category: finalCategory,
      priority: finalPriority,
      locality,
      status: 'SUBMITTED',
      createdAt: now,
    });

    return res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaintId,
      trackingUrl: `/track/${complaintId}`,
      analysis,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to submit complaint.' });
  }
});

// GET /api/complaints/mine - Citizen's own complaints
router.get('/mine', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { status, category, search } = req.query;
  const citizenId = req.user!.id;

  let sql = `
    SELECT
      c.id, c.title, c.description, c.category, c.priority, c.status,
      c.state, c.city, c.locality, c.address, c.language, c.image_url,
      c.created_at, c.updated_at, c.resolved_at,
      d.name as department_name, d.code as department_code,
      mi.title as master_issue_title
    FROM complaints c
    LEFT JOIN departments d ON c.assigned_department_id = d.id
    LEFT JOIN master_issues mi ON c.master_issue_id = mi.id
    WHERE c.citizen_id = ?
  `;

  const params: any[] = [citizenId];

  if (status && status !== 'ALL') {
    sql += ' AND c.status = ?';
    params.push(status);
  }

  if (category && category !== 'ALL') {
    sql += ' AND c.category = ?';
    params.push(category);
  }

  if (search) {
    sql += ' AND (c.title LIKE ? OR c.description LIKE ? OR c.id LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY c.created_at DESC';

  const rows = db.prepare(sql).all(...params) as any[];

  const complaints: Complaint[] = rows.map((r) => ({
    id: r.id,
    citizenId,
    title: r.title,
    description: r.description,
    category: r.category as ComplaintCategory,
    priority: r.priority as ComplaintPriority,
    status: r.status as ComplaintStatus,
    state: r.state,
    city: r.city,
    locality: r.locality,
    address: r.address,
    language: r.language as SupportedLanguage,
    imageUrl: r.image_url,
    assignedDepartment: r.department_name ? ({ name: r.department_name, code: r.department_code } as any) : null,
    masterIssue: r.master_issue_title ? ({ title: r.master_issue_title } as any) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at,
  }));

  return res.json({ complaints });
});

// GET /api/complaints/:id - Detail view with authorization
router.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const complaintRow = db.prepare(`
    SELECT
      c.*,
      u.name as citizen_name, u.phone as citizen_phone,
      d.name as assigned_dept_name, d.code as assigned_dept_code,
      rd.name as rec_dept_name, rd.code as rec_dept_code,
      mi.id as mi_id, mi.title as mi_title, mi.status as mi_status
    FROM complaints c
    JOIN users u ON c.citizen_id = u.id
    LEFT JOIN departments d ON c.assigned_department_id = d.id
    LEFT JOIN departments rd ON c.recommended_department_id = rd.id
    LEFT JOIN master_issues mi ON c.master_issue_id = mi.id
    WHERE c.id = ?
  `).get(id) as any;

  if (!complaintRow) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  // Enforce access control: Citizens can only read their own complaints
  if (req.user!.role === 'CITIZEN' && complaintRow.citizen_id !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized. You can only view your own complaints.' });
  }

  // Fetch status history
  let historySql = `
    SELECT id, complaint_id, previous_status, new_status, actor_id, actor_name, actor_role,
           citizen_remark, ${req.user!.role === 'ADMIN' ? 'internal_note,' : ''} created_at
    FROM complaint_status_history
    WHERE complaint_id = ?
    ORDER BY created_at ASC
  `;

  const historyRows = db.prepare(historySql).all(id) as any[];

  // Fetch AI analysis
  const analysisRow = db.prepare(`
    SELECT * FROM complaint_analyses WHERE complaint_id = ?
  `).get(id) as any;

  let analysis: AIAnalysisResult | null = null;
  if (analysisRow) {
    analysis = {
      id: analysisRow.id,
      complaintId: analysisRow.complaint_id,
      cleanedText: analysisRow.cleaned_text,
      tokensCount: analysisRow.tokens_count,
      languageDetected: analysisRow.language_detected,
      categoryPredicted: analysisRow.category_predicted,
      categoryConfidence: analysisRow.category_confidence,
      categoryExplanation: analysisRow.category_explanation,
      priorityPredicted: analysisRow.priority_predicted,
      priorityConfidence: analysisRow.priority_confidence,
      priorityReasons: JSON.parse(analysisRow.priority_reasons_json || '[]'),
      recommendedDepartmentCode: analysisRow.recommended_department_code,
      recommendedDepartmentName: analysisRow.recommended_department_name,
      urgencyScore: analysisRow.urgency_score,
      sentimentScore: analysisRow.sentiment_score,
      sentimentLabel: analysisRow.sentiment_label,
      potentialDuplicates: JSON.parse(analysisRow.potential_duplicates_json || '[]'),
      masterIssueSuggested: Boolean(analysisRow.master_issue_suggested),
      suggestedMasterIssueId: analysisRow.suggested_master_issue_id,
      processedAt: analysisRow.processed_at,
      engineVersion: analysisRow.engine_version,
    };
  }

  const complaint: Complaint = {
    id: complaintRow.id,
    citizenId: complaintRow.citizen_id,
    citizenName: req.user!.role === 'ADMIN' ? complaintRow.citizen_name : undefined,
    citizenPhone: req.user!.role === 'ADMIN' ? complaintRow.citizen_phone : undefined,
    title: complaintRow.title,
    description: complaintRow.description,
    category: complaintRow.category,
    predictedCategory: complaintRow.predicted_category,
    priority: complaintRow.priority,
    status: complaintRow.status,
    state: complaintRow.state,
    city: complaintRow.city,
    locality: complaintRow.locality,
    address: complaintRow.address,
    latitude: complaintRow.latitude,
    longitude: complaintRow.longitude,
    language: complaintRow.language,
    imageUrl: complaintRow.image_url,
    assignedDepartmentId: complaintRow.assigned_department_id,
    assignedDepartment: complaintRow.assigned_dept_name
      ? ({ name: complaintRow.assigned_dept_name, code: complaintRow.assigned_dept_code } as any)
      : null,
    recommendedDepartmentId: complaintRow.recommended_department_id,
    recommendedDepartment: complaintRow.rec_dept_name
      ? ({ name: complaintRow.rec_dept_name, code: complaintRow.rec_dept_code } as any)
      : null,
    masterIssueId: complaintRow.master_issue_id,
    masterIssue: complaintRow.mi_title
      ? ({ id: complaintRow.mi_id, title: complaintRow.mi_title, status: complaintRow.mi_status } as any)
      : null,
    createdAt: complaintRow.created_at,
    updatedAt: complaintRow.updated_at,
    resolvedAt: complaintRow.resolved_at,
    analysis,
    statusHistory: historyRows.map((h) => ({
      id: h.id,
      complaintId: h.complaint_id,
      previousStatus: h.previous_status,
      newStatus: h.new_status,
      actorId: h.actor_id,
      actorName: h.actor_name,
      actorRole: h.actor_role,
      citizenRemark: h.citizen_remark,
      internalNote: h.internal_note,
      createdAt: h.created_at,
    })),
  };

  return res.json({ complaint });
});

// GET /api/complaints/track/:complaintId - Public complaint tracking shortcut
router.get('/track/:complaintId', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { complaintId } = req.params;

  const complaintRow = db.prepare(`
    SELECT
      c.id, c.title, c.category, c.priority, c.status, c.locality, c.city, c.state,
      c.created_at, c.updated_at, c.resolved_at,
      d.name as assigned_dept_name
    FROM complaints c
    LEFT JOIN departments d ON c.assigned_department_id = d.id
    WHERE c.id = ?
  `).get(complaintId) as any;

  if (!complaintRow) {
    return res.status(404).json({ error: `Grievance #${complaintId} not found in the public registry.` });
  }

  // Public status history: Only citizen-visible remarks, actor roles (not private names)
  const history = db.prepare(`
    SELECT new_status, actor_role, citizen_remark, created_at
    FROM complaint_status_history
    WHERE complaint_id = ?
    ORDER BY created_at ASC
  `).all(complaintId);

  return res.json({
    complaint: {
      id: complaintRow.id,
      title: complaintRow.title,
      category: complaintRow.category,
      priority: complaintRow.priority,
      status: complaintRow.status,
      locality: complaintRow.locality,
      city: complaintRow.city,
      state: complaintRow.state,
      department: complaintRow.assigned_dept_name || 'Pending Department Assignment',
      createdAt: complaintRow.created_at,
      updatedAt: complaintRow.updated_at,
      resolvedAt: complaintRow.resolved_at,
      timeline: history,
    },
  });
});

export default router;
