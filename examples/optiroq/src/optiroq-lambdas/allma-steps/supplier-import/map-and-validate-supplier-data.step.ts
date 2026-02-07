import { MasterField, MappingPlan, Supplier, Commodity } from '@optiroq/types';
import { log_info, log_warn } from '@allma/core-sdk';

interface StepInput {
  extractedData: {
    parts: Record<string, any>[]; // Reusing 'parts' from generic extractor output
  };
  mappingPlan: MappingPlan;
  supplierFields: { content: MasterField[] };
  existingCommodities: Commodity[];
  correlationId: string;
  userId: string;
}

interface SupplierProcessingResult {
  supplierData: Partial<Supplier>;
  knownCommodityIds: string[];
  newCommodityNames: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  validatedData: SupplierProcessingResult[];
  newCommodityNames: string[]; // A unique list of all new commodities found
  userId: string;
}

/**
 * @description Maps supplier data, validates it, and identifies which commodities
 * are known vs. which need to be created.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<ValidationResult> => {
  const { extractedData, mappingPlan, supplierFields, existingCommodities, correlationId, userId } = event.stepInput;
  log_info('Mapping, validating, and identifying new commodities for suppliers', { correlationId, supplierCount: extractedData.parts.length });

  const errors: string[] = [];
  const processedSuppliers: SupplierProcessingResult[] = [];
  const supplierFieldMap = new Map(supplierFields.content.map(f => [f.key, f]));
  const commodityMap = new Map(existingCommodities.map(c => [c.name.toLowerCase(), c.commodityId]));
  const allNewCommodityNames = new Set<string>();

  for (const rawSupplier of extractedData.parts) {
    const intermediateSupplier: Partial<Supplier> = {};
    let rawCommodities: string[] = [];

    for (const rawHeader in rawSupplier) {
      const plan = mappingPlan[rawHeader];
      let value = rawSupplier[rawHeader];

      if (plan?.mapsTo) {
        const field = supplierFieldMap.get(plan.mapsTo);
        if (field) {
          if (value !== null && value !== undefined) {
             if (field.key === 'commodityIds') {
                rawCommodities = String(value).split(',').map(s => s.trim()).filter(Boolean);
                continue; // Handle commodities separately
            }
            switch (field.fieldType) {
              case 'number': 
                value = Number(value); 
                if (isNaN(value)) value = rawSupplier[rawHeader]; 
                break;
              case 'boolean': 
                const lowerValue = String(value).toLowerCase(); 
                value = ['true', 'yes', '1'].includes(lowerValue); 
                break;
            }
          }
        }
        (intermediateSupplier as any)[plan.mapsTo] = value;
      }
    }
    
    // Process and differentiate commodities
    const knownCommodityIds: string[] = [];
    const newCommodityNames: string[] = [];
    for (const commName of rawCommodities) {
        const foundId = commodityMap.get(commName.toLowerCase());
        if (foundId) {
            knownCommodityIds.push(foundId);
        } else {
            newCommodityNames.push(commName);
            allNewCommodityNames.add(commName);
        }
    }
    
    processedSuppliers.push({
        supplierData: intermediateSupplier,
        knownCommodityIds,
        newCommodityNames,
    });
  }

  // Perform validation
  for (const [index, result] of processedSuppliers.entries()) {
    const supplier = result.supplierData;
    const supplierIdentifier = supplier.supplierName || `Row ${index + 2}`;
    
    if (!supplier.supplierName || String(supplier.supplierName).trim() === '') {
      errors.push(`Supplier "${supplierIdentifier}": Missing required field 'Supplier Name'.`);
    }

    if (result.knownCommodityIds.length === 0 && result.newCommodityNames.length === 0) {
      errors.push(`Supplier "${supplierIdentifier}": At least one commodity is required.`);
    }
  }

  const isValid = errors.length === 0;

  if (isValid) {
    log_info('Supplier mapping and validation successful', { correlationId, newCommodityCount: allNewCommodityNames.size });
  } else {
    log_warn('Supplier mapping and validation failed', { correlationId, errorCount: errors.length, errors });
  }

  return { 
      isValid, 
      errors, 
      validatedData: processedSuppliers, 
      newCommodityNames: Array.from(allNewCommodityNames),
      userId 
    };
};