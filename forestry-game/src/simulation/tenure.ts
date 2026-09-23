import type { Game, RegionDefinition, Stock, LedgerEntry } from './types';

export interface AuthorizationDefinition {
  initialStatus: 'approved' | 'required';
  /** Illustrative operating weeks, not a published administrative service standard. */
  delayWeeks: number;
  validForWeeks?: number;
}
export interface AuthorizationState {
  status: 'required' | 'pending' | 'approved';
  submittedWeek?: number;
  approvedWeek?: number;
}
export interface BCTenureDefinition {
  type: 'forest-licence' | 'bcts-timber-sale' | 'private-land' | 'protected';
  authority: string;
  harvest: AuthorizationDefinition & {kind: 'cutting-permit' | 'timber-sale-licence' | 'owner-consent' | 'prohibited'};
  stumpage: {basis: 'interior-teaching' | 'none'; rates: Stock; ratePolicy?: 'adjustable' | 'fixed-at-award'};
  obligations: {id: string; label: string; responsibleParty: 'operator' | 'bcts' | 'owner'; costPerM3: number}[];
}
export interface BCRoadAuthorizationDefinition extends AuthorizationDefinition {
  kind: 'road-use-permit' | 'road-permit' | 'owner-consent';
  authority: string;
}
export interface BCTenureRegion {
  note: string;
  stands: Record<string, BCTenureDefinition>;
  roads: Record<string, BCRoadAuthorizationDefinition>;
}
export interface BCTenureState {
  harvest: Record<string, AuthorizationState>;
  roads: Record<string, AuthorizationState>;
  obligations: Record<string, {accrued: number; settled: number}>;
}
export function initializeBCTenure(r: RegionDefinition): BCTenureState | undefined {
  if (!r.bcTenure) return undefined;
  const initial = (d: AuthorizationDefinition): AuthorizationState => d.initialStatus === 'approved' ? {status:'approved',approvedWeek:1} : {status:'required'};
  return {harvest:Object.fromEntries(Object.entries(r.bcTenure.stands).map(([id,d])=>[id,initial(d.harvest)])),roads:Object.fromEntries(Object.entries(r.bcTenure.roads).map(([id,d])=>[id,initial(d)])),obligations:{}};
}
function authorizationProblem(g: Game, d: AuthorizationDefinition, state?: AuthorizationState): string | null {
  const s = state ?? (d.initialStatus === 'approved' ? {status:'approved',approvedWeek:1} : {status:'required'});
  if (s.status === 'required') return 'authorization application required';
  if (s.approvedWeek === undefined || s.approvedWeek > g.week) return `authorization pending until turn ${s.approvedWeek ?? '?'}`;
  if (d.validForWeeks !== undefined && (g.week-s.approvedWeek)*(g.region.turnDurationWeeks??1) >= d.validForWeeks-1e-9) return 'authorization expired; renewal required';
  return null;
}
export function harvestAuthorizationProblem(g: Game,id: string): string | null {
  const d=g.region.bcTenure?.stands[id];
  if(!d)return null;
  if(d.harvest.kind==='prohibited')return 'protected area: harvesting prohibited';
  return authorizationProblem(g,d.harvest,g.bcTenure?.harvest[id]);
}
/** Secured lots with harvestable volume above the retention floor that no crew can cut until a harvest authorization is applied for or renewed. */
export function securedAwaitingAuthorization(g: Game): {id: string; problem: string}[] {
  if(!g.region.bcTenure)return [];
  return g.stands.flatMap(s=>{
    const d=g.region.stands.find(x=>x.id===s.id);
    const problem=harvestAuthorizationProblem(g,s.id);
    return s.owned && d && problem && !problem.startsWith('protected') && !problem.startsWith('authorization pending') && s.remaining-d.volume*g.plan.retention>1 ? [{id:s.id,problem}] : [];
  });
}
export function roadAuthorizationProblem(g: Game,id: string): string | null {
  const d=g.region.bcTenure?.roads[id];
  return d ? authorizationProblem(g,d,g.bcTenure?.roads[id]) : null;
}
export function authorizedOperatingRegion(g:Game,r:RegionDefinition=g.region):RegionDefinition {
  if(!g.region.bcTenure)return r;
  return {...r,roads:{...r.roads,edges:r.roads.edges.filter(e=>!roadAuthorizationProblem(g,e.id))}};
}
function apply(g:Game,id:string,kind:'harvest'|'roads'):Game {
  const next=structuredClone(g), d=kind==='harvest'?g.region.bcTenure?.stands[id]?.harvest:g.region.bcTenure?.roads[id];
  if(!d || g.week>g.region.weeks)throw Error('Authorization is not available.');
  if(kind==='harvest' && (!g.stands.find(s=>s.id===id)?.owned || ('kind' in d && d.kind==='prohibited')))throw Error('Acquire an eligible timber right before applying.');
  if(kind==='roads'){const stand=g.region.stands.find(s=>id===`access-${s.id}`);if(stand && (stand.supply==='protected'||!g.stands.find(s=>s.id===stand.id)?.owned))throw Error('Acquire an eligible timber right before applying for its access road.');}
  next.bcTenure??=initializeBCTenure(g.region)!;
  const prior=next.bcTenure[kind][id];
  if(prior?.status==='pending' && (prior.approvedWeek??Infinity)>g.week)throw Error('Application is already pending.');
  if(!authorizationProblem(g,d,prior))throw Error('Authorization is already active.');
  const approvedWeek=g.week+Math.ceil(d.delayWeeks/(g.region.turnDurationWeeks??1)-1e-9);
  next.bcTenure[kind][id]={status:approvedWeek<=g.week?'approved':'pending',submittedWeek:g.week,approvedWeek};
  next.plan.ready={purchase:false,production:false,transport:false};
  return next;
}
export const applyHarvestAuthorization=(g:Game,id:string)=>apply(g,id,'harvest');
export const applyRoadAuthorization=(g:Game,id:string)=>apply(g,id,'roads');
export function refreshAuthorizations(g:Game) {
  if(!g.region.bcTenure)return;
  g.bcTenure??=initializeBCTenure(g.region)!;
  for(const s of [...Object.values(g.bcTenure.harvest),...Object.values(g.bcTenure.roads)])if(s.status==='pending' && (s.approvedWeek??Infinity)<=g.week)s.status='approved';
}
export function stumpageCost(r:RegionDefinition,id:string,products:Stock):number {
  const d=r.bcTenure?.stands[id];
  return !d || d.stumpage.basis==='none'?0:Object.entries(products).reduce((n,[p,v])=>n+v*(d.stumpage.rates[p]??0),0);
}
export const stumpageRateM3=(g:Game,id:string)=>stumpageCost(g.region,id,g.region.stands.find(s=>s.id===id)?.mix??{});
export const obligationRateM3=(g:Game,id:string)=>(g.region.bcTenure?.stands[id]?.obligations??[]).filter(o=>o.responsibleParty==='operator').reduce((n,o)=>n+o.costPerM3,0);
export function accruePostHarvestObligations(g:Game,id:string,volume:number) {
  if(!g.region.bcTenure)return;
  g.bcTenure??=initializeBCTenure(g.region)!;
  for(const o of g.region.bcTenure.stands[id]?.obligations??[]){const s=g.bcTenure.obligations[`${id}:${o.id}`]??={accrued:0,settled:0};s.accrued+=volume*o.costPerM3;}
}
export function settleObligationEntries(g:Game,standId?:string):LedgerEntry[] {
  const entries:LedgerEntry[]=[];
  for(const [id,d] of Object.entries(g.region.bcTenure?.stands??{})) {
    if(standId && standId!==id)continue;
    for(const o of d.obligations){const s=g.bcTenure?.obligations[`${id}:${o.id}`];if(!s || s.accrued<=s.settled)continue;
      if(o.responsibleParty==='operator')entries.push({category:'post-harvest',description:`${id} · ${o.label} (teaching cost reserve)`,standId:id,amount:-(s.accrued-s.settled)});
      s.settled=s.accrued;
    }
  }
  return entries;
}
export function settlePostHarvestObligations(g:Game,id:string):Game {
  if(!g.region.bcTenure?.stands[id])throw Error('Unknown tenure.');
  const next=structuredClone(g);
  for(const e of settleObligationEntries(next,id)){next.cash+=e.amount;next.instantLedger.push(e);}
  next.plan.ready={purchase:false,production:false,transport:false};
  return next;
}
export function validateBCTenureRegion(r:RegionDefinition) {
  const b=r.bcTenure;if(b===undefined)return;
  const fail=()=>{throw Error('Invalid scenario: BC tenure model');};
  const nonnegative=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const auth=(d:AuthorizationDefinition)=>d && ['approved','required'].includes(d.initialStatus)&&nonnegative(d.delayWeeks)&&(d.validForWeeks===undefined||(nonnegative(d.validForWeeks)&&d.validForWeeks>0));
  if(!b || typeof b.note!=='string'||!b.note || !b.stands || !b.roads)fail();
  if(Object.keys(b.stands).length!==r.stands.length)fail();
  for(const [id,d] of Object.entries(b.stands)){
    if(!r.stands.some(s=>s.id===id)||!d||!['forest-licence','bcts-timber-sale','private-land','protected'].includes(d.type)||typeof d.authority!=='string'||!d.authority||!auth(d.harvest)||!['cutting-permit','timber-sale-licence','owner-consent','prohibited'].includes(d.harvest.kind)||!d.stumpage||!['interior-teaching','none'].includes(d.stumpage.basis)||!d.stumpage.rates||!Array.isArray(d.obligations))fail();
    if(d.stumpage.ratePolicy!==undefined&&!['adjustable','fixed-at-award'].includes(d.stumpage.ratePolicy))fail();
    if((d.type==='protected')!==(d.harvest.kind==='prohibited'))fail();
    if((d.type==='private-land'||d.type==='protected')&&d.stumpage.basis!=='none')fail();
    if((d.type==='forest-licence'||d.type==='bcts-timber-sale')&&d.stumpage.basis!=='interior-teaching')fail();
    if(Object.entries(d.stumpage.rates).some(([p,v])=>!r.products.some(x=>x.id===p)||!nonnegative(v)))fail();
    if(d.stumpage.basis==='interior-teaching'&&r.products.some(p=>d.stumpage.rates[p.id]===undefined))fail();
    if(new Set(d.obligations.map(o=>o?.id)).size!==d.obligations.length||d.obligations.some(o=>!o||typeof o.id!=='string'||!o.id||typeof o.label!=='string'||!o.label||!['operator','bcts','owner'].includes(o.responsibleParty)||!nonnegative(o.costPerM3)))fail();
  }
  for(const [id,d] of Object.entries(b.roads))if(!r.roads.edges.some(e=>e.id===id)||!d||typeof d.authority!=='string'||!d.authority||!['road-use-permit','road-permit','owner-consent'].includes(d.kind)||!auth(d))fail();
}
export function validateBCTenureState(g:Game) {
  if(!g.region.bcTenure){if(g.bcTenure!==undefined)throw Error('Invalid save: unexpected BC tenure');return;}
  if(!g.bcTenure)throw Error('Invalid save: missing BC tenure state');
  const fail=()=>{throw Error('Invalid save: BC tenure state');};
  for(const kind of ['harvest','roads'] as const){const definitions=kind==='harvest'?g.region.bcTenure.stands:g.region.bcTenure.roads;const states=g.bcTenure[kind];if(!states || Object.keys(states).length!==Object.keys(definitions).length)fail();for(const [id,s] of Object.entries(states))if(!definitions[id]||!s||!['required','pending','approved'].includes(s.status)||(s.status!=='required'&&(!Number.isInteger(s.approvedWeek)||s.approvedWeek! < 1))||(s.submittedWeek!==undefined&&(!Number.isInteger(s.submittedWeek)||s.submittedWeek<1||s.submittedWeek>g.week)))fail();}
  for(const kind of ['harvest','roads'] as const)for(const s of Object.values(g.bcTenure[kind])) {
    if(s.status==='required' && (s.approvedWeek!==undefined || s.submittedWeek!==undefined))fail();
    if(s.status==='approved' && s.approvedWeek!>g.week)fail();
    if(s.submittedWeek!==undefined && s.approvedWeek!<s.submittedWeek)fail();
  }
  if(!g.bcTenure.obligations)fail();
  for(const [key,s] of Object.entries(g.bcTenure.obligations)){const known=Object.entries(g.region.bcTenure.stands).some(([id,d])=>d.obligations.some(o=>`${id}:${o.id}`===key));if(!known||!s||![s.accrued,s.settled].every(n=>Number.isFinite(n)&&n>=0)||s.settled>s.accrued+1e-6)fail();}
}
