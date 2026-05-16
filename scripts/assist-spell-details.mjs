import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { buildSeededSpellDetailSuggestions } from '../module/spells/local-spell-pipeline.mjs';

const execFileAsync = promisify(execFile);
const rulesDir = path.resolve('private/rules');
const seedFile = path.resolve('data/spells/seed-basic-expert.json');
const outFile = path.resolve('private/generated/spell-detail-suggestions.json');
const debugFile = path.resolve('private/generated/spell-description-match-debug.json');

async function getPageCount(pdfFile) { const { stdout } = await execFileAsync('pdfinfo', [pdfFile]); const m = stdout.match(/^Pages:\s+(\d+)/m); if (!m) throw new Error(`Could not parse page count for ${pdfFile}`); return Number(m[1]); }
async function extractPageText(pdfFile, page) { const { stdout } = await execFileAsync('pdftotext', ['-f', String(page), '-l', String(page), '-layout', pdfFile, '-']); return stdout; }

async function main() {
  const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
  const seedRows = Array.isArray(seed) ? seed : (seed.spells || []);
  const files = (await fs.readdir(rulesDir)).filter((name) => name.toLowerCase().endsWith('.pdf'));
  const pages = [];
  for (const file of files) {
    const fullPath = path.join(rulesDir, file);
    const pageCount = await getPageCount(fullPath);
    for (let page = 1; page <= pageCount; page += 1) {
      pages.push({ sourceFile: file, sourceBook: file.replace(/\.pdf$/i, ''), sourcePage: page, text: await extractPageText(fullPath, page) });
    }
  }
  const { suggestions, debug } = buildSeededSpellDetailSuggestions({ seedRows, pages, includeDebug: true });
  const deduped = [...new Map(suggestions.map((s) => [s.spellKey, s])).values()];
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify({ createdAt: new Date().toISOString(), totalSeedRows: seedRows.length, matched: deduped.length, suggestions: deduped }, null, 2));
  await fs.writeFile(debugFile, JSON.stringify({ createdAt: new Date().toISOString(), totalSeedRows: seedRows.length, matches: debug }, null, 2));
  const matchedKeys = new Set(deduped.map((s) => s.spellKey));
  const noMatch = seedRows.filter((s) => !matchedKeys.has(s.spellKey)).map((s) => s.spellKey);
  const partial = deduped.filter((s) => [s.suggested.range, s.suggested.duration, s.suggested.effect].filter(Boolean).length > 0 && [s.suggested.range, s.suggested.duration, s.suggested.effect].filter(Boolean).length < 3).map((s) => s.spellKey);
  console.log(`Wrote ${deduped.length} spell detail suggestions: ${outFile}`);
  console.log(`Debug artifact: ${debugFile}`);
  console.log(`Spells with matched description pages: ${deduped.length}`);
  console.log(`Spells with no description match: ${noMatch.length}`);
  console.log(`Spells with partial field extraction: ${partial.length}`);
}

main().catch((error) => { console.error(`assist:spell-details failed: ${error.message}`); process.exitCode = 1; });
