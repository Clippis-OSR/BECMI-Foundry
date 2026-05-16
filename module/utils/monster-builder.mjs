const IMPORT_VERSION = 1;
function normalizeMonsterAttacks(attacks) {
  if (Array.isArray(attacks)) return attacks.filter(Boolean);
  if (typeof attacks === 'string') {
    return attacks.split(/[/;+]|\band\b/gi).map((part) => String(part).trim()).filter(Boolean).map((part) => {
      const match = part.match(/^(\d+)\s+(.+)$/i);
      return { type: match ? match[2] : part, count: match ? Number(match[1]) : 1, raw: part };
    });
  }
  return [];
}

function normalizeDamageTypes(damageTypes) {
  if (!damageTypes) return [];
  if (Array.isArray(damageTypes)) return damageTypes.filter(Boolean).map((d) => String(d).trim()).filter(Boolean);
  return [String(damageTypes).trim()].filter(Boolean);
}

function defaultActionName(action, index) {
  return action?.name || action?.title || `Action ${index + 1}`;
}

export function buildCreatureActorData(monster, { importVersion = IMPORT_VERSION } = {}) {
  const systemMonster = {
    id: monster.id,
    sourceBook: monster.sourceBook,
    sourcePage: monster.sourcePage ?? null,
    armorClass: monster.armorClass,
    hitDice: monster.hitDice,
    movement: monster.movement,
    attacks: monster.attacks ?? [],
    damage: monster.damage ?? '',
    numberAppearing: monster.numberAppearing ?? '',
    saveAs: monster.saveAs ?? '',
    morale: monster.morale ?? null,
    treasureType: monster.treasureType ?? '',
    alignment: monster.alignment ?? '',
    xp: monster.xp ?? null,
    specialAbilities: monster.specialAbilities ?? '',
    notes: monster.notes ?? '',
    actions: buildMonsterActionData(monster.specialAbilities, monster)
  };

  return {
    name: monster.name,
    type: 'creature',
    system: {
      monster: systemMonster
    },
    flags: {
      becmi: {
        sourceMonsterId: monster.id,
        sourceBook: monster.sourceBook,
        importVersion
      }
    }
  };
}

export function buildNaturalAttackItemData(attack, monster, { attackIndex = 0 } = {}) {
  const attackCount = Number.isFinite(attack.count) ? attack.count : 1;
  const baseName = attack.type ? String(attack.type).trim() : 'natural attack';
  const itemName = attackCount > 1 ? `${attackCount} ${baseName}` : baseName;

  return {
    name: itemName,
    type: 'weapon',
    system: {
      weaponType: 'natural',
      slot: 'natural',
      equipped: true,
      hands: 'none',
      ammoType: null,
      attackCount,
      attackLabel: baseName,
      riderText: attack?.riderText ? String(attack.riderText) : null,
      damage: attack.damage ?? monster.damage ?? '',
      damageTypes: normalizeDamageTypes(attack.damageTypes),
      inventory: {
        location: 'worn',
        countsTowardEncumbrance: false
      }
    },
    flags: {
      becmi: {
        sourceMonsterId: monster.id,
        monsterAttackIndex: attackIndex,
        importedNaturalAttack: true
      }
    }
  };
}

export function buildMonsterItemData(monster) {
  const attacks = normalizeMonsterAttacks(monster.attacks);
  return attacks.map((attack, index) => buildNaturalAttackItemData(attack, monster, { attackIndex: index }));
}

export function buildMonsterActionData(actionInput, monster) {
  const actions = Array.isArray(monster?.actions)
    ? monster.actions
    : (String(actionInput || '').split(/\s*;\s*|\n+/).map((x) => x.trim()).filter(Boolean).map((text) => ({ text })));

  return actions.map((action, index) => ({
    id: `${monster.id}-action-${index}`,
    name: defaultActionName(action, index),
    text: action.text || action.description || '',
    automation: 'none'
  }));
}

function selectMonsters(monsters, options = {}) {
  const sourceBook = options.sourceBook ? String(options.sourceBook).toLowerCase() : null;
  const monsterFilter = options.monsterFilter ? String(options.monsterFilter).toLowerCase() : null;

  return monsters.filter((monster) => {
    if (sourceBook && String(monster.sourceBook || '').toLowerCase() !== sourceBook) return false;
    if (!monsterFilter) return true;
    return monster.id?.toLowerCase() === monsterFilter || monster.name?.toLowerCase().includes(monsterFilter);
  });
}

function planImport(monster, existingActor, options = {}) {
  if (!existingActor) return 'create';
  if (options.updateExisting) return 'update';
  return 'skip';
}

export async function importMonster(monster, options = {}) {
  const actorData = buildCreatureActorData(monster, options);
  const itemData = buildMonsterItemData(monster);
  const finder = options.findExistingActor || (async () => null);
  const existingActor = await finder(monster, options);
  const action = planImport(monster, existingActor, options);

  const report = {
    action,
    monsterId: monster.id,
    actorName: monster.name,
    actorData,
    itemData,
    existingActorId: existingActor?.id ?? null
  };

  if (options.dryRun) return report;

  if (!options.actorApi) {
    throw new Error('importMonster requires options.actorApi when dryRun is false');
  }

  if (action === 'skip') return report;

  if (action === 'create') {
    const created = await options.actorApi.createActor(actorData, itemData, options);
    return { ...report, actorId: created?.id ?? null };
  }

  const updated = await options.actorApi.updateActor(existingActor, actorData, options);
  await options.actorApi.replaceImportedNaturalAttacks(updated, itemData, options);
  return { ...report, actorId: updated?.id ?? existingActor?.id ?? null };
}

export async function importMonsterCollection(monsters, options = {}) {
  const selected = selectMonsters(monsters, options);
  const reports = [];

  for (const monster of selected) {
    reports.push(await importMonster(monster, options));
  }

  return {
    total: selected.length,
    created: reports.filter((r) => r.action === 'create').length,
    updated: reports.filter((r) => r.action === 'update').length,
    skipped: reports.filter((r) => r.action === 'skip').length,
    reports
  };
}

export function createFoundryActorApi(Actor) {
  return {
    async createActor(actorData, itemData) {
      return Actor.create({ ...actorData, items: itemData });
    },
    async updateActor(existingActor, actorData) {
      await existingActor.update(actorData);
      return existingActor;
    },
    async replaceImportedNaturalAttacks(existingActor, itemData) {
      const importedNaturalAttackIds = existingActor.items
        .filter((item) => item.flags?.becmi?.importedNaturalAttack)
        .map((item) => item.id);
      if (importedNaturalAttackIds.length) await existingActor.deleteEmbeddedDocuments('Item', importedNaturalAttackIds);
      if (itemData.length) await existingActor.createEmbeddedDocuments('Item', itemData);
      return existingActor;
    }
  };
}
