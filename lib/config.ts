/**
 * Configuration for the Crumbless CLI.
 * All values are public (no secrets) — hardcoded for zero-config installation.
 *
 * The CLI auto-detects if a local dev server is running on localhost:5174.
 * If yes, uses it. Otherwise, uses the production URL.
 *
 * Override with: PUBLIC_APP_URL=http://my-server:3000 crumbless brands
 */

const LOCAL_URL = 'http://localhost:5173';

/**
 * Application origin, not the crumbless.ai marketing site, which does not serve login or API routes.
 * Keep one origin across CLI and MCP: cross-origin redirects can drop Authorization headers.
 */
export const PRODUCTION_URL = 'https://www.crumbless.app';

/** Resolved API/base origin: explicit override, else auto-detected dev server, else production. */
export function appUrl(): string {
  return (process.env.PUBLIC_APP_URL || PRODUCTION_URL).replace(/\/$/, '');
}

const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(url);

/** Authorization metadata uses the application origin, with loopback overrides for development. */
export function authServerUrl(): string {
  const app = appUrl();
  return isLocal(app) ? app : PRODUCTION_URL;
}

// Public anon configuration advertised by the app; never a service-role credential.
process.env.PUBLIC_SUPABASE_URL ??= 'https://auth.crumbless.app';
process.env.PUBLIC_SUPABASE_ANON_KEY ??= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg4NjIyMDI4LCJleHAiOjIxMDM5ODIwMjh9.CvieaTXzsv8zqMJ2Wjrduajs_r3w5feqC8Tj5Rd5GEo';

let resolved = false;

export async function loadEnv() {
  if (resolved) return;

  // On Vercel / remote MCP, never probe localhost.
  if (process.env.VERCEL || process.env.MCP_REQUIRE_BEARER === '1') {
    process.env.PUBLIC_APP_URL ??= PRODUCTION_URL;
    resolved = true;
    return;
  }

  // If user explicitly set PUBLIC_APP_URL, use it
  if (process.env.PUBLIC_APP_URL && process.env.PUBLIC_APP_URL !== PRODUCTION_URL) {
    resolved = true;
    return;
  }

  // Auto-detect: try localhost first (dev server), fall back to production
  try {
    await fetch(`${LOCAL_URL}/api/v1/brands`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(1000),
    });
    // If we get any response (even 401), the server is running
    process.env.PUBLIC_APP_URL = LOCAL_URL;
  } catch {
    process.env.PUBLIC_APP_URL = PRODUCTION_URL;
  }

  resolved = true;
}

export function assertEnv() {
  // No required vars — everything has defaults.
}
