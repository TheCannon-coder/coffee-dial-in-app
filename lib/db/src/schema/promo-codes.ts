import { pgTable, serial, text, boolean, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  rewardMonths: integer("reward_months").notNull().default(1),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promoCodeRedemptionsTable = pgTable(
  "promo_code_redemptions",
  {
    id: serial("id").primaryKey(),
    promoCodeId: integer("promo_code_id")
      .notNull()
      .references(() => promoCodesTable.id),
    revenuecatCustomerId: text("revenuecat_customer_id").notNull(),
    redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.promoCodeId, t.revenuecatCustomerId)],
);

export type PromoCode = typeof promoCodesTable.$inferSelect;
export type PromoCodeRedemption = typeof promoCodeRedemptionsTable.$inferSelect;
