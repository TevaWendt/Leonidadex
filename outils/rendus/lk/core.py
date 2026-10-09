# Leonidakit — rendus réalistes des catalogues (v7.77), moteur Cycles de Blender : noyau commun.
# Scène vierge, réglages de rendu, matières physiques à textures procédurales, géométrie, lumières, caméra à profondeur de
# champ, finition photo (halo des néons, aberration, vignette, grain). Aucun texte, aucune marque, aucune image extérieure.
import bpy, bmesh, math, random, addon_utils
from mathutils import Vector, Matrix, Euler, Quaternion

RES = (960, 600)

def reset(samples=64, res=RES, thresh=0.04, pct=100):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    addon_utils.enable("cycles", default_set=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    cy = sc.cycles
    cy.device = 'CPU'; cy.samples = samples; cy.use_adaptive_sampling = True; cy.adaptive_threshold = thresh; cy.adaptive_min_samples = 16
    cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
    try: cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    except Exception: pass
    cy.max_bounces = 6; cy.diffuse_bounces = 2; cy.glossy_bounces = 3; cy.transmission_bounces = 6; cy.transparent_max_bounces = 8; cy.volume_bounces = 1
    try: cy.use_light_tree = True
    except Exception: pass
    cy.sample_clamp_indirect = 8.0; cy.blur_glossy = 0.6; cy.caustics_reflective = False; cy.caustics_refractive = False
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = pct
    sc.render.threads_mode = 'AUTO'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'; sc.render.image_settings.color_depth = '16'
    vs = sc.view_settings; vs.view_transform = 'AgX'; vs.look = 'AgX - Medium High Contrast'; vs.exposure = 0.0; vs.gamma = 1.0
    w = bpy.data.worlds.new('monde'); sc.world = w
    world_color((0.006, 0.006, 0.012), 1.0)
    return sc

def world_color(rgb, k=1.0):
    w = bpy.context.scene.world
    nt = w.node_tree if w.node_tree else None
    if nt is None:
        w.use_nodes = True; nt = w.node_tree
    bg = nt.nodes.get('Background') or nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Color'].default_value = (*rgb, 1); bg.inputs['Strength'].default_value = k
    out = nt.nodes.get('World Output') or nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(bg.outputs[0], out.inputs[0])

# ---------------------------------------------------------------- objets
def link(ob):
    bpy.context.scene.collection.objects.link(ob); return ob

def mesh_obj(name, bm=None, verts=None, faces=None, smooth=True):
    me = bpy.data.meshes.new(name)
    if bm is not None:
        bm.to_mesh(me); bm.free()
    else:
        me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me); link(ob)
    if smooth:
        for p in me.polygons: p.use_smooth = True
    return ob

def place(ob, loc=(0, 0, 0), rot=(0, 0, 0), scale=None):
    ob.location = loc; ob.rotation_euler = rot
    if scale is not None: ob.scale = scale if hasattr(scale, '__len__') else (scale, scale, scale)
    return ob

def parent(child, par):
    child.parent = par; return child

def empty(name='groupe', loc=(0, 0, 0), rot=(0, 0, 0)):
    ob = bpy.data.objects.new(name, None); link(ob); ob.location = loc; ob.rotation_euler = rot; return ob

def subsurf(ob, lv=2, render=None):
    m = ob.modifiers.new('subsurf', 'SUBSURF'); m.levels = lv; m.render_levels = render or lv; return m

def bevel(ob, w=0.002, seg=3, angle=None):
    m = ob.modifiers.new('bevel', 'BEVEL'); m.width = w; m.segments = seg
    if angle is not None: m.limit_method = 'ANGLE'; m.angle_limit = math.radians(angle)
    m.harden_normals = False; return m

def solidify(ob, t=0.002, off=0):
    m = ob.modifiers.new('solid', 'SOLIDIFY'); m.thickness = t; m.offset = off; return m

def displace(ob, strength=0.002, scale=0.05, kind='CLOUDS', depth=2, mid=0.5, coords='LOCAL', vgroup=None):
    t = bpy.data.textures.new('tex', kind)
    if kind in ('CLOUDS', 'MARBLE', 'WOOD'): t.noise_scale = scale; t.noise_depth = depth
    if kind == 'VORONOI': t.noise_scale = scale
    m = ob.modifiers.new('disp', 'DISPLACE'); m.texture = t; m.strength = strength; m.mid_level = mid; m.texture_coords = coords
    if vgroup: m.vertex_group = vgroup
    return m

def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        with bpy.context.temp_override(object=ob, active_object=ob):
            bpy.ops.object.modifier_apply(modifier=m.name)

