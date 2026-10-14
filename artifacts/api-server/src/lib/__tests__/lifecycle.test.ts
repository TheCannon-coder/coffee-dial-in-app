import { describe, it, expect, beforeAll, vi } from "vitest";

// lifecycle.ts imports the shared db module, which needs DATABASE_URL at import
// time; nothing under test here touches the database.
vi.mock("@workspace/db", () => ({ db: {}, lifecycleSendsTable: {} }));

beforeAll(() => {
  process.env["SESSION_SECRET"] = "test-secret-for-unsubscribe-tokens";
});

describe("unsubscribe tokens", () => {
  it("round-trips and rejects tampering", async () => {
    const { unsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl } = await import("../email-unsubscribe.js");
    const t = unsubscribeToken(42);
    expect(t).toHaveLength(32);
    expect(verifyUnsubscribeToken(42, t)).toBe(true);
    expect(verifyUnsubscribeToken(43, t)).toBe(false);
    expect(verifyUnsubscribeToken(42, t.slice(0, 31) + (t.endsWith("a") ? "b" : "a"))).toBe(false);
    expect(verifyUnsubscribeToken(42, "")).toBe(false);
    expect(unsubscribeUrl(42)).toBe(`https://www.coffeebrew.coach/email/unsubscribe?u=42&t=${t}`);
  });
});

describe("never-brewed nudge", () => {
  it("renders both variants with the required footer and no forbidden content", async () => {
    const { renderNeverBrewed, NEVER_BREWED_SUBJECT } = await import("../lifecycle.js");
    for (const variant of ["recent", "older"] as const) {
      const e = renderNeverBrewed(variant, { unsubscribeUrl: "https://x.test/u", postalAddress: "PO Box 1, Hamilton ON" });
      expect(e.subject).toBe(NEVER_BREWED_SUBJECT);
      for (const body of [e.text, e.html]) {
        expect(body).toContain("https://x.test/u");
        expect(body).toContain("PO Box 1, Hamilton ON");
        expect(body).toContain("coffeebrew.coach/open?to=brew");
        expect(body).toContain("— Chris");
        expect(body).not.toMatch(/cannon/i);
        expect(body).not.toMatch(/ends tonight|last chance|hurry|limited time/i);
        expect(body).not.toMatch(/guarantee|within \d+ (shots|brews)/i);
      }
      expect(e.html).toContain("<a href=\"https://x.test/u\"");
    }
    expect(renderNeverBrewed("older", { unsubscribeUrl: "u", postalAddress: "a" }).text).toContain("a while back");
    expect(renderNeverBrewed("recent", { unsubscribeUrl: "u", postalAddress: "a" }).text).toContain("a little while ago");
  });

  it("refuses to send without the master flag or a postal address", async () => {
    const { runLifecycleTick } = await import("../lifecycle.js");
    delete process.env["LIFECYCLE_EMAILS"];
    expect((await runLifecycleTick()).skipped).toMatch(/LIFECYCLE_EMAILS/);
    process.env["LIFECYCLE_EMAILS"] = "true";
    delete process.env["EMAIL_POSTAL_ADDRESS"];
    expect((await runLifecycleTick()).skipped).toMatch(/EMAIL_POSTAL_ADDRESS/);
    delete process.env["LIFECYCLE_EMAILS"];
  });
});
