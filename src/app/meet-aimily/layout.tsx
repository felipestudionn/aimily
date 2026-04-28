import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'aimily — the SaaS Miranda would have hired',
  description: 'The fashion collection platform built by StudioNN. Plan, design, render and launch — same top-quality AI on every plan. 14-day free trial.',
  metadataBase: new URL('https://www.aimily.app'),
  alternates: { canonical: '/meet-aimily' },
  openGraph: {
    type: 'website',
    url: 'https://www.aimily.app/meet-aimily',
    siteName: 'aimily',
    title: 'aimily — the SaaS Miranda would have hired',
    description: 'Plan, design, render and launch your fashion collections. AI-powered, same top-quality models on every plan. 14-day free trial.',
    images: [
      {
        url: 'https://www.aimily.app/meet-aimily/og.jpg',
        width: 1200,
        height: 630,
        alt: 'aimily — fashion collection platform',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'aimily — the SaaS Miranda would have hired',
    description: 'Plan, design, render and launch your fashion collections. AI-powered, same top-quality models on every plan.',
    images: ['https://www.aimily.app/meet-aimily/og.jpg'],
    creator: '@studionn_agency',
  },
  robots: { index: true, follow: true },
};

export default function MeetAimilyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
