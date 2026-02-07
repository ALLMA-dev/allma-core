export const SUPPORTED_WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz', 't'] as const;
export const SUPPORTED_LENGTH_UNITS = ['m', 'cm', 'mm', 'in', 'ft'] as const;
export const SUPPORTED_VOLUME_UNITS = ['l', 'ml', 'm3', 'cm3'] as const;

export type WeightUnit = typeof SUPPORTED_WEIGHT_UNITS[number];
export type LengthUnit = typeof SUPPORTED_LENGTH_UNITS[number];
export type VolumeUnit = typeof SUPPORTED_VOLUME_UNITS[number];