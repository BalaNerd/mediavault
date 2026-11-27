# 📋 MediaVault — System & Software Requirements Specification (SRS)

> **Document Version:** 1.0.0  
> **Target System:** MediaVault (Web & Download Worker)  
> **Application Version:** 0.1.0  
> **Last Updated:** 2026-08-18  

---

## 1. Executive Summary & Overview

**MediaVault** is a modern, high-performance, private Progressive Web Application (PWA) and background media processing system designed for archiving and downloading multimedia content from YouTube, Instagram, Facebook, Spotify, and direct media streams (`.mp3`, `.mp4`, `.m4a`, `.webm`, `.wav`, `.flac`, `.mov`, `.mkv`).

The system is built on a **decoupled hybrid architecture** capable of operating in two distinct topologies:
1. **All-in-One Local Mode**: A self-contained Next.js application hosting frontend UI, SQLite queue database, and local execution of CLI media download engines (`yt-dlp`, `FFmpeg`, `spotdl`).
2. **Decoupled Production Mode**: A serverless/edge frontend deployed on Netlify (or Vercel) proxying download orchestration to a persistent, long-running Download Worker container hosted on a VPS, Railway, Render, or Fly.io with Bearer token authentication.

---

## 2. System Architecture & Topology

```
                                  CLIENT TIER
                     ┌────────────────────────────────────┐
                     │ PWA Client (Desktop / Mobile / OS) │
                     │ - Installable Web App (Serwist SW) │
                     │ - Real-time SSE / SWR UI updates   │
                     └─────────────────┬──────────────────┘
                                       │ HTTPS / WSS
                                       ▼
                              PRESENTATION TIER
                     ┌────────────────────────────────────┐
                     │ Next.js 16 (React 19 + Tailwind 4) │
                     │ - Static & SSR page delivery       │
                     │ - REST API gateway & URL parsing   │
                     │ - SSRF validation layer            │
                     └─────────────────┬──────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        │ [Local Mode: Internal Call]                                 │ [Production Mode: HTTPS + Bearer]
        ▼                                                             ▼
 ┌──────────────────────────────────────┐            ┌──────────────────────────────────────┐
 │ Local Download Engine                │            │ Standalone Worker Server (Port 4000) │
 │ - better-sqlite3 (WAL Mode)          │            │ - Node.js HTTP Service               │
 │ - Embedded Queue Manager             │            │ - better-sqlite3 Persistence Disk    │
 │ - Direct Child Process Execution     │            │ - Bearer Token Authentication        │
 └──────────────────┬───────────────────┘            └──────────────────┬───────────────────┘
                    │                                                   │
                    └─────────────────────┬─────────────────────────────┘
                                          ▼
                               PROCESSING & STORAGE
             ┌─────────────────────────────────────────────────────────────┐
             │ • yt-dlp (YouTube, Instagram, Facebook)                     │
             │ • FFmpeg (Audio extraction, DASH muxing, transcoding)       │
             │ • SpotDL (Spotify metadata matching & high-bitrate audio)   │
             │ • Persistent Storage (~/Downloads/MediaVault or /downloads) │
             └─────────────────────────────────────────────────────────────┘
```

---

## 3. System & Environmental Requirements

### 3.1. Host Operating Systems
- **Linux**: Ubuntu 20.04+, Debian 11+, Alpine Linux 3.20+, RHEL 9+, Arch Linux.
- **macOS**: macOS 12 (Monterey) or higher (Apple Silicon / Intel).
- **Windows**: Windows 10 (Build 19041+) / Windows 11 / Windows Server 2022.
- **Containers**: Docker Engine 20.10+, Docker Compose v2.0+.

### 3.2. Hardware & Resource Specifications

