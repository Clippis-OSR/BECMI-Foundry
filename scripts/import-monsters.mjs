import fs from 'node:fs/promises';
import { importMonsterCollection } from '../module/utils/monster-builder.mjs';

const books = ['basic', 'expert'];
const allMonsters = [];

for (const book of books) {
  const json = await fs.readFile(`data/monsters/${book}.json`, 'utf8');
  allMonsters.push(...JSON.parse(json));
}

const summary = await importMonsterCollection(allMonsters, { dryRun: true });
console.log(JSON.stringify(summary, null, 2));
