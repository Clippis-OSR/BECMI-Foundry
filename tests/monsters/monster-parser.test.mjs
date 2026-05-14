import fs from 'node:fs/promises';
import { describe, it, expect } from 'vitest';
import { parseMonsterCsv, normalizeMonsterRow, parseMonsterAttacks, buildMonsterCatalog } from '../../module/utils/monster-parser.mjs';

describe('monster parser', () => {
  it('parses csv/xlsx rows', async () => {
    const basic = await parseMonsterCsv('data/raw-monsters/basic.csv');
    const expert = await parseMonsterCsv('data/raw-monsters/expert.csv');
    expect(basic.length).toBeGreaterThan(0);
    expect(expert.length).toBeGreaterThan(0);
  });

  it('ignores avgHP in canonical output', () => {
    const row = { Name: 'Goblin', AC: '6', 'Hit Dice': '1-1', 'HP (Avg)': '4', Attack: '1 Weapon', Damage: '1d6' };
    const out = normalizeMonsterRow(row, { sourceBook: 'Basic' });
    expect(out).not.toHaveProperty('avgHP');
    expect(Object.keys(out).join(',')).not.toContain('HP (Avg)');
  });

  it('parses attacks structure', () => {
    const attacks = parseMonsterAttacks('2 Claws/1 Bite');
    expect(attacks[0]).toMatchObject({ type: 'claws', count: 2 });
    expect(attacks[1]).toMatchObject({ type: 'bite', count: 1 });
  });

  it('handles malformed/invalid rows without crashing', () => {
    const warn = [];
    const out = normalizeMonsterRow({ Name: '', AC: 'x', 'Hit Dice': '' }, { sourceBook: 'Basic', onWarning: (w) => warn.push(w) });
    expect(out).toBeNull();
    expect(warn.length).toBeGreaterThan(0);
  });



  it('rejects PK-zip signatures for .csv raw monster files', async () => {
    const files = ['data/raw-monsters/basic.csv', 'data/raw-monsters/expert.csv'];
    for (const file of files) {
      const head = await fs.readFile(file);
      const sig = head.subarray(0, 2).toString('utf8');
      expect(sig, `${file} appears to be an XLSX/ZIP container`).not.toBe('PK');
    }
  });

  it('build output is deterministic across runs', async () => {
    const first = await buildMonsterCatalog([
      { key: 'basic', sourceBook: 'Basic', file: 'data/raw-monsters/basic.csv' },
      { key: 'expert', sourceBook: 'Expert', file: 'data/raw-monsters/expert.csv' }
    ]);
    const second = await buildMonsterCatalog([
      { key: 'basic', sourceBook: 'Basic', file: 'data/raw-monsters/basic.csv' },
      { key: 'expert', sourceBook: 'Expert', file: 'data/raw-monsters/expert.csv' }
    ]);
    expect(JSON.stringify(first.out)).toBe(JSON.stringify(second.out));
    expect(JSON.stringify(first.duplicates)).toBe(JSON.stringify(second.duplicates));
  });

  it('reports duplicates', async () => {
    const result = await buildMonsterCatalog([
      { key: 'a', sourceBook: 'A', file: 'data/raw-monsters/expert.csv' },
      { key: 'b', sourceBook: 'B', file: 'data/raw-monsters/expert.csv' }
    ]);
    expect(result.duplicates.length).toBeGreaterThan(0);
  });

  it('canonical shape contains required fields', () => {
    const out = normalizeMonsterRow({ Name: 'Orc', AC: '6', 'Hit Dice': '1', Move: '120(40)', Attack: '1 Weapon', Damage: '1d6', 'Save As': 'F1', Morale: '8', 'Tresure Type': 'C', Aligment: 'Chaotic', 'XP Value': '10' }, { sourceBook: 'Basic' });
    for (const field of ['id', 'name', 'sourceBook', 'armorClass', 'hitDice', 'movement', 'attacks', 'damage']) {
      expect(out).toHaveProperty(field);
    }
  });
});
