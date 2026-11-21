import { ENV } from '../config/env';
import { WalletApiService } from './api.interface';
import { httpApi } from './http/httpApi';
import { mockApi } from './mock/mockApi';

export const walletApi: WalletApiService = ENV.USE_MOCK_API ? mockApi : httpApi;
export type { WalletApiService };
