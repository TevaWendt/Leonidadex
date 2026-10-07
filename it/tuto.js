/* Leonidakit : page Tuto.
   Aucun calcul propre : l'exercice de démarrage passe par LKCalcEngine, exactement comme le calculateur.
   Tout reste lisible sans ce script ; il ajoute le confort : aperçu du résultat, zones sur les captures,
   captures Simple / Expert, sommaire qui suit la lecture, retour au chapitre d'origine. */
(function () {
  'use strict';
  var E = window.LKCalcEngine, nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
  var money = function (n) { return E && E.dollars ? E.dollars(nf.format(Math.round(n)), ' ') : nf.format(Math.round(n)) + ' $'; };
  var hours = function (h) { var m = Math.round(h * 60), H = Math.floor(m / 60), M = m % 60; return H ? H + ' h' + (M ? ' ' + String(M).padStart(2, '0') + (typeof document!=='undefined'&&/^de/.test(document.documentElement.lang||'')?' min':'') : '') : M + ' min'; };
  function parse(v) { if (E && E.parseLocalizedNumber) { var r = E.parseLocalizedNumber(v); return r.valid ? r.value : null; } var t = String(v).replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; }
  /* 1. Exercice de démarrage : la réponse s'affiche ici avant d'ouvrir le calculateur. */
  var form = document.querySelector('.t-start-form'), msg = document.getElementById('t-start-message');
  function preview() {
    if (!form || !msg) return;
    var capital = parse(form.elements.capital.value), target = parse(form.elements.target.value), hourly = parse(form.elements.hourly.value);
    if (capital === null || target === null || hourly === null) { msg.textContent = 'Scrivi tre numeri, per esempio 200.000, 1.000.000 e 100.000.'; return; }
    if (!E || !E.goalContinuous) { msg.textContent = 'Clicca sul pulsante: la risposta compare nel calcolatore.'; return; }
    var r = E.goalContinuous({ capital: capital, target: target, hourly: hourly, reserve: 0, dailyMinutes: 60 });
    if (!r.valid) { msg.textContent = r.reason || 'Controlla i tuoi tre numeri.'; return; }
    msg.textContent = r.missing === 0 ? 'Hai già abbastanza soldi per questo obiettivo.' : 'Ti mancano ' + money(r.missing) + '. Giocando 1 h al giorno, ci arrivi in ' + r.days + ((E && E.plural ? E.plural(r.days) : r.days > 1) ? ' giorni' : ' giorno') + ' (' + hours(r.hours) + ' di gioco).';
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
      /* v7.70 : la barre et le texte de progression du sommaire suivent le chapitre lu */
      var idx = links.findIndex(function (a) { return a.getAttribute('href') === '#' + current; }); var bar = document.querySelector('[data-t-prog]'), txt = document.querySelector('[data-t-prog-txt]');
      if (idx >= 0) { if (bar) bar.style.width = Math.round((idx + 1) / links.length * 100) + '%'; if (txt) txt.textContent = 'Capitolo ' + (idx + 1) + ' su ' + links.length; }
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
