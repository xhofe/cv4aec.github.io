document.addEventListener("DOMContentLoaded", () => {
  // Open external links in a new tab + affordance
  document.querySelectorAll('a[href^="http://"], a[href^="https://"], a[href^="mailto:"]').forEach(link => {
    try {
      const url = new URL(link.href);
      if (url.hostname === window.location.hostname) return;
    } catch {
      return;
    }

    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.classList.add("link-external");

    const label = link.getAttribute("aria-label") || link.textContent.trim();
    if (label && !/opens in a new/i.test(label)) {
      link.setAttribute("aria-label", `${label} (opens in new tab)`);
    }
  });

  // Workshop archive dropdown (header + footer)
  const archiveDropdowns = document.querySelectorAll("[data-archive-dropdown]");

  const closeArchiveDropdown = dropdown => {
    const toggle = dropdown.querySelector(".archive-dropdown__toggle");
    const menu = dropdown.querySelector(".archive-dropdown__menu");
    dropdown.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (menu) menu.setAttribute("aria-hidden", "true");
  };

  const openArchiveDropdown = dropdown => {
    archiveDropdowns.forEach(other => {
      if (other !== dropdown) closeArchiveDropdown(other);
    });
    const toggle = dropdown.querySelector(".archive-dropdown__toggle");
    const menu = dropdown.querySelector(".archive-dropdown__menu");
    dropdown.classList.add("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    if (menu) menu.setAttribute("aria-hidden", "false");
  };

  archiveDropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector(".archive-dropdown__toggle");
    const menu = dropdown.querySelector(".archive-dropdown__menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (dropdown.classList.contains("is-open")) closeArchiveDropdown(dropdown);
      else openArchiveDropdown(dropdown);
    });

    menu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => closeArchiveDropdown(dropdown));
    });
  });

  document.addEventListener("click", event => {
    archiveDropdowns.forEach(dropdown => {
      if (!dropdown.classList.contains("is-open")) return;
      if (dropdown.contains(event.target)) return;
      closeArchiveDropdown(dropdown);
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    archiveDropdowns.forEach(dropdown => closeArchiveDropdown(dropdown));
  });

  // Sticky section nav (archives rendered in layout; sections cloned from header)
  const headerNav = document.querySelector(".page-header .site-nav");
  const stickyNavSections = document.getElementById("sticky-nav-sections");
  const stickyNav = document.getElementById("sticky-nav");
  const pageHeader = document.querySelector(".page-header");

  if (headerNav && stickyNavSections) {
    stickyNavSections.innerHTML = headerNav.innerHTML;
    stickyNavSections.querySelectorAll("a").forEach(link => {
      link.classList.remove("btn");
      link.classList.add("sticky-nav__link");
    });
  }

  if (pageHeader && stickyNav) {
    const headerObserver = new IntersectionObserver(
      ([entry]) => {
        stickyNav.hidden = entry.isIntersecting;
        document.body.classList.toggle("sticky-nav-visible", !entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px 0px 0px 0px" }
    );
    headerObserver.observe(pageHeader);
  }

  // Active section highlight in header + sticky nav
  const navLinks = document.querySelectorAll(
    ".page-header .site-nav:not(.site-nav--archives) a[href^='#'], #sticky-nav a[href^='#']"
  );
  const sectionIds = [...new Set(
    [...navLinks].map(link => link.getAttribute("href").slice(1)).filter(Boolean)
  )];
  const sections = sectionIds
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if (sections.length && navLinks.length) {
    const setActive = id => {
      navLinks.forEach(link => {
        const active = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    const sectionObserver = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.1, 0.25, 0.5] }
    );

    sections.forEach(section => sectionObserver.observe(section));
  }

  // Workshop day banner (June 3, 2026 — America/Denver)
  const workshopBanner = document.getElementById("workshop-day-banner");
  if (workshopBanner) {
    const dismissKey = "cv4aec-workshop-banner-dismissed";
    const todayDenver = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Denver",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    if (todayDenver === "2026-06-03" && sessionStorage.getItem(dismissKey) !== "1") {
      workshopBanner.hidden = false;
      document.body.classList.add("workshop-day-active");
    }

    workshopBanner.querySelector(".workshop-day-banner__dismiss")?.addEventListener("click", () => {
      workshopBanner.hidden = true;
      document.body.classList.remove("workshop-day-active");
      sessionStorage.setItem(dismissKey, "1");
    });
  }

  // Timeline: past / upcoming + countdown
  function parseTimelineDeadline(item) {
    const dateStr = item.dataset.date;
    if (!dateStr) return null;

    const time = item.dataset.deadlineTime;
    const tz = item.dataset.deadlineTz;
    if (time && tz) {
      const [hour, minute = 0] = time.split(":").map(Number);
      const [year, month, day] = dateStr.split("-").map(Number);
      let utc = Date.UTC(year, month - 1, day, hour, minute);
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      for (let attempt = 0; attempt < 4; attempt++) {
        const parts = formatter.formatToParts(new Date(utc));
        const read = type => parseInt(parts.find(p => p.type === type).value, 10);
        const deltaMinutes =
          (hour - read("hour")) * 60 +
          (minute - read("minute")) +
          (day - read("day")) * 24 * 60;
        if (Math.abs(deltaMinutes) < 1) break;
        utc += deltaMinutes * 60 * 1000;
      }

      return new Date(utc);
    }

    return new Date(`${dateStr}T23:59:59Z`);
  }

  function formatDeadlineUntil(item, date) {
    const time = item.dataset.deadlineTime;
    const tz = item.dataset.deadlineTz;
    if (time && tz) {
      const local = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
      return `(until ${local})`;
    }
    const utc = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
    return `(until ${utc} UTC)`;
  }

  function trackForTimelineItem(item) {
    const tag = item.querySelector(".timeline-tag");
    if (!tag) return null;
    if (tag.classList.contains("timeline-tag--challenge")) return "challenge";
    if (tag.classList.contains("timeline-tag--workshop")) return "challenge";
    if (tag.classList.contains("timeline-tag--paper")) {
      const label = (item.querySelector("p")?.textContent || "").toLowerCase();
      return label.includes("non-archival") ? "non-archival" : "archival";
    }
    return null;
  }

  function openDatesTrack(track) {
    const details = document.querySelector(`.dates-track[data-track="${track}"]`);
    if (details) details.open = true;
  }

  document.querySelectorAll(".timeline-section").forEach((section, sectionIndex) => {
    const items = section.querySelectorAll(".timeline-item");
    const labelEl = section.querySelector(".next-deadline-label");
    const countdownEl = section.querySelector(".next-deadline-countdown");
    const untilEl = section.querySelector(".next-deadline-until");
    if (!items.length || !labelEl || !countdownEl) return;

    const now = new Date();
    let nextItem = null;

    items.forEach(item => {
      const date = parseTimelineDeadline(item);

      if (date < now) {
        item.classList.add("past");
      } else if (!nextItem) {
        nextItem = { el: item, date };
        item.classList.add("upcoming");
      }
    });

    if (!nextItem) {
      labelEl.textContent = "All deadlines passed";
      countdownEl.textContent = "";
      if (untilEl) untilEl.textContent = "";
      return;
    }

    labelEl.textContent = nextItem.el.querySelector("p").textContent;
    if (untilEl) untilEl.textContent = formatDeadlineUntil(nextItem.el, nextItem.date);

    if (sectionIndex === 0 || section.id === "dates-timeline") {
      const track = trackForTimelineItem(nextItem.el);
      if (track) openDatesTrack(track);
    }

    function updateCountdown() {
      const diff = nextItem.date - new Date();
      if (diff <= 0) {
        countdownEl.textContent = "";
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);

      countdownEl.textContent = `— ${d}d ${h}h ${m}m`;
    }

    updateCountdown();
    setInterval(updateCountdown, 60000);
  });
});
