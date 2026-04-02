import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { getOneThing } = await import('../lib/one-thing.ts');

function makePriority(overrides = {}) {
  return {
    id: Math.random(),
    title: 'Test task',
    detail: '',
    status: 'active',
    rank: 1,
    intensity: null,
    created_at: '2026-03-10T08:00:00Z',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('getOneThing', () => {
  it('returns null when no priorities', () => {
    assert.equal(getOneThing([], 'focus'), null);
  });

  it('returns null when all priorities are done', () => {
    const done = [makePriority({ status: 'done' })];
    assert.equal(getOneThing(done, 'focus'), null);
  });

  it('returns the lowest-rank active priority', () => {
    const p1 = makePriority({ rank: 2, title: 'Second' });
    const p2 = makePriority({ rank: 1, title: 'First' });
    const result = getOneThing([p1, p2], 'focus');
    assert.equal(result?.title, 'First');
  });

  it('tiebreaks by oldest updated_at (least recently touched)', () => {
    const older = makePriority({
      rank: 1,
      title: 'Not touched in a while',
      updated_at: '2026-03-01T08:00:00Z',
    });
    const newer = makePriority({
      rank: 1,
      title: 'Recently edited',
      updated_at: '2026-03-10T08:00:00Z',
    });
    const result = getOneThing([newer, older], 'focus');
    assert.equal(result?.title, 'Not touched in a while');
  });

  it('ignores done tasks', () => {
    const done = makePriority({ rank: 1, status: 'done', title: 'Done' });
    const active = makePriority({ rank: 2, status: 'active', title: 'Active' });
    const result = getOneThing([done, active], 'focus');
    assert.equal(result?.title, 'Active');
  });

  it('excludes Light tasks in focus mode', () => {
    const light = makePriority({ rank: 1, title: 'Light task', intensity: 'Light' });
    const deep  = makePriority({ rank: 2, title: 'Deep task',  intensity: 'Deep'  });
    const result = getOneThing([light, deep], 'focus');
    assert.equal(result?.title, 'Deep task');
  });

  it('returns Light task if it is the only task in focus mode', () => {
    const light = makePriority({ rank: 1, title: 'Only task', intensity: 'Light' });
    const result = getOneThing([light], 'focus');
    assert.equal(result?.title, 'Only task');
  });

  it('prefers Steady over Deep in afternoon mode', () => {
    const deep   = makePriority({ rank: 1, title: 'Deep task',   intensity: 'Deep'   });
    const steady = makePriority({ rank: 2, title: 'Steady task', intensity: 'Steady' });
    const result = getOneThing([deep, steady], 'afternoon');
    assert.equal(result?.title, 'Steady task');
  });

  it('returns the one thing in quiet modes ignoring intensity', () => {
    const p = makePriority({ rank: 1, title: 'Only task' });
    assert.equal(getOneThing([p], 'quiet-morning')?.title, 'Only task');
  });
});
