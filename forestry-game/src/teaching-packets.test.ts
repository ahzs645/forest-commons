import {expect,it} from 'vitest';
import {teachingPacket} from './teaching-packets';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
it('uses distinct validated four/five-company volumes, all round coalitions and units',()=>{
 const four=teachingPacket(4,'roles'),five=teachingPacket(5,'roles');
 expect(four).toContain('77,300');expect(five).toContain('77,360');
 expect(four.match(/role card<\/h1>/g)).toHaveLength(4);expect(five.match(/role card<\/h1>/g)).toHaveLength(5);
 expect(teachingPacket(5,'rounds')).toContain('35,690');expect(teachingPacket(5,'rounds')).toContain('2,990');
 expect(teachingPacket(4,'rounds')).not.toContain('1 + 2 + 3 + 4 + 5');
 expect(five).toContain('separate from campaign CAD');
});
it('records only matching dataset offers, preserves status and escapes imported text',()=>{
 const n=createGame(quebec).negotiation;
 n.offers=[{id:1,count:5,groups:[1,1,1,1,1],shares:{'1':100},accepted:['<script>'],status:'proposed'},{id:2,count:4,groups:[1,1,1,1],shares:{},accepted:[],status:'agreed'}];
 const result=teachingPacket(5,'debrief',n);expect(result).toContain('proposed');expect(result).not.toContain('<script>');expect(result).toContain('&lt;script&gt;');expect(result).not.toContain('<td>agreed</td>');
});
it('exports French instructions, headings and statuses while preserving dataset figures',()=>{
 for(const kind of ['roles','rounds','debrief'] as const){const html=teachingPacket(5,kind,undefined,{},'fr');expect(html).toContain('lang="fr"');expect(html).not.toContain('Open this file');expect(html).toContain('couronnes suédoises');}
 const roles=teachingPacket(4,'roles',undefined,{},'fr');expect(roles).toContain('Entreprise 1 fiche de rôle');expect(roles).toContain((77300).toLocaleString('fr-CA'));expect(roles).toContain('Collaboration_4companiesEN.docx');expect(roles).not.toContain('Improve your own');
});

import {propose,respond} from './simulation/negotiation';
it('exports the complete bounded offer history with partitions, acceptance and French statuses',()=>{
 let game=createGame(quebec);
 game.negotiation.count=5;
 game.negotiation.phase='open';
 game.negotiation.custom={};
 for(let i=0;i<50;i++){
  game.negotiation.groups=i%2?[1,1,2,2,3]:[1,1,1,1,1];
  game=propose(game);
  const id=game.negotiation.offers!.at(-1)!.id;
  if(i%3===0)for(const company of ['1','2','3','4','5'])game=respond(game,id,company,true);
  else if(i%3===1)game=respond(game,id,'1',false);
  else game=respond(game,id,'1',true);
 }
 const before=JSON.stringify(game.negotiation);
 for(const language of ['en','fr'] as const){
  const html=teachingPacket(5,'debrief',game.negotiation,{},language);
  const rows=[...html.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].flatMap(m=>m[1].match(/<tr>[\s\S]*?<\/tr>/g)??[]);
  expect(rows).toHaveLength(50);
  rows.forEach((row,i)=>{
   const offer=game.negotiation.offers![i];
   expect(row).toContain(`<td>${offer.id}</td>`);
   expect(row).toContain(`<td>${i%2?'1 + 2; 3 + 4; 5':'1 + 2 + 3 + 4 + 5'}</td>`);
   for(const company of ['1','2','3','4','5'])expect(row).toContain(`${company}: ${offer.shares[company].toLocaleString(language==='fr'?'fr-CA':'en-CA',{maximumFractionDigits:2})}`);
   expect(row).toContain(`<td>${offer.accepted.join(', ')||(language==='fr'?'Aucune':'None')}</td>`);
  });
  expect(html).toContain(language==='fr'?'<td>acceptée</td>':'<td>agreed</td>');
  expect(html).toContain(language==='fr'?'<td>refusée</td>':'<td>rejected</td>');
  expect(html).toContain(language==='fr'?'<td>remplacée</td>':'<td>superseded</td>');
 }
 expect(JSON.stringify(game.negotiation)).toBe(before);
});
