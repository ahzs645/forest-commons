import type {Game,RegionDefinition,Stock} from './types';
export function buckingProfile(region:RegionDefinition,id?:string){
 if(!id||id==='standard')return {name:'Standard assortment recovery',productivity:1,cost:1,recovery:{} as Record<string,Stock>};
 const profile=region.buckingProfiles?.[id];
 if(!profile)throw Error('Unknown bucking profile.');
 return profile;
}
export function recoveredMix(region:RegionDefinition,mix:Stock,id?:string):Stock{
 const profile=buckingProfile(region,id),result:Stock={};
 for(const [source,fraction] of Object.entries(mix))for(const [product,ratio] of Object.entries(profile.recovery[source]??{[source]:1}))result[product]=(result[product]??0)+fraction*ratio;
 return result;
}
export function validateBucking(region:RegionDefinition){
 for(const [id,p] of Object.entries(region.buckingProfiles??{})){
  if(id==='standard'||!id||!p||typeof p.name!=='string'||!p.name||!Number.isFinite(p.productivity)||p.productivity<=0||!Number.isFinite(p.cost)||p.cost<=0||!p.recovery||Array.isArray(p.recovery))throw Error('Invalid bucking profile.');
  for(const [source,mix] of Object.entries(p.recovery)){
   const allowed=new Set<string>();let cursor:string|undefined=source;
   while(cursor&&!allowed.has(cursor)){const product=region.products.find(x=>x.id===cursor);if(!product)throw Error('Unknown bucking source.');allowed.add(cursor);cursor=product.downgradeTo;}
   if(!mix||Array.isArray(mix)||Object.entries(mix).some(([product,n])=>!allowed.has(product)||!Number.isFinite(n)||n<0)||Math.abs(Object.values(mix).reduce((a,b)=>a+b,0)-1)>1e-8)throw Error('Bucking recovery must conserve volume and cannot upgrade product quality.');
  }
 }
}
export function setBucking(game:Game,crew:string,index:number,profile:string):Game{
 buckingProfile(game.region,profile);
 if(game.week>game.region.weeks||!game.plan.crews[crew]?.[index])throw Error('No editable crew order.');
 const next=structuredClone(game);next.plan.crews[crew][index].bucking=profile;next.plan.ready={purchase:false,production:false,transport:false};return next;
}
