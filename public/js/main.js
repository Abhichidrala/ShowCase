/* =========================================
   Portfolio — Main Client JS
   Animations, interactions, and UI logic
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileNav();
  initScrollReveal();
  initTypingAnimation();
  initCounterAnimation();
  initSkillBars();
  initProjectFilter();
  initBlogSearch();
  initSmoothScroll();
});

// --- Navbar scroll effect ---
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

// --- Mobile navigation ---
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    menu.classList.toggle('active');
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', !expanded);
  });

  // Close on link click
  menu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      menu.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      toggle.classList.remove('active');
      menu.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// --- Scroll reveal animation ---
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

// --- Typing animation ---
function initTypingAnimation() {
  const el = document.querySelector('.typing-text');
  if (!el) return;

  const text = el.getAttribute('data-text') || '';
  let i = 0;
  el.textContent = '';

  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, 60 + Math.random() * 40);
    }
  }

  // Start after a short delay
  setTimeout(type, 800);
}

// --- Counter animation ---
function initCounterAnimation() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-count'));
  const duration = 2000;
  const start = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = Math.round(eased * target);
    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// --- Skill bar animation ---
function initSkillBars() {
  const skillItems = document.querySelectorAll('.skill-item');
  if (!skillItems.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target.querySelector('.skill-fill');
        const percentEl = entry.target.querySelector('.skill-percent');

        // Animate the bar fill
        if (bar) {
          bar.classList.add('animate');
        }

        // Animate the percentage number counting up
        if (percentEl) {
          const targetVal = parseInt(percentEl.textContent);
          if (!isNaN(targetVal)) {
            animateSkillPercent(percentEl, targetVal);
          }
        }

        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  // Initially set percentages to 0
  skillItems.forEach(item => {
    const percentEl = item.querySelector('.skill-percent');
    if (percentEl) {
      percentEl.setAttribute('data-target', percentEl.textContent);
      percentEl.textContent = '0%';
    }
    observer.observe(item);
  });
}

function animateSkillPercent(el, target) {
  const duration = 1800;
  const start = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = current + '%';

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// --- Project filter ---
function initProjectFilter() {
  const filterBar = document.getElementById('projectFilter');
  if (!filterBar) return;

  const buttons = filterBar.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.project-card[data-techs]');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      cards.forEach(card => {
        if (filter === 'all') {
          card.classList.remove('hidden');
        } else {
          const techs = card.getAttribute('data-techs') || '';
          if (techs.toLowerCase().includes(filter.toLowerCase())) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        }
      });
    });
  });
}

// --- Blog search ---
function initBlogSearch() {
  const searchInput = document.getElementById('blogSearch');
  if (!searchInput) return;

  const cards = document.querySelectorAll('.blog-card[data-title]');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();

    cards.forEach(card => {
      const title = card.getAttribute('data-title') || '';
      const tags = (card.getAttribute('data-tags') || '').toLowerCase();

      if (title.includes(query) || tags.includes(query)) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  });
}

// --- Smooth scroll for anchor links ---
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}
