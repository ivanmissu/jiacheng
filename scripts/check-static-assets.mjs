import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const publicRoot = path.join(projectRoot, "public");
const staticAssetExtension = "(?:avif|bmp|css|gif|ico|jpe?g|png|svg|webp|woff2?|ttf|otf)";
const publicAsset = new RegExp(`^/[^?#\\s"')]+\\.${staticAssetExtension}(?:[?#][^\\s"')]+)?$`, "i");
const urlReference = /url\(\s*["']?([^\s"')]+)["']?\s*\)/gi;
const attributeReference = /(?:src|href)\s*=\s*(?:\{\s*)?["'](\/[^"']+)["']/gi;
const stringReference = new RegExp(`["](?<path>\\/[^\"]+\\.${staticAssetExtension}(?:[?#][^\"]*)?)["]|['](?<singlePath>\\/[^']+\\.${staticAssetExtension}(?:[?#][^']*)?)[']`, "gi");
const importReference = new RegExp(`from\\s*["'](\/[^"']+\\.${staticAssetExtension})["']`, "gi");
const checkExtensions = new Set([".css", ".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const sourceRoots = ["src", "public"];
const missing = [];
const checked = new Set();

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function verify(reference, file) {
  if (!publicAsset.test(reference)) return;
  const pathname = reference.split(/[?#]/, 1)[0];
  const asset = path.join(publicRoot, pathname.slice(1));
  checked.add(pathname);
  if (!fs.statSync(asset, { throwIfNoEntry: false })?.isFile()) {
    missing.push(`${path.relative(projectRoot, file)} → ${pathname}`);
  }
}

for (const root of sourceRoots) {
  for (const file of walk(path.join(projectRoot, root))) {
    if (!checkExtensions.has(path.extname(file))) continue;
    const text = fs.readFileSync(file, "utf8");

    for (const match of text.matchAll(attributeReference)) verify(match[1], file);
    for (const match of text.matchAll(stringReference)) verify(match.groups?.path || match.groups?.singlePath || "", file);
    for (const match of text.matchAll(importReference)) verify(match[1], file);

    for (const match of text.matchAll(urlReference)) {
      const reference = match[1];
      if (reference.startsWith("/")) {
        verify(reference, file);
      } else if (root === "public" && /\.(?:woff2?|ttf|otf|avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(reference)) {
        const asset = path.resolve(path.dirname(file), reference.split(/[?#]/, 1)[0]);
        checked.add(path.relative(publicRoot, asset));
        if (!fs.statSync(asset, { throwIfNoEntry: false })?.isFile()) {
          missing.push(`${path.relative(projectRoot, file)} → ${reference}`);
        }
      }
    }
  }
}

if (missing.length) {
  console.error("Static asset check failed:\n" + missing.map((entry) => `  - ${entry}`).join("\n"));
  process.exit(1);
}

console.log(`PASS: ${checked.size} static asset path${checked.size === 1 ? "" : "s"} resolved under public/.`);
