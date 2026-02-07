# **Architecture & Implementation Strategy: Optiroq RFQ Platform**

**Version:** 29.0 (Holistically validated, updated with a concrete Hybrid UI model, a simplified Consolidated API, a structured Master Field List, and strengthened architectural justifications to align with startup principles.)
**Target Audience:** Senior Software Development Engineer
**Constraint:** 1 Developer, 15-16 Weeks (MVP)

> *"If we go the classical way, we’ll screw up. We need a risky approach... we're a startup."* - Nick

## 1. Introduction & Guiding Principles

### 1.1 The Challenge
The objective is to build an MVP that differentiates itself through **extreme, managed flexibility** for both buyers and suppliers. Unlike rigid legacy systems, Optiroq must ingest unstructured data, adapt to dynamic field requirements, and provide a self-configuring UI, all within an aggressive timeline with a single developer.

### 1.2 The Solution: The Orchestrated Intelligence Engine
The core innovation is a shift from writing brittle, imperative parsers and hard-coded UI components to orchestrating LLM agents that dynamically interpret any supplier data format. These agents semantically enrich unstructured inputs and produce a self-describing UI payload that tells the frontend exactly what to render. This architecture is built on five core principles:

1.  **Orchestration Over Imperative Code:** All business processes are defined as declarative **Allma Flows**. We do not write monolithic backend business logic; we configure and orchestrate intelligent steps, leveraging the power, observability, and resilience of the underlying Allma platform.
2.  **Managed Flexibility over Schema Chaos:** Flexibility is our killer feature, but it must be controlled. We will use a three-tiered field management strategy (`System` -> `Master List` -> `RFQ Subset`) to provide flexibility without corrupting the data model. This is a non-negotiable control mechanism.
3.  **Data-Driven Hybrid UI:** The UI is not a monolith. It's a hybrid of static layouts for core workflows and a dynamic rendering engine for business-specific data. The backend, powered by an LLM, generates a UI definition payload for dynamic sections, allowing the interface to adapt to new data fields without frontend code changes. The UI definition is **cached** for performance and consistency.
4.  **Modern Serverless Datastore:** We will use a **DynamoDB Single-Table Design**. This is not a "classical" approach; it is a modern, highly-scalable pattern that **eliminates the need for schema migrations**, a traditional bottleneck that kills startup velocity. This choice directly supports our need for extreme data model flexibility.
5.  **Accelerated API Development:** We will use a **Consolidated REST API Model**. A long list of granular endpoints creates a chatty and brittle interface. Instead, we will provide a small number of powerful endpoints that are aligned with user intentions (queries for views, commands for actions), dramatically increasing development speed and improving performance.

## 2. High-Level System Architecture

The architecture clearly delineates application, orchestration, and consumption layers. The real-time WebSocket layer has been deferred for post-MVP, with the UI using a polling strategy. The notification system is designed as a two-stage process for an optimal user experience.

```mermaid
graph TD
    subgraph "Frontend & Consumption"
        WEB[React App]
        WEB -- HTTPS (Polling every 5-10s) --> API_GW[API Gateway: Optiroq App API]
    end

    subgraph "Optiroq Application Layer (API & UI Logic)"
        API_GW -- Cognito Authorizer --> LAM_API[Lambdas: App Logic]
        LAM_API <--> DDB_GRAPH[(DynamoDB: Optiroq Entity Graph)]
        LAM_API -- triggers --> ALLMA_TRIG[Allma Trigger API]
        
        %% Denormalization Loop for UI Performance
        DDB_GRAPH -- DynamoDB Stream --> LAM_DENORM[Lambda: Denormalizer]
        LAM_DENORM -- updates aggregates --> DDB_GRAPH
    end

    subgraph "Core Orchestration (Allma Platform)"
        %% Ingestion & Trigger
        A[Supplier Email] --> SES(AWS SES Receipt Rule)
        SES --> S3_IN[S3: `quotes-inbox`]
        S3_IN -- S3 Event --> LAM_TRIGGER[Lambda: S3 Trigger]
        LAM_TRIGGER -- sends "Quote Received" notification --> EMAIL_SVC[Email Service]
        LAM_TRIGGER --> ALLMA_TRIG
        
        %% Flow Definition
        ALLMA_TRIG --> FLOW[Allma Flow: `process-supplier-quote`]
        
        subgraph "Flow Steps"
            STEP1[1. Pre-processor & Sanitizer<br/>(CUSTOM_LAMBDA_INVOKE)]
            STEP2[2. Raw Data Extraction<br/>(LLM_INVOCATION)]
            STEP3[3. Semantic Enrichment<br/>(LLM_INVOCATION)]
            STEP3b[3b. Extract Supplier Comments<br/>(LLM_INVOCATION)]
            STEP4[4. Deterministic Normalization<br/>(CUSTOM_LAMBDA_INVOKE)]
            STEP5[5. Anomaly Detection<br/>(Hybrid: LLM + Lambda)]
            STEP5b[5b. Risk Score Calculation<br/>(CUSTOM_LAMBDA_INVOKE)]
            STEP6[6. UI Payload Generation<br/>(LLM_INVOCATION)]
            STEP7[7. Save Quote, Anomalies & Comments<br/>(DATA_SAVE)]
            STEP8[8. Send Processed & Quality Notifications<br/>(CONDITIONAL_ROUTER + EMAIL)]
        end
        
        FLOW --> STEP1 --> STEP2 --> STEP3 --> STEP3b --> STEP4 --> STEP5 --> STEP5b --> STEP6 --> STEP7 --> STEP8
        
        %% Post-Processing Flow for Comparison Board
        STEP8 -- on success --> TRIG_COMP_BOARD[Triggers `generate-comparison-board` Flow]
        
        %% Flow Data Interaction
        STEP4 <--> DDB_FACT[(DynamoDB: Optiroq Fact Store)]
        STEP7 --> DDB_GRAPH
    end

    subgraph "Analytics Pipeline (Post-MVP)"
        DDB_GRAPH --> STREAM_ANALYTICS[DynamoDB Stream]
        STREAM_ANALYTICS --> FIREHOSE[Kinesis Firehose]
        FIREHOSE --> S3_LAKE[S3: Analytics Data Lake (Parquet)]
        ATHENA[AWS Athena] --> S3_LAKE
        API_GW --> LAM_ANALYTICS[Lambda: Analytics Queries] --> ATHENA
    end
```
*   **UI Updates (MVP):** For the MVP, the UI will use a simple and reliable polling mechanism to refresh data. This directly implements the **"Synchronous Emulation Pattern"** recommended in Section 9.2 of the Allma architecture document, which is the correct approach for UIs interacting with an inherently asynchronous backend. This pattern fully supports the data needs of complex, multi-step components like the RFQ Creation Wizard.
*   **Performance:** A critical **Denormalization Loop** (`DynamoDB Stream -> Lambda -> DDB`) has been added. This is essential for pre-calculating and updating aggregate data (like `stats_totalPartsCount`, `cost_totalKnown`, `progressPercentage`) on the main `Project` entity. This ensures list-based screens, such as the "Clone Project" view (LLR `SCR-011`) or the part selector dropdown within the RFQ wizard, load instantly without requiring expensive, slow, real-time calculations (GSI queries or scans) across many items.
*   **Security:** All custom Lambda functions invoked by the Allma Flow (e.g., `pre_process_and_sanitize`, `deterministic_normalization`) **must** have their own, narrowly-scoped IAM roles. They **must not** reuse Allma's core orchestration role. To grant Allma permission to call these functions, the Optiroq CDK stack will import the `AllmaStack`'s exported `OrchestrationLambdaRoleArn` and attach a policy allowing `lambda:InvokeFunction` on the specific Optiroq Lambdas. This follows the critical security pattern described in **Section 10.2 of the Allma architecture document** and creates a clear, secure boundary between the platforms. This is a non-negotiable security requirement.

## 3. Dynamic Field Management Strategy

To prevent "schema chaos" while providing flexibility, we will implement a three-tiered system for managing data fields.

1.  **System Fields (Immutable):** A small, hard-coded set of fields essential for core platform logic.
2.  **Master Field List (Admin-Managed):** A central registry of all "known" business fields across the application.
3.  **RFQ Subset (Buyer-Selected):** A per-RFQ selection of fields from the Master List that the buyer deems relevant.

### 3.1 Explicit Field Classification

This section serves as the central data dictionary for the application, clearly separating immutable system logic from flexible business data.

#### 3.1.1 System Fields
These fields are hard-coded in the application logic and are essential for data partitioning, access control, and core system functions. They are generally not exposed to the user for modification.

