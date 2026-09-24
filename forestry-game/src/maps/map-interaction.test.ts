import {expect,it} from 'vitest';
import {layoutSymbols} from './symbol-layout';

// A flat projector: positions are already screen pixels.
const map={project:([x,y]:[number,number])=>({x,y})};
const frame={w:400,h:300};
const base={map,frame,scale:1,mills:[] as {id:string;position:[number,number]}[],fleet:[] as never[],stands:[] as {id:string;position:[number,number]}[],priority:new Set<string>()};

it('fans out equipment at an isolated node and collapses a row that would hit a neighbour',()=>{
 const trucks=(node:string,x:number)=>['A','B','C'].map(id=>({id:`${node}${id}`,kind:'truck' as const,node,position:[x,100] as [number,number]}));
 const alone=layoutSymbols({...base,fleet:trucks('n1',100)});
 expect(alone.symbols.map(f=>f.members.length)).toEqual([1,1,1]);
 expect(alone.symbols.map(f=>f.offset[0])).toEqual([-40,0,40]);
 const crowded=layoutSymbols({...base,fleet:[...trucks('n1',100),...trucks('n2',170)]});
 expect(crowded.symbols).toHaveLength(2);
 expect(crowded.symbols[0].members.map(m=>m.id)).toEqual(['n1A','n1B','n1C']);
});

it('merges equipment at neighbouring stands whose icons would overlap',()=>{
 const fleet=[{id:'C1',kind:'crew' as const,node:'s1',position:[100,100] as [number,number]},{id:'C2',kind:'crew' as const,node:'s2',position:[112,104] as [number,number]},{id:'T1',kind:'truck' as const,node:'s2',position:[112,104] as [number,number]}];
 const layout=layoutSymbols({...base,fleet});
 expect(layout.symbols.map(f=>[f.kind,f.members.map(m=>m.id)])).toEqual([['crew',['C1','C2']],['truck',['T1']]]);
 // The other kind's row merges too when it would land on an icon.
 const stacked=layoutSymbols({...base,fleet:[{id:'C1',kind:'crew',node:'s1',position:[100,140]},{id:'T9',kind:'truck',node:'s3',position:[100,68]}]});
 expect(stacked.symbols.map(f=>[f.kind,f.members])).toEqual([['crew',[{id:'C1',kind:'crew'},{id:'T9',kind:'truck'}]]]);
 // A merged icon carries a count, so neither crew keeps its own tag.
 expect(layout.tags.map(t=>t.id)).toEqual(['T1']);
});

it('moves a stand label off an icon and drops labels with no free position',()=>{
 const mills=[{id:'M1',position:[100,84] as [number,number]}];
 const moved=layoutSymbols({...base,mills,stands:[{id:'Q01',position:[100,100]}]});
 expect(moved.labels[0]).toMatchObject({id:'Q01',offset:[0,16],anchor:'middle'});
 const stands=[{id:'Q01',position:[100,100]},{id:'Q08',position:[104,103]},{id:'Q20',position:[250,200]}] as {id:string;position:[number,number]}[];
 // Neighbouring stands both keep a label, on different sides.
 const near=layoutSymbols({...base,stands}).labels;
 expect(near.map(l=>l.id)).toEqual(['Q01','Q08','Q20']);
 expect(near[0].offset).not.toEqual(near[1].offset);
 // Boxed in on every side, a label is dropped, even for the selection (the sheet header names it).
 const walls=[[100,64],[100,136],[52,100],[148,100]].map((position,i)=>({id:`M${i}`,position:position as [number,number]}));
 expect(layoutSymbols({...base,mills:walls,stands:[{id:'Q01',position:[100,100]}]}).labels).toEqual([]);
 expect(layoutSymbols({...base,mills:walls,stands:[{id:'Q01',position:[100,100]}],keep:'Q01'}).labels).toEqual([]);
});

it('clusters mills that would overlap, together with equipment landing on them',()=>{
 const layout=layoutSymbols({...base,mills:[{id:'M1',position:[100,100]},{id:'M2',position:[110,104]}],fleet:[{id:'T1',kind:'truck',node:'far',position:[100,66]}]});
 expect(layout.symbols).toHaveLength(1);
 expect(layout.symbols[0]).toMatchObject({kind:'mill',members:[{id:'M1',kind:'mill'},{id:'M2',kind:'mill'},{id:'T1',kind:'truck'}]});
});

it('merges an icon that a cluster badge would cover',()=>{
 // T1 and T2 merge; the badge on their upper-right corner then covers C1's icon.
 const layout=layoutSymbols({...base,fleet:[{id:'T1',kind:'truck',node:'a',position:[100,64]},{id:'T2',kind:'truck',node:'b',position:[106,64]},{id:'C1',kind:'crew',node:'c',position:[132,118]}]});
 expect(layout.symbols.map(s=>[s.kind,s.members.map(m=>m.id)])).toEqual([['crew',['C1','T1','T2']]]);
});

it('keeps status tags only where they cover nothing, and skips off-screen labels',()=>{
 const fleet=[{id:'T1',kind:'truck' as const,node:'n',position:[100,100] as [number,number]}];
 expect(layoutSymbols({...base,fleet}).tags.map(t=>t.id)).toEqual(['T1']);
 expect(layoutSymbols({...base,fleet,mills:[{id:'M1',position:[100,162]}]}).tags).toEqual([]);
 expect(layoutSymbols({...base,stands:[{id:'Q09',position:[-200,50]}]}).labels).toEqual([]);
});
