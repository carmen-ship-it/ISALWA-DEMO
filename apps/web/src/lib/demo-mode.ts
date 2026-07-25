/**
 * Demo mode helpers — re-export from preferences for a clear Mission 14 surface.
 *
 * Enable with:
 * - `?demo=1` in the URL
 * - `localStorage.setItem('isalwa_demo_mode','1')`
 * - `NEXT_PUBLIC_DEMO_MODE=1`
 *
 * When off, returning users are never trapped by intro/tour.
 */
export {
  isDemoMode,
  setDemoMode,
  isIntroDone,
  markIntroDone,
  isTourDone,
  markTourDone,
  clearTourDone,
} from '@/lib/preferences';
