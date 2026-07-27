import OpenAI from "openai";

// Direct OpenAI API access via OPENAI_API_KEY. The Replit-managed proxy vars
// (AI_INTEGRATIONS_OPENAI_*) are honored as a fallback so the code still runs
// on Replit until the hosting cutover completes.
const directKey = process.env.OPENAI_API_KEY;
const proxyKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const proxyBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

if (!directKey && !(proxyKey && proxyBaseUrl)) {
  throw new Error(
    "OPENAI_API_KEY must be set (or AI_INTEGRATIONS_OPENAI_API_KEY + AI_INTEGRATIONS_OPENAI_BASE_URL when running on Replit).",
  );
}

export const openai = directKey
  ? new OpenAI({ apiKey: directKey })
  : new OpenAI({ apiKey: proxyKey, baseURL: proxyBaseUrl });
