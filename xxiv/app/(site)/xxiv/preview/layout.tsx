import { cookies } from 'next/headers';
import { getScopedSettingsByKeys } from '@/lib/repositories/settingsRepository';
import CustomCodeInjector from '@/components/CustomCodeInjector';

/** Preview layout — injects global custom body code. Head code is handled by root layout. */
export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const xxivSiteId = cookieStore.get('xxiv_site_id')?.value || null;
  const settings = await getScopedSettingsByKeys(['custom_code_body'], xxivSiteId);
  const globalCustomCodeBody = settings.custom_code_body as string | null;

  return (
    <>
      {children}
      {globalCustomCodeBody && (
        <CustomCodeInjector html={globalCustomCodeBody} />
      )}
    </>
  );
}
