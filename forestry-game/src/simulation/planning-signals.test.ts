import {expect,it} from 'vitest';
import {princeGeorge} from '../scenarios/prince-george';
import {createGame} from './engine';
import {haulWindowFindings,planExceptions} from './operational-readiness';
import {translateRuntime} from '../i18n-runtime';

// Early break-up forecast: frozen weeks 1–3, thaw 4–8 (FSRs closed), wet from week 9.
const at=(week:number)=>{const g=createGame(princeGeorge,'long-thaw',2026);g.week=week;g.plan.crews=Object.fromEntries(Object.keys(g.plan.crews).map(c=>[c,[]]));g.plan.crews.C1=[{stand:'BC03',hours:50}];return g;};

it('warns when wood cut this turn cannot be hauled before it downgrades or spoils',()=>{
 // Frozen roads: no warning.
 expect(haulWindowFindings(at(1))).toEqual([]);
 // Cut in turn 4, roads reopen in turn 9: pulp (4 turns) spoils, sawlogs (3 + 4) survive as pulp.
 const w4=haulWindowFindings(at(4));
 expect(w4).toHaveLength(1);
 expect(w4[0]).toMatchObject({code:'haul-window',subject:'BC03',level:'warning'});
 expect(w4[0].message).toBe('BC03: no haul route to a buyer is forecast open until turn 9. Pulp cut this turn becomes waste first, and sawlogs become pulp.');
 // Cut in turn 6: three turns to wait, so only sawlogs lose value.
 expect(haulWindowFindings(at(6))[0].message).toBe('BC03: sawlogs cut this turn are forecast to become pulp before a haul route opens (next open turn: 9).');
 // The finding reaches the plan review and has a French translation.
 expect(planExceptions(at(4)).some(f=>f.code==='haul-window')).toBe(true);
 expect(translateRuntime(w4[0].message)).toMatch(/^BC03 : aucune route de transport/);
});

it('balances rest-of-season demand by product against secured wood',async()=>{
 const {seasonBalance}=await import('./planning');
 const g=createGame(princeGeorge,'normal',2026);
 const rows=Object.fromEntries(seasonBalance(g).map(b=>[b.product.id,b]));
 // All three months of demand remain at the start, and secured stands sit above the 12.1% retention floor.
 expect(Object.values(rows).reduce((n,b)=>n+b.demand,0)).toBe(princeGeorge.mills.reduce((n,m)=>n+m.demand.reduce((t,d)=>t+Object.values(d).reduce((a,v)=>a+v,0),0),0));
 const owned=princeGeorge.stands.filter(s=>s.supply==='guaranteed');
 expect(rows['soft-saw'].secured).toBeCloseTo(owned.reduce((n,s)=>n+s.volume*(1-.121)*(s.mix['soft-saw']??0),0),6);
 // The four secured birch–balsam stands grow barely half the sawlog buyers want; the lots on offer could cover it.
 expect(rows['soft-saw'].balance).toBeLessThan(-10000);
 expect(rows['soft-saw'].available).toBeGreaterThan(-rows['soft-saw'].balance);
 // Hardwood pulp is close to balanced: secured birch covers it.
 expect(Math.abs(rows['hard-pulp'].balance)).toBeLessThan(.05*rows['hard-pulp'].demand);
});

it('appraises an unowned lot as if its own access road were authorized',async()=>{
 const {appraise}=await import('./appraisal');
 const g=createGame(princeGeorge,'normal',2026);
 // BC21 is an auction lot whose access road needs a permit the buyer applies for after winning.
 expect(g.region.bcTenure!.roads['access-BC21'].initialStatus).toBe('required');
 const a=appraise(g,'BC21');
 // Buyers are reachable in frozen and normal weather; thaw closes the FSRs.
 expect(a.cases.filter(c=>c.weather==='frozen'||c.weather==='normal').every(c=>c.products.some(p=>p.offers.length>0))).toBe(true);
 expect(a.cases[1].capped).toBeGreaterThan(-a.purchase);
});
