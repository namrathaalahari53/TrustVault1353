# TrustVault – Secure Document Sharing Platform
### Enterprise-Grade Confidential Document Repository with Tamper-Evident Audit Trail

---

## 1. Project Introduction

**TrustVault** is a production-quality, high-assurance web application architected for secure enterprise document sharing, strict attribute-based authorization (ABAC), and continuous regulatory compliance. Built under a Zero-Trust security paradigm, TrustVault guarantees that confidential documents (PDF, DOCX, XLSX, TXT, images) are never exposed via public URLs, client-side claims are never trusted, and every action leaves an immutable, cryptographically verifiable audit trail.

---

## 2. Key Features

- **Zero-Trust Server-Side Authorization**: Every preview, download, metadata update, and deletion is authorized dynamically in the live database. No reliance on client claims or cached permissions.
- **Cryptographic Tamper-Evident Audit Trail**: Every access attempt (successful or denied) is linked in an append-only SHA-256 cryptographic hash chain (`SHA256(prev_hash + payload)`). Any database alteration, row deletion, or retroactive insertion is immediately flagged by the integrity verifier.
- **Instant Permission Revocation**: Revocations take effect with zero latency on the very next HTTP request.
- **Deep File Inspection & Anti-Spoofing**: Inspects magic bytes (file signatures) to block disguised executables (e.g. PE `.exe` or shell scripts disguised as `.pdf`).
- **Malware Defense Engine**: Scans incoming payloads for ClamAV threat signatures and EICAR antivirus test files, rejecting malicious payloads before persistent vault storage.
- **Private Vault Storage**: Uploaded files are stored in an unexposed physical vault directory using non-guessable UUID references with SHA-256 checksum verification.
- **Automated Security Test Suite**: 18 automated security test cases runnable from the browser and via CLI (`npm test`), testing ownership, IDOR prevention, read-only enforcement, zero-delay revocation, and tamper detection.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js 22 LTS, Express, tsx
- **Database**: SQLite (WAL mode, foreign keys, parameterized queries) with full PostgreSQL schema migrations included (`/db/migrations/001_init.sql`)
- **Cryptography & Security**: Node.js `crypto` (SHA-256 hash chaining), `bcryptjs` (12 salt rounds), `jsonwebtoken` (JWT bearer auth)
- **Containerization**: Docker, Docker Compose (PostgreSQL 16 + TrustVault app container)

---

## 4. Architecture

```
[ Browser Client ]
        │ (JWT Bearer, Sandboxed Previews)
        ▼
[ Express API Gateway :3000 ]
  ├── [ Authentication Middleware (JWT + Live DB Active-User Check) ]
  ├── [ Centralized Authorization Service (ABAC + Default-Deny) ]
  ├── [ File Security Engine (Magic Bytes + ClamAV Malware Scanner) ]
  ├── [ Tamper-Evident Audit Service (SHA-256 Cryptographic Hash Chain) ]
  └── [ Private Storage Vault (/uploads/vault/ - UUID Isolated) ]
        │
        ▼
[ Database Layer: SQLite WAL / PostgreSQL ]
  ├── users (Bcrypt passwords, RBAC roles)
  ├── documents (Metadata, SHA-256 checksums)
  ├── document_permissions (Active & Revoked grants)
  └── audit_logs (Immutable prev_hash & current_hash chain)
```

---

## 5. Demo Accounts & Credentials

For testing and evaluation, four pre-configured personas are available:

| Persona | Email | Password | Role & Permissions |
|---|---|---|---|
| **Global Administrator** | `admin@trustvault.internal` | `Admin@TrustVault2026!` | Full administrative governance, user provisioning, role assignments, audit chain inspection. |
| **Document Owner** | `owner@trustvault.internal` | `Owner@TrustVault2026!` | Uploads confidential documents, grants Reader/Editor access, executes instant revocations, deletes owned documents. |
| **Auditor / Editor** | `editor@trustvault.internal` | `Editor@TrustVault2026!` | Authorized to preview, download, and edit granted documents. Cannot delete or grant permissions. |
| **Secondary Viewer** | `viewer2@trustvault.internal` | `Viewer2@TrustVault2026!` | Used to verify strict isolation and IDOR blocking. Possesses zero initial permissions. |

*Tip: Use the **Role Switcher** in the top navigation bar to toggle between personas instantly without manually retyping credentials.*

---

## 6. Installation & Local Setup

### Prerequisites
- Node.js v20+ or v22 LTS
- npm v10+

### Step-by-Step
```bash
# 1. Clone repository
git clone https://github.com/organization/trustvault.git
cd trustvault

# 2. Install dependencies
npm install

# 3. Launch full-stack development environment (Port 3000)
npm run dev

# 4. Open in browser
http://localhost:3000
```

---

## 7. Running Automated Security Tests

TrustVault includes a comprehensive 18-point automated security test suite verifying all hiring challenge criteria:

```bash
npm test
```

Or navigate to the **"18 Security Tests"** tab in the web UI to trigger real-time backend execution.

---

## 8. Deployment

TrustVault is container-ready. To deploy with Docker Compose:

```bash
docker-compose up -d --build
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for environment configuration, reverse proxy setup, and health check monitoring.

---

## 9. Known Limitations

1. **ClamAV Daemon Integration**: The integrated file service features a signature heuristic scanner and standard EICAR test detector. In multi-tenant enterprise clusters, connecting to a dedicated ClamAV TCP daemon (`clamd` on port 3310) is recommended for high-throughput scanning.
2. **Key Rotation**: Cryptographic signing keys (`JWT_SECRET`) are configurable via environment variables. Automated KMS key rotation (AWS KMS / Google Cloud KMS) can be integrated for FIPS-140-3 compliance.
