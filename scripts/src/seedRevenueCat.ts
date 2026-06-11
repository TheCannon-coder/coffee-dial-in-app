import { getUncachableRevenueCatClient } from "./revenueCatClient.js";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "Dial In — Coffee Coach";

const MONTHLY_PRODUCT_IDENTIFIER = "dial_in_pro_monthly";
const YEARLY_PRODUCT_IDENTIFIER = "dial_in_pro_yearly";
const PLAY_STORE_MONTHLY_IDENTIFIER = "dial_in_pro_monthly:monthly";
const PLAY_STORE_YEARLY_IDENTIFIER = "dial_in_pro_yearly:yearly";

const APP_STORE_APP_NAME = "Dial In iOS";
const APP_STORE_BUNDLE_ID = "com.dialin.coffeecoach";
const PLAY_STORE_APP_NAME = "Dial In Android";
const PLAY_STORE_PACKAGE_NAME = "com.dialin.coffeecoach";

const ENTITLEMENT_IDENTIFIER = "pro";
const ENTITLEMENT_DISPLAY_NAME = "Pro Access";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ────────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ───────────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let testStoreApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testStoreApp) throw new Error("No test store app found");
  console.log("Test store app:", testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app found:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app found:", playStoreApp.id);
  }

  // ── Products ───────────────────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeId: string,
    displayName: string,
    duration: string,
    isTestStore: boolean,
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === storeId && p.app_id === targetApp.id,
    );
    if (existing) {
      console.log(`${label} product already exists:`, existing.id);
      return existing;
    }
    const body: CreateProductData["body"] = {
      store_identifier: storeId,
      app_id: targetApp.id,
      type: "subscription",
      display_name: displayName,
    };
    if (isTestStore) {
      body.subscription = { duration };
      body.title = displayName;
    }
    const { data: created, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error(`Failed to create ${label} product`);
    console.log(`Created ${label} product:`, created.id);
    return created;
  };

  const testMonthly = await ensureProduct(testStoreApp, "Test/Monthly", MONTHLY_PRODUCT_IDENTIFIER, "Pro Monthly", "P1M", true);
  const testYearly  = await ensureProduct(testStoreApp, "Test/Yearly",  YEARLY_PRODUCT_IDENTIFIER,  "Pro Yearly",  "P1Y", true);
  const iosMonthly  = await ensureProduct(appStoreApp,  "iOS/Monthly",  MONTHLY_PRODUCT_IDENTIFIER, "Pro Monthly", "P1M", false);
  const iosYearly   = await ensureProduct(appStoreApp,  "iOS/Yearly",   YEARLY_PRODUCT_IDENTIFIER,  "Pro Yearly",  "P1Y", false);
  const droidMonthly = await ensureProduct(playStoreApp, "Android/Monthly", PLAY_STORE_MONTHLY_IDENTIFIER, "Pro Monthly", "P1M", false);
  const droidYearly  = await ensureProduct(playStoreApp, "Android/Yearly",  PLAY_STORE_YEARLY_IDENTIFIER,  "Pro Yearly",  "P1Y", false);

  // ── Test store prices ──────────────────────────────────────────────────────
  for (const [prod, prices] of [
    [testMonthly, [{ amount_micros: 4990000, currency: "USD" }, { amount_micros: 4490000, currency: "EUR" }]],
    [testYearly,  [{ amount_micros: 44990000, currency: "USD" }, { amount_micros: 39990000, currency: "EUR" }]],
  ] as [Product, { amount_micros: number; currency: string }[]][]) {
    const { error } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: prod.id },
      body: { prices },
    });
    if (error) {
      const e = error as { type?: string };
      if (e.type === "resource_already_exists") {
        console.log(`Test store prices already exist for ${prod.id}`);
      } else {
        throw new Error(`Failed to set test store prices for ${prod.id}`);
      }
    } else {
      console.log(`Set test store prices for ${prod.id}`);
    }
  }

  // ── Entitlement ────────────────────────────────────────────────────────────
  let entitlement: Entitlement;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEnt, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", newEnt.id);
    entitlement = newEnt;
  }

  const { error: attachEntErr } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: [testMonthly.id, testYearly.id, iosMonthly.id, iosYearly.id, droidMonthly.id, droidYearly.id] },
  });
  if (attachEntErr) {
    const e = attachEntErr as { type?: string };
    if (e.type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached all products to entitlement");
  }

  // ── Offering ───────────────────────────────────────────────────────────────
  let offering: Offering;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", newOff.id);
    offering = newOff;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  // ── Packages ───────────────────────────────────────────────────────────────
  const { data: existingPackages, error: listPkgError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPkgError) throw new Error("Failed to list packages");

  const ensurePackage = async (lookupKey: string, displayName: string): Promise<Package> => {
    const existing = existingPackages.items?.find((p) => p.lookup_key === lookupKey);
    if (existing) {
      console.log(`Package ${lookupKey} already exists:`, existing.id);
      return existing;
    }
    const { data: pkg, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { lookup_key: lookupKey, display_name: displayName },
    });
    if (error) throw new Error(`Failed to create package ${lookupKey}`);
    console.log(`Created package ${lookupKey}:`, pkg.id);
    return pkg;
  };

  const monthlyPkg = await ensurePackage("$rc_monthly", "Monthly");
  const yearlyPkg  = await ensurePackage("$rc_annual",  "Yearly");

  const attachPkg = async (pkg: Package, products: Product[]) => {
    const { error } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: { products: products.map((p) => ({ product_id: p.id, eligibility_criteria: "all" as const })) },
    });
    if (error) {
      const e = error as { type?: string; message?: string };
      if (e.type === "unprocessable_entity_error" && e.message?.includes("Cannot attach product")) {
        console.log(`Package ${pkg.id} already has products attached`);
      } else {
        throw new Error(`Failed to attach products to package ${pkg.id}`);
      }
    } else {
      console.log(`Attached products to package ${pkg.id}`);
    }
  };

  await attachPkg(monthlyPkg, [testMonthly, iosMonthly, droidMonthly]);
  await attachPkg(yearlyPkg,  [testYearly,  iosYearly,  droidYearly]);

  // ── API Keys ───────────────────────────────────────────────────────────────
  const getKey = async (appId: string) => {
    const { data, error } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appId } });
    if (error) throw new Error(`Failed to get API keys for app ${appId}`);
    return data?.items.map((k) => k.key).join(", ") ?? "N/A";
  };

  const testKey    = await getKey(testStoreApp.id);
  const iosKey     = await getKey(appStoreApp.id);
  const androidKey = await getKey(playStoreApp.id);

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:              ", project.id);
  console.log("Test Store App ID:       ", testStoreApp.id);
  console.log("App Store App ID:        ", appStoreApp.id);
  console.log("Play Store App ID:       ", playStoreApp.id);
  console.log("Entitlement:             ", ENTITLEMENT_IDENTIFIER);
  console.log("Public API Key (Test):   ", testKey);
  console.log("Public API Key (iOS):    ", iosKey);
  console.log("Public API Key (Android):", androidKey);
  console.log("====================");
  console.log("\nStore these in Replit Secrets:");
  console.log("  REVENUECAT_PROJECT_ID                  =", project.id);
  console.log("  REVENUECAT_TEST_STORE_APP_ID            =", testStoreApp.id);
  console.log("  REVENUECAT_APPLE_APP_STORE_APP_ID       =", appStoreApp.id);
  console.log("  REVENUECAT_GOOGLE_PLAY_STORE_APP_ID     =", playStoreApp.id);
  console.log("  EXPO_PUBLIC_REVENUECAT_TEST_API_KEY     =", testKey);
  console.log("  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY      =", iosKey);
  console.log("  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY  =", androidKey);
}

seedRevenueCat().catch(console.error);
