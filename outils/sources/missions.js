/* Section « Missions et leurs solutions » (section missions) : la case « J’ai terminé cette mission » des fiches.
   Gardée sur l’appareil seulement, sous une seule clé (lk-missions-terminees-v1 : liste d’identifiants de missions) ;
   aucun cookie, aucune requête. Sans JavaScript ou sans stockage, la case reste cachée. Sur la page de démonstration
   (data-missions-demo), la case fonctionne sans rien enregistrer. Ce script n’écrit aucun mot : le texte est dans la page. */
(function () {
  'use strict';
  var KEY = 'lk-missions-terminees-v1';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('[data-missions-fait]'));
  if (!boxes.length) return;
  function read() { try { var v = JSON.parse(window.localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && /^[a-z0-9-]+$/.test(x); }) : []; } catch (e) { return null; } }
  function write(list) { try { if (list.length) window.localStorage.setItem(KEY, JSON.stringify(list)); else window.localStorage.removeItem(KEY); return true; } catch (e) { return false; } }
  var done = read();
  boxes.forEach(function (box) {
    var id = box.getAttribute('data-missions-fait'), demo = box.hasAttribute('data-missions-demo'), input = box.querySelector('input[type="checkbox"]');
    if (!input || (!demo && done === null)) return;
    input.checked = !demo && done.indexOf(id) >= 0;
    box.classList.toggle('is-done', input.checked);
    box.hidden = false;
    input.addEventListener('change', function () {
      box.classList.toggle('is-done', input.checked);
      if (demo) return;
      var list = read() || [];
      list = list.filter(function (x) { return x !== id; });
      if (input.checked) list.push(id);
      write(list);
    });
  });
})();