def shade_auto(ob, angle=40):
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob]):
        try: bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))
        except Exception:
            try: bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
            except Exception: pass

# ---------------------------------------------------------------- primitives (bmesh)
def bm_lathe(profile, seg=96, close_top=False):
    """profil [(r, z), ...] tourné autour de l'axe z"""
    bm = bmesh.new(); rings = []
    for (r, z) in profile:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            try: bm.faces.new((a[i], a[j], b[j], b[i]))
            except ValueError: pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def lathe(name, profile, seg=96, smooth=True):
    return mesh_obj(name, bm_lathe(profile, seg), smooth=smooth)

def box(name, size=(1, 1, 1), loc=(0, 0, 0), bev=0.0, seg=3):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    ob = mesh_obj(name, bm, smooth=False); ob.location = loc
    if bev > 0: bevel(ob, bev, seg); shade_auto(ob, 35)
    return ob

def cyl(name, r=0.1, h=0.1, seg=64, loc=(0, 0, 0), rot=(0, 0, 0), bev=0.0, cap=True):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=h)
    ob = mesh_obj(name, bm, smooth=False); ob.location = loc; ob.rotation_euler = rot
    if bev > 0: bevel(ob, bev, 3); shade_auto(ob, 35)
    else: shade_auto(ob, 30)
    return ob

def sphere(name, r=0.1, loc=(0, 0, 0), scale=(1, 1, 1), seg=48, rings=24):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    ob = mesh_obj(name, bm); ob.location = loc; ob.scale = scale; return ob

def grid(name, sx=1, sy=1, nx=32, ny=32):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=nx, y_segments=ny, size=0.5)
    for v in bm.verts: v.co.x *= sx; v.co.y *= sy
    return mesh_obj(name, bm)

def curve_tube(name, pts, r=0.01, res=12, closed=False, taper=None, profile_seg=8, kind='NURBS'):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = profile_seg; cu.resolution_u = res
    cu.use_fill_caps = True
    sp = cu.splines.new('POLY' if kind == 'POLY' else 'NURBS'); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts):
        p.co = (c[0], c[1], c[2], 1); p.radius = c[3] if len(c) > 3 else 1.0
    if kind != 'POLY': sp.use_endpoint_u = True; sp.order_u = min(4, len(pts))
    sp.use_cyclic_u = closed
    ob = bpy.data.objects.new(name, cu); link(ob); return ob

def extrude2d(name, pts, depth, bevel_w=0.0, holes=()):
    """contour 2D (x, y) extrudé de part et d'autre du plan (épaisseur depth selon z)"""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in pts]
    f = bm.faces.new(vs)
    bmesh.ops.triangulate(bm, faces=[f])
    ext = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    nv = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=nv, vec=(0, 0, depth))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, -depth / 2))
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1), verts=bm.verts, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm, smooth=False)
    if bevel_w > 0: bevel(ob, bevel_w, 3); shade_auto(ob, 40)
    return ob

def boolean_cut(ob, cutters, op='DIFFERENCE'):
    """soustraction (ou union) booléenne exacte, appliquée ; les découpeurs sont supprimés"""
    for c in cutters:
        m = ob.modifiers.new('cut', 'BOOLEAN'); m.operation = op; m.object = c; m.solver = 'EXACT'
        apply_mods(ob); bpy.data.objects.remove(c)
    ob.data.materials.clear()
    return ob

def join(objs, name=None):
    objs = [o for o in objs if o]
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs, selected_objects=objs):
        bpy.ops.object.join()
    if name: objs[0].name = name
    return objs[0]

def to_mesh(ob):
    bpy.context.view_layer.objects.active = ob
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob]):
        bpy.ops.object.convert(target='MESH')
    return bpy.context.view_layer.objects.active

# ---------------------------------------------------------------- matières
def _nodes(mat):
    nt = mat.node_tree
    if nt is None:
        mat.use_nodes = True; nt = mat.node_tree
    return nt

