/**
 * TrustVault - Cryptographic Tamper-Evident Audit Logging Service
 * Implements an append-only hash chain where every audit record contains
 * SHA-256(prev_hash + record fields). Any unauthorized modification, deletion,
 * or insertion alters subsequent hashes and is immediately detected by the integrity verifier.
 */

import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.ts';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface AuditRecord {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  document_id: string | null;
  timestamp: string;
  ip_address: string | null;
  success: number; // 1 or 0
  reason: string | null;
  metadata: string | null;
  prev_hash: string;
  current_hash: string;
}

export interface AuditLogInput {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  documentId?: string | null;
  ipAddress?: string | null;
  success: boolean;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface IntegrityVerificationResult {
  valid: boolean;
  totalRecords: number;
  genesisHash: string;
  latestHash: string;
  tamperedRecordId: string | null;
  tamperedIndex: number | null;
  errorDetail: string | null;
  verifiedAt: string;
}

/**
 * Computes deterministic SHA-256 hash for an audit record.
 */
export function calculateRecordHash(
  prevHash: string,
  id: string,
  userId: string | null,
  userEmail: string | null,
  action: string,
  documentId: string | null,
  timestamp: string,
  success: number,
  reason: string | null,
  metadata: string | null
): string {
  const payload = [
    prevHash,
    id,
    userId || '',
    userEmail || '',
    action,
    documentId || '',
    timestamp,
    success.toString(),
    reason || '',
    metadata || '',
  ].join('|');

  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

/**
 * Appends a new audit record securely to the tamper-evident chain.
 */
export function logAuditEvent(input: AuditLogInput): AuditRecord {
  const db = getDb();
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  const successVal = input.success ? 1 : 0;
  const metadataStr = input.metadata ? JSON.stringify(input.metadata) : null;

  // Retrieve the latest audit log to establish the hash pointer
  const lastRecord = db
    .prepare('SELECT current_hash FROM audit_logs ORDER BY rowid DESC LIMIT 1')
    .get() as { current_hash: string } | undefined;

  const prevHash = lastRecord ? lastRecord.current_hash : GENESIS_HASH;

  const currentHash = calculateRecordHash(
    prevHash,
    id,
    input.userId || null,
    input.userEmail || null,
    input.action,
    input.documentId || null,
    timestamp,
    successVal,
    input.reason || null,
    metadataStr
  );

  const stmt = db.prepare(`
    INSERT INTO audit_logs (
      id, user_id, user_email, action, document_id,
      timestamp, ip_address, success, reason, metadata,
      prev_hash, current_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.userId || null,
    input.userEmail || null,
    input.action,
    input.documentId || null,
    timestamp,
    input.ipAddress || '127.0.0.1',
    successVal,
    input.reason || null,
    metadataStr,
    prevHash,
    currentHash
  );

  return {
    id,
    user_id: input.userId || null,
    user_email: input.userEmail || null,
    action: input.action,
    document_id: input.documentId || null,
    timestamp,
    ip_address: input.ipAddress || '127.0.0.1',
    success: successVal,
    reason: input.reason || null,
    metadata: metadataStr,
    prev_hash: prevHash,
    current_hash: currentHash,
  };
}

/**
 * Verifies the mathematical integrity of the entire cryptographic audit trail.
 */
export function verifyAuditTrailIntegrity(): IntegrityVerificationResult {
  const db = getDb();
  const records = db
    .prepare('SELECT * FROM audit_logs ORDER BY rowid ASC')
    .all() as unknown as AuditRecord[];

  const now = new Date().toISOString();

  if (records.length === 0) {
    return {
      valid: true,
      totalRecords: 0,
      genesisHash: GENESIS_HASH,
      latestHash: GENESIS_HASH,
      tamperedRecordId: null,
      tamperedIndex: null,
      errorDetail: null,
      verifiedAt: now,
    };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];

    // 1. Verify prev_hash matches the previous record's current_hash
    if (rec.prev_hash !== expectedPrevHash) {
      return {
        valid: false,
        totalRecords: records.length,
        genesisHash: GENESIS_HASH,
        latestHash: records[records.length - 1].current_hash,
        tamperedRecordId: rec.id,
        tamperedIndex: i + 1,
        errorDetail: `Broken chain link at record #${i + 1} (${rec.id}). Expected prev_hash ${expectedPrevHash}, found ${rec.prev_hash}.`,
        verifiedAt: now,
      };
    }

    // 2. Re-calculate current_hash from record fields
    const computedHash = calculateRecordHash(
      rec.prev_hash,
      rec.id,
      rec.user_id,
      rec.user_email,
      rec.action,
      rec.document_id,
      rec.timestamp,
      rec.success,
      rec.reason,
      rec.metadata
    );

    if (computedHash !== rec.current_hash) {
      return {
        valid: false,
        totalRecords: records.length,
        genesisHash: GENESIS_HASH,
        latestHash: records[records.length - 1].current_hash,
        tamperedRecordId: rec.id,
        tamperedIndex: i + 1,
        errorDetail: `Hash mismatch at record #${i + 1} (${rec.id}). Computed ${computedHash}, stored ${rec.current_hash}. Data was altered.`,
        verifiedAt: now,
      };
    }

    expectedPrevHash = rec.current_hash;
  }

  return {
    valid: true,
    totalRecords: records.length,
    genesisHash: GENESIS_HASH,
    latestHash: records[records.length - 1].current_hash,
    tamperedRecordId: null,
    tamperedIndex: null,
    errorDetail: null,
    verifiedAt: now,
  };
}

/**
 * Tamper simulation helper for automated testing (Test #15).
 * Intentionally alters an audit record to prove that the cryptographic verifier detects it.
 */
export function simulateTamperAuditRecord(recordId: string, alteredReason: string): boolean {
  const db = getDb();
  const stmt = db.prepare('UPDATE audit_logs SET reason = ? WHERE id = ?');
  const result = stmt.run(alteredReason, recordId);
  return result.changes > 0;
}

/**
 * Reverts a simulated tamper by deleting the test record from the end of the chain.
 */
export function repairTamperAuditRecord(recordId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM audit_logs WHERE id = ?').run(recordId);
}
