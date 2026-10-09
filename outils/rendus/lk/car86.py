# Coupé des années 80, deuxième génération (v7.77) : générique, sans marque, modelé en surfaces de subdivision.
# Caisse et pavillon sont des lofts de sections transversales (courbes de profil lissées), subdivisés avec arêtes vives
# (pli de ceinture, épaules), passages de roue creusés par booléens ; vitrages, montants noirs et toit peints par masques UV
# (u = x en mètres, v = paramètre de la section) ; phares escamotables, pare-chocs enveloppants, bandeau de feux à lamelles,
# intérieur sommaire visible derrière les vitres, roues complètes (pneu scanné remis à neuf, jantes usinées, freins).
# Repère : x vers l'avant, y à gauche, z en haut ; longueur 4,34 m, largeur 1,86 m, hauteur 1,12 m.
import bpy, bmesh, math, random, bisect, os
from mathutils import Vector, Matrix
from .core import *
from .core import _nodes
from . import assets as A

X_F, X_R = 2.18, -2.16      # avant, arrière
AXF, AXR = 1.28, -1.17      # essieux
RT = 0.315                  # rayon du pneu
ARCH = 0.368                # rayon des passages de roue
TRACK = 0.775               # demi-voie (plan médian de la roue)
X_WS, X_RTF, X_RTR, X_RW = 0.80, 0.07, -0.60, -1.10     # pied de pare-brise, avant du toit, arrière du toit, pied de lunette


def pchip(pts):
    """interpolation cubique monotone (sans dépassement) d'une liste de points (x, y)"""
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; n = len(xs)
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]; d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n; m[0] = d[0]; m[-1] = d[-1]
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0: m[i] = 0.0
        else:
            w1 = 2 * h[i] + h[i - 1]; w2 = h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    def f(x):
        if x <= xs[0]: return ys[0]
        if x >= xs[-1]: return ys[-1]
        i = max(0, min(n - 2, bisect.bisect_right(xs, x) - 1))
        t = (x - xs[i]) / h[i]; t2 = t * t; t3 = t2 * t
        return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1]
    return f


# ------------------------------------------------------------------ profils (vue de côté, vue de dessus)
W = pchip([(-2.16, 0.70), (-2.08, 0.84), (-1.9, 0.9), (-1.5, 0.925), (-1.17, 0.93), (-0.8, 0.915), (-0.2, 0.905), (0.5, 0.905),
           (1.0, 0.915), (1.28, 0.92), (1.65, 0.905), (1.95, 0.86), (2.1, 0.79), (2.18, 0.68)])
ZC = pchip([(-2.16, 0.5), (0.0, 0.455), (2.18, 0.41)])                     # pli de ceinture (vive)
ZS = pchip([(-2.16, 0.87), (-1.8, 0.885), (-1.1, 0.875), (-0.4, 0.84), (0.3, 0.805), (0.8, 0.785), (1.3, 0.72), (1.8, 0.635),
            (2.05, 0.575), (2.18, 0.54)])                                    # épaule (arête du capot, des ailes, de la poupe)
ZD = pchip([(-2.16, 0.88), (-1.8, 0.9), (-1.1, 0.895), (-0.4, 0.865), (0.3, 0.825), (0.8, 0.805), (1.3, 0.742), (1.8, 0.65),
            (2.05, 0.587), (2.18, 0.55)])                                   # dessus au centre (bombé)
ZB = pchip([(-2.16, 0.27), (-2.0, 0.21), (-1.7, 0.185), (1.6, 0.18), (1.95, 0.205), (2.18, 0.26)])
ZR = pchip([(X_RW - 0.02, 0.86), (-0.95, 0.975), (-0.75, 1.065), (X_RTR, 1.095), (-0.25, 1.11), (X_RTF, 1.097), (0.3, 1.005),
            (0.55, 0.9), (X_WS + 0.03, 0.775)])                              # toit au centre


def body_half(x):
    """demi-section de la caisse, du centre du dessous au centre du dessus (12 points)"""
    w = W(x); zb = ZB(x); zc = ZC(x); zs = ZS(x); zd = max(ZD(x), zs + 0.004)
    zc = min(zc, zs - 0.12); zb = min(zb, zc - 0.1)
    wt = w - 0.034
    return [(0.0, zb), (w * 0.45, zb), (w - 0.09, zb + 0.002), (w - 0.022, zb + 0.03), (w - 0.002, zc - 0.07), (w + 0.006, zc),
            (w - 0.002, zc + 0.03), (wt + 0.004, zs - 0.035), (wt - 0.008, zs), (wt - 0.07, zs + 0.35 * (zd - zs)), (wt * 0.48, zd - 0.002), (0.0, zd)]


BODY_CREASE = (5, 8)


def gh_half(x):
    """demi-section du pavillon, de la base (ceinture) au centre du toit (7 points) ; v croît de 0 à 1"""
    zs = ZS(x) - 0.012; zr = max(ZR(x), zs + 0.004)
    wb = W(x) - 0.105
    wr = 0.6 - 0.05 * max(0.0, (x - 0.2) / 0.6) ** 2 - 0.08 * max(0.0, (-0.6 - x) / 0.5) ** 2
    wr = min(wr, wb - 0.02)
    hh = max(0.0, zr - zs)
    return [(wb, zs), (wb - 0.42 * (wb - wr), zs + 0.45 * max(0.0, hh - 0.045)), (wr + 0.018, zs + max(0.0, hh - 0.045)), (wr, zs + max(0.0, hh - 0.018)),
            (wr - 0.07, zs + max(0.0, hh - 0.004)), (wr * 0.5, zr - 0.001), (0.0, zr)]


GH_T = [0.0, 0.2, 0.4, 0.5, 0.62, 0.8, 1.0]     # paramètre v de chaque point de la section du pavillon


def stations(x0, x1, n, dense_ends=0.5):
    out = []
    for i in range(n):
        t = i / (n - 1)
        s = (1 - dense_ends) * t + dense_ends * (0.5 - 0.5 * math.cos(math.pi * t))
        out.append(x0 + (x1 - x0) * s)
    return out


