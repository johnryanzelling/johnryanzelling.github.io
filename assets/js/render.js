(function () {
  const LIVE_TOOLS_DATA = "data/live_tools.json";
  const LIVE_MODULES_DATA = "data/live_modules.json";
  const FALLBACK_LIVE_TOOLS = [];
  const FALLBACK_LIVE_MODULES = [];
  const toolList = document.querySelector("#tool-list");
  const toolCount = document.querySelector("#tool-count");
  const moduleList = document.querySelector("#module-list");
  const toolCountTargets = document.querySelectorAll("[data-live-count='tools']");
  const moduleCountTargets = document.querySelectorAll("[data-live-count='modules']");
  const toolLabelTargets = document.querySelectorAll("[data-live-label='tools']");
  const moduleLabelTargets = document.querySelectorAll("[data-live-label='modules']");
  let liveToolSlugs = null;
  let liveToolOrder = new Map();
  let liveModuleSlugs = null;
  let liveModuleOrder = new Map();

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

  function removeHtmlCommentBlocks(text) {
    return String(text || "").replace(/<!--[\s\S]*?-->/g, "");
  }

  function parseManifestText(text) {
    return removeHtmlCommentBlocks(text)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .filter(isManifestEntry)
      .map(normalizeManifestEntry);
  }

  function normalizeManifestItems(items) {
    return (Array.isArray(items) ? items : [])
      .map((item) => String(item || "").trim())
      .filter((item) => item && !item.startsWith("#"))
      .filter(isManifestEntry)
      .map(normalizeManifestEntry);
  }

  function parseManifestPayload(text) {
    try {
      return normalizeManifestItems(JSON.parse(text));
    } catch (error) {
      return parseManifestText(text);
    }
  }

  function hasLiveToolConsumers() {
    return toolList || toolCountTargets.length || toolLabelTargets.length;
  }

  function hasLiveModuleConsumers() {
    return moduleList || moduleCountTargets.length || moduleLabelTargets.length;
  }

  async function loadLiveToolSlugs() {
    if (!hasLiveToolConsumers()) return;

    if (Array.isArray(window.liveTools)) {
      const slugs = normalizeManifestItems(window.liveTools);
      liveToolSlugs = new Set(slugs);
      liveToolOrder = new Map(slugs.map((slug, index) => [slug, index]));
      return;
    }

    try {
      const response = await fetch(LIVE_TOOLS_DATA, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Unable to load ${LIVE_TOOLS_DATA}`);
      }

      const slugs = parseManifestPayload(await response.text());
      liveToolSlugs = new Set(slugs);
      liveToolOrder = new Map(slugs.map((slug, index) => [slug, index]));
    } catch (error) {
      console.warn(error);
      liveToolSlugs = new Set(FALLBACK_LIVE_TOOLS);
      liveToolOrder = new Map(FALLBACK_LIVE_TOOLS.map((slug, index) => [slug, index]));
    }
  }

  async function loadLiveModuleSlugs() {
    if (!hasLiveModuleConsumers()) return;

    if (Array.isArray(window.liveModules)) {
      const slugs = normalizeManifestItems(window.liveModules);
      liveModuleSlugs = new Set(slugs);
      liveModuleOrder = new Map(slugs.map((slug, index) => [slug, index]));
      return;
    }

    try {
      const response = await fetch(LIVE_MODULES_DATA, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Unable to load ${LIVE_MODULES_DATA}`);
      }

      const slugs = parseManifestPayload(await response.text());
      liveModuleSlugs = new Set(slugs);
      liveModuleOrder = new Map(slugs.map((slug, index) => [slug, index]));
    } catch (error) {
      console.warn(error);
      liveModuleSlugs = new Set(FALLBACK_LIVE_MODULES);
      liveModuleOrder = new Map(FALLBACK_LIVE_MODULES.map((slug, index) => [slug, index]));
    }
  }

  function getToolSlug(tool) {
    return normalizeSlug(tool.slug || tool.id || tool.name);
  }

  function getModuleSlug(module) {
    return normalizeSlug(module.slug || module.id || module.title);
  }

  function getCategoryTerms(value) {
    return normalizeSlug(value)
      .split("-")
      .filter((term) => term && term !== "and");
  }

  function matchesToolCategory(tool, filter) {
    if (filter === "All") return true;
    if (tool.category === filter) return true;

    const categoryTerms = new Set(getCategoryTerms(tool.category));
    const filterTermGroups = {
      "math-stem-and-coding": [["math"], ["stem"], ["coding"]],
      "assessment-and-review": [["assessment"], ["review"]],
      "creativity-and-media": [["creativity"], ["media"]],
      "collaboration-and-productivity": [["collaboration"], ["productivity"]],
      "communication-and-classroom-management": [["communication"], ["classroom"], ["management"], ["student", "engagement"], ["digital", "learning"]],
      "ai-and-teacher-productivity": [["ai"], ["teacher", "productivity"]]
    };
    const filterTerms = filterTermGroups[normalizeSlug(filter)] || getCategoryTerms(filter).map((term) => [term]);

    return filterTerms.some((terms) => terms.every((term) => categoryTerms.has(term)));
  }

  function getLiveTools() {
    if (!window.tools) return [];
    if (!liveToolSlugs) return window.tools;

    return window.tools
      .filter((tool) => liveToolSlugs.has(getToolSlug(tool)))
      .sort((first, second) => liveToolOrder.get(getToolSlug(first)) - liveToolOrder.get(getToolSlug(second)));
  }

  function getLiveModules() {
    if (!window.modules) return [];
    if (!liveModuleSlugs) return window.modules;

    return window.modules
      .filter((module) => liveModuleSlugs.has(getModuleSlug(module)))
      .sort((first, second) => liveModuleOrder.get(getModuleSlug(first)) - liveModuleOrder.get(getModuleSlug(second)));
  }

  function listItems(items) {
    return items.map((item) => `<li>${item}</li>`).join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderInlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const output = [];
    let paragraph = [];
    let listItemsBuffer = [];
    let listTag = "";

    function flushParagraph() {
      if (!paragraph.length) return;
      output.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }

    function flushList() {
      if (!listItemsBuffer.length) return;
      output.push(`<${listTag}>${listItemsBuffer.join("")}</${listTag}>`);
      listItemsBuffer = [];
      listTag = "";
    }

    lines.forEach((rawLine) => {
      const line = rawLine.trim();

      if (!line) {
        flushParagraph();
        flushList();
        return;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = Math.min(headingMatch[1].length + 1, 6);
        output.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
        return;
      }

      const unorderedMatch = line.match(/^[-*+]\s+(.+)$/);
      const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
      if (unorderedMatch || orderedMatch) {
        flushParagraph();
        const nextListTag = unorderedMatch ? "ul" : "ol";
        if (listTag && listTag !== nextListTag) {
          flushList();
        }
        listTag = nextListTag;
        listItemsBuffer.push(`<li>${renderInlineMarkdown((unorderedMatch || orderedMatch)[1])}</li>`);
        return;
      }

      flushList();
      paragraph.push(line);
    });

    flushParagraph();
    flushList();

    return output.join("");
  }

  function getModuleMarkdown(module) {
    if (module.markdown) return module.markdown;

    return [
      `# ${module.title || "Module"}`,
      module.focus ? `## Focus\n${module.focus}` : "",
      module.reflection ? `## Reflection\n${module.reflection}` : "",
      module.classroomConnection ? `## Classroom Connection\n${module.classroomConnection}` : ""
    ].filter(Boolean).join("\n\n");
  }

  function getLiveCount(type) {
    if (type === "tools") {
      return liveToolSlugs ? liveToolSlugs.size : 0;
    }

    if (type === "modules") {
      return liveModuleSlugs ? liveModuleSlugs.size : 0;
    }

    return 0;
  }

  function formatLiveTemplate(element, count) {
    const template = count === 1 ? element.dataset.liveSingular : element.dataset.livePlural;
    return String(template || "").replace("{count}", count);
  }

  function updateLiveCountsAndLabels() {
    const toolCountValue = getLiveCount("tools");
    const moduleCountValue = getLiveCount("modules");

    toolCountTargets.forEach((element) => {
      element.textContent = String(toolCountValue);
    });

    moduleCountTargets.forEach((element) => {
      element.textContent = String(moduleCountValue);
    });

    toolLabelTargets.forEach((element) => {
      element.textContent = formatLiveTemplate(element, toolCountValue);
    });

    moduleLabelTargets.forEach((element) => {
      element.textContent = formatLiveTemplate(element, moduleCountValue);
    });

    const titleTemplate = document.body
      ? (toolCountValue === 1 ? document.body.dataset.liveTitleToolsSingular : document.body.dataset.liveTitleToolsPlural)
      : "";
    if (titleTemplate) {
      document.title = titleTemplate.replace("{count}", toolCountValue);
    }
  }

  function getGalleryItems(tool) {
    return Array.isArray(tool.screenshots) ? tool.screenshots : [];
  }

  function getScreenshotData(item, index, toolName) {
    if (typeof item === "string") {
      return {
        src: item,
        alt: `${toolName} screenshot ${index + 1}`,
        caption: `Screenshot ${index + 1}`
      };
    }

    return {
      src: item.src,
      alt: item.alt || `${toolName} screenshot ${index + 1}`,
      caption: item.caption || `Screenshot ${index + 1}`
    };
  }

  function renderGallery(tool, toolIndex) {
    const screenshots = getGalleryItems(tool);

    if (!screenshots.length) {
      return `
        <section class="tool-gallery empty-gallery" aria-label="${tool.name} screenshots">
          <div class="gallery-heading">
            <h3>Screenshots</h3>
            <span>0 images</span>
          </div>
          <div class="gallery-empty">
            <strong>${tool.name} evidence gallery</strong>
            <span>No screenshots available.</span>
          </div>
        </section>
      `;
    }

    const galleryId = `gallery-${toolIndex}`;
    return `
      <section class="tool-gallery" aria-label="${tool.name} screenshots">
        <div class="gallery-heading">
          <h3>Screenshots</h3>
          <span>${screenshots.length} ${screenshots.length === 1 ? "image" : "images"}</span>
        </div>
        <div class="gallery-shell">
          <button class="gallery-control previous" type="button" data-gallery="${galleryId}" data-direction="-1" aria-label="Previous ${tool.name} screenshot">&lsaquo;</button>
          <div id="${galleryId}" class="gallery-track" tabindex="0">
            ${screenshots.map((item, imageIndex) => {
              const image = getScreenshotData(item, imageIndex, tool.name);
              return `
                <figure class="gallery-slide">
                  <img src="${image.src}" alt="${image.alt}" loading="lazy">
                  <figcaption>${image.caption}</figcaption>
                </figure>
              `;
            }).join("")}
          </div>
          <button class="gallery-control next" type="button" data-gallery="${galleryId}" data-direction="1" aria-label="Next ${tool.name} screenshot">&rsaquo;</button>
        </div>
        <div class="gallery-dots" aria-label="${tool.name} screenshot navigation">
          ${screenshots.map((_, imageIndex) => `
            <button class="gallery-dot${imageIndex === 0 ? " active" : ""}" type="button" data-gallery="${galleryId}" data-index="${imageIndex}" aria-label="Show screenshot ${imageIndex + 1}"></button>
          `).join("")}
        </div>
      </section>
    `;
  }

  function updateGalleryDots(track) {
    const slides = Array.from(track.querySelectorAll(".gallery-slide"));
    if (!slides.length) return;

    const index = Math.round(track.scrollLeft / Math.max(slides[0].clientWidth, 1));
    document.querySelectorAll(`.gallery-dot[data-gallery="${track.id}"]`).forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === index);
    });
  }

  function connectGalleries() {
    document.querySelectorAll(".gallery-control").forEach((button) => {
      button.addEventListener("click", () => {
        const track = document.getElementById(button.dataset.gallery);
        if (!track) return;
        const direction = Number(button.dataset.direction);
        track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
      });
    });

    document.querySelectorAll(".gallery-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        const track = document.getElementById(dot.dataset.gallery);
        const index = Number(dot.dataset.index);
        const slide = track ? track.querySelectorAll(".gallery-slide")[index] : null;
        if (slide) {
          slide.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        }
      });
    });

    document.querySelectorAll(".gallery-track").forEach((track) => {
      track.addEventListener("scroll", () => window.requestAnimationFrame(() => updateGalleryDots(track)));
    });
  }

  function renderTools(filter = "All") {
    if (!toolList || !window.tools) return;

    const liveTools = getLiveTools();
    const filtered = liveTools.filter((tool) => matchesToolCategory(tool, filter));
    toolList.innerHTML = filtered.map((tool, toolIndex) => `
      <article class="tool-card">
        <div class="tool-card-top">
          <span class="category-pill">${tool.category}</span>
          <span class="cost">${tool.cost}</span>
        </div>
        <h2>${tool.name}</h2>
        <p>${tool.description}</p>
        ${renderGallery(tool, toolIndex)}
        <dl class="tool-details">
          <div>
            <dt>Classroom use</dt>
            <dd>${tool.pedagogicalUses}</dd>
          </div>
          <div>
            <dt>Teacher value</dt>
            <dd>${tool.teacherValue}</dd>
          </div>
          <div>
            <dt>Artifact</dt>
            <dd>${tool.artifact}</dd>
          </div>
        </dl>
        <div class="columns">
          <div>
            <h3>Pros</h3>
            <ul>${listItems(tool.pros)}</ul>
          </div>
          <div>
            <h3>Cons</h3>
            <ul>${listItems(tool.cons)}</ul>
          </div>
        </div>
        <div class="standard-list">
          <h3>ISTE connections</h3>
          <ul>${listItems(tool.iste)}</ul>
        </div>
        <div class="source-row">
          <a href="${tool.location}" target="_blank" rel="noreferrer">Visit tool</a>
          <span>${tool.sources.join(", ")}</span>
        </div>
      </article>
    `).join("");

    if (toolCount) {
      toolCount.textContent = `${filtered.length} ${filtered.length === 1 ? "tool" : "tools"} shown`;
    }

    connectGalleries();
  }

  function renderModules() {
    if (!moduleList || !window.modules) return;

    moduleList.innerHTML = getLiveModules().map((module) => `
      <article class="module-card">
        <div class="module-markdown">
          ${renderMarkdown(getModuleMarkdown(module))}
        </div>
      </article>
    `).join("");
  }

  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderTools(button.dataset.filter);
    });
  });

  async function initialize() {
    await Promise.all([
      loadLiveToolSlugs(),
      loadLiveModuleSlugs()
    ]);
    updateLiveCountsAndLabels();
    renderTools();
    renderModules();
  }

  initialize();
})();
