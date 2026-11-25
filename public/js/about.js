// Image credits (rendered from the licence metadata saved alongside the photos)
// and a gentle parallax on the photo mosaic.
const wrap = document.querySelector('[data-credits]');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

fetch('images/cars/credits.json')
  .then((r) => r.json())
  .then((credits) => {
    wrap.innerHTML = Object.entries(credits).map(([slug, c]) => `
      <div class="credit">
        <img src="images/cars/${slug}.jpg" alt="" loading="lazy">
        <p><strong>${esc(slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()))}</strong><br>
        by ${esc(c.author)} · <a href="${esc(c.licenseUrl || c.source)}" target="_blank" rel="noopener">${esc(c.license)}</a> · <a href="${esc(c.source)}" target="_blank" rel="noopener">Source</a></p>
      </div>`).join('');
  })
  .catch(() => { wrap.innerHTML = '<p class="muted">Credits are listed in images/cars/credits.json.</p>'; });

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const imgs = [...document.querySelectorAll('[data-parallax]')];
  const onScroll = () => {
    imgs.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * Number(img.dataset.parallax);
      img.style.setProperty('--py', `${(-offset).toFixed(1)}px`);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
