"""Convert cached OSRM/OSM public-road route into scenario trunk edges."""
import json, math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
src=json.loads((root.parent/'research/geography/quebec-trunk-routes.json').read_text())
coords=src['routes'][0]['geometry']['coordinates']; points=[w['location'] for w in src['waypoints']]
def km(a,b):
 r=math.pi/180; x=(b[0]-a[0])*r*math.cos((a[1]+b[1])*r/2);y=(b[1]-a[1])*r
 return 6371*math.hypot(x,y)
indices=[0]
for i,p in enumerate(points[1:]):
 indices.append(len(coords)-1 if i==6 else min(range(indices[-1]+1,len(coords)), key=lambda j:km(coords[j],p)))
names=['Dolbeau','Normandin','Saint-Félicien','Roberval','Chambord','Saint-Henri','Péribonka']
nodes=[{'id':f't{i}','position':p} for i,p in enumerate(points[:-1])]
edges=[]
for i,(a,b) in enumerate(zip(indices,indices[1:])):
 line=coords[a:b+1]; distance=sum(km(c,d) for c,d in zip(line,line[1:])); geometry=[line[0]]
 for c in line[1:-1]:
  if km(c,geometry[-1])>.13:geometry.append(c)
 geometry.append(line[-1])
 edges.append({'id':f'trunk-{i}','from':f't{i}','to':f't{(i+1)%7}','km':round(distance,3),'speed':65,'bearing':1,'zone':'north' if i in [0,1,6] else 'south','geometry':geometry,'name':f'{names[i]} – {names[(i+1)%7]}'})
(root/'src/data/quebec-road-network.json').write_text(json.dumps({'nodes':nodes,'edges':edges},separators=(',',':')))
print(f'{len(edges)} road legs, {sum(e["km"] for e in edges):.1f} km; OSM road geometry via OSRM; access spurs are separately modelled.')
