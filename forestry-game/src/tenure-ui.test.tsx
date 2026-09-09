import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import MillCommitmentInput from './MillCommitmentInput';
import BCMarketDesk from './BCMarketDesk';
import {marketSnapshot} from './simulation/bc-market';
import TenureDesk from './TenureDesk';
import StewardshipLab from './StewardshipLab';
import {startStewardship} from './simulation/stewardship';
import {advance,createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import {applyHarvestAuthorization} from './simulation/tenure';
import type {RegionDefinition} from './simulation/types';

function region():RegionDefinition {
 const r=structuredClone(quebec);
 r.bcTenure={note:'Illustrative classroom terms.',stands:Object.fromEntries(r.stands.map(s=>[s.id,{
  type:'forest-licence',authority:'Ministry of Forests',
  harvest:{kind:'cutting-permit',initialStatus:'required',delayWeeks:1,validForWeeks:6},
  stumpage:{basis:'interior-teaching',rates:Object.fromEntries(r.products.map(p=>[p.id,12]))},
  obligations:[{id:'regeneration',label:'Regeneration provision',responsibleParty:'operator',costPerM3:4},{id:'monitoring',label:'BCTS monitoring',responsibleParty:'bcts',costPerM3:0}],
 }])),roads:{[r.roads.edges[0].id]:{kind:'road-use-permit',authority:'Ministry of Forests',initialStatus:'required',delayWeeks:1}}};
 return r;
}
describe('BC tenure desk',()=>{
 it('does not add BC controls to other regions',()=>expect(renderToStaticMarkup(<TenureDesk game={createGame(quebec)}/>)).toBe(''));
 it('explains authorities, permits, explicit rates and responsibilities in the operating UI',()=>{
  const game=createGame(region());
  const html=renderToStaticMarkup(<TenureDesk game={game} onChange={()=>{}}/>);
  for(const text of ['Ministry of Forests','Cutting permit','Road Use Permit','12.00','Regeneration provision','BC Timber Sales','No actual permits are issued','Apply / renew harvesting authorization'])expect(html).toContain(text);
  expect(html).toContain('Validity');
 });
 it('shows pending application state from a gameplay action and disables resubmission',()=>{
  const game=createGame(region());game.stands[0].owned=true;
  const pending=applyHarvestAuthorization(game,game.stands[0].id);
  const html=renderToStaticMarkup(<TenureDesk game={pending} onChange={()=>{}}/>);
  expect(html).toContain('Application pending');
  expect(html).toMatch(/<button disabled="">Apply \/ renew harvesting authorization/);
 });
 it('keeps permit actions disabled for read-only classroom roles',()=>{
  const game=createGame(region());game.stands[0].owned=true;
  const html=renderToStaticMarkup(<TenureDesk game={game} allowHarvest={false} allowRoad={false} onApplyHarvest={()=>{}} onApplyRoad={()=>{}}/>);
  expect(html).toMatch(/<button disabled="">Apply \/ renew harvesting authorization/);
  expect(html).toMatch(/<button disabled="">Apply \/ renew road authorization/);
 });
});

it('aggregates outstanding operator costs and collapses long assumptions',()=>{
 const game=createGame(region());
 const [a,b]=game.stands;
 game.bcTenure!.obligations[`${a.id}:regeneration`]={accrued:120,settled:20};
 game.bcTenure!.obligations[`${b.id}:regeneration`]={accrued:80,settled:0};
 game.bcTenure!.obligations[`${a.id}:monitoring`]={accrued:500,settled:0};
 const html=renderToStaticMarkup(<TenureDesk game={game}/>);
 expect(html).toContain('CAD 180.00');
 expect(html).toContain('<details><summary>BC assumptions and sources</summary>');
});
it('hides active road rows while retaining the show-all control',()=>{
 const game=createGame(region());
 const id=game.region.roads.edges[0].id;
 game.bcTenure!.roads[id]={status:'approved',approvedWeek:1};
 const html=renderToStaticMarkup(<TenureDesk game={game}/>);
 expect(html).toContain('Show all roads, including active authorizations');
 expect(html).toContain('No road authorizations need attention.');
 expect(html).not.toContain('Apply / renew road authorization');
});
it('annual BC UI blocks harvest only and reports explicit costs',()=>{
 const game=createGame(region());
 game.stands[0].owned=true;
 game.stewardship=startStewardship(game);
 game.stewardship.history=[{year:1,opening:100,growth:0,harvest:10,closing:90,cashChange:70,habitat:0.8,actions:{},stumpageCost:120,postHarvestCost:40,postHarvestAccrued:50}];
 const html=renderToStaticMarkup(<StewardshipLab game={game} onChange={()=>{}}/>);
 expect(html).toContain('authorization snapshot captured');
 expect(html).toContain('<option value="thin" disabled="">');
 expect(html).toContain('<option value="final" disabled="">');
 expect(html).toContain('<option value="plant">');
 expect(html).toContain('Stumpage paid');
 expect(html).toContain('Operator provisions paid');
 expect(html).toContain('All-party obligations accrued');
 expect(html).toContain('Monitoring provisions exclude planting');
});

function marketRegion(){
 const r=region();
 r.bcMarket={note:'Authored market path.',initial:{fuel:1,lumber:1,demand:1},events:[{id:'oil',week:2,revealWeek:2,label:'Fuel shock observed',indices:{fuel:1.5,lumber:1.2,demand:0.9}},{id:'secret',week:10,revealWeek:10,label:'UNREVEALED_MARKET_EVENT',indices:{fuel:1,lumber:1,demand:1}}],harvestFuelShare:0.2,haulFuelShare:0.3,bidFuelSensitivity:0.2,stumpage:{firstResetWeek:3,resetEveryWeeks:3,lagWeeks:1,lumberWeight:1,bidWeight:0,fuelWeight:0,minMultiplier:0.5,maxMultiplier:2}};
 return r;
}
it('market desk shows public signals, lag and saved history without future events',()=>{
 const game=createGame(marketRegion());
 const later=advance(game);later.week=3;
 later.history[0].market={...marketSnapshot(game),fuel:1.17};
 const html=renderToStaticMarkup(<BCMarketDesk game={later}/>);
 expect(html).toContain('Fuel shock observed');
 expect(html).not.toContain('UNREVEALED_MARKET_EVENT');
 expect(html).toContain('Evidence week used');
 expect(html).toContain('<td>117</td>');
 expect(html).toContain('not live oil prices');
});
it('tenure rates reflect current reset and fixed award locks',()=>{
 const r=marketRegion();const id=r.stands[0].id;
 const game=createGame(r);game.week=3;
 const adjusted=renderToStaticMarkup(<TenureDesk game={game}/>);
 expect(adjusted).toContain('14.40');
 game.region.bcTenure!.stands[id].stumpage.ratePolicy='fixed-at-award';
 game.bcMarket={lockedRates:{[id]:Object.fromEntries(r.products.map(p=>[p.id,9]))}};
 const locked=renderToStaticMarkup(<TenureDesk game={game}/>);
 expect(locked).toContain('9.00');
 expect(locked).toContain('displayed rates are locked');
});
it('does not display a market model for a region without one',()=>{
 expect(renderToStaticMarkup(<BCMarketDesk game={createGame(quebec)}/>)).toBe('');
});

it('commitment editor adopts the published cap at a period boundary without mutating base demand',()=>{
 const game=createGame(marketRegion());
 game.week=game.region.weeksPerMonth+1;
 const mill=game.region.mills[0],product=Object.keys(mill.demand[1])[0];
 const before=JSON.stringify(game);
 const expected=mill.demand[1][product]*0.9;
 const html=renderToStaticMarkup(<MillCommitmentInput game={game} millId={mill.id} product={product} value={0} onChange={()=>{}}/>);
 expect(html).toContain(`max="${expected}"`);
 expect(html).not.toContain('disabled');
 expect(JSON.stringify(game)).toBe(before);
 game.week++;
 expect(renderToStaticMarkup(<MillCommitmentInput game={game} millId={mill.id} product={product} value={0} onChange={()=>{}}/>)).toContain('disabled');
});
