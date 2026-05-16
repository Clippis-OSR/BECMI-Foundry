import { validateMonsterSchema } from './monster-validation.mjs';

function asNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseMovement(raw) {
  const text = String(raw ?? '').trim();
  const match = text.match(/(\d+)\s*(?:'|feet)?\s*\(?\s*(\d+)?/i);
  if (!match) return { raw: text, feetPerTurn: null, feetPerRound: null };
  return {
    raw: text,
    feetPerTurn: asNumberOrNull(match[1]),
    feetPerRound: asNumberOrNull(match[2])
  };
}

export function buildNaturalAttackItemsFromMonster(monster) {
  const system = monster?.system ?? monster;
  const attacks = normalizeMonsterAttacks(system.attacks);
  return attacks.map((attack, index) => {
    const count = Number(attack?.count ?? 1) || 1;
    const type = String(attack?.type ?? 'natural attack').trim() || 'natural attack';
    const sequence = Array.isArray(attack?.sequence) ? attack.sequence.map((part) => String(part).trim()).filter(Boolean) : null;
    const riderText = attack?.riderText ?? null;
    const specialTags = Array.isArray(attack?.specialTags) ? attack.specialTags.map((t) => String(t).trim()).filter(Boolean) : [];
    return {
      name: count > 1 ? `${count} ${type}` : type,
      type: 'weapon',
      system: {
        weaponType: 'natural',
        slot: 'natural',
        equipped: true,
        hands: 'none',
        ammoType: null,
        attackCount: count,
        attackLabel: type,
        attackSequence: sequence,
        riderText: riderText ? String(riderText) : null,
        specialTags,
        damage: String(attack?.damage ?? attack?.raw ?? system.damage ?? '1d4'),
        inventory: { location: 'worn', countsTowardEncumbrance: false }
      },
      flags: {
        becmi: {
          importedNaturalAttack: true,
          monsterAttackIndex: index,
          monsterKey: system.monsterKey,
          replaceKey: `${String(system.monsterKey ?? "unknown")}::${index}`
        }
      }
    };
  });
}

export function normalizeMonsterAttacks(attacks) {
  if (Array.isArray(attacks)) return attacks.filter(Boolean);
  return [];
}

export function buildCreatureActorDataFromCanonicalMonster(monsterData, { importVersion = 1 } = {}) {
  validateMonsterSchema(monsterData, 'build creature actor data');
  const system = monsterData.system;
  const movement = parseMovement(system.movement);
  const diagnostics = [];
  if (!system.attacks?.length) diagnostics.push('No attacks found on canonical monster.');
  if (!system.damage) diagnostics.push('No default damage field found on canonical monster.');

  return {
    name: system.name,
    type: 'creature',
    system: {
      monster: {
        monsterKey: system.monsterKey,
        schemaVersion: system.schemaVersion,
        source: system.source ?? {},
        ac: system.ac,
        hitDice: system.hitDice,
        saveAs: system.saveAs,
        movement,
        movementModes: system.movementModes ?? {},
        attacks: system.attacks ?? [],
        damage: system.damage ?? '',
        morale: system.morale ?? null,
        treasureType: system.treasureType ?? '',
        xp: system.xp ?? null,
        specialAbilities: system.specialAbilities ?? '',
        notes: system.notes ?? ''
      },
      diagnostics: {
        monsterImport: diagnostics
      }
    },
    flags: {
      becmi: {
        monsterKey: system.monsterKey,
        importVersion,
        sourceBook: system.source?.book ?? null
      }
    }
  };
}

export function buildCreatureRuntimeFromMonster(actor) {
  const monster = actor?.system?.monster ?? {};
  const diagnostics = Array.isArray(actor?.system?.diagnostics?.monsterImport) ? [...actor.system.diagnostics.monsterImport] : [];
  if (!monster.monsterKey) diagnostics.push('Missing monsterKey reference on creature actor.');

  return {
    monsterKey: monster.monsterKey ?? null,
    morale: monster.morale ?? null,
    xp: monster.xp ?? null,
    treasureType: monster.treasureType ?? '',
    movement: monster.movement,
    ac: monster.ac,
    hitDice: monster.hitDice,
    saveAs: monster.saveAs,
    damage: monster.damage,
    specialAbilitiesRaw: monster.specialAbilities,
    diagnostics
  };
}

export function buildNaturalAttackItemsFromLegacyActor(_actor) {
  console.warn("[BECMI Monsters] buildNaturalAttackItemsFromLegacyActor is deprecated and migration-only. Canonical runtime requires array attacks in system.monster.attacks.");
  return [];
}
