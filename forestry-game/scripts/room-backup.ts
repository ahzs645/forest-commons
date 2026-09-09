import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseGame } from "../src/simulation/validation";
const [mode,sourceArg,targetArg] = process.argv.slice(2);
if (!['backup','restore'].includes(mode) || !sourceArg || !targetArg) throw Error("Usage: tsx scripts/room-backup.ts backup|restore SOURCE_DIRECTORY NEW_DIRECTORY (stop server first)");
const source=resolve(sourceArg), target=resolve(targetArg);
if (existsSync(target)) throw Error("Destination must not exist; restore into a fresh directory, then switch FOREST_ROOM_DIR.");
const records = readdirSync(source).filter(n=>/^[a-f0-9]{16}\.json$/.test(n)).map(name=>{
  const text=readFileSync(join(source,name),'utf8'), data=JSON.parse(text);
  if (data.id!==name.slice(0,-5) || !Number.isInteger(data.revision) || !data.tokens?.instructor) throw Error(`Invalid room file ${name}`);
  parseGame(data.game);
  return {name,text};
});
if (!records.length) throw Error("No room records found.");
mkdirSync(target,{mode:0o700});
for (const {name,text} of records) writeFileSync(join(target,name),text,{mode:0o600});
console.log(`${mode}: copied ${records.length} validated room records. Credentials were not printed.`);
