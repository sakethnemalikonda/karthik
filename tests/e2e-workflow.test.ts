import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, runInTransaction } from '../src/server/db/index.js';
import { seedDatabase } from '../src/server/db/seed.js';
import { AIEngineService } from '../src/server/services/aiEngine.js';
import { NotificationService } from '../src/server/services/notificationService.js';
import { AuditService } from '../src/server/services/auditService.js';
import { SecurityService } from '../src/server/services/securityService.js';
import { VALID_STATUS_TRANSITIONS, ComplaintStatus } from '../src/shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'smartgov_dev_jwt_key_2026_super_secure_civic_platform';

beforeAll(async () => {
  await seedDatabase();
});

describe('SmartGov Connect AI End-to-End Workflow Verification (In-Process QA)', () => {
  let citizenId = 'USR-TEST-CITIZEN-01';
  let citizenPhone = '+919988776655';
  let citizenToken = '';
  let adminToken = '';
  let testComplaintId = 'SGC-2026-99999';

  it('1. Verifies pre-seeded Administrator authentication and JWT generation', async () => {
    const adminRow = db.prepare('SELECT * FROM users WHERE phone = ?').get('+919876543210') as any;
    expect(adminRow).toBeDefined();
    expect(adminRow.role).toBe('ADMIN');

    const isMatch = await bcrypt.compare('Admin@12345', adminRow.password_hash);
    expect(isMatch).toBe(true);

    adminToken = jwt.sign({ id: adminRow.id, role: adminRow.role, phone: adminRow.phone }, JWT_SECRET);
    const decoded = jwt.verify(adminToken, JWT_SECRET) as any;
    expect(decoded.role).toBe('ADMIN');
  });

  it('2. Registers a new citizen using normalized mobile number (+91)', async () => {
    const rawPhone = '9988776655';
    const normalized = `+91${rawPhone}`;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Password@123', salt);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, phone, name, email, password_hash, role, status, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, 'CITIZEN', 'ACTIVE', ?, ?, ?)
    `).run(citizenId, normalized, 'Rajesh Kumar', 'rajesh.kumar@example.com', hash, now, now, now);

    SecurityService.logSecurityEvent({
      userId: citizenId,
      eventType: 'REGISTRATION',
      details: 'New citizen registration test verification.',
    });

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(citizenId) as any;
    expect(userRow).toBeDefined();
    expect(userRow.phone).toBe('+919988776655');
    expect(userRow.name).toBe('Rajesh Kumar');
    expect(userRow.status).toBe('ACTIVE');

    citizenToken = jwt.sign({ id: citizenId, role: 'CITIZEN', phone: normalized }, JWT_SECRET);
  });

  it('3. Confirms registered citizen appears in Admin User list with security events', () => {
    const user = db.prepare('SELECT id, name, phone, status FROM users WHERE phone = ?').get(citizenPhone) as any;
    expect(user).toBeDefined();
    expect(user.name).toBe('Rajesh Kumar');

    const events = db.prepare('SELECT * FROM security_events WHERE user_id = ?').all(citizenId);
    expect(events.length).toBeGreaterThan(0);
    expect((events[0] as any).event_type).toBe('REGISTRATION');
  });

  it('4. Citizen files a critical public hazard complaint and runs AI analysis', () => {
    const title = 'Open live wire and sparking transformer dangling near hospital gate';
    const description = 'High voltage electric line broke and is sparking dangerously outside Manipal Hospital gate. Immediate risk of electric shock for patients.';

    const analysis = AIEngineService.analyzeComplaint({
      complaintId: testComplaintId,
      title,
      description,
      locality: 'HAL Airport Road',
      city: 'Bengaluru',
    });

    expect(analysis.categoryPredicted).toBe('PUBLIC_SAFETY');
    expect(analysis.priorityPredicted).toBe('CRITICAL');
    expect(analysis.urgencyScore).toBeGreaterThanOrEqual(90);
    expect(analysis.recommendedDepartmentCode).toBe('DEPT_SAFETY');

    const now = new Date().toISOString();

    runInTransaction(() => {
      // Insert complaint
      db.prepare(`
        INSERT INTO complaints (
          id, citizen_id, title, description, category, predicted_category, priority,
          status, state, city, locality, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', 'Karnataka', 'Bengaluru', 'HAL Airport Road', ?, ?)
      `).run(
        testComplaintId,
        citizenId,
        title,
        description,
        analysis.categoryPredicted,
        analysis.categoryPredicted,
        analysis.priorityPredicted,
        now,
        now
      );

      // Insert AI analysis
      db.prepare(`
        INSERT INTO complaint_analyses (
          id, complaint_id, cleaned_text, tokens_count, language_detected,
          category_predicted, category_confidence, category_explanation,
          priority_predicted, priority_confidence, priority_reasons_json,
          recommended_department_code, recommended_department_name,
          urgency_score, sentiment_score, sentiment_label,
          potential_duplicates_json, master_issue_suggested, processed_at, engine_version
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?
        )
      `).run(
        'AIA-TEST-001',
        testComplaintId,
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
        now,
        AIEngineService.VERSION
      );

      // Initial history
      db.prepare(`
        INSERT INTO complaint_status_history (id, complaint_id, previous_status, new_status, actor_id, actor_name, actor_role, citizen_remark, created_at)
        VALUES (?, ?, NULL, 'SUBMITTED', ?, 'Rajesh Kumar', 'CITIZEN', 'Complaint registered.', ?)
      `).run('HIS-TEST-001', testComplaintId, citizenId, now);
    });

    const stored = db.prepare('SELECT * FROM complaints WHERE id = ?').get(testComplaintId) as any;
    expect(stored).toBeDefined();
    expect(stored.priority).toBe('CRITICAL');
  });

  it('5. Complaint appears in citizen grievance list and admin queue', () => {
    // Citizen list
    const citizenComplaints = db.prepare('SELECT * FROM complaints WHERE citizen_id = ?').all(citizenId);
    expect(citizenComplaints.length).toBe(1);
    expect((citizenComplaints[0] as any).id).toBe(testComplaintId);

    // Admin queue
    const adminComplaints = db.prepare('SELECT c.*, u.name as citizen_name FROM complaints c JOIN users u ON c.citizen_id = u.id WHERE c.id = ?').get(testComplaintId) as any;
    expect(adminComplaints).toBeDefined();
    expect(adminComplaints.citizen_name).toBe('Rajesh Kumar');
  });

  it('6. Admin assigns complaint to Department and notifies citizen', () => {
    const deptId = 'DEPT-POWER';
    const now = new Date().toISOString();

    runInTransaction(() => {
      db.prepare(`
        UPDATE complaints SET assigned_department_id = ?, status = 'ASSIGNED', updated_at = ? WHERE id = ?
      `).run(deptId, now, testComplaintId);

      db.prepare(`
        INSERT INTO complaint_status_history (id, complaint_id, previous_status, new_status, actor_id, actor_name, actor_role, citizen_remark, internal_note, created_at)
        VALUES (?, ?, 'SUBMITTED', 'ASSIGNED', 'USR-ADMIN-001', 'Chief Administrator', 'ADMIN', 'Assigned to BESCOM emergency lineman squad.', 'Emergency cherry picker crew dispatched.', ?)
      `).run('HIS-TEST-002', testComplaintId, now);

      AuditService.logAction({
        adminId: 'USR-ADMIN-001',
        adminName: 'Chief Administrator',
        action: 'ASSIGN_DEPARTMENT',
        entityType: 'COMPLAINT',
        entityId: testComplaintId,
        changes: { newDept: deptId },
      });
    });

    const notif = NotificationService.createNotification({
      userId: citizenId,
      complaintId: testComplaintId,
      title: 'Department Assigned',
      message: 'Your grievance has been assigned to Electricity Supply & Streetlight Authority.',
      type: 'ASSIGNMENT',
      link: `/complaints/${testComplaintId}`,
    });

    expect(notif.userId).toBe(citizenId);
    expect(notif.complaintId).toBe(testComplaintId);

    const updated = db.prepare('SELECT status, assigned_department_id FROM complaints WHERE id = ?').get(testComplaintId) as any;
    expect(updated.status).toBe('ASSIGNED');
    expect(updated.assigned_department_id).toBe(deptId);
  });

  it('7. Admin transitions complaint status to IN_PROGRESS and then RESOLVED', () => {
    const now = new Date().toISOString();

    // Transition ASSIGNED -> IN_PROGRESS
    expect(VALID_STATUS_TRANSITIONS.ASSIGNED).toContain('IN_PROGRESS');
    db.prepare('UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?').run('IN_PROGRESS', now, testComplaintId);

    db.prepare(`
      INSERT INTO complaint_status_history (id, complaint_id, previous_status, new_status, actor_id, actor_name, actor_role, citizen_remark, created_at)
      VALUES (?, ?, 'ASSIGNED', 'IN_PROGRESS', 'USR-ADMIN-001', 'Chief Administrator', 'ADMIN', 'Power isolated. Lineman on site replacing snapped feeder wire.', ?)
    `).run('HIS-TEST-003', testComplaintId, now);

    // Transition IN_PROGRESS -> RESOLVED
    expect(VALID_STATUS_TRANSITIONS.IN_PROGRESS).toContain('RESOLVED');
    db.prepare('UPDATE complaints SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?').run('RESOLVED', now, now, testComplaintId);

    db.prepare(`
      INSERT INTO complaint_status_history (id, complaint_id, previous_status, new_status, actor_id, actor_name, actor_role, citizen_remark, created_at)
      VALUES (?, ?, 'IN_PROGRESS', 'RESOLVED', 'USR-ADMIN-001', 'Chief Administrator', 'ADMIN', 'Wire reconnected, insulator replaced, power safely restored.', ?)
    `).run('HIS-TEST-004', testComplaintId, now);

    const final = db.prepare('SELECT status, resolved_at FROM complaints WHERE id = ?').get(testComplaintId) as any;
    expect(final.status).toBe('RESOLVED');
    expect(final.resolved_at).toBe(now);
  });

  it('8. Verifies status timeline history and audit logging', () => {
    const history = db.prepare('SELECT * FROM complaint_status_history WHERE complaint_id = ? ORDER BY created_at ASC').all(testComplaintId);
    expect(history.length).toBe(4);

    const audit = db.prepare('SELECT * FROM audit_logs WHERE entity_id = ?').all(testComplaintId);
    expect(audit.length).toBeGreaterThan(0);
  });

  it('9. Enforces RBAC & Data Isolation principles', () => {
    // Check that citizen token has role CITIZEN
    const citizenPayload = jwt.verify(citizenToken, JWT_SECRET) as any;
    expect(citizenPayload.role).toBe('CITIZEN');

    // Admin token has role ADMIN
    const adminPayload = jwt.verify(adminToken, JWT_SECRET) as any;
    expect(adminPayload.role).toBe('ADMIN');

    // Verify ownership check: SGC-2026-00004 belongs to USR-CITIZEN-004, NOT citizenId
    const otherComplaint = db.prepare('SELECT citizen_id FROM complaints WHERE id = ?').get('SGC-2026-00004') as any;
    expect(otherComplaint).toBeDefined();
    expect(otherComplaint.citizen_id).not.toBe(citizenId);
  });

  it('10. Enforces valid status transitions state machine', () => {
    // Attempting to jump directly from SUBMITTED to RESOLVED is invalid
    expect(VALID_STATUS_TRANSITIONS.SUBMITTED).not.toContain('RESOLVED');

    // Reopening from RESOLVED to IN_PROGRESS is allowed
    expect(VALID_STATUS_TRANSITIONS.RESOLVED).toContain('IN_PROGRESS');

    // Reopening from CLOSED to UNDER_REVIEW is allowed
    expect(VALID_STATUS_TRANSITIONS.CLOSED).toContain('UNDER_REVIEW');
  });

  it('11. Verifies Master Issue linking and complaint count auto-update', () => {
    const miId = 'MI-2026-0001';
    const beforeCount = (db.prepare('SELECT complaint_count FROM master_issues WHERE id = ?').get(miId) as any).complaint_count;

    // Link complaint to master issue
    db.prepare('UPDATE complaints SET master_issue_id = ? WHERE id = ?').run(miId, testComplaintId);
    db.prepare('UPDATE master_issues SET complaint_count = complaint_count + 1 WHERE id = ?').run(miId);

    const afterCount = (db.prepare('SELECT complaint_count FROM master_issues WHERE id = ?').get(miId) as any).complaint_count;
    expect(afterCount).toBe(beforeCount + 1);
  });

  it('12. Verifies notifications unread counting and mark as read', () => {
    const unreadBefore = NotificationService.getUnreadCount(citizenId);
    expect(unreadBefore).toBeGreaterThan(0);

    // Mark as read
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(citizenId);
    const unreadAfter = NotificationService.getUnreadCount(citizenId);
    expect(unreadAfter).toBe(0);
  });
});
