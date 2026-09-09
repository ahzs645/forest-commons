import { describe,it,expect } from 'vitest';
import { quebec } from '../scenarios/quebec';
import { emptyCalibration,recordCalibrationReview,auditCalibration,validateCalibration,compareCalibration,calibrationFingerprint } from './regional-calibration';
describe('Regional calibration evidence',()=>{
 it('creates BC source pointers without approving data or assigning licences',()=>{const m=emptyCalibration(quebec,true);expect(Object.values(m.entries).every(e=>e.status!=='reviewed'&&!e.license&&!e.reviewer)).toBe(true);expect(auditCalibration(quebec,m).every(a=>!a.reviewed)).toBe(true);expect(()=>validateCalibration(m)).not.toThrow();});
 it('requires complete review evidence and detects stale regional values',()=>{let m=emptyCalibration(quebec);expect(()=>recordCalibrationReview(quebec,m,'inventory')).toThrow('complete');m.entries.inventory={sourceUrl:'https://example.org/source',license:'test permission',sourceDate:'2026-09-07',units:'m³',reviewer:'Test reviewer',status:'review-needed',notes:'Fixture evidence only',reviewedFingerprint:''};m=recordCalibrationReview(quebec,m,'inventory');expect(auditCalibration(quebec,m).find(a=>a.id==='inventory')?.reviewed).toBe(true);const changed=structuredClone(quebec);changed.stands[0].volume++;expect(auditCalibration(changed,m).find(a=>a.id==='inventory')?.stale).toBe(true);expect(()=>validateCalibration(m)).not.toThrow();});
 it('rejects unsafe URLs, invalid dates, statuses and unknown input groups',()=>{for(const patch of [{sourceUrl:'javascript:alert(1)'},{sourceUrl:'https://user:pass@example.org'},{sourceDate:'2026-02-30'},{status:'calibrated'}]){const m=emptyCalibration(quebec);Object.assign(m.entries.geography,patch);expect(()=>validateCalibration(m)).toThrow();}const m=emptyCalibration(quebec);m.entries.bogus=m.entries.geography;expect(()=>validateCalibration(m)).toThrow();});
 it('reports manifest differences and fingerprints values without including evidence edits',()=>{const a=emptyCalibration(quebec),b=structuredClone(a);b.entries.fleet.notes='Requires payload review';expect(compareCalibration(a,b).map(x=>x.id)).toEqual(['fleet']);expect(calibrationFingerprint({...quebec,calibration:b},'fleet')).toBe(calibrationFingerprint(quebec,'fleet'));expect(()=>validateCalibration(JSON.parse(JSON.stringify(b)))).not.toThrow();});
});
it('detects new recovery and mobilization assumptions in review fingerprints',()=>{
 const changed=structuredClone(quebec);
 const before=calibrationFingerprint(changed,'products');
 const profile=Object.values(changed.buckingProfiles??{})[0];
 expect(profile).toBeTruthy();profile.productivity*=1.1;
 expect(calibrationFingerprint(changed,'products')).not.toBe(before);
 const operating=calibrationFingerprint(changed,'operating');
 changed.mobilization!.feePerMove+=1;
 expect(calibrationFingerprint(changed,'operating')).not.toBe(operating);
});
