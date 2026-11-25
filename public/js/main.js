import { hydrateIcons, icon } from './icons.js';
import { getSession, signIn, signUp, signOut, apiOnline } from './api.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Toasts ---------------------------------------------------------
export function toast(message, type = 'success') {
  let wrap = document.querySelector('.toasts');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toasts';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    document.body.append(wrap);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icon({ error: 'x', info: 'sparkle' }[type] || 'check')}<span></span>`;
  el.querySelector('span').textContent = message;
  wrap.append(el);
  setTimeout(() => el.classList.add('out'), 3600);
  setTimeout(() => el.remove(), 4100);
}

// ---------- Header ---------------------------------------------------------
function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = header.querySelector('.menu-toggle');
  toggle?.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  header.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => {
    header.classList.remove('menu-open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));
}

// ---------- Scroll reveal --------------------------------------------------
export function observeReveals(root = document) {
  const els = root.querySelectorAll('[data-reveal]:not(.is-visible)');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => io.observe(el));
}

// ---------- Animated counters ---------------------------------------------
function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  const run = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const start = performance.now();
    const dur = 1800;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - (1 - p) ** 4;
      el.textContent = `${prefix}${(target * eased).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    if (reduceMotion) el.textContent = `${prefix}${target.toLocaleString('en-US')}${suffix}`;
    else requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
  }), { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

// ---------- 3D tilt on hover ----------------------------------------------
export function initTilt(root = document) {
  if (reduceMotion || window.matchMedia('(hover: none)').matches) return;
  root.querySelectorAll('[data-tilt]:not([data-tilt-ready])').forEach((el) => {
    el.dataset.tiltReady = '1';
    const max = Number(el.dataset.tilt) || 6;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
}

// ---------- Auth modal -----------------------------------------------------
const authMarkup = `
<div class="modal auth-modal" id="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" hidden>
  <div class="modal-backdrop" data-close></div>
  <div class="modal-card auth-card">
    <button class="modal-close" data-close aria-label="Close">${icon('x')}</button>
    <div class="auth-aside">
      <img src="images/cars/porsche-911.jpg" alt="" loading="lazy">
      <div class="auth-aside-copy">
        <span class="chip chip-glass">${icon('sparkle')} Members save on average $1,850</span>
        <p>Save favourites, make offers and track your car loan in one place.</p>
      </div>
    </div>
    <div class="auth-body">
      <h2 id="auth-title">Welcome to <em>AutoMart</em></h2>
      <p class="muted">Sign in or create a free account in seconds.</p>
      <div class="segmented" role="tablist">
        <button type="button" role="tab" class="active" aria-selected="true" data-tab="signin">Sign in</button>
        <button type="button" role="tab" aria-selected="false" data-tab="signup">Create account</button>
        <span class="segmented-pill"></span>
      </div>
      <form class="form auth-form active" data-form="signin" novalidate>
        <label class="field"><span>Email</span><input type="email" name="email" placeholder="you@example.com" autocomplete="email" required></label>
        <label class="field"><span>Password</span><input type="password" name="password" placeholder="Your password" autocomplete="current-password" required></label>
        <p class="form-error" aria-live="polite"></p>
        <button class="btn btn-dark btn-block" type="submit"><span>Sign in</span>${icon('arrowRight')}</button>
      </form>
      <form class="form auth-form" data-form="signup" novalidate>
        <div class="field-row">
          <label class="field"><span>First name</span><input name="first_name" placeholder="Jane" autocomplete="given-name" required></label>
          <label class="field"><span>Last name</span><input name="last_name" placeholder="Doe" autocomplete="family-name" required></label>
        </div>
        <label class="field"><span>Email</span><input type="email" name="email" placeholder="you@example.com" autocomplete="email" required></label>
        <label class="field"><span>Password</span><input type="password" name="password" placeholder="At least 6 characters" minlength="6" autocomplete="new-password" required></label>
        <p class="form-error" aria-live="polite"></p>
        <button class="btn btn-dark btn-block" type="submit"><span>Create account</span>${icon('arrowRight')}</button>
      </form>
      <p class="auth-note muted" data-demo-note hidden>Running without the API server. Accounts are stored in this browser for demo purposes.</p>
    </div>
  </div>
