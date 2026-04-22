import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getXxivSiteSlugFromHost } from '@/lib/url-utils';

/**
 * Public API routes that skip authentication.
 */
const PUBLIC_API_PREFIXES = [
  '/xxiv/api/setup/',    // Setup wizard — needed before any user exists
  '/xxiv/api/supabase/', // Supabase config — needed for browser client init
  '/xxiv/api/auth/',     // Auth callbacks and session checks
  '/xxiv/api/v1/',       // Public API — has own API key auth
];

/**
 * XXIV routes that require authentication.
 * Unauthenticated visitors are redirected to /login.
 */
const XXIV_PROTECTED_ROUTES = [
  '/dashboard',
  '/sites',
];

/**
 * XXIV public routes — logged-in users visiting these are redirected to /dashboard.
 */
const XXIV_AUTH_ROUTES = [
  '/login',
  '/signup',
];

/**
 * XXIV routes that are always public (no redirect for any user state).
 */
const XXIV_PUBLIC_ROUTES = [
  '/forgot-password',
  '/update-password',
  '/auth/callback',
  '/templates',
];

/**
 * Patterns for collection item endpoints that must be accessible on published pages
 * (load-more pagination, filter). Matched via regex since the collection ID is dynamic.
 */
const PUBLIC_COLLECTION_ITEM_SUFFIXES = ['/items/filter', '/items/load-more'];

const PUBLIC_API_EXACT = [
  '/xxiv/api/revalidate', // Cache revalidation — has own secret token auth
];

/**
 * Derive the Supabase project URL and anon key from environment variables.
 * Returns null if env vars are not set (pre-setup or local dev without .env.local).
 */
function getSupabaseEnvConfig(): { url: string; anonKey: string } | null {
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY;
  const connectionUrl = process.env.SUPABASE_CONNECTION_URL;

  if (!anonKey || !connectionUrl) return null;

  // Extract project ID from connection URL
  // e.g. "postgresql://postgres.abc123:..." → "abc123"
  const match = connectionUrl.match(/\/\/postgres\.([a-z0-9]+):/);
  if (!match) return null;

  return {
    url: `https://${match[1]}.supabase.co`,
    anonKey,
  };
}

function getSupabaseServiceRoleKey(): string | null {
  return process.env.SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || null;
}

type PublishedXxivSite = {
  id: string;
  slug: string;
};

async function resolvePublishedXxivSiteBySlug(siteSlug: string): Promise<PublishedXxivSite | null> {
  return resolvePublishedXxivSiteByField('slug', siteSlug);
}

async function resolvePublishedXxivSiteByCustomDomain(domain: string): Promise<PublishedXxivSite | null> {
  return resolvePublishedXxivSiteByField('custom_domain', domain);
}

async function resolvePublishedXxivSiteByField(
  field: 'slug' | 'custom_domain',
  value: string
): Promise<PublishedXxivSite | null> {
  const config = getSupabaseEnvConfig();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!config || !serviceRoleKey) return null;

  const url = new URL('/rest/v1/xxiv_sites', config.url);
  url.searchParams.set('select', 'id,slug');
  url.searchParams.set(field, `eq.${value}`);
  url.searchParams.set('is_published', 'eq.true');
  url.searchParams.set('limit', '1');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json().catch(() => []);
    const site = Array.isArray(data) ? data[0] : null;
    return typeof site?.id === 'string' && typeof site?.slug === 'string'
      ? { id: site.id, slug: site.slug }
      : null;
  } catch {
    return null;
  }
}

async function resolvePublishedXxivSiteFromPath(pathname: string): Promise<PublishedXxivSite | null> {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  if (!firstSegment) return null;

  return resolvePublishedXxivSiteBySlug(firstSegment);
}

async function resolvePublishedXxivSiteFromHost(host: string): Promise<PublishedXxivSite | null> {
  const hostname = host.split(':')[0].toLowerCase();
  const siteSlug = getXxivSiteSlugFromHost(host);

  if (siteSlug) {
    const subdomainSite = await resolvePublishedXxivSiteBySlug(siteSlug);
    if (subdomainSite) {
      return subdomainSite;
    }
  }

  return resolvePublishedXxivSiteByCustomDomain(hostname);
}

