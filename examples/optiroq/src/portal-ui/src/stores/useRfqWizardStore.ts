// allma-core/examples/optiroq/src/portal-ui/src/stores/useRfqWizardStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { RfqEditViewModel, BOMPart, SupplierSummary, RFQ, CategorizedCommodityViewModel } from '@optiroq/types';
import { z } from 'zod';

const STEPS = 5;

// Schemas for validation
const step1Schema = z.object({
  parts: z.array(z.string()).min(1, { message: 'rfq_wizard:validation.minOnePart' }),
  commodity: z.string().min(1, { message: 'rfq_wizard:validation.commodityRequired' }),
  volumeScenarios: z.array(z.object({
    volume: z.number().min(1, { message: 'rfq_wizard:validation.volumeRequired' }),
    unit: z.string().min(1),
  })).min(1),
});

const step2Schema = z.object({
  suppliers: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    selected: z.boolean(),
  })).refine(suppliers => suppliers.filter(s => s.selected).length >= 3, { message: 'rfq_wizard:validation.minThreeSuppliers' }),
});

const step3Schema = z.object({
  requirements: z.object({
    material: z.literal(true),
    process: z.literal(true),
    tooling: z.literal(true),
    logistics: z.literal(true),
    terms: z.literal(true),
    capacity: z.literal(true),
  }).passthrough(),
});

const step4Schema = z.object({
  responseDeadline: z.string().refine(val => new Date(val) > new Date(), { message: 'rfq_wizard:validation.deadlineInFuture' }),
  languagePreference: z.string().min(1),
});

type RfqState = Omit<RFQ, 'PK' | 'SK' | 'entityType' | 'createdAt' | 'updatedAt' | 'ownerId'> & {
  // Store full objects for UI convenience
  bomParts: BOMPart[];
  allSuppliers: SupplierSummary[];
  categorizedCommodities: CategorizedCommodityViewModel[];
};

interface RfqWizardState extends RfqState {
  currentStep: number;
  errors: z.ZodError | null; // MODIFIED: Store the full error object
  isSubmitting: boolean;
  actions: {
    initialize: (data: RfqEditViewModel) => void;
    setField: <K extends keyof RfqState>(field: K, value: RfqState[K]) => void;
    goToNextStep: () => void;
    goToPrevStep: () => void;
    setStep: (step: number) => void;
    validateCurrentStep: () => void;
    setSubmitting: (isSubmitting: boolean) => void;
  };
  getRfqPayload: () => Partial<RFQ>;
}

const defaultRequirements = {
  material: true,
  process: true,
  tooling: true,
  logistics: true,
  terms: true,
  capacity: true,
  quality: false,
  prototype: false,
  sustainability: false,
};

const validateStep = (step: number, data: RfqState): z.ZodError | null => {
  let schema: z.ZodSchema;
  switch (step) {
    case 1: schema = step1Schema; break;
    case 2: schema = step2Schema; break;
    case 3: schema = step3Schema; break;
    case 4: schema = step4Schema; break;
    case 5: // Final check combines all schemas
      schema = step1Schema.merge(step2Schema).merge(step3Schema).merge(step4Schema);
      break;
    default: return new z.ZodError([]);
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return null;
  } else {
    return result.error;
  }
};

export const useRfqWizardStore = create<RfqWizardState>()(
  immer((set, get) => ({
    // RFQ State
    rfqId: '',
    projectId: '',
    status: 'DRAFT',
    version: 1,
    parts: [],
    partDescriptions: {},
    volumeScenarios: [{ volume: 50000, unit: 'pieces/year' }],
    commodity: '',
    attachments: [],
    suppliers: [],
    requirements: defaultRequirements,
    responseDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    languagePreference: 'English',
    additionalNotes: '',
    // UI State
    bomParts: [],
    allSuppliers: [],
    categorizedCommodities: [],
    currentStep: 1,
    errors: null, // MODIFIED: Default to null
    isSubmitting: false,
    // Actions
    actions: {
      initialize: (data) => set((state) => {
        const { rfq, bomParts, suppliers, categorizedCommodities } = data;
        state.rfqId = rfq.rfqId;
        state.projectId = rfq.projectId;
        state.status = rfq.status;
        state.version = rfq.version;
        state.parts = rfq.parts || [];
        
        // MODIFIED: Proactively pre-fill part descriptions on initialization.
        const initialDescriptions = rfq.partDescriptions || {};
        (rfq.parts || []).forEach(partName => {
            if (!initialDescriptions[partName]) {
                const bomPart = bomParts.find(p => p.partName === partName);
                if (bomPart?.description) {
                    initialDescriptions[partName] = bomPart.description;
                }
            }
        });
        state.partDescriptions = initialDescriptions;

        state.volumeScenarios = rfq.volumeScenarios?.length > 0 ? rfq.volumeScenarios : [{ volume: 50000, unit: 'pieces/year' }];
        state.commodity = rfq.commodity || '';
        state.attachments = rfq.attachments || [];
        state.suppliers = rfq.suppliers?.length > 0 ? rfq.suppliers : suppliers.slice(0,3).map(s => ({ supplierId: s.supplierId, name: s.supplierName, email: s.email || '', selected: true }));
        state.requirements = rfq.requirements || defaultRequirements;
        state.responseDeadline = rfq.responseDeadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        state.languagePreference = rfq.languagePreference || 'English';
        state.additionalNotes = rfq.additionalNotes || '';

        state.bomParts = bomParts;
        state.allSuppliers = suppliers;
        state.categorizedCommodities = categorizedCommodities;

        state.currentStep = 1;
        state.isSubmitting = false;
        get().actions.validateCurrentStep();
      }),
      setField: (field, value) => set((state) => {
        (state as any)[field] = value;

        // When parts selection changes, pre-fill any missing descriptions.
        if (field === 'parts' && Array.isArray(value)) {
            const newPartNames = value as string[];
            newPartNames.forEach(partName => {
                // Only pre-fill if a description for this part doesn't already exist in the state.
                // This preserves any manual edits the user has made.
                if (!state.partDescriptions[partName]) {
                    const bomPart = state.bomParts.find(p => p.partName === partName);
                    if (bomPart?.description) {
                        state.partDescriptions[partName] = bomPart.description;
                    }
                }
            });
        }
        
        get().actions.validateCurrentStep();
      }),
      goToNextStep: () => set((state) => {
        if (state.currentStep < STEPS) {
          state.currentStep += 1;
          get().actions.validateCurrentStep();
        }
      }),
      goToPrevStep: () => set((state) => {
        if (state.currentStep > 1) {
          state.currentStep -= 1;
          get().actions.validateCurrentStep();
        }
      }),
      setStep: (step) => set((state) => {
        if (step >= 1 && step <= STEPS) {
          state.currentStep = step;
          get().actions.validateCurrentStep();
        }
      }),
      validateCurrentStep: () => set((state) => {
        state.errors = validateStep(state.currentStep, get());
      }),
      setSubmitting: (isSubmitting) => set({ isSubmitting }),
    },
    getRfqPayload: () => {
        const state = get();
        // Return only the fields that are part of the RFQ entity
        return {
            parts: state.parts,
            partDescriptions: state.partDescriptions,
            volumeScenarios: state.volumeScenarios,
            commodity: state.commodity,
            attachments: state.attachments,
            suppliers: state.suppliers,
            requirements: state.requirements,
            responseDeadline: state.responseDeadline,
            languagePreference: state.languagePreference,
            additionalNotes: state.additionalNotes,
        };
    }
  }))
);