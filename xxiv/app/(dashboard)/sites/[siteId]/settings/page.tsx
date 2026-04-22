import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/app/(dashboard)/actions/sites';
import SiteDomainSettings from './site-domain-settings';

export default async function SiteSettingsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  try {
    const site = await getSiteSettings(siteId);

    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">{site.name} Settings</h1>
              <p className="mt-2 text-sm text-zinc-400">Manage the live URL and custom domain for this site inside your shared XXIV app.</p>
            </div>
            <Link
              href="/dashboard"
              className="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-white"
            >
              Back to dashboard
            </Link>
          </div>

          <SiteDomainSettings
            siteId={site.id}
            initialSite={{
              name: site.name,
              slug: site.slug,
              live_url: site.live_url,
              custom_domain: site.custom_domain,
              custom_domain_verified: site.custom_domain_verified ?? false,
              publish_status: site.publish_status ?? 'unpublished',
            }}
          />
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
