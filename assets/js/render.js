(function () {
  const LIVE_EXAMPLES_DATA = "data/live_examples.json";
  const LIVE_MODULES_DATA = "data/live_modules.json";
  const FALLBACK_LIVE_EXAMPLES = [];
  const FALLBACK_LIVE_MODULES = [];
  const toolList = document.querySelector("#tool-list");
  const toolCount = document.querySelector("#tool-count");
  const moduleList = document.querySelector("#module-list");
  const toolCountTargets = document.querySelectorAll("[data-live-count='tools']");
  const moduleCountTargets = document.querySelectorAll("[data-live-count='modules']");
  const toolLabelTargets = document.querySelectorAll("[data-live-label='tools']");
  const moduleLabelTargets = document.querySelectorAll("[data-live-label='modules']");
  let liveExampleSlugs = null;
  let liveExampleOrder = new Map();
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

  function hasLiveExampleConsumers() {
    return toolList || toolCountTargets.length || toolLabelTargets.length;
  }

  function hasLiveModuleConsumers() {
    return moduleList || moduleCountTargets.length || moduleLabelTargets.length;
  }

  async function loadLiveExampleSlugs() {
    if (!hasLiveExampleConsumers()) return;

    if (Array.isArray(window.liveExamples)) {
      const slugs = normalizeManifestItems(window.liveExamples);
      liveExampleSlugs = new Set(slugs);
      liveExampleOrder = new Map(slugs.map((slug, index) => [slug, index]));
      return;
    }

    try {
      const response = await fetch(LIVE_EXAMPLES_DATA, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Unable to load ${LIVE_EXAMPLES_DATA}`);
      }

      const slugs = parseManifestPayload(await response.text());
      liveExampleSlugs = new Set(slugs);
      liveExampleOrder = new Map(slugs.map((slug, index) => [slug, index]));
    } catch (error) {
      console.warn(error);
      liveExampleSlugs = new Set(FALLBACK_LIVE_EXAMPLES);
      liveExampleOrder = new Map(FALLBACK_LIVE_EXAMPLES.map((slug, index) => [slug, index]));
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

  function getLiveTools() {
    if (!window.tools) return [];
    if (!liveExampleSlugs) return window.tools;

    return window.tools
      .filter((tool) => liveExampleSlugs.has(getToolSlug(tool)))
      .sort((first, second) => liveExampleOrder.get(getToolSlug(first)) - liveExampleOrder.get(getToolSlug(second)));
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

  function getLiveCount(type) {
    if (type === "tools") {
      return liveExampleSlugs ? liveExampleSlugs.size : 0;
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
            <span>Add screenshot paths to this tool in <code>assets/js/tools-data.js</code>.</span>
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
    const filtered = filter === "All" ? liveTools : liveTools.filter((tool) => tool.category === filter);
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
        <span class="category-pill">${module.title}</span>
        <h2>${module.focus}</h2>
        <p>${module.reflection}</p>
        <div class="reflection-note">
          <strong>Classroom connection</strong>
          <span>${module.classroomConnection}</span>
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
      loadLiveExampleSlugs(),
      loadLiveModuleSlugs()
    ]);
    updateLiveCountsAndLabels();
    renderTools();
    renderModules();
  }

  initialize();
})();
