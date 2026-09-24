"""Build the Prince George public-road connector from cached OSRM routes.

  python3 scripts/build-prince-george-connector.py          # build from the cache (no network)
  python3 scripts/build-prince-george-connector.py --fetch  # re-request routes into the cache first

Routes run from the southern exit of the mapped FSR network (bc-road-30) along
public roads to a junction on the John Hart Highway in Prince George, then to
five fictional receiving-business locations in general industrial areas. The
locations are teaching points, not actual facilities. OSRM is a car-routing
service over OpenStreetMap data (ODbL); it is not a certified heavy-truck route.
"""
import json, math, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
CACHE = BASE / 'research/bc-inputs/pg-connector-osrm'
OUT = BASE / 'forestry-game/src/data/prince-george-connector.json'
OSRM = 'https://router.project-osrm.org/route/v1/driving'
FSR_EXIT = ('bc-road-30', (-122.8600883, 54.03249374))
JUNCTION = ('pg-district', (-122.762081, 53.932033))
YARDS = {
    'pg-yard-a': (-122.745, 53.925), 'pg-yard-b': (-122.772, 53.898), 'pg-yard-c': (-122.715, 53.930),
    'pg-yard-d': (-122.795, 53.940), 'pg-yard-e': (-122.720, 53.905),
}
LEGS = [('trunk', FSR_EXIT, JUNCTION)] + [(yard, JUNCTION, (yard, point)) for yard, point in YARDS.items()]
MAX_TRUCK_KMH = 70  # loaded log-truck speed cap on public roads (teaching value)

def url(a, b):
    return f"{OSRM}/{a[0]},{a[1]};{b[0]},{b[1]}?overview=full&geometries=geojson&steps=true"

if '--fetch' in sys.argv:
    CACHE.mkdir(parents=True, exist_ok=True)
    requests = {}
    for name, (_, a), (_, b) in LEGS:
        requests[name] = url(a, b)
        body = subprocess.run(['curl', '-s', '--max-time', '60', requests[name]], capture_output=True, text=True, check=True).stdout
        assert json.loads(body)['code'] == 'Ok', name
        (CACHE / f'{name}.json').write_text(body)
    (CACHE / 'manifest.json').write_text(json.dumps({
        'collectedAt': datetime.now(timezone.utc).isoformat(), 'service': 'OSRM demo server (car profile)',
        'data': 'OpenStreetMap contributors, ODbL', 'requests': requests,
        'limitations': ['Car routing, not a certified heavy-truck or permitted log-haul route.',
                        'Receiving locations are fictional teaching points in general industrial areas.'],
    }, indent=1) + '\n')

nodes, edges = [], []
for name, (from_id, _), (to_id, _) in LEGS:
    data = json.loads((CACHE / f'{name}.json').read_text())
    route, end = data['routes'][0], data['waypoints'][1]['location']
    km = route['distance'] / 1000
    streets = [s['name'] for s in route['legs'][0]['steps'] if s['name'] and s['distance'] > 150]
    via = ' → '.join(dict.fromkeys(streets)) or 'local streets'
    if to_id != JUNCTION[0] or name == 'trunk':
        nodes.append({'id': to_id, 'position': end})
    edges.append({
        'id': 'pg-connector' if name == 'trunk' else f'{to_id}-spur',
        'name': f'{via} · public road (OSRM car route; not a certified haul route)',
        'from': from_id, 'to': to_id, 'geometry': route['geometry']['coordinates'],
        'km': round(km, 3), 'speed': round(min(MAX_TRUCK_KMH, km / (route['duration'] / 3600)), 1),
        'bearing': 1, 'zone': 'south', 'roadClass': 'public',
    })
OUT.write_text(json.dumps({'source': 'research/bc-inputs/pg-connector-osrm', 'nodes': nodes, 'edges': edges}) + '\n')
print('\n'.join(f"{e['id']}: {e['km']} km at {e['speed']} km/h · {e['name']}" for e in edges))
