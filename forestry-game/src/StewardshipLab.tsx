import { useAnnualLanguage } from "./annual-language";
import AnnualAlternatives from "./AnnualAlternatives";
import AnnualStandPreview from "./AnnualStandPreview";
import { annualContext, rehearseAnnual } from "./simulation/annual-alternatives";
import "./annual-stewardship.css";
import StewardshipCharts from "./StewardshipCharts";
import { useMemo, useState } from "react";
import type { Game } from "./simulation/types";
import { startStewardship, stewardshipHabitat } from "./simulation/stewardship";
import type { StewardshipAction } from "./simulation/stewardship";
export default function StewardshipLab({
  game,
  onChange,
}: {
  game: Game;
  onChange: (g: Game) => void;
}) {
 const {t: tr,language}=useAnnualLanguage();
 const f=(n:number)=>Math.round(n).toLocaleString(language==='fr'?'fr-CA':'en-CA');
 const actionLabel=(action:StewardshipAction)=>tr(({rest:'Rest / recover',thin:'Commercial thinning',final:'Final harvest',plant:'Plant regeneration'} as Record<string,string>)[action]??action);
  const [actions, setActions] = useState<Record<string, StewardshipAction>>({}),
    [error, setError] = useState(""),
    region = game.linkedSeason?.baseRegion ?? game.region,
    locked = !!game.linkedSeason && !game.linkedSeason.settled,
    p = region.stewardship,
    s = game.stewardship;
  const context = annualContext(game);
  const [draftContext, setDraftContext] = useState(context);
  const [selectedId, setSelectedId] = useState(s?.stands.find(t=>t.managed)?.id ?? '');
  const choices = draftContext === context ? actions : {};
  const managed = s?.stands.filter(t=>t.managed) ?? [];
  const selected = managed.find(t=>t.id===selectedId) ?? managed[0];
  const updateActions = (next: Record<string, StewardshipAction>) => { setDraftContext(context); setActions(next); setError(''); };
  const rehearsal = useMemo(()=>{ if(!s||locked||!p||s.year>p.years)return {result:null,problem:''};try{return {result:rehearseAnnual(game,choices),problem:''};}catch(e){return {result:null,problem:(e as Error).message};}},[game, choices, locked, p, s]);
  const apply = () => { try { const result = rehearseAnnual(game,choices); onChange({...game,stewardship:result}); setActions({}); setError(''); } catch(e) { setError((e as Error).message); } };
  if (!p)
    return (
      <section className="panel">
        <h2>{tr("Annual stewardship")}</h2>
        <p>{tr("This region has no annual model. Load an authored scenario with stewardship parameters.")}{" "}</p>
      </section>
    );
  return (
    <section className="panel">
      <h2>{tr("Annual forest stewardship")}</h2>
      <p>{language==='fr'
        ? `Cet exercice de ${p.years} ans commence avec les volumes sur pied actuels. Utilisez l’onglet Saisons opérationnelles pour transférer cette forêt et ce budget vers une autre période opérationnelle. Les actions annuelles indépendantes avancent d’une année de gestion complète.`
        : `This ${p.years}-year exercise starts from current standing volumes. Use the Operating seasons tab to carry this forest and budget into another operating window. Independent annual actions advance one full management year.`}</p>
      <p className="muted">{tr('Illustrative annual model; recorded values are model outputs.')}</p>
      <details>
        <summary>{tr("Model parameters and timing")}</summary>
      <p className="notice">{tr(p.note)}</p>
      {region.bcTenure && <p className="notice">{tr("BC annual harvest uses the authorization snapshot captured when this exercise starts. Approvals and expiry do not advance within the independent annual exercise. Published stumpage rates are also fixed at exercise opening; connected operating seasons model market changes. Resolve applications in the operating campaign first, or use connected operating seasons for renewed authorization checks. Harvest margins exclude the stumpage and operator provisions shown below. Monitoring provisions exclude planting; choosing Plant regeneration charges planting separately.")}</p>}

        <p>
          {tr("Growth")} {p.annualGrowthM3Ha}{" "}{tr("m³/ha/year, capacity")}{" "}
          {p.carryingCapacityM3Ha}{" "}{tr("m³/ha (at least opening scenario volume). Natural regeneration waits")}{" "}{p.naturalRegenerationYears}{" "}{tr("years; planting waits")}{" "}{p.plantedRegenerationYears}{" "}{tr(". Planting costs")}{" "}
          {region.currency} {p.plantingCostHa}{" "}{tr("/ha. Sparse stands wait for establishment before growth; retained mature canopy continues growing above half capacity. Treatments are at least five years apart.")}{" "}</p>
        <p>{tr("Thinning removes")}{" "}{p.thinningFraction * 100}{" "}{tr("%; final harvest retains")}{" "}
          {p.finalRetention * 100}{" "}{tr("%. Net teaching revenues are")}{" "}{p.thinningNetM3}
          /{p.finalNetM3}{" "}{tr("per m³. Habitat is a bounded teaching index that falls with removals and recovers by")}{" "}{p.habitatRecoveryPerYear}{" "}{tr("per rest year. Only stands secured when this exercise began can be treated; protected areas remain untouched.")}{" "}</p>
      </details>
      {!s ? (
        <button
          className="primary"
          onClick={() =>
            onChange({ ...game, stewardship: startStewardship(game) })
          }
        >{tr("Start annual exercise from current forest")}{" "}</button>
      ) : (
        <>
          {locked && <p className="notice">{tr("The active operating window owns this year. Complete and settle it before applying annual actions.")}</p>}
          <p>
            <strong>
              {tr("Year")} {Math.min(s.year, p.years)} / {p.years}
            </strong>{" "}{" "}{tr("· budget")}{" "}{region.currency} {f(s.cash)}{" "}{tr("· standing")}{" "}
            {f(s.stands.reduce((n, t) => n + t.volume, 0))}{" "}{tr("m³")}{" "}</p>
          <p>{tr("Landscape habitat:")}{" "}{(stewardshipHabitat(region, s).landscape * 100).toFixed(1)}{" "}{tr("% · Managed-area habitat:")}{" "}{stewardshipHabitat(region, s).managed == null ? tr("No managed area") : `${(stewardshipHabitat(region, s).managed! * 100).toFixed(1)}%`}</p>
          <section className="annual-planner" aria-label={tr('Plan this management year')}>
            <h3>{tr('Plan this management year')}</h3>
            {selected ? <div className="annual-editor">
              <label>{tr('Selected stand')}<select value={selected.id} onChange={e=>setSelectedId(e.target.value)}>{managed.map(t=><option key={t.id} value={t.id}>{t.id} · {region.stands.find(d=>d.id===t.id)?.name}</option>)}</select></label>
              <label>{tr('This year')}<select aria-label={`${selected.id} ${tr('annual treatment')}`} disabled={locked || s.year > p.years} value={choices[selected.id]??'rest'} onChange={e=>updateActions({...choices,[selected.id]:e.target.value as StewardshipAction})}>
                <option value="rest">{tr('Rest / recover')}</option><option value="thin" disabled={!!selected.harvestAuthorizationProblem}>{tr('Commercial thinning')}</option><option value="final" disabled={!!selected.harvestAuthorizationProblem}>{tr('Final harvest')}</option><option value="plant">{tr('Plant regeneration')}</option>
              </select></label>
              <p>{selected.id}: {f(selected.volume)} m³ · {tr('Habitat index')} {selected.habitat.toFixed(2)} · {tr(selected.planted?'Planted':'Natural')} · {selected.regenerationAge} {tr('years')}</p>
              {selected.harvestAuthorizationProblem && <p className="notice">{tr(selected.harvestAuthorizationProblem)}</p>}
            </div>:<p>{tr('Choose a managed stand to plan a treatment.')}</p>}
            <h4>{tr('Review this year')}</h4>
            {Object.entries(choices).some(([,action])=>action!=='rest')?<ul className="stewardship-actions">{Object.entries(choices).filter(([,action])=>action!=='rest').map(([id,action])=><li key={id}>{id}: {actionLabel(action)}</li>)}</ul>:<p>{tr('No annual work selected; all stands will rest.')}</p>}
            {rehearsal.result && <><p className="muted">{tr('Rehearsal only — the saved forest and budget are unchanged.')}</p><dl className="annual-map-observations"><div><dt>{tr('Harvest')}</dt><dd>{f(rehearsal.result.history.at(-1)!.harvest)} m³</dd></div><div><dt>{tr('Closing budget')}</dt><dd>{region.currency} {f(rehearsal.result.cash)}</dd></div><div><dt>{tr('Landscape habitat')}</dt><dd>{(rehearsal.result.history.at(-1)!.habitat*100).toFixed(1)}%</dd></div></dl></>}
            {(rehearsal.problem||error)&&<p role="alert">{tr(error||rehearsal.problem)}</p>}
            <div className="annual-primary-actions"><button className="primary" disabled={locked || s.year > p.years || !!rehearsal.problem} onClick={apply}>{tr('Apply treatments and advance one year')}</button><button disabled={locked||s.year>p.years} onClick={()=>updateActions({})}>{tr('Clear annual choices')}</button></div>
            <AnnualAlternatives game={game} actions={choices} onChoose={updateActions}/>
            {selected && rehearsal.result && <AnnualStandPreview region={region} opening={s} result={rehearsal.result} id={selected.id}/>}
          </section>
          <details><summary>{tr('Full current forest')}</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Stand")}</th>
                  <th>{tr("Standing m³")}</th>
                  <th>{tr("Habitat index")}</th>
                  <th>{tr("Regeneration")}</th>
                  {region.bcTenure && <th>{tr("Harvest authorization snapshot")}</th>}
                  <th>{tr("This year")}</th>
                </tr>
              </thead>
              <tbody>
                {s.stands.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.id} ·{" "}
                      {region.stands.find((d) => d.id === t.id)!.name}
                    </td>
                    <td>{f(t.volume)}</td>
                    <td>{t.habitat.toFixed(2)}</td>
                    <td>
                      {tr(t.planted ? "Planted" : "Natural")} · {t.regenerationAge}{" "}{" "}{tr("years")}{" "}</td>
                    {region.bcTenure && <td>{t.harvestAuthorizationProblem ? tr(t.harvestAuthorizationProblem) : tr("No authorization block in opening snapshot")}</td>}
                    <td>
                      {actionLabel(choices[t.id] ?? "rest")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </details>
          <StewardshipCharts state={s} region={region}/>
          <details><summary>{tr('Annual record')}</summary>
          <h3>{tr("Annual record")}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Year")}</th>
                  <th>{tr("Growth")}</th>
                  <th>{tr("Harvest")}</th>
                  <th>{tr("Closing timber")}</th>
                  <th>{tr("Cash movement")}</th>
                  {region.bcTenure && <><th>{tr("Stumpage paid")}</th><th>{tr("Operator provisions paid")}</th><th>{tr("All-party obligations accrued")}</th></>}
                  <th>{tr("Landscape habitat")}</th><th>{tr("Managed habitat")}</th>
                </tr>
              </thead>
              <tbody>
                {s.history.map((h) => (
                  <tr key={h.year}>
                    <td>{h.year}</td>
                    <td>{f(h.growth)}</td>
                    <td>{f(h.harvest)}</td>
                    <td>{f(h.closing)}</td>
                    <td>{f(h.cashChange)}</td>
                    {region.bcTenure && <><td>{f(h.stumpageCost??0)}</td><td>{f(h.postHarvestCost??0)}</td><td>{f(h.postHarvestAccrued??0)}</td></>}
                    <td>{h.habitat.toFixed(2)}</td><td>{h.managedHabitat == null ? tr("Unavailable") : h.managedHabitat.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </details>
        </>
      )}
    </section>
  );
}