| Field Name (`key`) | Field Type | Scope | Description |
| :--- | :--- | :--- | :--- | :--- |
| `PK` | `TEXT` | `ALL` | DynamoDB Partition Key. Structures data for efficient access. |
| `SK` | `TEXT` | `ALL` | DynamoDB Sort Key. Enables complex relationships and sorting. |
| `entityType` | `TEXT` | `ALL` | Defines the type of data item (e.g., `PROJECT`, `BOM_PART`, `QUOTE`, `COMMENT`, `ANOMALY`, `APPROVAL`, `DECISION`). |
| `ownerId` | `TEXT` | `PROJECT` | The Cognito `sub` of the user who owns the project. Used for authorization. |
| `status` | `TEXT` | `PROJECT`, `QUOTE`| The current state of the entity in its workflow (e.g., `ACTIVE`, `COMPLETED`, `APPROVED`). |
| `createdAt` | `DATETIME` | `ALL` | ISO 8601 timestamp of when the entity was created. |
| `lastModified` | `DATETIME` | `ALL` | ISO 8601 timestamp of the last update to the entity. |
| `schemaVersion` | `NUMBER` | `ALL` | Version number for the data model, used for future data migrations. |
| `methodUsed` | `TEXT` | `PROJECT` | The method used to create the project (e.g., `scratch`, `clone`, `upload`). |
| `notificationId` | `TEXT` | `NOTIFICATION` | Unique identifier for a notification event, as required by LLR SCR-019. |
| `notificationType` | `ENUM` | `NOTIFICATION` | The type of notification (e.g., `quote_received`, `quote_processed`). |
| `emailStatus` | `ENUM` | `NOTIFICATION` | Tracks the delivery status of the notification email (e.g., `sent`, `delivered`). |
| `anomalyId` | `TEXT` | `ANOMALY`, `ANOMALY_HISTORY` | Unique identifier for an anomaly. |
| `anomalyType` | `ENUM` | `ANOMALY` | The type of anomaly (e.g., `MISSING_DATA`, `OUTLIER`). |
| `originalSeverity` | `ENUM` | `ANOMALY` | The severity level initially detected by the system (`High`, `Medium`, `Low`). |
| `currentSeverity` | `ENUM` | `ANOMALY` | The current severity, which may have been reclassified by a user. |
| `isManual` | `BOOLEAN` | `ANOMALY` | Flag indicating if the anomaly was created manually by a user. |
| `historyAction` | `ENUM` | `ANOMALY_HISTORY` | The type of action recorded in the history (e.g., `CREATED`, `SEVERITY_CHANGED`). |
| `approvalId` | `TEXT` | `APPROVAL` |  Unique identifier for an approval request instance. |
| `approverRole` | `ENUM` | `APPROVAL` |  The role of the approver (e.g., `Purchasing Manager`). |
| `approvalStatus` | `ENUM` | `APPROVAL` |  The status of the approval (`PENDING`, `APPROVED`, `REJECTED`). |
| `decisionId` | `TEXT` | `DECISION` |  Unique identifier for the final decision document. |
| `selectedSupplierId`| `TEXT` | `DECISION` |  The ID of the supplier who won the RFQ. |
| `commentId` | `TEXT` | `COMMENT` |  Unique identifier for a comment. |
| `commentSource` | `ENUM` | `COMMENT` |  The source of the comment (`manual`, `email`, `extracted`). |


#### 3.1.2 Master Field List
This list is managed via a configuration file (`master-fields.json`). It is organized by logical groups and prioritized to provide control and clarity.

| Group | Field Name (`key`) | Display Name | Field Type | Criticality |
| :--- | :--- | :--- | :--- | :--- |
| **Project Identity** | `projectName` | Project Name | `TEXT` | **Must-Have** |
| | `projectDescription`| Project Description | `TEXT_AREA`| Optional |
| | `customerName` | Customer Name | `TEXT` | **Must-Have** |
| | `platformName` | Platform Name | `TEXT` | Optional |
| **Project Management** | `sopDate` | SOP Date | `DATE` | **Must-Have** |
| | `deadlineDate` | Deadline Date | `DATE` | **Must-Have** |
| | `commodity` | Commodity | `TEXT` | **Must-Have** |
| | `targetCost` | Target Cost (Budget) | `CURRENCY` | Optional |
| **Part Identity** | `partName` | Part Name | `TEXT` | **Must-Have** |
| | `partDescription`| Part Description | `TEXT_AREA`| Optional |
| | `quantity` | Annual Quantity | `NUMBER` | **Must-Have** |
| | `material` | Material | `TEXT` | **Must-Have** |
| | `partTargetPrice`| Part Target Price | `CURRENCY` | **Must-Have** |
| | `targetWeight` | Target Weight | `WEIGHT` | Optional |
| **Core Costing** | `materialCost` | Material Cost | `CURRENCY` | **Must-Have** |
| | `processCost` | Process Cost | `CURRENCY` | **Must-Have** |
| | `toolingInvestment` | Tooling Investment | `CURRENCY` | **Must-Have** |
| **Tooling Details** | `amortizationIncluded`| Amortization in Price| `BOOLEAN` | **Must-Have** |
| | `amortizationAmount`| Embedded Amortization Amount | `CURRENCY` | Optional |
| | `amortizationPeriod`| Amortization Period | `NUMBER` | Optional |
| | `maintenanceCost`| Tooling Maintenance Cost | `CURRENCY` | Optional |
| **Lead Times** | `leadTimeSampleA` | Lead Time: Sample A | `TEXT` | **Must-Have** |
| | `leadTimePPAP` | Lead Time: PPAP | `TEXT` | **Must-Have** |
| | `leadTimeSOP` | Lead Time: SOP | `TEXT` | **Must-Have** |
| | `leadTimeSampleBCD`| Lead Time: Sample B/C/D | `TEXT` | Optional |
| | `leadTimePrototype`| Lead Time: Prototype | `TEXT` | Optional |
| | `leadTimeOffToolParts`| Lead Time: Off-Tool Parts| `TEXT` | Optional |
| | `leadTimeOffToolOrProcess` | Lead Time: Off-Tool or Process | `TEXT` | Optional |
| **Logistics** | `incoterms` | Incoterms | `TEXT` | **Must-Have** |
| | `deliveryLocation`| Delivery Location | `TEXT_AREA`| **Must-Have** |
| | `cartonType` | Carton Type | `TEXT` | Optional |
| | `usesEuroPallet` | Uses Euro Pallet | `BOOLEAN` | Optional |
| | `returnablePackagingRequired` | Returnable Packaging Required | `BOOLEAN` | Optional |
| | `cleaningRequired`| Cleaning Required | `BOOLEAN` | Optional |
| **Quality & ESG** | `isoCertifications`| ISO Certifications | `TEXT_ARRAY` | Optional |
| | `ecovadisScore` | ECOVADIS Score | `NUMBER` | Optional |
| | `internalEsgScore`| Internal ESG Score | `NUMBER` | Optional |
| **Comments & Notes** | `commentText` | Comment | `TEXT_AREA` | Optional |
| | `buyerNotes` | Buyer Notes | `TEXT_AREA` | Optional |

## 4. The Core Workflow: `process-supplier-quote` (Refined Flow)

This Allma Flow is the engine of the MVP. It is triggered **after** an immediate `quote_received` notification has been sent to the user for a responsive experience.

**Trigger:** `SES -> S3 -> LAM_TRIGGER -> Allma Trigger API` with payload `{ "s3Bucket": "...", "s3Key": "..." }`

### Step 1: `pre_process_and_sanitize` (CUSTOM_LAMBDA_INVOKE)
*   **Purpose:** Ingests raw files (Excel, PDF, Images) from S3, converts them to clean text, and sanitizes the content.
*   **Logic:**
    *   Fetches the object from S3 using the trigger payload.
    *   Uses libraries (`exceljs`, `pdf-parse`) to extract text from documents.
    *   For images, it will invoke **Amazon Textract** (a more robust, production-grade OCR than Tesseract) to get text.
    *   Sanitizes the text to remove potential prompt injection patterns.
*   **Output:** `{"cleanText": "..."}`. This output is offloaded to S3 via the S3 Pointer pattern if it's large.

### Step 2: `raw_data_extraction` (LLM_INVOCATION)
*   **Purpose:** Extracts key-value pairs without interpretation.
*   **Model:** Gemini 3.0 Flash (for speed and cost).
*   **Prompt:** "From the following text, extract all potential data points as key-value pairs. Preserve the original labels and values exactly as they appear. Output format: ```json { ... }"

