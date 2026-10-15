#!/bin/bash
# v7.88 : tous les contrôles d'avant livraison (≈ 1 h 15). Usage : bash outils/livraison/verifier-tout.sh <dossier des journaux> : lancer depuis la racine du dépôt, rien d'autre de lourd en même temps
S=${1:-/tmp/controles}; mkdir -p $S
# NODE_PATH : les dépendances des tests d'abord, même si l'environnement en définit un autre
export NODE_PATH=$HOME/deps/node_modules:/opt/npm-tools/node_modules${NODE_PATH:+:$NODE_PATH} LK_CHROMIUM=${LK_CHROMIUM:-/opt/pw-browsers/chromium} CHROMIUM=${LK_CHROMIUM:-/opt/pw-browsers/chromium} SITE_ROOT=$PWD
L=$S/resume.log; : > $L; step(){ echo "== $1 $(date +%T)" >> $L; }
step cadre; node outils/calculateur-cadre.cjs --ecrire >> $L 2>&1; echo "code $?" >> $L
step suite; node --test $(ls outils/tests/*.test.cjs | grep -v langues.test.cjs) > $S/suite.log 2>&1; echo "code $?" >> $L; tail -12 $S/suite.log >> $L
step langues; node --max-old-space-size=4096 --test outils/tests/langues.test.cjs > $S/langues.log 2>&1; echo "code $?" >> $L; tail -12 $S/langues.log >> $L
step verifier; node outils/verifier.js >> $L 2>&1; echo "code $?" >> $L
step preuve; node outils/preuve-confidentialite.cjs > $S/preuve.log 2>&1; echo "code $?" >> $L; tail -1 $S/preuve.log >> $L
step langues-pages; node outils/tests/langues-pages-browser.cjs $S/langues-pages > $S/langues-pages.log 2>&1; echo "code $?" >> $L; tail -6 $S/langues-pages.log >> $L
step langues-browser; node outils/tests/langues-browser.cjs $S/langues-br > $S/langues-br.log 2>&1; echo "code $?" >> $L; tail -6 $S/langues-br.log >> $L
step ecrans; node outils/tests/ecrans-browser.cjs $S/ecrans > $S/ecrans.log 2>&1; echo "code $?" >> $L; tail -6 $S/ecrans.log >> $L
step ecrans-de; LK_ECRANS_LANGUE=de node outils/tests/ecrans-browser.cjs $S/ecrans-de 320 390 768 1024 1280 > $S/ecrans-de.log 2>&1; echo "code $?" >> $L; tail -3 $S/ecrans-de.log >> $L
step audit; node outils/tests/audit-site-browser.cjs $S/audit --rapide > $S/audit.log 2>&1; echo "code $?" >> $L; tail -8 $S/audit.log >> $L
python3 -m http.server 8055 --bind 127.0.0.1 > /dev/null 2>&1 & SRV=$!; sleep 2
step cookies; node outils/audit-cookies.cjs http://localhost:8055 $S/cookies.json > $S/cookies.log 2>&1; echo "code $?" >> $L
kill $SRV; step FIN