def mat(name, base=(0.8, 0.8, 0.8), rough=0.5, metal=0.0, coat=0.0, coat_rough=0.03, sss=0.0, sss_radius=(1.0, 0.35, 0.15), sss_scale=0.01,
        trans=0.0, ior=1.45, emit=None, emit_k=0.0, sheen=0.0, sheen_tint=(1, 1, 1), spec=0.5, alpha=1.0, film=0.0, film_ior=1.33,
        bump=None, base_fn=None, rough_fn=None, aniso=0.0, thin=False):
    m = bpy.data.materials.new(name); nt = _nodes(m); N = nt.nodes; L = nt.links
    p = N.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*base, 1)
    p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    p.inputs['IOR'].default_value = ior; p.inputs['Alpha'].default_value = alpha
    p.inputs['Specular IOR Level'].default_value = spec
    p.inputs['Coat Weight'].default_value = coat; p.inputs['Coat Roughness'].default_value = coat_rough
    p.inputs['Subsurface Weight'].default_value = sss; p.inputs['Subsurface Radius'].default_value = sss_radius; p.inputs['Subsurface Scale'].default_value = sss_scale
    if sss > 0:
        try: p.subsurface_method = 'BURLEY'
        except Exception: pass
    p.inputs['Transmission Weight'].default_value = trans
    p.inputs['Sheen Weight'].default_value = sheen; p.inputs['Sheen Tint'].default_value = (*sheen_tint, 1)
    p.inputs['Anisotropic'].default_value = aniso
    if film > 0: p.inputs['Thin Film Thickness'].default_value = film; p.inputs['Thin Film IOR'].default_value = film_ior
    if thin: p.inputs['Thin Wall'].default_value = True
    if emit is not None: p.inputs['Emission Color'].default_value = (*emit, 1); p.inputs['Emission Strength'].default_value = emit_k
    if base_fn: base_fn(nt, p)
    if rough_fn: rough_fn(nt, p)
    if bump: add_bump(nt, p, **bump)
    return m

def tex_coord(nt, kind='Object', scale=1.0, loc=(0, 0, 0), rot=(0, 0, 0)):
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale, scale, scale) if not hasattr(scale, '__len__') else scale
    mp.inputs['Location'].default_value = loc; mp.inputs['Rotation'].default_value = rot
    nt.links.new(tc.outputs[kind], mp.inputs['Vector']); return mp.outputs['Vector']

def noise(nt, vec, scale=5.0, detail=6.0, rough=0.55, dist=0.0, dims='3D'):
    n = nt.nodes.new('ShaderNodeTexNoise'); n.noise_dimensions = dims
    n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough; n.inputs['Distortion'].default_value = dist
    nt.links.new(vec, n.inputs['Vector']); return n

def voronoi(nt, vec, scale=5.0, feature='F1', dist='EUCLIDEAN', rand=1.0):
    v = nt.nodes.new('ShaderNodeTexVoronoi'); v.feature = feature; v.distance = dist
    v.inputs['Scale'].default_value = scale; v.inputs['Randomness'].default_value = rand
    nt.links.new(vec, v.inputs['Vector']); return v

def ramp(nt, fac, stops):
    r = nt.nodes.new('ShaderNodeValToRGB'); cr = r.color_ramp
    cr.elements[0].position = stops[0][0]; cr.elements[0].color = (*stops[0][1], 1)
    cr.elements[1].position = stops[-1][0]; cr.elements[1].color = (*stops[-1][1], 1)
    for pos, col in stops[1:-1]:
        e = cr.elements.new(pos); e.color = (*col, 1)
    nt.links.new(fac, r.inputs['Fac']); return r.outputs['Color']

def mix(nt, a, b, fac, mode='MIX'):
    m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = mode
    nt.links.new(fac, m.inputs[0]) if not isinstance(fac, float) else None
    if isinstance(fac, float): m.inputs[0].default_value = fac
    for i, x in ((6, a), (7, b)):
        if isinstance(x, tuple): m.inputs[i].default_value = (*x, 1)
        else: nt.links.new(x, m.inputs[i])
    return m.outputs[2]

def math_node(nt, op, a, b=None):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op
    for i, x in ((0, a), (1, b)):
        if x is None: continue
        if isinstance(x, (int, float)): n.inputs[i].default_value = x
        else: nt.links.new(x, n.inputs[i])
    return n.outputs[0]

def add_bump(nt, p, kind='noise', scale=50.0, strength=0.2, detail=6.0, dist=0.05, coords='Object', rough=0.6, extra=None):
    vec = tex_coord(nt, coords, 1.0)
    if kind == 'noise': h = noise(nt, vec, scale, detail, rough).outputs['Fac']
    elif kind == 'voronoi': h = voronoi(nt, vec, scale).outputs['Distance']
    else: h = kind(nt, vec)
    b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = strength; b.inputs['Distance'].default_value = dist
    nt.links.new(h, b.inputs['Height'])
    if extra is not None:
        nt.links.new(extra, b.inputs['Normal'])
    nt.links.new(b.outputs['Normal'], p.inputs['Normal']); return b

