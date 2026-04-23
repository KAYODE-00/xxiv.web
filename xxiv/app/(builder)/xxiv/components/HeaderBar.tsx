'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useEditorUrl } from '@/hooks/use-editor-url';
import { findHomepage } from '@/lib/page-utils';
import { getTranslationValue } from '@/lib/localisation-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// 4. Stores
import { useEditorStore } from '@/stores/useEditorStore';
import { usePagesStore } from '@/stores/usePagesStore';
import { useCollectionsStore } from '@/stores/useCollectionsStore';
import { useLocalisationStore } from '@/stores/useLocalisationStore';
import { buildSlugPath, buildDynamicPageUrl, buildLocalizedSlugPath, buildLocalizedDynamicPageUrl } from '@/lib/page-utils';
import { getXxivSiteIdFromBrowser } from '@/lib/xxiv/realtime-namespace';

// 5. Types
import type { Page } from '@/types';
import type { User } from '@supabase/supabase-js';
import ActiveUsersInHeader from './ActiveUsersInHeader';
import InviteUserButton from './InviteUserButton';
import PublishPopover from './PublishPopover';
import Icon from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { BackupRestoreDialog } from '@/components/project/BackupRestoreDialog';
import { isCloudVersion } from '@/lib/utils';

interface HeaderBarProps {
  user: User | null;
  signOut: () => Promise<void>;
  showPageDropdown: boolean;
  setShowPageDropdown: (show: boolean) => void;
  currentPage: Page | undefined;
  currentPageId: string | null;
  pages: Page[];
  setCurrentPageId: (id: string) => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  isPublishing: boolean;
  setIsPublishing: (isPublishing: boolean) => void;
  saveImmediately: (pageId: string) => Promise<void>;
  activeTab: 'pages' | 'layers' | 'cms';
  onExitComponentEditMode?: () => void;
  onPublishSuccess: () => void;
  isSettingsRoute?: boolean;
}

