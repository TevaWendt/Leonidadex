# Personnalisation des armes v2 : photos réalistes sur l'établi d'un armurier (armes scannées CC0 : pistolet de service,
# fusil à verrou ; accessoires usinés modélisés : réducteurs de son, freins de bouche, viseurs, chargeurs, cartouches).
import bpy, bmesh, math, random, os
from mathutils import Vector, Euler, Matrix
from .core import *
from . import assets as A
TEXDIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tex')

HD2K = lambda h: '2k' if os.path.exists(f'{A.ROOT}/hdri/{h}_2k.hdr') else '1k'


# ------------------------------------------------------------------ décor : établi
def bench(hd='workshop', k=0.35, cam_k=0.4, rot=0.0, surface='walnut', expo=-0.45, key_w=9.0, rim=(0.55, 0.8, 1.0), rim_w=3.0, warm=(1.0, 0.86, 0.7)):
    A.hdri(hd, k, rot=rot, res=HD2K(hd), cam_hdri_k=cam_k)
    bpy.context.scene.view_settings.exposure = expo
    top = box('etabli', (2.6, 1.8, 0.04), (0, 0.25, -0.02))
    if surface == 'walnut':
        m = A.pbr('dark_wood', 1.6, coords='Object', coat=0.15, coat_rough=0.3, rough_mul=1.1, sat=0.75, val=0.8)
    elif surface == 'mat':      # tapis de nettoyage en caoutchouc
        def fn(nt, p):
            v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 30, 4, 0.6)
            nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, (0.028, 0.029, 0.031)), (0.7, (0.04, 0.041, 0.044))]), p.inputs['Base Color'])
        m = mat('tapis', (0.03, 0.03, 0.033), 0.8, base_fn=fn, bump={'scale': 900, 'strength': 0.12, 'detail': 3})
    elif surface == 'steel':
        m = A.pbr('metal_plate', 2.0, coords='Object', metal=1.0, rough_mul=1.0, tint=(0.8, 0.8, 0.82))
    elif surface == 'felt':
        m = mat('feutrine', (0.02, 0.035, 0.03), 0.95, sheen=0.8, sheen_tint=(0.6, 0.8, 0.7), bump={'scale': 2500, 'strength': 0.2})
    else:
        m = surface
    assign(top, m)
    area('cle', (-0.35, -0.45, 0.75), (0, 0, 0.0), 0.8, key_w, warm)
    area('contre', (0.55, 0.65, 0.3), (0, 0, 0.02), 0.6, rim_w, rim)
    area('rasant', (-0.8, 0.2, 0.08), (0, 0, 0.02), 0.5, 1.5, (1.0, 0.75, 0.5))
    return top


def shot(target, dist=0.7, height=0.35, az=-20, lens=70, fstop=5.6):
    a = math.radians(az)
    loc = (target[0] + math.sin(a) * dist, target[1] - math.cos(a) * dist, target[2] + height)
    return cam(loc, target, lens, fstop)


def top_shot(target, dist=0.8, tilt=28, az=-10, lens=50, fstop=8.0, roll_fix=True):
    """vue plongeante (tilt = angle depuis la verticale) : les armes couchées se lisent de profil"""
    t = math.radians(tilt); a = math.radians(az)
    loc = (target[0] + math.sin(a) * math.sin(t) * dist, target[1] - math.cos(a) * math.sin(t) * dist, target[2] + math.cos(t) * dist)
    return cam(loc, target, lens, fstop)


# ------------------------------------------------------------------ armes scannées
def _keep(aid, res, pred):
    root, obs = A.model(aid, res)
    keep = [o for o in obs if o.type == 'MESH' and pred(o.name.split('.')[0])]
    for o in obs:
        if o not in keep and o.type == 'MESH': bpy.data.objects.remove(o)
    return root, keep


def refinish(objs, kind=None, rgb=None, pattern=None):
    """nouvelle finition sur les pièces métalliques (masque = carte « metal » du scan) :
    kind 'cerakote' (peinture satinée), 'metal' (métal poli teinté), 'pattern' (motif imprimé : fonction de nœuds)"""
    done = {}
    for o in objs:
        for i, m in enumerate(o.data.materials):
            if m is None: continue
            if m.name not in done:
                mm = m.copy(); nt = mm.node_tree; N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
                diff = p.inputs['Base Color'].links[0].from_socket if p.inputs['Base Color'].is_linked else None
                met = p.inputs['Metallic'].links[0].from_socket if p.inputs['Metallic'].is_linked else None
                rough = p.inputs['Roughness'].links[0].from_socket if p.inputs['Roughness'].is_linked else None
                if diff is None or met is None:
                    done[m.name] = mm; continue
                mask = met
                lum = N.new('ShaderNodeRGBToBW'); L.new(diff, lum.inputs[0])
                if kind == 'pattern' and pattern is not None:
                    col = pattern(nt)
                    # le motif garde l'usure du scan (multiplié par la luminance relative)
                    k = N.new('ShaderNodeMath'); k.operation = 'MULTIPLY_ADD'; L.new(lum.outputs[0], k.inputs[0]); k.inputs[1].default_value = 1.6; k.inputs[2].default_value = 0.45
                    mx0 = N.new('ShaderNodeMix'); mx0.data_type = 'RGBA'; mx0.blend_type = 'MULTIPLY'; mx0.inputs[0].default_value = 1.0
                    L.new(col, mx0.inputs[6]); L.new(k.outputs[0], mx0.inputs[7]); col = mx0.outputs[2]
                else:
                    k = N.new('ShaderNodeMath'); k.operation = 'MULTIPLY_ADD'; L.new(lum.outputs[0], k.inputs[0])
                    k.inputs[1].default_value = 2.2 if kind == 'cerakote' else 1.8; k.inputs[2].default_value = 0.35 if kind == 'cerakote' else 0.55
                    mx0 = N.new('ShaderNodeMix'); mx0.data_type = 'RGBA'; mx0.blend_type = 'MULTIPLY'; mx0.inputs[0].default_value = 1.0
                    mx0.inputs[6].default_value = (*rgb, 1); L.new(k.outputs[0], mx0.inputs[7]); col = mx0.outputs[2]
                mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; L.new(mask, mx.inputs[0]); L.new(diff, mx.inputs[6]); L.new(col, mx.inputs[7])
                L.new(mx.outputs[2], p.inputs['Base Color'])
                # métal : la peinture (cerakote, motif) n'est plus métallique ; le métal poli reste métallique
                if kind in ('cerakote', 'pattern'):
                    mm_ = N.new('ShaderNodeMath'); mm_.operation = 'MULTIPLY'; L.new(met, mm_.inputs[0]); mm_.inputs[1].default_value = 0.15
                    L.new(mm_.outputs[0], p.inputs['Metallic'])
                    if rough is not None:
                        rr = N.new('ShaderNodeMix'); rr.data_type = 'FLOAT'; L.new(mask, rr.inputs[0]); L.new(rough, rr.inputs[2]); rr.inputs[3].default_value = 0.5
                        L.new(rr.outputs[0], p.inputs['Roughness'])
                else:
                    if rough is not None:
                        rr = N.new('ShaderNodeMath'); rr.operation = 'MULTIPLY'; L.new(rough, rr.inputs[0]); rr.inputs[1].default_value = 0.55
                        L.new(rr.outputs[0], p.inputs['Roughness'])
                done[m.name] = mm
            o.data.materials[i] = done[m.name]


def pistol(variant='a', mag=False, res='2k', flat=True, finish=None):
    """pistolet de service scanné (variante a : plaquettes en bois ; b : plaquettes bleues), couché sur le flanc gauche,
    canon vers +x, posé sur z = 0 ; renvoie (racine, pièces, repères)"""
    root, keep = _keep('service_pistol', res, lambda n: n.endswith('_' + variant) or (mag and n.endswith('magazine_loaded')))
    bpy.context.view_layer.update()
    mags = [o for o in keep if o.name.split('.')[0].endswith('magazine_loaded')]
    keep = [o for o in keep if o not in mags]
    for o in mags: bpy.data.objects.remove(o)
    lo, hi = A.bbox(keep)
    ref = {'muzzle': Vector((hi.x, 0.0, 0.1147 if variant == 'a' else 0.2647)), 'rail': Vector((0.01, 0.0, 0.131 if variant == 'a' else 0.281)),
           'grip': Vector((-0.045, 0.0, lo.z)), 'lo': lo.copy(), 'hi': hi.copy()}
    if finish: refinish(keep, **finish)
    piv = empty('pistolet')
    for o in keep:
        mw = Matrix.Translation(-Vector((lo.x + (hi.x - lo.x) / 2, 0, 0))) @ o.matrix_world
        o.parent = piv; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    for k in ('muzzle', 'rail', 'grip'): ref[k] = ref[k] - Vector((lo.x + (hi.x - lo.x) / 2, 0, 0))
    if flat:
        piv.rotation_euler = (math.radians(-90), 0, 0)   # couché sur le flanc, dessus de l'arme vers le fond
        piv.location = (0, 0, 0.0165)
    bpy.data.objects.remove(root)
    return piv, keep, ref


