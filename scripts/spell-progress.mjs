import { loadReviewRows, missingFields, nextAction } from './spell-review-tools.mjs';
const rows=await loadReviewRows();
const count=(fn)=>rows.filter(fn).length;
console.log(`total rows: ${rows.length}`); console.log(`reviewed rows: ${count(r=>r.reviewed===true)}`); console.log(`unreviewed rows: ${count(r=>r.reviewed!==true)}`); console.log(`pageVerified rows: ${count(r=>r.pageVerified===true)}`);
for(const f of ['range','duration','effect','save','tags','manualNotes']) console.log(`${f} filled: ${count(r=>String(r[f]??'').trim()!=='')}`);
const grp={}; for(const r of rows){const k=`${r.spellClass}:${r.spellLevel}`; grp[k]=(grp[k]||0)+1;} console.log('counts by class/level:'); Object.keys(grp).sort().forEach(k=>console.log(`- ${k}: ${grp[k]}`));
const next=rows.find(r=>missingFields(r).length)||rows[0]; if(next) console.log(`next recommended batch: ${next.spellClass} level ${next.spellLevel} (${nextAction(next)})`);
