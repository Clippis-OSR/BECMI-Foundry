import fs from 'node:fs/promises';
import { PATHS, loadReviewRows, backupReviewJson, writeReview, rowKey, normalizeTags } from './spell-review-tools.mjs';

const WORKBOOK_PATH = PATHS.reviewWorkbookCsv;
const FIELDS = ['spellKey','name','spellClass','spellLevel','sourceBook','sourcePage','range','duration','effect','save','tags','manualNotes','reviewed','pageVerified'];

function parseCsv(text){
  const rows=[]; let i=0; let cur=''; let row=[]; let inQ=false;
  while(i<text.length){
    const ch=text[i];
    if(inQ){
      if(ch==='"'){
        if(text[i+1]==='"'){cur+='"'; i++;}
        else inQ=false;
      } else cur+=ch;
    } else {
      if(ch==='"') inQ=true;
      else if(ch===','){row.push(cur); cur='';}
      else if(ch==='\n'){
        row.push(cur); rows.push(row); row=[]; cur='';
      } else if(ch==='\r') {
      } else cur+=ch;
    }
    i++;
  }
  if(cur.length||row.length){row.push(cur); rows.push(row);} 
  return rows.filter(r=>r.length && r.some(c=>String(c).trim()!==''));
}

function toBool(v){
  if(typeof v==='boolean') return v;
  const s=String(v??'').trim().toLowerCase();
  if(s==='true'||s==='1'||s==='yes') return true;
  if(s==='false'||s==='0'||s==='no'||s==='') return false;
  throw new Error(`Invalid boolean value: ${v}`);
}

function normalizeRow(raw){
  const r={...raw};
  r.spellKey=String(r.spellKey ?? '').trim();
  r.name=String(r.name ?? '').trim();
  r.spellClass=String(r.spellClass ?? '').trim();
  r.spellLevel=Number(r.spellLevel);
  r.sourceBook=String(r.sourceBook ?? '').trim();
  r.sourcePage=String(r.sourcePage ?? '').trim();
  r.range=String(r.range ?? '').trim();
  r.duration=String(r.duration ?? '').trim();
  r.effect=String(r.effect ?? '').trim();
  r.save=String(r.save ?? '').trim().toLowerCase();
  r.tags=normalizeTags(r.tags);
  r.manualNotes=String(r.manualNotes ?? '').trim();
  r.reviewed=toBool(r.reviewed);
  r.pageVerified=toBool(r.pageVerified);
  const requiredForReview = [r.sourcePage, r.range, r.duration, r.effect, r.save, r.manualNotes].every((v) => String(v).trim() !== '');
  if (!requiredForReview) r.reviewed=false;
  if (!r.sourcePage) r.pageVerified=false;
  return r;
}

async function main(){
  const csv=await fs.readFile(WORKBOOK_PATH,'utf8');
  const lines=parseCsv(csv);
  if(!lines.length) throw new Error('Workbook CSV is empty.');
  const header=lines[0].map(h=>String(h).trim());
  const idx=new Map(header.map((h,n)=>[h,n]));
  for(const f of FIELDS){ if(!idx.has(f)) throw new Error(`Workbook missing required column: ${f}`); }

  const workbookRows=lines.slice(1).map(cols=>{
    const obj={};
    for(const f of FIELDS) obj[f]=cols[idx.get(f)] ?? '';
    return normalizeRow(obj);
  });

  const existing=await loadReviewRows();
  const existingByKey=new Map(existing.map((r,i)=>[rowKey(r),i]));
  const out=existing.map(r=>({...r}));

  let imported=0, updated=0, skipped=0, unresolved=0;
  let reviewedInput=0, reviewedPersisted=0;
  const unresolvedKeys=[];

  for(const wb of workbookRows){
    imported++;
    const key=rowKey(wb);
    if(wb.reviewed===true) reviewedInput++;
    const pos=existingByKey.get(key);
    if(pos===undefined){ unresolved++; unresolvedKeys.push(key); continue; }

    const before=JSON.stringify(out[pos]);
    const merged={...out[pos]};
    for(const f of FIELDS) merged[f]=wb[f];
    out[pos]=merged;
    if(merged.reviewed===true && wb.reviewed===true) reviewedPersisted++;
    if(JSON.stringify(merged)===before) skipped++; else updated++;
  }

  if(unresolved>0) throw new Error(`Import failed: ${unresolved} unresolved workbook rows. Example keys: ${unresolvedKeys.slice(0,5).join(', ')}`);
  if(reviewedInput>0 && reviewedPersisted<reviewedInput) throw new Error(`Import failed: reviewed rows discarded (${reviewedPersisted}/${reviewedInput} persisted).`);

  await backupReviewJson().catch(()=>{});
  await writeReview(out);
  console.log(`spell:import-review complete imported=${imported} updated=${updated} skipped=${skipped} unresolved=${unresolved}`);
}

main().catch((e)=>{console.error(`spell:import-review failed: ${e.message}`);process.exitCode=1;});
