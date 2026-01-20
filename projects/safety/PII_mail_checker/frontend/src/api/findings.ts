import { api } from './client';
import type { Finding, FindingsResponse, StatisticsResponse, FindingStatus, Severity } from '../types';

interface GetFindingsParams {
  status?: FindingStatus;
  severity?: Severity;
  piiType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  gmailAccountId?: string;
}

interface UpdateStatusRequest {
  status: FindingStatus;
  reviewNotes?: string;
  falsePositive?: boolean;
}

interface FeedbackRequest {
  isCorrect: boolean;
  correctType?: string;
  notes?: string;
}

export const findingsApi = {
  getAll: (params?: GetFindingsParams) =>
    api.get<FindingsResponse>('/findings', params as Record<string, string | number>),

  getById: (id: string) =>
    api.get<{ success: boolean; finding: Finding }>(`/findings/${id}`),

  getStatistics: (days = 7, gmailAccountId?: string) =>
    api.get<StatisticsResponse>('/findings/statistics', { days, gmailAccountId }),

  updateStatus: (id: string, data: UpdateStatusRequest) =>
    api.patch<{ success: boolean; finding: Finding }>(`/findings/${id}/status`, data),

  bulkUpdate: (ids: string[], status: FindingStatus) =>
    api.post<{ success: boolean; updated: number }>('/findings/bulk-update', { ids, status }),

  addFeedback: (id: string, data: FeedbackRequest) =>
    api.post<{ success: boolean; feedback: unknown }>(`/findings/${id}/feedback`, data),
};
