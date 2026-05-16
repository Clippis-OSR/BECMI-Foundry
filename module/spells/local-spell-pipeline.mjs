const LIST_HEADING_PATTERN = /^(?:(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|\d+(?:st|nd|rd|th))[- ]*level\s+(cleric|magic-?user|druid)\s+spells?|(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|\d+(?:st|nd|rd|th))\s+level\s+(?:cleric|magic-?user|druid)\s+spells?)$/i;
const DESCRIPTION_HEADING_PATTERN = /^[A-Z][A-Za-z'\- ]{1,80}\*?$/;
const FIELD_PATTERN = /^(Range|Duration|Effect|Area of Effect|Saving Throw|Save)\s*:\s*(.+)$/i;
const COLUMN_SPLIT_PATTERN = /\s{3,}/;
const FORBIDDEN_NAME_PATTERNS = [
  /level\s+magic-?user\s+spells/i,
  /level\s+cleric\s+spells/i,
  /spell\s+table/i,
  /saving\s+throw/i,
  /experience\s+table/i,
  /hit\s+chart/i,
  /combat/i,
  /equipment/i,
];
const SECTION_LIKE_PATTERN = /^(chapter|table|appendix|introduction|contents|combat|equipment|spells?)\b/i;
const ORDINAL_TO_LEVEL = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9 };

export function slugifySpellKey(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

export function extractSpellIndexFromPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trimEnd());
  const indexRows = [];
  const diagnostics = { sourceFile, sourceBook, sourcePage, pagesUsedForIndex: false, rejectedHeadings: [] };

  for (let i = 0; i < lines.length; i += 1) {
    const heading = (lines[i] || '').trim();
    const section = parseListHeading(heading);
    if (!section) continue;
    diagnostics.pagesUsedForIndex = true;
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = (lines[j] || '').trim();
      if (!line) continue;
      if (parseListHeading(line) || SECTION_LIKE_PATTERN.test(line)) break;
      for (const maybeName of parseListLine(line)) {
        if (isRejectedSpellName(maybeName)) {
          diagnostics.rejectedHeadings.push(maybeName);
          continue;
        }
        indexRows.push(makeIndexRow(maybeName, section, { sourceBook, sourceFile, sourcePage }));
      }
    }
  }

  return { indexRows, diagnostics };
}

export function extractDescriptionBlocksFromPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0, knownSpellNames = [] }) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trimEnd());
  const known = new Set((knownSpellNames || []).map((name) => normalizeSpellName(name)).filter(Boolean));
  const blocks = [];
  const diagnostics = { sourceFile, sourceBook, sourcePage, pagesUsedForDescriptions: false };

  for (let i = 0; i < lines.length; i += 1) {
    const heading = normalizeSpellName((lines[i] || '').trim());
    if (!heading || !known.has(heading)) continue;
    diagnostics.pagesUsedForDescriptions = true;
    let range = '';
    let duration = '';
    let effect = '';
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = (lines[j] || '').trim();
      if (!line) continue;
      if (known.has(normalizeSpellName(line)) || parseListHeading(line) || SECTION_LIKE_PATTERN.test(line)) break;
      const m = line.match(FIELD_PATTERN);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const value = m[2].trim();
      if (key === 'range') range = value;
      if (key === 'duration') duration = value;
      if (key === 'effect' || key === 'area of effect') effect = value;
    }
    blocks.push({ sourceBook, sourceFile, sourcePage, spellName: heading, spellKey: slugifySpellKey(heading), range, duration, effect });
  }

  return { blocks, diagnostics };
}

export function mergeSpellIndexAndDescriptions(indexRows, descriptionBlocks) {
  const byName = new Map();
  for (const block of descriptionBlocks || []) {
    const key = normalizeSpellName(block.spellName);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(block);
  }

  const merged = (indexRows || []).map((row) => {
    const matches = byName.get(normalizeSpellName(row.spellName)) || [];
    const block = matches.find((b) => b.range || b.duration || b.effect) || matches[0];
    return {
      ...row,
      range: block?.range || '',
      duration: block?.duration || '',
      effect: block?.effect || '',
      needsReview: false,
      confidence: block ? 0.9 : 0.6,
      parseReason: block ? 'index+description' : 'index-only',
      rejectReason: '',
      manualNotes: '',
      tags: [],
      save: '',
      reverseName: '',
    };
  });

  const knownSpellKeys = new Set(merged.map((r) => r.spellKey));
  for (const block of descriptionBlocks || []) {
    if (knownSpellKeys.has(block.spellKey)) continue;
    merged.push({ sourceBook: block.sourceBook, sourceFile: block.sourceFile, sourcePage: block.sourcePage, spellName: block.spellName, spellKey: block.spellKey, spellClass: 'unknown', spellLevel: 0, range: block.range || '', duration: block.duration || '', effect: block.effect || '', reversible: false, needsReview: true, confidence: 0.4, parseReason: 'description-without-index', rejectReason: '' });
  }

  return merged;
}

