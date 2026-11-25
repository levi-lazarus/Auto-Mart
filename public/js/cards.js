import { icon } from './icons.js';
import { favorites, money, miles, getSession, placeOrder } from './api.js';
import { openModal, bindModal, toast, openAuth } from './main.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const monthly = (price, { down = 0.1, apr = 5.9, months = 60 } = {}) => {
  const p = price * (1 - down);
  const r = apr / 100 / 12;
  return Math.round((p * r) / (1 - (1 + r) ** -months));
};

function fuelIcon(fuel) {
  return fuel === 'Electric' ? 'bolt' : fuel === 'Hybrid' ? 'leaf' : 'fuel';
}

export function carCard(car, i = 0) {
  const fav = favorites.has(car.id);
  return `
  <article class="car-card" data-reveal style="--d:${(i % 4) * 80}ms" data-tilt="5" data-id="${car.id}">
    <div class="car-media">
      <img src="${esc(car.image)}" alt="${esc(`${car.year} ${car.manufacturer} ${car.model}`)}" loading="lazy" decoding="async">
      <div class="car-badges">
        <span class="tag ${car.state === 'new' ? 'tag-teal' : 'tag-white'}">${car.state === 'new' ? 'New' : 'Certified'}</span>
        ${car.fuel !== 'Petrol' ? `<span class="tag tag-sky">${icon(fuelIcon(car.fuel))}${esc(car.fuel)}</span>` : ''}
      </div>
      <button class="fav-btn ${fav ? 'active' : ''}" data-fav="${car.id}" aria-pressed="${fav}" aria-label="Save ${esc(car.manufacturer)} ${esc(car.model)}">${icon('heart')}</button>
    </div>
    <div class="car-body">
      <div class="car-title">
        <div>
          <p class="car-make">${esc(car.manufacturer)}</p>
          <h3>${esc(car.model)}</h3>
        </div>
        <p class="car-price">${money(car.price)}<small>or ${money(monthly(car.price))}/mo</small></p>
      </div>
      <ul class="car-specs">
        <li>${icon('calendar')}${car.year}</li>
        <li>${icon('gauge')}${miles(car.mileage)}</li>
        <li>${icon(fuelIcon(car.fuel))}${esc(car.fuel)}</li>
        <li>${icon('gears')}${esc(car.transmission)}</li>
      </ul>
      <button class="btn btn-soft btn-block car-cta" data-details="${car.id}">View details ${icon('arrowRight')}</button>
    </div>
  </article>`;
}

// ---------- Detail modal ---------------------------------------------------
let modal;
function ensureModal() {
  if (modal) return modal;
  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal car-modal" id="car-modal" role="dialog" aria-modal="true" aria-labelledby="car-modal-title" hidden>
    <div class="modal-backdrop" data-close></div>
    <div class="modal-card car-modal-card"><button class="modal-close" data-close aria-label="Close">${icon('x')}</button><div class="car-modal-content"></div></div>
  </div>`);
  modal = document.getElementById('car-modal');
  bindModal(modal);
  return modal;
}

export function openCarModal(car) {
  const m = ensureModal();
  const content = m.querySelector('.car-modal-content');
  const est = monthly(car.price);
  content.innerHTML = `
    <div class="cm-media">
      <img src="${esc(car.image)}" alt="${esc(`${car.year} ${car.manufacturer} ${car.model}`)}">
      <div class="cm-media-tags">
        <span class="tag tag-white">${icon('shield')}200-point inspected</span>
        <span class="tag tag-white">${icon('rotate')}7-day returns</span>
      </div>
    </div>
    <div class="cm-info">
      <p class="eyebrow">${esc(car.manufacturer)} · ${car.year}</p>
      <h2 id="car-modal-title">${esc(car.model)}</h2>
      <div class="cm-price"><strong>${money(car.price)}</strong><span>Est. ${money(est)}/mo · 60 mo · 5.9% APR</span></div>
      <p class="cm-desc">${esc(car.description || '')}</p>
      <dl class="cm-specs">
        <div><dt>${icon('gauge')}Mileage</dt><dd>${miles(car.mileage)}</dd></div>
        <div><dt>${icon(fuelIcon(car.fuel))}Fuel</dt><dd>${esc(car.fuel)}</dd></div>
        <div><dt>${icon('gears')}Gearbox</dt><dd>${esc(car.transmission)}</dd></div>
        <div><dt>${icon('car')}Body</dt><dd>${esc(car.body_type)}</dd></div>
        ${car.engine ? `<div><dt>${icon('bolt')}Engine</dt><dd>${esc(car.engine)}</dd></div>` : ''}
        ${car.horsepower ? `<div><dt>${icon('sparkle')}Power</dt><dd>${car.horsepower} hp</dd></div>` : ''}
        ${car.color ? `<div><dt>${icon('palette')}Colour</dt><dd>${esc(car.color)}</dd></div>` : ''}
        <div><dt>${icon('badge')}Condition</dt><dd>${car.state === 'new' ? 'Brand new' : 'Certified pre-owned'}</dd></div>
      </dl>
      <form class="offer-form" novalidate>
        <label class="field"><span>Make an offer</span>
          <div class="input-prefix"><span>$</span><input type="number" name="amount" min="1" step="100" value="${Math.round(car.price * 0.97 / 100) * 100}" required></div>
        </label>
        <button class="btn btn-dark" type="submit">${icon('send')}<span>Send offer</span></button>
      </form>
      <a class="btn btn-ghost btn-block" href="contact.html?car=${encodeURIComponent(`${car.year} ${car.manufacturer} ${car.model}`)}">${icon('calendar')} Book a test drive</a>
    </div>`;

  const form = content.querySelector('.offer-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number(form.amount.value);
    if (!amount || amount <= 0) { toast('Please enter a valid amount', 'error'); return; }
    const submit = async () => {
      try {
        await placeOrder(car.id, amount);
        toast(`Offer of ${money(amount)} sent! A manager will reply within 2 hours.`);
      } catch (ex) {
        toast(ex.message, 'error');
      }
    };
    if (!getSession()) {
      toast('Sign in to send your offer', 'info');
      openAuth('signup', submit);
      return;
    }
    submit();
  });
  openModal(m);
}

// ---------- Delegated card interactions -----------------------------------
export function bindCardEvents(container, getById) {
  container.addEventListener('click', (e) => {
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      const on = favorites.toggle(Number(favBtn.dataset.fav));
      favBtn.classList.toggle('active', on);
      favBtn.setAttribute('aria-pressed', String(on));
      favBtn.classList.remove('pop');
      void favBtn.offsetWidth;
      favBtn.classList.add('pop');
      toast(on ? 'Saved to your favourites' : 'Removed from favourites', on ? 'success' : 'info');
      return;
    }
    const card = e.target.closest('[data-details], .car-media img');
    if (card) {
      const id = Number(card.dataset.details || card.closest('.car-card').dataset.id);
      const car = getById(id);
      if (car) openCarModal(car);
    }
  });
}