### Step 3: `semantic_enrichment` (LLM_INVOCATION)
*   **Purpose:** Maps raw data to the **Master Field List** and determines per-field confidence. This step is also responsible for identifying and structuring complex data points required by the PRD.
*   **Model:** Gemini 3.0 Pro (for reasoning).
*   **Prompt:** "You are a procurement data specialist. Given the following complete text, raw key-value pairs and the company's Master Field List, map each raw pair to its corresponding field in the master list. For each, determine its semantic type (e.g., `MONETARY_VALUE`, `WEIGHT`) and a confidence score from 0.0 to 1.0. If a raw field cannot be confidently mapped, flag it for review. **Critically, analyze the tooling cost structure: determine if tooling amortization is included in the piece price (`amortizationIncluded`) and extract the `amortizationAmount` if it is.** Identify and structure all seven **Lead Time Milestones** (`leadTimeSampleA`, `leadTimeSampleBCD`, `leadTimePrototype`, `leadTimeOffToolParts`, `leadTimeOffToolOrProcess`, `leadTimePPAP`, `leadTimeSOP`), ESG data, and individual part pricing for multi-part quotes."

### Step 3b: `extract_supplier_comments` (LLM_INVOCATION)
*   **Purpose:** To automatically identify and extract qualitative supplier comments from the raw text for audit and collaboration purposes.
*   **Model:** Gemini 3.0 Pro.
*   **Prompt:** "From the provided text, extract any important notes, disclaimers, or comments from the supplier that are not quantitative data points. Focus on information related to pricing validity, technical capabilities, lead time assumptions, or general terms. Format each as a distinct comment. Output a JSON array of strings."
*   **Output:** `{"extractedComments": ["Lead times are subject to material availability.", "Pricing valid for 90 days."]}`, which will be used in Step 7.

### Step 4: `deterministic_normalization` (CUSTOM_LAMBDA_INVOKE)
*   **Purpose:** Performs all critical, mathematical calculations.
*   **Logic:**
    1.  Receives the semantically enriched data.
    2.  For any field of type `MONETARY_VALUE`, it queries the `OptiroqFactStore` for the correct exchange rate and performs the currency conversion.
    3.  Performs other precise calculations for standard units as defined in the PRD (Weight: to `kg`, Volume: to `liters`, Quantity: to `pieces`).
    4.  **If `amortizationIncluded` is true, it calculates the `adjusted_piece_price` by subtracting the `amortizationAmount` from the quoted piece price. This is critical for fair, apples-to-apples comparison.**
    5.  Calculates total logistics cost by summing carton costs (`cartonQuantity * costPerCarton`), `returnablePackagingCost`, and `cleaningCost`, as per the logic in LLR `SCR-014`.
*   **Output:** A `NormalizedQuoteData` object with validated, accurate numerical data.

### Step 5: `anomaly_detection` (HYBRID)
*   This is a `PARALLEL_FORK_MANAGER` step that runs multiple checks concurrently.
*   **Branch 1: `LLM_Anomaly_Check` (LLM_INVOCATION)**
    *   **Prompt:** Uses text-based rules configured by the Admin. "Analyze the quote. Rule 1: Check if the material is consistent with the typical density for that part type. Rule 2: Flag if the price deviation from peer average is suspicious..."
*   **Branch 2: `Rule_Based_Check` (CUSTOM_LAMBDA_INVOKE)**
    *   **Logic:** Runs hard-coded checks for critical thresholds (e.g., `scrapRatio > 0.5`).
*   **Aggregation:** The results are collected. The output must be an array of objects, e.g., `[{ "anomalyId": "uuid-v4", "type": "Cost Outlier", "severity": "High", "description": "Material cost is 23% above peer average.", ... }]`, to be saved as `ANOMALY` entities in the next step.

### Step 5b: `risk_score_calculation` (CUSTOM_LAMBDA_INVOKE)
*   **Purpose:**  Calculates a quantitative risk score for the quote, fulfilling LLR SCR-26.10.
*   **Logic:**
    1.  Receives the `NormalizedQuoteData` and `anomalyResults`.
    2.  Applies a weighted scoring model:
        *   Each `High` severity anomaly: +30 points
        *   Each `Medium` severity anomaly: +10 points
        *   `qualityScore` below 80: +15 points
        *   `leadTimeSOP` exceeds target: +20 points
    3.  Normalizes the final score to a 0-100 scale.
*   **Output:** `{"riskScore": 75}`

### Step 6: `ui_payload_generation` (LLM_INVOCATION)
*   **Purpose:** Generates the dynamic UI definition.
*   **Model:** Gemini 3.0 Pro.
*   **Prompt:** "Generate a `FieldDescriptor[]` array for the UI. Use the `group` and `displayOrder` properties to create a logical layout. Do not generate descriptors for system fields like `Total Price`."
*   **Output:** The `ui_payload` JSON, which is **cached** by being saved to DynamoDB (or S3) in the next step.

### Step 7: `save_and_finalize` (DATA_SAVE)
*   **Module:** `system/dynamodb-batch-writer`.
*   **Logic:** This step now performs a batch write operation. It writes the `NormalizedQuoteData` (including the new `riskScore`) to the `OptiroqEntityGraph` as the first version (`VERSION#1`) of the `QUOTE` entity. **Concurrently, it writes each generated anomaly from Step 5 as a new, distinct `ANOMALY` entity, and each extracted comment from Step 3b as a new `COMMENT` entity with `source: 'extracted'`.** This write operation will trigger the Denormalization Loop via DynamoDB Streams. If any `High` severity anomaly was detected, the quote's `status` is set to `BLOCKED_AWAITING_REVIEW`.

### Step 8: `send_processed_and_quality_notifications` (CONDITIONAL_ROUTER + EMAIL)
*   **Purpose:** Fulfills `REQ-MVP-05` and LLR SCR-019 by sending the final, detailed `quote_processed` notification, which may include automated rejection or follow-up emails. On success, it triggers the `generate_and_email_comparison_board` flow.
*   **Logic:**
    1.  A `CONDITIONAL_ROUTER` step checks the `anomalyResults` from the context.
    2.  **If `High` severity anomalies exist:** The flow routes to an `EMAIL` step configured to send the "Quote will not be considered" template. The email body is dynamically populated with the specific list of missing mandatory fields or detected hidden costs. This email also serves as the `quote_processed` notification with an error state.
    3.  **If only `Medium` severity anomalies exist:** The flow routes to a different `EMAIL` step to send a polite follow-up request for clarification, which also serves as the `quote_processed` notification.
    4.  **If no significant anomalies:** The flow routes to a standard `quote_processed` email, confirming successful ingestion. **Upon successful sending, it will invoke the `generate_and_email_comparison_board` flow.**

## 5. Data Modeling in the Entity Graph

The `OptiroqEntityGraph` will be a single DynamoDB table employing a single-table design pattern. This provides maximum flexibility for storing diverse entities without schema migrations. From the user's perspective, they interact with "Projects". A `Project` is the primary container that holds BOM parts and the RFQs associated with those parts. Therefore, cloning a "Project" is the action that fulfills the user's goal of cloning an RFQ.

**Architectural Note:** The Allma platform recommends separating application-specific data stores from its own core tables. The `OptiroqEntityGraph` table adheres to this principle. The choice to use a single-table design for the Optiroq application itself is a deliberate architectural decision to achieve the extreme flexibility required by the PRD, and is a well-established best practice for building complex, multi-entity serverless applications on DynamoDB.

**LLR Snapshot vs. Data Model:** For clarity, the concept of a "Snapshot" in the LLRs maps to the `ROUND` number in our data model. Each new quote submission from a supplier creates a new `ROUND`. A `VERSION` number tracks internal edits made by a buyer to a specific `ROUND`, providing a full audit trail.

### 5.1 `BuyerProfile` Entity
As required by LLR `SCR-002`, the Buyer Profile will be stored as a `BUYER` entity.

**Example DynamoDB Item:**
```json
{
  "PK": "USER#<cognito_sub_uuid>",
  "SK": "PROFILE",
  "entityType": "BUYER",
  "name": "Sarah Chen",
  "email": "sarah.chen@company.com",
  "phoneNumber": "+15551234567",
  "function": "Project Buyer",
  "pictureUrl": "s3://optiroq-user-assets/pictures/<cognito_sub_uuid>.jpg",
  "createdAt": "2026-01-02T10:00:00Z",
  "updatedAt": "2026-01-02T10:00:00Z"
}
```

### 5.2 `Project`, `BOM`, `RFQ`, `Quote`, `Notification`, and Other Entities
To support the full workflow from BOM upload to quote comparison, including negotiation rounds, multiple parts per RFQ, and a full notification audit trail, we will use composite sort keys and a graph-like structure.

