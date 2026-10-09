# Décors de prise de vue pour le coupé (v7.77) : studio sombre à boîtes à lumière (reflets longs sur la carrosserie),
# rue de nuit (photo HDRI, asphalte mouillé), atelier (photo HDRI d'un vrai garage, béton).
import bpy, math, os
from mathutils import Vector
from .core import *
from . import assets as A

HD2K = lambda h: '2k' if os.path.exists(f'{A.ROOT}/hdri/{h}_2k.hdr') else '1k'


def M_floor_dark(rough=0.45):
    def rfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 3.0, 4, 0.6)
        nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, (rough - 0.08,) * 3), (0.7, (rough + 0.1,) * 3)]), p.inputs['Roughness'])
    return mat('sol_studio', (0.006, 0.006, 0.007), rough, coat=0.12, coat_rough=0.1, rough_fn=rfn)


def studio(key=1.0, hdri_k=0.3, bg=(0.006, 0.006, 0.007), expo=-0.85, warm=(1.0, 0.97, 0.93), floor=True, rim_k=1.0, side_k=1.0):
    """studio sombre : grande boîte à lumière zénithale (reflet long sur le capot et le toit), bandes latérales hautes (liseré
    de lumière sur l'épaule de caisse), contre-jour ; sol noir satiné"""
    A.hdri('studio_small_09', hdri_k, res='2k', cam_rgb=bg, cam_k=1.0)
    bpy.context.scene.view_settings.exposure = expo
    if floor:
        fl = grid('sol', 60, 60, 2, 2); assign(fl, M_floor_dark())
    area('boite_haute', (0.0, 0.0, 4.6), (0.0, 0.0, 0.0), 7.5, 1300 * key, warm, size_y=2.4)
    for sd in (-1, 1):
        area('bande_' + str(sd), (0.3, sd * 4.2, 2.6), (0.3, 0.0, 0.9), 6.5, 520 * key * side_k, warm, size_y=0.4)
    area('contre', (-5.5, 0.0, 1.9), (0.0, 0.0, 0.7), 3.0, 650 * key * rim_k, (0.95, 0.97, 1.0), size_y=0.6)
    area('face', (6.0, -2.5, 0.9), (0.0, 0.0, 0.5), 2.0, 220 * key, warm, size_y=0.8)


def night(hd='modern_buildings_night', k=0.6, rot=0.0, cam_k=0.65, expo=0.0, wet=0.65, floor='asphalt_floor'):
    A.hdri(hd, k, rot=rot, res=HD2K(hd), cam_hdri_k=cam_k)
    bpy.context.scene.view_settings.exposure = expo
    fl = grid('sol', 60, 60, 2, 2)
    assign(fl, A.pbr(floor, 0.35, res='2k', coords='Object', rough_mul=max(0.05, 1.0 - wet), coat=wet, coat_rough=0.03))
    return fl


def workshop(hd='garage', k=0.7, rot=0.0, cam_k=0.8, expo=-0.2, wet=0.25, floor='garage_floor', key=1.0):
    A.hdri(hd, k, rot=rot, res=HD2K(hd), cam_hdri_k=cam_k)
    bpy.context.scene.view_settings.exposure = expo
    fl = grid('sol', 60, 60, 2, 2)
    assign(fl, A.pbr(floor, 0.35, res='2k', coords='Object', rough_mul=1.0 - wet, coat=wet, coat_rough=0.05))
    area('plafond', (0.0, 0.0, 4.5), (0.0, 0.0, 0.0), 6.0, 1600 * key, (1.0, 0.96, 0.9), size_y=2.0)
    return fl


def car_cam(az=35, dist=9.0, h=1.0, target=(0.15, 0.0, 0.55), lens=70, fstop=8.0):
    a = math.radians(az)
    return cam((target[0] + math.cos(a) * dist, target[1] - math.sin(a) * dist, h), target, lens, fstop)
