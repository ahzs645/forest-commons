"""Build a teaching graph from cached official FSR and VRI geometry. No remote requests."""
import json,math,collections
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]
source=BASE/'research/bc-inputs'
fsr=json.loads((source/'fsr-prince-george.json').read_text())['features']
vri=json.loads((source/'fsr-7695-inventory/inventory-rank1.geojson').read_text())['features']
def km(a,b):
 x=math.radians(b[0]-a[0])*math.cos(math.radians((a[1]+b[1])/2)); y=math.radians(b[1]-a[1]); return 6371.0088*math.hypot(x,y)
def key(p):return (round(p[0],5),round(p[1],5))
lines=[]
for f in fsr:
 p=f['properties'];assert p['FILE_TYPE_DESCRIPTION']=='Forest Service Road' and p['LIFE_CYCLE_STATUS_CODE']=='ACTIVE'
 for j,coords in enumerate(f['geometry']['coordinates'] if f['geometry']['type']=='MultiLineString' else [f['geometry']['coordinates']]):
  lines.append({'id':str(p['OBJECTID'])+'-'+str(j),'name':f"FSR {p['FOREST_FILE_ID']} section {p['ROAD_SECTION_ID']}",'coords':coords})
# Junctions only where source vertices coincide within about one metre. No assumed crossing links.
occ=collections.Counter(key(p) for line in lines for p in line['coords'])
points={key(p):p for line in lines for p in line['coords']};adj=collections.defaultdict(set)
for line in lines:
 for a,b in zip(line['coords'],line['coords'][1:]):adj[key(a)].add(key(b));adj[key(b)].add(key(a))
components=[];remaining=set(adj)
while remaining:
 seen=set();todo=[next(iter(remaining))]
 while todo:
  a=todo.pop()
  if a in seen:continue
  seen.add(a);todo.extend(adj[a]-seen)
 remaining-=seen;components.append(seen)
candidates=[]
for f in vri:
 geo=f['geometry'];polys=geo['coordinates'] if geo['type']=='MultiPolygon' else [geo['coordinates']]
 if len(polys)!=1 or len(polys[0])!=1:continue # Preserve shape fidelity: don't discard holes or islands.
 ring=polys[0][0];props=f['properties'];ha=props.get('FEATURE_AREA_SQM',0)/10000
 if not 15<=ha<=85 or not props.get('LIVE_STAND_VOLUME_175',0):continue
 center=[sum(p[i] for p in ring[:-1])/(len(ring)-1) for i in (0,1)]
 candidates.append({'sourceId':str(props['FEATURE_ID']),'polygon':ring,'hectares':round(ha,3),'position':center})
# Choose the connected source component best serving the sample inventory.
best=None
for component in components:
 near=[]
 for c in candidates:
  node=min(component,key=lambda x:km(points[x],c['position']));distance=km(points[node],c['position'])
  if distance<=2:near.append((distance,c,node))
 if best is None or len(near)>len(best[1]):best=(component,near)
component,near=best;near.sort(key=lambda x:(x[0],x[1]['sourceId']));selected=near[:24]
assert len(selected)>=12,'Too few nearby eligible inventory polygons'
keep={node for _,_,node in selected}
for line in lines:
 coords=line['coords']
 if key(coords[0]) not in component:continue
 keep.update([key(coords[0]),key(coords[-1])]);keep.update(key(p) for p in coords if occ[key(p)]>1)
 # Intermediate route nodes support distinct teaching depot locations.
 keep.update(key(coords[i]) for i in range(0,len(coords),max(1,len(coords)//6)))
nodeIds={p:f'bc-road-{i}' for i,p in enumerate(sorted(keep))};nodes=[{'id':v,'position':points[k]} for k,v in nodeIds.items()];edges=[]
for line in lines:
 coords=line['coords']
 if key(coords[0]) not in component:continue
 start=0
 for i in range(1,len(coords)):
  if key(coords[i]) not in keep:continue
  path=coords[start:i+1];a=key(path[0]);b=key(path[-1]);start=i
  if a==b:continue
  edges.append({'id':f"fsr-{line['id']}-{i}",'name':line['name']+' · mapped FSR; model access', 'from':nodeIds[a],'to':nodeIds[b],'geometry':path,'km':sum(km(x,y) for x,y in zip(path,path[1:])),'speed':35,'bearing':2,'zone':'north','roadClass':'forest'})
stands=[]
for i,(distance,c,node) in enumerate(selected):
 sid=f'BC{i+1:02}';nid='stand-'+sid;nodes.append({'id':nid,'position':c['position']})
 edges.append({'id':'access-'+sid,'name':'Modelled access spur '+sid+' · not a surveyed road','from':nodeIds[node],'to':nid,'geometry':[points[node],c['position']],'km':max(.001,distance),'speed':15,'bearing':1,'zone':'north','roadClass':'forest'})
 stands.append({**c,'id':sid,'node':nid})
used={e[k] for e in edges for k in ['from','to']};nodes=[n for n in nodes if n['id'] in used]
result={'roads':{'nodes':nodes,'edges':edges},'stands':stands,'provenance':{'fsrFeatures':len({e['id'].split('-')[1] for e in edges if e['id'].startswith('fsr-')}),'sourceComponents':len(components),'junctionTolerance':'source vertices rounded to 5 decimals; no intersection inferred without matching vertices','inventoryVolume':'120 m³/ha teaching assumption, NOT VRI estimated volume','sourceGeometry':'whole single-ring polygons only; holes and multipart inventory excluded','sourceUrl':'https://catalogue.data.gov.bc.ca/dataset/9e5bfa62-2339-445e-bf67-81657180c682'}}
output=BASE/'forestry-game/src/data/prince-george.json';output.write_text(json.dumps(result,separators=(',',':'))+'\n')
print(json.dumps({'stands':len(stands),'nodes':len(nodes),'edges':len(edges),'mappedKm':sum(e['km'] for e in edges if e['id'].startswith('fsr-')),'provenance':result['provenance']}))
