import { useId, useState } from 'react';
import type { Game } from '../simulation/types';
import { useLanguage } from '../i18n';
import './model-glossary.css';

type Localized = { en: string; fr: string };
export const MODEL_TERMS = {
  retention: {
    title: { en: 'Standing retention', fr: 'Rétention sur pied' },
    definition: { en: 'The share of a site’s original timber volume kept standing in this model. The operating floor also respects the treatment and site requirements. Increasing retention reduces eligible harvest volume; it is separate from a visual-quality objective.', fr: 'La part du volume de bois initial d’un site conservée sur pied dans ce modèle. Le seuil opérationnel respecte aussi les exigences du traitement et du site. Une rétention accrue réduit le volume récoltable; elle est distincte d’un objectif de qualité visuelle.' },
  },
  bucking: {
    title: { en: 'Bucking recovery', fr: 'Récupération au tronçonnage' },
    definition: { en: 'How harvested timber grades become products. A recovery profile can redirect sawlog grades toward pulp, but cannot upgrade pulp into sawlogs or create extra volume. Profiles may also change productivity and direct harvest cost. These are illustrative model choices.', fr: 'La transformation des qualités de bois récolté en produits. Un profil peut réorienter les qualités de sciage vers la pâte, mais ne peut ni transformer du bois à pâte en billes de sciage ni créer du volume. Les profils peuvent aussi modifier la productivité et le coût direct de récolte. Ce sont des choix illustratifs du modèle.' },
  },
  roadside: {
    title: { en: 'Roadside stock', fr: 'Stock en bord de route' },
    definition: { en: 'Timber already harvested and waiting at its source site. Production adds to this stock; a truck order moves eligible stock to an outlet. Stock at roadside is not yet a recorded delivery or sale.', fr: 'Le bois déjà récolté en attente à son site d’origine. La production augmente ce stock; un ordre de camion déplace le stock admissible vers un débouché. Le stock en bord de route n’est pas encore une livraison ni une vente consignée.' },
  },
  loads: {
    title: { en: 'Truck loads', fr: 'Chargements de camion' },
    definition: { en: 'The number of loaded trips requested in a haul order. Actual volume is limited by payload, available product stock, truck time, access and receiving capacity. The final load may be partial; requesting more loads does not guarantee more delivery.', fr: 'Le nombre de trajets chargés demandé dans un ordre de transport. Le volume réel est limité par la charge utile, le stock du produit, le temps du camion, l’accès et la capacité de réception. Le dernier chargement peut être partiel; demander plus de chargements ne garantit pas une livraison accrue.' },
  },
  depot: {
    title: { en: 'Resource location / depot', fr: 'Position de la ressource / dépôt' },
    definition: { en: 'The current road-network node of a crew or truck. A raw code such as t0 is a scenario location identifier, not a time. Moving from this position to the next stop uses travel time and may add cost. An unnamed node does not establish a real-world depot.', fr: 'Le nœud routier actuel d’une équipe ou d’un camion. Un code tel que t0 identifie un lieu du scénario, pas une heure. Le déplacement de cette position au prochain arrêt consomme du temps et peut ajouter un coût. Un nœud sans nom ne désigne pas nécessairement un dépôt réel.' },
  },
  relocation: {
    title: { en: 'Relocation time', fr: 'Temps de déplacement' },
    definition: { en: 'Time used to move a resource between road-network locations. Crew assignment hours include relocation, leaving fewer hours for harvesting. Rehearsal checks routes and resource time before the turn runs.', fr: 'Le temps utilisé pour déplacer une ressource entre des lieux du réseau routier. Les heures d’affectation d’une équipe comprennent ce déplacement, laissant moins d’heures pour récolter. La simulation vérifie les trajets et le temps des ressources avant l’exécution du tour.' },
  },
} satisfies Record<string, { title: Localized; definition: Localized }>;
export type ModelTerm = keyof typeof MODEL_TERMS;

/** Native disclosure is usable with touch, Enter and Space; it never changes a plan. */
export function ModelTermHelp({ term }: { term: ModelTerm }) {
  const { language } = useLanguage();
  const entry = MODEL_TERMS[term];
  return <details className="model-term-help">
    <summary aria-label={`${language === 'fr' ? 'Expliquer' : 'Explain'} ${entry.title[language]}`}>{entry.title[language]}</summary>
    <div className="model-term-definition"><strong>{entry.title[language]}</strong><p>{entry.definition[language]}</p></div>
  </details>;
}

export function ModelGlossary() {
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const id = useId();
  const filter = query.trim().toLocaleLowerCase(language);
  const shown = Object.entries(MODEL_TERMS).filter(([, entry]) => `${entry.title[language]} ${entry.definition[language]}`.toLocaleLowerCase(language).includes(filter));
  return <details className="model-glossary">
    <summary>{language === 'fr' ? 'Glossaire du modèle' : 'Model glossary'}</summary>
    <div className="model-glossary-content">
      <p>{language === 'fr' ? 'Ces définitions expliquent la simulation; elles ne remplacent pas les normes ou les exigences régionales.' : 'These definitions explain the simulation; they do not replace regional standards or requirements.'}</p>
      <label htmlFor={id}>{language === 'fr' ? 'Chercher un terme' : 'Search model terms'}</label>
      <input id={id} type="search" value={query} onChange={event => setQuery(event.target.value)}/>
      <div className="model-glossary-results" aria-live="polite">{shown.length ? shown.map(([key, entry]) => <article key={key}><h4>{entry.title[language]}</h4><p>{entry.definition[language]}</p></article>)
        : <p>{language === 'fr' ? 'Aucun terme correspondant.' : 'No matching terms.'}</p>}</div>
    </div>
  </details>;
}

export function ResourceLocation({ game, nodeId }: { game: Game; nodeId: string }) {
  const { language, t } = useLanguage();
  const named = game.region.stands.find(stand => stand.node === nodeId)?.name ?? game.region.mills.find(mill => mill.node === nodeId)?.name;
  return <span className="resource-location">{named ? `${t(named)} (${nodeId})` : `${language === 'fr' ? 'Nœud routier' : 'Road node'} ${nodeId}`}</span>;
}
