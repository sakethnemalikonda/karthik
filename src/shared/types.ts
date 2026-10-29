// Shared Types for SmartGov Connect AI

export type UserRole = 'CITIZEN' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export type ComplaintCategory =
  | 'ROADS'
  | 'WATER'
  | 'GARBAGE'
  | 'ELECTRICITY'
  | 'DRAINAGE'
  | 'PUBLIC_SAFETY'
  | 'OTHER';

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  ROADS: 'Roads & Potholes',
  WATER: 'Water Supply & Leakage',
  GARBAGE: 'Garbage & Sanitation',
  ELECTRICITY: 'Electricity & Streetlights',
  DRAINAGE: 'Drainage & Sewerage',
  PUBLIC_SAFETY: 'Public Safety & Hazards',
  OTHER: 'Other Civic Grievances',
};

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  LOW: 'Low Priority',
  MEDIUM: 'Medium Priority',
  HIGH: 'High Priority',
  CRITICAL: 'Critical Hazard',
};

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned to Dept',
  IN_PROGRESS: 'Work in Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

// Valid transitions: Enforced by backend
export const VALID_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'ASSIGNED', 'CLOSED'],
  UNDER_REVIEW: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'UNDER_REVIEW', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'UNDER_REVIEW', 'ASSIGNED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'], // Reopening allowed
  CLOSED: ['UNDER_REVIEW'], // Documented reopening
};

export type SupportedLanguage = 'en' | 'te' | 'hi';

export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface SecurityEvent {
  id: string;
  userId?: string | null;
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'REGISTRATION' | 'PASSWORD_CHANGE' | 'STATUS_CHANGE';
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  categories: ComplaintCategory[];
  headName: string;
  contactEmail: string;
  contactPhone: string;
  active: boolean;
  activeWorkload?: number;
  resolvedCount?: number;
  createdAt: string;
}

export interface MasterIssue {
  id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: 'OPEN' | 'INVESTIGATING' | 'IN_PROGRESS' | 'RESOLVED';
  locality: string;
  city: string;
  state: string;
  complaintCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateMatch {
  id: string;
  title: string;
  similarityScore: number;
  locality: string;
  status: ComplaintStatus;
  reason: string;
}

export interface AIAnalysisResult {
  id: string;
  complaintId: string;
  cleanedText: string;
  tokensCount: number;
  languageDetected: string;
  categoryPredicted: ComplaintCategory;
  categoryConfidence: number;
  categoryExplanation: string;
  priorityPredicted: ComplaintPriority;
  priorityConfidence: number;
  priorityReasons: string[];
  recommendedDepartmentCode: string;
  recommendedDepartmentName: string;
  urgencyScore: number; // 0 to 100
  sentimentScore: number;
  sentimentLabel: 'Negative' | 'Neutral' | 'Frustrated' | 'Urgent';
  potentialDuplicates: DuplicateMatch[];
  masterIssueSuggested: boolean;
  suggestedMasterIssueId?: string | null;
  processedAt: string;
  engineVersion: string;
}

export interface StatusHistoryEntry {
  id: string;
  complaintId: string;
  previousStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  citizenRemark?: string | null;
  internalNote?: string | null;
  createdAt: string;
}

export interface Complaint {
  id: string;
  citizenId: string;
  citizenName?: string;
  citizenPhone?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  predictedCategory?: ComplaintCategory | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  state: string;
  city: string;
  locality: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  language: SupportedLanguage;
  imageUrl?: string | null;
  assignedDepartmentId?: string | null;
  assignedDepartment?: Department | null;
  department?: Department | null;
  recommendedDepartmentId?: string | null;
  recommendedDepartment?: Department | null;
  masterIssueId?: string | null;
  masterIssue?: MasterIssue | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  analysis?: AIAnalysisResult | null;
  statusHistory?: StatusHistoryEntry[];
}

export interface Notification {
  id: string;
  userId: string;
  complaintId?: string | null;
  title: string;
  message: string;
  type: 'STATUS_UPDATE' | 'ASSIGNMENT' | 'DUPLICATE_FLAG' | 'RESOLVED' | 'GENERAL';
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName?: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface DashboardMetrics {
  totalComplaints: number;
  pendingComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  criticalComplaints: number;
  highComplaints: number;
  totalCitizens: number;
  activeCitizens: number;
  resolutionRate: number; // percentage
  avgResolutionHours: number;
  categoryDistribution: { category: ComplaintCategory; label: string; count: number }[];
  priorityDistribution: { priority: ComplaintPriority; label: string; count: number }[];
  statusDistribution: { status: ComplaintStatus; label: string; count: number }[];
  departmentWorkloads: { departmentId: string; name: string; code: string; count: number; active: number }[];
  recentActivity: {
    id: string;
    complaintId: string;
    title: string;
    action: string;
    timestamp: string;
    status: ComplaintStatus;
  }[];
}
