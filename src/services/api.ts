/**
 * TrustVault - Typed API Client
 * Wraps Fetch with automatic JWT authorization header injection,
 * error handling, and response decoding.
 */

import {
  User,
  DocumentItem,
  DocumentPermission,
  AuditLog,
  IntegrityReport,
  SystemStats,
  SecurityTestReport,
} from '../types.ts';

const TOKEN_KEY = 'trustvault_jwt_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set Content-Type only if not sending FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, do not clear token immediately if inspecting, but return error
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const data = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  getMe: async () => {
    return request<{ user: User }>('/api/auth/me');
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Users (Admin)
  getUsers: async () => {
    return request<{ users: User[] }>('/api/users');
  },

  createUser: async (user: { email: string; password: string; full_name: string; role: string }) => {
    return request<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  toggleUserStatus: async (userId: string, is_active: boolean) => {
    return request<{ success: boolean; is_active: boolean }>(`/api/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  },

  updateUserRole: async (userId: string, role: string) => {
    return request<{ success: boolean; role: string }>(`/api/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  // Categories
  getCategories: async () => {
    return request<{ categories: Array<{ id: string; name: string; description: string }> }>('/api/categories');
  },

  // Documents
  getDocuments: async (params?: { q?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.category) query.set('category', params.category);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ documents: DocumentItem[] }>(`/api/documents${qs}`);
  },

  getDocument: async (id: string) => {
    return request<{ document: DocumentItem & { is_owner: boolean } }>(`/api/documents/${id}`);
  },

  uploadDocument: async (formData: FormData) => {
    return request<{ document: DocumentItem }>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  updateDocument: async (id: string, updates: { name?: string; category?: string; description?: string }) => {
    return request<{ success: boolean; message: string }>(`/api/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteDocument: async (id: string) => {
    return request<{ success: boolean; message: string }>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  },

  // Permissions
  getPermissions: async (documentId: string) => {
    return request<{ permissions: DocumentPermission[] }>(`/api/documents/${documentId}/permissions`);
  },

  grantPermission: async (documentId: string, granteeUserId: string, permissionLevel: 'Reader' | 'Editor') => {
    return request<{ permission: DocumentPermission }>(`/api/documents/${documentId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ granteeUserId, permissionLevel }),
    });
  },

  revokePermission: async (permissionId: string) => {
    return request<{ success: boolean; message: string }>(`/api/permissions/${permissionId}`, {
      method: 'DELETE',
    });
  },

  // Audit Logs
  getAuditLogs: async () => {
    return request<{ logs: AuditLog[] }>('/api/audit');
  },

  verifyAuditIntegrity: async () => {
    return request<IntegrityReport>('/api/audit/verify');
  },

  simulateTamperTest: async () => {
    return request<{
      testRecordId: string;
      detectedTamper: boolean;
      tamperDetectionDetail: string;
      repairedSuccessfully: boolean;
    }>('/api/audit/simulate-tamper', {
      method: 'POST',
    });
  },

  // Security Test Suite
  runSecurityTests: async () => {
    return request<SecurityTestReport>('/api/security/run-tests', {
      method: 'POST',
    });
  },

  // System Stats
  getStats: async () => {
    return request<SystemStats>('/api/system/stats');
  },

  // Download blob helper
  downloadDocument: async (id: string, filename: string) => {
    const token = getStoredToken();
    const res = await fetch(`/api/documents/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(err.error || 'Failed to download document');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Preview blob helper
  getPreviewUrl: async (id: string) => {
    const token = getStoredToken();
    const res = await fetch(`/api/documents/${id}/preview`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Preview failed' }));
      throw new Error(err.error || 'Failed to load preview');
    }

    const blob = await res.blob();
    return {
      url: window.URL.createObjectURL(blob),
      mimeType: res.headers.get('Content-Type') || 'application/octet-stream',
    };
  },
};
