# Leonidakit — mise en dessin des scènes (v7.77) : une scène construite par les registres (formes réelles des objets)
# devient une illustration « rétro Rockstar » : aplats ombrés à trois tons (cel shading), reflets nets, ombres portées dures,
# encrage des contours, fond aux couleurs du site (dégradé, lignes de balayage, soleil rayé).
# 1) prepare(fam) : supports (sol, table, mur, cyclo) changés en « attrape-ombres », lumières et décor retirés, matières
#    converties en matières « toon » nœud par nœud, éclairage de dessin (clé, cœur de lumière, contre-jour).
# 2) render_toon(path, fam) : rendu couleur (fond transparent) + deux passes à 2× (normales, profondeur et identifiants)
#    pour l'encrage ; composition finale par compose() (numpy, OpenCV).
import bpy, math, os
from mathutils import Vector, Matrix
from .core import *

INK = (0x1A / 255, 0x1A / 255, 0x1E / 255)
AMB = 0.34          # ton d'ombre : part de la couleur propre gardée hors de la lumière
KEY_SIZE = 0.86     # angle éclairé par la clé (0..1 → 0..90°)
CORE_SIZE = 0.42    # cœur de lumière (troisième ton)

# fonds par famille : (haut, bas, soleil) en sRGB 0..255, d'après la charte (corail, ambre, nuit de Vice City)
FONDS = {
    'consommables': ((232, 69, 44), (245, 165, 36), (253, 214, 120)),
    'coiffures': ((43, 27, 77), (142, 47, 76), (247, 182, 69)),
    'tatouages': ((36, 23, 64), (90, 35, 88), (232, 69, 44)),
    'tenues': ((90, 35, 88), (232, 69, 44), (253, 214, 120)),
    'perso-vehicules': ((217, 63, 42), (245, 165, 36), (253, 225, 150)),
    'perso-armes': ((40, 38, 52), (98, 92, 118), (232, 69, 44)),
}

SUPPORT_NAMES = ('sol', 'surface', 'etabli', 'etagere', 'plan_travail', 'present', 'cyclo', 'fond', 'mur', 'comptoir', 'tapis', 'plateau', 'parquet', 'carrelage', 'route', 'trottoir',
                 'beton', 'asphalte', 'cible', 'panneau_perfore', 'pegboard', 'decor', 'plafond', 'paroi', 'sol_atelier', 'table')
HIDE_NAMES = ('bokeh', 'flou', 'lueur_fond')


def _srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


# éléments dont le sol reste dessiné (flaques de lumière des néons, faisceaux des phares, tache de la lampe, point du laser)
KEEP_FLOOR = {'neons-couleur', 'neons-disposition', 'phares-couleur', 'phares-xenon'}


def _is_support(o):
    if o.type != 'MESH' or o.parent is not None: return False
    n = o.name.split('.')[0].lower()
    d = o.dimensions
    big_flat = d.z < 0.08 and min(d.x, d.y) > 0.9
    big_wall = (min(d.x, d.y) < 0.12 and max(d.x, d.y) > 1.4 and d.z > 0.9)
    named = any(n == s or n.startswith(s + '_') or n.startswith(s) and len(n) <= len(s) + 3 for s in SUPPORT_NAMES)
    return big_flat or big_wall or (named and max(d.x, d.y, d.z) > 0.6)


# ---------------------------------------------------------------- matières toon
def _pdf(size, smooth):
    ang = size * math.pi / 2 + smooth * math.pi / 2
    return 0.5 / (math.pi * (1 - math.cos(min(ang, math.pi / 2 - 1e-3))))


CORE_MIX = 0.22 * _pdf(KEY_SIZE, 0.03) / _pdf(CORE_SIZE, 0.02)


def hair_rgb(m, r, tint=(1, 1, 1)):
    lum = 0.04 + 0.7 * (1 - m) ** 2.3
    rgb = (lum * (1 + 0.6 * r), lum * (0.82 - 0.22 * r), lum * (0.6 - 0.38 * r))
    return tuple(max(0.0, min(1.0, c * t)) for c, t in zip(rgb, tint))


def _src(nt, sock):
    """(socket relié, valeur) d'une entrée"""
    if sock.is_linked: return sock.links[0].from_socket, None
    v = sock.default_value
    return None, (tuple(v) if hasattr(v, '__len__') else v)


def _color_into(nt, src, val, dst):
    if src is not None: nt.links.new(src, dst)
    else: dst.default_value = val if len(val) == 4 else (*val, 1)


def _scaled(nt, src, val, k):
    """couleur × k (socket ou valeur)"""
    if src is None:
        return None, tuple(min(1.0, c * k) for c in val[:3]) + (1,)
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
    nt.links.new(src, mx.inputs[6]); mx.inputs[7].default_value = (k, k, k, 1)
    return mx.outputs[2], None


def _scaled3(nt, src, val, k3):
    if src is None:
        return None, tuple(min(1.0, c * k) for c, k in zip(val[:3], k3)) + (1,)
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
    nt.links.new(src, mx.inputs[6]); mx.inputs[7].default_value = (*k3, 1)
    return mx.outputs[2], None


def toon_combo(nt, col_src, col_val, rough=0.5, metal=0.0, spec_k=1.0, alpha_src=None, alpha_val=1.0, emit=None):
    """renvoie le socket shader : clé toon + cœur de lumière + ambiance (aplat) + reflet net ; métal : bandes de reflet"""
    N = nt.nodes; L = nt.links
    if metal > 0.5:
        dsrc, dval = _scaled(nt, col_src, col_val, 0.55)
        asrc, aval = _scaled(nt, col_src, col_val, 0.2)
    else:
        dsrc, dval = col_src, col_val
        asrc, aval = _scaled3(nt, col_src, col_val, (AMB * 0.92, AMB * 0.95, AMB * 1.18))
    key = N.new('ShaderNodeBsdfToon'); key.component = 'DIFFUSE'; key.inputs['Size'].default_value = KEY_SIZE; key.inputs['Smooth'].default_value = 0.03
    _color_into(nt, dsrc, dval, key.inputs['Color'])
    core_ = N.new('ShaderNodeBsdfToon'); core_.component = 'DIFFUSE'; core_.inputs['Size'].default_value = CORE_SIZE; core_.inputs['Smooth'].default_value = 0.02
    _color_into(nt, dsrc, dval, core_.inputs['Color'])
    amb = N.new('ShaderNodeEmission'); _color_into(nt, asrc, aval, amb.inputs['Color']); amb.inputs['Strength'].default_value = 1.0
    a1 = N.new('ShaderNodeAddShader'); L.new(key.outputs[0], a1.inputs[0]); L.new(amb.outputs[0], a1.inputs[1])
    cmix = N.new('ShaderNodeMixShader'); cmix.inputs[0].default_value = CORE_MIX    # le cœur de lumière éclaircit d'environ 22 %
    L.new(a1.outputs[0], cmix.inputs[1])
    a1b = N.new('ShaderNodeAddShader'); L.new(a1.outputs[0], a1b.inputs[0]); L.new(core_.outputs[0], a1b.inputs[1])
    L.new(a1b.outputs[0], cmix.inputs[2])
    out = cmix.outputs[0]
    glossy = (1 - rough) ** 2
    if metal > 0.5:
        # reflets de métal dessinés : bande sombre puis bande claire selon l'incidence
        lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
        rp = N.new('ShaderNodeValToRGB'); rp.color_ramp.interpolation = 'CONSTANT'
        e = rp.color_ramp.elements; e[0].position = 0.0; e[0].color = (0.85, 0.85, 0.85, 1); e[1].position = 0.32; e[1].color = (0.06, 0.06, 0.06, 1)
        e3 = e.new(0.62); e3.color = (0.35, 0.35, 0.35, 1)
        L.new(lw.outputs['Facing'], rp.inputs['Fac'])
        mm = N.new('ShaderNodeMix'); mm.data_type = 'RGBA'; mm.blend_type = 'MULTIPLY'; mm.inputs[0].default_value = 1.0
        L.new(rp.outputs['Color'], mm.inputs[6]); _color_into(nt, col_src, col_val, mm.inputs[7])
        ref = N.new('ShaderNodeEmission'); L.new(mm.outputs[2], ref.inputs['Color']); ref.inputs['Strength'].default_value = 0.55
        a2 = N.new('ShaderNodeAddShader'); L.new(out, a2.inputs[0]); L.new(ref.outputs[0], a2.inputs[1]); out = a2.outputs[0]
        glossy = max(glossy, 0.5)
    if glossy * spec_k > 0.1:
        sp = N.new('ShaderNodeBsdfToon'); sp.component = 'GLOSSY'
        sp.inputs['Size'].default_value = 0.03 + 0.11 * (1 - rough) ** 2; sp.inputs['Smooth'].default_value = 0.02
        k = min(1.0, glossy * spec_k * (1.6 if metal > 0.5 else 1.0))
        sp.inputs['Color'].default_value = (k, k, k, 1)
        a3 = N.new('ShaderNodeAddShader'); L.new(out, a3.inputs[0]); L.new(sp.outputs[0], a3.inputs[1]); out = a3.outputs[0]
    if emit is not None:
        esrc, eval_, ek = emit
        em = N.new('ShaderNodeEmission'); _color_into(nt, esrc, eval_, em.inputs['Color']); em.inputs['Strength'].default_value = min(ek, 1.6)   # teinte gardée (pas de blanc saturé)
        a4 = N.new('ShaderNodeAddShader'); L.new(out, a4.inputs[0]); L.new(em.outputs[0], a4.inputs[1]); out = a4.outputs[0]
    if alpha_src is not None or (alpha_val is not None and alpha_val < 0.999):
        tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader')
        if alpha_src is not None: L.new(alpha_src, mx.inputs[0])
        else: mx.inputs[0].default_value = alpha_val
        L.new(tr.outputs[0], mx.inputs[1]); L.new(out, mx.inputs[2]); out = mx.outputs[0]
    return out


