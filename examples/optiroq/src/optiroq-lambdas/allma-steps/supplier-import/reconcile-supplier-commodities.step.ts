import { Supplier, Commodity } from '@optiroq/types';
import { log_info } from '@allma/core-sdk';

interface SupplierProcessingResult {
  supplierData: Partial<Supplier>;
  knownCommodityIds: string[];
  newCommodityNames: string[];
}

interface StepInput {
  suppliersToProcess: SupplierProcessingResult[];
  newlyCreatedCommodities?: Commodity[];
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step.
 * Merges the list of known commodity IDs with the IDs of newly created commodities
 * to produce the final, complete list of suppliers ready for persistence.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<Partial<Supplier>[]> => {
  const { suppliersToProcess, newlyCreatedCommodities = [] } = event.stepInput;
  log_info('Reconciling supplier commodities', { supplierCount: suppliersToProcess.length, newCommodityCount: newlyCreatedCommodities.length });
  
  const newCommodityMap = new Map(newlyCreatedCommodities.map(c => [c.name, c.commodityId]));
  
  const finalSuppliers: Partial<Supplier>[] = suppliersToProcess.map(result => {
    const newIds = result.newCommodityNames
      .map(name => newCommodityMap.get(name))
      .filter((id): id is string => !!id);
      
    const finalCommodityIds = [...new Set([...result.knownCommodityIds, ...newIds])];

    return {
      ...result.supplierData,
      commodityIds: finalCommodityIds,
    };
  });
  
  log_info('Successfully reconciled commodities for all suppliers.');
  return finalSuppliers;
};