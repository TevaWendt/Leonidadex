# Tête de mannequin v2 : crâne d'hair.py (ellipsoïdes lissés) + visage aux proportions humaines réelles (maillage canonique
# MediaPipe, Apache-2.0 : moyenne anatomique, sans identité) posé à l'avant, yeux et bouche fermés comme un mannequin
# de vitrine ; oreilles sculptées (champ de hauteur : hélix, anthélix, conque, lobe). Repère : x vers l'avant, z en haut.
import bpy, bmesh, math, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from .core import *
from . import hair as H

OBJ = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'visage', 'canonical_face_model.obj')
S = 0.0095                      # cm → m (visage un peu plus petit que la moyenne : 14,7 cm de large)
NOSE = Vector((0.115, 0.0, -0.03))
BASE_SHAPES = [s for i, s in enumerate(H.SHAPES) if i not in (4, 5, 6, 8, 9)]   # sans nez, lèvres, oreilles

_F = {}
BLEND = 0.034


def _smax(a, b, k):
    h = max(k - abs(a - b), 0.0) / k
    return max(a, b) + h * h * k * 0.25


def base_radius(d):
    r = 0.0
    for c, rr, kk, pt in BASE_SHAPES:
        r = _smax(r, H._ray_ell(d, c, rr, pt), kk)
    return r


def _sstep(x, a, b):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)


