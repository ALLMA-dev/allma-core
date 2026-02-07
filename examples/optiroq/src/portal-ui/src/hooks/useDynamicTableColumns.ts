import { useMemo } from 'react';
import { BaseFieldConfig, FieldPriority } from '@optiroq/types';

/**
 * A utility function to check if a value is considered "present" for display in a table.
 * Null, undefined, and empty strings are considered not present.
 * @param value The value to check.
 * @returns True if the value is present, false otherwise.
 */
function isValuePresent(value: any): boolean {
  return value !== null && value !== undefined && value !== '';
}

/**
 * A custom hook that determines which table columns to display based on field definitions
 * and the provided data, according to specific priority rules.
 *
 * @template T A generic type for the data items, which must be objects.
 * @template F A generic type for the field config, extending BaseFieldConfig.
 * @param {T[]} data The array of data objects to be displayed in the table.
 * @param {F[]} allPossibleColumns The complete list of field definitions for all potential columns.
 * @returns {F[]} An array of field config objects for the columns that should be visible.
 */
export function useDynamicTableColumns<T extends Record<string, any>, F extends BaseFieldConfig = BaseFieldConfig>(
  data: T[],
  allPossibleColumns: F[]
): F[] {
  return useMemo(() => {
    if (!allPossibleColumns || allPossibleColumns.length === 0) {
      return [];
    }

    const visibleColumns = allPossibleColumns.filter(column => {
      // Rule 1: 'Must-Have' fields are always shown.
      if (column.priority === FieldPriority.MUST_HAVE) {
        return true;
      }

      // Rule 2 & 3: 'Recommended' and 'Optional' fields are shown only if at least one
      // item in the dataset has a value for this field.
      if (column.priority === FieldPriority.RECOMMENDED || column.priority === FieldPriority.OPTIONAL) {
        return data.some(item => isValuePresent(item[column.key]));
      }

      // Default case: don't show fields without a recognized priority.
      return false;
    });

    // Sort the visible columns based on their defined display order.
    return visibleColumns.sort((a, b) => a.display_order - b.display_order);
  }, [data, allPossibleColumns]);
}