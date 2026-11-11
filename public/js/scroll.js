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
