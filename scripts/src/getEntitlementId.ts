import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import { listEntitlements } from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env["REVENUECAT_PROJECT_ID"]!;

async function main() {
  const client = await getUncachableRevenueCatClient();
  const { data, error } = await listEntitlements({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  if (error) {
    console.error("error:", JSON.stringify(error));
    process.exit(1);
  }
  for (const e of data?.items ?? []) {
    console.log(`id=${e.id}  lookup_key=${e.lookup_key}  name=${e.display_name}`);
  }
}

main().catch(console.error);