def rifle(scope=True, wrap=False, res='2k', flat=True):
    names = ['bolt_action_rifle_7_62', 'bolt_action_rifle_7_62_trigger', 'bolt_action_rifle_7_62_bolt_a']
    if scope: names.append('bolt_action_rifle_7_62_scope')
    if wrap: names.append('bolt_action_rifle_7_62_wrap')
    root, keep = _keep('bolt_action_rifle_7_62', res, lambda n: n in names)
    piv = empty('fusil')
    for o in keep:
        mw = o.matrix_world.copy(); o.parent = piv; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    if flat:
        piv.rotation_euler = (math.radians(-90), 0, 0); piv.location = (0, 0, 0.034)
    bpy.data.objects.remove(root)
    return piv, keep


# ------------------------------------------------------------------ matières d'armurerie
def M_anod(rgb=(0.02, 0.021, 0.024), rough=0.42):
    """aluminium anodisé noir (accessoires usinés) : satiné, micro-grain"""
    return mat('anodise', rgb, rough, metal=0.6, coat=0.15, coat_rough=0.35, bump={'scale': 2400, 'strength': 0.05})


def M_brass(rough=0.22): return mat('laiton', (0.92, 0.66, 0.32), rough, metal=1.0, bump={'scale': 1800, 'strength': 0.02})
def M_copper(rough=0.2): return mat('cuivre', (0.95, 0.52, 0.32), rough, metal=1.0)
def M_steel(rough=0.3): return mat('acier', (0.62, 0.62, 0.64), rough, metal=1.0, aniso=0.4, bump={'scale': 1500, 'strength': 0.02})
def M_stainless(rough=0.46): return mat('inox', (0.56, 0.56, 0.58), rough, metal=1.0, bump={'kind': 'noise', 'scale': 3000, 'strength': 0.05})
def M_tip(rgb): return mat('pointe', rgb, 0.45, coat=0.3, coat_rough=0.3)


# ------------------------------------------------------------------ cartouches (cotes réelles)
def cartridge(kind='rifle', tip=None, band=None, hollow=False, loc=(0, 0, 0), rot=(0, 0, 0), name='cartouche', steel_case=False):
    """cartouche debout (axe z) : « rifle » 7,62 × 51 ; « pistol » 9 × 19 ; tip = couleur de pointe (code militaire)"""
    root = empty(name, loc, rot)
    if kind == 'rifle':
        case = [(0.0, 0.0), (0.0059, 0.0), (0.006, 0.0012), (0.0052, 0.0016), (0.0052, 0.0026), (0.00595, 0.0032), (0.00575, 0.0398), (0.0044, 0.0432),
                (0.00435, 0.0508), (0.0039, 0.051), (0.0, 0.051)]
        L0, Lb, rb = 0.051, 0.0205, 0.0039
    else:
        case = [(0.0, 0.0), (0.00495, 0.0), (0.005, 0.0009), (0.0042, 0.0013), (0.0042, 0.0021), (0.00495, 0.0026), (0.0048, 0.019), (0.0045, 0.0192), (0.0, 0.0192)]
        L0, Lb, rb = 0.0192, 0.0105, 0.0045
    c = lathe('douille', case, 96); assign(c, M_steel(0.3) if steel_case else M_brass()); parent(c, root); bevel(c, 0.0002, 2)
    pr = cyl('amorce', 0.0021 if kind == 'rifle' else 0.0018, 0.0006, 48, (0, 0, 0.0002)); assign(pr, mat('amorce', (0.75, 0.74, 0.72), 0.25, metal=1.0)); parent(pr, root)
    # balle : ogive
    prof = []
    for i in range(25):
        t = i / 24
        if kind == 'rifle':
            r = rb * (1 - t ** 1.9) ** 0.55 if t < 0.985 else 0.0003
        else:
            r = rb * (1 - t ** 2.4) ** 0.5 if not hollow else rb * (1 - 0.55 * t ** 2.2)
        prof.append((max(r, 0.0002 if not hollow else 0.0), L0 - 0.002 + t * (Lb + 0.002)))
    if hollow:
        top = prof[-1][1]; rt = prof[-1][0]
        prof += [(rt * 0.75, top), (rt * 0.62, top - 0.0028), (0.0, top - 0.0036)]
    else:
        prof.append((0.0, L0 + Lb + 0.0002))
    prof = [(0.0, L0 - 0.002)] + prof
    b = lathe('balle', prof, 96); assign(b, M_copper(0.18) if not hollow else M_copper(0.22)); parent(b, root)
    if tip is not None:
        h = Lb * (0.32 if kind == 'rifle' else 0.4)
        tp = [(r + 0.00004, z) for (r, z) in prof if z >= L0 + Lb - h]
        tpo = lathe('peinture', [(0.0, L0 + Lb - h)] + tp + [(0.0, L0 + Lb + 0.0003)], 96); assign(tpo, M_tip(tip)); parent(tpo, root)
    if band is not None:
        z0 = L0 + Lb * 0.35
        bd = lathe('bague', [(rb * 0.97, z0), (rb * 0.98, z0 + 0.0025)], 96); bd.data.polygons.foreach_set('use_smooth', [True] * len(bd.data.polygons))
        sol = solidify(bd, 0.0002, 1); assign(bd, M_tip(band)); parent(bd, root)
    return root, L0 + Lb


# ------------------------------------------------------------------ accessoires usinés
def suppressor(L=0.15, r=0.0175, loc=(0, 0, 0), rot=(0, 0, 0)):
    root = empty('silencieux', loc, rot)
    body = lathe('tube', [(0.0, 0.0), (r * 0.6, 0.0), (r, 0.003), (r, L - 0.003), (r * 0.82, L), (0.0045, L), (0.0045, L - 0.004), (0.0, L - 0.004)], 96)
    assign(body, M_anod()); parent(body, root)
    # moletage près de la fixation
    for i in range(36):
        a = i / 36 * math.tau
        g = box('cannelure', (0.0014, 0.0012, 0.018), (math.cos(a) * r, math.sin(a) * r, 0.014), 0.0003); g.rotation_euler = (0, 0, a); assign(g, M_anod((0.012, 0.012, 0.014))); parent(g, root)
    return root


def scope_tube(L=0.32, r=0.0127, obj_r=0.025, eye_r=0.02, loc=(0, 0, 0), rot=(0, 0, 0), color=(0.018, 0.018, 0.02), turrets=True, name='lunette'):
    """lunette de tir : tube de 25,4 mm, cloche d'objectif, oculaire, tourelles ; axe +z (objectif en z = L)"""
    root = empty(name, loc, rot)
    prof = [(0.0, 0.0), (eye_r * 0.8, 0.0), (eye_r, 0.004), (eye_r, 0.07), (r * 1.15, 0.085), (r, 0.095), (r, L - 0.11), (obj_r * 0.9, L - 0.06),
            (obj_r, L - 0.045), (obj_r, L - 0.004), (obj_r * 0.93, L), (0.0, L)]
    t = lathe('tube', prof, 96); assign(t, M_anod(color, 0.38)); parent(t, root)
    for z, rr in ((0.0015, eye_r * 0.86), (L - 0.0015, obj_r * 0.88)):
        g = cyl('verre', rr, 0.001, 64, (0, 0, z)); assign(g, mat('verre_traite', (0.01, 0.02, 0.03), 0.02, coat=1.0, film=380, film_ior=1.4, spec=0.8)); parent(g, root)
    if turrets:
        zc = L * 0.48
        for ax, sg in (((0, 1, 0), 1), ((1, 0, 0), 1)):
            tt = cyl('tourelle', 0.0115, 0.022, 48, (ax[0] * (r + 0.008), ax[1] * (r + 0.008), zc), (math.radians(90) if ax[1] else 0, math.radians(90) if ax[0] else 0, 0), 0.0015)
            assign(tt, M_anod(color, 0.35)); parent(tt, root)
        sad = box('selle', (0.034, 0.034, 0.05), (0, 0, zc), 0.006); assign(sad, M_anod(color, 0.4)); parent(sad, root)
    return root


def rings_mount(z_list, r=0.0127, h=0.012, loc=(0, 0, 0), rot=(0, 0, 0)):
    root = empty('colliers', loc, rot)
    for z in z_list:
        ring = lathe('collier', [(r + 0.0005, -0.006), (r + 0.004, -0.006), (r + 0.004, 0.006), (r + 0.0005, 0.006)], 64); ring.location = (0, 0, z); assign(ring, M_anod()); parent(ring, root)
        base = box('pied', (0.02, 0.012, 0.012), (-(r + h * 0.5), 0, z), 0.002); assign(base, M_anod()); parent(base, root)
    return root


def boolean_cut(ob, cutters, op='DIFFERENCE'):
    for c in cutters:
        m = ob.modifiers.new('cut', 'BOOLEAN'); m.operation = op; m.object = c; m.solver = 'EXACT'
        apply_mods(ob); bpy.data.objects.remove(c)
    ob.data.materials.clear()
    return ob


