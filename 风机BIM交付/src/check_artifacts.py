"""Artifact checks, run after export. Does not certify engineering accuracy."""
from pathlib import Path
import json, struct, math

ROOT = Path(__file__).resolve().parents[1]

def check():
    source = ROOT / 'data/mesh_exchange.json'
    assert source.exists(), 'Geometry exchange has not been generated'
    data = json.loads(source.read_text())
    parts = data['components']
    ids = [p['id'] for p in parts]
    assert len(ids) == len(set(ids)), 'Duplicate asset IDs'
    assert len(parts) > 60, 'Missing assembly detail'
    for p in parts:
        assert p['source'] and p['evidence'] and p['notes'], p['id']
        assert p['vertices'] and p['faces'], p['id']
        assert all(math.isfinite(n) for v in p['vertices'] for n in v), p['id']
        assert all(len(f)==3 and min(f)>=0 and max(f)<len(p['vertices']) for f in p['faces']), p['id']
    for name in ['V90_reconstruction.glb', 'V90_nacelle.glb']:
        raw = (ROOT/'models'/name).read_bytes()
        magic, version, size = struct.unpack('<4sII', raw[:12])
        assert (magic,version,size)==(b'glTF',2,len(raw)), name
        length, kind = struct.unpack('<I4s',raw[12:20])
        assert kind == b'JSON'
        doc=json.loads(raw[20:20+length])
        extras=[n.get('extras',{}) for n in doc['nodes']]
        meshids=[e['AssetId'] for e in extras if 'AssetId' in e]
        assert meshids and len(meshids)==len(set(meshids)), name
        expected = set(ids) if name=='V90_reconstruction.glb' else {p['id'] for p in parts if p['system'] not in ['01 基础与塔筒','02 塔内设施','12 风轮叶片'] and p['id']!='ELEC.TRANSFORMER'}
        assert set(meshids)==expected, (name, expected-set(meshids),set(meshids)-expected)
    mapping=json.loads((ROOT/'data/ifc_mapping.json').read_text())['components']
    assert {p['asset_id'] for p in mapping}==set(ids), 'IFC mapping mismatch'
    assert len({p['ifc_guid'] for p in mapping})==len(ids), 'Duplicate IFC GUID'
    blade=[p for p in parts if p['id']=='ROTOR.BLADE.1'][0]
    # Check blade span in shaft-local frame; vertical span is shorter after tilt.
    a=math.radians(data['project'].get('shaft_tilt_deg',0));c,s=math.cos(a),math.sin(a)
    verts=[(c*(x+3.5)-s*(z-80)-3.5,y,s*(x+3.5)+c*(z-80)+80) for x,y,z in blade['vertices']]
    assert abs(max(v[2] for v in verts)-min(v[2] for v in verts)-44)<0.01, 'Blade radial span'
    assert abs(max(v[2] for v in verts)-125)<0.01, 'Nominal tip elevation'
    assert (ROOT/'models/V90_reconstruction.blend').stat().st_size > 10000
    print(json.dumps({'components':len(parts),'triangles':sum(len(p['faces']) for p in parts),'geometry_and_glb_checks':'PASS'},ensure_ascii=False))

if __name__=='__main__':
    check()
