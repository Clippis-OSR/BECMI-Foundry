import fs from 'node:fs/promises'; import path from 'node:path';
import { loadReviewRows, validateReview, loadSeedRows, nextAction } from './spell-review-tools.mjs';
const rows=(await loadReviewRows()).sort((a,b)=>`${a.spellClass}-${a.spellLevel}-${a.name}`.localeCompare(`${b.spellClass}-${b.spellLevel}-${b.name}`));
const errors=validateReview(await loadSeedRows(),rows); const errSet=new Set(errors.map(e=>Number((e.match(/^row (\d+)/)||[])[1])));
const header=['spellClass','spellLevel','name','spellKey','sourceBook','sourcePage','range','duration','effect','save','tags','manualNotes','reviewed','pageVerified','suggestedSourcePage','suggestedRange','suggestedDuration','suggestedEffect','suggestedSave','suggestedTags','validationStatus','nextAction'];
const outRows=rows.map((r,i)=>({...r,validationStatus:errSet.has(i+1)?'issue':'ok',nextAction:nextAction(r)}));
const out=path.resolve('private/review/spells-review-workbook.csv'); await fs.writeFile(out,[header.join(','),...outRows.map(r=>header.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n')); console.log(`exported ${out}`);
