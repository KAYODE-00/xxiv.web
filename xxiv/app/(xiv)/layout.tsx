export default function XivLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
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
    </div>
  );
}