def _val(sock, default=0.0):
    if sock is None: return default
    if sock.is_linked: return default
    v = sock.default_value
    return v if not hasattr(v, '__len__') else v[0]


def _flatten_ramps(nt):
    """rampes de couleur peu contrastées pilotées par du bruit (pores, marbrures de peau, grain) → couleur moyenne :
    en dessin, ces variations deviennent des taches ; les motifs francs (camouflages, rayures) sont gardés"""
    for n in list(nt.nodes):
        if n.bl_idname != 'ShaderNodeValToRGB' or not n.inputs['Fac'].is_linked: continue
        els = n.color_ramp.elements
        cols = [tuple(e.color)[:3] for e in els]
        if len(cols) < 2: continue
        spread = max(max(abs(a[i] - b[i]) / max(0.05, (a[i] + b[i]) / 2) for i in range(3)) for a in cols for b in cols)
        if spread < 0.32:
            nt.links.remove(n.inputs['Fac'].links[0]); n.inputs['Fac'].default_value = 0.5


def convert_material(m):
    if m is None or not m.use_nodes or m.get('toon'): return
    nt = m.node_tree; N = nt.nodes; L = nt.links
    _flatten_ramps(nt)
    for node in list(N):
        t = node.bl_idname
        outs = [l.to_socket for o in node.outputs for l in o.links]
        if not outs: continue
        rep = None
        if t == 'ShaderNodeBsdfPrincipled':
            cs, cv = _src(nt, node.inputs['Base Color'])
            rough = _val(node.inputs['Roughness'], 0.78); metal = _val(node.inputs['Metallic'], 0.0)
            trans = _val(node.inputs['Transmission Weight'], 0.0)
            asrc, aval = _src(nt, node.inputs['Alpha'])
            es, ev = _src(nt, node.inputs['Emission Color']); ek = _val(node.inputs['Emission Strength'], 0.0)
            emit = (es, ev, ek) if (ek > 0 and (es is not None or max(ev[:3]) > 0)) else None
            coat = _val(node.inputs['Coat Weight'], 0.0)
            liquid = cv is not None and (max(cv[:3]) < 0.85 or (max(cv[:3]) - min(cv[:3])) > 0.18)
            if trans > 0.5 and emit is not None:          # optique allumée (phares, feux) : elle éclaire
                rep = toon_combo(nt, cs, cv, rough=0.2, emit=emit)
            elif trans > 0.5 and liquid:
                rep = toon_combo(nt, cs, cv, rough=0.2, alpha_val=0.82)
            elif trans > 0.5:
                rep = glass_combo(nt, cs, cv)
            else:
                rep = toon_combo(nt, cs, cv, rough=max(0.3, min(rough, 1 - 0.35 * coat)), metal=metal, alpha_src=asrc, alpha_val=aval if asrc is None else None, emit=emit)
        elif t in ('ShaderNodeBsdfDiffuse', 'ShaderNodeBsdfSheen', 'ShaderNodeBsdfTranslucent', 'ShaderNodeSubsurfaceScattering'):
            cs, cv = _src(nt, node.inputs['Color'])
            rep = toon_combo(nt, cs, cv, rough=1.0)
        elif t in ('ShaderNodeBsdfGlossy', 'ShaderNodeBsdfAnisotropic', 'ShaderNodeBsdfMetallic'):
            key = 'Color' if 'Color' in node.inputs else 'Base Color'
            cs, cv = _src(nt, node.inputs[key])
            rough = _val(node.inputs.get('Roughness'), 0.2)
            rep = toon_combo(nt, cs, cv, rough=rough, metal=1.0)
        elif t in ('ShaderNodeBsdfGlass', 'ShaderNodeBsdfRefraction'):
            cs, cv = _src(nt, node.inputs['Color'])
            rep = glass_combo(nt, cs, cv)
        elif t == 'ShaderNodeBsdfHairPrincipled':
            par = getattr(node, 'parametrization', 'MELANIN')
            if par == 'COLOR':
                cs, cv = _src(nt, node.inputs['Color'])
            else:
                tint = tuple(node.inputs['Tint'].default_value)[:3] if 'Tint' in node.inputs else (1, 1, 1)
                cs, cv = None, (*hair_rgb(_val(node.inputs['Melanin'], 0.8), _val(node.inputs['Melanin Redness'], 0.2), tint), 1)
            rep = toon_combo(nt, cs, cv, rough=0.45, spec_k=0.55)
        elif t == 'ShaderNodeBsdfHair':
            cs, cv = _src(nt, node.inputs['Color'])
            rep = toon_combo(nt, cs, cv, rough=0.5, spec_k=0.4)
        if rep is not None:
            for s in outs: L.new(rep, s)
    m['toon'] = 1


def glass_combo(nt, cs, cv):
    """verre dessiné : voile pâle partiellement opaque (plus dense sur les bords, effet Fresnel), éclat net ; la face
    arrière reste transparente"""
    N = nt.nodes; L = nt.links
    tr = N.new('ShaderNodeBsdfTransparent'); _color_into(nt, cs, cv if cv else (1, 1, 1, 1), tr.inputs['Color'])
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.3
    rp = N.new('ShaderNodeValToRGB'); rp.color_ramp.interpolation = 'CONSTANT'
    e = rp.color_ramp.elements; e[0].position = 0.0; e[0].color = (0.1, 0.1, 0.1, 1); e[1].position = 0.6; e[1].color = (0.5, 0.5, 0.5, 1)
    L.new(lw.outputs['Fresnel'], rp.inputs['Fac'])
    em = N.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.9, 0.94, 0.98, 1); em.inputs['Strength'].default_value = 1.0
    sp = N.new('ShaderNodeBsdfToon'); sp.component = 'GLOSSY'; sp.inputs['Size'].default_value = 0.06; sp.inputs['Smooth'].default_value = 0.02
    sp.inputs['Color'].default_value = (1, 1, 1, 1)
    face = N.new('ShaderNodeAddShader'); L.new(em.outputs[0], face.inputs[0]); L.new(sp.outputs[0], face.inputs[1])
    mx = N.new('ShaderNodeMixShader')
    sep = N.new('ShaderNodeSeparateColor'); L.new(rp.outputs['Color'], sep.inputs[0])
    L.new(sep.outputs[0], mx.inputs[0]); L.new(tr.outputs[0], mx.inputs[1]); L.new(face.outputs[0], mx.inputs[2])
    geo = N.new('ShaderNodeNewGeometry'); bk = N.new('ShaderNodeMixShader'); L.new(geo.outputs['Backfacing'], bk.inputs[0])
    tr2 = N.new('ShaderNodeBsdfTransparent'); _color_into(nt, cs, cv if cv else (1, 1, 1, 1), tr2.inputs['Color'])
    L.new(mx.outputs[0], bk.inputs[1]); L.new(tr2.outputs[0], bk.inputs[2])
    return bk.outputs[0]


# ---------------------------------------------------------------- textures scannées → aplats
_STYL = {}


def _site_texture(path):
    p = path.replace('\\', '/')
    return '/tex/' in p and '/assets/' not in p and '/ressources/' not in p


