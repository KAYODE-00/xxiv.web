import type { Metadata } from 'next';
import { DM_Sans, Bebas_Neue } from 'next/font/google';
import '@/app/globals.css';

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

export const metadata: Metadata = {
  title: 'XXIV',
  description: 'The future of web building.',
};

export default function XivLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${bebasNeue.variable}`}
    >
      <body
        style={{
          background: '#000000',
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {/* Remove all blue focus rings across (xiv) pages */}
        <style>{`
          *:focus { outline: none !important; }
          *:focus-visible { outline: 1px solid rgba(255,255,255,0.35) !important; outline-offset: 2px !important; }
          input, button, a, select, textarea { outline: none !important; box-shadow: none !important; }
          input:focus { border-color: rgba(255,255,255,0.3) !important; }
          ::selection { background: rgba(255,255,255,0.2); color: #fff; }
          * { border-color: transparent; }
        `}</style>
        {children}
      </body>
    </html>
  );
}
