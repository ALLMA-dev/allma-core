import { ReactNode } from 'react';
import { Table, TextInput, Group, Button, Text, Center, Box, Skeleton, Stack } from '@mantine/core';
import { IconSearch, IconChevronDown } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { BaseFieldConfig } from '@optiroq/types';
import { useDynamicTableColumns } from '@/hooks/useDynamicTableColumns';
import { useTableControls, UseTableControlsOptions } from '@/hooks/useTableControls';
import { formatValueWithUnit } from '@/lib/formatters';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

export interface SearchableDataGridProps<T extends Record<string, any>, TFilter = string> {
  /** The full dataset to display. */
  data: T[] | undefined;

  /** Field definitions driving dynamic columns. */
  fields: BaseFieldConfig[];

  /** Unique key extractor for each row. */
  rowKey: (item: T) => string;

  /** Whether data is currently loading. */
  isLoading?: boolean;

  /** Error object to display if fetching failed. */
  error?: Error | null;

  /** Error title shown above the error message. */
  errorTitle?: string;

  /** Called when a table row is clicked. */
  onRowClick?: (item: T) => void;

  /** Search function passed to useTableControls. */
  searchFn?: UseTableControlsOptions<T, TFilter>['searchFn'];

  /** Filter function passed to useTableControls. */
  filterFn?: UseTableControlsOptions<T, TFilter>['filterFn'];

  /** Initial filter value passed to useTableControls. */
  initialFilter?: TFilter;

  /** Placeholder text for the search input. */
  searchPlaceholder?: string;

  /** Message displayed when data is empty or all filtered out. */
  emptyMessage?: string;

  /** Initial visible item count for pagination. @default 20 */
  initialItemsCount?: number;

  /** Items to add per "load more" click. @default 20 */
  itemsPerLoad?: number;

  /**
   * Render slot for custom filter controls (e.g., MultiSelect, SegmentedControl).
   * Receives the current filter value and setter.
   */
  renderFilters?: (filterValue: TFilter, setFilterValue: (v: TFilter) => void) => ReactNode;

  /**
   * Render slot for per-row action buttons.
   * Receives the data item for the current row.
   */
  renderActions?: (item: T) => ReactNode;

  /**
   * Render custom cell content for a specific column key.
   * Return undefined to fall back to the default formatter.
   */
  renderCell?: (item: T, columnKey: string, field: BaseFieldConfig) => ReactNode | undefined;
}

/**
 * A reusable, field-driven data grid with built-in search, filtering,
 * dynamic column generation, and progressive "load more" pagination.
 *
 * Composes `useTableControls` and `useDynamicTableColumns` internally.
 */
export function SearchableDataGrid<T extends Record<string, any>, TFilter = string>({
  data,
  fields,
  rowKey,
  isLoading,
  error,
  errorTitle,
  onRowClick,
  searchFn,
  filterFn,
  initialFilter,
  searchPlaceholder,
  emptyMessage,
  initialItemsCount = 20,
  itemsPerLoad = 20,
  renderFilters,
  renderActions,
  renderCell,
}: SearchableDataGridProps<T, TFilter>) {
  const { t } = useTranslation(['common']);

  const {
    searchQuery,
    setSearchQuery,
    filterValue,
    setFilterValue,
    visibleItems,
    visibleCount,
    hasMore,
    loadMore,
    filteredData,
  } = useTableControls<T, TFilter>({
    data,
    initialItemsCount,
    itemsPerLoad,
    filterFn,
    searchFn,
    initialFilter,
  });

  const visibleColumns = useDynamicTableColumns(data ?? [], fields);

  // --- Loading state ---
  if (isLoading) {
    return (
      <Stack gap="sm">
        <Skeleton height={36} />
        <Skeleton height={40} radius="sm" />
        <Skeleton height={40} radius="sm" />
        <Skeleton height={40} radius="sm" />
      </Stack>
    );
  }

  // --- Error state ---
  if (error) {
    return <ErrorAlert title={errorTitle ?? t('common:Error')} message={error.message} />;
  }

  return (
    <Stack gap="md">
      {/* --- Controls row: search + filters --- */}
      <Group gap="md" align="flex-end">
        {searchFn && (
          <TextInput
            placeholder={searchPlaceholder ?? t('common:Search...')}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            style={{ flex: 1, maxWidth: 400 }}
          />
        )}
        {renderFilters?.(filterValue, setFilterValue)}
      </Group>

      {/* --- Empty state --- */}
      {(!data || data.length === 0) && (
        <Center p="xl">
          <Text c="dimmed">{emptyMessage ?? t('common:No data available')}</Text>
        </Center>
      )}

      {/* --- Filtered-empty state --- */}
      {data && data.length > 0 && filteredData.length === 0 && (
        <Center p="xl">
          <Box style={{ textAlign: 'center' }}>
            <Text c="dimmed">{t('common:No results matching your criteria')}</Text>
          </Box>
        </Center>
      )}

      {/* --- Table --- */}
      {filteredData.length > 0 && (
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {visibleColumns.map(column => (
                  <Table.Th key={column.key}>{column.displayName}</Table.Th>
                ))}
                {renderActions && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleItems.map((item) => (
                <Table.Tr
                  key={rowKey(item)}
                  onClick={() => onRowClick?.(item)}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {visibleColumns.map(column => {
                    const customCell = renderCell?.(item, column.key, column);
                    return (
                      <Table.Td key={`${rowKey(item)}-${column.key}`}>
                        {customCell !== undefined ? customCell : formatValueWithUnit(item[column.key], column)}
                      </Table.Td>
                    );
                  })}
                  {renderActions && (
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" onClick={(e) => e.stopPropagation()}>
                        {renderActions(item)}
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {/* --- Load more --- */}
      {hasMore && (
        <Group justify="center" mt="sm">
          <Button
            variant="default"
            onClick={loadMore}
            rightSection={<IconChevronDown size={14} />}
          >
            {t('common:See more ({{count}} remaining)', { count: filteredData.length - visibleCount })}
          </Button>
        </Group>
      )}
    </Stack>
  );
}
