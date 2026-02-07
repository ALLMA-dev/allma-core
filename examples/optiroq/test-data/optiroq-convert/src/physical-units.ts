import convert from 'convert-units';
import { ConvertibleValue } from '@optiroq/types';

/**
 * Performs physical unit conversion using the 'convert-units' library.
 * @param value The numeric value to convert.
 * @param fromUnit The unit to convert from.
 * @param toUnit The unit to convert to.
 * @returns The converted value.
 * @throws If the units are incompatible or not supported.
 */
export function convertPhysicalUnit(value: number, fromUnit: string, toUnit: string): number {
  try {
    return convert(value).from(fromUnit as any).to(toUnit as any);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Incompatible units')) {
      throw new Error(`Incompatible units for conversion: Cannot convert from '${fromUnit}' to '${toUnit}'.`);
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Creates a complete ConvertibleValue object for a physical unit field.
 * @param originalValue The value as ingested.
 * @param originalUnit The unit as ingested.
 * @param normalizedUnit The target unit for normalization (e.g., 'kg', 'm').
 * @param precision The number of decimal places for rounding.
 * @returns A ConvertibleValue object for the physical unit.
 */
export function createPhysicalUnitValue(
  originalValue: number,
  originalUnit: string,
  normalizedUnit: string,
  precision: number = 4
): ConvertibleValue {
  const normalizedValue = convertPhysicalUnit(originalValue, originalUnit, normalizedUnit);

  const roundedNormalized = parseFloat(normalizedValue.toFixed(precision));

  return {
    originalValue,
    originalUnit,
    normalizedValue: roundedNormalized,
    normalizedUnit,
    // For now, display value is the same as original
    value: originalValue,
    unit: originalUnit,
    lastUpdatedAt: new Date().toISOString(),
  };
}