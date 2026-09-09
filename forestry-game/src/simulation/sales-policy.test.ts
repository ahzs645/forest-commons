import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,draftPlan,advance} from './engine';
it.each(['margin','contract-first','penalty-aware'] as const)('runs %s advice without crediting hypothetical avoided penalties as sales', salesPolicy=>{
 const g=createGame(quebec), draft=draftPlan(g,{salesPolicy});
 expect(g.history).toHaveLength(0);
 const result=advance(draft);
 expect(result.history[0].ledger.every(e=>Number.isFinite(e.amount))).toBe(true);
 expect(result.cash).toBeCloseTo(g.cash+result.history[0].ledger.reduce((n,e)=>n+e.amount,0),6);
 expect(result.history[0].ledger.some(e=>e.category==='avoided-penalty')).toBe(false);
});