def emission(name, rgb, k=10.0):
    m = bpy.data.materials.new(name); nt = _nodes(m); N = nt.nodes
    for n in list(N): N.remove(n)
    e = N.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*rgb, 1); e.inputs['Strength'].default_value = k
    o = N.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); return m

def assign(ob, m, slot=None):
    if ob.type in ('MESH', 'CURVE', 'CURVES', 'SURFACE', 'META', 'FONT'):
        if slot is None:
            ob.data.materials.clear(); ob.data.materials.append(m)
        else:
            while len(ob.data.materials) <= slot: ob.data.materials.append(m)
            ob.data.materials[slot] = m
    return ob

# matières types
def M_chrome(rough=0.06, tint=(0.95, 0.95, 0.96)): return mat('chrome', tint, rough, metal=1.0)
def M_metal(base=(0.55, 0.56, 0.58), rough=0.32, aniso=0.0): return mat('metal', base, rough, metal=1.0, aniso=aniso, bump={'scale': 400, 'strength': 0.04})
def M_gunmetal(base=(0.045, 0.047, 0.052), rough=0.38):
    def rfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 60, 8, 0.6)
        r = ramp(nt, n.outputs['Fac'], [(0.3, (rough - 0.12,) * 3), (0.75, (rough + 0.14,) * 3)])
        nt.links.new(r, p.inputs['Roughness'])
    return mat('gunmetal', base, rough, metal=0.9, coat=0.1, coat_rough=0.4, rough_fn=rfn, bump={'scale': 900, 'strength': 0.05})
def M_polymer(base=(0.016, 0.017, 0.019), rough=0.55): return mat('polymer', base, rough, bump={'scale': 1600, 'strength': 0.1, 'detail': 3})
def M_rubber(base=(0.018, 0.018, 0.02), rough=0.78): return mat('rubber', base, rough, bump={'scale': 1200, 'strength': 0.08, 'detail': 2})
def M_glass(tint=(1, 1, 1), rough=0.0, ior=1.5): return mat('verre', tint, rough, trans=1.0, ior=ior, spec=0.5)
def M_dark_glass(tint=(0.012, 0.014, 0.018), rough=0.02): return mat('vitre', tint, rough, coat=1.0, coat_rough=0.0, spec=0.6)
def M_paint(base, rough=0.28, metal=0.55, coat_rough=0.02, flakes=True, film=0.0):
    b = {'kind': 'voronoi', 'scale': 2600, 'strength': 0.06} if flakes else None
    return mat('peinture', base, rough, metal=metal, coat=1.0, coat_rough=coat_rough, bump=b, film=film, film_ior=1.6)
def M_fabric(base, rough=0.85, sheen=0.6, weave=900, strength=0.25):
    def bfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0)
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.inputs['Scale'].default_value = weave; wv.inputs['Distortion'].default_value = 0.4
        nt.links.new(v, wv.inputs['Vector'])
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = strength; b.inputs['Distance'].default_value = 0.0005
        nt.links.new(wv.outputs['Fac'], b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    return mat('tissu', base, rough, sheen=sheen, sheen_tint=(1, 1, 1), base_fn=bfn)
def M_leather(base, rough=0.5): return mat('cuir', base, rough, coat=0.25, coat_rough=0.35, bump={'scale': 300, 'strength': 0.35, 'detail': 4})
def M_plastic(base, rough=0.35, coat=0.2): return mat('plastique', base, rough, coat=coat, coat_rough=0.2, bump={'scale': 1400, 'strength': 0.03})
def M_paper(base=(0.86, 0.83, 0.76), rough=0.85): return mat('papier', base, rough, sss=0.15, sss_radius=(1, 0.9, 0.7), sss_scale=0.002, bump={'scale': 900, 'strength': 0.12})

# ---------------------------------------------------------------- lumières, caméra
def area(name, loc, target, size=1.0, power=200, rgb=(1, 1, 1), shape='RECTANGLE', size_y=None, spread=180):
    L = bpy.data.lights.new(name, 'AREA'); L.energy = power; L.color = rgb; L.shape = shape; L.size = size
    if size_y is not None: L.size_y = size_y
    L.spread = math.radians(spread)
    ob = bpy.data.objects.new(name, L); link(ob); ob.location = loc
    look_at(ob, target); return ob

def point(name, loc, power=10, rgb=(1, 1, 1), radius=0.05):
    L = bpy.data.lights.new(name, 'POINT'); L.energy = power; L.color = rgb; L.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, L); link(ob); ob.location = loc; return ob

