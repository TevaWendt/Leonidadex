/* Section « Activités annexes » (section activites) : filtre de la liste « Tout ce que Rockstar a montré ou annoncé » de
   activites.html. Les boutons et la phrase du compteur sont écrits dans la page (cachés tant que ce script ne tourne pas) :
   ce script n’écrit aucun mot, ne garde rien sur l’appareil et n’envoie aucune requête. Sans lui, toutes les lignes restent
   visibles. Mouvement : les lignes qui réapparaissent entrent en douceur (classe is-in), sauf avec prefers-reduced-motion. */
(function () {
  'use strict';
  var box = document.querySelector('[data-activites-filtre]');
  if (!box) return;
  var buttons = Array.prototype.slice.call(box.querySelectorAll('button[data-filtre]'));
  var count = box.querySelector('[data-activites-n]');
  var fams = Array.prototype.slice.call(document.querySelectorAll('.activites-fam'));
  var items = Array.prototype.slice.call(document.querySelectorAll('.activites-item'));
  if (!buttons.length || !items.length) return;
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function keep(item, f) {
    if (f === 'all') return true;
    if (f === 'fiche') return item.hasAttribute('data-fiche');
    if (f === 'carte') return item.hasAttribute('data-carte');
    return item.getAttribute('data-statut') === f;
  }
  function apply(f) {
    var n = 0;
    items.forEach(function (item) {
      var show = keep(item, f), was = !item.hidden;
      item.hidden = !show;
      item.classList.remove('is-in');
      if (show) { n++; if (!was && !calm) { void item.offsetWidth; item.classList.add('is-in'); } }
    });
    fams.forEach(function (fam) { fam.hidden = !fam.querySelector('.activites-item:not([hidden])'); });
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filtre') === f ? 'true' : 'false'); });
    if (count) count.textContent = String(n);
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-filtre')); }); });
  box.hidden = false;
})();
