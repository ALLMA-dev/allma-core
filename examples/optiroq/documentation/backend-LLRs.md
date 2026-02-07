# Backend Low-Level Requirements (LLRs): Optiroq MVP

## 1. General & Non-Functional Requirements

- **REQ-BE-SYS-01 (Security):** All API endpoints must be secured and require a valid, unexpired authentication token (JWT). Role-based access control must be enforced for all operations.
- **REQ-BE-SYS-02 (Performance):** The end-to-end processing time for a single supplier quote (from email receipt to "Quote Processed" notification) must be under 6 minutes for 95% of submissions.
- **REQ-BE-SYS-03 (Scalability):** The system must support file uploads up to 50MB and BOMs containing up to 1000 parts without significant performance degradation.
- **REQ-BE-SYS-04 (Data Integrity):** All state-changing operations must be atomic and logged for a complete audit trail. Data validation must be enforced at the API boundary for all incoming data.
- **REQ-BE-SYS-05 (Asynchronicity):** Long-running processes, such as file parsing, data extraction, and email sending, must be handled asynchronously to ensure API endpoints remain responsive. The client will be notified of completion via separate mechanisms (e.g., status polling, WebSockets).

## 2. User Management & Authentication

- **REQ-BE-AUTH-01 (Authentication):** The backend must provide APIs to support user authentication via:
    - Company SSO (SAML 2.0 or OIDC integration).
    - Email and password credentials.
- **REQ-BE-AUTH-02 (Session Management):**
    - Upon successful authentication, the system must generate a JWT with a default expiry of 8 hours.
    - If a "remember me" flag is provided during login, the JWT expiry must be extended to 30 days.
    - An API endpoint must be provided to validate and refresh session tokens.
- **REQ-BE-AUTH-03 (Account Security):**
    - Implement a password reset flow that sends a secure, single-use link to the user's registered email.
    - Enforce account lockout for 15 minutes after 5 consecutive failed login attempts for a single user account.
- **REQ-BE-AUTH-04 (User Profile):**
    - Provide CRUD APIs (`GET`, `POST`, `PUT`) for managing user profiles (`/api/users/profile`).
    - The profile must store `name` (2-100 chars), `email` (valid format), `phoneNumber` (optional, valid format), and `function` (enum: `Commodity Buyer`, `Project Buyer`, `Sourcing Buyer`, `Advance Sourcing Buyer`).
    - A user's first login must be gated until the mandatory profile fields (`name`, `email`, `function`) are submitted.

## 3. Project & BOM (Bill of Materials) Management

- **REQ-BE-PROJ-01 (Project Creation):**
    - Provide an API to create a new project entity. Must support a user-customizable `project_id` (unique, 3-50 chars) or auto-generate one if not provided (format: `PRJ-YYYY-NNN`).
    - The project entity must store `projectName`, `platformName`, `customerName`, and `deliveryLocation`.
- **REQ-BE-PROJ-02 (BOM Upload):**
    - Provide an API (`POST /projects/bom/upload-url`) that returns a secure, pre-signed URL for a client to upload a BOM file directly to object storage.
    - The system must process uploaded BOM files (`.xlsx`, `.xls`) asynchronously. Processing includes:
        - Validating file size (<10MB).
        - Parsing the file to extract parts, validating the presence of required columns: `Part Name`, `Material`, `Quantity`.
        - Creating `Part` entities associated with the project.
- **REQ-BE-PROJ-03 ("The Split" - Part Classification):**
    - Implement a service that classifies each part in a BOM as `existing` or `new`.
    - Classification is determined by comparing the part's `partName` and `material` against a database of existing contracts.
    - For `existing` parts, the system must link them to their current contract data (supplier, price, lead time).
- **REQ-BE-PROJ-04 (ERP Data Ingestion):**
    - Provide an API to upload and process an ERP report (Excel) to populate the database of existing contracts used for "The Split".
- **REQ-BE-PROJ-05 (Part Management):**
    - Provide APIs for CRUD operations on individual parts within a project (`POST /projects/{id}/parts`, `PUT /parts/{id}`, `DELETE /parts/{id}`).
    - Deleting the last part of a project must be prohibited.

## 4. RFQ (Request for Quotation) Management

- **REQ-BE-RFQ-01 (RFQ Creation - All Methods):**
    - **From Scratch / Form:** Implement `POST /rfqs` to create an RFQ from a structured JSON payload containing all RFQ data from the 5-step wizard.
    - **Clone Project:** Implement `POST /projects/{id}/clone`. The service must perform a deep copy of a source project and all its associated parts to create a new, editable project.
    - **Upload RFQ Files:** Implement an asynchronous process that accepts an uploaded document (PPT, Excel, PDF) and uses an LLM to extract structured RFQ data. An API must return this extracted data to the frontend for review and completion.
