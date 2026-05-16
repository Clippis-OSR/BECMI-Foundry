import fs from 'node:fs/promises';
import path from 'node:path';

export const PATHS = {
  seed: path.resolve('data/spells/seed-basic-expert.json'),
  reviewDir: path.resolve('private/review'),
  reviewJson: path.resolve('private/review/spells-review.json'),
  reviewCsv: path.resolve('private/review/spells-review.csv'),
  context: path.resolve('private/review/spell-detail-context.json'),
  backupDir: path.resolve('private/review/backups')
};
export const REVIEW_HEADER = ['spellKey','name','spellClass','spellLevel','sourceBook','sourcePage','reversible','reverseName','needsDetails','range','duration','effect','save','tags','manualNotes','pageVerified','reviewed','confidence','needsReview','suggestedSourcePage','suggestedRange','suggestedDuration','suggestedEffect','suggestedSave','suggestedTags','suggestedManualNotes','suggestedContextExcerpt'];
export const ID_FIELDS=['spellKey','name','spellClass','spellLevel'];
export const SAVE_ALLOWED = new Set(['none','manual','see text']);

export const isEmpty=(v)=>v==null||String(v).trim()==='';
export const normalizeTags=(v)=>Array.isArray(v)?v:String(v||'').split('|').map(s=>s.trim()).filter(Boolean);
export const rowKey=(r)=>`${r.spellKey}|${r.spellClass}|${r.spellLevel}`;
export function suspiciousText(v){const s=String(v||''); return s.length>350||/\b(this spell|caster|target|saving throw)\b.{120,}/i.test(s)||/[[]{}\]]{3,}|\bLying Questions Insanity Knowing\b/i.test(s);}

export async function loadSeedRows(){const raw=JSON.parse(await fs.readFile(PATHS.seed,'utf8')); return Array.isArray(raw)?raw:(raw.spells||[]);} 
export async function loadReviewRows(){const raw=JSON.parse(await fs.readFile(PATHS.reviewJson,'utf8')); return Array.isArray(raw)?raw:[];}
export async function backupReviewJson(){await fs.mkdir(PATHS.backupDir,{recursive:true}); const stamp=new Date().toISOString().replace(/[:.]/g,'-'); const out=path.join(PATHS.backupDir,`spells-review.${stamp}.json`); await fs.copyFile(PATHS.reviewJson,out); return out;}
export async function writeReview(rows){await fs.mkdir(PATHS.reviewDir,{recursive:true}); await fs.writeFile(PATHS.reviewJson,JSON.stringify(rows,null,2)); await fs.writeFile(PATHS.reviewCsv,[REVIEW_HEADER.join(','),...rows.map(r=>REVIEW_HEADER.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n'));}

export function validateReview(seedRows, reviewRows){
 const errors=[]; const seedKeys=new Set(seedRows.map(rowKey));
 if(seedRows.length!==reviewRows.length) errors.push(`row count mismatch seed=${seedRows.length} review=${reviewRows.length}`);
 const seen=new Set();
 for(const [i,r] of reviewRows.entries()){
  const p=`row ${i+1}`; for(const f of ID_FIELDS) if(isEmpty(r[f])) errors.push(`${p}: missing ${f}`);
  const k=rowKey(r); if(seen.has(k)) errors.push(`${p}: duplicate ${k}`); seen.add(k); if(!seedKeys.has(k)) errors.push(`${p}: unknown row ${k}`);
  if(r.reviewed===true){for(const f of ['sourcePage','range','duration','effect','manualNotes']) if(isEmpty(r[f])) errors.push(`${p}: reviewed=true missing ${f}`);
   if(isEmpty(r.save)||(!SAVE_ALLOWED.has(String(r.save).toLowerCase())&&isEmpty(r.save))) errors.push(`${p}: reviewed=true invalid save`);
   if(r.tags===undefined) errors.push(`${p}: reviewed=true tags missing`);
  }
  if(r.pageVerified===true&&isEmpty(r.sourcePage)) errors.push(`${p}: pageVerified=true requires sourcePage`);
  if(r.reversible===true&&isEmpty(r.reverseName)&&String(r.reverseName).toLowerCase()!=='see text') errors.push(`${p}: reversible=true requires reverseName or See text`);
  for(const f of ['range','duration','effect','save','manualNotes']) if(suspiciousText(r[f])) errors.push(`${p}: suspicious text in ${f}`);
 }
 return errors;
}

export function mergeSeedWithReview(seedRows, existing=[]){const old=new Map(existing.map(r=>[rowKey(r),r])); return seedRows.map(s=>{const prev=old.get(rowKey(s)); return { ...s, range:'',duration:'',effect:'',save:'',tags:'',manualNotes:'',pageVerified:false,reviewed:false,confidence:1,needsReview:true, ...(prev||{})};});}
export function parseArgs(argv){return Object.fromEntries(argv.filter(a=>a.startsWith('--')).map(a=>{const [k,v='true']=a.slice(2).split('='); return [k,v];}));}
export function filterRows(rows, f){return rows.filter(r=>(!f.class||r.spellClass===f.class)&&(!f.level||Number(r.spellLevel)===Number(f.level))&&(!f.book||r.sourceBook===f.book));}
export function missingFields(r){const m=[]; for(const f of ['sourcePage','range','duration','effect','save','tags','manualNotes']) if(isEmpty(r[f])) m.push(f); if(r.reviewed!==true) m.push('reviewed'); if(r.pageVerified!==true) m.push('pageVerified'); return m;}
export function nextAction(r){const m=missingFields(r); if(!m.length) return 'Ready for build'; if(m.includes('sourcePage')) return 'Verify source page'; if(m.includes('range')||m.includes('duration')||m.includes('effect')||m.includes('save')) return 'Fill core details'; return 'Complete review flags';}

