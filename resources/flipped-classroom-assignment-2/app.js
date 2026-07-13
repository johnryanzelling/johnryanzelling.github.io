(function () {
  var config = window.FlippedClassroomLesson || {};
  var mediaConfig = config.media || {};
  var teacherVideoConfig = mediaConfig.teacherVideo || {};
  var surveyConfig = mediaConfig.microsoftFormsSurvey || {};
  var visualConfig = config.visuals || {};
  var sectionLinks = Array.prototype.slice.call(document.querySelectorAll("[data-section-link]"));
  var sections = sectionLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      return id ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  document.documentElement.classList.add("lesson-js");
  document.documentElement.dataset.lessonTitle = config.title || "Unlocking the Pythagorean Theorem";

  function hasValue(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function appendText(element, text) {
    element.appendChild(document.createTextNode(text));
  }

  function createPlaceholder(message) {
    var placeholder = document.createElement("div");
    placeholder.className = "media-placeholder";
    placeholder.setAttribute("role", "status");
    appendText(placeholder, message);
    return placeholder;
  }

  function createLink(href, label) {
    var link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    return link;
  }

  function renderTeacherVideo() {
    var slot = document.querySelector("[data-teacher-video-slot]");
    if (!slot) {
      return;
    }

    var videoSource = teacherVideoConfig.source || "";
    var transcriptPath = teacherVideoConfig.transcriptPath || "";
    var captionsPath = teacherVideoConfig.captionsPath || "";
    var posterImagePath = teacherVideoConfig.posterImagePath || "";

    if (!hasValue(videoSource)) {
      slot.replaceChildren(
        createPlaceholder(
          "Teacher Camtasia video is not configured yet. Add source, poster image, captions, and transcript paths in lesson-config.js when the final files are ready."
        )
      );
      return;
    }

    var video = document.createElement("video");
    video.controls = true;
    video.preload = "none";
    video.setAttribute("aria-label", "Teacher-created Pythagorean theorem mini lesson");

    if (hasValue(posterImagePath)) {
      video.poster = posterImagePath;
    }

    var source = document.createElement("source");
    source.src = videoSource;
    source.type = teacherVideoConfig.type || "video/mp4";
    video.appendChild(source);

    if (hasValue(captionsPath)) {
      var captions = document.createElement("track");
      captions.kind = "captions";
      captions.src = captionsPath;
      captions.srclang = "en";
      captions.label = "English captions";
      video.appendChild(captions);
    }

    appendText(video, "Your browser does not support embedded video.");

    var supportLinks = document.createElement("div");
    supportLinks.className = "video-support-links";
    supportLinks.appendChild(createLink(videoSource, "Open teacher video directly"));

    if (hasValue(transcriptPath)) {
      supportLinks.appendChild(createLink(transcriptPath, "Open transcript"));
    } else {
      var transcriptNote = document.createElement("span");
      transcriptNote.textContent = "Transcript not configured yet.";
      supportLinks.appendChild(transcriptNote);
    }

    slot.replaceChildren(video, supportLinks);
  }

  function renderSurveySlot() {
    var slot = document.querySelector("[data-survey-slot]");
    if (!slot) {
      return;
    }

    var embedUrl = surveyConfig.embedUrl || "";
    var directUrl = surveyConfig.directUrl || "";

    if (!hasValue(embedUrl) && !hasValue(directUrl)) {
      return;
    }

    var children = [];

    if (hasValue(embedUrl)) {
      var frame = document.createElement("div");
      frame.className = "survey-frame";
      var iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.title = "Student feedback survey";
      iframe.loading = "lazy";
      frame.appendChild(iframe);
      children.push(frame);
    } else {
      children.push(createPlaceholder("Microsoft Forms embed URL is not configured yet."));
    }

    if (hasValue(directUrl)) {
      var fallback = document.createElement("p");
      fallback.appendChild(createLink(directUrl, "Open the student survey directly"));
      children.push(fallback);
    } else {
      var fallbackNote = document.createElement("p");
      fallbackNote.className = "placeholder-message";
      fallbackNote.textContent = "Microsoft Forms direct fallback URL is not configured yet.";
      children.push(fallbackNote);
    }

    slot.replaceChildren.apply(slot, children);
  }

  function renderInfographic() {
    var slot = document.querySelector("[data-infographic-slot]");
    if (!slot) {
      return;
    }

    var configuredPath = visualConfig.infographicPath || "";
    if (!hasValue(configuredPath)) {
      return;
    }

    var probe = new Image();
    probe.onload = function () {
      var image = document.createElement("img");
      image.src = configuredPath;
      image.alt = "Right triangle diagram showing square areas on the legs combining to match the square on the hypotenuse.";
      var caption = slot.querySelector("figcaption");
      if (caption) {
        slot.replaceChildren(image, caption);
      } else {
        slot.replaceChildren(image);
      }
    };
    probe.src = configuredPath;
  }

  function setActiveSection(id) {
    sectionLinks.forEach(function (link) {
      if (link.getAttribute("href") === "#" + id) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  sectionLinks.forEach(function (link) {
    link.addEventListener("focus", function () {
      var id = link.getAttribute("href");
      if (id) {
        setActiveSection(id.slice(1));
      }
    });
  });

  renderTeacherVideo();
  renderSurveySlot();
  renderInfographic();

  if (window.location.hash) {
    setActiveSection(window.location.hash.slice(1));
  } else if (sections.length) {
    setActiveSection(sections[0].id);
  }

  if (!("IntersectionObserver" in window)) {
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    },
    {
      rootMargin: "-35% 0px -55% 0px",
      threshold: 0
    }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
})();
