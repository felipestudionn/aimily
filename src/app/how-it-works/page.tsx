import { redirect } from 'next/navigation';

/**
 * /how-it-works was the old slideshow-based explainer. The full E2E story
 * (4-block journey + AZUR walkthrough + Before/After per block) lives in
 * /meet-aimily. Single source of truth — redirect anyone who lands here.
 */
export default function HowItWorksPage() {
  redirect('/meet-aimily');
}
