import solver from 'javascript-lp-solver';
type Bounds={min?:number;max?:number;equal?:number};
type Model={optimize:string;opType:'min'|'max';constraints:Record<string,Bounds>;variables:Record<string,Record<string,number>>};
/** Imputation nucleolus for at most five players, using all proper-coalition excesses. */
export function nucleolus(members:string[],worth:(s:string[])=>number){
 if(!members.length)return {};
 if(members.length>5||new Set(members).size!==members.length)throw Error('Nucleolus supports one to five distinct companies.');
 const grand=worth(members),single=members.map(id=>worth([id]));
 const coalitions=Array.from({length:2**members.length-2},(_,i)=>{const mask=i+1;return {mask,indices:members.map((_,j)=>j).filter(j=>mask&(1<<j)),value:worth(members.filter((_,j)=>mask&(1<<j)))};});
 if(![grand,...single,...coalitions.map(c=>c.value)].every(Number.isFinite))throw Error('Coalition values must be finite.');
 const scale=Math.max(1,Math.abs(grand),...coalitions.map(c=>Math.abs(c.value))),tol=scale*1e-7;
 if(single.reduce((a,b)=>a+b,0)>grand+tol)throw Error('No individually rational, budget-balanced imputation exists.');
 if(members.length===1)return {[members[0]]:grand};
 // Shift the excess variable above zero to avoid unrestricted-variable solver pivots.
 // Since x >= 0 and sum(x)=grand, this floor is below every feasible excess.
 const floor=-scale*(members.length+1);
 if(single.some(v=>v<0))throw Error('This bounded implementation requires nonnegative standalone values.');
 const fixed=new Map<number,number>();
 const basis:number[][]=[members.map(()=>1)];
 function rank(rows:number[][]){const a=rows.map(r=>[...r]);let rank=0;for(let col=0;col<members.length;col++){const pivot=a.findIndex((r,i)=>i>=rank&&Math.abs(r[col])>1e-9);if(pivot<0)continue;[a[rank],a[pivot]]=[a[pivot],a[rank]];const d=a[rank][col];for(let c=col;c<members.length;c++)a[rank][c]/=d;for(let i=rank+1;i<a.length;i++){const f=a[i][col];for(let c=col;c<members.length;c++)a[i][c]-=f*a[rank][c];}rank++;}return rank;}
 const removed=new Set<number>();
 function model(level?:number):Model{
  const constraints:Record<string,Bounds>={budget:{equal:grand}},variables:Record<string,Record<string,number>>={};
  members.forEach((_,i)=>{variables[`x${i}`]={budget:1,[`ir${i}`]:1};constraints[`ir${i}`]={min:single[i]};});
  if(level===undefined){variables.t={objective:1};}
  for(const c of coalitions){if(removed.has(c.mask)&&!fixed.has(c.mask))continue;const name=`s${c.mask}`,f=fixed.get(c.mask);constraints[name]=f!==undefined?{equal:c.value-f}:{min:c.value-(level??floor)};for(const i of c.indices)variables[`x${i}`][name]=1;if(f===undefined&&level===undefined)variables.t[name]=1;}
  return {optimize:'objective',opType:'min',constraints,variables};
 }
 function solve(m:Model){const r=solver.Solve(m,1e-10) as Record<string,number|boolean>;if(!r.feasible||!r.bounded)throw Error('Nucleolus LP failed or is unbounded; no allocation reported.');return {x:members.map((_,i)=>Number(r[`x${i}`]??0)),objective:Number(r.result)+(m.variables.t?floor:0)};}
 for(let stage=0;stage<coalitions.length;stage++){
  const best=solve(model()),epsilon=Math.max(best.objective,...coalitions.filter(c=>!removed.has(c.mask)).map(c=>c.value-c.indices.reduce((n,i)=>n+best.x[i],0)))+scale*1e-10;
  // Test the entire optimal face. A tight constraint at one vertex alone is insufficient.
  const universal:number[]=[];
  for(const c of coalitions){if(removed.has(c.mask))continue;const face=model(epsilon);face.opType='max';for(const i of c.indices)face.variables[`x${i}`].objective=1;const max=solve(face).objective;if(Math.abs(max-(c.value-epsilon))<=tol)universal.push(c.mask);}
  if(!universal.length)throw Error('Unable to certify universally tight excess constraints at solver precision.');
  // Retain an independent equality basis; redundant numeric equalities can conflict.
  for(const mask of universal){const row=members.map((_,i)=>mask&(1<<i)?1:0);if(rank([...basis,row])>basis.length){basis.push(row);fixed.set(mask,epsilon);}removed.add(mask);}
  // Check whether the remaining optimal face is a singleton, including IR bounds.
  let unique=true;
  for(let i=0;i<members.length;i++){const face=model(epsilon);face.variables[`x${i}`].objective=1;const lo=solve(face).objective;face.opType='max';const hi=solve(face).objective;if(hi-lo>tol){unique=false;break;}}
  if(unique){if(Math.abs(best.x.reduce((a,b)=>a+b,0)-grand)>tol||best.x.some((x,i)=>x<single[i]-tol))throw Error('Nucleolus failed allocation checks.');return Object.fromEntries(members.map((id,i)=>[id,best.x[i]]));}
 }
 throw Error('Nucleolus did not converge to a unique imputation.');
}
