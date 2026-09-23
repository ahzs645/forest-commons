import {advancedMessage} from './advanced-runtime';
import advanced from './i18n-advanced.json';
/** French number layout for amounts captured from English messages: "CAD 51,431" → "51 431 CAD", "1,234.5" → "1 234,5". Older saves with bare integers pass through unchanged apart from grouping. */
const frNumber=(n:string)=>n.replace(/,/g,'\u202f').replace(/\.(?=\d)/,',');
const frAmount=(text:string)=>{const money=text.match(/^([A-Z]{3}) ([\d,.]+)$/);return money?`${frNumber(money[2])} ${money[1]}`:frNumber(text);};
/** Translate known engine templates at presentation time; preserve authored names and saved evidence. */
const patterns: [RegExp,(...parts:string[])=>string][] = [
 [/^([\d,]+) m³ now\. Same-turn harvest may add stock; rehearsal checks fulfillment\.$/,(_,n)=>`${n} m³ actuellement. La récolte du même tour peut ajouter du stock; la simulation vérifie l’exécution.`],
 [/^([\d,]+) m³ now; this turn’s crew plan harvests here first\. Rehearsal checks fulfillment\.$/,(_,n)=>`${n} m³ actuellement; le plan des équipes récolte d’abord ce site ce tour-ci. La simulation vérifie l’exécution.`],
 [/^authorization pending until turn (\d+|\?)$/,(_,turn)=>`autorisation en attente jusqu’au tour ${turn}`],
 [/^available in (\d+) week\(s\)$/,(_,n)=>`disponible dans ${n} tour(s)`],
 [/^Scenario (.+) validated\. Review it in Scenario studio, then start a campaign\.$/,(_,name)=>`Scénario ${name} validé. Examinez-le dans l’atelier, puis démarrez une campagne.`],
 [/^Saved campaign could not be restored: (.+)\. The original browser save has not been overwritten\.$/,(_,error)=>`La campagne enregistrée n’a pas pu être restaurée : ${error}. La sauvegarde d’origine n’a pas été écrasée.`],

 [/^(.+): (.+) is not owned\.$/,(_,name,id)=>`${name} : ${id} n’est pas acquis.`],
 [/^(.+): terrain closed at (.+) \((.+)\)\.$/,(_,name,id,weather)=>`${name} : terrain fermé à ${id} (${({thaw:'dégel',wet:'humide',normal:'normal',frozen:'gelé'} as Record<string,string>)[weather]??weather}).`],
 [/^(.+): no open road to (.+)\.$/,(_,name,id)=>`${name} : aucune route ouverte vers ${id}.`],
 [/^(.+): relocation exceeds assigned hours for (.+)\.$/,(_,name,id)=>`${name} : la relocalisation dépasse les heures attribuées pour ${id}.`],
 [/^(.+): (.+) complete; (.+)% standing retention\.$/,(_,id,treatment,retention)=>`${id} : ${treatment} terminé; rétention sur pied de ${retention} %.`],
 [/^(.+): (.+) is temporarily unavailable\.$/,(_,truck,mill)=>`${truck} : ${mill} est temporairement indisponible.`],
 [/^(.+): closed road for (.+) → (.+)\.$/,(_,truck,id,mill)=>`${truck} : route fermée de ${id} vers ${mill}.`],
 [/^(.+): no delivery for (.+) \/ (.+); check stock, demand and time\.$/,(_,truck,id,product)=>`${truck} : aucune livraison pour ${id} / ${product}; vérifiez le stock, la demande et le temps.`],
 [/^(.+): carried (.+) m³ partner cargo on (.+); additional handling and travel consumed (.+) h\.$/,(_,truck,volume,id,hours)=>`${truck} : ${frAmount(volume)} m³ de fret partenaire transportés pour ${id}; la manutention et le trajet supplémentaires ont consommé ${hours} h.`],
 [/^Won (.+) for (.+)\. Available next week; refusal window lasts one week\.$/,(_,id,bid)=>`${id} remporté pour ${frAmount(bid)}. Disponible au prochain tour; le refus reste possible pendant une semaine physique.`],
 [/^(.+): insufficient cash and credit at settlement\.$/,(_,id)=>`${id} : trésorerie et crédit insuffisants au règlement.`],
 [/^(.+): rival bid (.+) won\.$/,(_,id,bid)=>`${id} : l’offre concurrente de ${frAmount(bid)} a remporté le lot.`],
 [/^(.+): (crew|truck|road|mill) (.+) unavailable through week (\d+), unless recovery finishes earlier\.$/,(_,title,kind,id,week)=>`${title} : ${({crew:'équipe',truck:'camion',road:'route',mill:'usine'} as Record<string,string>)[kind]} ${id} indisponible jusqu’au tour ${week}, sauf rétablissement anticipé.`],
 [/^Invalid bid for (.+)\.$/,(_,id)=>`Offre invalide pour ${id}.`],
 [/^(.+): scheduled hours exceed capacity\.$/,(_,name)=>`${name} : les heures planifiées dépassent la capacité.`],
 [/^(.+): invalid production order\.$/,(_,name)=>`${name} : ordre de production invalide.`],
 [/^(.+): invalid haul order\.$/,(_,name)=>`${name} : ordre de transport invalide.`],
 [/^(.+): target outside this month's demand\.$/,(_,name)=>`${name} : cible hors des limites de demande de cette période.`],
 [/^(.+): processing and output sales suspended during shutdown\.$/,(_,name)=>`${name} : transformation et ventes suspendues pendant l’arrêt.`],
 [/^(.+): transfer suspended during facility shutdown\.$/,(_,name)=>`${name} : transfert suspendu pendant l’arrêt de l’installation.`],
 [/^(.+): no transfer; check opening output stock, road access and remaining truck hours\.$/,(_,name)=>`${name} : aucun transfert; vérifiez le stock de sortie initial, l’accès routier et les heures restantes des camions.`],
 [/^(.+): paired shipments paused; both managed supplies and receiving mills must be available\.$/,(_,name)=>`${name} : expéditions jumelées suspendues; les deux approvisionnements gérés et les usines réceptrices doivent être disponibles.`],
 [/^(.+): no balanced pair dispatched; check matching stock above reserves, both routes, demand and remaining truck hours\. Neither leg was sent alone\.$/,(_,name)=>`${name} : aucune paire équilibrée expédiée; vérifiez les stocks correspondants au-dessus des réserves, les deux trajets, la demande et les heures restantes. Aucun trajet n’a été expédié seul.`],
 [/^(.+) weekly availability$/,(_,name)=>`${name} : disponibilité du tour`],
 [/^Won (.+); rival (.+)$/,(_,id,bid)=>`${id} remporté; concurrent ${frAmount(bid)}`],
 [/^(.+) closing shortfall$/,(_,name)=>`${name} : manque au règlement`],
];
export function translateRuntime(text:string){const raw=text.startsWith('Error: ')?text.slice(7):text;for(const [pattern,render] of patterns){const match=raw.match(pattern);if(match)return render(...match);}const translated=advancedMessage(raw,key=>(advanced as Record<string,string>)[key]??key);return translated!==raw?translated:undefined;}
