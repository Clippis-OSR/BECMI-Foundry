import fs from 'node:fs/promises';
import path from 'node:path';

const seedFile = path.resolve('data/spells/seed-basic-expert.json');
const contextFile = path.resolve('private/review/spell-detail-context.json');
const reviewDir = path.resolve('private/review');
const reviewJson = path.join(reviewDir, 'spells-review.json');
const reviewCsv = path.join(reviewDir, 'spells-review.csv');
const header = ['spellKey','name','spellClass','spellLevel','sourceBook','sourcePage','reversible','reverseName','needsDetails','range','duration','effect','save','tags','manualNotes','pageVerified','reviewed','confidence','needsReview','suggestedSourcePage','suggestedRange','suggestedDuration','suggestedEffect','suggestedSave','suggestedTags','suggestedContextExcerpt'];

async function maybeReadContext() { try { const data = JSON.parse(await fs.readFile(contextFile, 'utf8')); return data.contexts || []; } catch { return []; } }

async function main() {
  const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
  const seedRows = (Array.isArray(seed) ? seed : (seed.spells || [])).map((s) => ({ ...s, range: '', duration: '', effect: '', save: '', tags: '', manualNotes: '', pageVerified: false, reviewed: false, confidence: 1, needsReview: true }));
  const contexts = await maybeReadContext();
  const byKey = new Map(contexts.map((c) => [c.spellKey, c]));
  const rows = seedRows.map((row) => {
    const c = byKey.get(row.spellKey);
    return {
      ...row,
      suggestedSourcePage: c?.candidatePage ?? '',
      suggestedRange: (c?.nearbyRangeLines || [])[0] || '',
      suggestedDuration: (c?.nearbyDurationLines || [])[0] || '',
      suggestedEffect: (c?.nearbyEffectLines || [])[0] || '',
      suggestedSave: (c?.nearbySaveReferences || [])[0] || '',
      suggestedTags: c?.nearbyReverseWording?.length ? 'reverse' : '',
      suggestedContextExcerpt: c?.nearbyTextBlock || ''
    };
  });
  await fs.mkdir(reviewDir, { recursive: true });
  await fs.writeFile(reviewJson, JSON.stringify(rows, null, 2));
  await fs.writeFile(reviewCsv, [header.join(','), ...rows.map((r) => header.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n'));
  console.log(`Review files written:\n- ${reviewJson}\n- ${reviewCsv}`);
}

main().catch((error) => { console.error(`review:spells failed: ${error.message}`); process.exitCode = 1; });
