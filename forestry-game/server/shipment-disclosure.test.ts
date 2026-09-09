import {expect,it} from 'vitest';
import {createGame,advance} from '../src/simulation/engine';
import {quebec} from '../src/scenarios/quebec';
import {filterAuctionObservation} from './auction-disclosure';
it('removes withheld source identifiers from shipment observations',()=>{
 const game=advance(createGame(quebec));
 game.region.auctionDisclosure={mode:'release-week',volumeMultiplier:[.8,1.2],priceMultiplier:[.8,1.2]};
 const hidden=game.region.stands.find(s=>s.supply==='auction'&&s.auctionWeek>game.week)!,visible=game.region.stands.find(s=>s.supply==='guaranteed')!;
 game.history[0].shipments=[hidden,visible].map(s=>({stand:s.id,mill:game.region.mills[0].id,product:'soft-saw',volume:1,market:'ordinary'}));
 filterAuctionObservation(game);
 expect(game.history[0].shipments).toHaveLength(1);
 expect(game.history[0].shipments![0].stand).toBe(visible.id);
});
