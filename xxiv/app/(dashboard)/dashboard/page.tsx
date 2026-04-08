import { getUserSites } from '../actions/sites';
import { requireAuthUser } from '@/lib/xxiv/server-client';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const user = await requireAuthUser();
  const sites = await getUserSites();

  return <DashboardClient user={user} initialSites={sites} />;
}
