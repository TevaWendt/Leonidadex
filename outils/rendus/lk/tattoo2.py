# Tatouages v2 : le poste du tatoueur la nuit. Motifs : la planche de « flash » (dessin à l'encre sur papier) posée sur le
# plan de travail protégé, dermographe, godets d'encre. Zones : pièces de mannequin (même finition que les têtes des
# coiffures) portant des tatouages imprimés. Retrait : pièce à main laser et lunettes de protection.
import bpy, bmesh, math, random, os
from mathutils import Vector
from .core import *
from . import assets as A
from . import hair as H

TEX = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'tex')


def station(hd='neon_photostudio', expo=-0.45, key_w=7.0):
    A.hdri(hd, 0.35, res='2k', cam_hdri_k=0.55, rot=200)
    bpy.context.scene.view_settings.exposure = expo
    top = box('plan', (2.2, 1.6, 0.04), (0, 0.2, -0.02))
    assign(top, A.pbr('dark_wood', 1.8, coords='Object', coat=0.25, coat_rough=0.2, sat=0.8, val=0.85))
    area('lampe', (-0.25, -0.35, 0.6), (0.0, 0.0, 0.0), 0.45, key_w, (1.0, 0.9, 0.78))
    area('contre_rose', (-0.5, 0.55, 0.25), (0, 0, 0.02), 0.35, 2.4, (1.0, 0.3, 0.45))
    area('contre_bleu', (0.6, 0.45, 0.25), (0, 0, 0.02), 0.35, 2.0, (0.35, 0.55, 1.0))
    return top


def M_paper_art(img, tint=(0.88, 0.8, 0.64), age=0.5):
    """papier crème légèrement vieilli, dessin imprimé (encre posée : légère diffusion, couleurs un peu passées)"""
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 18, 4, 0.6); n2 = noise(nt, v, 220, 3, 0.6)
        base = ramp(nt, math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', n.outputs['Fac'], 0.8), math_node(nt, 'MULTIPLY', n2.outputs['Fac'], 0.2)),
                    [(0.3, tuple(x * (1 - 0.12 * age) for x in tint)), (0.6, tint), (0.8, tuple(min(1, x * 1.03) for x in tint))])
        uv = nt.nodes.new('ShaderNodeTexCoord')
        it = nt.nodes.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(os.path.join(TEX, img), check_existing=True); it.extension = 'CLIP'; it.interpolation = 'Cubic'
        nt.links.new(uv.outputs['UV'], it.inputs['Vector'])
        hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 0.85; hs.inputs['Value'].default_value = 0.92
        nt.links.new(it.outputs['Color'], hs.inputs['Color'])
        ink = mix(nt, base, hs.outputs['Color'], 1.0, 'MULTIPLY')
        m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; nt.links.new(it.outputs['Alpha'], m2.inputs[0]); nt.links.new(base, m2.inputs[6]); nt.links.new(ink, m2.inputs[7])
        nt.links.new(m2.outputs[2], p.inputs['Base Color'])
    return mat('papier', tint, 0.82, sss=0.2, sss_radius=(1, 0.9, 0.75), sss_scale=0.002, base_fn=fn, bump={'scale': 700, 'strength': 0.08})


def paper_sheet(img, w=0.21, h=0.28, loc=(0, 0, 0), rot=0.0, curl=0.004, seed=1, art=0.86):
    """feuille (format A4) : coins légèrement relevés ; le dessin occupe « art » de la largeur, centré"""
    R = random.Random(seed)
    ob = grid('feuille', w, h, 60, 80)
    me = ob.data
    uv = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; co = me.vertices[vi].co
            u = (co.x / w) / art + 0.5; v = (co.y / w) / art + 0.5 + 0.02
            uv.data[li].uv = (u, v)
    for v in me.vertices:
        x, y = v.co.x, v.co.y
        cx, cy = abs(x) / (w / 2), abs(y) / (h / 2)
        r = max(cx, cy * 0.9)
        v.co.z = 0.0004 + curl * (max(0.0, r - 0.82) / 0.18) ** 2 * (0.5 + 0.5 * min(cx, cy))
    solidify(ob, 0.0003, 0)
    ob.location = loc; ob.rotation_euler = (0, 0, rot)
    assign(ob, M_paper_art(img))
    return ob


