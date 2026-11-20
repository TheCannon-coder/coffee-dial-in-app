import { describe, expect, it, vi } from "vitest";

// Rendering is pure; stub the DB module so importing lifecycle doesn't need a connection.
vi.mock("@workspace/db", () => ({ db: {}, lifecycleSendsTable: {} }));

import { FEEDBACK_REASONS, renderBrewedOnce } from "../../lib/lifecycle";

const DAY = 24 * 60 * 60 * 1000;
const opts = {
  unsubscribeUrl: "https://example.test/unsub",
  postalAddress: "1 Test St",
  feedbackUrl: (reason: string) => `https://example.test/feedback?r=${reason}`,
};

describe("renderBrewedOnce", () => {
  it("names the coffee and the pending tweak", () => {
    const { text, html } = renderBrewedOnce(
      { coffeeName: "La Colmena", method: "V60", adjustment: "grind_finer", brewedAt: new Date(Date.now() - 10 * DAY) },
      opts,
    );
    expect(text).toContain("La Colmena");
    expect(text).toContain("grind a touch finer");
    expect(html).toContain("grind a touch finer");
  });

  it("only mentions an old bag after 30 days", () => {
    const fresh = renderBrewedOnce({ coffeeName: "X", method: "V60", adjustment: "grind_finer", brewedAt: new Date(Date.now() - 10 * DAY) }, opts);
    const old = renderBrewedOnce({ coffeeName: "X", method: "V60", adjustment: "grind_finer", brewedAt: new Date(Date.now() - 45 * DAY) }, opts);
    expect(fresh.text).not.toContain("long gone");
    expect(old.text).toContain("long gone");
  });

  it("celebrates a dialed-in cup instead of inventing a tweak", () => {
    const { text } = renderBrewedOnce({ coffeeName: "X", method: "V60", adjustment: "none", brewedAt: new Date() }, opts);
    expect(text).toContain("keep everything the same");
    expect(text).not.toContain("one thing to try");
  });

  it("falls back to the method when the coffee is unnamed or named after the method", () => {
    const { text } = renderBrewedOnce({ coffeeName: "V60", method: "V60", adjustment: "grind_finer", brewedAt: new Date() }, opts);
    expect(text).toContain("a V60 brew");
  });

  it("links every feedback reason and the unsubscribe", () => {
    const { text, html } = renderBrewedOnce({ coffeeName: "X", method: "V60", adjustment: "more_coffee", brewedAt: new Date() }, opts);
    for (const r of FEEDBACK_REASONS) {
      expect(html).toContain(`feedback?r=${r.key}`);
      expect(text).toContain(r.label);
    }
    expect(html).toContain(opts.unsubscribeUrl);
    expect(text).not.toContain("undefined");
  });

  it("escapes coffee names in HTML", () => {
    const { html } = renderBrewedOnce({ coffeeName: "<b>Evil</b>", method: "V60", adjustment: "grind_finer", brewedAt: new Date() }, opts);
    expect(html).not.toContain("<b>Evil</b>");
  });
});
