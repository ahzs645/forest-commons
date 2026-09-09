import {describe,it,expect} from 'vitest';
import {createGame,advance,draftPlan,purchase} from './engine';
import {quebec} from '../scenarios/quebec';
import {lotProfitability,lotProfitabilityCSV,type LotCashEntry} from './lot-profitability';
describe('recorded lot cash contribution',()=>{
 it('records source lots on actual operating receipts and direct costs',()=>{
  let g=createGame(quebec);
  const privateLot=g.region.stands.find(s=>s.supply==='private'&&!g.stands.find(t=>t.id===s.id)!.owned)!;
  g=purchase(g,privateLot.id);expect(g.instantLedger.at(-1)?.standId).toBe(privateLot.id);
  g=advance(draftPlan(g));
  const direct=g.history[0].ledger.filter(e=>['production','sales','haul','purchase','royalty'].includes(e.category));
  expect(direct.some(e=>e.category==='production')).toBe(true);
  expect(direct.some(e=>e.category==='sales')).toBe(true);
  expect(direct.every(e=>g.region.stands.some(s=>s.id===e.standId))).toBe(true);
  expect(lotProfitability(g).reconciliationDifference).toBeCloseTo(0,5);
 });
 it('does not value held standing timber or invent revenue',()=>{const g=createGame(quebec);expect(lotProfitability(g)).toMatchObject({lots:[],ledgerNet:0,entries:0});});
 it('counts rolled-over transactions once and reconciles unallocated overhead',()=>{
  const g=advance(createGame(quebec)),id=g.region.stands[0].id;
  const entries:LotCashEntry[]=[{category:'purchase',description:'Acquired',amount:-100,standId:id},{category:'sales',description:'Actual sale',amount:140,standId:id},{category:'overhead',description:'Shared',amount:-7}];
  g.history[0].ledger=entries;g.instantLedger=[{category:'royalty',description:'Current transaction',amount:-5,standId:id} as LotCashEntry];g.cash=g.region.economy.startingCash+28;
  const result=lotProfitability(g);expect(result.lots[0]).toMatchObject({receipts:140,costs:105,net:35,entries:3});expect(result).toMatchObject({ledgerNet:28,unallocatedNet:-7,reconciliationDifference:0,entries:4});
 });
 it('keeps legacy sales and unknown identifiers unattributed instead of guessing',()=>{
  const g=createGame(quebec);g.instantLedger=[{category:'sales',description:'Mill · logs',amount:500},{category:'production',description:'Unknown lot',amount:-20,standId:'missing'} as LotCashEntry];g.cash+=480;
  const result=lotProfitability(g);expect(result.lots).toEqual([]);expect(result.unallocatedNet).toBe(480);expect(result.reconciliationDifference).toBe(0);
 });
 it('never treats internal movement or held processed stock as receipts',()=>{
  const g=createGame(quebec),id=g.region.stands[0].id;g.instantLedger=[{category:'haul',description:'To internal processing',amount:-12,standId:id} as LotCashEntry];g.cash-=12;
  expect(lotProfitability(g).lots[0]).toMatchObject({receipts:0,costs:12,net:-12});expect(lotProfitabilityCSV(g)).toContain('"-12"');
 });
 it('reports an incomplete imported cash history without allocating the difference',()=>{const g=createGame(quebec);g.cash+=100;expect(lotProfitability(g)).toMatchObject({reconciliationDifference:100,attributedNet:0,unallocatedNet:0});});
});
