import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS, loadSeedRows, loadReviewRows, writeReview, mergeSeedWithReview, rowKey } from './spell-review-tools.mjs';

async function maybeReadContext(){try{const data=JSON.parse(await fs.readFile(PATHS.context,'utf8'));return data.contexts||[];}catch{return[];}}

async function main(){
 const seedRows=await loadSeedRows();
 const existing=await loadReviewRows().catch(()=>[]);
 const merged=mergeSeedWithReview(seedRows,existing);
 const contexts=await maybeReadContext();
 const seedKeys=new Set(merged.map(rowKey));
 const byKey=new Map(contexts.filter(c=>seedKeys.has(rowKey(c))).map(c=>[rowKey(c),c]));
 const rows=merged.map(r=>{const c=byKey.get(rowKey(r)); return {...r,suggestedSourcePage:r.suggestedSourcePage??(c?.candidatePage??''),suggestedRange:r.suggestedRange??((c?.nearbyRangeLines||[])[0]||''),suggestedDuration:r.suggestedDuration??((c?.nearbyDurationLines||[])[0]||''),suggestedEffect:r.suggestedEffect??((c?.nearbyEffectLines||[])[0]||''),suggestedSave:r.suggestedSave??((c?.nearbySaveReferences||[])[0]||''),suggestedTags:r.suggestedTags??(c?.nearbyReverseWording?.length?'reverse':''),suggestedContextExcerpt:r.suggestedContextExcerpt??(c?.nearbyTextBlock||'')};});
 const ocrOnlyCandidates=contexts.filter(c=>!seedKeys.has(rowKey(c))).map(c=>({spellKey:c.spellKey||'',spellClass:c.spellClass||'',spellLevel:c.spellLevel??'',sourceBook:c.sourceBook||'',candidatePage:c.candidatePage??'',nearbyTextBlock:c.nearbyTextBlock||''}));
 const genDir=path.dirname(PATHS.unmatchedCandidatesJson); await fs.mkdir(genDir,{recursive:true}); await fs.writeFile(PATHS.unmatchedCandidatesJson,JSON.stringify({createdAt:new Date().toISOString(),count:ocrOnlyCandidates.length,candidates:ocrOnlyCandidates},null,2));
 await writeReview(rows);
 console.log(`review:spells wrote ${rows.length} seed-only rows with preserved review fields.`);
}
main().catch((e)=>{console.error(`review:spells failed: ${e.message}`);process.exitCode=1;});
