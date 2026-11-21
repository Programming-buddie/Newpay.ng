import { useAccountContext } from '../context/AccountContext';

export function useAccount() {
  return useAccountContext();
}
