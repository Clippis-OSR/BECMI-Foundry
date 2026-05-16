const SPELL_HEADING_PATTERN = /^([A-Z][A-Za-z'\- ]{1,60})\s*\(([^)]+)\)$/;

export function slugifySpellKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function detectSpellCandidatesFromText({ text = '', sourceFile = '', sourceBook = '', sourcePage = 0 }) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim());
  const candidates = [];
  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i];
    if (!heading) continue;
    const headingMatch = heading.match(SPELL_HEADING_PATTERN);
    if (!headingMatch) continue;
    const name = headingMatch[1].trim();
    const classLevel = headingMatch[2];
    const classLevelMatch = classLevel.match(/([A-Za-z\- ]+)\s*(?:Level|level)\s*(\d+)/);
    const spellClass = classLevelMatch?.[1]?.trim() || 'unknown';
    const spellLevel = Number.parseInt(classLevelMatch?.[2] || '0', 10);

    const sectionLines = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j];
      if (!line) continue;
      if (SPELL_HEADING_PATTERN.test(line)) break;
      sectionLines.push(line);
    }

    const range = extractField(sectionLines, 'Range');
    const duration = extractField(sectionLines, 'Duration');
    const effect = extractField(sectionLines, 'Effect') || extractField(sectionLines, 'Area of Effect');
    const save = extractField(sectionLines, 'Saving Throw') || extractField(sectionLines, 'Save');
    const reversible = /(reversible|reverse)/i.test(sectionLines.join(' '));
    const reverseNameMatch = sectionLines.join(' ').match(/reverse(?:d)?\s+as\s+([A-Z][A-Za-z'\- ]+)/i);

    candidates.push({
      sourceBook,
      sourceFile,
      sourcePage,
      spellName: name,
      spellKey: slugifySpellKey(name),
      spellClass,
      spellLevel: Number.isFinite(spellLevel) ? spellLevel : 0,
      range: range || '',
      duration: duration || '',
      effect: effect || '',
      reversible,
      reverseName: reverseNameMatch?.[1]?.trim() || '',
      save: save || '',
      tags: [],
      manualNotes: '',
      confidence: reversible || range || duration ? 0.8 : 0.5,
      needsReview: true,
      privateExcerpt: sectionLines.slice(0, 6).join(' '),
    });
  }
  return candidates;
}

function extractField(lines, fieldName) {
  const re = new RegExp(`^${fieldName}\\s*:\\s*(.+)$`, 'i');
  for (const line of lines) {
    const m = line.match(re);
    if (m) return m[1].trim();
  }
  return '';
}

export function toReviewRows(candidates) {
  return candidates.map((candidate) => ({
    sourceBook: candidate.sourceBook || '',
    sourceFile: candidate.sourceFile || '',
    sourcePage: candidate.sourcePage || 0,
    spellName: candidate.spellName || '',
    spellKey: candidate.spellKey || slugifySpellKey(candidate.spellName),
    spellClass: candidate.spellClass || '',
    spellLevel: Number(candidate.spellLevel || 0),
    range: candidate.range || '',
    duration: candidate.duration || '',
    effect: candidate.effect || '',
    reversible: Boolean(candidate.reversible),
    reverseName: candidate.reverseName || '',
    save: candidate.save || '',
    tags: Array.isArray(candidate.tags) ? candidate.tags : [],
    manualNotes: candidate.manualNotes || '',
    confidence: Number(candidate.confidence || 0),
    needsReview: candidate.needsReview !== false,
  }));
}

export function sanitizeCanonicalRows(reviewRows) {
  return reviewRows.map((row) => ({
    spellKey: row.spellKey,
    spellName: row.spellName,
    spellClass: row.spellClass,
    spellLevel: Number(row.spellLevel),
    range: row.range,
    duration: row.duration,
    effect: row.effect,
    save: row.save,
    reversible: Boolean(row.reversible),
    reverseName: row.reverseName || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    summary: String(row.manualNotes || '').slice(0, 280),
    source: {
      sourceBook: row.sourceBook,
      sourceFile: row.sourceFile,
      sourcePage: Number(row.sourcePage),
    },
  }));
}

export function validateCanonicalRows(rows) {
  const errors = [];
  const seen = new Set();
  rows.forEach((row, index) => {
    const prefix = `row ${index + 1}`;
    for (const field of ['spellKey', 'spellName', 'spellClass']) {
      if (!row[field]) errors.push(`${prefix}: missing ${field}`);
    }
    if (seen.has(row.spellKey)) errors.push(`${prefix}: duplicate spellKey ${row.spellKey}`);
    seen.add(row.spellKey);
    if (row.reversible && !row.reverseName) errors.push(`${prefix}: reversible spell missing reverseName`);
    if (!Array.isArray(row.tags)) errors.push(`${prefix}: tags must be array`);
    if (typeof row.duration !== 'string' || typeof row.effect !== 'string') errors.push(`${prefix}: duration/effect must be strings`);
    if ((row.summary || '').length > 320) errors.push(`${prefix}: summary too long`);
    if (/[\n\r]/.test(row.summary || '')) errors.push(`${prefix}: summary contains line breaks`);
    if ((row.summary || '').split(/\s+/).length > 60) errors.push(`${prefix}: summary looks too long for sanitized output`);
  });
  return errors;
}
