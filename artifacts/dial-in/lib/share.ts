/**
 * Every share surface carries the referral code when one exists — a share
 * without the code is an unattributed install and an unpaid reward. The code
 * must live in the TEXT (not just the ?ref= link) because a new install
 * loses URL params on its trip through the App Store.
 */
export function referralShareSuffix(code: string | null | undefined): string {
  return code
    ? ` Sign up with my code ${code} and you get a month of Pro free: https://www.coffeebrew.coach?ref=${code}`
    : ' coffeebrew.coach';
}
