import type { Game, Position } from "./types";
/** Routes repeat for every load and week. Store each coordinate sequence once. */
export function serializeGame(game: Game): string {
  const paths: number[][] = [],
    points: Position[] = [],
    pointIndices = new Map<string, number>(),
    indices = new Map<string, number>();
  const packed = JSON.parse(
    JSON.stringify(game, (key, value) => {
      if(key === "weatherCharts" && value) return {...value, scenarios:Object.fromEntries(Object.entries(value.scenarios).map(([id, scenario])=>[id,Object.fromEntries(Object.entries(scenario as Record<string,Record<string,{temperatureC:number;snowCm:number;precipitationMm:number}[]>>).map(([kind,zones])=>[kind,Object.fromEntries(Object.entries(zones).map(([zone,points])=>[zone,points.map(p=>[p.temperatureC,p.snowCm,p.precipitationMm])]))]))]))};
      if (!["path", "geometry", "polygon"].includes(key) || !Array.isArray(value)) return value;
      const signature = JSON.stringify(value);
      let index = indices.get(signature);
      if (index === undefined) {
        index = paths.length;
        indices.set(signature, index);
        paths.push(value.map((point: Position) => {
          const coordinate = JSON.stringify(point);
          let pointIndex = pointIndices.get(coordinate);
          if (pointIndex === undefined) { pointIndex = points.length; pointIndices.set(coordinate, pointIndex); points.push(point); }
          return pointIndex;
        }));
      }
      return { routePath: index };
    }),
  );
  return JSON.stringify({
    format: "forest-commons-save",
    formatVersion: 3,
    points,
    paths,
    game: packed,
  });
}
export function unpackGame(value: unknown): unknown {
  const envelope = value as {
    format?: string;
    formatVersion?: number;
    paths?: unknown[];
    points?: unknown[];
    game?: unknown;
  };
  if (envelope?.format !== "forest-commons-save") return value;
  if (
    ![1,2,3].includes(envelope.formatVersion ?? 0) ||
    !Array.isArray(envelope.paths) ||
    envelope.paths.length > 100000 ||
    !envelope.game
  )
    throw Error("Invalid packed save.");
  let paths = envelope.paths;
  if (envelope.formatVersion === 3) {
    const points = envelope.points;
    if (!Array.isArray(points) || points.length > 1000000 || !points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number' && Number.isFinite(n)) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) throw Error('Invalid saved coordinate dictionary.');
    paths = paths.map(path => {
      if (!Array.isArray(path) || path.length > 100000 || !path.every(i => Number.isInteger(i) && i >= 0 && i < points.length)) throw Error('Invalid saved coordinate reference.');
      return path.map(i => points[i]);
    });
  }
  return JSON.parse(JSON.stringify(envelope.game), (key, v) => {
    if(key === "weatherCharts" && v && (envelope.formatVersion ?? 0) >= 2) {
      if(!v.scenarios || typeof v.scenarios !== 'object' || Array.isArray(v.scenarios))throw Error('Invalid packed weather data.');
      for(const scenario of Object.values(v.scenarios) as Record<string,unknown>[])for(const kind of ['forecast','actual']){
        const zones=scenario[kind];if(!zones || typeof zones !== 'object' || Array.isArray(zones))throw Error('Invalid packed weather data.');
        for(const [zone,points] of Object.entries(zones)){
          if(!Array.isArray(points)||points.length!==52)throw Error('Invalid packed weather data.');
          (zones as Record<string,unknown>)[zone]=points.map((p:unknown)=>{
            if(!Array.isArray(p)||p.length!==3||!p.every(n=>typeof n==='number'&&Number.isFinite(n)))throw Error('Invalid packed weather value.');
            return {temperatureC:p[0],snowCm:p[1],precipitationMm:p[2]};
          });
        }
      }
    }
    if (!(envelope.formatVersion === 3 ? ["path", "geometry", "polygon"].includes(key) : key === "path")) return v;
    if (
      !v ||
      !Number.isInteger(v.routePath) ||
      v.routePath < 0 ||
      v.routePath >= paths.length
    )
      throw Error("Invalid saved route reference.");
    return paths[v.routePath];
  });
}
