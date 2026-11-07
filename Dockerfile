# TrustVault Multi-Stage Production Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
RUN npm ci

# Copy full source
COPY . .

# Build Vite frontend assets
RUN npm run build

# Stage 2: Runtime Image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/db ./db
COPY --from=builder /app/test ./test
COPY --from=builder /app/tsconfig.json ./

# Create persistent storage directories
RUN mkdir -p /app/data /app/uploads/vault

# Expose HTTP port
EXPOSE 3000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start server using tsx
CMD ["npx", "tsx", "server.ts"]
