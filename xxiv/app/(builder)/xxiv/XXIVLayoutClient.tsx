'use client';

import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import XXIVBuilder from './components/XXIVBuilderMain';
import { useEditorUrl } from '@/hooks/use-editor-url';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * XXIV Editor Layout (Client Component)
 *
 * This layout wraps all /xxiv routes and renders XXIVBuilder once.
 * By keeping XXIVBuilder at the layout level, it persists across route changes,
 * preventing remounts and avoiding duplicate API calls on navigation.
 *
 * Routes:
 * - /xxiv - Base editor
 * - /xxiv/pages/[id] - Page editing
 * - /xxiv/layers/[id] - Layer editing
 * - /xxiv/collections/[id] - Collection management
 * - /xxiv/components/[id] - Component editing
 * - /xxiv/settings - Settings pages
 * - /xxiv/localization - Localization pages
 * - /xxiv/profile - Profile pages
 *
 * Excluded routes:
 * - /xxiv/preview - Preview routes are excluded and render independently
 *
 * XXIVBuilder uses useEditorUrl() to detect route changes and update
 * the UI accordingly without remounting.
 */

// Inner component that uses useSearchParams (via useEditorUrl)
function XXIVLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { routeType } = useEditorUrl();
  const { initialize } = useAuthStore();

  // Initialize auth only within /xxiv routes (not on public pages)
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Exclude standalone routes from XXIVBuilder
  // These routes should render independently without the editor UI
  const prefixRoutes = ['/xxiv/preview', '/xxiv/devtools/'];
  const exactRoutes = ['/xxiv/welcome', '/xxiv/accept-invite', '/xxiv'];

  if (
    prefixRoutes.some(route => pathname?.startsWith(route))
    || exactRoutes.includes(pathname || '')
  ) {
    return <>{children}</>;
  }

  // For settings, localization, profile, forms, and integrations routes, pass children to XXIVBuilder so it can render them
  if (routeType === 'settings' || routeType === 'localization' || routeType === 'profile' || routeType === 'forms' || routeType === 'integrations') {
    return <XXIVBuilder>{children}</XXIVBuilder>;
  }

  // XXIVBuilder handles all rendering based on URL
  // Children are ignored - routes are just for URL structure
  return <XXIVBuilder />;
}

// Client layout wrapped in Suspense to handle useSearchParams
// Required by Next.js 14+ to prevent static rendering bailout
export default function XXIVLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <XXIVLayoutInner>{children}</XXIVLayoutInner>
    </Suspense>
  );
}
