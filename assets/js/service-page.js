(function () {
  'use strict';

  const header = document.querySelector('[data-sp-header]');
  const menuButton = document.querySelector('[data-sp-menu]');
  const menu = document.querySelector('[data-sp-nav]');
  const METRIKA_ID = 111842715;

  function reachGoal(goal) {
    if (typeof window.ym === 'function') window.ym(METRIKA_ID, 'reachGoal', goal);
  }

  function updateHeader() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  function closeMenu() {
    if (!menuButton || !menu) return;
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  }

  if (menuButton && menu) {
    menuButton.addEventListener('click', function () {
      const open = menu.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });
  }

  document.querySelectorAll('[data-current-year]').forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  document.addEventListener('click', function (event) {
    const link = event.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    if (href.indexOf('t.me/') !== -1) reachGoal('contact_telegram');
    if (href.indexOf('vk.com/') !== -1) reachGoal('contact_vk');
    if (href === '#contact') reachGoal('contact_section');
  });

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
})();
