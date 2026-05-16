import fs from 'node:fs/promises';
import path from 'node:path';
import { mergeSpellIndexAndDescriptions, toReviewRows, slugifySpellKey } from '../module/spells/local-spell-pipeline.mjs';

const indexFile = path.resolve('private/generated/spell-index.json');
const blocksFile = path.resolve('private/generated/spell-description-blocks.json');
const reviewDir = path.resolve('private/review');
const whitelistFile = path.resolve('private/review/spell-name-whitelist.json');
const reviewJson = path.join(reviewDir, 'spells-review.json');
const reviewCsv = path.join(reviewDir, 'spells-review.csv');
const unmatchedCandidatesFile = path.resolve('private/generated/unmatched-description-candidates.json');
const header = ['sourceBook','sourceFile','sourcePage','spellName','spellKey','spellClass','spellLevel','range','duration','effect','reversible','reverseName','save','tags','manualNotes','confidence','needsReview'];

const MIN_SEED = [
  'Cure Light Wounds','Detect Magic','Light','Protection from Evil','Purify Food and Water','Remove Fear','Resist Cold',
  'Bless','Find Traps','Hold Person','Know Alignment','Silence 15\' Radius','Snake Charm','Speak with Animals',
  'Charm Person','Floating Disc','Hold Portal','Read Languages','Read Magic','Shield','Sleep','Ventriloquism',
  'Continual Light','Detect Evil','Detect Invisible','ESP','Invisibility','Knock','Levitate','Locate Object','Mirror Image','Phantasmal Force','Web','Wizard Lock'
];

async function ensureWhitelist(indexRows) {
  try {
    const raw = JSON.parse(await fs.readFile(whitelistFile, 'utf8'));
    return new Set((raw.spellKeys || []).map((k) => String(k).trim()).filter(Boolean));
  } catch {
    const starter = new Set(MIN_SEED.map((s) => slugifySpellKey(s)));
    for (const row of indexRows) {
      if (!row?.spellName) continue;
      const key = slugifySpellKey(row.spellName);
      if (key) starter.add(key);
    }
    await fs.mkdir(path.dirname(whitelistFile), { recursive: true });
    await fs.writeFile(whitelistFile, JSON.stringify({ createdAt: new Date().toISOString(), note: 'Private starter whitelist. Edit manually.', spellKeys: [...starter].sort() }, null, 2));
    return starter;
  }
}

async function main() {
  const index = JSON.parse(await fs.readFile(indexFile, 'utf8'));
  const blocks = JSON.parse(await fs.readFile(blocksFile, 'utf8'));
  const strictIndexKeys = new Set((index.indexRows || []).map((r) => r.spellKey).filter(Boolean));
  const whitelistKeys = await ensureWhitelist(index.indexRows || []);
  const mergedRows = toReviewRows(mergeSpellIndexAndDescriptions(index.indexRows || [], blocks.blocks || []));
  const rows = mergedRows.filter((row) => whitelistKeys.has(row.spellKey) || strictIndexKeys.has(row.spellKey));

  await fs.mkdir(reviewDir, { recursive: true });
  await fs.writeFile(reviewJson, JSON.stringify(rows, null, 2));
  await fs.writeFile(reviewCsv, [header.join(','), ...rows.map((r) => header.map((k) => JSON.stringify(Array.isArray(r[k]) ? r[k].join('|') : r[k] ?? '')).join(','))].join('\n'));

  const unmatched = { createdAt: new Date().toISOString(), unmatchedCandidates: (blocks.blocks || []).filter((b) => !(whitelistKeys.has(b.spellKey) || strictIndexKeys.has(b.spellKey))).map((b) => ({ sourceBook: b.sourceBook, sourceFile: b.sourceFile, sourcePage: b.sourcePage, candidate: b.spellName, spellKey: b.spellKey })) };
  await fs.mkdir(path.dirname(unmatchedCandidatesFile), { recursive: true });
  await fs.writeFile(unmatchedCandidatesFile, JSON.stringify(unmatched, null, 2));
  console.log(`Review files written:\n- ${reviewJson}\n- ${reviewCsv}`);
}

main().catch((error) => { console.error(`review:spells failed: ${error.message}`); process.exitCode = 1; });
