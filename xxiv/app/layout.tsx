import '@/app/globals.css';
import RootLayoutShell, { defaultMetadata } from '@/components/RootLayoutShell';
import { DM_Sans, Bebas_Neue } from 'next/font/google';
import type { Metadata } from 'next';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas-neue',
  display: 'swap',
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RootLayoutShell>
      <div className={`${dmSans.variable} ${bebasNeue.variable}`}>
        {children}
      </div>
    </RootLayoutShell>
  );
}
