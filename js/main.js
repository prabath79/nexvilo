document.addEventListener("DOMContentLoaded", () => {
  const languageToggle = document.getElementById("languageToggle");
  const menuToggle = document.getElementById("menuToggle");
  const navPanel = document.getElementById("primaryNavigation");
  const year = document.getElementById("currentYear");

  if (year) year.textContent = new Date().getFullYear();

  function updateMenuLabel(language) {
    if (!menuToggle) return;
    const dictionary = translations[language];
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-label", isOpen ? dictionary.closeMenu : dictionary.openMenu);
  }

  function setLanguage(language) {
    const dictionary = translations[language];
    if (!dictionary) return;

    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = dictionary[element.dataset.i18n];
      if (typeof value === "string") element.innerHTML = value;
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const value = dictionary[element.dataset.i18nAriaLabel];
      if (typeof value === "string") element.setAttribute("aria-label", value);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
      const value = dictionary[element.dataset.i18nAlt];
      if (typeof value === "string") element.setAttribute("alt", value);
    });

    if (languageToggle) languageToggle.textContent = language === "it" ? "EN" : "IT";
    updateMenuLabel(language);

    try {
      localStorage.setItem("nexvilo-language", language);
    } catch (_) {
      // The site remains usable when browser storage is unavailable.
    }
  }

  function closeMenu() {
    if (!menuToggle || !navPanel) return;
    navPanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    updateMenuLabel(document.documentElement.lang || "it");
  }

  if (languageToggle) {
    languageToggle.addEventListener("click", () => {
      const nextLanguage = document.documentElement.lang === "it" ? "en" : "it";
      setLanguage(nextLanguage);
    });
  }

  if (menuToggle && navPanel) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navPanel.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      updateMenuLabel(document.documentElement.lang || "it");
    });

    navPanel.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 901px)").matches) closeMenu();
    });
  }

  let savedLanguage = "it";
  try {
    savedLanguage = localStorage.getItem("nexvilo-language") || "it";
  } catch (_) {
    // Italian is the default page language and SEO language.
  }
  setLanguage(translations[savedLanguage] ? savedLanguage : "it");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const elements = document.querySelectorAll(
    ".section-intro, .service-card, .capability-strip > *, .portfolio-card, .process-list li, .about-copy, .about-panel, .insight-grid article, .contact > *"
  );

  if (reduceMotion || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("visible"));
    return;
  }

  elements.forEach((element) => element.classList.add("reveal"));
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -24px" });
  elements.forEach((element) => observer.observe(element));
});
