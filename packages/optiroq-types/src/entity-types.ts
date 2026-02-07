// RATIONALE: This file establishes the Single Source of Truth for core domain entities.
// Defining the full database schema here prevents type duplication and ensures consistency
// across the entire application, from data persistence to API layers to the frontend.

// Enum for field priority
export enum FieldPriority {
  MUST_HAVE = 'MUST_HAVE',
  RECOMMENDED = 'RECOMMENDED',
  OPTIONAL = 'OPTIONAL',
}

// Enum
export enum AnomalyType {
    MISSING_DATA = 'MISSING_DATA',
    LOW_CONFIDENCE = 'LOW_CONFIDENCE',
    OUTLIER = 'OUTLIER',
    INCONSISTENCY = 'INCONSISTENCY',
}

// Enum
export enum AnomalySeverity {
    HIGH = 'High',
    MEDIUM = 'Medium',
    LOW = 'Low',
}

// Enum
export enum AnomalyStatus {
    NEEDS_REVIEW = 'NEEDS_REVIEW',
    FOLLOW_UP_SENT = 'FOLLOW_UP_SENT',
    RESOLVED = 'RESOLVED',
    DISMISSED = 'DISMISSED',
}

// Enum
export enum CommentSource {
    MANUAL = 'manual',
    EMAIL = 'email',
    EXTRACTED = 'extracted',
}


/**
 * @description Represents a value that can be converted between units or currencies.
 * It stores the original value, a normalized value in a base unit, and the current display value.
 */
export interface ConvertibleValue<T extends string = string> {
  /** The current value for display purposes. */
  value: number;
  /** The current unit for display purposes. */
  unit: T;
  /** The value normalized to the system's base unit (e.g., EUR, kg). */
  normalizedValue: number;
  /** The system's base unit for this value's category. */
  normalizedUnit: T;
  /** The original value as it was ingested from the source document. */
  originalValue: number;
  /** The original unit as it was ingested from the source document. */
  originalUnit: T;
  /** ISO 8601 timestamp of when the underlying conversion rate or value was last updated. */
  lastUpdatedAt: string;
}

/**
 * @description The minimal field configuration consumed by shared UI components
 * (e.g., SearchableDataGrid, useDynamicTableColumns). Contains only the properties
 * needed for display and column generation.
 */
export interface BaseFieldConfig {
  key: string;
  displayName: string;
  fieldType: 'string' | 'text' | 'number' | 'currency' | 'weight' | 'length' | 'volume' | 'size' | 'date' | 'boolean' | 'string[]';
  priority: FieldPriority;
  display_order: number;
}

/**
 * @description Represents the schema for a field in the Master Field List.
 * This configuration drives validation, data handling, and LLM-assisted processing.
 * Extends BaseFieldConfig with additional metadata for forms and backend logic.
 */
export interface MasterField extends BaseFieldConfig {
  group: string;
  subgroup: string;
  llm_description: string;
  description?: string;
  /** The number of decimal places to use when rounding this field's value. */
  precision?: number;
  validationRules?: {
    required?: boolean;
    isInteger?: boolean;
    minValue?: number;
    maxValue?: number;
    allowedValues?: string[];
  };
}

// Interface - For supplier field list, reuses MasterField structure.
export interface SupplierField extends MasterField {}

/**
 * @description Defines a commodity that can be sourced.
 * Stored as a configuration item in DynamoDB.
 */
export interface Commodity {
  PK: 'CONFIG#COMMODITIES';
  SK: `COMMODITY#${string}`; // e.g., COMMODITY#ALUMINIUM
  entityType: 'COMMODITY';
  commodityId: string; // e.g., ALUMINIUM
  name: string;        // e.g., 'Aluminium'
  description?: string;
}

/**
 * @description Defines the system-wide base units for normalization.
 * Stored as a configuration item in DynamoDB.
 */
