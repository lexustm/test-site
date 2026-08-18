document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.main-nav');
  const progress = document.querySelector('.scroll-progress span');
  const backToTop = document.querySelector('[data-back-to-top]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  requestAnimationFrame(() => body.classList.add('is-ready'));

  document.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const closeMenu = () => {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
  };

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(willOpen));
      menu.classList.toggle('is-open', willOpen);
    });

    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
  }

  const updateScrollState = () => {
    const scrollTop = window.scrollY;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? Math.min((scrollTop / scrollable) * 100, 100) : 0;

    if (header) header.classList.toggle('is-scrolled', scrollTop > 40);
    if (progress) progress.style.width = `${percent}%`;
    if (backToTop) backToTop.classList.toggle('is-visible', scrollTop > 650);
  };

  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  const revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -45px' });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const navigationLinks = Array.from(document.querySelectorAll('.main-nav a[href^="#"]'));
  const observedSections = navigationLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window && observedSections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navigationLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: '-30% 0px -60%', threshold: 0 });

    observedSections.forEach((section) => sectionObserver.observe(section));
  }

  document.querySelectorAll('.faq-list details').forEach((details) => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      document.querySelectorAll('.faq-list details').forEach((other) => {
        if (other !== details) other.open = false;
      });
    });
  });

  const chatPanel = document.querySelector('#chat-panel');
  const chatOverlay = document.querySelector('[data-chat-overlay]');
  const chatMessages = document.querySelector('[data-chat-messages]');
  const chatForm = document.querySelector('[data-chat-form]');
  const chatInput = document.querySelector('#chat-input');
  const chatLauncher = document.querySelector('.chat-launcher');
  const chatOpenButtons = document.querySelectorAll('[data-chat-open]');
  const chatCloseButton = document.querySelector('[data-chat-close]');
  const chatExpandButton = document.querySelector('[data-chat-expand]');
  const quickButtons = document.querySelectorAll('[data-chat-message]');
  let lastFocusedElement = null;
  let replyTimer = null;

  const scrollChat = () => {
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const createAvatar = (text, className) => {
    const avatar = document.createElement('span');
    avatar.textContent = text;
    if (className) avatar.className = className;
    return avatar;
  };

  const addUserMessage = (text) => {
    if (!chatMessages) return;
    const message = document.createElement('div');
    message.className = 'chat-message chat-message-user';
    const content = document.createElement('div');
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    content.appendChild(paragraph);
    message.append(createAvatar('Вы'), content);
    chatMessages.appendChild(message);
    scrollChat();
  };

  const addBotReply = () => {
    if (!chatMessages) return;
    const message = document.createElement('div');
    message.className = 'chat-message chat-message-bot';
    const content = document.createElement('div');
    const firstLine = document.createElement('p');
    const secondLine = document.createElement('p');
    const telegramLink = document.createElement('a');

    firstLine.textContent = 'Спасибо за вопрос! Здесь работает демонстрационный помощник.';
    secondLine.append('Для живого ответа напишите Алексею в ');
    telegramLink.href = 'https://t.me/smmtotal';
    telegramLink.target = '_blank';
    telegramLink.rel = 'noopener noreferrer';
    telegramLink.textContent = 'Telegram';
    secondLine.append(telegramLink, ' — там он ответит лично.');
    content.append(firstLine, secondLine);
    message.append(createAvatar('А'), content);
    chatMessages.appendChild(message);
    scrollChat();
  };

  const sendChatMessage = (text) => {
    const normalized = text.trim().slice(0, 300);
    if (!normalized) return;
    addUserMessage(normalized);
    window.clearTimeout(replyTimer);
    replyTimer = window.setTimeout(addBotReply, reducedMotion ? 0 : 550);
  };

  const getFocusableElements = () => {
    if (!chatPanel) return [];
    return Array.from(chatPanel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'))
      .filter((element) => !element.hidden && element.offsetParent !== null);
  };

  const openChat = (trigger) => {
    if (!chatPanel || !chatOverlay) return;
    lastFocusedElement = trigger || document.activeElement;
    chatPanel.hidden = false;
    chatOverlay.hidden = false;
    body.classList.add('chat-is-open');
    if (chatLauncher) chatLauncher.setAttribute('aria-expanded', 'true');

    requestAnimationFrame(() => {
      chatPanel.classList.add('is-active');
      chatOverlay.classList.add('is-active');
      window.setTimeout(() => chatInput?.focus(), reducedMotion ? 0 : 180);
    });
  };

  const closeChat = () => {
    if (!chatPanel || !chatOverlay) return;
    chatPanel.classList.remove('is-active', 'is-expanded');
    chatOverlay.classList.remove('is-active');
    body.classList.remove('chat-is-open');
    if (chatLauncher) chatLauncher.setAttribute('aria-expanded', 'false');

    window.setTimeout(() => {
      chatPanel.hidden = true;
      chatOverlay.hidden = true;
      if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
    }, reducedMotion ? 0 : 280);
  };

  chatOpenButtons.forEach((button) => button.addEventListener('click', () => openChat(button)));
  chatCloseButton?.addEventListener('click', closeChat);
  chatOverlay?.addEventListener('click', closeChat);
  chatExpandButton?.addEventListener('click', () => chatPanel?.classList.toggle('is-expanded'));

  quickButtons.forEach((button) => {
    button.addEventListener('click', () => sendChatMessage(button.dataset.chatMessage || ''));
  });

  chatForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!chatInput) return;
    sendChatMessage(chatInput.value);
    chatInput.value = '';
    chatInput.focus();
  });

  document.addEventListener('keydown', (event) => {
    if (!chatPanel || chatPanel.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeChat();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
});
