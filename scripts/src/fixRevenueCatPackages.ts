import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listOfferings,
  listPackages,
  attachProductsToPackage,
  attachProductsToEntitlement,
  listEntitlements,
  getProductsFromEntitlement,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;
const APPLE_APP_ID = process.env.REVENUECAT_APPLE_APP_STORE_APP_ID!;

// From checkRevenueCat.ts output — Apple App Store products
const MONTHLY_PRODUCT_ID = "prod04d27fa165"; // dial_in_pro_monthly
const YEARLY_PRODUCT_ID  = "prod6d9098ece9"; // dial_in_pro_yearly

async function fix() {
  const client = await getUncachableRevenueCatClient();

  // 1. Find the default offering
  const { data: offData, error: offError } = await listOfferings({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  if (offError || !offData) { console.error("listOfferings failed:", offError); return; }

  const defaultOffering = offData.items.find((o: any) => o.lookup_key === "default");
  if (!defaultOffering) { console.error("No default offering found"); return; }
  console.log(`Found offering: "${defaultOffering.display_name}" (${defaultOffering.id})`);

  // 2. List packages in the offering
  const { data: pkgsData, error: pkgsError } = await listPackages({
    client,
    path: { project_id: PROJECT_ID, offering_id: defaultOffering.id },
    query: { limit: 20 },
  });
  if (pkgsError || !pkgsData) { console.error("listPackages failed:", pkgsError); return; }

  const monthlyPkg = pkgsData.items.find((p: any) => p.lookup_key === "$rc_monthly");
  const yearlyPkg  = pkgsData.items.find((p: any) => p.lookup_key === "$rc_annual");

  if (!monthlyPkg) { console.error("$rc_monthly package not found"); return; }
  if (!yearlyPkg)  { console.error("$rc_annual package not found");  return; }

  console.log(`Found $rc_monthly package: ${monthlyPkg.id}`);
  console.log(`Found $rc_annual package:  ${yearlyPkg.id}`);

  // 3. Attach Apple monthly product to $rc_monthly
  console.log("\nAttaching Pro Monthly → $rc_monthly...");
  const { error: attachMonthlyError } = await attachProductsToPackage({
    client,
    path: {
      project_id: PROJECT_ID,
      package_id: monthlyPkg.id,
    },
    body: {
      products: [{ product_id: MONTHLY_PRODUCT_ID, eligibility_criteria: "all" }],
    },
  });
  if (attachMonthlyError) {
    console.error("  ❌ Failed:", attachMonthlyError);
  } else {
    console.log("  ✅ Done");
  }

  // 4. Attach Apple yearly product to $rc_annual
  console.log("Attaching Pro Yearly → $rc_annual...");
  const { error: attachYearlyError } = await attachProductsToPackage({
    client,
    path: {
      project_id: PROJECT_ID,
      package_id: yearlyPkg.id,
    },
    body: {
      products: [{ product_id: YEARLY_PRODUCT_ID, eligibility_criteria: "all" }],
    },
  });
  if (attachYearlyError) {
    console.error("  ❌ Failed:", attachYearlyError);
  } else {
    console.log("  ✅ Done");
  }

  // 5. Make sure both products are also attached to the "pro" entitlement
  console.log("\nChecking entitlement...");
  const { data: entData } = await listEntitlements({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  const proEntitlement = entData?.items.find((e: any) => e.lookup_key === "pro");
  if (!proEntitlement) { console.error("  ❌ 'pro' entitlement not found"); return; }

  const { data: entProducts } = await getProductsFromEntitlement({
    client,
    path: { project_id: PROJECT_ID, entitlement_id: proEntitlement.id },
    query: { limit: 50 },
  });
  const attachedIds = new Set((entProducts?.items ?? []).map((p: any) => p.id));
  const missing = [MONTHLY_PRODUCT_ID, YEARLY_PRODUCT_ID].filter(id => !attachedIds.has(id));

  if (missing.length === 0) {
    console.log("  ✅ Both Apple products already attached to 'pro' entitlement");
  } else {
    console.log(`  Attaching ${missing.length} missing product(s) to entitlement...`);
    const { error: entError } = await attachProductsToEntitlement({
      client,
      path: { project_id: PROJECT_ID, entitlement_id: proEntitlement.id },
      body: { product_ids: missing },
    });
    if (entError) {
      console.error("  ❌ Entitlement attach failed:", entError);
    } else {
      console.log("  ✅ Done");
    }
  }

  console.log("\nAll done. Run checkRevenueCat.ts to verify.");
}

fix().catch(console.error);