def spot(name, loc, target, power=100, rgb=(1, 1, 1), angle=40, blend=0.5, radius=0.05):
    L = bpy.data.lights.new(name, 'SPOT'); L.energy = power; L.color = rgb; L.spot_size = math.radians(angle); L.spot_blend = blend; L.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, L); link(ob); ob.location = loc; look_at(ob, target); return ob

def look_at(ob, target):
    d = Vector(target) - Vector(ob.location)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def cam(loc, target, lens=85, fstop=4.0, focus=None, sensor=36):
    c = bpy.data.cameras.new('cam'); c.lens = lens; c.sensor_width = sensor; c.clip_start = 0.005; c.clip_end = 200
    ob = bpy.data.objects.new('cam', c); link(ob); ob.location = loc; look_at(ob, target)
    c.dof.use_dof = fstop is not None
    if fstop:
        c.dof.aperture_fstop = fstop
        c.dof.focus_distance = focus if focus else (Vector(target) - Vector(loc)).length
        c.dof.aperture_blades = 7; c.dof.aperture_rotation = math.radians(10)
    bpy.context.scene.camera = ob; return ob

def neon(name, pts, rgb, k=30.0, r=0.01):
    ob = curve_tube(name, [(*p, 1.0) for p in pts], r=r, res=24, kind='POLY' if len(pts) == 2 else 'NURBS')
    assign(ob, emission('neon', rgb, k)); ob.visible_shadow = False
    return ob

def bokeh_lights(lst):
    """petites sphères lumineuses lointaines : la profondeur de champ en fait des disques flous"""
    obs = []
    for (x, y, z, r, rgb, k) in lst:
        s = sphere('bokeh', r, (x, y, z), seg=16, rings=8); assign(s, emission('b', rgb, k)); s.visible_shadow = False
        obs.append(s)
    return obs

# ---------------------------------------------------------------- rendu et finition photo
def render(path, post=None):
    sc = bpy.context.scene
    raw = path.replace('.png', '-raw.png')
    sc.render.filepath = raw
    bpy.ops.render.render(write_still=True)
    finish(raw, path, **(post or {}))

def finish(src, dst, bloom=0.35, bloom_t=0.82, bloom_r=18, vig=0.32, grain=0.035, ca=1.2, warm=0.0, seed=1):
    import numpy as np
    from PIL import Image, ImageFilter
    im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.float32) / 255.0
    h, w, _ = a.shape
    # halo des lumières vives (néons, reflets)
    if bloom > 0:
        lum = a.max(axis=2, keepdims=True); m = np.clip((lum - bloom_t) / (1 - bloom_t), 0, 1)
        hi = Image.fromarray((a * m * 255).astype(np.uint8))
        b1 = np.asarray(hi.filter(ImageFilter.GaussianBlur(bloom_r))).astype(np.float32) / 255.0
        b2 = np.asarray(hi.filter(ImageFilter.GaussianBlur(bloom_r * 3))).astype(np.float32) / 255.0
        a = 1 - (1 - a) * (1 - np.clip((b1 * 0.6 + b2 * 0.6) * bloom * 2.2, 0, 1))
    # aberration chromatique radiale légère
    if ca > 0:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32); cx, cy = w / 2, h / 2
        dx, dy = (xx - cx) / w, (yy - cy) / h; r2 = dx * dx + dy * dy
        def shift(ch, k):
            sx = np.clip((xx + dx * r2 * k * w * 0.02).round().astype(int), 0, w - 1); sy = np.clip((yy + dy * r2 * k * h * 0.02).round().astype(int), 0, h - 1)
            return ch[sy, sx]
        a = np.stack([shift(a[..., 0], ca), a[..., 1], shift(a[..., 2], -ca)], axis=2)
    # vignette douce
    if vig > 0:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 * 0.9 + ((yy - h / 2) / (h / 2)) ** 2 * 0.75)
        v = 1 - vig * np.clip((d - 0.45) / 0.9, 0, 1) ** 1.6
        a = a * v[..., None]
    if warm:
        a[..., 0] *= 1 + warm; a[..., 2] *= 1 - warm
    # grain de film (plus visible dans les ombres)
    if grain > 0:
        rs = np.random.default_rng(seed)
        g = rs.normal(0, 1, (h, w, 1)).astype(np.float32)
        g = np.asarray(Image.fromarray(((g * 0.5 + 0.5).clip(0, 1)[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32)[..., None] / 255.0 - 0.5
        lum = a.mean(axis=2, keepdims=True)
        a = a + g * grain * 2.0 * (0.55 + 0.45 * (1 - lum))
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst)
