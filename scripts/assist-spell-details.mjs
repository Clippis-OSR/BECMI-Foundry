import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { buildSpellDetailContextAssist } from '../module/spells/local-spell-pipeline.mjs';

const execFileAsync = promisify(execFile);
const rulesDir = path.resolve('private/rules');
const seedFile = path.resolve('data/spells/seed-basic-expert.json');
const outFile = path.resolve('private/review/spell-detail-context.json');

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
    for (let page = 1; page <= pageCount; page += 1) pages.push({ sourceFile: file, sourceBook: file.replace(/\.pdf$/i, ''), sourcePage: page, text: await extractPageText(fullPath, page) });
  }
  const contexts = buildSpellDetailContextAssist({ seedRows, pages });
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify({ createdAt: new Date().toISOString(), totalSeedRows: seedRows.length, rowsWithContext: contexts.filter((c) => c.candidatePage != null).length, contexts }, null, 2));
  console.log(`Wrote spell detail context assist: ${outFile}`);
}

main().catch((error) => { console.error(`assist:spell-details failed: ${error.message}`); process.exitCode = 1; });