**Example Project & BOM Part Items:**
```json
// --- Project Metadata (Enhanced with LLR fields for Projects List Screen SCR-006 & Clone Screen SCR-011) ---
{
  "PK": "PROJECT#PRJ-2026-001",
  "SK": "METADATA",
  "entityType": "PROJECT",
  "ownerId": "USER#<cognito_sub_uuid>", // For authorization
  "projectName": "Model X Platform Refresh", // From PRD
  "projectDescription": "Complete interior refresh for the Model X, targeting Q4 2027 SOP.", // From LLR
  "platformName": "Model X", // From LLR
  "customerName": "Tesla", // From PRD & LLR
  "deliveryLocation": "Fremont, CA, USA\nAssembly Line 3", // From LLR
  "commodity": "Interior Stamping", // From LLR (SCR-011) & RFQ Wizard (SCR-013)
  "status": "ACTIVE", // e.g., "ACTIVE", "COMPLETED", "DRAFT"
  "bomFileName": "BOM_DoorAssembly_v3.xlsx", // From LLR
  "sopDate": "2027-10-01", // From LLR (Master List)
  "deadlineDate": "2026-02-15", // From LLR (SCR-006)
  "projectManager": "James Wilson", // From LLR
  "targetCost": 2500000, // From LLR (SCR-007)
  "methodUsed": "upload", // From LLR (System Fields)
  // --- Denormalized fields for UI Performance (updated by Denormalizer Lambda, required by SCR-011 & SCR-26) ---
  "stats_totalPartsCount": 45,
  "stats_existingPartsCount": 30,
  "stats_newPartsCount": 15,
  "stats_rfqNotStartedCount": 3,
  "stats_rfqInProgressCount": 2,
  "stats_rfqCompletedCount": 10,
  "stats_timeSavedHours": 12, 
  "stats_avgExtractionAccuracy": 0.94,
  "stats_totalAnomaliesFlagged": 8,
  "cost_existingParts": 1200000,
  "cost_completedNewParts": 800000,
  "cost_totalKnown": 2000000,
  "supplierCount": 8, // Denormalized count of suppliers contacted for this project.
  "progressPercentage": 75, // Denormalized calculation for UI progress bars.
  "createdAt": "2026-01-05T11:00:00Z",
  "lastModified": "2026-01-18T16:45:00Z"
}

// --- BOM Part Data (Enhanced with LLR fields) ---
// Example of a NEW part requiring an RFQ
{
  "PK": "PROJECT#PRJ-2026-001",
  "SK": "BOM_PART#HOUSING-CTRL-001",
  "entityType": "BOM_PART",
  "partName": "HOUSING-CTRL-001",
  "description": "Main control unit housing, plastic injection molded.", // From LLR (SCR-013)
  "material": "ABS+PC",
  "quantity": 25000,
  "targetWeight": "0.15kg",
  "partTargetPrice": 12.50, 
  "partStatus": "NEW", // Standardized to avoid confusion with Project status
  "classificationConfidence": 0.98,
  "classificationMethod": "llm",
  // --- Denormalized fields for RFQ tracking (from LLR SCR-007) ---
  "rfqStatus": "IN_PROGRESS", // "NOT_STARTED", "IN_PROGRESS", "COMPLETED"
  "rfqId": "RFQ-2026-001",
  "bestQuotePrice": null // Populated when RFQ is completed
}

// Example of an EXISTING part, with additional fields
{
  "PK": "PROJECT#PRJ-2026-001",
  "SK": "BOM_PART#ALU-BRACKET-001",
  "entityType": "BOM_PART",
  "partName": "ALU-BRACKET-001",
  "description": "Stamped aluminum mounting bracket for door panel.",
  "material": "Alu 6061",
  "quantity": 50000,
  "targetWeight": "0.5kg",
  "partStatus": "EXISTING", // Standardized name
  "classificationConfidence": 0.95,
  "classificationMethod": "erp_match",
  // --- Fields for EXISTING parts only (from LLR) ---
  "currentSupplier": "Supplier A",
  "currentPrice": 2.35,
  "priceCurrency": "EUR",
  "leadTime": 8, // in weeks
  "contractId": "CTR-2024-S-A-45",
  "contractExpiry": "2028-12-31",
  "customAttributes": { // Support for unknown fields from BOM
    "Coating Spec": "Type II Anodize"
  }
}
```

