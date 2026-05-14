import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

function splitCsvLine(line, delimiter = ';') {
  const out = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (c === delimiter && !quoted) {
      out.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  out.push(current.trim());
  return out;
}

function parseXlsxRows(filePath) {
  const script = `import json,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
path=Path(r'''${filePath}''')
ns={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(path) as z:
 s=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  root=ET.fromstring(z.read('xl/sharedStrings.xml'))
  for si in root.findall('.//x:si',ns):
   s.append(''.join(t.text or '' for t in si.findall('.//x:t',ns)))
 sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
 rows=[]
 for r in sheet.findall('.//x:sheetData/x:row',ns):
  vals=[]
  for c in r.findall('x:c',ns):
   t=c.get('t')
   v=c.find('x:v',ns)
   is_t=c.find('x:is/x:t',ns)
   if t=='s' and v is not None:
    idx=int(v.text or '0')
    vals.append(s[idx] if 0 <= idx < len(s) else '')
   elif is_t is not None:
    vals.append(is_t.text or '')
   else:
    vals.append(v.text if v is not None and v.text is not None else '')
  rows.append(vals)
print(json.dumps(rows))`;
  const out = execFileSync('python', ['-c', script], { encoding: 'utf8' });
  return JSON.parse(out);
}

export async function parseMonsterCsv(filePath) {
  const buf = await fs.readFile(filePath);
  if (buf.slice(0, 2).toString('binary') === 'PK') {
    const rows = parseXlsxRows(filePath).filter((r) => r.length);
    const [headers, ...body] = rows;
    return body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
  }

  const raw = buf.toString('utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => line.trim().length > 0);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
  });
}

export function parseMonsterAttacks(input) {
  if (!input) return [];
  const normalized = String(input).trim();
  if (!normalized) return [];

  const expanded = normalized
    .replace(/\band\b/gi, '/')
    .replace(/\s*\+\s*/g, '/')
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);

  return expanded.map((part) => {
    const clean = part.replace(/\(.*?\)/g, '').trim();
    const simple = clean.toLowerCase();

    if (simple === 'special' || simple === 'by weapon') {
      return { type: simple, count: 1, raw: part };
    }

    const m = clean.match(/^(\d+)\s+(.+)$/i);
    const count = m ? Number(m[1]) : 1;
    const name = (m ? m[2] : clean).trim();
    return { type: name.toLowerCase(), count, raw: part };
  });
}

export function parseMonsterMovement(input) {
  const raw = String(input || '').replace(/\s+/g, ' ').trim();
  const modePatterns = [
    { key: 'move', rx: /(?:^|\b)(?:move|mv)?\s*[:=]?\s*(\d+(?:\s*\(\s*\d+\s*\))?)/i },
    { key: 'fly', rx: /\bfly\s*[:=]?\s*(\d+(?:\s*\(\s*\d+\s*\))?)/i },
    { key: 'swim', rx: /\bswim\s*[:=]?\s*(\d+(?:\s*\(\s*\d+\s*\))?)/i },
    { key: 'burrow', rx: /\bburrow\s*[:=]?\s*(\d+(?:\s*\(\s*\d+\s*\))?)/i },
    { key: 'climb', rx: /\bclimb\s*[:=]?\s*(\d+(?:\s*\(\s*\d+\s*\))?)/i }
  ];
  const modes = {};
  for (const { key, rx } of modePatterns) {
    const m = raw.match(rx);
    if (m) modes[key] = m[1].replace(/\s+/g, '');
  }

  if (!modes.move) {
    const base = raw.match(/^\d+(?:\s*\(\s*\d+\s*\))?/);
    if (base) modes.move = base[0].replace(/\s+/g, '');
  }

  return { raw, modes };
}
export function parseMonsterAlignment(input) { return String(input || '').trim(); }
export function parseMonsterTreasureType(input) { return String(input || '').trim(); }
export function parseMonsterHitDice(input) { return String(input || '').trim(); }

function toInt(v) { const n = Number.parseInt(String(v).trim(), 10); return Number.isNaN(n) ? null : n; }

export function parseMonsterDamage(input) {
  const raw = String(input || '').trim();
  const segments = raw.split(/[/;,]|\bor\b/i).map((s) => s.trim()).filter(Boolean);
  const parsed = segments.map((segment) => {
    const diceMatch = segment.match(/\d+d\d+(?:\s*[x×*]\s*\d+)?(?:\s*[+-]\s*\d+)?/i);
    const dice = diceMatch ? diceMatch[0].replace(/\s+/g, '') : null;
    const rider = dice ? segment.replace(diceMatch[0], '').replace(/^[+\-,:\s]+|[+\-,:\s]+$/g, '').trim() : segment;
    return { raw: segment, dice, rider: rider || null };
  });
  return { raw, parsed };
}

export function parseMonsterTreasure(input) {
  const raw = String(input || '').trim();
  const normalizedCodes = [];
  for (const token of raw.split(/[+,]/).map((t) => t.trim()).filter(Boolean)) {
    const matches = token.match(/\b[A-P]\b|\([A-P]\)/gi) || [];
    for (const code of matches) normalizedCodes.push(code.replace(/[()]/g, '').toUpperCase());
  }
  return { raw, normalizedCodes };
}

export function normalizeMonsterRow(row, { sourceBook, onWarning = () => {} } = {}) {
  const name = row.Name?.trim();
  const hitDice = parseMonsterHitDice(row['Hit Dice']);
  const armorClass = toInt(row.AC);
  if (!name || !hitDice || armorClass === null) {
    onWarning(`Invalid row skipped: ${name || '<unnamed>'}`);
    return null;
  }

  let attacks = [];
  try { attacks = parseMonsterAttacks(row.Attack); } catch {
    onWarning(`Malformed attack row for ${name}`);
  }

  const movement = parseMonsterMovement(row.Move);
  const damage = parseMonsterDamage(row.Damage);
  const treasure = parseMonsterTreasure(row['Tresure Type'] || row['Treasure Type']);

  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    name,
    sourceBook,
    sourcePage: null,
    armorClass,
    hitDice,
    movement: movement.raw,
    movementModes: movement.modes,
    attacks,
    damage: damage.raw,
    damageParts: damage.parsed,
    numberAppearing: String(row['No. Appering '] || row['No. Appearing'] || '').trim(),
    saveAs: String(row['Save As'] || '').trim(),
    morale: toInt(row.Morale),
    treasureType: parseMonsterTreasureType(row['Tresure Type'] || row['Treasure Type']),
    treasure,
    alignment: parseMonsterAlignment(row.Aligment || row.Alignment),
    xp: toInt(row['XP Value']),
    specialAbilities: String(row.Special || '').trim(),
    notes: String(row.Notes || row.Special || '').trim(),
    actorType: 'creature'
  };
}

export async function buildMonsterCatalog(entries) {
  const warnings = [];
  const duplicates = [];
  const seen = new Set();
  const out = {};

  for (const entry of entries) {
    const rows = await parseMonsterCsv(entry.file);
    const monsters = [];
    for (const row of rows) {
      const canonical = normalizeMonsterRow(row, { sourceBook: entry.sourceBook, onWarning: (w) => warnings.push(w) });
      if (!canonical) continue;
      if (seen.has(canonical.name.toLowerCase())) duplicates.push(canonical.name);
      seen.add(canonical.name.toLowerCase());
      monsters.push(canonical);
    }
    out[entry.key] = monsters;
  }

  return { out, warnings, duplicates };
}
