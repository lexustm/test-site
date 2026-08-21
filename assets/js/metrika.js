(() => {
  "use strict";

  const METRIKA_ID = 111842715;
  const CONSENT_KEY = "vibelink_analytics_consent_v1";
  const PRODUCTION_HOSTS = new Set(["vibelink.ru", "www.vibelink.ru"]);
  let metrikaLoaded = false;

  const readConsent = () => {
    try {
      return window.localStorage.getItem(CONSENT_KEY);
    } catch {
      return null;
    }
  };

  const saveConsent = (value) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      return;
    }
  };

  const loadMetrika = () => {
    if (metrikaLoaded) return;
    metrikaLoaded = true;

    (function (m, e, t, r, i, k, a) {
      m[i] =
        m[i] ||
        function () {
          (m[i].a = m[i].a || []).push(arguments);
        };
      m[i].l = 1 * new Date();
      for (let j = 0; j < document.scripts.length; j += 1) {
        if (document.scripts[j].src === r) return;
      }
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    })(
      window,
      document,
      "script",
      `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`,
      "ym",
    );

    window.ym(METRIKA_ID, "init", {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: window.location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  };

  const removeBanner = () => {
    document.querySelector("[data-cookie-consent]")?.remove();
  };

  const showBanner = () => {
    removeBanner();

    const banner = document.createElement("section");
    banner.className = "cookie-consent";
    banner.setAttribute("data-cookie-consent", "");
    banner.setAttribute("aria-label", "Настройки файлов cookie");
    banner.innerHTML = `
      <div class="cookie-consent-icon" aria-hidden="true">
        <svg viewBox="0 0 96 96" focusable="false">
          <defs>
            <linearGradient id="cookie-fill" x1="18" y1="15" x2="78" y2="82" gradientUnits="userSpaceOnUse">
              <stop stop-color="#f6c768"/>
              <stop offset="1" stop-color="#d98935"/>
            </linearGradient>
            <filter id="cookie-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#7c3aed" flood-opacity=".34"/>
            </filter>
            <mask id="cookie-bite">
              <rect width="96" height="96" fill="#fff"/>
              <circle cx="78" cy="18" r="10" fill="#000"/>
              <circle cx="86" cy="31" r="9" fill="#000"/>
              <circle cx="73" cy="5" r="7" fill="#000"/>
            </mask>
          </defs>
          <circle cx="48" cy="49" r="36" fill="url(#cookie-fill)" mask="url(#cookie-bite)" filter="url(#cookie-glow)"/>
          <circle cx="35" cy="34" r="4.4" fill="#774120"/>
          <circle cx="56" cy="29" r="3.6" fill="#774120"/>
          <circle cx="61" cy="51" r="4.8" fill="#774120"/>
          <circle cx="36" cy="58" r="3.7" fill="#774120"/>
          <circle cx="50" cy="69" r="3.2" fill="#774120"/>
          <path d="M27 45c3 2 5 2 8 0M45 43c2 2 4 2 6 0" fill="none" stroke="#bd742f" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
        </svg>
      </div>
      <div class="cookie-consent-copy">
        <h2>Сайту тоже нужны печеньки</h2>
        <p>Используем cookie, чтобы VIBELINK чувствовал себя хорошо, не болел и становился удобнее.</p>
      </div>
      <div class="cookie-consent-actions">
        <button class="cookie-consent-accept" type="button">Угостить сайт</button>
        <button class="cookie-consent-reject" type="button">Без печенек</button>
      </div>
    `;

    banner.querySelector(".cookie-consent-accept")?.addEventListener("click", () => {
      saveConsent("accepted");
      loadMetrika();
      removeBanner();
    });

    banner.querySelector(".cookie-consent-reject")?.addEventListener("click", () => {
      const wasAccepted = readConsent() === "accepted";
      saveConsent("rejected");
      removeBanner();
      if (wasAccepted && metrikaLoaded) window.location.reload();
    });

    document.body.appendChild(banner);
    window.requestAnimationFrame(() => banner.classList.add("is-visible"));
  };

  const addSettingsButton = () => {
    if (document.querySelector("[data-cookie-settings]")) return;
    const footer = document.querySelector(".footer-bottom, .sp-footer-links");
    if (!footer) return;

    const button = document.createElement("button");
    button.className = "cookie-settings-button";
    button.type = "button";
    button.setAttribute("data-cookie-settings", "");
    button.textContent = "Настройки cookie";
    button.addEventListener("click", showBanner);
    footer.appendChild(button);
  };

  const init = () => {
    if (!PRODUCTION_HOSTS.has(window.location.hostname)) return;

    const consent = readConsent();
    if (consent === "accepted") loadMetrika();
    if (!consent) showBanner();
    addSettingsButton();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
