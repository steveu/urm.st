// The decision drawings play in once each, when most of one is on screen. The script holds
// them back, so without it (or with reduced motion, which their CSS honours) they're simply
// there. Holding back is instant: each drawing's CSS turns transitions off under [data-wait],
// so only the way in moves. window.replayFigure(el) plays one again, for checking
const figures = document.querySelectorAll<HTMLElement>('[data-figure]');
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      delete (e.target as HTMLElement).dataset.wait;
      io.unobserve(e.target);
    }
  },
  { threshold: 0.6 },
);
figures.forEach((f) => {
  f.dataset.wait = '';
  io.observe(f);
});

export function replay(el: HTMLElement) {
  el.dataset.wait = '';
  void el.offsetWidth;
  requestAnimationFrame(() => requestAnimationFrame(() => delete el.dataset.wait));
}
(window as unknown as { replayFigure: typeof replay }).replayFigure = replay;
