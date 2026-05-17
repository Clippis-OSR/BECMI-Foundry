import fs from 'node:fs/promises'; import path from 'node:path';
import { PATHS, loadReviewRows, validateReview, loadSeedRows, nextAction } from './spell-review-tools.mjs';
const rows=(await loadReviewRows()).sort((a,b)=>`${a.spellClass}-${a.spellLevel}-${a.name}`.localeCompare(`${b.spellClass}-${b.spellLevel}-${b.name}`));
const errors=validateReview(await loadSeedRows(),rows); const errSet=new Set(errors.map(e=>Number((e.match(/^row (\d+)/)||[])[1])));
const header=['spellClass','spellLevel','name','spellKey','sourceBook','sourcePage','range','duration','effect','save','tags','manualNotes','reviewed','pageVerified','suggestedSourcePage','suggestedRange','suggestedDuration','suggestedEffect','suggestedSave','suggestedTags','validationStatus','nextAction'];
const outRows=rows.map((r,i)=>({...r,validationStatus:errSet.has(i+1)?'issue':'ok',nextAction:nextAction(r)}));
const body=[header.join(','),...outRows.map(r=>header.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n');
const out=PATHS.reviewWorkbookCsv;
await fs.mkdir(path.dirname(out),{recursive:true});
await fs.writeFile(out,body);

try {
  await fs.access(PATHS.legacyReviewDir);
  await fs.writeFile(PATHS.legacyReviewWorkbookCsv,body);
} catch {}

console.log(`exported ${out}`);
