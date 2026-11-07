/**
 * TrustVault - Frontend Type Definitions
 */

export type UserRole = 'Administrator' | 'Owner' | 'ViewerEditor';
export type PermissionLevel = 'Owner' | 'Editor' | 'Reader';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_extension: string;
  owner_id: string;
  category: string;
  description: string;
  checksum_sha256: string;
  created_at: string;
  updated_at: string;
  owner_name: string;
  owner_email: string;
  user_permission: PermissionLevel;
}

export interface DocumentPermission {
  id: string;
  document_id: string;
  user_id: string;
  permission_level: 'Reader' | 'Editor';
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
  grantee_email?: string;
  grantee_name?: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  document_id: string | null;
  timestamp: string;
  ip_address: string | null;
  success: number;
  reason: string | null;
  metadata: string | null;
  prev_hash: string;
  current_hash: string;
}

export interface IntegrityReport {
  valid: boolean;
  totalRecords: number;
  genesisHash: string;
  latestHash: string;
  tamperedRecordId: string | null;
  tamperedIndex: number | null;
  errorDetail: string | null;
  verifiedAt: string;
}

export interface SystemStats {
  totalDocs: number;
  myDocs: number;
  sharedDocs: number;
  totalUsers: number;
  totalAuditRecords: number;
  securityEvents: number;
  integrityValid: boolean;
  isAdmin: boolean;
}

export interface TestCaseResult {
  id: number;
  name: string;
  category: 'Ownership' | 'Authorization' | 'Permissions' | 'Audit' | 'Upload Security';
  passed: boolean;
  message: string;
  executionTimeMs: number;
}

export interface SecurityTestReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  tests: TestCaseResult[];
}
