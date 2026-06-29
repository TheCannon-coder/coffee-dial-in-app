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

// Feature flag — set REFERRAL_PROGRAM=true to enable the earnings calculator
// and affiliate commission routes. Not live until referral backend is built.
if (process.env.REFERRAL_PROGRAM === "true") {
  const { default: earnRouter } = await import("./routes/earn.js");
  app.use("/api", earnRouter);
  logger.info("Referral program routes enabled");
}

app.use("/api", promoRouter);
app.use("/api", router);

export default app;
