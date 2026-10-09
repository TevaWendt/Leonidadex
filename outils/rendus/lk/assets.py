# Leonidakit — ressources CC0 de Poly Haven côté Blender : éclairage HDRI, matières PBR scannées, modèles scannés.
# Les fichiers sont téléchargés par fetch.py (même dossier que run.py) ; tout est CC0 (domaine public).
import bpy, math, os, subprocess, sys
from mathutils import Vector
from . import core

ROOT = os.environ.get('LK_RESSOURCES') or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ressources')
FETCH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'fetch.py')


def _fetch(spec):
    subprocess.run([sys.executable or 'python3', FETCH, spec], check=True, stdout=subprocess.DEVNULL)


def hdri_path(aid, res='2k'):
    p = f'{ROOT}/hdri/{aid}_{res}.hdr'
    if not os.path.exists(p): _fetch(f'hdri:{aid}@{res}')
    return p


def hdri(aid, strength=1.0, rot=0.0, res='2k', cam_rgb=None, cam_k=None, cam_hdri_k=None, sat=1.0, tint=None):
    """éclairage et reflets par une photo HDRI ; ce que voit la caméra : la même photo (atténuée par cam_hdri_k),
    ou une couleur unie (cam_rgb), pour garder la maîtrise du fond"""
    w = bpy.context.scene.world; w.use_nodes = True; nt = w.node_tree; N = nt.nodes; L = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputWorld')
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, 0, math.radians(rot))
    L.new(tc.outputs['Generated'], mp.inputs['Vector'])
    env = N.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(hdri_path(aid, res), check_existing=True)
    L.new(mp.outputs['Vector'], env.inputs['Vector'])
    col = env.outputs['Color']
    if sat != 1.0 or tint is not None:
        hs = N.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = sat
        L.new(col, hs.inputs['Color']); col = hs.outputs['Color']
        if tint is not None:
            mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
            L.new(col, mx.inputs[6]); mx.inputs[7].default_value = (*tint, 1); col = mx.outputs[2]
    bg = N.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = strength; L.new(col, bg.inputs['Color'])
    if cam_rgb is None and cam_hdri_k is None:
        L.new(bg.outputs[0], out.inputs[0]); return
    bg2 = N.new('ShaderNodeBackground')
    if cam_rgb is not None:
        bg2.inputs['Color'].default_value = (*cam_rgb, 1); bg2.inputs['Strength'].default_value = cam_k if cam_k is not None else 1.0
    else:
        L.new(col, bg2.inputs['Color']); bg2.inputs['Strength'].default_value = cam_hdri_k
    lp = N.new('ShaderNodeLightPath'); ms = N.new('ShaderNodeMixShader')
    L.new(lp.outputs['Is Camera Ray'], ms.inputs[0]); L.new(bg.outputs[0], ms.inputs[1]); L.new(bg2.outputs[0], ms.inputs[2])
    L.new(ms.outputs[0], out.inputs[0])


def tex_maps(aid, res='1k'):
    d = f'{ROOT}/tex/{aid}_{res}'
    if not os.path.isdir(d) or not os.listdir(d): _fetch(f'tex:{aid}@{res}')
    maps = {}
    for f in os.listdir(d):
        if f.endswith('.part'): continue
        stem = f.rsplit('.', 1)[0]
        short = stem[len(aid) + 1:].rsplit('_', 1)[0]
        maps[short] = os.path.join(d, f)
    return maps


def _img(path, data=False):
    im = bpy.data.images.load(path, check_existing=True)
    if data:
        im.colorspace_settings.name = 'Non-Color'
    return im


