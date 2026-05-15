import { describe, it, expect, beforeEach } from 'vitest';
import { installFoundryStubs } from '../helpers/foundry-test-helpers.mjs';
import { detectLegacyManualDerivedFields, stripProtectedDerivedActorUpdates } from '../../module/actors/derived-guards.mjs';

beforeEach(() => {
  installFoundryStubs();
  foundry.utils.hasProperty = (obj, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), obj) !== undefined;
  foundry.utils.unsetProperty = (obj, path) => {
    const parts = path.split('.');
    const last = parts.pop();
    const t = parts.reduce((a, k) => (a == null ? undefined : a[k]), obj);
    if (t && Object.prototype.hasOwnProperty.call(t, last)) delete t[last];
  };
});

describe('manual derived field guards', () => {
  it('detects legacy manual derived fields for migration/warning', () => {
    const actor = { system: { thac0: 18, thiefSkills: { openLocks: 30 } } };
    expect(detectLegacyManualDerivedFields(actor)).toEqual(expect.arrayContaining(['system.thac0', 'system.thiefSkills']));
  });

  it('strips protected derived update paths', () => {
    const changes = { system: { derived: { level: 99 }, ac: { value: 1 }, profile: { name: 'ok' } } };
    const { sanitized, removed } = stripProtectedDerivedActorUpdates(changes);
    expect(removed).toEqual(expect.arrayContaining(['system.derived', 'system.ac.value']));
    expect(sanitized.system.profile.name).toBe('ok');
  });
});