export interface SystemSettings {
  PK: 'CONFIG#SYSTEM_SETTINGS';
  SK: 'BASE_UNITS';
  entityType: 'CONFIGURATION';
  baseCurrency: string; // e.g., 'EUR'
  baseWeight: string;   // e.g., 'kg'
  baseLength: string;   // e.g., 'm'
  baseVolume: string;   // e.g., 'l'
}

/**
 * @description Defines the structure for storing exchange rates.
 */
export interface FxRates {
  /** The base currency for the rates, e.g., 'EUR'. */
  base: string;
  /** ISO 8601 timestamp of when the rates were last updated. */
  timestamp: string;
  /** A map of currency codes to their exchange rate relative to the base currency. */
  rates: {
    [currencyCode: string]: number;
  };
}

/**
 * @description Defines the structure for a commodity price entry.
 */
export interface CommodityPrice {
  id: string; // e.g., 'GOLD', 'BRENT_CRUDE'
  name: string; // e.g., "Gold (troy ounce)"
  price: number;
  currency: string; // e.g., 'USD'
  unit: string; // e.g., 'troy ounce', 'barrel'
  lastUpdatedAt: string; // ISO 8601
}

/**
 * @description Represents the canonical data model for a Supplier entity as stored in DynamoDB.
 */
export interface Supplier {
  // DynamoDB Keys
  PK: `SUPPLIER#${string}`; // Unique ID for the supplier
  SK: 'METADATA';
  entityType: 'SUPPLIER';

  // Core Attributes
  supplierId: string;
  supplierName: string;
  commodityIds: string[]; // Array of commodity IDs, e.g., ['ALUMINIUM', 'CASTING']
  classification?: string;
  
  // Contact Info
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactMobile?: string;
  
  // Capabilities & Internal IDs
  bccHcc?: string;
  protoCapability?: string;
  testingCapability?: string;
  
  // Assessment
  assessmentScore?: number;
  assessmentDate?: string; // ISO 8601 Date
  
  // Timestamps
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Represents the canonical data model for a Project entity as stored in DynamoDB.
 * This is the single source of truth for the Project structure.
 */
export interface Project {
  // DynamoDB Keys
  PK: `PROJECT#${string}`;
  SK: 'METADATA';
  entityType: 'PROJECT';
  GSI1PK: `USER#${string}`;
  GSI1SK: `PROJECT#${string}`;

  // Core Attributes
  projectId: string;
  projectName?: string;
  projectDescription?: string;
  customerName?: string;
  platformName?: string;
  deliveryLocation?: string;
  commodity?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DRAFT' | 'PENDING_REVIEW' | 'DRAFT_AWAITING_REVIEW' | 'DRAFT_PROCESSING' | 'DRAFT_FAILED' | 'ARCHIVED';
  
  // Ownership & Timestamps
  ownerId: string;
  createdAt: string; // ISO 8601
  lastModified: string; // ISO 8601
  
  // Dates
  sopDate?: string; // ISO 8601 Date
  deadlineDate?: string; // ISO 8601 Date
  
  // Financials
  targetCost?: number | ConvertibleValue; 
  
  // BOM Processing Metadata
  methodUsed: 'upload' | 'clone' | 'scratch';
  bomFileName?: string;
  bomProcessingFlowId?: string;
  bomProcessingStartedAt?: string;

  // Default units for the project
  defaultCurrency?: string;
  defaultWeightUnit?: string;
  defaultLengthUnit?: string;
  defaultVolumeUnit?: string;
  
  // Denormalized Statistics for UI Performance
  stats_totalPartsCount?: number;
  stats_existingPartsCount?: number;
  stats_newPartsCount?: number;
  stats_rfqNotStartedCount?: number;
  stats_rfqInProgressCount?: number;
  stats_rfqCompletedCount?: number;
  stats_timeSavedHours?: number; 
  stats_avgExtractionAccuracy?: number;
  stats_totalAnomaliesFlagged?: number;
  cost_existingParts?: number;
  cost_completedNewParts?: number;
  cost_totalKnown?: number;
  supplierCount?: number;
  progressPercentage?: number;
}

/**
 * Represents the canonical data model for a BOM Part entity as stored in DynamoDB.
 * This is the single source of truth for the BOMPart structure.
 */
export interface BOMPart {
  // DynamoDB Keys
  PK: `PROJECT#${string}`;
  SK: `BOM_PART#${string}`;
  entityType: 'BOM_PART';

