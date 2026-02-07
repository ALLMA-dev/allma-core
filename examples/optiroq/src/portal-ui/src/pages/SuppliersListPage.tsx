import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Group, MultiSelect, SegmentedControl, ActionIcon, Tooltip } from '@mantine/core';
import { IconUpload, IconPlus, IconEye, IconArchive, IconArchiveOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { SearchableDataGrid } from '@/components/shared/SearchableDataGrid';
import { useApiView, useApiCommand } from '@/hooks/useApi';
import {
  SuppliersListViewModel,
  SupplierSummary,
  CategorizedCommodityViewModel,
  BaseFieldConfig,
} from '@optiroq/types';

import supplierFields from '../../../../config/supplier-fields.json';

/** Filter state for the supplier grid: status toggle + selected commodity IDs. */
interface SupplierFilter {
  status: 'ACTIVE' | 'ARCHIVED' | 'ALL';
  commodityIds: string[];
}

const INITIAL_FILTER: SupplierFilter = {
  status: 'ACTIVE',
  commodityIds: [],
};

export function SuppliersListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['suppliers_list', 'common']);

  const {
    data: suppliersData,
    isLoading: isLoadingSuppliers,
    error: suppliersError,
  } = useApiView<SuppliersListViewModel>('suppliers-list', null);

  const {
    data: commoditiesData,
    isLoading: isLoadingCommodities,
    error: commoditiesError,
  } = useApiView<CategorizedCommodityViewModel[]>('commodities-list', null);

  const { mutate: sendCommand } = useApiCommand('supplier', null);

  const isLoading = isLoadingSuppliers || isLoadingCommodities;
  const error = suppliersError || commoditiesError;

  // --- Commodity helpers ---
  const commodityMap = useMemo(() => {
    if (!commoditiesData) return new Map<string, string>();
    const map = new Map<string, string>();
    commoditiesData.forEach(category => {
      category.commodities.forEach(c => map.set(c.id, c.name));
    });
    return map;
  }, [commoditiesData]);

  const commoditySelectData = useMemo(() => {
    if (!commoditiesData) return [];
    return commoditiesData.flatMap(category =>
      category.commodities.map(c => ({ value: c.id, label: c.name })),
    );
  }, [commoditiesData]);

  // --- Search / Filter callbacks ---
  const searchFn = useCallback(
    (supplier: SupplierSummary, query: string) => {
      const q = query.toLowerCase();
      return (
        (supplier.supplierName ?? '').toLowerCase().includes(q) ||
        (supplier.titanNo ?? '').toLowerCase().includes(q) ||
        (supplier.contactName ?? '').toLowerCase().includes(q) ||
        (supplier.contactEmail ?? '').toLowerCase().includes(q)
      );
    },
    [],
  );

  const filterFn = useCallback(
    (supplier: SupplierSummary, filter: SupplierFilter) => {
      // Status filter
      if (filter.status !== 'ALL') {
        const supplierStatus = supplier.status ?? 'ACTIVE';
        if (supplierStatus !== filter.status) return false;
      }
      // Commodity filter
      if (filter.commodityIds.length > 0) {
        const ids = supplier.commodityIds ?? [];
        if (!filter.commodityIds.some(cid => ids.includes(cid))) return false;
      }
      return true;
    },
    [],
  );

  // --- Actions ---
  const handleToggleArchive = useCallback(
    (supplier: SupplierSummary) => {
      const newStatus = supplier.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
      sendCommand({
        command: 'update-status',
        idOverride: supplier.supplierId,
        payload: { status: newStatus },
      });
    },
    [sendCommand],
  );

  return (
    <AppShell>
      <PageContainer
        title={t('pageTitle')}
        rightSection={
          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<IconPlus size={14} />}
              onClick={() => navigate('/suppliers/new')}
            >
              {t('newSupplier')}
            </Button>
            <Button
              leftSection={<IconUpload size={14} />}
              onClick={() => navigate('/suppliers/import')}
            >
              {t('importSuppliers')}
            </Button>
          </Group>
        }
      >
        <SearchableDataGrid<SupplierSummary, SupplierFilter>
          data={suppliersData?.suppliers}
          fields={supplierFields as BaseFieldConfig[]}
          rowKey={(s) => s.supplierId}
          isLoading={isLoading}
          error={error}
          errorTitle={t('errorLoadingTitle')}
          searchFn={searchFn}
          filterFn={filterFn}
          initialFilter={INITIAL_FILTER}
          searchPlaceholder={t('searchPlaceholder')}
          emptyMessage={t('emptyMessage')}
          initialItemsCount={20}
          itemsPerLoad={20}
          onRowClick={(supplier) => navigate(`/suppliers/${supplier.supplierId}`)}
          renderFilters={(filterValue, setFilterValue) => (
            <Group gap="md" align="flex-end">
              <SegmentedControl
                value={filterValue.status}
                onChange={(value) =>
                  setFilterValue({ ...filterValue, status: value as SupplierFilter['status'] })
                }
                data={[
                  { label: t('statusAll'), value: 'ALL' },
                  { label: t('statusActive'), value: 'ACTIVE' },
                  { label: t('statusArchived'), value: 'ARCHIVED' },
                ]}
              />
              <MultiSelect
                placeholder={t('filterByCommodity')}
                data={commoditySelectData}
                value={filterValue.commodityIds}
                onChange={(ids) => setFilterValue({ ...filterValue, commodityIds: ids })}
                clearable
                searchable
                style={{ minWidth: 250 }}
              />
            </Group>
          )}
          renderCell={(supplier, columnKey) => {
            if (columnKey === 'commodityIds') {
              return (
                <Group gap="xs">
                  {(supplier.commodityIds ?? []).map(id => (
                    <Badge key={id} variant="outline" size="sm">
                      {commodityMap.get(id) ?? id}
                    </Badge>
                  ))}
                </Group>
              );
            }
            if (columnKey === 'status') {
              const isActive = (supplier.status ?? 'ACTIVE') === 'ACTIVE';
              return (
                <Badge color={isActive ? 'green' : 'gray'} variant="light" size="sm">
                  {isActive ? t('statusActive') : t('statusArchived')}
                </Badge>
              );
            }
            return undefined;
          }}
          renderActions={(supplier) => (
            <>
              <Tooltip label={t('viewSupplier')}>
                <ActionIcon
                  variant="subtle"
                  onClick={() => navigate(`/suppliers/${supplier.supplierId}`)}
                >
                  <IconEye size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip
                label={supplier.status === 'ARCHIVED' ? t('unarchiveSupplier') : t('archiveSupplier')}
              >
                <ActionIcon
                  variant="subtle"
                  color={supplier.status === 'ARCHIVED' ? 'blue' : 'orange'}
                  onClick={() => handleToggleArchive(supplier)}
                >
                  {supplier.status === 'ARCHIVED' ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
                </ActionIcon>
              </Tooltip>
            </>
          )}
        />
      </PageContainer>
    </AppShell>
  );
}