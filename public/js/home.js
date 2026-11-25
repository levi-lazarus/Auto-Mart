import { getCars, money } from './api.js';
import { carCard, bindCardEvents } from './cards.js';
import { observeReveals, initTilt } from './main.js';
import { CARS } from './data.js';

const PAINTS = [
  { name: 'Nardo Grey', hex: '#8e9196' },
  { name: 'Midnight Black', hex: '#141416' },
  { name: 'Pearl White', hex: '#f2f2ee' },
  { name: 'Liquid Silver', hex: '#c3c7cc' },
  { name: 'Graphite', hex: '#3c3e42' },
  { name: 'Racing Green', hex: '#1f5a32' },
  { name: 'Rosso Red', hex: '#d3202a' },
];

function swatchButtons(container, active, onPick) {
  container.innerHTML = PAINTS.map((p, i) => `<button type="button" class="swatch" style="--c:${p.hex}" aria-pressed="${i === active}" aria-label="${p.name}" title="${p.name}" data-i="${i}"></button>`).join('');
  container.addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    container.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-pressed', String(s === b)));
    onPick(PAINTS[Number(b.dataset.i)]);
  });
}

// ---------- 3D scenes (loaded lazily so the page paints instantly) --------
async function init3D() {
  const heroStage = document.getElementById('hero-stage');
  const srStage = document.getElementById('showroom-stage');
  const fail = () => [heroStage, srStage].forEach((s) => s?.classList.add('no-webgl'));

  let mod;
  try {
    mod = await import('./car3d.js');
  } catch (err) {
    console.warn('3D module failed to load', err);
    fail();
    return;
  }
  if (!mod.webglAvailable()) { fail(); return; }

  const progressEls = document.querySelectorAll('[data-progress]');
  mod.onModelProgress((p) => progressEls.forEach((el) => { el.textContent = `Loading 3D model… ${Math.round(p * 100)}%`; }));

  // Hero
  try {
    const hero = await mod.createHeroScene(heroStage, { paint: PAINTS[0].hex });
    swatchButtons(document.querySelector('[data-hero-swatches]'), 0, (p) => hero.setPaint(p.hex));
  } catch (err) {
    console.warn('Hero scene failed', err);
    heroStage.classList.add('no-webgl');
    document.querySelector('.paint-dock')?.remove();
  }

  // Showroom: only built when it approaches the viewport
  const io = new IntersectionObserver(async ([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    try {
      const sr = await mod.createShowroom(srStage, { paint: PAINTS[1].hex });
      const nameEl = document.querySelector('[data-paint-name]');
      swatchButtons(document.querySelector('[data-showroom-swatches]'), 1, (p) => { sr.setPaint(p.hex); nameEl.textContent = p.name; });
      document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
        sr.view(b.dataset.view);
      }));
      document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => sr.zoom(Number(b.dataset.zoom))));
      const drive = document.querySelector('[data-drive]');
      drive.addEventListener('click', () => {
        const on = sr.toggleDrive();
        drive.setAttribute('aria-pressed', String(on));
        drive.innerHTML = on
          ? '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 4v16M16 4v16"/></svg>'
          : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 4v16l13-8z"/></svg>';
      });
      const showroomEl = document.querySelector('.showroom');
      ['pointerdown', 'click'].forEach((ev) => showroomEl.addEventListener(ev, () => showroomEl.classList.add('interacted'), { once: true }));
    } catch (err) {
      console.warn('Showroom failed', err);
      srStage.classList.add('no-webgl');
    }
  }, { rootMargin: '400px' });
  io.observe(srStage);
}

