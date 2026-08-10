# Multi-stage Dockerfile for MediaVault
# Stage 1: Build Next.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-color python3 make g++ gcc

COPY package*.json ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV MEDIAVAULT_DATA_DIR /app/data

# Install runtime CLI tools: ffmpeg, yt-dlp, gallery-dl, python3
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    curl \
    ca-certificates \
    && pip install --no-cache-dir --break-system-packages yt-dlp gallery-dl spotdl

# Create data & download volume directories
RUN mkdir -p /app/data /app/downloads

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
