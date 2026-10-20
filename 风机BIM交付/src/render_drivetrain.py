"""Render static structural envelopes, not meshing verification."""
import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'models/V90_reconstruction.blend'))
for o in bpy.context.scene.objects:
 if 'AssetId' in o:
  id=o['AssetId'];o.hide_set(False)
  o.hide_render=o['System']!='06 传动链' or id.startswith(('GEARBOX.STAGE.','GEARBOX.HIGH','GEARBOX.FLANGE.','GEARBOX.BOLTS.'))
s=bpy.context.scene;s.camera.location=(-1,-7,84);s.camera.rotation_euler=(Vector((1.6,0,80))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.ortho_scale=7
s.render.resolution_x=1400;s.render.resolution_y=800;s.render.resolution_percentage=100;s.cycles.samples=24
s.render.filepath=str(root/'preview/06_传动内部功能示意_R06.png');bpy.ops.render.render(write_still=True)