def face_sheet():
    """feuille du visage (bmesh triangulé, subdivisée, trous des yeux et de la bouche bouchés) + poids de bord"""
    if 'bvh' in _F:
        return _F
    vs = []; fs = []
    for line in open(OBJ):
        if line.startswith('v '):
            x, y, z = map(float, line.split()[1:4]); vs.append((x, y, z))
        elif line.startswith('f '):
            fs.append([int(t.split('/')[0]) - 1 for t in line.split()[1:]])
    tip = max(vs, key=lambda v: v[2])
    bm = bmesh.new()
    bv = [bm.verts.new(((z - tip[2]) * S + NOSE.x, x * S, (y - tip[1]) * S + NOSE.z)) for (x, y, z) in vs]
    for f in fs:
        try: bm.faces.new([bv[i] for i in f])
        except ValueError: pass
    bm.verts.ensure_lookup_table()
    # trous : boucles de bord, sauf la plus longue (le contour du visage)
    loops = []; seen = set()
    for e in bm.edges:
        if e.is_boundary and e.index not in seen:
            loop = []; stack = [e]
            while stack:
                x = stack.pop()
                if x.index in seen: continue
                seen.add(x.index); loop.append(x)
                for v in x.verts:
                    for e2 in v.link_edges:
                        if e2.is_boundary and e2.index not in seen: stack.append(e2)
            loops.append(loop)
    bm.edges.ensure_lookup_table()
    loops.sort(key=lambda l: -len(l))
    for loop in loops[1:]:
        r = bmesh.ops.holes_fill(bm, edges=loop, sides=0)
        # paupières / lèvres fermées : le bouchage est lissé vers les voisins
        nf = r['faces']
        if nf:
            inner = set(v for f in nf for v in f.verts)
            bmesh.ops.triangulate(bm, faces=nf)
            for _ in range(2):
                bmesh.ops.smooth_vert(bm, verts=list(inner), factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # subdivision lisse (Catmull-Clark) via un objet temporaire
    me = bpy.data.meshes.new('visage_tmp'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('visage_tmp', me); bpy.context.scene.collection.objects.link(ob)
    m = ob.modifiers.new('ss', 'SUBSURF'); m.levels = 2; m.render_levels = 2; m.boundary_smooth = 'PRESERVE_CORNERS'
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg)
    bm = bmesh.new(); bm.from_mesh(ev.to_mesh()); ev.to_mesh_clear()
    bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    # distance (géodésique approchée) au contour extérieur → poids de fondu
    import heapq
    dist = [1e9] * len(bm.verts); pq = []
    for v in bm.verts:
        if v.is_boundary:
            dist[v.index] = 0.0; heapq.heappush(pq, (0.0, v.index))
    while pq:
        dd, i = heapq.heappop(pq)
        if dd > dist[i]: continue
        v = bm.verts[i]
        for e in v.link_edges:
            o = e.other_vert(v); nd = dd + e.calc_length()
            if nd < dist[o.index]:
                dist[o.index] = nd; heapq.heappush(pq, (nd, o.index))
    _F['w'] = [_sstep(d, 0.0, BLEND) for d in dist]
    _F['bm'] = bm
    _F['bvh'] = BVHTree.FromBMesh(bm)
    return _F


def face_hit(d):
    """dernier point de la feuille du visage sur le rayon centre → d (le plus extérieur) : (rayon, poids)"""
    F = face_sheet(); bvh = F['bvh']; bm = F['bm']; w = F['w']
    o = Vector((0.0, 0.0, 0.0)); dv = Vector(d); best = None
    t0 = 0.0
    for _ in range(6):
        loc, nrm, idx, dd = bvh.ray_cast(o + dv * t0, dv, 0.4)
        if loc is None: break
        best = (loc, idx); t0 = t0 + dd + 1e-5
    if best is None: return None
    loc, idx = best
    f = bm.faces[idx]; a, b, c = (v.co for v in f.verts)
    from mathutils.geometry import barycentric_transform
    # barycentriques
    v0, v1, v2 = b - a, c - a, loc - a
    d00, d01, d11, d20, d21 = v0.dot(v0), v0.dot(v1), v1.dot(v1), v2.dot(v0), v2.dot(v1)
    den = d00 * d11 - d01 * d01 or 1e-12
    bb = (d11 * d20 - d01 * d21) / den; cc = (d00 * d21 - d01 * d20) / den; aa = 1 - bb - cc
    wi = [w[v.index] for v in f.verts]
    return loc.length, max(0.0, min(1.0, aa * wi[0] + bb * wi[1] + cc * wi[2]))


_CACHE = {}


def head_radius(d, k=None):
    key = (round(d[0], 5), round(d[1], 5), round(d[2], 5))
    r = _CACHE.get(key)
    if r is not None: return r
    rb = base_radius(d)
    if d[0] > -0.15:
        h = face_hit(d)
        if h is not None:
            rf, w = h
            # fondu : au bord, la feuille rejoint le crâne ; au centre, le visage commande
            rb = rb * (1 - w) + rf * w if w > 0 else rb
    _CACHE[key] = rb
    return rb


def head_mesh(name='tete', seg=240, rings=180):
    bm = bmesh.new()
    def V(th, ph):
        d = (math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)); r = head_radius(d)
        return bm.verts.new((d[0] * r, d[1] * r, d[2] * r))
    top = V(0.0, 0.0); bot = V(math.pi, 0.0)
    grid = [[V(math.pi * j / rings, 2 * math.pi * i / seg) for i in range(seg)] for j in range(1, rings)]
    for i in range(seg): bm.faces.new((top, grid[0][i], grid[0][(i + 1) % seg]))
    for a, b in zip(grid, grid[1:]):
        for i in range(seg): bm.faces.new((a[i], b[i], b[(i + 1) % seg], a[(i + 1) % seg]))
    for i in range(seg): bm.faces.new((bot, grid[-1][(i + 1) % seg], grid[-1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # léger lissage (efface les marches du fondu)
    bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=0.35, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    return mesh_obj(name, bm)


# ------------------------------------------------------------------ oreilles
EAR = [(0.0085, 0.025), (0.003, 0.0305), (-0.005, 0.0315), (-0.0125, 0.0265), (-0.0165, 0.016), (-0.0175, 0.004), (-0.0155, -0.009),
       (-0.0115, -0.019), (-0.0065, -0.0275), (0.0, -0.0305), (0.0055, -0.0265), (0.0075, -0.017), (0.0105, -0.0075), (0.0095, 0.004),
       (0.0105, 0.014)]


def _seg_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2)) if L2 > 0 else 0.0
    qx, qy = ax + t * dx - px, ay + t * dy - py
    return math.sqrt(qx * qx + qy * qy)


def _inside(p, poly):
    x, y = p; c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c


def ear_height(u, v, s):
    """relief de l'oreille (vers l'extérieur) selon la position (u avant, v haut) et la distance au bord s"""
    lobe = 1 - _sstep(v, -0.02, -0.012)                  # 1 dans le lobe
    front = _sstep(u, 0.004, 0.009)                       # bord avant (attache, tragus)
    rim = 0.0042 * math.exp(-((s - 0.0026) / 0.0019) ** 2) * (1 - lobe) * (1 - front * 0.8)
    anti = 0.0028 * math.exp(-((s - 0.0088) / 0.0022) ** 2) * (1 - lobe) * (1 - front) * _sstep(v, -0.012, -0.004)
    dc = math.hypot((u - 0.0025) / 1.0, (v + 0.002) / 1.25)
    concha = -0.0032 * (1 - _sstep(dc, 0.004, 0.0105)) * (1 - lobe)
    tragus = 0.0022 * math.exp(-(((u - 0.0085) / 0.0022) ** 2 + ((v + 0.004) / 0.0045) ** 2))
    body = 0.0022 + 0.0012 * lobe
    edge = _sstep(s, 0.0, 0.0016) ** 0.6
    return (body + rim + anti + concha + tragus) * edge


def ear_mesh(name='oreille', side=1, step=0.0006):
    poly = EAR
    us = [p[0] for p in poly]; vs = [p[1] for p in poly]
    nu = int((max(us) - min(us)) / step) + 3; nv = int((max(vs) - min(vs)) / step) + 3
    u0, v0 = min(us) - step, min(vs) - step
    bm = bmesh.new(); F = {}; B = {}
    def sd(p):
        d = min(_seg_dist(p, poly[i], poly[(i + 1) % len(poly)]) for i in range(len(poly)))
        return d if _inside(p, poly) else -d
    S_ = {}
    for i in range(nu):
        for j in range(nv):
            p = (u0 + i * step, v0 + j * step); s = sd(p)
            if s > -step * 0.75: S_[(i, j)] = (p, s)
    keep = {}
    for (i, j), (p, s) in S_.items():
        if all((i + a, j + b) in S_ for a in (0, 1) for b in (0, 1)):
            keep[(i, j)] = True
    used = set((i + a, j + b) for (i, j) in keep for a in (0, 1) for b in (0, 1))
    for key in used:
        p, s = S_[key]
        # bord : ramené sur le contour
        if s < 0.0:
            # projection simple vers l'intérieur
            best = None
            for k in range(len(poly)):
                a, b = poly[k], poly[(k + 1) % len(poly)]
                ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
                t = max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2)); q = (ax + t * dx, ay + t * dy)
                dd = math.hypot(q[0] - p[0], q[1] - p[1])
                if best is None or dd < best[0]: best = (dd, q)
            p = best[1]; s = 0.0
        h = ear_height(p[0], p[1], max(s, 0.0))
        back = -0.0016 * _sstep(s, 0.0, 0.002) - 0.0004
        F[key] = bm.verts.new((p[0], h, p[1])); B[key] = bm.verts.new((p[0], back, p[1]))
    for (i, j) in keep:
        q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        bm.faces.new([F[k] for k in q]); bm.faces.new([B[k] for k in reversed(q)])
    # bords : relier avant et arrière
    edges = {}
    for (i, j) in keep:
        q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        for a, b in zip(q, q[1:] + q[:1]):
            k = (a, b); kr = (b, a)
            if kr in edges: del edges[kr]
            else: edges[k] = True
    for (a, b) in edges:
        try: bm.faces.new((F[b], F[a], B[a], B[b]))
        except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    ob = mesh_obj(name, bm)
    if side < 0:
        ob.scale = (1, -1, 1)
    return ob


