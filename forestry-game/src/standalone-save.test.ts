import {expect, it} from 'vitest';
import {StandaloneSaveGuard} from './standalone-save';
it('keeps another tab’s progress and remains paused across subsequent local edits',()=>{
 let value:string|null='opening';
 const storage={getItem:()=>value,setItem:(_key:string,next:string)=>{value=next;}};
 const a=new StandaloneSaveGuard(value),b=new StandaloneSaveGuard(value);
 expect(b.write(storage,'campaign','week2')).toBe(true);
 expect(a.write(storage,'campaign','stale-edited-plan')).toBe(false);
 expect(value).toBe('week2');
 expect(a.write(storage,'campaign','another-local-edit')).toBe(false);
 expect(value).toBe('week2');
 a.replace(storage,'campaign');
 expect(a.write(storage,'campaign','explicit-import')).toBe(true);
 expect(value).toBe('explicit-import');
 expect(b.write(storage,'campaign','week3')).toBe(false);
});
it('allows identical saves and does not advance baseline when storage fails',()=>{
 const guard=new StandaloneSaveGuard('old');
 const storage={getItem:()=> 'same',setItem:()=>{throw Error('full');}};
 expect(()=>guard.write(storage,'key','same')).toThrow('full');
 expect(guard.baseline).toBe('old');
 expect(guard.paused).toBe(false);
});
