import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidNigerianPhone, normalizeNigerianPhone } from './phone';
import { getPasswordStrength, validateAccountNumber, validateEmail } from './validation';

test('normalizeNigerianPhone normalizes local and +234 numbers consistently', () => {
  assert.equal(normalizeNigerianPhone('08012345678'), '+2348012345678');
  assert.equal(normalizeNigerianPhone('081 2345 6789'), '+2348123456789');
  assert.equal(normalizeNigerianPhone('0703-456-7890'), '+2347034567890');
  assert.equal(normalizeNigerianPhone('09012345678'), '+2349012345678');
  assert.equal(normalizeNigerianPhone('09112345678'), '+2349112345678');
  assert.equal(normalizeNigerianPhone('+2348012345678'), '+2348012345678');
  assert.equal(normalizeNigerianPhone('2348012345678'), '+2348012345678');
});

test('normalizeNigerianPhone rejects malformed phone numbers', () => {
  assert.equal(normalizeNigerianPhone('0801234567'), null); // 10 digits
  assert.equal(normalizeNigerianPhone('080123456789'), null); // 12 digits
  assert.equal(normalizeNigerianPhone('+14155551234'), null);
  assert.equal(isValidNigerianPhone('12345'), false);
});

test('validation helpers validate account numbers, email, and password policy', () => {
  assert.equal(validateAccountNumber('0123456789'), null);
  assert.notEqual(validateAccountNumber('12345'), null);
  assert.notEqual(validateAccountNumber('012345678a'), null);

  assert.equal(validateEmail('adaeze@newpay.app'), null);
  assert.notEqual(validateEmail('not-an-email'), null);

  assert.equal(getPasswordStrength('short1').meetsPolicy, false);
  assert.equal(getPasswordStrength('onlyletters').meetsPolicy, false);
  assert.equal(getPasswordStrength('12345678').meetsPolicy, false);
  assert.equal(getPasswordStrength('Password1').meetsPolicy, true);
  assert.equal(getPasswordStrength('StrongPass123!').level, 'strong');
});
