import type {Language} from './i18n';
/** Display physical duration without exposing repeating decimal week fractions. */
export function turnIntervalLabel(weeks:number,language:Language):string {
 const fraction=Math.abs(weeks-.5)<1e-9?'½':Math.abs(weeks-.25)<1e-9?'¼':null;
 if(Math.abs(weeks-1/7)<1e-9)return language==='fr'?'1 jour / tour':'1 day / turn';
 const value=fraction??new Intl.NumberFormat(language==='fr'?'fr-CA':'en-CA',{maximumFractionDigits:3}).format(weeks);
 return `${value} ${language==='fr'?'semaine':'week'}${weeks>1?'s':''} / ${language==='fr'?'tour':'turn'}`;
}
