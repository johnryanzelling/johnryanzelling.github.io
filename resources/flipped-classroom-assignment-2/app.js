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
  var storageKey = "flipped-classroom-assignment-2-progress";
  var storageAvailable = canUseLocalStorage();
  var memoryProgress = defaultProgress();
  var progress = loadProgress();

  var feedbackMessages = {
    "prereq-square-area": {
      blank: "Try an area value before checking. Use side length times side length.",
      correct: "Correct. A square with side length 5 has area 25 square units.",
      retry: "Not yet. For a square, multiply the side length by itself."
    },
    "prereq-square-side": {
      blank: "Try a side length before checking. Think about which number times itself gives 64.",
      correct: "Correct. The positive side length is 8 units.",
      retry: "Not yet. Look for the positive whole number whose square is 64."
    },
    "prereq-triangle-area": {
      blank: "Try an area value before checking. A right triangle is half of a matching rectangle.",
      correct: "Correct. Half of 6 times 4 is 12 square units.",
      retry: "Not yet. Multiply base times height, then take half."
    },
    "prereq-equation": {
      blank: "Try the positive side length before checking.",
      correct: "Correct. The positive value that squares to 49 is 7.",
      retry: "Not yet. Think of the positive whole number whose square is 49."
    },
    "prereq-hypotenuse": {
      blank: "Choose one side before checking. Look for the side across from the right angle.",
      correct: "Correct. The hypotenuse is opposite the right angle.",
      retry: "Not yet. The hypotenuse is the side directly across from the right-angle marker."
    },
    "ready-hypotenuse": {
      blank: "Choose one side before checking. Find the side opposite the right angle.",
      correct: "Correct. You identified the hypotenuse.",
      retry: "Not yet. Look across from the right-angle marker, not along the two legs."
    },
    "ready-four-squared": {
      blank: "Try a value before checking. Squared means multiply the number by itself.",
      correct: "Correct. 4 squared is 16.",
      retry: "Not yet. 4 squared means 4 times 4."
    },
    "ready-side-length": {
      blank: "Try a side length before checking. Which whole number has a square of 81?",
      correct: "Correct. The side length is 9 units.",
      retry: "Not yet. Look for the positive whole number whose square is 81."
    },
    "ready-hypotenuse-length": {
      blank: "Try the hypotenuse length before checking.",
      correct: "Correct. With legs 6 and 8, the hypotenuse is 10.",
      retry: "Not yet. Square both legs, add those areas, then find the positive side length."
    },
    "ready-class-question": {
      blank: "Write one question or idea before saving.",
      correct: "Saved locally. Bring this question or idea to class.",
      retry: ""
    }
  };

  var escapeHintMessages = {
    1: {
      blank: "Choose a side for every triangle before trying the lock.",
      retry: "Hint: start at each right-angle marker, then look directly across the triangle. The hypotenuse can be horizontal, vertical, or slanted."
    },
    2: {
      blank: "Complete every square and square-root match before trying the lock.",
      retry: "Hint: squaring moves from side length to area. Square root moves from area back to side length."
    },
    3: {
      blank: "Show substitution, squaring, addition, and the positive square root for all three triangles.",
      retry: "Hint: check the order of your work. Substitute the legs first, square them, add the square areas, then take the positive square root."
    },
    4: {
      blank: "Show both comparison values and choose yes or no for every set of side lengths.",
      retry: "Hint: a yes-or-no answer is not enough. Compare a squared plus b squared with c squared for each set."
    },
    5: {
      blank: "Solve all three real-world distances before revealing the completion code.",
      retry: "Hint: each situation is a right-triangle hypotenuse problem. Square the two legs, add, then take the positive square root."
    }
  };

  var escapeSuccessMessages = {
    1: "Lock 1 opened. You identified the side opposite the right angle in each orientation.",
    2: "Lock 2 opened. You connected side lengths and square areas in both directions.",
    3: "Lock 3 opened. Your work shows substitution, squaring, addition, and the positive square root.",
    4: "Lock 4 opened. Your comparisons support each right-triangle decision.",
    5: "Final challenge complete. Your completion code is 10-15-13."
  };

  document.documentElement.classList.add("lesson-js");
  document.documentElement.dataset.lessonTitle = config.title || "Unlocking the Pythagorean Theorem";

  function defaultProgress() {
    return {
      prerequisiteComplete: false,
      readinessComplete: false,
      currentSection: "lesson-overview",
      openResponse: "",
      escapeRoom: defaultEscapeProgress()
    };
  }

  function defaultEscapeProgress() {
    return {
      currentStep: 1,
      completedSteps: [],
      finalCode: ""
    };
  }

  function canUseLocalStorage() {
    try {
      var testKey = storageKey + "-test";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function sanitizeProgress(candidate) {
    var clean = defaultProgress();
    if (!candidate || typeof candidate !== "object") {
      return clean;
    }
    clean.prerequisiteComplete = candidate.prerequisiteComplete === true;
    clean.readinessComplete = candidate.readinessComplete === true;
    clean.currentSection = hasValue(candidate.currentSection) ? candidate.currentSection : clean.currentSection;
    clean.openResponse = hasValue(candidate.openResponse) ? candidate.openResponse.slice(0, 500) : "";
    clean.escapeRoom = sanitizeEscapeProgress(candidate.escapeRoom);
    return clean;
  }

  function sanitizeEscapeProgress(candidate) {
    var clean = defaultEscapeProgress();
    if (!candidate || typeof candidate !== "object") {
      return clean;
    }

    var completed = Array.isArray(candidate.completedSteps) ? candidate.completedSteps : [];
    completed.forEach(function (step) {
      var numericStep = Number(step);
      if (numericStep >= 1 && numericStep <= 5 && clean.completedSteps.indexOf(numericStep) === -1) {
        clean.completedSteps.push(numericStep);
      }
    });
    clean.completedSteps.sort(function (a, b) {
      return a - b;
    });

    var requestedStep = Number(candidate.currentStep);
    var nextIncomplete = 1;
    while (nextIncomplete <= 5 && clean.completedSteps.indexOf(nextIncomplete) !== -1) {
      nextIncomplete += 1;
    }
    clean.currentStep = Number.isFinite(requestedStep)
      ? Math.max(1, Math.min(6, requestedStep))
      : nextIncomplete;
    clean.currentStep = Math.max(clean.currentStep, nextIncomplete);
    if (clean.completedSteps.indexOf(5) !== -1) {
      clean.currentStep = 6;
      clean.finalCode = "10-15-13";
    } else if (hasValue(candidate.finalCode)) {
      clean.finalCode = candidate.finalCode.slice(0, 40);
    }

    return clean;
  }

  function loadProgress() {
    if (!storageAvailable) {
      return memoryProgress;
    }
    try {
      var raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return defaultProgress();
      }
      return sanitizeProgress(JSON.parse(raw));
    } catch (error) {
      storageAvailable = false;
      return memoryProgress;
    }
  }

  function saveProgress() {
    progress = sanitizeProgress(progress);
    memoryProgress = progress;
    if (!storageAvailable) {
      updateStorageNotice();
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch (error) {
      storageAvailable = false;
      updateStorageNotice();
    }
  }

  function clearStoredProgress() {
    progress = defaultProgress();
    memoryProgress = progress;
    if (storageAvailable) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch (error) {
        storageAvailable = false;
      }
    }
  }

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
    var embedUrl = teacherVideoConfig.embedUrl || "";
    var transcriptPath = teacherVideoConfig.transcriptPath || "";
    var captionsPath = teacherVideoConfig.captionsPath || "";
    var posterImagePath = teacherVideoConfig.posterImagePath || "";

    if (!hasValue(videoSource) && !hasValue(embedUrl)) {
      slot.replaceChildren(
        createPlaceholder(
          "Teacher Camtasia video is not configured yet. Add a source or public embed URL, poster image, captions, and transcript paths in lesson-config.js when the final files are ready."
        )
      );
      return;
    }

    if (hasValue(embedUrl)) {
      var embedFrame = document.createElement("div");
      embedFrame.className = "teacher-embed-frame";
      var iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.title = "Teacher-created Pythagorean theorem mini lesson";
      iframe.loading = "lazy";
      iframe.allow = "fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      embedFrame.appendChild(iframe);

      var embedSupportLinks = document.createElement("div");
      embedSupportLinks.className = "video-support-links";
      embedSupportLinks.appendChild(createLink(embedUrl, "Open teacher video directly"));

      if (hasValue(transcriptPath)) {
        embedSupportLinks.appendChild(createLink(transcriptPath, "Open transcript"));
      } else {
        var embedTranscriptNote = document.createElement("span");
        embedTranscriptNote.textContent = "Transcript not configured yet.";
        embedSupportLinks.appendChild(embedTranscriptNote);
      }

      slot.replaceChildren(embedFrame, embedSupportLinks);
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

  function normalizeAnswer(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function getCardResponse(card) {
    var openInput = card.querySelector("[data-open-response-input]");
    if (openInput) {
      return openInput.value.trim();
    }

    var checked = card.querySelector("input[type='radio'][data-answer-input]:checked");
    if (checked) {
      return checked.value;
    }

    if (card.querySelector("input[type='radio'][data-answer-input]")) {
      return "";
    }

    var input = card.querySelector("[data-answer-input]");
    return input ? input.value : "";
  }

  function setFeedback(card, state, message) {
    var feedback = card.querySelector("[data-feedback]");
    if (!feedback) {
      return;
    }
    feedback.textContent = message;
    feedback.classList.remove("is-correct", "needs-retry");
    card.classList.remove("is-correct", "needs-retry");

    if (state === "correct") {
      feedback.classList.add("is-correct");
      card.classList.add("is-correct");
    } else if (state === "retry") {
      feedback.classList.add("needs-retry");
      card.classList.add("needs-retry");
    }
  }

  function checkQuestion(card) {
    var questionId = card.getAttribute("data-question-id") || "";
    var messages = feedbackMessages[questionId] || {
      blank: "Try a response before checking.",
      correct: "Correct.",
      retry: "Not yet. Try again using the lesson notes."
    };
    var response = getCardResponse(card);
    var isOpenResponse = card.getAttribute("data-open-response") === "true";

    if (!hasValue(response)) {
      card.dataset.complete = "false";
      setFeedback(card, "retry", messages.blank);
      updateActivityFromCard(card);
      return false;
    }

    if (isOpenResponse) {
      progress.openResponse = response.slice(0, 500);
      card.dataset.complete = "true";
      setFeedback(card, "correct", messages.correct);
      updateActivityFromCard(card);
      saveProgress();
      updateProgressUi();
      return true;
    }

    if (normalizeAnswer(response) === normalizeAnswer(card.getAttribute("data-answer"))) {
      card.dataset.complete = "true";
      setFeedback(card, "correct", messages.correct);
      updateActivityFromCard(card);
      return true;
    }

    card.dataset.complete = "false";
    setFeedback(card, "retry", messages.retry);
    updateActivityFromCard(card);
    return false;
  }

  function updateActivityFromCard(card) {
    var activity = card.closest("[data-activity]");
    if (!activity) {
      return;
    }
    var activityName = activity.getAttribute("data-activity");
    var cards = Array.prototype.slice.call(activity.querySelectorAll("[data-question-id]"));
    var isComplete = cards.length > 0 && cards.every(function (item) {
      return item.dataset.complete === "true";
    });

    if (activityName === "prerequisite" && isComplete) {
      progress.prerequisiteComplete = true;
    }
    if (activityName === "readiness" && isComplete) {
      progress.readinessComplete = true;
    }

    saveProgress();
    updateProgressUi();
  }

  function updateStorageNotice() {
    var storageStatus = document.querySelector("#storage-status");
    if (!storageStatus) {
      return;
    }
    if (storageAvailable) {
      storageStatus.textContent =
        "This lesson stores only local progress, the current section, and your class question in this browser. It does not collect names, emails, cookies, analytics, or personal data. Responses are not transmitted to the teacher.";
    } else {
      storageStatus.textContent =
        "Local storage is unavailable, so progress can be used during this visit but may not survive a refresh. Responses are still not transmitted to the teacher.";
    }
  }

  function updateActivityStatus(name, isComplete) {
    var status = document.querySelector("[data-activity-status='" + name + "']");
    if (!status) {
      return;
    }
    status.textContent = isComplete ? "Complete in this browser" : "Not complete yet";
    status.classList.toggle("is-complete", isComplete);
  }

  function updateProgressUi() {
    updateStorageNotice();
    updateActivityStatus("prerequisite", progress.prerequisiteComplete);
    updateActivityStatus("readiness", progress.readinessComplete);

    var summary = document.querySelector("[data-completion-summary]");
    if (summary) {
      var currentLabel =
        document.querySelector("[data-section-link][href='#" + progress.currentSection + "']")?.textContent || "Overview";
      summary.textContent =
        "Prerequisite review: " +
        (progress.prerequisiteComplete ? "complete" : "not complete yet") +
        ". Readiness check: " +
        (progress.readinessComplete ? "complete" : "not complete yet") +
        ". Last section: " +
        currentLabel +
        ".";
    }

    var responseSummary = document.querySelector("[data-open-response-summary]");
    if (responseSummary) {
      responseSummary.textContent = hasValue(progress.openResponse)
        ? "Question for class: " + progress.openResponse
        : "Question for class: not recorded yet.";
    }

    updateEscapeRoomUi();
  }

  function restoreOpenResponse() {
    var input = document.querySelector("[data-open-response-input]");
    if (input && hasValue(progress.openResponse)) {
      input.value = progress.openResponse;
    }
  }

  function setupPractice() {
    Array.prototype.slice.call(document.querySelectorAll("[data-question-id]")).forEach(function (card) {
      var feedback = card.querySelector("[data-feedback]");
      var feedbackId = feedback ? feedback.id : "";
      Array.prototype.slice.call(card.querySelectorAll("[data-answer-input]")).forEach(function (input) {
        if (feedbackId) {
          input.setAttribute("aria-describedby", feedbackId);
        }
      });
    });

    Array.prototype.slice.call(document.querySelectorAll("[data-check-question]")).forEach(function (button) {
      setupButtonKeyboardActivation(button);
      button.addEventListener("click", function () {
        var card = button.closest("[data-question-id]");
        if (card) {
          checkQuestion(card);
        }
      });
    });

    var openResponse = document.querySelector("[data-open-response-input]");
    if (openResponse) {
      openResponse.addEventListener("input", function () {
        progress.openResponse = openResponse.value.trim().slice(0, 500);
        saveProgress();
        updateProgressUi();
      });
    }

    var resetButton = document.querySelector("[data-reset-progress]");
    if (resetButton) {
      setupButtonKeyboardActivation(resetButton);
      resetButton.addEventListener("click", resetLessonProgress);
    }
  }

  function setupButtonKeyboardActivation(button) {
    button.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " " || event.key === "Space" || event.key === "Spacebar") {
        event.preventDefault();
        button.click();
      }
    });
  }

  function resetLessonProgress() {
    var confirmed = window.confirm(
      "Reset local lesson progress for this browser? This clears completion status and your saved class question."
    );
    var feedback = document.querySelector("[data-reset-feedback]");
    if (!confirmed) {
      if (feedback) {
        feedback.textContent = "Reset canceled. Your local progress is unchanged.";
      }
      return;
    }

    clearStoredProgress();
    Array.prototype.slice.call(document.querySelectorAll("[data-question-id]")).forEach(function (card) {
      card.dataset.complete = "false";
      card.classList.remove("is-correct", "needs-retry");
      var feedbackNode = card.querySelector("[data-feedback]");
      if (feedbackNode) {
        feedbackNode.textContent = "";
        feedbackNode.classList.remove("is-correct", "needs-retry");
      }
      Array.prototype.slice.call(card.querySelectorAll("[data-answer-input]")).forEach(function (input) {
        if (input.type === "radio") {
          input.checked = false;
        } else {
          input.value = "";
        }
      });
    });
    resetEscapeInputs();
    updateProgressUi();
    if (feedback) {
      feedback.textContent = "Local lesson progress has been reset.";
    }
  }

  function setupGuidedNotesPrint() {
    var printButton = document.querySelector("[data-print-guided-notes]");
    if (!printButton) {
      return;
    }
    setupButtonKeyboardActivation(printButton);
    printButton.addEventListener("click", function () {
      var notesUrl = "assets/downloads/pythagorean-guided-notes.html";
      var notesWindow = window.open(notesUrl, "_blank", "noopener");
      if (!notesWindow) {
        window.location.href = notesUrl;
        return;
      }
      notesWindow.addEventListener("load", function () {
        notesWindow.print();
      });
    });
  }

  function setupEscapeRoom() {
    var room = document.querySelector("[data-escape-room]");
    if (!room) {
      return;
    }

    Array.prototype.slice.call(room.querySelectorAll("[data-escape-input]")).forEach(function (input) {
      var lock = input.closest("[data-escape-lock]");
      var feedback = lock ? lock.querySelector("[data-escape-feedback]") : null;
      if (feedback && feedback.id) {
        input.setAttribute("aria-describedby", feedback.id);
      }
    });

    Array.prototype.slice.call(room.querySelectorAll("[data-check-lock]")).forEach(function (button) {
      setupButtonKeyboardActivation(button);
      button.addEventListener("click", function () {
        checkEscapeLock(Number(button.getAttribute("data-check-lock")));
      });
    });

    var resetButton = document.querySelector("[data-reset-escape-room]");
    if (resetButton) {
      setupButtonKeyboardActivation(resetButton);
      resetButton.addEventListener("click", resetEscapeRoomProgress);
    }

    var printButton = document.querySelector("[data-print-escape-summary]");
    if (printButton) {
      setupButtonKeyboardActivation(printButton);
      printButton.addEventListener("click", function () {
        window.print();
      });
    }

    updateEscapeRoomUi();
  }

  function getEscapeProgress() {
    progress.escapeRoom = sanitizeEscapeProgress(progress.escapeRoom);
    return progress.escapeRoom;
  }

  function updateEscapeRoomUi() {
    var room = document.querySelector("[data-escape-room]");
    if (!room) {
      return;
    }

    var escapeProgress = getEscapeProgress();
    updateEscapeStorageNotice();

    Array.prototype.slice.call(room.querySelectorAll("[data-escape-lock]")).forEach(function (lock) {
      var step = Number(lock.getAttribute("data-escape-lock"));
      var isComplete = escapeProgress.completedSteps.indexOf(step) !== -1;
      var isCurrent = escapeProgress.currentStep === step;
      var isLocked = !isComplete && !isCurrent;
      var fieldset = lock.querySelector("[data-escape-fieldset]");
      var button = lock.querySelector("[data-check-lock]");
      var status = lock.querySelector("[data-escape-lock-status]");

      lock.classList.toggle("is-complete", isComplete);
      lock.classList.toggle("is-locked", isLocked);
      lock.setAttribute("aria-disabled", isLocked ? "true" : "false");

      if (fieldset) {
        fieldset.disabled = isLocked || isComplete;
      }
      if (button) {
        button.disabled = isLocked || isComplete;
      }
      if (status) {
        status.textContent = isComplete ? "Open" : isCurrent ? "Ready" : "Locked";
        status.classList.toggle("is-complete", isComplete);
      }
    });

    Array.prototype.slice.call(document.querySelectorAll("[data-escape-step-status]")).forEach(function (item) {
      var step = Number(item.getAttribute("data-escape-step-status"));
      var isComplete = escapeProgress.completedSteps.indexOf(step) !== -1;
      var isCurrent = escapeProgress.currentStep === step;
      item.classList.toggle("is-complete", isComplete);
      item.classList.toggle("is-current", isCurrent);
      item.textContent =
        step === 5
          ? "Final Challenge" + (isComplete ? " open" : isCurrent ? " ready" : " locked")
          : "Lock " + step + (isComplete ? " open" : isCurrent ? " ready" : " locked");
    });

    var progressText = document.querySelector("[data-escape-progress-text]");
    if (progressText) {
      if (escapeProgress.completedSteps.indexOf(5) !== -1) {
        progressText.textContent = "All locks are open. Completion code: 10-15-13.";
      } else {
        progressText.textContent = "Current step: " + (escapeProgress.currentStep === 5 ? "Final Challenge" : "Lock " + escapeProgress.currentStep) + ".";
      }
    }

    var summary = document.querySelector("[data-escape-completion-summary]");
    if (summary) {
      summary.hidden = escapeProgress.completedSteps.indexOf(5) === -1;
    }
    var finalCode = document.querySelector("[data-final-code]");
    if (finalCode) {
      finalCode.textContent = escapeProgress.finalCode || "10-15-13";
    }
  }

  function updateEscapeStorageNotice() {
    var notice = document.querySelector("[data-escape-storage-status]");
    if (!notice) {
      return;
    }
    if (storageAvailable) {
      notice.textContent =
        "Escape-room progress is stored only in this browser. No names, emails, or answers are sent to the teacher.";
    } else {
      notice.textContent =
        "Local storage is unavailable, so escape-room progress can be used during this visit but may not survive a refresh. No names, emails, or answers are sent to the teacher.";
    }
  }

  function collectEscapeResponses(lock) {
    var responses = [];
    var seenRadioGroups = {};
    Array.prototype.slice.call(lock.querySelectorAll("[data-escape-input]")).forEach(function (input) {
      if (input.type === "radio") {
        if (seenRadioGroups[input.name]) {
          return;
        }
        seenRadioGroups[input.name] = true;
        var selected = lock.querySelector("input[type='radio'][name='" + input.name + "']:checked");
        responses.push({
          value: selected ? selected.value : "",
          answer: input.getAttribute("data-answer") || "",
          input: input
        });
        return;
      }
      responses.push({
        value: input.value,
        answer: input.getAttribute("data-answer") || "",
        input: input
      });
    });
    return responses;
  }

  function validateEscapeLock(lock) {
    var responses = collectEscapeResponses(lock);
    var blankResponses = responses.filter(function (response) {
      return !hasValue(response.value);
    });
    var incorrectResponses = responses.filter(function (response) {
      return hasValue(response.value) && normalizeAnswer(response.value) !== normalizeAnswer(response.answer);
    });
    return {
      isComplete: responses.length > 0 && blankResponses.length === 0 && incorrectResponses.length === 0,
      hasBlank: blankResponses.length > 0,
      hasIncorrect: incorrectResponses.length > 0
    };
  }

  function checkEscapeLock(step) {
    var escapeProgress = getEscapeProgress();
    var lock = document.querySelector("[data-escape-lock='" + step + "']");
    if (!lock) {
      return false;
    }

    var feedback = lock.querySelector("[data-escape-feedback]");
    if (step !== escapeProgress.currentStep) {
      if (feedback) {
        feedback.textContent = "This lock is not the current step. Open the locks in order.";
        feedback.classList.add("needs-retry");
      }
      return false;
    }

    var result = validateEscapeLock(lock);
    var messages = escapeHintMessages[step] || {
      blank: "Complete every part before trying the lock.",
      retry: "Check your reasoning and try again."
    };

    if (!result.isComplete) {
      if (feedback) {
        feedback.textContent = result.hasBlank ? messages.blank : messages.retry;
        feedback.classList.remove("is-correct");
        feedback.classList.add("needs-retry");
      }
      lock.classList.remove("is-correct");
      lock.classList.add("needs-retry");
      return false;
    }

    completeEscapeStep(step);
    if (feedback) {
      feedback.textContent = escapeSuccessMessages[step] || "Lock opened.";
      feedback.classList.remove("needs-retry");
      feedback.classList.add("is-correct");
    }
    lock.classList.remove("needs-retry");
    lock.classList.add("is-correct");
    return true;
  }

  function completeEscapeStep(step) {
    var escapeProgress = getEscapeProgress();
    if (escapeProgress.completedSteps.indexOf(step) === -1) {
      escapeProgress.completedSteps.push(step);
    }
    escapeProgress.completedSteps.sort(function (a, b) {
      return a - b;
    });
    escapeProgress.currentStep = step >= 5 ? 6 : Math.max(step + 1, escapeProgress.currentStep);
    if (step === 5) {
      escapeProgress.finalCode = "10-15-13";
    }
    progress.escapeRoom = escapeProgress;
    saveProgress();
    updateEscapeRoomUi();
  }

  function resetEscapeInputs() {
    var room = document.querySelector("[data-escape-room]");
    if (!room) {
      return;
    }
    Array.prototype.slice.call(room.querySelectorAll("[data-escape-input]")).forEach(function (input) {
      if (input.type === "radio") {
        input.checked = false;
      } else {
        input.value = "";
      }
    });
    Array.prototype.slice.call(room.querySelectorAll("[data-escape-feedback]")).forEach(function (feedback) {
      feedback.textContent = "";
      feedback.classList.remove("is-correct", "needs-retry");
    });
    Array.prototype.slice.call(room.querySelectorAll("[data-escape-lock]")).forEach(function (lock) {
      lock.classList.remove("is-correct", "needs-retry");
    });
  }

  function resetEscapeRoomProgress() {
    var confirmed = window.confirm(
      "Reset escape-room progress for this browser? This clears opened locks and the completion code."
    );
    var feedback = document.querySelector("[data-escape-reset-feedback]");
    if (!confirmed) {
      if (feedback) {
        feedback.textContent = "Reset canceled. Escape-room progress is unchanged.";
      }
      return;
    }

    progress.escapeRoom = defaultEscapeProgress();
    resetEscapeInputs();
    saveProgress();
    updateEscapeRoomUi();
    if (feedback) {
      feedback.textContent = "Escape-room progress has been reset.";
    }
  }

  function setActiveSection(id) {
    sectionLinks.forEach(function (link) {
      if (link.getAttribute("href") === "#" + id) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    if (hasValue(id) && progress.currentSection !== id) {
      progress.currentSection = id;
      saveProgress();
      updateProgressUi();
    }
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
  restoreOpenResponse();
  setupPractice();
  setupGuidedNotesPrint();
  setupEscapeRoom();
  updateProgressUi();

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