def pen(loc=(0, 0, 0), rot=0.0, color=(0.03, 0.03, 0.035)):
    """dermographe stylo (rotatif) : corps anodisé, prise caoutchouc moletée, cartouche transparente, câble"""
    root = empty('dermographe', loc, (0, 0, rot))
    body = lathe('corps', [(0.0, 0.0), (0.011, 0.0), (0.0125, 0.004), (0.0125, 0.085), (0.0115, 0.09), (0.0, 0.09)], 64)
    body.rotation_euler = (0, math.pi / 2, 0); body.location = (0.0, 0, 0.0125); assign(body, mat('anodise', color, 0.32, metal=0.7, coat=0.3, coat_rough=0.2)); parent(body, root)
    ring = cyl('bague', 0.0128, 0.006, 64, (0.05, 0, 0.0125), (0, math.pi / 2, 0)); assign(ring, M_chrome(0.15, (0.85, 0.65, 0.4))); parent(ring, root)
    grip = lathe('prise', [(0.0, 0.0), (0.0105, 0.0), (0.0115, 0.004), (0.0115, 0.034), (0.009, 0.042), (0.0, 0.042)], 64)
    grip.rotation_euler = (0, -math.pi / 2, 0); grip.location = (0.0, 0, 0.0125)
    assign(grip, mat('caoutchouc', (0.02, 0.02, 0.022), 0.7, bump={'kind': 'voronoi', 'scale': 900, 'strength': 0.4})); parent(grip, root)
    cart = lathe('cartouche', [(0.0, 0.0), (0.0075, 0.0), (0.0075, 0.02), (0.003, 0.03), (0.0012, 0.034), (0.0, 0.035)], 48)
    cart.rotation_euler = (0, -math.pi / 2, 0); cart.location = (-0.042, 0, 0.0125); assign(cart, mat('cartouche', (0.9, 0.92, 0.95), 0.05, trans=0.9, ior=1.49)); parent(cart, root)
    cable = curve_tube('cable', [(0.09, 0, 0.0125, 1), (0.14, 0.02, 0.006, 1), (0.22, -0.01, 0.003, 1), (0.3, 0.05, 0.003, 1), (0.38, 0.02, 0.003, 1)], 0.0022, 16)
    assign(cable, mat('cable', (0.015, 0.015, 0.017), 0.4, coat=0.4)); parent(cable, root)
    return root


