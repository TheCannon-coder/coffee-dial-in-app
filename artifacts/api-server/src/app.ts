import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import landingRouter from "./routes/landing";
import privacyRouter from "./routes/privacy";
import supportRouter from "./routes/support";
import termsRouter from "./routes/terms";
import screenshotsRouter from "./routes/screenshots";
import webhookRouter from "./routes/webhook";
import sitemapRouter from "./routes/sitemap";
import contentPagesRouter from "./routes/content-pages";
import waitlistRouter from "./routes/waitlist";
import promoRouter from "./routes/promo";
import affiliatePortalRouter from "./routes/affiliate-portal";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

// Canonical host: 301 apex → www so search engines see one host. Only browser-y
// GET/HEAD traffic — /api and /.well-known must answer on any host so the mobile
// app and universal links can never be caught by a redirect.
app.use((req, res, next) => {
  const host = req.headers.host?.toLowerCase();
  if (
    host === "coffeebrew.coach" &&
    (req.method === "GET" || req.method === "HEAD") &&
    !req.path.startsWith("/api") &&
    !req.path.startsWith("/.well-known")
  ) {
    res.redirect(301, `https://www.coffeebrew.coach${req.originalUrl}`);
    return;
  }
  next();
});

// Stripe webhook must be mounted BEFORE express.json() — it reads the raw body
// itself for signature verification. All other routes get the parsed JSON body.
app.use("/api", webhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(landingRouter);
app.use(sitemapRouter);
app.use(contentPagesRouter);
app.use("/api", waitlistRouter);
app.use(privacyRouter);
app.use(supportRouter);
app.use(termsRouter);
app.use(screenshotsRouter);
app.use("/api", screenshotsRouter);

// Feature flag — set REFERRAL_PROGRAM=true to enable the referral + affiliate routes.
if (process.env.REFERRAL_PROGRAM === "true") {
  const { default: earnRouter } = await import("./routes/earn.js");
  const { default: referralRouter } = await import("./routes/referral.js");
  app.use("/api", earnRouter);
  app.use("/api", referralRouter);
  logger.info("Referral program routes enabled");
}

app.use(affiliatePortalRouter);

// Apple App Site Association — required for Universal Links (referral deep-links).
// Replace APPLE_TEAM_ID env var with your 10-character Apple Team ID from
// developer.apple.com → Membership. Until set, universal links won't activate;
// the custom-scheme fallback (dial-in://) still works without it.
app.get("/.well-known/apple-app-site-association", (_req, res) => {
  const teamId = process.env.APPLE_TEAM_ID ?? "XXXXXXXXXX";
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json({
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.com.dialin.coffeecoach`],
          components: [
            { "/": "/", "?": { ref: "?*" }, comment: "Referral links — pass ?ref=CODE into the app" },
          ],
        },
      ],
    },
  });
});

app.use("/api", promoRouter);
app.use("/api", router);

export default app;
