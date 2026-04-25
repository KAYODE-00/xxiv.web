import { Suspense } from 'react';
import SiteAuthScreen from '@/components/xxiv/site-auth/SiteAuthScreen';

export default function SiteForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SiteAuthScreen mode="forgot-password" />
    </Suspense>
  );
}
