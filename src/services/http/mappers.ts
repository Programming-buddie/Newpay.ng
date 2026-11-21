import { Account, Transaction, TransferInput } from '../../types';
import { fromKobo, toKobo } from '../../utils/money';

/**
 * Money format adapter:
 * Backend APIs should prefer integer kobo (`amountKobo`, `balanceKobo`).
 * If the backend instead sends decimal naira (`amount` or `balance` as a number or string),
 * `parseApiMoneyToKobo` safely converts it into integer kobo without changing any UI code.
 */
export function parseApiMoneyToKobo(
  koboValue: number | undefined,
  nairaFallback?: number | string
): number {
  if (typeof koboValue === 'number' && Number.isSafeInteger(koboValue)) {
    return koboValue;
  }
  if (nairaFallback !== undefined && nairaFallback !== null) {
    const asString =
      typeof nairaFallback === 'number' ? nairaFallback.toFixed(2) : String(nairaFallback);
    return toKobo(asString);
  }
  return 0;
}

export interface ApiAccountDto {
  id: string;
  userId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  currency: 'NGN';
  balanceKobo?: number;
  balance?: number | string;
}

export interface ApiTransactionDto {
  id: string;
  accountId: string;
  reference: string;
  type: 'debit' | 'credit';
  category: 'transfer' | 'deposit' | 'funding';
  amountKobo?: number;
  amount?: number | string;
  currency: 'NGN';
  status: 'successful' | 'pending' | 'failed';
  description: string;
  narration?: string;
  counterparty: {
    name: string;
    bankName?: string;
    accountNumber?: string;
  };
  balanceAfterKobo?: number;
  balanceAfter?: number | string;
  createdAt: string;
}

export const fromApi = {
  account(dto: ApiAccountDto): Account {
    return {
      id: dto.id,
      userId: dto.userId,
      accountNumber: dto.accountNumber,
      accountName: dto.accountName,
      bankName: dto.bankName,
      currency: dto.currency ?? 'NGN',
      balanceKobo: parseApiMoneyToKobo(dto.balanceKobo, dto.balance),
    };
  },

  transaction(dto: ApiTransactionDto): Transaction {
    return {
      id: dto.id,
      accountId: dto.accountId,
      reference: dto.reference,
      type: dto.type,
      category: dto.category,
      amountKobo: parseApiMoneyToKobo(dto.amountKobo, dto.amount),
      currency: dto.currency ?? 'NGN',
      status: dto.status,
      description: dto.description,
      narration: dto.narration,
      counterparty: dto.counterparty,
      balanceAfterKobo:
        dto.balanceAfterKobo !== undefined || dto.balanceAfter !== undefined
          ? parseApiMoneyToKobo(dto.balanceAfterKobo, dto.balanceAfter)
          : undefined,
      createdAt: dto.createdAt,
    };
  },
};

export const toApi = {
  transferRequest(input: TransferInput, moneyMode: 'kobo' | 'naira' = 'kobo') {
    if (moneyMode === 'naira') {
      return {
        idempotencyKey: input.idempotencyKey,
        bankCode: input.bankCode,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
        amount: fromKobo(input.amountKobo),
        narration: input.narration,
      };
    }
    return {
      idempotencyKey: input.idempotencyKey,
      bankCode: input.bankCode,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      amountKobo: input.amountKobo,
      narration: input.narration,
    };
  },
};
