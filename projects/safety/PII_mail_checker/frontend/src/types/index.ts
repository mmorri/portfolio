export type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';
export type FindingStatus = 'NEW' | 'ACKNOWLEDGED' | 'REVIEWING' | 'RESOLVED' | 'FALSE_POSITIVE' | 'ESCALATED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PiiType = 'ssn' | 'creditCard' | 'email' | 'phone' | 'bankAccount';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Finding {
  id: string;
  emailId: string | null;
  gmailAccountId: string;
  status: FindingStatus;
  severity: Severity;
  riskScore: number;
  piiType: string;
  piiCategory: string;
  description: string;
  matchCount: number;
  confidence: number;
  mlEnhanced: boolean;
  detectionMethod: string;
  redactedValue: string | null;
  context: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  falsePositive: boolean;
  email?: Email;
  reviewedBy?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface Email {
  id: string;
  gmailMessageId: string;
  from: string;
  to: string[];
  subject: string;
  bodyPreview: string | null;
  receivedAt: string;
}

export interface Policy {
  id: string;
  userId: string;
  name: string;
  enabledPiiTypes: string[];
  confidenceThreshold: number;
  highSeverityScore: number;
  criticalSeverityScore: number;
  allowedDomains: string[];
  allowedSenders: string[];
  emailNotifications: boolean;
  notifyOnSeverity: Severity;
  isActive: boolean;
}

export interface Statistics {
  total: number;
  bySeverity: Record<Severity, number>;
  byStatus: Record<FindingStatus, number>;
  byPiiType: Record<string, number>;
  recentFindings: Pick<Finding, 'id' | 'piiType' | 'severity' | 'status' | 'createdAt'>[];
  period: { days: number; startDate: string };
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'email' | 'name'>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface FindingsResponse {
  success: boolean;
  findings: Finding[];
  pagination: Pagination;
}

export interface StatisticsResponse {
  success: boolean;
  statistics: Statistics;
}