| Resource | Minimum Requirement | Recommended Specification |
| :--- | :--- | :--- |
| **CPU** | 1 vCPU / 1.0 GHz | 2+ vCPUs (avoids bottleneck during FFmpeg remuxing) |
| **RAM** | 1.0 GB Free Memory | 2.0 GB - 4.0 GB (especially when processing 4K/DASH merges) |
| **Disk Space** | 500 MB (application & binaries) | 20 GB - 500 GB+ (depending on media volume) |
| **Disk I/O** | Standard HDD | NVMe SSD recommended for streaming writes & SQLite WAL |
| **Network** | 10 Mbps broadband | 100+ Mbps high-speed unmetered connection |

### 3.3. Core Runtime & Language Dependencies

| Software | Required Version | Purpose / Scope |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` (LTS 20.x or 22.x) | Next.js frontend, API routes, worker daemon |
| **npm** | `>= 10.0.0` | Node package manager |
| **Python** | `>= 3.11.0` (Python 3.12+ recommended) | Runtime engine for `yt-dlp` and `spotdl` |
| **pip** | Latest | Python package installer |

### 3.4. External CLI Binaries & System Utilities

| Binary | Minimum Version | Installation Source | Required For |
| :--- | :--- | :--- | :--- |
| **yt-dlp** | `2024.12.0` or newer | `pip install yt-dlp` or binary release | YouTube, Instagram, Facebook |
| **ffmpeg** | `4.4+` (5.x or 6.x recommended) | System package (`apk`, `apt`, `brew`, `choco`) | Muxing audio/video streams, MP3 conversion |
| **ffprobe** | Matches `ffmpeg` version | Bundled with FFmpeg | Format and media stream probe analysis |
| **spotdl** | `4.2.0+` | `pip install spotdl` | Spotify track, album, and playlist extraction |
| **gallery-dl** *(Optional)* | `1.27.0+` | `pip install gallery-dl` | Reddit, Pixiv, Imgur, ArtStation media |

### 3.5. Native Compilation Toolchain (For `better-sqlite3`)
To compile SQLite native C++ bindings during `npm install` / `npm ci`:
- **Linux (Alpine)**: `apk add python3 make g++ gcc`
- **Linux (Debian/Ubuntu)**: `apt-get install -y build-essential python3`
- **Windows**: Visual Studio C++ Build Tools or `npm install --global --production windows-build-tools`
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)

---

## 4. Functional Requirements (FR)

### FR-1: URL Detection, Validation & Provider Routing
- **FR-1.1**: The system must accept user-submitted URLs through web input, paste events, and clipboard auto-detection.
- **FR-1.2**: The system must route URLs deterministically to the correct provider:
  - `SpotdlProvider` for `spotify.com` / `open.spotify.com`.
  - `DirectMediaProvider` for direct media streams (`.mp3`, `.mp4`, `.m4a`, `.webm`, `.wav`, `.ogg`, `.flac`, `.mov`, `.mkv`).
  - `YtDlpProvider` for `youtube.com`, `youtu.be`, `instagram.com`, `facebook.com`, `fb.watch`.
  - `GalleryDlProvider` for supported image galleries.
- **FR-1.3**: The system must reject unsupported URLs with descriptive error messages.

### FR-2: Media Metadata Extraction & Format Enumeration
- **FR-2.1**: The system must inspect remote URLs without downloading entire files.
- **FR-2.2**: The system must return normalized metadata including:
  - Media Title, Author/Artist, Duration (seconds), Thumbnail URL.
  - Available download formats (Resolution, FPS, Video Codec, Audio Codec, Bitrate, Estimated File Size).
  - Audio-only options (e.g. MP3 320kbps, 128kbps, FLAC lossless).

### FR-3: Media Download Processing & Engine Execution
- **FR-3.1**: The system must execute downloads asynchronously without blocking user interface threads.
- **FR-3.2**: When downloading high-definition video formats (1080p, 1440p, 4K), the system must seamlessly download separate video and audio streams and merge them using FFmpeg into a unified container (`.mp4` / `.mkv`).
- **FR-3.3**: The system must accurately track distinct lifecycle phases:
  - `queued` ➔ `preparing` ➔ `fetching_metadata` ➔ `downloading` (or `downloading_video` / `downloading_audio`) ➔ `merging` ➔ `finalizing` ➔ `completed` (or `failed`, `cancelled`).

### FR-4: Queue & Concurrency Management
- **FR-4.1**: Downloads must be persisted in an SQLite database table (`jobs`) with full state recovery across server restarts.
- **FR-4.2**: The system must support configurable concurrent downloads (Default: `3`, configurable up to user-defined limits).
- **FR-4.3**: Active jobs exceeding concurrency limits must remain in `queued` status and start automatically in FIFO order.
- **FR-4.4**: Users must have the ability to **Cancel**, **Retry**, **Delete**, or **Clear Completed History** for any job.

### FR-5: Real-Time Event Streaming & Progress Monitoring
- **FR-5.1**: The system must push real-time download metrics via Server-Sent Events (SSE) on `/api/download/[id]/progress` and `/downloads/:id/progress`.
- **FR-5.2**: The streamed payload must include:
  - Percentage completed (`0.0` - `100.0%`).
  - Current transfer speed (`e.g., 4.5 MB/s`).
  - Estimated Time of Arrival (`ETA`).
  - Downloaded bytes & Total bytes.
- **FR-5.3**: The frontend must support seamless polling fallback (SWR) if SSE connection encounters edge proxy termination.

### FR-6: File Management & Resumable Streaming
- **FR-6.1**: Downloaded media must be verified authoritatively on disk before marking jobs as `completed`.
- **FR-6.2**: Media files must support duplicate collision handling according to settings: `rename` (append timestamp/index), `overwrite`, or `skip`.
- **FR-6.3**: The file delivery endpoint (`/api/files/[id]` / `/files/:id`) must support HTTP Range headers (`206 Partial Content`) for seeking and resuming streams.

### FR-7: Progressive Web Application (PWA)
- **FR-7.1**: The application must provide a Web App Manifest (`manifest.json`) supporting standalone display mode, theme colors, and icons.
- **FR-7.2**: The Service Worker (powered by Serwist) must pre-cache static assets and app shell while strictly bypassing API endpoints (`/api/*`).
- **FR-7.3**: The UI must display an intuitive install prompt on supported mobile and desktop browsers.

### FR-8: System Health Diagnostics & Settings Management
- **FR-8.1**: The system must expose a diagnostic health endpoint (`/api/health` and `/health`) checking:
  - Availability and versions of `node`, `python3`, `yt-dlp`, `ffmpeg`, `spotdl`.
  - SQLite database accessibility and WAL mode state.
  - Media storage directory write permissions and free space.
- **FR-8.2**: System settings (download directories, binary overrides, theme, duplicate rules) must be persisted in SQLite.

---

## 5. Non-Functional Requirements (NFR)

### 5.1. Security & Protection
- **NFR-1 (SSRF Protection)**: All input URLs must be validated against private IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`), loopback addresses (`::1`, `localhost`), and internal cloud metadata services (`169.254.169.254`, `metadata.google.internal`).
- **NFR-2 (Command Injection Prevention)**: All external binary processes (`yt-dlp`, `ffmpeg`, `spotdl`, `gallery-dl`) must be invoked using `spawn` with distinct argument arrays. Shell interpolation (`exec` with raw string templates) is strictly forbidden.
- **NFR-3 (Authentication)**: Remote communication between the web frontend and Download Worker must be secured via Bearer token authorization (`MEDIAVAULT_WORKER_TOKEN`).
- **NFR-4 (Payload Protection)**: Worker HTTP payload ingestion must be bounded by a maximum body limit (5 MB) to prevent denial-of-service memory exhaustion.

### 5.2. Performance & Efficiency
- **NFR-5 (Non-blocking I/O)**: Database writes must utilize SQLite `WAL` (Write-Ahead Logging) mode with `NORMAL` synchronous pragma to eliminate reader-writer lock contention.
- **NFR-6 (Streaming Transfer)**: Media delivery must stream files directly via Node.js pipelines without loading full multi-gigabyte media files into process heap.

### 5.3. Reliability & Fault Tolerance
- **NFR-7 (Crash Recovery)**: When the server or worker restarts, active or retrying downloads must be reconciled and flagged with an informative crash message rather than remaining permanently orphaned in `active` status.
- **NFR-8 (Configurable Timeouts)**: External processes must have default execution timeouts (Default: 900 seconds / 15 minutes) to prevent runaway hung tasks.

---

## 6. Environment Variables Specification

| Variable | Target | Type | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Both | `string` | `development` | Node environment (`development` or `production`). |
| `PORT` | Worker | `number` | `4000` | Port for the standalone download worker daemon. |
| `NEXT_PUBLIC_APP_NAME` | Frontend | `string` | `MediaVault` | Application brand name displayed in PWA UI. |
| `NEXT_PUBLIC_APP_URL` | Frontend | `string` | `http://localhost:3000` | Canonical frontend domain for OpenGraph and PWA metadata. |
| `MEDIAVAULT_WORKER_URL` | Frontend | `string` | *(Empty)* | URL of remote download worker (e.g. `https://worker.mediavault.app`). If omitted, runs in Local Mode. |
| `MEDIAVAULT_WORKER_TOKEN`| Both | `string` | *(Empty)* | Shared secret token passed in `Authorization: Bearer <TOKEN>` header. |
| `MEDIAVAULT_DATA_DIR` | Worker/Local| `string` | `~/.mediavault` | Filesystem directory storing the `mediavault.db` SQLite database. |
| `MEDIA_STORAGE_PATH` | Worker/Local| `string` | `~/Downloads/MediaVault` | Output directory where downloaded media files are saved. |
| `YTDLP_PATH` | Worker/Local| `string` | `yt-dlp` | Executable path or binary alias for `yt-dlp`. |
| `FFMPEG_PATH` | Worker/Local| `string` | `ffmpeg` | Executable path or binary alias for `ffmpeg`. |
| `SPOTDL_PATH` | Worker/Local| `string` | `spotdl` | Executable path or binary alias for `spotdl`. |
| `GALLERY_DL_PATH` | Worker/Local| `string` | `gallery-dl` | Executable path or binary alias for `gallery-dl`. |
| `LOG_LEVEL` | Both | `string` | `info` (`debug` in dev) | Pino logging verbosity (`debug`, `info`, `warn`, `error`). |

---

## 7. Database Schema & Data Models

Database engine: **SQLite 3** (`better-sqlite3`), location: `$MEDIAVAULT_DATA_DIR/mediavault.db`.

### 7.1. Table: `jobs`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique UUID or generated identifier for the job. |
| `url` | `TEXT` | `NOT NULL` | Original source media URL. |
| `provider` | `TEXT` | `NOT NULL` | Provider handler (`yt-dlp`, `spotdl`, `direct`, `gallery-dl`). |
| `title` | `TEXT` | `NOT NULL DEFAULT ''` | Media title. |
| `author` | `TEXT` | `NULL` | Creator, artist, or channel name. |
| `thumbnail` | `TEXT` | `NULL` | URL or base64 string of preview thumbnail. |
| `duration` | `INTEGER` | `NULL` | Duration of media in seconds. |
| `format_id` | `TEXT` | `NOT NULL` | Selected format identifier (e.g. `1080p`, `mp3-320`). |
| `format_label` | `TEXT` | `NOT NULL` | Human-readable label of the format. |
| `status` | `TEXT` | `NOT NULL DEFAULT 'queued'`| Status (`queued`, `active`, `pausing`, `paused`, `completed`, `failed`, `cancelled`, `retrying`). |
| `phase` | `TEXT` | `DEFAULT 'queued'` | Sub-lifecycle phase (`fetching_metadata`, `downloading`, `merging`, etc.). |
| `progress` | `REAL` | `NOT NULL DEFAULT 0` | Completion percentage (`0.0` - `100.0`). |
| `downloaded_bytes`| `INTEGER`| `DEFAULT 0` | Total bytes downloaded so far. |
| `file_size` | `INTEGER` | `NULL` | Total expected or final file size in bytes. |
| `speed` | `TEXT` | `NULL` | Current transfer rate string (`e.g. 5.2 MB/s`). |
| `avg_speed` | `TEXT` | `NULL` | Average transfer rate across the download. |
| `peak_speed` | `TEXT` | `NULL` | Highest transfer rate observed. |
| `eta` | `TEXT` | `NULL` | Estimated remaining duration string. |
| `download_duration`| `REAL` | `NULL` | Duration of download phase in seconds. |
| `merge_duration` | `REAL` | `NULL` | Duration of FFmpeg remuxing phase in seconds. |
| `error` | `TEXT` | `NULL` | Failure reason or exception stack if job failed. |
| `log` | `TEXT` | `NULL` | Console output stream or diagnostics. |
| `output_path` | `TEXT` | `NULL` | Absolute path to final saved file on disk. |
| `retry_count` | `INTEGER` | `DEFAULT 0` | Number of times the job has been retried. |
| `created_at` | `INTEGER` | `NOT NULL` | Unix timestamp in milliseconds when created. |
| `updated_at` | `INTEGER` | `NOT NULL` | Unix timestamp in milliseconds of last status change. |
| `completed_at` | `INTEGER` | `NULL` | Unix timestamp in milliseconds when completed. |

**Indexes**:
- `idx_jobs_status`: `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`
- `idx_jobs_created_at`: `CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);`

### 7.2. Table: `settings`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `key` | `TEXT` | `PRIMARY KEY` | Configuration key (e.g. `downloadDir`, `maxConcurrentDownloads`). |
| `value` | `TEXT` | `NOT NULL` | JSON-encoded configuration value. |

---

## 8. API Specifications & Endpoints

### 8.1. Web Gateway & Worker API Endpoints

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/metadata` *(or `/metadata`)* | Public / Token | Extract title, formats, duration for a given URL. |
| `POST` | `/api/download` *(or `/downloads`)* | Public / Token | Enqueue a new download job. |
| `GET` | `/api/download` *(or `/downloads`)* | Public / Token | List jobs with optional filtering (`status`, `limit`, `offset`). |
| `GET` | `/api/download/[id]` *(or `/downloads/:id`)* | Public / Token | Fetch state for a specific job. |
| `GET` | `/api/download/[id]/progress` | Public / Token | Server-Sent Events (SSE) real-time progress stream. |
| `POST` | `/api/download/[id]/cancel` | Public / Token | Cancel an active or queued job. |
| `POST` | `/api/download/[id]/retry` | Public / Token | Retry a failed or cancelled job. |
| `DELETE` | `/api/download/[id]` *(or `/downloads/:id`)* | Public / Token | Delete a job record and temporary files. |
| `POST` | `/api/download/clear` *(or `/downloads/clear`)*| Public / Token | Remove all completed and failed jobs from history. |
| `GET` | `/api/files/[id]` *(or `/files/:id`)* | Public / Token | Stream/download media file with HTTP Range support. |
| `GET` | `/api/health` *(or `/health`)* | Public | System diagnostic health check for binaries and storage. |
| `GET` | `/api/settings` | Public | Retrieve active application settings. |
| `PUT` | `/api/settings` | Public | Update application settings. |

---

## 9. Verification & Setup Playbook

### 9.1. Local Environment Setup

1. **Install Node.js & Python dependencies**:
   ```bash
   # Install Node packages
   npm install

   # Install Python media engine dependencies
   pip install -r requirements.txt
   ```

2. **Verify System Binaries**:
   Ensure `ffmpeg`, `yt-dlp`, and `spotdl` are available in system PATH:
   ```bash
   yt-dlp --version
   ffmpeg -version
   spotdl --version
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

### 9.2. Standalone Worker Execution

```bash
# Run standalone worker
npm run worker

# Run in watch mode for development
npm run worker:dev
```

### 9.3. Docker & Container Deployment

```bash
# Build and start containerized download worker
docker compose up -d --build
```
