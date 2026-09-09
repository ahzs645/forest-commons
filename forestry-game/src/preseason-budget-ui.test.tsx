import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import PreSeasonDesk from './PreSeasonDesk';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
it('shows remaining mobilization allowance and prevents a move using bid-reserved cash',()=>{
 const game=createGame(quebec);game.region.mobilization!.allowedNodes=['t1'];game.region.mobilization!.feePerMove=100;
 game.region.roads.edges.forEach(e=>e.bearing=1);game.cash=500000;game.plan.bids={Q21:500000};
 const html=renderToStaticMarkup(<PreSeasonDesk game={game} onChange={()=>{}}/>);
 expect(html).toContain('Remaining positioning allowance');
 expect(html).toContain('Uncommitted cash after bids: CAD 0');
 expect(html).toContain('Insufficient uncommitted cash for this move');
 expect(html).toContain('<button disabled="">Move fleet resource</button>');
});

it('does not present redacted classroom bids as spendable cash',()=>{
 const game=createGame(quebec);game.region.mobilization!.allowedNodes=['t1'];
 game.region.roads.edges.forEach(e=>e.bearing=1);game.plan.bids={};
 for(const role of ['production','transport']){
  const html=renderToStaticMarkup(<PreSeasonDesk game={game} role={role} onMobilize={()=>{}}/>);
  expect(html).toContain('Bids are private. The server checks available funds when you move.');
  expect(html).not.toContain('Uncommitted cash after bids');
 }
 const instructor=renderToStaticMarkup(<PreSeasonDesk game={game} role="instructor" onMobilize={()=>{}}/>);
 expect(instructor).toContain('Uncommitted cash after bids');
});
