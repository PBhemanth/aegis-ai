# ==============================================================================
# Stage 1: Build the React Frontend (Vite + TypeScript)
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy dependency manifests first for build cache optimization
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy frontend source code and compile production assets to /app/frontend/dist
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production Python Runtime (FastAPI + Uvicorn)
# ==============================================================================
FROM python:3.12-slim AS runner

WORKDIR /app

# Configure Python execution environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production

# Install curl for container health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install backend Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy compiled frontend static bundle from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Render assigns PORT dynamically (defaulting to 10000 on Render free tier)
EXPOSE 10000

# Launch Uvicorn bound to 0.0.0.0 and the assigned PORT
CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
