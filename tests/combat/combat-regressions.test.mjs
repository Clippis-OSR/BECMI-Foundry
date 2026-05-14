import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateRequiredRoll } from '../../module/combat/attack.mjs';
import { resolveGroupInitiativeTie, resolveIndividualInitiativeTies } from '../../module/combat/initiative.mjs';
import { rollMorale } from '../../module/combat/morale.mjs';
import { applyDamageFromMessage } from '../../module/combat/damage-application.mjs';
import { installDeterministicRolls, installFoundryStubs } from '../helpers/foundry-test-helpers.mjs';

installFoundryStubs();

test('descending AC hit calculation uses THAC0 - AC, including negative AC', () => {
  assert.equal(calculateRequiredRoll(19, 5), 14);
  assert.equal(calculateRequiredRoll(19, 0), 19);
  assert.equal(calculateRequiredRoll(19, -2), 21);
});

test('group initiative tie-breaker rerolls until resolved', async () => {
  installDeterministicRolls([4, 4, 2, 5]);
  const result = await resolveGroupInitiativeTie();

  assert.equal(result.rounds.length, 2);
  assert.equal(result.rounds[0].winner, 'tie');
  assert.equal(result.rounds[1].winner, 'monster');
  assert.equal(result.resolved, true);
  assert.equal(result.fallbackApplied, false);
});

test('individual initiative tie-breaker rerolls tied combatants only', async () => {
  installDeterministicRolls([7, 2]);
  const result = await resolveIndividualInitiativeTies([
    { combatantId: 'c1', name: 'A', roll: 4, modifier: 0, total: 4 },
    { combatantId: 'c2', name: 'B', roll: 4, modifier: 0, total: 4 },
    { combatantId: 'c3', name: 'C', roll: 6, modifier: 0, total: 6 }
  ]);

  const byId = Object.fromEntries(result.results.map((r) => [r.combatantId, r]));
  assert.equal(byId.c1.total, 7);
  assert.equal(byId.c2.total, 2);
  assert.equal(byId.c3.total, 6);
  assert.equal(byId.c1.rerollCount, 1);
  assert.equal(byId.c2.rerollCount, 1);
  assert.equal(byId.c3.rerollCount ?? 0, 0);
});

test('morale rolls are valid only for creature actors', async () => {
  installDeterministicRolls([7]);
  const creature = { type: 'creature', system: { morale: { value: 8 } }, name: 'Goblin' };
  const character = { type: 'character', system: { morale: { value: 12 } }, name: 'Fighter' };

  const creatureResult = await rollMorale({ actor: creature, postToChat: false });
  const characterResult = await rollMorale({ actor: character, postToChat: false });

  assert.equal(creatureResult.success, true);
  assert.equal(characterResult, null);
});

test('duplicate damage prevention blocks second application from same message', async () => {
  let applied = 0;
  const message = {
    flags: {
      'becmi-foundry': {
        damageApplied: false,
        damageTargetUuid: 'Actor.test',
        damageTotal: 3
      }
    },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    async setFlag(scope, key, value) { this.flags[scope][key] = value; }
  };

  class FakeActor {
    constructor() {
      this.name = 'Target';
      this.isOwner = true;
      this.system = { hp: { value: 10 } };
    }
    async update(changes) {
      if (changes['system.hp.value'] !== undefined) {
        this.system.hp.value = changes['system.hp.value'];
        applied += 1;
      }
    }
  }

  globalThis.Actor = FakeActor;
  globalThis.game = { user: { isGM: false } };
  globalThis.fromUuid = async () => new FakeActor();

  await applyDamageFromMessage(message);
  await applyDamageFromMessage(message);

  assert.equal(applied, 1);
  assert.equal(message.flags['becmi-foundry'].damageApplied, true);
});
