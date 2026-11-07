# TrustVault – REST API Technical Specification

All protected endpoints require a valid JWT token passed via the HTTP header:
`Authorization: Bearer <token>`

---

## 1. Authentication Endpoints

### 1.1 `POST /api/auth/login`
- **Purpose**: Authenticates a user and issues a signed JWT token.
- **Required Role**: None (Public)
- **Request Format**:
  ```json
  {
    "email": "owner@trustvault.internal",
    "password": "Owner@TrustVault2026!"
  }
  ```
- **Response Format (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_12345",
      "email": "owner@trustvault.internal",
      "full_name": "Sarah Jenkins (Doc Owner)",
      "role": "Owner",
      "is_active": true,
      "created_at": "2026-11-06T08:15:00.000Z"
    }
  }
  ```
- **Possible Error Codes**: `400 Bad Request`, `401 Unauthorized` (Invalid credentials), `403 Forbidden` (Account deactivated).

### 1.2 `GET /api/auth/me`
- **Purpose**: Retrieves current user session profile.
- **Required Role**: Any authenticated user.
- **Response Format (200 OK)**: User profile object.
- **Possible Error Codes**: `401 Unauthorized`, `403 Forbidden`.

### 1.3 `POST /api/auth/change-password`
- **Purpose**: Updates authenticated user's password with bcrypt hash.
- **Required Role**: Any authenticated user.
- **Request Format**:
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewSecurePassword456!"
  }
  ```
- **Possible Error Codes**: `400 Bad Request`, `401 Unauthorized`.

---

## 2. Document Management Endpoints

### 2.1 `GET /api/documents`
- **Purpose**: Lists all documents the authenticated user is authorized to access (owned + active granted permissions).
- **Required Role**: Any authenticated user.
- **Query Parameters**:
  - `q`: Search substring (name, description, owner)
  - `category`: Filter by category name
- **Response Format (200 OK)**:
  ```json
  {
    "documents": [
      {
        "id": "doc_msa_2026",
        "name": "Master Services Agreement 2026",
        "original_filename": "Master_Services_Agreement_2026.pdf",
        "file_size": 245120,
        "mime_type": "application/pdf",
        "file_extension": "pdf",
        "owner_id": "user_owner_id",
        "owner_name": "Sarah Jenkins",
        "category": "Legal & Contracts",
        "checksum_sha256": "6a8470a1a3641b95ff88f1fb40f354e604f291079541a7d18e4726f959c8d5a2",
        "user_permission": "Owner",
        "created_at": "2026-11-06T08:15:00.000Z"
      }
    ]
  }
  ```

### 2.2 `POST /api/documents/upload`
- **Purpose**: Validates magic bytes, scans for malware, hashes SHA-256, and stores in private vault.
- **Required Role**: Document Owner or Administrator.
- **Request Format**: `multipart/form-data` with fields: `file`, `name`, `category`, `description`.
- **Response Format (201 Created)**: Created document metadata object.
- **Possible Error Codes**: `400 Bad Request` (Invalid extension, spoofed signature, or malware detected), `401 Unauthorized`.

### 2.3 `GET /api/documents/:id/preview`
- **Purpose**: Streams document content for secure sandboxed viewing.
- **Required Document Permission**: Owner, Editor, or Reader.
- **Security Headers Injected**:
  - `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'`
  - `X-Content-Type-Options: nosniff`
  - `Content-Disposition: inline`
- **Possible Error Codes**: `403 Forbidden` (Unauthorized user or revoked permission), `404 Not Found`.

### 2.4 `GET /api/documents/:id/download`
- **Purpose**: Securely downloads original file as binary attachment.
- **Required Document Permission**: Owner, Editor, or Reader.
- **Security Headers Injected**:
  - `Content-Disposition: attachment; filename="<filename>"`
  - `X-Content-Type-Options: nosniff`
- **Possible Error Codes**: `403 Forbidden`, `404 Not Found`.

### 2.5 `PATCH /api/documents/:id`
- **Purpose**: Modifies title, category, or confidentiality description.
- **Required Document Permission**: Owner or Editor.
- **Possible Error Codes**: `403 Forbidden` (Reader or non-permitted user), `404 Not Found`.

### 2.6 `DELETE /api/documents/:id`
- **Purpose**: Permanently deletes document and clears vault storage.
- **Required Document Permission**: Document Owner only.
- **Possible Error Codes**: `403 Forbidden` (Editor, Reader, or non-owner), `404 Not Found`.

---

## 3. Permissions & Sharing Endpoints

### 3.1 `GET /api/documents/:id/permissions`
- **Purpose**: Retrieves all active and revoked permission grants for a document.
- **Required Document Permission**: Document Owner or Administrator.
- **Possible Error Codes**: `403 Forbidden`, `404 Not Found`.

### 3.2 `POST /api/documents/:id/permissions`
- **Purpose**: Grants Reader or Editor permission to a designated user.
- **Required Document Permission**: Document Owner only.
- **Request Format**:
  ```json
  {
    "granteeUserId": "user_editor_id",
    "permissionLevel": "Editor"
  }
  ```
- **Possible Error Codes**: `400 Bad Request`, `403 Forbidden` (Non-owner attempt), `404 Not Found`.

### 3.3 `DELETE /api/permissions/:permissionId`
- **Purpose**: Immediately revokes a document permission grant.
- **Required Document Permission**: Document Owner only.
- **Possible Error Codes**: `403 Forbidden`, `404 Not Found`.

---

## 4. Tamper-Evident Audit Endpoints

### 4.1 `GET /api/audit`
- **Purpose**: Queries immutable audit logs. Administrators see all events; regular users see only events relating to their documents or actions.
- **Required Role**: Authenticated user.

### 4.2 `GET /api/audit/verify`
- **Purpose**: Traverses the entire cryptographic hash chain, recalculates each SHA-256 hash, and verifies link integrity.
- **Response Format (200 OK)**:
  ```json
  {
    "valid": true,
    "totalRecords": 24,
    "genesisHash": "0000000000000000000000000000000000000000000000000000000000000000",
    "latestHash": "d8a1c4e7b8...",
    "tamperedRecordId": null,
    "verifiedAt": "2026-11-06T08:20:00.000Z"
  }
  ```

### 4.3 `POST /api/audit/simulate-tamper`
- **Purpose**: Simulates an unauthorized alteration of an audit record to demonstrate tamper detection (Test #15).
- **Required Role**: Administrator only.

---

## 5. Automated Security Test Suite Endpoint

### 5.1 `POST /api/security/run-tests`
- **Purpose**: Executes all 18 mandatory security test cases directly on the backend.
- **Required Role**: Authenticated user.
- **Response Format (200 OK)**:
  ```json
  {
    "timestamp": "2026-11-06T08:20:00.000Z",
    "totalTests": 18,
    "passedCount": 18,
    "failedCount": 0,
    "allPassed": true,
    "tests": [...]
  }
  ```
