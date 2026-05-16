import fs from 'node:fs/promises';
import { buildMonsterCatalog } from '../module/utils/monster-parser.mjs';
import { buildMonsterCompendium, importMonsterData, validateMonsterCompendiumIntegrity } from '../module/monsters/monster-compendium.mjs';
import { clearMonsterIndexes } from '../module/monsters/monster-index.mjs';

const result = await buildMonsterCatalog([
  { key: 'basic', sourceBook: 'Basic', file: 'data/raw-monsters/basic.csv' },
  { key: 'expert', sourceBook: 'Expert', file: 'data/raw-monsters/expert.csv' }
]);

const sourceMonsters = [...result.out.basic, ...result.out.expert].map((monster) => ({
  monsterKey: monster.monsterKey,
  schemaVersion: 1,
  name: monster.name,
  source: { book: monster.raw?.sourceBook ?? '', page: monster.raw?.sourcePage ?? '', notes: '' },
  ac: monster.armorClass,
  hitDice: monster.hitDice,
  movement: monster.raw?.movement ?? '',
  movementModes: monster.movement ?? {},
  attacks: monster.attacks ?? [],
  damage: (() => {
    const asDice = (monster.damage ?? []).map((d) => d.dice).filter(Boolean).join('/');
    return asDice || (monster.raw?.damage ?? '').trim() || 'special';
  })(),
  damageParts: (monster.damage ?? []).map((d) => ({ raw: d.dice ?? d.rider ?? '', dice: d.dice ?? null, rider: d.rider ?? null })),
  numberAppearing: monster.numberAppearing ?? '',
  saveAs: /^[A-Z]+\d+$/.test(monster.saveAs ?? '') ? monster.saveAs : 'F1',
  morale: monster.morale ?? null,
  treasureType: monster.treasureType ?? '',
  treasure: { raw: monster.raw?.treasure ?? '', normalizedCodes: monster.raw?.treasureCodes ?? [] },
  alignment: monster.alignment ?? '',
  xp: monster.XP ?? null,
  specialAbilities: (monster.riders ?? []).join('; '),
  description: { text: '', notes: monster.notes ?? '' },
  notes: monster.notes ?? ''
}));

clearMonsterIndexes();
const { monsters } = importMonsterData(sourceMonsters);
const entries = buildMonsterCompendium(monsters);
validateMonsterCompendiumIntegrity(entries);

await fs.mkdir('data/monsters', { recursive: true });
await fs.writeFile('data/monsters/basic.json', JSON.stringify(result.out.basic, null, 2));
await fs.writeFile('data/monsters/expert.json', JSON.stringify(result.out.expert, null, 2));
await fs.writeFile('data/monsters/compendium.json', JSON.stringify(entries, null, 2));
await fs.writeFile('data/monsters/index.json', JSON.stringify({ books: ['basic', 'expert'], total: entries.length, keys: entries.map((entry) => entry.system.monsterKey) }, null, 2));

console.log(JSON.stringify({
  parsed: result.out.basic.length + result.out.expert.length,
  basic: result.out.basic.length,
  expert: result.out.expert.length,
  compendium: entries.length,
  skipped: result.warnings.length,
  duplicates: result.duplicates
}, null, 2));
