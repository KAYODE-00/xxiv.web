import { Suspense } from 'react';
import SiteAuthScreen from '@/components/xxiv/site-auth/SiteAuthScreen';

export default function SiteSignupPage() {
  return (
    <Suspense fallback={null}>
      <SiteAuthScreen mode="signup" />
    </Suspense>
  );
}