</div>`;

let lastFocus;
export function openModal(modal) {
  lastFocus = document.activeElement;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('open'));
  document.documentElement.classList.add('no-scroll');
  setTimeout(() => modal.querySelector('input, button:not(.modal-close)')?.focus(), 80);
}
export function closeModal(modal) {
  modal.classList.remove('open');
  document.documentElement.classList.remove('no-scroll');
  setTimeout(() => { modal.hidden = true; }, 300);
  lastFocus?.focus?.();
}
export function bindModal(modal) {
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(modal); });
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(modal); });
}

let authModal;
let afterAuth;
export function openAuth(tab = 'signin', onSuccess) {
  afterAuth = onSuccess;
  switchTab(tab);
  openModal(authModal);
}

function switchTab(tab) {
  authModal.querySelectorAll('[data-tab]').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  authModal.querySelector('.segmented').dataset.active = tab;
  authModal.querySelectorAll('[data-form]').forEach((f) => f.classList.toggle('active', f.dataset.form === tab));
}

function initAuth() {
  document.body.insertAdjacentHTML('beforeend', authMarkup);
  authModal = document.getElementById('auth-modal');
  bindModal(authModal);
  apiOnline().then((ok) => { authModal.querySelector('[data-demo-note]').hidden = ok; });

  authModal.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  authModal.querySelectorAll('[data-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = form.querySelector('.form-error');
      err.textContent = '';
      if (!form.checkValidity()) {
        const bad = form.querySelector(':invalid');
        err.textContent = bad.validationMessage;
        bad.focus();
        return;
      }
      const data = Object.fromEntries(new FormData(form));
      const btn = form.querySelector('button[type=submit]');
      btn.classList.add('loading');
      try {
        const user = form.dataset.form === 'signup' ? await signUp(data) : await signIn(data);
        closeModal(authModal);
        form.reset();
        toast(`Welcome${form.dataset.form === 'signup' ? '' : ' back'}, ${user.first_name}!`);
        afterAuth?.(user);
        afterAuth = null;
      } catch (ex) {
        err.textContent = ex.message;
      } finally {
        btn.classList.remove('loading');
      }
    });
  });

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-auth-open]');
    if (trigger) { e.preventDefault(); openAuth(trigger.dataset.authOpen || 'signin'); }
  });

  const renderUser = () => {
    const session = getSession();
    document.querySelectorAll('[data-auth-slot]').forEach((slot) => {
      if (session) {
        const initials = `${session.first_name?.[0] || ''}${session.last_name?.[0] || ''}`.toUpperCase();
        slot.innerHTML = `<div class="user-chip"><span class="avatar">${initials}</span><span class="user-name">${session.first_name}</span><button class="icon-btn" data-signout aria-label="Sign out" title="Sign out">${icon('logout')}</button></div>`;
        slot.querySelector('.user-name').textContent = session.first_name;
      } else {
        slot.innerHTML = `<button class="btn btn-dark btn-sm" data-auth-open="signin">${icon('user')}<span>Sign in</span></button>`;
      }
    });
  };
  renderUser();
  window.addEventListener('auth:change', renderUser);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-signout]')) { signOut(); toast('You have been signed out'); }
  });
}

// ---------- Marquee duplication -------------------------------------------
function initMarquees() {
  document.querySelectorAll('[data-marquee]').forEach((track) => {
    track.innerHTML += track.innerHTML;
    [...track.children].slice(track.children.length / 2).forEach((c) => c.setAttribute('aria-hidden', 'true'));
  });
}

// ---------- Newsletter -----------------------------------------------------
function initNewsletter() {
  document.querySelectorAll('[data-newsletter]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.reset();
    toast("You're on the list. See you next week!");
  }));
}

// ---------- Boot -----------------------------------------------------------
hydrateIcons();
initHeader();
initMarquees();
observeReveals();
initCounters();
initTilt();
initAuth();
initNewsletter();
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
document.documentElement.classList.add('js-ready');