  // Core Attributes
  partName: string;
  description?: string;
  material: string;
  quantity: number;
  targetWeight?: number | ConvertibleValue; 
  partTargetPrice: number | ConvertibleValue;
  
  // Classification & Status
  partStatus: 'NEW' | 'EXISTING' | 'NEEDS_REVIEW';
  classificationConfidence?: number;
  classificationMethod?: 'llm' | 'erp_match' | 'manual';
  
  // RFQ Tracking
  rfqStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  rfqId?: string;
  bestQuotePrice?: number | ConvertibleValue; 
  
  // Details for Existing Parts
  existingPartDetails?: {
    currentSupplier?: string;
    currentPrice?: number;
    priceCurrency?: string;
    contractId?: string;
    contractExpiry?: string; // ISO 8601 Date
  };

  // Flexibility
  customAttributes?: Record<string, any>;
  _imageS3Key?: string;
  _mappingConfidence?: Record<string, number>;
  _validationErrors?: string[];

  // Allow other properties that might be convertible
  [key: string]: any;
}


/**
 * @description Represents the canonical data model for a Buyer's Profile entity in DynamoDB.
 * Fulfills requirements of SCR-002.
 */
export interface BuyerProfile {
  // DynamoDB Keys
  PK: `USER#${string}`; // The user's Cognito 'sub'
  SK: 'PROFILE';
  entityType: 'BUYER';
  
  // Attributes
  name?: string;
  email: string;
  phoneNumber?: string;
  function?: 'Commodity Buyer' | 'Project Buyer' | 'Sourcing Buyer' | 'Advanced Sourcing Buyer';
  pictureUrl?: string; // S3 key for the profile picture
  language: 'en' | 'fr';

  // Timestamps
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * @description Represents the canonical data model for an RFQ entity as stored in DynamoDB.
 * This is the single source of truth for the RFQ structure, fulfilling SCR-013.
 */
export interface RFQ {
  // DynamoDB Keys
  PK: `RFQ#${string}`;
  SK: 'METADATA';
  entityType: 'RFQ';
  
  // Core Attributes
  rfqId: string;
  projectId: string;
  ownerId: string; // Cognito sub of the creator
  status: 'DRAFT' | 'DRAFT_PROCESSING' | 'DRAFT_FAILED' | 'SENT' | 'ACTIVE' | 'COMPLETED';
  version: number;

  // Step 1: Project Information
  parts: string[]; // Array of part names (BOM_PART SKs)
  partDescriptions?: Record<string, string>; // Keyed by part name
  volumeScenarios: { volume: number; unit: string; conversion?: any }[];
  commodity: string;
  attachments?: { filename: string; s3key: string }[];
  
  // Step 2: Supplier Selection
  suppliers: { supplierId: string; name: string; email: string; selected: boolean }[];
  supplierStatus?: Record<string, 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FOLLOW_UP_SENT'>;

  // Step 3: Requirements Checklist
  requirements: {
    material: boolean;
    process: boolean;
    tooling: boolean;
    logistics: boolean;
    terms: boolean;
    capacity: boolean;
    quality?: boolean;
    prototype?: boolean;
    sustainability?: boolean;
    [key: string]: boolean | undefined;
  };
  
  // Step 4: Deadline & Notes
  responseDeadline: string; // ISO 8601 Date
  languagePreference: string; // e.g., 'English'
  additionalNotes?: string;
  
  // Upload Flow Metadata
  uploadDetails?: {
      fileName: string;
      s3Key: string;
      s3Bucket: string;
  };

