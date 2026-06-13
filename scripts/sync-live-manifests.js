const fs = require("fs");
const path = require("path");

const manifests = [
  {
    source: "LIVE_EXAMPLES.md",
    target: path.join("data", "live_examples.json")
  },
  {
    source: "LIVE_MODULES.md",
    target: path.join("data", "live_modules.json")
  }
];

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isPlainSlug(value) {
  return /^[a-z0-9][a-z0-9-]*$/i.test(String(value || "").trim());
}

function parseManifest(text) {
  return String(text || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .filter(isPlainSlug)
    .map(normalizeSlug);
}

for (const manifest of manifests) {
  const sourcePath = path.join(process.cwd(), manifest.source);
  const targetPath = path.join(process.cwd(), manifest.target);
  const slugs = parseManifest(fs.readFileSync(sourcePath, "utf8"));

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(slugs, null, 2)}\n`);
  console.log(`${manifest.source} -> ${manifest.target}: ${slugs.join(", ")}`);
}
