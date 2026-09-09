import {describe,it,expect} from 'vitest';
import {createGame,advance} from './engine';
import {quebec} from '../scenarios/quebec';
import {applyBidComposition,compositionIsActive,validateBidCompositions} from './bid-composition';
import {parseGame} from './validation';
function auction(){const region=structuredClone(quebec);const lot=region.stands.find(s=>s.supply==='auction')!;lot.auctionWeek=1;const g=createGame(region);return {g,lot,product:Object.keys(lot.mix).find(p=>lot.mix[p]>0)!};}
describe('bid composition audit snapshot',()=>{
 it('applies exact product sum and preserves it through save import',()=>{const {g,lot,product}=auction();const next=applyBidComposition(g,lot.id,{[product]:123.45});expect(next.plan.bids[lot.id]).toBe(123.45);expect(g.plan.bids[lot.id]).toBeUndefined();expect(compositionIsActive(next.plan,lot.id)).toBe(true);expect(parseGame(JSON.stringify(next)).plan.bidComposition).toEqual(next.plan.bidComposition);});
 it('recognizes superseded snapshots without replacing manual bids',()=>{const {g,lot,product}=auction();const next=applyBidComposition(g,lot.id,{[product]:30});next.plan.bids[lot.id]=70;expect(compositionIsActive(next.plan,lot.id)).toBe(false);expect(validateBidCompositions(next.region,next.plan.bidComposition)).toBe(true);expect(next.plan.bids[lot.id]).toBe(70);});
 it('rejects invented products, bad values, mismatched sum and closed lots',()=>{const {g,lot,product}=auction();expect(()=>applyBidComposition(g,lot.id,{madeup:20})).toThrow();expect(()=>applyBidComposition(g,lot.id,{[product]:NaN})).toThrow();expect(validateBidCompositions(g.region,{[lot.id]:{bid:50,contributions:{[product]:40}}})).toBe(false);g.week++;expect(()=>applyBidComposition(g,lot.id,{[product]:20})).toThrow();});
 it('rejects an invalid saved audit breakdown rather than importing it as evidence',()=>{const {g,lot,product}=auction();const next=applyBidComposition(g,lot.id,{[product]:30});next.plan.bidComposition![lot.id].bid=31;expect(()=>parseGame(JSON.stringify(next))).toThrow();});
 it('records rationale in the settled week without changing auction outcome',()=>{const {g,lot,product}=auction();const amount=lot.askingPrice*1.3;const withBreakdown=applyBidComposition(g,lot.id,{[product]:amount});const manual=structuredClone(g);manual.plan.bids[lot.id]=amount;const a=advance(withBreakdown),b=advance(manual);expect(a.cash).toBe(b.cash);expect(a.stands).toEqual(b.stands);expect(a.history.at(-1)!.plan.bidComposition?.[lot.id].bid).toBe(amount);});
});