**Example RFQ, Quote, and Other Entity Items:**
```json
// --- RFQ Metadata (defines the overall request, created by the RFQ Wizard SCR-013) ---
// --- This also serves as the data source for the Email Preview Entity (LLR SCR-018) ---
{
  "PK": "RFQ#RFQ-2026-001",
  "SK": "METADATA",
  "entityType": "RFQ",
  "projectId": "PRJ-2026-001",
  "parts": ["BOM_PART#HOUSING-CTRL-001", "BOM_PART#COVER-003"], // Supports multi-part
  "status": "SENT", // Status for the Email Preview state before sending
  "responseDeadline": "2026-02-15", // from LLR SCR-013 & SCR-018
  "languagePreference": "English", // from LLR SCR-013 & SCR-018
  // ---: Multi-year volume profile for lifetime spend calculation (LLR SCR-24) ---
  "volumeProfile": [
    { "year": 2026, "quantity": 10000 },
    { "year": 2027, "quantity": 20000 },
    { "year": 2028, "quantity": 30000 },
    { "year": 2029, "quantity": 50000 },
    { "year": 2030, "quantity": 50000 },
    { "year": 2031, "quantity": 50000 }
  ],
  "volumeScenarios": [{"volume": 50000, "unit": "pieces"}], // from LLR SCR-013
  "requirements": {"material": true, "process": true, "tooling": true, "logistics": true, "terms": true}, // from LLR SCR-013
  // ---: Rich T&C Requirements for comparison (LLR SCR-24) ---
  "tcRequirements": {
      "targetLeadTimeSOP": 16, // weeks
      "targetDefectRatePPM": 50,
      "requiredCertifications": ["IATF 16949"],
      "minEcovadisScore": 45
  },
  // --- Email Preview specific data (from LLR SCR-018) ---
  "emailPreview": {
    "subject": "RFQ RFQ-2026-001 - Control Unit Housing",
    "to": ["supplier-a@company.com", "supplier-b@company.com"],
    "cc": ["rfq-agent@customer-domain.optiroq.com"],
    "attachments": [{"filename": "drawing.pdf", "s3key": "project-files/PRJ-2026-001/drawing.pdf"}],
    "bodyTemplate": "default-v1" // Can be customized later
  },
  // --- Logistics Requirements Template from Buyer (from LLR SCR-014) ---
  "logisticsTemplate": {
    "usesEuroPallet": true,
    "returnablePackagingRequired": true,
    "cleaningRequired": false,
    "incoterms": "FOB"
  },
  // --- Denormalized map of supplier statuses for Notification Progress section (LLR SCR-019) ---
  "supplierStatus": {
      "ACME_CORP": "PROCESSED_FOLLOW_UP_SENT",
      "AJAX_MFG": "PROCESSING",
      "SUPPLY_CO": "PENDING"
  }
}

// --- Quote Data (versioned for each round from each supplier, supporting REQ-MVP-14 and LLR SCR-20) ---
// LLR "Snapshot" == Data Model "Round". Internal user edits create new "Versions".
// The 'value' attribute stores the FINAL, NORMALIZED value. The audit trail of changes, including
// manual unit conversions, is stored in the EXTRACTION_HISTORY entity.
{
  "PK": "RFQ#RFQ-2026-001",
  "SK": "QUOTE#SUPPLIER#ACME_CORP#ROUND#2#VERSION#1",
  "entityType": "QUOTE",
  "supplierName": "ACME Corp",
  "round": 2, // Corresponds to LLR Snapshot
  "version": 1, // For internal edits/audit trail
  "receivedAt": "2026-01-15T14:30:00Z",
  "status": "APPROVED", // Can be "AWAITING_REVIEW", "APPROVED", etc.
  "riskScore": 25, // Calculated score (0-100)
  "processingDurationMs": 135000, // To calculate "Time Saved" in notifications
  // ---: Per-category extraction summary for notifications (LLR SCR-019) ---
  "extractionSummary": {
      "material": {"status": "complete", "confidence": 0.98},
      "process": {"status": "complete", "confidence": 0.95},
      "tooling": {"status": "missing_data", "confidence": 0.45},
      "logistics": {"status": "complete", "confidence": 0.88},
      "terms": {"status": "complete", "confidence": 0.99}
  },
  // ---: Follow-up lifecycle tracking fields (LLR SCR-021) ---
  "followUpStatus": "SENT", // DRAFT, SENT, RESPONDED, REMINDED, SKIPPED
  "followUpSentAt": "2026-01-16T11:00:00Z",
  "followUpDeadline": "2026-01-19T11:00:00Z",
  // --- CRITICAL: Granular quoteData structure for LLR SCR-020, SCR-24 & SCR-27 ---
  "quoteData": {
    "HOUSING-CTRL-001": { 
      "materialCost": { "value": 8.75, "confidence": 0.99, "isConfirmed": false, "sourceReference": "cell B5" },
      "processCost": { "value": 4.10, "confidence": 0.95, "isConfirmed": false, "sourceReference": "cell B6" },
      // Full lead time breakdown
      "leadTimeSampleA": { "value": "4 weeks", "confidence": 0.88, "isConfirmed": false, "sourceReference": "page 2, paragraph 3" },
      "leadTimeSampleBCD": { "value": "6 weeks", "confidence": 0.87, "isConfirmed": false, "sourceReference": "page 2, paragraph 3" },
      "leadTimePrototype": { "value": "8 weeks", "confidence": 0.89, "isConfirmed": false, "sourceReference": "page 2, paragraph 3" },
      "leadTimeOffToolParts": { "value": "10 weeks", "confidence": 0.91, "isConfirmed": false, "sourceReference": "page 2, paragraph 3" },
      "leadTimeOffToolOrProcess": { "value": "12 weeks", "confidence": 0.85, "isConfirmed": false, "sourceReference": "page 2, paragraph 4" },
      "leadTimePPAP": { "value": "14 weeks", "confidence": 0.92, "isConfirmed": false, "sourceReference": "page 2, paragraph 4" },
      "leadTimeSOP": { "value": "16 weeks", "confidence": 0.95, "isConfirmed": false, "sourceReference": "page 2, paragraph 4" }
    },
    "COVER-003": {
      "materialCost": { "value": 2.15, "confidence": 0.99, "isConfirmed": true, "sourceReference": "cell C5" },
      "processCost": { "value": 1.50, "confidence": 0.96, "isConfirmed": true, "sourceReference": "cell C6" }
    }
  },
  // --- Tooling Details from Supplier (from LLR SCR-015) ---
  "toolingDetails": {
    "toolingInvestment": 65000.00, // Sum of tooling costs from quoteData
    "amortizationPeriod": 200000,
    "amortizationUnit": "pieces",
    "amortizationIncluded": false,
    "amortizationAmount": null,
    "maintenanceCost": 5000.00
  },
  // --- Logistics Details provided by Supplier (from LLR SCR-014) ---
  "logisticsDetails": {
    "cartonType": "Heavy-duty",
    "cartonQuantity": 250,
    "costPerCarton": 3.10,
    "usesEuroPallet": true,
    "returnablePackagingRequired": true,
    "returnablePackagingType": "KLT Bins",
    "returnablePackagingCost": 1200.00,
    "returnablePackagingDeposit": true,
    "cleaningRequired": false,
    "cleaningCost": 0.00,
    "incoterms": "FOB Hamburg"
  },
  "esgData": { // ESG/Sustainability Scores (REQ-MVP-15)
      "ecovadisScore": 78,
      "internalEsgScore": 85,
      "qualityScore": 92 // From LLR SCR-24
  },
  "uiPayloadS3Key": "ui-payloads/RFQ-2026-001/ACME_CORP_R2_V1.json" // Pointer to cached UI definition
}

// --- - LLR SCR-26: Decision Entity for final sign-off documentation ---
{
    "PK": "RFQ#RFQ-2026-001",
    "SK": "DECISION",
    "entityType": "DECISION",
    "decisionId": "DEC-2026-001-01",
    "status": "APPROVED", // DRAFT, PENDING_APPROVAL, APPROVED
    "selectedSupplierId": "ACME_CORP",
    "rationale": "ACME Corp provided the best balance of cost, lead time, and quality. Their tooling investment was competitive and they have a strong ESG score.",
    "riskMitigation": "Lead time risk will be mitigated by weekly check-in calls. Cost risk is low due to fixed-price agreement.",
    "createdAt": "2026-01-28T10:00:00Z",
    "finalizedBy": "USER#<cognito_sub_uuid>"
}

// --- - LLR SCR-26: Approval Entity to track governance workflow ---
{
    "PK": "RFQ#RFQ-2026-001",
    "SK": "APPROVAL#PURCHASING_MANAGER",
    "entityType": "APPROVAL",
    "GSI1PK": "USER#<cognito_sub_uuid_of_manager>", // To show approvals pending for a user
    "GSI1SK": "APPROVAL#PENDING#2026-01-28T10:05:00Z",
    "approvalId": "APP-2026-001-PM",
    "approverRole": "Purchasing Manager",
    "approverName": "James Wilson", // Denormalized for UI
    "approvalStatus": "APPROVED", // PENDING, APPROVED, REJECTED
    "comment": "Good analysis. Proceed.",
    "respondedAt": "2026-01-28T14:20:00Z"
}

// ---: Extraction History for Audit Trail (supports LLR SCR-020 and manual unit conversion logging) ---
{
    "PK": "RFQ#RFQ-2026-001#QUOTE#ACME_CORP#ROUND#2",
    "SK": "HISTORY#2026-01-16T10:05:12Z",
    "entityType": "EXTRACTION_HISTORY",
    "userId": "USER#<cognito_sub_uuid_of_reviewer>",
    "action": "MANUAL_UNIT_CONVERSION", // Example for Unit Converter
    "details": {
        "partId": "HOUSING-CTRL-001",
        "field": "partVolume",
        "fromValue": "1.2",
        "fromUnit": "liters",
        "toValue": "0.317",
        "toUnit": "gallons",
        "conversionFactor": 0.264172,
        "comment": "User manually converted volume from liters to gallons."
    }
}

// --- Communication Log (supporting REQ-MVP-12) ---
{
  "PK": "RFQ#RFQ-2026-001",
  "SK": "COMM#2026-01-10T09:00:00Z#SUPPLIER#ACME_CORP",
  "entityType": "COMMUNICATION_EVENT",
  "eventType": "INITIAL_RFQ_SENT", // Other types: 'REJECTION_SENT', 'FOLLOWUP_SENT'
  "details": { "to": "raj@acme.com", "subject": "RFQ RFQ-2026-001 - Control Unit Housing" }
}

// ---: Notification Log for Audit Trail (supporting LLR SCR-019) ---
{
    "PK": "RFQ#RFQ-2026-001",
    "SK": "NOTIF#2026-01-15T14:35:00Z#SUPPLIER#ACME_CORP",
    "entityType": "NOTIFICATION",
    "notificationId": "uuid-v4-for-tracking",
    "notificationType": "quote_processed",
    "recipient": "sarah.chen@company.com",
    "sentAt": "2026-01-15T14:35:01Z",
    "emailStatus": "delivered", // Updated via webhook from email service
    "details": { "anomalyCount": 1, "confidenceLevel": "medium" }
}

// --- - LLR SCR-022: Rejection Event for managing state of the rejection UI/workflow ---
{
    "PK": "RFQ#RFQ-2026-001",
    "SK": "REJECTION#<batch_uuid>",
    "entityType": "REJECTION",
    "status": "SENT", // DRAFT, SENT
    "selectedSupplierId": "ACME_CORP",
    "rejectedSuppliers": ["AJAX_MFG", "SUPPLY_CO"],
    "globalFeedbackLevel": "medium",
    "customFeedbackLevels": { // Overrides global setting
        "AJAX_MFG": "high"
    },
    "sentAt": "2026-01-27T10:25:00Z",
    "sentBy": "USER#<cognito_sub_uuid>"
}

// --- ENHANCED - LLR SCR-30: Comment Entity for collaboration ---
{
    "PK": "RFQ#RFQ-2026-001",
    "SK": "COMMENT#<uuid>",
    "entityType": "COMMENT",
    "GSI1PK": "USER#<cognito_sub_uuid>", // For querying comments by user
    "GSI1SK": "COMMENT#2026-01-20T09:15:00Z",
    "commentId": "<uuid>",
    "authorId": "USER#<cognito_sub_uuid>",
    "authorName": "Sarah Chen",
    "commentCategory": "pricing", // ENUM: 'pricing', 'technical', 'logistics', 'quality', 'leadTime', 'esg', 'general'
    "commentSource": "manual", // ENUM: 'manual', 'email', 'extracted'
    "supplierId": "ACME_CORP", // Optional, links comment to a specific supplier
    "partId": "HOUSING-CTRL-001", // Optional, links comment to a specific part
    "anomalyId": "ANOMALY#<uuid>", // Optional, links comment to a specific anomaly
    "commentText": "Their tooling cost seems high compared to Round 1, we should follow up.",
    "buyerNotes": "Internal note: Check if this is related to the new steel tariff.", // Optional, private notes
    "createdAt": "2026-01-20T09:15:00Z"
}

// --- - LLR SCR-25: First-class Anomaly entity for performance and management ---
{
    "PK": "RFQ#RFQ-2026-001",
    "SK": "ANOMALY#<uuid>",
    "entityType": "ANOMALY",
    "GSI1PK": "RFQ#RFQ-2026-001#SUPPLIER#ACME_CORP", // To query anomalies by supplier
    "GSI1SK": "SEVERITY#High", // To filter by severity
    "anomalyId": "<uuid>",
    "quoteSK": "QUOTE#SUPPLIER#ACME_CORP#ROUND#2#VERSION#1", // Link back to the source quote
    "supplierId": "ACME_CORP",
    "partId": "HOUSING-CTRL-001",
    "anomalyType": "OUTLIER", // MISSING_DATA, LOW_CONFIDENCE, OUTLIER, INCONSISTENCY
    "originalSeverity": "High",
    "currentSeverity": "Medium", // User can reclassify
    "status": "NEEDS_REVIEW", // NEEDS_REVIEW, FOLLOW_UP_SENT, RESOLVED, DISMISSED
    "isManual": false,
    "description": "Material cost is 37% above peer average.",
    "details": { "field": "materialCost", "value": 16.50, "average": 12.06 },
    "impact": "This significantly affects the total piece price and competitiveness.",
    "recommendedAction": "Request supplier to validate the material cost and provide justification.",
    "createdAt": "2026-01-15T14:32:00Z",
    "lastModified": "2026-01-16T09:45:00Z"
}

// --- - LLR SCR-25: Anomaly History for full audit trail ---
{
    "PK": "ANOMALY#<uuid>",
    "SK": "HISTORY#2026-01-16T09:45:00Z",
    "entityType": "ANOMALY_HISTORY",
    "historyAction": "SEVERITY_CHANGED", // CREATED, SEVERITY_CHANGED, COMMENT_ADDED, STATUS_CHANGED
    "userId": "USER#<cognito_sub_uuid>",
    "details": {
        "from": "High",
        "to": "Medium",
        "commentId": "COMMENT#<uuid>" // Link to the comment explaining the change
    }
}
```