- **REQ-BE-RFQ-02 (Multi-Part & Scenario Support):**
    - The RFQ data model must support associating one RFQ with multiple parts (`part_ids` list).
    - It must support multiple volume scenarios (`volumeScenarios` list of `{volume, unit}` objects).
- **REQ-BE-RFQ-03 (Dynamic Requirements):**
    - The RFQ entity must store a `requirements` map that defines the data points to be extracted from supplier quotes. This includes both standard and custom fields defined in a `MasterFieldList` configuration.
    - The map must specify which fields are mandatory.
- **REQ-BE-RFQ-04 (Logistics & Tooling Details):**
    - The `requirements` map must be able to store detailed, structured data for logistics and tooling, including:
        - **Tooling Amortization:** A boolean flag `includedInPiecePrice` and a conditional field `amortizationAmount` that is required if the flag is true.
        - **Logistics:** Carton details, Euro Pallet usage, returnable packaging, and cleaning requirements.

## 5. Supplier Quote Intake & Processing

- **REQ-BE-QT-01 (Email Monitoring):** The system must monitor a designated email inbox for supplier responses. It must identify the associated RFQ using a custom `X-Optiroq-RFQ-ID` header or by parsing the subject line.
- **REQ-BE-QT-02 (Attachment Processing):**
    - The system must extract all attachments from supplier emails (Excel, PDF, CSV, PPT, images).
    - It must convert all file formats into a common structured format (e.g., JSON). This requires OCR capability for image-based files.
- **REQ-BE-QT-03 (LLM Data Extraction):**
    - For each quote, the system must invoke an LLM to extract structured data from the converted files.
    - The extraction prompt must be dynamically constructed based on the `requirements` map of the corresponding RFQ.
    - The result must be a JSON object containing the extracted data and a confidence score (0-100) for each field.
- **REQ-BE-QT-04 (Automated Quality Control):**
    - Implement a validation service that runs after extraction and performs:
        - **Completeness Check:** Verify that all fields marked as mandatory in the RFQ `requirements` are present.
        - **Hidden Cost Detection:** Specifically identify if tooling cost is not explicitly stated and is likely embedded in the piece price.
        - **Anomaly Detection:**
            - **Rule-Based:** Check for material cost outliers (>20% deviation from peer average), excessive scrap ratio (>30%), and values that contradict a static price index (e.g., steel, aluminum).
            - **LLM-Based:** Perform semantic validation (e.g., material density consistency, process feasibility).
- **REQ-BE-QT-05 (Data Normalization):**
    - Implement a normalization service that:
        - **Converts Currency:** Uses a live exchange rate API to convert all monetary values to a single base currency (EUR default). Store the original currency and rate.
        - **Standardizes Units:** Converts all measurements to a standard system (e.g., weight to `kg`, volume to `liters`).
- **REQ-BE-QT-06 (Data Persistence):** The backend must store the original files, the extracted data, confidence scores, normalization details, and all detected anomalies for each supplier quote.

## 6. Comparison, Decision & Governance

- **REQ-BE-CMP-01 (Comparison Data API):** Implement an API (`GET /rfqs/{id}/comparison`) to provide all normalized data for an RFQ, ranked by total cost, ready for the frontend comparison board. This includes all cost categories, supplier details, and anomaly flags.
- **REQ-BE-CMP-02 (Excel Export):** Implement an API (`GET /rfqs/{id}/comparison/export`) to generate a multi-sheet `.xlsx` file containing the summary, detailed breakdown, anomaly list, and charts.
- **REQ-BE-CMP-03 (Tooling Savings Calculation):** Implement an API (`GET /rfqs/{id}/tooling-savings?selectedSupplier={id}`) to calculate tooling cost savings of a selected supplier against the best alternative, average, and highest cost.
- **REQ-BE-CMP-04 (Approval Workflow):**
    - Implement a service to determine the required approval chain based on the RFQ's total value, using configurable thresholds:
        - `> €50,000`: + Purchasing Manager
        - `> €100,000`: + Purchasing Director
        - `> €500,000`: + VP Purchasing
        - `> €1,000,000`: + GM
    - Provide APIs to request, grant, and reject approvals (`POST /approvals/{id}/approve`).
    - Final decision-making APIs (e.g., sending nomination letter) must be gated and return a `403 Forbidden` error if required approvals are not secured.

