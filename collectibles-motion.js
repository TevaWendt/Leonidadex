/* Editorial photo stack. Native scroll only; no timers or animation loops at rest. */
(function () {
  'use strict';
  const section = document.getElementById('ambiance');
  const stage = section && section.querySelector('[data-col-scene-stage]');
  const toggle = document.getElementById('col-motion-toggle');
  if (!section || !stage || !toggle) return;
  const cards = Array.from(stage.querySelectorAll('[data-col-scene]'));
  const label = toggle.querySelector('[data-col-motion-label]');
  const status = document.getElementById('col-motion-status');
  const main = document.querySelector('.col-main');
  const header = document.querySelector('body > header');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 901px)');
  const key = 'lk_collectibles_motion_v1';
  let wanted = true, active = false, visible = false, frame = 0;
  try { wanted = window.localStorage.getItem(key) !== 'off'; } catch (_) { /* Session preference still works. */ }
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
  function headerOffset() {
    const height = header ? Math.ceil(header.getBoundingClientRect().height) : 70;
    if (main) {
      main.style.setProperty('--col-header-height', height + 'px');
      main.style.setProperty('--col-anchor-gap', (height + (desktop.matches ? 83 : 119)) + 'px');
    }
    return height;
  }
  function paint() {
    frame = 0;
    if (!active || !visible || document.hidden) return;
    const rect = stage.getBoundingClientRect();
    const height = headerOffset() + 74;
    const sticky = stage.firstElementChild;
    const run = Math.max(1, rect.height - sticky.getBoundingClientRect().height);
    const p = clamp((height - rect.top) / run);
    const width = Math.min(1, rect.width / 1100);
    const first = ease(p * 2.1);
    const second = ease((p - .16) / .58);
    const third = ease((p - .43) / .57);
    const transforms = [
      [-125 - 18 * first, -20 - 30 * first, -7 - 3 * first],
      [60 - 56 * second, 62 - 62 * second, 7 - 6 * second],
      [170 - 37 * third, 125 - 83 * third, 14 - 7 * third]
    ];
    cards.forEach((card, i) => {
      const t = transforms[i];
      card.style.transform = 'translate(-50%, -50%) translate(' + (t[0] * width).toFixed(2) + 'px,' + t[1].toFixed(2) + 'px) rotate(' + t[2].toFixed(2) + 'deg)';
    });
  }
  function queue() {
    if (active && visible && !frame && !document.hidden) frame = window.requestAnimationFrame(paint);
  }
  function stop() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }
  function sync() {
    const express = document.body.classList.contains('col-quick-mode');
    active = wanted && !reduced.matches && desktop.matches && !express && 'IntersectionObserver' in window;
    section.dataset.colMotion = active ? 'on' : 'off';
    document.documentElement.dataset.colMotion = active ? 'on' : 'off';
    toggle.setAttribute('aria-pressed', String(active));
    toggle.disabled = reduced.matches || !desktop.matches || express || !('IntersectionObserver' in window);
    const reason = reduced.matches ? 'Les animations sont réduites selon les préférences de ton appareil.'
      : express ? 'Le mode express masque les images d’ambiance.'
      : !desktop.matches ? 'Sur petit écran, les images restent fixes pour faciliter la lecture.'
      : active ? 'Les photos se superposent pendant le défilement. Le défilement reste libre.'
      : 'Les photos sont présentées sans animation.';
    toggle.title = reason;
    if (label) label.textContent = active ? 'activées' : 'désactivées';
    if (status) status.textContent = reason;
    headerOffset();
    stop();
    if (active) queue();
    else cards.forEach(card => card.style.removeProperty('transform'));
  }
  toggle.addEventListener('click', function () {
    wanted = !wanted;
    try { window.localStorage.setItem(key, wanted ? 'on' : 'off'); } catch (_) { /* No permanent storage: use this session. */ }
    sync();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) queue(); else stop();
    }, {rootMargin: '0px', threshold: 0}).observe(stage);
  }
  window.addEventListener('scroll', queue, {passive: true});
  window.addEventListener('resize', function () { headerOffset(); queue(); }, {passive: true});
  window.addEventListener('lk:collectibles-express', sync);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else queue(); });
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) { wanted = event.newValue !== 'off'; sync(); }
  });
  const listen = media => {
    if (typeof media.addEventListener === 'function') media.addEventListener('change', sync);
    else if (typeof media.addListener === 'function') media.addListener(sync);
  };
  listen(reduced); listen(desktop);
  // Express mode can also be changed by a browser extension or another local view.
  if ('MutationObserver' in window) new MutationObserver(sync).observe(document.body, {attributes: true, attributeFilter: ['class']});
  sync();
})();
