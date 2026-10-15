#!/usr/bin/env python3
# v7.88 : logo vectoriel de Leonidakit pour le kit presse (presse/leonidakit-logo*.svg), tracé depuis la police du site
# (fonts/archivo-latin.woff2, Archivo, graisse 900, approche -0,02 em comme l'en-tête du site) : les lettres sont des tracés,
# le fichier s'affiche pareil partout, sans la police. « Leonida » à l'encre, « kit » en corail.
# Lancé à la main (pas dans la régénération) : python3 outils/presse-logo.py  (modules : fonttools, brotli, uharfbuzz)
import io, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import uharfbuzz as hb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
font = TTFont(os.path.join(ROOT, 'fonts/archivo-latin.woff2'))
font = instancer.instantiateVariableFont(font, {'wght': 900})
font.flavor = None
buf = io.BytesIO(); font.save(buf); data = buf.getvalue()
face = hb.Face(data); hbfont = hb.Font(face)
UPM = font['head'].unitsPerEm
TRACK = -0.02 * UPM  # letter-spacing de .brand (style.css)
gs = font.getGlyphSet()

def shape(text):
    b = hb.Buffer(); b.add_str(text); b.guess_segment_properties()
    hb.shape(hbfont, b, {'kern': True, 'liga': False})
    order = font.getGlyphOrder()
    return [(order[i.codepoint], p.x_advance, p.x_offset, p.y_offset) for i, p in zip(b.glyph_infos, b.glyph_positions)]

def outline(parts):
    """parts : [(texte, couleur)] → (chemins par couleur, boîte englobante en unités de la police, y vers le bas)"""
    x = 0.0; paths = []; bp = BoundsPen(gs)
    for text, color in parts:
        d = []
        for name, adv, xo, yo in shape(text):
            pen = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
            # repère SVG : y vers le bas, ligne de base à 0
            gs[name].draw(TransformPen(pen, (1, 0, 0, -1, x + xo, -yo)))
            gs[name].draw(TransformPen(bp, (1, 0, 0, -1, x + xo, -yo)))
            if pen.getCommands(): d.append(pen.getCommands())
            x += adv + TRACK
        paths.append((color, ' '.join(d)))
    return paths, bp.bounds

def write(name, parts, pad, bg=None, title='Leonidakit'):
    paths, (x0, y0, x1, y1) = outline(parts)
    vx, vy, vw, vh = x0 - pad, y0 - pad, (x1 - x0) + 2 * pad, (y1 - y0) + 2 * pad
    # taille d'affichage par défaut : 1200 px de large (le dessin est vectoriel, toute taille convient)
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.0f %.0f %.0f %.0f" width="1200" height="%.0f" role="img" aria-labelledby="t"><title id="t">%s</title>' % (vx, vy, vw, vh, round(1200 * vh / vw), title)]
    if bg: out.append('<rect x="%.0f" y="%.0f" width="%.0f" height="%.0f" fill="%s"/>' % (vx, vy, vw, vh, bg))
    for color, d in paths: out.append('<path fill="%s" d="%s"/>' % (color, d))
    out.append('</svg>\n')
    with open(os.path.join(ROOT, 'presse', name), 'w', encoding='utf-8') as f: f.write(''.join(out))
    print(name, '%.0f × %.0f' % (vw, vh), os.path.getsize(os.path.join(ROOT, 'presse', name)), 'octets')

os.makedirs(os.path.join(ROOT, 'presse'), exist_ok=True)
INK, PAPER, CORAL_TEXT, CORAL = '#1A1A1E', '#FDFBF7', '#B93220', '#E8452C'
# fond transparent : sur fond clair (encre + corail foncé) et sur fond sombre (papier + corail vif)
write('leonidakit-logo.svg', [('Leonida', INK), ('kit', CORAL_TEXT)], 60)
write('leonidakit-logo-sombre.svg', [('Leonida', PAPER), ('kit', CORAL)], 60)