def ears(root=None, mat_=None):
    out = []
    for side in (1, -1):
        e = ear_mesh('oreille', side)
        # plan de l'oreille : légèrement incliné vers l'arrière en haut, décollé à l'arrière
        e.rotation_euler = (0.0, math.radians(-14), math.radians(-side * 16))
        e.location = (-0.004, side * 0.0715, -0.004)
        if mat_: assign(e, mat_)
        if root: parent(e, root)
        out.append(e)
    return out


def install():
    """branche la nouvelle tête dans hair.py (les coiffures utilisent head_radius / head_mesh)"""
    H.head_radius = head_radius
    H.head_mesh = head_mesh


# ------------------------------------------------------------------ mannequin complet : tête, cou, socle tourné
SKIN = [(0.55, 0.38, 0.3), (0.42, 0.28, 0.2), (0.3, 0.19, 0.12), (0.17, 0.1, 0.065), (0.085, 0.05, 0.032), (0.045, 0.027, 0.018)]


def M_mannequin(kind='ivoire'):
    """tête de présentation : fibre de verre ivoire/grise/noire, ou teinte chair satinée (têtes d'école de coiffure)"""
    if isinstance(kind, int):
        c = SKIN[kind]
        return mat('mannequin', c, 0.45, sss=0.1, sss_radius=(1.0, 0.45, 0.25), sss_scale=0.003, coat=0.08, coat_rough=0.3, spec=0.4, bump={'scale': 2200, 'strength': 0.02})
    base = {'ivoire': (0.6, 0.56, 0.51), 'gris': (0.32, 0.31, 0.3), 'noir': (0.035, 0.034, 0.036), 'liege': (0.42, 0.3, 0.2)}[kind]
    return mat('mannequin', base, 0.4, coat=0.25, coat_rough=0.22, bump={'scale': 1400, 'strength': 0.015})


