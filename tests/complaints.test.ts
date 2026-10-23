import { describe, it, expect } from 'vitest';
import {
  VALID_STATUS_TRANSITIONS,
  ComplaintStatus,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../src/shared/types.js';

describe('Complaint Lifecycle & State Machine', () => {
  it('enforces valid status transitions', () => {
    // SUBMITTED can transition to UNDER_REVIEW, ASSIGNED, CLOSED
    expect(VALID_STATUS_TRANSITIONS.SUBMITTED).toContain('UNDER_REVIEW');
    expect(VALID_STATUS_TRANSITIONS.SUBMITTED).toContain('ASSIGNED');
    expect(VALID_STATUS_TRANSITIONS.SUBMITTED).not.toContain('RESOLVED'); // Cannot jump straight to resolved

    // IN_PROGRESS can transition to RESOLVED
    expect(VALID_STATUS_TRANSITIONS.IN_PROGRESS).toContain('RESOLVED');

    // RESOLVED can transition to CLOSED or reopened to IN_PROGRESS
    expect(VALID_STATUS_TRANSITIONS.RESOLVED).toContain('CLOSED');
    expect(VALID_STATUS_TRANSITIONS.RESOLVED).toContain('IN_PROGRESS');

    // CLOSED can be reopened to UNDER_REVIEW
    expect(VALID_STATUS_TRANSITIONS.CLOSED).toContain('UNDER_REVIEW');
  });

  it('contains labels for all defined categories and priorities', () => {
    expect(CATEGORY_LABELS.ROADS).toBe('Roads & Potholes');
    expect(CATEGORY_LABELS.WATER).toBe('Water Supply & Leakage');
    expect(CATEGORY_LABELS.GARBAGE).toBe('Garbage & Sanitation');
    expect(CATEGORY_LABELS.ELECTRICITY).toBe('Electricity & Streetlights');
    expect(CATEGORY_LABELS.DRAINAGE).toBe('Drainage & Sewerage');
    expect(CATEGORY_LABELS.PUBLIC_SAFETY).toBe('Public Safety & Hazards');
    expect(CATEGORY_LABELS.OTHER).toBe('Other Civic Grievances');

    expect(PRIORITY_LABELS.CRITICAL).toBe('Critical Hazard');
    expect(PRIORITY_LABELS.HIGH).toBe('High Priority');
    expect(PRIORITY_LABELS.MEDIUM).toBe('Medium Priority');
    expect(PRIORITY_LABELS.LOW).toBe('Low Priority');

    expect(STATUS_LABELS.SUBMITTED).toBe('Submitted');
    expect(STATUS_LABELS.RESOLVED).toBe('Resolved');
  });
});
