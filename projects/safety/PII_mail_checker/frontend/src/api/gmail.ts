import { api } from './client';

export interface GmailAccount {
  id: string;
  email: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

interface SetupStatusResponse {
  success: boolean;
  isConfigured: boolean;
  hasConnectedAccounts: boolean;
  accounts: GmailAccount[];
}

interface AuthUrlResponse {
  success: boolean;
  authUrl: string;
}

interface ScanResponse {
  success: boolean;
  scanned: number;
  findingsCreated: number;
}

export const gmailApi = {
  getSetupStatus: () =>
    api.get<SetupStatusResponse>('/gmail/setup-status'),

  getAuthUrl: () =>
    api.get<AuthUrlResponse>('/gmail/auth-url'),

  getAccounts: () =>
    api.get<{ success: boolean; accounts: GmailAccount[] }>('/gmail/accounts'),

  disconnectAccount: (id: string) =>
    api.delete<{ success: boolean }>(`/gmail/accounts/${id}`),

  scanEmails: (accountId: string, count = 10) =>
    api.post<ScanResponse>(`/gmail/scan/${accountId}`, { count }),
};
