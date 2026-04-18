import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Metyis Spain Control Tower',
  description: 'Generic consulting and business analytics control tower',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <Script id="metyis-fonts" strategy="beforeInteractive">
          {`
            document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'https://use.typekit.net/vgf7zap.css' }));
            document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap' }));
          `}
        </Script>
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Toaster
          theme="light"
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-stroke-subtle)',
              color: 'var(--color-fg-default)',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  );
}
