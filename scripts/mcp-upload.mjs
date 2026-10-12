import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function mcpUpload() {
  const files = new Map();
  async function visit(name) {
    if (files.has(name)) return;
    if (
      !/^(backend\/mcp|public|supabase\/functions\/faithful-mcp)\//.test(
        name,
      ) ||
      name.includes("..") ||
      !/\.(js|ts|json|lock)$/.test(name)
    )
      throw new Error("Unexpected connector source path.");
    const body = await readFile(path.join(root, name), "utf8");
    files.set(name, body);
    if (/\.(js|ts)$/.test(name))
      for (const match of body.matchAll(
        /(?:from\s+|import\s*)['"]([^'"]+)['"]/g,
      ))
        if (match[1].startsWith("."))
          await visit(
            path.posix.normalize(
              path.posix.join(path.posix.dirname(name), match[1]),
            ),
          );
  }
  await visit("supabase/functions/faithful-mcp/index.ts");
  await visit("supabase/functions/faithful-mcp/deno.json");
  await visit("supabase/functions/faithful-mcp/deno.lock");
  const metadata = {
    name: "faithful-mcp",
    verify_jwt: false,
    entrypoint_path: "supabase/functions/faithful-mcp/index.ts",
    import_map_path: "supabase/functions/faithful-mcp/deno.json",
  };
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  for (const [name, body] of files)
    form.append(
      "file",
      new File([body], name, { type: "application/octet-stream" }),
    );
  return { form, files: [...files.keys()], metadata };
}
