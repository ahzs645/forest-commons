import solver from 'javascript-lp-solver';
export interface TransportObligations {volumeA:number;volumeB:number;ownMinimumA:number;ownMinimumB:number;costAA:number;costAB:number;costBA:number;costBB:number}
export const defaultObligations:TransportObligations={volumeA:100,volumeB:100,ownMinimumA:20,ownMinimumB:20,costAA:10,costAB:12,costBA:5,costBB:20};
export function validateObligations(s:TransportObligations){if(!s||!(['volumeA','volumeB','ownMinimumA','ownMinimumB','costAA','costAB','costBA','costBB'] as const).every(key=>Number.isFinite(s[key]))||![s.volumeA,s.volumeB].every(v=>v>0&&v<=10000)||![s.costAA,s.costAB,s.costBA,s.costBB].every(v=>v>=0&&v<=1000)||s.ownMinimumA<0||s.ownMinimumA>s.volumeA||s.ownMinimumB<0||s.ownMinimumB>s.volumeB)throw Error('Use positive volumes up to 10,000 m³, rates from 0 to 1,000, and own-mill minimums between zero and each company’s volume.');}
type Model={optimize:string;opType:'min'|'max';constraints:Record<string,{min?:number;max?:number;equal?:number}>;variables:Record<string,Record<string,number>>};
function solve(model:Model){const result=solver.Solve(model,1e-9) as Record<string,number|boolean>;if(!result.feasible||!result.bounded)throw Error('Transportation optimization could not certify a bounded feasible result.');return result;}
function at(result:Record<string,number|boolean>,id:string){return Number(result[id]??0);}
export function transportObligations(s:TransportObligations){
 validateObligations(s);
 const baselineA=s.volumeA*s.costAA,baselineB=s.volumeB*s.costBB,baseline=baselineA+baselineB;
 const primal=solve({optimize:'cost',opType:'min',constraints:{sA:{equal:s.volumeA},sB:{equal:s.volumeB},dA:{equal:s.volumeA},dB:{equal:s.volumeB},ownA:{min:s.ownMinimumA},ownB:{min:s.ownMinimumB}},variables:{aa:{cost:s.costAA,sA:1,dA:1,ownA:1},ab:{cost:s.costAB,sA:1,dB:1},ba:{cost:s.costBA,sB:1,dA:1},bb:{cost:s.costBB,sB:1,dB:1,ownB:1}}});
 // Potentials are shifted to nonnegative variables for this LP implementation.
 // The bounded two-company model has a normalized optimal dual within these bounds;
 // primal-dual equality is checked, rather than assuming the artificial bounds are harmless.
 const M=4*Math.max(1,s.costAA,s.costAB,s.costBA,s.costBB),variables:Model['variables']={uA:{objective:s.volumeA,aa:1,ab:1,buA:1},uB:{objective:s.volumeB,ba:1,bb:1,buB:1},vA:{objective:s.volumeA,aa:1,ba:1,bvA:1,normalize:1},vB:{objective:s.volumeB,ab:1,bb:1,bvB:1},mA:{objective:s.ownMinimumA,aa:1,bmA:1},mB:{objective:s.ownMinimumB,bb:1,bmB:1}};
 const dual=solve({optimize:'objective',opType:'max',constraints:{aa:{max:s.costAA+2*M},ab:{max:s.costAB+2*M},ba:{max:s.costBA+2*M},bb:{max:s.costBB+2*M},normalize:{equal:M},...Object.fromEntries(Object.keys(variables).map(id=>['b'+id,{max:2*M}]))},variables});
 const uA=at(dual,'uA')-M,uB=at(dual,'uB')-M,vA=at(dual,'vA')-M,vB=at(dual,'vB')-M,mA=at(dual,'mA'),mB=at(dual,'mB');
 const allocationA=(uA+vA)*s.volumeA+mA*s.ownMinimumA,allocationB=(uB+vB)*s.volumeB+mB*s.ownMinimumB;
 const flows={aa:at(primal,'aa'),ab:at(primal,'ab'),ba:at(primal,'ba'),bb:at(primal,'bb')},paidA=flows.aa*s.costAA+flows.ab*s.costAB,paidB=flows.ba*s.costBA+flows.bb*s.costBB,total=paidA+paidB;
 const slacks={aa:s.costAA-uA-vA-mA,ab:s.costAB-uA-vB,ba:s.costBA-uB-vA,bb:s.costBB-uB-vB-mB},gap=total-allocationA-allocationB,tolerance=Math.max(1,baseline,total)*1e-7;
 if(Math.abs(gap)>tolerance||Object.values(slacks).some(v=>v< -1e-6)||allocationA>baselineA+tolerance||allocationB>baselineB+tolerance)throw Error('Shadow allocation failed primal-dual or outside-option checks; no allocation reported.');
 const noCashCross=s.costAB<=s.costAA&&s.costBA<=s.costBB?flows.ab:0;
 const noCashA=(s.volumeA-noCashCross)*s.costAA+noCashCross*s.costAB,noCashB=(s.volumeB-noCashCross)*s.costBB+noCashCross*s.costBA;
 return {settings:{...s},baselineA,baselineB,baseline,flows,paidA,paidB,total,savings:baseline-total,allocationA,allocationB,transferToA:paidA-allocationA,transferToB:paidB-allocationB,dual:{uA,uB,vA,vB,mA,mB,slacks,objective:allocationA+allocationB,gap},comparisons:[{name:'Fixed own-mill obligations · no cash',cross:0,costA:baselineA,costB:baselineB,total:baseline},{name:'Fixed own-mill obligations · paid',cross:0,costA:baselineA,costB:baselineB,total:baseline},{name:'Flexible obligations · no cash',cross:noCashCross,costA:noCashA,costB:noCashB,total:noCashA+noCashB},{name:'Flexible obligations · paid / dual allocation',cross:flows.ab,costA:allocationA,costB:allocationB,total}]};
}