def ink_caps(loc=(0, 0, 0), colors=((0.02, 0.02, 0.02), (0.55, 0.03, 0.04), (0.04, 0.3, 0.12), (0.8, 0.55, 0.05))):
    root = empty('godets', loc)
    for i, c in enumerate(colors):
        x, y = (i % 2) * 0.02, (i // 2) * 0.02
        cap = lathe('godet', [(0.0, 0.0), (0.006, 0.0), (0.0078, 0.012), (0.0071, 0.012), (0.0056, 0.0018), (0.0, 0.0018)], 40); cap.location = (x, y, 0)
        assign(cap, mat('godet', (0.9, 0.9, 0.9), 0.25, trans=0.6, ior=1.45)); parent(cap, root)
        ink = cyl('encre', 0.0066, 0.0015, 40, (x, y, 0.0085)); assign(ink, mat('encre', c, 0.05, coat=1.0, coat_rough=0.02)); parent(ink, root)
    return root


def flash(img, seed=1):
    def b():
        station()
        paper_sheet(f'tat-{img}.png', loc=(0.0, 0.02, 0.0), rot=math.radians(-4 + seed % 3 * 3), seed=seed)
        # plan de travail : film de protection, dermographe et godets
        pen((0.1, -0.11, 0.0), math.radians(18))
        ink_caps((-0.17, -0.1, 0.0))
        cam((0.04, -0.34, 0.42), (0.0, 0.0, 0.0), 50, 5.6)
    return b


def inked(base, decals, rough=0.42, sss=0.1, coat=0.12, name='peau_mannequin'):
    """matière de mannequin (teinte chair satinée) portant des tatouages : decals = [(image, centre, (su, sv), rot, axe, opacité)]
    projetées dans les coordonnées de l'objet ; l'encre est un peu passée et absorbée par la surface"""
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 60, 3, 0.5)
        cur = ramp(nt, n.outputs['Fac'], [(0.3, tuple(x * 0.95 for x in base)), (0.7, tuple(min(1, x * 1.04) for x in base))])
        for (img, ctr, size, rot, axis, op) in decals:
            tc = nt.nodes.new('ShaderNodeTexCoord')
            sub = nt.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = ctr
            nt.links.new(tc.outputs['Object'], sub.inputs[0])
            sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(sub.outputs['Vector'], sep.inputs[0])
            u_, v_ = {'Z': ('X', 'Y'), 'Y': ('X', 'Z'), 'X': ('Y', 'Z'), '-X': ('Y', 'Z')}[axis]
            u0, v0 = sep.outputs[u_], sep.outputs[v_]
            cr, sr = math.cos(rot), math.sin(rot)
            u1 = math_node(nt, 'SUBTRACT', math_node(nt, 'MULTIPLY', u0, cr), math_node(nt, 'MULTIPLY', v0, sr))
            v1 = math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', u0, sr), math_node(nt, 'MULTIPLY', v0, cr))
            uu = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', u1, size[0]), 0.5); vv = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', v1, size[1]), 0.5)
            comb = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(uu, comb.inputs[0]); nt.links.new(vv, comb.inputs[1])
            it = nt.nodes.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(os.path.join(TEX, img), check_existing=True); it.extension = 'CLIP'; it.interpolation = 'Cubic'
            nt.links.new(comb.outputs[0], it.inputs['Vector'])
            hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 0.8; hs.inputs['Value'].default_value = 0.85; nt.links.new(it.outputs['Color'], hs.inputs['Color'])
            ink = mix(nt, cur, hs.outputs['Color'], 1.0, 'MULTIPLY')
            # côté opposé de la projection : pas d'encre
            fac = math_node(nt, 'MULTIPLY', it.outputs['Alpha'], op)
            if axis == 'X': fac = math_node(nt, 'MULTIPLY', fac, math_node(nt, 'GREATER_THAN', sep.outputs['X'], -0.02))
            if axis == '-X': fac = math_node(nt, 'MULTIPLY', fac, math_node(nt, 'LESS_THAN', sep.outputs['X'], 0.02))
            m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; nt.links.new(fac, m2.inputs[0]); nt.links.new(cur, m2.inputs[6]); nt.links.new(ink, m2.inputs[7])
            cur = m2.outputs[2]
        nt.links.new(cur, p.inputs['Base Color'])
    return mat(name, base, rough, sss=sss, sss_radius=(1.0, 0.45, 0.25), sss_scale=0.003, coat=coat, coat_rough=0.3, spec=0.4, base_fn=fn, bump={'scale': 2200, 'strength': 0.02})


def M_lase(): return mat('blanc_medical', (0.86, 0.87, 0.88), 0.3, coat=0.5, coat_rough=0.15)


def removal():
    def b():
        station()
        paper_sheet('tat-skull.png', loc=(-0.06, 0.06, 0.0), rot=math.radians(-6), seed=4)
        root = empty('laser', (0.11, -0.08, 0.02), (0, math.radians(90), math.radians(30)))
        body = cyl('piece', 0.018, 0.17, 64, (0, 0, 0.0), (0, 0, 0), 0.004); assign(body, M_lase()); parent(body, root)
        grip = cyl('prise', 0.0185, 0.05, 64, (0, 0, -0.03), (0, 0, 0), 0.002); assign(grip, M_rubber((0.03, 0.03, 0.035))); parent(grip, root)
        tip = lathe('embout', [(0.0, 0.0), (0.012, 0.0), (0.008, 0.035), (0.0055, 0.04), (0.0, 0.04)], 48); tip.location = (0, 0, 0.085); assign(tip, M_chrome(0.15)); parent(tip, root)
        led = cyl('voyant', 0.0186, 0.006, 64, (0, 0, 0.05)); assign(led, emission('led', (0.2, 1.0, 0.55), 5)); parent(led, root)
        cable = curve_tube('cable', [(0.11 - 0.09, -0.08 - 0.05, 0.02, 1), (-0.05, -0.2, 0.01, 1), (-0.2, -0.15, 0.006, 1)], 0.004, 16); assign(cable, M_rubber((0.85, 0.86, 0.88)))
        # lunettes de protection (verres verts)
        gl = empty('lunettes', (-0.15, -0.12, 0.0), (0, 0, math.radians(15)))
        for sd in (-1, 1):
            ln = sphere('verre', 0.03, (sd * 0.036, 0, 0.022), (1.0, 0.45, 0.8)); assign(ln, mat('filtre', (0.05, 0.4, 0.15), 0.05, trans=0.7, coat=1.0, ior=1.5)); parent(ln, gl)
        br = box('pont', (0.03, 0.012, 0.01), (0, 0, 0.03), 0.004); assign(br, M_plastic((0.03, 0.03, 0.03), 0.3)); parent(br, gl)
        for sd in (-1, 1):
            tm = box('branche', (0.006, 0.12, 0.006), (sd * 0.066, 0.06, 0.02), 0.002); assign(tm, M_plastic((0.03, 0.03, 0.03), 0.3)); parent(tm, gl)
        cam((0.06, -0.42, 0.36), (0.0, -0.03, 0.0), 50, 5.6)
    return b


