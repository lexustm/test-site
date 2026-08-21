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
      <div class="cookie-consent-copy">
        <h2>Файлы cookie и аналитика</h2>
        <p>Сайт использует Яндекс Метрику и Вебвизор, чтобы понимать поведение посетителей и улучшать страницы. Аналитика запустится только с вашего согласия.</p>
        <button class="cookie-consent-details-toggle" type="button" aria-expanded="false">Что собирается</button>
        <div class="cookie-consent-details" hidden>
          <p>Метрика может получать технические сведения об устройстве и браузере, источник перехода, просмотренные страницы, клики и прокрутку. Содержимое сообщений в чат-боте скрыто от записи Вебвизора.</p>
          <a href="https://yandex.ru/support/metrica/ru/general/confidential-data" target="_blank" rel="noopener noreferrer">Конфиденциальность в Яндекс Метрике</a>
        </div>
      </div>
      <div class="cookie-consent-actions">
        <button class="cookie-consent-accept" type="button">Разрешить</button>
        <button class="cookie-consent-reject" type="button">Только необходимые</button>
      </div>
    `;

    banner.querySelector(".cookie-consent-details-toggle")?.addEventListener("click", (event) => {
      const button = event.currentTarget;
      const details = banner.querySelector(".cookie-consent-details");
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      if (details) details.hidden = !open;
    });

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
