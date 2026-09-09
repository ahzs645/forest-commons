import {it,expect} from 'vitest';
import {princeGeorge} from '../scenarios/prince-george';
import {validateRegion} from './validation';
it('rejects non-text imported BC market event fields before they become invalid report evidence',()=>{
 for(const field of ['id','label'] as const)for(const value of [42,{},true]){
  const r=structuredClone(princeGeorge);expect(r.bcMarket!.events.length).toBeGreaterThan(0);(r.bcMarket!.events[0] as unknown as Record<string,unknown>)[field]=value;
  expect(()=>validateRegion(r)).toThrow('BC market model');
 }
 const r=structuredClone(princeGeorge);r.bcMarket!.events[0]=null as never;expect(()=>validateRegion(r)).toThrow('BC market model');
});
it('rejects non-text tenure authorities and obligation labels without rejecting authored text',()=>{
 const r=structuredClone(princeGeorge),stand=Object.values(r.bcTenure!.stands).find(s=>s.obligations.length)!;
 stand.authority={label:'Authority'} as never;expect(()=>validateRegion(r)).toThrow('BC tenure model');stand.authority='Regional teaching authority';
 stand.obligations[0].label={label:'Obligation'} as never;expect(()=>validateRegion(r)).toThrow('BC tenure model');stand.obligations[0].label='Authored obligation';
 expect(()=>validateRegion(r)).not.toThrow();stand.obligations[0]=null as never;expect(()=>validateRegion(r)).toThrow('BC tenure model');
});
