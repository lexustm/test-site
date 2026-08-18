(() => {
  "use strict";

  const TELEGRAM_URL = "https://t.me/smmtotal";
  const VK_URL = "https://vk.com/tot_al";
  const navbar = document.getElementById("navbar");
  const backToTop = document.getElementById("backToTop");
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const chatWindow = document.getElementById("chatWindow");
  const chatOverlay = document.getElementById("chatOverlay");
  const chatLauncher = document.querySelector("[data-chat-toggle]");
  const chatMessages = document.getElementById("chatMessages");
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

  const appendMessage = (message, type = "bot") => {
    if (!chatMessages) return;

    const wrapper = document.createElement("div");
    wrapper.className = type === "user" ? "chat-message user" : "chat-message";

    const avatar = document.createElement("div");
    avatar.className = "chat-message-avatar";
    avatar.textContent = type === "user" ? "👤" : "👨‍💻";

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

  const appendBotReply = (intro, linkText, ending = "") => {
    if (!chatMessages) return;

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message";

    const avatar = document.createElement("div");
    avatar.className = "chat-message-avatar";
    avatar.textContent = "👨‍💻";

    const content = document.createElement("div");
    content.className = "chat-message-content";
    const paragraph = document.createElement("p");
    paragraph.append(document.createTextNode(intro));

    const link = document.createElement("a");
    link.href = TELEGRAM_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = linkText;
    paragraph.append(link, document.createTextNode(ending));

    content.appendChild(paragraph);
    wrapper.append(avatar, content);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const sendMessage = (message) => {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;

    appendMessage(cleanMessage, "user");
    if (chatInput) chatInput.value = "";

    window.setTimeout(() => {
      appendBotReply(
        "Спасибо за сообщение! Напишите в ",
        "Telegram",
        " — там отвечу быстрее! 😊",
      );
    }, 800);
  };

  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(chatInput?.value || "");
  });

  document.querySelectorAll("[data-chat-message]").forEach((button) => {
    button.addEventListener("click", () => {
      const message = button.getAttribute("data-chat-message") || "";
      appendMessage(message, "user");
      window.setTimeout(() => {
        appendBotReply(
          "Отлично! Для подробной консультации напишите в ",
          "Telegram (@smmtotal)",
          " 🚀",
        );
      }, 600);
    });
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
