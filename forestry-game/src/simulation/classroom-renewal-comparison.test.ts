import { expect, it } from 'vitest';
import { createGame } from './engine';
import { quebec } from '../scenarios/quebec';
import { acceptReciprocal, authorReciprocal, renewReciprocal } from './reciprocal';
import { comparable, startingFingerprint, teamResult } from './classroom-learning';

it('compares renewal decisions against the same original agreement while distinguishing authored conditions', async () => {
 let game=createGame(quebec);
 const product=game.region.products.find(p=>game.region.mills.filter(m=>p.id in m.prices).length>=2)!.id;
 const mills=game.region.mills.filter(m=>product in m.prices);
 game=authorReciprocal(game,{name:'Original agreement',standA:game.region.stands[0].id,standB:game.region.stands[1].id,millA:mills[0].id,millB:mills[1].id,product,limitM3:100,ownReserveM3:10,opens:1,deadline:2});
 game=createGame(game.region); // Authored templates imported as a fresh scenario are starting conditions.
 const id=game.region.reciprocalPairs!.at(-1)!.id;
 game=acceptReciprocal(game,id,'A','equal');game=acceptReciprocal(game,id,'B','equal');
 const renewed=renewReciprocal(game,id,{opens:3,deadline:4});
 expect(comparable(await teamResult('No renewal',game),await teamResult('Renewal',renewed))).toBe(true);
 expect(renewed.region.reciprocalPairs).toHaveLength(game.region.reciprocalPairs!.length+1);
 const other=structuredClone(game);other.region.reciprocalPairs!.at(-1)!.limitM3=200;
 expect(await startingFingerprint(other)).not.toBe(await startingFingerprint(game));
});

it('preserves the prior fingerprint algorithm for scenarios without linked renewals', async () => {
 function canonical(value:unknown):string {if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;return JSON.stringify(value)??'null';}
 for(const includeEmpty of [false,true]) {
  const game=createGame(quebec);if(includeEmpty)game.region.reciprocalPairs=[];else delete game.region.reciprocalPairs;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical({region:game.region,weather:game.weatherId,seed:game.seed})));
  const legacy=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  expect(await startingFingerprint(game)).toBe(legacy);
 }
});
