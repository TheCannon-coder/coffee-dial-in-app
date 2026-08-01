import app from "./app";
import { logger } from "./lib/logger";
import { seedGearProducts } from "./lib/gear-seed";
import { prefetchAppRating } from "./lib/app-rating";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Ensure baseline gear catalogue is seeded so affiliate redirect URLs never 404
  seedGearProducts().catch((seedErr) => {
    logger.error({ err: seedErr }, "gear seed failed on startup");
  });

  // Warm the App Store rating cache so early page views carry aggregateRating
  prefetchAppRating();
});
