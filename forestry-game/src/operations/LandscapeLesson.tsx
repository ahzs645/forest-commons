import { useState } from 'react';
import type { Game } from '../simulation/types';
import { useLanguage } from '../i18n';

export default function LandscapeLesson({ game, standId }: { game: Game; standId: string }) {
  const { language } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const [notes, setNotes] = useState<Record<string, string>>({});
  const stand = game.region.stands.find(candidate => candidate.id === standId) ?? game.region.stands[0];
  const noteKey = `${game.region.id}:${game.seed}:${stand.id}`;
  const download = () => {
    const ring = stand.polygon.map(position => [...position]);
    if (ring.length && (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1])) ring.push([...ring[0]]);
    const feature = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {
      standId: stand.id, regionId: game.region.id, name: stand.name, boundaryRole: 'inventory-reference-only',
      reviewedCutblock: false, sourceNote: stand.sourceNote ?? 'Authored teaching geometry',
      sources: game.region.sources ?? [], learnerNotes: notes[noteKey] ?? '',
    } }] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(feature, null, 2)], { type: 'application/geo+json' }));
    const link = document.createElement('a'); link.href = url; link.download = `${stand.id}-landscape-reference.geojson`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="panel landscape-lesson">
    <h2>{text('Explore the landscape', 'Explorer le paysage')}</h2>
    <p><strong>{stand.id} · {stand.name}</strong></p>
    <p>{text('Use PGMaps to explore viewpoints and compare proposed harvest designs from the same road position. Record what you see alongside the operating results.', 'Utiliser PGMaps pour explorer les points de vue et comparer les projets de récolte depuis la même position sur la route. Consigner les observations avec les résultats opérationnels.')}</p>
    <ol>
      <li>{text('Open the worked example and choose Visit. Save a viewpoint before comparing the before/after views.', 'Ouvrir l’exemple et choisir Visit. Enregistrer un point de vue avant de comparer les vues avant/après.')}</li>
      <li>{text('Compare clearcut, retained trees and partial cutting. Note which inputs and evidence each comparison needs.', 'Comparer la coupe à blanc, les arbres conservés et la coupe partielle. Noter les données et les preuves nécessaires à chaque comparaison.')}</li>
      <li>{text('Explain the tradeoff between timber, cost, habitat and scenic observations. The Commons habitat index and standing-retention fraction do not measure visual quality.', 'Expliquer les compromis entre bois, coût, habitat et observations du paysage. L’indice d’habitat et la fraction de rétention de Commons ne mesurent pas la qualité visuelle.')}</li>
    </ol>
    <div className="landscape-actions"><a href="https://pgmaps.ahmadjalil.com/dev/forestry/visual-quality" target="_blank" rel="noreferrer">{text('Open PGMaps visual-quality lesson', 'Ouvrir la leçon de qualité visuelle PGMaps')}</a><button type="button" onClick={download}>{text('Download selected inventory outline & notes', 'Télécharger le contour d’inventaire et les notes')}</button></div>
    <label>{text('Your observations (included in the download)', 'Vos observations (incluses dans le téléchargement)')}<textarea value={notes[noteKey] ?? ''} maxLength={4000} onChange={event => setNotes(previous => ({ ...previous, [noteKey]: event.target.value }))}/></label>
    <p className="muted">{text('The download is an inventory reference, not a reviewed cutblock or landform. PGMaps opens separately; any import requires its own boundary review, terrain and evidence. Notes stay on this screen until you leave; download them to keep a copy.', 'Le téléchargement est une référence d’inventaire, et non un bloc de coupe ou un relief validé. PGMaps s’ouvre séparément; toute importation nécessite sa propre vérification des limites, du terrain et des preuves. Les notes restent sur cet écran jusqu’à votre départ; les télécharger pour les conserver.')}</p>
  </section>;
}
