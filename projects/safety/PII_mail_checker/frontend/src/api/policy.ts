import { api } from './client';
import type { Policy, Severity } from '../types';

interface UpdatePolicyRequest {
  enabledPiiTypes?: string[];
  confidenceThreshold?: number;
  highSeverityScore?: number;
  criticalSeverityScore?: number;
  allowedDomains?: string[];
  allowedSenders?: string[];
  emailNotifications?: boolean;
  notifyOnSeverity?: Severity;
}

export const policyApi = {
  get: () =>
    api.get<{ success: boolean; policy: Policy }>('/policy'),

  update: (data: UpdatePolicyRequest) =>
    api.put<{ success: boolean; policy: Policy }>('/policy', data),
};
