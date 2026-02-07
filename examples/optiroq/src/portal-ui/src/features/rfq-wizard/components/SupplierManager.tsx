// allma-core/examples/optiroq/src/portal-ui/src/features/rfq-wizard/components/SupplierManager.tsx
import { useState, useMemo } from 'react';
import { Stack, Text, Group, Button, Checkbox, TextInput, ActionIcon, Alert, Badge, Card, SimpleGrid, Fieldset } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconPlus, IconX, IconAlertTriangle } from '@tabler/icons-react';
import { SupplierSummary, RFQ } from '@optiroq/types';

interface SupplierManagerProps {
  selectedSuppliers: RFQ['suppliers'];
  allSuppliers: SupplierSummary[];
  onSelectionChange: (newSelection: RFQ['suppliers']) => void;
  requiredCommodityIds: string[];
}

export function SupplierManager({ selectedSuppliers, allSuppliers, onSelectionChange, requiredCommodityIds }: SupplierManagerProps) {
  const { t } = useTranslation('rfq_wizard');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');

  const numSelected = useMemo(() => selectedSuppliers.filter(s => s.selected).length, [selectedSuppliers]);

  const { recommendedSuppliers, otherSuppliers } = useMemo(() => {
    if (requiredCommodityIds.length === 0) {
      return { recommendedSuppliers: [], otherSuppliers: allSuppliers };
    }
    const recommended = allSuppliers.filter(s => 
      (s.commodityIds || []).some(cid => requiredCommodityIds.includes(cid))
    );
    const other = allSuppliers.filter(s => 
      !(s.commodityIds || []).some(cid => requiredCommodityIds.includes(cid))
    );
    return { recommendedSuppliers: recommended, otherSuppliers: other };
  }, [allSuppliers, requiredCommodityIds]);


  const handleAddSupplier = () => {
    if (newSupplierName.trim() && newSupplierEmail.trim()) {
      onSelectionChange([
        ...selectedSuppliers,
        {
          supplierId: `new-${Date.now()}`,
          name: newSupplierName.trim(),
          email: newSupplierEmail.trim(),
          selected: true,
        },
      ]);
      setNewSupplierName('');
      setNewSupplierEmail('');
    }
  };

  const handleRemoveSupplier = (email: string) => {
    if (selectedSuppliers.length > 3) {
      onSelectionChange(selectedSuppliers.filter(s => s.email !== email));
    }
  };
  
  const handleToggleSupplier = (supplier: SupplierSummary, checked: boolean) => {
      const existing = selectedSuppliers.find(s => s.email === supplier.email);
      if (existing) {
        onSelectionChange(selectedSuppliers.map(s => s.email === supplier.email ? {...s, selected: checked} : s));
      } else {
        onSelectionChange([...selectedSuppliers, { supplierId: supplier.supplierId, name: supplier.supplierName, email: supplier.email || '', selected: true }]);
      }
  };
  
  const handleSelectAll = (suppliersToSelect: SupplierSummary[]) => {
      const newSelection = [...selectedSuppliers];
      suppliersToSelect.forEach(s => {
          if (!newSelection.some(sel => sel.email === s.email)) {
              newSelection.push({ supplierId: s.supplierId, name: s.supplierName, email: s.email || '', selected: true });
          } else {
              newSelection.forEach(sel => { if(sel.email === s.email) sel.selected = true; });
          }
      });
      onSelectionChange(newSelection);
  };
  const handleClearAll = () => onSelectionChange(selectedSuppliers.map(s => ({...s, selected: false})));

  const renderSupplierGrid = (suppliers: SupplierSummary[]) => (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
      {suppliers.map(supplier => {
        const isSelected = selectedSuppliers.some(s => s.email === supplier.email && s.selected);
        return (
          <Card withBorder p="sm" key={supplier.supplierId}>
            <Group justify="space-between">
              <Checkbox
                checked={isSelected}
                onChange={(e) => handleToggleSupplier(supplier, e.currentTarget.checked)}
                label={<Text fw={500}>{supplier.supplierName}</Text>}
              />
            </Group>
            <Text size="sm" c="dimmed">{supplier.email}</Text>
            <Badge mt="xs" variant="light" color="gray">{t('step2.previousRfqs', { count: supplier.previousRFQs || 0 })}</Badge>
          </Card>
        )
      })}
    </SimpleGrid>
  );

  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={500}>{t('step2.title')}</Text>
        <Button variant="subtle" size="xs" onClick={handleClearAll}>{t('step2.clearAll')}</Button>
      </Group>
      
      {numSelected < 3 && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title={t('step2.minSuppliersWarningTitle')}>
            {t('step2.minSuppliersWarningDesc')}
        </Alert>
      )}
      
      {recommendedSuppliers.length > 0 && (
          <Fieldset legend={t('step2.recommendedSuppliers')} variant="filled">
              <Group justify="flex-end" mb="xs">
                <Button variant="subtle" size="xs" onClick={() => handleSelectAll(recommendedSuppliers)}>{t('step2.selectAllRecommended')}</Button>
              </Group>
              {renderSupplierGrid(recommendedSuppliers)}
          </Fieldset>
      )}

      {otherSuppliers.length > 0 && (
          <Fieldset legend={t('step2.otherSuppliers')}>
              {renderSupplierGrid(otherSuppliers)}
          </Fieldset>
      )}

      <Card withBorder>
        <Stack>
            <Text fw={500}>{t('step2.addNewSupplier')}</Text>
            <Group grow>
                <TextInput placeholder={t('step2.supplierNamePlaceholder')} value={newSupplierName} onChange={(e) => setNewSupplierName(e.currentTarget.value)} />
                <TextInput placeholder={t('step2.supplierEmailPlaceholder')} value={newSupplierEmail} onChange={(e) => setNewSupplierEmail(e.currentTarget.value)} />
            </Group>
            <Button variant="outline" leftSection={<IconPlus size={16} />} onClick={handleAddSupplier}>
              {t('step2.addSupplier')}
            </Button>
        </Stack>
      </Card>

    </Stack>
  );
}