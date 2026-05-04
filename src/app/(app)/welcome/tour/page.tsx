/**
 * /welcome/tour — read-only product tour.
 *
 * Public surface (no auth gate). Renders the same editorial deck used in
 * /welcome onboarding step 2, but without the completion side effects.
 *
 * Use cases:
 *   - Logged-in users who want to re-watch the tour (link from /account)
 *   - Prospects sent a direct shareable URL
 *   - Email recipients who click "see what aimily does" in the future
 */
import { TourDeck } from '@/components/onboarding/TourDeck';

export const metadata = {
  title: 'Product tour — aimily',
  description: 'Four blocks. Three modes. Built so you can run a season alone, or bring AI in only when it helps.',
};

export default function WelcomeTourPage() {
  return <TourDeck />;
}
