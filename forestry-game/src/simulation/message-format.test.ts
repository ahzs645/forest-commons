import {expect,it} from 'vitest';
import {advance,createGame} from './engine';
import {quebec} from '../scenarios/quebec';
import {translateRuntime} from '../i18n-runtime';

it('prints auction amounts with currency and thousands separators, and French reformats them',()=>{
 const game=createGame(quebec);
 const auction=quebec.stands.find(s=>s.supply==='auction'&&s.auctionWeek===1)!;
 game.plan.bids[auction.id]=1;
 const lost=advance(game).history[0].messages.find(m=>m.startsWith(`${auction.id}: rival bid`))!;
 expect(lost).toMatch(new RegExp(`^${auction.id}: rival bid CAD \\d{1,3}(,\\d{3})+ won\\.$`));
 expect(translateRuntime(lost)).toMatch(/l’offre concurrente de \d{1,3}( \d{3})+ CAD a remporté le lot\.$/);
 const won=createGame(quebec);won.plan.bids[auction.id]=auction.askingPrice*5;
 const message=advance(won).history[0].messages.find(m=>m.startsWith(`Won ${auction.id}`))!;
 expect(message).toBe(`Won ${auction.id} for CAD ${(auction.askingPrice*5).toLocaleString('en-CA')}. Available next week; refusal window lasts one week.`);
 // Saves made before this format still translate.
 expect(translateRuntime('Q21: rival bid 51431 won.')).toBe('Q21 : l’offre concurrente de 51431 a remporté le lot.');
});
