// allma-core/examples/optiroq/src/portal-ui/src/features/rfq-wizard/Step2_Suppliers.tsx
import { SupplierManager } from './components/SupplierManager';
import { useRfqWizardStore } from '@/stores/useRfqWizardStore';

// MODIFIED: Added requiredCommodityIds prop
interface Step2SuppliersProps {
  requiredCommodityIds: string[];
}

export function Step2_Suppliers({ requiredCommodityIds }: Step2SuppliersProps) {
  const { suppliers, allSuppliers, actions } = useRfqWizardStore();

  return (
    <SupplierManager
      selectedSuppliers={suppliers}
      allSuppliers={allSuppliers}
      onSelectionChange={(newSuppliers) => actions.setField('suppliers', newSuppliers)}
      requiredCommodityIds={requiredCommodityIds}
    />
  );
}