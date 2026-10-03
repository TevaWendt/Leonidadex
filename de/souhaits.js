/* LEONIDAKIT — boutons « Garder » (souhaits) (v7.50, lot 3).
   Un souhait n’est jamais une possession : il va dans lk_wish_v1 (carnets-core.js), séparé des cases « Je l’ai ».
   Balisage : <button type="button" data-wish-fam="styles" data-wish-id="…" data-wish-on="Style gardé" data-wish-off="Garder ce style">.
   Stockage indisponible : le bouton reste tel quel et un message le dit (rien n’est annoncé comme gardé). */
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
    label.textContent = on ? (b.getAttribute('data-wish-on') || 'Gemerkt') : (b.getAttribute('data-wish-off') || 'Behalten');
  }
  buttons.forEach(function (b) {
    b.hidden = false; paint(b);
    b.addEventListener('click', function () {
      var fam = b.getAttribute('data-wish-fam'), id = b.getAttribute('data-wish-id'), on = b.getAttribute('aria-pressed') !== 'true';
      var ok = false; try { ok = store.setWish(fam, id, on, 'catalogue'); } catch (e) { ok = false; }
      if (!ok) { say('Diese Auswahl lässt sich nicht merken: Der Browserspeicher ist nicht verfügbar.'); return; }
      paint(b);
      say(on ? 'Auf deiner Wunschliste gespeichert. Das zählt nicht als Besitz: In deinem Fortschritt wird nichts abgehakt.' : 'Von deiner Wunschliste entfernt.');
    });
  });
  window.addEventListener('storage', function (ev) { if (ev.key === 'lk_wish_v1') buttons.forEach(paint); });
}());