// ---------- Quick search ---------------------------------------------------
function initQuickSearch() {
  const form = document.querySelector('.qs-card');
  const make = form.querySelector('#qs-make');
  const body = form.querySelector('#qs-body');
  const price = form.querySelector('#qs-price');
  const count = form.querySelector('[data-qs-count]');
  const uniq = (key) => [...new Set(CARS.map((c) => c[key]))].sort();
  make.insertAdjacentHTML('beforeend', uniq('manufacturer').map((m) => `<option>${m}</option>`).join(''));
  body.insertAdjacentHTML('beforeend', uniq('body_type').map((m) => `<option>${m}</option>`).join(''));

  const update = () => {
    const n = CARS.filter((c) => c.status === 'available'
      && (!make.value || c.manufacturer === make.value)
      && (!body.value || c.body_type === body.value)
      && (!price.value || c.price <= Number(price.value))).length;
    count.textContent = n;
    count.parentElement.lastChild.textContent = n === 1 ? ' car' : ' cars';
  };
  form.addEventListener('change', update);
  update();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (make.value) params.set('make', make.value);
    if (body.value) params.set('body', body.value);
    if (price.value) params.set('max', price.value);
    window.location.href = `inventory.html${params.toString() ? `?${params}` : ''}`;
  });
}

// ---------- Featured cars --------------------------------------------------
async function initFeatured() {
  const grid = document.querySelector('[data-featured]');
  let cars = await getCars({ featured: 'true' });
  if (!cars.length) cars = (await getCars()).slice(0, 4);
  grid.innerHTML = cars.slice(0, 4).map(carCard).join('');
  bindCardEvents(grid, (id) => cars.find((c) => c.id === id));
  observeReveals(grid);
  initTilt(grid);
}

// ---------- Steps progress line -------------------------------------------
function initSteps() {
  const wrap = document.querySelector('[data-steps]');
  const line = wrap.querySelector('.steps-line i');
  const steps = [...wrap.querySelectorAll('.step')];
  const onScroll = () => {
    const r = wrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height + vh * 0.25)));
    line.style.setProperty('--p', p.toFixed(3));
    steps.forEach((s, i) => s.classList.toggle('active', p >= (i / steps.length) + 0.05));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---------- Finance calculator --------------------------------------------
function initCalculator() {
  const $ = (s) => document.querySelector(s);
  const price = $('#calc-price');
  const down = $('#calc-down');
  const apr = $('#calc-apr');
  let term = 60;
  let shown = 0;
  let raf;

  const fill = (input) => {
    const p = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--fill', `${p}%`);
  };

  const animateTo = (el, value) => {
    cancelAnimationFrame(raf);
    const from = shown;
    const start = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - start) / 450);
      shown = from + (value - from) * (1 - (1 - k) ** 3);
      el.textContent = money(Math.round(shown));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  const update = () => {
    if (Number(down.value) > Number(price.value) * 0.8) down.value = Math.floor((price.value * 0.8) / 500) * 500;
    [price, down, apr].forEach(fill);
    const financed = price.value - down.value;
    const r = apr.value / 100 / 12;
    const m = r ? (financed * r) / (1 - (1 + r) ** -term) : financed / term;
    const total = m * term;
    $('[data-out="price"]').textContent = money(price.value);
    $('[data-out="down"]').textContent = money(down.value);
    $('[data-out="apr"]').textContent = `${Number(apr.value).toFixed(1)}%`;
    $('[data-out="term"]').textContent = `${term} months`;
    $('[data-financed]').textContent = money(financed);
    $('[data-interest]').textContent = money(Math.round(total - financed));
    $('[data-total]').textContent = money(Math.round(total + Number(down.value)));
    $('[data-calc-link]').href = `inventory.html?max=${price.value}`;
    animateTo($('[data-monthly]'), m);
  };

  [price, down, apr].forEach((i) => i.addEventListener('input', update));
  document.querySelectorAll('[data-term]').forEach((b) => b.addEventListener('click', () => {
    term = Number(b.dataset.term);
    document.querySelectorAll('[data-term]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    update();
  }));
  update();
}

initQuickSearch();
initFeatured();
initSteps();
initCalculator();
init3D();
