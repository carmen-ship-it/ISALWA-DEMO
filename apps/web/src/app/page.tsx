import { IntroExperience } from '@/components/intro-experience';

/**
 * The home route ( / ) IS the intro experience.
 *
 * IntroExperience is a client component that:
 * - Plays once per browser session
 * - Fetches the live KPI and displays it at the peak moment
 * - Navigates automatically to /pulso after ~7.5 s (or on click / ESC)
 *
 * The root layout has no sidebar — this page renders full-bleed.
 */
export default function HomePage() {
  return <IntroExperience />;
}
