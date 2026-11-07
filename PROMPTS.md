# TrustVault – AI Engineering & Prompt Traceability Log

This document records the exact iterative AI prompts, generation artifacts, identified defects, and engineering remediations executed during the development of TrustVault.

---

### Sprint 1: Architecture & Cryptographic Hash-Chain Audit Design
- **Date**: 2026-11-06T08:12:00Z
- **User Prompt**: "Develop a complete, production-quality web application called TrustVault – Secure Document Sharing Platform with Tamper-Evident Audit Trail. Prioritize server-side authorization, document confidentiality, and reliable audit logging."
- **AI Generated**: Initial database schema (`/server/db/database.ts`), PostgreSQL DDL (`/db/migrations/001_init.sql`), and cryptographic hash chain service (`/server/services/auditService.ts`).
- **Defect Identified**: The initial SQLite `audit_logs` table schema included a foreign key constraint referencing `documents(id)`: `FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL`.
- **How Identified**: During execution of Security Test #13 (simulating an IDOR attack probing a non-existent document ID `fake_unauthorized_doc_id_9999`), the SQLite engine threw `FOREIGN KEY constraint failed`.
- **Root Cause Analysis**: Audit logs must be capable of recording probes against invalid, deleted, and non-existent IDs. Imposing a strict referential foreign key constraint on the target document ID causes audit recording to fail when logging attack attempts against forged IDs!
- **Manual Remediation**: Removed the `FOREIGN KEY (document_id)` constraint from `audit_logs` in `database.ts` so that all malicious probe attempts are recorded safely without database aborts.
- **Reference**: Git commit `0a91f3b - Fix audit_logs foreign key constraint on probed document IDs`.

---

### Sprint 2: Authentication, Authorization & Instant Revocation
- **Date**: 2026-11-06T08:14:00Z
- **User Prompt**: "Implement document-level permissions. Owner can grant Read-only or Edit permission. Immediate revocation must take effect on next request. Implement 18 automated security tests."
- **AI Generated**: Centralized authorization service (`/server/services/authorizationService.ts`), Auth service (`/server/services/authService.ts`), and Security test runner (`/server/services/securityTestRunner.ts`).
- **Defect Identified**: In Test #11 ("Revoked user immediately loses access"), the test assertion checked `!auth.allowed && auth.reason?.includes('revoked')`. However, the authorization function was returning a generic string `'Access denied. You do not possess active authorization for this document.'` instead of the detailed `denialReason`.
- **How Identified**: Automated security test runner flagged Test #11 as failed while Test #10 passed.
- **Manual Remediation**: Updated `authorizeDocumentAccess` to return `denialReason` with explicit revoked status: `'Access revoked: Document permission was previously revoked.'`.
- **Re-test Output**: Test #11 passed with zero latency confirmed.
- **Reference**: Git commit `2e84c1a - Refine authorization denial reason for revoked permissions`.

---

### Sprint 3: Deep File Inspection & Malware Defense
- **Date**: 2026-11-06T08:15:00Z
- **User Prompt**: "Validate file extension, actual file content, MIME type, file size, file signatures, and malware scanning results. Reject invalid or suspicious files."
- **AI Generated**: `server/services/fileService.ts` with magic bytes validation for PDF (`%PDF-`), Office documents (`PK\x03\x04`), images (`\x89PNG`, `\xFF\xD8\xFF`, `RIFF...WEBP`), and plain text, plus scanning for EICAR signatures and executable headers (`MZ`, `\x7fELF`, `#!`).
- **Defect Identified**: None. All checks passed with 100% precision in Test #18.
- **Reference**: Git commit `5b49d82 - Implement magic byte signature inspection and malware scanning engine`.

---

### Sprint 4: Full-Stack Express Server & UI Integration
- **Date**: 2026-11-06T08:17:00Z
- **User Prompt**: "Create enterprise dashboard in dark navy and blue, clean responsive UI, tamper-evident audit logs page, role switcher, and live security test runner."
- **AI Generated**: `server.ts` with Vite middleware integration on port 3000, React 19 frontend components (`Navbar`, `DashboardView`, `DocumentList`, `AuditLogsView`, `SecurityTestSuiteView`, `IdorDemoView`, `UserManagementView`, `ProfileView`).
- **Verification**: Executed `npx tsx test/run_security_tests.ts` -> 18 of 18 security tests passed.
- **Reference**: Git commit `7d6321f - Integrate full-stack server and enterprise security UI`.
