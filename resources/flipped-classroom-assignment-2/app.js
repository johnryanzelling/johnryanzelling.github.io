(function () {
  var config = window.FlippedClassroomLesson || {};
  var sectionLinks = Array.prototype.slice.call(document.querySelectorAll("[data-section-link]"));
  var sections = sectionLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      return id ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  document.documentElement.classList.add("lesson-js");
  document.documentElement.dataset.lessonTitle = config.title || "Unlocking the Pythagorean Theorem";

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