def stylize_image(img, k=5, maxs=512):
    """copie aplatie d'une texture photographique : réduite, lissée en gardant les bords, quantifiée en k couleurs"""
    import numpy as np, cv2
    if img.name in _STYL: return _STYL[img.name]
    w, h = img.size
    if w == 0 or h == 0: return img
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px)
    a = px.reshape(h, w, 4)
    rgb = np.clip(a[..., :3], 0, 1)
    sc = min(1.0, maxs / max(w, h))
    if sc < 1: rgb = cv2.resize(rgb, (max(8, int(w * sc)), max(8, int(h * sc))), interpolation=cv2.INTER_AREA)
    u8 = (rgb * 255).astype(np.uint8)
    u8 = cv2.bilateralFilter(u8, 9, 45, 9)
    Z = u8.reshape(-1, 3).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 12, 1.0)
    _, lab, cen = cv2.kmeans(Z, k, None, crit, 2, cv2.KMEANS_PP_CENTERS)
    hsv = cv2.cvtColor(cen.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.3, 0, 255); hsv[..., 2] = np.clip(hsv[..., 2] * 1.08 + 6, 0, 255)
    cen = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).reshape(-1, 3).astype(np.float32)
    q = cen[lab.flatten()].reshape(u8.shape).astype(np.uint8)
    q = cv2.medianBlur(q, 5)
    hh, ww = q.shape[:2]
    out = np.concatenate([q.astype(np.float32) / 255.0, np.ones((hh, ww, 1), np.float32)], axis=2)
    ni = bpy.data.images.new(img.name + '_aplat', ww, hh, alpha=False)
    try: ni.colorspace_settings.name = img.colorspace_settings.name
    except Exception: pass
    ni.pixels.foreach_set(out.ravel())
    ni.pack()
    _STYL[img.name] = ni
    return ni


def stylize_textures():
    _STYL.clear()
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        for n in m.node_tree.nodes:
            if n.bl_idname != 'ShaderNodeTexImage' or n.image is None: continue
            im = n.image
            if im.colorspace_settings.name in ('Non-Color', 'Raw', 'Linear Rec.709', 'Linear'): continue
            if _site_texture(im.filepath): continue
            if not any(l.to_node.bl_idname not in ('ShaderNodeNormalMap', 'ShaderNodeBump') for l in n.outputs['Color'].links): continue
            try: n.image = stylize_image(im)
            except Exception as e: print('aplat impossible', im.name, e)


# ---------------------------------------------------------------- cheveux : mèches → masses (dessin de chevelure)
def hair_masses(fam='', voxel=0.002, radius=0.0032):
    """chaque objet de cheveux (courbes) devient une masse maillée qui suit les mèches (points → volume → maillage) ;
    en dessin, les masses se lisent comme des mèches groupées au lieu d'un bruit de milliers de brins"""
    made = []
    import numpy as np
    for o in [x for x in bpy.data.objects if x.type == 'CURVES' and not x.hide_render]:
        cu = o.data; npts = len(cu.points); ncur = len(cu.curves)
        if ncur == 0: continue
        pos = np.empty(npts * 3, np.float32); cu.attributes['position'].data.foreach_get('vector', pos); pos = pos.reshape(-1, 3)
        offs = np.empty(ncur, np.int32); cu.curves.foreach_get('first_point_index', offs) if hasattr(cu.curves[0], 'first_point_index') else None
        sizes = np.empty(ncur, np.int32)
        try: cu.curves.foreach_get('points_length', sizes)
        except Exception: sizes[:] = max(1, npts // ncur)
        starts = np.concatenate([[0], np.cumsum(sizes)[:-1]]); ends = starts + sizes - 1
        k = min(ncur, 400); idx = np.linspace(0, ncur - 1, k).astype(int)
        seglen = np.array([np.linalg.norm(np.diff(pos[starts[i]:ends[i] + 1], axis=0), axis=1).sum() for i in idx])
        short = np.median(seglen) * max(o.scale) < 0.012
        if short and fam == 'tatouages':
            o.hide_render = True          # duvet : la peau et l'encre restent visibles
            continue
        vx, rd = (0.0012, 0.0016) if short else (voxel, radius)
        ng = bpy.data.node_groups.new('masse', 'GeometryNodeTree')
        ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
        ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
        N = ng.nodes; L = ng.links
        gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
        oi = N.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = o; oi.transform_space = 'RELATIVE'
        c2p = N.new('GeometryNodeCurveToPoints'); c2p.mode = 'EVALUATED'
        p2v = N.new('GeometryNodePointsToVolume'); v2m = N.new('GeometryNodeVolumeToMesh')
        try: p2v.inputs['Resolution Mode'].default_value = 'Size'
        except Exception: pass
        p2v.inputs['Voxel Size'].default_value = vx; p2v.inputs['Radius'].default_value = rd; p2v.inputs['Density'].default_value = 1.0
        L.new(oi.outputs['Geometry'], c2p.inputs['Curve']); L.new(c2p.outputs['Points'], p2v.inputs['Points'])
        L.new(p2v.outputs[0], v2m.inputs['Volume']); L.new(v2m.outputs[0], go.inputs[0])
        host = bpy.data.objects.new('masse_cheveux', bpy.data.meshes.new('vide')); bpy.context.scene.collection.objects.link(host)
        md = host.modifiers.new('masse', 'NODES'); md.node_group = ng
        dg = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(host.evaluated_get(dg))
        host.modifiers.remove(md); host.data = me
        for p in me.polygons: p.use_smooth = True
        sm = host.modifiers.new('lisse', 'SMOOTH'); sm.factor = 0.6; sm.iterations = 2
        me.materials.clear()
        for m in o.data.materials:
            if m: me.materials.append(m)
        for p in me.polygons: p.material_index = 0
        o.hide_render = True
        host.pass_index = 5
        made.append(host)
    return made


# ---------------------------------------------------------------- scène
def _sun(name, direction, strength, angle_deg=1.0):
    L = bpy.data.lights.new(name, 'SUN'); L.energy = strength; L.angle = math.radians(angle_deg)
    ob = bpy.data.objects.new(name, L); link(ob)
    ob.rotation_euler = Vector(direction).normalized().to_track_quat('-Z', 'Y').to_euler()
    return ob


def _toon_strength(size, smooth, level):
    """intensité du soleil pour qu'une surface éclairée par la clé rende sa couleur propre × level"""
    return level / _pdf(size, smooth)


def _world_bbox(o):
    from mathutils import Vector
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)), (max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))


def _underlay(o):
    """papier d'emballage, serviette, set : mince, large, posé sur le support"""
    if o.type != 'MESH': return False
    lo, hi = _world_bbox(o)
    dx, dy, dz = hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]
    return dz < 0.016 and min(dx, dy) > 0.2 and lo[2] < 0.01


FIT = {'perso-vehicules': (6.5, 4.0), 'consommables': (1.6, 2.2), 'coiffures': (1.6, 2.2), 'perso-armes': (1.8, 2.2), 'tenues': (1.8, 2.0), 'tatouages': (1.8, 1.8)}


