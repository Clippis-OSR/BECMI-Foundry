import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { detectSpellCandidatesFromText } from '../module/spells/local-spell-pipeline.mjs';

const execFileAsync = promisify(execFile);
const rulesDir = path.resolve('private/rules');
const generatedDir = path.resolve('private/generated');
const outputFile = path.join(generatedDir, 'spells.raw.json');

async function main() {
  await ensurePdfInputs();
  const files = (await fs.readdir(rulesDir)).filter((name) => name.toLowerCase().endsWith('.pdf'));
  const pages = [];
  const candidates = [];

  for (const file of files) {
    const fullPath = path.join(rulesDir, file);
    const pageCount = await getPageCount(fullPath);
    for (let page = 1; page <= pageCount; page += 1) {
      const text = await extractPageText(fullPath, page);
      const pageRecord = { sourceFile: file, sourcePage: page, text };
      pages.push(pageRecord);
      candidates.push(...detectSpellCandidatesFromText({ text, sourceFile: file, sourcePage: page, sourceBook: file.replace(/\.pdf$/i, '') }));
    }
  }

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify({ createdAt: new Date().toISOString(), files, pages, candidates }, null, 2));
  console.log(`Extracted ${candidates.length} candidate spells across ${pages.length} pages.`);
  console.log(`Private raw output written: ${outputFile}`);
  console.log('Next step: npm run review:spells');
}

async function getPageCount(pdfFile) {
  try {
    const { stdout } = await execFileAsync('pdfinfo', [pdfFile]);
    const m = stdout.match(/^Pages:\s+(\d+)/m);
    if (!m) throw new Error('Could not parse page count.');
    return Number(m[1]);
  } catch {
    throw new Error('Missing pdfinfo utility. Install poppler tools (pdfinfo/pdftotext) for local extraction.');
  }
}

async function extractPageText(pdfFile, page) {
  const { stdout } = await execFileAsync('pdftotext', ['-f', String(page), '-l', String(page), '-layout', pdfFile, '-']);
  return stdout;
}

async function ensurePdfInputs() {
  let stats;
  try { stats = await fs.stat(rulesDir); } catch { throw new Error('Missing private/rules/. Add your legally owned PDFs there.'); }
  if (!stats.isDirectory()) throw new Error('private/rules/ exists but is not a directory.');
  const files = await fs.readdir(rulesDir);
  if (!files.some((name) => name.toLowerCase().endsWith('.pdf'))) throw new Error('No PDFs found in private/rules/. Add at least one .pdf rulebook.');
}

main().catch((error) => {
  console.error(`extract:spells failed: ${error.message}`);
  process.exitCode = 1;
});
