// ==========================================
// NEXVILO LANGUAGE SWITCHER
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const languageToggle = document.getElementById("languageToggle");
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.querySelector(".nav-links");

    // Change website language
    function setLanguage(language) {
        const dictionary = translations[language];

        if (!dictionary) {
            console.error("Language not found:", language);
            return;
        }

        document.documentElement.lang = language;

        document.querySelectorAll("[data-i18n]").forEach((element) => {
            const key = element.dataset.i18n;

            if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
                element.innerHTML = dictionary[key];
            } else {
                console.warn("Missing translation:", key);
            }
        });

        if (languageToggle) {
            languageToggle.textContent = language === "it" ? "EN" : "IT";
        }

        localStorage.setItem("nexvilo-language", language);
    }

    // Language button
    if (languageToggle) {
        languageToggle.addEventListener("click", () => {
            const currentLanguage = document.documentElement.lang || "it";
            const nextLanguage = currentLanguage === "it" ? "en" : "it";

            setLanguage(nextLanguage);
        });
    }

    // Mobile menu
    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
            const isOpen = navLinks.classList.toggle("open");

            menuToggle.textContent = isOpen ? "✕" : "☰";
            menuToggle.setAttribute("aria-expanded", String(isOpen));
        });

        navLinks.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("open");
                menuToggle.textContent = "☰";
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    // Load saved language
    const savedLanguage = localStorage.getItem("nexvilo-language");

    const initialLanguage =
        savedLanguage && translations[savedLanguage]
            ? savedLanguage
            : "it";

    setLanguage(initialLanguage);

    // ==========================================
    // NEXVILO SCROLL REVEAL
    // ==========================================

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const elements = document.querySelectorAll(
        ".section-heading, .service-card, .portfolio-card, .about-content, .about-stat, .contact > *"
    );

    if (reduceMotion || !("IntersectionObserver" in window)) {
        elements.forEach((element) => {
            element.classList.add("visible");
        });
    } else {
        elements.forEach((element) => {
            element.classList.add("reveal");
        });

        const observer = new IntersectionObserver(
            (entries, currentObserver) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        currentObserver.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -40px 0px"
            }
        );

        elements.forEach((element) => {
            observer.observe(element);
        });
    }
});