# ------------------------------------------------------------------ buste à épaules (coiffures longues) et drapé des mèches
def bust_r(a, z):
    """section horizontale du buste (cou → épaules → haut du torse), a = angle autour de z (0 = devant)"""
    if z > -0.1: return 0.0
    zs = [(-0.1, 0.052, 0.05), (-0.15, 0.058, 0.054), (-0.18, 0.1, 0.075), (-0.21, 0.175, 0.095), (-0.25, 0.2, 0.105), (-0.33, 0.205, 0.11), (-0.42, 0.2, 0.11)]
    if z >= zs[0][0]: hy, hx = zs[0][1], zs[0][2]
    elif z <= zs[-1][0]: hy, hx = zs[-1][1], zs[-1][2]
    else:
        for (z0, y0, x0), (z1, y1, x1) in zip(zs, zs[1:]):
            if z1 <= z <= z0:
                t = (z0 - z) / (z0 - z1); t = t * t * (3 - 2 * t); hy, hx = y0 + (y1 - y0) * t, x0 + (x1 - x0) * t; break
    ca, sa = math.cos(a), math.sin(a); p = 2.4
    return (abs(ca / hx) ** p + abs(sa / hy) ** p) ** (-1 / p)


BUST_C = Vector((-0.03, 0.0, 0.0))   # axe du buste (légèrement en arrière du centre de la tête)


