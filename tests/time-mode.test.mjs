import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ESM import — compiled TypeScript runs via tsx in test script
const { getTimeMode } = await import('../lib/time-mode.ts');

function makeDate(hours, minutes = 0) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

describe('getTimeMode', () => {
  it('returns quiet-morning before 8am', () => {
    assert.equal(getTimeMode(makeDate(7, 30)), 'quiet-morning');
    assert.equal(getTimeMode(makeDate(0, 0)), 'quiet-morning');
    assert.equal(getTimeMode(makeDate(7, 59)), 'quiet-morning');
  });

  it('returns morning-brief 8:00–8:59', () => {
    assert.equal(getTimeMode(makeDate(8, 0)), 'morning-brief');
    assert.equal(getTimeMode(makeDate(8, 30)), 'morning-brief');
    assert.equal(getTimeMode(makeDate(8, 59)), 'morning-brief');
  });

  it('returns focus 9:00–13:59', () => {
    assert.equal(getTimeMode(makeDate(9, 0)), 'focus');
    assert.equal(getTimeMode(makeDate(12, 0)), 'focus');
    assert.equal(getTimeMode(makeDate(13, 59)), 'focus');
  });

  it('returns quiet-afternoon 14:00–14:59', () => {
    assert.equal(getTimeMode(makeDate(14, 0)), 'quiet-afternoon');
    assert.equal(getTimeMode(makeDate(14, 59)), 'quiet-afternoon');
  });

  it('returns lunch 15:00–15:29', () => {
    assert.equal(getTimeMode(makeDate(15, 0)), 'lunch');
    assert.equal(getTimeMode(makeDate(15, 29)), 'lunch');
  });

  it('returns afternoon 15:30–18:29', () => {
    assert.equal(getTimeMode(makeDate(15, 30)), 'afternoon');
    assert.equal(getTimeMode(makeDate(18, 0)), 'afternoon');
    assert.equal(getTimeMode(makeDate(18, 29)), 'afternoon');
  });

  it('returns transition 18:30–18:59', () => {
    assert.equal(getTimeMode(makeDate(18, 30)), 'transition');
    assert.equal(getTimeMode(makeDate(18, 59)), 'transition');
  });

  it('returns evening 19:00–20:59', () => {
    assert.equal(getTimeMode(makeDate(19, 0)), 'evening');
    assert.equal(getTimeMode(makeDate(20, 59)), 'evening');
  });

  it('returns reflection 21:00+', () => {
    assert.equal(getTimeMode(makeDate(21, 0)), 'reflection');
    assert.equal(getTimeMode(makeDate(23, 59)), 'reflection');
  });
});
