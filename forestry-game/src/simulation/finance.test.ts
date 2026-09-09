import { describe, it, expect } from 'vitest';
import { quebec } from '../scenarios/quebec';
import { advance, createGame, purchase, refuse } from './engine';
import { validateRegion } from './validation';
describe('Scenario financing', () => {
  it('charges effective weekly interest after expenses and compounds outstanding debt', () => {
    const r = structuredClone(quebec);
    r.economy.startingCash = 0;
    r.economy.annualDebtRate = .12;
    let g = createGame(r);
    for (let i = 0; i < 2; i++) {
      const previous = g.cash;
      g = advance(g);
      const ledger = g.history.at(-1)!.ledger;
      const beforeInterest = previous + ledger.filter(e => e.category !== 'interest').reduce((n,e) => n+e.amount,0);
      expect(ledger.find(e => e.category === 'interest')!.amount).toBeCloseTo(beforeInterest * (Math.pow(1.12,1/52)-1), 8);
      expect(g.cash).toBeCloseTo(previous + ledger.reduce((n,e) => n+e.amount,0), 8);
    }
  });
  it('leaves old scenarios interest-free and rejects invalid new settings', () => {
    expect(advance(createGame(quebec)).history[0].ledger.some(e => e.category === 'interest')).toBe(false);
    for (const value of [-1, Infinity, NaN]) {
      const r = structuredClone(quebec); r.economy.annualDebtRate = value;
      expect(() => validateRegion(r)).toThrow();
    }
  });
  it('charges only purchased standing stock above the terminal allowance', () => {
    const r = structuredClone(quebec); r.weeks = 1;
    r.economy.terminalStandingAllowanceM3 = 100;
    const g = createGame(r);
    g.stands[0].purchasePaid = 1;
    const remaining = g.stands[0].remaining;
    const result = advance(g).history[0];
    expect(result.ledger.find(e => e.description === 'Unused purchased standing timber')!.amount).toBeCloseTo(-Math.max(0,remaining-100)*r.economy.terminalStandingCostM3);
  });
});

it('enforces a configured procurement borrowing limit',()=>{
 const r=structuredClone(quebec);r.economy.startingCash=0;
 const lot=r.stands.find(s=>s.supply==='private')!;
 const g=createGame(r);expect(()=>purchase(g,lot.id)).toThrow();
 g.region.economy.procurementCreditLimit=lot.askingPrice;
 const bought=purchase(g,lot.id);expect(bought.cash).toBe(-lot.askingPrice);
 const another=r.stands.find(s=>s.supply==='private'&&s.id!==lot.id)!;
 expect(()=>purchase(bought,another.id)).toThrow();
});
it('harvest royalties defer acquisition payment and charge only actual harvested volume',()=>{
 const r=structuredClone(quebec);r.economy.timberPayment='harvest-royalty';
 const d=r.stands.find(s=>s.supply==='private')!;d.terrain=1;
 let g=purchase(createGame(r),d.id);expect(g.cash).toBe(r.economy.startingCash);
 const crew=r.crews[0];g.crewPositions[crew.id]=d.node;g.plan.crews[crew.id]=[{stand:d.id,hours:1}];
 g=advance(g);const state=g.stands.find(s=>s.id===d.id)!;
 expect(state.harvested).toBeGreaterThan(0);
 expect(g.history[0].ledger.find(e=>e.category==='royalty')!.amount).toBeCloseTo(-state.harvested*d.askingPrice/d.volume);
});

it('refusing a royalty auction charges a guarantee and never refunds unpaid timber',()=>{
 const r=structuredClone(quebec);r.economy.timberPayment='harvest-royalty';r.economy.startingCash=0;
 const lot=r.stands.find(s=>s.supply==='auction'&&s.auctionWeek===1)!;
 let g=createGame(r);const bid=lot.askingPrice*2;g.plan.bids[lot.id]=bid;g=advance(g);
 expect(g.stands.find(s=>s.id===lot.id)!.owned).toBe(true);
 expect(g.history[0].ledger.find(e=>e.category==='auction')!.amount).toBe(0);
 const before=g.cash;g=refuse(g,lot.id);expect(g.cash-before).toBeCloseTo(-bid*r.economy.refusalPercent);
});

it.each(['upfront','harvest-royalty'] as const)('does not charge returned auction timber again at campaign end (%s)',payment=>{
 const r=structuredClone(quebec);r.weeks=2;r.economy.startingCash=1e7;
 if(payment==='harvest-royalty')r.economy.timberPayment=payment;
 const lot=r.stands.find(s=>s.supply==='auction'&&s.auctionWeek===1)!;
 let game=createGame(r);const bid=lot.askingPrice*2;game.plan.bids[lot.id]=bid;game=advance(game);
 expect(game.stands.find(s=>s.id===lot.id)!.owned).toBe(true);
 const before=game.cash;game=refuse(game,lot.id);
 expect(game.cash-before).toBeCloseTo(payment==='upfront'?bid*(1-r.economy.refusalPercent):-bid*r.economy.refusalPercent);
 const final=advance(game);expect(final.history.at(-1)!.ledger.find(e=>e.description==='Unused purchased standing timber')!.amount).toBeCloseTo(0);
 expect(final.stands.find(s=>s.id===lot.id)).toMatchObject({owned:false,refused:true,purchasePaid:bid});
 expect(()=>refuse(final,lot.id)).toThrow();
});
