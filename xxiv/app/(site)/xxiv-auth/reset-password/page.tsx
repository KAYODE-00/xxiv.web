import { Suspense } from 'react';
import SiteAuthScreen from '@/components/xxiv/site-auth/SiteAuthScreen';

export default function SiteResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SiteAuthScreen mode="reset-password" />
    </Suspense>
  );
}
