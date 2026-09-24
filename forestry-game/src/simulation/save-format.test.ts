import { it, expect } from "vitest";
import { createGame, advance, draftPlan } from "./engine";
import { serializeGame } from "./save-format";
import { parseGame } from "./validation";
import { quebec } from "../scenarios/quebec";
/** Test-side reading of format 4 index runs: [start, signed extra count]. */
const expand=(path:(number|[number,number])[])=>path.flatMap(item=>Array.isArray(item)?Array.from({length:Math.abs(item[1])+1},(_,k)=>item[0]+k*Math.sign(item[1])):[item]);
it("deduplicates complete-season route geometry and restores all historical paths", () => {
  let g = createGame(quebec);
  for (let i = 0; i < 12; i++) g = advance(draftPlan(g));
  const packed = serializeGame(g),
    plain = JSON.stringify(g);
  expect(packed.length).toBeLessThan(plain.length * 0.3);
  expect(packed.length * 2).toBeLessThan(4_000_000);
  expect(parseGame(packed)).toEqual(parseGame(plain));
}, 60000);
it("rejects invalid packed route references", () => {
  const g = advance(draftPlan(createGame(quebec)));
  const packed = JSON.parse(serializeGame(g));
  packed.game.history[0].movements[0].path.routePath = -1;
  expect(() => parseGame(JSON.stringify(packed))).toThrow("route reference");
});

it("retains version-one save compatibility and validates packed weather tuples",()=>{
 const g=createGame(quebec);
 const legacy={format:"forest-commons-save",formatVersion:1,paths:[],game:g};
 expect(parseGame(JSON.stringify(legacy))).toEqual(parseGame(JSON.stringify(g)));
 const packed=JSON.parse(serializeGame(g));expect(packed.formatVersion).toBe(4);
 const scenario=Object.keys(g.region.weather)[0];packed.game.region.weatherCharts.scenarios[scenario].forecast.north[0]=[1,2];
 expect(()=>parseGame(JSON.stringify(packed))).toThrow('weather value');
});

it("rejects invalid coordinate dictionaries and indices", () => {
 const packed=JSON.parse(serializeGame(createGame(quebec)));
 packed.paths[0][0]=packed.points.length;
 expect(()=>parseGame(JSON.stringify(packed))).toThrow('coordinate reference');
 const invalid=JSON.parse(serializeGame(createGame(quebec)));invalid.points[0]=[200,90];
 expect(()=>parseGame(JSON.stringify(invalid))).toThrow('coordinate dictionary');
});
it('loads version-two route dictionaries after coordinate compression is introduced', () => {
 const g=advance(draftPlan(createGame(quebec)));
 const latest=JSON.parse(serializeGame(g));
 const paths=latest.paths.map((path:(number|[number,number])[])=>expand(path).map(i=>latest.points[i]));
 const game=JSON.parse(JSON.stringify(latest.game),(key,v)=> ['geometry','polygon'].includes(key)?paths[v.routePath]:v);
 const legacy={format:'forest-commons-save',formatVersion:2,paths,game};
 expect(parseGame(JSON.stringify(legacy))).toEqual(parseGame(JSON.stringify(g)));
});

it('writes consecutive route indices as runs and still loads version-three saves', () => {
 const g=advance(draftPlan(createGame(quebec)));
 const latest=JSON.parse(serializeGame(g));
 expect(latest.paths.some((path:unknown[])=>path.some(Array.isArray))).toBe(true);
 const legacy={...latest,formatVersion:3,paths:latest.paths.map(expand)};
 expect(parseGame(JSON.stringify(legacy))).toEqual(parseGame(JSON.stringify(g)));
 const broken=JSON.parse(serializeGame(g));broken.paths[0]=[[0,0]];
 expect(()=>parseGame(JSON.stringify(broken))).toThrow('coordinate reference');
});
