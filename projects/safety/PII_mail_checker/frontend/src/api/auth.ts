import { api } from './client';
import type { User } from '../types';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

interface AuthResponse {
  success: boolean;
  user: User;
}

export const authApi = {
  login: (data: LoginRequest) => 
    api.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) => 
    api.post<AuthResponse>('/auth/register', data),

  logout: () => 
    api.post<{ success: boolean }>('/auth/logout'),

  getMe: () => 
    api.get<{ success: boolean; user: User }>('/auth/me'),

  updateProfile: (data: { name?: string; password?: string }) =>
    api.put<{ success: boolean; user: User }>('/auth/me', data),
};
