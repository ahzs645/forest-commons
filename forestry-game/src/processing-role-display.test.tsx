import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import MillProcessingDesk from './MillProcessingDesk';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
it('does not present a redacted production order as zero to transport players',()=>{
 const game=createGame(quebec),mill=game.region.mills[0];
 mill.processing={inputs:Object.keys(mill.prices),capacityM3:100,costM3:1,outputs:[{id:'chips',name:'Chips',yield:.5,price:10,weeklyDemand:100}]};
 const html=renderToStaticMarkup(<MillProcessingDesk game={game} onChange={()=>{}} allowProcessing={false}/>);
 expect(html).toContain('Processing orders belong to the production role and are private.');
 expect(html).not.toContain('Process input m³ this week');
 expect(html).not.toContain('Sell available outputs up to weekly demand');
 expect(html).toContain('Sold to date');
 expect(html).toContain('Queue Softwood sawlogs intake');
 const production=renderToStaticMarkup(<MillProcessingDesk game={game} onChange={()=>{}} allowIntake={false}/>);
 expect(production).toContain('Process input m³ this week');
 expect(production).not.toContain('Processing orders belong to the production role and are private.');
});
