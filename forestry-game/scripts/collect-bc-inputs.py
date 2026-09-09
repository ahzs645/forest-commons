"""Collect official BC metadata and bounded, openly licensed geographic samples.

Usage: python3 scripts/collect-bc-inputs.py OUTPUT_DIRECTORY
Creates a new output directory; never overwrites an existing evidence snapshot.
The chosen Prince George area is an authoring sample, not a complete region.
"""
import datetime
import hashlib
import json
from pathlib import Path
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

CATALOGUE = 'https://catalogue.data.gov.bc.ca/api/3/action/package_show'
WFS = 'https://openmaps.gov.bc.ca/geo/pub/wfs'
# west, south, east, north; illustrative authoring area northwest of Prince George.
BBOX = list(map(float, sys.argv[2:])) if len(sys.argv) == 6 else [-123.0, 53.95, -122.9, 54.02]
if len(sys.argv) not in (2, 6) or not (-180 <= BBOX[0] < BBOX[2] <= 180 and -90 <= BBOX[1] < BBOX[3] <= 90):
    raise SystemExit('Usage: collector OUTPUT [west south east north]')
DATASETS = {
    'inventory-rank1': ('2ebb35d8-c82f-4a17-9c96-612ac3532d55', 'WHSE_FOREST_VEGETATION.VEG_COMP_LYR_R1_POLY'),
    'tenure-roads': ('9e5bfa62-2339-445e-bf67-81657180c682', 'WHSE_FOREST_TENURE.FTEN_ROAD_SEGMENT_LINES_SVW'),
    'road-atlas': ('bb060417-b6e6-4548-b837-f9060d94743e', None),
    'processing-facilities': ('67daf53d-e3bb-45ee-9121-8aa1193b7492', None),
}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'ForestCommons-educational-data-review/1.0'}), timeout=60) as response:
        return json.load(response)

def write(path, data):
    content = (json.dumps(data, indent=2, ensure_ascii=False) + '\n').encode()
    path.write_bytes(content)
    return hashlib.sha256(content).hexdigest()

def main():
    output = Path(sys.argv[1])
    output.mkdir(parents=True, exist_ok=False)
    report = {'collectedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'bboxWGS84': BBOX,
              'status': 'unreviewed-geographic-authoring-sample', 'datasets': [],
              'limitations': ['No mill operating status, capacity or market prices inferred.',
                'Inventory volume fields require their published utilization and projection definitions.',
                'Tenure road lines do not establish a connected or truck-accessible road graph.',
                'Samples intersect the bounding box; geometry is not clipped to it.',
                'No harvest rights, ecological calibration, or professional review is implied.']}
    failures = []
    for name, (dataset_id, layer) in DATASETS.items():
        entry = {'name': name, 'catalogueUrl': f'https://catalogue.data.gov.bc.ca/dataset/{dataset_id}'}
        report['datasets'].append(entry)
        try:
            metadata_url = CATALOGUE + '?' + urllib.parse.urlencode({'id': dataset_id})
            response = get(metadata_url)
            if not response.get('success'):
                raise ValueError('Catalogue lookup failed')
            metadata = response['result']
            entry.update(title=metadata['title'], license=metadata.get('license_title'),
                         licenseUrl=metadata.get('license_url'), metadataModified=metadata.get('metadata_modified'),
                         metadataRequest=metadata_url,
                         metadataSha256=write(output / f'{name}.metadata.json', metadata))
            if not layer or metadata.get('license_title') != 'Open Government Licence - British Columbia':
                entry['dataStatus'] = 'metadata-only; reuse terms need review'
                continue
            if not any(r.get('object_name') == layer for r in metadata['resources']):
                raise ValueError('Expected geographic layer is no longer in catalogue metadata')
            schema_url = WFS + '?' + urllib.parse.urlencode({'service': 'WFS', 'version': '2.0.0', 'request': 'DescribeFeatureType', 'typeNames': layer})
            with urllib.request.urlopen(schema_url, timeout=60) as response:
                schema = response.read()
            (output / f'{name}.schema.xml').write_bytes(schema)
            geometry_fields = [element.attrib['name'] for element in ET.fromstring(schema).iter()
                               if element.attrib.get('type', '').startswith('gml:') and 'name' in element.attrib]
            if len(geometry_fields) != 1:
                raise ValueError('Expected one geometry field in the service schema')
            geometry = geometry_fields[0]
            entry.update(schemaRequest=schema_url, schemaSha256=hashlib.sha256(schema).hexdigest(), geometryField=geometry)
            # Ask for one beyond the limit, so truncation is explicit rather than silent.
            params = {'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature',
                      'typeNames': layer, 'outputFormat': 'application/json', 'srsName': 'EPSG:4326',
                      'count': 1001, 'CQL_FILTER': f"BBOX({geometry},{','.join(map(str,BBOX))},'EPSG:4326')"}
            url = WFS + '?' + urllib.parse.urlencode(params)
            data = get(url)
            if data.get('type') != 'FeatureCollection' or not isinstance(data.get('features'), list):
                raise ValueError('Expected GeoJSON FeatureCollection')
            count = len(data['features'])
            if not count:
                raise ValueError('No sample features returned')
            matched = data.get('numberMatched', data.get('totalFeatures'))
            # Unknown server totals cannot support a completeness claim.
            complete = isinstance(matched, (int, float)) and matched == count and count <= 1000
            entry.update(dataStatus='bounded sample; not a regional package', returned=count,
                         numberMatched=matched, completeWithinBBox=complete, request=url,
                         dataSha256=write(output / f'{name}.geojson', data))
        except Exception as error:
            entry['error'] = str(error)
            failures.append(name)
        write(output / 'manifest.json', report)
    print(json.dumps({'directory': str(output), 'datasets': [{k: d.get(k) for k in ['name', 'license', 'returned', 'completeWithinBBox', 'error']} for d in report['datasets']]}))
    if failures:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