def pbr(aid, scale=1.0, res='1k', coords='UV', box=0.25, rot=0.0, offset=(0, 0, 0), tint=None, tint_k=1.0, hue=0.5, sat=1.0, val=1.0,
        rough_mul=1.0, rough_add=0.0, normal_k=1.0, bump_k=0.0, metal=None, coat=0.0, coat_rough=0.05, sheen=0.0, spec=0.5,
        sss=0.0, sss_radius=(1, 0.4, 0.2), sss_scale=0.005, name=None, alpha=False, use_ao=False, trans=0.0):
    """matière physique à partir d'une texture scannée (couleur, rugosité, relief) ; coords 'UV' ou 'Object' (projection
    sur trois axes, fondu box) ; tint multiplie la couleur, hue/sat/val la décalent"""
    maps = tex_maps(aid, res)
    m = bpy.data.materials.new(name or aid); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    p = N.get('Principled BSDF')
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale, scale, scale) if not hasattr(scale, '__len__') else scale
    mp.inputs['Rotation'].default_value = (0, 0, math.radians(rot)); mp.inputs['Location'].default_value = offset
    L.new(tc.outputs['UV' if coords == 'UV' else 'Object'], mp.inputs['Vector'])

    def tex(path, data=False):
        t = N.new('ShaderNodeTexImage'); t.image = _img(path, data); t.interpolation = 'Cubic'
        if coords != 'UV':
            t.projection = 'BOX'; t.projection_blend = box
        L.new(mp.outputs['Vector'], t.inputs['Vector']); return t

    if 'diff' in maps:
        c = tex(maps['diff']).outputs['Color']
        if hue != 0.5 or sat != 1.0 or val != 1.0:
            hs = N.new('ShaderNodeHueSaturation'); hs.inputs['Hue'].default_value = hue; hs.inputs['Saturation'].default_value = sat
            hs.inputs['Value'].default_value = val; L.new(c, hs.inputs['Color']); c = hs.outputs['Color']
        if tint is not None:
            mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = tint_k
            L.new(c, mx.inputs[6]); mx.inputs[7].default_value = (*tint, 1); c = mx.outputs[2]
        if use_ao and 'ao' in maps:
            ao = tex(maps['ao'], True)
            mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 0.8
            L.new(c, mx.inputs[6]); L.new(ao.outputs['Color'], mx.inputs[7]); c = mx.outputs[2]
        L.new(c, p.inputs['Base Color'])
    elif tint is not None:
        p.inputs['Base Color'].default_value = (*tint, 1)
    if 'rough' in maps:
        r = tex(maps['rough'], True).outputs['Color']
        if rough_mul != 1.0 or rough_add != 0.0:
            mm = N.new('ShaderNodeMath'); mm.operation = 'MULTIPLY_ADD'; mm.use_clamp = True
            L.new(r, mm.inputs[0]); mm.inputs[1].default_value = rough_mul; mm.inputs[2].default_value = rough_add; r = mm.outputs[0]
        L.new(r, p.inputs['Roughness'])
    elif 'arm' in maps:
        sep = N.new('ShaderNodeSeparateColor'); L.new(tex(maps['arm'], True).outputs['Color'], sep.inputs[0])
        L.new(sep.outputs[1], p.inputs['Roughness'])
    if metal is not None:
        p.inputs['Metallic'].default_value = metal
    elif 'metal' in maps:
        L.new(tex(maps['metal'], True).outputs['Color'], p.inputs['Metallic'])
    nrm = None
    if 'nor' in maps and normal_k > 0:
        nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = normal_k
        if coords != 'UV':
            nm.space = 'TANGENT'
        L.new(tex(maps['nor'], True).outputs['Color'], nm.inputs['Color']); nrm = nm.outputs['Normal']
    if bump_k > 0 and 'disp' in maps:
        b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = bump_k; b.inputs['Distance'].default_value = 0.002
        L.new(tex(maps['disp'], True).outputs['Color'], b.inputs['Height'])
        if nrm is not None: L.new(nrm, b.inputs['Normal'])
        nrm = b.outputs['Normal']
    if nrm is not None:
        L.new(nrm, p.inputs['Normal'])
    if alpha and 'alpha' in maps:
        L.new(tex(maps['alpha'], True).outputs['Color'], p.inputs['Alpha'])
    p.inputs['Coat Weight'].default_value = coat; p.inputs['Coat Roughness'].default_value = coat_rough
    p.inputs['Sheen Weight'].default_value = sheen; p.inputs['Specular IOR Level'].default_value = spec
    p.inputs['Transmission Weight'].default_value = trans
    if sss > 0:
        p.inputs['Subsurface Weight'].default_value = sss; p.inputs['Subsurface Radius'].default_value = sss_radius
        p.inputs['Subsurface Scale'].default_value = sss_scale
    return m


def model(aid, res='1k', name=None):
    """ajoute à la scène les objets d'un modèle scanné ; renvoie (racine, objets) — racine = vide parent, posé au sol
    (z min = 0), centré en x/y, à l'échelle réelle du modèle"""
    p = f'{ROOT}/models/{aid}_{res}/{aid}_{res}.blend'
    if not os.path.exists(p): _fetch(f'model:{aid}@{res}')
    with bpy.data.libraries.load(p, link=False, relative=False) as (src, dst):
        dst.objects = list(src.objects)
    obs = [o for o in dst.objects if o is not None]
    sc = bpy.context.scene
    for o in obs:
        sc.collection.objects.link(o)
    for im in bpy.data.images:
        if im.filepath.startswith('//'):
            im.filepath = os.path.join(os.path.dirname(p), im.filepath[2:]); im.reload()
    meshes = [o for o in obs if o.type == 'MESH']
    root = core.empty(name or aid)
    tops = [o for o in obs if o.parent is None or o.parent not in obs]
    bpy.context.view_layer.update()
    lo, hi = bbox(meshes)
    c = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for o in tops:
        o.location = o.location - c
        o.parent = root
    bpy.context.view_layer.update()
    return root, obs


def bbox(obs):
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    for o in obs:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z))); hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
    return lo, hi


def dims(obs):
    lo, hi = bbox(obs); return hi - lo
