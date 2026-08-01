import { describe, it, expect } from "vitest";
import { buildPage, injectAppRating, APP_RATING_SLOT } from "../page-template.js";

const basePage = () =>
  buildPage({
    title: "Test Page | Coffee Brew Coach",
    description: "Test description",
    canonical: "https://www.coffeebrew.coach/test",
    bodyHtml: `<main>hello${APP_RATING_SLOT}</main>`,
  });

describe("injectAppRating", () => {
  it("adds aggregateRating to the app schema and renders the badge", () => {
    const out = injectAppRating(basePage(), { rating: 5, count: 14 });
    expect(out).toContain('"aggregateRating"');
    expect(out).toContain('"ratingValue":"5.0"');
    expect(out).toContain('"ratingCount":14');
    expect(out).toContain("5.0 on the App Store · 14 ratings");
    expect(out).not.toContain(APP_RATING_SLOT);
  });

  it("rounds partial ratings and fills stars accordingly", () => {
    const out = injectAppRating(basePage(), { rating: 4.6, count: 51 });
    expect(out).toContain('"ratingValue":"4.6"');
    expect(out).toContain("★★★★★"); // 4.6 rounds to 5 filled stars
    expect(out).toContain("4.6 on the App Store · 51 ratings");
  });

  it("strips the badge slot and leaves schema untouched when rating is null", () => {
    const out = injectAppRating(basePage(), null);
    expect(out).not.toContain("aggregateRating");
    expect(out).not.toContain(APP_RATING_SLOT);
  });

  it("strips the badge slot when the app has no ratings yet", () => {
    const out = injectAppRating(basePage(), { rating: 0, count: 0 });
    expect(out).not.toContain("aggregateRating");
    expect(out).not.toContain(APP_RATING_SLOT);
  });

  it("leaves pages without a slot valid (schema still augmented)", () => {
    const page = buildPage({
      title: "No Slot",
      description: "d",
      canonical: "https://www.coffeebrew.coach/x",
      bodyHtml: "<main>no slot</main>",
    });
    const out = injectAppRating(page, { rating: 5, count: 14 });
    expect(out).toContain('"aggregateRating"');
    expect(out).not.toContain("hero-rating");
  });
});
