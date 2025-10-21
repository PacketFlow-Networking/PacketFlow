# AINetUI - Unified Multi-Stage Dockerfile
# Builds both frontend and backend in a single container

# ============================================================
# Stage 1: Build Frontend
# ============================================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# ============================================================
# Stage 2: Build Backend + Serve Frontend
# ============================================================
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (minimal - no TShark for mock mode)
RUN apt-get update && apt-get install -y \
    curl \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application code
COPY backend/ ./backend/

# Copy frontend build from frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm /etc/nginx/sites-enabled/default 2>/dev/null || true

# Create logs directory
RUN mkdir -p /app/logs

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting Nginx..."\n\
nginx\n\
echo "Starting AINetUI Backend..."\n\
cd /app/backend\n\
exec python main.py\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose ports
EXPOSE 80 8000

# Set environment variables for mock mode
ENV PYTHONUNBUFFERED=1 \
    MOCK_MODE=true \
    CAPTURE_INTERFACE=eth0 \
    LOG_LEVEL=INFO

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health && curl -f http://localhost/ || exit 1

# Start both nginx and backend
CMD ["/app/start.sh"]
