"""Render the R04 sensor assembly from the saved same-source Blender model."""
import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'models/V90_reconstruction.blend'))
scene=bpy.context.scene
for obj in scene.objects:
    if 'AssetId' in obj:
        obj.hide_render=not obj['AssetId'].startswith('SENSOR.')
        obj.hide_set(False)
scene.camera.location=(11.8,-4.8,85.5)
scene.camera.rotation_euler=(Vector((8.95,0,83.25))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.ortho_scale=3.8
scene.render.resolution_x=1200
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.cycles.samples=24
scene.render.filepath=str(root/'preview/05_风速风向装置_R04.png')
bpy.ops.render.render(write_still=True)
