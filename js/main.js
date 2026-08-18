document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.main-nav');
  const progress = document.querySelector('.scroll-progress span');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  requestAnimationFrame(() => body.classList.add('is-ready'));

  document.querySelectorAll('[data-year]').forEach((item) => {
    item.textContent = new Date().getFullYear();
  });

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menu.classList.toggle('is-open', !isOpen);
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && !menuButton.contains(event.target)) {
        menuButton.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
      }
    });
  }

  const updateProgress = () => {
    if (!progress) return;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const percent = available > 0 ? (window.scrollY / available) * 100 : 0;
    progress.style.width = `${Math.min(percent, 100)}%`;
  };

  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });

  if (!reducedMotion) {
    window.addEventListener('pointermove', (event) => {
      document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
    }, { passive: true });
  }

  const revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach((item) => {
      item.addEventListener('pointermove', (event) => {
        const rect = item.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.16;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.16;
        item.style.transform = `translate(${x}px, ${y}px)`;
      });
      item.addEventListener('pointerleave', () => {
        item.style.transform = '';
      });
    });

    document.querySelectorAll('[data-tilt]').forEach((item) => {
      item.addEventListener('pointermove', (event) => {
        const rect = item.getBoundingClientRect();
        const rotateY = ((event.clientX - rect.left) / rect.width - .5) * 4;
        const rotateX = ((event.clientY - rect.top) / rect.height - .5) * -4;
        item.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      item.addEventListener('pointerleave', () => {
        item.style.transform = '';
      });
    });
  }

  document.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || link.target === '_blank') return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      body.classList.add('is-leaving');
      window.setTimeout(() => { window.location.href = href; }, reducedMotion ? 0 : 420);
    });
  });

  const form = document.querySelector('[data-demo-form]');
  const toast = document.querySelector('.toast');
  if (form && toast) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const buttonText = form.querySelector('.form-submit span');
      if (buttonText) buttonText.textContent = 'Готово';
      toast.classList.add('is-shown');
      form.reset();
      window.setTimeout(() => {
        toast.classList.remove('is-shown');
        if (buttonText) buttonText.textContent = 'Отправить заявку';
      }, 3600);
    });
  }
});