def drum_mag(loc=(0, 0, 0), rot=(0, 0, 0), double=False, color=(0.02, 0.02, 0.022)):
    """chargeur tambour (ou double tambour « caisson ») : tambours nervurés, tour d'alimentation, clé de remontage"""
    root = empty('tambour', loc, rot); M = M_polymer(color, 0.5)
    centers = [(-0.062, 0.0), (0.062, 0.0)] if double else [(0.0, 0.0)]
    R = 0.062 if double else 0.075
    for (cx, cz) in centers:
        d = cyl('tambour', R, 0.052, 96, (cx, 0, cz), (math.pi / 2, 0, 0), 0.006); assign(d, M); parent(d, root)
        for k in (-1, 1):
            lid = cyl('couvercle', R * 0.82, 0.004, 96, (cx, k * 0.027, cz), (math.pi / 2, 0, 0), 0.0015); assign(lid, M_polymer((0.03, 0.03, 0.033), 0.45)); parent(lid, root)
            for i in range(10):
                a = i / 10 * math.tau
                rib = box('nervure', (0.004, 0.004, R * 0.62), (cx + math.cos(a) * R * 0.45, k * 0.029, cz + math.sin(a) * R * 0.45), 0.0015); rib.rotation_euler = (0, -a + math.pi / 2, 0)
                assign(rib, M); parent(rib, root)
        key = cyl('cle', 0.012, 0.012, 32, (cx, 0.034, cz), (math.pi / 2, 0, 0), 0.002); assign(key, M_steel(0.35)); parent(key, root)
        wing = box('ailette', (0.034, 0.008, 0.008), (cx, 0.04, cz), 0.002); assign(wing, M_steel(0.35)); parent(wing, root)
    tower = box('tour', (0.034, 0.022, 0.09), (0.0, 0, R + 0.03 if not double else 0.075), 0.004); assign(tower, M); parent(tower, root)
    lips = box('levres', (0.03, 0.018, 0.012), (0.0, 0, (R + 0.075) if not double else 0.12), 0.002); assign(lips, M_steel(0.3)); parent(lips, root)
    return root


def holo_sight(loc=(0, 0, 0), rot=(0, 0, 0), reticle=(1.0, 0.05, 0.03)):
    """viseur holographique : socle à collier, capot en anneau carré, fenêtre traitée, réticule rouge (anneau et point)"""
    root = empty('holo', loc, rot); M = M_anod((0.02, 0.021, 0.024), 0.5)
    base = box('socle', (0.1, 0.034, 0.024), (0, 0, 0.012), 0.003); assign(base, M); parent(base, root)
    clamp = box('collier', (0.03, 0.04, 0.02), (0.02, 0, 0.004), 0.003); assign(clamp, M); parent(clamp, root)
    knob = cyl('molette', 0.008, 0.014, 32, (0.02, 0.026, 0.006), (math.pi / 2, 0, 0), 0.001); assign(knob, M); parent(knob, root)
    hood = box('capot', (0.06, 0.042, 0.04), (-0.005, 0, 0.046), 0.006)
    hole = box('ouverture', (0.1, 0.032, 0.03), (-0.005, 0, 0.048), 0.002)
    boolean_cut(hood, [hole]); assign(hood, M); parent(hood, root)
    for x in (-0.03, 0.02):
        g = box('vitre', (0.002, 0.032, 0.03), (x, 0, 0.048), 0.0); assign(g, mat('vitre_traitee', (0.85, 0.9, 1.0), 0.01, trans=0.92, ior=1.52, film=420, film_ior=1.38)); parent(g, root)
    ring = lathe('reticule', [(0.0058, -0.0001), (0.0066, -0.0001), (0.0066, 0.0001), (0.0058, 0.0001)], 64); ring.rotation_euler = (0, math.pi / 2, 0); ring.location = (-0.028, 0, 0.048)
    assign(ring, emission('reticule', reticle, 40)); parent(ring, root)
    dot = sphere('point', 0.0008, (-0.028, 0, 0.048)); assign(dot, emission('point', reticle, 60)); parent(dot, root)
    for i, y in enumerate((-0.012, 0.0, 0.012)):
        bt = box('bouton', (0.008, 0.008, 0.003), (0.035, y, 0.0255), 0.001); assign(bt, M_rubber()); parent(bt, root)
    return root


def nv_scope(loc=(0, 0, 0), rot=(0, 0, 0)):
    root = scope_tube(0.3, 0.017, 0.03, 0.024, loc, rot, (0.025, 0.03, 0.022), True, 'vision_nocturne')
    ep = cyl('oculaire', 0.0215, 0.002, 64, (0, 0, 0.0035)); assign(ep, emission('phosphore', (0.25, 1.0, 0.35), 4.0)); parent(ep, root)
    ir = cyl('illuminateur', 0.014, 0.09, 48, (0.0, -0.034, 0.2), (0, 0, 0), 0.003); assign(ir, M_anod((0.025, 0.03, 0.022))); parent(ir, root)
    lens = cyl('led_ir', 0.012, 0.002, 48, (0.0, -0.034, 0.246)); assign(lens, mat('ir', (0.15, 0.02, 0.03), 0.05, coat=1.0, emit=(0.6, 0.02, 0.05), emit_k=0.6)); parent(lens, root)
    bat = box('pile', (0.03, 0.026, 0.05), (0.03, 0.0, 0.12), 0.006); assign(bat, M_anod((0.025, 0.03, 0.022))); parent(bat, root)
    return root


def thermal_img(path):
    """image d'écran thermique (blanc = chaud) : silhouette et halo, bruit de capteur"""
    import numpy as np
    from PIL import Image, ImageFilter
    if os.path.exists(path): return path
    w, h = 256, 192; yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    img = 0.18 + 0.08 * np.sin(xx / 30) * np.cos(yy / 25)
    def blob(cx, cy, rx, ry, k): return k * np.exp(-(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2))
    img += blob(130, 70, 18, 20, 0.75) + blob(130, 125, 30, 45, 0.7) + blob(110, 165, 10, 30, 0.5) + blob(150, 165, 10, 30, 0.5)
    img += np.random.default_rng(2).normal(0, 0.03, img.shape)
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    im.save(path); return path


def thermal_scope(loc=(0, 0, 0), rot=(0, 0, 0)):
    root = empty('thermique', loc, rot); M = M_anod((0.03, 0.032, 0.03), 0.55)
    body = box('boitier', (0.16, 0.06, 0.07), (0, 0, 0.045), 0.012); assign(body, M); parent(body, root)
    obj = cyl('objectif', 0.03, 0.06, 64, (0.11, 0, 0.05), (0, math.pi / 2, 0), 0.004); assign(obj, M); parent(obj, root)
    glass = cyl('germanium', 0.025, 0.002, 64, (0.141, 0, 0.05), (0, math.pi / 2, 0)); assign(glass, mat('germanium', (0.02, 0.02, 0.025), 0.05, metal=0.6, film=600, film_ior=2.4)); parent(glass, root)
    ep = cyl('bonnette', 0.022, 0.035, 48, (-0.095, 0, 0.05), (0, math.pi / 2, 0), 0.004); assign(ep, M_rubber()); parent(ep, root)
    scr = grid('ecran', 0.03, 0.022, 2, 2); scr.rotation_euler = (0, -math.pi / 2, 0); scr.location = (-0.1135, 0, 0.05)
    me = scr.data; uv = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co; uv.data[li].uv = (co.x / 0.03 + 0.5, co.y / 0.022 + 0.5)
    m = bpy.data.materials.new('ecran'); m.use_nodes = True; nt = m.node_tree; N = nt.nodes
    for n_ in list(N): N.remove(n_)
    it = N.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(thermal_img(os.path.join(TEXDIR, 'thermique.png')), check_existing=True)
    e = N.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 0.9; nt.links.new(it.outputs['Color'], e.inputs['Color'])
    o = N.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); assign(scr, m); parent(scr, root)
    for i in range(3):
        bt = cyl('bouton', 0.006, 0.006, 24, (-0.02 + i * 0.022, 0, 0.083), (0, 0, 0), 0.001); assign(bt, M_rubber()); parent(bt, root)
    rail = box('collier', (0.06, 0.03, 0.012), (0.0, 0, 0.004), 0.002); assign(rail, M); parent(rail, root)
    return root


def compensator(loc=(0, 0, 0), rot=(0, 0, 0)):
    root = empty('compensateur', loc, rot)
    body = box('corps', (0.045, 0.026, 0.028), (0.0225, 0, 0), 0.005)
    cuts = [box('event', (0.006, 0.03, 0.02), (0.012 + i * 0.011, 0, 0.012), 0.001) for i in range(3)]
    boolean_cut(body, cuts); assign(body, M_stainless(0.4)); parent(body, root)
    bore = cyl('ame', 0.0048, 0.05, 32, (0.0225, 0, 0), (0, math.pi / 2, 0)); assign(bore, mat('ame', (0.01, 0.01, 0.01), 0.6)); parent(bore, root)
    return root


