import { it, expect } from "vitest";
import { createGame } from "../src/simulation/engine";
import { quebec } from "../src/scenarios/quebec";
import { illustrativeCalendar } from "../src/simulation/season-calendar";
import { startStewardship } from "../src/simulation/stewardship";
import { maskClassroomWeather } from "./rooms";
it("redacts every categorical calendar and linked base region without retaining unplayed observations",()=>{
 const game=createGame(quebec);
 game.region.seasonCalendar=illustrativeCalendar(game.region);
 for(const w of Object.values(game.region.seasonCalendar.weather))for(const zone of game.region.zones){w.actual[zone.id]=Array(52).fill('frozen');w.forecast[zone.id]=Array(52).fill('normal');}
 game.linkedSeason={baseRegion:structuredClone(game.region),opening:startStewardship(game),startCalendarWeek:13,settled:false};
 game.week=3; // Advancing this counter alone must not disclose chart observations.
 maskClassroomWeather(game);
 for(const region of [game.region,game.linkedSeason.baseRegion]){
   for(const w of Object.values(region.weather))expect(w.actual).toEqual(w.forecast);
   for(const w of Object.values(region.seasonCalendar!.weather))expect(w.actual).toEqual(w.forecast);
   expect(region.seasonCalendar!.events).toEqual([]);
   if(region.weatherCharts)for(const c of Object.values(region.weatherCharts.scenarios))expect(c.actual).toEqual(c.forecast);
 }
});
