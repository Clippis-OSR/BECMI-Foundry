const ORDINAL_TO_LEVEL = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9 };
const FIELD_PATTERN = /^(Range|Duration|Effect|Area of Effect|Saving Throw|Save)\s*:\s*(.+)$/i;
const COLUMN_SPLIT_PATTERN = /\s{3,}/;
const SECTION_LIKE_PATTERN = /^(chapter|table|appendix|introduction|contents|combat|equipment|spells?)\b/i;
const LIST_HEADING_PATTERN = /^(?<level>(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|\d+(?:st|nd|rd|th)))(?:\s*|-\s*)level\s+(?<class>cleric(?:al)?|magic-?user|druid)\s+spells$/i;
const TABLE_ROW_REJECT = /^(death ray or poison|magic wands|paralysis or stone|dragon breath)$/i;
const FORBIDDEN_NAME_PATTERNS = [ /spell\s+table/i, /saving\s+throw/i, /experience\s+table/i, /hit\s+chart/i, /combat/i, /equipment/i ];
const FORBIDDEN_STARTS = [/^this spell/i, /^the\s/i, /^a\s/i, /^an\s/i, /^any\s/i, /^when\s/i, /^if\s/i];
export const ALLOWED_TAGS = new Set(['healing','damage','protection','detection','charm','paralysis','poison','light','darkness','movement','summoning','transformation','dispel','communication','creation','terrain-control','resurrection','death','special']);

