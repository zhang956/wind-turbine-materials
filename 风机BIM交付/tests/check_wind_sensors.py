"""Check delivered geometry and point mapping, not engineering certification."""
import csv,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
parts={c['id']:c for c in json.loads((root/'data/components.json').read_text())['components']}
for key in ['SENSOR.WIND','SENSOR.WIND.2','SENSOR.MAST','SENSOR.MAST.2','SENSOR.JUNCTION']:
    assert key in parts, f'Missing wind sensing component: {key}'
cooler=parts['COOL.FRAME']
for key in ['SENSOR.WIND','SENSOR.WIND.2']:
    p=parts[key]
    assert p['evidence'].startswith('C'), 'Reconstructed geometry must remain estimated'
    assert 'S05' in p['source'], 'Missing configuration evidence'
    assert p['bbox_min'][0]>cooler['bbox_max'][0], 'Sensor overlaps cooler envelope'
    assert p['bbox_min'][2]>parts['COVER.ROOF']['bbox_min'][2], 'Sensor must sit above rear roof'
points=list(csv.DictReader((root/'data/测点映射模板.csv').open(encoding='utf-8-sig')))
for key in ['SENSOR.WIND','SENSOR.WIND.2']:
    assert {p['unit'] for p in points if p['asset_id']==key}>={'m/s','deg'}, 'Both measurements required'
    assert all(p['status']=='UNMAPPED_NO_LIVE_DATA' for p in points if p['asset_id']==key)
assert all(p['asset_id'] in parts for p in points), 'Dangling point mapping'
print('PASS: dual sensor geometry, evidence, cooler clearance and wind point mappings')
