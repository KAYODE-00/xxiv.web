'use client';

import { useState, useTransition } from 'react';
import {
  checkCustomDomainStatus,
  connectCustomDomain,
  removeCustomDomain,
} from '@/app/(dashboard)/actions/sites';

type SiteState = {
  name: string;
  slug: string;
  live_url: string | null;
  cf_project_name: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  publish_status: string;
};

export default function SiteDomainSettings({
  siteId,
  initialSite,
}: {
  siteId: string;
  initialSite: SiteState;
}) {
  const [site, setSite] = useState(initialSite);
  const [domainInput, setDomainInput] = useState(initialSite.custom_domain || '');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const freeSubdomain = site.cf_project_name ? `https://${site.cf_project_name}.pages.dev` : site.live_url;
  const domainTarget = site.cf_project_name ? `${site.cf_project_name}.pages.dev` : null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-medium">Your site URL</h2>
        <p className="mt-2 text-sm text-zinc-400">This free Cloudflare Pages subdomain is created under your account when the site is published.</p>
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-black/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-200">{freeSubdomain || 'Publish this site to get a pages.dev URL'}</div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!freeSubdomain}
              onClick={() => freeSubdomain && window.open(freeSubdomain, '_blank')}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Visit
            </button>
            <button
              type="button"
              disabled={!freeSubdomain}
              onClick={async () => {
                if (!freeSubdomain) return;
                await navigator.clipboard.writeText(freeSubdomain);
                setStatusMessage('Free subdomain copied.');
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Copy
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-medium">Connect custom domain</h2>
        <p className="mt-2 text-sm text-zinc-400">Point your own domain to the Cloudflare Pages project for this site.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
            placeholder="yourdomain.com"
            className="flex-1 rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none"
          />
          <button
            type="button"
            disabled={isPending || !site.cf_project_name}
            onClick={() => {
              setError(null);
              setStatusMessage(null);
              startTransition(async () => {
                try {
                  const result = await connectCustomDomain(siteId, domainInput);
                  setSite((current) => ({
                    ...current,
                    custom_domain: result.domain,
                    custom_domain_verified: false,
                  }));
                  setStatusMessage('Domain connected. Add the DNS records below, then check status.');
                } catch (actionError) {
                  setError(actionError instanceof Error ? actionError.message : 'Failed to connect domain');
                }
              });
            }}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            Connect
          </button>
        </div>

        {site.custom_domain && domainTarget && (
          <div className="mt-5 rounded-xl border border-zinc-800 bg-black/60 p-4 text-sm text-zinc-300">
            <div className="font-medium text-white">DNS instructions</div>
            <div className="mt-3 space-y-2">
              <div>CNAME</div>
              <div>Name: <span className="text-white">www</span></div>
              <div>Value: <span className="text-white">{domainTarget}</span></div>
              <div className="pt-2">Root domain option</div>
              <div>Name: <span className="text-white">@</span></div>
              <div>Value: <span className="text-white">192.0.2.1</span></div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  setStatusMessage(null);
                  startTransition(async () => {
                    try {
                      const result = await checkCustomDomainStatus(siteId);
                      if (result.verified) {
                        setSite((current) => ({
                          ...current,
                          live_url: `https://${current.custom_domain}`,
                          custom_domain_verified: true,
                        }));
                        setStatusMessage(`Verified. ${site.custom_domain} is live.`);
                      } else {
                        setStatusMessage(`Still pending: ${result.status}`);
                      }
                    } catch (actionError) {
                      setError(actionError instanceof Error ? actionError.message : 'Failed to check DNS status');
                    }
                  });
                }}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Check DNS Status
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  setStatusMessage(null);
                  startTransition(async () => {
                    try {
                      await removeCustomDomain(siteId);
                      setSite((current) => ({
                        ...current,
                        custom_domain: null,
                        custom_domain_verified: false,
                        live_url: freeSubdomain || current.live_url,
                      }));
                      setDomainInput('');
                      setStatusMessage('Custom domain removed.');
                    } catch (actionError) {
                      setError(actionError instanceof Error ? actionError.message : 'Failed to remove custom domain');
                    }
                  });
                }}
                className="rounded-md border border-red-800 px-3 py-2 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove domain
              </button>
            </div>
          </div>
        )}

        {site.custom_domain_verified && site.custom_domain && (
          <div className="mt-4 rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-300">
            {site.custom_domain} is live.
          </div>
        )}

        {statusMessage && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-black/60 p-4 text-sm text-zinc-300">
            {statusMessage}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-medium">Buy a domain</h2>
        <p className="mt-2 text-sm text-zinc-400">Need a domain first? Send users to your affiliate offer.</p>
        <a
          href="https://www.namecheap.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-md border border-zinc-700 px-3 py-2 text-sm text-white"
        >
          Get a domain from Namecheap
        </a>
      </section>
    </div>
  );
}
