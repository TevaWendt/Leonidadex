/* Généré depuis outils/sources/souhaits.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  if (!window.LKCarnets) return;
  var status = document.getElementById('acq-feedback') || document.getElementById('lk-status');
  function say(t) { if (window.LK && window.LK.status) window.LK.status(t); else if (status) status.textContent = t; }
  var store; try { store = window.LKCarnets.create({ storage: window.localStorage, notice: say }); } catch (e) { store = null; }
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-wish-fam][data-wish-id]'));
  if (!store || !buttons.length) return;
  function paint(b) {
    var on = false; try { on = store.isWished(b.getAttribute('data-wish-fam'), b.getAttribute('data-wish-id')); } catch (e) { on = false; }
    b.setAttribute('aria-pressed', String(on));
    var label = b.querySelector('[data-wish-label]') || b;
    label.textContent = on ? (b.getAttribute('data-wish-on') || 'Guardado') : (b.getAttribute('data-wish-off') || 'Guardar');
  }
  buttons.forEach(function (b) {
    b.hidden = false; paint(b);
    b.addEventListener('click', function () {
      var fam = b.getAttribute('data-wish-fam'), id = b.getAttribute('data-wish-id'), on = b.getAttribute('aria-pressed') !== 'true';
      var ok = false; try { ok = store.setWish(fam, id, on, 'catalogue'); } catch (e) { ok = false; }
      if (!ok) { say('No se puede guardar esta elección: el almacenamiento del navegador no está disponible.'); return; }
      paint(b);
      say(on ? 'Guardado en tu lista de deseos. No es una posesión: no se marca nada en tu progreso.' : 'Quitado de tu lista de deseos.');
    });
  });
  window.addEventListener('storage', function (ev) { if (ev.key === 'lk_wish_v1') buttons.forEach(paint); });
}());
