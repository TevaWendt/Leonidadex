/* Leonidakit : page Tuto.
   Aucun calcul propre : l'exercice de démarrage passe par LKCalcEngine, exactement comme le calculateur.
   Tout reste lisible sans ce script ; il ajoute le confort : aperçu du résultat, zones sur les captures,
   captures Simple / Expert, sommaire qui suit la lecture, retour au chapitre d'origine. */
(function () {
  'use strict';
  var E = window.LKCalcEngine, nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  var money = function (n) { return nf.format(Math.round(n)) + ' $'; };
  var hours = function (h) { var m = Math.round(h * 60), H = Math.floor(m / 60), M = m % 60; return H ? H + ' h' + (M ? ' ' + String(M).padStart(2, '0') : '') : M + ' min'; };
  function parse(v) { if (E && E.parseLocalizedNumber) { var r = E.parseLocalizedNumber(v); return r.valid ? r.value : null; } var t = String(v).replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; }
  /* 1. Exercice de démarrage : la réponse s'affiche ici avant d'ouvrir le calculateur. */
  var form = document.querySelector('.t-start-form'), msg = document.getElementById('t-start-message');
  function preview() {
    if (!form || !msg) return;
    var capital = parse(form.elements.capital.value), target = parse(form.elements.target.value), hourly = parse(form.elements.hourly.value);
    if (capital === null || target === null || hourly === null) { msg.textContent = 'Écris trois nombres, par exemple 200 000, 1 000 000 et 100 000.'; return; }
    if (!E || !E.goalContinuous) { msg.textContent = 'Clique sur le bouton : la réponse s’affiche dans le calculateur.'; return; }
    var r = E.goalContinuous({ capital: capital, target: target, hourly: hourly, reserve: 0, dailyMinutes: 60 });
    if (!r.valid) { msg.textContent = r.reason || 'Vérifie tes trois nombres.'; return; }
    msg.textContent = r.missing === 0 ? 'Tu as déjà assez d’argent pour cet objectif.' : 'Il te manque ' + money(r.missing) + '. En jouant 1 h par jour, tu y arrives en ' + r.days + ' jour' + (r.days > 1 ? 's' : '') + ' (' + hours(r.hours) + ' de jeu).';
  }
  if (form) { form.addEventListener('input', preview); preview(); }
  /* 2. Zones sur les captures : « Repérer les champs », « Repérer la réponse », « Tout voir ». */
  document.querySelectorAll('.t-zone-controls').forEach(function (group) { group.hidden = false; });
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-t-zone]'); if (!b) return;
    var figure = b.closest('.t-figure'), zone = b.dataset.tZone;
    figure.querySelectorAll('[data-t-overlay]').forEach(function (o) { o.hidden = zone === 'none' || o.dataset.tOverlay !== zone; });
    figure.querySelectorAll('[data-t-zone]').forEach(function (x) { if (x.hasAttribute('aria-pressed')) x.setAttribute('aria-pressed', String(x.dataset.tZone === zone)); });
  });
  /* 3. Chapitre « Simple et Expert » : deux captures, un bouton pour chacune. */
  var tabs = document.querySelector('.t-mode-tabs');
  if (tabs) {
    tabs.hidden = false;
    function show(mode) { tabs.querySelectorAll('[data-t-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tMode === mode)); }); var s = document.getElementById('t-mode-simple'), x = document.getElementById('t-mode-expert'); if (s) s.hidden = mode !== 'simple'; if (x) x.hidden = mode !== 'expert'; }
    tabs.addEventListener('click', function (ev) { var b = ev.target.closest('[data-t-mode]'); if (b) show(b.dataset.tMode); });
    show('simple');
  }
  /* 4. Sommaire qui suit la lecture. */
  var links = Array.prototype.slice.call(document.querySelectorAll('#sommaire nav a[href^="#"]')), chapters = document.querySelectorAll('.t-chapter[id]');
  if (links.length && window.IntersectionObserver) {
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) current = e.target.id; });
      links.forEach(function (a) { var on = a.getAttribute('href') === '#' + current; a.classList.toggle('is-current', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    chapters.forEach(function (c) { io.observe(c); });
  }
  /* 5. Retour depuis le calculateur : le chapitre d'origine est ouvert et mis en évidence. */
  function reveal() {
    var id = location.hash.replace('#', ''), target = id && document.getElementById(id);
    if (!target) return;
    target.classList.add('is-target'); setTimeout(function () { target.classList.remove('is-target'); }, 4000);
    var sum = document.getElementById('sommaire'); if (sum && window.matchMedia('(max-width: 900px)').matches) sum.open = false;
  }
  window.addEventListener('hashchange', reveal); reveal();
}());