def fit_camera(fam, supports, margin=0.075, only=None, open_bottom=False):
    """silhouettes : recule la caméra (sans changer l'angle) jusqu'à ce que tout le sujet tienne dans le cadre"""
    from bpy_extras.object_utils import world_to_camera_view
    from mathutils import Vector
    if fam not in FIT: return
    lim, fmax = FIT[fam]
    sc = bpy.context.scene; cam = sc.camera
    if cam is None: return
    sup = set(o.name for o in supports); glow = set(o.name for o in glow_objects())
    pts = []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in bpy.data.objects:
        if o.type not in ('MESH', 'CURVE', 'CURVES') or o.hide_render or o.name in sup: continue
        if only is not None and o.name.split('.')[0].lower() not in only: continue
        if o.name.split('.')[0].lower().startswith(('pied', 'tige', 'socle', 'support', 'tringle', 'crochet')): continue   # présentoirs
        lo, hi = _world_bbox(o)
        if o.name in glow and max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) > 0.5: continue        # faisceaux, rayons : ils peuvent sortir du cadre
        # caché derrière un support (mur, panneau) : ne compte pas
        ctr = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))
        dv = ctr - cam.location
        if dv.length > 1e-4:
            hit, _, _, _, hob, _ = sc.ray_cast(dg, cam.location, dv.normalized(), distance=dv.length - 1e-3)
            if hit and hob is not None and hob.original.name in sup: continue
        d = (hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])
        if max(d) > lim or max(d) < 0.004: continue
        if max(d) / max(1e-4, sorted(d)[1]) > 30: continue           # tringles, tiges, câbles
        pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    if not pts: return
    bpy.context.view_layer.update()
    f = (cam.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
    p0 = cam.location.copy()
    c = sum(pts, Vector((0, 0, 0))) / len(pts)
    d0 = max(0.05, (c - p0).dot(f))
    def fits():
        bpy.context.view_layer.update()
        for p in pts:
            v = world_to_camera_view(sc, cam, p)
            if v.z <= 0 or v.x < margin or v.x > 1 - margin or v.y > 1 - margin or (v.y < margin and not open_bottom): return False
        return True
    k = 1.0
    while not fits() and k < fmax:
        k *= 1.06; cam.location = p0 - f * d0 * (k - 1)
    cam.data.clip_end = max(cam.data.clip_end, 400)


HIDE_SIL = {'gta5-masques-vespucci': ('old_gas_mask',)}


def prepare(fam, item=None, sil=False):
    sc = bpy.context.scene
    cam = sc.camera
    # profondeur de champ coupée : un dessin est net partout
    if cam: cam.data.dof.use_dof = False
    supports = []
    subj_lights = set()
    for o in list(bpy.data.objects):
        n = o.name.split('.')[0].lower()
        if o.type == 'LIGHT':
            if o.parent is not None: subj_lights.add(o.name); continue
            bpy.data.objects.remove(o); continue
        if any(n.startswith(h) for h in HIDE_NAMES):
            o.hide_render = True; continue
        if _is_support(o):
            supports.append(o)
    if sil:
        for o in bpy.data.objects:
            if o.name.split('.')[0] in HIDE_SIL.get(item, ()) or (o.parent and o.parent.name.split('.')[0] in HIDE_SIL.get(item, ())):
                o.hide_render = True
    heads = any(o.name.split('.')[0] in ('tete', 'buste') for o in bpy.data.objects)
    if sil and not (fam == 'coiffures' and heads):
        supports += [o for o in bpy.data.objects if o not in supports and o.parent is None and _underlay(o)]
    keep_floor = item in KEEP_FLOOR
    sc['lk_floors'] = [o.name for o in supports] if keep_floor else []
    for o in supports:
        if keep_floor: continue
        o.is_shadow_catcher = True
        o.visible_glossy = False; o.visible_diffuse = False; o.visible_transmission = False
        o.visible_shadow = False          # pas d'ombre propre (les côtés d'un plateau dessinaient un trait sombre)
    if keep_floor:
        Mf = mat('sol_dessin', (0.035, 0.032, 0.05), 0.85)
        for o in supports:
            o.data.materials.clear(); o.data.materials.append(Mf)
        supports = []
    if not sil: stylize_textures()
    hair_masses(fam)
    # matières (numéro de passe unique : sert à encrer les changements de matière)
    for i, m in enumerate(list(bpy.data.materials)):
        convert_material(m)
        m.pass_index = 1 + i % 997
    # lumières du sujet (lampe, phares) : gardées mais plus fortes en dessin
    for name in subj_lights:
        L = bpy.data.objects[name].data; L.energy *= 0.22 if L.type in ('AREA', 'POINT') else 0.5
    # éclairage de dessin, orienté par rapport à la caméra : clé en haut à gauche devant, contre-jour à droite derrière
    if cam:
        R = cam.matrix_world.to_3x3()
        fwd = R @ Vector((0, 0, -1)); right = R @ Vector((1, 0, 0)); up = Vector((0, 0, 1))
        key_dir = (fwd * 0.55 + right * 0.55 - up * 0.75)          # la lumière va vers l'avant-droite et le bas
        rim_dir = (-fwd * 0.9 - right * 0.45 - up * 0.35)
    else:
        key_dir = Vector((0.5, 0.6, -0.7)); rim_dir = Vector((-0.6, -0.8, -0.3))
    s_key = _toon_strength(KEY_SIZE, 0.03, 1.0 - AMB)      # éclairé = couleur propre (ambiance comprise)
    k = _sun('cle_dessin', key_dir, s_key, 1.2)
    r = _sun('contre_dessin', rim_dir, s_key * 0.32, 1.0)
    # monde noir : seules les lumières de dessin et les aplats d'ambiance comptent
    world_color((0.0, 0.0, 0.0), 0.0)
    cy = sc.cycles
    cy.max_bounces = 4; cy.diffuse_bounces = 0; cy.glossy_bounces = 1; cy.transmission_bounces = 4; cy.transparent_max_bounces = 12
    cy.volume_bounces = 0
    cy.use_adaptive_sampling = False
    sc.render.film_transparent = True
    vs = sc.view_settings; vs.view_transform = 'Standard'; vs.look = 'None'; vs.exposure = 0.0
    sc.render.image_settings.color_mode = 'RGBA'
    if sil and not (fam == 'coiffures' and heads):
        fit_camera(fam, supports + [bpy.data.objects[n] for n in sc.get('lk_floors', []) if n in bpy.data.objects])
    elif sil:
        # têtes coiffées : toute la coupe dans le cadre (le cou peut sortir par le bas)
        fit_camera(fam, supports, 0.05, only=('tete', 'masse_cheveux', 'oreille', 'barbe', 'moustache'), open_bottom=True)
    return supports


def _emissive(m):
    """matière qui éclaire (néon, faisceau, écran, voyant) : émission forte ou seule"""
    if m is None or not m.use_nodes: return False
    N = m.node_tree.nodes
    out = [n for n in N if n.bl_idname == 'ShaderNodeOutputMaterial' and n.is_active_output] or [n for n in N if n.bl_idname == 'ShaderNodeOutputMaterial']
    if not out or not out[0].inputs['Surface'].is_linked: return False
    seen, stack, has_bsdf, emit = set(), [out[0].inputs['Surface'].links[0].from_node], False, 0.0
    while stack:
        n = stack.pop()
        if n.name in seen: continue
        seen.add(n.name)
        t = n.bl_idname
        if t == 'ShaderNodeEmission':
            st = n.inputs['Strength']; emit = max(emit, 99.0 if st.is_linked else st.default_value)
        elif t == 'ShaderNodeBsdfPrincipled':
            st = n.inputs['Emission Strength']
            if (st.is_linked or st.default_value > 1.0) and (n.inputs['Emission Color'].is_linked or max(tuple(n.inputs['Emission Color'].default_value)[:3]) > 0.05):
                emit = max(emit, 99.0 if st.is_linked else st.default_value)
            has_bsdf = True
        elif t.startswith('ShaderNodeBsdf') and t not in ('ShaderNodeBsdfTransparent',):
            has_bsdf = True
        for i in n.inputs:
            for l in i.links: stack.append(l.from_node)
    return emit > 1.5 or (emit > 0.3 and not has_bsdf)


def glow_objects():
    """objets dont toutes les matières éclairent : ils ne font pas partie de la silhouette, leur lumière la traverse"""
    res = []
    for o in bpy.data.objects:
        if o.type not in ('MESH', 'CURVE') or o.hide_render: continue
        ms = [m for m in o.data.materials if m]
        if ms and all(_emissive(m) for m in ms): res.append(o)
    return res


# ---------------------------------------------------------------- passes d'encrage
def _pass_material(kind, dmax):
    m = bpy.data.materials.new('passe_' + kind); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    for n_ in list(N): N.remove(n_)
    em = N.new('ShaderNodeEmission'); out = N.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs[0])
    if kind == 'normale':
        geo = N.new('ShaderNodeNewGeometry')
        vt = N.new('ShaderNodeVectorTransform'); vt.vector_type = 'NORMAL'; vt.convert_from = 'WORLD'; vt.convert_to = 'CAMERA'
        L.new(geo.outputs['Normal'], vt.inputs[0])
        mad = N.new('ShaderNodeVectorMath'); mad.operation = 'MULTIPLY_ADD'
        mad.inputs[1].default_value = (0.5, 0.5, 0.5); mad.inputs[2].default_value = (0.5, 0.5, 0.5)
        L.new(vt.outputs[0], mad.inputs[0]); L.new(mad.outputs[0], em.inputs['Color'])
    else:
        cd = N.new('ShaderNodeCameraData'); oi = N.new('ShaderNodeObjectInfo')
        d = N.new('ShaderNodeMath'); d.operation = 'DIVIDE'; L.new(cd.outputs['View Z Depth'], d.inputs[0]); d.inputs[1].default_value = dmax
        mi = N.new('ShaderNodeMath'); mi.operation = 'MULTIPLY'; L.new(oi.outputs['Material Index'], mi.inputs[0]); mi.inputs[1].default_value = 0.0713
        fr = N.new('ShaderNodeMath'); fr.operation = 'FRACT'; L.new(mi.outputs[0], fr.inputs[0])
        g = N.new('ShaderNodeMath'); g.operation = 'ADD'; L.new(oi.outputs['Random'], g.inputs[0]); L.new(fr.outputs[0], g.inputs[1])
        g2 = N.new('ShaderNodeMath'); g2.operation = 'FRACT'; L.new(g.outputs[0], g2.inputs[0])
        b = N.new('ShaderNodeMath'); b.operation = 'MULTIPLY'; L.new(oi.outputs['Object Index'], b.inputs[0]); b.inputs[1].default_value = 0.1
        cc = N.new('ShaderNodeCombineXYZ'); L.new(d.outputs[0], cc.inputs[0]); L.new(g2.outputs[0], cc.inputs[1]); L.new(b.outputs[0], cc.inputs[2])
        L.new(cc.outputs[0], em.inputs['Color'])
    return m


