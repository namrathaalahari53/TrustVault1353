/**
 * TrustVault - Centralized Authorization Service
 * Strict server-side authorization enforcement.
 * Enforces Least Privilege, Role-Based Access Control (RBAC),
 * and Document-Level Attribute-Based Access Control (ABAC).
 * 
 * CORE PRINCIPLE: DENY BY DEFAULT.
 * Never trust client claims or user-supplied document IDs.
 */

import { getDb } from '../db/database.ts';
import { logAuditEvent } from './auditService.ts';

export type DocumentAction = 'preview' | 'download' | 'edit' | 'delete' | 'share' | 'revoke';

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  isOwner?: boolean;
  permissionLevel?: 'Owner' | 'Editor' | 'Reader' | null;
}

export interface DocumentPermissionRecord {
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

/**
 * Evaluates whether a user is authorized to perform a specific action on a document.
 * 
 * Rules:
 * - Document must exist (if not found, returns not allowed).
 * - Document Owner: Has full authority (preview, download, edit, delete, share, revoke).
 * - Reader: Allowed preview, download. DENIED edit, delete, share, revoke.
 * - Editor: Allowed preview, download, edit. DENIED delete, share, revoke.
 * - Revoked: If revoked_at is not null, permission is completely void.
 * - Default: Deny.
 */
export function authorizeDocumentAccess(
  userId: string,
  documentId: string,
  action: DocumentAction,
  ipAddress: string = '127.0.0.1'
): AuthorizationResult {
  const db = getDb();

  // 1. Fetch document existence and owner
  const doc = db.prepare('SELECT id, owner_id, name FROM documents WHERE id = ?').get(documentId) as
    | { id: string; owner_id: string; name: string }
    | undefined;

  if (!doc) {
    logAuditEvent({
      userId,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      documentId,
      ipAddress,
      success: false,
      reason: `Document with ID ${documentId} does not exist (potential IDOR probe).`,
      metadata: { attemptedAction: action },
    });
    return {
      allowed: false,
      reason: 'Document not found or access denied.',
    };
  }

  // 2. Check if the user is the Document Owner
  if (doc.owner_id === userId) {
    return {
      allowed: true,
      isOwner: true,
      permissionLevel: 'Owner',
    };
  }

  // 3. For 'delete', 'share', 'revoke': ONLY the document owner is allowed
  if (action === 'delete' || action === 'share' || action === 'revoke') {
    logAuditEvent({
      userId,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      documentId,
      ipAddress,
      success: false,
      reason: `User is not the document owner; attempted privileged action: ${action}.`,
      metadata: { attemptedAction: action, documentName: doc.name },
    });
    return {
      allowed: false,
      isOwner: false,
      reason: 'Only the document owner can delete, share, or revoke permissions on this document.',
    };
  }

  // 4. Query active document permissions (revoked_at MUST BE NULL)
  const perm = db
    .prepare(`
      SELECT id, permission_level, revoked_at
      FROM document_permissions
      WHERE document_id = ? AND user_id = ?
      ORDER BY granted_at DESC
      LIMIT 1
    `)
    .get(documentId, userId) as { id: string; permission_level: 'Reader' | 'Editor'; revoked_at: string | null } | undefined;

  if (!perm || perm.revoked_at !== null) {
    const denialReason = perm?.revoked_at
      ? 'Access revoked: Document permission was previously revoked.'
      : 'Access denied: No active permission found for this user.';
    logAuditEvent({
      userId,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      documentId,
      ipAddress,
      success: false,
      reason: denialReason,
      metadata: { attemptedAction: action, documentName: doc.name },
    });
    return {
      allowed: false,
      isOwner: false,
      reason: denialReason,
    };
  }

  // 5. Check action against permission level
  if (action === 'preview' || action === 'download') {
    // Both Reader and Editor are authorized
    return {
      allowed: true,
      isOwner: false,
      permissionLevel: perm.permission_level,
    };
  }

  if (action === 'edit') {
    if (perm.permission_level === 'Editor') {
      return {
        allowed: true,
        isOwner: false,
        permissionLevel: 'Editor',
      };
    } else {
      // Reader attempting to edit
      logAuditEvent({
        userId,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        documentId,
        ipAddress,
        success: false,
        reason: 'Insufficient permissions: Read-only access does not permit modifications.',
        metadata: { attemptedAction: action, currentPermission: 'Reader' },
      });
      return {
        allowed: false,
        isOwner: false,
        permissionLevel: 'Reader',
        reason: 'Read-only access: You do not have permission to edit this document.',
      };
    }
  }

  // Fallback default deny
  return {
    allowed: false,
    reason: 'Access denied by default policy.',
  };
}

/**
 * Retrieves all active and revoked permissions for a document (Owner or Admin only).
 */
export function getDocumentPermissions(documentId: string): DocumentPermissionRecord[] {
  const db = getDb();
  return db
    .prepare(`
      SELECT p.*, u.email as grantee_email, u.full_name as grantee_name
      FROM document_permissions p
      JOIN users u ON p.user_id = u.id
      WHERE p.document_id = ?
      ORDER BY p.granted_at DESC
    `)
    .all(documentId) as unknown as DocumentPermissionRecord[];
}

/**
 * Grant permission on a document (Reader or Editor).
 * Must be executed by the document owner.
 */
export function grantDocumentPermission(
  documentId: string,
  granteeUserId: string,
  permissionLevel: 'Reader' | 'Editor',
  grantedByUserId: string,
  ipAddress: string = '127.0.0.1'
): DocumentPermissionRecord {
  const db = getDb();

  // Authorize owner
  const doc = db.prepare('SELECT owner_id, name FROM documents WHERE id = ?').get(documentId) as
    | { owner_id: string; name: string }
    | undefined;

  if (!doc) {
    throw new Error('Document not found');
  }

  if (doc.owner_id !== grantedByUserId) {
    logAuditEvent({
      userId: grantedByUserId,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      documentId,
      ipAddress,
      success: false,
      reason: 'Non-owner attempted to grant document permissions.',
      metadata: { targetUser: granteeUserId, level: permissionLevel },
    });
    throw new Error('Only the document owner can grant permissions.');
  }

  if (doc.owner_id === granteeUserId) {
    throw new Error('Owner already possesses full authority over this document.');
  }

  // Revoke any previous active permission for this user on this document
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE document_permissions
    SET revoked_at = ?
    WHERE document_id = ? AND user_id = ? AND revoked_at IS NULL
  `).run(now, documentId, granteeUserId);

  // Insert new permission
  const id = `perm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  db.prepare(`
    INSERT INTO document_permissions (id, document_id, user_id, permission_level, granted_by, granted_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `).run(id, documentId, granteeUserId, permissionLevel, grantedByUserId, now);

  const grantee = db.prepare('SELECT email, full_name FROM users WHERE id = ?').get(granteeUserId) as
    | { email: string; full_name: string }
    | undefined;

  logAuditEvent({
    userId: grantedByUserId,
    action: 'PERMISSION_GRANTED',
    documentId,
    ipAddress,
    success: true,
    metadata: {
      permissionId: id,
      granteeId: granteeUserId,
      granteeEmail: grantee?.email,
      level: permissionLevel,
      documentName: doc.name,
    },
  });

  return {
    id,
    document_id: documentId,
    user_id: granteeUserId,
    permission_level: permissionLevel,
    granted_by: grantedByUserId,
    granted_at: now,
    revoked_at: null,
    grantee_email: grantee?.email,
    grantee_name: grantee?.full_name,
  };
}

/**
 * Revoke permission on a document immediately.
 * Must be executed by the document owner.
 */
export function revokeDocumentPermission(
  permissionId: string,
  revokedByUserId: string,
  ipAddress: string = '127.0.0.1'
): void {
  const db = getDb();

  const perm = db
    .prepare(`
      SELECT p.*, d.owner_id, d.name as doc_name, u.email as grantee_email
      FROM document_permissions p
      JOIN documents d ON p.document_id = d.id
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `)
    .get(permissionId) as
    | {
        id: string;
        document_id: string;
        user_id: string;
        permission_level: string;
        owner_id: string;
        doc_name: string;
        grantee_email: string;
        revoked_at: string | null;
      }
    | undefined;

  if (!perm) {
    throw new Error('Permission record not found.');
  }

  if (perm.owner_id !== revokedByUserId) {
    logAuditEvent({
      userId: revokedByUserId,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      documentId: perm.document_id,
      ipAddress,
      success: false,
      reason: 'Non-owner attempted to revoke document permission.',
      metadata: { permissionId },
    });
    throw new Error('Only the document owner can revoke permissions.');
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE document_permissions SET revoked_at = ? WHERE id = ?').run(now, permissionId);

  logAuditEvent({
    userId: revokedByUserId,
    action: 'PERMISSION_REVOKED',
    documentId: perm.document_id,
    ipAddress,
    success: true,
    metadata: {
      permissionId,
      revokedUser: perm.grantee_email,
      documentName: perm.doc_name,
      previousLevel: perm.permission_level,
    },
  });
}
