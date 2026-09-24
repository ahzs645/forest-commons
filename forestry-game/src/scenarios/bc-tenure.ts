import type { RegionDefinition } from '../simulation/types';
import type { BCTenureDefinition } from '../simulation/tenure';

/**
 * An authored exercise, not a tenure lookup or a provincial appraisal.
 * `cases` names the secured stands that start without a cutting permit and the
 * one whose permit lapses after six weeks; by default the 9th–10th and 8th
 * stands in source order, as the guided lesson expects.
 */
export function bcTeachingTenure(region: RegionDefinition, cases: { permitRequired: string[]; shortPermit?: string } = {
  permitRequired: [region.stands[8]?.id, region.stands[9]?.id].filter(Boolean), shortPermit: region.stands[7]?.id,
}): NonNullable<RegionDefinition['bcTenure']> {
  const ministry = 'Ministry of Forests — statutory decision-maker (teaching role)';
  const bcts = 'BC Timber Sales — timber sales manager, Ministry of Forests (teaching role)';
  return {
    note: 'BC teaching rules, checked against official guidance on 2026-09-08. These polygons do not establish actual tenure, private ownership, permits, or Indigenous consultation outcomes. Applications resolve after authored operating-week delays; this is not a real approval service or a prediction of approval. Product rates are illustrative CAD/m³, not current Interior stumpage rates or species/grade scaling. Auction payments represent a separate upfront teaching sale premium. Existing rights do not exempt Crown harvest from stumpage. Post-harvest amounts are financial provisions, not proof that planting, surveys, or road work occurred. First Nations consultation, title, land-use decisions, and real application review are prerequisites assumed resolved for eligible exercise areas, not simulated by a timer.',
    stands: Object.fromEntries(region.stands.map((stand): [string, BCTenureDefinition] => {
      const privateLand = stand.supply === 'private', protectedLand = stand.supply === 'protected', sale = stand.supply === 'auction';
      return [stand.id, {
        type: protectedLand ? 'protected' : privateLand ? 'private-land' : sale ? 'bcts-timber-sale' : 'forest-licence',
        authority: protectedLand ? 'Protected exercise area — no harvesting authority' : privateLand ? 'Landowner — contractual consent (fictional private-land case)' : sale ? bcts : ministry,
        harvest: {
          kind: protectedLand ? 'prohibited' : privateLand ? 'owner-consent' : sale ? 'timber-sale-licence' : 'cutting-permit',
          initialStatus: protectedLand || sale || cases.permitRequired.includes(stand.id) ? 'required' : 'approved',
          delayWeeks: privateLand ? 0 : 1,
          ...(stand.id === cases.shortPermit ? { validForWeeks: 6 } : {}),
        },
        stumpage: { basis: privateLand || protectedLand ? 'none' : 'interior-teaching', ratePolicy: sale ? 'fixed-at-award' : 'adjustable', rates: privateLand || protectedLand ? {} : { 'soft-saw': 12, 'soft-pulp': 3, 'hard-saw': 8, 'hard-pulp': 2, poplar: 2 } },
        obligations: protectedLand ? [] : [
          { id: 'regeneration', label: sale ? 'BCTS reforestation and monitoring provision' : 'Regeneration survey and establishment monitoring provision (planting excluded)', responsibleParty: sale ? 'bcts' : privateLand ? 'owner' : 'operator', costPerM3: 2 },
          { id: 'site-closeout', label: 'Site close-out, road work and reporting financial provision', responsibleParty: 'operator', costPerM3: 0.75 },
        ],
      }];
    })),
    // Public roads (the modelled Prince George connector) need no FSR road-use permit.
    roads: Object.fromEntries(region.roads.edges.filter(edge => edge.roadClass !== 'public').map(edge => {
      const stand = region.stands.find(s => edge.id === `access-${s.id}`);
      return [edge.id, {
        kind: !stand ? 'road-use-permit' : stand.supply === 'private' ? 'owner-consent' : 'road-permit',
        authority: stand?.supply === 'private' ? 'Landowner — access consent (teaching role)' : stand?.supply === 'auction' ? bcts : ministry,
        initialStatus: stand?.supply === 'auction' || stand?.supply === 'protected' ? 'required' : 'approved',
        delayWeeks: stand?.supply === 'private' ? 0 : 1,
      }];
    })),
  };
}
