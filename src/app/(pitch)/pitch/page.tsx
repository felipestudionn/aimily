/* ═══════════════════════════════════════════════════════════════════
   /pitch — investor + Zara deck.

   Soft gate via ?key=… — not real auth, just prevents accidental
   crawl/share. The real protection is the URL not being linked
   anywhere public.
   ═══════════════════════════════════════════════════════════════════ */

import { redirect } from 'next/navigation';
import { PitchDeck } from '@/components/pitch/PitchDeck';

const PITCH_KEY = process.env.PITCH_KEY ?? 'aimily-2026';

export default async function PitchPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; s?: string }>;
}) {
  const params = await searchParams;

  if (params.key !== PITCH_KEY) {
    redirect('/');
  }

  const initialSlide = Math.max(0, Math.min(parseInt(params.s ?? '0', 10) || 0, 4));

  return <PitchDeck initialSlide={initialSlide} />;
}
