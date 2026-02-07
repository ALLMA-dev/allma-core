// RATIONALE: This file is underlying types from the SSoT file (`entity-types.ts`).
// This demonstrates the correct composition pattern: View Models are built using the canonical Domain Entities.
import { Project, BOMPart, BuyerProfile, FieldPriority, MasterField, FxRates, CommodityPrice, Commodity, RFQ } from './entity-types.js';

/**
 * Represents the lean data model for a single project in a list view.
 * This is a denormalized view model tailored for the 'projects-list' screen.
 */
export interface ProjectSummary {
  projectId: string;
  projectName?: string;
  customerName?: string;
  commodity?: string;
  status: Project['status'];
  deadlineDate?: string;
  progressPercentage?: number;
  supplierCount?: number;
}

/**
 * The complete view model returned by `GET /views/projects-list/all`.
 */
export interface ProjectsListViewModel {
  projects: ProjectSummary[];
}

/**
 * The view model for the 'project-summary' screen.
 * It contains all necessary, aggregated data to render the entire summary.
 */
export interface ProjectSummaryViewModel {
  project: Project;
  bomParts: BOMPart[];
  rfqSummaries: any[]; // Placeholder for RFQ summary type
  
  quoteDetails: {
    uiPayload: MasterField[];
    data: Record<string, any>;
  } | null;
}

/**
 * Represents the view model for a user's profile, including their
 * chosen language preference. This is returned by the `GET /views/profile/me` endpoint.
 */
export interface UserProfileViewModel {
  userId: string; // Cognito sub
  email: string;
  name?: string;
  phoneNumber?: string;
  function?: BuyerProfile['function'];
  pictureUrl?: string;
  language: BuyerProfile['language'];
  isProfileComplete: boolean; // Calculated field to drive UI logic
}

// ViewModel for the Project Initiation screen.
/**
 * The complete view model for the 'project-initiation' screen.
 * It provides the data for a draft project (or defaults for a new one) and
 * the field configurations to dynamically build the forms.
 */
export interface ProjectEditViewModel {
  project: Partial<Project>;
  bomParts: BOMPart[];
  projectFields: MasterField[];
  partFields: MasterField[];
}

/**
 * @description The view model for currency and commodity data.
 * Returned by the `GET /views/fx-rates/latest` endpoint.
 */
export interface CurrencyAndCommodityViewModel {
  rates: FxRates;
  commodities: CommodityPrice[];
  baseCurrency: string;
}

/**
 * @description The view model for a single commodity, for UI lists.
 */
export interface CommodityViewModel {
  id: string;
  name: string;
  description?: string;
}

/**
 * @description A lean summary of a supplier for list views.
 */
export interface SupplierSummary {
  supplierId: string;
  supplierName: string;
  commodityIds: string[];
  classification?: string;
  assessmentScore?: number;
}

/**
 * @description The complete view model for `GET /views/suppliers-list`.
 */
export interface SuppliersListViewModel {
  suppliers: SupplierSummary[];
}

/**
 * The complete view model for the 'rfq-edit' screen (SCR-013).
 * It provides the data for a draft RFQ and the configurations
 * to dynamically build the 5-step wizard.
 */
export interface RfqEditViewModel {
  rfq: RFQ;
  bomParts: BOMPart[];
  suppliers: SupplierSummary[];
  projectFields: MasterField[];
  partFields: MasterField[];
}