import { getUncachableRevenueCatClient } from "./revenueCatClient";
import { listOfferings, listPackages, getProductsFromPackage, detachProductsFromPackage } from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;

async function check() {
  const client = await getUncachableRevenueCatClient();

  const { data: offData } = await listOfferings({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  const defaultOffering = offData?.items.find((o: any) => o.lookup_key === "default");
  if (!defaultOffering) { console.error("No default offering"); return; }

  const { data: pkgsData } = await listPackages({
    client,
    path: { project_id: PROJECT_ID, offering_id: defaultOffering.id },
    query: { limit: 20 },
  });

  for (const pkg of (pkgsData?.items ?? [])) {
    console.log(`\n=== Package: ${pkg.display_name} (${pkg.id}) lookup=${pkg.lookup_key} ===`);

    const { data: prodData, error } = await getProductsFromPackage({
      client,
      path: { project_id: PROJECT_ID, package_id: pkg.id },
      query: { limit: 20 },
    });
    if (error) { console.log("  error:", JSON.stringify(error)); continue; }
    // Dump raw so we can see the actual shape
    console.log("RAW:", JSON.stringify(prodData, null, 2));
  }
}

check().catch(console.error);
