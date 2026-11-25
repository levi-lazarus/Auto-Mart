import { getCars, favorites, money } from './api.js';
import { carCard, bindCardEvents, openCarModal } from './cards.js';
import { observeReveals, initTilt } from './main.js';
import { icon } from './icons.js';

const grid = document.querySelector('[data-grid]');
const countOut = document.querySelector('[data-count-out]');
const activeWrap = document.querySelector('[data-active]');
const search = document.querySelector('[data-search]');
const sort = document.querySelector('[data-sort]');
const maxPrice = document.getElementById('max-price');
const priceOut = document.querySelector('[data-price-out]');
const savedBtn = document.querySelector('[data-saved]');
const filtersEl = document.getElementById('filters');

const LABELS = { state: { new: 'New', used: 'Certified pre-owned' } };
const state = { manufacturer: '', body_type: '', fuel: '', state: '', q: '', max: 0, saved: false, sort: 'featured' };
let cars = [];

// ---- read URL params (from the home page quick search) -------------------
const params = new URLSearchParams(window.location.search);
state.manufacturer = params.get('make') || '';
state.body_type = params.get('body') || '';
state.fuel = params.get('fuel') || '';
state.max = Number(params.get('max')) || 0;
state.q = params.get('q') || '';
if (window.location.hash === '#favorites') state.saved = true;

function syncUrl() {
  const p = new URLSearchParams();
  if (state.manufacturer) p.set('make', state.manufacturer);
  if (state.body_type) p.set('body', state.body_type);
  if (state.fuel) p.set('fuel', state.fuel);
  if (state.max) p.set('max', state.max);
  if (state.q) p.set('q', state.q);
  history.replaceState(null, '', `${location.pathname}${p.toString() ? `?${p}` : ''}`);
}

function buildPills() {
  document.querySelectorAll('[data-filter]').forEach((group) => {
    const key = group.dataset.filter;
    const values = [...new Set(cars.map((c) => c[key]))].sort();
    group.innerHTML = values.map((v) => {
      const count = cars.filter((c) => c[key] === v).length;
      return `<button type="button" class="pill" data-value="${v}" aria-pressed="false">${LABELS[key]?.[v] || v} <span class="muted">${count}</span></button>`;
    }).join('');
    group.addEventListener('click', (e) => {
      const b = e.target.closest('.pill');
      if (!b) return;
      state[key] = state[key] === b.dataset.value ? '' : b.dataset.value;
      render();
    });
  });
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  const favs = favorites.all();
  let list = cars.filter((c) => (!state.manufacturer || c.manufacturer === state.manufacturer)
    && (!state.body_type || c.body_type === state.body_type)
    && (!state.fuel || c.fuel === state.fuel)
    && (!state.state || c.state === state.state)
    && (!state.max || c.price <= state.max)
    && (!state.saved || favs.includes(c.id))
    && (!q || `${c.year} ${c.manufacturer} ${c.model} ${c.body_type} ${c.color} ${c.fuel}`.toLowerCase().includes(q)));
  const sorters = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    year_desc: (a, b) => b.year - a.year,
    mileage_asc: (a, b) => a.mileage - b.mileage,
    featured: (a, b) => Number(b.featured) - Number(a.featured) || a.id - b.id,
  };
  return list.sort(sorters[state.sort]);
}

function renderActive() {
  const chips = [];
  ['manufacturer', 'body_type', 'fuel', 'state'].forEach((k) => {
    if (state[k]) chips.push([k, LABELS[k]?.[state[k]] || state[k]]);
  });
  if (state.max) chips.push(['max', `Under ${money(state.max)}`]);
  if (state.saved) chips.push(['saved', 'Favourites']);
  if (state.q) chips.push(['q', `“${state.q}”`]);
  activeWrap.innerHTML = chips.map(([k, label]) => `<button type="button" data-clear="${k}">${label}${icon('x')}</button>`).join('');
}

function render() {
  // reflect state in controls
  document.querySelectorAll('[data-filter]').forEach((g) => g.querySelectorAll('.pill').forEach((p) => p.setAttribute('aria-pressed', String(state[g.dataset.filter] === p.dataset.value))));
  savedBtn.setAttribute('aria-pressed', String(state.saved));
  maxPrice.value = state.max || maxPrice.max;
  priceOut.textContent = state.max ? `Up to ${money(state.max)}` : 'Any';
  maxPrice.style.setProperty('--fill', `${((maxPrice.value - maxPrice.min) / (maxPrice.max - maxPrice.min)) * 100}%`);
  if (search.value !== state.q) search.value = state.q;
  sort.value = state.sort;

  const list = filtered();
  countOut.textContent = list.length;
  renderActive();
  syncUrl();

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">${icon('search')}<h3>No cars match those filters</h3><p>Try widening your budget or removing a filter.</p><button class="btn btn-dark" type="button" data-reset>Reset filters</button></div>`;
    return;
  }
  grid.innerHTML = list.map(carCard).join('');
  observeReveals(grid);
  initTilt(grid);
}

function reset() {
  Object.assign(state, { manufacturer: '', body_type: '', fuel: '', state: '', q: '', max: 0, saved: false });
  render();
}

// ---- events -------------------------------------------------------------
let t;
search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = search.value; render(); }, 180); });
sort.addEventListener('change', () => { state.sort = sort.value; render(); });
maxPrice.addEventListener('input', () => {
  state.max = Number(maxPrice.value) >= Number(maxPrice.max) ? 0 : Number(maxPrice.value);
  render();
});
savedBtn.addEventListener('click', () => { state.saved = !state.saved; render(); });
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-reset]')) reset();
  const clear = e.target.closest('[data-clear]');
  if (clear) {
    const k = clear.dataset.clear;
    state[k] = k === 'max' ? 0 : k === 'saved' ? false : '';
    render();
  }
  if (e.target.closest('[data-open-filters]')) filtersEl.classList.add('open');
  if (e.target.closest('[data-close-filters]')) filtersEl.classList.remove('open');
});
window.addEventListener('favs:change', () => { if (state.saved) render(); });

// ---- boot ---------------------------------------------------------------
(async () => {
  cars = await getCars();
  buildPills();
  bindCardEvents(grid, (id) => cars.find((c) => c.id === id));
  render();
  const open = Number(params.get('car'));
  if (open) {
    const car = cars.find((c) => c.id === open);
    if (car) openCarModal(car);
  }
})();
