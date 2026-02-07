import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { CurrencyAndCommodityViewModel, FxRates, CommodityPrice } from '@optiroq/types';

interface CurrencyState {
  rates: FxRates | null;
  commodities: CommodityPrice[];
  baseCurrency: string | null;
  userCurrencies: string[];
  initialized: boolean;
  actions: {
    setData: (data: CurrencyAndCommodityViewModel) => void;
    setUserCurrencies: (currencies: string[]) => void;
  };
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    immer((set) => ({
      rates: null,
      commodities: [],
      baseCurrency: null,
      userCurrencies: ['USD', 'CNY', 'JPY'], // Default selection
      initialized: false,
      actions: {
        setData: (data) => set((state) => {
          state.rates = data.rates;
          state.commodities = data.commodities;
          state.baseCurrency = data.baseCurrency;
          state.initialized = true;
          // Ensure base currency is always in the selection but not duplicated
          state.userCurrencies = Array.from(new Set([data.baseCurrency, ...state.userCurrencies]));
        }),
        setUserCurrencies: (currencies) => set((state) => {
          // Always keep the base currency in the list
          state.userCurrencies = Array.from(new Set([state.baseCurrency!, ...currencies]));
        }),
      },
    })),
    {
      name: 'currency-preferences',
      storage: createJSONStorage(() => localStorage),
      // Only persist the user's selection
      partialize: (state) => ({ userCurrencies: state.userCurrencies }),
    }
  )
);