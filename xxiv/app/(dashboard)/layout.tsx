import type { Metadata } from 'next';
import { requireAuthUser } from '@/lib/xxiv/server-client';
import { Bebas_Neue } from 'next/font/google';

const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: '400', display: 'swap' });

export const metadata: Metadata = {
  title: 'XXIV — Dashboard',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthUser();

  return (
    <>
      <style>{`
        :root {
          --xxiv-font-bebas: ${bebasNeue.style.fontFamily};
        }
      `}</style>
      {children}
    </>
  );
}