  // Send Flow Metadata
  sendFlowId?: string;

  // Timestamps
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface Quote {
  PK: `RFQ#${string}`;
  SK: `QUOTE#SUPPLIER#${string}#ROUND#${number}#VERSION#${number}`;
  entityType: 'QUOTE';
  supplierName: string;
  round: number;
  version: number;
  receivedAt: string; // ISO 8601
  status: 'AWAITING_REVIEW' | 'APPROVED' | 'REJECTED' | 'BLOCKED_AWAITING_REVIEW';
  riskScore: number;
  processingDurationMs?: number;
  extractionSummary?: Record<string, { status: string; confidence: number }>;
  followUpStatus?: 'DRAFT' | 'SENT' | 'RESPONDED' | 'REMINDED' | 'SKIPPED';
  followUpSentAt?: string;
  followUpDeadline?: string;
  quoteData: Record<string, any>; // Per-part data keyed by partName
  toolingDetails?: Record<string, any>;
  logisticsDetails?: Record<string, any>;
  esgData?: Record<string, any>;
  uiPayloadS3Key?: string;
}

export interface Comment {
    PK: `RFQ#${string}`;
    SK: `COMMENT#${string}`;
    entityType: 'COMMENT';
    GSI1PK?: `USER#${string}`;
    GSI1SK?: `COMMENT#${string}`;
    commentId: string;
    authorId?: string;
    authorName?: string;
    commentCategory?: 'pricing' | 'technical' | 'logistics' | 'quality' | 'leadTime' | 'esg' | 'general';
    commentSource: CommentSource;
    supplierId?: string;
    partId?: string;
    anomalyId?: string;
    commentText: string;
    buyerNotes?: string;
    createdAt: string; // ISO 8601
}

export interface Anomaly {
    PK: `RFQ#${string}`;
    SK: `ANOMALY#${string}`;
    entityType: 'ANOMALY';
    GSI1PK: `RFQ#${string}#SUPPLIER#${string}`;
    GSI1SK: `SEVERITY#${AnomalySeverity}`;
    anomalyId: string;
    quoteSK: Quote['SK'];
    supplierId: string;
    partId?: string;
    anomalyType: AnomalyType;
    originalSeverity: AnomalySeverity;
    currentSeverity?: AnomalySeverity;
    status: AnomalyStatus;
    isManual: boolean;
    description: string;
    details?: Record<string, any>;
    impact?: string;
    recommendedAction?: string;
    createdAt: string; // ISO 8601
    lastModified: string; // ISO 8601
}

export interface AnomalyHistory {
    PK: `ANOMALY#${string}`;
    SK: `HISTORY#${string}`; // ISO 8601 timestamp
    entityType: 'ANOMALY_HISTORY';
    historyAction: 'CREATED' | 'SEVERITY_CHANGED' | 'COMMENT_ADDED' | 'STATUS_CHANGED';
    userId: string;
    details: Record<string, any>;
}

export interface CommunicationEvent {
  PK: `RFQ#${string}`;
  SK: `COMM#${string}`; // ISO Timestamp + direction + supplierId
  entityType: 'COMMUNICATION_EVENT';
  
  // Attributes
  direction: 'inbound' | 'outbound';
  eventType: 'INITIAL_RFQ' | 'SUPPLIER_QUOTE' | 'SUPPLIER_REPLY' | 'BUYER_QUESTION' | 'REJECTION_SENT' | 'FOLLOWUP_SENT';
  supplierId: string;
  
  // Email metadata for threading and auditing
  messageId?: string; // The Message-ID header from the email service
  inReplyTo?: string; // The In-Reply-To header
  
  details: {
    from: string;
    to: string[];
    cc?: string[];
    subject: string;
    bodyS3Key?: string; // Optional pointer to the body text in S3 for large emails
    attachments?: { filename: string; s3key: string }[];
  };
  
  createdAt: string; // ISO 8601
}