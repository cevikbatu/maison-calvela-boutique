const developmentOrigins = new Set([
  'http://localhost:8080',
  'http://127.0.0.1:8080',
]);

function normalizeOrigin(value: string): string | null {
  // Accept only an origin, optionally followed by a root slash, never a URL path.
  if (value.includes('*') || !/^https?:\/\/[^/?#\\\s]+\/?$/i.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Exact server-side allowlist; an absent or invalid configuration grants no remote origin. */
export function getOwnerBootstrapOrigin(requestOrigin: string | undefined): string | null {
  const origin = requestOrigin ? normalizeOrigin(requestOrigin) : null;
  if (!origin) return null;

  if (process.env['NODE_ENV'] === 'development' && developmentOrigins.has(origin)) return origin;

  const url = new URL(origin);
  // Remote invitations require HTTPS. Local origins are development-only, even if configured.
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return null;

  const allowedOrigins = (process.env['OWNER_BOOTSTRAP_ALLOWED_ORIGINS'] ?? '')
    .split(',')
    .map(value => normalizeOrigin(value.trim()))
    .filter((value): value is string => value !== null);

  return allowedOrigins.includes(origin) ? origin : null;
}
