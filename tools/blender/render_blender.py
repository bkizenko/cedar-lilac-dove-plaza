"""Headless Blender (Cycles) preview render of an exported Hearthwild H scene.

    blender -b --factory-startup -P tools/blender/render_blender.py -- \
        <scene_dir> <out.png> [--samples 96] [--res 1920x1200] [--no-bevel] [--no-dof]

Imports the bundle written by tools/blender/export-scenes.mjs (real generator
geometry and vertex colours) and builds a look-development scene:
procedural wood grain (Wave + Noise) multiplying the generator's vertex colours,
bevel modifier for carved edges, light noise bump for imperfection, rounded
foliage with a little subsurface, slate-blue water with transmission over the
carved riverbed, Nishita sky + sun at golden hour, soft sun shadows, optional
tilt-shift depth of field, AgX view transform (Filmic fallback), Cycles CPU
with OpenImageDenoise.

Honest scope: Blender only changes materials, lighting and shadows. Geometry
detail is exactly what the generator emits (plus bevel/bump). This is a
preview, not the in-game look (the game uses three.js MeshStandardMaterial
with the CARVED_LIGHT_RIG, no bevels, no path tracing).
Written without access to Blender; only syntax-checked (py_compile).
"""
import json
import math
import os
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(argv) < 2:
    print(__doc__)
    sys.exit(1)
SCENE_DIR, OUT = argv[0], argv[1]
opts = {"samples": 96, "res": "1920x1200", "bevel": True, "dof": True}
i = 2
while i < len(argv):
    a = argv[i]
    if a == "--samples":
        opts["samples"] = int(argv[i + 1]); i += 1
    elif a == "--res":
        opts["res"] = argv[i + 1]; i += 1
    elif a == "--no-bevel":
        opts["bevel"] = False
    elif a == "--no-dof":
        opts["dof"] = False
    i += 1
RES_X, RES_Y = (int(v) for v in opts["res"].lower().split("x"))

with open(os.path.join(SCENE_DIR, "scene.json")) as fh:
    S = json.load(fh)

# ---------------------------------------------------------------- helpers
def srgb_to_linear(c):
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hex_lin(h, k=1.0):
    n = int(h[1:], 16)
    rgb = np.array([(n >> 16) & 255, (n >> 8) & 255, n & 255], dtype=np.float64) / 255.0
    return tuple(float(v) * k for v in srgb_to_linear(rgb)) + (1.0,)


def load(mesh_def, key, dtype, width):
    f = mesh_def["files"].get(key)
    if not f:
        return None
    a = np.fromfile(os.path.join(SCENE_DIR, f), dtype=dtype)
    return a.reshape(-1, width) if width > 1 else a


def to_blender(v):
    """Scene frame (Y up) -> Blender (Z up): (x, y, z) -> (x, -z, y)."""
    out = np.empty_like(v)
    out[:, 0], out[:, 1], out[:, 2] = v[:, 0], -v[:, 2], v[:, 1]
    return out


# material categories -> palette ids (scene.json "materials" order)
MAT_NAMES = [m["id"] for m in S["materials"]]
CATEGORY = {
    "recess": "recess", "foliage": "foliage", "foliageDark": "foliage", "water": "water",
    "fire": "fire", "cloth": "cloth", "iron": "iron", "terrain": "terrain",
}
CATS = ["wood", "foliage", "water", "fire", "cloth", "iron", "recess", "terrain"]
cat_of_mat = np.array([CATS.index(CATEGORY.get(n, "wood")) for n in MAT_NAMES], dtype=np.int32)

