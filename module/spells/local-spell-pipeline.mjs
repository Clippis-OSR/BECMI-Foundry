const ORDINAL_TO_LEVEL = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9 };
const FIELD_PATTERN = /^(Range|Duration|Effect|Area of Effect|Saving Throw|Save)\s*:\s*(.+)$/i;
const COLUMN_SPLIT_PATTERN = /\s{3,}/;
const SECTION_LIKE_PATTERN = /^(chapter|table|appendix|introduction|contents|combat|equipment|spells?)\b/i;
const LIST_HEADING_PATTERN = /^(?<level>(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|\d+(?:st|nd|rd|th)))(?:\s*|-\s*)level\s+(?<class>cleric(?:al)?|magic-?user|druid)\s+spells$/i;
const TABLE_ROW_REJECT = /^(death ray or poison|magic wands|paralysis or stone|dragon breath)$/i;
const FORBIDDEN_NAME_PATTERNS = [ /spell\s+table/i, /saving\s+throw/i, /experience\s+table/i, /hit\s+chart/i, /combat/i, /equipment/i ];
const FORBIDDEN_STARTS = [/^this spell/i, /^the\s/i, /^a\s/i, /^an\s/i, /^any\s/i, /^when\s/i, /^if\s/i];

export function slugifySpellKey(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
const normalizeSpellName = (name) => String(name || '').replace(/\*+$/, '').trim();
const normalizeSpellKey = (name) => slugifySpellKey(normalizeSpellName(name));

function parseLevelToken(token) { if (!token) return 0; const lowered = token.toLowerCase(); if (ORDINAL_TO_LEVEL[lowered]) return ORDINAL_TO_LEVEL[lowered]; const d = lowered.match(/\d+/); return d ? Number.parseInt(d[0], 10) : 0; }
function normalizeClass(value) { const lowered = String(value || '').toLowerCase(); if (lowered.includes('magic')) return 'Magic-User'; if (lowered.includes('cleric')) return 'Cleric'; if (lowered.includes('druid')) return 'Druid'; return 'unknown'; }
function parseListHeading(line) { const m = String(line || '').trim().match(LIST_HEADING_PATTERN); if (!m?.groups) return null; return { spellLevel: parseLevelToken(m.groups.level), spellClass: normalizeClass(m.groups.class) }; }

export function shouldRejectSpellName(rawName, { allowLongExplicit = false } = {}) {
  const name = normalizeSpellName(rawName);
  if (!name) return true;
  if (FORBIDDEN_STARTS.some((p) => p.test(name))) return true;
  if (/\bSPELLS\b/i.test(name) || /Saving Throw/i.test(name) || /\bTABLE\b/i.test(name)) return true;
  if (/\b[A-Za-z]+-\s*$/.test(name)) return true;
  if (/^[^a-z]*[A-Z][A-Z\s\-']+$/.test(name)) return true;
  const words = name.split(/\s+/).filter(Boolean);
  if (!allowLongExplicit && words.length > 5) return true;
  if (/\b(and|the)$/i.test(name)) return true;
  if (name.includes('\n')) return true;
  return false;
}

function parseListLine(line) {
  if (!line || line.includes(':')) return [];
  const parts = line.split(COLUMN_SPLIT_PATTERN).map((p) => normalizeSpellName(p)).filter(Boolean);
  const maybe = (parts.length > 1 ? parts : [normalizeSpellName(line)]).filter(Boolean);
  return maybe.filter((n) => /^[A-Z][A-Za-z'\- ]{1,80}\*?$/.test(n) && !shouldRejectSpellName(n) && !SECTION_LIKE_PATTERN.test(n) && !TABLE_ROW_REJECT.test(n) && !FORBIDDEN_NAME_PATTERNS.some((p) => p.test(n)));
}

function makeIndexRow(spellName, section, source) { return { ...source, spellName, spellKey: slugifySpellKey(spellName), spellClass: section.spellClass, spellLevel: section.spellLevel, reversible: /\*$/.test(spellName) }; }

export function extractSpellIndexFromPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trimEnd());
  const indexRows = [];
  const diagnostics = { sourceFile, sourceBook, sourcePage, pagesUsedForIndex: false, rejectedHeadings: [], headingsDetected: [] };

  let activeSection = null;
  for (const rawLine of lines) {
    const line = String(rawLine || '').trim();
    if (!line) continue;
    const section = parseListHeading(line);
    if (section) {
      activeSection = section;
      diagnostics.pagesUsedForIndex = true;
      diagnostics.headingsDetected.push(line);
      continue;
    }
    if (!activeSection) continue;
    if (SECTION_LIKE_PATTERN.test(line) || /\bSAVING THROW TABLE\b/i.test(line)) { activeSection = null; continue; }
    for (const maybeName of parseListLine(line)) {
      indexRows.push(makeIndexRow(maybeName, activeSection, { sourceBook, sourceFile, sourcePage }));
    }
  }

  return { indexRows, diagnostics };
}

export function extractDescriptionBlocksFromPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0, knownSpellNames = [], knownSpellKeys = [] }) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trimEnd());
  const knownByName = new Map((knownSpellNames || []).map((name) => [normalizeSpellName(name), normalizeSpellKey(name)]));
  const knownKeySet = new Set([...(knownSpellKeys || []), ...knownByName.values()].filter(Boolean));
  const blocks = [];
  const unmatchedCandidates = [];
  const diagnostics = { sourceFile, sourceBook, sourcePage, pagesUsedForDescriptions: false };

  for (let i = 0; i < lines.length; i += 1) {
    const line = normalizeSpellName((lines[i] || '').trim());
    if (!line) continue;
    const lineKey = normalizeSpellKey(line);
    if (!knownKeySet.has(lineKey)) {
      if (/^[A-Z][A-Za-z'\- ]{1,80}\*?$/.test(line) && !line.includes(':') && !TABLE_ROW_REJECT.test(line) && !parseListHeading(line) && !SECTION_LIKE_PATTERN.test(line) && !shouldRejectSpellName(line)) {
        unmatchedCandidates.push({ sourceBook, sourceFile, sourcePage, candidate: line, spellKey: lineKey });
      }
      continue;
    }
    diagnostics.pagesUsedForDescriptions = true;
    let range = ''; let duration = ''; let effect = '';
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = normalizeSpellName((lines[j] || '').trim());
      if (!next) continue;
      const nextKey = normalizeSpellKey(next);
      if (knownKeySet.has(nextKey) || parseListHeading(next) || SECTION_LIKE_PATTERN.test(next)) break;
      const m = next.match(FIELD_PATTERN);
      if (!m) continue;
      const key = m[1].toLowerCase(); const value = m[2].trim();
      if (key === 'range') range = value;
      if (key === 'duration') duration = value;
      if (key === 'effect' || key === 'area of effect') effect = value;
    }
    blocks.push({ sourceBook, sourceFile, sourcePage, spellName: line, spellKey: lineKey, range, duration, effect });
  }

  return { blocks, unmatchedCandidates, diagnostics };
}

