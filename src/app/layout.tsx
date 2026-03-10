import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'OLAWAVE — Collection Management',
  description: 'Plan, design, and launch fashion collections.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <main className="relative min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
