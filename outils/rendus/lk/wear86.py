# Vêtements, v7.77 (deuxième jet) : pièces de tissu à plat (« flat lay ») modelées comme de vrais vêtements — contour
# découpé, épaisseur rembourrée aux bords arrondis, plis fins, coutures surpiquées, côtes, boutons — dans des tissus
# scannés (jersey de coton, denim, laine à chevrons, lin, satin ; Poly Haven, CC0). Aucune marque, aucun logo.
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix
from .core import *
from .core import _nodes
from . import assets as A


def resample(poly, step=0.004, closed=True):
    pts = [Vector((p[0], p[1])) for p in poly]
    if closed: pts.append(pts[0])
    out = []
    for a, b in zip(pts, pts[1:]):
        L = (b - a).length; n = max(1, int(L / step))
        for i in range(n): out.append(a.lerp(b, i / n))
    if not closed: out.append(pts[-1])
    return [(p.x, p.y) for p in out]


def dist_to_poly(x, y, poly):
    d = 1e9
    n = len(poly)
    for i in range(n):
        ax, ay = poly[i]; bx, by = poly[(i + 1) % n]
        dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
        t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / L2))
        px, py = ax + t * dx - x, ay + t * dy - y
        d = min(d, px * px + py * py)
    return math.sqrt(d)


def folds(seed, bbox, n=12, amp=0.004, width=(0.012, 0.03), main_angle=0.0, spread=0.6):
    """plis : arêtes douces aléatoires (segments à profil gaussien), surtout dans une direction"""
    R = random.Random(seed); (x0, y0, x1, y1) = bbox; out = []
    for k in range(n):
        cx, cy = R.uniform(x0, x1), R.uniform(y0, y1); a = main_angle + R.uniform(-spread, spread); L = R.uniform(0.08, 0.3)
        out.append((cx, cy, math.cos(a), math.sin(a), L, R.uniform(*width), amp * R.uniform(0.4, 1.0) * (1 if R.random() > 0.3 else -0.6)))
    return out


def fold_h(x, y, fl):
    h = 0.0
    for (cx, cy, ux, uy, L, w, a) in fl:
        dx, dy = x - cx, y - cy
        t = dx * ux + dy * uy; d = -dx * uy + dy * ux
        if abs(t) > L: continue
        taper = math.cos(t / L * math.pi / 2) ** 2
        h += a * taper * math.exp(-(d / w) ** 2)
    return h


