import * as StoreReview from 'expo-store-review';
import { getItem, setItem, KEYS } from './storage';

/** Don't re-ask within this window — iOS also enforces its own 3-per-year cap. */
const MIN_DAYS_BETWEEN_ASKS = 90;

/**
 * Ask for an App Store rating via the native in-app prompt, but only at a
 * happy moment and at most once per {@link MIN_DAYS_BETWEEN_ASKS} days.
 * Callers fire-and-forget this; it must never disrupt the flow around it.
 */
export async function maybeAskForReview(): Promise<void> {
  try {
    const lastAsked = await getItem<number>(KEYS.REVIEW_LAST_ASKED);
    if (lastAsked && Date.now() - lastAsked < MIN_DAYS_BETWEEN_ASKS * 24 * 60 * 60 * 1000) {
      return;
    }
    if (!(await StoreReview.hasAction())) return;
    await setItem(KEYS.REVIEW_LAST_ASKED, Date.now());
    await StoreReview.requestReview();
  } catch {
    // A rating prompt is never worth an error surface.
  }
}
