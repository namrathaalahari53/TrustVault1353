# TrustVault – Production Deployment Guide

This guide covers deploying TrustVault using Docker, Docker Compose, and standalone cloud services (such as Render, Google Cloud Run, AWS ECS, or Fly.io).

---

## 1. Environment Variables Configuration

Create a `.env` file in the root directory based on `.env.example`:

| Variable | Description | Example / Default | Required in Production |
|---|---|---|---|
| `PORT` | HTTP Server port | `3000` | Optional (default: 3000) |
| `NODE_ENV` | Runtime environment | `production` | **Yes** |
| `JWT_SECRET` | Cryptographic secret for signing tokens | High-entropy 64+ char random string | **Yes** |
| `APP_URL` | Canonical origin for the applet | `https://trustvault.example.com` | **Yes** |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@db:5432/trustvault` | If using external PostgreSQL |

---

## 2. Docker Deployment

### 2.1 Single-Container Production Build
```bash
# Build the production Docker image
docker build -t trustvault:latest .

# Run the container with persistent storage volumes
docker run -d \
  --name trustvault-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-high-entropy-jwt-secret-string-here" \
  -v trustvault-data:/app/data \
  -v trustvault-vault:/app/uploads/vault \
  trustvault:latest
```

---

## 3. Render Deployment

### 3.1 Recommended: Render Web Service (Full-Stack with Backend)
Because TrustVault requires a running backend for JWT authentication, database persistence, and document encryption:
1. On Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `Trustvalutsnovasys1353` (or any unique name)
   - **Environment / Runtime**: `Node`
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `JWT_SECRET`: *(Click "Generate" or enter a secure random string)*
5. Click **Deploy Web Service**.

### 3.2 If Deploying as Render "Static Site" (Frontend Only)
If you specifically select **Static Site** on Render:
- **Build Command**: `npm install && npm run build` *(Replace the default Python command)*
- **Publish Directory**: `dist` *(Vite outputs to `dist`, not `build`)*
- Note: A Static Site only serves client assets; API calls require an active backend Web Service.

---

## 3. Persistent Storage Requirements

TrustVault stores private confidential files outside the web root. Two volumes must be persisted:

1. `/app/data`: Contains the SQLite database file (`trustvault.db`) and WAL journal (when not using external PostgreSQL).
2. `/app/uploads/vault`: Contains encrypted and isolated document binaries referenced by non-guessable UUIDs.

Ensure both directories possess read/write permissions for the application user.

---

## 4. Health Checks & Readiness

TrustVault exposes an automated health probe:
- **Endpoint**: `GET /api/health`
- **Expected Status**: `200 OK`
- **Payload**:
  ```json
  {
    "status": "healthy",
    "platform": "TrustVault Secure Document Sharing Platform",
    "timestamp": "2026-11-06T08:20:00.000Z"
  }
  ```

---

## 5. Security Checklist Before Going Live

- [x] Configure a cryptographically secure `JWT_SECRET` with at least 256 bits of entropy.
- [x] Enforce TLS / HTTPS at the reverse proxy (Nginx, Traefik, or Cloudflare).
- [x] Ensure file storage directory (`uploads/vault`) is outside any public web server root.
- [x] Verify that health checks and backup schedules are active.
- [x] Execute `npm test` inside the container to confirm all 18 security authorization scenarios pass.
