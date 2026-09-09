import fs from 'node:fs';
import path from 'node:path';
import {teachingPacket} from '../src/teaching-packets';
const dir=path.resolve('../tmp/pdfs');fs.mkdirSync(dir,{recursive:true});
const images=Object.fromEntries([1,2,3,4,5].map(c=>[String(c),'data:image/jpeg;base64,'+fs.readFileSync(`src/assets/teaching/company-5-image${c}.jpeg`).toString('base64')]));
for(const count of [4,5] as const)for(const kind of ['roles','rounds','debrief'] as const)for(const language of ['en','fr'] as const)fs.writeFileSync(path.join(dir,`${count}-${kind}-${language}.html`),teachingPacket(count,kind,undefined,images,language));
