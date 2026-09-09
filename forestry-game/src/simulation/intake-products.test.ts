import {expect,it} from 'vitest';
import {createGame} from './engine';
import {quebec} from '../scenarios/quebec';
import {forestIntakeProducts} from './intake-products';
it('excludes transfer-only fibre but allows stock and declared bucking outputs',()=>{
 const g=createGame(quebec),id=g.stands.find(s=>s.owned)!.id;
 const stand=g.region.stands.find(s=>s.id===id)!;stand.mix={'soft-saw':1};
 g.region.buckingProfiles={alternate:{name:'Alternate',productivity:1,cost:1,recovery:{'soft-saw':{'soft-pulp':1}}}};
 expect(forestIntakeProducts(g,id,['soft-saw','soft-pulp','transfer-only'])).toEqual(['soft-saw','soft-pulp']);
 g.stands.find(s=>s.id===id)!.stock.push({product:'transfer-only',volume:1,quality:1,week:1});
 expect(forestIntakeProducts(g,id,['transfer-only'])).toEqual(['transfer-only']);
 g.stands.find(s=>s.id===id)!.owned=false;
 expect(forestIntakeProducts(g,id,['soft-saw'])).toEqual([]);
});
it('lets planning discover unowned bucking potential without authorizing mill intake',async()=>{
 const {standSupportsProduct}=await import('./intake-products');
 const g=createGame(quebec),stand=g.region.stands[0],state=g.stands[0];
 stand.mix={'soft-saw':1};state.owned=false;state.stock=[];
 g.region.buckingProfiles={pulp:{name:'Pulp',productivity:1,cost:1,recovery:{'soft-saw':{'soft-pulp':1}}}};
 expect(standSupportsProduct(g,stand.id,'soft-pulp')).toBe(true);
 expect(standSupportsProduct(g,stand.id,'hard-pulp')).toBe(false);
 expect(standSupportsProduct(g,'missing','soft-pulp')).toBe(false);
 expect(forestIntakeProducts(g,stand.id,['soft-pulp'])).toEqual([]);
});
