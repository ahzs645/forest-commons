import production from "./i18n-production.json";
import {translateRuntime} from "./i18n-runtime";
import mapDetails from "./i18n-map-details.json";
import teachingUi from "./i18n-teaching-ui.json";
import shell from "./i18n-shell.json";
import planning from "./i18n-planning.json";
import advanced from "./i18n-advanced.json";
import calibration from "./i18n-calibration.json";
import classroom from "./i18n-classroom.json";
import controls from "./i18n-controls.json";
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
export type Language = 'en' | 'fr';
export const french: Record<string,string> = {
 ...controls,
 ...production,
 ...mapDetails,
 ...teachingUi,
 ...planning,
 ...advanced,
 ...calibration,
 ...classroom,
 ...shell,
 'Map':'Carte','Overview':'Vue d’ensemble','Forest & timber':'Forêt et bois','Planning desk':'Planification','Production':'Production','Transport':'Transport','Reports':'Rapports','Scenario studio':'Atelier de scénarios','Classroom':'Salle de classe','Stewardship':'Aménagement','Collaboration':'Collaboration',
 'Language':'Langue','Expand sidebar':'Développer le menu','Collapse sidebar':'Réduire le menu','Main navigation':'Navigation principale','Export save':'Exporter la sauvegarde','Import':'Importer','Draft plan':'Proposer un plan','Run operations':'Exécuter les opérations','Start campaign':'Démarrer la campagne','Cancel':'Annuler','Close':'Fermer','Remove':'Retirer','Save':'Enregistrer','Saved on this device':'Enregistré sur cet appareil','Save paused':'Enregistrement suspendu','Week':'Semaine','Turn':'Tour','Run':'Exécuter',
 'Decision interval':'Intervalle de décision','Turns per week':'Tours par semaine','Prepare separate scenario':'Préparer un scénario distinct','2 · half-week':'2 · demi-semaine','4 · quarter-week':'4 · quart de semaine','7 · daily':'7 · quotidien',
 'Classroom rooms':'Salles de classe','Room ID':'Identifiant de salle','Role credential':'Identifiant secret du rôle','Join assigned role':'Rejoindre le rôle attribué','Leave room':'Quitter la salle','Participant role':'Rôle du participant','Submit my plan':'Soumettre mon plan','Forget saved room connection':'Oublier la connexion enregistrée','Recover instructor access':'Récupérer l’accès enseignant','Recover instructor role':'Récupérer le rôle enseignant','Create instructor room from this region':'Créer une salle enseignant pour cette région','Room creation administrator credential':'Identifiant secret administrateur pour créer une salle','Issue / replace role credential':'Créer ou remplacer l’identifiant du rôle','Advance all participants one week':'Avancer tous les participants d’un tour','Discard draft and refresh':'Abandonner le brouillon et actualiser','Refresh room and discard draft':'Actualiser la salle et abandonner le brouillon','Settled operating results':'Résultats des opérations réglées','Room audit trail':'Historique de la salle',
 'Live group monitor':'Suivi des groupes en direct','Refresh groups':'Actualiser les groupes','Add or reconnect a group':'Ajouter ou reconnecter un groupe','Group label':'Nom du groupe','Instructor credential':'Identifiant secret enseignant','Monitor group':'Suivre le groupe','Monitor current classroom':'Suivre la salle actuelle','Untimed session':'Session sans limite de temps','Session paused':'Session en pause','Session deadline reached':'Temps de session écoulé','Minutes':'Minutes','Start timer':'Démarrer le minuteur','Extend session':'Prolonger la session','Resume submissions':'Reprendre les soumissions','Pause submissions':'Suspendre les soumissions','Disable timer':'Désactiver le minuteur','Standalone edition':'Édition autonome',
 'Stand':'Parcelle','Hours':'Heures','Treatment':'Traitement','Mill':'Usine','Product':'Produit','Loads':'Chargements','Add crew stop':'Ajouter un arrêt d’équipe','Add haul stop':'Ajouter un arrêt de transport','Bucking recovery':'Récupération au tronçonnage','Standard recovery':'Récupération standard','Retained fraction':'Fraction conservée','Monthly commitments':'Engagements mensuels','Road investment':'Investissement routier','Company negotiation':'Négociation entre entreprises','Your company decision':'Décision de votre entreprise',
 'Room changed. Refresh before submitting your decision.':'La salle a changé. Actualisez avant de soumettre votre décision.',
 'Room credential is invalid or has been replaced.':'L’identifiant de salle est invalide ou a été remplacé.',
 'This role cannot perform that action.':'Ce rôle ne peut pas effectuer cette action.',
 'Session is paused. Ask the instructor to resume submissions.':'La session est en pause. Demandez à l’enseignant de reprendre les soumissions.',
 'Session deadline reached. Ask the instructor to extend the timer before submitting.':'Le temps est écoulé. Demandez à l’enseignant de prolonger la session avant de soumettre.',
 'This auction lot has not been released yet.':'Ce lot aux enchères n’est pas encore disponible.',
 'Choose a duration from 1 to 240 minutes.':'Choisissez une durée de 1 à 240 minutes.',
 'Plan contains fields owned by another role.':'Le plan contient des champs attribués à un autre rôle.',
 'Instructor access is required for group monitoring.':'L’accès enseignant est requis pour suivre les groupes.',
 'This scenario already uses subweekly turns.':'Ce scénario utilise déjà plusieurs tours par semaine.',
 'This decision interval exceeds the 104-turn scenario limit.':'Cet intervalle dépasse la limite de 104 tours du scénario.',
};
export function translate(text:string,language:Language){
 if(language==='en')return text;
 const raw=text.startsWith('Error: ')?text.slice(7):text;
 const lookup=(value:string)=>french[value]??french[value.replace(/\s+/g,' ').trim()]??translateRuntime(value);
 const direct=lookup(raw);if(direct!==undefined)return direct;
 // Joined plan errors use separate sentences; unknown authored text stays verbatim.
 const parts=raw.split(/(?<=\.)\s+/);
 if(parts.length>1){const translated=parts.map(part=>lookup(part)??part);if(translated.some((part,i)=>part!==parts[i]))return translated.join(' ');}
 return text;
}

const Context=createContext({language:'en' as Language,setLanguage:(_language:Language)=>{},t:(text:string)=>text});
export function LanguageProvider({children}:{children:ReactNode}){
 const [language,setLanguage]=useState<Language>(()=>{try{return localStorage.getItem('forest-language')==='fr'?'fr':'en';}catch{return 'en';}});
 useEffect(()=>{document.documentElement.lang=language;try{localStorage.setItem('forest-language',language);}catch{/* language remains usable without storage */}},[language]);
 return <Context.Provider value={{language,setLanguage,t:text=>translate(text,language)}}>{children}</Context.Provider>;
}
export const useLanguage=()=>useContext(Context);
export function LanguageSelect(){const {language,setLanguage,t}=useLanguage();return <label className="language-picker">{t('Language')}<select aria-label={t('Language')} value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="en">English</option><option value="fr">Français</option></select></label>;}
