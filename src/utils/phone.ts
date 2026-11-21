/**
 * Normalizes Nigerian phone numbers to +234XXXXXXXXXX format.
 * Accepts:
 *  - Local 11-digit format starting with 0 (e.g. 08012345678, 070..., 081..., 090..., 091...)
 *  - International +234 format followed by 10 digits (e.g. +2348012345678)
 *  - 234 followed by 10 digits (e.g. 2348012345678)
 * Spaces, hyphens, and parentheses are stripped before validation.
 */
export function normalizeNigerianPhone(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s\-()]/g, '');

  // +234 followed by 10 digits (first digit after +234 cannot be 0; standard Nigerian mobile starts with 7, 8, or 9)
  if (/^\+234[789]\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // 234 followed by 10 digits
  if (/^234[789]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Local 11-digit format: 070/080/081/090/091 etc.
  if (/^0[789][01]\d{8}$/.test(cleaned)) {
    return `+234${cleaned.slice(1)}`;
  }

  return null;
}

export function isValidNigerianPhone(raw: string): boolean {
  return normalizeNigerianPhone(raw) !== null;
}

export function formatPhoneDisplay(normalized: string): string {
  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('234')) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return normalized;
}
