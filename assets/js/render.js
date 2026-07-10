(function () {
  const LIVE_TOOLS_DATA = "data/live_tools.json";
  const LIVE_MODULES_DATA = "data/live_modules.json";
  const FALLBACK_LIVE_TOOLS = [];
  const FALLBACK_LIVE_MODULES = [];
  const LIGHTBOX_MIN_ZOOM = 1;
  const LIGHTBOX_MAX_ZOOM = 3;
  const LIGHTBOX_ZOOM_STEP = 0.25;
  const LIGHTBOX_SWIPE_MIN_DISTANCE = 48;
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
  let lightboxElement = null;
  let lightboxPreviousFocus = null;
  let lightboxItems = [];
  let lightboxIndex = 0;
  let lightboxZoom = LIGHTBOX_MIN_ZOOM;
  let lightboxPanX = 0;
  let lightboxPanY = 0;
  let lightboxIsPanning = false;
  let lightboxPanStartX = 0;
  let lightboxPanStartY = 0;
  let lightboxPanOriginX = 0;
  let lightboxPanOriginY = 0;
  let lightboxTouchMode = "";
  let lightboxTouchStartX = 0;
  let lightboxTouchStartY = 0;

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

  function getToolCategoryCount(filter) {
    return getLiveTools().filter((tool) => matchesToolCategory(tool, filter)).length;
  }

  function updateFilterButtonCounts() {
    document.querySelectorAll(".filter-button").forEach((button) => {
      const filter = button.dataset.filter || "All";
      const label = button.dataset.label || button.textContent.trim();
      const count = getToolCategoryCount(filter);
      const labelElement = document.createElement("span");
      const countElement = document.createElement("span");

      button.dataset.label = label;
      button.textContent = "";
      labelElement.className = "filter-label";
      labelElement.textContent = label;
      countElement.className = "filter-count";
      countElement.textContent = String(count);
      countElement.setAttribute("aria-hidden", "true");
      button.setAttribute("aria-label", `${label}: ${count} ${count === 1 ? "tool" : "tools"}`);
      button.appendChild(labelElement);
      button.appendChild(countElement);
    });
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

  function closeLightbox() {
    if (!lightboxElement || lightboxElement.hidden) return;

    resetLightboxZoom();
    lightboxElement.hidden = true;
    document.body.classList.remove("lightbox-open");
    lightboxItems = [];
    lightboxIndex = 0;

    if (lightboxPreviousFocus) {
      lightboxPreviousFocus.focus();
      lightboxPreviousFocus = null;
    }
  }

  function ensureLightbox() {
    if (lightboxElement || !document.body) return lightboxElement;

    lightboxElement = document.createElement("div");
    lightboxElement.className = "lightbox";
    lightboxElement.hidden = true;
    lightboxElement.setAttribute("role", "dialog");
    lightboxElement.setAttribute("aria-modal", "true");
    lightboxElement.setAttribute("aria-label", "Enlarged screenshot");
    lightboxElement.innerHTML = `
      <div class="lightbox-panel">
        <button class="lightbox-close" type="button" data-lightbox-close aria-label="Close enlarged screenshot">Close</button>
        <div class="lightbox-toolbar" aria-label="Image zoom controls">
          <button class="lightbox-tool" type="button" data-lightbox-zoom-out aria-label="Zoom out">Zoom Out</button>
          <button class="lightbox-tool" type="button" data-lightbox-zoom-in aria-label="Zoom in">Zoom In</button>
          <button class="lightbox-tool" type="button" data-lightbox-zoom-reset aria-label="Reset zoom">Reset</button>
          <span class="lightbox-zoom-status" aria-live="polite">100%</span>
        </div>
        <div class="lightbox-viewer">
          <button class="lightbox-nav previous" type="button" data-lightbox-previous aria-label="Previous screenshot">&lsaquo;</button>
          <figure class="lightbox-figure">
            <div class="lightbox-image-frame">
              <img class="lightbox-image" src="" alt="" draggable="false">
            </div>
            <figcaption class="lightbox-caption"></figcaption>
          </figure>
          <button class="lightbox-nav next" type="button" data-lightbox-next aria-label="Next screenshot">&rsaquo;</button>
        </div>
      </div>
    `;

    lightboxElement.addEventListener("click", (event) => {
      if (event.target === lightboxElement || event.target.closest("[data-lightbox-close]")) {
        closeLightbox();
        return;
      }

      if (event.target.closest("[data-lightbox-previous]")) {
        showLightboxImage(lightboxIndex - 1);
        return;
      }

      if (event.target.closest("[data-lightbox-next]")) {
        showLightboxImage(lightboxIndex + 1);
        return;
      }

      if (event.target.closest("[data-lightbox-zoom-out]")) {
        setLightboxZoom(lightboxZoom - LIGHTBOX_ZOOM_STEP);
        return;
      }

      if (event.target.closest("[data-lightbox-zoom-in]")) {
        setLightboxZoom(lightboxZoom + LIGHTBOX_ZOOM_STEP);
        return;
      }

      if (event.target.closest("[data-lightbox-zoom-reset]")) {
        resetLightboxZoom();
      }
    });

    lightboxElement.querySelector(".lightbox-image-frame").addEventListener("mousedown", startLightboxPan);
    lightboxElement.querySelector(".lightbox-image-frame").addEventListener("wheel", zoomLightboxWithWheel, { passive: false });
    lightboxElement.querySelector(".lightbox-image-frame").addEventListener("touchstart", startLightboxTouch, { passive: false });
    lightboxElement.querySelector(".lightbox-image-frame").addEventListener("touchmove", moveLightboxTouch, { passive: false });
    lightboxElement.querySelector(".lightbox-image-frame").addEventListener("touchend", endLightboxTouch);
    lightboxElement.querySelector(".lightbox-image-frame").addEventListener("touchcancel", endLightboxTouch);

    document.addEventListener("mousemove", moveLightboxPan);
    document.addEventListener("mouseup", endLightboxPan);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeLightbox();
        return;
      }

      if (!lightboxElement || lightboxElement.hidden) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showLightboxImage(lightboxIndex - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showLightboxImage(lightboxIndex + 1);
      }
    });

    document.body.appendChild(lightboxElement);
    return lightboxElement;
  }

  function clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getLightboxPanBounds() {
    if (!lightboxElement || lightboxZoom <= LIGHTBOX_MIN_ZOOM) {
      return { x: 0, y: 0 };
    }

    const image = lightboxElement.querySelector(".lightbox-image");
    const frame = lightboxElement.querySelector(".lightbox-image-frame");
    const imageWidth = image.clientWidth || frame.clientWidth || 0;
    const imageHeight = image.clientHeight || frame.clientHeight || 0;

    return {
      x: Math.max(0, (imageWidth * (lightboxZoom - 1)) / 2),
      y: Math.max(0, (imageHeight * (lightboxZoom - 1)) / 2)
    };
  }

  function updateLightboxTransform() {
    if (!lightboxElement) return;

    const image = lightboxElement.querySelector(".lightbox-image");
    const frame = lightboxElement.querySelector(".lightbox-image-frame");
    const zoomStatus = lightboxElement.querySelector(".lightbox-zoom-status");
    const zoomOutButton = lightboxElement.querySelector("[data-lightbox-zoom-out]");
    const zoomInButton = lightboxElement.querySelector("[data-lightbox-zoom-in]");
    const resetButton = lightboxElement.querySelector("[data-lightbox-zoom-reset]");
    const panBounds = getLightboxPanBounds();

    lightboxPanX = clampValue(lightboxPanX, -panBounds.x, panBounds.x);
    lightboxPanY = clampValue(lightboxPanY, -panBounds.y, panBounds.y);
    image.style.transform = `translate(${lightboxPanX}px, ${lightboxPanY}px) scale(${lightboxZoom})`;
    image.classList.toggle("is-zoomed", lightboxZoom > LIGHTBOX_MIN_ZOOM);
    frame.classList.toggle("is-zoomed", lightboxZoom > LIGHTBOX_MIN_ZOOM);
    zoomStatus.textContent = `${Math.round(lightboxZoom * 100)}%`;
    zoomOutButton.disabled = lightboxZoom <= LIGHTBOX_MIN_ZOOM;
    zoomInButton.disabled = lightboxZoom >= LIGHTBOX_MAX_ZOOM;
    resetButton.disabled = lightboxZoom === LIGHTBOX_MIN_ZOOM && lightboxPanX === 0 && lightboxPanY === 0;
  }

  function setLightboxZoom(value) {
    const nextZoom = clampValue(value, LIGHTBOX_MIN_ZOOM, LIGHTBOX_MAX_ZOOM);

    if (nextZoom === LIGHTBOX_MIN_ZOOM) {
      lightboxPanX = 0;
      lightboxPanY = 0;
    }

    lightboxZoom = nextZoom;
    updateLightboxTransform();
  }

  function resetLightboxZoom() {
    lightboxZoom = LIGHTBOX_MIN_ZOOM;
    lightboxPanX = 0;
    lightboxPanY = 0;
    lightboxIsPanning = false;
    lightboxTouchMode = "";
    if (lightboxElement) {
      lightboxElement.querySelector(".lightbox-image-frame").classList.remove("is-panning");
    }
    updateLightboxTransform();
  }

  function startLightboxPan(event) {
    if (!lightboxElement || lightboxElement.hidden || lightboxZoom <= LIGHTBOX_MIN_ZOOM) return;

    lightboxIsPanning = true;
    lightboxPanStartX = event.clientX;
    lightboxPanStartY = event.clientY;
    lightboxPanOriginX = lightboxPanX;
    lightboxPanOriginY = lightboxPanY;
    lightboxElement.querySelector(".lightbox-image-frame").classList.add("is-panning");
    event.preventDefault();
  }

  function moveLightboxPan(event) {
    if (!lightboxIsPanning || lightboxZoom <= LIGHTBOX_MIN_ZOOM) return;

    const panBounds = getLightboxPanBounds();
    lightboxPanX = clampValue(lightboxPanOriginX + event.clientX - lightboxPanStartX, -panBounds.x, panBounds.x);
    lightboxPanY = clampValue(lightboxPanOriginY + event.clientY - lightboxPanStartY, -panBounds.y, panBounds.y);
    updateLightboxTransform();
  }

  function endLightboxPan() {
    if (!lightboxIsPanning) return;

    lightboxIsPanning = false;
    if (lightboxElement) {
      lightboxElement.querySelector(".lightbox-image-frame").classList.remove("is-panning");
    }
  }

  function getTouchPoint(event) {
    if (event.touches && event.touches.length) return event.touches[0];
    if (event.changedTouches && event.changedTouches.length) return event.changedTouches[0];

    return null;
  }

  function startLightboxTouch(event) {
    if (!lightboxElement || lightboxElement.hidden || !event.touches || event.touches.length !== 1) return;

    const touch = getTouchPoint(event);
    if (!touch) return;

    lightboxTouchStartX = touch.clientX;
    lightboxTouchStartY = touch.clientY;

    if (lightboxZoom > LIGHTBOX_MIN_ZOOM) {
      lightboxTouchMode = "pan";
      lightboxIsPanning = true;
      lightboxPanStartX = touch.clientX;
      lightboxPanStartY = touch.clientY;
      lightboxPanOriginX = lightboxPanX;
      lightboxPanOriginY = lightboxPanY;
      lightboxElement.querySelector(".lightbox-image-frame").classList.add("is-panning");
      event.preventDefault();
      return;
    }

    lightboxTouchMode = "swipe";
  }

  function moveLightboxTouch(event) {
    const touch = getTouchPoint(event);
    if (!touch) return;

    if (lightboxTouchMode === "pan" && lightboxZoom > LIGHTBOX_MIN_ZOOM) {
      const panBounds = getLightboxPanBounds();
      lightboxPanX = clampValue(lightboxPanOriginX + touch.clientX - lightboxPanStartX, -panBounds.x, panBounds.x);
      lightboxPanY = clampValue(lightboxPanOriginY + touch.clientY - lightboxPanStartY, -panBounds.y, panBounds.y);
      updateLightboxTransform();
      event.preventDefault();
    }
  }

  function endLightboxTouch(event) {
    const touch = getTouchPoint(event);

    if (lightboxTouchMode === "pan") {
      endLightboxPan();
      lightboxTouchMode = "";
      return;
    }

    if (lightboxTouchMode === "swipe" && touch && lightboxItems.length > 1) {
      const deltaX = touch.clientX - lightboxTouchStartX;
      const deltaY = touch.clientY - lightboxTouchStartY;
      const isHorizontalSwipe = Math.abs(deltaX) >= LIGHTBOX_SWIPE_MIN_DISTANCE && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

      if (isHorizontalSwipe) {
        showLightboxImage(lightboxIndex + (deltaX < 0 ? 1 : -1));
      }
    }

    lightboxTouchMode = "";
  }

  function zoomLightboxWithWheel(event) {
    if (!lightboxElement || lightboxElement.hidden || event.deltaY === 0) return;

    event.preventDefault();
    setLightboxZoom(lightboxZoom + (event.deltaY < 0 ? LIGHTBOX_ZOOM_STEP : -LIGHTBOX_ZOOM_STEP));
  }

  function getLightboxItem(trigger) {
    return {
      src: trigger.dataset.lightboxSrc,
      alt: trigger.dataset.lightboxAlt || "",
      caption: trigger.dataset.lightboxCaption || trigger.dataset.lightboxAlt || "",
      index: Number(trigger.dataset.lightboxIndex)
    };
  }

  function showLightboxImage(index) {
    if (!lightboxElement || !lightboxItems.length) return;

    const maxIndex = lightboxItems.length - 1;
    const image = lightboxElement.querySelector(".lightbox-image");
    const caption = lightboxElement.querySelector(".lightbox-caption");
    const previousButton = lightboxElement.querySelector("[data-lightbox-previous]");
    const nextButton = lightboxElement.querySelector("[data-lightbox-next]");
    const hasMultipleImages = lightboxItems.length > 1;

    lightboxIndex = Math.min(Math.max(index, 0), maxIndex);
    resetLightboxZoom();
    image.src = lightboxItems[lightboxIndex].src;
    image.alt = lightboxItems[lightboxIndex].alt;
    caption.textContent = lightboxItems[lightboxIndex].caption;
    previousButton.hidden = !hasMultipleImages;
    nextButton.hidden = !hasMultipleImages;
    previousButton.disabled = !hasMultipleImages || lightboxIndex === 0;
    nextButton.disabled = !hasMultipleImages || lightboxIndex === maxIndex;
  }

  function openLightbox(trigger) {
    const lightbox = ensureLightbox();
    if (!lightbox) return;

    const galleryId = trigger.dataset.lightboxGallery;
    const clickedIndex = Number(trigger.dataset.lightboxIndex);
    const closeButton = lightbox.querySelector(".lightbox-close");
    const galleryTriggers = Array.from(document.querySelectorAll(".lightbox-trigger"))
      .filter((button) => button.dataset.lightboxGallery === galleryId);
    const selectedIndex = galleryTriggers.findIndex((button) => Number(button.dataset.lightboxIndex) === clickedIndex);

    lightboxPreviousFocus = trigger;
    lightboxItems = galleryTriggers.length ? galleryTriggers.map(getLightboxItem) : [getLightboxItem(trigger)];
    showLightboxImage(selectedIndex >= 0 ? selectedIndex : 0);
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    closeButton.focus();
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
              const imageSrc = escapeHtml(image.src);
              const imageAlt = escapeHtml(image.alt);
              const imageCaption = escapeHtml(image.caption);
              return `
                <figure class="gallery-slide">
                  <button class="lightbox-trigger" type="button" data-lightbox-gallery="${galleryId}" data-lightbox-index="${imageIndex}" data-lightbox-src="${imageSrc}" data-lightbox-alt="${imageAlt}" data-lightbox-caption="${imageCaption}" aria-label="Open ${imageAlt} larger">
                    <img src="${imageSrc}" alt="${imageAlt}" loading="lazy">
                  </button>
                  <figcaption>${imageCaption}</figcaption>
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

  function connectLightboxTriggers() {
    document.querySelectorAll(".lightbox-trigger").forEach((button) => {
      button.addEventListener("click", () => openLightbox(button));
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
    connectLightboxTriggers();
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
    updateFilterButtonCounts();
    renderTools();
    renderModules();
  }

  initialize();
})();
