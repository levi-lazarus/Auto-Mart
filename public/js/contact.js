import { sendContact } from './api.js';
import { toast } from './main.js';

const form = document.querySelector('[data-contact]');
const card = form.closest('.contact-form');
const err = form.querySelector('.form-error');
let topic = 'Buying a car';

// Pre-fill from "Book a test drive" links: contact.html?car=2023%20Kia%20EV6
const car = new URLSearchParams(location.search).get('car');
if (car) {
  form.querySelector('[data-car-input]').value = car;
  topic = 'Test drive';
  form.message.value = `Hi! I'd like to book a test drive for the ${car}.`;
}

const pills = form.querySelectorAll('[data-topic]');
const syncPills = () => pills.forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.topic === topic)));
syncPills();
pills.forEach((p) => p.addEventListener('click', () => { topic = p.dataset.topic; syncPills(); }));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  err.textContent = '';
  if (!form.checkValidity()) {
    const bad = form.querySelector(':invalid');
    err.textContent = `${bad.closest('.field').querySelector('span').textContent}: ${bad.validationMessage}`;
    bad.focus();
    return;
  }
  const btn = form.querySelector('button[type=submit]');
  btn.classList.add('loading');
  const data = Object.fromEntries(new FormData(form));
  try {
    await sendContact({ ...data, topic, message: data.car ? `[${data.car}] ${data.message}` : data.message });
    card.classList.add('sent');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (ex) {
    toast(ex.message, 'error');
  } finally {
    btn.classList.remove('loading');
  }
});
