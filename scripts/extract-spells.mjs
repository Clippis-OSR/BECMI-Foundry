import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { analyzeSpellPage } from '../module/spells/local-spell-pipeline.mjs';

const execFileAsync = promisify(execFile);
const rulesDir = path.resolve('private/rules');
const generatedDir = path.resolve('private/generated');
const outputFile = path.join(generatedDir, 'spells.raw.json');
const diagnosticsFile = path.join(generatedDir, 'spell-extraction-diagnostics.json');
const pagesFile = path.join(generatedDir, 'spell-pages.txt');

async function main() {
  await ensurePdfInputs();
  const files = (await fs.readdir(rulesDir)).filter((name) => name.toLowerCase().endsWith('.pdf'));
  const pages = [];
  const candidates = [];
  const diagnostics = { createdAt: new Date().toISOString(), files: {}, skippedPagesWithSpellListHeadings: [], detectedSpellSectionRanges: [] };

  for (const file of files) {
    const fullPath = path.join(rulesDir, file);
    const pageCount = await getPageCount(fullPath);
    diagnostics.files[file] = { pagesScanned: pageCount, candidatesAccepted: 0, candidatesRejected: 0 };
    for (let page = 1; page <= pageCount; page += 1) {
      const text = await extractPageText(fullPath, page);
      const pageRecord = { sourceFile: file, sourcePage: page, text };
      pages.push(pageRecord);
      const pageResult = analyzeSpellPage({ text, sourceFile: file, sourcePage: page, sourceBook: file.replace(/\.pdf$/i, '') });
      candidates.push(...pageResult.candidates);
      diagnostics.files[file].candidatesAccepted += pageResult.candidates.length;
      diagnostics.files[file].candidatesRejected += pageResult.diagnostics.rejected.length;
      diagnostics.detectedSpellSectionRanges.push({ sourceFile: file, sourcePage: page, ranges: pageResult.diagnostics.spellSectionRanges });
      if (pageResult.diagnostics.skippedSpellListPage) diagnostics.skippedPagesWithSpellListHeadings.push({ sourceFile: file, sourcePage: page });
    }
  }

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify({ createdAt: new Date().toISOString(), files, pages, candidates }, null, 2));
  await fs.writeFile(diagnosticsFile, JSON.stringify({ ...diagnostics, candidates }, null, 2));
  await fs.writeFile(pagesFile, pages.map((p) => `${p.sourceFile}:${p.sourcePage}`).join('\n'));
  console.log(`Extracted ${candidates.length} candidate spells across ${pages.length} pages.`);
  console.log(`Private raw output written: ${outputFile}`);
  console.log(`Diagnostics written:\n- ${diagnosticsFile}\n- ${pagesFile}`);
  console.log('Next step: npm run review:spells');
}

async function getPageCount(pdfFile) { try { const { stdout } = await execFileAsync('pdfinfo', [pdfFile]); const m = stdout.match(/^Pages:\s+(\d+)/m); if (!m) throw new Error('Could not parse page count.'); return Number(m[1]); } catch { throw new Error('Missing pdfinfo utility. Install poppler tools (pdfinfo/pdftotext) for local extraction.'); } }
async function extractPageText(pdfFile, page) { const { stdout } = await execFileAsync('pdftotext', ['-f', String(page), '-l', String(page), '-layout', pdfFile, '-']); return stdout; }
async function ensurePdfInputs() { let stats; try { stats = await fs.stat(rulesDir); } catch { throw new Error('Missing private/rules/. Add your legally owned PDFs there.'); } if (!stats.isDirectory()) throw new Error('private/rules/ exists but is not a directory.'); const files = await fs.readdir(rulesDir); if (!files.some((name) => name.toLowerCase().endsWith('.pdf'))) throw new Error('No PDFs found in private/rules/. Add at least one .pdf rulebook.'); }

main().catch((error) => { console.error(`extract:spells failed: ${error.message}`); process.exitCode = 1; });
