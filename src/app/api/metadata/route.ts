import { NextRequest, NextResponse } from 'next/server';
import { getDownloadService } from '@/lib/services/download-service';
import { validateSafeUrl, makeApiError } from '@/lib/utils/url';
import { apiLogger } from '@/lib/logger';

export const runtime = 'nodejs';

interface CacheEntry {
  data: Record<string, unknown>;
  timestamp: number;
}

const metadataCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url: string = body?.url?.trim();

    if (!url) {
      return NextResponse.json(
        makeApiError('Please enter a valid media URL', 'INVALID_URL'),
        { status: 400 }
      );
    }

    const safeCheck = validateSafeUrl(url);
    if (!safeCheck.safe) {
      return NextResponse.json(
        makeApiError(safeCheck.reason || 'Invalid URL', 'UNSAFE_URL'),
        { status: 400 }
      );
    }

    // Check cache
    const cached = metadataCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      apiLogger.info({ url }, 'Returning metadata from cache');
      return NextResponse.json(cached.data);
    }

    const service = getDownloadService();
    apiLogger.info({ url, isWorker: service.isWorker }, 'Fetching metadata');

    const metadata = await service.fetchMetadata(url);

    // Store in cache
    metadataCache.set(url, { data: metadata as unknown as Record<string, unknown>, timestamp: Date.now() });

    return NextResponse.json(metadata);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    apiLogger.error({ err }, 'Metadata fetch failed');

    const status = msg.includes('Unsupported platform') ? 422 : 500;
    return NextResponse.json(
      makeApiError(msg, 'METADATA_FETCH_FAILED'),
      { status }
    );
  }
}
