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
        damage: String(attack?.damage ?? attack?.raw ?? system.damage ?? '1d4'),
        inventory: { location: 'worn', countsTowardEncumbrance: false }
      },
      flags: {
        becmi: {
          importedNaturalAttack: true,
          monsterAttackIndex: index,
          monsterKey: system.monsterKey
        }
      }
    };
  });
}

export function normalizeMonsterAttacks(attacks) {
  if (Array.isArray(attacks)) return attacks.filter(Boolean);
  if (typeof attacks === 'string') {
    return attacks
      .split(/[/;+]|\band\b/gi)
      .map((part) => String(part).trim())
      .filter(Boolean)
      .map((part) => {
        const match = part.match(/^(\d+)\s+(.+)$/i);
        const count = match ? Number(match[1]) : 1;
        const type = (match ? match[2] : part).trim().toLowerCase();
        return { type, count, raw: part };
      });
  }
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
    movement: monster.movement ?? { raw: '', feetPerTurn: null, feetPerRound: null },
    ac: monster.ac ?? null,
    hitDice: monster.hitDice ?? null,
    saveAs: monster.saveAs ?? null,
    damage: monster.damage ?? '',
    specialAbilitiesRaw: monster.specialAbilities ?? '',
    diagnostics
  };
}

export function buildNaturalAttackItemsFromLegacyActor(actor) {
  console.warn("[BECMI Monsters] buildNaturalAttackItemsFromLegacyActor is deprecated. Normalize into canonical system.monster.attacks first.");
  const monster = actor?.system?.monster ?? {};
  const legacyAttackFields = [
    monster.attacks,
    actor?.system?.attacks,
    monster.attack
  ];
  const parsedAttacks = legacyAttackFields
    .flatMap((value) => normalizeMonsterAttacks(value))
    .filter(Boolean);
  if (!parsedAttacks.length) return [];
  return buildNaturalAttackItemsFromMonster({
    system: {
      ...monster,
      attacks: parsedAttacks,
      damage: monster.damage ?? actor?.system?.damage ?? '1d4',
      monsterKey: monster.monsterKey ?? actor?.id ?? actor?.name ?? null
    }
  });
}
