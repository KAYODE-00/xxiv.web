/**
 * Settings navigation items for the settings sidebar.
 * Extracted for reuse and to allow cloud overlay to filter items.
 */

export interface SettingsNavItem {
  id: string;
  label: string;
  path: string;
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { id: 'general', label: 'General', path: '/xxiv/settings/general' },
  { id: 'users', label: 'Users', path: '/xxiv/settings/users' },
  { id: 'redirects', label: 'Redirects', path: '/xxiv/settings/redirects' },
  { id: 'email', label: 'Email', path: '/xxiv/settings/email' },
];
