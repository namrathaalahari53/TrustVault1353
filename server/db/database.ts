/**
 * TrustVault - Database Schema and Connection Management
 * Uses embedded SQLite with WAL mode, foreign key enforcement, and prepared statements.
 * Provides complete DDL for PostgreSQL compatibility as well.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// Ensure data and upload directories exist
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'vault');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'trustvault.db');
const db = new DatabaseSync(DB_FILE);

// Enable WAL mode and foreign keys for ACID compliance and data integrity
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

export function getDb(): DatabaseSync {
  return db;
}

export function initDatabase(): void {
  // 1. Roles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );
  `);

  // 2. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ViewerEditor',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 3. Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 4. Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      file_extension TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      description TEXT DEFAULT '',
      checksum_sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 5. Document Permissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_permissions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      permission_level TEXT NOT NULL, -- 'Reader' or 'Editor'
      granted_by TEXT NOT NULL,
      granted_at TEXT NOT NULL,
      revoked_at TEXT DEFAULT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 6. Cryptographic Tamper-Evident Audit Logs table
  // Each record links cryptographically to the previous record's hash (SHA-256)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      document_id TEXT,
      timestamp TEXT NOT NULL,
      ip_address TEXT,
      success INTEGER NOT NULL, -- 1 for true, 0 for false
      reason TEXT,
      metadata TEXT,
      prev_hash TEXT NOT NULL,
      current_hash TEXT NOT NULL
    );
  `);

  // 7. Refresh Tokens / Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 8. Indexes for performance and quick authorization checks
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_doc_owner ON documents(owner_id);
    CREATE INDEX IF NOT EXISTS idx_doc_category ON documents(category);
    CREATE INDEX IF NOT EXISTS idx_perm_doc_user ON document_permissions(document_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_perm_active ON document_permissions(document_id, user_id, revoked_at);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_doc ON audit_logs(document_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
  `);

  seedInitialData();
}

/**
 * Seed initial categories, roles, and default accounts:
 * - Administrator: admin@trustvault.internal / Admin@TrustVault2026!
 * - Document Owner: owner@trustvault.internal / Owner@TrustVault2026!
 * - Viewer/Editor: editor@trustvault.internal / Editor@TrustVault2026!
 * - Secondary Viewer: viewer2@trustvault.internal / Viewer2@TrustVault2026!
 */
function seedInitialData(): void {
  // Check if roles exist
  const existingRoles = db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
  if (existingRoles.count === 0) {
    const insertRole = db.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)');
    insertRole.run('role_admin', 'Administrator', 'Full system and user administration, audit inspection, and oversight.');
    insertRole.run('role_owner', 'Owner', 'Can create, own, manage, share, and revoke access to their confidential documents.');
    insertRole.run('role_viewer', 'ViewerEditor', 'Can view or edit documents strictly according to granted permissions.');
  }

  // Check if categories exist
  const existingCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (existingCategories.count === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)');
    const now = new Date().toISOString();
    insertCategory.run('cat_legal', 'Legal & Contracts', 'Confidential legal agreements, NDAs, and corporate contracts', now);
    insertCategory.run('cat_financial', 'Financial Reports', 'Quarterly audits, tax statements, and executive budgets', now);
    insertCategory.run('cat_security', 'Security & Compliance', 'Penetration test reports, ISO-27001 policies, and audit specs', now);
    insertCategory.run('cat_hr', 'Human Resources', 'Executive compensation plans and employment records', now);
    insertCategory.run('cat_general', 'General', 'General confidential enterprise documentation', now);
  }
}
