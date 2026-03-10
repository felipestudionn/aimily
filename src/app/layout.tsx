import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'OLAWAVE — Collection Management',
  description: 'Plan, design, and launch fashion collections.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OLAWAVE',
  },
  themeColor: '#282A29',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/images/olawave-icon-512.png" />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <ServiceWorkerRegistrar />
          <main className="relative min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
