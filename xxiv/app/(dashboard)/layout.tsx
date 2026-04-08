import type { Metadata } from 'next';
import { requireAuthUser } from '@/lib/xxiv/server-client';
import { DM_Sans, Bebas_Neue } from 'next/font/google';
import '@/app/globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap' });
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
    <html lang="en">
      <body
        className={dmSans.className}
        style={{
          background: '#000',
          minHeight: '100vh',
          color: '#fff',
          margin: 0,
        }}
      >
        <style>{`
          :root {
            --xxiv-font-bebas: ${bebasNeue.style.fontFamily};
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
