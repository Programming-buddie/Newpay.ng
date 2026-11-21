import { ApiError } from '../types';

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Safely converts a user-typed Naira string (e.g. "1,250.50" or "100.1")
 * into integer kobo without floating-point arithmetic drift.
 * Never uses parseFloat(x) * 100.
 */
export function toKobo(input: string): number {
  const trimmed = input.trim().replace(/,/g, '').replace(/^₦\s*/, '');

  if (!trimmed) {
    throw new ApiError({
      code: 'INVALID_AMOUNT',
      message: 'Please enter an amount.',
    });
  }

  // Reject negative numbers, scientific notation, or invalid characters
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new ApiError({
      code: 'INVALID_AMOUNT',
      message: 'Enter a valid positive number (up to 2 decimal places).',
    });
  }

  const [wholePart, decimalPart = ''] = trimmed.split('.');

  if (decimalPart.length > 2) {
    throw new ApiError({
      code: 'INVALID_AMOUNT',
      message: 'Amount cannot have more than 2 decimal places.',
    });
  }

  const paddedDecimals = decimalPart.padEnd(2, '0');
  const wholeNum = Number(wholePart);
  const koboNum = Number(paddedDecimals);

  if (!Number.isSafeInteger(wholeNum) || !Number.isSafeInteger(koboNum)) {
    throw new ApiError({
      code: 'INVALID_AMOUNT',
      message: 'Amount is too large.',
    });
  }

  const totalKobo = wholeNum * 100 + koboNum;

  if (!Number.isSafeInteger(totalKobo) || totalKobo <= 0) {
    throw new ApiError({
      code: 'INVALID_AMOUNT',
      message: 'Amount must be greater than zero.',
    });
  }

  return totalKobo;
}

/**
 * Converts integer kobo to a decimal Naira number for display or API mappers.
 */
export function fromKobo(kobo: number): number {
  if (!Number.isFinite(kobo)) return 0;
  return Math.round(kobo) / 100;
}

/**
 * Shared NGN currency formatter across the entire application.
 * E.g. formatNaira(125000) -> "₦1,250.00"
 */
export function formatNaira(kobo: number): string {
  return nairaFormatter.format(fromKobo(kobo));
}

/**
 * Formats signed amounts for transaction feeds:
 * credit -> "+₦250.00"
 * debit  -> "−₦100.00" (uses proper minus sign U+2212)
 */
export function formatSignedNaira(kobo: number, type: 'credit' | 'debit'): string {
  const formatted = formatNaira(Math.abs(kobo));
  return type === 'credit' ? `+${formatted}` : `−${formatted}`;
}

/**
 * Parses a Naira string safely returning kobo or null + error message without throwing.
 */
export function tryParseKobo(
  input: string,
  minKobo = 100
): { ok: true; kobo: number } | { ok: false; error: string } {
  try {
    const kobo = toKobo(input);
    if (kobo < minKobo) {
      return {
        ok: false,
        error: `Minimum amount is ${formatNaira(minKobo)}.`,
      };
    }
    return { ok: true, kobo };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid amount.',
    };
  }
}
