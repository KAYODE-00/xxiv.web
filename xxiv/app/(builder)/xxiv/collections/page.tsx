'use client';

import XXIVBuilder from '../components/XXIVBuilderMain';

/**
 * Base route for collections view
 * URL: /xxiv/collections
 *
 * This route renders the same XXIVBuilder component.
 * Shows all collections or empty state when no collections exist.
 */
export default function CollectionsRoute() {
  return <XXIVBuilder />;
}
