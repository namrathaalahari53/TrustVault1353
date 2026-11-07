/**
 * TrustVault - Authentication & Session Service
 * Handles password hashing with bcrypt, JWT generation & verification,
 * and user account lifecycle management.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.ts';
import { logAuditEvent } from './auditService.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'trustvault-super-secure-jwt-signing-key-2026-prod';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 12;

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'Administrator' | 'Owner' | 'ViewerEditor';
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface UserSafeProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'Administrator' | 'Owner' | 'ViewerEditor';
  is_active: boolean;
  created_at: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Hash password securely with bcrypt
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compare password with hash
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Generate signed JWT
 */
export function generateToken(user: UserRecord): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT and return payload
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Retrieve user by ID
 */
export function getUserById(id: string): UserRecord | null {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRecord | undefined;
  return user || null;
}

/**
 * Retrieve user by Email
 */
export function getUserByEmail(email: string): UserRecord | null {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as UserRecord | undefined;
  return user || null;
}

/**
 * Create a new user with secure password hash
 */
export async function createUser(
  email: string,
  plainPassword: string,
  fullName: string,
  role: 'Administrator' | 'Owner' | 'ViewerEditor',
  actorId?: string | null
): Promise<UserSafeProfile> {
  const db = getDb();
  const existing = getUserByEmail(email);
  if (existing) {
    throw new Error('A user with this email address already exists.');
  }

  const id = uuidv4();
  const passwordHash = await hashPassword(plainPassword);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  stmt.run(id, email.toLowerCase().trim(), passwordHash, fullName.trim(), role, now, now);

  logAuditEvent({
    userId: actorId || id,
    userEmail: email,
    action: 'USER_CREATED',
    success: true,
    metadata: { createdUserId: id, role, fullName },
  });

  return {
    id,
    email: email.toLowerCase().trim(),
    full_name: fullName.trim(),
    role,
    is_active: true,
    created_at: now,
  };
}

/**
 * Seed initial user accounts if not present
 */
export async function seedUsers(): Promise<void> {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (count > 0) return;

  // 1. Admin
  await createUser(
    'admin@trustvault.internal',
    'Admin@TrustVault2026!',
    'Global System Administrator',
    'Administrator',
    'system'
  );

  // 2. Document Owner
  await createUser(
    'owner@trustvault.internal',
    'Owner@TrustVault2026!',
    'Sarah Jenkins (Doc Owner)',
    'Owner',
    'system'
  );

  // 3. Viewer / Editor
  await createUser(
    'editor@trustvault.internal',
    'Editor@TrustVault2026!',
    'David Miller (Auditor & Editor)',
    'ViewerEditor',
    'system'
  );

  // 4. Secondary Viewer (used for unauthorized testing / isolation)
  await createUser(
    'viewer2@trustvault.internal',
    'Viewer2@TrustVault2026!',
    'Alex Rivera (Secondary Viewer)',
    'ViewerEditor',
    'system'
  );

  // Seed sample documents
  await seedSampleDocuments();
}

/**
 * Seed initial confidential documents
 */
async function seedSampleDocuments(): Promise<void> {
  const db = getDb();
  const owner = getUserByEmail('owner@trustvault.internal');
  const editor = getUserByEmail('editor@trustvault.internal');
  if (!owner || !editor) return;

  const docCount = (db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number }).count;
  if (docCount > 0) return;

  const { saveToVaultStorage } = await import('./fileService.ts');
  const now = new Date().toISOString();

  // Document 1: PDF Master Services Agreement
  const samplePdfContent = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n'
  );
  const pdfStored = saveToVaultStorage(samplePdfContent, 'pdf');
  const doc1Id = 'doc_msa_2026';

  db.prepare(`
    INSERT INTO documents (
      id, name, original_filename, stored_filename, file_size,
      mime_type, file_extension, owner_id, category, description,
      checksum_sha256, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    doc1Id,
    'Master Services Agreement 2026 (Confidential)',
    'Master_Services_Agreement_2026.pdf',
    pdfStored,
    samplePdfContent.length,
    'application/pdf',
    'pdf',
    owner.id,
    'Legal & Contracts',
    'Standard corporate MSA outlining confidentiality covenants, liability bounds, and dispute resolution.',
    '6a8470a1a3641b95ff88f1fb40f354e604f291079541a7d18e4726f959c8d5a2',
    now,
    now
  );

  // Grant Editor permission on Doc 1 to David Miller
  const perm1Id = 'perm_seed_editor_1';
  db.prepare(`
    INSERT INTO document_permissions (id, document_id, user_id, permission_level, granted_by, granted_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `).run(perm1Id, doc1Id, editor.id, 'Editor', owner.id, now);

  // Document 2: Text Security Audit Checklist
  const txtContent = Buffer.from(
    'TRUSTVAULT SECURITY AUDIT COMPLIANCE CHECKLIST\n==============================================\n1. Enforce zero-trust server-side authorization on every endpoint.\n2. Invalidate sessions and revoked permissions with zero lag.\n3. Validate magic bytes and prevent MIME-type spoofing.\n4. Scan files for malware signatures prior to persistent disk write.\n5. Maintain cryptographic SHA-256 hash chains for tamper-evident audit trails.\n6. Enforce strict least-privilege role boundaries.\n'
  );
  const txtStored = saveToVaultStorage(txtContent, 'txt');
  const doc2Id = 'doc_sec_audit_checklist';

  db.prepare(`
    INSERT INTO documents (
      id, name, original_filename, stored_filename, file_size,
      mime_type, file_extension, owner_id, category, description,
      checksum_sha256, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    doc2Id,
    'Security Audit & Hardening Specification',
    'Security_Audit_Specification.txt',
    txtStored,
    txtContent.length,
    'text/plain',
    'txt',
    owner.id,
    'Security & Compliance',
    'Mandatory enterprise compliance procedures and technical safeguards for high-assurance data sharing.',
    '9b6c0c2a8697ba9a4e2183c509210bbba77174621ab7104b2c179c3b879cf1d5',
    now,
    now
  );

  logAuditEvent({
    userId: owner.id,
    userEmail: owner.email,
    action: 'DOCUMENT_UPLOAD',
    documentId: doc1Id,
    success: true,
    metadata: { name: 'Master Services Agreement 2026 (Confidential)' },
  });

  logAuditEvent({
    userId: owner.id,
    userEmail: owner.email,
    action: 'PERMISSION_GRANTED',
    documentId: doc1Id,
    success: true,
    metadata: { grantee: editor.email, level: 'Editor' },
  });

  logAuditEvent({
    userId: owner.id,
    userEmail: owner.email,
    action: 'DOCUMENT_UPLOAD',
    documentId: doc2Id,
    success: true,
    metadata: { name: 'Security Audit & Hardening Specification' },
  });
}
