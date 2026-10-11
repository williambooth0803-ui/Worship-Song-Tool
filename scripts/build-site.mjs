import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateAccountConfig } from "../public/accounts.js";

const project = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(project, "public");
const destination = path.join(project, "docs");
await mkdir(destination, { recursive: true });
for (const file of await readdir(source, { withFileTypes: true })) {
  if (!file.isFile() || !/\.(js|css|html|svg|png|ico)$/.test(file.name))
    continue;
  if (file.name === "index.html") {
    const html = (await readFile(path.join(source, file.name), "utf8")).replace(
      '<html lang="en">',
      '<html lang="en" data-edition="static">',
    );
    await writeFile(path.join(destination, file.name), html);
  } else
    await copyFile(
      path.join(source, file.name),
      path.join(destination, file.name),
    );
}
await writeFile(path.join(destination, ".nojekyll"), "");
// These are browser-safe project identifiers, not privileged credentials.
if (process.env.SUPABASE_URL || process.env.SUPABASE_PUBLISHABLE_KEY) {
  const config = {
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
  };
  if (!validateAccountConfig(config))
    throw new Error("Supply both public Supabase project settings.");
  await writeFile(
    path.join(destination, "config.js"),
    `export const siteConfig = ${JSON.stringify(config)};\n`,
  );
}
console.log(
  "Static website prepared in docs/. No credentials or personal browser data are included.",
);