# ---------------------------------------------------------------- reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- materials
def node_tree(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt, nt.nodes, nt.links


def grain_group(nodes, links, strength_input=None, scale=0.55, lines=0.78):
    """Warped growth-line grain in object space: Wave(bands) distorted by Noise,
    ramped to [lines..1]; blended in by the per-vertex 'grain' attribute
    (palette grain strength), like the adapter's map blend."""
    tc = nodes.new("ShaderNodeTexCoord")
    noise = nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 0.35; noise.inputs["Detail"].default_value = 3.0
    wave = nodes.new("ShaderNodeTexWave"); wave.wave_type = "BANDS"; wave.bands_direction = "X"
    wave.inputs["Scale"].default_value = scale; wave.inputs["Distortion"].default_value = 6.0
    wave.inputs["Detail"].default_value = 2.0; wave.inputs["Detail Scale"].default_value = 1.5
    links.new(tc.outputs["Object"], wave.inputs["Vector"])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (lines, lines, lines, 1)
    ramp.color_ramp.elements[1].position = 0.35; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    gattr = nodes.new("ShaderNodeAttribute"); gattr.attribute_name = "grain"
    mix = nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs["A"].default_value = (1, 1, 1, 1)
    links.new(gattr.outputs["Fac"], mix.inputs["Factor"])
    links.new(ramp.outputs["Color"], mix.inputs["B"])
    return mix.outputs["Result"], wave.outputs["Fac"], noise


def make_material(cat, look):
    mat = bpy.data.materials.new("H_" + cat)
    nt, nodes, links = node_tree(mat)
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    col = nodes.new("ShaderNodeVertexColor"); col.layer_name = "Col"
    hsv = nodes.new("ShaderNodeHueSaturation")
    hsv.inputs["Hue"].default_value = look.get("hue", 0.5)
    hsv.inputs["Saturation"].default_value = look.get("saturation", 1.0)
    hsv.inputs["Value"].default_value = look.get("value", 1.0)
    links.new(col.outputs["Color"], hsv.inputs["Color"])
    if cat in ("wood", "terrain"):
        grain, wave_fac, noise = grain_group(nodes, links, scale=0.55 if cat == "wood" else 0.25)
        mul = nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
        links.new(hsv.outputs["Color"], mul.inputs["A"]); links.new(grain, mul.inputs["B"])
        links.new(mul.outputs["Result"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.72 if cat == "wood" else 0.8
        bump = nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.12 if cat == "wood" else 0.06
        bump.inputs["Distance"].default_value = 0.02
        add = nodes.new("ShaderNodeMath"); add.operation = "ADD"
        links.new(wave_fac, add.inputs[0]); links.new(noise.outputs["Fac"], add.inputs[1])
        links.new(add.outputs["Value"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    elif cat == "foliage":
        links.new(hsv.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.85
        if "Subsurface Weight" in bsdf.inputs:
            bsdf.inputs["Subsurface Weight"].default_value = 0.2
            bsdf.inputs["Subsurface Radius"].default_value = (0.3, 0.25, 0.1)
        tc = nodes.new("ShaderNodeTexCoord"); nz = nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0
        links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bump = nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25
        links.new(nz.outputs["Fac"], bump.inputs["Height"]); links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    elif cat == "water":
        bsdf.inputs["Base Color"].default_value = hex_lin("#7a8f99")
        bsdf.inputs["Roughness"].default_value = 0.08
        bsdf.inputs["IOR"].default_value = 1.33
        tw = "Transmission Weight" if "Transmission Weight" in bsdf.inputs else "Transmission"
        bsdf.inputs[tw].default_value = 0.75
        tc = nodes.new("ShaderNodeTexCoord"); nz = nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.8
        links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bump = nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.05
        links.new(nz.outputs["Fac"], bump.inputs["Height"]); links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    elif cat == "fire":
        links.new(hsv.outputs["Color"], bsdf.inputs["Base Color"])
        ek = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[ek].default_value = hex_lin("#f0a03a")
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 4.0
    else:
        links.new(hsv.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = {"iron": 0.45, "cloth": 0.9, "recess": 0.95}.get(cat, 0.85)
        if cat == "iron":
            bsdf.inputs["Metallic"].default_value = 0.6
    return mat


LOOK = (S.get("rig") or {}).get("blender", {})
MATERIALS = [make_material(c, LOOK) for c in CATS]

# ---------------------------------------------------------------- meshes
def build_object(md):
    pos = load(md, "pos", np.float32, 3)
    nv = len(pos)
    idx = load(md, "idx", np.uint32, 1)
    faces = idx.reshape(-1, 3) if idx is not None else np.arange(nv, dtype=np.uint32).reshape(-1, 3)
    # generator triangles are CCW seen from outside in a Y-up frame; the (x,-z,y)
    # axis swap is a proper rotation, so winding is preserved.
    me = bpy.data.meshes.new(md["name"])
    me.vertices.add(nv)
    me.vertices.foreach_set("co", to_blender(pos).ravel())
    nf = len(faces)
    me.loops.add(nf * 3)
    me.loops.foreach_set("vertex_index", faces.ravel().astype(np.int32))
    me.polygons.add(nf)
    me.polygons.foreach_set("loop_start", (np.arange(nf, dtype=np.int32) * 3))
    me.update(calc_edges=True)
    col = load(md, "col", np.float32, 3)
    lin = np.concatenate([srgb_to_linear(col), np.ones((nv, 1))], axis=1).astype(np.float32)
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    ca.data.foreach_set("color", lin.ravel())
    grain = load(md, "grain", np.float32, 1)
    ga = me.attributes.new("grain", "FLOAT", "POINT")
    ga.data.foreach_set("value", np.clip(grain, 0, 1).astype(np.float32))
    uv = load(md, "uv", np.float32, 2)
    uvl = me.uv_layers.new(name="UVMap")
    uvl.data.foreach_set("uv", uv[faces.ravel()].ravel())
    mat = load(md, "mat", np.uint8, 1)
    for m in MATERIALS:
        me.materials.append(m)
    me.polygons.foreach_set("material_index", cat_of_mat[mat[faces[:, 0]]].astype(np.int32))
    smooth = not md.get("flat", True)
    me.polygons.foreach_set("use_smooth", np.full(nf, smooth, dtype=bool))
    me.validate()
    ob = bpy.data.objects.new(md["name"], me)
    scene.collection.objects.link(ob)
    if md.get("flat", True) and not md.get("water"):
        # weld the triangle soup so edges can be bevelled (carved chamfers)
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
        bm.to_mesh(me); bm.free()
        if opts["bevel"] and md["name"] not in ("plinths", "plinth"):
            bev = ob.modifiers.new("carve", "BEVEL")
            bev.width = 0.03; bev.segments = 2; bev.limit_method = "ANGLE"; bev.angle_limit = math.radians(30)
            bev.harden_normals = False
    if md.get("water"):
        ob.visible_shadow = False
    return ob


for md in S["meshes"]:
    build_object(md)

# ---------------------------------------------------------------- lights / world
R = S["rig"]
sd = np.array(R["sunDir"], dtype=np.float64); sd /= np.linalg.norm(sd)
sd_b = np.array([sd[0], -sd[2], sd[1]])  # direction towards the sun, Blender frame
elev = math.asin(sd_b[2]); azim = math.atan2(sd_b[0], sd_b[1])
sun_data = bpy.data.lights.new("Sun", "SUN")
sun_data.energy = LOOK.get("sun_strength", 4.2)
sun_data.angle = math.radians(LOOK.get("sun_angle_deg", 3.0))  # soft penumbra
sun_data.color = hex_lin(R.get("sun", "#fff0d8"))[:3]
sun = bpy.data.objects.new("Sun", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = Vector(tuple(sd_b)).to_track_quat("Z", "Y").to_euler()

world = bpy.data.worlds.new("World"); scene.world = world
world.use_nodes = True
wn, wl = world.node_tree.nodes, world.node_tree.links
for n in list(wn):
    wn.remove(n)
wout = wn.new("ShaderNodeOutputWorld")
sky = wn.new("ShaderNodeTexSky")
try:
    sky.sky_type = "NISHITA"
    sky.sun_elevation = elev; sky.sun_rotation = azim; sky.sun_disc = False
    sky.air_density = 1.0; sky.dust_density = 2.5  # hazier golden hour
except Exception as e:  # noqa: BLE001
    print("Nishita sky unavailable:", e)
tint = wn.new("ShaderNodeMix"); tint.data_type = "RGBA"; tint.blend_type = "MULTIPLY"; tint.inputs["Factor"].default_value = 1.0
tint.inputs["B"].default_value = hex_lin(LOOK.get("sky_tint", "#ffd9ad"))
wl.new(sky.outputs["Color"], tint.inputs["A"])
bg_sky = wn.new("ShaderNodeBackground"); bg_sky.inputs["Strength"].default_value = LOOK.get("sky_strength", 0.35)
wl.new(tint.outputs["Result"], bg_sky.inputs["Color"])
bg_cam = wn.new("ShaderNodeBackground"); bg_cam.inputs["Color"].default_value = hex_lin(S.get("background", "#e2b884")); bg_cam.inputs["Strength"].default_value = 1.0
lp = wn.new("ShaderNodeLightPath")
mixs = wn.new("ShaderNodeMixShader")
wl.new(lp.outputs["Is Camera Ray"], mixs.inputs["Fac"])
wl.new(bg_sky.outputs["Background"], mixs.inputs[1]); wl.new(bg_cam.outputs["Background"], mixs.inputs[2])
wl.new(mixs.outputs["Shader"], wout.inputs["Surface"])

# ---------------------------------------------------------------- camera
C = S["camera"]
eye = np.array(C["eye"], dtype=np.float64); tgt = np.array(C["target"], dtype=np.float64)
eye_b = Vector((eye[0], -eye[2], eye[1])); tgt_b = Vector((tgt[0], -tgt[2], tgt[1]))
cam_data = bpy.data.cameras.new("Cam")
cam_data.sensor_fit = "VERTICAL"; cam_data.sensor_height = 24.0
cam_data.clip_start = C.get("near", 1.0); cam_data.clip_end = C.get("far", 2000.0)
aspect = RES_X / RES_Y
if C.get("ortho"):
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 2.0 * C["ortho"] * max(aspect, 1.0)
else:
    cam_data.type = "PERSP"
    cam_data.angle_y = math.radians(C["fov"])
cam = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam)
cam.location = eye_b
cam.rotation_euler = (tgt_b - eye_b).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam
if opts["dof"] and C.get("dof") and not C.get("ortho"):
    cam_data.dof.use_dof = True
    cam_data.dof.focus_distance = float((tgt_b - eye_b).length)
    cam_data.dof.aperture_fstop = float(C["dof"].get("fstop", 0.1))  # tiny f-number = miniature/tilt-shift look

# ---------------------------------------------------------------- render settings
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = opts["samples"]
scene.cycles.use_denoising = True
try:
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
except Exception:  # noqa: BLE001
    pass
scene.cycles.max_bounces = 6
scene.cycles.caustics_reflective = False; scene.cycles.caustics_refractive = False
scene.render.resolution_x = RES_X; scene.render.resolution_y = RES_Y; scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGB"; scene.render.image_settings.compression = 90
for vt in ("AgX", "Filmic", "Standard"):
    try:
        scene.view_settings.view_transform = vt
        break
    except TypeError:
        continue
scene.view_settings.exposure = LOOK.get("exposure", 0.0)
scene.render.filepath = os.path.abspath(OUT)
print(f"[blender] {S['scene']}: {RES_X}x{RES_Y}, {opts['samples']} spp, view={scene.view_settings.view_transform}")
bpy.ops.render.render(write_still=True)
print("[blender] wrote", scene.render.filepath)
