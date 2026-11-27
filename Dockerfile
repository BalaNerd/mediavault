# Multi-stage Dockerfile for MediaVault
# Stage 1: Build Next.js application & standalone worker bundle
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build
RUN npm run build:worker

# Stage 2: Production runner
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV MEDIAVAULT_DATA_DIR /app/data
ENV MEDIA_STORAGE_PATH /app/downloads
ENV PORT 4000
ENV PYTHONDONTWRITEBYTECODE 1

# Install runtime CLI tools: ffmpeg, yt-dlp, gallery-dl, python3
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 python3-pip curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --break-system-packages \
    --default-timeout=100 --retries 10 \
    yt-dlp gallery-dl spotdl

# Create data & download volume directories
RUN mkdir -p /app/data /app/downloads /app/dist

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/worker.js ./dist/worker.js

EXPOSE 4000 3000

CMD ["node", "--max-old-space-size=160", "dist/worker.js"]
