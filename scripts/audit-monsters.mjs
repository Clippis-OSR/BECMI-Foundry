import fs from 'node:fs/promises';

const BOOKS = ['basic', 'expert'];

function isDiceLike(value) {
  return /^\d+d\d+(?:\s*[x×*]\s*\d+)?(?:\s*[+-]\s*\d+)?$/i.test(value.trim());
}

function parseDamageSegments(damage) {
  return String(damage || '').split(/[/;,]|\bor\b/i).map((x) => x.trim()).filter(Boolean);
}

function isValidDamage(damage) {
  if (!damage) return false;
  const segments = parseDamageSegments(damage);
  return segments.length > 0 && segments.every((seg) => isDiceLike(seg) || /^by weapon$/i.test(seg) || /^special$/i.test(seg));
}

function isValidMovement(movement) {
  if (!movement) return false;
  return /^\d+(?:\s*\(\d+\))?(?:\s*\/\s*\d+(?:\s*\(\d+\))?)*$/i.test(String(movement).replace(/\s+/g, ' ').trim());
}

function isValidMorale(morale) {
  return Number.isInteger(morale) && morale >= 2 && morale <= 12;
}

function isValidTreasureType(value) {
  if (!value) return false;
  return /^(?:nil|none|[a-z](?:\s*,\s*[a-z])*)$/i.test(String(value).trim());
}

function suspiciousXp(monster) {
  if (!Number.isInteger(monster.xp) || monster.xp <= 0) return true;
  const hdBase = Number.parseFloat(String(monster.hitDice).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(hdBase)) return false;
  return monster.xp < Math.max(5, hdBase * 5) || monster.xp > (hdBase + 1) * 1500;
}

const issues = [];
const all = [];
const idCounts = new Map();
const nameCounts = new Map();

for (const book of BOOKS) {
  const monsters = JSON.parse(await fs.readFile(`data/monsters/${book}.json`, 'utf8'));
  for (const m of monsters) {
    all.push(m);
    idCounts.set(m.id, (idCounts.get(m.id) || 0) + 1);
    nameCounts.set(m.name.toLowerCase(), (nameCounts.get(m.name.toLowerCase()) || 0) + 1);

    if (m.armorClass === null || Number.isNaN(Number(m.armorClass))) issues.push({ type: 'missing-ac', monster: m.name, book });
    if (!m.hitDice) issues.push({ type: 'missing-hd', monster: m.name, book });
    if (!isValidMorale(m.morale)) issues.push({ type: 'malformed-morale', monster: m.name, book, value: m.morale });
    if (!isValidTreasureType(m.treasureType)) issues.push({ type: 'malformed-treasure', monster: m.name, book, value: m.treasureType });
    if (!isValidMovement(m.movement)) issues.push({ type: 'invalid-movement', monster: m.name, book, value: m.movement });
    if (suspiciousXp(m)) issues.push({ type: 'suspicious-xp', monster: m.name, book, value: m.xp });

    if (!Array.isArray(m.attacks) || m.attacks.length === 0) issues.push({ type: 'malformed-attacks', monster: m.name, book, value: m.attacks });
    for (const attack of m.attacks || []) {
      if (!attack.type || !attack.raw) issues.push({ type: 'malformed-attacks', monster: m.name, book, value: attack });
    }
    if (!isValidDamage(m.damage)) issues.push({ type: 'missing-or-malformed-damage', monster: m.name, book, value: m.damage });
  }
}

for (const [id, count] of idCounts.entries()) if (count > 1) issues.push({ type: 'duplicate-id', id, count });
for (const [name, count] of nameCounts.entries()) if (count > 1) issues.push({ type: 'duplicate-name', name, count });

const counts = issues.reduce((acc, issue) => {
  acc[issue.type] = (acc[issue.type] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  scanned: all.length,
  books: BOOKS,
  issueCounts: counts,
  issues
}, null, 2));
