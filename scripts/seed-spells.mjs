import { loadSeedRows, loadReviewRows, writeReview, mergeSeedWithReview, backupReviewJson } from './spell-review-tools.mjs';

async function main(){const seed=await loadSeedRows(); const existing=await loadReviewRows().catch(()=>[]); if(existing.length) await backupReviewJson(); const merged=mergeSeedWithReview(seed,existing); await writeReview(merged); console.log(`seed:spells wrote ${merged.length} rows (merged, preserved prior review fields).`);} 
main().catch((e)=>{console.error(`seed:spells failed: ${e.message}`);process.exitCode=1;});
