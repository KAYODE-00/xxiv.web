/**
 * Resolve the site's base URL from settings and environment.
 *
 * Priority: globalCanonicalUrl > primaryDomainUrl > NEXT_PUBLIC_SITE_URL
 */
export function getSiteBaseUrl(options?: {
  globalCanonicalUrl?: string | null;
  primaryDomainUrl?: string | null;
}): string | null {
  const raw =
    options?.globalCanonicalUrl
    || options?.primaryDomainUrl
    || process.env.NEXT_PUBLIC_SITE_URL
    || null;

  return raw ? raw.replace(/\/$/, '') : null;
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function stripAppSubdomain(hostname: string): string {
  return hostname.startsWith('app.') ? hostname.slice(4) : hostname;
}

function normalizeSitePath(sitePath?: string): string {
  if (!sitePath || sitePath === '/') {
    return '/';
  }

  return sitePath.startsWith('/') ? sitePath : `/${sitePath}`;
}

export function buildXxivSiteUrl(
  siteSlug: string,
  options?: {
    sitePath?: string;
    fallbackOrigin?: string | null;
  }
): string {
  const sitePath = normalizeSitePath(options?.sitePath);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || options?.fallbackOrigin
    || null;

  if (!baseUrl) {
    return sitePath === '/' ? `/${siteSlug}` : `/${siteSlug}${sitePath}`;
  }

  try {
    const url = new URL(baseUrl);

    if (isLocalHostname(url.hostname)) {
      url.pathname = sitePath === '/' ? `/${siteSlug}` : `/${siteSlug}${sitePath}`;
      return url.toString();
    }

    url.hostname = `${siteSlug}.${stripAppSubdomain(url.hostname)}`;
    url.pathname = sitePath;
    return url.toString();
  } catch {
    return sitePath === '/' ? `/${siteSlug}` : `/${siteSlug}${sitePath}`;
  }
}

export function getXxivSiteSlugFromHost(host: string): string | null {
  const hostname = host.split(':')[0].toLowerCase();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    return null;
  }

  try {
    const appHostname = new URL(baseUrl).hostname.toLowerCase();
    if (isLocalHostname(appHostname)) {
      return null;
    }

    const rootHostname = stripAppSubdomain(appHostname);
    if (hostname === appHostname || hostname === rootHostname) {
      return null;
    }

    const suffix = `.${rootHostname}`;
    if (!hostname.endsWith(suffix)) {
      return null;
    }

    const siteSlug = hostname.slice(0, -suffix.length);
    return siteSlug && !siteSlug.includes('.') ? siteSlug : null;
  } catch {
    return null;
  }
}
