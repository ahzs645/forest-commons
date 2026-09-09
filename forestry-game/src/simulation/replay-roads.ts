import type {Game,WeekResult} from './types';
import {operatingRegion} from './disruptions';
/** Null means unknown, never a reconstruction from today's permit state. */
export function replayRoadIds(game:Game,report?:WeekResult):Set<string>|null {
 if(!report)return new Set(operatingRegion(game,true).roads.edges.map(e=>e.id));
 if(report.snapshot?.operationalRoadIds)return new Set(report.snapshot.operationalRoadIds);
 return null;
}
