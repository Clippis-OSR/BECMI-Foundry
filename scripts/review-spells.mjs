import fs from 'node:fs/promises';
import path from 'node:path';

const seedFile = path.resolve('data/spells/seed-basic-expert.json');
const contextFile = path.resolve('private/review/spell-detail-context.json');
const reviewDir = path.resolve('private/review');
const generatedDir = path.resolve('private/generated');
const reviewJson = path.join(reviewDir, 'spells-review.json');
const reviewCsv = path.join(reviewDir, 'spells-review.csv');
const unmatchedCandidatesFile = path.join(generatedDir, 'unmatched-description-candidates.json');
const header = ['spellKey','name','spellClass','spellLevel','sourceBook','sourcePage','reversible','reverseName','needsDetails','range','duration','effect','save','tags','manualNotes','pageVerified','reviewed','confidence','needsReview','suggestedSourcePage','suggestedRange','suggestedDuration','suggestedEffect','suggestedSave','suggestedTags','suggestedContextExcerpt'];

async function maybeReadContext() { try { const data = JSON.parse(await fs.readFile(contextFile, 'utf8')); return data.contexts || []; } catch { return []; } }

function keyOf(row) { return `${row.spellKey}|${row.spellClass}|${row.spellLevel}`; }

async function writeUnmatchedCandidates(candidates) {
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(unmatchedCandidatesFile, JSON.stringify({ createdAt: new Date().toISOString(), count: candidates.length, candidates }, null, 2));
}

async function main() {
  const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
  const seedRows = (Array.isArray(seed) ? seed : (seed.spells || [])).map((s) => ({ ...s, range: '', duration: '', effect: '', save: '', tags: '', manualNotes: '', pageVerified: false, reviewed: false, confidence: 1, needsReview: true }));
  const contexts = await maybeReadContext();
  const seedKeys = new Set(seedRows.map((row) => keyOf(row)));
  const byKey = new Map(contexts.filter((c) => seedKeys.has(keyOf(c))).map((c) => [keyOf(c), c]));
  const ocrOnlyCandidates = contexts.filter((c) => !seedKeys.has(keyOf(c))).map((c) => ({ spellKey: c.spellKey || '', spellClass: c.spellClass || '', spellLevel: c.spellLevel ?? '', sourceBook: c.sourceBook || '', candidatePage: c.candidatePage ?? '', nearbyTextBlock: c.nearbyTextBlock || '' }));
  const rows = seedRows.map((row) => {
    const c = byKey.get(keyOf(row));
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
  if (rows.length < seedRows.length) throw new Error(`Invariant failed: review row count (${rows.length}) is lower than seed row count (${seedRows.length})`);
  const unknownSpellKeys = rows.filter((row) => !seedKeys.has(keyOf(row))).map((row) => row.spellKey);
  if (unknownSpellKeys.length) throw new Error(`Invariant failed: review contains non-seed spell keys: ${[...new Set(unknownSpellKeys)].join(', ')}`);
  await fs.mkdir(reviewDir, { recursive: true });
  await fs.writeFile(reviewJson, JSON.stringify(rows, null, 2));
  await fs.writeFile(reviewCsv, [header.join(','), ...rows.map((r) => header.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n'));
  await writeUnmatchedCandidates(ocrOnlyCandidates);
  const suggestionsMerged = rows.filter((r) => r.suggestedSourcePage || r.suggestedRange || r.suggestedDuration || r.suggestedEffect || r.suggestedSave || r.suggestedTags || r.suggestedContextExcerpt).length;
  console.log(`review:spells debug\n- seed rows loaded: ${seedRows.length}\n- review rows written: ${rows.length}\n- suggestions merged: ${suggestionsMerged}\n- OCR-only candidates ignored: ${ocrOnlyCandidates.length}`);
  console.log(`Review files written:\n- ${reviewJson}\n- ${reviewCsv}\n- ${unmatchedCandidatesFile}`);
}

main().catch((error) => { console.error(`review:spells failed: ${error.message}`); process.exitCode = 1; });
