import fs from 'node:fs/promises';
import path from 'node:path';
import { loadReviewRows, parseArgs, filterRows, missingFields } from './spell-review-tools.mjs';
const args=parseArgs(process.argv.slice(2)); const rows=filterRows(await loadReviewRows(),args).map(r=>({...r,missing:missingFields(r)})).filter(r=>r.missing.length&&( !args.field||r.missing.includes(args.field)));
const out=path.resolve('private/review/spells-missing.csv'); const header=['spellKey','name','spellClass','spellLevel','sourceBook','missing']; const csv=[header.join(','),...rows.map(r=>header.map(k=>JSON.stringify(k==='missing'?r.missing.join('|'):r[k]??'')).join(','))].join('\n'); await fs.writeFile(out,csv); console.log(`missing rows: ${rows.length}`); console.log(out);
