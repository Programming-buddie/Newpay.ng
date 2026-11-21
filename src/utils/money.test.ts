import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNaira, formatSignedNaira, fromKobo, toKobo, tryParseKobo } from './money';

test('toKobo parses whole and decimal naira accurately without float drift', () => {
  assert.equal(toKobo('500'), 50_000);
  assert.equal(toKobo('1,250.50'), 125_050);
  assert.equal(toKobo('100.10') + toKobo('0.20'), 10_030);
  assert.equal(formatNaira(toKobo('100.10') + toKobo('0.20')), '₦100.30');
  assert.equal(toKobo('0.01'), 1);
  assert.equal(toKobo('₦250.5'), 25_050);
});

test('toKobo rejects invalid inputs, negative values, zero, and >2 decimals', () => {
  assert.throws(() => toKobo(''), /enter an amount/i);
  assert.throws(() => toKobo('-50'), /valid positive/i);
  assert.throws(() => toKobo('0'), /greater than zero/i);
  assert.throws(() => toKobo('0.00'), /greater than zero/i);
  assert.throws(() => toKobo('10.123'), /more than 2 decimal/i);
  assert.throws(() => toKobo('12abc'), /valid positive/i);
  assert.throws(() => toKobo('1e5'), /valid positive/i);
});

test('fromKobo and formatNaira format Nigerian Naira consistently', () => {
  assert.equal(fromKobo(50_000), 500);
  assert.equal(formatNaira(50_000), '₦500.00');
  assert.equal(formatNaira(125_050), '₦1,250.50');
  assert.equal(formatSignedNaira(25_000, 'credit'), '+₦250.00');
  assert.equal(formatSignedNaira(10_000, 'debit'), '−₦100.00');
});

test('tryParseKobo enforces minimum kobo threshold', () => {
  const belowMin = tryParseKobo('0.50', 100);
  assert.equal(belowMin.ok, false);
  const valid = tryParseKobo('1.00', 100);
  assert.deepEqual(valid, { ok: true, kobo: 100 });
});
