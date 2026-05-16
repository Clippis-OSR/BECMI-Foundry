const SPELL_HEADING_PATTERN = /^([A-Z][A-Za-z'\- ]{1,80})\s*\(([^)]+)\)$/;
const FIELD_PATTERN = /^(Range|Duration|Effect|Area of Effect|Saving Throw|Save)\s*:\s*(.+)$/i;
const COLUMN_SPLIT_PATTERN = /\s{4,}/;
const NOISE_SECTION_PATTERN = /\b(equipment|combat|monsters?|treasure|hit charts?|dominion|war machine|siege)\b/i;
const SPELL_SECTION_HEADER_PATTERN = /^(?:(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|\d+(?:st|nd|rd|th))\s*[- ]*level\s+(cleric|magic-?user|druid)\s+spells?|((?:cleric|magic-?user|druid))\s+spells?\s*[-:]?\s*(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|\d+(?:st|nd|rd|th))\s*[- ]*level)$/i;

const ORDINAL_TO_LEVEL = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9 };

const CLASS_ONLY_HEADING = /^(cleric|magic-?user|druid)\s+spells?$/i;
const LEVEL_ONLY_HEADING = /^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|\d+(?:st|nd|rd|th))\s+level$/i;

export function slugifySpellKey(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

export function analyzeSpellPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trimEnd());
  const diagnostics = { sourceFile, sourceBook, sourcePage, spellSectionRanges: [], detectedHeadings: [], hasSpellSections: false, accepted: [], rejected: [], falsePositiveLikeHeadings: [] };
  const sections = detectSpellSections(lines);
  diagnostics.spellSectionRanges = sections.map((s) => ({ startLine: s.start + 1, endLine: s.end + 1, spellClass: s.spellClass, spellLevel: s.spellLevel }));
  diagnostics.detectedHeadings = sections.map((s) => ({ line: s.start + 1, heading: s.heading }));
  diagnostics.hasSpellSections = sections.length > 0;

  const candidates = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] || '').trim();
    const headingMatch = line.match(SPELL_HEADING_PATTERN);
    if (!headingMatch) continue;
    const classLevelMatch = (headingMatch[2] || '').match(/([A-Za-z\- ]+)\s*(?:Level|level)\s*(\d+)/);
    if (!classLevelMatch) continue;
    const contextLines = collectContext(lines, i, lines.length - 1);
    pushCandidate({ spellName: headingMatch[1].trim(), spellClass: normalizeClass(classLevelMatch[1]), spellLevel: Number.parseInt(classLevelMatch[2],10), contextLines, sourceBook, sourceFile, sourcePage, candidates, diagnostics, reason: 'global-heading-detected' });
  }
  for (const section of sections) {
    for (let i = section.start + 1; i <= section.end; i += 1) {
      const line = (lines[i] || '').trim();
      if (!line) continue;
      if (NOISE_SECTION_PATTERN.test(line)) break;
      const spellsFromColumns = parsePotentialColumnSpellLine(line);
      if (spellsFromColumns.length > 0) {
        spellsFromColumns.forEach((spellName) => pushCandidate({ spellName, spellClass: section.spellClass, spellLevel: section.spellLevel, contextLines: [], sourceBook, sourceFile, sourcePage, candidates, diagnostics, reason: 'column-list-detected' }));
        continue;
      }
      const headingMatch = line.match(SPELL_HEADING_PATTERN);
      const looksLikeNameOnly = /^[A-Z][A-Za-z'* -]{2,60}$/.test(line) && i + 1 <= section.end && FIELD_PATTERN.test((lines[i + 1] || '').trim());
      if (!headingMatch && !looksLikeNameOnly) continue;
      const spellName = headingMatch ? headingMatch[1].trim() : line.trim();
      const classLevel = headingMatch ? headingMatch[2] : '';
      const classLevelMatch = classLevel.match(/([A-Za-z\- ]+)\s*(?:Level|level)\s*(\d+)/);
      const parsedClass = classLevelMatch?.[1] ? normalizeClass(classLevelMatch[1]) : section.spellClass;
      const parsedLevel = classLevelMatch?.[2] ? Number.parseInt(classLevelMatch[2], 10) : section.spellLevel;
      const contextLines = collectContext(lines, i, section.end);
      pushCandidate({ spellName, spellClass: parsedClass || 'unknown', spellLevel: Number.isFinite(parsedLevel) ? parsedLevel : 0, contextLines, sourceBook, sourceFile, sourcePage, candidates, diagnostics, reason: headingMatch ? 'heading-detected' : 'name-then-fields-detected' });
    }
  }

  diagnostics.falsePositiveLikeHeadings = lines
    .filter((ln) => /^[A-Z][A-Z\s-]{4,}$/.test(ln.trim()) || NOISE_SECTION_PATTERN.test(ln))
    .map((ln) => ln.trim())
    .filter(Boolean)
    .slice(0, 30);

  return { candidates, diagnostics };
}