def loft(name, xs, half_fn, closed=True, crease=(), crease_k=0.85, tvals=None, cap=True):
    """surface de sections transversales symétriques (x croissant), UV : u = x (m), v = paramètre de la demi-section"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); cr = bm.edges.layers.float.new('crease_edge')
    rows = []; n = None
    for x in xs:
        half = half_fn(x); n = len(half)
        if closed:
            pts = [(x, y, z) for (y, z) in half] + [(x, -y, z) for (y, z) in reversed(half[1:-1])]
        else:
            pts = [(x, -y, z) for (y, z) in half] + [(x, y, z) for (y, z) in reversed(half[:-1])]
        rows.append([bm.verts.new(p) for p in pts])
    k = len(rows[0])
    tv = tvals or [i / (n - 1) for i in range(n)]
    if closed: vpar = tv + list(reversed(tv[1:-1]))
    else: vpar = tv + list(reversed(tv[:-1]))
    def mk(a, b, i, j, xa, xb):
        f = bm.faces.new((a[i], b[i], b[j], a[j]))
        for lp, (x, v) in zip(f.loops, ((xa, vpar[i]), (xb, vpar[i]), (xb, vpar[j]), (xa, vpar[j]))): lp[uvl].uv = (x, v)
        return f
    for r in range(len(rows) - 1):
        a, b = rows[r], rows[r + 1]
        for i in range(k - 1 if not closed else k):
            j = (i + 1) % k
            mk(a, b, i, j, xs[r], xs[r + 1])
    # arêtes vives (pli de ceinture, épaules)
    idx = set()
    for c in crease:
        idx.add(c); idx.add((2 * n - 2 - c) if closed else (2 * n - 2 - c))
    for r in range(len(rows) - 1):
        for i in idx:
            e = bm.edges.get((rows[r][i], rows[r + 1][i]))
            if e: e[cr] = crease_k
    if closed and cap:
        for row, sgn in ((rows[0], -1), (rows[-1], 1)):
            c = Vector((0, 0, 0))
            for v in row: c += v.co
            c /= len(row)
            inner = [bm.verts.new(c + (v.co - c) * 0.55 + Vector((sgn * 0.012, 0, 0))) for v in row]
            for i in range(k):
                j = (i + 1) % k
                f = bm.faces.new((row[i], row[j], inner[j], inner[i]))
                for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, 0.0)
            f = bm.faces.new(inner)
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, 0.0)
            for i in range(k):
                e = bm.edges.get((row[i], row[(i + 1) % k]))
                if e: e[cr] = 0.6
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm, smooth=True)
    return ob


def subdivide(ob, lv=2):
    m = ob.modifiers.new('subdiv', 'SUBSURF'); m.levels = lv; m.render_levels = lv; m.use_creases = True
    try: m.uv_smooth = 'PRESERVE_BOUNDARIES'
    except Exception: pass
    apply_mods(ob)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def body(lv=2, low=0.0):
    xs = stations(X_R, X_F, 96, 0.55)
    ob = loft('caisse', xs, body_half, closed=True, crease=BODY_CREASE)
    subdivide(ob, lv)
    # passages de roue : cylindres creusés de chaque côté (la cavité devient la coque du passage)
    cutters = []
    for xw in (AXF, AXR):
        for sd in (-1, 1):
            c = cyl('decoupe', ARCH, 0.9, 96, (xw, sd * (0.52 + 0.45), RT), (math.pi / 2, 0, 0))
            cutters.append(c)
    for c in cutters:
        m = ob.modifiers.new('arche', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = c; m.solver = 'EXACT'
        apply_mods(ob)
    for c in cutters: bpy.data.objects.remove(c)
    ob.location.z = -low
    return ob


def greenhouse(lv=2, low=0.0):
    xs = stations(X_RW - 0.02, X_WS + 0.03, 60, 0.3)
    ob = loft('pavillon', xs, gh_half, closed=False, crease=(3,), crease_k=0.6, tvals=GH_T)
    subdivide(ob, lv)
    ob.location.z = -low
    return ob


# ------------------------------------------------------------------ matières de la voiture
def flake_normal(nt, scale=2600.0, k=0.3):
    """paillettes métalliques : normale perturbée cellule par cellule (couche de base seulement, le vernis reste lisse)"""
    N = nt.nodes; L = nt.links
    vo = voronoi(nt, tex_coord(nt, 'Object', 1.0), scale)
    sub = N.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; L.new(vo.outputs['Color'], sub.inputs[0]); sub.inputs[1].default_value = (0.5, 0.5, 0.5)
    sc = N.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; L.new(sub.outputs[0], sc.inputs[0]); sc.inputs['Scale'].default_value = k
    geo = N.new('ShaderNodeNewGeometry')
    add = N.new('ShaderNodeVectorMath'); add.operation = 'ADD'; L.new(geo.outputs['Normal'], add.inputs[0]); L.new(sc.outputs[0], add.inputs[1])
    nrm = N.new('ShaderNodeVectorMath'); nrm.operation = 'NORMALIZE'; L.new(add.outputs[0], nrm.inputs[0])
    return nrm.outputs[0]


def obj_xyz(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    return sep.outputs['X'], sep.outputs['Y'], sep.outputs['Z'], tc


def gap_mask(nt, gaps, width=0.0016):
    """joints de carrosserie : liste de (axe, valeur, axe2, min, max[, zmin]) en coordonnées objet, |y| pour la symétrie ;
    renvoie un masque 1 au creux du joint, 0 ailleurs"""
    X, Y, Z, _ = obj_xyz(nt)
    comp = {'X': X, 'Y': math_node(nt, 'ABSOLUTE', Y), 'Z': Z}
    acc = None
    for g in gaps:
        ax, val, ax2, lo, hi = g[:5]; zmin = g[5] if len(g) > 5 else None
        d = math_node(nt, 'ABSOLUTE', math_node(nt, 'SUBTRACT', comp[ax], val))
        line = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'MINIMUM', math_node(nt, 'DIVIDE', d, width), 1.0))
        inr = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', comp[ax2], lo), math_node(nt, 'LESS_THAN', comp[ax2], hi))
        if zmin is not None: inr = math_node(nt, 'MULTIPLY', inr, math_node(nt, 'GREATER_THAN', Z, zmin))
        gm = math_node(nt, 'MULTIPLY', line, inr)
        acc = gm if acc is None else math_node(nt, 'MAXIMUM', acc, gm)
    return acc


POP = (1.80, 2.03, 0.40, 0.76)     # trappes des phares escamotables : x0, x1, |y|0, |y|1
GAPS = [('X', 0.66, 'Z', 0.19, 0.83), ('X', -0.42, 'Z', 0.19, 0.89),                       # portes
        ('X', X_WS + 0.04, 'Y', 0.0, 0.78, 0.6), ('Y', 0.79, 'X', X_WS + 0.04, 2.07, 0.5), ('X', 2.07, 'Y', 0.0, 0.79, 0.45),   # capot
        ('X', POP[0], 'Y', POP[2], POP[3], 0.5), ('X', POP[1], 'Y', POP[2], POP[3], 0.5), ('Y', POP[2], 'X', POP[0], POP[1], 0.5), ('Y', POP[3], 'X', POP[0], POP[1], 0.5),
        ('X', X_RW - 0.06, 'Y', 0.0, 0.72, 0.8), ('X', -2.04, 'Y', 0.0, 0.72, 0.8), ('Y', 0.72, 'X', -2.04, X_RW - 0.06, 0.8),   # capot moteur
        ('X', -1.62, 'Z', 0.76, 0.84), ('X', -1.48, 'Z', 0.76, 0.84), ('Z', 0.76, 'X', -1.62, -1.48), ('Z', 0.84, 'X', -1.62, -1.48)]   # trappe à carburant (côtés)


def M_car(color, metal=0.55, rough=0.34, coat_rough=0.022, flakes=0.28, film=0.0, film_ior=1.6, gaps=GAPS, two_tone=None, stripes=None,
          peel=0.03, name='carrosserie'):
    """peinture de carrosserie : base (métallisée à paillettes), vernis lisse (peau d'orange légère), joints en creux ;
    two_tone = couleur du bas de caisse (sous le pli) ; stripes = [(couleur, z0, z1)] bandes latérales au-dessus du pli"""
    m = bpy.data.materials.new(name); nt = _nodes(m); N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Metallic'].default_value = metal; p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = 1.0; p.inputs['Coat Roughness'].default_value = coat_rough; p.inputs['Coat IOR'].default_value = 1.5
    if film > 0: p.inputs['Thin Film Thickness'].default_value = film; p.inputs['Thin Film IOR'].default_value = film_ior
    X, Y, Z, tc = obj_xyz(nt)
    col = None
    if two_tone is not None or stripes:
        zc = math_node(nt, 'SUBTRACT', 0.4555, math_node(nt, 'MULTIPLY', X, 0.0206))      # hauteur du pli (≈ ZC(x))
        rel = math_node(nt, 'SUBTRACT', Z, zc)
        col = p.inputs['Base Color'].default_value[:3]
        cur = None
        if two_tone is not None:
            low_ = math_node(nt, 'LESS_THAN', rel, -0.002)
            cur = mix(nt, tuple(col), tuple(two_tone), low_)
        for (sc, z0, z1) in (stripes or []):
            band = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', rel, z0), math_node(nt, 'LESS_THAN', rel, z1))
            cur = mix(nt, cur if cur is not None else tuple(col), tuple(sc), band)
        L.new(cur, p.inputs['Base Color'])
    g = gap_mask(nt, gaps) if gaps else None
    # vernis : peau d'orange + creux des joints ; base : paillettes + creux des joints
    pe = noise(nt, tex_coord(nt, 'Object', 1.0), 55.0, 2.0, 0.5).outputs['Fac']
    b1 = N.new('ShaderNodeBump'); b1.inputs['Strength'].default_value = peel; b1.inputs['Distance'].default_value = 0.001; L.new(pe, b1.inputs['Height'])
    top = b1.outputs['Normal']
    base_n = flake_normal(nt, 2600, flakes) if flakes else None
    if g is not None:
        hg = math_node(nt, 'SUBTRACT', 0.0, g)
        b2 = N.new('ShaderNodeBump'); b2.inputs['Strength'].default_value = 1.0; b2.inputs['Distance'].default_value = 0.0025; L.new(hg, b2.inputs['Height']); L.new(top, b2.inputs['Normal'])
        top = b2.outputs['Normal']
        b3 = N.new('ShaderNodeBump'); b3.inputs['Strength'].default_value = 1.0; b3.inputs['Distance'].default_value = 0.0025; L.new(hg, b3.inputs['Height'])
        if base_n is not None: L.new(base_n, b3.inputs['Normal'])
        base_n = b3.outputs['Normal']
        # le fond du joint est sombre
        src = p.inputs['Base Color'].links[0].from_socket if p.inputs['Base Color'].is_linked else tuple(p.inputs['Base Color'].default_value[:3])
        dark = mix(nt, src, (0.004, 0.004, 0.004), math_node(nt, 'MINIMUM', math_node(nt, 'MULTIPLY', g, 1.6), 1.0))
        L.new(dark, p.inputs['Base Color'])
        cw = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'MULTIPLY', g, 0.85)); L.new(cw, p.inputs['Coat Weight'])
    L.new(top, p.inputs['Coat Normal'])
    if base_n is not None: L.new(base_n, p.inputs['Normal'])
    m['couleur'] = list(color); m['metal'] = metal; m['rough'] = rough
    return m


def M_grille():
    def bfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0)
        ch = nt.nodes.new('ShaderNodeTexChecker'); ch.inputs['Scale'].default_value = 140; nt.links.new(v, ch.inputs['Vector'])
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.7; b.inputs['Distance'].default_value = 0.003
        nt.links.new(ch.outputs['Fac'], b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    return mat('grille', (0.004, 0.004, 0.004), 0.55, base_fn=bfn)


def M_trim(rough=0.18): return mat('noir_brillant', (0.008, 0.008, 0.009), rough, coat=0.7, coat_rough=0.04)
def M_black_plastic(): return mat('plastique_noir', (0.006, 0.006, 0.007), 0.55, coat=0.15, coat_rough=0.3, bump={'scale': 900, 'strength': 0.12, 'detail': 3})
def M_liner(): return mat('passage', (0.006, 0.006, 0.007), 0.92, bump={'scale': 300, 'strength': 0.2})


def glass_mix(nt, tint=(0.35, 0.38, 0.42), trans=0.35, refl=1.0):
    """vitre mince : transparence teintée (sans réfraction) + reflet de Fresnel"""
    N = nt.nodes; L = nt.links
    tr = N.new('ShaderNodeBsdfTransparent'); tr.inputs['Color'].default_value = (*[c * trans for c in tint], 1)
    gl = N.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.0; gl.inputs['Color'].default_value = (refl, refl, refl, 1)
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.12
    fr = N.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.52
    f = math_node(nt, 'MAXIMUM', fr.outputs[0], math_node(nt, 'MULTIPLY', lw.outputs['Fresnel'], 0.6))
    f = math_node(nt, 'ADD', f, 0.03)
    mx = N.new('ShaderNodeMixShader'); L.new(f, mx.inputs[0]); L.new(tr.outputs[0], mx.inputs[1]); L.new(gl.outputs[0], mx.inputs[2])
    return mx.outputs[0]


def M_glass_panel(tint=(0.35, 0.38, 0.42), trans=0.35):
    m = bpy.data.materials.new('vitre'); nt = _nodes(m); N = nt.nodes
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); nt.links.new(glass_mix(nt, tint, trans), out.inputs[0])
    return m


def M_greenhouse(paint, roof='paint', tint=(0.35, 0.38, 0.42), trans=0.3):
    """pavillon : vitres (latérales, pare-brise, lunette) avec bord sérigraphié noir, montants noir brillant, toit peint ou noir"""
    m = bpy.data.materials.new('pavillon'); nt = _nodes(m); N = nt.nodes; L = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial')
    uv = N.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'; sep = N.new('ShaderNodeSeparateXYZ'); L.new(uv.outputs[0], sep.inputs[0])
    x, v = sep.outputs['X'], sep.outputs['Y']
    def gt(a, b): return math_node(nt, 'GREATER_THAN', a, b)
    def lt(a, b): return math_node(nt, 'LESS_THAN', a, b)
    def mul(*a):
        r = a[0]
        for b in a[1:]: r = math_node(nt, 'MULTIPLY', r, b)
        return r
    def mx_(*a):
        r = a[0]
        for b in a[1:]: r = math_node(nt, 'MAXIMUM', r, b)
        return r
    def side(m_x=0.0, m_v=0.0):
        xa = math_node(nt, 'SUBTRACT', 0.70 - m_x, math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', v, 0.03), (0.70 - 0.11) / 0.36))
        xc = math_node(nt, 'ADD', -0.80 + m_x, math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', v, 0.03), 0.30 / 0.36))
        return mul(gt(v, 0.035 + m_v), lt(v, 0.385 - m_v), lt(x, xa), gt(x, xc))
    def ws(m=0.0): return mul(gt(v, 0.52 + m * 2), gt(x, X_RTF + 0.02 + m), lt(x, X_WS + 0.02 - m))
    def rw(m=0.0): return mul(gt(v, 0.53 + m * 2), lt(x, X_RTR - 0.03 - m), gt(x, X_RW + 0.0 + m))
    glass = mx_(side(), ws(), rw())
    core_ = mx_(side(0.022, 0.025), ws(0.03), rw(0.02))
    roofm = mul(gt(v, 0.5), gt(x, X_RTR - 0.03), lt(x, X_RTF + 0.02))
    # montant milieu (déflecteur de custode) : barre noire dans la vitre latérale
    bp = mul(gt(x, -0.36), lt(x, -0.33))
    glass = math_node(nt, 'MULTIPLY', glass, math_node(nt, 'SUBTRACT', 1.0, bp))
    core_ = math_node(nt, 'MULTIPLY', core_, math_node(nt, 'SUBTRACT', 1.0, mul(gt(x, -0.38), lt(x, -0.31))))
    trim = N.new('ShaderNodeBsdfPrincipled'); trim.inputs['Base Color'].default_value = (0.008, 0.008, 0.009, 1); trim.inputs['Roughness'].default_value = 0.15
    trim.inputs['Coat Weight'].default_value = 0.8; trim.inputs['Coat Roughness'].default_value = 0.03
    pp = N.new('ShaderNodeBsdfPrincipled')
    c = paint.get('couleur', [0.5, 0.5, 0.5]) if hasattr(paint, 'get') else [0.5, 0.5, 0.5]
    pp.inputs['Base Color'].default_value = (*c, 1); pp.inputs['Metallic'].default_value = paint.get('metal', 0.5); pp.inputs['Roughness'].default_value = paint.get('rough', 0.34)
    pp.inputs['Coat Weight'].default_value = 1.0; pp.inputs['Coat Roughness'].default_value = 0.022
    s1 = N.new('ShaderNodeMixShader'); L.new(roofm if roof == 'paint' else math_node(nt, 'MULTIPLY', roofm, 0.0), s1.inputs[0]); L.new(trim.outputs[0], s1.inputs[1]); L.new(pp.outputs[0], s1.inputs[2])
    # bord sérigraphié : la vitre est noire hors du cœur
    frit = N.new('ShaderNodeBsdfPrincipled'); frit.inputs['Base Color'].default_value = (0.004, 0.004, 0.005, 1); frit.inputs['Roughness'].default_value = 0.05
    frit.inputs['Coat Weight'].default_value = 1.0; frit.inputs['Coat Roughness'].default_value = 0.0
    s2 = N.new('ShaderNodeMixShader'); L.new(core_, s2.inputs[0]); L.new(frit.outputs[0], s2.inputs[1]); L.new(glass_mix(nt, tint, trans), s2.inputs[2])
    s3 = N.new('ShaderNodeMixShader'); L.new(glass, s3.inputs[0]); L.new(s1.outputs[0], s3.inputs[1]); L.new(s2.outputs[0], s3.inputs[2])
    L.new(s3.outputs[0], out.inputs[0])
    return m


def M_lens(rgb, k=0.0, ribs=0.0, axis='Z', trans=0.85):
    """optique : verre coloré translucide, nervures internes ; k = intensité allumée"""
    def bfn(nt, p):
        if ribs <= 0: return
        X, Y, Z, _ = obj_xyz(nt)
        w = math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', {'X': X, 'Y': Y, 'Z': Z}[axis], ribs))
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.35; b.inputs['Distance'].default_value = 0.002
        nt.links.new(w, b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    return mat('optique', rgb, 0.06, trans=trans, ior=1.49, coat=1.0, coat_rough=0.0, emit=rgb, emit_k=k, base_fn=bfn)


# ------------------------------------------------------------------ pièces de carrosserie
def ray(ob, o, d):
    ok, loc, nrm, _ = ob.ray_cast(Vector(o), Vector(d).normalized())
    return (loc, nrm) if ok else (None, None)


def sweep(name, path, profile, closed=False, cap=True):
    """balayage d'un profil (d, h) le long d'un chemin [(point, normale horizontale sortante)] : d selon la normale, h selon z"""
    bm = bmesh.new(); rows = []
    for (p, n) in path:
        rows.append([bm.verts.new(p + n * d + Vector((0, 0, h))) for (d, h) in profile])
    k = len(profile)
    for a, b in zip(rows, rows[1:] + ([rows[0]] if closed else [])):
        for i in range(k):
            j = (i + 1) % k
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap and not closed:
        for row in (rows[0], rows[-1]): bm.faces.new(row)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, smooth=True)


def rrect(d0, d1, h0, h1, r=0.02, seg=4, bulge=0.0):
    """profil rectangle arrondi (d de d0 à d1, h de h0 à h1), sens trigonométrique"""
    pts = []
    corners = [(d1 - r, h0 + r, -90), (d1 - r, h1 - r, 0), (d0 + r, h1 - r, 90), (d0 + r, h0 + r, 180)]
    for (cx, cy, a0) in corners:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    if bulge:
        pts = [(d + bulge * max(0.0, 1 - ((h - (h0 + h1) / 2) / ((h1 - h0) / 2)) ** 2) if d > (d0 + d1) / 2 else d, h) for (d, h) in pts]
    return pts


def outline(body_ob, cx, z, a0, a1, n=60, off=0.0):
    """contour horizontal de la caisse à la hauteur z, par rayons vers le point (cx, 0, z), angles a0 → a1 (degrés)"""
    out = []
    for i in range(n):
        a = math.radians(a0 + (a1 - a0) * i / (n - 1))
        d = Vector((math.cos(a), math.sin(a), 0.0))
        loc, nrm = ray(body_ob, Vector((cx, 0, z)) + d * 4.0, -d)
        if loc is None: continue
        nh = Vector((nrm.x, nrm.y, 0.0))
        if nh.length < 0.2: nh = d
        out.append((loc + nh.normalized() * off, nh.normalized()))
    return out


def bumper(body_ob, front=True, z=0.29, h=0.165, depth=0.07, mat_=None, strip=True):
    """pare-chocs enveloppant (couleur caisse) avec jonc de protection noir"""
    if front:
        path = outline(body_ob, 1.70, z, -88, 88, 72)
    else:
        path = outline(body_ob, -1.58, z, 92, 268, 72)
    prof = rrect(-0.03, depth, -h / 2, h / 2, 0.022, 4, bulge=0.008)
    ob = sweep('pare_chocs', path, prof)
    subsurf(ob, 1); apply_mods(ob)
    assign(ob, mat_ or M_black_plastic())
    if strip:
        sp = [(p + n * (depth + 0.004), n) for (p, n) in path]
        st = sweep('jonc', sp, rrect(-0.012, 0.012, -0.018, 0.018, 0.008, 3)); assign(st, M_black_plastic()); parent(st, ob)
    return ob, path


def on_path(path, t):
    """point et normale à la fraction t du chemin (par longueur)"""
    L = [0.0]
    for (a, _), (b, _) in zip(path, path[1:]): L.append(L[-1] + (b - a).length)
    s = t * L[-1]
    for i in range(len(path) - 1):
        if L[i + 1] >= s:
            u = (s - L[i]) / max(1e-9, L[i + 1] - L[i])
            p = path[i][0].lerp(path[i + 1][0], u); n = path[i][1].lerp(path[i + 1][1], u).normalized()
            return p, n
    return path[-1]


def inset_box(name, p, n, size, out=0.0, bev=0.004, m=None, rot_x=0.0):
    """boîte posée sur une surface verticale : size = (épaisseur selon n, largeur, hauteur)"""
    b = box(name, size, (0, 0, 0), bev)
    t = Vector((-n.y, n.x, 0.0))
    M = Matrix(((n.x, t.x, 0.0), (n.y, t.y, 0.0), (0.0, 0.0, 1.0))).to_4x4()
    b.matrix_world = Matrix.Translation(p + n * out) @ M @ Matrix.Rotation(rot_x, 4, 'X')
    if m: assign(b, m)
    return b


def front_details(body_ob, bpath, lights_on=False, fog_k=0.0):
    obs = []
    # prise d'air centrale (grille), clignotants aux angles, antibrouillards
    p, n = on_path(bpath, 0.5)
    g = inset_box('entree_air', p, n, (0.03, 0.78, 0.07), out=0.058, bev=0.008, m=M_grille())
    obs.append(g)
    for i in range(5):
        sl = inset_box('lame', p + Vector((0, 0, -0.026 + i * 0.013)), n, (0.012, 0.76, 0.004), out=0.072, bev=0.001, m=M_black_plastic()); obs.append(sl)
    for t, w in ((0.12, 0.16), (0.88, 0.16)):
        p, n = on_path(bpath, t)
        obs.append(inset_box('clignotant', p + Vector((0, 0, 0.035)), n, (0.02, w, 0.045), out=0.062, bev=0.006, m=M_lens((0.95, 0.42, 0.03), 0.0, 900)))
    for t in (0.3, 0.7):
        p, n = on_path(bpath, t)
        obs.append(inset_box('antibrouillard', p + Vector((0, 0, -0.03)), n, (0.02, 0.15, 0.05), out=0.062, bev=0.008, m=M_lens((0.92, 0.94, 0.96), fog_k, 700, 'Y')))
    return obs


def rear_details(body_ob, bpath, lights_on=False, tail_k=6.0, plate_txt='LK 777'):
    obs = []
    # bandeau de feux sur la face arrière : noir, verres rouges, feux de recul, lamelles horizontales
    loc, nrm = ray(body_ob, (-4.0, 0.0, 0.72), (1, 0, 0))
    xr = loc.x if loc is not None else X_R
    pan = box('bandeau', (0.03, 1.32, 0.2), (xr - 0.008, 0, 0.71), 0.01); assign(pan, M_trim(0.25)); obs.append(pan)
    red = M_lens((0.75, 0.02, 0.015), tail_k if lights_on else 0.25, 260, 'Z')
    for sd in (-1, 1):
        l1 = box('feu', (0.02, 0.36, 0.15), (xr - 0.02, sd * 0.45, 0.71), 0.006); assign(l1, red); obs.append(l1)
        l2 = box('recul', (0.02, 0.07, 0.15), (xr - 0.02, sd * 0.225, 0.71), 0.006); assign(l2, M_lens((0.9, 0.9, 0.9), 0.0, 260, 'Z')); obs.append(l2)
        l3 = box('clignotant_ar', (0.02, 0.05, 0.15), (xr - 0.02, sd * 0.605, 0.71), 0.006); assign(l3, M_lens((0.9, 0.38, 0.02), 0.0, 260, 'Z')); obs.append(l3)
    for i in range(5):
        sl = box('lamelle', (0.035, 1.3, 0.009), (xr - 0.036, 0, 0.633 + i * 0.039), 0.002); sl.rotation_euler = (0, math.radians(-12), 0); assign(sl, M_trim(0.3)); obs.append(sl)
    # plaque (au centre du pare-chocs)
    p, n = on_path(bpath, 0.5)
    pl = plate(p + n * 0.058 + Vector((0, 0, 0.0)), n, plate_txt); obs.append(pl)
    # sorties d'échappement
    for sd in (-1, 1):
        for k in (0, 1):
            y = sd * (0.36 + k * 0.1)
            ex = cyl('echap', 0.036, 0.16, 40, (X_R + 0.04, y, 0.215), (0, math.pi / 2, 0), 0.004); assign(ex, M_chrome(0.12, (0.8, 0.79, 0.77))); obs.append(ex)
            ei = cyl('echap_in', 0.03, 0.165, 40, (X_R + 0.04, y, 0.215), (0, math.pi / 2, 0)); assign(ei, mat('suie', (0.006, 0.006, 0.006), 0.85)); obs.append(ei)
    return obs


def plate(p, n, txt='LK 777', bg=(0.9, 0.9, 0.86), fg=(0.05, 0.08, 0.2)):
    """plaque générique : fond clair, caractères en relief (aucun modèle d'immatriculation réel)"""
    root = empty('plaque')
    pl = box('plaque', (0.003, 0.52, 0.11), (0, 0, 0), 0.006); assign(pl, mat('plaque', bg, 0.38, coat=0.5, coat_rough=0.15, bump={'scale': 1600, 'strength': 0.04})); parent(pl, root)
    cu = bpy.data.curves.new('texte', 'FONT'); cu.body = txt; cu.size = 0.075; cu.extrude = 0.0015; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.bevel_depth = 0.0004
    tx = bpy.data.objects.new('texte', cu); link(tx); tx.rotation_euler = (math.pi / 2, 0, math.pi / 2); tx.location = (0.003, 0, 0); assign(tx, mat('lettres', fg, 0.3, coat=0.5)); parent(tx, root)
    t = Vector((-n.y, n.x, 0.0))
    M = Matrix(((n.x, t.x, 0.0), (n.y, t.y, 0.0), (0.0, 0.0, 1.0))).to_4x4()
    root.matrix_world = Matrix.Translation(p) @ M
    return root


def nose_strip(body_ob, park_k=0.0):
    """bandeau noir au-dessus du pare-chocs avant (feux de position aux extrémités)"""
    obs = []
    path = outline(body_ob, 1.6, 0.45, -62, 62, 48, off=0.002)
    if len(path) < 4: return obs
    s = sweep('bandeau_av', path, rrect(-0.01, 0.006, -0.022, 0.022, 0.006, 2)); assign(s, M_trim(0.2)); obs.append(s)
    for t in (0.06, 0.94):
        p, n = on_path(path, t)
        obs.append(inset_box('veilleuse', p, n, (0.012, 0.14, 0.03), out=0.004, bev=0.005, m=M_lens((0.95, 0.75, 0.4), park_k, 900, 'Y')))
    return obs


def popups(open_=False, P=None, k=0.0, rgb=(1.0, 0.96, 0.9)):
    """phares escamotables : fermés (trappes dessinées dans la peinture) ou levés (caissons peints, optiques allumées)"""
    obs = []
    if not open_: return obs
    x0, x1, y0, y1 = POP
    for sd in (-1, 1):
        yc = sd * (y0 + y1) / 2; w = (y1 - y0) - 0.01
        zh = ZD(x0 + 0.03) - 0.004
        hole = box('logement', (x1 - x0 - 0.01, w, 0.03), ((x0 + x1) / 2, yc, ZD((x0 + x1) / 2) - 0.0135), 0.003); hole.rotation_euler = (0, math.atan2(ZD(x0) - ZD(x1), x1 - x0), 0)
        assign(hole, mat('logement', (0.004, 0.004, 0.004), 0.8)); obs.append(hole)
        pod = empty('phare', (x0 + 0.02, yc, zh), (0, 0, 0))
        cover = box('trappe', (0.03, w, 0.17), (0.0, 0, 0.085), 0.006); assign(cover, P); parent(cover, pod)
        hous = box('caisson', (0.12, w - 0.01, 0.16), (0.07, 0, 0.082), 0.01); assign(hous, M_trim(0.4)); parent(hous, pod)
        for i, yy in enumerate((-0.085, 0.085)):
            lens = box('optique', (0.012, 0.15, 0.1), (0.135, yy * (w / 0.36), 0.085), 0.006); assign(lens, M_lens(rgb, k, 1400, 'Y', 0.9)); parent(lens, pod)
            rf = box('reflecteur', (0.01, 0.15, 0.1), (0.124, yy * (w / 0.36), 0.085), 0.004); assign(rf, M_chrome(0.15)); parent(rf, pod)
        obs.append(pod)
        if k > 0:
            sp = spot('faisceau', (x0 + 0.2, yc, zh + 0.085), (x0 + 8.0, yc * 1.3, 0.0), 300 * k / 40.0, rgb, 50, 0.6, 0.04); obs.append(sp)
    return obs


def mirrors(P, black=False):
    """rétroviseurs en coin, coque peinte (ou noire), glace chromée sur la face arrière"""
    obs = []
    Mh = M_trim(0.3) if black else P
    for sd in (-1, 1):
        x0 = 0.58; y0 = sd * (W(x0) - 0.03); z0 = ZS(x0) + 0.01
        root = empty('retro', (x0, y0, z0), (0, 0, sd * math.radians(4)))
        base = box('pied', (0.09, 0.05, 0.03), (0.0, sd * 0.01, 0.012), 0.008); assign(base, M_trim(0.4)); parent(base, root)
        arm = box('bras', (0.035, 0.07, 0.018), (-0.01, sd * 0.05, 0.035), 0.006); arm.rotation_euler = (sd * math.radians(-20), 0, 0); assign(arm, M_trim(0.4)); parent(arm, root)
        sh = extrude2d('coque', [(-0.045, 0.0), (0.06, 0.012), (0.075, 0.05), (0.035, 0.088), (-0.05, 0.085)], 0.15, 0.0)
        sh.rotation_euler = (math.pi / 2, 0, 0); sh.location = (-0.02, sd * 0.13, 0.03); apply_rot(sh)
        bevel(sh, 0.012, 4); apply_mods(sh); shade_auto(sh, 35); assign(sh, Mh); parent(sh, root)
        gl = box('glace', (0.004, 0.135, 0.07), (-0.066, sd * 0.13, 0.072), 0.008); assign(gl, M_chrome(0.02, (0.55, 0.57, 0.6))); parent(gl, root)
        obs.append(root)
    return obs


def arch_lips(body_ob, P, r=0.011):
    """lèvres des passages de roue : un bourrelet suit l'arête de découpe (masque la tranche du booléen)"""
    obs = []
    for xw in (AXF, AXR):
        for sd in (-1, 1):
            pts = []
            for k in range(49):
                a = math.radians(-24 + 228 * k / 48)
                x = xw + math.cos(a) * (ARCH + 0.012); z = RT + math.sin(a) * (ARCH + 0.012)
                loc, nrm = ray(body_ob, (x, sd * 3.0, z), (0, -sd, 0))
                if loc is None or abs(loc.y) < 0.6: continue
                xx = xw + math.cos(a) * (ARCH + 0.002); zz = RT + math.sin(a) * (ARCH + 0.002)
                pts.append((xx, loc.y - sd * 0.006, zz, 1.0))
            if len(pts) < 4: continue
            t = curve_tube('levre', pts, r, 3, kind='POLY', profile_seg=4)
            t.data.use_fill_caps = True
            assign(t, P); obs.append(t)
    return obs


def side_details(body_ob):
    obs = []
    for sd in (-1, 1):
        # poignée de porte (creux noir), prise d'air de custode à lamelles, antenne
        loc, nrm = ray(body_ob, (-0.25, sd * 3.0, 0.74), (0, -sd, 0))
        if loc is not None:
            n = Vector((nrm.x, nrm.y, 0)).normalized()
            obs.append(inset_box('poignee', loc, n, (0.012, 0.13, 0.024), out=0.0, bev=0.006, m=M_trim(0.4)))
        for i in range(5):
            x = -0.6 - i * 0.075
            loc, nrm = ray(body_ob, (x, sd * 3.0, 0.62), (0, -sd, 0))
            if loc is None: continue
            n = Vector((nrm.x, nrm.y, 0)).normalized()
            obs.append(inset_box('ouie', loc, n, (0.012, 0.045, 0.2), out=0.002, bev=0.004, m=M_trim(0.35)))
    return obs


def louvers(P_or_black=None, n=8):
    obs = []
    for i in range(n):
        x = X_RTR - 0.05 - i * (X_RTR - 0.05 - (X_RW + 0.03)) / (n - 1)
        z = ZR(x) + 0.018
        sl = box('persienne', (0.055, 1.1, 0.01), (x, 0, z), 0.003)
        slope = math.atan2(ZR(x + 0.02) - ZR(x - 0.02), 0.04)
        sl.rotation_euler = (0, -slope - math.radians(18), 0); assign(sl, P_or_black or M_trim(0.3)); obs.append(sl)
    for sd in (-1, 1):
        rail = box('rail', (X_RTR - X_RW - 0.05, 0.03, 0.02), ((X_RTR + X_RW) / 2, sd * 0.56, (ZR(X_RTR) + ZR(X_RW)) / 2 + 0.015), 0.006)
        rail.rotation_euler = (0, -math.atan2(ZR(X_RTR) - ZR(X_RW), X_RTR - X_RW), 0); assign(rail, P_or_black or M_trim(0.3)); obs.append(rail)
    return obs


def wipers():
    obs = []
    for yy, rz in ((0.32, 0.12), (-0.18, 0.12)):
        x = X_WS - 0.02
        w = box('essuie_glace', (0.012, 0.55, 0.01), (x, yy, ZS(x) + 0.012), 0.003); w.rotation_euler = (0, math.radians(-20), rz); assign(w, M_trim(0.5)); obs.append(w)
    return obs


def interior(seat=(0.03, 0.03, 0.032), dash=(0.015, 0.015, 0.017)):
    obs = []
    Ms = M_leather(seat, 0.55); Md = mat('tableau', dash, 0.6, bump={'scale': 800, 'strength': 0.1})
    for sd in (-1, 1):
        y = sd * 0.37
        cush = box('assise', (0.5, 0.48, 0.12), (-0.05, y, 0.36), 0.05); assign(cush, Ms); obs.append(cush)
        back = box('dossier', (0.13, 0.48, 0.62), (-0.36, y, 0.66), 0.06); back.rotation_euler = (0, math.radians(-22), 0); assign(back, Ms); obs.append(back)
        for b in (-1, 1):
            bol = box('joue', (0.1, 0.06, 0.5), (-0.37, y + b * 0.22, 0.66), 0.03); bol.rotation_euler = (0, math.radians(-22), 0); assign(bol, Ms); obs.append(bol)
        hr = box('appuie_tete', (0.09, 0.26, 0.17), (-0.5, y, 1.02), 0.04); hr.rotation_euler = (0, math.radians(-15), 0); assign(hr, Ms); obs.append(hr)
    dsh = box('planche', (0.45, 1.6, 0.2), (0.55, 0, 0.72), 0.06); assign(dsh, Md); obs.append(dsh)
    con = box('console', (0.8, 0.22, 0.2), (0.15, 0, 0.42), 0.04); assign(con, Md); obs.append(con)
    c0 = Vector((0.3, 0.37, 0.8)); R = Matrix.Rotation(math.radians(62), 3, 'Y')
    tor = curve_tube('volant', [(*(c0 + R @ Vector((0.18 * math.cos(a), 0.18 * math.sin(a), 0))), 1) for a in [i / 40 * math.tau for i in range(40)]], 0.016, 4, closed=True, kind='POLY')
    assign(tor, Md); obs.append(tor)
    return obs


# ------------------------------------------------------------------ roues : pneu scanné remis à neuf, jantes usinées, freins
_TIRE = {}


def tire_data(width=0.225, r_out=RT, r_in=0.198):
    """maillage du pneu scanné (Poly Haven « old_tyre », CC0) recentré, axe y, flanc abaissé (remappage radial), plus large"""
    key = (round(width, 4), round(r_out, 4), round(r_in, 4))
    if key in _TIRE:
        try:
            if _TIRE[key][0].name in bpy.data.meshes: return _TIRE[key]
        except ReferenceError: pass
    root, obs = A.model('old_tyre')
    o = [x for x in obs if x.type == 'MESH'][0]
    bpy.context.view_layer.update()
    mw = o.matrix_world.copy()
    me = o.data.copy(); me.name = 'pneu'
    pts = [mw @ v.co for v in me.vertices]
    cz = sum(p.z for p in pts) / len(pts); cx = sum(p.x for p in pts) / len(pts); cy = sum(p.y for p in pts) / len(pts)
    rho = [math.hypot(p.x - cx, p.z - cz) for p in pts]
    r0, r1 = min(rho), max(rho)
    yw = max(abs(p.y - cy) for p in pts)
    for v, p, r in zip(me.vertices, pts, rho):
        a = math.atan2(p.z - cz, p.x - cx)
        rn = r_in + (r - r0) * (r_out - r_in) / (r1 - r0)
        v.co = Vector((rn * math.cos(a), (p.y - cy) * (width / 2) / yw, rn * math.sin(a)))
    me.update()
    m = o.data.materials[0].copy(); m.name = 'gomme_neuve'
    nt = m.node_tree; N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
    if p.inputs['Base Color'].is_linked:
        src = p.inputs['Base Color'].links[0].from_socket
        hsv = N.new('ShaderNodeHueSaturation'); hsv.inputs['Saturation'].default_value = 0.25; hsv.inputs['Value'].default_value = 0.42
        L.new(src, hsv.inputs['Color']); L.new(hsv.outputs[0], p.inputs['Base Color'])
    if p.inputs['Roughness'].is_linked:
        src = p.inputs['Roughness'].links[0].from_socket
        mr = N.new('ShaderNodeMath'); mr.operation = 'MULTIPLY_ADD'; L.new(src, mr.inputs[0]); mr.inputs[1].default_value = 0.6; mr.inputs[2].default_value = 0.3
        L.new(mr.outputs[0], p.inputs['Roughness'])
    me.materials.clear(); me.materials.append(m)
    # profil du flanc extérieur (pour poser une bande blanche ou colorée)
    side = {}
    for v in me.vertices:
        rr = math.hypot(v.co.x, v.co.z); b = round(rr * 200)
        if v.co.y > side.get(b, -1): side[b] = v.co.y
    for x in obs: bpy.data.objects.remove(x)
    bpy.data.objects.remove(root)
    _TIRE[key] = (me, side)
    return _TIRE[key]


def fillet(poly, r, seg=5):
    """arrondit les coins d'un polygone 2D (rayon r)"""
    out = []; n = len(poly)
    for i in range(n):
        p0 = Vector(poly[i - 1]); p1 = Vector(poly[i]); p2 = Vector(poly[(i + 1) % n])
        d1 = (p0 - p1).normalized(); d2 = (p2 - p1).normalized()
        ang = d1.angle(d2) if d1.length and d2.length else math.pi
        if ang < 1e-3 or abs(ang - math.pi) < 1e-3:
            out.append(tuple(p1)); continue
        t = r / math.tan(ang / 2)
        t = min(t, (p0 - p1).length * 0.45, (p2 - p1).length * 0.45)
        rr = t * math.tan(ang / 2)
        a = p1 + d1 * t; b = p1 + d2 * t
        bis = (d1 + d2).normalized(); c = p1 + bis * (rr / math.sin(ang / 2))
        va = a - c; vb = b - c
        a0 = math.atan2(va.y, va.x); a1 = math.atan2(vb.y, vb.x)
        da = a1 - a0
        while da > math.pi: da -= math.tau
        while da < -math.pi: da += math.tau
        for k in range(seg + 1):
            aa = a0 + da * k / seg
            out.append((c.x + rr * math.cos(aa), c.y + rr * math.sin(aa)))
    return out


def prism_xz(name, poly, y0, y1):
    """prisme d'axe y : contour (x, z) extrudé de y0 à y1"""
    bm = bmesh.new()
    lo = [bm.verts.new((x, y0, z)) for (x, z) in poly]; hi = [bm.verts.new((x, y1, z)) for (x, z) in poly]
    n = len(poly)
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    bm.faces.new(lo); bm.faces.new(list(reversed(hi)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, smooth=False)


def lathe_y(name, prof, seg=96):
    """profil [(r, y)] tourné autour de l'axe y"""
    ob = lathe(name, [(r, y) for (r, y) in prof], seg)
    ob.rotation_euler = (-math.pi / 2, 0, 0)
    apply_rot(ob)
    return ob


def apply_rot(ob):
    me = ob.data; M = ob.matrix_basis.to_3x3()
    for v in me.vertices: v.co = M @ v.co
    ob.rotation_euler = (0, 0, 0); me.update()


def M_rim(kind='silver'):
    if kind == 'silver': return mat('alu_peint', (0.62, 0.63, 0.65), 0.28, metal=1.0, coat=0.6, coat_rough=0.05)
    if kind == 'polished': return mat('alu_poli', (0.9, 0.9, 0.91), 0.08, metal=1.0, aniso=0.4)
    if kind == 'chrome': return M_chrome(0.03)
    if kind == 'gold': return mat('or', (0.8, 0.58, 0.22), 0.22, metal=1.0, coat=0.6, coat_rough=0.05)
    if kind == 'black': return mat('noir_jante', (0.018, 0.018, 0.02), 0.32, metal=0.6, coat=0.7, coat_rough=0.08)
    if kind == 'gunmetal': return mat('anthracite', (0.12, 0.125, 0.135), 0.3, metal=1.0, coat=0.6, coat_rough=0.06)
    if kind == 'white': return mat('blanc_jante', (0.8, 0.8, 0.78), 0.3, coat=0.8, coat_rough=0.05)
    if isinstance(kind, tuple): return mat('jante_couleur', kind, 0.3, metal=0.5, coat=0.8, coat_rough=0.05)
    return kind


def rim(kind='star', R=0.205, w=0.2, face=None, lip=None, cap=None, n=5):
    """jante (axe y, face extérieure vers +y) : 'star' (branches creusées), 'dial' (voile percé), 'mesh' (croisillons),
    'deep' (bord poli profond), 'wire' (rayons chromés), 'turbine' (ailettes)"""
    root = empty('jante')
    F = M_rim(face or 'silver'); Lp = M_rim(lip or ('polished' if kind in ('deep', 'mesh', 'wire') else face or 'silver'))
    yf = w / 2 - (0.065 if kind == 'deep' else 0.03 if kind != 'wire' else 0.05)
    # fût et rebord
    barrel = lathe_y('fut', [(R - 0.012, -w / 2), (R - 0.012, w / 2 - 0.02)], 96); assign(barrel, mat('fut', (0.25, 0.25, 0.26), 0.45, metal=1.0)); parent(barrel, root)
    lipo = lathe_y('rebord', [(R - 0.012, yf - 0.01), (R - 0.014, w / 2 - 0.03), (R - 0.004, w / 2 - 0.012), (R + 0.006, w / 2 - 0.004), (R + 0.012, w / 2 + 0.002),
                             (R + 0.008, w / 2 + 0.006), (R - 0.002, w / 2 + 0.004), (R - 0.006, w / 2 - 0.006), (R - 0.016, yf + 0.002)], 128)
    shade_auto(lipo, 40); assign(lipo, Lp); parent(lipo, root)
    if kind == 'wire':
        ch = M_chrome(0.06)
        hub = lathe_y('moyeu', [(0.0, yf + 0.07), (0.05, yf + 0.065), (0.06, yf + 0.03), (0.07, yf - 0.06), (0.0, yf - 0.06)], 64); assign(hub, ch); parent(hub, root)
        for i in range(72):
            a = i / 72 * math.tau; s_ = 1 if i % 2 else -1
            hp = (math.cos(a + s_ * 0.22) * 0.055, yf + (0.03 if i % 3 else -0.03), math.sin(a + s_ * 0.22) * 0.055)
            rp = (math.cos(a) * (R - 0.014), yf - 0.01 + 0.025 * (i % 2), math.sin(a) * (R - 0.014))
            s = curve_tube('rayon', [(*hp, 1), (*rp, 1)], 0.0019, 2, kind='POLY', profile_seg=2); assign(s, ch); parent(s, root)
        ko = lathe_y('papillon', [(0.0, yf + 0.11), (0.03, yf + 0.108), (0.045, yf + 0.09), (0.045, yf + 0.065), (0.0, yf + 0.065)], 48); assign(ko, ch); parent(ko, root)
        for k in range(2):
            ear = box('oreille', (0.14, 0.014, 0.026), (0, yf + 0.095, 0), 0.008); ear.rotation_euler = (0, k * math.pi / 2 + 0.4, 0); assign(ear, ch); parent(ear, root)
        return root
    # voile : disque épais, face avant creusée (concave), découpé par les fenêtres
    conc = {'star': 0.028, 'deep': 0.012, 'dial': 0.012, 'mesh': 0.02, 'turbine': 0.02}.get(kind, 0.02)
    prof = [(0.0, yf + 0.012)]
    for i in range(1, 25):
        r = (R - 0.014) * i / 24
        t = max(0.0, min(1.0, (r - 0.06) / (R - 0.06 - 0.03)))
        prof.append((r, yf - conc * math.sin(math.pi * t) ** 0.8 + (0.012 if r < 0.06 else 0.0) * (1 - r / 0.06)))
    prof += [(R - 0.014, yf - 0.03), (0.0, yf - 0.03)]
    disc = lathe_y('voile', prof, 192)
    cutters = []
    if kind in ('star', 'deep'):
        sw = 0.05 if kind == 'star' else 0.044
        for i in range(n):
            a0 = i / n * math.tau; a1 = (i + 1) / n * math.tau
            ri, ro = 0.078, R - 0.032
            pts = []
            for k in range(13):
                r = ri; a = a0 + math.asin(sw / 2 / r) + (a1 - a0 - 2 * math.asin(sw / 2 / r)) * k / 12
                pts.append((r * math.cos(a), r * math.sin(a)))
            for k in range(13):
                r = ro; a = a1 - math.asin(sw * 0.7 / r) - (a1 - a0 - 2 * math.asin(sw * 0.7 / r)) * k / 12
                pts.append((r * math.cos(a), r * math.sin(a)))
            cutters.append(prism_xz('fenetre', fillet(pts, 0.016, 6), yf - 0.2, yf + 0.2))
    elif kind == 'dial':
        for i in range(8):
            a = i / 8 * math.tau
            c = cyl('trou', 0.034, 0.4, 40, (math.cos(a) * 0.128, yf, math.sin(a) * 0.128), (math.pi / 2, 0, 0)); cutters.append(c)
    elif kind == 'mesh':
        m_ = 15
        for i in range(m_):
            a = (i + 0.5) / m_ * math.tau; da = math.tau / m_
            # losanges intérieurs et triangles extérieurs entre les croisillons
            r0, r1, r2 = 0.07, 0.12, R - 0.03
            dia = [(r0 * math.cos(a), r0 * math.sin(a)), (r1 * 0.92 * math.cos(a - da * 0.32), r1 * 0.92 * math.sin(a - da * 0.32)),
                   (r1 * 1.08 * math.cos(a), r1 * 1.08 * math.sin(a)), (r1 * 0.92 * math.cos(a + da * 0.32), r1 * 0.92 * math.sin(a + da * 0.32))]
            cutters.append(prism_xz('losange', fillet(dia, 0.006, 3), yf - 0.2, yf + 0.2))
            b = a + da / 2
            tri = [(r1 * 1.12 * math.cos(b), r1 * 1.12 * math.sin(b)), (r2 * math.cos(b - da * 0.36), r2 * math.sin(b - da * 0.36)), (r2 * math.cos(b + da * 0.36), r2 * math.sin(b + da * 0.36))]
            cutters.append(prism_xz('triangle', fillet(tri, 0.006, 3), yf - 0.2, yf + 0.2))
    elif kind == 'turbine':
        for i in range(12):
            a = i / 12 * math.tau
            pts = []
            for k in range(8):
                r = 0.085 + (R - 0.12) * k / 7; aa = a + 0.5 * (k / 7)
                pts.append((r * math.cos(aa), r * math.sin(aa)))
            for k in range(8):
                r = 0.085 + (R - 0.12) * (7 - k) / 7; aa = a + 0.5 * ((7 - k) / 7) + 0.17 + 0.05 * (7 - k) / 7
                pts.append((r * math.cos(aa), r * math.sin(aa)))
            cutters.append(prism_xz('ailette', fillet(pts, 0.008, 3), yf - 0.2, yf + 0.2))
    if cutters: boolean_cut(disc, cutters)
    bevel(disc, 0.0025, 2, angle=35); apply_mods(disc); shade_auto(disc, 32)
    assign(disc, F); parent(disc, root)
    if kind == 'mesh':
        for i in range(24):
            a = i / 24 * math.tau
            rv = sphere('rivet', 0.0042, (math.cos(a) * (R - 0.006), w / 2 - 0.001, math.sin(a) * (R - 0.006)), seg=12, rings=6); assign(rv, M_chrome(0.1)); parent(rv, root)
    # cache-moyeu, écrous, valve
    cp = lathe_y('cache', [(0.0, yf + 0.03), (0.03, yf + 0.028), (0.042, yf + 0.018), (0.046, yf + 0.006), (0.046, yf - 0.01), (0.0, yf - 0.01)], 64)
    assign(cp, M_rim(cap or face or 'silver')); parent(cp, root)
    for i in range(5 if kind != 'dial' else 4):
        a = i / (5 if kind != 'dial' else 4) * math.tau + 0.3
        nut = cyl('ecrou', 0.0095, 0.024, 6, (math.cos(a) * 0.062, yf + 0.006, math.sin(a) * 0.062), (math.pi / 2, 0, 0), 0.0015); assign(nut, M_chrome(0.15)); parent(nut, root)
    vs = cyl('valve', 0.004, 0.03, 12, (math.cos(1.1) * (R - 0.03), yf + 0.008, math.sin(1.1) * (R - 0.03)), (math.pi / 2, 0, 0)); assign(vs, M_rubber()); parent(vs, root)
    return root


def brake(caliper=(0.62, 0.03, 0.025), front=True, R=0.205):
    root = empty('frein')
    def dfn(nt, p):
        X, Y, Z, _ = obj_xyz(nt)
        r = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', X, X), math_node(nt, 'MULTIPLY', Z, Z)))
        rings = math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', r, 2600.0))
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.12; b.inputs['Distance'].default_value = 0.0005
        nt.links.new(rings, b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    rd = R - 0.045
    for yy in (-0.006, 0.02):
        d = lathe_y('disque', [(0.075, yy - 0.008), (rd, yy - 0.008), (rd, yy + 0.008), (0.075, yy + 0.008)], 96)
        assign(d, mat('disque', (0.22, 0.22, 0.23), 0.34, metal=1.0, base_fn=dfn)); parent(d, root)
    for i in range(36):
        a = i / 36 * math.tau
        vn = box('ailette', (0.05, 0.012, 0.006), (math.cos(a) * (rd - 0.03), 0.007, math.sin(a) * (rd - 0.03)), 0.0); vn.rotation_euler = (0, -a, 0); assign(vn, mat('fonte', (0.08, 0.08, 0.085), 0.6, metal=0.8)); parent(vn, root)
    hat = lathe_y('bol', [(0.0, 0.05), (0.075, 0.05), (0.08, 0.02), (0.08, -0.01), (0.0, -0.01)], 64); assign(hat, mat('bol', (0.05, 0.05, 0.055), 0.5, metal=0.7)); parent(hat, root)
    # étrier : secteur annulaire épais, arrondi
    a0, a1 = (math.radians(110), math.radians(165)) if front else (math.radians(15), math.radians(70))
    pts = [((rd + 0.022) * math.cos(a0 + (a1 - a0) * k / 10), (rd + 0.022) * math.sin(a0 + (a1 - a0) * k / 10)) for k in range(11)]
    pts += [((rd - 0.05) * math.cos(a1 - (a1 - a0) * k / 10), (rd - 0.05) * math.sin(a1 - (a1 - a0) * k / 10)) for k in range(11)]
    cal = prism_xz('etrier', fillet(pts, 0.012, 4), -0.035, 0.052)
    bevel(cal, 0.008, 3); apply_mods(cal); shade_auto(cal, 35)
    assign(cal, mat('etrier', caliper, 0.3, coat=0.9, coat_rough=0.06)); parent(cal, root)
    return root


def wall_band(side, rgb=(0.92, 0.92, 0.88), r0=0.215, r1=0.262, name='flanc_blanc'):
    """bande de couleur posée sur le flanc extérieur du pneu (profil relevé sur le maillage)"""
    prof = []
    for k in range(9):
        r = r0 + (r1 - r0) * k / 8; b = round(r * 200)
        y = max(side.get(b, 0.0), side.get(b - 1, 0.0), side.get(b + 1, 0.0)) + 0.0012
        prof.append((r, y))
    bm = bmesh.new(); rings = []
    for (r, y) in prof:
        rings.append([bm.verts.new((r * math.cos(a), y, r * math.sin(a))) for a in [i / 128 * math.tau for i in range(128)]])
    for a, b in zip(rings, rings[1:]):
        for i in range(128):
            j = (i + 1) % 128; bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm); assign(ob, mat('flanc', rgb, 0.55, bump={'scale': 900, 'strength': 0.05}))
    return ob


def wheel(x=0.0, side=1, rim_kind='star', face=None, lip=None, cap=None, caliper=(0.62, 0.03, 0.025), wall=None, front=True, spin=0.0,
          width=0.225, steer=0.0, loc=None):
    """roue complète (pneu, jante, frein) ; side +1 = côté gauche (face vers +y)"""
    me, sidep = tire_data(width)
    root = empty('roue', loc or (x, side * TRACK, RT), (0, 0, (0 if side > 0 else math.pi) + steer))
    spinr = empty('rotation', (0, 0, 0), (0, spin, 0)); parent(spinr, root)
    t = bpy.data.objects.new('pneu', me); link(t); parent(t, spinr)
    if wall is not None:
        wb = wall_band(sidep, wall); parent(wb, spinr)
    r = rim(rim_kind, 0.205, width - 0.03, face, lip, cap); parent(r, spinr)
    bk = brake(caliper, front); bk.location = (0, -0.035, 0); parent(bk, root)
    return root


# ------------------------------------------------------------------ voiture complète
def coupe(P=None, color=(0.6, 0.02, 0.03), low=0.0, roof='paint', tint=(0.35, 0.38, 0.42), trans=0.3, popup=False, head_k=0.0,
          head_rgb=(1.0, 0.96, 0.9), tail_on=False, tail_k=6.0, park_k=0.0, fog_k=0.0, rim_kind='star', face=None, lip=None, cap=None,
          caliper=(0.62, 0.03, 0.025), wall=None, louver=False, bumper_paint=True, plate_txt='LK 777', loc=(0, 0, 0), rot=0.0, spin=0.0, steer=0.0,
          interior_on=True, lv=2, front_rim=None, extra_body=None):
    """coupé complet ; P = matière de carrosserie (M_car) ; low = abaissement (m) ; rot = cap (rad)"""
    P = P or M_car(color)
    root = empty('coupe', loc, (0, 0, rot))
    sprung = empty('caisse_suspendue', (0, 0, -low)); parent(sprung, root)
    b = body(lv); parent(b, sprung)
    b.data.materials.clear(); b.data.materials.append(P); b.data.materials.append(M_liner())
    for f in b.data.polygons:
        c = f.center; ay = abs(c.y); ny = abs(f.normal.y); mi = 0
        for xw in (AXF, AXR):
            r = math.hypot(c.x - xw, c.z - RT)
            if (abs(r - ARCH) < 0.01 and ay > 0.5 and ny < 0.35) or (abs(ay - 0.52) < 0.006 and ny > 0.9 and r < ARCH + 0.01): mi = 1
        f.material_index = mi
    g = greenhouse(lv); parent(g, sprung); assign(g, M_greenhouse(P, roof, tint, trans))
    fb, fpath = bumper(b, True, mat_=(P if bumper_paint else None), strip=bumper_paint); parent(fb, sprung)
    rb, rpath = bumper(b, False, z=0.33, h=0.17, mat_=(P if bumper_paint else None), strip=bumper_paint); parent(rb, sprung)
    for o in front_details(b, fpath, fog_k=fog_k) + rear_details(b, rpath, tail_on, tail_k, plate_txt) + nose_strip(b, park_k):
        if o.parent is None: parent(o, sprung)
    for o in popups(popup, P, head_k, head_rgb) + mirrors(P) + side_details(b) + wipers() + (louvers() if louver else []) + arch_lips(b, P):
        if o.parent is None: parent(o, sprung)
    if interior_on:
        for o in interior(): parent(o, sprung)
    under = box('dessous', (3.9, 1.5, 0.02), (0, 0, 0.18), 0.0); assign(under, mat('dessous', (0.008, 0.008, 0.008), 0.9)); parent(under, sprung)
    if extra_body: extra_body(b, sprung, P)
    wheels = []
    for xw, front in ((AXF, True), (AXR, False)):
        for sd in (-1, 1):
            wh = wheel(xw, sd, front_rim if (front and front_rim) else rim_kind, face, lip, cap, caliper, wall, front, spin, steer=(steer if front else 0.0))
            parent(wh, root); wheels.append(wh)
    root['body'] = b.name; root['sprung'] = sprung.name
    return root, b, sprung, wheels