def mannequin_arm(tone, decals, mirror=False):
    """avant-bras de présentation (mannequin satiné) posé à plat sur le plan, coupé net au coude et au poignet"""
    from .tattoo import loft
    from .head2 import SKIN
    secs = [(-0.01, 0.026, 0.019, 0.0), (0.0, 0.029, 0.02, 0.0), (0.05, 0.033, 0.023, 0.001), (0.1, 0.037, 0.027, 0.003), (0.15, 0.042, 0.032, 0.005), (0.2, 0.045, 0.035, 0.006),
            (0.25, 0.045, 0.036, 0.006), (0.28, 0.044, 0.035, 0.005)]
    ob = loft('avantbras', secs); assign(ob, inked(SKIN[tone], decals)); ob.location = (-0.14, 0, 0.034)
    if mirror: ob.scale = (1, -1, 1)
    for x, r in ((-0.01, 0.0265), (0.28, 0.0445)):
        cap = cyl('coupe', r * 0.98, 0.002, 48, (-0.14 + x, 0, 0.034), (0, math.pi / 2, 0)); assign(cap, mat('coupe', (0.04, 0.04, 0.045), 0.5))
    return ob


def zone_arm(side='g'):
    def b():
        station()
        if side == 'g':
            dec = [('tat-dagger.png', (0.06, 0.0, 0.0), (0.1, 0.1), math.pi / 2, 'Z', 0.95), ('tat-flowers.png', (0.15, 0.0, 0.0), (0.11, 0.11), math.pi / 2, 'Z', 0.95)]
        else:
            dec = [('tat-skull.png', (0.07, 0.0, 0.0), (0.1, 0.1), math.pi / 2, 'Z', 0.95), ('tat-heart.png', (0.17, 0.0, 0.0), (0.11, 0.11), math.pi / 2, 'Z', 0.95)]
        mannequin_arm(1 if side == 'g' else 3, dec, side == 'd')
        pen((0.12, 0.13, 0.0), math.radians(160)); ink_caps((-0.2, 0.12, 0.0))
        cam((-0.03, -0.26, 0.26), (-0.03, 0.0, 0.05), 50, 4.0)
    return b


def zone_leg():
    def b():
        from .head2 import SKIN
        from .tattoo import loft
        station()
        secs = [(-0.02, 0.03, 0.03, 0.0), (0.0, 0.032, 0.032, 0.0), (0.08, 0.038, 0.038, 0.002), (0.16, 0.048, 0.048, 0.006), (0.24, 0.054, 0.056, 0.01), (0.31, 0.052, 0.052, 0.008), (0.37, 0.046, 0.046, 0.004)]
        leg = loft('mollet', secs)
        dec = [('tat-hood.png', (0.23, 0.0, 0.0), (0.12, 0.12), math.pi / 2, 'Z', 0.95), ('tat-crown.png', (0.1, 0.0, 0.0), (0.09, 0.09), math.pi / 2, 'Z', 0.9)]
        assign(leg, inked(SKIN[2], dec)); leg.location = (-0.18, 0.0, 0.052)
        foot_cap = cyl('coupe', 0.031, 0.002, 48, (-0.2, 0, 0.052), (0, math.pi / 2, 0)); assign(foot_cap, mat('coupe', (0.04, 0.04, 0.045), 0.5))
        pen((0.14, 0.14, 0.0), math.radians(160))
        cam((0.0, -0.3, 0.3), (-0.0, 0.0, 0.06), 50, 4.0)
    return b


