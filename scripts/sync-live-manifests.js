const fs = require("fs");
const path = require("path");

const manifests = [
  {
    source: "LIVE_EXAMPLES.md",
    target: path.join("data", "live_examples.json"),
    globalName: "liveExamples"
  },
  {
    source: "LIVE_MODULES.md",
    target: path.join("data", "live_modules.json"),
    globalName: "liveModules"
  }
];
const liveDataTarget = path.join("assets", "js", "live-data.js");

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeManifestEntry(value) {
  const entry = String(value || "").trim();
  const moduleMatch = entry.match(/^module\s+(\d+)$/i);

  if (moduleMatch) {
    return `module${moduleMatch[1]}`;
  }

  return normalizeSlug(entry);
}

function isManifestEntry(value) {
  const entry = String(value || "").trim();
  return /^[a-z0-9][a-z0-9-]*$/i.test(entry) || /^module\s+\d+$/i.test(entry);
}

function parseManifest(text) {
  return String(text || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .filter(isManifestEntry)
    .map(normalizeManifestEntry);
}

const liveData = {};

for (const manifest of manifests) {
  const sourcePath = path.join(process.cwd(), manifest.source);
  const targetPath = path.join(process.cwd(), manifest.target);
  const slugs = parseManifest(fs.readFileSync(sourcePath, "utf8"));
  liveData[manifest.globalName] = slugs;

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(slugs, null, 2)}\n`);
  console.log(`${manifest.source} -> ${manifest.target}: ${slugs.join(", ")}`);
}

const liveDataPath = path.join(process.cwd(), liveDataTarget);
const liveDataOutput = [
  `window.liveExamples = ${JSON.stringify(liveData.liveExamples || [], null, 2)};`,
  `window.liveModules = ${JSON.stringify(liveData.liveModules || [], null, 2)};`
].join("\n\n");

fs.mkdirSync(path.dirname(liveDataPath), { recursive: true });
fs.writeFileSync(liveDataPath, `${liveDataOutput}\n`);
console.log(`Generated ${liveDataTarget}`);