export function analyzeSpellPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) {
  const stage1 = extractSpellIndexFromPage({ text, sourceFile, sourceBook, sourcePage });
  const stage2 = extractDescriptionBlocksFromPage({ text, sourceFile, sourceBook, sourcePage, knownSpellNames: stage1.indexRows.map((r) => r.spellName) });
  const candidates = mergeSpellIndexAndDescriptions(stage1.indexRows, stage2.blocks);
  return { candidates, diagnostics: { sourceFile, sourceBook, sourcePage, pagesUsedForIndex: stage1.diagnostics.pagesUsedForIndex, pagesUsedForDescriptions: stage2.diagnostics.pagesUsedForDescriptions, rejectedHeadings: stage1.diagnostics.rejectedHeadings } };
}

export function detectSpellCandidatesFromText({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) { return analyzeSpellPage({ text, sourceFile, sourceBook, sourcePage }).candidates; }

function parseListHeading(line) {
  const m = line.match(LIST_HEADING_PATTERN);
  if (!m) return null;
  const levelToken = line.match(/(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|\d+(?:st|nd|rd|th))/i)?.[1];
  const classToken = line.match(/(cleric|magic-?user|druid)/i)?.[1];
  return { spellLevel: parseLevelToken(levelToken), spellClass: normalizeClass(classToken) };
}

function parseListLine(line) {
  if (line.includes(':')) return [];
  const parts = line.split(COLUMN_SPLIT_PATTERN).map((p) => p.trim()).filter(Boolean);
  const candidates = (parts.length > 1 ? parts : [line]).map((name) => normalizeSpellName(name)).filter(Boolean);
  return candidates.filter((name) => DESCRIPTION_HEADING_PATTERN.test(name));
}

function makeIndexRow(spellName, section, source) {
  return { ...source, spellName, spellKey: slugifySpellKey(spellName), spellClass: section.spellClass, spellLevel: section.spellLevel, reversible: /\*$/.test(spellName) };
}

function isRejectedSpellName(name) {
  const value = String(name || '');
  return FORBIDDEN_NAME_PATTERNS.some((p) => p.test(value)) || SECTION_LIKE_PATTERN.test(value);
}

function normalizeSpellName(name) { return String(name || '').replace(/\*+$/, '').trim(); }
function parseLevelToken(token) { if (!token) return 0; const lowered = token.toLowerCase(); if (ORDINAL_TO_LEVEL[lowered]) return ORDINAL_TO_LEVEL[lowered]; const d = lowered.match(/\d+/); return d ? Number.parseInt(d[0], 10) : 0; }
function normalizeClass(value) { const lowered = String(value || '').toLowerCase(); if (lowered.includes('magic')) return 'Magic-User'; if (lowered.includes('cleric')) return 'Cleric'; if (lowered.includes('druid')) return 'Druid'; return 'unknown'; }

export function toReviewRows(candidates) { return candidates.map((candidate) => ({ sourceBook: candidate.sourceBook || '', sourceFile: candidate.sourceFile || '', sourcePage: candidate.sourcePage || 0, spellName: candidate.spellName || '', spellKey: candidate.spellKey || slugifySpellKey(candidate.spellName), spellClass: candidate.spellClass || '', spellLevel: Number(candidate.spellLevel || 0), range: candidate.range || '', duration: candidate.duration || '', effect: candidate.effect || '', reversible: Boolean(candidate.reversible), reverseName: candidate.reverseName || '', save: candidate.save || '', tags: Array.isArray(candidate.tags) ? candidate.tags : [], manualNotes: candidate.manualNotes || '', confidence: Number(candidate.confidence || 0), needsReview: candidate.needsReview !== false, parseReason: candidate.parseReason || '', rejectReason: candidate.rejectReason || '' })); }
export function sanitizeCanonicalRows(reviewRows) { return reviewRows.map((row) => ({ spellKey: row.spellKey, spellName: row.spellName, spellClass: row.spellClass, spellLevel: Number(row.spellLevel), range: row.range, duration: row.duration, effect: row.effect, save: row.save, reversible: Boolean(row.reversible), reverseName: row.reverseName || '', tags: Array.isArray(row.tags) ? row.tags : [], summary: String(row.manualNotes || '').slice(0, 280), source: { sourceBook: row.sourceBook, sourceFile: row.sourceFile, sourcePage: Number(row.sourcePage) } })); }
export function validateCanonicalRows(rows) { const errors = []; const seen = new Set(); rows.forEach((row, index) => { const prefix = `row ${index + 1}`; for (const field of ['spellKey', 'spellName', 'spellClass']) if (!row[field]) errors.push(`${prefix}: missing ${field}`); if (seen.has(row.spellKey)) errors.push(`${prefix}: duplicate spellKey ${row.spellKey}`); seen.add(row.spellKey); if (row.reversible && !row.reverseName) errors.push(`${prefix}: reversible spell missing reverseName`); if (!Array.isArray(row.tags)) errors.push(`${prefix}: tags must be array`); }); return errors; }
