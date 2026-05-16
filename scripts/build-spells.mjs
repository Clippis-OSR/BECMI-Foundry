import fs from 'node:fs/promises';
import path from 'node:path';
import { sanitizeCanonicalRows, validateCanonicalRows } from '../module/spells/local-spell-pipeline.mjs';
import { loadReviewRows, loadSeedRows, validateReview, suspiciousText } from './spell-review-tools.mjs';
const outFile=path.resolve('data/spells/canonical.json');
const allowUnreviewed=process.argv.includes('--allow-unreviewed');
const reviewRows=await loadReviewRows();
const seedRows=await loadSeedRows();
const reviewErrors=validateReview(seedRows,reviewRows); if(reviewErrors.length) throw new Error(reviewErrors.join('\n'));
if(!allowUnreviewed && reviewRows.some(r=>r.reviewed!==true)) throw new Error('Refusing build with reviewed=false rows.');
const filtered=reviewRows.filter(r=>allowUnreviewed||r.reviewed===true);
for(const r of filtered){if(['range','duration','effect','sourcePage'].some(f=>String(r[f]??'').trim()==='')) throw new Error(`Missing required field in ${r.spellKey}`); if(suspiciousText(r.effect)||suspiciousText(r.manualNotes)) throw new Error(`Suspicious long text in ${r.spellKey}`);} 
const canonical=sanitizeCanonicalRows(filtered); const errors=validateCanonicalRows(canonical); if(errors.length) throw new Error(errors.join('\n'));
await fs.writeFile(outFile,JSON.stringify({generatedAt:new Date().toISOString(),spells:canonical},null,2)); console.log(`Sanitized canonical spells written: ${outFile}`);
