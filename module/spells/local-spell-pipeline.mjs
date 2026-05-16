const SPELL_HEADING_PATTERN = /^([A-Z][A-Za-z'\- ]{1,80})\s*\(([^)]+)\)$/;
const FIELD_PATTERN = /^(Range|Duration|Effect|Area of Effect|Saving Throw|Save)\s*:\s*(.+)$/i;
const CLASS_SECTION_PATTERN = /(cleric|magic-?user|druid)\s+spells?/i;
const LEVEL_HEADING_PATTERN = /^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|\d+(?:st|nd|rd|th))\s+level\b/i;
const SPELL_LIST_HEADING_PATTERN = /\b(spell list|spells by level|companion spell lists|master spell lists|cleric spells|magic-?user spells|druid spells)\b/i;
const COLUMN_SPLIT_PATTERN = /\s{4,}/;

const ORDINAL_TO_LEVEL = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9,
};

export function slugifySpellKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function analyzeSpellPage({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trimEnd());
  const diagnostics = {
    sourceFile,
    sourceBook,
    sourcePage,
    spellSectionRanges: [],
    hasSpellListHeading: false,
    skippedSpellListPage: false,
    accepted: [],
    rejected: [],
  };

  const candidates = [];
  let currentClass = '';
  let currentLevel = 0;

  if (lines.some((line) => SPELL_LIST_HEADING_PATTERN.test(line))) {
    diagnostics.hasSpellListHeading = true;
  }

  detectSections(lines).forEach((section) => diagnostics.spellSectionRanges.push(section));

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i] || '';
    const line = rawLine.trim();
    if (!line) continue;

    const classMatch = line.match(CLASS_SECTION_PATTERN);
    if (classMatch) currentClass = normalizeClass(classMatch[1]);
    const level = parseLevelHeading(line);
    if (level) currentLevel = level;

    const spellsFromColumns = parsePotentialColumnSpellLine(line);
    if (spellsFromColumns.length > 1 && currentClass && currentLevel) {
      spellsFromColumns.forEach((spellName) => {
        pushCandidate({ spellName, spellClass: currentClass, spellLevel: currentLevel, contextLines: [], sourceBook, sourceFile, sourcePage, candidates, diagnostics, reason: 'column-list-detected' });
      });
      continue;
    }

    const headingMatch = line.match(SPELL_HEADING_PATTERN);
    const looksLikeNameOnly = /^[A-Z][A-Za-z'\-* ]{2,50}$/.test(line) && i + 1 < lines.length && FIELD_PATTERN.test((lines[i + 1] || '').trim());

    if (!headingMatch && !looksLikeNameOnly) continue;

    const spellName = headingMatch ? headingMatch[1].trim() : line.trim();
    const classLevel = headingMatch ? headingMatch[2] : '';
    const classLevelMatch = classLevel.match(/([A-Za-z\- ]+)\s*(?:Level|level)\s*(\d+)/);
    const parsedClass = classLevelMatch?.[1] ? normalizeClass(classLevelMatch[1]) : currentClass;
    const parsedLevel = classLevelMatch?.[2] ? Number.parseInt(classLevelMatch[2], 10) : currentLevel;

    const sectionLines = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const nextLine = (lines[j] || '').trim();
      if (!nextLine) continue;
      if (SPELL_HEADING_PATTERN.test(nextLine)) break;
      if (LEVEL_HEADING_PATTERN.test(nextLine) && sectionLines.length > 0) break;
      if (/^[A-Z][A-Za-z'\- ]{2,50}$/.test(nextLine) && FIELD_PATTERN.test((lines[j + 1] || '').trim())) break;
      sectionLines.push(nextLine);
      if (sectionLines.length >= 18) break;
    }

    pushCandidate({
      spellName,
      spellClass: parsedClass || 'unknown',
      spellLevel: Number.isFinite(parsedLevel) ? parsedLevel : 0,
      contextLines: sectionLines,
      sourceBook,
      sourceFile,
      sourcePage,
      candidates,
      diagnostics,
      reason: headingMatch ? 'heading-detected' : 'name-then-fields-detected',
    });
  }

  if (diagnostics.hasSpellListHeading && candidates.length === 0) diagnostics.skippedSpellListPage = true;

  return { candidates, diagnostics };
}

