import { BaseFieldConfig } from '@optiroq/types';
import React from 'react';

/**
 * Formats a value for display, adding units if available as a ConvertibleValue object.
 * @param value The value to format (can be a primitive or a ConvertibleValue object).
 * @param field The field definition, used for context.
 * @returns A formatted string or ReactNode.
 */
export function formatValueWithUnit(value: any, field: BaseFieldConfig): React.ReactNode {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle boolean values explicitly for clear display
  if (field.fieldType === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle ConvertibleValue objects
  if (typeof value === 'object' && 'value' in value && 'unit' in value) {
    if (value.value === null || value.value === undefined) return '';
    const numberFormatOptions: Intl.NumberFormatOptions = {};
    if (field.fieldType === 'currency') {
      numberFormatOptions.minimumFractionDigits = 2;
      numberFormatOptions.maximumFractionDigits = 2;
    } else {
      numberFormatOptions.maximumFractionDigits = 4;
    }
    return `${Number(value.value).toLocaleString(undefined, numberFormatOptions)} ${value.unit}`;
  }

  // Handle simple numbers
  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  return String(value);
}