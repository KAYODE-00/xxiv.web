import { getUserSites } from '../actions/sites';
import { requireAuthUser } from '@/lib/xxiv/server-client';
import DashboardClient from './DashboardClient';


export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const user = await requireAuthUser();
  let sites: Awaited<ReturnType<typeof getUserSites>> = {
    owned: [],
    collaborative: [],
    pendingInvites: [],
  };
  let loadError: string | null = null;

  try {
    sites = await getUserSites();
  } catch (error) {
    console.error('[DashboardPage] Failed to load dashboard sites:', error);
    loadError =
      error instanceof Error
        ? error.message
        : 'Failed to load dashboard data';
  }

  return <DashboardClient user={user} initialSites={sites} initialError={loadError} />;
}
