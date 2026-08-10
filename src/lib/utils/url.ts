/**
 * URL validation, normalization, and SSRF security utilities.
 */

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/, // Link-local & AWS/GCP metadata
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
  /metadata\.google\.internal$/i,
  /instance-data$/i,
];

/**
 * Returns true if the string is a valid absolute HTTP/HTTPS URL.
 */
export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates that a URL is safe against Server-Side Request Forgery (SSRF).
 * Returns { safe: true } or { safe: false, reason: string }.
 */
export function validateSafeUrl(input: string): { safe: boolean; reason?: string } {
  if (!input || typeof input !== 'string') {
    return { safe: false, reason: 'Invalid or missing URL.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { safe: false, reason: 'Malformed URL structure.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { safe: false, reason: 'Access to private network addresses and cloud metadata is restricted.' };
    }
  }

  return { safe: true };
}

/**
 * Normalize a URL: trim whitespace, ensure protocol.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

/**
 * Extract the hostname from a URL string.
 * Returns empty string on failure.
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Check if a URL matches any of the given hostname patterns.
 * Patterns can match exact hostnames or subdomains (e.g. 'youtube.com' matches 'm.youtube.com').
 */
export function urlMatchesDomains(url: string, domains: string[]): boolean {
  const hostname = getHostname(url);
  if (!hostname) return false;
  return domains.some(
    (d) => hostname === d || hostname.endsWith('.' + d)
  );
}

/** Standardized API error shape */
export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export function makeApiError(error: string, code: string, details?: unknown): ApiError {
  return { error, code, details };
}
