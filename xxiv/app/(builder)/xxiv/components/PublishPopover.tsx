'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import Icon from '@/components/ui/icon';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { publishApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

interface PublishPreviewCounts {
  pages: number;
  collections: number;
  collectionItems: number;
  components: number;
  layerStyles: number;
  assets: number;
  total: number;
}

const BREAKDOWN_ITEMS: { key: keyof Omit<PublishPreviewCounts, 'total'>; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { key: 'pages', label: 'Pages', icon: 'page' },
  { key: 'components', label: 'Components', icon: 'component' },
  { key: 'collections', label: 'Collections', icon: 'database' },
  { key: 'collectionItems', label: 'Collection items', icon: 'database' },
  { key: 'layerStyles', label: 'Layer styles', icon: 'cube' },
  { key: 'assets', label: 'Assets', icon: 'image' },
];

interface PublishPopoverProps {
  isPublishing: boolean;
  setIsPublishing: (isPublishing: boolean) => void;
  baseUrl: string;
  publishedUrl: string;
  isDisabled?: boolean;
  onPublishSuccess: () => void;
  xxivSiteId?: string | null;
  xxivLiveUrl?: string | null;
  onXxivPublishSuccess?: (url: string) => void;
}

export default function PublishPopover({
  isPublishing,
  setIsPublishing,
  baseUrl,
  publishedUrl,
  isDisabled = false,
  onPublishSuccess,
  xxivSiteId = null,
  xxivLiveUrl = null,
  onXxivPublishSuccess,
}: PublishPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [changeCounts, setChangeCounts] = useState<PublishPreviewCounts | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishStepLabel, setPublishStepLabel] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(xxivLiveUrl);
  const [isReverting, setIsReverting] = useState(false);
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);

  const { getSettingByKey, updateSetting } = useSettingsStore();
  const publishedAt = getSettingByKey('published_at');

  const buildPublishedSiteUrl = useCallback((siteUrl: string | null, pagePath: string) => {
    if (!siteUrl) {
      return `${baseUrl}${pagePath}`;
    }

    try {
      const url = new URL(siteUrl);
      const siteBasePath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
      url.pathname = `${siteBasePath}${pagePath || ''}` || '/';
      return url.toString();
    } catch {
      return siteUrl;
    }
  }, [baseUrl]);

  useEffect(() => {
    setLiveUrl(xxivLiveUrl);
  }, [xxivLiveUrl]);

  useEffect(() => {
    if (isOpen) {
      loadChangesCount();
    }
  }, [isOpen]);

  const loadChangesCount = async () => {
    setIsLoadingCount(true);
    try {
      const response = await publishApi.getPreview();
      setChangeCounts(response.data ?? null);
    } catch (error) {
      console.error('Failed to load changes count:', error);
      setChangeCounts(null);
    } finally {
      setIsLoadingCount(false);
    }
  };

  const handlePublishAll = useCallback(async () => {
    try {
      setDeployError(null);
      setPublishStepLabel('Publishing content...');
      setIsPublishing(true);

      const result = await publishApi.publish({ publishAll: true });

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data?.published_at_setting?.value) {
        updateSetting('published_at', result.data.published_at_setting.value);
      }

      let resolvedLiveUrl = liveUrl;

      if (xxivSiteId) {
        setPublishStepLabel('Publishing live site...');

        const deployResponse = await fetch('/xxiv/api/xxiv/publish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ xxivSiteId }),
        });

        const deployJson = await deployResponse.json().catch(() => null);
        if (!deployResponse.ok) {
          throw new Error(deployJson?.error || 'Site publish failed');
        }

        const deployedSiteUrl = typeof deployJson?.url === 'string' ? deployJson.url : liveUrl;
        resolvedLiveUrl = buildPublishedSiteUrl(deployedSiteUrl, publishedUrl);
        setLiveUrl(resolvedLiveUrl || null);
        onXxivPublishSuccess?.(resolvedLiveUrl || '');
      } else {
        resolvedLiveUrl = baseUrl + publishedUrl;
      }

      toast.success('Website published successfully', {
        action: resolvedLiveUrl
          ? {
              label: 'Open',
              onClick: () => window.open(resolvedLiveUrl, '_blank'),
            }
          : undefined,
      });

      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 3000);
      setPublishStepLabel(null);

      onPublishSuccess();
      loadChangesCount();
    } catch (error) {
      console.error('Failed to publish all:', error);
      setDeployError(error instanceof Error ? error.message : 'Publish failed');
      setPublishStepLabel(null);
      toast.error(error instanceof Error ? error.message : 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  }, [baseUrl, buildPublishedSiteUrl, liveUrl, onPublishSuccess, onXxivPublishSuccess, publishedUrl, setIsPublishing, updateSetting, xxivSiteId]);

  const handleCopyUrl = useCallback(async () => {
    const urlToCopy = buildPublishedSiteUrl(liveUrl, publishedUrl);
    if (!urlToCopy) return;

    try {
      await navigator.clipboard.writeText(urlToCopy);
      toast.success('URL copied');
    } catch {
      toast.error('Failed to copy URL');
    }
  }, [buildPublishedSiteUrl, liveUrl, publishedUrl]);

  const handleRevertConfirm = useCallback(async () => {
    try {
      setIsReverting(true);

      const result = await publishApi.revert();

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success('Revert successful, builder is reloading...');
      window.location.reload();
    } catch (error) {
      console.error('Failed to revert:', error);
      toast.error('Failed to revert changes');
      setIsReverting(false);
      setIsRevertDialogOpen(false);
    }
  }, []);

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" disabled={isDisabled}>Publish</Button>
        </PopoverTrigger>

        <PopoverContent className="mr-4 mt-0.5 w-64">
          <div>
            <Label>
              <a
                href={buildPublishedSiteUrl(liveUrl || xxivLiveUrl, publishedUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {buildPublishedSiteUrl(liveUrl || xxivLiveUrl, publishedUrl)}
              </a>
            </Label>
            <span className="text-popover-foreground text-[10px]">
              {publishedAt ? `Published ${formatRelativeTime(publishedAt, false)}` : 'Never published'}
            </span>
          </div>

          <hr className="my-3" />

          <Button
            size="sm"
            className="w-full"
            onClick={handlePublishAll}
            disabled={isPublishing || publishSuccess}
          >
            {isPublishing ? (
              <><Spinner /> {publishStepLabel || 'Publishing...'}</>
            ) : publishSuccess ? (
              <><Icon name="check" /> Live</>
            ) : (
              publishedAt ? 'Update' : 'Publish'
            )}
          </Button>

          {publishStepLabel && isPublishing && (
            <div className="mt-2 text-xs text-muted-foreground">{publishStepLabel}</div>
          )}

          {publishSuccess && (liveUrl || xxivLiveUrl) && (
            <div className="mt-3 rounded-md border border-emerald-500/25 bg-emerald-500/10 p-3">
              <div className="text-sm font-medium text-emerald-400">Site is live!</div>
              <a
                className="mt-1 block break-all text-xs text-emerald-300 underline underline-offset-2"
                href={liveUrl || xxivLiveUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                {(liveUrl || xxivLiveUrl || '').replace(/^https?:\/\//, '')}
              </a>
              <div className="mt-3 flex gap-2">
                <Button size="xs" variant="secondary" onClick={handleCopyUrl}>Copy URL</Button>
                <Button
                  size="xs"
                  onClick={() => {
                    const target = liveUrl || xxivLiveUrl;
                    if (target) window.open(target, '_blank');
                  }}
                >
                  Visit Site
                </Button>
              </div>
            </div>
          )}

          {deployError && (
            <div className="mt-3 rounded-md border border-red-500/25 bg-red-500/10 p-3">
              <div className="text-sm font-medium text-red-300">Publish failed</div>
              <div className="mt-1 text-xs text-red-200">{deployError}</div>
              <Button size="xs" variant="secondary" className="mt-3" onClick={handlePublishAll}>
                Try Again
              </Button>
            </div>
          )}

          <hr className="my-3" />

          {isLoadingCount ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner className="size-3" />
              Calculating changes...
            </div>
          ) : changeCounts ? (
            changeCounts.total > 0 ? (
              <Collapsible>
                <div className="flex items-center justify-between w-full">
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
                    <div className="size-5.5 flex items-center justify-center bg-input rounded-md">
                      <Icon
                        name="chevronRight"
                        className="size-2.5 transition-transform group-data-[state=open]:rotate-90"
                      />
                    </div>
                    {changeCounts.total} {changeCounts.total === 1 ? 'Change' : 'Changes'}
                  </CollapsibleTrigger>
                  {publishedAt && (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => setIsRevertDialogOpen(true)}
                      disabled={isReverting || isPublishing}
                    >
                      Revert
                    </Button>
                  )}
                </div>
                <CollapsibleContent>
                  <div className="flex flex-col gap-1.5 pt-1.5">
                    {BREAKDOWN_ITEMS.map(({ key, label, icon }) =>
                      changeCounts[key] > 0 ? (
                        <div key={key} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <div className="size-5.5 flex items-center justify-center bg-input rounded-md">
                              <Icon name={icon} className="size-2.5" />
                            </div>
                            {label}
                          </span>
                          <span>{changeCounts[key]}</span>
                        </div>
                      ) : null,
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <span className="text-xs text-muted-foreground">Everything is up to date</span>
            )
          ) : null}
        </PopoverContent>
      </Popover>

      <Dialog
        open={isRevertDialogOpen}
        onOpenChange={(open) => { if (!isReverting) setIsRevertDialogOpen(open); }}
      >
        <DialogContent
          showCloseButton={false}
          onPointerDownOutside={(e) => { if (isReverting) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (isReverting) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>Revert to published version</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <DialogDescription>
              All unpublished changes will be discarded and replaced with the last
              published version. The builder will reload after this operation.
            </DialogDescription>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRevertDialogOpen(false)}
              disabled={isReverting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRevertConfirm}
              disabled={isReverting}
            >
              {isReverting ? <><Spinner /> Reverting...</> : 'Revert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