def bust_mesh(M, z_bottom=-0.42):
    bm = bmesh.new(); seg = 96; rows = []
    zs = [-0.1 - i * 0.008 for i in range(int((-0.1 - z_bottom) / 0.008) + 1)]
    for z in zs:
        row = []
        for i in range(seg):
            a = i / seg * math.tau; r = bust_r(a, z)
            row.append(bm.verts.new((BUST_C.x + math.cos(a) * r, math.sin(a) * r, z)))
        rows.append(row)
    for a_, b_ in zip(rows, rows[1:]):
        for i in range(seg): bm.faces.new((a_[i], a_[(i + 1) % seg], b_[(i + 1) % seg], b_[i]))
    c = bm.verts.new((BUST_C.x, 0, zs[-1]))
    for i in range(seg): bm.faces.new((rows[-1][(i + 1) % seg], rows[-1][i], c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj('buste', bm); subsurf(ob, 1); assign(ob, M)
    return ob


def drape(strands, off=0.004):
    """mèches qui tombent : un point entré dans le buste est repoussé à sa surface (hors du plan horizontal), puis la mèche
    continue vers le bas en glissant sur les épaules ou le dos"""
    out = []
    for st in strands:
        new = []
        for q in st:
            q = Vector(q)
            if q.z < -0.1:
                d = q - Vector((BUST_C.x, 0, q.z)); a = math.atan2(d.y, d.x); r = d.length; R = bust_r(a, q.z) + off
                if r < R:
                    k = R / max(r, 1e-6); q = Vector((BUST_C.x + d.x * k, d.y * k, q.z))
            new.append(q)
        out.append(new)
    return out


def mannequin(kind='ivoire', plinth=True, neck_len=0.07, pole=0.0, shoulders=False):
    if shoulders:
        root = empty('mannequin'); M = M_mannequin(kind)
        h = head_mesh(); assign(h, M); parent(h, root)
        ears(root, M)
        b = bust_mesh(M); parent(b, root)
        return root, h, -0.42

    """tête + cou (coupe nette) + socle en bois tourné ; pole > 0 : tige chromée entre le cou et le socle (coiffures longues)"""
    root = empty('mannequin'); M = M_mannequin(kind)
    h = head_mesh(); assign(h, M); parent(h, root)
    ears(root, M)
    z1 = -0.075 - neck_len
    prof = [(0.0, -0.02), (0.053, -0.02), (0.055, -0.06), (0.057, -0.09), (0.059, z1 + 0.012), (0.061, z1 + 0.004), (0.066, z1 - 0.001), (0.068, z1 - 0.004), (0.0, z1 - 0.004)]
    tilt = math.radians(9)
    neck = lathe('cou', prof, 96); neck.location = (-0.022, 0, 0); neck.rotation_euler = (0, tilt, 0)
    assign(neck, M); parent(neck, root)
    zb = z1 - 0.004
    bx = -0.022 + zb * math.sin(tilt); bz = zb * math.cos(tilt)      # centre de la base du cou
    base_z = bz
    if pole > 0:
        rod = cyl('tige', 0.009, pole, 48, (bx, 0, bz - pole / 2)); assign(rod, M_chrome(0.12)); parent(rod, root)
        cup = lathe('coupelle', [(0.0, 0.0), (0.03, 0.0), (0.034, 0.004), (0.02, 0.012), (0.012, 0.016), (0.0, 0.016)], 64)
        cup.location = (bx, 0, bz - 0.016); assign(cup, M_chrome(0.12)); parent(cup, root)
        base_z = bz - pole
    if plinth:
        from . import assets as A
        wood = A.pbr('dark_wood', 6.0, coords='Object', rough_mul=0.8, coat=0.5, coat_rough=0.12)
        pl = lathe('socle', [(0.0, 0.0), (0.095, 0.0), (0.098, 0.004), (0.098, 0.014), (0.092, 0.02), (0.08, 0.026), (0.078, 0.034), (0.074, 0.04), (0.072, 0.046), (0.0, 0.046)], 96)
        pl.location = (bx, 0, base_z - 0.044); assign(pl, wood); parent(pl, root)
        base_z -= 0.044
    return root, h, base_z


# ------------------------------------------------------------------ « bonnet » : sous les cheveux, la tête prend la teinte des racines
def paint_scalp(head, groups, radius=0.0062, sat=95, ref_len=0.01, amax=0.92):
    """groups = [(strands, rgb)] ; densité de racines autour de chaque sommet (pondérée par la longueur : un cheveu ras
    laisse voir la peau) → attribut couleur « cuir » (rgb, alpha = masque)"""
    from mathutils.kdtree import KDTree
    me = head.data
    roots = []; cols = []; wts = []
    for strands, rgb in groups:
        for s in strands:
            L = sum((b - a).length for a, b in zip(s, s[1:]))
            roots.append(s[0]); cols.append(rgb); wts.append(min(1.0, L / ref_len) ** 1.5)
    if not roots:
        return
    kd = KDTree(len(roots))
    for i, p in enumerate(roots): kd.insert(p, i)
    kd.balance()
    attr = me.color_attributes.get('cuir') or me.color_attributes.new('cuir', 'FLOAT_COLOR', 'POINT')
    data = []
    for v in me.vertices:
        hits = kd.find_range(v.co, radius)
        if not hits:
            data += [0, 0, 0, 0]; continue
        n = len(hits); a = min(amax, sum(wts[i] for _, i, _ in hits) / sat)
        r = sum(cols[i][0] for _, i, _ in hits) / n; g = sum(cols[i][1] for _, i, _ in hits) / n; b = sum(cols[i][2] for _, i, _ in hits) / n
        data += [r, g, b, a]
    attr.data.foreach_set('color', data)
    # matière propre à la tête (le cou et les oreilles gardent la leur) : mélange vers la teinte des racines selon l'alpha
    if head.data.materials and head.data.materials[0].users > 1:
        head.data.materials[0] = head.data.materials[0].copy()
    for m in head.data.materials:
        nt = m.node_tree; N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
        if N.get('cuir_attr'): continue
        at = N.new('ShaderNodeAttribute'); at.name = 'cuir_attr'; at.attribute_name = 'cuir'; at.attribute_type = 'GEOMETRY'
        mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MIX'
        base = p.inputs['Base Color']
        if base.is_linked:
            L.new(base.links[0].from_socket, mx.inputs[6])
        else:
            mx.inputs[6].default_value = base.default_value
        L.new(at.outputs['Alpha'], mx.inputs[0]); L.new(at.outputs['Color'], mx.inputs[7])
        L.new(mx.outputs[2], base)
        rr = N.new('ShaderNodeMix'); rr.data_type = 'FLOAT'
        rr.inputs[2].default_value = p.inputs['Roughness'].default_value; rr.inputs[3].default_value = 0.55
        L.new(at.outputs['Alpha'], rr.inputs[0]); L.new(rr.outputs[0], p.inputs['Roughness'])
        cw = N.new('ShaderNodeMix'); cw.data_type = 'FLOAT'
        cw.inputs[2].default_value = p.inputs['Coat Weight'].default_value; cw.inputs[3].default_value = 0.0
        L.new(at.outputs['Alpha'], cw.inputs[0]); L.new(cw.outputs[0], p.inputs['Coat Weight'])