def brake_kind(k, loc=(0, 0, 0), rot=(0, 0, 0), L=0.06, r=0.011):
    """sept freins de bouche : plat, tactique, évasé, précision, renforcé, biseauté, fendu"""
    root = empty('frein', loc, rot)
    if k == 'flat':
        b = cyl('corps', r, L, 64, (0, 0, L / 2), (0, 0, 0), 0.002); cuts = [box('fente', (0.03, 0.004, 0.012), (0, 0, 0.015 + i * 0.016), 0.0005) for i in range(3)]
    elif k == 'tactical':
        b = cyl('corps', r * 1.05, L, 6, (0, 0, L / 2), (0, 0, 0), 0.002); cuts = [box('fente', (0.03, 0.006, 0.01), (0, 0, 0.014 + i * 0.015), 0.0005) for i in range(3)] + [box('dent', (0.006, 0.03, 0.008), (0, 0, L), 0.0005)]
    elif k == 'fat':
        b = lathe('corps', [(0.0, 0.0), (r, 0.0), (r * 1.35, L * 0.6), (r * 1.4, L), (0.0, L)], 64); cuts = [cyl('trou', 0.004, 0.04, 16, (0, 0, 0.012 + i * 0.012), (math.pi / 2, 0, 0)) for i in range(4)]
    elif k == 'precision':
        b = cyl('corps', r, L * 1.2, 64, (0, 0, L * 0.6), (0, 0, 0), 0.002); cuts = [cyl('trou', 0.0028, 0.03, 16, (0, 0, 0.01 + i * 0.008), (math.pi / 2, 0, j * math.pi / 3)) for i in range(7) for j in range(3)]
    elif k == 'heavy':
        b = cyl('corps', r * 1.3, L, 64, (0, 0, L / 2), (0, 0, 0), 0.003); cuts = [box('fente', (0.04, 0.008, 0.014), (0, 0, 0.018 + i * 0.022), 0.001) for i in range(2)]
    elif k == 'slanted':
        b = cyl('corps', r, L, 64, (0, 0, L / 2), (0, 0, 0), 0.002); cuts = []
        for i in range(4):
            c = box('fente', (0.03, 0.004, 0.009), (0, 0, 0.012 + i * 0.012), 0.0005); c.rotation_euler = (0.5, 0, 0); cuts.append(c)
    else:  # split
        b = cyl('corps', r, L, 64, (0, 0, L / 2), (0, 0, 0), 0.002); cuts = [box('fente', (0.004, 0.03, L * 0.7), (0, 0, L * 0.65), 0.0005), box('fente2', (0.03, 0.004, L * 0.7), (0, 0, L * 0.65), 0.0005)]
    boolean_cut(b, cuts); assign(b, M_anod((0.03, 0.03, 0.033), 0.38) if k not in ('fat', 'precision') else M_steel(0.3)); parent(b, root)
    bore = cyl('ame', 0.0042, L * 1.25, 32, (0, 0, L * 0.6)); assign(bore, mat('ame', (0.005, 0.005, 0.005), 0.7)); parent(bore, root)
    return root


def heavy_barrel(loc=(0, 0, 0), rot=(0, 0, 0), L=0.5):
    """canon lourd cannelé (six cannelures), chambre plus épaisse, filetage de bouche ; axe +z"""
    root = empty('canon', loc, rot)
    pts = []
    for i in range(192):
        a = i / 192 * math.tau
        k = math.cos(a * 6)
        r = 0.0122 - 0.0022 * max(0.0, k) ** 3
        pts.append((math.cos(a) * r, math.sin(a) * r))
    fl = extrude2d('cannele', pts, L * 0.7, 0.0); fl.location = (0, 0, 0.09 + L * 0.35)
    for p_ in fl.data.polygons: p_.use_smooth = True
    assign(fl, M_stainless()); parent(fl, root)
    ch = lathe('chambre', [(0.0, 0.0), (0.0145, 0.0), (0.0145, 0.06), (0.0124, 0.092), (0.0, 0.092)], 96); assign(ch, M_stainless()); parent(ch, root)
    mz = lathe('bouche', [(0.0, 0.09 + L * 0.7 - 0.002), (0.0122, 0.09 + L * 0.7 - 0.002), (0.0118, L), (0.0108, L + 0.002), (0.0045, L + 0.002), (0.004, L - 0.002), (0.0, L - 0.002)], 96)
    assign(mz, M_stainless(0.36)); parent(mz, root)
    thr = cyl('filetage', 0.009, 0.015, 48, (0, 0, L + 0.0095)); assign(thr, mat('filet', (0.5, 0.5, 0.52), 0.35, metal=1.0, bump={'kind': 'noise', 'scale': 2000, 'strength': 0.3})); parent(thr, root)
    return root


def foregrip(loc=(0, 0, 0), rot=(0, 0, 0)):
    root = empty('poignee', loc, rot); M = M_polymer((0.02, 0.02, 0.022), 0.6)
    g = lathe('poignee', [(0.0, 0.0), (0.013, 0.0), (0.016, 0.006), (0.016, 0.03), (0.0145, 0.045), (0.016, 0.06), (0.0145, 0.075), (0.016, 0.09), (0.017, 0.1), (0.012, 0.106), (0.0, 0.106)], 64)
    assign(g, mat('prise', (0.02, 0.02, 0.022), 0.75, bump={'kind': 'voronoi', 'scale': 600, 'strength': 0.3})); parent(g, root)
    clamp = box('collier', (0.05, 0.026, 0.016), (0, 0, 0.112), 0.003); assign(clamp, M); parent(clamp, root)
    return root


def weapon_light(loc=(0, 0, 0), rot=(0, 0, 0), beam=True, color=(1.0, 0.95, 0.85), cone=True, spot_w=6.0):
    root = empty('lampe', loc, rot); M = M_anod()
    body = lathe('corps', [(0.0, 0.0), (0.0115, 0.0), (0.0125, 0.005), (0.0125, 0.06), (0.017, 0.075), (0.0175, 0.095), (0.0165, 0.1), (0.0, 0.1)], 64)
    body.rotation_euler = (0, math.pi / 2, 0); assign(body, M); parent(body, root)
    lens = cyl('vitre', 0.0145, 0.002, 64, (0.1, 0, 0), (0, math.pi / 2, 0)); assign(lens, mat('lentille', (0.9, 0.92, 0.95), 0.02, emit=color, emit_k=25)); parent(lens, root)
    clamp = box('collier', (0.04, 0.024, 0.016), (0.03, 0, 0.018), 0.003); assign(clamp, M); parent(clamp, root)
    if beam and cone:
        cone = lathe('faisceau', [(0.0, 0.0), (0.014, 0.0), (0.16, 0.8), (0.0, 0.8)], 64); cone.rotation_euler = (0, math.pi / 2, 0); cone.location = (0.101, 0, 0)
        m = bpy.data.materials.new('faisceau'); m.use_nodes = True; nt = m.node_tree; N = nt.nodes
        for n_ in list(N): N.remove(n_)
        tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 0.8; mr.inputs['To Min'].default_value = 0.35; mr.inputs['To Max'].default_value = 0.0
        nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
        e = N.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader')
        nt.links.new(mr.outputs['Result'], mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(e.outputs[0], mx.inputs[2])
        o = N.new('ShaderNodeOutputMaterial'); nt.links.new(mx.outputs[0], o.inputs[0]); assign(cone, m); cone.visible_shadow = False; parent(cone, root)
    if beam:
        sp = spot('lampe_spot', (0.104, 0, 0), (1.0, 0, 0), spot_w, color, 30 if not cone else 22, 0.6 if not cone else 0.4, 0.006); parent(sp, root)
    return root


def laser_module(loc=(0, 0, 0), rot=(0, 0, 0), color=(1.0, 0.02, 0.01), beam_len=0.7):
    root = empty('laser', loc, rot); M = M_anod((0.03, 0.033, 0.03), 0.5)
    body = box('boitier', (0.07, 0.032, 0.026), (0.0, 0, 0), 0.005); assign(body, M); parent(body, root)
    for y in (-0.008, 0.008):
        ap = cyl('ouverture', 0.0045, 0.004, 32, (0.036, y, 0.0), (0, math.pi / 2, 0)); assign(ap, mat('optique', (0.02, 0.02, 0.025), 0.05, coat=1.0)); parent(ap, root)
    em = cyl('emetteur', 0.0018, 0.002, 16, (0.0382, -0.008, 0.0), (0, math.pi / 2, 0)); assign(em, emission('laser_e', color, 80)); parent(em, root)
    sw = box('bouton', (0.012, 0.01, 0.004), (-0.02, 0, 0.014), 0.002); assign(sw, M_rubber()); parent(sw, root)
    beam = cyl('rayon', 0.0007, beam_len, 12, (0.038 + beam_len / 2, -0.008, 0.0), (0, math.pi / 2, 0)); assign(beam, emission('rayon', color, 30)); beam.visible_shadow = False; parent(beam, root)
    return root


def ext_mag(stretch=1.0, loc=(0, 0, 0), rot=(0, 0, 0), res='2k'):
    """chargeur de pistolet scanné ; stretch > 1 : version étendue (corps allongé, semelle conservée)"""
    root_, keep = _keep('service_pistol', res, lambda n: n.endswith('magazine_loaded'))
    o = keep[0]; bpy.context.view_layer.update()
    lo, hi = A.bbox([o])
    if stretch != 1.0:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o], selected_editable_objects=[o]):
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        cut = lo.z + (hi.z - lo.z) * 0.62
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            if w.z < cut:
                nz = cut - (cut - w.z) * stretch
                v.co = o.matrix_world.inverted() @ Vector((w.x, w.y, nz))
    piv = empty('chargeur', loc, rot)
    mw = Matrix.Translation(-Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))) @ o.matrix_world
    o.parent = piv; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    bpy.data.objects.remove(root_)
    return piv


