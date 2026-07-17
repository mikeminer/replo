import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const roots = [join(repo, "packages/enrichment/src")];
const encodedForbidden = ["hunter"+".io", "lead"+"magic", "findy"+"mail", "apollo"+".io", "clear"+"bit", "lusha"+".com", "rocket"+"reach"];
for (const root of roots) for (const file of await readdir(root)) if (file.endsWith(".ts") && !file.endsWith(".test.ts")) {
  const text = (await readFile(join(root, file), "utf8")).toLowerCase();
  for (const host of encodedForbidden) if (text.includes(host)) throw new Error(`Forbidden finder reference in ${file}`);
}
console.log("No third-party email finders found.");