def fabric_piece(name, outline, thick=0.012, edge=0.03, voxel=0.0035, wrinkle=0.004, seed=1, nfolds=14, fold_angle=0.0, flat_bottom=True):
    """pièce de tissu à plat : contour (x, y) en mètres, épaisseur « rembourrée » (bords arrondis sur la largeur edge),
    plis doux (arêtes aléatoires) ; maillage régulier par remaillage voxel"""
    ob = extrude2d(name, outline, thick)
    ob.location.z = thick / 2
    rm = ob.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = voxel; rm.use_smooth_shade = True
    apply_mods(ob)
    ob.location.z = 0.0
    xs = [p[0] for p in outline]; ys = [p[1] for p in outline]
    fl = folds(seed, (min(xs), min(ys), max(xs), max(ys)), nfolds, wrinkle, main_angle=fold_angle)
    poly = resample(outline, 0.02)
    me = ob.data
    for v in me.vertices:
        top = v.co.z > 0.0
        d = dist_to_poly(v.co.x, v.co.y, poly)
        f = min(1.0, d / edge); f = math.sin(f * math.pi / 2) ** 0.7
        if top: v.co.z = thick * (0.3 + 0.7 * f) + fold_h(v.co.x, v.co.y, fl) * f
        else: v.co.z = 0.0
    me.update()
    sm = ob.modifiers.new('lisse', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 3
    apply_mods(ob)
    for p in me.polygons: p.use_smooth = True
    ob['plis'] = 0
    ob['_fl'] = str(fl)
    return ob


def surface_z(ob):
    """hauteur de la pièce sous (x, y) (rayon vertical), pour poser coutures et détails"""
    def z(x, y):
        ok, loc, nrm, _ = ob.ray_cast(Vector((x - ob.location.x, y - ob.location.y, 1.0)), Vector((0, 0, -1)))
        return (loc.z + ob.location.z + 0.0004) if ok else 0.0
    return z


def stitches(name, path, z, color=(0.85, 0.8, 0.6), r=0.0006, dash=0.006, closed=False, M=None):
    """surpiqûre : fil en pointillés (chemin 2D à la hauteur z(x, y))"""
    pts = [(x, y, z(x, y) if callable(z) else z, 1.0) for (x, y) in path]
    if closed: pts.append(pts[0])
    t = curve_tube(name, pts, r, 2, kind='POLY', profile_seg=2)
    def dfn(nt, p):
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
        L = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:]))
        on = math_node(nt, 'GREATER_THAN', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', sep.outputs['X'], math.pi * L / dash)), -0.2)
        nt.links.new(on, p.inputs['Alpha'])
    m = M or mat('fil', color, 0.6, sheen=0.4, base_fn=dfn)
    assign(t, m)
    try: m.blend_method = 'HASHED'
    except Exception: pass
    return t


def M_fabric_scan(aid, color=None, scale=6.0, sat=None, val=1.0, normal_k=1.2, rough_add=0.0, sheen=0.12, name=None, hue=0.5, spec=0.25):
    """tissu scanné, éventuellement reteint (désaturé puis multiplié par color) ; reflet spéculaire faible (fibres)"""
    if color is not None:
        m = A.pbr(aid, scale, res='1k', coords='Object', sat=0.0 if sat is None else sat, val=val, hue=hue, tint=color, normal_k=normal_k, rough_add=rough_add, sheen=sheen, spec=spec, name=name or aid)
    else:
        m = A.pbr(aid, scale, res='1k', coords='Object', sat=1.0 if sat is None else sat, val=val, hue=hue, normal_k=normal_k, rough_add=rough_add, sheen=sheen, spec=spec, name=name or aid)
    p = m.node_tree.nodes.get('Principled BSDF')
    if color is not None: p.inputs['Sheen Tint'].default_value = (*[min(1.0, c * 2 + 0.2) for c in color], 1)
    return m


# ------------------------------------------------------------------ contours de vêtements (à plat, devant vers +y : col en haut)
def tshirt_outline(W=0.5, H=0.7, sleeve=0.2, neck=0.09):
    w = W / 2
    return [(-w, -H / 2), (w, -H / 2), (w * 1.0, H / 2 - 0.2), (w + sleeve * 0.9, H / 2 - 0.27), (w + sleeve, H / 2 - 0.15), (w * 0.62, H / 2 - 0.01), (neck, H / 2),
            (neck * 0.6, H / 2 - 0.04), (0.0, H / 2 - 0.055), (-neck * 0.6, H / 2 - 0.04), (-neck, H / 2), (-w * 0.62, H / 2 - 0.01), (-w - sleeve, H / 2 - 0.15),
            (-w - sleeve * 0.9, H / 2 - 0.27), (-w * 1.0, H / 2 - 0.2)]


def shirt_outline(W=0.54, H=0.76, sleeve=0.22):
    w = W / 2
    return [(-w, -H / 2 + 0.02), (-0.06, -H / 2), (0.06, -H / 2), (w, -H / 2 + 0.02), (w, H / 2 - 0.2), (w + sleeve * 0.9, H / 2 - 0.29), (w + sleeve, H / 2 - 0.16),
            (w * 0.64, H / 2 - 0.01), (0.08, H / 2 + 0.01), (0.0, H / 2 - 0.035), (-0.08, H / 2 + 0.01), (-w * 0.64, H / 2 - 0.01), (-w - sleeve, H / 2 - 0.16),
            (-w - sleeve * 0.9, H / 2 - 0.29), (-w, H / 2 - 0.2)]


def jeans_outline(W=0.4, L=0.98):
    w = W / 2
    return [(-w, L / 2), (w, L / 2), (w + 0.025, L / 2 - 0.25), (w + 0.01, -L / 2), (0.035, -L / 2), (0.012, L / 2 - 0.3), (-0.012, L / 2 - 0.3), (-0.035, -L / 2), (-w - 0.01, -L / 2), (-w - 0.025, L / 2 - 0.25)]


def jacket_outline(W=0.56, H=0.76, sleeve=0.24):
    w = W / 2
    return [(-w, -H / 2), (-0.02, -H / 2 - 0.02), (0.02, -H / 2 - 0.02), (w, -H / 2), (w, H / 2 - 0.22), (w + sleeve * 0.85, H / 2 - 0.34), (w + sleeve, H / 2 - 0.2),
            (w * 0.7, H / 2 - 0.01), (0.1, H / 2 + 0.005), (0.0, H / 2 - 0.08), (-0.1, H / 2 + 0.005), (-w * 0.7, H / 2 - 0.01), (-w - sleeve, H / 2 - 0.2),
            (-w - sleeve * 0.85, H / 2 - 0.34), (-w, H / 2 - 0.22)]


# ------------------------------------------------------------------ détails : bandes, boutons, poches, imprimés
def band(name, path2d, zf, width=0.018, thick=0.003, M=None, closed=False):
    """bande de tissu posée à plat le long d'un chemin 2D (col côtelé, ceinture, parementure)"""
    pts = [Vector((x, y, 0)) for (x, y) in path2d]
    rows = []
    bm = bmesh.new()
    for i, p in enumerate(pts):
        a = pts[i - 1] if i > 0 else pts[i]; b = pts[i + 1] if i + 1 < len(pts) else pts[i]
        t = (b - a); t.z = 0; t = t.normalized() if t.length > 1e-9 else Vector((1, 0, 0))
        n = Vector((-t.y, t.x, 0))
        z = zf(p.x, p.y)
        rows.append([bm.verts.new(p + n * (-width / 2) + Vector((0, 0, z))), bm.verts.new(p + n * (width / 2) + Vector((0, 0, z))),
                     bm.verts.new(p + n * (width / 2) + Vector((0, 0, z + thick))), bm.verts.new(p + n * (-width / 2) + Vector((0, 0, z + thick)))])
    for r0, r1 in zip(rows, rows[1:] + ([rows[0]] if closed else [])):
        for i in range(4):
            j = (i + 1) % 4; bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    if not closed:
        bm.faces.new(rows[0]); bm.faces.new(list(reversed(rows[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm); bevel(ob, min(thick * 0.45, 0.0015), 2); apply_mods(ob); shade_auto(ob, 40)
    if M: assign(ob, M)
    return ob


def button(loc, r=0.0055, rgb=(0.9, 0.88, 0.82), holes=4):
    b = lathe('bouton', [(0.0, 0.0), (r, 0.0), (r, 0.0012), (r * 0.8, 0.0022), (0.0, 0.0016)], 32); b.location = loc
    assign(b, mat('bouton', rgb, 0.25, coat=0.7, coat_rough=0.1)); return b


def M_rib(color, scale=420.0, tex='cotton_jersey', tex_scale=9.0, axis='X'):
    """jersey côtelé : tissu scanné + côtes (bandes) dans une direction"""
    m = M_fabric_scan(tex, color, tex_scale, name='cotes')
    nt = m.node_tree; p = nt.nodes.get('Principled BSDF')
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    w = math_node(nt, 'ABSOLUTE', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', sep.outputs[{'X': 0, 'Y': 1}[axis]], scale)))
    b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.6; b.inputs['Distance'].default_value = 0.0008
    nt.links.new(w, b.inputs['Height'])
    if p.inputs['Normal'].is_linked: nt.links.new(p.inputs['Normal'].links[0].from_socket, b.inputs['Normal'])
    nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    return m


def print_decal(M, img_path, center, size, angle=0.0):
    """imprimé (image PNG à transparence) projeté de dessus sur le tissu, mélangé à la couleur"""
    nt = M.node_tree; N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
    ca, sa = math.cos(-angle), math.sin(-angle)
    dx = math_node(nt, 'SUBTRACT', sep.outputs['X'], center[0]); dy = math_node(nt, 'SUBTRACT', sep.outputs['Y'], center[1])
    u = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', math_node(nt, 'MULTIPLY', dx, ca), math_node(nt, 'MULTIPLY', dy, sa)), size[0]), 0.5)
    v = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', dx, sa), math_node(nt, 'MULTIPLY', dy, ca)), size[1]), 0.5)
    cb = N.new('ShaderNodeCombineXYZ'); L.new(u, cb.inputs[0]); L.new(v, cb.inputs[1])
    it = N.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(img_path, check_existing=True); it.extension = 'CLIP'; L.new(cb.outputs[0], it.inputs['Vector'])
    cur = p.inputs['Base Color'].links[0].from_socket if p.inputs['Base Color'].is_linked else tuple(p.inputs['Base Color'].default_value[:3])
    # l'encre prend un peu du grain du tissu : on multiplie l'imprimé par la luminance du tissu (relative)
    L.new(mix(nt, cur, it.outputs['Color'], math_node(nt, 'MULTIPLY', it.outputs['Alpha'], 0.95)), p.inputs['Base Color'])
    return M


def svg_png(svg, path, w=1024, h=1024):
    if os.path.exists(path): return path
    import subprocess
    script = "const sharp=require('sharp');sharp(Buffer.from(process.argv[1])).resize(%d,%d).png().toFile(process.argv[2]).then(()=>console.log('ok'))" % (w, h)
    subprocess.run(['node', '-e', script, svg, path], check=True, stdout=subprocess.DEVNULL)
    return path


# ------------------------------------------------------------------ vêtements complets (à plat)
def tshirt(color=(0.08, 0.1, 0.16), tex='cotton_jersey', scale=9.0, seed=1, decal=None, loc=(0, 0, 0), rot=0.0, W=0.5, H=0.7):
    root = empty('tshirt', loc, (0, 0, rot))
    out = tshirt_outline(W, H)
    body = fabric_piece('tshirt', out, 0.011, 0.028, seed=seed, nfolds=16); M = M_fabric_scan(tex, color, scale)
    if decal: print_decal(M, decal[0], decal[1], decal[2])
    assign(body, M); parent(body, root)
    z = surface_z(body)
    neck = [(0.09, H / 2 - 0.004), (0.065, H / 2 - 0.028), (0.035, H / 2 - 0.046), (0.0, H / 2 - 0.052), (-0.035, H / 2 - 0.046), (-0.065, H / 2 - 0.028), (-0.09, H / 2 - 0.004)]
    nb = band('col', resample(neck, 0.004, False), z, 0.02, 0.0025, M_rib(color)); parent(nb, root)
    th = tuple(min(1.0, c * 0.7 + 0.04) for c in color)
    for (path) in ([(-W / 2 + 0.01, -H / 2 + 0.022), (W / 2 - 0.01, -H / 2 + 0.022)],
                   [(W / 2 + 0.2 - 0.03, H / 2 - 0.15 - 0.02), (W / 2 + 0.18 * 0.9 - 0.02, H / 2 - 0.27 + 0.02)],
                   [(-(W / 2 + 0.2 - 0.03), H / 2 - 0.15 - 0.02), (-(W / 2 + 0.18 * 0.9 - 0.02), H / 2 - 0.27 + 0.02)],
                   [(0.1, H / 2 - 0.005), (W / 2 * 0.62 + 0.02, H / 2 - 0.012), (W / 2 + 0.17, H / 2 - 0.14)],
                   [(-0.1, H / 2 - 0.005), (-(W / 2 * 0.62 + 0.02), H / 2 - 0.012), (-(W / 2 + 0.17), H / 2 - 0.14)]):
        st = stitches('couture', resample(path, 0.003, False), z, th); parent(st, root)
    return root


def jeans(color=None, tex='denim_fabric_04', scale=7.0, seed=4, loc=(0, 0, 0), rot=0.0, W=0.4, L=0.98, wrinkle=0.004):
    root = empty('jean', loc, (0, 0, rot))
    out = jeans_outline(W, L)
    body = fabric_piece('jean', out, 0.016, 0.03, wrinkle=wrinkle, seed=seed, nfolds=18, fold_angle=0.0)
    M = M_fabric_scan(tex, color, scale, sat=1.0 if color is None else None); assign(body, M); parent(body, root)
    z = surface_z(body)
    wb = band('ceinture', resample([(-W / 2 + 0.004, L / 2 - 0.022), (W / 2 - 0.004, L / 2 - 0.022)], 0.004, False), z, 0.042, 0.004, M); parent(wb, root)
    gold = (0.85, 0.55, 0.18)
    for path in ([(-W / 2 + 0.01, L / 2 - 0.045), (W / 2 - 0.01, L / 2 - 0.045)],
                 [(0.005, L / 2 - 0.05), (0.04, L / 2 - 0.05), (0.04, L / 2 - 0.2), (0.012, L / 2 - 0.23)],
                 [(W / 2 - 0.005, L / 2 - 0.12), (W / 2 - 0.07, L / 2 - 0.06), (W / 2 - 0.1, L / 2 - 0.045)],
                 [(-W / 2 + 0.005, L / 2 - 0.12), (-W / 2 + 0.07, L / 2 - 0.06), (-W / 2 + 0.1, L / 2 - 0.045)],
                 [(0.04, -L / 2 + 0.025), (W / 2 + 0.005, -L / 2 + 0.025)], [(-0.04, -L / 2 + 0.025), (-W / 2 - 0.005, -L / 2 + 0.025)]):
        st = stitches('surpiqure', resample(path, 0.003, False), z, gold, 0.0007); parent(st, root)
    bt = button((0.0, L / 2 - 0.022, z(0.0, L / 2 - 0.022) + 0.004), 0.008, (0.55, 0.5, 0.42)); assign(bt, M_chrome(0.25, (0.7, 0.66, 0.58))); parent(bt, root)
    for (x, y) in ((W / 2 - 0.1, L / 2 - 0.05), (-W / 2 + 0.1, L / 2 - 0.05)):
        rv = cyl('rivet', 0.003, 0.002, 16, (x, y, z(x, y) + 0.001), (0, 0, 0)); assign(rv, mat('cuivre', (0.75, 0.45, 0.25), 0.3, metal=1.0)); parent(rv, root)
    for x in (-0.12, -0.05, 0.05, 0.12):
        lp = band('passant', [(x, L / 2 - 0.004), (x, L / 2 - 0.04)], z, 0.01, 0.003, M); parent(lp, root)
    return root


def shirt(color=(0.85, 0.85, 0.82), tex='stretch_poplin', scale=10.0, seed=3, decal_fn=None, loc=(0, 0, 0), rot=0.0, W=0.54, H=0.76, pattern=None):
    """chemise boutonnée à plat : col, patte de boutonnage, boutons, poche poitrine, coutures ; pattern = image répétée"""
    root = empty('chemise', loc, (0, 0, rot))
    out = shirt_outline(W, H)
    body = fabric_piece('chemise', out, 0.011, 0.028, seed=seed, nfolds=16)
    M = M_fabric_scan(tex, color, scale) if pattern is None else pattern_fabric(pattern, tex, scale)
    assign(body, M); parent(body, root)
    z = surface_z(body)
    pl = band('patte', resample([(0.0, H / 2 - 0.04), (0.0, -H / 2 + 0.01)], 0.004, False), z, 0.034, 0.003, M); parent(pl, root)
    for i in range(7):
        y = H / 2 - 0.07 - i * 0.1
        b = button((0.0, y, z(0.0, y) + 0.003), 0.0055); parent(b, root)
    for sd in (-1, 1):
        col = extrude2d('col', [(0.0, H / 2 - 0.035), (sd * 0.075, H / 2 - 0.07), (sd * 0.135, H / 2 - 0.005), (sd * 0.07, H / 2 + 0.012), (0.0, H / 2 + 0.005)], 0.004, 0.0015)
        col.location.z = z(sd * 0.06, H / 2 - 0.02) + 0.004; assign(col, M); parent(col, root)
    pk = extrude2d('poche', [(-0.07, 0.12), (0.0, 0.12), (0.0, 0.03), (-0.035, 0.015), (-0.07, 0.03)], 0.0025, 0.001)
    pk.location = (-0.07, -0.0, z(-0.11, 0.08) + 0.0015); assign(pk, M); parent(pk, root)
    th = (0.9, 0.9, 0.86) if pattern else tuple(min(1, c * 0.8) for c in color)
    for path in ([(-W / 2 + 0.01, -H / 2 + 0.03), (-0.02, -H / 2 + 0.008)], [(0.02, -H / 2 + 0.008), (W / 2 - 0.01, -H / 2 + 0.03)]):
        st = stitches('couture', resample(path, 0.003, False), z, th); parent(st, root)
    return root


def pattern_fabric(img, tex='stretch_poplin', scale=10.0, rep=3.0, plane='xy'):
    """tissu imprimé : motif (image) répété par-dessus le grain du tissu scanné ; plane = plan de projection"""
    m = M_fabric_scan(tex, (1.0, 1.0, 1.0), scale, name='imprime')
    nt = m.node_tree; N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
    cb = N.new('ShaderNodeCombineXYZ'); L.new(math_node(nt, 'MULTIPLY', sep.outputs['X'], rep), cb.inputs[0])
    L.new(math_node(nt, 'MULTIPLY', sep.outputs['Z' if plane == 'xz' else 'Y'], rep), cb.inputs[1])
    v = cb.outputs[0]
    it = N.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(img, check_existing=True); L.new(v, it.inputs['Vector'])
    cur = p.inputs['Base Color'].links[0].from_socket
    L.new(mix_mul(nt, cur, it.outputs['Color']), p.inputs['Base Color'])
    return m


def mix_mul(nt, a, b):
    m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = 'MULTIPLY'; m.inputs[0].default_value = 1.0
    nt.links.new(a, m.inputs[6]); nt.links.new(b, m.inputs[7]); return m.outputs[2]


# ------------------------------------------------------------------ vêtements suspendus (cintre) : drapé vertical
def hang_tshirt_outline(W=0.48, H=0.7, sl=0.2, sw=0.15):
    """t-shirt suspendu, vu de face : manches retombant le long du corps (contour dans le plan x-z, col en haut à z = 0)"""
    w = W / 2
    return [(-w, -H), (w, -H), (w + 0.005, -0.19), (w + 0.07, -0.3), (w + 0.09, -0.29), (w + 0.075, -0.06), (w * 0.62, 0.0), (0.085, 0.01), (0.04, -0.03), (0.0, -0.04),
            (-0.04, -0.03), (-0.085, 0.01), (-w * 0.62, 0.0), (-w - 0.075, -0.06), (-w - 0.09, -0.29), (-w - 0.07, -0.3), (-w - 0.005, -0.19)]


def hang_shirt_outline(W=0.5, H=0.78):
    w = W / 2
    # épaules tombantes et arrondies (le tissu suit le cintre), manches légèrement fuselées
    R = [(w + 0.01, -0.22), (w + 0.045, -0.62), (w + 0.095, -0.625), (w + 0.09, -0.18), (w + 0.07, -0.075), (w + 0.03, -0.04), (w * 0.6, -0.018)]
    return [(-w, -H + 0.02), (-0.05, -H), (0.05, -H), (w, -H + 0.02)] + R + [(0.085, 0.015), (0.0, -0.03), (-0.085, 0.015)] + [(-x, z) for (x, z) in reversed(R)]


def hang_jacket_outline(W=0.54, H=0.78):
    w = W / 2
    # taille marquée, épaules tombantes et arrondies sur le cintre, manches fuselées
    R = [(w - 0.012, -0.44), (w + 0.01, -0.25), (w + 0.045, -0.66), (w + 0.105, -0.665), (w + 0.105, -0.2), (w + 0.085, -0.085), (w + 0.04, -0.045), (w * 0.62, -0.02)]
    return [(-w, -H), (-0.02, -H - 0.025), (0.02, -H - 0.025), (w, -H)] + R + [(0.1, 0.012), (0.0, -0.06), (-0.1, 0.012)] + [(-x, z) for (x, z) in reversed(R)]


def drape_piece(name, outline, depth=0.045, edge=0.05, voxel=0.004, seed=1, nfold=8, famp=0.02, bulge_z=(-0.45, 0.3), sway=0.025):
    """vêtement suspendu : pièce (x, z) gonflée en volume (corps), plis verticaux qui s'élargissent vers le bas"""
    ob = extrude2d(name, [(x, z) for (x, z) in outline], depth)
    ob.rotation_euler = (math.pi / 2, 0, 0)
    me = ob.data; Mr = ob.matrix_basis.to_3x3()
    for v in me.vertices: v.co = Mr @ v.co
    ob.rotation_euler = (0, 0, 0); me.update()
    rm = ob.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = voxel; rm.use_smooth_shade = True
    apply_mods(ob)
    R = random.Random(seed)
    fl = [(R.uniform(-0.22, 0.22), R.uniform(0.015, 0.04), R.uniform(0.6, 1.0) * famp * (1 if R.random() > 0.35 else -0.7), R.uniform(-0.06, 0.06)) for _ in range(nfold)]
    poly = resample(outline, 0.02)
    xs = [p[0] for p in outline]; zs = [p[1] for p in outline]; zmin = min(zs)
    for v in me.vertices:
        x, y, z = v.co
        d = dist_to_poly(x, z, poly)
        f = min(1.0, d / edge); f = math.sin(f * math.pi / 2) ** 0.8
        # gonflement : plus épais au torse, à plat aux bords ; plis : arêtes verticales, plus marquées vers le bas
        g = max(0.0, min(1.0, (0.0 - z) / 0.12))
        down = max(0.0, min(1.0, (-z) / (-zmin)))
        h = 0.0
        for (cx, w, a, tilt) in fl:
            xx = cx + tilt * (-z)
            h += a * math.exp(-((x - xx) / (w * (0.6 + 0.8 * down))) ** 2) * down ** 0.8
        side = 1.0 if y < 0 else -1.0
        thick = depth * 0.5 * f * g * (0.6 + 0.4 * (1 - down))
        v.co.y = side * (0.002 + thick) + (h * f if side > 0 else h * 0.5 * f)
        v.co.y = -v.co.y + sway * down ** 1.5
    me.update()
    sm = ob.modifiers.new('lisse', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 3
    apply_mods(ob)
    for p in me.polygons: p.use_smooth = True
    return ob


def hanger(kind='wood', loc=(0, 0, 0), W=0.44):
    root = empty('cintre', loc)
    M = A.pbr('wood_table_worn', 4.0, res='1k', coords='Object', coat=0.8, coat_rough=0.08, val=0.9) if kind == 'wood' else M_chrome(0.15)
    pts = [(-W / 2, 0, -0.06), (-W / 4, 0, -0.025), (0.0, 0, -0.005), (W / 4, 0, -0.025), (W / 2, 0, -0.06)]
    arm = curve_tube('bras', [(*p, 1.0) for p in pts], 0.011 if kind == 'wood' else 0.0035, 16, profile_seg=4)
    if kind == 'wood': arm.scale = (1, 1.6, 1)
    assign(arm, M); parent(arm, root)
    hook = curve_tube('crochet', [(0, 0, 0.0, 1), (0, 0, 0.05, 1), (0.012, 0, 0.075, 1), (0.03, 0, 0.07, 1), (0.032, 0, 0.055, 1)], 0.0022, 12, profile_seg=3)
    assign(hook, M_chrome(0.1)); parent(hook, root)
    return root


# ------------------------------------------------------------------ buste de couture (mannequin femme) et robes
FORM = [(-0.36, 0.17, 0.125), (-0.24, 0.185, 0.13), (-0.14, 0.17, 0.12), (-0.02, 0.135, 0.1), (0.06, 0.13, 0.095), (0.14, 0.15, 0.115), (0.2, 0.158, 0.13),
        (0.26, 0.155, 0.122), (0.33, 0.16, 0.1), (0.37, 0.165, 0.085), (0.4, 0.15, 0.075)]


def form_r(a, z, bust=0.0):
    """rayon du buste de couture (hanches, taille, poitrine, épaules) à l'angle a (0 = devant), hauteur z"""
    if z <= FORM[0][0]: hy, hx = FORM[0][1], FORM[0][2]
    elif z >= FORM[-1][0]: hy, hx = FORM[-1][1], FORM[-1][2]
    else:
        for (z0, y0, x0), (z1, y1, x1) in zip(FORM, FORM[1:]):
            if z0 <= z <= z1:
                t = (z - z0) / (z1 - z0); t = t * t * (3 - 2 * t); hy, hx = y0 + (y1 - y0) * t, x0 + (x1 - x0) * t; break
    ca, sa = math.cos(a), math.sin(a)
    r = (abs(ca / hx) ** 2.4 + abs(sa / hy) ** 2.4) ** (-1 / 2.4)
    # poitrine : deux bosses douces sur le devant
    for sy in (-1, 1):
        da = a - sy * 0.55; dz = z - 0.2
        r += 0.022 * math.exp(-(da / 0.32) ** 2 - (dz / 0.06) ** 2) * max(0.0, ca)
    return r


def dress_form(color=(0.86, 0.84, 0.8), z0=-0.38, stand=True):
    root = empty('buste_couture')
    bm = bmesh.new(); seg = 96; rows = []
    zs = [z0 + i * 0.01 for i in range(int((0.4 - z0) / 0.01) + 1)] + [0.4 + 0.045 * math.sin(k / 8 * math.pi / 2) for k in range(1, 9)]
    for z in zs:
        cap = max(0.0, (z - 0.4) / 0.045)
        rows.append([bm.verts.new((math.cos(a) * form_r(a, z) * math.sqrt(max(0.0, 1 - cap ** 2)), math.sin(a) * form_r(a, z) * math.sqrt(max(0.0, 1 - cap ** 2)), z)) for a in [i / seg * math.tau for i in range(seg)]])
    for a_, b_ in zip(rows, rows[1:]):
        for i in range(seg): bm.faces.new((a_[i], a_[(i + 1) % seg], b_[(i + 1) % seg], b_[i]))
    for row, flip in ((rows[0], True), (rows[-1], False)):
        c = bm.verts.new((0, 0, row[0].co.z))
        for i in range(seg):
            f = (row[i], row[(i + 1) % seg], c); bm.faces.new(f if flip else f[::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    t = mesh_obj('buste', bm); subsurf(t, 1)
    M = M_fabric_scan('rough_linen', color, 12.0, name='toile_buste'); assign(t, M); parent(t, root)
    neck = cyl('cou', 0.05, 0.08, 48, (0, 0, 0.47), (0, 0, 0), 0.01); assign(neck, M); parent(neck, root)
    cap_ = lathe('chapeau', [(0.0, 0.512), (0.05, 0.508), (0.054, 0.5), (0.0, 0.498)], 48); assign(cap_, mat('bois_noir', (0.03, 0.02, 0.015), 0.3, coat=0.7)); parent(cap_, root)
    if stand:
        pole = cyl('tige', 0.012, 1.0 + z0 + 0.36, 32, (0, 0, (z0 - 1.0) / 2 + 0.0), (0, 0, 0)); assign(pole, mat('laiton', (0.75, 0.55, 0.25), 0.25, metal=1.0)); parent(pole, root)
        for k in range(3):
            a = k / 3 * math.tau
            leg = curve_tube('pied', [(0, 0, -0.98, 1), (math.cos(a) * 0.12, math.sin(a) * 0.12, -1.02, 1), (math.cos(a) * 0.26, math.sin(a) * 0.26, -1.06, 1)], 0.012, 12, profile_seg=4)
            assign(leg, mat('bois_noir', (0.03, 0.02, 0.015), 0.3, coat=0.7)); parent(leg, root)
    return root


def dress_shell(name, z_top=0.3, z_hem=-0.75, flare=0.12, off=0.006, strap=True, nfold=9, famp=0.012, seed=3, neckline=0.0, flare_from=-0.22, flare_pow=1.4):
    """robe épousant le buste puis évasée sous les hanches (plis verticaux dans la jupe) ; z_top = haut du bustier"""
    R = random.Random(seed)
    fl = [(R.uniform(0, math.tau), R.uniform(0.12, 0.3), R.uniform(0.5, 1.0) * famp * (1 if R.random() > 0.3 else -0.6)) for _ in range(nfold)]
    bm = bmesh.new(); seg = 120; rows = []
    nz = int((z_top - z_hem) / 0.008)
    for j in range(nz + 1):
        z = z_hem + (z_top - z_hem) * j / nz
        row = []
        for i in range(seg):
            a = i / seg * math.tau
            zz = max(z, FORM[0][0])
            r = form_r(a, zz) + off
            z0f = flare_from
            below = max(0.0, (z0f - z) / (z0f - z_hem)) if z < z0f else 0.0
            r += flare * below ** flare_pow
            if z < FORM[0][0]: r = max(r, form_r(a, FORM[0][0]) + off + flare * below ** flare_pow)
            h = sum(amp * math.exp(-(((a - fa + math.pi) % math.tau - math.pi) / w) ** 2) for (fa, w, amp) in fl) * below
            r += h
            zt = z
            if j == nz:
                zt = z - neckline * max(0.0, math.cos(a)) ** 6
            row.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, zt)))
        rows.append(row)
    for a_, b_ in zip(rows, rows[1:]):
        for i in range(seg): bm.faces.new((a_[i], a_[(i + 1) % seg], b_[(i + 1) % seg], b_[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm); solidify(ob, 0.003, 1); subsurf(ob, 1); apply_mods(ob)
    for p in ob.data.polygons: p.use_smooth = True
    straps = []
    if strap:
        for sd in (-1, 1):
            pts = []
            for k in range(17):
                phi = math.pi * k / 16
                z = z_top - 0.01 + (0.445 - z_top) * math.sin(phi)
                a = 0.0 if math.cos(phi) >= 0 else math.pi
                rr = form_r(a, min(z, 0.4)) * (1.0 if z < 0.4 else max(0.2, 1 - (z - 0.4) / 0.05)) + off + 0.004
                pts.append((math.cos(phi) * rr, sd * 0.078, z, 1.0))
            st = curve_tube('bretelle', pts, 0.0035, 16, profile_seg=3); straps.append(st)
    return ob, straps


def M_sequins(color=(0.75, 0.05, 0.12), scale=320.0):
    """paillettes : petits miroirs disposés en écailles, chacun incliné au hasard (étincelles), base satinée dessous"""
    m = bpy.data.materials.new('paillettes'); nt = _nodes(m); N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
    v = tex_coord(nt, 'Object', 1.0)
    vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = scale; vo.inputs['Randomness'].default_value = 0.35; L.new(v, vo.inputs['Vector'])
    sub = N.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; L.new(vo.outputs['Color'], sub.inputs[0]); sub.inputs[1].default_value = (0.5, 0.5, 0.5)
    sc = N.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; L.new(sub.outputs[0], sc.inputs[0]); sc.inputs['Scale'].default_value = 0.9
    geo = N.new('ShaderNodeNewGeometry')
    add = N.new('ShaderNodeVectorMath'); add.operation = 'ADD'; L.new(geo.outputs['Normal'], add.inputs[0]); L.new(sc.outputs[0], add.inputs[1])
    nrm = N.new('ShaderNodeVectorMath'); nrm.operation = 'NORMALIZE'; L.new(add.outputs[0], nrm.inputs[0])
    L.new(nrm.outputs[0], p.inputs['Normal'])
    edge = math_node(nt, 'GREATER_THAN', vo.outputs['Distance'], 0.42)
    p.inputs['Base Color'].default_value = (*color, 1)
    L.new(mix(nt, tuple(color), tuple(c * 0.25 for c in color), edge), p.inputs['Base Color'])
    p.inputs['Metallic'].default_value = 1.0; p.inputs['Roughness'].default_value = 0.12
    L.new(math_node(nt, 'ADD', 0.1, math_node(nt, 'MULTIPLY', edge, 0.5)), p.inputs['Roughness'])
    return m


def M_satin(color=(0.05, 0.05, 0.06)):
    m = A.pbr('crepe_satin', 8.0, res='1k', coords='Object', sat=0.0, tint=tuple(min(1, c * 1.6) for c in color), normal_k=0.8, rough_mul=0.85, rough_add=0.08, sheen=0.25, name='satin')
    p = m.node_tree.nodes.get('Principled BSDF'); p.inputs['Anisotropic'].default_value = 0.6; p.inputs['Specular IOR Level'].default_value = 0.7
    return m


# ------------------------------------------------------------------ détails des vêtements suspendus (plan x-z, devant vers -y)
def front_y(ob):
    """y de la face avant d'une pièce suspendue en (x, z) (rayon depuis la caméra), en coordonnées du parent"""
    def f(x, z):
        ok, loc, nrm, _ = ob.ray_cast(Vector((x - ob.location.x, -1.0, z - ob.location.z)), Vector((0, 1, 0)))
        return (loc.y + ob.location.y) if ok else 0.0
    return f


def stand_xz(ob):
    """bascule un objet construit « à plat » (x, y = z_vêtement, z = hauteur) dans le plan du vêtement suspendu"""
    R = Matrix.Rotation(math.radians(90), 3, 'X')
    if ob.type == 'MESH':
        me = ob.data
        for v in me.vertices: v.co = R @ v.co
        me.update()
    else:
        ob.rotation_euler = (math.radians(90), 0, 0)
    ob.location = R @ Vector(ob.location)
    return ob


def hz(fy, lift=0.0006):
    """hauteur « à plat » correspondant à la face avant : h(x, z) = -y_avant + lift"""
    return lambda x, z: -fy(x, z) + lift


def hang_tshirt(color=(0.05, 0.07, 0.12), tex='cotton_jersey', scale=9.0, seed=2, decal=None, loc=(0, 0, 0), rot=0.0, kind='wood'):
    root = empty('tshirt_suspendu', loc, (0, 0, rot))
    out = hang_tshirt_outline()
    g = drape_piece('tshirt', out, 0.05, seed=seed); M = M_fabric_scan(tex, color, scale, sheen=0.12)
    if decal: print_decal_xz(M, *decal)
    assign(g, M); parent(g, root)
    fy = front_y(g); h = hz(fy)
    neck = [(0.085, 0.006), (0.06, -0.022), (0.03, -0.036), (0.0, -0.04), (-0.03, -0.036), (-0.06, -0.022), (-0.085, 0.006)]
    nb = band('col', resample(neck, 0.004, False), h, 0.018, 0.0025, M_rib(color)); stand_xz(nb); parent(nb, root)
    th = tuple(min(1.0, c * 0.7 + 0.05) for c in color)
    for path in ([(-0.235, -0.68), (0.235, -0.68)], [(0.245, -0.27), (0.31, -0.28)], [(-0.245, -0.27), (-0.31, -0.28)]):
        st = stitches('couture', resample(path, 0.003, False), h, th); stand_xz(st); parent(st, root)
    hg = hanger(kind, (0, 0, 0.012)); parent(hg, root)
    return root


def print_decal_xz(M, img, center, size):
    """imprimé sur un vêtement suspendu : projection selon y (center, size en x-z)"""
    nt = M.node_tree; N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
    u = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', sep.outputs['X'], center[0]), size[0]), 0.5)
    v = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', sep.outputs['Z'], center[1]), size[1]), 0.5)
    front = math_node(nt, 'LESS_THAN', sep.outputs['Y'], 0.0)
    cb = N.new('ShaderNodeCombineXYZ'); L.new(u, cb.inputs[0]); L.new(v, cb.inputs[1])
    it = N.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(img, check_existing=True); it.extension = 'CLIP'; L.new(cb.outputs[0], it.inputs['Vector'])
    cur = p.inputs['Base Color'].links[0].from_socket if p.inputs['Base Color'].is_linked else tuple(p.inputs['Base Color'].default_value[:3])
    L.new(mix(nt, cur, it.outputs['Color'], math_node(nt, 'MULTIPLY', math_node(nt, 'MULTIPLY', it.outputs['Alpha'], front), 0.95)), p.inputs['Base Color'])
    return M


def hang_shirt(color=(0.85, 0.86, 0.84), tex='stretch_poplin', scale=10.0, seed=3, pattern=None, rep=3.0, loc=(0, 0, 0), rot=0.0, kind='wood', short=False, open_collar=True):
    root = empty('chemise_suspendue', loc, (0, 0, rot))
    out = hang_tshirt_outline(0.5, 0.76) if short else hang_shirt_outline()
    g = drape_piece('chemise', out, 0.05, seed=seed)
    M = pattern_fabric(pattern, tex, scale, rep, 'xz') if pattern else M_fabric_scan(tex, color, scale, sheen=0.12)
    assign(g, M); parent(g, root)
    fy = front_y(g); h = hz(fy, 0.0008)
    pl = band('patte', resample([(0.0, -0.05), (0.0, -0.75)], 0.004, False), h, 0.032, 0.0025, M); stand_xz(pl); parent(pl, root)
    for i in range(6):
        z = -0.1 - i * 0.11
        b = button((0.0, z, h(0.0, z) + 0.003), 0.0055, (0.92, 0.9, 0.85) if not pattern else (0.95, 0.93, 0.88)); stand_xz(b); parent(b, root)
    for sd in (-1, 1):
        cl = [(0.0, -0.045), (sd * 0.05, -0.1), (sd * 0.115, -0.02 if open_collar else -0.06), (sd * 0.1, 0.012), (sd * 0.02, 0.012)]
        col = extrude2d('col', cl, 0.004, 0.0015); col.location.z = h(sd * 0.05, -0.04) + 0.004; stand_xz(col); assign(col, M); parent(col, root)
    pk = extrude2d('poche', [(-0.06, -0.14), (0.0, -0.14), (0.0, -0.25), (-0.03, -0.265), (-0.06, -0.25)], 0.0025, 0.001)
    for v_ in pk.data.vertices: v_.co.x -= 0.075
    pk.location.z = h(-0.1, -0.2) + 0.002; stand_xz(pk); assign(pk, M); parent(pk, root)
    hg = hanger(kind, (0, 0, 0.015)); parent(hg, root)
    return root


def hang_jacket(color=(0.3, 0.29, 0.27), tex='poly_wool_herringbone', scale=6.0, seed=4, loc=(0, 0, 0), rot=0.0, shirt_col=(0.9, 0.9, 0.88), tie=(0.35, 0.03, 0.05),
                kind='wood', btn=(0.03, 0.025, 0.02)):
    """veste de costume suspendue : revers crantés, chemise et cravate dans l'encolure, boutons, rabats de poches"""
    root = empty('veste_suspendue', loc, (0, 0, rot))
    g = drape_piece('veste', hang_jacket_outline(), 0.06, seed=seed, famp=0.012); M = M_fabric_scan(tex, color, scale, sheen=0.1)
    assign(g, M); parent(g, root)
    fy = front_y(g); h = hz(fy, 0.0008)
    # chemise et cravate visibles dans le V
    sv = extrude2d('chemise', [(-0.1, 0.01), (0.1, 0.01), (0.0, -0.33)], 0.003, 0.0); sv.location.z = h(0.0, -0.1) + 0.001; stand_xz(sv)
    assign(sv, M_fabric_scan('stretch_poplin', shirt_col, 10.0, sheen=0.1)); parent(sv, root)
    if tie is not None:
        tk = extrude2d('cravate', [(-0.02, -0.04), (0.02, -0.04), (0.035, -0.3), (0.0, -0.33), (-0.035, -0.3)], 0.006, 0.002); tk.location.z = h(0.0, -0.15) + 0.004
        stand_xz(tk); assign(tk, M_satin(tie)); parent(tk, root)
        kn = sphere('noeud', 0.018, (0.0, 0, -0.03), (1.0, 0.7, 1.1), 16, 8); kn.location = (0.0, fy(0.0, -0.03) - 0.008, -0.03); assign(kn, M_satin(tie)); parent(kn, root)
    for sd in (-1, 1):
        lap = [(sd * 0.1, 0.012), (sd * 0.13, -0.03), (sd * 0.165, -0.06), (sd * 0.12, -0.075), (sd * 0.14, -0.15), (sd * 0.03, -0.36), (sd * 0.01, -0.34), (sd * 0.06, -0.08)]
        lp = extrude2d('revers', lap, 0.006, 0.002); lp.location.z = h(sd * 0.09, -0.15) + 0.005; stand_xz(lp); assign(lp, M); parent(lp, root)
        flap = extrude2d('rabat', [(sd * 0.07, -0.53), (sd * 0.21, -0.525), (sd * 0.21, -0.565), (sd * 0.07, -0.57)], 0.004, 0.0015)
        flap.location.z = h(sd * 0.14, -0.55) + 0.003; stand_xz(flap); assign(flap, M); parent(flap, root)
    for z in (-0.4, -0.5):
        b = button((0.0, z, h(0.0, z) + 0.004), 0.009, btn); stand_xz(b); parent(b, root)
    wl = extrude2d('poche_poitrine', [(-0.2, -0.22), (-0.09, -0.21), (-0.09, -0.228), (-0.2, -0.238)], 0.003, 0.001); wl.location.z = h(-0.15, -0.22) + 0.002
    stand_xz(wl); assign(wl, M); parent(wl, root)
    hg = hanger(kind, (0, 0, 0.018)); parent(hg, root)
    return root


def hang_dress_outline(long=True):
    """robe suspendue (plan x-z, haut du bustier vers z = -0,13) : bustier, taille, hanches, jupe évasée (longue ou au genou)"""
    if long:
        return [(-0.38, -1.42), (-0.19, -1.445), (0.0, -1.455), (0.19, -1.445), (0.38, -1.42), (0.23, -0.95), (0.175, -0.62), (0.13, -0.43), (0.14, -0.3),
                (0.15, -0.13), (0.08, -0.14), (0.0, -0.19), (-0.08, -0.14), (-0.15, -0.13), (-0.14, -0.3), (-0.13, -0.43), (-0.175, -0.62), (-0.23, -0.95)]
    return [(-0.27, -0.98), (0.0, -0.995), (0.27, -0.98), (0.19, -0.62), (0.13, -0.43), (0.14, -0.3), (0.15, -0.13), (0.07, -0.14), (0.0, -0.17),
            (-0.07, -0.14), (-0.15, -0.13), (-0.14, -0.3), (-0.13, -0.43), (-0.19, -0.62)]


def hang_dress(M, loc=(0, 0, 0), rot=0.0, seed=5, long=True, kind='wood'):
    """robe du soir suspendue à un cintre par de fines bretelles ; plis qui s'ouvrent vers l'ourlet"""
    root = empty('robe_suspendue', loc, (0, 0, rot))
    g = drape_piece('robe', hang_dress_outline(long), 0.05, seed=seed, nfold=14 if long else 9, famp=0.03 if long else 0.018)
    assign(g, M); parent(g, root)
    fy = front_y(g)
    for sd in (-1, 1):
        x = sd * 0.112; yf = fy(x, -0.15)
        pts = [(x, yf - 0.0005, -0.14), (x, yf * 0.7, -0.07), (x, -0.024, -0.008), (x, 0.0, 0.004), (x, 0.024, -0.008), (x, -yf * 0.7, -0.07), (x, -yf + 0.0005, -0.14)]
        st = curve_tube('bretelle', [(*p, 1.0) for p in pts], 0.0028, 16, profile_seg=3); assign(st, M); parent(st, root)
    hg = hanger(kind, (0, 0, 0.015)); parent(hg, root)
    return root


# ------------------------------------------------------------------ vêtements pliés (piles de boutique)
def folded_tee(color, tex='cotton_jersey', scale=9.0, W_=0.3, D=0.23, H_=0.032, seed=1, loc=(0, 0, 0), rot=0.0, M=None):
    """t-shirt plié : plateau rembourré aux bords arrondis, col côtelé en haut, coutures d'épaule, pli de manche"""
    root = empty('tee_plie', loc, (0, 0, rot))
    out = [(-W_ / 2, -D / 2), (W_ / 2, -D / 2), (W_ / 2, D / 2), (-W_ / 2, D / 2)]
    out = resample(out, 0.03)
    R = random.Random(seed)
    out = [(x + R.uniform(-0.002, 0.002), y + R.uniform(-0.002, 0.002)) for (x, y) in out]
    M = M or M_fabric_scan(tex, color, scale)
    b = fabric_piece('plie', out, H_, 0.022, 0.003, 0.002, seed, nfolds=6, fold_angle=0.0); assign(b, M); parent(b, root)
    z = surface_z(b)
    neck = [(0.075 * math.cos(a), D / 2 - 0.004 - 0.05 * math.sin(a)) for a in [math.pi * k / 24 for k in range(25)]]
    nb = band('col', neck, lambda x, y: z(x, y) + 0.0005, 0.016, 0.0022, M_rib(color)); parent(nb, root)
    th = tuple(min(1.0, c * 0.75 + 0.05) for c in color)
    for sd in (-1, 1):
        st = stitches('epaule', resample([(sd * 0.075, D / 2 - 0.004), (sd * (W_ / 2 - 0.012), D / 2 - 0.022)], 0.003, False), z, th); parent(st, root)
        cr = stitches('pli', resample([(sd * (W_ / 2 - 0.035), D / 2 - 0.03), (sd * (W_ / 2 - 0.035), -D / 2 + 0.01)], 0.003, False), z, tuple(c * 0.6 for c in color), 0.0009); parent(cr, root)
    return root


def folded_jeans(M=None, W_=0.33, D=0.22, H_=0.04, seed=2, loc=(0, 0, 0), rot=0.0):
    """jean plié : ceinture et passants sur le bord, poche arrière surpiquée, couture latérale"""
    root = empty('jean_plie', loc, (0, 0, rot))
    out = resample([(-W_ / 2, -D / 2), (W_ / 2, -D / 2), (W_ / 2, D / 2), (-W_ / 2, D / 2)], 0.03)
    M = M or M_fabric_scan('denim_fabric_04', None, 7.0, sat=1.0)
    b = fabric_piece('plie', out, H_, 0.024, 0.003, 0.002, seed, nfolds=6); assign(b, M); parent(b, root)
    z = surface_z(b)
    wb = band('ceinture', resample([(-W_ / 2 + 0.005, D / 2 - 0.018), (W_ / 2 - 0.005, D / 2 - 0.018)], 0.004, False), lambda x, y: z(x, y) + 0.0004, 0.036, 0.0035, M); parent(wb, root)
    gold = (0.85, 0.55, 0.18)
    for x in (-0.11, -0.03, 0.06, 0.13):
        lp = band('passant', [(x, D / 2 - 0.002), (x, D / 2 - 0.036)], lambda xx, yy: z(xx, yy) + 0.004, 0.01, 0.0025, M); parent(lp, root)
    pk = [(-0.09, 0.03), (0.0, 0.03), (0.002, -0.05), (-0.045, -0.07), (-0.092, -0.05)]
    st = stitches('poche', resample(pk, 0.003, True), z, gold, 0.0007, closed=True); parent(st, root)
    st2 = stitches('poche2', resample([(x * 0.9 - 0.004, y * 0.9) for (x, y) in pk], 0.003, True), z, gold, 0.0007, closed=True); parent(st2, root)
    st3 = stitches('cote', resample([(W_ / 2 - 0.02, D / 2 - 0.04), (W_ / 2 - 0.02, -D / 2 + 0.01)], 0.003, False), z, gold, 0.0007); parent(st3, root)
    bt = button((-W_ / 2 + 0.03, D / 2 - 0.018, z(-W_ / 2 + 0.03, D / 2 - 0.018) + 0.004), 0.008); assign(bt, M_chrome(0.25, (0.7, 0.66, 0.58))); parent(bt, root)
    return root
