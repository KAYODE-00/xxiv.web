'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-browser';

export default function SiteLogoutPage() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const supabase = await createBrowserClient();
      await supabase?.auth.signOut();
      router.replace('/');
    })();
  }, [router]);

  return null;
}
