import { FxRates, ConvertibleValue } from '@optiroq/types';

/**
 * Performs currency conversion.
 * @param value The amount to convert.
 * @param fromUnit The currency to convert from (e.g., 'USD').
 * @param toUnit The currency to convert to (e.g., 'EUR').
 * @param rates The exchange rates object, with all rates relative to a single base.
 * @returns The converted value.
 * @throws If conversion is not possible (e.g., rate not found).
 */
export function convertCurrency(value: number, fromUnit: string, toUnit: string, rates: FxRates): number {
  const from = fromUnit.toUpperCase();
  const to = toUnit.toUpperCase();

  if (from === to) {
    return value;
  }

  // All rates are relative to the base currency (e.g., EUR).
  // To convert from A to B: Value(A) * (Rate(B) / Rate(A))
  // However, our rates are given as "1 BASE = X TARGET". So Rate(A) is the value for A.
  // To convert from A (source) to B (target), when base is C:
  // 1. Convert A to C: valueInA / rateForA
  // 2. Convert C to B: valueInC * rateForB
  // Formula: valueInA * (rateForB / rateForA)

  const rateFrom = rates.rates[from];
  const rateTo = rates.rates[to];
  const baseRate = rates.rates[rates.base];

  if (baseRate !== 1) {
    throw new Error(`Invalid rates object: The rate for the base currency '${rates.base}' must be 1.`);
  }

  if (rateFrom === undefined) {
    throw new Error(`Currency conversion failed: Rate for source currency '${from}' not found.`);
  }
  if (rateTo === undefined) {
    throw new Error(`Currency conversion failed: Rate for target currency '${to}' not found.`);
  }

  const convertedValue = value * (rateTo / rateFrom);
  return convertedValue;
}

/**
 * Creates a complete ConvertibleValue object for a currency field.
 * @param originalValue The value as ingested.
 * @param originalUnit The unit as ingested.
 * @param normalizedUnit The target unit for normalization (system's base currency).
 * @param rates The exchange rates object.
 * @param precision The number of decimal places for rounding.
 * @returns A ConvertibleValue object for the currency.
 */
export function createCurrencyValue(
  originalValue: number,
  originalUnit: string,
  normalizedUnit: string,
  rates: FxRates,
  precision: number = 2
): ConvertibleValue {
  const normalizedValue = convertCurrency(originalValue, originalUnit, normalizedUnit, rates);

  const roundedNormalized = parseFloat(normalizedValue.toFixed(precision));

  return {
    originalValue,
    originalUnit,
    normalizedValue: roundedNormalized,
    normalizedUnit,
    // For now, display value is the same as original
    value: originalValue,
    unit: originalUnit,
    lastUpdatedAt: rates.timestamp,
  };
}