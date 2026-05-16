import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { extractSpellIndexFromPage, extractDescriptionBlocksFromPage } from '../module/spells/local-spell-pipeline.mjs';

const execFileAsync = promisify(execFile);
const rulesDir = path.resolve('private/rules');
const generatedDir = path.resolve('private/generated');
const indexFile = path.join(generatedDir, 'spell-index.json');
const blocksFile = path.join(generatedDir, 'spell-description-blocks.json');
const diagnosticsFile = path.join(generatedDir, 'spell-extraction-diagnostics.json');
const unmatchedCandidatesFile = path.join(generatedDir, 'unmatched-description-candidates.json');

async function main() {
  await ensurePdfInputs();
  const files = (await fs.readdir(rulesDir)).filter((name) => name.toLowerCase().endsWith('.pdf'));
  const allPages = [];
  for (const file of files) {
    const fullPath = path.join(rulesDir, file);
    const pageCount = await getPageCount(fullPath);
    for (let page = 1; page <= pageCount; page += 1) {
      allPages.push({ sourceFile: file, sourceBook: file.replace(/\.pdf$/i, ''), sourcePage: page, text: await extractPageText(fullPath, page) });
    }
  }

  const indexRows = [];
  const indexPages = [];
  const knownNames = new Set();
  const rejectedHeadings = [];
  for (const page of allPages) {
    const { indexRows: rows, diagnostics } = extractSpellIndexFromPage(page);
    indexRows.push(...rows);
    rows.forEach((r) => knownNames.add(r.spellName));
    if (diagnostics.pagesUsedForIndex) indexPages.push(`${page.sourceFile}:${page.sourcePage}`);
    rejectedHeadings.push(...(diagnostics.rejectedHeadings || []).map((name) => ({ ...page, name })));
  }

  const blocks = [];
  const descriptionPages = [];
  const unmatchedCandidates = [];
  const knownSpellNames = [...knownNames];
  const knownSpellKeys = indexRows.map((r) => r.spellKey);
  for (const page of allPages) {
    const { blocks: pageBlocks, unmatchedCandidates: pageUnmatched, diagnostics } = extractDescriptionBlocksFromPage({ ...page, knownSpellNames, knownSpellKeys });
    blocks.push(...pageBlocks);
    unmatchedCandidates.push(...(pageUnmatched || []));
    if (diagnostics.pagesUsedForDescriptions) descriptionPages.push(`${page.sourceFile}:${page.sourcePage}`);
  }

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(indexFile, JSON.stringify({ createdAt: new Date().toISOString(), indexRows }, null, 2));
  await fs.writeFile(blocksFile, JSON.stringify({ createdAt: new Date().toISOString(), blocks }, null, 2));
  await fs.writeFile(unmatchedCandidatesFile, JSON.stringify({ createdAt: new Date().toISOString(), unmatchedCandidates }, null, 2));
  await fs.writeFile(diagnosticsFile, JSON.stringify({ createdAt: new Date().toISOString(), indexPages, descriptionPages, rejectedHeadings }, null, 2));
  console.log(`Wrote:\n- ${indexFile}\n- ${blocksFile}\n- ${unmatchedCandidatesFile}\n- ${diagnosticsFile}`);
}
async function getPageCount(pdfFile) { const { stdout } = await execFileAsync('pdfinfo', [pdfFile]); const m = stdout.match(/^Pages:\s+(\d+)/m); if (!m) throw new Error('Could not parse page count.'); return Number(m[1]); }
async function extractPageText(pdfFile, page) { const { stdout } = await execFileAsync('pdftotext', ['-f', String(page), '-l', String(page), '-layout', pdfFile, '-']); return stdout; }
async function ensurePdfInputs() { const files = await fs.readdir(rulesDir); if (!files.some((name) => name.toLowerCase().endsWith('.pdf'))) throw new Error('No PDFs found in private/rules/.'); }

main().catch((error) => { console.error(`extract:spells failed: ${error.message}`); process.exitCode = 1; });
