import type { User } from '@supabase/supabase-js';

function parseAdminEmails(): string[] {
  return (process.env.XXIV_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;

  const appRole = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role.toLowerCase() : null;
  const userRole = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role.toLowerCase() : null;
  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? user.app_metadata.roles.map((value: unknown) => String(value).toLowerCase())
    : [];
  const email = user.email?.toLowerCase() || '';
  const adminEmails = parseAdminEmails();

  return appRole === 'admin' || userRole === 'admin' || appRoles.includes('admin') || adminEmails.includes(email);
}
