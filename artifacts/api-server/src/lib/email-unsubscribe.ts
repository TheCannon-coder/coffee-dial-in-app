import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = "https://www.coffeebrew.coach";

function secret(): string {
  const s = process.env["SESSION_SECRET"];
  if (!s) throw new Error("SESSION_SECRET is not configured — cannot sign unsubscribe links");
  return s;
}

/** Stable per-user token: the link in an old email keeps working. */
export function unsubscribeToken(userId: number): string {
  return createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("base64url").slice(0, 32);
}

export function verifyUnsubscribeToken(userId: number, token: string): boolean {
  if (!Number.isInteger(userId) || userId <= 0 || typeof token !== "string" || token.length !== 32) return false;
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(userId: number): string {
  return `${BASE}/email/unsubscribe?u=${userId}&t=${unsubscribeToken(userId)}`;
}

/** Separate purpose string so a feedback link can never act as an unsubscribe link (or vice versa). */
export function feedbackToken(userId: number): string {
  return createHmac("sha256", secret()).update(`feedback:${userId}`).digest("base64url").slice(0, 32);
}

export function verifyFeedbackToken(userId: number, token: string): boolean {
  if (!Number.isInteger(userId) || userId <= 0 || typeof token !== "string" || token.length !== 32) return false;
  const expected = Buffer.from(feedbackToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function feedbackUrl(userId: number, template: string, reason: string): string {
  return `${BASE}/feedback?u=${userId}&t=${feedbackToken(userId)}&s=${encodeURIComponent(template)}&r=${encodeURIComponent(reason)}`;
}
