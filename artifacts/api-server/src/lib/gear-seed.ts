/**
 * Gear product seed — runs on every server start.
 * Uses ON CONFLICT DO NOTHING so it's safe to run repeatedly.
 * Ensures legacy affiliate redirect URLs never 404 on a fresh deploy.
 */
import { db, gearProductsTable } from "@workspace/db";
import { logger } from "./logger";

const SEED_PRODUCTS: Array<typeof gearProductsTable.$inferInsert> = [
  // ── General / pour-over ──────────────────────────────────────────────
  {
    slug: "timemore-black-mirror",
    name: "Timemore Black Mirror Scale",
    amazonUrl: "https://www.amazon.com/dp/B079K4LS2X",
    priceLabel: "~$75",
    brewMethods: ["general", "pour_over", "v60", "chemex", "kalita", "french_press", "aeropress"],
    experienceLevel: "beginner",
    descriptionHint:
      "Precise 0.1g kitchen scale with built-in timer, designed for pour-over and general brewing. Essential first piece of equipment for anyone not yet weighing their dose.",
    active: true,
  },
  {
    slug: "acaia-pearl",
    name: "Acaia Pearl Scale",
    amazonUrl: "https://www.amazon.com/dp/B00U7ESGIA",
    priceLabel: "~$150",
    brewMethods: ["general", "pour_over", "v60", "chemex", "kalita"],
    experienceLevel: "intermediate",
    descriptionHint:
      "Premium bluetooth scale with flow rate display and companion app. Good upgrade once user is consistently weighing dose and tracking yield.",
    active: true,
  },
  {
    slug: "fellow-stagg-ekg",
    name: "Fellow Stagg EKG Electric Kettle",
    amazonUrl: "https://www.amazon.com/dp/B07GGRJ3VQ",
    priceLabel: "~$165",
    brewMethods: ["general", "pour_over", "v60", "chemex", "kalita", "aeropress"],
    experienceLevel: "beginner",
    descriptionHint:
      "Variable temperature gooseneck kettle with 1-degree precision. Essential for anyone not logging water temperature — temperature control is the biggest extraction variable after grind.",
    active: true,
  },
  {
    slug: "bonavita-variable",
    name: "Bonavita 1L Variable Temperature Kettle",
    amazonUrl: "https://www.amazon.com/dp/B005YR0F40",
    priceLabel: "~$55",
    brewMethods: ["general", "pour_over", "v60", "chemex"],
    experienceLevel: "beginner",
    descriptionHint:
      "Affordable variable temperature gooseneck kettle. Great first temperature-controlled kettle for users on a budget who are not currently logging water temperature.",
    active: true,
  },
  {
    slug: "timemore-c3-pro",
    name: "Timemore C3 Pro Hand Grinder",
    amazonUrl: "https://www.amazon.com/dp/B08NGZZJWB",
    priceLabel: "~$89",
    brewMethods: ["general", "pour_over", "v60", "chemex", "kalita", "aeropress", "french_press"],
    experienceLevel: "beginner",
    descriptionHint:
      "Consistent burr hand grinder with numbered settings for repeatability. Best value grinder for users who do not currently log a grinder setting.",
    active: true,
  },
  {
    slug: "fellow-ode-gen2",
    name: "Fellow Ode Brew Grinder Gen 2",
    amazonUrl: "https://www.amazon.com/dp/B0BBLZ5ZBP",
    priceLabel: "~$365",
    brewMethods: ["pour_over", "v60", "chemex", "kalita", "french_press", "aeropress"],
    experienceLevel: "intermediate",
    descriptionHint:
      "High-end flat burr electric grinder optimised for non-espresso brewing. Suits intermediate users consistently tracking grind setting who want more control.",
    active: true,
  },
  {
    slug: "hario-v60",
    name: "Hario V60 Plastic Dripper",
    amazonUrl: "https://www.amazon.com/dp/B002IR1O3A",
    priceLabel: "~$9",
    brewMethods: ["pour_over", "v60"],
    experienceLevel: "beginner",
    descriptionHint:
      "Classic pour-over dripper. Suggest to users reporting flat or bitter pour-overs who have not yet tried a V60.",
    active: true,
  },
  // ── Espresso-specific ────────────────────────────────────────────────
  {
    slug: "acaia-lunar",
    name: "Acaia Lunar Espresso Scale",
    amazonUrl: "https://www.amazon.com/dp/B07BMPKJVN",
    priceLabel: "~$200",
    brewMethods: ["espresso"],
    experienceLevel: "beginner",
    descriptionHint:
      "Low-profile espresso scale accurate to 0.1g, waterproof, fits under low-clearance portafilters. Essential for espresso users not logging dose in grams.",
    active: true,
  },
  {
    slug: "normcore-tamper",
    name: "Normcore 58.5mm Spring Tamper V4",
    amazonUrl: "https://www.amazon.com/dp/B08MXX4ZSF",
    priceLabel: "~$59",
    brewMethods: ["espresso"],
    experienceLevel: "intermediate",
    descriptionHint:
      "Calibrated spring tamper that applies consistent 15lb pressure every tamp. Helps intermediate espresso users eliminate tamping as a variable when troubleshooting extraction.",
    active: true,
  },
  {
    slug: "baratza-sette",
    name: "Baratza Sette 270 Espresso Grinder",
    amazonUrl: "https://www.amazon.com/dp/B06X3WRSQF",
    priceLabel: "~$380",
    brewMethods: ["espresso"],
    experienceLevel: "beginner",
    descriptionHint:
      "Dedicated espresso grinder with 270 micro-adjustment steps. Essential for espresso users not logging grinder setting — without a numbered setting, grind advice is impossible to act on precisely.",
    active: true,
  },
  {
    slug: "puck-screen",
    name: "IMS Competition Shower Screen",
    amazonUrl: "https://www.amazon.com/dp/B09GWTLTMH",
    priceLabel: "~$45",
    brewMethods: ["espresso"],
    experienceLevel: "intermediate",
    descriptionHint:
      "Precision shower screen that improves water distribution and reduces puck adhesion. Good next step for intermediate espresso users with consistent dose and grind who are still getting uneven extraction.",
    active: true,
  },
];

export async function seedGearProducts(): Promise<void> {
  try {
    await db
      .insert(gearProductsTable)
      .values(SEED_PRODUCTS)
      .onConflictDoNothing({ target: gearProductsTable.slug });
    logger.info({ count: SEED_PRODUCTS.length }, "gear catalogue seed: ensured all baseline products");
  } catch (err) {
    logger.error({ err }, "gear catalogue seed: failed — affiliate redirect links may be incomplete");
  }
}