## 7. Communications & Notifications

- **REQ-BE-COMMS-01 (RFQ Sending):** Provide an API (`POST /rfqs/{id}/send`) to generate and dispatch the initial RFQ email to all selected suppliers, injecting tracking headers.
- **REQ-BE-COMMS-02 (Status Notifications):** The system must send automated email notifications to the buyer upon:
    - **Quote Received:** Immediately after a supplier's email is ingested.
    - **Quote Processed:** After extraction, normalization, and analysis are complete, including a summary of findings and anomalies.
- **REQ-BE-COMMS-03 (Automated Follow-ups):** Provide an API to generate and send a follow-up email requesting specific missing or unclear information, triggered by the buyer from the review screen.
- **REQ-BE-COMMS-04 (Automated Rejections):** Provide an API to generate and batch-send professional rejection emails to non-selected suppliers with constructive, data-driven feedback at three configurable levels of detail (High, Medium, Low).
- **REQ-BE-COMMS-05 (Automated Reminders):** Implement a scheduled service to send reminder emails to suppliers who have not responded within a configurable period (default: 3 days).
- **REQ-BE-COMMS-06 (Communication Logging):** Every inbound and outbound email related to an RFQ must be logged as a communication event, creating a complete audit trail.

## 8. Conceptual Data Models

The following TypeScript interfaces define the conceptual data contracts. The final persistence schema will be determined during architecture design.

```typescript
// --- Core Entities ---

interface Project {
  projectId: string; // PK
  projectName: string;
  platformName?: string;
  customerName: string;
  deliveryLocation: string;
  targetCost?: number;
  status: 'draft' | 'active' | 'completed';
  createdBy: string; // user_id
  createdAt: string; // ISO 8601
}

interface Part {
  partId: string; // SK
  projectId: string; // PK
  partName: string;
  material: string;
  quantity: number;
  targetWeight?: number;
  description?: string;
  status: 'existing' | 'new';
  rfqStatus: 'not-started' | 'in-progress' | 'completed';
  existingPartDetails?: {
    currentSupplier: string;
    currentPrice: number;
    leadTime: string;
  };
  winningQuoteDetails?: any; // To be defined
}

interface RFQ {
  rfqId: string; // SK
  projectId: string; // PK
  partIds: string[];
  status: 'draft' | 'sent' | 'in-progress' | 'completed';
  volumeScenarios: { volume: number; unit: string }[];
  commodity: string;
  suppliers: { supplierId: string; name: string; email: string }[];
  requirements: {
    [fieldName: string]: {
      mandatory: boolean;
      // other field metadata
    };
  };
  logisticsDetails?: any; // Structured logistics requirements
  toolingDetails?: any;   // Structured tooling requirements
  deadline: string; // ISO 8601 Date
}

interface Quote {
  quoteId: string; // PK (e.g., rfqId + supplierId)
  rfqId: string;
  supplierId: string;
  supplierName: string;
  receivedAt: string; // ISO 8601
  status: 'processing' | 'review-needed' | 'approved' | 'rejected';
  negotiationRound: number;
  s3OriginalsKey: string;
  extractedData: Record<string, any>; // Flexible map for all extracted data
  normalizedData: Record<string, any>;
  confidenceScores: Record<string, number>;
}

// --- Supporting Entities ---

interface UserProfile {
  userId: string; // PK
  name: string;
  email: string;
  companyName: string;
  function: 'Commodity Buyer' | 'Project Buyer' | 'Sourcing Buyer' | 'Advance Sourcing Buyer';
  role: 'buyer' | 'admin';
}

interface Anomaly {
  anomalyId: string; // SK
  quoteId: string; // PK
  type: 'missing-data' | 'low-confidence' | 'outlier' | 'inconsistency';
  severity: 'high' | 'medium' | 'low';
  description: string;
  fieldName?: string;
  status: 'open' | 'resolved' | 'dismissed';
}

interface Approval {
  approvalId: string; // SK
  rfqId: string; // PK
  approvalLevel: string; // e.g., 'Purchasing Manager'
  approver: string; // user_id
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: string; // ISO 8601
  comment?: string;
}

interface CommunicationLog {
  logId: string; // PK
  rfqId: string;
  supplierId: string;
  direction: 'inbound' | 'outbound';
  type: 'initial-rfq' | 'supplier-response' | 'follow-up' | 'reminder' | 'rejection';
  timestamp: string; // ISO 8601
  s3EmailKey?: string; // Link to raw email in S3
}
```