def zone_torso(img, tone=1):
    def b():
        from .food2 import torso_form, torso_r
        from .head2 import SKIN
        A.hdri('neon_photostudio', 0.4, res='2k', cam_hdri_k=0.55, rot=200)
        bpy.context.scene.view_settings.exposure = -0.35
        fl = grid('sol', 6, 6, 2, 2); fl.location = (0, 0, -0.93); assign(fl, A.pbr('dark_wood', 1.5, coords='Object'))
        r = torso_form(SKIN[tone])
        body = [o for o in r.children if o.name.startswith('buste')][0]
        assign(body, inked(SKIN[tone], [(img, (0.12, 0.0, 0.3), (0.26, 0.26), 0.0, 'X', 0.95)]))
        area('cle', (0.9, -0.6, 0.8), (0, 0, 0.25), 0.8, 30, (1.0, 0.92, 0.84))
        area('rose', (-0.6, -0.8, 0.5), (0, 0, 0.25), 0.5, 10, (1.0, 0.3, 0.45))
        area('bleu', (-0.5, 0.8, 0.5), (0, 0, 0.25), 0.5, 10, (0.35, 0.55, 1.0))
        cam((1.05, -0.45, 0.38), (0.0, 0.0, 0.27), 60, 5.6)
    return b


def zone_head(neck=False):
    def b():
        from . import head2, hair as H
        head2.install()
        H.barber(-0.19, 'neon_photostudio')
        tone = 2 if neck else 1
        root, head, bz = head2.mannequin(tone)
        if not neck:
            assign(head, inked(head2.SKIN[tone], [('tat-skull.png', (-0.01, 0.0, 0.07), (0.085, 0.085), 0.0, 'Y', 0.92)]))
            strands = H.S_short(head, lambda p: 0.0006, 30000, 0.004, 4); H.hair_object('ras', strands, 0.85, 0.2)
            cam((-0.12, -0.75, 0.14), (-0.01, 0, 0.04), 85, 7.1)
        else:
            neckob = [o for o in bpy.data.objects if o.name.startswith('cou')][0]
            assign(neckob, inked(head2.SKIN[tone], [('tat-heart.png', (0.0, 0.0, -0.1), (0.07, 0.07), 0.0, 'Y', 0.95)]))
            strands = H.S_short(head, H.fade_len(0.012), 60000, 0.0025, 3, Vector((-0.25, 0, 0))); H.hair_object('cheveux', strands, 0.95, 0.1)
            head2.paint_scalp(head, [(strands, H.mel_rgb('noir'))])
            cam((0.15, -0.8, -0.04), (0.0, 0, -0.06), 85, 6.3)
    return b


ITEMS = {
    'vice-city-style-tatouages': flash('palm', 3),
    'gta5-smiley': flash('smiley', 4),
    'gta5-dague': flash('dagger', 1),
    'gta5-eye-catcher': flash('eye', 5),
    'gta5-dope-skull': flash('skull', 2),
    'gta5-fresque-florale': flash('flowers', 6),
    'gta5-dragon-chinois': flash('dragon', 7),
    'gta5-families-kings': flash('crown', 8),
    'gta5-family-is-forever': flash('heart', 9),
    'gta5-chamberlain': flash('hood', 10),
    'gta5-retrait': removal(),
    'gta5-zone-bras-gauche': zone_arm('g'),
    'gta5-zone-bras-droit': zone_arm('d'),
    'gta5-zone-jambes': zone_leg(),
    'gta5-zone-tete': zone_head(False),
    'zone-visage-cou': zone_head(True),
    'zone-torse-gta6': zone_torso('tat-palm.png', 2),
    'gta5-zone-torse': zone_torso('tat-dragon.png', 1),
}