export default function HeaderBar({
  user,
  signOut,
  showPageDropdown,
  setShowPageDropdown,
  currentPage,
  currentPageId,
  pages,
  setCurrentPageId,
  isSaving,
  hasUnsavedChanges,
  lastSaved,
  isPublishing,
  setIsPublishing,
  saveImmediately,
  activeTab,
  onExitComponentEditMode,
  onPublishSuccess,
  isSettingsRoute = false,
}: HeaderBarProps) {
  const buildPublishedSiteUrl = (siteUrl: string | null, siteSlug: string | null, pagePath: string) => {
    if (!siteUrl) {
      const slugPrefix = siteSlug ? `/${siteSlug}` : '';
      return `${baseUrl}${slugPrefix}${pagePath}`;
    }

    try {
      const url = new URL(siteUrl);
      const siteBasePath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
      url.pathname = `${siteBasePath}${pagePath || ''}` || '/';
      return url.toString();
    } catch {
      return siteUrl;
    }
  };

  const router = useRouter();
  const pathname = usePathname();
  const pageDropdownRef = useRef<HTMLDivElement>(null);
  const { currentPageCollectionItemId, currentPageId: storeCurrentPageId, isPreviewMode, setPreviewMode, openFileManager, setKeyboardShortcutsOpen, setActiveSidebarTab, lastDesignUrl, setLastDesignUrl } = useEditorStore();
  const { folders, pages: storePages } = usePagesStore();
  const { items, fields, collections, selectedCollectionId: storeSelectedCollectionId, setSelectedCollectionId } = useCollectionsStore();
  const { locales, selectedLocaleId, setSelectedLocaleId, translations } = useLocalisationStore();
  const { navigateToLayers, navigateToCollection, navigateToCollections, updateQueryParams, routeType } = useEditorUrl();

  // Optimistic nav button state - set immediately on click, cleared when URL catches up
  type NavButton = 'design' | 'cms' | 'forms';
  const [optimisticNav, setOptimisticNav] = useState<NavButton | null>(null);

  // Clear optimistic state once the URL reflects the clicked route
  useEffect(() => {
    if (!optimisticNav) return;
    const isDesignRoute = routeType === 'layers' || routeType === 'page' || routeType === 'component' || routeType === null;
    const isCmsRoute = routeType === 'collection' || routeType === 'collections-base';
    const isFormsRoute = routeType === 'forms';

    if (
      (optimisticNav === 'design' && isDesignRoute) ||
      (optimisticNav === 'cms' && isCmsRoute) ||
      (optimisticNav === 'forms' && isFormsRoute)
    ) {
      setOptimisticNav(null);
    }
  }, [routeType, optimisticNav]);

  // Derive active button: optimistic state takes priority, then URL
  const activeNavButton = useMemo((): NavButton | null => {
    if (optimisticNav) return optimisticNav;
    if (routeType === 'collection' || routeType === 'collections-base') return 'cms';
    if (routeType === 'forms') return 'forms';
    if (routeType === 'layers' || routeType === 'page' || routeType === 'component' || routeType === null) return 'design';
    return null;
  }, [optimisticNav, routeType]);

  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'system' | 'light' | 'dark' | null;
      return savedTheme || 'dark';
    }
    return 'dark';
  });
  const [baseUrl, setBaseUrl] = useState<string>('');

  // Use the store value which is reliably populated by the builder initialization
  const storeXxivSiteId = useEditorStore((state) => state.xxivCollaborationSiteId);
  const [xxivSiteId, setXxivSiteId] = useState<string | null>(null);
  const [xxivLiveUrl, setXxivLiveUrl] = useState<string | null>(null);
  const [xxivSiteSlug, setXxivSiteSlug] = useState<string | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  // Get current host after mount
  useEffect(() => {
    setBaseUrl(window.location.protocol + '//' + window.location.host);
    setXxivSiteId(storeXxivSiteId || getXxivSiteIdFromBrowser());
  }, [storeXxivSiteId]);

  useEffect(() => {
    if (!xxivSiteId) return;

    const loadSiteInfo = async () => {
      try {
        const response = await fetch(`/xxiv/api/xxiv/site-info?site_id=${encodeURIComponent(xxivSiteId)}`);
        if (!response.ok) return;

        const data = await response.json();
        setXxivLiveUrl(typeof data?.live_url === 'string' ? data.live_url : null);
        setXxivSiteSlug(typeof data?.slug === 'string' ? data.slug : null);
      } catch (error) {
        console.error('Failed to load XXIV site info:', error);
      }
    };

    loadSiteInfo();
  }, [xxivSiteId]);



  // Get selected locale (computed from subscribed store values)
  const selectedLocale = useMemo(() => {
    if (!selectedLocaleId) return null;
    return locales.find((l: any) => l.id === selectedLocaleId) || null;
  }, [selectedLocaleId, locales]);

  // Get translations for the selected locale
  const localeTranslations = useMemo(() => {
    return selectedLocaleId ? translations[selectedLocaleId] : undefined;
  }, [selectedLocaleId, translations]);

  // Strip XXIV suffix from slugs for cleaner URLs in builder/preview
  // Uses regex to strip any 8-character hex code, covering pages imported/duplicated from other sites.
  const stripSuffix = (slug: string) => {
    if (!slug) return slug;
    return slug.replace(/-[a-f0-9]{8}(?=\/|$)/gi, '');
  };

  // Build full page path including folders (memoized for performance)
  const fullPagePath = useMemo(() => {
    if (!currentPage) return '/';
    // Clean slug for display icon/labels
    const pageWithCleanSlug = { ...currentPage, slug: stripSuffix(currentPage.slug) } as Page;
    const cleanFolders = folders.map(f => ({ ...f, slug: stripSuffix(f.slug) }));
    return buildSlugPath(pageWithCleanSlug, cleanFolders, 'page');
  }, [currentPage, folders, xxivSiteId]);

  // Build localized page path with translated slugs
  const localizedPagePath = useMemo(() => {
    // If no current page, use homepage for localization route
    const pageToUse = currentPage || (isSettingsRoute ? findHomepage(storePages) : null);

    if (!pageToUse) return '/';

    // Clean slug for the page to use
    const cleanPageToUse = { ...pageToUse, slug: stripSuffix(pageToUse.slug) } as Page;
    const cleanFolders = folders.map(f => ({ ...f, slug: stripSuffix(f.slug) }));

    return buildLocalizedSlugPath(
      cleanPageToUse,
      cleanFolders,
      'page',
      selectedLocale,
      localeTranslations
    );
  }, [currentPage, isSettingsRoute, storePages, folders, selectedLocale, localeTranslations, xxivSiteId]);

  // Get collection item slug value for dynamic pages (with translation support)
  const collectionItemSlug = useMemo(() => {
    if (!currentPage?.is_dynamic || !currentPageCollectionItemId) {
      return null;
    }

    const collectionId = currentPage.settings?.cms?.collection_id;
    const slugFieldId = currentPage.settings?.cms?.slug_field_id;

    if (!collectionId || !slugFieldId) {
      return null;
    }

    // Find the item in the store
    const collectionItems = items[collectionId] || [];
    const selectedItem = collectionItems.find((item: any) => item.id === currentPageCollectionItemId);

    if (!selectedItem || !selectedItem.values) {
      return null;
    }

    // Get the slug value from the item's values
    let slugValue = selectedItem.values[slugFieldId];

    // If locale is selected, check for translated slug
    if (localeTranslations && slugValue) {
      const collectionFields = fields[collectionId] || [];
      const slugField = collectionFields.find((f: { id: string; key: string | null }) => f.id === slugFieldId);

      if (slugField) {
        // Build translation key: field:key:{key} or field:id:{id}
        const contentKey = slugField.key
          ? `field:key:${slugField.key}`
          : `field:id:${slugField.id}`;
        const translationKey = `cms:${currentPageCollectionItemId}:${contentKey}`;
        const translation = localeTranslations[translationKey];

        const translatedSlug = getTranslationValue(translation);
        if (translatedSlug) {
          slugValue = translatedSlug;
        }
      }
    }

    return slugValue || null;
  }, [currentPage, currentPageCollectionItemId, items, fields, localeTranslations]);

  // Build preview URL (special handling for error pages and dynamic pages)
  const previewUrl = useMemo(() => {
    if (!currentPage) return '';

    // Error pages use special preview route
    if (currentPage.error_page !== null) {
      return `/xxiv/preview/error-pages/${currentPage.error_page}`;
    }

    // For dynamic pages, use localized dynamic URL builder
    const rawPath = currentPage.is_dynamic
      ? buildLocalizedDynamicPageUrl(currentPage as Page, folders, collectionItemSlug, selectedLocale, localeTranslations)
      : localizedPagePath;

    // Globally strip any suffix leaks from the finalized path
    const path = stripSuffix(rawPath);

    const qs = xxivSiteId ? `?xxiv_site_id=${encodeURIComponent(xxivSiteId)}` : '';
    return `/xxiv/preview${path === '/' ? '' : path}${qs}`;
  }, [currentPage, folders, localizedPagePath, collectionItemSlug, selectedLocale, localeTranslations, xxivSiteId]);

  // Build published URL (for the link in the center)
  const publishedUrl = useMemo(() => {
    // If no current page, use homepage for localization route
    const pageToUse = currentPage || (isSettingsRoute ? findHomepage(storePages) : null);
    if (!pageToUse) return '';

    // For dynamic pages, use localized dynamic URL builder
    const path = pageToUse.is_dynamic
      ? buildLocalizedDynamicPageUrl(pageToUse, folders, collectionItemSlug, selectedLocale, localeTranslations)
      : localizedPagePath;

    return path === '/' ? '' : path;
  }, [currentPage, isSettingsRoute, storePages, folders, localizedPagePath, collectionItemSlug, selectedLocale, localeTranslations]);

  const liveSiteUrl = useMemo(() => {
    if (!publishedUrl && !xxivLiveUrl) return baseUrl;
    return buildPublishedSiteUrl(xxivLiveUrl, xxivSiteSlug, publishedUrl);
  }, [baseUrl, publishedUrl, xxivLiveUrl, xxivSiteSlug]);

  const liveSiteLabel = useMemo(() => {
    return liveSiteUrl || baseUrl;
  }, [baseUrl, liveSiteUrl]);

  // Apply theme to HTML element
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close page dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pageDropdownRef.current && !pageDropdownRef.current.contains(event.target as Node)) {
        setShowPageDropdown(false);
      }
    };

    if (showPageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPageDropdown, setShowPageDropdown]);

  return (
    <>
      <header className="h-14 bg-background border-b grid grid-cols-3 items-center px-4">
        {/* Left: Logo & Navigation */}
        <div className="flex items-center gap-2">

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary" size="sm"
                className="size-8!"
              >
                <div className="dark:text-white text-secondary-foreground">
                  <svg
                    className="size-3.5 fill-current" viewBox="0 0 24 24"
                    version="1.1" xmlns="http://www.w3.org/2000/svg"
                  >
                    <g
                      id="Symbols" stroke="none"
                      strokeWidth="1" fill="none"
                      fillRule="evenodd"
                    >
                      <g id="Sidebar" transform="translate(-30.000000, -30.000000)">
                        <g id="Xxiv">
                          <g transform="translate(30.000000, 30.000000)">
                            <rect
                              id="Rectangle" x="0"
                              y="0" width="24"
                              height="24"
                            />
                            <path
                              id="CurrentFill" d="M11.4241533,0 L11.4241533,5.85877951 L6.024,8.978 L12.6155735,12.7868008 L10.951,13.749 L23.0465401,6.75101349 L23.0465401,12.6152717 L3.39516096,23.9856666 L3.3703726,24 L3.34318129,23.9827156 L0.96,22.4713365 L0.96,16.7616508 L3.36417551,18.1393242 L7.476,15.76 L0.96,11.9090099 L0.96,6.05375516 L11.4241533,0 Z"
                              className="fill-current"
                            />
                          </g>
                        </g>
                      </g>
                    </g>
                  </svg>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {isCloudVersion() && (
                <>
                  <DropdownMenuItem asChild>
                    <a href="https://dashboard.xxiv.cloud/dashboard">
                      Dashboard
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => router.push('/xxiv/settings/general')}
              >
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => openFileManager()}
              >
                File manager
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push('/xxiv/integrations/apps')}
              >
                Integrations
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setShowTransferDialog(true)}
              >
                Backup &amp; Restore
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={theme} onValueChange={(value: string) => setTheme(value as 'system' | 'light' | 'dark')}>
                    <DropdownMenuRadioItem value="system">
                      System
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="light">
                      Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      Dark
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem
                onClick={() => setKeyboardShortcutsOpen(true)}
              >
                Keyboard shortcuts
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => router.push('/xxiv/profile')}
              >
                My profile
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex gap-1">
            <Button
              variant={activeNavButton === 'design' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setOptimisticNav('design');
                setActiveSidebarTab('layers');
                // Restore last design URL if available
                if (lastDesignUrl) {
                  router.push(lastDesignUrl);
                } else {
                  const targetPageId = storeCurrentPageId || findHomepage(storePages)?.id || storePages[0]?.id;
                  if (targetPageId) {
                    navigateToLayers(targetPageId);
                  }
                }
              }}
            >
              <Icon name="cursor-default" />
              Design
            </Button>
            <Button
              variant={activeNavButton === 'cms' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                // Save current design URL before navigating away
                const isDesignRoute = routeType === 'layers' || routeType === 'page' || routeType === 'component';
                if (isDesignRoute) {
                  setLastDesignUrl(window.location.pathname + window.location.search);
                }
                setOptimisticNav('cms');
                setActiveSidebarTab('cms');
                // Navigate to last selected or first available collection
                const targetCollectionId = storeSelectedCollectionId || collections[0]?.id;
                if (targetCollectionId) {
                  setSelectedCollectionId(targetCollectionId);
                  navigateToCollection(targetCollectionId);
                } else {
                  navigateToCollections();
                }
              }}
            >
              <Icon name="database" />
              CMS
            </Button>
            <Button
              variant={activeNavButton === 'forms' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                // Save current design URL before navigating away
                const isDesignRoute = routeType === 'layers' || routeType === 'page' || routeType === 'component';
                if (isDesignRoute) {
                  setLastDesignUrl(window.location.pathname + window.location.search);
                }
                setOptimisticNav('forms');
                router.push('/xxiv/forms');
              }}
            >
              <Icon name="form" />
              Forms
            </Button>
          </div>
        </div>

        <div className="flex gap-1.5 items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="xs" variant="ghost">
                <Icon name="globe" />
                {selectedLocale ? selectedLocale.code.toUpperCase() : 'EN'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={selectedLocaleId || ''}
                onValueChange={(value: string) => setSelectedLocaleId(value)}
              >
                {locales.map((locale: any) => (
                  <DropdownMenuRadioItem key={locale.id} value={locale.id}>
                    <span className="flex items-center gap-3">
                      {locale.label}
                      {locale.is_default && (
                        <Badge variant="secondary" className="text-[10px] mr-5">
                          Default
                        </Badge>
                      )}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              {!pathname?.startsWith('/xxiv/localization') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push('/xxiv/localization')}
                  >
                    Manage locales
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5">
            <Separator orientation="vertical" />
          </div>

          <Button
            size="xs"
            variant="ghost"
            asChild
          >
            <a
              href={liveSiteUrl} target="_blank"
              rel="noopener noreferrer"
            >
              {liveSiteLabel}
            </a>
          </Button>


        </div>

        {/* Right: User & Actions */}
        <div className="flex items-center justify-end gap-2">
          {/* Active Users */}
          <ActiveUsersInHeader />

          {/* Invite User */}
          <InviteUserButton />

          {/* Save Status Indicator */}
          <div className="flex items-center justify-end w-16 text-xs text-zinc-500 dark:text-white/50">
            {isSaving ? (
              <>
                <span>Saving</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <span>Unsaved</span>
              </>
            ) : lastSaved ? (
              <>
                <span>Saved</span>
              </>
            ) : (
              <>
                <span>Ready</span>
              </>
            )}
          </div>

          {/* Preview button */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (isPreviewMode) {
                // Exit preview mode
                setPreviewMode(false);
                updateQueryParams({ preview: undefined });
              } else {
                // Enter preview mode
                setPreviewMode(true);
                updateQueryParams({ preview: 'true' });
              }
            }}
            disabled={!currentPage || isSaving}
            className={isPreviewMode ? 'bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90' : ''}
          >
            <Icon name="preview" />
          </Button>

          <PublishPopover
            isPublishing={isPublishing}
            setIsPublishing={setIsPublishing}
            baseUrl={baseUrl}
            publishedUrl={publishedUrl}
            onPublishSuccess={onPublishSuccess}
            xxivSiteId={xxivSiteId}
            xxivSiteSlug={xxivSiteSlug}
            xxivLiveUrl={xxivLiveUrl}
            onXxivPublishSuccess={setXxivLiveUrl}
          />

        </div>
      </header>

      <BackupRestoreDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
      />
    </>
  );
}
