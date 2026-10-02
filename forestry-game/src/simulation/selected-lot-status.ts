import type { Game } from './types';
import { canAccess, weatherAt } from './routing';
import { harvestAuthorizationProblem, roadAuthorizationProblem } from './tenure';

export function selectedLotStatus(game: Game, standId: string) {
  const stand = game.region.stands.find(s => s.id === standId);
  const state = game.stands.find(s => s.id === standId);
  if (!stand || !state) return null;
  const complete = game.week > game.region.weeks;
  const protectedSite = stand.supply === 'protected';
  const rights = protectedSite ? 'protected' : state.refused ? 'refused' : state.owned ? 'secured' : 'unsecured';
  const problem = harvestAuthorizationProblem(game, standId);
  const harvest = !game.region.bcTenure?.stands[standId] ? 'unmodelled'
    : !problem ? 'active' : problem.startsWith('protected') ? 'prohibited'
    : problem.includes('pending') ? 'pending' : problem.includes('expired') ? 'expired' : 'required';
  const siteRoads = game.region.roads.edges.filter(edge => edge.from === stand.node || edge.to === stand.node);
  const modeledRoads = siteRoads.filter(edge => game.region.bcTenure?.roads[edge.id]);
  const blockedRoads = modeledRoads.filter(edge => roadAuthorizationProblem(game, edge.id));
  const forecast = complete ? null : weatherAt(game, true)[stand.zone];
  const authoredWindow = game.region.operations?.stands[standId]?.allowedWeather;
  const terrain = complete ? 'complete' : forecast && canAccess(stand.terrain, forecast) &&
    (!authoredWindow || authoredWindow.includes(forecast)) ? 'open' : 'closed';
  return {
    rights, harvest, complete, forecast,
    approvalTurn: game.bcTenure?.harvest[standId]?.approvedWeek,
    terrain,
    siteRoadAuthority: !modeledRoads.length ? 'unmodelled' : blockedRoads.length ? 'blocked' : 'active',
    blockedRoadIds: blockedRoads.map(edge => edge.id),
  } as const;
}