def camo_pattern(kind):
    """motifs de camouflage (nœuds) : digital, coup de pinceau, forêt, léopard, zèbre, géométrique"""
    def f(nt):
        N = nt.nodes; L = nt.links
        tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); L.new(tc.outputs['Object'], mp.inputs['Vector'])
        v = mp.outputs['Vector']
        if kind == 'digital':
            mp.inputs['Scale'].default_value = (90, 90, 90)
            fl = N.new('ShaderNodeVectorMath'); fl.operation = 'FLOOR'; L.new(v, fl.inputs[0])
            n = N.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 0.18; n.inputs['Detail'].default_value = 1; L.new(fl.outputs[0], n.inputs['Vector'])
            return ramp(nt, n.outputs['Fac'], [(0.0, (0.22, 0.24, 0.18)), (0.42, (0.22, 0.24, 0.18)), (0.43, (0.4, 0.38, 0.28)), (0.55, (0.4, 0.38, 0.28)), (0.56, (0.09, 0.1, 0.08)), (1.0, (0.09, 0.1, 0.08))])
        if kind == 'brush':
            mp.inputs['Scale'].default_value = (14, 40, 14)
            n = N.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 1.6; n.inputs['Detail'].default_value = 4; n.inputs['Distortion'].default_value = 2; L.new(v, n.inputs['Vector'])
            return ramp(nt, n.outputs['Fac'], [(0.0, (0.55, 0.5, 0.36)), (0.45, (0.55, 0.5, 0.36)), (0.46, (0.2, 0.26, 0.12)), (0.6, (0.2, 0.26, 0.12)), (0.61, (0.06, 0.05, 0.04)), (1.0, (0.06, 0.05, 0.04))])
        if kind == 'woodland':
            mp.inputs['Scale'].default_value = (28, 28, 28)
            n = N.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 1.2; n.inputs['Detail'].default_value = 3; L.new(v, n.inputs['Vector'])
            return ramp(nt, n.outputs['Fac'], [(0.0, (0.3, 0.25, 0.14)), (0.4, (0.3, 0.25, 0.14)), (0.41, (0.12, 0.2, 0.08)), (0.55, (0.12, 0.2, 0.08)), (0.56, (0.42, 0.38, 0.22)), (0.68, (0.42, 0.38, 0.22)), (0.69, (0.03, 0.03, 0.025)), (1.0, (0.03, 0.03, 0.025))])
        if kind == 'leopard':
            mp.inputs['Scale'].default_value = (55, 55, 55)
            vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'F1'; L.new(v, vo.inputs['Vector'])
            vo2 = N.new('ShaderNodeTexVoronoi'); vo2.feature = 'DISTANCE_TO_EDGE'; L.new(v, vo2.inputs['Vector'])
            spot = math_node(nt, 'LESS_THAN', vo.outputs['Distance'], 0.32); ring = math_node(nt, 'LESS_THAN', vo.outputs['Distance'], 0.42)
            base = mix(nt, (0.72, 0.5, 0.2), (0.06, 0.04, 0.02), ring); return mix(nt, base, (0.42, 0.24, 0.08), spot)
        if kind == 'zebra':
            mp.inputs['Scale'].default_value = (30, 30, 30)
            w = N.new('ShaderNodeTexWave'); w.wave_type = 'BANDS'; w.inputs['Scale'].default_value = 1.0; w.inputs['Distortion'].default_value = 6; w.inputs['Detail'].default_value = 3; L.new(v, w.inputs['Vector'])
            return ramp(nt, w.outputs['Fac'], [(0.0, (0.85, 0.84, 0.8)), (0.5, (0.85, 0.84, 0.8)), (0.51, (0.02, 0.02, 0.02)), (1.0, (0.02, 0.02, 0.02))])
        # géométrique
        mp.inputs['Scale'].default_value = (40, 40, 40)
        vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'F1'; vo.distance = 'CHEBYCHEV'; L.new(v, vo.inputs['Vector'])
        return ramp(nt, vo.outputs['Color'], [(0.0, (0.05, 0.07, 0.12)), (0.33, (0.05, 0.07, 0.12)), (0.34, (0.0, 0.45, 0.55)), (0.66, (0.0, 0.45, 0.55)), (0.67, (0.85, 0.3, 0.45)), (1.0, (0.85, 0.3, 0.45))])
    return f


def palm_png(path=os.path.join(TEXDIR, 'palmier-grave.png')):
    """gravure de palmier (blanc sur noir) pour les plaquettes de crosse"""
    if os.path.exists(path): return path
    from PIL import Image, ImageDraw
    im = Image.new('L', (512, 1024), 0); d = ImageDraw.Draw(im)
    for i in range(40):
        t = i / 39; x = 256 + 60 * math.sin(t * 2.2); y = 980 - t * 620
        d.ellipse((x - 18 + t * 6, y - 14, x + 18 - t * 6, y + 14), outline=255, width=6)
    cx, cy = 256 + 60 * math.sin(2.2), 360
    for k in range(7):
        a0 = -math.pi * 0.95 + k * math.pi * 0.95 / 3
        pts = []
        for j in range(12):
            t = j / 11; r = 30 + t * 220; a = a0 + 0.35 * math.sin(t * 2) ; pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r * 0.75 + t * t * 90))
        d.line(pts, fill=255, width=14)
        for j in range(2, 12):
            x, y = pts[j]; d.line((x, y, x + 20, y + 40), fill=255, width=6); d.line((x, y, x - 20, y + 40), fill=255, width=6)
    d.ellipse((cx - 60, 900, cx + 160, 1000), outline=255, width=8)
    im.save(path); return path


