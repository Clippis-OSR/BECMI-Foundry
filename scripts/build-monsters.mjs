import fs from 'node:fs/promises';
import { buildMonsterCatalog } from '../module/utils/monster-parser.mjs';
import { buildMonsterCompendium, importMonsterData, validateMonsterCompendiumIntegrity } from '../module/monsters/monster-compendium.mjs';
import { clearMonsterIndexes } from '../module/monsters/monster-index.mjs';

const result = await buildMonsterCatalog([
  { key: 'basic', sourceBook: 'Basic', file: 'data/raw-monsters/basic.csv' },
  { key: 'expert', sourceBook: 'Expert', file: 'data/raw-monsters/expert.csv' }
]);

const sourceMonsters = [...result.out.basic, ...result.out.expert].map((monster) => ({
  monsterKey: String(monster.id).replace(/-/g, '_'),
  schemaVersion: 1,
  name: monster.name,
  source: { book: monster.sourceBook, page: monster.sourcePage ?? '', notes: '' },
  ac: monster.armorClass,
  hitDice: monster.hitDice,
  movement: monster.movement,
  movementModes: monster.movementModes ?? {},
  attacks: monster.attacks ?? [],
  damage: monster.damage ?? '',
  damageParts: monster.damageParts ?? [],
  numberAppearing: monster.numberAppearing ?? '',
  saveAs: monster.saveAs ?? '',
  morale: monster.morale ?? null,
  treasureType: monster.treasureType ?? '',
  treasure: monster.treasure ?? { raw: '', normalizedCodes: [] },
  alignment: monster.alignment ?? '',
  xp: monster.xp ?? null,
  specialAbilities: monster.specialAbilities ?? '',
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
