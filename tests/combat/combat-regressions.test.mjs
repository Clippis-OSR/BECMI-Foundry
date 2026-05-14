import { describe, expect, it } from 'vitest';

import { calculateRequiredRoll } from '../../module/combat/attack.mjs';
import { resolveGroupInitiativeTie, resolveIndividualInitiativeTies } from '../../module/combat/initiative.mjs';
import { rollMorale } from '../../module/combat/morale.mjs';
import { applyDamageFromMessage } from '../../module/combat/damage-application.mjs';
import { installDeterministicRolls, installFoundryStubs } from '../helpers/foundry-test-helpers.mjs';

installFoundryStubs();

describe('combat regressions', () => {
  it('descending AC hit calculation uses THAC0 - AC, including negative AC', () => {
    expect(calculateRequiredRoll(19, 5)).toBe(14);
    expect(calculateRequiredRoll(19, 0)).toBe(19);
    expect(calculateRequiredRoll(19, -2)).toBe(21);
  });

  it('group initiative tie-breaker rerolls until resolved', async () => {
    installDeterministicRolls([4, 4, 2, 5]);
    const result = await resolveGroupInitiativeTie();

    expect(result.rounds.length).toBe(2);
    expect(result.rounds[0].winner).toBe('tie');
    expect(result.rounds[1].winner).toBe('monster');
    expect(result.resolved).toBe(true);
    expect(result.fallbackApplied).toBe(false);
  });

  it('individual initiative tie-breaker rerolls tied combatants only', async () => {
    installDeterministicRolls([7, 2]);
    const result = await resolveIndividualInitiativeTies([
      { combatantId: 'c1', name: 'A', roll: 4, modifier: 0, total: 4 },
      { combatantId: 'c2', name: 'B', roll: 4, modifier: 0, total: 4 },
      { combatantId: 'c3', name: 'C', roll: 6, modifier: 0, total: 6 }
    ]);

    const byId = Object.fromEntries(result.results.map((r) => [r.combatantId, r]));
    expect(byId.c1.total).toBe(7);
    expect(byId.c2.total).toBe(2);
    expect(byId.c3.total).toBe(6);
    expect(byId.c1.rerollCount).toBe(1);
    expect(byId.c2.rerollCount).toBe(1);
    expect(byId.c3.rerollCount ?? 0).toBe(0);
  });

  it('morale rolls are valid only for creature actors', async () => {
    installDeterministicRolls([7]);
    const creature = { type: 'creature', system: { morale: { value: 8 } }, name: 'Goblin' };
    const character = { type: 'character', system: { morale: { value: 12 } }, name: 'Fighter' };

    const creatureResult = await rollMorale({ actor: creature, postToChat: false });
    const characterResult = await rollMorale({ actor: character, postToChat: false });

    expect(creatureResult.success).toBe(true);
    expect(characterResult).toBeNull();
  });

  it('duplicate damage prevention blocks second application from same message', async () => {
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

    expect(applied).toBe(1);
    expect(message.flags['becmi-foundry'].damageApplied).toBe(true);
  });
});
