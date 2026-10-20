"""Merge IFC identity and build a portable file:// viewer using local esbuild."""
from pathlib import Path
import json,csv,subprocess,base64,sys,re
ROOT=Path(__file__).resolve().parents[1]
mapping=json.loads((ROOT/'data/ifc_mapping.json').read_text())
byid={p['asset_id']:p['ifc_guid'] for p in mapping['components']}
metadata=json.loads((ROOT/'data/components.json').read_text())
for p in metadata['components']:p['ifc_guid']=byid[p['id']]
(ROOT/'data/components.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
with (ROOT/'data/components.csv').open('w',encoding='utf-8-sig',newline='') as f:
 fields=['id','ifc_guid','name','system','ifc_class','evidence','source','notes','dimensions']
 w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(metadata['components'])
# top-level await becomes async wrapper, allowing a classic self-contained script.
source=(ROOT/'viewer/viewer.js').read_text()
assert source.count("try{\n const embedded=")==1, 'Embedded loader wrapper anchor changed'
assert source.count('renderer.setAnimationLoop')==1, 'Animation wrapper anchor changed'
source=source.replace("try{\n const embedded=", "async function loadModel(){try{\n const embedded=")
source=source.replace("renderer.setAnimationLoop", "}\nloadModel();\nrenderer.setAnimationLoop")
tmp=ROOT/'viewer/entry.bundle.js';tmp.write_text(source)
esbuild=sys.argv[1] if len(sys.argv)>1 else 'esbuild'
subprocess.run([esbuild,str(tmp),'--bundle','--format=iife','--minify','--alias:three='+str(ROOT/'viewer/vendor/build/three.module.js'),'--alias:three/addons='+str(ROOT/'viewer/vendor'),'--outfile='+str(ROOT/'viewer/viewer.bundle.js')],check=True)
tmp.unlink()
html=(ROOT/'viewer/index.html').read_text()
start=html.index('<script type="importmap">');end=html.index('</script>',start)+len('</script>');html=html[:start]+html[end:]
html=html.replace('../models/','models/').replace('../data/','data/').replace('../references/','references/')
payload=json.dumps({'glb':base64.b64encode((ROOT/'models/V90_reconstruction.glb').read_bytes()).decode(),'metadata':metadata},ensure_ascii=False).replace('</','<\\/')
bundle=(ROOT/'viewer/viewer.bundle.js').read_text().replace('</script','<\\/script')
html,count=re.subn(r'<script type="module" src="\./viewer\.js(?:\?[^\"]*)?"></script>',lambda _: '<script>window.BIM_EMBEDDED='+payload+';</script><script>'+bundle+'</script>',html)
assert count==1, 'Viewer module entry not found'
(ROOT/'打开三维模型.html').write_text(html)
print('Portable viewer:',ROOT/'打开三维模型.html')
