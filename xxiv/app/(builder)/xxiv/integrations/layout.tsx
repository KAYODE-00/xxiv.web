/**
 * Integrations Layout
 *
 * This layout is used by Next.js for integrations routes, but the actual
 * rendering is handled by XXIVBuilder which provides the HeaderBar
 * and IntegrationsContent component. This layout just passes through children.
 */
export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // XXIVBuilder handles all rendering including HeaderBar and IntegrationsContent
  // This layout just passes through children
  return <>{children}</>;
}