## 6. A Simplified, Modern API & UI Update Strategy

To align with our principles of speed and simplicity, we will reject a "classical" chatty REST API in favor of a **Consolidated API Model** that separates reading data (Queries) from changing data (Commands). This dramatically reduces the number of endpoints, improves frontend performance, and simplifies development.

### 6.1 The Consolidated API Strategy
*   **Authentication:** User identity will be managed by **Amazon Cognito**.
*   **Authorization:** The **Optiroq Application API Gateway** will be protected by a Cognito Authorizer.

#### 6.1.1 Querying with View-Models
Instead of forcing the UI to call many endpoints to build a screen, we will provide a single endpoint for each major "view" in the application. These endpoints return a fully-formed "view-model" containing all the data that screen needs.

**Pattern:** `GET /views/{viewName}/{id}`

**Example:** To render the main project dashboard, the UI makes a single call: `GET /views/project-dashboard/PRJ-2026-001`. The Lambda handler for this endpoint is responsible for efficiently fetching the project metadata, all its associated BOM parts, the status of related RFQs, and any denormalized statistics, and then shaping this data into a single JSON object tailored for the `ProjectDashboard` React component.

#### 6.1.2 Writing with Commands
All actions that change the state of the system will be funneled through a single, generic endpoint. This centralizes our business logic and simplifies the client.

**Pattern:** `POST /commands/{entityType}/{id}`
**Body:** `{ "command": "nameOfAction", "payload": { ... } }`

**Example:** To approve a quote, the UI makes a single call:
*   **Endpoint:** `POST /commands/quote/QUOTE_UUID_123`
*   **Body:** `{ "command": "approveQuoteExtraction", "payload": { "userId": "user_abc" } }`

The Lambda handler for `/commands/...` acts as a router. It validates the input and dispatches the command and payload to the specific private function containing the business logic (e.g., `handleApproveQuoteExtraction(...)`).

### 6.2 Revised API Endpoint Specification
This new model reduces our API surface from ~50 endpoints to ~15, making it far more manageable.

| Method | Path | Description |
| :--- | :--- | :--- |
| **Queries (Views)** |
| GET | `/views/projects-list` | Gets all data for the main projects list screen, including stats. |
| GET | `/views/project-dashboard/{id}` | Gets the complete, aggregated data model for a single project's dashboard. |
| GET | `/views/rfq-creation-wizard/{projectId}` | Gets all data needed to initialize the RFQ wizard (parts, templates, etc.). |
| GET | `/views/extraction-review/{quoteId}` | Gets the quote data, original text snippets, and anomalies for the review screen. |
| GET | `/views/comparison-dashboard/{rfqId}` | Gets all approved quotes, anomalies, and supplier data for the comparison view. |
| GET | `/views/decision-dashboard/{rfqId}` | Gets the final decision, rationale, and approval statuses. |
| GET | `/views/profile` | Gets the current user's profile. |
| **Commands** |
| POST | `/commands/project/` | Creates a new project. `command: "createProject"`. |
| POST | `/commands/project/{id}` | Executes commands on a project (e.g., `cloneProject`, `updateDetails`, `addPart`). |
| POST | `/commands/rfq/{id}` | Executes commands on an RFQ (e.g., `sendRfq`, `updateEmailPreview`). |
| POST | `/commands/quote/{id}` | Executes commands on a Quote (e.g., `approveQuoteExtraction`, `requestFollowUp`, `updateField`). |
| POST | `/commands/anomaly/{id}` | Executes commands on an Anomaly (e.g., `reclassifySeverity`, `addComment`). |
| POST | `/commands/comment/{rfqId}` | Creates a new comment. `command: "createComment"`. |
| POST | `/commands/decision/{rfqId}`| Executes commands on a Decision (e.g., `saveDecision`, `requestApprovals`). |
| POST | `/commands/profile/` | Updates the user profile. `command: "updateProfile"`. |
| **File Handling** |
| POST | `/files/upload-url` | Gets a pre-signed S3 URL for secure direct-to-S3 file uploads. |
| **Public** |
| POST | `/approve/{approvalToken}` | Public endpoint for approvers to use from email links to submit their decision. |

### 6.3 UI Update Strategy for MVP: Polling
To provide a reasonably current view of data without the complexity of a real-time push architecture, the MVP will use a client-side polling strategy.

1.  **Mechanism:** The React frontend will make periodic `GET` requests to a lightweight endpoint to check if data has changed.
2.  **Frequency:** The polling interval will be set to **5-10 seconds**.
3.  **Endpoint:** A new lightweight endpoint `GET /entities/{type}/{id}/timestamp` will be created to only return the `lastModified` attribute.
4.  **Change Detection:** The client will compare the returned `lastModified` timestamp against its local state.
5.  **Data Refresh:** If the timestamp is newer, the UI will trigger a full refresh by calling the relevant `GET /views/...` endpoint.

### 6.4 Profile Picture Storage
To handle profile pictures efficiently and securely, a dedicated S3 bucket (`optiroq-user-assets`) will be created. The frontend will get a presigned URL from the backend API to upload the image directly to S3. The resulting S3 key/URL will be stored in the `pictureUrl` attribute of the `BuyerProfile` item in DynamoDB.

### 6.5 `request-rfq-approval` Allma Flow
To handle the sign-off governance requirement (REQ-MVP-16), a second Allma Flow will be created.
*   **Trigger:** Triggered by a user action in the UI via the `POST /commands/decision/{rfqId}` with command `requestApprovals`.
*   **Logic:**
    1.  `Load RFQ and Decision Data` (`DATA_LOAD`): Fetches the RFQ value and proposed supplier.
    2.  `Determine Approval Chain & Create Records` (`CUSTOM_LAMBDA_INVOKE`): A Lambda reads the RFQ value and a configuration map to determine the list of required approvers (e.g., Manager, Director). It then creates all the necessary `APPROVAL` entities in DynamoDB with a `PENDING` status and generates a unique, single-use token for each.
    3.  `Send Approval Requests` (`PARALLEL_FORK_MANAGER` + `EMAIL`): Sends a templated email to each approver with "Approve" and "Reject" links. These links will contain the unique token and point to the public `/approve/{approvalToken}` API endpoint.
    4.  `Wait for Responses` (`WAIT_FOR_TASK_TOKEN` integration pattern): The flow pauses, waiting for approvers to click the links. The `/approve/{approvalToken}` API endpoint will validate the token, update the corresponding `APPROVAL` entity, and then use the AWS SDK to send the task token and the decision back to the Step Function, resuming the flow.
    5.  `Finalize or Escalate` (`CONDITIONAL_ROUTER`): Based on the responses, the flow either marks the `DECISION` entity as "Approved" or triggers an escalation/rejection notification.

