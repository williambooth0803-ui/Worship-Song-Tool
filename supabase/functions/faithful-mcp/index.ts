import { createMcpHandler } from "../../../backend/mcp/handler.js";

const projectUrl = Deno.env.get("SUPABASE_URL") || "";
const handler = createMcpHandler({
  supabaseUrl: projectUrl,
  publishableKey:
    Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    "",
  resourceUrl: projectUrl + "/functions/v1/faithful-mcp",
  siteUrl: "https://williambooth0803-ui.github.io/Worship-Song-Tool/",
});
Deno.serve(handler);
