document.addEventListener("DOMContentLoaded", () => {
  const languageToggle = document.getElementById("languageToggle");
  const menuToggle = document.getElementById("menuToggle");
  const navPanel = document.getElementById("primaryNavigation");
  const year = document.getElementById("currentYear");
  const contactForm = document.getElementById("contactForm");
  const contactSubmit = document.getElementById("contactSubmit");
  const contactSubmitLabel = document.getElementById("contactSubmitLabel");
  const contactFormStatus = document.getElementById("contactFormStatus");
  const whatsappLink = document.getElementById("whatsappLink");
  const contactFieldErrors = new Map();
  let contactStatusKey = "";
  let contactStatusType = "";
  let isSubmittingContactForm = false;

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
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const value = dictionary[element.dataset.i18nPlaceholder];
      if (typeof value === "string") element.setAttribute("placeholder", value);
    });

    if (languageToggle) languageToggle.textContent = language === "it" ? "EN" : "IT";
    updateWhatsAppLink(dictionary);
    renderContactFormState();
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

  function currentDictionary() {
    return translations[document.documentElement.lang] || translations.it;
  }

  function updateWhatsAppLink(dictionary) {
    if (!whatsappLink) return;
    const number = whatsappLink.dataset.whatsappNumber;
    const message = dictionary.contactWhatsappMessage;
    if (number && message) whatsappLink.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function renderContactFormState() {
    if (!contactForm) return;
    const dictionary = currentDictionary();
    contactFieldErrors.forEach((key, fieldName) => {
      const error = contactForm.querySelector(`[data-field-error="${fieldName}"]`);
      const field = contactForm.elements.namedItem(fieldName);
      if (!error || !field) return;
      error.textContent = dictionary[key] || dictionary.contactStatusValidationError;
      error.hidden = false;
      field.setAttribute("aria-invalid", "true");
    });

    if (contactFormStatus) {
      contactFormStatus.textContent = contactStatusKey ? (dictionary[contactStatusKey] || dictionary.contactStatusError) : "";
      contactFormStatus.hidden = !contactStatusKey;
      contactFormStatus.className = `form-status${contactStatusType ? ` is-${contactStatusType}` : ""}`;
    }

    if (contactSubmit && contactSubmitLabel) {
      contactSubmit.disabled = isSubmittingContactForm;
      contactSubmit.setAttribute("aria-busy", String(isSubmittingContactForm));
      contactSubmitLabel.innerHTML = isSubmittingContactForm ? dictionary.contactSubmitting : dictionary.contactSubmit;
    }
  }

  function setFieldError(fieldName, key) {
    contactFieldErrors.set(fieldName, key);
    renderContactFormState();
  }

  function clearFieldError(fieldName) {
    if (!contactForm || !contactFieldErrors.has(fieldName)) return;
    contactFieldErrors.delete(fieldName);
    const error = contactForm.querySelector(`[data-field-error="${fieldName}"]`);
    const field = contactForm.elements.namedItem(fieldName);
    if (error) {
      error.textContent = "";
      error.hidden = true;
    }
    if (field) field.removeAttribute("aria-invalid");
    if (!contactFieldErrors.size && contactStatusKey === "contactStatusValidationError") {
      contactStatusKey = "";
      contactStatusType = "";
      renderContactFormState();
    }
  }

  function validateContactForm() {
    if (!contactForm) return false;
    contactFieldErrors.clear();
    contactForm.querySelectorAll("[data-field-error]").forEach((error) => {
      error.textContent = "";
      error.hidden = true;
    });
    contactForm.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid"));

    const name = contactForm.elements.name;
    const email = contactForm.elements.email;
    const service = contactForm.elements.service;
    const message = contactForm.elements.message;

    if (!name.value.trim() || name.value.trim().length < 2) setFieldError("name", "contactErrorNameRequired");
    if (!email.value.trim()) setFieldError("email", "contactErrorEmailRequired");
    else if (!email.validity.valid) setFieldError("email", "contactErrorEmailInvalid");
    if (!service.value) setFieldError("service", "contactErrorServiceRequired");
    if (!message.value.trim()) setFieldError("message", "contactErrorMessageRequired");
    else if (message.value.trim().length < 10) setFieldError("message", "contactErrorMessageShort");

    if (contactFieldErrors.size) {
      contactStatusKey = "contactStatusValidationError";
      contactStatusType = "error";
      renderContactFormState();
      return false;
    }

    contactStatusKey = "";
    contactStatusType = "";
    renderContactFormState();
    return true;
  }

  if (contactForm) {
    contactForm.addEventListener("input", (event) => {
      if (["name", "email", "message"].includes(event.target.name)) clearFieldError(event.target.name);
    });
    contactForm.addEventListener("change", (event) => {
      if (event.target.name === "service") clearFieldError("service");
    });
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSubmittingContactForm || !validateContactForm()) return;

      isSubmittingContactForm = true;
      contactStatusKey = "contactSubmitting";
      contactStatusType = "loading";
      renderContactFormState();

      try {
        const response = await fetch(contactForm.action, {
          method: "POST",
          body: new FormData(contactForm),
          headers: { Accept: "application/json" },
          credentials: "same-origin"
        });
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json") ? await response.json() : null;
        if (!response.ok || !payload || payload.ok !== true) {
          const error = new Error("Contact form request failed");
          error.code = payload && payload.error;
          throw error;
        }

        contactForm.reset();
        contactFieldErrors.clear();
        contactStatusKey = "contactStatusSuccess";
        contactStatusType = "success";
      } catch (error) {
        contactStatusKey = error.code === "rate_limited"
          ? "contactStatusRateLimited"
          : error.code === "payload_too_large"
            ? "contactStatusPayloadTooLarge"
            : error.code === "validation_error"
              ? "contactStatusValidationError"
              : "contactStatusError";
        contactStatusType = "error";
      } finally {
        isSubmittingContactForm = false;
        renderContactFormState();
      }
    });
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
    ".section-intro, .service-card, .capability-strip > *, .portfolio-card, .process-list li, .founder-portrait, .about-copy, .founder-note, .insight-grid article, .contact > *"
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
