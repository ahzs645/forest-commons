import {expect,it,vi} from 'vitest';
vi.mock('maplibre-gl',()=>({default:{}}));
vi.mock('@deck.gl/mapbox',()=>({MapboxOverlay:class{}}));
vi.mock('maplibre-gl/dist/maplibre-gl.css',()=>({}));
import {declutteredLabels} from './OperationsMap';

const map=(w=400,h=300)=>({getContainer:()=>({clientWidth:w,clientHeight:h}),project:([x,y]:[number,number])=>({x,y})}) as never;

it('keeps one of two overlapping stand labels and prefers the selected or planned stand',()=>{
 const stands=[{id:'Q01',position:[100,100]},{id:'Q08',position:[104,103]},{id:'Q20',position:[250,200]}] as {id:string;position:[number,number]}[];
 expect([...declutteredLabels(map(),stands,new Set())]).toEqual(['Q01','Q20']);
 expect([...declutteredLabels(map(),stands,new Set(['Q08']))]).toEqual(['Q08','Q20']);
});

it('skips labels well outside the visible frame',()=>{
 const stands=[{id:'Q01',position:[-200,50]},{id:'Q02',position:[50,50]}] as {id:string;position:[number,number]}[];
 expect([...declutteredLabels(map(),stands,new Set())]).toEqual(['Q02']);
});