def render_toon(path, fam, supports):
    """écrit <path> (illustration finie) ; fichiers intermédiaires à côté (-couleur, -normale, -id)"""
    sc = bpy.context.scene; cy = sc.cycles
    base = path[:-4]
    # 1) couleur
    sc.render.filepath = base + '-couleur.png'
    sc.render.image_settings.color_depth = '16'
    bpy.ops.render.render(write_still=True)
    # 2) passes à 2× sans anticrénelage
    keep = (sc.render.resolution_percentage, cy.samples, sc.render.filter_size, cy.use_denoising, sc.view_settings.view_transform)
    sc.render.resolution_percentage = keep[0] * 2
    cy.samples = 1; sc.render.filter_size = 0.01; cy.use_denoising = False
    sc.view_settings.view_transform = 'Raw'
    vols = []
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.hide_render: continue
        for m in o.data.materials:
            if m and m.use_nodes and any(n.bl_idname == 'ShaderNodeOutputMaterial' and n.inputs['Volume'].is_linked for n in m.node_tree.nodes):
                vols.append(o); o.hide_render = True; break
    hair = [o for o in bpy.data.objects if o.type == 'CURVES' or o.name.split('.')[0].lower() in ('cheveux', 'barbe', 'meche', 'moustache', 'sourcils', 'poils', 'masse_cheveux')]
    for o in bpy.data.objects: o.pass_index = 0
    for o in hair: o.pass_index = 5
    for o in supports: o.pass_index = 9
    for n in sc.get('lk_floors', []):
        if n in bpy.data.objects: bpy.data.objects[n].pass_index = 9
    for o in glow_objects(): o.pass_index = 8
    cam = sc.camera
    dmax = 3.0 * max(1.0, (cam.location.length if cam else 3.0))
    vl = sc.view_layers[0]
    for kind in ('normale', 'id'):
        vl.material_override = _pass_material(kind, dmax)
        sc.render.filepath = base + '-' + kind + '.png'
        bpy.ops.render.render(write_still=True)
    vl.material_override = None
    for o in vols: o.hide_render = False
    sc.render.resolution_percentage, cy.samples, sc.render.filter_size, cy.use_denoising, sc.view_settings.view_transform = keep
    compose(base, path, fam)


def _passes(base, supports):
    """passes d'encrage seules (normales ; profondeur, identifiants), à 2×, sans anticrénelage"""
    sc = bpy.context.scene; cy = sc.cycles
    keep = (sc.render.resolution_percentage, cy.samples, sc.render.filter_size, cy.use_denoising, sc.view_settings.view_transform)
    sc.render.resolution_percentage = keep[0] * 2
    cy.samples = 1; sc.render.filter_size = 0.01; cy.use_denoising = False
    sc.view_settings.view_transform = 'Raw'
    vols = []
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.hide_render: continue
        for m in o.data.materials:
            if m and m.use_nodes and any(n.bl_idname == 'ShaderNodeOutputMaterial' and n.inputs['Volume'].is_linked for n in m.node_tree.nodes):
                vols.append(o); o.hide_render = True; break
    hair = [o for o in bpy.data.objects if o.type == 'CURVES' or o.name.split('.')[0].lower() in ('cheveux', 'barbe', 'meche', 'moustache', 'sourcils', 'poils', 'masse_cheveux')]
    for o in bpy.data.objects: o.pass_index = 0
    for o in hair: o.pass_index = 5
    for o in supports: o.pass_index = 9
    for n in sc.get('lk_floors', []):
        if n in bpy.data.objects: bpy.data.objects[n].pass_index = 9
    for o in glow_objects(): o.pass_index = 8
    cam = sc.camera
    dmax = 3.0 * max(1.0, (cam.location.length if cam else 3.0))
    vl = sc.view_layers[0]
    for kind in ('normale', 'id'):
        vl.material_override = _pass_material(kind, dmax)
        sc.render.filepath = base + '-' + kind + '.png'
        bpy.ops.render.render(write_still=True)
    vl.material_override = None
    for o in vols: o.hide_render = False
    sc.render.resolution_percentage, cy.samples, sc.render.filter_size, cy.use_denoising, sc.view_settings.view_transform = keep


def render_decal_pass(path):
    """passe des motifs tatoués : blanc là où une décalcomanie « tat-… » couvre la peau, noir ailleurs"""
    sc = bpy.context.scene
    found = False
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        nt = m.node_tree; N = nt.nodes; L = nt.links
        outs = [n for n in N if n.bl_idname == 'ShaderNodeOutputMaterial']
        if not outs: continue
        decs = [n for n in N if n.bl_idname == 'ShaderNodeTexImage' and n.image and 'tat-' in os.path.basename(n.image.filepath or n.image.name)]
        em = N.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
        if decs:
            found = True
            acc = decs[0].outputs['Alpha']
            for d in decs[1:]:
                mx = N.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; L.new(acc, mx.inputs[0]); L.new(d.outputs['Alpha'], mx.inputs[1]); acc = mx.outputs[0]
            L.new(acc, em.inputs['Color'])
        else:
            em.inputs['Color'].default_value = (0, 0, 0, 1)
        for o in outs:
            L.new(em.outputs[0], o.inputs['Surface'])
            if o.inputs['Volume'].is_linked: L.remove(o.inputs['Volume'].links[0])
    if not found: return False
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return True


def render_glow_pass(path):
    """passe des lumières : blanc sur les matières qui éclairent (néons, phares, écrans, voyants), noir ailleurs"""
    sc = bpy.context.scene
    used = set()
    for o in bpy.data.objects:
        if o.type in ('MESH', 'CURVE') and not o.hide_render:
            for m in o.data.materials:
                if m: used.add(m.name)
    glow = [m for m in bpy.data.materials if m.name in used and _emissive(m)]
    if not glow: return False
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        nt = m.node_tree; N = nt.nodes; L = nt.links
        outs = [n for n in N if n.bl_idname == 'ShaderNodeOutputMaterial']
        if not outs: continue
        em = N.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
        em.inputs['Color'].default_value = (1, 1, 1, 1) if m in glow else (0, 0, 0, 1)
        for o in outs:
            L.new(em.outputs[0], o.inputs['Surface'])
            if o.inputs['Volume'].is_linked: L.remove(o.inputs['Volume'].links[0])
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return True


def render_sil(path, fam, supports, samples=6):
    """silhouette : couleur (alpha, ombres, teintes, lumières) à peu d'échantillons, passes d'encrage, puis composition"""
    sc = bpy.context.scene
    sc.cycles.samples = samples
    sc.render.use_persistent_data = True
    base = path[:-4]
    sc.render.filepath = base + '-couleur.png'
    sc.render.image_settings.color_depth = '16'
    bpy.ops.render.render(write_still=True)
    _passes(base, supports)
    cy = sc.cycles; cy.samples = 4; cy.use_denoising = False
    sc.view_settings.view_transform = 'Raw'
    if os.path.exists(base + '-lumiere.png'): os.remove(base + '-lumiere.png')
    render_glow_pass(base + '-lumiere.png')
    if fam == 'tatouages':
        render_decal_pass(base + '-motif.png')
    compose_silhouette(base, path, fam)


