import json,math
from pathlib import Path
import numpy as np
r=Path(__file__).resolve().parents[1]
p={c['id']:c for c in json.loads((r/'data/mesh_exchange.json').read_text())['components']}
v=np.array(p['DRIVE.SHAFT']['vertices']);center=v.mean(axis=0)
_,_,vectors=np.linalg.svd(v-center,full_matrices=False);axis=vectors[0]
if axis[0]<0:axis=-axis
angle=math.degrees(math.atan2(-axis[2],axis[0]))
assert abs(angle-6)<.01, f'Expected rearward downward 6 degrees, got {angle}'
hub=np.array([-3.5,0,80]);assert np.linalg.norm(np.cross(center-hub,axis))<1e-4
for name in ['GEARBOX.STAGE.1','GEARBOX.STAGE.2']:
 c=np.array(p[name]['vertices']).mean(axis=0);assert np.linalg.norm(np.cross(c-hub,axis))<.01,name
assert abs(np.mean(np.array(p['YAW.BEARING']['vertices'])[:,2])-78.32)<1e-4
print('PASS: exported shaft 6 degrees, gearbox input alignment, fixed hub center and horizontal yaw bearing')
