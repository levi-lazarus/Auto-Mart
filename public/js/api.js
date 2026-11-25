// Thin client for the AutoMart REST API.
// When the site is served without the Node API (e.g. GitHub Pages), every call
// transparently falls back to local data + localStorage so the demo still works.
import { CARS } from './data.js';

const API = '/api/v1';
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  },
};

let online; // Promise<boolean>
export function apiOnline() {
  if (!online) {
    online = fetch(`${API}`, { headers: { Accept: 'application/json' } })
      .then((r) => r.ok && (r.headers.get('content-type') || '').includes('json'))
      .catch(() => false);
  }
  return online;
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  const session = getSession();
  if (auth && session) headers.Authorization = `Bearer ${session.token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return json.data;
}

// ---------- Session -------------------------------------------------------
export function getSession() { return store.get('am_session', null); }
function setSession(data) {
  store.set('am_session', data);
  window.dispatchEvent(new CustomEvent('auth:change', { detail: data }));
}
export function signOut() {
  store.remove('am_session');
  window.dispatchEvent(new CustomEvent('auth:change', { detail: null }));
}

export async function signUp({ first_name, last_name, email, password }) {
  if (await apiOnline()) {
    const data = await request('/auth/signup', { method: 'POST', body: { first_name, last_name, email, password } });
    setSession(data);
    return data;
  }
  const users = store.get('am_demo_users', []);
  if (users.some((u) => u.email === email.toLowerCase())) throw new Error('Email is already registered');
  const user = { id: Date.now(), first_name, last_name, email: email.toLowerCase(), password: btoa(password) };
  store.set('am_demo_users', [...users, user]);
  const data = { token: `demo.${user.id}`, id: user.id, first_name, last_name, email: user.email, demo: true };
  setSession(data);
  return data;
}

export async function signIn({ email, password }) {
  if (await apiOnline()) {
    const data = await request('/auth/signin', { method: 'POST', body: { email, password } });
    setSession(data);
    return data;
  }
  const user = store.get('am_demo_users', []).find((u) => u.email === email.toLowerCase() && u.password === btoa(password));
  if (!user) throw new Error('Incorrect email or password');
  const data = { token: `demo.${user.id}`, id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, demo: true };
  setSession(data);
  return data;
}

// ---------- Cars ----------------------------------------------------------
function localFilter(params = {}) {
  let list = CARS.filter((c) => c.status === 'available');
  const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
  if (params.manufacturer) list = list.filter((c) => eq(c.manufacturer, params.manufacturer));
  if (params.body_type) list = list.filter((c) => eq(c.body_type, params.body_type));
  if (params.fuel) list = list.filter((c) => eq(c.fuel, params.fuel));
  if (params.max_price) list = list.filter((c) => c.price <= Number(params.max_price));
  if (params.featured) list = list.filter((c) => c.featured);
  return list;
}

export async function getCars(params = {}) {
  if (await apiOnline()) {
    const qs = new URLSearchParams({ status: 'available', ...params }).toString();
    try { return await request(`/car?${qs}`); } catch { /* fall through */ }
  }
  return localFilter(params);
}

export async function getCar(id) {
  if (await apiOnline()) {
    try { return await request(`/car/${id}`); } catch { /* fall through */ }
  }
  return CARS.find((c) => c.id === Number(id));
}

// ---------- Orders & contact ---------------------------------------------
export async function placeOrder(carId, amount) {
  if (await apiOnline()) return request('/order', { method: 'POST', auth: true, body: { car_id: carId, amount } });
  const orders = store.get('am_demo_orders', []);
  const order = { id: orders.length + 1, car_id: carId, price_offered: amount, status: 'pending', created_on: new Date().toISOString() };
  store.set('am_demo_orders', [...orders, order]);
  return order;
}

export async function sendContact(payload) {
  if (await apiOnline()) return request('/contact', { method: 'POST', body: payload });
  return { message: 'Thanks! We will be in touch within 24 hours.' };
}

// ---------- Favourites ----------------------------------------------------
export const favorites = {
  all: () => store.get('am_favs', []),
  has: (id) => store.get('am_favs', []).includes(id),
  toggle(id) {
    const list = store.get('am_favs', []);
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    store.set('am_favs', next);
    window.dispatchEvent(new CustomEvent('favs:change', { detail: next }));
    return next.includes(id);
  },
};

export const money = (n) => `$${Number(n).toLocaleString('en-US')}`;
export const miles = (n) => (n === 0 ? 'Brand new' : `${Number(n).toLocaleString('en-US')} mi`);
