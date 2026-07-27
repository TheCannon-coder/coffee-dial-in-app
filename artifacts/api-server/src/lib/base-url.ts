/**
 * Public https origin used in redirect URLs (Stripe checkout, billing portal,
 * Connect onboarding). Set PUBLIC_BASE_URL (e.g. https://www.coffeebrew.coach)
 * on the deployment; REPLIT_DOMAINS is honored as a fallback so the code still
 * runs on Replit until the hosting cutover completes.
 */
export function publicBaseUrl(): string {
  const configured = process.env["PUBLIC_BASE_URL"];
  if (configured) return configured.replace(/\/+$/, "");
  const domains = process.env["REPLIT_DOMAINS"]?.split(",") ?? [];
  const prod = domains.find((d) => !d.includes("dev")) ?? domains[0];
  return prod ? `https://${prod}` : "http://localhost:3000";
}
