import XXIVLayoutClient from './XXIVLayoutClient';

/**
 * XXIV Editor Layout (Server Component)
 * 
 * Forces dynamic rendering for all /xxiv/* routes.
 * This is required because:
 * 1. Editor routes require authentication (user-specific)
 * 2. Client components use useSearchParams which needs dynamic context
 */

// Force all /xxiv routes to be dynamic - no static prerendering
// This prevents useSearchParams errors during build
export const dynamic = 'force-dynamic';

export default function XXIVLayout({ children }: { children: React.ReactNode }) {
  return <XXIVLayoutClient>{children}</XXIVLayoutClient>;
}