function isPublicApiRoute(pathname: string, method: string): boolean {
  // POST to form-submissions is public (website visitors submitting forms)
  if (pathname === '/xxiv/api/form-submissions' && method === 'POST') {
    return true;
  }

  if (PUBLIC_API_EXACT.includes(pathname)) return true;
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;

  // Collection item endpoints for published pages (POST only — filter, load-more)
  if (method === 'POST' && pathname.startsWith('/xxiv/api/collections/') &&
    PUBLIC_COLLECTION_ITEM_SUFFIXES.some(suffix => pathname.endsWith(suffix))) {
    return true;
  }

  return false;
}

/**
 * Verify Supabase session for protected API routes.
 * Returns a 401 response if not authenticated, or null to continue.
 */
async function verifyApiAuth(request: NextRequest): Promise<NextResponse | null> {
  if (isPublicApiRoute(request.nextUrl.pathname, request.method)) {
    return null;
  }

  const config = getSupabaseEnvConfig();

  // If env vars aren't set (pre-setup or local dev without .env.local), let through
  if (!config) return null;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Get authenticated user for XXIV route protection.
 * Returns the user object or null. Uses same env-var config as verifyApiAuth.
 */
async function getXxivUser(request: NextRequest): Promise<{ id: string } | null> {
  const config = getSupabaseEnvConfig();
  if (!config) return null;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.nextUrl.origin;
  let xxivSiteId = request.nextUrl.searchParams.get('xxiv_site_id');
  let xxivSiteSlug: string | null = null;

  // MCP endpoint uses its own token-based authentication — skip session auth.
  // Cloud overlay proxies MUST also exempt this path to avoid login redirects.
  if (pathname.startsWith('/xxiv/mcp/')) {
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  }

  // ── XXIV special: /xxiv/welcome always redirects to /dashboard ──────────
  if (pathname === '/xxiv/welcome' || pathname.startsWith('/xxiv/welcome')) {
    return NextResponse.redirect(new URL('/dashboard', origin));
  }

  // ── XXIV route protection ─────────────────────────────────────────────────
  const isXxivProtected = XXIV_PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  const isXxivAuthRoute = XXIV_AUTH_ROUTES.includes(pathname);

  if (isXxivProtected || isXxivAuthRoute) {
    const user = await getXxivUser(request);

    if (isXxivProtected && !user) {
      // Not logged in → redirect to login, preserve intended destination
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isXxivAuthRoute && user) {
      // Already logged in → no need to see login/signup
      return NextResponse.redirect(new URL('/dashboard', origin));
    }
  }

  // Protect API and preview routes with auth
  if (pathname.startsWith('/xxiv/api') || pathname.startsWith('/xxiv/preview')) {
    const authResponse = await verifyApiAuth(request);
    if (authResponse) {
      if (pathname.startsWith('/xxiv/preview')) {
        return NextResponse.redirect(new URL('/xxiv', request.url));
      }
      return authResponse;
    }
  }

  const isPublicPage = !pathname.startsWith('/xxiv')
    && !pathname.startsWith('/_next')
    && !pathname.startsWith('/api')
    && !pathname.startsWith('/dynamic');
  const hasPaginationParams = Array.from(request.nextUrl.searchParams.keys())
    .some((key) => key.startsWith('p_'));

  if (isPublicPage && hasPaginationParams) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = pathname === '/' ? '/dynamic' : `/dynamic${pathname}`;

    const rewriteResponse = NextResponse.rewrite(rewriteUrl);
    rewriteResponse.headers.set('x-pathname', pathname);
    return rewriteResponse;
  }

  // Create response
  const response = NextResponse.next();

  if (!xxivSiteId && isPublicPage) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
    const resolvedSite = await resolvePublishedXxivSiteFromHost(host)
      || await resolvePublishedXxivSiteFromPath(pathname);

    if (resolvedSite) {
      xxivSiteId = resolvedSite.id;
      xxivSiteSlug = resolvedSite.slug;
    }
  }

  // Persist current XXIV site context for preview routes and dynamic public site URLs.
  if (xxivSiteId) {
    response.cookies.set('xxiv_site_id', xxivSiteId, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });
  }

  if (xxivSiteSlug) {
    response.cookies.set('xxiv_site_slug', xxivSiteSlug, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });
  }

  // Add pathname header for layout to determine dark mode
  response.headers.set('x-pathname', pathname);

  // Cache-Control for public pages is configured centrally via next.config.ts headers().

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
