// tests/greeting.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { selectGreeting } = await import('../lib/greeting.ts');

function baseCtx(overrides = {}) {
  return {
    mode: 'focus',
    loadLevel: 'normal',
    dayOfWeek: 2,
    isAbsent: false,
    recentlyShownIds: [],
    ...overrides,
  };
}

describe('selectGreeting', () => {
  it('always returns a greeting object with id and text', () => {
    const g = selectGreeting(baseCtx());
    assert.ok(g.id, 'should have id');
    assert.ok(g.text.length > 0, 'should have text');
  });

  it('returns milestone greeting when milestone matches', () => {
    const g = selectGreeting(baseCtx({ milestone: 30 }));
    assert.equal(g.milestone, 30);
  });

  it('returns absent greeting when isAbsent is true', () => {
    const g = selectGreeting(baseCtx({ isAbsent: true }));
    assert.equal(g.isAbsent, true);
  });

  it('returns mode-specific greeting for quiet modes', () => {
    const g = selectGreeting(baseCtx({ mode: 'quiet-morning' }));
    assert.equal(g.mode, 'quiet-morning');
  });

  it('avoids recently shown IDs', () => {
    const ctx = baseCtx({ mode: 'quiet-morning' });
    const allIds = new Set();
    for (let i = 0; i < 10; i++) {
      const g = selectGreeting({ ...ctx, recentlyShownIds: [] });
      allIds.add(g.id);
    }
    const ids = [...allIds];
    if (ids.length >= 2) {
      const excluded = ids[0];
      const g = selectGreeting({ ...ctx, recentlyShownIds: [excluded] });
      assert.notEqual(g.id, excluded);
    }
  });

  it('falls back to generic when all specific messages are recent', () => {
    const g = selectGreeting(
      baseCtx({
        mode: 'focus',
        recentlyShownIds: ['focus-1', 'focus-2', 'focus-3'],
      })
    );
    assert.ok(g.text.length > 0);
  });
});