# ---------------------------------------------------------------- composition (hors Blender)
def background(w, h, fam, cx=0.5, cy=0.46):
    import numpy as np
    top, bot, sun = FONDS.get(fam, FONDS['consommables'])
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    g = (np.array(top, np.float32) * (1 - t) + np.array(bot, np.float32) * t) / 255.0
    g = np.repeat(g, w, axis=1)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    # soleil rayé (motif rétro), discret, derrière le sujet
    R = 0.34 * h; sx, sy = cx * w, cy * h
    d = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2)
    disk = np.clip((R - d) / 1.5, 0, 1)
    rel = (yy - (sy - R)) / (2 * R)                      # 0 en haut du disque, 1 en bas
    stripes = np.ones_like(rel)
    for k in range(6):
        y0 = 0.52 + k * 0.08; th = 0.012 + k * 0.007
        stripes *= 1 - np.clip(1 - np.abs(rel - y0) / th, 0, 1) * (rel > 0.5)
    sun_col = np.array(sun, np.float32) / 255.0
    sun_grad = sun_col[None, None, :] * (1 - 0.35 * np.clip(rel, 0, 1)[..., None])
    a = (disk * stripes * 0.33)[..., None]
    g = g * (1 - a) + sun_grad * a
    # lignes de balayage horizontales (comme les cartes des véhicules et des armes)
    scan = ((yy.astype(int) % 4) == 0).astype(np.float32)[..., None]
    g = g * (1 - 0.06 * scan)
    return g


