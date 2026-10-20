#!/usr/bin/env python3
"""Export public-source reconstruction meshes to IFC4 with semantic provenance.

Requires Python 3 + ifcopenshell + numpy. Example for the delivery environment:
PYTHONPATH=/tmp/wind-bim-venv/lib/python3.12/site-packages python3 src/export_ifc.py
Geometry in mesh_exchange.json must use world coordinates in metres.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import json
import math
from pathlib import Path
import uuid

import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.validate

ROOT = Path(__file__).resolve().parents[1]
NS = uuid.UUID('58cfdd75-bd28-52de-ae40-e2dbe4e5330b')
SOURCE_URL = 'https://www.vestas.cn/content/dam/vestas-com/cn/product-/2MWfinal.pdf'


def guid(asset_id):
    return ifcopenshell.guid.compress(uuid.uuid5(NS, str(asset_id)).hex)


def string(value):
    return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)


def check_mesh(component):
    vertices, faces = component['vertices'], component['faces']
    if not vertices or not faces:
        raise ValueError(f"Empty mesh: {component['id']}")
    if any(len(v) != 3 or not all(math.isfinite(float(x)) for x in v) for v in vertices):
        raise ValueError(f"Invalid vertex: {component['id']}")
    edges = Counter()
    for face in faces:
        if len(face) != 3 or any(type(i) is not int or not 0 <= i < len(vertices) for i in face):
            raise ValueError(f"Invalid triangular face: {component['id']}")
        if len(set(face)) != 3:
            raise ValueError(f"Repeated face index: {component['id']}")
        a, b, c = (vertices[i] for i in face)
        u, v = [b[i]-a[i] for i in range(3)], [c[i]-a[i] for i in range(3)]
        cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
        if sum(x*x for x in cross) < 1e-22:
            raise ValueError(f"Degenerate triangle: {component['id']}")
        for a, b in zip(face, face[1:]+face[:1]):
            edges[tuple(sorted((a, b)))] += 1
    return all(n == 2 for n in edges.values())


def export(exchange_path, output_path, mapping_path, validation_path):
    data = json.loads(exchange_path.read_text(encoding='utf-8'))
    components = data['components']
    ids = [str(c['id']) for c in components]
    if not components or len(set(ids)) != len(ids):
        raise ValueError('Components must have unique, nonempty asset ids')
    f = ifcopenshell.file(schema='IFC4')
    f.header.file_description.description = ('ViewDefinition [DesignTransferView]', 'Public-source reconstruction, not OEM CAD')
    f.header.file_name.name = output_path.name
    f.header.file_name.preprocessor_version = f'IfcOpenShell {ifcopenshell.version}'
    f.header.file_name.originating_system = 'V90 public-source reconstruction exporter'
    E = f.create_entity
    origin = E('IfcCartesianPoint', Coordinates=(0., 0., 0.))
    axis = E('IfcAxis2Placement3D', Location=origin)
    context = E('IfcGeometricRepresentationContext', ContextIdentifier='Model', ContextType='Model', CoordinateSpaceDimension=3, Precision=1e-6, WorldCoordinateSystem=axis)
    units = E('IfcUnitAssignment', Units=[E('IfcSIUnit', UnitType='LENGTHUNIT', Name='METRE'), E('IfcSIUnit', UnitType='AREAUNIT', Name='SQUARE_METRE'), E('IfcSIUnit', UnitType='VOLUMEUNIT', Name='CUBIC_METRE'), E('IfcSIUnit', UnitType='PLANEANGLEUNIT', Name='RADIAN')])
    def placement(parent=None):
        return E('IfcLocalPlacement', PlacementRelTo=parent, RelativePlacement=axis)
    def aggregate(parent, children, key):
        E('IfcRelAggregates', GlobalId=guid('aggregate:'+key), RelatingObject=parent, RelatedObjects=children)
    def properties(obj, values, key, name='ReconstructionProvenance'):
        props = [E('IfcPropertySingleValue', Name=k, NominalValue=E('IfcBoolean', v) if isinstance(v, bool) else E('IfcText', string(v))) for k, v in values.items()]
        pset = E('IfcPropertySet', GlobalId=guid('pset:'+key), Name=name, HasProperties=props)
        E('IfcRelDefinesByProperties', GlobalId=guid('properties:'+key), RelatedObjects=[obj], RelatingPropertyDefinition=pset)
    project = E('IfcProject', GlobalId=guid('project'), Name=data.get('project', {}).get('name', 'Vestas V90-2MW reconstruction'), Description='Public-source dimensional reconstruction; conceptual internal arrangement; not manufacturer CAD or construction design.', RepresentationContexts=[context], UnitsInContext=units)
    site = E('IfcSite', GlobalId=guid('site'), Name='Unlocated demonstration site', ObjectPlacement=placement(), CompositionType='ELEMENT')
    aggregate(project, [site], 'project-site')
    assembly = E('IfcElementAssembly', GlobalId=guid('turbine'), Name='V90-2MW reconstructed wind turbine', ObjectPlacement=placement(site.ObjectPlacement), AssemblyPlace='SITE', PredefinedType='USERDEFINED', ObjectType='WIND_TURBINE_RECONSTRUCTION')
    E('IfcRelContainedInSpatialStructure', GlobalId=guid('site-containment'), RelatedElements=[assembly], RelatingStructure=site)
    properties(assembly, {'Reconstruction': True, 'Evidence': 'Public-source reconstruction; internal geometry is illustrative', 'Source': SOURCE_URL, 'Notes': data.get('project', {}).get('description', ''), 'AssetId': 'turbine'}, 'turbine')
    properties(assembly, {'RatedPower_kW': data['project'].get('rated_power_kw', 2000), 'SelectedHubHeight_m': data['project'].get('hub_height_m', 80), 'NominalRotorDiameter_m': data['project'].get('rotor_diameter_m', 90), 'SourcePage': 'S01 PDF page 10', 'DataStatus': 'NO_LIVE_DATA'}, 'turbine-official-parameters', 'PublicReferenceParameters')
    groups = defaultdict(list)
    for c in components:
        groups[str(c.get('system', 'Unclassified'))].append(c)
    systems = []
    mapping = []
    docs = {}
    for name, members in sorted(groups.items()):
        system_key = 'system:'+name
        group_assembly = E('IfcElementAssembly', GlobalId=guid(system_key), Name=name, ObjectPlacement=placement(assembly.ObjectPlacement), AssemblyPlace='FACTORY', PredefinedType='USERDEFINED', ObjectType='WIND_TURBINE_SUBASSEMBLY')
        systems.append(group_assembly)
        functional_system = E('IfcSystem', GlobalId=guid('functional:'+name), Name=name, ObjectType='WIND_TURBINE_SYSTEM')
        elements = []
        for c in members:
            asset_id = str(c['id'])
            closed = check_mesh(c)
            requested = c.get('ifc_class', 'IfcBuildingElementProxy')
            try:
                declaration = ifcopenshell.ifcopenshell_wrapper.schema_by_name('IFC4').declaration_by_name(requested)
                probe = declaration
                while probe is not None and probe.name() != 'IfcElement':
                    probe = probe.supertype()
                if probe is None or declaration.is_abstract():
                    raise ValueError('Not a concrete IfcElement')
                element = E(requested)
            except (RuntimeError, AttributeError, ValueError):
                element = E('IfcBuildingElementProxy')
            element.GlobalId = guid(asset_id)
            element.Name = c['name']
            element.Description = string(c.get('notes', 'Reconstructed geometry'))
            element.ObjectType = 'PUBLIC_SOURCE_RECONSTRUCTION'
            element.ObjectPlacement = placement(group_assembly.ObjectPlacement)
            element.Tag = asset_id
            if hasattr(element, 'PredefinedType'):
                element.PredefinedType = 'NOTDEFINED'
            points = E('IfcCartesianPointList3D', CoordList=[tuple(float(x) for x in v) for v in c['vertices']])
            tessellation = E('IfcTriangulatedFaceSet', Coordinates=points, Closed=closed, CoordIndex=[tuple(i+1 for i in face) for face in c['faces']])
            shape = E('IfcShapeRepresentation', ContextOfItems=context, RepresentationIdentifier='Body', RepresentationType='Tessellation', Items=[tessellation])
            element.Representation = E('IfcProductDefinitionShape', Representations=[shape])
            color = c.get('color', [0.7, 0.7, 0.7, 1.0])
            rgb = E('IfcColourRgb', Red=float(color[0]), Green=float(color[1]), Blue=float(color[2]))
            shading = E('IfcSurfaceStyleRendering', SurfaceColour=rgb, Transparency=float(1-color[3]) if len(color)>3 else 0., ReflectanceMethod='NOTDEFINED')
            style = E('IfcSurfaceStyle', Name=name, Side='BOTH', Styles=[shading])
            E('IfcStyledItem', Item=tessellation, Styles=[style])
            properties(element, {'AssetId': asset_id, 'Evidence': c.get('evidence', 'Reconstruction'), 'Source': c.get('source', SOURCE_URL), 'Notes': c.get('notes', ''), 'Reconstruction': True, 'RequestedIfcClass': requested}, asset_id)
            source = c.get('source', SOURCE_URL)
            # Location is always a navigable public document URL; the full supplied provenance is also a property.
            url = source if isinstance(source, str) and source.startswith(('https://', 'http://')) else SOURCE_URL
            if url not in docs:
                docs[url] = E('IfcDocumentReference', Location=url, Identification='PUBLIC_SOURCE', Name='Public-source reconstruction reference')
            E('IfcRelAssociatesDocument', GlobalId=guid('document:'+asset_id), RelatedObjects=[element], RelatingDocument=docs[url])
            elements.append(element)
            mapping.append({'asset_id': asset_id, 'name': c['name'], 'system': name, 'ifc_guid': element.GlobalId, 'ifc_class': element.is_a(), 'requested_ifc_class': requested, 'vertices': len(c['vertices']), 'triangles': len(c['faces']), 'closed': closed, 'evidence': c.get('evidence', ''), 'source': source})
        aggregate(group_assembly, elements, system_key)
        E('IfcRelAssignsToGroup', GlobalId=guid('assign:'+name), RelatedObjects=elements, RelatingGroup=functional_system)
    aggregate(assembly, systems, 'turbine-systems')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    f.write(str(output_path))
    report = validate_output(output_path, components)
    mapping_path.parent.mkdir(parents=True, exist_ok=True)
    mapping_path.write_text(json.dumps({'schema': 'IFC4', 'units': 'metre', 'reconstruction': True, 'components': mapping}, ensure_ascii=False, indent=2), encoding='utf-8')
    validation_path.parent.mkdir(parents=True, exist_ok=True)
    validation_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report['schema_errors'] or report['geometry_errors']:
        raise RuntimeError('IFC validation failed; inspect '+str(validation_path))


def validate_output(path, components):
    """Independent schema validator and OpenCascade geometry engine reopen the disk artifact."""
    reopened = ifcopenshell.open(str(path))
    logger = ifcopenshell.validate.json_logger()
    ifcopenshell.validate.validate(reopened, logger, express_rules=True)
    schema_errors = [str(x) for x in logger.statements if x.get('level') in ('error', 'critical')]
    errors, total_triangles = [], 0
    settings = ifcopenshell.geom.settings()
    settings.set(settings.USE_WORLD_COORDS, True)
    for c in components:
        try:
            product = reopened.by_guid(guid(c['id']))
            shape = ifcopenshell.geom.create_shape(settings, product)
            verts = shape.geometry.verts
            if not verts or not shape.geometry.faces:
                raise ValueError('Geometry engine returned no geometry')
            total_triangles += len(shape.geometry.faces)//3
            expected = [[min(v[i] for v in c['vertices']), max(v[i] for v in c['vertices'])] for i in range(3)]
            actual = [[min(verts[i::3]), max(verts[i::3])] for i in range(3)]
            if any(abs(expected[i][j]-actual[i][j]) > 1e-5 for i in range(3) for j in range(2)):
                raise ValueError(f'World bounds changed: {expected} vs {actual}')
            if len(product.Decomposes) != 1 or len(product.IsDefinedBy) != 1:
                raise ValueError('Missing parent or provenance property set')
        except Exception as exc:
            errors.append({'asset_id': c['id'], 'error': str(exc)})
    return {'file': str(path), 'schema': reopened.schema, 'ifcopenshell_version': ifcopenshell.version, 'component_count': len(components), 'functional_system_count': len(reopened.by_type('IfcSystem')), 'triangles_read_by_geometry_engine': total_triangles, 'schema_validation': 'IfcOpenShell attribute and EXPRESS rule validator', 'geometry_validation': 'Reopened disk IFC; OpenCascade tessellation and per-component world bounding-box comparison', 'schema_errors': schema_errors, 'geometry_errors': errors, 'status': 'PASS' if not schema_errors and not errors else 'FAIL'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=ROOT/'data/mesh_exchange.json')
    parser.add_argument('--output', type=Path, default=ROOT/'models/V90_reconstruction.ifc')
    parser.add_argument('--mapping', type=Path, default=ROOT/'data/ifc_mapping.json')
    parser.add_argument('--validation', type=Path, default=ROOT/'data/ifc_validation.json')
    args = parser.parse_args()
    export(args.input, args.output, args.mapping, args.validation)
