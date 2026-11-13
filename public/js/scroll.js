// A thin bar at the top that fills as you scroll down the page, and a "back to top" button that appears
// after you have scrolled a while (wide screens only, the button is hidden by CSS on phones).
(() => {
  const bar = document.querySelector('.scroll-progress');
  const top = document.querySelector('.to-top');
  if (!bar || !top) return;
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    top.hidden = scrollY < 600;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  update();
})();

// Buttons with data-copy put that text on the clipboard ("Copy as Markdown" on the week list).
for (const b of document.querySelectorAll('[data-copy]')) {
  const label = b.textContent;
  b.hidden = false;
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; } catch { b.textContent = 'Copy failed'; }
    setTimeout(() => { b.textContent = label; }, 1600);
  });
}

// Motion, all of it off when the device asks for less motion.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const root = document.documentElement;
  root.classList.add('fx');

  // Cards slide in as they scroll into view.
  const io = new IntersectionObserver((seen) => {
    for (const e of seen) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  for (const el of document.querySelectorAll('.entry, .issue, .section-head')) io.observe(el);

  // The "$ repoweekly ..." line types itself out.
  for (const p of document.querySelectorAll('.prompt')) {
    const text = p.textContent;
    const dollar = p.querySelector('span')?.textContent ?? '';
    const rest = text.slice(dollar.length);
    p.textContent = '';
    const s = document.createElement('span');
    s.textContent = dollar;
    p.append(s);
    let i = 0;
    const tick = () => { p.append(rest[i++] ?? ''); if (i < rest.length) setTimeout(tick, 22); };
    setTimeout(tick, 150);
  }

  // Numbers in the status window count up from zero.
  for (const dd of document.querySelectorAll('.readout dd')) {
    const n = Number(dd.textContent.trim());
    if (!Number.isInteger(n) || n <= 0) continue;
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 700); dd.textContent = String(Math.round(n * k * (2 - k))); if (k < 1) requestAnimationFrame(step); };
    dd.textContent = '0';
    requestAnimationFrame(step);
  }

  // Cards lean a little toward the mouse (desktop mice only, not touch).
  if (matchMedia('(pointer: fine)').matches) {
    for (const card of document.querySelectorAll('.entry')) {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(1200px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 3).toFixed(2)}deg)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    }
  }
}