### 6.6 `send-and-track-follow-up` Allma Flow
This new flow orchestrates the business logic for sending follow-up emails and managing automated reminders, as required by LLR SCR-021.
*   **Trigger:** Invoked via a `POST /commands/quote/{id}` API call with command `sendFollowUp`.
*   **Initial Payload:** `{ "quoteId": "...", "rfqId": "...", "supplierName": "...", "subject": "...", "body": "...", "recipientEmail": "..." }`
*   **Logic:**
    1.  **`Send Initial Email` (`EMAIL` step):** Sends the follow-up email to the supplier using the provided subject, body, and recipient from the payload.
    2.  **`Update Quote Status` (`DATA_SAVE` step):** Atomically updates the `QUOTE` item in DynamoDB, setting `followUpStatus = 'SENT'`, `followUpSentAt = 'CURRENT_TIMESTAMP'`, and calculating/setting the `followUpDeadline`. Also updates the denormalized `supplierStatus` map on the parent `RFQ` entity.
    3.  **`Wait For Reminder Period` (`WAIT` step):** Pauses the flow execution for the duration specified in the `reminderDelayDays` system configuration (e.g., 3 days). This is a highly efficient, serverless wait.
    4.  **`Check if Responded` (`DATA_LOAD` step):** After the wait period completes, this step re-fetches the current `QUOTE` item from DynamoDB to check its `followUpStatus`.
    5.  **`Send Reminder If Needed` (`CONDITIONAL_ROUTER` step):**
        *   **Condition:** `$.quote.followUpStatus == 'SENT'` (i.e., the supplier has not yet responded).
        *   **If True:** Routes to another `EMAIL` step that sends a pre-configured reminder template. A subsequent `DATA_SAVE` step then updates the `followUpStatus` to `REMINDED`.
        *   **If False:** The supplier has already responded (`followUpStatus` is now `RESPONDED`), so the flow terminates gracefully with no further action.

### 6.7 `send-rejection-notifications` Allma Flow
This flow handles the reliable, audited sending of rejection emails to non-selected suppliers.
*   **Trigger:** Invoked by the `POST /commands/rejection/{batchId}` API endpoint.
*   **Initial Payload:** `{ "rejectionBatchId": "...", "rfqId": "..." }`
*   **Logic:**
    1.  **`Load Rejection Data` (`DATA_LOAD` step):** Fetches the `REJECTION` entity using the `rejectionBatchId` to get the list of suppliers and their specific, prepared email content (which was generated and potentially edited via the API layer).
    2.  **`Send Emails` (`PARALLEL_FORK_MANAGER` step):**
        *   **ItemsPath:** The array of rejected suppliers from the loaded data.
        *   **Iterator:** A sub-workflow containing a single `EMAIL` step that sends the rejection email to each supplier. This ensures that failures in sending one email do not affect others.
    3.  **`Log Communication Events` (`PARALLEL_FORK_MANAGER` step):**
        *   **ItemsPath:** The same array of rejected suppliers.
        *   **Iterator:** A sub-workflow containing a `DATA_SAVE` step that creates a `COMMUNICATION_EVENT` item for each supplier with `eventType: 'REJECTION_SENT'`. This provides a complete audit trail.
    4.  **`Finalize RFQ Status` (`DATA_SAVE` step):** After all communications are logged, this step updates the main `RFQ` entity's status to `COMPLETED`, officially closing the sourcing cycle.

### 6.8 `generate_and_email_comparison_board` Allma Flow
This crucial flow handles the automated, incremental generation and delivery of the Excel comparison board.
*   **Trigger:** Invoked by the `process-supplier-quote` flow upon successful processing of a quote.
*   **Initial Payload:** `{ "rfqId": "...", "projectId": "...", "recipientEmail": "..." }`
*   **Logic:**
    1.  **`Load All Approved Quotes` (`DATA_LOAD` step):** Queries the `OptiroqEntityGraph` for all `QUOTE` items linked to the `rfqId` that have a `status` of `APPROVED`.
    2.  **`Generate Excel Workbook` (`CUSTOM_LAMBDA_INVOKE` step):**
        *   **Purpose:** The core logic for creating the Excel file in memory.
        *   **Logic:**
            *   Receives the list of approved quotes.
            *   Uses a library like `exceljs` to programmatically build the multi-sheet workbook as defined in LLR SCR-24. This includes:
                *   Sheet 1: Summary Comparison (with cost breakdowns, flags, ESG scores, etc.)
                *   Sheet 2: Detailed Breakdown (all extracted fields per supplier)
                *   Sheet 3: Anomalies (list of all detected anomalies with severity and description)
                *   Sheet 4: Raw Data (all extracted data with confidence scores)
                *   Sheet 5: Email Thread (full email thread per supplier)
            *   Calculates totals, variances, and rankings.
            *   If all expected suppliers have responded, it calculates the weighted recommendation score and adds the "Recommendation Box" to the Summary sheet.
            *   Applies conditional formatting and generates chart data.
        *   **Output:** The generated Excel file as a Base64 encoded string or a pointer to it in a temporary S3 location.
    3.  **`Send Comparison Board Email` (`EMAIL` step):**
        *   **Purpose:** Sends the generated Excel file to the buyer.
        *   **Logic:** Uses the `EMAIL` step type, attaching the generated Excel file. The email body will indicate which version of the board it is (e.g., "v2, now with 3 suppliers").

## 7. UI & Interaction Patterns
### 7.1 UI Architecture: The Hybrid Model
To address the need for both a structured user experience and extreme data flexibility, the UI will be built using a hybrid model. This is the most critical architectural pattern for the frontend.

1.  **Layout Templates (Static):** Each major screen (e.g., Project Dashboard, RFQ Details, Extraction Review) will have a static React component that defines the overall layout, including headers, tabs, and action buttons. This provides a consistent and predictable structure for the user.
2.  **Smart Components (Static Structure, Dynamic Data):** For complex, interactive workflows like the 5-step RFQ Creation Wizard (`SCR-013`) or the Tooling Clarity Form (`SCR-015`), we will use dedicated, hard-coded components. These components have a fixed structure to ensure usability for critical tasks but are populated with dynamic data from our API.
3.  **Dynamic Field Renderer (Dynamic Structure & Data):** This is a generic React component that takes the `ui_payload` (the `FieldDescriptor[]` array) from our API as a prop. It iterates through this array and renders the appropriate UI controls (text inputs, checkboxes, currency fields) based on the metadata in the payload. This component is the key to our adaptability.

This hybrid model gives us the best of both worlds: the stability of traditional UI development for core application structure and the radical flexibility of a data-driven UI for the business-specific fields that will constantly evolve.

### 7.2 UI Support for RFQ Wizard (LLR SCR-013)
The architecture fully supports the 5-step RFQ wizard. It is a "Smart Component" that orchestrates data collection through a series of API calls. The wizard's state is managed client-side, and on final submission, it makes a single `POST /commands/rfq/...` call with the complete data payload, which creates the `RFQ` entity in DynamoDB. This pattern keeps the UI responsive while ensuring data integrity on submission.

### 7.3 Supplier Interaction: `mailto:` with CC
For the MVP, we will **not** build an internal email client UI. This pattern, validated by LLR SCR-013 and SCR-018, is lightweight and leverages the user's existing email client.
1.  **Action:** The "Send RFQ" button in the Email Preview UI will trigger a `mailto:` link.
2.  **`mailto:` Generation:** The link will be dynamically generated by the backend (`POST /commands/rfq/{id}` with `command: "sendRfq"`) to pre-fill:
    *   `To:` The supplier's email address.
    *   `CC:` A dedicated ingestion email address for the project (e.g., `project-123@rfq.optiroq.com`).
    *   `Subject:` The original RFQ subject line with "RE:" to maintain the thread.
    *   `Body:` A pre-generated template with the questions or follow-up request.
3.  **Tracking & Header Injection Clarification:** The `mailto:` protocol **does not support** injecting custom headers like `X-Optiroq-Project-ID`. Therefore, for the MVP, automated response tracking relies **entirely** on the supplier using "Reply All" to include the `CC`'d agent email address. The Project ID in the subject line serves as a robust secondary identifier for the ingestion logic. This is a deliberate MVP trade-off to avoid the complexity of a full backend email sending and monitoring service.
4.  **Logging:** The API endpoint that generates the `mailto:` link is also responsible for logging a `COMMUNICATION_EVENT` to the entity graph. This ensures all outbound communications are tracked. The system ingests the reply from the supplier via the CC'd address, linking it back to the original RFQ thread. Automatic follow ups can be sent by agent.

## 8. Functional Module Implementation