function collectContext(lines, start, end) { const out = []; for (let j = start + 1; j <= end; j += 1) { const n = (lines[j] || '').trim(); if (!n) continue; if (SPELL_HEADING_PATTERN.test(n)) break; if (/^[A-Z][A-Za-z'\- ]{2,50}$/.test(n) && FIELD_PATTERN.test((lines[j + 1] || '').trim())) break; if (parseSpellSectionHeading(n)) break; out.push(n); if (out.length >= 18) break; } return out; }

export function detectSpellCandidatesFromText({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) { return analyzeSpellPage({ text, sourceFile, sourceBook, sourcePage }).candidates; }

function detectSpellSections(lines) {
  const sections = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] || '').trim();
    let parsed = parseSpellSectionHeading(line);
    if (!parsed) {
      const c = line.match(CLASS_ONLY_HEADING);
      const l = ((lines[i + 1] || '').trim()).match(LEVEL_ONLY_HEADING);
      if (c && l) {
        parsed = { spellClass: normalizeClass(c[1]), spellLevel: parseLevelToken(l[1]) };
      }
    }
    if (!parsed) continue;
    let end = lines.length - 1;
    for (let j = i + 1; j < lines.length; j += 1) {
      const l = (lines[j] || '').trim();
      if (parseSpellSectionHeading(l) || NOISE_SECTION_PATTERN.test(l)) { end = j - 1; break; }
    }
    sections.push({ start: i, end, ...parsed, heading: (lines[i] || '').trim() });
  }
  return sections;
}
function parseSpellSectionHeading(line) {
  const m = line.match(SPELL_SECTION_HEADER_PATTERN);
  if (!m) return null;
  const levelTok = (m[1] || m[4] || '').toLowerCase();
  const clsTok = (m[2] || m[3] || '').toLowerCase();
  return { spellLevel: parseLevelToken(levelTok), spellClass: normalizeClass(clsTok) };
}
function parseLevelToken(token) { if (!token) return 0; if (ORDINAL_TO_LEVEL[token]) return ORDINAL_TO_LEVEL[token]; const d = token.match(/\d+/); return d ? Number.parseInt(d[0], 10) : 0; }
function parsePotentialColumnSpellLine(line) { if (!/[A-Za-z]/.test(line) || /:/.test(line)) return []; const parts = line.split(COLUMN_SPLIT_PATTERN).map((p) => p.trim()).filter(Boolean); if (parts.length < 2) return []; return parts.filter((p) => /^[A-Z][A-Za-z'\- ]+$/.test(p)); }

function pushCandidate({ spellName, spellClass, spellLevel, contextLines, sourceBook, sourceFile, sourcePage, candidates, diagnostics, reason }) { const range = extractField(contextLines, 'Range'); const duration = extractField(contextLines, 'Duration'); const effect = extractField(contextLines, 'Effect') || extractField(contextLines, 'Area of Effect'); const save = extractField(contextLines, 'Saving Throw') || extractField(contextLines, 'Save'); const reversible = /(reversible|reverse|\*)/i.test(contextLines.join(' ')) || /\*$/.test(spellName); const reverseNameMatch = contextLines.join(' ').match(/(?:reverse(?:d)?\s+as|reversed?\s+to)\s+([A-Z][A-Za-z'\- ]+)/i); const normalizedName = spellName.replace(/\*+$/, '').trim(); const score = scoreCandidate({ normalizedName, spellClass, spellLevel, range, duration, effect, save, contextLines, reversible }); const accepted = score >= 0.45 && normalizedName.split(/\s+/).length <= 6; const candidate = { sourceBook, sourceFile, sourcePage, spellName: normalizedName, spellKey: slugifySpellKey(normalizedName), spellClass, spellLevel, range: range || '', duration: duration || '', effect: effect || '', reversible, reverseName: reverseNameMatch?.[1]?.trim() || '', save: save || '', tags: [], manualNotes: '', confidence: Number(score.toFixed(2)), needsReview: true, privateExcerpt: contextLines.slice(0, 6).join(' '), accepted, parseReason: reason, rejectReason: accepted ? '' : deriveRejectReason({ score, spellClass, spellLevel, normalizedName, contextLines }) };
if (accepted) { candidates.push(candidate); diagnostics.accepted.push({ spellName: normalizedName, confidence: candidate.confidence, reason }); } else { diagnostics.rejected.push({ spellName: normalizedName, confidence: candidate.confidence, reason: candidate.rejectReason || 'low-confidence' }); } }
function deriveRejectReason({ score, spellClass, spellLevel, normalizedName, contextLines }) { if (score < 0.2) return 'very-low-confidence'; if (!spellClass || spellClass === 'unknown') return 'missing-spell-class'; if (!spellLevel) return 'missing-spell-level'; if (normalizedName.length < 3) return 'short-name'; if (contextLines.length === 0) return 'no-field-context'; return 'low-confidence'; }
function scoreCandidate({ normalizedName, spellClass, spellLevel, range, duration, effect, save, contextLines, reversible }) { let score = 0.1; if (normalizedName && /^[A-Z]/.test(normalizedName)) score += 0.2; if (spellClass && spellClass !== 'unknown') score += 0.2; if (spellLevel > 0) score += 0.2; if (range) score += 0.1; if (duration) score += 0.1; if (effect) score += 0.1; if (save) score += 0.05; if (reversible) score += 0.05; if (contextLines.some((line) => FIELD_PATTERN.test(line))) score += 0.1; return Math.min(score, 1); }
function normalizeClass(value) { const lowered = String(value || '').toLowerCase(); if (lowered.includes('magic')) return 'Magic-User'; if (lowered.includes('cleric')) return 'Cleric'; if (lowered.includes('druid')) return 'Druid'; return 'unknown'; }
function extractField(lines, fieldName) { const re = new RegExp(`^${fieldName}\\s*:\\s*(.+)$`, 'i'); for (const line of lines) { const m = line.match(re); if (m) return m[1].trim(); } return ''; }
export function toReviewRows(candidates) { return candidates.map((candidate) => ({ sourceBook: candidate.sourceBook || '', sourceFile: candidate.sourceFile || '', sourcePage: candidate.sourcePage || 0, spellName: candidate.spellName || '', spellKey: candidate.spellKey || slugifySpellKey(candidate.spellName), spellClass: candidate.spellClass || '', spellLevel: Number(candidate.spellLevel || 0), range: candidate.range || '', duration: candidate.duration || '', effect: candidate.effect || '', reversible: Boolean(candidate.reversible), reverseName: candidate.reverseName || '', save: candidate.save || '', tags: Array.isArray(candidate.tags) ? candidate.tags : [], manualNotes: candidate.manualNotes || '', confidence: Number(candidate.confidence || 0), needsReview: candidate.needsReview !== false, parseReason: candidate.parseReason || '', rejectReason: candidate.rejectReason || '' })); }
export function sanitizeCanonicalRows(reviewRows) { return reviewRows.map((row) => ({ spellKey: row.spellKey, spellName: row.spellName, spellClass: row.spellClass, spellLevel: Number(row.spellLevel), range: row.range, duration: row.duration, effect: row.effect, save: row.save, reversible: Boolean(row.reversible), reverseName: row.reverseName || '', tags: Array.isArray(row.tags) ? row.tags : [], summary: String(row.manualNotes || '').slice(0, 280), source: { sourceBook: row.sourceBook, sourceFile: row.sourceFile, sourcePage: Number(row.sourcePage) } })); }
export function validateCanonicalRows(rows) { const errors = []; const seen = new Set(); rows.forEach((row, index) => { const prefix = `row ${index + 1}`; for (const field of ['spellKey', 'spellName', 'spellClass']) if (!row[field]) errors.push(`${prefix}: missing ${field}`); if (seen.has(row.spellKey)) errors.push(`${prefix}: duplicate spellKey ${row.spellKey}`); seen.add(row.spellKey); if (row.reversible && !row.reverseName) errors.push(`${prefix}: reversible spell missing reverseName`); if (!Array.isArray(row.tags)) errors.push(`${prefix}: tags must be array`); if (typeof row.duration !== 'string' || typeof row.effect !== 'string') errors.push(`${prefix}: duration/effect must be strings`); if ((row.summary || '').length > 320) errors.push(`${prefix}: summary too long`); if(/[\n\r]/.test(row.summary||'')) errors.push(`${prefix}: summary contains line breaks`); if ((row.summary||'').split(/\s+/).length > 60) errors.push(`${prefix}: summary looks too long for sanitized output`); }); return errors; }
