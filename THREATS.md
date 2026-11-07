# TrustVault – Threat Model & Security Architecture Analysis

---

## 1. Threat Modeling Methodology

TrustVault was engineered utilizing the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) combined with OWASP Top 10 API Security guidelines.

---

## 2. Attack Scenarios & Mitigations

### 2.1 Insecure Direct Object References (IDOR)
- **Attack Scenario**: Attacker modifies the `documentId` in API requests (e.g. changing `GET /api/documents/doc_1` to `GET /api/documents/doc_2`) attempting to view another organization's confidential contract.
- **Security Impact**: Unauthorized disclosure of confidential trade secrets or intellectual property.
- **Mitigation**: TrustVault implements a centralized server-side authorization check (`authorizeDocumentAccess`). On *every single request*, the server resolves the user identity from the cryptographic JWT, verifies the document owner in the database, and queries active permissions (`revoked_at IS NULL`). If no explicit relationship exists, access is refused with `403 Forbidden` and audited as `UNAUTHORIZED_ACCESS_ATTEMPT`.
- **Automated Test**: Test #3, Test #4, Test #13.

### 2.2 Privilege Escalation & Unauthorized Permission Grants
- **Attack Scenario**: A malicious viewer attempts to call `POST /api/documents/:id/permissions` to grant themselves or a third party `Editor` or `Owner` privileges.
- **Security Impact**: Attacker gains unauthorized modification or deletion rights.
- **Mitigation**: The permission grant endpoint verifies that `req.user.userId === doc.owner_id`. Non-owners receive immediate `403 Forbidden` responses. Role modifications in `/api/users/:id/role` strictly require `user.role === 'Administrator'`.
- **Automated Test**: Test #5, Test #6, Test #12, Test #17.

### 2.3 File Extension & MIME-Type Spoofing
- **Attack Scenario**: Attacker renames a Windows PE executable (`trojan.exe`) or shell script to `confidential_invoice.pdf` and uploads it.
- **Security Impact**: Remote code execution or malware infection of client machines downloading the file.
- **Mitigation**: Deep magic-byte inspection (`validateMagicBytes`). Even if the file extension is `.pdf` and the client header says `application/pdf`, the server verifies the binary signature (`%PDF-`, `PK\x03\x04`, `\x89PNG`). If the header matches `MZ` (executable) or `#!` (script), the upload is immediately rejected.
- **Automated Test**: Test #18.

### 2.4 Antivirus & Malware Payloads (EICAR / Exploits)
- **Attack Scenario**: An attacker uploads documents containing the standard EICAR test signature or embedded malicious macro vectors.
- **Security Impact**: Downstream execution of malware on viewer workstations.
- **Mitigation**: Built-in scanning engine scans the entire file buffer prior to saving to disk. Any threat triggers `DOCUMENT_UPLOAD_REJECTED` and halts processing.
- **Automated Test**: Test #18.

### 2.5 Tampering with System Audit Logs (Repudiation)
- **Attack Scenario**: A rogue database administrator or malicious actor modifies an audit record to conceal unauthorized document access.
- **Security Impact**: Loss of non-repudiation and forensic trail.
- **Mitigation**: Cryptographic hash chaining. Each audit log stores `prev_hash` and `current_hash = SHA256(prev_hash + id + userId + action + docId + timestamp + success + reason)`. The verifier traverses the chain; any altered row produces an immediate hash mismatch.
- **Automated Test**: Test #15.

### 2.6 Stale Cache / Delayed Revocation Vulnerability
- **Attack Scenario**: A user's access is revoked by the document owner, but the user continues accessing the document using an active session or cached token.
- **Security Impact**: Data leakage after termination or vendor offboarding.
- **Mitigation**: Zero-delay authorization. Permissions are evaluated directly against the live database table (`revoked_at IS NULL`) on every protected request. No long-lived permissions are stored in client JWT claims.
- **Automated Test**: Test #10, Test #11.

---

## 3. Cryptographic Tamper-Evidence Design & Accepted Limitations

TrustVault utilizes an append-only SHA-256 cryptographic hash chain rooted in a known genesis hash (`0000...0000`).

### Strengths
1. **Mathematical Tamper Detection**: Any retroactive modification of record fields changes `current_hash`, breaking the chain link to subsequent rows.
2. **Deletion Detection**: Deleting any intermediate row breaks the `prev_hash` pointer of the following row.
3. **Insertion Detection**: Inserting a forged row requires recalculating all downstream hashes, which alters the latest head hash.

### Accepted Limitations & Architectural Trade-Offs
1. **Full Database Recomputation Threat**: If an attacker with unrestricted raw database write access alters a row and recalculates *every subsequent hash in the chain*, an internal verifier might see the chain as consistent unless the latest hash is anchored externally.
   - *Mitigation for Production*: Periodic anchoring of the latest hash (head hash) to an external immutable ledger, blockchain, or external append-only log service (e.g. AWS CloudTrail / Google Cloud Logging / RFC 3161 Timestamp Authority).
2. **Single Database Node**: In the default development configuration, audit logs reside in the primary database. In enterprise multi-region clusters, audit logs should be replicated to an immutable write-once read-many (WORM) storage bucket.
