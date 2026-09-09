/** Reject stale reads and serialize room mutations; no requests are cancelled remotely. */
export class ClassroomRequestGuard {
  busy=false;
  unsent=false;
  generation=0;
  private pollSequence=0;
  private appliedPoll=0;
  applied(sequence:number){this.appliedPoll=Math.max(this.appliedPoll,sequence);}
  startPoll(){return ++this.pollSequence;}
  begin(){if(this.busy)return false;this.busy=true;this.generation++;return true;}
  finish(){this.busy=false;this.generation++;}
  edited(){this.unsent=true;this.generation++;}
  accepted(){this.unsent=false;this.generation++;}
  canApplyPoll(generation:number,sequence=this.pollSequence){return !this.busy&&generation===this.generation&&sequence>=this.appliedPoll;}
}
