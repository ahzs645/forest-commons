import {useLanguage} from '../i18n';
import type {MapLens, StandLensValue} from './map-lenses';
import {MAP_LENSES, volumeBreaks, volumeLegendColors} from './map-lenses';
import './map-lenses.css';
export function mapLensName(lens: MapLens, language: string) {
  const names = {rights: ['Timber rights', 'Droits sur le bois'], standing: ['Standing volume', 'Volume sur pied'], roadside: ['Roadside stock', 'Stock en bord de route'], access: ['Access restrictions', 'Restrictions d’accès']};
  return names[lens][language === 'fr' ? 1 : 0];
}
export function MapLensSelect({value, onChange}: {value: MapLens; onChange: (lens: MapLens) => void}) {
  const {language} = useLanguage();
  return <label className="map-lens-select">{language === 'fr' ? 'Lecture de la carte' : 'Map lens'}<select aria-label={language === 'fr' ? 'Lecture de la carte' : 'Map lens'} value={value} onChange={event => onChange(event.target.value as MapLens)}>
    {MAP_LENSES.map(lens => <option key={lens} value={lens}>{mapLensName(lens, language)}</option>)}
  </select></label>;
}
export function MapLensLegend({lens}: {lens: MapLens}) {
  const {language} = useLanguage(), fr = language === 'fr';
  const fmt = (n: number) => n.toLocaleString(fr ? 'fr-CA' : 'en-CA');
  if (lens === 'standing' || lens === 'roadside') {
    const b = volumeBreaks(lens), labels = ['0', `>0 – <${fmt(b[1])}`, `${fmt(b[1])} – <${fmt(b[2])}`, `${fmt(b[2])} – <${fmt(b[3])}`, `≥${fmt(b[3])}`];
    return <div className="map-lens-legend" aria-label={fr ? 'Légende des volumes' : 'Volume legend'}><strong>{mapLensName(lens, language)} · m³</strong><ul>{labels.map((label, index) => <li key={label}><i style={{background: `rgb(${volumeLegendColors[index].slice(0,3).join(',')})`}}/>{label}</li>)}<li><i style={{background:'#919191'}}/>{fr ? 'Non enregistré' : 'Not recorded'}</li></ul><p>{fr ? 'Classes fixes pour comparer les tours. Le contour doré indique la sélection; il ne change pas la couleur du volume.' : 'Fixed bands across turns. A gold outline marks selection without changing volume color.'}</p></div>;
  }
  return <div className="map-lens-legend"><p>{lens === 'rights'
    ? (fr ? 'Vert : bois sécurisé · ocre : droits non acquis · violet : protégé · gris : droits non enregistrés · or : chantier sélectionné (droits indiqués dans la liste).' : 'Green: secured timber · ochre: unsecured rights · purple: protected · gray: rights not recorded · gold: selected site (rights shown in the list).')
    : (fr ? 'Vert : terrain accessible · rouge : restriction de terrain · violet : protégé · gris : inconnu. Un contour doré marque la sélection. Les routes gardent leur propre légende. Les autorisations, les équipes et les destinations sont vérifiées dans la préparation du plan.' : 'Green: terrain accessible · red: terrain restriction · purple: protected · gray: unknown. A gold outline marks selection. Roads keep their separate legend. Authorization, crews and destinations are checked in plan readiness.')}</p></div>;
}
export function MapLensValues({rows, lens, selected, onSelect, recorded = false, finished = false}: {rows: StandLensValue[]; lens: MapLens; selected: string; onSelect: (id: string) => void; recorded?: boolean; finished?: boolean}) {
  const {language} = useLanguage(), fr = language === 'fr';
  const volume = (n: number | null) => n === null ? (fr ? 'Non enregistré' : 'Not recorded') : `${n.toLocaleString(fr ? 'fr-CA' : 'en-CA', {maximumFractionDigits: 1})} m³`;
  const value = (row: StandLensValue) => lens === 'standing' || lens === 'roadside' ? volume(row[lens]) : lens === 'rights' ? row.owned === null ? (fr ? 'Non enregistré' : 'Not recorded') : row.protected ? (fr ? 'Protégé' : 'Protected') : row.owned ? (fr ? 'Sécurisé' : 'Secured') : (fr ? 'Non acquis' : 'Unsecured') : row.protected ? (fr ? 'Protégé' : 'Protected') : row.terrainOpen === null ? (fr ? 'Inconnu' : 'Unknown') : row.terrainOpen ? (fr ? 'Terrain accessible' : 'Terrain accessible') : (fr ? 'Terrain restreint' : 'Terrain restricted');
  return <div className="map-lens-values"><p className="muted">{recorded ? (fr ? 'État enregistré en fin de tour.' : 'Recorded end-of-turn state.') : finished ? (fr ? 'Campagne terminée; volumes actuels, aucune prévision d’accès future.' : 'Campaign complete; current volumes, no future access forecast.') : (fr ? 'Volumes actuels; accès de terrain selon les prévisions.' : 'Current volumes; forecast terrain access.')}</p><ul aria-label={fr ? 'Valeurs des chantiers' : 'Site values'}>{rows.map(row => <li key={row.id}><button aria-pressed={selected === row.id} onClick={() => onSelect(row.id)}><span>{row.name.startsWith(row.id) ? row.name : `${row.id} · ${row.name}`}</span><strong>{value(row)}</strong></button></li>)}</ul>{!rows.length && <p>{fr ? 'Aucun chantier dans ce filtre.' : 'No sites in this filter.'}</p>}</div>;
}
