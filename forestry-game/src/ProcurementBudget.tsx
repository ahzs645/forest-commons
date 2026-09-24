import {useLanguage} from './i18n';
import {budgetCommitted} from './simulation/engine';
import type {Game} from './simulation/types';
export default function ProcurementBudget({game}:{game:Game}) {
 const {language}=useLanguage(),fr=language==='fr';
 const deferred=!game.region.bcTenure&&game.region.economy.timberPayment==='harvest-royalty';
 const available=Math.max(0,game.cash+(game.region.economy.procurementCreditLimit??0)-budgetCommitted(game));
 const money=`${game.region.currency} ${available.toLocaleString(fr?'fr-CA':'en-CA',{maximumFractionDigits:0})}`;
 return <span>{deferred
  ? (fr?'Acquisition différée : les redevances sont payées à la récolte; les garanties de refus restent exigibles.':'Deferred acquisition: royalties are paid on harvest; refusal guarantees still apply.')
  : `${fr?'Disponible pour acquisition après les offres':'Available for procurement after bids'}: ${money}`}</span>;
}
