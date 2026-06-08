import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import privacyRouter from "./routes/privacy";
import screenshotsRouter from "./routes/screenshots";
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(privacyRouter);
app.use(screenshotsRouter);
app.use("/api", screenshotsRouter);

// Feature flag — set REFERRAL_PROGRAM=true to enable the earnings calculator
// and affiliate commission routes. Not live until referral backend is built.
if (process.env.REFERRAL_PROGRAM === "true") {
  const { default: earnRouter } = await import("./routes/earn.js");
  app.use("/api", earnRouter);
  logger.info("Referral program routes enabled");
}

app.use("/api", router);

export default app;
