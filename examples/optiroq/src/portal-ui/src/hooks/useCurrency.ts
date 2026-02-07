import { useEffect } from 'react';
import { useApiView } from './useApi';
import { CurrencyAndCommodityViewModel } from '@optiroq/types';
import { useCurrencyStore } from '@/stores/useCurrencyStore';

/**
 * Custom hook to fetch currency and commodity data and populate the global store.
 * This should be called once when the authenticated application loads.
 */
export function useCurrency() {
  const { data, isSuccess } = useApiView<CurrencyAndCommodityViewModel>('fx-rates', 'latest');
  const setData = useCurrencyStore((state) => state.actions.setData);
  const initialized = useCurrencyStore((state) => state.initialized);

  useEffect(() => {
    // Populate the store only once when data is successfully fetched.
    if (isSuccess && data && !initialized) {
      setData(data);
    }
  }, [isSuccess, data, setData, initialized]);
}