import { logger } from "./logger.js";

export const FROM_ADDRESS = "Coffee Brew Coach <hello@coffeebrew.coach>";
export const REPLY_TO = "support@coffeebrew.coach";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

/** Sends one email through Resend. Returns the Resend message id. */
export async function sendEmail(input: SendEmailInput): Promise<string> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: input.to,
      reply_to: input.replyTo ?? REPLY_TO,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
      ...(input.headers ? { headers: input.headers } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error({ status: response.status, body: body.slice(0, 300) }, "resend send failed");
    throw new Error(`resend responded ${response.status}`);
  }
  const data = (await response.json()) as { id?: string };
  return data.id ?? "";
}
