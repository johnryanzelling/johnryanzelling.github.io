const fs = require("fs");
const path = require("path");

const manifests = [
  {
    source: "LIVE_TOOLS.md",
    target: path.join("data", "live_tools.json"),
    globalName: "liveTools"
  },
  {
    source: "LIVE_MODULES.md",
    target: path.join("data", "live_modules.json"),
    globalName: "liveModules"
  }
];
const liveDataTarget = path.join("assets", "js", "live-data.js");
const moduleDataTarget = path.join("assets", "js", "module-data.js");
const toolDataTarget = path.join("assets", "js", "tools-data.js");

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

function escapeJsString(value) {
  return JSON.stringify(String(value || ""));
}

function getModuleSortValue(slug) {
  const match = String(slug || "").match(/^module(\d+)$/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function getMarkdownHeadingText(line) {
  return String(line || "").replace(/^#+\s*/, "").trim();
}

function getMarkdownSections(text) {
  const lines = String(text || "").split(/\r?\n/);
  const sections = {};
  let title = "";
  let currentSection = "";

  for (const line of lines) {
    if (/^#\s+/.test(line)) {
      title = getMarkdownHeadingText(line);
      currentSection = "";
      continue;
    }

    if (/^##\s+/.test(line)) {
      currentSection = getMarkdownHeadingText(line).toLowerCase();
      sections[currentSection] = [];
      continue;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  return { title, sections };
}

function cleanMarkdownSection(lines) {
  return (lines || [])
    .join("\n")
    .trim()
    .replace(/\n{3,}/g, "\n\n");
}

function readModuleMarkdown(moduleDirectory) {
  const readmePath = path.join(moduleDirectory, "README.md");
  if (fs.existsSync(readmePath)) {
    return fs.readFileSync(readmePath, "utf8");
  }

  return "";
}

function getModuleFromMarkdown(moduleDirectory) {
  const slug = path.basename(moduleDirectory);
  const markdown = readModuleMarkdown(moduleDirectory);
  const parsed = getMarkdownSections(markdown);

  return {
    slug,
    title: parsed.title || slug,
    focus: cleanMarkdownSection(parsed.sections.focus),
    reflection: cleanMarkdownSection(parsed.sections["reflection draft"] || parsed.sections.reflection),
    classroomConnection: cleanMarkdownSection(parsed.sections["classroom connection"]),
    source: path.join("modules", slug, "README.md").replace(/\\/g, "/")
  };
}

function getModules() {
  const modulesPath = path.join(process.cwd(), "modules");
  if (!fs.existsSync(modulesPath)) {
    return [];
  }

  return fs.readdirSync(modulesPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(modulesPath, entry.name))
    .map(getModuleFromMarkdown)
    .sort((first, second) => getModuleSortValue(first.slug) - getModuleSortValue(second.slug));
}

function getSectionText(sections, name) {
  return cleanMarkdownSection(sections[String(name || "").toLowerCase()]);
}

function getSectionList(sections, name) {
  return (sections[String(name || "").toLowerCase()] || [])
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function getScreenshotItems(sections) {
  const lines = sections.screenshots || [];
  const screenshots = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const srcMatch = line.match(/^-\s*src:\s*(.*)$/i);
    const altMatch = line.match(/^alt:\s*(.*)$/i);
    const captionMatch = line.match(/^caption:\s*(.*)$/i);

    if (srcMatch) {
      current = { src: srcMatch[1].trim(), alt: "", caption: "" };
      screenshots.push(current);
      continue;
    }

    if (current && altMatch) {
      current.alt = altMatch[1].trim();
      continue;
    }

    if (current && captionMatch) {
      current.caption = captionMatch[1].trim();
    }
  }

  return screenshots.filter((item) => item.src);
}

function getToolReadmePath(slug) {
  return path.join(process.cwd(), "tools", slug, "README.md");
}

function getToolFromMarkdown(slug) {
  const readmePath = getToolReadmePath(slug);
  if (!fs.existsSync(readmePath)) {
    throw new Error(`Missing README for live tool "${slug}" at tools/${slug}/README.md`);
  }

  const markdown = fs.readFileSync(readmePath, "utf8");
  const parsed = getMarkdownSections(markdown);
  const name = getSectionText(parsed.sections, "name") || parsed.title || slug;

  return {
    slug,
    name,
    category: getSectionText(parsed.sections, "category"),
    location: getSectionText(parsed.sections, "location"),
    cost: getSectionText(parsed.sections, "cost"),
    description: getSectionText(parsed.sections, "description"),
    pedagogicalUses: getSectionText(parsed.sections, "pedagogical uses"),
    teacherValue: getSectionText(parsed.sections, "teacher value"),
    artifact: getSectionText(parsed.sections, "artifact"),
    screenshots: getScreenshotItems(parsed.sections),
    pros: getSectionList(parsed.sections, "pros"),
    cons: getSectionList(parsed.sections, "cons"),
    iste: getSectionList(parsed.sections, "iste standards"),
    sources: getSectionList(parsed.sections, "sources")
  };
}

function getLiveTools(slugs) {
  return (slugs || []).map(getToolFromMarkdown);
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
  `window.liveTools = ${JSON.stringify(liveData.liveTools || [], null, 2)};`,
  `window.liveModules = ${JSON.stringify(liveData.liveModules || [], null, 2)};`
].join("\n\n");

fs.mkdirSync(path.dirname(liveDataPath), { recursive: true });
fs.writeFileSync(liveDataPath, `${liveDataOutput}\n`);
console.log(`Generated ${liveDataTarget}`);

const moduleDataPath = path.join(process.cwd(), moduleDataTarget);
const moduleDataOutput = [
  "window.modules = [",
  getModules().map((module) => `  {
    slug: ${escapeJsString(module.slug)},
    title: ${escapeJsString(module.title)},
    focus: ${escapeJsString(module.focus)},
    reflection: ${escapeJsString(module.reflection)},
    classroomConnection: ${escapeJsString(module.classroomConnection)},
    source: ${escapeJsString(module.source)}
  }`).join(",\n"),
  "];"
].join("\n");

fs.writeFileSync(moduleDataPath, `${moduleDataOutput}\n`);
console.log(`Generated ${moduleDataTarget}`);

const toolDataPath = path.join(process.cwd(), toolDataTarget);
const toolDataOutput = `window.tools = ${JSON.stringify(getLiveTools(liveData.liveTools), null, 2)};`;

fs.writeFileSync(toolDataPath, `${toolDataOutput}\n`);
console.log(`Generated ${toolDataTarget}`);
