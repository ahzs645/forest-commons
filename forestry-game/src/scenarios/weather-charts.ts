import type {RegionDefinition, Weather, WeatherCharts, WeatherPoint} from '../simulation/types';
export function categoryWeatherPoint(category:Weather):WeatherPoint {
 return {frozen:{temperatureC:-7,snowCm:45,precipitationMm:8},thaw:{temperatureC:3,snowCm:15,precipitationMm:22},wet:{temperatureC:8,snowCm:0,precipitationMm:38},normal:{temperatureC:13,snowCm:0,precipitationMm:10}}[category];
}
// Pedagogical display dataset only. These numbers are not observations, forecasts
// from a weather service, or drivers of the categorical access simulation.
export function teachingWeatherCharts(seasons:RegionDefinition['weather'], startCalendarWeek=13):WeatherCharts {
 const point=(calendarWeek:number, zone:string, category?:Weather):WeatherPoint=>{
  const summer=Math.cos((calendarWeek-29)/52*Math.PI*2),temperature=4+18*summer+(zone==='north'?-2:0);
  const seasonal={temperatureC:temperature,snowCm:Math.max(0,-temperature*3),precipitationMm:17+8*(1+Math.sin(calendarWeek*1.7))/2};
  const value=category?categoryWeatherPoint(category):seasonal;
  return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,Math.round(v*10)/10])) as unknown as WeatherPoint;
 };
 return {model:"category-illustration",startCalendarWeek,provenance:'Authored Québec teaching curves, not meteorological observations. Outside the 12-week campaign: sinusoidal seasonal illustration. During the campaign: category examples (frozen −7°C/45cm/8mm, thaw 3°C/15cm/22mm, wet 8°C/0cm/38mm, normal 13°C/0cm/10mm). Temperature is weekly mean, snow is indicative depth, precipitation is weekly total. These display values do not drive access; categorical scenario weather remains authoritative.',scenarios:Object.fromEntries(Object.entries(seasons).map(([id,s])=>[id,Object.fromEntries((['forecast','actual'] as const).map(kind=>[kind,Object.fromEntries(Object.entries(s[kind]).map(([zone,values])=>[zone,Array.from({length:52},(_,i)=>point(i+1,zone,values[(i-startCalendarWeek+1+52)%52]))]))])) as WeatherCharts['scenarios'][string]]))};
}
