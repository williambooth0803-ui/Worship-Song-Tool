import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
console.log(
  "Static website prepared in docs/. No credentials or personal browser data are included.",
);
