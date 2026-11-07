/**
 * TrustVault - Full-Stack Express Server with Vite Integration
 * Integrates REST API routes with Vite middleware on port 3000.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import multer from 'multer';
import { initDatabase, getDb } from './server/db/database.ts';
import {
  seedUsers,
  getUserByEmail,
  getUserById,
  verifyPassword,
  generateToken,
  verifyToken,
  hashPassword,
  createUser,
  UserSafeProfile,
  AuthTokenPayload,
} from './server/services/authService.ts';
import {
  authorizeDocumentAccess,
  getDocumentPermissions,
  grantDocumentPermission,
  revokeDocumentPermission,
} from './server/services/authorizationService.ts';
import {
  validateUploadedDocument,
  saveToVaultStorage,
  readFromVaultStorage,
  deleteFromVaultStorage,
} from './server/services/fileService.ts';
import {
  logAuditEvent,
  verifyAuditTrailIntegrity,
  simulateTamperAuditRecord,
  repairTamperAuditRecord,
} from './server/services/auditService.ts';
import { runAllSecurityTests } from './server/services/securityTestRunner.ts';

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

// JSON parsing
app.use(express.json());

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Seed DB and Users
initDatabase();
seedUsers().catch((err) => console.error('Error seeding users:', err));

// ==========================================
// Authentication Middleware
// ==========================================
function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No valid Bearer token provided.' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token. Please sign in again.' });
    return;
  }

  // Verify account is active in live database
  const user = getUserById(payload.userId);
  if (!user || user.is_active === 0) {
    logAuditEvent({
      userId: payload.userId,
      userEmail: payload.email,
      action: 'LOGIN_BLOCKED_INACTIVE',
      ipAddress: req.ip,
      success: false,
      reason: 'User account is deactivated or deleted.',
    });
    res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
    return;
  }

  req.user = payload;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'Administrator') {
    logAuditEvent({
      userId: req.user?.userId || null,
      userEmail: req.user?.email || null,
      action: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
      ipAddress: req.ip,
      success: false,
      reason: 'Non-administrator attempted to access admin-restricted endpoint.',
    });
    res.status(403).json({ error: 'Access denied: Administrator privilege required.' });
    return;
  }
  next();
}

// ==========================================
// API Routes
// ==========================================

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    platform: 'TrustVault Secure Document Sharing Platform',
    timestamp: new Date().toISOString(),
  });
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = getUserByEmail(email);
    if (!user) {
      logAuditEvent({
        userEmail: email,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip,
        success: false,
        reason: 'User email not found.',
      });
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.is_active === 0) {
      logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip,
        success: false,
        reason: 'Account is deactivated.',
      });
      res.status(403).json({ error: 'This account has been deactivated. Contact an administrator.' });
      return;
    }

    const matches = await verifyPassword(password, user.password_hash);
    if (!matches) {
      logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip,
        success: false,
        reason: 'Incorrect password supplied.',
      });
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken(user);
    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN_SUCCESS',
      ipAddress: req.ip,
      success: true,
      metadata: { role: user.role },
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: true,
        created_at: user.created_at,
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Login failed' });
  }
});

// Auth: Me
app.get('/api/auth/me', authenticate, (req, res) => {
  const user = getUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active === 1,
      created_at: user.created_at,
    },
  });
});

// Auth: Change Password
app.post('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }

    const user = getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: 'PASSWORD_CHANGE_FAILED',
        ipAddress: req.ip,
        success: false,
        reason: 'Incorrect current password provided.',
      });
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    const db = getDb();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      newHash,
      new Date().toISOString(),
      user.id
    );

    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_CHANGE_SUCCESS',
      ipAddress: req.ip,
      success: true,
    });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error updating password' });
  }
});

// User Management (Admin Only)
app.get('/api/users', authenticate, (req, res) => {
  const db = getDb();
  const users = db
    .prepare('SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC')
    .all() as unknown as UserSafeProfile[];
  res.json({ users });
});

app.post('/api/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;
    if (!email || !password || !full_name || !role) {
      res.status(400).json({ error: 'All fields (email, password, full_name, role) are required.' });
      return;
    }

    const newUser = await createUser(email, password, full_name, role, req.user!.userId);
    res.status(201).json({ user: newUser });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create user' });
  }
});

app.patch('/api/users/:id/status', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id) as { id: string; email: string } | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Prevent disabling self
  if (id === req.user!.userId) {
    res.status(400).json({ error: 'Administrators cannot deactivate their own account.' });
    return;
  }

  const activeVal = is_active ? 1 : 0;
  db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(
    activeVal,
    new Date().toISOString(),
    id
  );

  logAuditEvent({
    userId: req.user!.userId,
    userEmail: req.user!.email,
    action: activeVal === 1 ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    ipAddress: req.ip,
    success: true,
    metadata: { targetUserId: id, targetEmail: user.email },
  });

  res.json({ success: true, is_active: activeVal === 1 });
});

app.patch('/api/users/:id/role', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const db = getDb();

  if (!['Administrator', 'Owner', 'ViewerEditor'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, new Date().toISOString(), id);

  logAuditEvent({
    userId: req.user!.userId,
    userEmail: req.user!.email,
    action: 'USER_ROLE_UPDATED',
    ipAddress: req.ip,
    success: true,
    metadata: { targetUserId: id, newRole: role },
  });

  res.json({ success: true, role });
});

// Categories
app.get('/api/categories', authenticate, (_req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  res.json({ categories });
});

// Documents: List (Strictly filtered by server-side authorization!)
app.get('/api/documents', authenticate, (req, res) => {
  const userId = req.user!.userId;
  const { q, category } = req.query;
  const db = getDb();

  // Query documents owned by user OR shared with user (with active permission, revoked_at IS NULL)
  let query = `
    SELECT DISTINCT
      d.id, d.name, d.original_filename, d.file_size, d.mime_type, d.file_extension,
      d.owner_id, d.category, d.description, d.checksum_sha256, d.created_at, d.updated_at,
      u.full_name as owner_name, u.email as owner_email,
      CASE
        WHEN d.owner_id = ? THEN 'Owner'
        ELSE p.permission_level
      END as user_permission
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    LEFT JOIN document_permissions p ON d.id = p.document_id AND p.user_id = ? AND p.revoked_at IS NULL
    WHERE (d.owner_id = ? OR (p.id IS NOT NULL AND p.revoked_at IS NULL))
  `;

  const params: (string | number)[] = [userId, userId, userId];

  if (category && typeof category === 'string' && category !== 'All') {
    query += ' AND d.category = ?';
    params.push(category);
  }

  if (q && typeof q === 'string' && q.trim()) {
    query += ' AND (LOWER(d.name) LIKE ? OR LOWER(d.description) LIKE ? OR LOWER(u.full_name) LIKE ?)';
    const term = `%${q.trim().toLowerCase()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY d.created_at DESC';

  const documents = db.prepare(query).all(...params);
  res.json({ documents });
});

// Documents: Upload
app.post('/api/documents/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file was uploaded.' });
      return;
    }

    const { name, category, description } = req.body;
    const documentName = (name || file.originalname).trim();
    const docCategory = (category || 'General').trim();

    // Deep validation: MIME, extension, magic bytes, ClamAV/malware scanning
    const validation = validateUploadedDocument(file.originalname, file.mimetype, file.buffer);
    if (!validation.valid) {
      logAuditEvent({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: 'DOCUMENT_UPLOAD_REJECTED',
        ipAddress: req.ip,
        success: false,
        reason: validation.error,
        metadata: {
          originalName: file.originalname,
          size: file.size,
          malwareDetected: validation.malwareDetected || false,
        },
      });
      res.status(400).json({ error: validation.error });
      return;
    }

    const parts = file.originalname.split('.');
    const ext = parts[parts.length - 1].toLowerCase();

    // Save to private vault storage
    const storedFilename = saveToVaultStorage(file.buffer, ext);
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const db = getDb();
    db.prepare(`
      INSERT INTO documents (
        id, name, original_filename, stored_filename, file_size,
        mime_type, file_extension, owner_id, category, description,
        checksum_sha256, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      documentName,
      file.originalname,
      storedFilename,
      file.size,
      validation.detectedMime || file.mimetype,
      ext,
      req.user!.userId,
      docCategory,
      description || '',
      validation.sha256Checksum!,
      now,
      now
    );

    logAuditEvent({
      userId: req.user!.userId,
      userEmail: req.user!.email,
      action: 'DOCUMENT_UPLOAD',
      documentId: docId,
      ipAddress: req.ip,
      success: true,
      metadata: {
        documentName,
        size: file.size,
        mime: validation.detectedMime,
        sha256: validation.sha256Checksum,
      },
    });

    res.status(201).json({
      document: {
        id: docId,
        name: documentName,
        original_filename: file.originalname,
        file_size: file.size,
        mime_type: validation.detectedMime,
        file_extension: ext,
        category: docCategory,
        description,
        checksum_sha256: validation.sha256Checksum,
        created_at: now,
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Upload processing error' });
  }
});

// Documents: Details
app.get('/api/documents/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const auth = authorizeDocumentAccess(req.user!.userId, id, 'preview', req.ip);

  if (!auth.allowed) {
    res.status(403).json({ error: auth.reason });
    return;
  }

  const db = getDb();
  const doc = db
    .prepare(`
      SELECT d.*, u.full_name as owner_name, u.email as owner_email
      FROM documents d
      JOIN users u ON d.owner_id = u.id
      WHERE d.id = ?
    `)
    .get(id) as Record<string, unknown> | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  res.json({
    document: {
      ...doc,
      user_permission: auth.permissionLevel,
      is_owner: auth.isOwner,
    },
  });
});

// Documents: Update Metadata (Owner or Editor only)
app.patch('/api/documents/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const auth = authorizeDocumentAccess(req.user!.userId, id, 'edit', req.ip);

  if (!auth.allowed) {
    res.status(403).json({ error: auth.reason });
    return;
  }

  const { name, category, description } = req.body;
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE documents
    SET name = COALESCE(?, name),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        updated_at = ?
    WHERE id = ?
  `).run(name || null, category || null, description || null, now, id);

  logAuditEvent({
    userId: req.user!.userId,
    userEmail: req.user!.email,
    action: 'DOCUMENT_EDIT',
    documentId: id,
    ipAddress: req.ip,
    success: true,
    metadata: { updatedFields: { name, category, description } },
  });

  res.json({ success: true, message: 'Document updated successfully.' });
});

// Documents: Delete (Owner only)
app.delete('/api/documents/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const auth = authorizeDocumentAccess(req.user!.userId, id, 'delete', req.ip);

  if (!auth.allowed) {
    res.status(403).json({ error: auth.reason });
    return;
  }

  const db = getDb();
  const doc = db.prepare('SELECT stored_filename, name FROM documents WHERE id = ?').get(id) as
    | { stored_filename: string; name: string }
    | undefined;

  if (doc) {
    deleteFromVaultStorage(doc.stored_filename);
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    logAuditEvent({
      userId: req.user!.userId,
      userEmail: req.user!.email,
      action: 'DOCUMENT_DELETE',
      documentId: id,
      ipAddress: req.ip,
      success: true,
      metadata: { deletedName: doc.name },
    });
  }

  res.json({ success: true, message: 'Document permanently deleted from vault.' });
});

// Documents: Secure Preview
app.get('/api/documents/:id/preview', authenticate, (req, res) => {
  const { id } = req.params;
  const auth = authorizeDocumentAccess(req.user!.userId, id, 'preview', req.ip);

  if (!auth.allowed) {
    res.status(403).json({ error: auth.reason });
    return;
  }

  const db = getDb();
  const doc = db.prepare('SELECT stored_filename, mime_type, original_filename, name FROM documents WHERE id = ?').get(id) as
    | { stored_filename: string; mime_type: string; original_filename: string; name: string }
    | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document file not found' });
    return;
  }

  const buffer = readFromVaultStorage(doc.stored_filename);
  if (!buffer) {
    res.status(404).json({ error: 'Vault file missing on physical storage' });
    return;
  }

  logAuditEvent({
    userId: req.user!.userId,
    userEmail: req.user!.email,
    action: 'DOCUMENT_PREVIEW',
    documentId: id,
    ipAddress: req.ip,
    success: true,
    metadata: { documentName: doc.name },
  });

  // Secure preview headers
  res.setHeader('Content-Type', doc.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_filename)}"`);
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(buffer);
});

// Documents: Secure Download
app.get('/api/documents/:id/download', authenticate, (req, res) => {
  const { id } = req.params;
  const auth = authorizeDocumentAccess(req.user!.userId, id, 'download', req.ip);

  if (!auth.allowed) {
    res.status(403).json({ error: auth.reason });
    return;
  }

  const db = getDb();
  const doc = db.prepare('SELECT stored_filename, mime_type, original_filename, name FROM documents WHERE id = ?').get(id) as
    | { stored_filename: string; mime_type: string; original_filename: string; name: string }
    | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document file not found' });
    return;
  }

  const buffer = readFromVaultStorage(doc.stored_filename);
  if (!buffer) {
    res.status(404).json({ error: 'Vault file missing on storage' });
    return;
  }

  logAuditEvent({
    userId: req.user!.userId,
    userEmail: req.user!.email,
    action: 'DOCUMENT_DOWNLOAD',
    documentId: id,
    ipAddress: req.ip,
    success: true,
    metadata: { documentName: doc.name },
  });

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_filename)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(buffer);
});

// Permissions: View Roster
app.get('/api/documents/:id/permissions', authenticate, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const doc = db.prepare('SELECT owner_id FROM documents WHERE id = ?').get(id) as { owner_id: string } | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  // Only Owner or Administrator can inspect permission roster
  if (doc.owner_id !== req.user!.userId && req.user!.role !== 'Administrator') {
    res.status(403).json({ error: 'Only the document owner or system administrator can inspect permissions.' });
    return;
  }

  const permissions = getDocumentPermissions(id);
  res.json({ permissions });
});

// Permissions: Grant
app.post('/api/documents/:id/permissions', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const { granteeUserId, permissionLevel } = req.body;

    if (!granteeUserId || !['Reader', 'Editor'].includes(permissionLevel)) {
      res.status(400).json({ error: 'granteeUserId and valid permissionLevel (Reader|Editor) are required.' });
      return;
    }

    const perm = grantDocumentPermission(id, granteeUserId, permissionLevel, req.user!.userId, req.ip);
    res.status(201).json({ permission: perm });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error granting permission' });
  }
});

// Permissions: Revoke
app.delete('/api/permissions/:permissionId', authenticate, (req, res) => {
  try {
    const { permissionId } = req.params;
    revokeDocumentPermission(permissionId, req.user!.userId, req.ip);
    res.json({ success: true, message: 'Permission revoked immediately.' });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error revoking permission' });
  }
});

// Audit: Search and List
app.get('/api/audit', authenticate, (req, res) => {
  const db = getDb();
  const isAdmin = req.user!.role === 'Administrator';
  const userId = req.user!.userId;

  let query = 'SELECT * FROM audit_logs';
  const params: string[] = [];

  // Non-admins can only see audit events pertaining to themselves or documents they own
  if (!isAdmin) {
    query += `
      WHERE user_id = ? OR document_id IN (
        SELECT id FROM documents WHERE owner_id = ?
      )
    `;
    params.push(userId, userId);
  }

  query += ' ORDER BY rowid DESC LIMIT 200';
  const logs = db.prepare(query).all(...params);
  res.json({ logs });
});

// Audit: Verify Cryptographic Hash Chain Integrity
app.get('/api/audit/verify', authenticate, (_req, res) => {
  const result = verifyAuditTrailIntegrity();
  res.json(result);
});

// Audit: Simulate Tampering and Detection Test (Test #15 UI Demo)
app.post('/api/audit/simulate-tamper', authenticate, requireAdmin, (req, res) => {
  const testLog = logAuditEvent({
    userId: req.user!.userId,
    userEmail: req.user!.email,
    action: 'TAMPER_DEMO_RECORD',
    success: true,
    reason: 'Cryptographic integrity test baseline record',
  });

  // Tamper with record in DB
  simulateTamperAuditRecord(testLog.id, 'UNAUTHORIZED_ALTERATION_ATTEMPT_DETECTED');

  // Verify failure is caught
  const tamperResult = verifyAuditTrailIntegrity();

  // Repair
  repairTamperAuditRecord(testLog.id);
  const repairedResult = verifyAuditTrailIntegrity();

  res.json({
    testRecordId: testLog.id,
    detectedTamper: !tamperResult.valid,
    tamperDetectionDetail: tamperResult.errorDetail,
    repairedSuccessfully: repairedResult.valid,
  });
});

// Security: Run All 18 Automated Tests
app.post('/api/security/run-tests', authenticate, async (_req, res) => {
  try {
    const report = await runAllSecurityTests();
    res.json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Security test execution failed' });
  }
});

// System Stats
app.get('/api/system/stats', authenticate, (req, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const isAdmin = req.user!.role === 'Administrator';

  const totalDocs = (db.prepare('SELECT COUNT(*) as c FROM documents').get() as { c: number }).c;
  const myDocs = (db.prepare('SELECT COUNT(*) as c FROM documents WHERE owner_id = ?').get(userId) as { c: number }).c;
  const sharedDocs = (
    db
      .prepare(`
        SELECT COUNT(DISTINCT document_id) as c
        FROM document_permissions
        WHERE user_id = ? AND revoked_at IS NULL
      `)
      .get(userId) as { c: number }
  ).c;

  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const totalAuditRecords = (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as { c: number }).c;
  const securityEvents = (
    db
      .prepare("SELECT COUNT(*) as c FROM audit_logs WHERE action = 'UNAUTHORIZED_ACCESS_ATTEMPT'")
      .get() as { c: number }
  ).c;

  const integrity = verifyAuditTrailIntegrity();

  res.json({
    totalDocs,
    myDocs,
    sharedDocs,
    totalUsers,
    totalAuditRecords,
    securityEvents,
    integrityValid: integrity.valid,
    isAdmin,
  });
});

// ==========================================
// Vite Middleware Integration
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TrustVault] Server running securely on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting TrustVault server:', err);
  process.exit(1);
});
