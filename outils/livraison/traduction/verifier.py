#!/usr/bin/env python3
"""v7.91 — contrôle d'un morceau traduit en portugais avant de l'ajouter à la mémoire (outils/langues/pt/).

Usage : python3 outils/livraison/traduction/verifier.py <src-NNN.json> <trad-NNN.json>
Code de sortie 0 et « 0 problème » si le morceau est bon ; sinon la liste des problèmes, une ligne chacun.

Contrôles :
- mêmes clés que le morceau source (rien d'ajouté, rien d'oublié ; « _note » et « _notes » permis) ;
- chaque valeur est un texte non vide, sans espace au début ni à la fin (« = » : identique au français) ;
- repères <1>…</1>, <2/> : les mêmes, autant de fois ;
- morceaux de code (« ">, ="…", {1}, \\n, &nbsp;) recopiés ;
- nombres : les mêmes chiffres (les séparateurs des milliers peuvent changer : « 200 000 » → « 200.000 ») ;
- français resté (mots outils, élisions « l’ », « qu’ », lettres è ù û î ï ë œ) et espagnol glissé (« ¿ », « ¡ », « el »,
  « los », « las », « del », « -ción ») ;
- « = » seulement si le texte n'a rien à traduire (nom propre, sigle, nombre) : un texte qui contient des mots français
  courants doit être traduit.
"""
import json, re, sys

src_path, out_path = sys.argv[1], sys.argv[2]
src = json.load(open(src_path, encoding='utf-8'))
entries = src['entrees'] if isinstance(src, dict) and 'entrees' in src else [{'fr': k} for k in src if not k.startswith('_')]
try:
    out = json.load(open(out_path, encoding='utf-8'))
except Exception as e:  # JSON cassé
    print('JSON illisible : %s' % e)
    sys.exit(1)

problems = []
keys = [e['fr'] for e in entries]
want = set(keys)
have = set(k for k in out if not k.startswith('_'))
for k in out:
    if k.startswith('_') and k not in ('_note', '_notes', '_verifie'):
        problems.append('clé réservée inconnue : %r (permis : _note, _notes, _verifie)' % k)
for k in sorted(want - have):
    problems.append('manque : %r' % k[:120])
for k in sorted(have - want):
    problems.append('clé en trop (pas dans le morceau) : %r' % k[:120])

MARK = re.compile(r'</?\d+/?>')
CODE = re.compile(r'"\s*>|="|\{\d+\}|\\n|&nbsp;|&amp;|aria-[a-z]+=|data-[a-z-]+=|class=|href=')
NUM = re.compile(r'\d+(?:[   .]\d{3})*(?:[.,]\d+)?')
FR_WORDS = set('le les des du une est sont pour avec dans sur cette ces être avoir aux au où ça très aussi déjà tu ton ta tes toi votre vous nous ils elles leur jeu jour jours heure heures véhicule véhicules fiche fiches arme armes achat achats prix gratuit encore toujours peut peux faut chaque quand alors donc puis rien aucun aucune voir plus être était sera seront ici voici voilà chez parce depuis mieux beaucoup trop même lieu lieux carte cartes cette celle celui leurs lui elle il je moi mon ma mes sa son ses'.split())
# mots communs aux deux langues : jamais signalés (« a », « de », « e », « o », « mais », « ou », « que », « se »…)
COMMON = set('a de e o mais ou que se em com para por não sem como seu sua total normal menu site mapa simples'.split())
ES_WORDS = set('el los las del y también puedes tus tú usted hay muy pero ahora todavía aquí cuando coche dinero juego jugar puedo quiero tengo'.split())
LETTERS_FR = re.compile(r'[èùûîïëœæÈÙÛÎÏËŒÆ]')
ELISION = re.compile(r'(?<![A-Za-zÀ-ÿ])(?:l|d|qu|n|j|c|s|m|t)’(?=[a-zà-ÿ])', re.I)

def words(t):
    return re.findall(r"[a-zà-ÿœæ]+", re.sub(r'</?\d+/?>', ' ', t.lower()))

