import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { sm2Update, initialSRState, addDays } = await import('../lib/sm2.ts');

describe('initialSRState', () => {
  it('returns n=0, ef=2.5, intervalDays=1', () => {
    const s = initialSRState();
    assert.equal(s.n, 0);
    assert.equal(s.ef, 2.5);
    assert.equal(s.intervalDays, 1);
  });
});

describe('sm2Update', () => {
  it('first review quality=5: n→1, interval stays 1 day, EF increases', () => {
    const s = initialSRState();
    const r = sm2Update(s, 5);
    assert.equal(r.n, 1);
    assert.equal(r.intervalDays, 1);
    assert.ok(r.ef > 2.5, `EF should increase, got ${r.ef}`);
  });

  it('second review quality=5: n→2, interval becomes 6 days', () => {
    const s = { n: 1, ef: 2.6, intervalDays: 1 };
    const r = sm2Update(s, 5);
    assert.equal(r.n, 2);
    assert.equal(r.intervalDays, 6);
  });

  it('third review quality=5: interval = round(intervalDays * newEf)', () => {
    const s = { n: 2, ef: 2.6, intervalDays: 6 };
    const r = sm2Update(s, 5);
    assert.equal(r.n, 3);
    const expectedEf = Math.max(1.3, 2.6 + 0.1 - (5 - 5) * (0.08 + (5 - 5) * 0.02));
    assert.equal(r.intervalDays, Math.round(6 * expectedEf));
  });

  it('quality=3 (Somewhat): n advances, EF decreases slightly', () => {
    const s = { n: 1, ef: 2.5, intervalDays: 1 };
    const r = sm2Update(s, 3);
    assert.equal(r.n, 2);
    assert.equal(r.intervalDays, 6);
    assert.ok(r.ef < 2.5, `EF should decrease, got ${r.ef}`);
  });

  it('quality=2 (Not really): n resets to 0, interval resets to 1', () => {
    const s = { n: 3, ef: 2.5, intervalDays: 15 };
    const r = sm2Update(s, 2);
    assert.equal(r.n, 0);
    assert.equal(r.intervalDays, 1);
  });

  it('EF floor: never drops below 1.3 even after many failures', () => {
    let s = initialSRState();
    for (let i = 0; i < 20; i++) s = sm2Update(s, 2);
    assert.ok(s.ef >= 1.3, `EF must be >= 1.3, got ${s.ef}`);
  });

  it('EF floor applies even when starting near floor', () => {
    const s = { n: 0, ef: 1.31, intervalDays: 1 };
    const r = sm2Update(s, 2);
    assert.ok(r.ef >= 1.3, `EF must be >= 1.3, got ${r.ef}`);
  });
});

describe('addDays', () => {
  it('adds days to a YYYY-MM-DD string correctly', () => {
    assert.equal(addDays('2026-04-02', 1), '2026-04-03');
    assert.equal(addDays('2026-04-02', 6), '2026-04-08');
    assert.equal(addDays('2026-12-30', 7), '2027-01-06');
  });
});