def revolver(finish=(0.85, 0.45, 0.58), grip='ivoire', scale=1.0, loc=(0, 0, 0), rot=(0, 0, 0), barrel=0.1, name='revolver'):
    """revolver à six coups (canon de 4 pouces) : carcasse, barillet cannelé, canon à bande et tenon d'éjecteur,
    pontet, chien ; plaquettes gravées d'un palmier ; finition colorée polie avec rinceaux gravés"""
    root = empty(name, loc, rot); root.scale = (scale, scale, scale)
    def eng(nt, vec):
        n = noise(nt, vec, 260, 6, 0.75, dist=2.5).outputs['Fac']
        return math_node(nt, 'GREATER_THAN', n, 0.62)
    M = mat('finition', finish, 0.3, metal=0.85, coat=0.4, coat_rough=0.12, bump={'kind': eng, 'strength': 0.22})
    Md = mat('finition_sombre', tuple(c * 0.25 for c in finish), 0.3, metal=1.0)
    frame = extrude2d('carcasse', [(0.064, 0.062), (0.064, -0.006), (0.034, -0.01), (0.006, -0.012), (-0.012, -0.012), (-0.022, -0.028), (-0.032, -0.098), (-0.07, -0.106),
                                   (-0.079, -0.092), (-0.064, -0.022), (-0.058, 0.028), (-0.044, 0.056), (-0.012, 0.064)], 0.028, 0.003)
    frame.rotation_euler = (math.pi / 2, 0, 0)
    win = box('fenetre', (0.044, 0.06, 0.04), (0.027, 0.0, 0.03), 0.002)
    boolean_cut(frame, [win]); assign(frame, M); parent(frame, root)
    cyl_ = cyl('barillet', 0.0185, 0.04, 96, (0.027, 0, 0.03), (0, math.pi / 2, 0), 0.0025)
    cuts = [cyl('chambre', 0.0048, 0.01, 24, (0.047, math.cos(i / 6 * math.tau) * 0.0115, 0.03 + math.sin(i / 6 * math.tau) * 0.0115), (0, math.pi / 2, 0)) for i in range(6)]
    cuts += [cyl('cannelure', 0.004, 0.028, 24, (0.025, math.cos((i + 0.5) / 6 * math.tau) * 0.0195, 0.03 + math.sin((i + 0.5) / 6 * math.tau) * 0.0195), (0, math.pi / 2, 0)) for i in range(6)]
    boolean_cut(cyl_, cuts); assign(cyl_, M); parent(cyl_, root)
    for i in range(6):
        a = i / 6 * math.tau
        rim_ = cyl('culot', 0.0047, 0.002, 24, (0.0068, math.cos(a) * 0.0115, 0.03 + math.sin(a) * 0.0115), (0, math.pi / 2, 0)); assign(rim_, M_brass()); parent(rim_, root)
    bar = cyl('canon', 0.0088, barrel, 64, (0.064 + barrel / 2, 0, 0.045), (0, math.pi / 2, 0), 0.0015); assign(bar, M); parent(bar, root)
    rib = box('bande', (barrel, 0.008, 0.008), (0.064 + barrel / 2, 0, 0.0545), 0.002); assign(rib, M); parent(rib, root)
    lug = cyl('tenon', 0.0072, barrel * 0.92, 48, (0.064 + barrel * 0.46, 0, 0.033), (0, math.pi / 2, 0), 0.0015); assign(lug, M); parent(lug, root)
    sight = box('guidon', (0.012, 0.003, 0.008), (0.064 + barrel - 0.008, 0, 0.061), 0.001); assign(sight, Md); parent(sight, root)
    muzzle = cyl('bouche', 0.0045, 0.002, 32, (0.0645 + barrel, 0, 0.045), (0, math.pi / 2, 0)); assign(muzzle, mat('ame', (0.004, 0.004, 0.004), 0.8)); parent(muzzle, root)
    guard = curve_tube('pontet', [(0.012, 0, -0.011, 1), (0.016, 0, -0.03, 1), (-0.004, 0, -0.04, 1), (-0.02, 0, -0.026, 1)], 0.0032, 16); assign(guard, M); parent(guard, root)
    trig = curve_tube('detente', [(0.0, 0, -0.008, 1), (0.002, 0, -0.02, 1), (-0.004, 0, -0.03, 1)], 0.0022, 12); assign(trig, Md); parent(trig, root)
    ham = extrude2d('chien', [(-0.044, 0.05), (-0.03, 0.058), (-0.034, 0.072), (-0.05, 0.078), (-0.062, 0.072), (-0.05, 0.064)], 0.008, 0.0015); ham.rotation_euler = (math.pi / 2, 0, 0)
    assign(ham, Md); parent(ham, root)
    # plaquettes : ivoire ou bois, gravure de palmier
    gp = [(-0.022, -0.026), (-0.031, -0.096), (-0.068, -0.103), (-0.075, -0.09), (-0.062, -0.024), (-0.045, -0.014)]
    img = palm_png()
    for sd in (-1, 1):
        g = extrude2d('plaquette', gp, 0.006, 0.0025); g.rotation_euler = (math.pi / 2, 0, 0); g.location = (0, sd * 0.016, 0)
        me = g.data; uv = me.uv_layers.new(name='UVMap')
        for poly in me.polygons:
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co; uv.data[li].uv = ((co.x + 0.08) / 0.065, (co.y + 0.108) / 0.1)
        base = (0.86, 0.8, 0.68) if grip == 'ivoire' else (0.32, 0.14, 0.06)
        def gfn(nt, p, img=img, base=base):
            tcn = nt.nodes.new('ShaderNodeTexCoord'); it = nt.nodes.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(img, check_existing=True); it.extension = 'CLIP'
            nt.links.new(tcn.outputs['UV'], it.inputs['Vector'])
            nt.links.new(mix(nt, base, tuple(c * 0.35 for c in base), it.outputs['Color']), p.inputs['Base Color'])
            b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.6; b.inputs['Distance'].default_value = 0.0005; b.invert = True
            nt.links.new(it.outputs['Color'], b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
        assign(g, mat('plaquette', base, 0.3, coat=0.7, coat_rough=0.1, sss=0.2 if grip == 'ivoire' else 0.0, base_fn=gfn)); parent(g, root)
    return root


ITEMS = {}


# ------------------------------------------------------------------ registre
TINTS = {'armee': (0.16, 0.17, 0.1), 'vert': (0.05, 0.16, 0.07), 'orange': (0.85, 0.28, 0.04), 'lspd': (0.06, 0.09, 0.2), 'rose': (0.85, 0.32, 0.5),
         'or': (1.0, 0.72, 0.3), 'platine': (0.82, 0.83, 0.85)}


def it_teintes():
    def build():
        bench('workshop', surface='mat', key_w=8)
        order = [('noir', None), ('armee', 'cerakote'), ('vert', 'cerakote'), ('orange', 'cerakote'), ('lspd', 'cerakote'), ('rose', 'cerakote'), ('or', 'metal'), ('platine', 'metal')]
        for i, (name, kind) in enumerate(order):
            fin = None if kind is None else {'kind': kind, 'rgb': TINTS[name]}
            piv, parts, ref = pistol('a', finish=fin)
            row, col = divmod(i, 4)
            piv.rotation_euler = (math.radians(-90), 0, math.radians(4 if row else -4))
            piv.location = (-0.36 + col * 0.24 + row * 0.1, 0.09 - row * 0.19, 0.0165)
        top_shot((0.05, -0.01, 0.0), 1.38, 22, -6, 50, 8.0)
    return build


def it_lunette():
    def build():
        bench('workshop', surface='walnut', key_w=9)
        piv, parts = rifle(scope=True)
        piv.rotation_euler = (math.radians(-90), 0, math.radians(-8)); piv.location = (0.05, 0.02, 0.034)
        for i in range(4):
            cartridge('rifle', loc=(0.3 + i * 0.022, -0.16, 0.0))
        top_shot((-0.12, 0.19, 0.02), 0.7, 28, -8, 60, 4.5)
    return build


def place_flat(piv, x, y, ang=0.0, z=None):
    """pose une arme couchée (pivot déjà orienté) à (x, y), tournée de ang degrés"""
    piv.rotation_euler = (math.radians(-90), 0, math.radians(ang)); piv.location = (x, y, piv.location.z if z is None else z)
    return piv


def it_pistol_grid(finishes, cols=3, pitch=(0.27, 0.2), tdist=1.25):
    def build():
        bench('workshop', surface='mat', key_w=8)
        n = len(finishes); rows = (n + cols - 1) // cols
        for i, fin in enumerate(finishes):
            piv, parts, ref = pistol('a', finish=fin)
            r, c = divmod(i, cols)
            x = (c - (cols - 1) / 2) * pitch[0] + (0.05 if r % 2 else 0.0); y = ((rows - 1) / 2 - r) * pitch[1]
            place_flat(piv, x, y, 3 if r % 2 else -3)
        top_shot((0.0, 0.0, 0.0), tdist, 20, -6, 50, 8.0)
    return build


def it_morgan():
    def build():
        bench('workshop', surface='walnut', key_w=7)
        # coffret de présentation : bois verni, velours sarcelle, couvercle ouvert
        wood = A.pbr('dark_wood', 5.0, coords='Object', coat=0.7, coat_rough=0.06, rough_mul=0.7)
        case = box('coffret', (0.62, 0.36, 0.06), (0, 0, 0.03), 0.008); assign(case, wood)
        cav = box('creux', (0.58, 0.32, 0.06), (0, 0, 0.05), 0.004); boolean_cut(case, [cav]); assign(case, wood)
        vel = box('velours', (0.58, 0.32, 0.01), (0, 0, 0.022), 0.003); assign(vel, mat('velours', (0.02, 0.12, 0.13), 0.9, sheen=1.0, sheen_tint=(0.4, 0.9, 0.9), bump={'scale': 3000, 'strength': 0.15}))
        lid = box('couvercle', (0.62, 0.36, 0.03), (0, 0.19, 0.2), 0.008); lid.rotation_euler = (math.radians(-100), 0, 0); lid.location = (0, 0.185, 0.2); assign(lid, wood)
        lv = box('velours_couvercle', (0.56, 0.3, 0.006), (0, 0.17, 0.2), 0.003); lv.rotation_euler = (math.radians(-100), 0, 0); lv.location = (0, 0.168, 0.2); assign(lv, vel.data.materials[0])
        r1 = revolver((0.8, 0.4, 0.52), 'ivoire', 1.0, (-0.06, 0.04, 0.042), (math.radians(-90), 0, math.radians(-4)), 0.1, 'hers')
        r2 = revolver((0.1, 0.48, 0.5), 'bois', 1.08, (0.0, -0.1, 0.043), (math.radians(-90), 0, math.radians(3)), 0.12, 'his')
        for i in range(6):
            cartridge('pistol', loc=(0.215, -0.11 + i * 0.03, 0.032), rot=(0, math.radians(90), 0))
        top_shot((0.0, -0.01, 0.03), 0.95, 26, -8, 50, 6.3)
    return build


def it_options():
    def build():
        bench('workshop', surface='mat', key_w=8)
        piv, parts, ref = pistol('a'); place_flat(piv, -0.02, 0.03, 0)
        suppressor(0.15, 0.0175, (0.12, 0.13, 0.0175), (0, math.radians(90), 0))
        holo_sight((-0.2, 0.15, 0.0), (0, 0, 0))
        foregrip((-0.22, -0.07, 0.016), (math.radians(-90), 0, math.radians(90)))
        weapon_light((0.12, -0.08, 0.0175), (0, 0, 0), beam=False)
        ext_mag(1.45, (-0.04, -0.12, 0.0105), (math.radians(-90), 0, math.radians(90)))
        compensator((0.27, -0.01, 0.014), (math.radians(-90), 0, math.radians(90)))
        drum_mag((-0.36, 0.05, 0.0275), (math.radians(90), 0, 0))
        top_shot((-0.04, 0.02, 0.0), 0.95, 16, -4, 50, 8.0)
    return build


def it_mag_ext():
    def build():
        bench('workshop', surface='mat', key_w=8)
        piv, parts, ref = pistol('a'); place_flat(piv, -0.09, 0.05, -4)
        ext_mag(1.0, (0.12, 0.05, 0.0105), (math.radians(-90), 0, math.radians(90)))
        ext_mag(1.55, (0.12, -0.06, 0.0105), (math.radians(-90), 0, math.radians(90)))
        for i in range(5):
            cartridge('pistol', loc=(-0.1 + i * 0.03, -0.12 + (i % 2) * 0.01, 0.005), rot=(math.radians(90), 0, 0.3 + i * 0.5))
        top_shot((0.02, -0.01, 0.0), 0.62, 22, -6, 50, 6.3)
    return build


def it_drum(double=False):
    def build():
        bench('workshop', surface='walnut', key_w=8)
        drum_mag((0, 0, 0.026), (math.radians(90), 0, math.radians(8)), double)
        for i in range(4):
            cartridge('pistol' if not double else 'rifle', loc=(0.16 + i * 0.022, -0.08, 0.0))
        shot((0.03, 0.0, 0.07), 0.62, 0.2, -22, 70, 4.5)
    return build


def it_holo():
    def build():
        bench('workshop', surface='mat', key_w=6)
        holo_sight((0, 0, 0.0), (0, 0, math.radians(20)))
        shot((0.0, 0.0, 0.045), 0.42, 0.06, -62, 85, 3.5)
    return build


def it_scopes2():
    def build():
        bench('workshop', surface='mat', key_w=8)
        scope_tube(0.22, 0.0127, 0.02, 0.019, (-0.11, 0.07, 0.022), (0, math.radians(90), 0), name='petite')
        scope_tube(0.38, 0.015, 0.03, 0.022, (-0.19, -0.07, 0.03), (0, math.radians(90), 0), name='grande')
        top_shot((0.0, 0.0, 0.02), 0.72, 28, -8, 50, 6.3)
    return build


def it_pistol_scope():
    def build():
        bench('workshop', surface='mat', key_w=8)
        piv, parts, ref = pistol('a'); place_flat(piv, 0.0, 0.0, 0)
        # lunette courte sur colliers, posée sur la glissière (couchée avec l'arme : le dessus de l'arme est vers +y)
        rail = ref['rail']
        sc = scope_tube(0.15, 0.0127, 0.018, 0.017, (rail.x - 0.075, 0.131 + 0.012 + 0.0127, 0.0165), (0, math.radians(90), 0), turrets=True, name='lunette_courte')
        mnt = box('embase', (0.07, 0.014, 0.018), (rail.x, 0.131 + 0.007, 0.0165), 0.002); assign(mnt, M_anod())
        for dx in (-0.025, 0.025):
            rg = lathe('collier', [(0.0128, -0.006), (0.0165, -0.006), (0.0165, 0.006), (0.0128, 0.006)], 64); rg.rotation_euler = (0, math.radians(90), 0); rg.location = (rail.x + dx, 0.131 + 0.012 + 0.0127, 0.0165); assign(rg, M_anod())
        top_shot((0.0, 0.03, 0.0), 0.62, 22, -6, 50, 6.3)
    return build


def it_nv():
    def build():
        bench('workshop', surface='mat', key_w=6, expo=-0.6)
        nv_scope((0.0, 0.0, 0.032), (0, math.radians(90), math.radians(20)))
        shot((0.08, 0.03, 0.04), 0.55, 0.1, -125, 70, 4.0)
    return build


def it_thermal():
    def build():
        bench('workshop', surface='mat', key_w=6, expo=-0.6)
        thermal_scope((0, 0, 0.0), (0, 0, math.radians(42)))
        shot((-0.02, -0.01, 0.05), 0.5, 0.14, -20, 60, 11.0)
    return build


def it_suppressor():
    def build():
        bench('workshop', surface='walnut', key_w=8)
        piv, parts, ref = pistol('a'); place_flat(piv, -0.08, 0.0, 0)
        mz = ref['muzzle']
        suppressor(0.16, 0.0175, (mz.x - 0.08 - 0.002, mz.z, 0.0165 + 0.0), (0, math.radians(90), 0))
        top_shot((0.04, 0.02, 0.0), 0.8, 22, -6, 50, 6.3)
    return build


def it_comp():
    def build():
        bench('workshop', surface='mat', key_w=8)
        piv, parts, ref = pistol('a'); place_flat(piv, -0.03, 0.0, 0)
        mz = ref['muzzle']
        c = compensator((mz.x - 0.03 - 0.001, mz.z, 0.0165), (math.radians(-90), 0, 0))
        top_shot((-0.0, 0.06, 0.0), 0.64, 22, -8, 60, 6.3)
    return build


def it_brakes():
    def build():
        bench('workshop', surface='mat', key_w=8)
        kinds = ['flat', 'tactical', 'fat', 'precision', 'heavy', 'slanted', 'split']
        for i, k in enumerate(kinds):
            brake_kind(k, (-0.21 + i * 0.07, 0.0, 0.0), (0, 0, 0.3 * i))
        shot((0.0, 0.0, 0.03), 0.7, 0.28, -10, 70, 6.3)
    return build


def it_barrel():
    def build():
        bench('workshop', surface='walnut', key_w=8)
        heavy_barrel((-0.25, -0.02, 0.0145), (0, math.radians(90), math.radians(4)))
        for i in range(3):
            cartridge('rifle', loc=(0.12 + i * 0.024, 0.09, 0.0))
        top_shot((0.0, 0.02, 0.0), 0.8, 30, -10, 50, 5.6)
    return build


def it_grip():
    def build():
        bench('workshop', surface='mat', key_w=7)
        foregrip((0, 0, 0), (0, 0, math.radians(20)))
        shot((0.0, 0.0, 0.06), 0.5, 0.1, -25, 85, 4.0)
    return build


def it_light():
    def build():
        bench('workshop', surface='mat', key_w=2.6, expo=-0.55, k=0.06, cam_k=0.08, rim_w=2.0)
        piv, parts, ref = pistol('a'); place_flat(piv, -0.12, 0.0, 0)
        mz = ref['muzzle']
        # lampe sous la carcasse, collier vers l'arme (+y), lentille au ras de la bouche
        lt = weapon_light((mz.x - 0.12 - 0.088, mz.z - 0.036, 0.0172), (math.radians(-90), 0, 0), beam=True, cone=True, spot_w=45.0)
        lt.scale = (0.88, 0.88, 0.88)
        wall = box('cible', (0.02, 1.2, 0.6), (0.7, 0.1, 0.3)); assign(wall, A.pbr('concrete_wall_008', 2.0, coords='Object'))
        shot((0.06, 0.05, 0.05), 0.62, 0.16, -50, 32, 8.0)
    return build


def it_laser():
    def build():
        bench('workshop', surface='mat', key_w=3, expo=-0.7, k=0.2)
        laser_module((-0.1, 0.0, 0.016), (0, 0, math.radians(12)))
        wall = box('cible', (0.02, 1.0, 0.5), (0.62, 0.15, 0.25)); assign(wall, A.pbr('concrete_wall_008', 2.0, coords='Object'))
        dot = sphere('impact', 0.004, (0.61, 0.13, 0.016)); assign(dot, emission('impact', (1.0, 0.05, 0.02), 60))
        point('lueur', (0.6, 0.12, 0.02), 0.03, (1.0, 0.1, 0.05), 0.003)
        shot((0.18, 0.04, 0.03), 0.8, 0.12, -58, 45, 5.6)
    return build


def it_ammo(tip=None, band=None, hollow=False, kind='rifle', steel=False, glow=None, cam=(0.42, 0.13)):
    def build():
        bench('workshop', surface='walnut', key_w=8)
        n = 7
        for i in range(n):
            cartridge(kind, tip=tip, band=band, hollow=hollow, loc=(-0.075 + i * (0.025 if kind == 'rifle' else 0.02), 0.03, 0.0), steel_case=steel)
        for i in range(3):
            cartridge(kind, tip=tip, band=band, hollow=hollow, loc=(-0.04 + i * 0.04, -0.06 - (i % 2) * 0.012, 0.006 if kind == 'rifle' else 0.005), rot=(math.radians(90), 0, 0.4 + i * 0.7), steel_case=steel)
        if glow:
            point('lueur', (0.0, 0.05, 0.09), 0.08, glow, 0.02)
        shot((0.0, 0.0, 0.03), cam[0], cam[1], -18, 85, 4.0)
    return build


def it_ammo_box():
    def build():
        bench('workshop', surface='walnut', key_w=8)
        root, obs = A.model('ammo_box'); root.location = (0.02, 0.12, 0.0); root.rotation_euler = (0, 0, math.radians(-12))
        for i in range(6):
            cartridge('rifle', loc=(-0.1 + i * 0.026, -0.06, 0.0))
        for i in range(4):
            cartridge('rifle', loc=(-0.08 + i * 0.05, -0.13, 0.006), rot=(math.radians(90), 0, 0.3 + i))
        shot((0.0, 0.0, 0.06), 0.85, 0.32, -18, 60, 5.0)
    return build


def it_conversion():
    def build():
        bench('workshop', surface='mat', key_w=8)
        root_, keep = _keep('service_pistol', '2k', lambda n: n.endswith('_a'))
        piv = empty('demonte')
        for o in keep:
            mw = o.matrix_world.copy(); o.parent = piv; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
            if 'slide' in o.name: o.matrix_basis = Matrix.Translation((0.04, 0.0, 0.11)) @ mw
        bpy.data.objects.remove(root_)
        piv.rotation_euler = (math.radians(-90), 0, 0); piv.location = (-0.02, -0.04, 0.0165)
        ext_mag(1.0, (0.2, -0.04, 0.0105), (math.radians(-90), 0, math.radians(90)))
        try:
            sd, _ = A.model('screwdriver'); sd.location = (0.12, -0.17, 0.0); sd.rotation_euler = (math.radians(90), 0, math.radians(80))
        except Exception:
            pass
        heavy_barrel((-0.24, -0.15, 0.0145), (0, math.radians(90), 0), 0.28)
        brake_kind('flat', (0.27, 0.12, 0.0), (0, 0, 0))
        top_shot((0.0, -0.06, 0.0), 0.72, 18, -6, 50, 7.1)
    return build


def it_melee():
    def build():
        bench('workshop', surface='mat', key_w=8)
        specs = [('baseball_bat', -0.36, 0.032, 0.0), ('machete', -0.18, 0.022, 0.03), ('hatchet', 0.0, 0.013, -0.02), ('crowbar_01', 0.16, 0.02, 0.02), ('stick_grenade', 0.33, 0.04, -0.03)]
        for aid, x, zz, rz in specs:
            r, obs = A.model(aid)
            kept = []
            for o in obs:
                if o.name.split('.')[0].endswith('LOD1'): bpy.data.objects.remove(o)
                else: kept.append(o)
            d = A.dims(kept)
            r.rotation_euler = (math.radians(90), 0, rz); r.location = (x, d.z / 2, zz)
        top_shot((0.0, 0.0, 0.0), 1.45, 14, -4, 50, 8.0)
    return build


def it_display():
    def build():
        bench('gear_store', surface='felt', key_w=5, expo=-0.4, k=0.4, cam_k=0.5)
        piv, parts, ref = pistol('a', finish={'kind': 'metal', 'rgb': TINTS['or']}); place_flat(piv, 0.0, 0.0, -8, z=0.0165)
        glass = box('vitrine', (0.6, 0.4, 0.004), (0, 0.0, 0.16)); assign(glass, mat('verre', (1, 1, 1), 0.0, trans=1.0, ior=1.5))
        for sd in (-1, 1):
            fr = box('montant', (0.6, 0.012, 0.16), (0, sd * 0.2, 0.08), 0.002); assign(fr, M_chrome(0.15))
        spot('vitrine_spot', (0.05, -0.1, 0.5), (0, 0, 0), 4.0, (1.0, 0.9, 0.75), 30, 0.5, 0.02)
        shot((0.0, 0.0, 0.03), 0.62, 0.42, -12, 60, 5.0)
    return build


def M_pegboard():
    def fn(nt, p):
        tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        fx = math_node(nt, 'SUBTRACT', math_node(nt, 'FRACT', math_node(nt, 'MULTIPLY', sep.outputs['X'], 39.37)), 0.5)
        fz = math_node(nt, 'SUBTRACT', math_node(nt, 'FRACT', math_node(nt, 'MULTIPLY', sep.outputs['Z'], 39.37)), 0.5)
        rr = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', fx, fx), math_node(nt, 'MULTIPLY', fz, fz)))
        hole = math_node(nt, 'LESS_THAN', rr, 0.16)
        n = noise(nt, tc.outputs['Object'], 8, 3, 0.5)
        base = ramp(nt, n.outputs['Fac'], [(0.3, (0.055, 0.056, 0.06)), (0.7, (0.07, 0.07, 0.075))])
        nt.links.new(mix(nt, base, (0.003, 0.003, 0.003), hole), p.inputs['Base Color'])
    return mat('panneau_perfore', (0.06, 0.06, 0.065), 0.55, base_fn=fn)


def it_store_wall():
    def build():
        A.hdri('gear_store', 0.5, res=HD2K('gear_store'), cam_hdri_k=0.6)
        bpy.context.scene.view_settings.exposure = -0.3
        wall = box('panneau', (2.2, 0.03, 1.6), (0, 0.32, 0.8)); assign(wall, M_pegboard())
        fins = [None, {'kind': 'cerakote', 'rgb': TINTS['armee']}, {'kind': 'metal', 'rgb': TINTS['platine']}, {'kind': 'cerakote', 'rgb': (0.04, 0.04, 0.045)}]
        for i in range(4):
            piv, parts, ref = pistol('a', flat=False, finish=fins[i])
            piv.location = (-0.42 + i * 0.28, 0.285, 1.0)
            for hx in (-0.05, 0.05):
                hk = cyl('crochet', 0.0025, 0.05, 12, (piv.location.x + hx, 0.3, 1.01), (math.pi / 2, 0, 0)); assign(hk, M_chrome(0.2))
            tag = box('etiquette', (0.05, 0.002, 0.03), (piv.location.x + 0.06, 0.29, 0.96), 0.001); assign(tag, mat('carton_blanc', (0.85, 0.84, 0.8), 0.8))
        for i in range(2):
            rp, rk = rifle(scope=(i == 0), flat=False)
            rp.location = (0.0, 0.29, 0.62 - i * 0.26)
            for hx in (-0.35, 0.3):
                hk = cyl('crochet', 0.003, 0.05, 12, (hx, 0.3, rp.location.z + 0.015), (math.pi / 2, 0, 0)); assign(hk, M_chrome(0.2))
        area('vitrine', (0.0, -1.0, 1.7), (0, 0.3, 0.7), 1.5, 90, (1.0, 0.92, 0.82))
        area('contre', (1.2, -0.3, 1.2), (0, 0.3, 0.7), 0.8, 30, (0.5, 0.75, 1.0))
        cam((0.12, -1.55, 0.78), (0.0, 0.3, 0.74), 40, 7.1)
    return build


def it_locker():
    def build():
        A.hdri('garage', 0.6, res=HD2K('garage'), cam_hdri_k=0.7)
        bpy.context.scene.view_settings.exposure = -0.3
        steel = mat('tole', (0.16, 0.2, 0.22), 0.45, metal=0.7, coat=0.3, coat_rough=0.3, bump={'scale': 300, 'strength': 0.04})
        fl = grid('sol', 8, 8, 2, 2); assign(fl, A.pbr('garage_floor', 0.4, res='2k', coords='Object'))
        bk = box('fond', (0.9, 0.02, 1.8), (0, 0.5, 0.9), 0.004); assign(bk, steel)
        for sd in (-1, 1):
            sw = box('flanc', (0.02, 0.5, 1.8), (sd * 0.45, 0.25, 0.9), 0.004); assign(sw, steel)
        for zz in (0.01, 1.79):
            tb = box('plateau', (0.9, 0.5, 0.02), (0, 0.25, zz), 0.004); assign(tb, steel)
        door = box('porte', (0.45, 0.02, 1.78), (0, 0, 0), 0.006); door.location = (-0.45 - 0.2, -0.12, 0.9); door.rotation_euler = (0, 0, math.radians(-118)); assign(door, steel)
        handle = box('poignee', (0.02, 0.04, 0.16), (-0.66, -0.37, 0.95), 0.006); assign(handle, M_chrome(0.2))
        sh = box('etagere', (0.86, 0.46, 0.012), (0, 0.26, 1.34)); assign(sh, steel)
        rack = box('ratelier', (0.8, 0.12, 0.04), (0, 0.38, 0.2), 0.006); assign(rack, steel)
        for i in range(3):
            rp, rk = rifle(scope=(i == 1), flat=False); rp.rotation_euler = (0, math.radians(-90), 0); rp.location = (-0.26 + i * 0.26, 0.38, 0.035 + 0.615)
        for i in range(2):
            piv, parts, ref = pistol('a'); piv.rotation_euler = (math.radians(-90), 0, math.radians(8 - i * 16)); piv.location = (-0.17 + i * 0.32, 0.25, 1.346 + 0.0165)
        bx = box('boite_munitions', (0.18, 0.1, 0.08), (0.0, 0.3, 1.39), 0.006); assign(bx, mat('boite', (0.12, 0.14, 0.08), 0.6))
        area('plafond', (0.2, -1.5, 2.6), (0, 0.25, 0.9), 1.5, 160, (1.0, 0.93, 0.85))
        area('interieur', (0.0, -0.4, 1.7), (0, 0.4, 0.8), 0.5, 25, (1.0, 0.95, 0.88))
        area('neon', (-1.5, 0.5, 1.5), (0, 0.25, 0.9), 0.6, 60, (0.4, 0.75, 1.0))
        cam((0.55, -2.4, 1.05), (-0.02, 0.25, 0.88), 45, 6.3)
    return build


ITEMS.update({
    'variante-morgan': it_morgan(),
    'plus-d-options': it_options(),
    'camouflages-mk2': it_pistol_grid([{'kind': 'pattern', 'pattern': camo_pattern(k)} for k in ('digital', 'brush', 'woodland', 'leopard', 'zebra', 'geo')]),
    'teintes': it_teintes(),
    'teintes-mk2': it_pistol_grid([{'kind': 'metal', 'rgb': c} for c in ((0.55, 0.36, 0.2), (0.1, 0.13, 0.2), (0.9, 0.9, 0.92), (0.8, 0.42, 0.28), (0.04, 0.04, 0.045), (0.6, 0.25, 0.42))]),
    'chargeur-etendu': it_mag_ext(),
    'chargeur-tambour': it_drum(False),
    'chargeur-caisson': it_drum(True),
    'lunette': it_lunette(),
    'viseur-holographique': it_holo(),
    'lunettes-mk2': it_scopes2(),
    'lunette-montee-pistolet': it_pistol_scope(),
    'lunette-nocturne': it_nv(),
    'lunette-thermique': it_thermal(),
    'silencieux': it_suppressor(),
    'compensateur': it_comp(),
    'freins-de-bouche': it_brakes(),
    'canon-lourd': it_barrel(),
    'poignee': it_grip(),
    'lampe-tactique': it_light(),
    'laser': it_laser(),
    'munitions-tracantes': it_ammo(tip=(0.75, 0.06, 0.03)),
    'munitions-incendiaires': it_ammo(tip=(0.05, 0.18, 0.55)),
    'munitions-perforantes': it_ammo(tip=(0.012, 0.012, 0.014)),
    'munitions-creuses': it_ammo(hollow=True, kind='pistol', cam=(0.32, 0.22)),
    'munitions-blindees': it_ammo(kind='pistol'),
    'munitions-explosives': it_ammo(tip=(0.85, 0.65, 0.05), band=(0.7, 0.05, 0.03)),
    'munitions-gta6-conf': it_ammo_box(),
    'conversion-mk2': it_conversion(),
    'casier-ammunation': it_store_wall(),
    'armes-exclusives': it_display(),
    'casier-garage': it_locker(),
    'melee-projectiles-conf': it_melee(),
})
