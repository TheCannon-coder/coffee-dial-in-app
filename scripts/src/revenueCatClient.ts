import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient, createConfig } from "@replit/revenuecat-sdk/client";

export async function getUncachableRevenueCatClient() {
  const connectors = new ReplitConnectors();

  const client = createClient(
    createConfig({
      baseUrl: "https://api.revenuecat.com/v2",
      fetch: async (request: Request) => {
        const url = new URL(request.url);
        const path = url.pathname + url.search;
        const body = request.method !== "GET" && request.method !== "HEAD"
          ? await request.text()
          : undefined;
        const headers: Record<string, string> = {};
        request.headers.forEach((v, k) => { headers[k] = v; });

        const response = await connectors.proxy("revenuecat", path, {
          method: request.method,
          headers,
          body,
        });
        return response as unknown as Response;
      },
    }),
  );

  return client;
}
