(() => {
  "use strict";

  const TELEGRAM_URL = "https://t.me/smmtotal";
  const VK_URL = "https://vk.com/tot_al";
  const VK_MESSAGE_URL = "https://vk.me/tot_al";
  const navbar = document.getElementById("navbar");
  const backToTop = document.getElementById("backToTop");
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const chatWindow = document.getElementById("chatWindow");
  const chatOverlay = document.getElementById("chatOverlay");
  const chatLauncher = document.querySelector("[data-chat-toggle]");
  const chatMessages = document.getElementById("chatMessages");
  const chatQuickActions = document.getElementById("chatQuickActions");
  const chatQuickLabel = document.getElementById("chatQuickLabel");
  const chatInput = document.getElementById("chatInput");
  const chatForm = document.getElementById("chatForm");

  document.querySelectorAll('.protected-link[data-valid="tg"]').forEach((link) => {
    link.href = TELEGRAM_URL;
  });
  document.querySelectorAll('.protected-link[data-valid="vk"]').forEach((link) => {
    link.href = VK_URL;
  });

  const preloader = document.getElementById("preloader");
  const progressBar = document.getElementById("progressBar");
  const percentageDisplay = document.getElementById("percentageDisplay");

  if (preloader && progressBar && percentageDisplay) {
    progressBar.style.transition = "width 0.3s ease-out";
    progressBar.style.width = "100%";
    percentageDisplay.textContent = "100%";
    window.setTimeout(() => preloader.classList.add("hidden"), 500);
  }

  const finePointer = window.matchMedia("(min-width: 992px) and (pointer: fine)");

  if (finePointer.matches) {
    const cursor = document.getElementById("cursor");
    const follower = document.getElementById("cursorFollower");

    if (cursor && follower) {
      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;
      let cursorX = mouseX;
      let cursorY = mouseY;
      let followerX = mouseX;
      let followerY = mouseY;

      document.addEventListener("mousemove", (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
      });

      const animateCursor = () => {
        cursorX += (mouseX - cursorX) * 0.2;
        cursorY += (mouseY - cursorY) * 0.2;
        followerX += (mouseX - followerX) * 0.1;
        followerY += (mouseY - followerY) * 0.1;
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
        follower.style.left = `${followerX}px`;
        follower.style.top = `${followerY}px`;
        window.requestAnimationFrame(animateCursor);
      };

      animateCursor();

      document
        .querySelectorAll(
          "a, button, .service-card, .why-card, .pricing-card, .faq-question, .result-card",
        )
        .forEach((element) => {
          element.addEventListener("mouseenter", () => {
            cursor.classList.add("hover");
            follower.classList.add("hover");
          });
          element.addEventListener("mouseleave", () => {
            cursor.classList.remove("hover");
            follower.classList.remove("hover");
          });
        });

      document.addEventListener("mousedown", () => cursor.classList.add("click"));
      document.addEventListener("mouseup", () => cursor.classList.remove("click"));
    }
  }

  const updatePageControls = () => {
    const isScrolled = window.scrollY > 100;
    navbar?.classList.toggle("scrolled", isScrolled);
    backToTop?.classList.toggle("visible", isScrolled);
  };

  window.addEventListener("scroll", updatePageControls, { passive: true });
  updatePageControls();

  const setMenu = (open) => {
    navLinks?.classList.toggle("active", open);
    menuToggle?.classList.toggle("active", open);
    menuToggle?.setAttribute("aria-expanded", String(open));
    menuToggle?.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  };

  menuToggle?.addEventListener("click", () => {
    setMenu(!navLinks?.classList.contains("active"));
  });

  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const selector = link.getAttribute("href");
      if (!selector || selector === "#") return;
      const target = document.querySelector(selector);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  backToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.querySelectorAll(".faq-question").forEach((question) => {
    const toggleQuestion = () => {
      const item = question.closest(".faq-item");
      const willOpen = !item?.classList.contains("active");

      document.querySelectorAll(".faq-item").forEach((faqItem) => {
        faqItem.classList.remove("active");
        faqItem.querySelector(".faq-question")?.setAttribute("aria-expanded", "false");
      });

      if (willOpen && item) {
        item.classList.add("active");
        question.setAttribute("aria-expanded", "true");
      }
    };

    question.addEventListener("click", toggleQuestion);
    question.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleQuestion();
      }
    });
  });

  const particles = document.getElementById("particles");
  if (particles) {
    for (let index = 0; index < 15; index += 1) {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${Math.random() * 15 + 10}s`;
      particle.style.animationDelay = `${Math.random() * 10}s`;
      particle.style.opacity = String(Math.random() * 0.5 + 0.2);
      particles.appendChild(particle);
    }
  }

  const marquee = document.querySelector("[data-marquee]");
  const marqueeContent = marquee?.querySelector("[data-marquee-content]");

  if (marquee && marqueeContent) {
    let marqueeResizeTimer = 0;

    const buildMarquee = () => {
      marquee.classList.remove("is-ready");
      marquee.querySelectorAll("[data-marquee-clone]").forEach((clone) => clone.remove());

      const contentWidth = marqueeContent.getBoundingClientRect().width;
      const viewportWidth = marquee.parentElement?.getBoundingClientRect().width ?? window.innerWidth;

      if (!contentWidth) return;

      const copyCount = Math.max(2, Math.ceil(viewportWidth / contentWidth) + 2);

      for (let copyIndex = 1; copyIndex < copyCount; copyIndex += 1) {
        const clone = marqueeContent.cloneNode(true);
        clone.removeAttribute("data-marquee-content");
        clone.setAttribute("data-marquee-clone", "");
        clone.setAttribute("aria-hidden", "true");
        marquee.appendChild(clone);
      }

      const pixelsPerSecond = window.matchMedia("(max-width: 768px)").matches ? 65 : 80;
      const duration = Math.max(30, contentWidth / pixelsPerSecond);

      marquee.style.setProperty("--marquee-shift", `${-contentWidth}px`);
      marquee.style.setProperty("--marquee-duration", `${duration.toFixed(2)}s`);
      window.requestAnimationFrame(() => marquee.classList.add("is-ready"));
    };

    const scheduleMarqueeBuild = () => {
      window.clearTimeout(marqueeResizeTimer);
      marqueeResizeTimer = window.setTimeout(buildMarquee, 150);
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(buildMarquee, buildMarquee);
    } else {
      buildMarquee();
    }

    window.addEventListener("resize", scheduleMarqueeBuild, { passive: true });
  }

  const animatedElements = document.querySelectorAll(
    ".service-card, .why-card, .result-card, .pricing-card, .faq-item, .process-step",
  );

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    animatedElements.forEach((element) => {
      element.classList.add("animate-on-scroll");
      observer.observe(element);
    });
  } else {
    animatedElements.forEach((element) => element.classList.add("visible"));
  }

  let returnFocusTo = null;

  const setChat = (open) => {
    if (!chatWindow || !chatOverlay) return;

    chatWindow.classList.toggle("active", open);
    chatOverlay.classList.toggle("active", open);
    chatWindow.setAttribute("aria-hidden", String(!open));
    chatLauncher?.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";

    if (open) {
      returnFocusTo = document.activeElement;
      window.setTimeout(() => chatInput?.focus(), 100);
    } else {
      chatWindow.classList.remove("expanded");
      if (returnFocusTo instanceof HTMLElement) returnFocusTo.focus();
    }
  };

  document.querySelectorAll("[data-chat-open]").forEach((button) => {
    button.addEventListener("click", () => setChat(true));
  });

  chatLauncher?.addEventListener("click", () => {
    setChat(!chatWindow?.classList.contains("active"));
  });

  document.querySelectorAll("[data-chat-close]").forEach((button) => {
    button.addEventListener("click", () => setChat(false));
  });

  document.querySelector("[data-chat-expand]")?.addEventListener("click", () => {
    chatWindow?.classList.toggle("expanded");
  });

  const services = [
    {
      id: "sites",
      label: "создание сайта или интернет-магазина",
      button: "Сайты",
      task: "Нужно создать сайт или интернет-магазин",
      keywords: [
        "сайт",
        "интернет-магазин",
        "интернет магазин",
        "лендинг",
        "промостраниц",
        "многостраничн",
        "корпоративн сайт",
        "каталог товар",
        "веб-сайт",
        "web-сайт",
        "сделать страницу",
      ],
    },
    {
      id: "smm",
      label: "SMM-продвижение",
      button: "SMM и соцсети",
      task: "Нужно продвижение в соцсетях",
      keywords: [
        "smm",
        "смм",
        "соцсет",
        "социальн сет",
        "вести группу",
        "ведение группы",
        "контент-план",
        "контент план",
        "посты",
        "сторис",
        "оформить группу",
        "оформить соцсет",
      ],
    },
    {
      id: "ads",
      label: "таргетированная и контекстная реклама",
      button: "Реклама",
      task: "Нужно запустить рекламу",
      keywords: [
        "реклам",
        "таргет",
        "директ",
        "лиды",
        "заявки",
        "рекламн кабинет",
        "продвижение в яндекс",
        "продвижение во вконтакте",
      ],
    },
    {
      id: "marketplaces",
      label: "карточки для маркетплейсов",
      button: "Маркетплейсы",
      task: "Нужно оформить карточки товара",
      keywords: [
        "маркетплейс",
        "wildberries",
        "вайлдберриз",
        "wb",
        "ozon",
        "озон",
        "яндекс маркет",
        "карточк товара",
        "rich-контент",
        "рич-контент",
      ],
    },
    {
      id: "video",
      label: "монтаж видео",
      button: "Видео",
      task: "Нужен монтаж видео",
      keywords: [
        "видео",
        "монтаж",
        "reels",
        "рилс",
        "shorts",
        "шортс",
        "youtube",
        "ютуб",
        "субтитр",
        "цветокоррекц",
      ],
    },
    {
      id: "bots",
      label: "чат-боты и автоматизация",
      button: "Чат-боты",
      task: "Нужен чат-бот или автоматизация",
      keywords: [
        "чат-бот",
        "чат бот",
        "бота",
        "бот для",
        "автоворонк",
        "автоматизац",
        "автоответчик",
        "рассылк",
        "интеграц",
      ],
    },
    {
      id: "copywriting",
      label: "тексты",
      button: "Тексты",
      task: "Нужны тексты",
      keywords: [
        "копирайт",
        "текст",
        "стать",
        "описание",
        "email-рассылк",
        "письмо",
        "пост для",
      ],
    },
    {
      id: "design",
      label: "дизайн",
      button: "Дизайн",
      task: "Нужен дизайн",
      keywords: [
        "дизайн",
        "визуал",
        "логотип",
        "фирменн",
        "визитк",
        "полиграф",
        "инфограф",
        "презентац",
        "ретуш",
        "баннер",
        "креатив",
      ],
    },
    {
      id: "seo",
      label: "SEO и аналитика",
      button: "SEO и аналитика",
      task: "Нужны SEO, аудит или аналитика",
      keywords: [
        "seo",
        "сео",
        "поисков",
        "семантик",
        "мета-тег",
        "метатег",
        "оптимизация сайта",
        "продвижение сайта",
        "аналитик",
        "аудит",
        "исследован",
        "анализ конкурент",
        "целевая аудитория",
        "целевой аудитории",
        "отчет",
        "отчёт",
        "рекомендац",
      ],
    },
  ];

  const serviceById = new Map(services.map((service) => [service.id, service]));
  const chatState = {
    task: "",
    serviceIds: [],
    workFormat: "",
    timing: "",
    waitingFor: "",
  };

  const ICON_PATHS = {
    bot: "assets/icons/bot.svg",
    user: "assets/icons/user.svg",
  };

  const createAvatarIcon = (type) => {
    const icon = document.createElement("img");
    icon.src = type === "user" ? ICON_PATHS.user : ICON_PATHS.bot;
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    return icon;
  };

  const normalizeText = (text) =>
    text
      .toLocaleLowerCase("ru-RU")
      .replaceAll("ё", "е")
      .replace(/\s+/g, " ")
      .trim();

  const appendMessage = (message, type = "bot") => {
    if (!chatMessages) return;

    const wrapper = document.createElement("div");
    wrapper.className = type === "user" ? "chat-message user" : "chat-message";

    const avatar = document.createElement("div");
    avatar.className = "chat-message-avatar";
    avatar.appendChild(createAvatarIcon(type));

    const content = document.createElement("div");
    content.className = "chat-message-content";

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    content.appendChild(paragraph);
    wrapper.append(avatar, content);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return paragraph;
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }
  };

  const appendMessengerReply = (message, draft, linkText = "Открыть Telegram") => {
    if (!chatMessages) return;

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message";

    const avatar = document.createElement("div");
    avatar.className = "chat-message-avatar";
    avatar.appendChild(createAvatarIcon("bot"));

    const content = document.createElement("div");
    content.className = "chat-message-content";
    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    const actions = document.createElement("div");
    actions.className = "chat-messenger-actions";

    const telegramLink = document.createElement("a");
    telegramLink.href = `${TELEGRAM_URL}?text=${encodeURIComponent(draft)}`;
    telegramLink.target = "_blank";
    telegramLink.rel = "noopener noreferrer";
    telegramLink.className = "chat-telegram-link";
    telegramLink.textContent = linkText;

    const vkLink = document.createElement("a");
    vkLink.href = VK_MESSAGE_URL;
    vkLink.target = "_blank";
    vkLink.rel = "noopener noreferrer";
    vkLink.className = "chat-vk-link";
    vkLink.textContent = "Скопировать и открыть ВКонтакте";

    const note = document.createElement("small");
    note.className = "chat-draft-note";
    note.textContent = "В Telegram текст подставится автоматически. Для ВКонтакте он скопируется - останется вставить его в диалог.";

    vkLink.addEventListener("click", () => {
      copyText(draft).then((copied) => {
        note.textContent = copied
          ? "Текст скопирован. Вставьте его в открывшийся диалог ВКонтакте."
          : "Не удалось скопировать текст автоматически. Попробуйте открыть Telegram.";
      });
    });

    actions.append(telegramLink, vkLink);
    content.append(paragraph, actions, note);
    wrapper.append(avatar, content);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const renderQuickActions = (actions, label = "Выберите вариант ответа ↓") => {
    if (!chatQuickActions) return;

    const buttons = actions.map((action) => {
      const button = document.createElement("button");
      button.className = "chat-quick-btn";
      button.type = "button";
      button.textContent = action.label;
      button.addEventListener("click", () => {
        if (action.userText) appendMessage(action.userText, "user");
        action.run();
      });
      return button;
    });

    chatQuickActions.replaceChildren(...buttons);
    chatQuickActions.classList.remove("is-fresh");

    if (chatQuickLabel) {
      chatQuickLabel.textContent = label;
      chatQuickLabel.hidden = actions.length === 0;
    }

    if (actions.length > 0) {
      window.requestAnimationFrame(() => {
        chatQuickActions.classList.add("is-fresh");
      });
    }
  };

  const joinLabels = (labels) => {
    if (labels.length < 2) return labels[0] || "";
    return `${labels.slice(0, -1).join(", ")} и ${labels.at(-1)}`;
  };

  const findServices = (message) => {
    const normalized = normalizeText(message);
    return services
      .map((service) => ({
        id: service.id,
        score: service.keywords.reduce(
          (score, keyword) =>
            score + (normalized.includes(normalizeText(keyword)) ? 1 : 0),
          0,
        ),
      }))
      .filter((result) => result.score > 0)
      .sort((first, second) => second.score - first.score)
      .map((result) => result.id);
  };

  const serviceActions = () =>
    services.map((service) => ({
      label: service.button,
      userText: service.button,
      run: () => selectTask(service.task, [service.id]),
    }));

  const showServiceChoices = () => {
    renderQuickActions(
      [
        ...serviceActions(),
        {
          label: "Цены",
          userText: "Сколько стоит работа?",
          run: showPrices,
        },
      ],
      "Выберите подходящую услугу ↓",
    );
  };

  const askWorkFormat = () => {
    const labels = chatState.serviceIds
      .map((id) => serviceById.get(id)?.label)
      .filter(Boolean);
    appendMessage(
      `Для такой задачи подойдут: ${joinLabels(labels)}. Это разовая работа или нужна помощь на постоянной основе? Нажмите подходящий вариант ниже 👇`,
    );
    chatState.waitingFor = "format";
    renderQuickActions(
      [
        {
          label: "Разовая задача",
          userText: "Разовая задача",
          run: () => selectWorkFormat("разовая задача"),
        },
        {
          label: "На постоянной основе",
          userText: "На постоянной основе",
          run: () => selectWorkFormat("постоянная работа"),
        },
        {
          label: "Пока не знаю",
          userText: "Пока не знаю",
          run: () => selectWorkFormat("нужно обсудить"),
        },
      ],
      "Выберите формат работы ↓",
    );
  };

  function selectTask(task, serviceIds) {
    chatState.task = task.slice(0, 600);
    chatState.serviceIds = [...new Set(serviceIds)];
    chatState.workFormat = "";
    chatState.timing = "";
    chatState.waitingFor = "";
    askWorkFormat();
  }

  const selectWorkFormat = (workFormat) => {
    chatState.workFormat = workFormat;
    chatState.waitingFor = "timing";
    appendMessage("Когда хотелось бы начать? Нажмите один из вариантов ниже 👇");
    renderQuickActions(
      [
        {
          label: "Как можно скорее",
          userText: "Как можно скорее",
          run: () => finishBrief("как можно скорее"),
        },
        {
          label: "В течение месяца",
          userText: "В течение месяца",
          run: () => finishBrief("в течение месяца"),
        },
        {
          label: "Срок не горит",
          userText: "Срок не горит",
          run: () => finishBrief("срок не горит"),
        },
      ],
      "Выберите желаемый срок ↓",
    );
  };

  const resetBrief = () => {
    chatState.task = "";
    chatState.serviceIds = [];
    chatState.workFormat = "";
    chatState.timing = "";
    chatState.waitingFor = "";
    appendMessage("Хорошо. Напишите новую задачу или выберите направление ниже.");
    showServiceChoices();
    chatInput?.focus();
  };

  const finishBrief = (timing) => {
    chatState.timing = timing;
    chatState.waitingFor = "";
    const labels = chatState.serviceIds
      .map((id) => serviceById.get(id)?.label)
      .filter(Boolean);
    const draft = [
      "Здравствуйте! Пишу с сайта VIBELINK.",
      "",
      `Задача: ${chatState.task}`,
      `Подходящие услуги: ${joinLabels(labels)}`,
      `Формат: ${chatState.workFormat}`,
      `Когда: ${chatState.timing}`,
      "",
      "Подскажите, пожалуйста, сможете помочь?",
    ].join("\n");

    appendMessengerReply(
      "Готово. Собрал короткое сообщение, чтобы не пришлось повторять всё заново.",
      draft,
      "Открыть Telegram с сообщением",
    );
    renderQuickActions(
      [
        {
          label: "Обсудить другую задачу",
          userText: "Хочу обсудить другую задачу",
          run: resetBrief,
        },
      ],
      "Хотите начать заново? ↓",
    );
  };

  function showPrices(showChoices = true) {
    appendMessage(
      "На сайте есть ориентиры: разовая задача - от 5 000 ₽, пакет услуг - от 20 000 ₽ в месяц, консультация - 3 000 ₽. Точная сумма зависит от объёма.",
    );
    if (showChoices) {
      appendMessage("Что нужно сделать?");
      showServiceChoices();
    }
  }

  const answerGeneralQuestion = (message, showChoices = true) => {
    const normalized = normalizeText(message);

    if (/цен|стоим|сколько|прайс|бюджет/.test(normalized)) {
      showPrices(showChoices);
      return true;
    }
    if (/гарант|результат|окуп|продаж/.test(normalized)) {
      appendMessage(
        "Заранее обещать точные цифры было бы нечестно: результат зависит от ниши, продукта, бюджета и аудитории. До старта можно оценить задачу, предложить план и договориться, по каким показателям смотреть результат.",
      );
      if (showChoices) showServiceChoices();
      return true;
    }
    if (/срок|как быстро|когда нач|приступ|сроч/.test(normalized)) {
      appendMessage(
        "Срок зависит от задачи и текущей загрузки. Обычно начать можно в течение нескольких дней, а срочность лучше сразу указать в сообщении.",
      );
      if (showChoices) showServiceChoices();
      return true;
    }
    if (/разов|постоян|ежемесяч|формат работ/.test(normalized)) {
      appendMessage(
        "Можно заказать одну конкретную задачу или договориться о регулярной работе. Формат лучше выбирать после короткого обсуждения объёма.",
      );
      if (showChoices) showServiceChoices();
      return true;
    }
    if (/контакт|связ|телеграм|telegram|вконтакте|написать алексе/.test(normalized)) {
      const draft = "Здравствуйте! Пишу с сайта VIBELINK. Хочу обсудить задачу.";
      appendMessengerReply("Связаться с Алексеем можно в Telegram или ВКонтакте.", draft);
      if (showChoices) showServiceChoices();
      return true;
    }

    return false;
  };

  const processMessage = (message) => {
    const cleanMessage = message.replace(/\s+/g, " ").trim().slice(0, 600);
    if (!cleanMessage) return;

    appendMessage(cleanMessage, "user");
    if (chatInput) chatInput.value = "";

    const matchedServices = findServices(cleanMessage);
    if (matchedServices.length > 0) {
      answerGeneralQuestion(cleanMessage, false);
      selectTask(cleanMessage, matchedServices);
      return;
    }

    const normalizedMessage = normalizeText(cleanMessage);
    if (chatState.waitingFor === "format") {
      if (/разов|один раз|однократ/.test(normalizedMessage)) {
        selectWorkFormat("разовая задача");
        return;
      }
      if (/постоян|регуляр|ежемесяч/.test(normalizedMessage)) {
        selectWorkFormat("постоянная работа");
        return;
      }
      if (/не знаю|обсуд|не уверен/.test(normalizedMessage)) {
        selectWorkFormat("нужно обсудить");
        return;
      }
    }

    if (chatState.waitingFor === "timing") {
      if (/не горит|не сроч|без спеш|позже/.test(normalizedMessage)) {
        finishBrief("срок не горит");
        return;
      }
      if (/сроч|скорее|сейчас|сегодня|завтра/.test(normalizedMessage)) {
        finishBrief("как можно скорее");
        return;
      }
      if (/месяц|недел/.test(normalizedMessage)) {
        finishBrief("в течение месяца");
        return;
      }
    }

    if (answerGeneralQuestion(cleanMessage)) return;

    appendMessage(
      "Я пока не понял, к какой услуге отнести задачу. Напишите, что хотите получить в итоге - например, создать сайт, запустить рекламу, оформить соцсети или сделать карточки товара.",
    );
    showServiceChoices();
  };

  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    processMessage(chatInput?.value || "");
  });

  document.querySelectorAll("[data-chat-intent]").forEach((button) => {
    button.addEventListener("click", () => {
      const service = serviceById.get(button.getAttribute("data-chat-intent"));
      if (!service) return;
      appendMessage(button.textContent?.trim() || service.button, "user");
      selectTask(service.task, [service.id]);
    });
  });

  document.querySelector('[data-chat-action="other"]')?.addEventListener("click", () => {
    appendMessage("Другая задача", "user");
    appendMessage("Расскажите своими словами, что нужно получить в итоге.");
    chatState.waitingFor = "";
    renderQuickActions([]);
    chatInput?.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (chatWindow?.classList.contains("active")) setChat(false);
    if (navLinks?.classList.contains("active")) setMenu(false);
  });

  if (finePointer.matches) {
    document
      .querySelectorAll(".service-card, .why-card, .result-card, .pricing-card")
      .forEach((card) => {
        card.addEventListener("mousemove", (event) => {
          const rect = card.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          const rotateX = (y - rect.height / 2) / 25;
          const rotateY = (rect.width / 2 - x) / 25;
          card.style.transition = "transform 0.15s ease-out";
          card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });

        card.addEventListener("mouseleave", () => {
          card.style.transition = "transform 0.6s ease-out";
          card.style.transform =
            "perspective(1000px) rotateX(0) rotateY(0) translateY(0)";
        });
      });
  }
})();