### 8.1 BOM Management & "The Split" Workflow
This critical initial step will be orchestrated by a dedicated `process-bom-upload` Allma Flow.

*   **Trigger:** S3 event on the BOM upload bucket.
*   **Flow Steps:**
    1.  **`parse_bom_file` (CUSTOM_LAMBDA_INVOKE):**
        *   **Purpose:** Implements the core parsing and mapping logic defined in the LLR.
        *   **Logic:** Fetches the Excel file from S3. Invokes an LLM to identify column headers and map them to the `Master Field List` with confidence scores. Extracts all rows.
        *   **Fallback:** If LLM confidence is low (<70%), it falls back to rule-based exact name matching. If that fails, the part is flagged for manual user mapping.
        *   **Output:** Structured JSON of all parts and their attributes (both standard and custom).
    2.  **`validate_bom_data` (CUSTOM_LAMBDA_INVOKE):**
        *   **Purpose:** Enforces all business rules from the LLR.
        *   **Logic:** Iterates through the parsed parts and validates for required fields (`part_name`, `material`, `quantity`), unique part names, valid data types, etc.
        *   **Output:** A list of validation errors. If the list is not empty, the flow terminates and logs an error, which the frontend will poll for.
    3.  **`persist_project_and_bom` (PARALLEL_FORK_MANAGER + DATA_SAVE):**
        *   **Purpose:** Creates the `PROJECT` and `BOM_PART` entities in the `OptiroqEntityGraph`.
        *   **Logic:** A `DATA_SAVE` step first creates the `PROJECT#...` item. Then, a `PARALLEL_FORK_MANAGER` fans out to run `DATA_SAVE` for each individual `BOM_PART#...` item, associating them with the project `PK`.
    4.  **`perform_the_split` (CUSTOM_LAMBDA_INVOKE):**
        *   **Purpose:** Differentiates existing vs. new parts using an intelligent classification model.
        *   **Logic:** For each part, this Lambda will:
            1.  Invoke an LLM with the part name, material, and other specs, asking it to match against the existing contracts data (queried from DynamoDB/S3 where the manual ERP data is stored).
            2.  The LLM returns a `suggested_status` (`EXISTING` or `NEW`) and a `confidence` score.
            3.  The Lambda applies the business rules from the LLR: high confidence (>90%) is auto-classified, medium (70-90%) is flagged for review, and low (<70%) requires manual confirmation.
        *   **Output:** Updates the `BOM_PART` items with their `partStatus`, `classificationConfidence`, and `classificationMethod`.
*   **The Split UI:** After the flow completes, the frontend will call the `GET /views/project-dashboard/{id}` endpoint to retrieve the classified parts and present the UI, visually distinguishing between `EXISTING` and `NEW` parts, allowing the user to proceed with RFQ creation for the `NEW` parts.

### 8.2 RFQ Creation
*   **From Scratch:** The UI will call the `POST /commands/project` endpoint to create the project and its initial parts in DynamoDB directly. This is a purely API-driven workflow that directly supports the 5-step wizard (SCR-013).
*   **Clone Existing:** The UI will first `GET /views/project-dashboard/{id}` to fetch the data of the project to be cloned. It will then call `POST /commands/project/{id}` with `command: "cloneProject"` and a payload containing the new project ID. The backend logic will handle the copying of all relevant DynamoDB items. This directly supports the workflow described in LLR SCR-011.
*   **From Upload:** This will trigger a separate, simpler Allma flow that parses an existing RFQ document and pre-fills the "From Scratch" creation form data for the 5-step wizard.

### 8.3 Data Validation, Correction & Approval Workflow
*   **Human-in-the-Loop:** The Extraction Review screen (SCR-020) and the **Anomalies Dashboard (SCR-25)** are the primary interfaces for this workflow. They are API-driven "Smart Components."
*   **Initial State:** When the `process-supplier-quote` flow completes, it creates `QUOTE` and `ANOMALY` entities. Crucially, if the automated normalization cannot confidently process a field (e.g., non-standard units), or if anomalies are detected, the quote's `status` is set to `AWAITING_REVIEW`.
*   **Anomaly Resolution:** The user first interacts with the Anomalies Dashboard. They can reclassify severity, add comments, and initiate follow-ups via the command API (e.g., `POST /commands/anomaly/{id}` with `command: "reclassifySeverity"`). This workflow is critical for ensuring data quality *before* detailed field correction.
*   **Correction & Manual Normalization:** After resolving or acknowledging anomalies, the user proceeds to the Extraction Review screen. This is where tools like the **Unit Converter (SCR-29)** are invoked. The UI calls `POST /commands/quote/{id}` with `command: "updateField"` to persist the result of a manual conversion. Each call creates a new, versioned `QUOTE` item and a corresponding `EXTRACTION_HISTORY` item, providing a full audit trail of the manual override.
*   **Approval:** Once the user is satisfied, they click "Approve Extraction." This calls the command API, which sets the status of the *latest version* of the quote to `APPROVED`. This approved quote is now eligible for inclusion in the final comparison board.
*   **Follow-up Initiation:** If the user identifies missing data (either from an anomaly or during review), they click "Request Follow-up." This calls the relevant command API, which updates the quote's `followUpStatus` to `DRAFT`. The UI navigates to the Follow-up Preview screen (SCR-021), and sending triggers the `send-and-track-follow-up` Allma flow.
*   **Blocking Logic:** The "View Comparison Dashboard" button will be disabled if any `High` severity anomalies for the RFQ are still in the `NEEDS_REVIEW` state, enforcing the quality gate.

## 9. The Analytics Pipeline
The CDC pipeline (DynamoDB Streams -> Kinesis Firehose -> S3 -> Athena) is confirmed as the correct architecture for all analytical queries (Cross-BOM, Cross-Material, Supplier Performance). This is a post-MVP feature but the underlying data pipeline will be built as part of the MVP infrastructure to begin accumulating data.

## 10. MVP Constraints, Risk Mitigation & Security

### 10.1 MVP Constraints
*   **Manual Steps:** Confirmed. ERP data for `Existing Parts` is a manual process. Email sending uses the user's local client via `mailto:`.
*   **LLM Consistency:** We mitigate this by **caching the generated UI payload** in DynamoDB (or S3). The UI is generated once per data update and then served from the cache, ensuring a stable experience.
*   **Field Additions:** Confirmed. Adding a brand new field to the system is an **Admin-level configuration task** via the Master Field List, not a buyer task. This prevents schema chaos.
*   **Verification:** The UI will explicitly highlight which fields were extracted by the LLM and provide a "Source Reference" link that shows the original text snippet, enabling efficient human-in-the-loop verification. It's critically important.

### 10.2 Secrets Management
 All secrets required by the Optiroq application layer (e.g., API keys for third-party services like an exchange rate API, or credentials for Textract) will be stored in **AWS Secrets Manager**. This aligns with the security best practices outlined in the Allma architecture document (Section 11.2).
*   **Permissions:** The IAM roles for Optiroq's custom Lambdas will be granted `secretsmanager:GetSecretValue` permission. This access will be tightly scoped using resource-based policies or condition keys (e.g., resource tags) to ensure each function can only access the specific secrets it needs, adhering to the principle of least privilege.
*   **Allma Flow Access:** If an Allma flow needs access to an Optiroq-owned secret, the Optiroq CDK stack will attach the necessary IAM policy to the imported `AllmaOrchestrationRoleArn`, again scoped to the specific secret's ARN. This follows the secure cross-application secret sharing pattern.

### 10.3 Flows as Code: CI/CD Best Practice
 To ensure a mature and repeatable deployment process, all Allma `Flow`, `StepDefinition`, and other configuration entities should be managed as version-controlled JSON files in a Git repository. A CI/CD pipeline should be implemented to automatically deploy these configurations to the `AllmaConfigTable` using the Allma Admin API's `/import` endpoint after every `cdk deploy`. This "Flows as Code" approach, described in Section 14 of the Allma architecture document, is the recommended best practice for managing Allma configurations across different environments (dev, staging, prod).

## Project structure

### Lambdas
 src/optiroq-lambdas/
├── allma-steps/
│   ├── generate-comparison-board.step.ts
│   ├── normalize-quote-data.step.ts
│   └── sanitize-quote-document.step.ts
├── api/
│   ├── commands/
│   │   ├── approve-quote-extraction.command.ts
│   │   ├── clone-project.command.ts
│   │   └── ... (other command handlers) ...
│   ├── queries/
│   │   ├── get-project-dashboard.view.ts
│   │   └── ... (other view handlers) ...
│   ├── get-upload-url.handler.ts
│   ├── get-view.handler.ts
│   └── post-command.handler.ts
└── streams/
    └── update-project-aggregates.stream.ts
