import fs from 'node:fs/promises';
import { buildMonsterCatalog } from '../module/utils/monster-parser.mjs';

const result = await buildMonsterCatalog([
  { key: 'basic', sourceBook: 'Basic', file: 'data/raw-monsters/Basic-monsters.csv' },
  { key: 'expert', sourceBook: 'Expert', file: 'data/raw-monsters/Expert-monster.csv' }
]);

await fs.mkdir('data/monsters', { recursive: true });
await fs.writeFile('data/monsters/basic.json', JSON.stringify(result.out.basic, null, 2));
await fs.writeFile('data/monsters/expert.json', JSON.stringify(result.out.expert, null, 2));
await fs.writeFile('data/monsters/index.json', JSON.stringify({ books: ['basic', 'expert'] }, null, 2));

console.log(JSON.stringify({
  parsed: result.out.basic.length + result.out.expert.length,
  basic: result.out.basic.length,
  expert: result.out.expert.length,
  skipped: result.warnings.length,
  duplicates: result.duplicates
}, null, 2));