export function mergeSpellIndexAndDescriptions(indexRows, descriptionBlocks) {
  const byKey = new Map();
  for (const block of descriptionBlocks || []) {
    if (!byKey.has(block.spellKey)) byKey.set(block.spellKey, []);
    byKey.get(block.spellKey).push(block);
  }
  return (indexRows || []).map((row) => {
    const matches = byKey.get(row.spellKey) || [];
    const block = matches.find((b) => b.range || b.duration || b.effect) || matches[0];
    const missing = !(block?.range) || !(block?.duration) || !(block?.effect);
    return { ...row, range: block?.range || '', duration: block?.duration || '', effect: block?.effect || '', needsReview: missing, confidence: block ? 0.9 : 0.6, parseReason: block ? 'index+description' : 'index-only', rejectReason: '', manualNotes: '', tags: [], save: '', reverseName: '' };
  });
}

export function detectSpellCandidatesFromText({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) { return analyzeSpellPage({ text, sourceFile, sourceBook, sourcePage }).candidates; }
export function analyzeSpellPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) { const stage1 = extractSpellIndexFromPage({ text, sourceFile, sourceBook, sourcePage }); const knownSpellNames = stage1.indexRows.map((r) => r.spellName); const knownSpellKeys = stage1.indexRows.map((r) => r.spellKey); const stage2 = extractDescriptionBlocksFromPage({ text, sourceFile, sourceBook, sourcePage, knownSpellNames, knownSpellKeys }); const candidates = mergeSpellIndexAndDescriptions(stage1.indexRows, stage2.blocks); return { candidates, unmatchedCandidates: stage2.unmatchedCandidates, diagnostics: { sourceFile, sourceBook, sourcePage, pagesUsedForIndex: stage1.diagnostics.pagesUsedForIndex, pagesUsedForDescriptions: stage2.diagnostics.pagesUsedForDescriptions, rejectedHeadings: stage1.diagnostics.rejectedHeadings, headingsDetected: stage1.diagnostics.headingsDetected } }; }

export function toReviewRows(candidates) { return candidates.map((candidate) => ({ sourceBook: candidate.sourceBook || '', sourceFile: candidate.sourceFile || '', sourcePage: candidate.sourcePage || 0, spellName: candidate.spellName || '', spellKey: candidate.spellKey || slugifySpellKey(candidate.spellName), spellClass: candidate.spellClass || '', spellLevel: Number(candidate.spellLevel || 0), range: candidate.range || '', duration: candidate.duration || '', effect: candidate.effect || '', reversible: Boolean(candidate.reversible), reverseName: candidate.reverseName || '', save: candidate.save || '', tags: Array.isArray(candidate.tags) ? candidate.tags : [], manualNotes: candidate.manualNotes || '', confidence: Number(candidate.confidence || 0), needsReview: candidate.needsReview !== false, parseReason: candidate.parseReason || '', rejectReason: candidate.rejectReason || '' })); }
export function sanitizeCanonicalRows(reviewRows) { return reviewRows.map((row) => ({ spellKey: row.spellKey, spellName: row.spellName || row.name, spellClass: row.spellClass, spellLevel: Number(row.spellLevel), range: row.range, duration: row.duration, effect: row.effect, save: row.save, reversible: Boolean(row.reversible), reverseName: row.reverseName || '', tags: Array.isArray(row.tags) ? row.tags : String(row.tags || '').split('|').map((v) => v.trim()).filter(Boolean), summary: String(row.manualNotes || '').slice(0, 280), needsReview: row.needsReview !== false, confidence: Number(row.confidence || 0), source: { sourceBook: row.sourceBook, sourceFile: row.sourceFile || '', sourcePage: row.sourcePage == null ? null : Number(row.sourcePage) } })); }
export function validateCanonicalRows(rows) { const errors = []; const seen = new Set(); rows.forEach((row, index) => { const prefix = `row ${index + 1}`; for (const field of ['spellKey', 'spellName', 'spellClass']) if (!row[field]) errors.push(`${prefix}: missing ${field}`); if (seen.has(row.spellKey)) errors.push(`${prefix}: duplicate spellKey ${row.spellKey}`); seen.add(row.spellKey); if (row.reversible && !row.reverseName) errors.push(`${prefix}: reversible spell missing reverseName`); if (!Array.isArray(row.tags)) errors.push(`${prefix}: tags must be array`); }); return errors; }
