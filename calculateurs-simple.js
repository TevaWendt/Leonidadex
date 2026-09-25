/* Leonidakit : couche « facile à utiliser » du calculateur.
   Aucun calcul ici : les chiffres restent ceux de LKCalcEngine. Ce fichier ajoute
   la lecture des grands nombres (« = 1 million »), la réglette d'objectif, l'aide
   « Je ne sais pas combien je gagne » et le mode pas à pas (une question à la fois).
   Tout est branché par délégation d'événements : le panneau peut être reconstruit sans rien casser. */
(function () {
  'use strict';
  var E = window.LKCalcEngine, panels = document.getElementById('calc-panels');
  if (!panels) return;
  var nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  var $ = function (id) { return document.getElementById(id); };
  function parse(value) {
    if (E && E.parseLocalizedNumber) { var r = E.parseLocalizedNumber(value); return r.valid ? r.value : null; }
    var t = String(value).trim().replace(/[\s\u00a0\u202f]/g, '');
    return /^\d+(?:[,.]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : null;
  }
  /* « 1 000 000 » se lit mal pour un enfant : on l'écrit aussi en mots. */
  function words(n) {
    if (n === null || !isFinite(n) || n < 1000) return '';
    if (n >= 1e9) return nf.format(n / 1e9) + (n / 1e9 >= 2 ? ' milliards' : ' milliard');
    if (n >= 1e6) return nf.format(n / 1e6) + (n / 1e6 >= 2 ? ' millions' : ' million');
    return nf.format(n / 1e3) + ' mille';
  }
  function group(n) { return Number.isInteger(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n).replace('.', ','); }
  function echoes() {
    document.querySelectorAll('.lk-echo[data-echo]').forEach(function (node) {
      var input = $(node.dataset.echo); if (!input) return;
      var n = parse(input.value), w = words(n);
      node.textContent = w ? '= ' + w + ' $' : '';
      /* séparateurs de milliers, uniquement quand on n'est pas en train d'écrire dans la case */
      if (n !== null && n >= 1000 && Number.isInteger(n) && document.activeElement !== input && /^[\d\s\u00a0\u202f]+$/.test(input.value)) { var g = group(n); if (input.value !== g) input.value = g; }
    });
  }
  /* Réglette d'objectif : 10 000 $ à 10 000 000 $, échelle logarithmique, liée dans les deux sens. */
  var LO = Math.log(10000), HI = Math.log(10000000);
  function toVal(pos) { var v = Math.exp(LO + (HI - LO) * pos / 1000), step = v < 100000 ? 5000 : v < 1000000 ? 10000 : 100000; return Math.round(v / step) * step; }
  function toPos(v) { return Math.round((Math.log(Math.min(Math.max(v, 10000), 10000000)) - LO) / (HI - LO) * 1000); }
  function slider() {
    var range = $('lk-goal-range'), target = $('f-goal-target'), out = $('lk-goal-range-v'); if (!range || !target) return;
    var v = parse(target.value);
    if (v !== null && v > 0) { if (document.activeElement !== range) range.value = toPos(v); if (out) out.textContent = nf.format(v) + ' $'; }
    document.querySelectorAll('[data-target]').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.target) === v)); });
    var daily = $('f-goal-dailyMinutes'), d = daily ? parse(daily.value) : null;
    document.querySelectorAll('[data-daily]').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.daily) === d)); });
    [['data-session-minutes', 'f-session-minutes'], ['data-inverse-minutes', 'f-inverse-minutes']].forEach(function (pair) {
      var f = $(pair[1]), v = f ? parse(f.value) : null;
      document.querySelectorAll('[' + pair[0] + ']').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute(pair[0])) === v)); });
    });
  }
  /* Aide : « ma dernière mission m'a rapporté X $ en Y minutes » donne un gain par heure. */
  var helped = null;
  function helper() {
    var reward = $('lk-help-reward'), minutes = $('lk-help-minutes'), out = $('lk-help-out'), apply = $('lk-help-apply');
    if (!reward || !minutes || !out || !apply) return;
    var r = parse(reward.value), m = parse(minutes.value); helped = null;
    if (reward.value.trim() === '' || minutes.value.trim() === '') out.textContent = 'Écris les deux nombres : on calcule ton gain par heure.';
    else if (r === null || m === null || r < 0 || m <= 0) out.textContent = 'Écris des nombres plus grands que 0, par exemple 25 000 et 15.';
    else { helped = Math.round(r / m * 60); out.textContent = 'Ça fait environ ' + nf.format(helped) + ' $ par heure de jeu.'; }
    apply.disabled = helped === null;
  }
  function fire(node, type) { node.dispatchEvent(new Event(type, { bubbles: true })); }
  /* Mode pas à pas : dans chaque outil, les mêmes cases que le mode simple, montrées une par une.
     L'en-tête (« Question n sur N ») et les boutons Retour / Suivant sont créés une fois et
     déplacés dans l'outil ouvert. */
  var stepByTab = {};
  var head = document.createElement('div'); head.className = 'calc-guidance calc-wizard'; head.hidden = true;
  head.innerHTML = '<p class="calc-wiz-count" id="wiz-count" aria-live="polite"></p><div class="calc-wiz-bar" aria-hidden="true"><span id="wiz-bar"></span></div><p class="calc-wiz-why" id="wiz-why"></p><p class="calc-wiz-tip">Une question à la fois. Ta réponse se calcule toute seule ; tu peux revenir en arrière, rien n’est perdu.</p>';
  var nav = document.createElement('div'); nav.className = 'calc-wiz-nav'; nav.hidden = true;
  nav.innerHTML = '<button type="button" class="calc-button" data-wiz="prev">← Retour</button><button type="button" class="calc-button calc-button-primary" data-wiz="next">Suivant →</button>';
  function guided() { return panels.dataset.mode === 'guided'; }
  function activePanel() { return panels.querySelector('.calc-panel:not([hidden])'); }
  function activeTab() { var p = activePanel(); return p ? p.id.replace('panel-', '') : ''; }
  /* Les questions que l'outil a marquées « à sauter » (data-skip) ne sont pas posées : le parcours s'adapte à la demande. */
  function stepsOf(panel) { return panel ? Array.prototype.slice.call(panel.querySelectorAll('.calc-step[data-step]')).filter(function (n) { return !n.dataset.skip && !n.hidden; }) : []; }
  function current() { return stepByTab[activeTab()] || 1; }
  function resultOf(panel) { return panel ? (panel.querySelector('.calc-result') || document.getElementById(activeTab() + '-results')) : null; }
  function wizard(focus) {
    var on = guided(), panel = activePanel(), steps = stepsOf(panel), total = steps.length;
    document.querySelectorAll('#calc-panels .has-steps').forEach(function (card) { card.classList.remove('has-steps'); });
    if (!on || !total) { head.hidden = true; nav.hidden = true; document.querySelectorAll('#calc-panels .calc-step').forEach(function (n) { n.classList.remove('is-off', 'is-step'); }); return; }
    var step = Math.min(current(), total), cur = steps[step - 1];
    stepByTab[activeTab()] = step;
    Array.prototype.slice.call(panel.querySelectorAll('.calc-step[data-step]')).forEach(function (node) { var mine = node === cur; node.classList.toggle('is-off', !mine); node.classList.toggle('is-step', mine); });
    var card = steps[0].closest('.calc-card'); if (card) card.classList.add('has-steps');
    if (panel.firstElementChild !== head) panel.insertBefore(head, panel.firstChild);
    var box = steps[0].closest('.calc-steps') || steps[0].parentElement;
    if (nav.previousElementSibling !== box) box.insertAdjacentElement('afterend', nav);
    head.hidden = false; nav.hidden = false;
    var count = $('wiz-count'), bar = $('wiz-bar');
    if (count && cur) count.textContent = 'Question ' + step + ' sur ' + total + ' : ' + cur.dataset.question;
    var why = $('wiz-why'); if (why) { why.textContent = cur && cur.dataset.why ? 'Pourquoi cette question ? ' + cur.dataset.why : ''; why.hidden = !(cur && cur.dataset.why); }
    if (bar) bar.style.width = (step / total * 100) + '%';
    var prev = nav.querySelector('[data-wiz="prev"]'), next = nav.querySelector('[data-wiz="next"]');
    if (prev) prev.disabled = step === 1;
    if (next) next.textContent = step === total ? 'Voir ma réponse ↓' : 'Suivant →';
    if (focus && cur) { var input = cur.querySelector('input:not([type="checkbox"]), select'); if (input) input.focus({ preventScroll: true }); }
  }
  function move(delta) {
    var total = stepsOf(activePanel()).length, step = Math.min(current(), total) + delta;
    if (step < 1) return;
    if (step > total) { showResult(); return; }
    stepByTab[activeTab()] = step; wizard(true);
  }
  var hiTimer = null;
  function showResult() {
    var res = resultOf(activePanel()); if (!res) return;
    /* Même quand la réponse est déjà à l'écran, on la met en évidence 4 secondes. */
    var r = res.getBoundingClientRect(), top = (document.querySelector('header') ? document.querySelector('header').getBoundingClientRect().bottom : 0) + 12;
    if (r.top < top || r.bottom > window.innerHeight - 12) res.scrollIntoView({ block: r.height > window.innerHeight - top ? 'start' : 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    res.classList.remove('is-highlighted'); void res.offsetWidth; res.classList.add('is-highlighted');
    clearTimeout(hiTimer); hiTimer = setTimeout(function () { res.classList.remove('is-highlighted'); }, 4000);
    if (!res.hasAttribute('tabindex')) res.setAttribute('tabindex', '-1');
    res.focus({ preventScroll: true });
    var live = $('calc-live'), answer = res.querySelector('.calc-answer'); if (live && answer) { live.textContent = ''; setTimeout(function () { live.textContent = 'Réponse : ' + answer.textContent; }, 50); }
  }
  /* Un bouton « Voir ma réponse » sous les cases de chaque outil, dans tous les modes (le pas à pas a le sien). */
  function answerButtons() {
    panels.querySelectorAll('.calc-steps').forEach(function (box) {
      var btn = box.nextElementSibling && box.nextElementSibling.classList.contains('calc-show-answer') ? box.nextElementSibling : null;
      if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.className = 'calc-button calc-button-primary calc-show-answer'; btn.dataset.showAnswer = '1'; btn.textContent = 'Voir ma réponse ↓'; box.insertAdjacentElement('afterend', btn); }
      btn.hidden = guided();
    });
  }
  /* Sur téléphone, la réponse est sous les cases : un petit résumé reste visible en bas tant qu'on ne la voit pas. */
  var sticky = document.createElement('div'); sticky.className = 'lk-sticky'; sticky.hidden = true;
  sticky.innerHTML = '<span id="lk-sticky-text"></span><button type="button" id="lk-sticky-go">Voir ma réponse ↓</button>';
  document.body.appendChild(sticky);
  var visible = new Map(), io = null;
  function watch() {
    if (!window.IntersectionObserver) return;
    if (io) io.disconnect(); visible = new Map();
    io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { visible.set(e.target, e.isIntersecting); }); summary(); }, { threshold: 0.15 });
    panels.querySelectorAll('.calc-result').forEach(function (res) { io.observe(res); });
  }
  function summary() {
    var panel = activePanel(), res = resultOf(panel), text = $('lk-sticky-text');
    var answer = res && res.querySelector('.calc-answer[data-short]'), main = res && res.querySelector('.calc-result-main');
    var label = answer && answer.dataset.short ? answer.dataset.short : main ? main.textContent : '';
    var top = panel ? panel.getBoundingClientRect().top : 1;
    var show = !!(panel && res && label && !visible.get(res) && top < window.innerHeight * 0.6 && panel.getBoundingClientRect().bottom > 0);
    if (show && text) text.textContent = label;
    sticky.hidden = !show;
  }
  window.addEventListener('scroll', function () { later(); }, { passive: true });
  function refresh() { echoes(); slider(); helper(); wizard(false); answerButtons(); summary(); }
  var queued = false;
  function later() { if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(function () { queued = false; refresh(); }); }

  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.id === 'lk-goal-range') { var target = $('f-goal-target'); if (target) { target.value = String(toVal(Number(el.value))); fire(target, 'input'); } }
    later();
  });
  document.addEventListener('change', later);
  document.addEventListener('focusout', later);
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'lk-help-apply' && helped !== null) {
      var model = $('f-model'), hourly = $('f-goal-hourly');
      if (model && model.value !== 'continuous') { model.value = 'continuous'; fire(model, 'change'); }
      if (hourly) { hourly.value = String(helped); fire(hourly, 'input'); hourly.focus(); }
      var box = b.closest('details'); if (box) box.open = false;
    }
    if (b.dataset.wiz === 'prev') move(-1);
    else if (b.dataset.wiz === 'next') move(1);
    if (b.id === 'lk-sticky-go' || b.dataset.showAnswer) showResult();
    if (b.dataset.mode === 'guided') stepByTab = {};
    later();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' || !guided()) return;
    var el = ev.target; if (!el.matches || !el.matches('#calc-panels .calc-step input[data-field]')) return;
    ev.preventDefault(); move(1);
  });
  if (window.MutationObserver) new MutationObserver(function () { watch(); later(); }).observe(panels, { childList: true });
  watch();
  refresh();
  window.LKCalcSimple = { words: words, group: group, toVal: toVal, toPos: toPos };
}());