export function detectSpellCandidatesFromText({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) {
  return analyzeSpellPage({ text, sourceFile, sourceBook, sourcePage }).candidates;
}

function pushCandidate({ spellName, spellClass, spellLevel, contextLines, sourceBook, sourceFile, sourcePage, candidates, diagnostics, reason }) {
  const range = extractField(contextLines, 'Range');
  const duration = extractField(contextLines, 'Duration');
  const effect = extractField(contextLines, 'Effect') || extractField(contextLines, 'Area of Effect');
  const save = extractField(contextLines, 'Saving Throw') || extractField(contextLines, 'Save');
  const reversible = /(reversible|reverse|\*)/i.test(contextLines.join(' ')) || /\*$/.test(spellName);
  const reverseNameMatch = contextLines.join(' ').match(/(?:reverse(?:d)?\s+as|reversed?\s+to)\s+([A-Z][A-Za-z'\- ]+)/i);

  const normalizedName = spellName.replace(/\*+$/, '').trim();
  const score = scoreCandidate({ normalizedName, spellClass, spellLevel, range, duration, effect, save, contextLines, reversible });
  const accepted = score >= 0.35 && normalizedName.split(/\s+/).length <= 6;
  const candidate = {
    sourceBook,
    sourceFile,
    sourcePage,
    spellName: normalizedName,
    spellKey: slugifySpellKey(normalizedName),
    spellClass,
    spellLevel,
    range: range || '',
    duration: duration || '',
    effect: effect || '',
    reversible,
    reverseName: reverseNameMatch?.[1]?.trim() || '',
    save: save || '',
    tags: [],
    manualNotes: '',
    confidence: Number(score.toFixed(2)),
    needsReview: true,
    privateExcerpt: contextLines.slice(0, 6).join(' '),
    accepted,
    parseReason: reason,
    rejectReason: accepted ? '' : deriveRejectReason({ score, spellClass, spellLevel, normalizedName, contextLines }),
  };

  if (accepted) {
    candidates.push(candidate);
    diagnostics.accepted.push({ spellName: normalizedName, confidence: candidate.confidence, reason });
  } else {
    diagnostics.rejected.push({ spellName: normalizedName, confidence: candidate.confidence, reason: candidate.rejectReason || 'low-confidence' });
  }
}

function deriveRejectReason({ score, spellClass, spellLevel, normalizedName, contextLines }) {
  if (score < 0.2) return 'very-low-confidence';
  if (!spellClass || spellClass === 'unknown') return 'missing-spell-class';
  if (!spellLevel) return 'missing-spell-level';
  if (normalizedName.length < 3) return 'short-name';
  if (contextLines.length === 0) return 'no-field-context';
  return 'low-confidence';
}

function scoreCandidate({ normalizedName, spellClass, spellLevel, range, duration, effect, save, contextLines, reversible }) {
  let score = 0.15;
  if (normalizedName && /^[A-Z]/.test(normalizedName)) score += 0.2;
  if (spellClass && spellClass !== 'unknown') score += 0.15;
  if (spellLevel > 0) score += 0.15;
  if (range) score += 0.1;
  if (duration) score += 0.1;
  if (effect) score += 0.1;
  if (save) score += 0.05;
  if (reversible) score += 0.05;
  if (contextLines.some((line) => FIELD_PATTERN.test(line))) score += 0.1;
  return Math.min(score, 1);
}

function detectSections(lines) {
  const ranges = [];
  let currentStart = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] || '').trim();
    const inSpellSection = CLASS_SECTION_PATTERN.test(line) || LEVEL_HEADING_PATTERN.test(line) || SPELL_HEADING_PATTERN.test(line);
    if (inSpellSection && currentStart === null) currentStart = i + 1;
    if (!inSpellSection && currentStart !== null && line === '') {
      ranges.push({ startLine: currentStart, endLine: i + 1 });
      currentStart = null;
    }
  }
  if (currentStart !== null) ranges.push({ startLine: currentStart, endLine: lines.length });
  return ranges;
}

function parsePotentialColumnSpellLine(line) {
  if (!/[A-Za-z]/.test(line) || /:/.test(line)) return [];
  const parts = line.split(COLUMN_SPLIT_PATTERN).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return [];
  return parts.filter((p) => /^[A-Z][A-Za-z'\- ]+$/.test(p));
}

function parseLevelHeading(line) {
  const match = line.match(LEVEL_HEADING_PATTERN);
  if (!match) return 0;
  const token = match[1].toLowerCase();
  if (ORDINAL_TO_LEVEL[token]) return ORDINAL_TO_LEVEL[token];
  const digit = token.match(/\d+/);
  return digit ? Number.parseInt(digit[0], 10) : 0;
}

function normalizeClass(value) {
  const lowered = String(value || '').toLowerCase();
  if (lowered.includes('magic')) return 'Magic-User';
  if (lowered.includes('cleric')) return 'Cleric';
  if (lowered.includes('druid')) return 'Druid';
  return value.trim();
}

function extractField(lines, fieldName) {
  const re = new RegExp(`^${fieldName}\\s*:\\s*(.+)$`, 'i');
  for (const line of lines) {
    const m = line.match(re);
    if (m) return m[1].trim();
  }
  return '';
}

export function toReviewRows(candidates) { return candidates.map((candidate) => ({ sourceBook: candidate.sourceBook || '', sourceFile: candidate.sourceFile || '', sourcePage: candidate.sourcePage || 0, spellName: candidate.spellName || '', spellKey: candidate.spellKey || slugifySpellKey(candidate.spellName), spellClass: candidate.spellClass || '', spellLevel: Number(candidate.spellLevel || 0), range: candidate.range || '', duration: candidate.duration || '', effect: candidate.effect || '', reversible: Boolean(candidate.reversible), reverseName: candidate.reverseName || '', save: candidate.save || '', tags: Array.isArray(candidate.tags) ? candidate.tags : [], manualNotes: candidate.manualNotes || '', confidence: Number(candidate.confidence || 0), needsReview: candidate.needsReview !== false, parseReason: candidate.parseReason || '', rejectReason: candidate.rejectReason || '' })); }

export function sanitizeCanonicalRows(reviewRows) { return reviewRows.map((row) => ({ spellKey: row.spellKey, spellName: row.spellName, spellClass: row.spellClass, spellLevel: Number(row.spellLevel), range: row.range, duration: row.duration, effect: row.effect, save: row.save, reversible: Boolean(row.reversible), reverseName: row.reverseName || '', tags: Array.isArray(row.tags) ? row.tags : [], summary: String(row.manualNotes || '').slice(0, 280), source: { sourceBook: row.sourceBook, sourceFile: row.sourceFile, sourcePage: Number(row.sourcePage) } })); }

export function validateCanonicalRows(rows) {
  const errors = []; const seen = new Set();
  rows.forEach((row, index) => { const prefix = `row ${index + 1}`; for (const field of ['spellKey', 'spellName', 'spellClass']) if (!row[field]) errors.push(`${prefix}: missing ${field}`); if (seen.has(row.spellKey)) errors.push(`${prefix}: duplicate spellKey ${row.spellKey}`); seen.add(row.spellKey); if (row.reversible && !row.reverseName) errors.push(`${prefix}: reversible spell missing reverseName`); if (!Array.isArray(row.tags)) errors.push(`${prefix}: tags must be array`); if (typeof row.duration !== 'string' || typeof row.effect !== 'string') errors.push(`${prefix}: duration/effect must be strings`); if ((row.summary || '').length > 320) errors.push(`${prefix}: summary too long`); if(/[\n\r]/.test(row.summary||'')) errors.push(`${prefix}: summary contains line breaks`); if ((row.summary||'').split(/\s+/).length > 60) errors.push(`${prefix}: summary looks too long for sanitized output`); });
  return errors;
}