def numbers(t):
    t = re.sub(r'</?\d+/?>', ' ', t)
    found = []
    for m in NUM.finditer(t):
        n = re.sub(r'[   .](?=\d{3}\b)', '', m.group(0))
        n = n.replace('.', ',')
        found.append(n)
    return sorted(found)

def french_hits(t):
    hits = [w for w in words(t) if w in FR_WORDS and w not in COMMON]
    if LETTERS_FR.search(t):
        hits.append('lettre ' + LETTERS_FR.search(t).group(0))
    if ELISION.search(t):
        hits.append('élision « ' + ELISION.search(t).group(0) + ' »')
    return hits

def spanish_hits(t):
    # un mot à majuscule est un nom (« El Martillo ») : pas compté
    plain = re.sub(r'</?\d+/?>', ' ', t)
    # pronoms enclitiques portugais (« compará-los », « fazê-las ») : pas de l'espagnol
    plain = re.sub(r'-(?:los|las|lo|la|nos)\b', '', plain)
    hits = [w for w in re.findall(r"[A-Za-zÀ-ÿ]+", plain) if w.islower() and w in ES_WORDS]
    if '¿' in t or '¡' in t:
        hits.append('¿ ou ¡')
    if re.search(r'ción\b|ciones\b', t):
        hits.append('-ción')
    if 'ñ' in t.lower() and not re.search(r'[A-Z][a-zñ]*ñ', t):
        hits.append('ñ')
    return hits

# « _verifie » : { "clé": "raison" } — l'agent y dit pourquoi un mot signalé est juste (nom propre, mot portugais) ;
# seules les alertes de langue (français ou espagnol) peuvent être levées ainsi, jamais les repères, le code ou les nombres.
ok = out.get('_verifie') or {}
if not isinstance(ok, dict):
    problems.append('« _verifie » doit être un objet { clé: raison }'); ok = {}
for k in ok:
    if k not in want:
        problems.append('« _verifie » nomme une clé absente du morceau : %r' % k[:90])
for e in entries:
    k = e['fr']
    if k not in out:
        continue
    v = out[k]
    tag = '%r' % k[:90]
    lang_ok = k in ok and isinstance(ok.get(k), str) and len(ok.get(k).strip()) >= 3
    if not isinstance(v, str) or not v.strip():
        problems.append(tag + ' : valeur vide ou pas un texte'); continue
    if v != v.strip():
        problems.append(tag + ' : espace au début ou à la fin de la traduction (le générateur remet ceux du français)')
    if v == '=':
        if lang_ok:
            continue
        fr_hits = [w for w in words(k) if w in FR_WORDS and w not in COMMON]
        if len(fr_hits) >= 2 or (len(words(k)) >= 3 and fr_hits):
            problems.append(tag + ' : « = » alors que le texte a des mots français (%s) : à traduire' % ', '.join(fr_hits[:4]))
        continue
    if sorted(MARK.findall(k)) != sorted(MARK.findall(v)):
        problems.append(tag + ' : repères différents (%s → %s)' % (' '.join(sorted(MARK.findall(k))), ' '.join(sorted(MARK.findall(v)))))
    for c in set(CODE.findall(k)):
        if v.count(c) < k.count(c):
            problems.append(tag + ' : morceau de code « %s » perdu' % c)
    nk, nv = numbers(k), numbers(v)
    if nk != nv:
        # « 1er » → « 1º », « 20 h » → « 20h » gardent leurs chiffres ; un nombre écrit en lettres ne compte pas
        problems.append(tag + ' : nombres différents (%s → %s)' % (', '.join(nk) or '—', ', '.join(nv) or '—'))
    fh = [] if lang_ok else french_hits(v)
    if fh:
        problems.append(tag + ' : français resté ? (%s) → %r' % (', '.join(fh[:4]), v[:100]))
    sh = [] if lang_ok else spanish_hits(v)
    if sh:
        problems.append(tag + ' : espagnol ? (%s) → %r' % (', '.join(sh[:4]), v[:100]))
    if v == k and french_hits(k) and not lang_ok:
        problems.append(tag + ' : traduction identique au français')

for p in problems:
    print(p)
print('%d problème%s' % (len(problems), '' if len(problems) < 2 else 's'))
sys.exit(1 if problems else 0)