export function slugifySpellKey(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
export const normalizeSpellName = (name) => String(name || '').replace(/\*+$/, '').replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const normalizeSpellKey = (name) => slugifySpellKey(normalizeSpellName(name));
const normalizeForMatch = (name) => normalizeSpellName(name).toLowerCase().replace(/[^a-z0-9]+/g, '');
const preprocessOcrText = (text) => String(text || '')
  .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
  .replace(/[’‘`´]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[\t\f\v]+/g, ' ');

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
function parseListLine(line) { if (!line || line.includes(':')) return []; const parts = line.split(COLUMN_SPLIT_PATTERN).map((p) => normalizeSpellName(p)).filter(Boolean); const maybe = (parts.length > 1 ? parts : [normalizeSpellName(line)]).filter(Boolean); return maybe.filter((n) => /^[A-Z][A-Za-z'\- ]{1,80}\*?$/.test(n) && !shouldRejectSpellName(n) && !SECTION_LIKE_PATTERN.test(n) && !TABLE_ROW_REJECT.test(n) && !FORBIDDEN_NAME_PATTERNS.some((p) => p.test(n))); }
function makeIndexRow(spellName, section, source) { return { ...source, spellName, spellKey: slugifySpellKey(spellName), spellClass: section.spellClass, spellLevel: section.spellLevel, reversible: /\*$/.test(spellName) }; }

export function extractSpellIndexFromPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) { /* unchanged */
  const lines = preprocessOcrText(text).split(/\r?\n/).map((line) => line.trimEnd()); const indexRows = []; const diagnostics = { sourceFile, sourceBook, sourcePage, pagesUsedForIndex: false, rejectedHeadings: [], headingsDetected: [] }; let activeSection = null;
  for (const rawLine of lines) { const line = String(rawLine || '').trim(); if (!line) continue; const section = parseListHeading(line); if (section) { activeSection = section; diagnostics.pagesUsedForIndex = true; diagnostics.headingsDetected.push(line); continue; } if (!activeSection) continue; if (SECTION_LIKE_PATTERN.test(line) || /\bSAVING THROW TABLE\b/i.test(line)) { activeSection = null; continue; } for (const maybeName of parseListLine(line)) indexRows.push(makeIndexRow(maybeName, activeSection, { sourceBook, sourceFile, sourcePage })); }
  return { indexRows, diagnostics };
}

export function extractDescriptionBlocksFromPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0, knownSpellNames = [], knownSpellKeys = [] }) { const lines = preprocessOcrText(text).split(/\r?\n/).map((line) => line.trimEnd()); const knownByName = new Map((knownSpellNames || []).map((name) => [normalizeSpellName(name), normalizeSpellKey(name)])); const knownKeySet = new Set([...(knownSpellKeys || []), ...knownByName.values()].filter(Boolean)); const blocks = []; const unmatchedCandidates = []; const diagnostics = { sourceFile, sourceBook, sourcePage, pagesUsedForDescriptions: false };
  for (let i = 0; i < lines.length; i += 1) { const line = normalizeSpellName((lines[i] || '').trim()); if (!line) continue; const lineKey = normalizeSpellKey(line); if (!knownKeySet.has(lineKey)) { if (/^[A-Z][A-Za-z'\- ]{1,80}\*?$/.test(line) && !line.includes(':') && !TABLE_ROW_REJECT.test(line) && !parseListHeading(line) && !SECTION_LIKE_PATTERN.test(line) && !shouldRejectSpellName(line)) unmatchedCandidates.push({ sourceBook, sourceFile, sourcePage, candidate: line, spellKey: lineKey }); continue; }
    diagnostics.pagesUsedForDescriptions = true; let range = ''; let duration = ''; let effect = '';
    for (let j = i + 1; j < lines.length; j += 1) { const next = normalizeSpellName((lines[j] || '').trim()); if (!next) continue; const nextKey = normalizeSpellKey(next); if (knownKeySet.has(nextKey) || parseListHeading(next) || SECTION_LIKE_PATTERN.test(next)) break; const m = next.match(FIELD_PATTERN); if (!m) continue; const key = m[1].toLowerCase(); const value = m[2].trim(); if (key === 'range') range = value; if (key === 'duration') duration = value; if (key === 'effect' || key === 'area of effect') effect = value; }
    blocks.push({ sourceBook, sourceFile, sourcePage, spellName: line, spellKey: lineKey, range, duration, effect });
  } return { blocks, unmatchedCandidates, diagnostics };
}

export function buildSeededSpellDetailSuggestions({ seedRows = [], pages = [], includeDebug = false }) {
  const rows = Array.isArray(seedRows) ? seedRows : [];
  const normIndex = new Map();
  const duplicates = new Set();
  for (const r of rows) {
    const norm = normalizeForMatch(r.name);
    if (!normIndex.has(norm)) normIndex.set(norm, []);
    normIndex.get(norm).push(r);
    if ((normIndex.get(norm) || []).length > 1) duplicates.add(norm);
  }
  const suggestions = [];
  const debug = [];
  for (const page of pages) {
    const lines = preprocessOcrText(page.text || '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const headingRaw = normalizeSpellName(lines[i]);
      if (!headingRaw) continue;
      const heading = headingRaw.toUpperCase() === headingRaw ? normalizeSpellName(headingRaw.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())) : headingRaw;
      let norm = normalizeForMatch(heading);
      let candidates = normIndex.get(norm) || [];
      let matchedByFuzzy = false;
      if (!candidates.length) {
        const pref = rows.find((r) => heading.toLowerCase().startsWith(String(r.name || '').toLowerCase() + ' '));
        if (pref) {
          candidates = [pref];
          norm = normalizeForMatch(pref.name);
          matchedByFuzzy = true;
        }
      }
      if (!candidates.length) {
        let best = null;
        for (const [nameNorm, rowsForName] of normIndex.entries()) {
          const contains = nameNorm.includes(norm) || norm.includes(nameNorm);
          if (!contains || Math.abs(nameNorm.length - norm.length) > 3) continue;
          if (!best || nameNorm.length > best.nameNorm.length) best = { nameNorm, rowsForName };
        }
        if (best) { candidates = best.rowsForName; matchedByFuzzy = true; }
      }
      if (!candidates.length) continue;
      let j = i + 1;
      const blockLines = [];
      while (j < lines.length) {
        const n = normalizeSpellName(lines[j]);
        if (!n) { j += 1; continue; }
        if (normIndex.has(normalizeForMatch(n)) || parseListHeading(n) || SECTION_LIKE_PATTERN.test(n)) break;
        blockLines.push(n); j += 1;
      }
      const fields = parseSuggestionFields(blockLines);
      const score = computeCandidateScore({ heading, blockLines, fields, fuzzy: matchedByFuzzy });
      for (const row of candidates) {
        suggestions.push(makeSuggestion(row, page, heading, fields, duplicates.has(norm), candidates.length > 1, score));
        if (includeDebug) debug.push({ spellKey: row.spellKey, candidatePages: [page.sourcePage || null], candidateHeadings: [heading], extractedLines: blockLines, confidenceScore: score });
      }
    }
  }
  return { suggestions, debug };
}
function computeCandidateScore({ heading, blockLines, fields, fuzzy }) {
  let score = fuzzy ? 0.55 : 0.78;
  if (heading) score += 0.05;
  if (fields.range) score += 0.05;
  if (fields.duration) score += 0.05;
  if (fields.effect) score += 0.05;
  if (fields.save) score += 0.03;
  const prose = blockLines.join(' ').toLowerCase();
  if (/\bsave\b|saving throw/.test(prose)) score += 0.02;
  if (/\breverse\b/.test(prose)) score += 0.02;
  return Math.min(0.99, Number(score.toFixed(2)));
}
function parseSuggestionFields(blockLines) {
  const join = blockLines.join(' ');
  const out = { range: '', duration: '', effect: '', save: '', reversible: null, reverseName: '', tags: [], manualNotes: 'Manual resolution: see source page', needsReview: false, confidenceByField: {} };
  for (const line of blockLines) {
    const m = line.match(/^(Range|Duration|Effect|Area\s*of\s*Effect|Saving\s*Throw|Save)\s*:?\s*(.+)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase().replace(/\s+/g, '');
    const v = m[2].trim();
    if (k.startsWith('range')) out.range = v;
    if (k.startsWith('duration')) out.duration = v;
    if (k.startsWith('effect') || k.startsWith('areaofeffect')) out.effect = v;
    if (k.startsWith('savingthrow') || k === 'save') out.save = v;
  }
  const lower = join.toLowerCase();
  if (lower.includes('reverse of this spell')) out.reversible = true;
  const revMatch = join.match(/reverse\s+of\s+this\s+spell[^.]*\b(?:is|called)\s+([A-Z][A-Za-z'\- ]+)/i);
  if (revMatch) out.reverseName = normalizeSpellName(revMatch[1]);
  const tags = [];
  if (/heal|cure/.test(lower)) tags.push('healing'); if (/damage|fire|cold|bolt/.test(lower)) tags.push('damage'); if (/protect|shield/.test(lower)) tags.push('protection'); if (/detect/.test(lower)) tags.push('detection'); if (/charm/.test(lower)) tags.push('charm'); if (/light/.test(lower)) tags.push('light'); if (/dark/.test(lower)) tags.push('darkness'); if (/summon/.test(lower)) tags.push('summoning');
  out.tags = [...new Set(tags)].filter((t) => ALLOWED_TAGS.has(t));
  if (out.range || out.duration || out.effect) out.manualNotes = 'Short summary suggested; verify source text manually.';
  const conf = (v) => (v ? 0.82 : 0.2);
  out.confidenceByField = { sourcePage: 0.95, range: conf(out.range), duration: conf(out.duration), effect: conf(out.effect), save: conf(out.save), reversible: out.reversible === true ? 0.7 : 0.4, reverseName: out.reverseName ? 0.65 : 0.3, tags: out.tags.length ? 0.65 : 0.3, manualNotes: 0.4 };
  return out;
}
function makeSuggestion(row, page, heading, fields, duplicateName, multi, score = 0.8) { const ambiguous = duplicateName || multi; return { spellKey: row.spellKey, name: row.name, spellClass: row.spellClass, spellLevel: row.spellLevel, sourceBook: row.sourceBook, sourceFile: page.sourceFile || '', sourcePage: page.sourcePage || null, headingMatched: heading, suggested: fields, confidenceByField: { ...fields.confidenceByField, sourcePage: Math.max(fields.confidenceByField.sourcePage || 0.95, score >= 0.6 ? 0.98 : 0.8) }, needsReview: ambiguous || fields.needsReview || (!fields.range && !fields.duration && !fields.effect), ambiguousMatch: ambiguous, matchScore: score }; }

export function mergeSpellSuggestionsIntoReview(seedRows, suggestions) {
  const byKey = new Map((suggestions || []).map((s) => [s.spellKey, s]));
  return (seedRows || []).map((row) => {
    const sug = byKey.get(row.spellKey);
    if (!sug) return { ...row };
    return { ...row, pageVerified: false, reviewed: false, suggestions: { sourcePage: sug.sourcePage, range: sug.suggested.range, duration: sug.suggested.duration, effect: sug.suggested.effect, save: sug.suggested.save, reversible: sug.suggested.reversible, reverseName: sug.suggested.reverseName, tags: sug.suggested.tags, manualNotes: sug.suggested.manualNotes, confidenceByField: sug.confidenceByField, needsReview: sug.needsReview, ambiguousMatch: sug.ambiguousMatch } };
  });
}

export function mergeSpellIndexAndDescriptions(indexRows, descriptionBlocks) { const byKey = new Map(); for (const block of descriptionBlocks || []) { if (!byKey.has(block.spellKey)) byKey.set(block.spellKey, []); byKey.get(block.spellKey).push(block); } return (indexRows || []).map((row) => { const matches = byKey.get(row.spellKey) || []; const block = matches.find((b) => b.range || b.duration || b.effect) || matches[0]; const missing = !(block?.range) || !(block?.duration) || !(block?.effect); return { ...row, range: block?.range || '', duration: block?.duration || '', effect: block?.effect || '', needsReview: missing, confidence: block ? 0.9 : 0.6, parseReason: block ? 'index+description' : 'index-only', rejectReason: '', manualNotes: '', tags: [], save: '', reverseName: '' }; }); }
export function detectSpellCandidatesFromText({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) { return analyzeSpellPage({ text, sourceFile, sourceBook, sourcePage }).candidates; }
export function analyzeSpellPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) { const stage1 = extractSpellIndexFromPage({ text, sourceFile, sourceBook, sourcePage }); const knownSpellNames = stage1.indexRows.map((r) => r.spellName); const knownSpellKeys = stage1.indexRows.map((r) => r.spellKey); const stage2 = extractDescriptionBlocksFromPage({ text, sourceFile, sourceBook, sourcePage, knownSpellNames, knownSpellKeys }); const candidates = mergeSpellIndexAndDescriptions(stage1.indexRows, stage2.blocks); return { candidates, unmatchedCandidates: stage2.unmatchedCandidates, diagnostics: { sourceFile, sourceBook, sourcePage, pagesUsedForIndex: stage1.diagnostics.pagesUsedForIndex, pagesUsedForDescriptions: stage2.diagnostics.pagesUsedForDescriptions, rejectedHeadings: stage1.diagnostics.rejectedHeadings, headingsDetected: stage1.diagnostics.headingsDetected } }; }
export function toReviewRows(candidates) { return candidates.map((candidate) => ({ sourceBook: candidate.sourceBook || '', sourceFile: candidate.sourceFile || '', sourcePage: candidate.sourcePage || 0, spellName: candidate.spellName || '', spellKey: candidate.spellKey || slugifySpellKey(candidate.spellName), spellClass: candidate.spellClass || '', spellLevel: Number(candidate.spellLevel || 0), range: candidate.range || '', duration: candidate.duration || '', effect: candidate.effect || '', reversible: Boolean(candidate.reversible), reverseName: candidate.reverseName || '', save: candidate.save || '', tags: Array.isArray(candidate.tags) ? candidate.tags : [], manualNotes: candidate.manualNotes || '', confidence: Number(candidate.confidence || 0), needsReview: candidate.needsReview !== false, parseReason: candidate.parseReason || '', rejectReason: candidate.rejectReason || '' })); }
export function sanitizeCanonicalRows(reviewRows) { return reviewRows.map((row) => ({ spellKey: row.spellKey, spellName: row.spellName || row.name, spellClass: row.spellClass, spellLevel: Number(row.spellLevel), range: row.range, duration: row.duration, effect: row.effect, save: row.save, reversible: Boolean(row.reversible), reverseName: row.reverseName || '', tags: Array.isArray(row.tags) ? row.tags : String(row.tags || '').split('|').map((v) => v.trim()).filter(Boolean), summary: String(row.manualNotes || '').slice(0, 280), needsReview: row.needsReview !== false, confidence: Number(row.confidence || 0), source: { sourceBook: row.sourceBook, sourceFile: row.sourceFile || '', sourcePage: row.sourcePage == null ? null : Number(row.sourcePage) } })); }
export function validateCanonicalRows(rows) { const errors = []; const seen = new Set(); rows.forEach((row, index) => { const prefix = `row ${index + 1}`; for (const field of ['spellKey', 'spellName', 'spellClass']) if (!row[field]) errors.push(`${prefix}: missing ${field}`); if (seen.has(row.spellKey)) errors.push(`${prefix}: duplicate spellKey ${row.spellKey}`); seen.add(row.spellKey); if (row.reversible && !row.reverseName) errors.push(`${prefix}: reversible spell missing reverseName`); if (!Array.isArray(row.tags)) errors.push(`${prefix}: tags must be array`); }); return errors; }
