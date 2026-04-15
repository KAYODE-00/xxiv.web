<<<<<<< HEAD
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
              <p className="mt-2 text-sm text-zinc-400">Manage your Pages URL and custom domain under your XXIV Cloudflare account.</p>
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
              cf_project_name: site.cf_project_name,
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
=======
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  getSiteById,
  connectCustomDomainToSite,
  checkCustomDomainStatus,
  removeCustomDomainFromSite,
} from '@/app/(dashboard)/actions/sites';

type SiteRow = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  live_url: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean | null;
  vercel_project_id: string | null;
  vercel_project_name: string | null;
};

const NAMECHEAP_AFFILIATE_URL = 'https://www.namecheap.com/';

export default function SiteDomainSettingsPage() {
  const params = useParams();
  const siteId = (params as { siteId?: string })?.siteId;
  const [site, setSite] = useState<SiteRow | null>(null);
  const [domain, setDomain] = useState('');
  const [isLoading, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [dnsVisible, setDnsVisible] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    startTransition(async () => {
      const data = await getSiteById(siteId);
      setSite(data as SiteRow);
      setDomain(data?.custom_domain || '');
    });
  }, [siteId]);

  const vercelUrl = site?.vercel_project_name
    ? `https://${site.vercel_project_name}.vercel.app`
    : site?.live_url || null;

  const handleConnect = async () => {
    if (!siteId || !domain.trim()) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await connectCustomDomainToSite(siteId, domain.trim());
        setSite((prev) =>
          prev
            ? {
                ...prev,
                custom_domain: domain.trim(),
                custom_domain_verified: result.configured,
              }
            : prev
        );
        setDnsVisible(true);
        setMessage(
          result.configured
            ? 'Custom domain connected.'
            : 'Domain connected. Add the DNS record and verify.'
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to connect domain');
      }
    });
  };

  const handleCheck = async () => {
    if (!siteId) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await checkCustomDomainStatus(siteId);
        setSite((prev) =>
          prev ? { ...prev, custom_domain_verified: result.verified } : prev
        );
        setMessage(result.verified ? 'Your custom domain is active.' : 'Verification pending.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to check domain status');
      }
    });
  };

  const handleRemove = async () => {
    if (!siteId) return;
    setMessage(null);
    startTransition(async () => {
      try {
        await removeCustomDomainFromSite(siteId);
        setSite((prev) =>
          prev
            ? { ...prev, custom_domain: null, custom_domain_verified: false }
            : prev
        );
        setDomain('');
        setDnsVisible(false);
        setMessage('Custom domain removed.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to remove domain');
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="text-2xl font-semibold">Domain</div>
      <p className="text-sm text-muted-foreground mt-1">
        Manage your site URL and custom domain.
      </p>

      <Separator className="my-6" />

      <div className="flex flex-col gap-6">
        <section className="rounded-lg border border-border p-5">
          <div className="text-sm font-medium">Your Site URL</div>
          <div className="mt-3 text-sm text-muted-foreground">
            {site?.is_published && vercelUrl ? (
              <div className="flex flex-col gap-3">
                <div>Your site is live at:</div>
                <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
                  <span className="truncate">{vercelUrl.replace('https://', '')}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(vercelUrl, '_blank')}
                    >
                      Visit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigator.clipboard.writeText(vercelUrl)}
                    >
                      Copy URL
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>Publish your site to get a live URL.</div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border p-5">
          <div className="text-sm font-medium">Connect a custom domain</div>
          <div className="mt-3 flex items-center gap-2">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="yourdomain.com"
            />
            <Button size="sm" onClick={handleConnect} disabled={isLoading}>
              Connect
            </Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            You will need to add a DNS record to your domain provider.
          </div>

          {(dnsVisible || site?.custom_domain) && (
            <div className="mt-4 rounded-md bg-muted p-4 text-sm">
              <div className="font-medium mb-2">Configure your DNS</div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>Add this record to your domain:</div>
                <div>Type: CNAME</div>
                <div>Name: @ (or www)</div>
                <div>Value: cname.vercel-dns.com</div>
                <div className="pt-2">OR for root domain add:</div>
                <div>Type: A</div>
                <div>Name: @</div>
                <div>Value: 76.76.21.21</div>
                <div className="pt-2">Changes can take up to 48 hours.</div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={handleCheck} disabled={isLoading}>
                  Check Verification Status
                </Button>
                {site?.custom_domain && (
                  <Button size="sm" variant="ghost" onClick={handleRemove} disabled={isLoading}>
                    Remove
                  </Button>
                )}
              </div>
              {site?.custom_domain_verified && (
                <div className="mt-3 text-xs text-green-600">
                  Your custom domain is active.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border p-5">
          <div className="text-sm font-medium">Buy a domain</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Don&apos;t have a domain yet? Get one from Namecheap from $1.98.
          </div>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => window.open(NAMECHEAP_AFFILIATE_URL, '_blank')}
          >
            Get a domain
          </Button>
        </section>

        {message && <div className="text-sm text-muted-foreground">{message}</div>}
      </div>
    </div>
  );
>>>>>>> 5472cf66654042f129fdd1d9b7bf366665fc90b0
}
