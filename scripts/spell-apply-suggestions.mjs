import { loadReviewRows, writeReview, backupReviewJson, parseArgs, isEmpty } from './spell-review-tools.mjs';
const args=parseArgs(process.argv.slice(2)); const threshold=Number(args.threshold??0.75); const allowLow=args['allow-low-confidence']==='true';
const rows=await loadReviewRows(); await backupReviewJson(); let changed=0;
for(const r of rows){for(const [f,sf] of Object.entries({sourcePage:'suggestedSourcePage',range:'suggestedRange',duration:'suggestedDuration',effect:'suggestedEffect',save:'suggestedSave',tags:'suggestedTags',manualNotes:'suggestedManualNotes'})){const conf=Number(r.confidence??1); if(isEmpty(r[f])&&!isEmpty(r[sf])&&(allowLow||conf>=threshold)){r[f]=r[sf]; r.reviewed=false; r.pageVerified=false; changed++;}}}
await writeReview(rows); console.log(`Applied ${changed} suggestion field updates.`);
