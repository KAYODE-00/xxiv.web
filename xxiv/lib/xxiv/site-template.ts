type TemplateFileMap = Record<string, string>;

export function buildSiteTemplate(): { files: TemplateFileMap } {
  const files: TemplateFileMap = {
    'package.json': JSON.stringify(
      {
        name: 'xxiv-site',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          next: '16.2.1',
          react: '18.3.1',
          'react-dom': '18.3.1',
        },
      },
      null,
      2
    ),
    'next.config.js': `/** @type {import('next').NextConfig} */\nconst nextConfig = { reactStrictMode: true };\nmodule.exports = nextConfig;\n`,
    'app/layout.tsx': `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
    'app/page.tsx': `export default async function Page() {\n  const siteId = process.env.XXIV_SITE_ID;\n  const apiUrl = process.env.XXIV_API_URL;\n\n  if (!siteId || !apiUrl) {\n    return <div>Missing site configuration</div>;\n  }\n\n  const res = await fetch(\`\${apiUrl}/api/xxiv/site/\${siteId}\`, { cache: 'no-store' });\n  if (!res.ok) {\n    return <div>Site unavailable</div>;\n  }\n\n  const data = await res.json();\n  const html = data?.html || '';\n  const css = data?.css || '';\n\n  return (\n    <main>\n      <style dangerouslySetInnerHTML={{ __html: css }} />\n      <div dangerouslySetInnerHTML={{ __html: html }} />\n    </main>\n  );\n}\n`,
  };

  return { files };
}