def compose(base, dst, fam):
    import numpy as np, cv2
    col = cv2.imread(base + '-couleur.png', cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535.0     # BGRA 16 bits
    col = col[..., [2, 1, 0, 3]]
    h, w = col.shape[:2]
    rgb, alpha = col[..., :3], col[..., 3:4]
    nrm = cv2.imread(base + '-normale.png', cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535.0
    ids = cv2.imread(base + '-id.png', cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535.0
    nrm_a = nrm[..., 3] if nrm.shape[2] == 4 else np.ones(nrm.shape[:2], np.float32)
    # supports (sol, table, mur) : présents dans les passes pour cacher ce qu'ils couvrent, mais jamais encrés
    sup2 = (ids[..., 3] > 0.5 if ids.shape[2] == 4 else np.ones(ids.shape[:2], bool)) & (ids[..., 0] > 0.7)
    nrm_a = nrm_a * (~sup2)
    nrm = cv2.GaussianBlur(nrm[..., [2, 1, 0]], (5, 5), 1.2) * 2 - 1
    nrm = nrm / np.maximum(1e-6, np.linalg.norm(nrm, axis=2, keepdims=True))
    ida = ids[..., 3] if ids.shape[2] == 4 else nrm_a
    # verre, glace, liquides : la transparence échantillonnée laisse des grains (alpha bruité) ; dans la silhouette des objets
    # (couverture des passes d'encrage), les zones transparentes sont lissées par convolution normalisée
    covf = cv2.resize(nrm_a, (w, h), interpolation=cv2.INTER_AREA)
    tz = ((covf > 0.5) & (alpha[..., 0] < 0.97)).astype(np.uint8)
    if tz.any():
        tz = cv2.morphologyEx(tz, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
        tz = cv2.dilate(tz, np.ones((3, 3), np.uint8)).astype(np.float32) * (covf > 0.5)
        pm = rgb * alpha
        den = cv2.GaussianBlur(tz, (0, 0), 3.0)[..., None]
        pm_s = cv2.GaussianBlur(pm * tz[..., None], (0, 0), 3.0) / np.maximum(den, 1e-4)
        a_s = cv2.GaussianBlur(alpha[..., 0] * tz, (0, 0), 3.0)[..., None] / np.maximum(den, 1e-4)
        k = tz[..., None]
        pm = pm * (1 - k) + pm_s * k; alpha = np.clip(alpha * (1 - k) + a_s * k, 0, 1)
        rgb = np.where(alpha > 1e-3, pm / np.maximum(alpha, 1e-3), 0)
    dep, oid, hairf = ids[..., 2], ids[..., 1], ids[..., 0]
    H2, W2 = nrm.shape[:2]
    # --- arêtes (à 2×) : contour extérieur, occlusions, plis, changements d'objet ou de matière
    cov = cv2.morphologyEx((nrm_a > 0.5).astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))) > 0
    def diff(a, axis):
        return np.abs(np.diff(a, axis=axis, append=np.take(a, [-1], axis=axis)))
    sil = np.zeros((H2, W2), bool); inner = np.zeros((H2, W2), bool)
    for ax in (0, 1):
        c2 = np.roll(cov, -1, axis=ax)
        sil |= cov != c2
        both = cov & c2
        d1 = dep; d2 = np.roll(dep, -1, axis=ax)
        occ = np.abs(d1 - d2) > np.maximum(0.0035, 0.025 * np.minimum(d1, d2))
        n2 = np.roll(nrm, -1, axis=ax)
        crease = (nrm * n2).sum(axis=2) < math.cos(math.radians(46))
        o2 = np.roll(oid, -1, axis=ax)
        idc = np.abs(oid - o2) > 1e-3
        h2 = np.roll(hairf, -1, axis=ax)
        hair_any = ((hairf > 0.25) & (hairf < 0.7)) | ((h2 > 0.25) & (h2 < 0.7))
        occ_h = np.abs(d1 - d2) > np.maximum(0.006, 0.05 * np.minimum(d1, d2))
        inner |= both & ((occ & ~hair_any) | (crease & ~hair_any) | (idc & ~hair_any) | (occ_h & hair_any))
    # fragments d'arêtes intérieures trop courts (bruit de surface) supprimés
    nlab, lab, st, _ = cv2.connectedComponentsWithStats(inner.astype(np.uint8), connectivity=8)
    keep = np.zeros(nlab, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= 40
    inner = keep[lab]
    sil = cv2.dilate(sil.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    inner = cv2.dilate(inner.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    ink2 = np.maximum(sil * 1.0, inner * 0.85).astype(np.float32)
    ink = cv2.resize(ink2, (w, h), interpolation=cv2.INTER_AREA)
    # --- aplats : lissage qui garde les bords, puis réduction des couleurs (sérigraphie)
    rgb8 = (np.clip(rgb, 0, 1) * 255).astype(np.uint8)
    sm = cv2.medianBlur(rgb8, 5)
    sm = cv2.bilateralFilter(sm, 9, 40, 7)
    # réduction des couleurs en Lab : la clarté seule est découpée en paliers (la teinte reste juste, même dans les noirs)
    lab = cv2.cvtColor(sm.astype(np.float32) / 255.0, cv2.COLOR_RGB2Lab)
    lab[..., 0] = np.round(lab[..., 0] / 6.0) * 6.0
    rgbq = np.clip(cv2.cvtColor(lab, cv2.COLOR_Lab2RGB), 0, 1)
    # trame de points (rétro) dans les tons sombres du sujet
    lum = rgbq.mean(axis=2)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cell = 5.0
    u = (xx + yy) / cell; v = (xx - yy) / cell
    dist = np.sqrt((u - np.round(u)) ** 2 + (v - np.round(v)) ** 2)
    dot_r = np.clip((0.34 - lum) / 0.2, 0, 1) * np.clip((lum - 0.06) / 0.08, 0, 1) * 0.38
    dots = (dist < dot_r).astype(np.float32) * (alpha[..., 0] > 0.99)
    rgbq = rgbq * (1 - 0.12 * dots[..., None])
    # couleurs un peu plus franches (illustration)
    hsv = cv2.cvtColor((rgbq * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    boost = 1 + 0.12 * np.clip((hsv[..., 2] - 50) / 60, 0, 1)
    hsv[..., 1] = np.clip(hsv[..., 1] * boost, 0, 255)
    rgbq = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255.0
    # --- fond, sujet (et ombres portées de l'attrape-ombres), encre
    bg = background(w, h, fam)
    out = bg * (1 - alpha) + rgbq * alpha
    out = out * (1 - ink[..., None] * 0.92) + np.array(INK, np.float32)[None, None, :] * ink[..., None] * 0.92
    cv2.imwrite(dst, (np.clip(out, 0, 1)[..., ::-1] * 255 + 0.5).astype(np.uint8))


# ---------------------------------------------------------------- silhouettes « teaser » (v7.77, demande de Téva du 09/10, 14 h 14)
# L'objet reste caché : silhouette noire (comme les schémas des véhicules et des armes du site), liseré de lumière teinté de
# la couleur propre de l'objet (on devine sa teinte), ses lumières (néons, phares, faisceaux, écrans) qui percent, quelques
# traits de forme très discrets, ombre portée ; fond aux couleurs du site, soleil rétro derrière.
RIMS = {
    'consommables': ((255, 238, 196), (255, 120, 84)),
    'coiffures': ((247, 182, 69), (96, 214, 232)),
    'tatouages': ((247, 182, 69), (96, 214, 232)),
    'tenues': ((253, 214, 120), (96, 214, 232)),
    'perso-vehicules': ((255, 236, 180), (255, 110, 70)),
    'perso-armes': ((247, 182, 69), (232, 69, 44)),
}
HL = (0xFD / 255, 0xFB / 255, 0xF7 / 255)


def _smooth(x, a, b):
    import numpy as np
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def silhouette_layers(base, fam):
    """lit les passes et renvoie (w, h, couverture, liseré, traits, verre, lumières, ombre, couleur du liseré) à 1×"""
    import numpy as np, cv2
    col = cv2.imread(base + '-couleur.png', cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535.0
    col = col[..., [2, 1, 0, 3]]
    h, w = col.shape[:2]
    rgb, alpha = col[..., :3], col[..., 3]
    nrm = cv2.imread(base + '-normale.png', cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535.0
    ids = cv2.imread(base + '-id.png', cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535.0
    na = nrm[..., 3]; ia = ids[..., 3] if ids.shape[2] == 4 else na
    B = ids[..., 0]; dep = ids[..., 2]; oid = ids[..., 1]
    sup2 = (ia > 0.5) & (B > 0.85)
    glow2 = (ia > 0.5) & (B > 0.75) & (B <= 0.85)
    hair2 = (ia > 0.5) & (B > 0.25) & (B < 0.7)
    cov2 = ((na > 0.5) & ~sup2 & ~glow2).astype(np.uint8)
    cov2 = cv2.morphologyEx(cov2, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    nl, lab, st, _ = cv2.connectedComponentsWithStats(cov2, connectivity=8)
    keep = np.zeros(nl, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= 60
    cov2 = keep[lab]
    H2, W2 = cov2.shape
    n = cv2.GaussianBlur(nrm[..., [2, 1, 0]], (5, 5), 1.0) * 2 - 1
    n = n / np.maximum(1e-6, np.linalg.norm(n, axis=2, keepdims=True))
    # liseré : bande près du contour, éclairée par le contre-jour (en haut, côté du soleil) et par un second néon (en bas à droite)
    dist = cv2.distanceTransform(cov2.astype(np.uint8), cv2.DIST_L2, 5)
    band = _smooth(9.0 - dist, 0.0, 4.0)
    L1 = np.array([-0.45, 0.8, -0.4], np.float32); L1 /= np.linalg.norm(L1)
    L2 = np.array([0.8, -0.25, -0.5], np.float32); L2 /= np.linalg.norm(L2)
    r1 = _smooth((n * L1).sum(axis=2), 0.05, 0.4) * band
    r2 = _smooth((n * L2).sum(axis=2), 0.15, 0.5) * band * 0.75
    edge_all = _smooth(3.0 - dist, 0.0, 2.0) * 0.25          # trait de lumière très fin sur tout le contour
    rim2 = np.clip(np.maximum(r1, edge_all), 0, 1) * cov2
    rim2b = np.clip(r2, 0, 1) * cov2
    # traits de forme (plis, arêtes, changements d'objet), très discrets
    lines2 = np.zeros((H2, W2), bool)
    for ax in (0, 1):
        c2 = np.roll(cov2, -1, axis=ax); both = cov2 & c2
        d2 = np.roll(dep, -1, axis=ax)
        occ = np.abs(dep - d2) > np.maximum(0.0035, 0.025 * np.minimum(dep, d2))
        crease = (n * np.roll(n, -1, axis=ax)).sum(axis=2) < math.cos(math.radians(46))
        idc = np.abs(oid - np.roll(oid, -1, axis=ax)) > 1e-3
        hb = hair2 | np.roll(hair2, -1, axis=ax)
        lines2 |= both & ~hb & (occ | crease | idc)
    nl, lab, st, _ = cv2.connectedComponentsWithStats(lines2.astype(np.uint8), connectivity=8)
    keep = np.zeros(nl, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= 40
    lines2 = keep[lab] & (dist > 3)
    lines2 = cv2.dilate(lines2.astype(np.uint8), np.ones((2, 2), np.uint8)).astype(np.float32)
    down = lambda a: cv2.resize(a.astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
    cov = down(cov2); rim = down(rim2); rimb = down(rim2b); lines = down(lines2)
    sup = down(sup2); glow = down(glow2)
    # verre dans la silhouette (vitres, flacons) : un peu plus clair, comme les vitrages des schémas du site
    glass = np.clip((0.9 - alpha) / 0.5, 0, 1) * (cov > 0.5)
    # couleur propre de l'objet au bord (teinte du liseré) : moyenne locale, saturée, éclaircie
    rgb_s = cv2.GaussianBlur(rgb * alpha[..., None], (0, 0), 3.0) / np.maximum(cv2.GaussianBlur(alpha, (0, 0), 3.0)[..., None], 1e-3)
    hsv = cv2.cvtColor(np.clip(rgb_s, 0, 1).astype(np.float32), cv2.COLOR_RGB2HSV)
    sat = hsv[..., 1]; val = hsv[..., 2]
    hsv[..., 1] = np.clip(sat * 1.25, 0, 1); hsv[..., 2] = np.clip(0.55 + 0.45 * val, 0, 1)
    own = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)
    k_own = (np.clip((sat - 0.12) / 0.3, 0, 1) * np.clip((val - 0.08) / 0.2, 0, 1))[..., None]
    # lumières : objets lumineux, sol éclairé (néons, phares), et taches très vives et saturées
    floor_lit = (sup > 0.5) & (alpha > 0.97)
    def soft(c, k=1.6, cap=0.75):
        L = c.max(axis=2, keepdims=True)
        return c / np.maximum(L, 1e-4) * (1 - np.exp(-L * k)) * cap
    gm = glow
    lp = base + '-lumiere.png'
    if os.path.exists(lp):
        g1 = cv2.imread(lp, cv2.IMREAD_UNCHANGED).astype(np.float32)
        g1 = (g1[..., :3].max(axis=2) if g1.ndim == 3 else g1) / (65535.0 if g1.max() > 255 else 255.0)
        gm = np.maximum(gm, cv2.resize(g1, (w, h), interpolation=cv2.INTER_AREA))
    light = soft(rgb * alpha[..., None]) * np.clip(gm * 1.5, 0, 1)[..., None]
    if (gm > 0.3).mean() > 0.04: light = light * 0.4           # grande surface lumineuse (écran) : plus discrète
    if floor_lit.any():
        base_floor = np.median(rgb[floor_lit], axis=0)
        fl = soft(np.clip(rgb - base_floor[None, None, :] - 0.02, 0, None), 2.0, 0.7) * floor_lit[..., None]
        light = np.maximum(light, fl)
    # ombre portée : ce que l'attrape-ombres a reçu (hors silhouette, hors sol éclairé)
    shadow = alpha * (cov < 0.5) * (~floor_lit) * (glow < 0.3)
    if floor_lit.mean() > 0.05:          # sol gardé (néons, phares) : pas d'ombre dessinée sur le sol ni à l'horizon
        shadow = shadow * (sup < 0.1)
    return w, h, cov, rim, rimb, lines, glass, light, shadow, own, k_own


def compose_silhouette(base, dst, fam):
    import numpy as np, cv2
    w, h, cov, rim, rimb, lines, glass, light, shadow, own, k_own = silhouette_layers(base, fam)
    bg = background(w, h, fam)
    c1, c2 = (np.array(c, np.float32) / 255.0 for c in RIMS.get(fam, RIMS['consommables']))
    out = bg * (1 - 0.5 * np.clip(shadow, 0, 1)[..., None])
    # silhouette : noir d'encre, à peine modelé ; vitrages un peu plus clairs
    ink = np.array(INK, np.float32)
    fill = ink[None, None, :] * np.ones((h, w, 1), np.float32)
    fill = fill * (1 - 0.2 * glass[..., None]) + np.array(HL, np.float32) * 0.2 * glass[..., None]
    out = out * (1 - cov[..., None]) + fill * cov[..., None]
    # traits de forme
    out = out * (1 - 0.14 * lines[..., None]) + np.array(HL, np.float32) * 0.14 * lines[..., None]
    # liserés : contre-jour teinté de la couleur de l'objet, second liseré néon
    tint1 = c1 * (1 - 0.65 * k_own) + own * 0.65 * k_own
    out = out * (1 - rim[..., None]) + tint1 * rim[..., None]
    out = out * (1 - 0.8 * rimb[..., None]) + c2 * 0.8 * rimb[..., None]
    # tatouages : le motif brille sous la peau cachée (lumière noire)
    mp = base + '-motif.png'
    if os.path.exists(mp):
        mo = cv2.imread(mp, cv2.IMREAD_UNCHANGED).astype(np.float32)
        mo = (mo[..., :3].max(axis=2) if mo.ndim == 3 else mo) / (65535.0 if mo.max() > 255 else 255.0)
        mo = cv2.resize(mo, (w, h), interpolation=cv2.INTER_AREA) * np.clip(cov * 1.2, 0, 1)
        mo = np.clip((mo - 0.25) / 0.5, 0, 1)
        out = out * (1 - 0.85 * mo[..., None]) + c1 * 0.85 * mo[..., None]
        light = np.maximum(light, c1[None, None, :] * mo[..., None] * 0.35)
    # lumières qui percent, avec halo
    lt = np.clip(light, 0, 1) * 0.85
    halo = cv2.GaussianBlur(lt, (0, 0), 5.0) * 0.6 + cv2.GaussianBlur(lt, (0, 0), 16.0) * 0.5
    lt = np.clip(lt + halo, 0, 1)
    out = 1 - (1 - out) * (1 - lt)
    cv2.imwrite(dst, (np.clip(out, 0, 1)[..., ::-1] * 255 + 0.5).astype(np.uint8))


def _rim_from_mask(m, light=(-0.45, -0.8)):
    """liseré d'un masque 2D : bord éclairé du côté de la lumière (haut-gauche), d'après le gradient du masque adouci"""
    import numpy as np, cv2
    sm = cv2.GaussianBlur(m, (0, 0), 3.0)
    gx = cv2.Sobel(sm, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(sm, cv2.CV_32F, 0, 1, ksize=3)
    mag = np.sqrt(gx * gx + gy * gy) + 1e-6
    nx, ny = -gx / mag, -gy / mag                                     # normale sortante
    face = np.clip((nx * light[0] + ny * light[1]), 0, 1)
    dist = cv2.distanceTransform((m > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    band = _smooth(5.0 - dist, 0.0, 2.5)
    return np.clip(_smooth(face, 0.1, 0.6) * band + _smooth(1.6 - dist, 0.0, 1.2) * 0.25, 0, 1) * (m > 0.5)


def flash_silhouette(img, dst, fam, rot=-4.0, scale=0.62):
    """motif de tatouage « flash » montré en silhouette (forme du dessin, liseré teinté de ses couleurs)"""
    import numpy as np, cv2
    W, H = 960, 600
    src = cv2.imread(img, cv2.IMREAD_UNCHANGED).astype(np.float32) / 255.0
    a = src[..., 3]; rgb = src[..., [2, 1, 0]]
    ys, xs = np.where(a > 0.1)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; rgb = rgb[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    k = scale * min(W / a.shape[1], H / a.shape[0])
    sz = (max(8, int(a.shape[1] * k)), max(8, int(a.shape[0] * k)))
    a = cv2.resize(a, sz, interpolation=cv2.INTER_AREA); rgb = cv2.resize(rgb, sz, interpolation=cv2.INTER_AREA)
    M = cv2.getRotationMatrix2D((sz[0] / 2, sz[1] / 2), rot, 1.0)
    M[0, 2] += W / 2 - sz[0] / 2; M[1, 2] += H * 0.47 - sz[1] / 2
    a = cv2.warpAffine(a, M, (W, H)); rgb = cv2.warpAffine(rgb, M, (W, H))
    m = np.clip(a * 1.4, 0, 1)
    bg = background(W, H, fam)
    c1, c2 = (np.array(c, np.float32) / 255.0 for c in RIMS.get(fam, RIMS['tatouages']))
    # ombre portée décalée
    sh = cv2.GaussianBlur(cv2.warpAffine(m, np.float32([[1, 0, 10], [0, 1, 14]]), (W, H)), (0, 0), 6) * 0.45
    out = bg * (1 - sh[..., None])
    ink = np.array(INK, np.float32)
    out = out * (1 - m[..., None]) + ink * m[..., None]
    # traits intérieurs du dessin, à peine visibles
    lum = rgb.mean(axis=2)
    lines = ((lum < 0.18) & (a > 0.6)).astype(np.float32)
    inner = cv2.erode((m > 0.5).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32)
    lines = lines * inner
    out = out * (1 - 0.09 * lines[..., None]) + np.array(HL, np.float32) * 0.09 * lines[..., None]
    rim = _rim_from_mask(m)
    hsv = cv2.cvtColor(np.clip(cv2.GaussianBlur(rgb, (0, 0), 4), 0, 1), cv2.COLOR_RGB2HSV)
    kown = (np.clip((hsv[..., 1] - 0.15) / 0.3, 0, 1))[..., None]
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.2, 0, 1); hsv[..., 2] = np.clip(0.6 + 0.4 * hsv[..., 2], 0, 1)
    own = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)
    tint = c1 * (1 - 0.7 * kown) + own * 0.7 * kown
    out = out * (1 - rim[..., None]) + tint * rim[..., None]
    rim2 = _rim_from_mask(m, (0.8, 0.5)) * 0.7
    out = out * (1 - rim2[..., None]) + c2 * rim2[..., None]
    cv2.imwrite(dst, (np.clip(out, 0, 1)[..., ::-1] * 255 + 0.5).astype(np.uint8))


def chart_silhouette(img, dst, fam):
    """planche de placement : silhouettes de corps (face et dos), zone à tatouer allumée"""
    import numpy as np, cv2
    W, H = 960, 600
    src = cv2.imread(img, cv2.IMREAD_UNCHANGED)
    rgb = (src[..., [2, 1, 0]].astype(np.float32) / 255.0) if src.ndim == 3 else np.repeat(src[..., None], 3, 2).astype(np.float32) / 255.0
    a = src[..., 3].astype(np.float32) / 255.0 if (src.ndim == 3 and src.shape[2] == 4) else np.ones(src.shape[:2], np.float32)
    lum = rgb.mean(axis=2)
    ink_line = ((lum < 0.45) & (a > 0.3)).astype(np.uint8)
    zone = (((rgb[..., 0] - rgb[..., 2]) > 0.12) & (a > 0.2)).astype(np.uint8)
    walls = cv2.dilate(np.maximum(ink_line, zone), np.ones((5, 5), np.uint8))
    hh, ww = walls.shape
    ff = walls.copy() * 255; mask = np.zeros((hh + 2, ww + 2), np.uint8)
    cv2.floodFill(ff, mask, (0, 0), 128)
    body = ((ff != 128)).astype(np.float32)
    nl, lab, st, _ = cv2.connectedComponentsWithStats(body.astype(np.uint8), connectivity=8)
    keep = np.zeros(nl, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= 0.004 * hh * ww
    body = keep[lab].astype(np.float32)
    zone = cv2.morphologyEx(zone, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)).astype(np.float32) * body
    ys, xs = np.where(body > 0)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    body = body[y0:y1, x0:x1]; zone = zone[y0:y1, x0:x1]
    k = 0.86 * min(W / body.shape[1], H / body.shape[0])
    sz = (int(body.shape[1] * k), int(body.shape[0] * k))
    body = cv2.resize(body, sz, interpolation=cv2.INTER_AREA); zone = cv2.resize(zone, sz, interpolation=cv2.INTER_AREA)
    canvas = np.zeros((H, W), np.float32); cz = np.zeros((H, W), np.float32)
    ox, oy = (W - sz[0]) // 2, int(H * 0.5 - sz[1] / 2)
    canvas[oy:oy + sz[1], ox:ox + sz[0]] = body; cz[oy:oy + sz[1], ox:ox + sz[0]] = zone
    bg = background(W, H, fam)
    c1, c2 = (np.array(c, np.float32) / 255.0 for c in RIMS.get(fam, RIMS['tatouages']))
    sh = cv2.GaussianBlur(cv2.warpAffine(canvas, np.float32([[1, 0, 8], [0, 1, 10]]), (W, H)), (0, 0), 6) * 0.4
    out = bg * (1 - sh[..., None])
    ink = np.array(INK, np.float32)
    out = out * (1 - canvas[..., None]) + ink * canvas[..., None]
    zg = np.clip(cz, 0, 1)
    out = out * (1 - 0.8 * zg[..., None]) + c1 * 0.8 * zg[..., None]
    halo = cv2.GaussianBlur(zg, (0, 0), 8) * 0.5
    out = 1 - (1 - out) * (1 - (c1 * halo[..., None]))
    rim = _rim_from_mask(canvas)
    out = out * (1 - rim[..., None]) + c1 * rim[..., None]
    rim2 = _rim_from_mask(canvas, (0.8, 0.5)) * 0.7
    out = out * (1 - rim2[..., None]) + c2 * rim2[..., None]
    cv2.imwrite(dst, (np.clip(out, 0, 1)[..., ::-1] * 255 + 0.5).astype(np.uint8))

