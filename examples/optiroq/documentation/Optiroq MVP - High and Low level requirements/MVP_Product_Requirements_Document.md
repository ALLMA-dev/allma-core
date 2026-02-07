# Product Requirements Document: Optiroq MVP - Email Quote Intake & Normalization

**Document Version:** 3.0  
**Date:** January 2, 2026  
**Product Focus:** Automated Email Quote Processing & Comparison (MVP Scope)  
**Last Updated:** Enhanced with Mebarek feedback (January 2, 2026)

---

## Document Purpose

This Product Requirements Document (PRD) defines the **Minimum Viable Product (MVP)** scope for the Optiroq RFQ platform. The MVP focuses on extreme flexibility through LLM-powered adaptive UI and dynamic field management, enabling automated email quote intake, extraction, normalization, and comparison without rigid schema constraints.

**MVP Scope:** BOM upload with "The Split" (existing vs new parts) → Agent-based RFQ creation (3 methods: from scratch, clone existing, file upload with auto-parsing) → Dynamic field management (Master List + Project subset) → Email quote intake from company domain → Modular LLM extraction with auto-fill → Immediate quality control with automated rejection → Normalized comparison board + hybrid anomaly detection + supplier ranking + BOM-level analysis + multi-scenario support

**Core Innovation:** "The killer feature is flexibility." Unlike legacy systems requiring schema migrations for new fields, Optiroq uses LLMs + DynamoDB + Adaptive UI Orchestration to handle dynamic data structures, enabling buyers to configure RFQ fields per project while maintaining organizational consistency through a Master Field List.

This document contains:
- User personas and use cases (MVP-specific)
- Functional and technical requirements (aligned with Main Product PRD)
- MVP scope and prioritization
- User experience specifications
- Cross-references to Main Product features

**Related Documents:**
- `Main product/Product_Requirements_Document.md` - Full product vision and requirements
- `MVP_Killer_Feature_Focused.md` - Detailed MVP feature specifications
- `User stories/` - Comprehensive user stories for MVP actors
- `Business_Strategy_Document.md` - Business strategy and market analysis
- `Discussions/MVP_Additional_Product_Requirements(discussion Vadim-Nick 30122025).md` - Additional requirements from December 30, 2025 discussion
- `Discussions/Mebarek feedback 30122025.txt` - Industry expert feedback from Mebarek (December 30, 2025)
- `MVP (email-to-quotations)/MEBAREK_FEEDBACK_SUMMARY.md` - Analysis and enhancement summary based on Mebarek feedback

---

## Executive Summary

### The Problem

Project buyers spend 10-15 hours per RFQ manually copying data from 6-8 supplier Excel/PDF files into comparison spreadsheets. Additionally, legacy RFQ systems (SAP, SQL-based platforms) require significant development effort to add new fields or adapt to different part types, forcing buyers into rigid templates that don't match their actual needs.

This manual work and inflexibility is:
- **Time-consuming:** 40-50% of buyer time spent on data entry instead of strategic analysis
- **Error-prone:** Manual copy-paste leads to mistakes in currency conversion, unit standardization
- **Limiting:** Buyers can only evaluate 3-4 suppliers due to manual workload (should be 6-8)
- **Frustrating:** Suppliers send responses in different formats (Excel, PDF, CSV, PPT, images), making comparison impossible
- **Inflexible:** Adding new fields (e.g., "Coating Thickness") requires development work and schema migrations
- **Inconsistent:** Different buyers use different field names for the same concept, preventing cross-project analysis

### The Solution (MVP)

Optiroq MVP automates the entire quote processing workflow with extreme flexibility as the killer feature:

**Phase 1: BOM Management & "The Split"**
1. **BOM Upload:** Buyer uploads Bill of Materials (Project ID, Part Name, Material, Qty, Target Weight)
2. **The Split:** System divides parts into:
   - **Existing Parts:** Linked to current contracts (manual ERP data upload for MVP)
   - **New Parts:** Trigger RFQ creation workflow

**Phase 2: Flexible RFQ Creation (3 Methods)**
1. **From Scratch:** Buyer manually defines parameters using dynamic form
2. **Clone Existing:** Copy previous RFQ (60-70% of RFQs reuse same suppliers/requirements) with pre-filled data
3. **From Upload:** Parse pre-existing RFQ documents (PPT, Excel, PDF) for automatic pre-filling

**Phase 3: Dynamic Field Management**
- **System Fields (Immutable):** Core fields required for logic (ID, Status, Created Date) - hardcoded
- **Master Field List (Admin Config):** Organization-wide superset of "known fields" (e.g., "Coating Thickness", "Tensile Strength") maintained by Admin to ensure consistency
- **Project/RFQ Subset (Buyer Config):** Buyer selects subset of Master List fields for specific RFQ, can mark fields as mandatory, toggle optional fields based on part type (plastic vs metal)
- **Adaptive UI:** LLM generates form structures based on selected fields, ensuring consistent UI without hardcoding

**Phase 4: Email Quote Intake & Processing**
1. **Email communication:** Uses `mailto:` links (no internal email client), system agents CC'd to track threads
2. **Multi-format extraction:** Modular LLM extracts from Excel, PDF, CSV, PPT, images (OCR via Tesseract + LLM)
3. **Immediate quality control:** Automated "Quote will not be considered" messages for incomplete submissions
4. **Completeness loop:** Detects missing data and hidden costs, sends automated follow-ups

**Phase 5: Normalization & Analysis**
1. **Normalization:** Currency conversion (live exchange rates), unit standardization, cost category mapping
2. **Hybrid anomaly detection:** Rule-based (hard limits) + LLM-based (semantic checks) with severity levels (High/Medium/Low)
3. **Supplier ranking:** Automated recommendations with target price comparison, best price first
4. **BOM-level analysis:** Project-level cost visibility with manual ERP report upload for existing parts
5. **Multi-scenario support:** Volume scenarios (10K, 50K, 100K units), multiple locations, multi-year projections with lifetime spend calculations

### Value Proposition

- **Time Savings:** 10-15 hours saved per RFQ (70% reduction in manual work)
- **Better Decisions:** Compare 6-8 suppliers instead of 3-4 (2x increase)
- **Fair Comparison:** Detect hidden costs (tooling embedded in process costs)
- **Error Reduction:** Automated currency/unit conversion eliminates manual errors
- **Faster Decisions:** Incremental updates enable earlier decision-making
- **Extreme Flexibility:** Add/configure fields per RFQ without development work or schema migrations
- **Organizational Consistency:** Master Field List ensures consistent terminology across projects
- **Adaptive UI:** Dynamic form generation based on selected fields, no hardcoded templates

### Key Differentiators

1. **Extreme Flexibility (Killer Feature):** Dynamic field management with Master List + Project subset, no schema migrations needed
2. **Adaptive UI Orchestration:** LLM-generated forms adapt to selected fields, self-describing UI payloads
3. **BOM Management with "The Split":** Automatic separation of existing vs new parts
4. **Three RFQ Creation Methods:** From scratch, clone existing (60-70% of RFQs), file upload with auto-parsing
5. **Multi-Part RFQ Support:** Handle multiple parts per RFQ with package pricing and discounts (NEW)
6. **Multi-format support:** Handles Excel, PDF, CSV, PPT, images with OCR (Tesseract + LLM)
7. **Immediate quality control:** Automated "Quote will not be considered" responses for incomplete submissions
8. **Hybrid anomaly detection:** Rule-based + LLM-based semantic checks with severity levels (High/Medium/Low)
9. **Supplier Communication Tracking:** Complete audit trail of all communications, reminders, and responses (NEW)
10. **Lead Time Milestone Tracking:** Track 7 milestones (Sample A/B/C/D, Prototype, PPAP, SOP) vs targets (NEW)
11. **Negotiation Round Tracking:** Track multiple quote rounds and price improvements over time (NEW)
12. **ESG/Sustainability Scoring:** ECOVADIS scores, internal assessments, ESG-weighted ranking (NEW)
13. **Sign-off Governance Workflow:** Multi-level approvals based on spend thresholds with audit trail (NEW)
14. **Multi-scenario analysis:** Volume scenarios, multiple locations, multi-year projections with progressive pricing
15. **BOM-level visibility:** Project-level cost analysis with variance from company targets
16. **Supplier ranking:** Automated recommendations with target price comparison, best price first
17. **Multi-language & currency:** English, Spanish, French, German, Mandarin with live exchange rates
18. **Company domain emails:** purchasingrfq@companyname.com (not optiroq.com) prevents spam issues
19. **DynamoDB + Alma Architecture:** Graph-based data model (Project → BOM → RFQ → Quote) for flexibility
20. **No internal email client:** Uses `mailto:` links to open user's default mail app (Outlook)

### Success Criteria

- **Extraction Accuracy:** 90%+ automatic extraction accuracy
- **Time Savings:** 70% reduction in manual data entry time
- **Anomaly Detection:** 90%+ of cost issues flagged
- **User Satisfaction:** 4/5 rating from pilot users
- **Adoption:** 80%+ of RFQs initiated via plugin

### Timeline & Resources

- **Duration:** 15-16 weeks (was 12 weeks; +3-4 weeks for Mebarek feedback enhancements)
- **Team:** 1 experienced engineer + potential junior support
- **Pilot Customers:** 3-5 customers, 20+ RFQs processed

**Development Phases:**
- **Phase 1 (Weeks 1-4):** Core infrastructure (BOM upload, dynamic field management, adaptive UI)
- **Phase 2 (Weeks 5-8):** RFQ creation, email communication, multi-part support
- **Phase 3 (Weeks 9-12):** Extraction, normalization, anomaly detection
- **Phase 4 (Weeks 13-14):** Comparison board, communication tracking, lead time milestones
- **Phase 5 (Weeks 15-16):** Negotiation rounds, ESG scoring, sign-off governance, testing

---

## Table of Contents

1. User Personas & Use Cases (MVP Scope)
2. Functional Requirements (Aligned with Main Product)
3. Technical Architecture & AI Integration
4. User Experience & Interface Design
5. MVP Scope & Prioritization
6. Success Metrics & Validation

---

## 1. User Personas & Use Cases (MVP Scope)

### Why This Matters

The MVP focuses on solving a single, critical pain point for a subset of users from the full product. Understanding these MVP-specific personas ensures we build the right features with the right priorities.

**MVP Scope Reduction:**
- **Full Product:** 5 personas (Sarah, Marcus, Elena, James, Raj)
- **MVP:** 3 personas (Sarah, Raj, System Admin)
- **Excluded from MVP:** Marcus (Commodity Buyer), Elena (Engineering), James (Director)

**Rationale:** MVP focuses on individual RFQ processing (Sarah's workflow) without portfolio analytics, bid list management, or BOM upload features.

---

### 1.1 MVP Personas

#### Persona 1: Sarah Chen - Project Buyer (Primary Actor)

**Background:**
Sarah is a 32-year-old project buyer at a Tier 1 automotive supplier, responsible for sourcing components for new vehicle platforms. She has 6 years of procurement experience and manages 4-6 active projects simultaneously.

**MVP-Specific Context:**
In the MVP, Sarah creates RFQs using one of 3 methods: (i) manual creation from scratch (ii) duplicate existing RFQ with modifications (60-70% of RFQs reuse same suppliers/requirements) (iii) upload files (PPT, Excel, PDF) for automatic parsing. The system pre-fills fields from uploaded documents or duplicated RFQs, Sarah reviews and corrects extracted data before sending. LLM audits and catches errors using knowledge about past RFQs. She manually selects suppliers. Her focus is on eliminating manual data entry and normalization work while having flexibility in RFQ creation.

**MVP Goals:**
- Eliminate 10-15 hours of manual data entry per RFQ
- Compare suppliers fairly (with explicit cost breakdowns)
- Identify cost anomalies quickly
- Make faster sourcing decisions

**MVP Pain Points (Addressed):**
- **Manual data entry:** Copying data from 6-8 supplier Excel/PDF files into comparison spreadsheet
- **Multi-format chaos:** Suppliers send responses in different formats (Excel, PDF, CSV)
- **Hidden costs:** Suppliers embed tooling costs in process costs, making comparison impossible
- **Currency/unit conversion:** Manual conversion of currencies and units
- **Anomaly detection:** Missing obvious cost outliers due to manual process

**MVP Workflow:**
1. Creates RFQ using one of 3 methods: (i) manual creation from scratch (ii) duplicate existing RFQ with modifications (iii) upload files (PPT, Excel, PDF) for automatic parsing
2. System pre-fills fields from uploaded documents or duplicated RFQs using LLM
3. Sarah reviews and corrects extracted data before sending (LLM audits using past RFQ knowledge)
4. Manually selects suppliers and sends RFQ from company domain (e.g., purchasingrfq@companyname.com)
5. System auto-CC's Sarah but agent handles primary communication
6. Receives email notifications as supplier quotes are processed
7. Reviews incremental Excel comparison boards (updated as each supplier responds)
8. Reviews anomaly flags (red/yellow/green indicators) and supplier rankings with target price comparison
9. System immediately sends automated "Quote will not be considered" messages for incomplete submissions
10. Reviews BOM-level analysis showing project-level cost visibility with variance from targets
11. Analyzes multi-scenario data (volume scenarios, multiple locations, multi-year projections)
12. Makes sourcing decision based on normalized comparison and automated recommendations

**Technology Comfort:** High (comfortable with Outlook/Gmail, Excel)

**Success Criteria (MVP):**
- Reduce time spent on data normalization by 70%
- Evaluate 6-8 suppliers per RFQ (vs. current 3-4)
- Identify 80%+ of hidden costs (embedded tooling)
- Make sourcing decisions 50% faster
- 60-70% of RFQs created by duplicating existing RFQs (time savings)
- 90%+ automatic data extraction accuracy from uploaded files
- 100% immediate quality control responses for incomplete submissions
- Multi-scenario analysis (volume, location, multi-year) available for all RFQs
- BOM-level cost visibility with variance from targets
- Multi-language support (English, Spanish, French, German, Mandarin)
- Live exchange rate integration for accurate currency conversion

**Quote from Workshop:**
"I know I should be negotiating harder and evaluating more suppliers, but I'm so buried in Excel work that I'm just trying to get through each RFQ without making mistakes."

**Differences from Full Product:**
- **Full Product:** Sarah uploads BOMs, uses bid lists, receives AI recommendations
- **MVP:** Sarah manually creates RFQs, manually selects suppliers, reviews Excel comparison boards

---

#### Persona 2: Raj Patel - Supplier Contact (Secondary Actor)

**Background:**
Raj is a 38-year-old supplier sales manager at a mid-sized manufacturing company. He responds to 20-30 RFQs per month from various customers.

**MVP-Specific Context:**
In the MVP, Raj continues using his company's existing quotation formats (Excel, PDF, CSV). He does not log into any new system. His interaction is entirely via email.

**MVP Goals:**
- Respond to RFQs quickly using existing formats
- Minimize back-and-forth with buyers
- Understand requirements clearly

**MVP Pain Points (Addressed):**
- **Format requirements:** Buyers often require specific Excel templates (time-consuming to fill)
- **Missing information:** Buyers follow up asking for missing data (delays process)
- **Unclear requirements:** RFQ emails sometimes lack clear instructions

**MVP Workflow:**
1. Receives RFQ email from buyer (with clear requirements checklist)
2. Optional: Uses AI chat link for questions about RFQ requirements
3. Prepares quotation in supplier's own format (Excel, PDF, CSV)
4. Sends quotation via email (reply-all to include rfq-agent@[customer].com)
5. Receives follow-up email if information is missing or unclear
6. Responds to follow-up with additional information

**Technology Comfort:** Medium (comfortable with email, Excel, PDF)

**Success Criteria (MVP):**
- Use own quotation format (no new templates to learn)
- Receive clear requirements upfront (reduce follow-ups by 50%)
- Respond to RFQs 30-60 minutes faster

**Differences from Full Product:**
- **Full Product:** Raj may access supplier portal for RFQ history, performance metrics
- **MVP:** Raj uses email only (no portal access)

---

#### Persona 3: System Administrator (Setup & Monitoring)

**Background:**
IT/Operations administrator responsible for setting up and monitoring the Optiroq MVP system.

**MVP-Specific Context:**
In the MVP, System Admin configures customer-specific email subdomains, deploys plugins, and monitors system health. No complex integrations (ERP, BI tools) in MVP.

**MVP Goals:**
- Quick customer onboarding (<4 hours per customer)
- Reliable system monitoring
- Minimal maintenance

**MVP Responsibilities:**
- Configure customer-specific email subdomain (rfq-agent@[customer].com)
- Deploy plugin to buyer's Outlook/Gmail
- Configure knowledge base (mandatory fields, price indices)
- Monitor email intake and processing
- Update price indices periodically (monthly/quarterly)
- Troubleshoot extraction issues

**Technology Comfort:** High (IT professional)

**Success Criteria (MVP):**
- Onboarding time: <4 hours per customer
- System uptime: 99%+
- Processing time: <5 minutes per supplier quote
- Support time: <2 hours per week

**Differences from Full Product:**
- **Full Product:** System Admin configures ERP integrations, BI tool connections, complex workflows
- **MVP:** System Admin configures email, plugin, knowledge base only

---

### 1.2 Actors NOT in MVP Scope

The following actors from the full product are **excluded** from MVP:

#### ❌ Elena Rodriguez - Engineering Lead
**Why excluded:** MVP does not include BOM upload, part classification, or engineering collaboration features. Buyers manually create RFQ emails.

#### ❌ James Wilson - Procurement Director
**Why excluded:** MVP does not include portfolio analytics, strategic dashboards, or approval workflows. Focus is on individual RFQ processing only.

#### ❌ Marcus Thompson - Commodity Buyer
**Why excluded:** MVP does not include bid list management, supplier strategy, or commodity-level analytics. Buyers manually select suppliers for RFQs.

---

### 1.3 MVP Use Cases

#### Use Case 1: Process Supplier Quotations (Core MVP Workflow)

**Actor:** Sarah (Project Buyer)

**Preconditions:**
- Sarah has Optiroq plugin installed in Outlook/Gmail
- Sarah has list of suppliers to contact for RFQ
- Sarah has part specifications and requirements

**Main Flow:**
1. Sarah clicks "Start RFQ" button in Outlook/Gmail
2. Plugin shows structured form (Project ID, part numbers, suppliers, requirements)
3. Sarah fills form and reviews auto-generated RFQ email
4. Sarah sends RFQ email (system auto-CC's rfq-agent@[customer].com)
5. Suppliers receive RFQ and prepare quotations in their own formats
6. Suppliers send quotations via email (reply-all)
7. System detects supplier responses, downloads attachments
8. System converts files to common format (Excel → JSON, PDF → JSON, CSV → JSON)
9. System extracts cost data using modular LLM approach (block-by-block)
10. System validates completeness, detects missing data and hidden costs
11. System sends follow-up emails to suppliers with missing information
12. System normalizes data (currency, units, cost categories)
13. System detects anomalies (cost outliers, excessive scrap, inconsistencies)
14. System generates Excel comparison board and sends to Sarah
15. Sarah reviews comparison board, anomaly flags
16. As more suppliers respond, system sends updated Excel comparison boards
17. Sarah makes sourcing decision based on normalized comparison

**Postconditions:**
- Sarah has normalized comparison of all supplier quotations
- Sarah has identified cost anomalies and hidden costs
- Sarah makes sourcing decision 50% faster with 70% less manual work

**Alternative Flows:**
- **3a:** Sarah edits auto-generated email before sending
- **6a:** Supplier forgets to CC rfq-agent@[customer].com → Plugin monitors Sarah's inbox locally
- **9a:** Extraction confidence <80% → System flags for Sarah's review
- **10a:** Supplier embeds tooling in process costs → System detects and requests explicit breakdown
- **11a:** Supplier doesn't respond to follow-up → System sends reminder after 3 days

**Success Criteria:**
- 90%+ extraction accuracy from Excel, PDF, CSV files
- 80%+ of hidden costs detected
- 90%+ of anomalies flagged
- 70% reduction in Sarah's manual work time

---


#### Use Case 2: Respond to RFQ with Own Format (Supplier Workflow)

**Actor:** Raj (Supplier Contact)

**Preconditions:**
- Raj receives RFQ email from buyer
- Raj has access to company's quotation templates/systems

**Main Flow:**
1. Raj receives RFQ email with clear requirements checklist
2. Raj reviews requirements and specifications
3. Optional: Raj clicks AI chat link to ask clarification questions
4. Raj prepares quotation in company's existing format (Excel, PDF, or CSV)
5. Raj ensures all required information is included (material, process, tooling, logistics, terms)
6. Raj replies to RFQ email with quotation attachment (reply-all)
7. System confirms receipt: "Thank you for your quotation. We are processing it."
8. If information is missing, Raj receives follow-up email with specific requests
9. Raj provides additional information via email reply
10. System confirms quotation is complete: "Your quotation is complete. Thank you!"

**Postconditions:**
- Raj's quotation is processed and included in buyer's comparison
- Raj saved 30-60 minutes by using own format (vs. filling buyer's template)

**Alternative Flows:**
- **3a:** Raj has questions → Uses AI chat to get instant answers
- **8a:** Raj embedded tooling in process costs → System requests explicit breakdown
- **9a:** Raj doesn't respond to follow-up → System sends reminder after 3 days

**Success Criteria:**
- 90%+ of quotations processed successfully (Excel, PDF, CSV)
- 50% reduction in follow-up emails (due to clear requirements)
- 30-60 minutes saved per RFQ

---

#### Use Case 3: Monitor and Troubleshoot System (Admin Workflow)

**Actor:** System Administrator

**Preconditions:**
- Customer is onboarded (email subdomain configured, plugin deployed)
- System is processing RFQs

**Main Flow:**
1. Admin accesses monitoring dashboard
2. Admin reviews email intake metrics (emails received, processed, failed)
3. Admin reviews extraction accuracy metrics (confidence scores, low-confidence extractions)
4. Admin reviews system performance metrics (processing time, API latency)
5. If extraction fails, Admin reviews error details and original file
6. Admin manually re-processes failed extraction or escalates to development
7. Admin updates price indices monthly/quarterly
8. Admin assists buyers with plugin issues or extraction questions

**Postconditions:**
- System is running smoothly with 99%+ uptime
- Extraction issues are resolved quickly
- Price indices are up-to-date

**Alternative Flows:**
- **5a:** High volume of failed extractions → Admin adjusts knowledge base or escalates
- **7a:** Material prices change significantly → Admin updates indices immediately

**Success Criteria:**
- System uptime: 99%+
- Processing time: <5 minutes per supplier quote
- Support time: <2 hours per week

---

## 2. Functional Requirements (Aligned with Main Product)

### Why This Matters

This section translates MVP user needs into specific, measurable functional requirements. Each requirement is assigned a unique identifier aligned with the Main Product PRD (REQ-RFQ-XX), includes detailed acceptance criteria, priority level (P0/P1/P2), and dependencies.

**MVP Scope:** Requirements focus on email-based quote processing workflow only. Features requiring BOM upload, bid list management, portfolio analytics, or ERP integration are excluded from MVP.

**Alignment with Main Product:**
- MVP requirements use same numbering scheme as Main Product PRD
- MVP requirements are subset of Main Product requirements
- Cross-references indicate which Main Product features are included/excluded

**Priority Levels:**
- **P0 (Must Have)**: Critical for MVP; system cannot function without this
- **P1 (Should Have)**: Important for MVP value; include if time permits
- **P2 (Nice to Have)**: Valuable but can be deferred to post-MVP

---

### 2.1 BOM Management & "The Split" (MVP Core)

#### REQ-MVP-00A: BOM Upload & Project Initialization (ENHANCED)

**Description:**
The system shall accept BOM (Bill of Materials) uploads and initialize projects with unique Project IDs, capturing enhanced project details (Project Name, Platform Name, Customer Name, Delivery Location), and storing BOM data in DynamoDB graph structure (Project → BOM → Parts).

**Acceptance Criteria:**

1. **BOM Upload**
   - System accepts BOM files in Excel format (.xlsx, .xls)
   - System extracts required fields: Project ID (optional, auto-generated if missing), Part Name, Material, Quantity, Target Weight
   - System validates BOM structure and completeness
   - System generates unique Project ID if not provided (e.g., PRJ-2025-001)
   - Upload time: <30 seconds for 100-part BOM

2. **Enhanced Project Details (NEW - Mebarek Feedback)**
   - System captures additional project information:
     - **Project Name** (required): Human-readable project name (e.g., "Model X Platform Refresh")
     - **Platform Name** (optional): Vehicle/product platform (e.g., "MQB Platform", "Model 3")
     - **Customer Name** (required): End customer or OEM (e.g., "Tesla", "Volkswagen")
     - **Delivery Location** (optional): Delivery destination with default value
   - System provides default delivery location: "Customer Plant - TBD" (configurable per customer)
   - Buyer can override default delivery location
   - System displays these fields in project dashboard and includes in RFQ emails to suppliers

3. **Data Storage (DynamoDB Graph)**
   - System stores BOM in graph structure: Project → BOM → Parts
   - Each part has attributes: Part Name, Material, Qty, Target Weight, Status (existing/new)
   - Project node includes: Project ID, Project Name, Platform Name, Customer Name, Delivery Location
   - Graph enables flexible queries and relationships
   - No schema migrations needed for new part attributes

4. **Project Dashboard**
   - System displays project summary: Project ID, Project Name, Platform Name, Customer Name, Delivery Location
   - System shows: total parts, existing parts count, new parts count
   - System shows BOM table with all parts and their status
   - Buyer can view/edit BOM data and project details before proceeding

**Priority:** P0 (Must Have)

**Dependencies:**
- DynamoDB setup
- Alma backend integration

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-01** (Project Intake & BOM Analysis) - MVP includes BOM upload
- **Excluded from MVP:** Automatic part classification, engineering collaboration

**Acceptance Testing:**
- Upload 10 sample BOMs (10-100 parts each); verify <30 seconds processing
- Verify Project ID generation (auto and manual)
- Verify graph structure in DynamoDB
- Verify project dashboard displays correct summary

---

#### REQ-MVP-00B: "The Split" - Existing vs New Parts Classification

**Description:**
The system shall automatically classify BOM parts into "Existing Parts" (linked to current contracts) and "New Parts" (requiring RFQ), enabling buyers to focus RFQ efforts on new parts only.

**Acceptance Criteria:**

1. **Existing Parts Detection**
   - System checks each BOM part against existing contracts/parts database
   - Matching criteria: Part Name, Material, Specifications (fuzzy matching with 90%+ confidence)
   - System flags parts as "Existing" if match found
   - System links existing parts to current contract data (Supplier, Price, Lead Time)

2. **Manual ERP Data Upload (MVP)**
   - For existing parts, buyer manually uploads ERP report with: Part Name, Current Supplier, Current Price, Lead Time
   - System parses ERP report (Excel format) and links to existing parts
   - System displays existing parts with current pricing in project dashboard
   - Future versions will integrate directly via ERP API

3. **New Parts Identification**
   - System flags parts as "New" if no match found in existing contracts
   - System displays new parts list with: Part Name, Material, Qty, Target Weight
   - System enables bulk RFQ creation for all new parts or selective RFQ creation

4. **The Split Summary**
   - System displays split summary: "15 Existing Parts (60%), 10 New Parts (40%)"
   - System shows cost breakdown: Existing Parts Total Cost, New Parts Target Cost, Project Total
   - System highlights parts requiring RFQ action

**Priority:** P0 (Must Have)

**Dependencies:**
- REQ-MVP-00A (BOM Upload) - for BOM data
- Existing contracts database (manual upload for MVP)

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-02** (Existing Parts Intelligence) - MVP uses manual ERP upload
- **Excluded from MVP:** Automatic ERP integration, renegotiation opportunities

**Acceptance Testing:**
- Test with 5 sample BOMs containing mix of existing/new parts; verify correct classification
- Test manual ERP data upload; verify linking to existing parts
- Verify split summary displays correct percentages
- Test bulk RFQ creation for new parts

---

### 2.2 Dynamic Field Management & Adaptive UI (MVP Core - Killer Feature)

#### REQ-MVP-00C: Master Field List Configuration (Admin)

**Description:**
The system shall maintain an organization-wide Master Field List defining all known RFQ fields, ensuring consistency across projects while preventing "schema chaos" from uncontrolled field additions.

**Acceptance Criteria:**

1. **Master Field List Structure**
   - System stores Master Field List in configuration (JSON or DynamoDB)
   - Each field has attributes:
     - Field Name (e.g., "Coating Thickness")
     - Field Type (text, number, currency, date, dropdown)
     - Unit (if applicable: mm, kg, USD, etc.)
     - Validation Rules (min/max, required format, etc.)
     - Description (help text for buyers/suppliers)
     - Commodity Types (which commodities use this field: plastic, metal, etc.)
   - System fields (ID, Status, Created Date) are immutable and always included

2. **Admin Configuration Interface**
   - Admin can view Master Field List in table format
   - Admin can add new fields (requires config update - Dev/Admin task)
   - Admin can edit field attributes (type, unit, validation, description)
   - Admin can assign fields to commodity types
   - Admin can mark fields as "deprecated" (hidden from new RFQs but preserved in historical data)

3. **Field Addition Process**
   - Adding new field to Master List requires Admin approval (prevents chaos)
   - Admin reviews field request: Is it truly new or duplicate of existing field?
   - Admin registers field in Entity Graph/Database schema
   - Field becomes available for all buyers to use in RFQs

4. **Consistency Enforcement**
   - System prevents buyers from creating ad-hoc fields (must use Master List)
   - System suggests existing fields when buyer types similar name (e.g., "Coating" suggests "Coating Thickness")
   - System ensures consistent terminology across organization

**Priority:** P0 (Must Have - Killer Feature)

**Dependencies:**
- DynamoDB or JSON configuration storage
- Admin interface (can be simple web form for MVP)

**Cross-Reference to Main Product:**
- **New in MVP:** Dynamic field management (not in Main Product scope)
- **Killer Feature:** Enables flexibility without schema chaos

**Acceptance Testing:**
- Admin adds 10 new fields to Master List; verify fields available to buyers
- Test field validation rules (min/max, required format)
- Test commodity type filtering (plastic fields vs metal fields)
- Test consistency enforcement (buyer cannot create ad-hoc fields)
- Test field suggestion when buyer types similar name

---

#### REQ-MVP-00D: Project/RFQ Field Selection (Buyer)

**Description:**
The system shall enable buyers to select a subset of Master List fields for each specific RFQ, mark fields as mandatory, and toggle optional fields based on part type, providing flexibility while maintaining consistency.

**Acceptance Criteria:**

1. **Field Selection Interface**
   - During RFQ creation, system displays Master Field List filtered by commodity type
   - Buyer can select/deselect fields for this specific RFQ
   - System shows field descriptions and validation rules
   - Buyer can search/filter fields by name or category
   - System pre-selects commonly used fields based on commodity type

2. **Mandatory Field Configuration**
   - Buyer can mark selected fields as "Mandatory" (supplier must provide)
   - Buyer can mark fields as "Optional" (supplier can skip)
   - System validates mandatory fields during quote ingestion
   - System sends follow-up emails if mandatory fields missing

3. **Field Toggling by Part Type**
   - Buyer can toggle fields on/off based on part type (plastic vs metal)
   - Example: "Coating Thickness" enabled for metal parts, disabled for plastic parts
   - System saves field configuration per RFQ for reuse (clone RFQ)

4. **Field Configuration Reuse**
   - When cloning existing RFQ, system copies field configuration
   - Buyer can modify field selection before sending RFQ
   - System tracks field usage frequency to improve pre-selection

**Priority:** P0 (Must Have - Killer Feature)

**Dependencies:**
- REQ-MVP-00C (Master Field List) - for available fields
- RFQ creation workflow

**Cross-Reference to Main Product:**
- **New in MVP:** Dynamic field selection per RFQ (not in Main Product scope)
- **Killer Feature:** Enables per-project flexibility

**Acceptance Testing:**
- Create 5 RFQs with different field selections; verify correct fields displayed
- Test mandatory field marking; verify validation during ingestion
- Test field toggling by part type (plastic vs metal)
- Clone RFQ; verify field configuration copied
- Test field usage tracking and pre-selection improvement

---

#### REQ-MVP-00E: Adaptive UI Generation (LLM-Powered)

**Description:**
The system shall dynamically generate UI forms based on selected RFQ fields using LLM, producing self-describing UI payloads that tell the frontend exactly what to render, eliminating hardcoded templates.

**Acceptance Criteria:**

1. **LLM-Based UI Generation**
   - System uses LLM to generate form structure based on selected fields
   - LLM receives: Field list (names, types, units, validation rules, descriptions)
   - LLM produces: Self-describing UI payload (JSON) with:
     - Form sections (Material, Process, Tooling, Logistics, Terms)
     - Field order and grouping
     - Input types (text box, dropdown, number input, date picker)
     - Validation rules (client-side and server-side)
     - Help text and placeholders
   - UI payload is cached per RFQ (consistent across sessions)

2. **Frontend Rendering**
   - Frontend receives UI payload and renders form dynamically
   - No hardcoded form templates (fully adaptive)
   - Form adapts to any field combination without code changes
   - Form includes validation and help text from UI payload

3. **Consistency & Caching**
   - UI payload is generated once per RFQ and cached
   - Subsequent loads use cached payload (no regeneration)
   - Cache invalidation only if field configuration changes
   - Ensures consistent UI across buyer sessions

4. **Supplier Template Generation**
   - System generates Excel template for suppliers based on UI payload
   - Template includes: Field names, descriptions, units, validation rules, example values
   - Template structure matches UI form structure
   - Suppliers can fill template and return via email

**Priority:** P0 (Must Have - Killer Feature)

**Dependencies:**
- REQ-MVP-00D (Field Selection) - for selected fields
- LLM API (OpenAI GPT-4, Anthropic Claude, or Google Gemini)
- Frontend framework supporting dynamic rendering

**Cross-Reference to Main Product:**
- **New in MVP:** Adaptive UI generation (not in Main Product scope)
- **Killer Feature:** Core innovation enabling flexibility

**Acceptance Testing:**
- Create 10 RFQs with different field combinations; verify UI adapts correctly
- Test UI payload caching; verify consistency across sessions
- Test supplier template generation; verify matches UI structure
- Measure UI generation time; verify <5 seconds per RFQ
- Test frontend rendering with various field types (text, number, dropdown, date)

---

### 2.3 RFQ Creation & Email Communication (MVP Core)

#### REQ-MVP-01: Three RFQ Creation Methods

**Description:**
The system shall provide three methods for RFQ creation: (1) From Scratch (manual), (2) Clone Existing (60-70% of RFQs), (3) From Upload (automatic parsing), enabling buyers to choose the most efficient method for each situation.

**Acceptance Criteria:**

1. **Method 1: From Scratch**
   - Buyer clicks "Create New RFQ" button
   - System displays adaptive form based on selected fields (REQ-MVP-00E)
   - Buyer manually fills all fields
   - System validates inputs and saves RFQ
   - Creation time: <5 minutes for typical RFQ

2. **Method 2: Clone Existing RFQ**
   - Buyer selects existing RFQ from list
   - Buyer clicks "Clone RFQ" button
   - System copies all RFQ data: Fields, suppliers, requirements, attachments
   - System pre-fills form with cloned data
   - Buyer reviews and modifies as needed (e.g., change quantities, add suppliers)
   - System saves as new RFQ with new Project ID
   - Creation time: <3 minutes (60-70% time savings)

3. **Method 3: From Upload (Auto-Parsing)**
   - Buyer uploads pre-existing RFQ document (PPT, Excel, PDF)
   - System converts file to structured format (REQ-MVP-03)
   - System uses LLM to extract RFQ data and map to selected fields
   - System pre-fills form with extracted data
   - Buyer reviews and corrects extracted data (LLM audits using past RFQ knowledge)
   - System saves RFQ
   - Creation time: <4 minutes (including review)

4. **Supplier Selection**
   - For all methods, buyer manually selects suppliers from list or enters email addresses
   - System stores supplier list per RFQ
   - System enables bulk supplier selection for multiple RFQs

5. **RFQ Review & Send**
   - Buyer reviews complete RFQ (fields, suppliers, attachments)
   - System generates professional RFQ email with requirements checklist
   - Buyer can edit email before sending
   - Buyer clicks "Send RFQ" (opens `mailto:` link with pre-filled email)

**Priority:** P0 (Must Have)

**Dependencies:**
- REQ-MVP-00E (Adaptive UI) - for dynamic forms
- REQ-MVP-03 (File Conversion) - for upload method
- REQ-MVP-04 (LLM Extraction) - for upload method

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-01** (Project Intake) - MVP adds three creation methods
- **New in MVP:** Clone existing RFQ (60-70% time savings)

**Acceptance Testing:**
- Create 10 RFQs from scratch; verify <5 minutes creation time
- Clone 10 existing RFQs; verify <3 minutes creation time and correct data copying
- Upload 10 RFQ documents (PPT, Excel, PDF); verify <4 minutes creation time and 90%+ extraction accuracy
- Test supplier selection (manual and bulk)
- Test RFQ review and email generation

---

#### REQ-MVP-01A: Email Communication via `mailto:` Links

**Description:**
The system shall use `mailto:` links to open the user's default mail app (Outlook) for RFQ sending, avoiding the need for an internal email client while enabling system agents to track email threads via CC.

**Acceptance Criteria:**

1. **`mailto:` Link Generation**
   - System generates `mailto:` link with:
     - To: Supplier email addresses (comma-separated)
     - CC: rfq-agent@[customer-domain].optiroq.com (system agent)
     - Subject: "RFQ [Project-ID] - [Part Description]"
     - Body: Professional RFQ email with requirements checklist
   - Buyer clicks "Send RFQ" button
   - System opens buyer's default mail app (Outlook) with pre-filled email
   - Buyer can review/edit email before sending from their mail app

2. **System Agent Tracking**
   - System agent (rfq-agent@[customer-domain].optiroq.com) is CC'd on all RFQ emails
   - Agent monitors inbox for supplier responses (Project ID in subject/headers)
   - Agent downloads attachments and processes quotes
   - Agent sends notifications to buyer as quotes are processed

3. **Email Thread Preservation**
   - Project ID embedded in subject line (visible) and headers (X-Optiroq-Project-ID)
   - Supplier replies preserve Project ID in subject line
   - Agent identifies responses via Project ID
   - Agent stores full email thread for reference

4. **Offline Handling**
   - If buyer's laptop is offline, agent continues monitoring dedicated inbox
   - Project ID enables colleague to take over (forward email preserves Project ID)
   - Agent on colleague's machine picks up thread

**Priority:** P0 (Must Have)

**Dependencies:**
- REQ-MVP-01 (RFQ Creation) - for RFQ data
- Email agent setup (rfq-agent@[customer-domain].optiroq.com)

**Cross-Reference to Main Product:**
- **New in MVP:** `mailto:` links instead of internal email client
- **Rationale:** Simpler implementation, uses buyer's existing email workflow

**Acceptance Testing:**
- Generate 10 `mailto:` links; verify correct To, CC, Subject, Body
- Test opening in Outlook; verify pre-filled email
- Test agent tracking; verify responses detected via Project ID
- Test offline handling; verify agent continues monitoring
- Test email thread preservation; verify Project ID in replies

---

### 2.4 Multi-Format Extraction & Normalization (MVP Core)

#### REQ-MVP-02: Email Quote Intake & Monitoring

**Description:**
The system shall monitor designated email inbox (rfq-agent@[customer-domain].optiroq.com) for supplier responses, download all attachments (Excel, PDF, CSV, PPT, images), and associate responses with Project ID.

**Acceptance Criteria:**

1. **Inbox Monitoring**
   - System monitors rfq-agent@[customer-domain].optiroq.com inbox via IMAP (poll every 5 minutes)
   - System identifies supplier responses via:
     - Project ID in subject line
     - Project ID in email headers (X-Optiroq-Project-ID)
     - Sender email matching supplier list
   - System detects responses within 5 minutes of receipt

2. **Attachment Extraction**
   - System downloads ALL attachments from supplier emails:
     - Excel files (.xlsx, .xls)
     - PDF files (.pdf)
     - CSV files (.csv)
     - PowerPoint files (.ppt, .pptx)
     - Image files (.jpg, .png, .gif) - for OCR processing
     - Links to Google Drive, Dropbox, etc. (downloads files from links)
   - System stores attachments securely (encrypted S3 or equivalent)
   - System associates attachments with Project ID and supplier
   - System stores full email thread (for reference)

3. **Notification**
   - System sends email notification to buyer: "Received quote from Supplier A for Project 123"
   - Notification includes: Project ID, supplier name, timestamp, attachment count, attachment types
   - Buyer can access original files if needed

4. **Multi-Format Support**
   - System handles Excel, PDF, CSV, PPT, images (with OCR)
   - System logs unsupported formats and notifies buyer
   - System tracks processing status per attachment

**Priority:** P0 (Must Have)

**Dependencies:**
- REQ-MVP-01A (Email Communication) - for Project ID tracking
- Email agent setup (rfq-agent@[customer-domain].optiroq.com)

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-04** (RFQ Distribution & Supplier Response Management) - MVP uses email only
- **Excluded from MVP:** Supplier portal, in-app messaging, response tracking dashboard

**Acceptance Testing:**
- Send 10 test emails to rfq-agent@[customer].com; verify detection within 5 minutes
- Test with Excel, PDF, CSV, PPT, image attachments; verify all downloaded
- Test with Google Drive links; verify files downloaded
- Verify email notifications sent to buyer
- Test with unsupported formats; verify logging and notification

---

### 2.2 Multi-Format Extraction & Normalization (MVP Core)

#### REQ-MVP-03: File Format Conversion

**Description:**
The system shall convert supplier quotation files (Excel, PDF, CSV, PPT, images) to common structured format for LLM extraction, including OCR support for scanned documents and images.

**Acceptance Criteria:**

1. **Excel Conversion**
   - System converts Excel files (.xlsx, .xls) to structured JSON
   - System handles multiple sheets (extracts all sheets)
   - System preserves cell formatting, formulas, and data types
   - Conversion accuracy: 100% (lossless)
   - Conversion time: <30 seconds per file

2. **PDF Conversion**
   - System converts PDF files to text (with OCR if needed)
   - System handles PDFs with text layer (no OCR needed)
   - System handles scanned PDFs (OCR via Tesseract or AWS Textract)
   - Conversion accuracy: 95%+ for text-based PDFs, 85%+ for scanned PDFs
   - Conversion time: <60 seconds per file

3. **CSV Conversion**
   - System converts CSV files to structured JSON
   - System handles various CSV formats (comma, semicolon, tab-delimited)
   - System auto-detects delimiter and encoding
   - Conversion accuracy: 100% (lossless)
   - Conversion time: <10 seconds per file

4. **PowerPoint Conversion**
   - System converts PPT/PPTX files to structured JSON
   - System extracts text from slides, tables, and charts
   - System handles embedded images (OCR if needed)
   - Conversion accuracy: 90%+ for text, 85%+ for tables
   - Conversion time: <45 seconds per file

5. **Image Conversion (OCR)**
   - System converts image files (.jpg, .png, .gif) to text using OCR
   - System uses Tesseract + LLM for text extraction
   - System handles scanned documents, photos of documents, screenshots
   - Conversion accuracy: 85%+ for clear images, 70%+ for low-quality images
   - Conversion time: <60 seconds per image
   - **MVP Constraint:** No screenshots support (manual entry required)

6. **Google Sheets Conversion**
   - System downloads Google Sheets via API
   - System converts to structured JSON (same as Excel)
   - Conversion accuracy: 100% (lossless)
   - Conversion time: <30 seconds per file

7. **Modular Converter Architecture**
   - Converters are modular (add formats incrementally)
   - Fallback: LLM-generated converter for unsupported formats
   - System logs conversion errors for troubleshooting

**Priority:** P0 (Must Have) for Excel/PDF/CSV, P1 (Should Have) for PPT/Images/Google Sheets

**Dependencies:**
- REQ-MVP-02 (Email Quote Intake) - for attachment extraction
- OCR engine (Tesseract or AWS Textract)
- LLM API for OCR enhancement

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-05** (Cost Breakdown Template & Data Extraction) - MVP handles multiple formats
- **Excluded from MVP:** Standardized template enforcement, template validation

**Acceptance Testing:**
- Test with 20 sample Excel files (various structures); verify 100% conversion accuracy
- Test with 10 sample PDFs (text-based and scanned); verify 95%+ and 85%+ accuracy
- Test with 10 sample CSV files (various delimiters); verify 100% conversion accuracy
- Test with 10 sample PPT files; verify 90%+ text extraction accuracy
- Test with 10 sample images (clear and low-quality); verify 85%+ and 70%+ OCR accuracy
- Test with 5 sample Google Sheets; verify 100% conversion accuracy
- Measure conversion time; verify within targets

---

#### REQ-MVP-04: Modular LLM Extraction (Block-by-Block) (ENHANCED)

**Description:**
The system shall extract cost data from converted files using modular LLM approach (block-by-block) with knowledge base per block, achieving 90-95% extraction accuracy, including enhanced logistics fields (carton, pallet, returnable packaging, cleaning).

**Acceptance Criteria:**

1. **Block Identification (ENHANCED - Mebarek Feedback)**
   - System identifies data blocks in converted file:
     - Material costs (raw material type, cost/kg, gross/net weight, scrap)
     - Process costs (operations, cycle time, labor, overhead)
     - Tooling costs (investment, amortization, shots, maintenance)
     - **Logistics (ENHANCED)**: packaging, transportation, IncoTerms, carton type, Euro pallet (yes/no), returnable packaging (yes/no + cost), cleaning (yes/no + cost)
     - Terms (payment terms, currency, lead time)
     - **Lead Time Milestones (NEW)**: Sample A/B/C/D, Prototype, Off-tool, PPAP, SOP
   - System uses pattern matching or LLM-based identification
   - System handles variations in block naming and structure

2. **Knowledge Base per Block (ENHANCED)**
   - System maintains JSON knowledge base per block with:
     - Field definitions (name, type, unit, validation rules)
     - Examples (sample values)
     - Validation rules (e.g., scrap_ratio = (gross_weight - net_weight) / gross_weight)
   - **Enhanced Logistics Fields**:
     - carton_type: text (standard, custom)
     - euro_pallet_required: boolean (yes/no)
     - returnable_packaging_required: boolean (yes/no)
     - returnable_packaging_cost: currency (if yes)
     - cleaning_required: boolean (yes/no)
     - cleaning_cost: currency (if yes)
   - Knowledge base is configurable by commodity type
   - System Admin can update knowledge base

3. **Per-Block Extraction**
   - System processes each block separately with dedicated LLM call
   - System uses knowledge base as context for LLM prompt
   - System extracts structured data from each block
   - System validates extracted data against rules
   - System assigns confidence score (high/medium/low) per field

4. **Result Combination**
   - System combines block results into complete structured quote
   - System flags low-confidence extractions (<80%) for manual review
   - System logs extraction details for troubleshooting

5. **Extraction Accuracy**
   - Target accuracy: 90-95% for Excel files
   - Target accuracy: 85-90% for PDF files
   - Target accuracy: 90-95% for CSV files
   - Accuracy measured by manual review of 20 sample extractions

**Priority:** P0 (Must Have)

**Dependencies:**
- REQ-MVP-03 (File Format Conversion) - for structured input
- Knowledge base configuration (System Admin responsibility)

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-05** (Cost Breakdown Template & Data Extraction) - MVP uses LLM instead of template
- **Excluded from MVP:** Template-based extraction, cell mapping, formula parsing

**Acceptance Testing:**
- Test with 20 sample Excel files; verify 90-95% extraction accuracy
- Test with 10 sample PDF files; verify 85-90% extraction accuracy
- Test with 10 sample CSV files; verify 90-95% extraction accuracy
- Verify confidence scores assigned correctly
- Verify low-confidence extractions flagged for review

---

#### REQ-MVP-05: Completeness Check & Immediate Quality Control

#### REQ-MVP-05: Completeness Check & Immediate Quality Control (ENHANCED)

**Description:**
The system shall validate mandatory fields, detect hidden costs (embedded tooling), verify tooling amortization transparency, immediately send automated "Quote will not be considered" messages for incomplete submissions, and auto-generate follow-up emails for missing information with response tracking.

**Acceptance Criteria:**

1. **Mandatory Field Validation (ENHANCED - Mebarek Feedback)**
   - System validates mandatory fields by commodity type (configured in REQ-MVP-00D):
     - Material: raw_material_type, cost_per_kg, gross_weight, net_weight
     - Process: operations, cycle_time, total_process_cost
     - Tooling: tooling_investment, amortization_period (MUST be explicit, not embedded)
     - **Tooling Amortization (NEW)**: amortization_included_in_piece_price (yes/no), amortization_per_piece (if yes)
     - Terms: payment_terms, incoterms, lead_time
     - Capacity: capacity_confirmation, equipment_count, shifts
     - **Logistics (NEW)**: carton_type, euro_pallet_required, returnable_packaging (yes/no + cost), cleaning (yes/no + cost)
   - System flags missing fields with severity (red/yellow)
   - System distinguishes between "not provided" and "not found" (extraction issue)

2. **Hidden Cost Detection**
   - System checks if tooling cost is listed separately
   - If tooling cost is missing, system flags as "likely embedded"
   - System uses LLM to analyze if tooling is mentioned in process costs
   - System flags: "Tooling cost not found - likely embedded in process costs"
   - This is critical for fair comparison (can't compare apples to oranges)

3. **Tooling Amortization Transparency (NEW - Mebarek Feedback)**
   - System asks supplier explicitly: "Is tooling amortization included in piece price? (Yes/No)"
   - If Yes: "How much per piece is tooling amortization?"
   - System extracts explicit tooling amortization from piece price:
     - Piece price (total)
     - Piece price (excluding tooling amortization)
     - Tooling amortization per piece
   - System ensures fair comparison (all prices on same basis):
     - Option A: All prices exclude tooling amortization (preferred)
     - Option B: All prices include tooling amortization (if supplier cannot separate)
   - System displays explicit breakdown in comparison board:
     - "Supplier A: Piece price €10.50 = €9.80 (ex-tooling) + €0.70 (tooling amortization)"
     - "Supplier B: Piece price €9.50 (tooling separate: €50,000 investment)"
   - System flags if tooling amortization unclear: "Supplier C: Tooling amortization not specified - Request clarification 🔴"

4. **Immediate Quality Control - Automated Rejection**
   - **NEW:** If quote is incomplete (missing mandatory fields or hidden costs detected), system immediately sends automated "Quote will not be considered" message
   - Message includes:
     - Professional greeting: "Dear [Supplier Name], Thank you for your quotation for RFQ [Project-ID]"
     - Clear statement: "Unfortunately, your quotation cannot be considered due to missing required information"
     - Specific list of missing mandatory fields
     - Request for explicit tooling cost breakdown (if embedded)
     - **Request for tooling amortization clarification (if unclear)**
     - Deadline for resubmission (3 days default)
     - Professional closing: "We value your partnership and look forward to receiving your complete quotation"
   - System tracks rejection status: incomplete/pending_resubmission/complete
   - System does NOT include incomplete quotes in comparison board

5. **Follow-up Email Generation (for minor issues)**
   - For minor issues (optional fields missing, clarifications needed), system generates professional follow-up email listing:
     - Missing optional fields (nice to have)
     - Request for clarifications (ambiguous data)
     - Deadline for response (3 days default)
   - Email is polite and professional
   - Email explains WHY information is needed (e.g., "for fair comparison")
   - Buyer can review and edit email before sending
   - Buyer can approve with one click

6. **Response Tracking**
   - System monitors for follow-up responses (via Project ID)
   - System re-processes quote with additional information
   - System updates comparison board with new data
   - System sends notification: "Supplier A provided additional information - comparison board updated"
   - System sends reminder if no response after 3 days
   - System tracks status: complete/incomplete/pending/rejected

**Priority:** P0 (Must Have)

**Dependencies:**
- REQ-MVP-04 (Modular LLM Extraction) - for extracted data
- REQ-MVP-00D (Field Selection) - for mandatory fields configuration
- Email sending capability

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-05** (Cost Breakdown Template & Data Extraction) - MVP adds hidden cost detection
- **New in MVP:** Immediate automated rejection for incomplete submissions (not in Main Product scope)

**Acceptance Testing:**
- Test with 10 sample quotes with missing mandatory fields; verify immediate rejection messages sent
- Test with 5 sample quotes with embedded tooling; verify detection and rejection
- Test with 5 sample quotes with minor issues; verify follow-up emails generated (not rejection)
- Verify rejection messages include specific missing fields
- Test response tracking; verify re-processing and notification
- Test reminder sending after 3 days
- Verify incomplete quotes NOT included in comparison board

---

#### REQ-MVP-06: Data Normalization

**Description:**
The system shall normalize all supplier data to common basis: currency conversion, unit standardization, cost category mapping, and explicit cost breakdown.

**Acceptance Criteria:**

1. **Currency Conversion**
   - System identifies currency in each supplier's quote (EUR, USD, GBP, JPY, CNY, etc.)
   - System converts all costs to common currency (EUR default, configurable)
   - System uses exchange rate from quotation date (via API: ECB, Federal Reserve, or commercial)
   - System shows original currency and converted currency
   - Conversion accuracy: ±0.1%
   - System displays conversion rate used: "Converted from USD @ 0.90 EUR/USD"

2. **Unit Standardization (ENHANCED - Mebarek Feedback)**
   - System identifies units in each supplier's quote (kg, lbs, g, tons, pieces, dozens, liters, gallons, etc.)
   - System converts all units to common basis:
     - Weight: kg
     - Volume: liters (NEW)
     - Quantity: pieces
   - System provides unit converter for buyer use:
     - Weight: kg ↔ lbs ↔ g ↔ tons
     - Volume: liters ↔ gallons ↔ ml
     - Quantity: pieces ↔ dozens ↔ hundreds
   - System handles implicit conversions (e.g., "per 100 pieces" → "per piece")
   - Conversion accuracy: ±1%
   - System displays conversion: "Converted from 220 lbs to 100 kg" or "Converted from 5 gallons to 18.9 liters"

3. **Cost Category Mapping**
   - System maps supplier cost structures to standard categories:
     - Material → Material
     - Processing/Manufacturing → Process
     - Tooling/Molds/Dies → Tooling (explicit)
     - Packaging/Freight → Logistics
   - System un-embeds hidden costs (tooling from process)
   - System shows original category and mapped category

4. **Explicit Cost Breakdown**
   - If tooling is embedded, system extracts and lists separately
   - If setup costs are embedded, system extracts and lists separately
   - System shows: "Supplier B: Process $950 = $760 process + $190 tooling (extracted)"

5. **Terms Normalization**
   - Payment terms: Convert to days (Net 30, Net 60, etc.)
   - IncoTerms: Note basis (EXW, FOB, DDP, etc.) - no adjustment in MVP

**Priority:** P0 (Must Have)

**Dependencies:**
- REQ-MVP-04 (Modular LLM Extraction) - for extracted data
- REQ-MVP-05 (Completeness Check) - for explicit cost breakdown
- Exchange rate API integration

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-06** (Cost Normalization & Comparison) - MVP uses LLM-driven normalization
- **Excluded from MVP:** Advanced normalization (lead time adjustment, capacity normalization)

**Acceptance Testing:**
- Test with quotes in 5 different currencies; verify conversion accuracy ±0.1%
- Test with quotes in 5 different units; verify conversion accuracy ±1%
- Test with 5 quotes with different cost structures; verify category mapping
- Test with 3 quotes with embedded tooling; verify extraction and explicit listing
- Verify terms normalization (payment terms to days)

---

### 2.3 Anomaly Detection & Comparison (MVP Core)

#### REQ-MVP-07: Hybrid Anomaly Detection (Rule-Based + LLM-Based)

**Description:**
The system shall detect cost anomalies using hybrid approach: rule-based checks (hard limits, peer comparison, static price indices) + LLM-based semantic checks (material consistency, price deviation analysis), with severity levels (High/Medium/Low) and human-in-the-loop for High severity issues.

**Acceptance Criteria:**

1. **Material Cost Outlier Detection (Rule-Based)**
   - System calculates average material cost across all suppliers for this RFQ
   - System flags suppliers >20% above average (High severity - red flag)
   - System flags suppliers >10% above average (Medium severity - yellow flag)
   - System displays: "Supplier E: Material cost 37% above average 🔴 HIGH"
   - System shows peer comparison: "Average: €12.06/kg, Supplier E: €16.50/kg"

2. **Price Index Validation (Rule-Based)**
   - System compares extracted costs against static price indices (knowledge base):
     - Steel: ~$1000/ton
     - Aluminum: ~$2500/ton
     - Plastic: ~$2000/ton
   - System flags if cost is 10x higher/lower than index (High severity - likely extraction error)
   - System flags if cost is 2-10x higher/lower than index (Medium severity - needs review)
   - System displays: "Aluminum cost seems too high - please review extraction 🔴 HIGH"
   - This is order-of-magnitude validation (not precise pricing)
   - Price indices updated monthly/quarterly (not real-time)

3. **Excessive Scrap Ratio Detection (Rule-Based)**
   - System calculates scrap ratio: (gross_weight - net_weight) / gross_weight
   - System flags scrap ratio >30% (Medium severity - yellow flag)
   - System flags scrap ratio >50% (High severity - red flag)
   - System shows industry norms: "Stamping: 10-20%, Machining: 5-10%"
   - System displays: "Supplier B: Scrap ratio 35% ⚠️ MEDIUM (high scrap)"

4. **Inconsistent Data Detection (Rule-Based)**
   - System checks logical consistency:
     - Cycle time vs capacity (can they produce the volume?)
     - Tooling shots vs lifetime volume (will tooling last?)
     - Gross weight > net weight (scrap ratio makes sense?)
   - System flags inconsistencies with severity (High/Medium/Low)
   - System displays: "Supplier D: Capacity insufficient for annual volume 🔴 HIGH"

5. **LLM-Based Semantic Checks (NEW)**
   - System uses LLM to perform semantic validation:
     - **Material Consistency:** "Is this material consistent with this density?" (e.g., Aluminum 6061 should be ~2.7 g/cm³)
     - **Price Deviation Analysis:** "Is this price deviation suspicious given the material and process?" (contextual analysis beyond simple outlier detection)
     - **Process Feasibility:** "Is this cycle time realistic for this operation?" (e.g., injection molding cycle time should be 30-120 seconds)
     - **Tooling Reasonableness:** "Is this tooling cost reasonable for this part complexity?" (e.g., simple bracket vs complex housing)
   - LLM assigns severity (High/Medium/Low) with explanation
   - System displays: "Supplier C: Material density inconsistent with Aluminum 6061 ⚠️ MEDIUM - LLM Check"

6. **Conversion Error Detection (Rule-Based)**
   - System flags if conversion seems wrong (e.g., 1m = 1,000,000cm should be 100cm)
   - System validates order of magnitude after conversion
   - System flags for manual review if suspicious (High severity)

7. **Target Price Comparison & Rejection Logic (NEW - Mebarek Feedback)**
   - System compares supplier price to target price (from BOM or buyer input)
   - Rejection/Warning logic:
     - **REJECTED (Red 🔴)**: Supplier price > Target + 10%
     - **WARNING (Yellow ⚠️)**: Supplier price > Target + 5%
     - **ACCEPTABLE (Green ✓)**: Supplier price ≤ Target
   - System displays rejection reason: "Supplier D: Price 15% above target - REJECTED 🔴"
   - System calculates variance: "Supplier D: €11,500 vs €10,000 target (+15%)"
   - Rejected quotes are excluded from comparison board by default
   - Buyer can override rejection (with justification): "Override rejection for Supplier D: Unique capability"
   - Buyer can view rejected quotes separately: "View Rejected Quotes (2)"

8. **Severity Levels & Human-in-the-Loop**
   - **High Severity (Red 🔴):** Blocks RFQ processing until resolved by human
     - Examples: Cost 10x above index, capacity insufficient, material density inconsistent
     - Action: Buyer must review and either correct data or confirm anomaly before proceeding
   - **Medium Severity (Yellow ⚠️):** Flags for review but doesn't block processing
     - Examples: Cost 20% above average, scrap ratio 30-50%, price deviation suspicious
     - Action: Buyer reviews but can proceed without correction
   - **Low Severity (Green ✓):** Informational only, no action required
     - Examples: Minor deviations, optional fields missing
     - Action: Displayed in anomaly report for reference

8. **Visual Indicators**
   - System uses color-coding in comparison board: Red (High), Yellow (Medium), Green (Low)
   - System displays severity level with each anomaly: "🔴 HIGH", "⚠️ MEDIUM", "✓ LOW"
   - System groups anomalies by severity in anomaly report (High first, then Medium, then Low)

**Priority:** P0 (Must Have) for rule-based checks and severity levels, P1 (Should Have) for LLM-based semantic checks

**Dependencies:**
- REQ-MVP-06 (Data Normalization) - for normalized data
- Price index knowledge base (System Admin responsibility)
- LLM API for semantic checks

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-07** (Market Index Integration & Cost Validation) - MVP uses static indices
- **New in MVP:** Hybrid approach (rule-based + LLM-based), severity levels, human-in-the-loop
- **Excluded from MVP:** Real-time market indices, ML-based anomaly detection, historical trend analysis

**Acceptance Testing:**
- Test with 8 sample quotes; verify outlier detection (>20% above average) with High severity
- Test with quotes having costs 10x higher/lower than indices; verify High severity flagging
- Test with quotes having scrap ratio >30%; verify Medium severity flagging
- Test with quotes having inconsistent data; verify High severity flagging
- Test LLM semantic checks (material consistency, price deviation, process feasibility); verify severity assignment
- Test human-in-the-loop: High severity blocks processing, Medium severity allows proceeding
- Verify all anomalies displayed with clear explanations and severity levels
- Verify color-coding and visual indicators in comparison board

---

#### REQ-MVP-08: Incremental Comparison Board

**Description:**
The system shall generate Excel comparison boards incrementally as each supplier responds, with summary comparison, detailed breakdown, anomaly explanations, and raw data.

**Acceptance Criteria:**

1. **Incremental Processing**
   - System processes each supplier response immediately (not batch)
   - System adds normalized supplier to comparison board
   - System sends updated Excel after each supplier is added:
     - Day 1: Excel v1 (1 supplier)
     - Day 2: Excel v2 (3 suppliers)
     - Day 3: Excel v3 (4 suppliers)
   - System sends email notification with Excel attachment
   - Buyer can decide when to stop collecting quotes (no fixed deadline)

2. **Sheet 1: Summary Comparison (ENHANCED - Mebarek Feedback)**
   - Table with columns:
     - Supplier name
     - Material cost
     - Process cost
     - Tooling cost
     - **Best Tooling Cost indicator (NEW)**: Highlights supplier with lowest tooling cost
     - Total cost
     - Anomaly flags (✓ ⚠️ 🔴)
     - **ESG Score (NEW)**: ECOVADIS score or Internal Assessment
     - **Supplier Comments (NEW)**: Brief comments from supplier
     - Notes (brief explanation of flags)
   - Sorted by total cost (lowest to highest)
   - Conditional formatting (green/yellow/red)
   - Charts: cost comparison bar chart, cost breakdown pie chart
   - **Bottom Summary Box (NEW)**:
     - Best Material Cost: Supplier A (€5.20/kg)
     - Best Process Cost: Supplier C (€3.80/piece)
     - **Best Tooling Cost: Supplier B (€45,000) - SAVINGS: €15,000 (25% below target)**
     - Best Total Cost: Supplier A (€9,500)
     - **Tooling Cost Saved: €15,000 (25% below €60,000 target)**

3. **Sheet 2: Detailed Breakdown**
   - One row per supplier per cost category
   - All extracted fields visible:
     - Material: raw material type, cost/kg, gross/net weight, scrap value
     - Process: operations, cycle time, labor cost, overhead
     - Tooling: investment, amortization, shots, maintenance
     - Logistics: packaging, transportation, IncoTerms
     - Terms: payment terms, currency, lead time
   - Pivot table ready (buyer can analyze by category, supplier, etc.)

4. **Sheet 3: Anomalies**
   - List of all anomalies detected:
     - Supplier name
     - Anomaly type (material cost outlier, missing field, high scrap, etc.)
     - Severity (red/yellow/green)
     - Description (clear explanation)
     - Recommendation (what to do about it)
   - Grouped by supplier
   - Sorted by severity (red first, then yellow)

5. **Sheet 4: Raw Data**
   - All extracted data with confidence scores
   - Links to original files (Excel, PDF, CSV)

6. **Sheet 5: Email Thread**
   - Full email thread per supplier
   - Timestamps, attachments, follow-ups

**Priority:** P0 (Must Have) for Sheets 1-3, P1 (Should Have) for Sheets 4-5

**Dependencies:**
- REQ-MVP-06 (Data Normalization) - for normalized data
- REQ-MVP-07 (Anomaly Detection) - for anomaly flags

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-06** (Cost Normalization & Comparison) - MVP uses Excel instead of web UI
- **Excluded from MVP:** Web-based comparison board, interactive filtering, drill-down UI

**Acceptance Testing:**
- Test with 6 suppliers responding over 3 days; verify incremental Excel updates
- Verify Sheet 1 (Summary) has all required columns and formatting
- Verify Sheet 2 (Detailed) has all extracted fields
- Verify Sheet 3 (Anomalies) lists all detected anomalies
- Verify Excel is in standard format (no macros, no protection)
- Measure Excel generation time; verify <30 seconds per update

---

#### REQ-MVP-08A: Supplier Rejection Notifications

**Description:**
The system shall automatically generate professional rejection emails with specific, constructive feedback for non-selected suppliers to maintain positive relationships and enable continuous improvement.

**Acceptance Criteria:**

1. **Automated Rejection Email Generation**
   - After sourcing decision, system prompts buyer to notify non-selected suppliers
   - System generates rejection email for each non-selected supplier with:
     - Professional greeting: "Dear [Supplier Name], Thank you for your participation in RFQ [Project-ID]"
     - Appreciation for participation
     - Specific reason for non-selection based on comparison data:
       - "Your quotation was 18% above target cost"
       - "Material costs were 22% above market index"
       - "Selected supplier offered 12% lower total cost"
       - "Capacity confirmation lacked detail on equipment and shifts"
     - Constructive feedback (data-driven, not generic)
     - Encouragement for future participation: "We value your partnership and encourage you to participate in future opportunities"
     - Professional closing
   - Feedback is specific but protects sensitive information (no competitor names, no exact competitor prices)

2. **Feedback Customization**
   - Buyer can adjust level of detail per supplier:
     - **High**: Detailed cost breakdown, specific gaps, competitive position (e.g., "18% above target")
     - **Medium**: General reasons, cost variance category (e.g., "pricing not competitive")
     - **Low**: Basic reason only (e.g., "selected alternative supplier")
   - Buyer can edit each rejection email before sending
   - System provides default feedback level (Medium)
   - Buyer can set feedback policy per supplier relationship

3. **Batch Review & Send**
   - System shows all rejection emails in review interface
   - Buyer can review all emails before sending
   - Buyer can edit individual emails
   - Buyer can send all rejection emails with one click after review
   - System tracks which suppliers were notified

4. **Delivery Tracking**
   - System sends rejection emails via email
   - System tracks delivery status: sent, delivered
   - System stores rejection emails in project record (audit trail)
   - Buyer can access sent rejection emails for reference

5. **Professional Tone**
   - All rejection emails maintain professional, constructive tone
   - Feedback is specific but respectful
   - Emails encourage future participation
   - Emails thank supplier for time and effort

**Example Rejection Email:**

```
Subject: RFQ RFQ-2024-047 Results - Thank You for Your Participation

Dear Supplier C,

Thank you for your quotation for RFQ-2024-047 (Aluminum Mounting Bracket). 
We appreciate the time and effort you invested in preparing your response.

After careful evaluation of all quotations, we have selected an alternative 
supplier for this project. We wanted to provide you with specific feedback 
to support your continuous improvement:

Feedback:
• Your total cost was 18% above our target cost
• Material costs were 22% above market index (Aluminum 6061-T6: $1.45/kg vs. 
  market average $1.19/kg)
• Process costs were competitive and within expected range
• Tooling costs were well-structured

We value your partnership and encourage you to participate in future RFQ 
opportunities. If you have questions about this feedback, please feel free 
to contact me.

Thank you again for your participation.

Best regards,
Sarah Chen
Project Buyer
Customer Company Inc.
sarah.chen@customer-company.com
```

**Priority:** P1 (Should Have)

**Dependencies:**
- REQ-MVP-08 (Incremental Comparison Board) - for comparison data and decision
- REQ-MVP-07 (Anomaly Detection) - for specific feedback data

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-12A** (Supplier Feedback Management) - MVP includes basic rejection letter generation with specific feedback
- **Excluded from MVP:** Feedback tracking over time, supplier improvement analytics, supplier portal access to feedback history

**Acceptance Testing:**
- Test with 5 sample RFQs with 4 suppliers each; verify rejection emails generated for non-selected suppliers
- Verify feedback is specific and data-driven (not generic)
- Verify feedback level customization (high/medium/low)
- Test batch review and send workflow
- Verify delivery tracking and audit trail
- Verify professional tone and constructive feedback in all emails

---

### 2.4 Optional Features (Nice to Have)

#### REQ-MVP-09: Simple Web Portal (Optional)

**Description:**
The system shall optionally provide a simple web portal (S3 static site) for viewing comparison board and AI chat for Q&A.

**Acceptance Criteria:**

1. **Web Portal**
   - Simple static website (S3 + CloudFront)
   - Display read-only comparison board
   - No authentication required (link-based access)
   - Mobile-friendly (responsive design)

2. **AI Chat Interface**
   - AI chat interface (Gemini or similar) for Q&A
   - Buyer can ask questions like:
     - "Why is Supplier E flagged?"
     - "What's the average material cost?"
     - "Which supplier has the best tooling cost?"
   - AI has full context (all comparison data)
   - AI provides clear, concise answers

**Priority:** P2 (Nice to Have - Optional)

**Dependencies:**
- REQ-MVP-08 (Incremental Comparison Board) - for comparison data

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-06** (Cost Normalization & Comparison) - MVP provides optional web view
- **Excluded from MVP:** Full web application, user authentication, interactive features

---

#### REQ-MVP-10: Supplier Guidance (AI Chat Link)

**Description:**
The system shall optionally provide AI chat link in RFQ emails for suppliers to ask questions about requirements.

**Acceptance Criteria:**

1. **AI Chat Link**
   - Link to AI chat in RFQ email (optional)
   - Supplier can click link and ask questions
   - AI has full RFQ context (requirements, specifications)
   - AI provides clear, helpful answers

2. **Example Questions**
   - "What material grade is required?"
   - "What's the tolerance for cycle time?"
   - "Is tooling cost required separately?"

**Priority:** P2 (Nice to Have - Optional)

**Dependencies:**
- REQ-MVP-01 (Plugin-Based RFQ Initiation) - for RFQ email generation

**Cross-Reference to Main Product:**
- **New in MVP:** Supplier guidance via AI chat (not in Main Product scope)

---

#### REQ-MVP-11: Multi-Part RFQ Support (NEW - Mebarek Feedback)

**Description:**
The system shall support multiple parts in a single RFQ, enabling package quotations with individual part pricing and package discounts, addressing the reality that 60-70% of RFQs involve multiple parts.

**Acceptance Criteria:**

1. **Multi-Part RFQ Creation**
   - Buyer can add multiple parts to single RFQ
   - Each part has: Part Number, Description, Quantity, Unit, Target Price
   - System supports adding parts one-by-one or bulk import from BOM
   - System displays all parts in RFQ summary table
   - System validates each part has required fields

2. **Unit Support (ENHANCED)**
   - System supports comprehensive unit list:
     - Weight: kg, lbs, g, tons, metric tons
     - Volume: liters, gallons, ml, cubic meters
     - Quantity: pieces, dozens, hundreds, thousands
     - Length: mm, cm, m, inches, feet
   - System provides unit converter tool for buyer
   - System validates unit compatibility with part type

3. **Supplier Quotation Options**
   - Supplier can quote in two ways:
     - **Option A: Individual Pricing** - Price per part separately
     - **Option B: Package Pricing** - Individual prices + package discount
   - System extracts both individual and package pricing from supplier quotes
   - System clearly indicates which option supplier chose

4. **Package Discount Calculation**
   - If supplier provides package pricing, system calculates:
     - Total individual price (sum of all parts)
     - Total package price (supplier's package offer)
     - Package discount: (Individual Total - Package Total) / Individual Total × 100%
   - System displays: "Supplier A: Package discount 8% (€12,000 vs €13,043 individual)"

5. **Comparison Board Enhancement**
   - Comparison board shows both individual and package pricing
   - Separate columns for:
     - Part 1 Price, Part 2 Price, ..., Part N Price
     - Individual Total
     - Package Total (if provided)
     - Package Discount %
   - System sorts by package total (if available), otherwise by individual total
   - System highlights best package deal

6. **RFQ Email Format**
   - RFQ email clearly lists all parts with specifications
   - Email instructs suppliers: "You may quote individual prices per part, or provide a package price with discount"
   - Email includes table with all parts for easy reference

**Priority:** P0 (Must Have - Critical)

**Dependencies:**
- REQ-MVP-01 (Three RFQ Creation Methods) - for RFQ creation
- REQ-MVP-04 (Modular LLM Extraction) - for extracting multi-part quotes
- REQ-MVP-06 (Data Normalization) - for normalizing multi-part data
- REQ-MVP-08 (Comparison Board) - for displaying multi-part comparison

**Cross-Reference to Main Product:**
- **New in MVP:** Multi-part RFQ support (not explicitly in Main Product scope)
- **Rationale:** 60-70% of RFQs involve multiple parts; critical for real-world usage

**Acceptance Testing:**
- Create 5 RFQs with 2-10 parts each; verify all parts captured correctly
- Test unit converter with 10 different unit combinations; verify accuracy
- Test with supplier quotes providing individual pricing only; verify extraction
- Test with supplier quotes providing package pricing; verify discount calculation
- Verify comparison board displays both individual and package pricing
- Test sorting by package total vs individual total
- Verify RFQ email format clearly lists all parts

---

#### REQ-MVP-12: Supplier Communication Tracking (NEW - Mebarek Feedback)

**Description:**
The system shall track all communications with suppliers per RFQ, including initial RFQ sent, reminders, responses, and follow-ups, providing complete audit trail and highlighting overdue suppliers.

**Acceptance Criteria:**

1. **Communication Event Tracking**
   - System tracks all communication events per supplier per RFQ:
     - **Initial RFQ Sent**: Timestamp, recipient email
     - **Reminder Emails Sent**: Count, timestamps
     - **Supplier Responses Received**: Count, timestamps, attachment count
     - **Follow-up Requests Sent**: Count, timestamps, reason (missing data, clarification)
     - **Rejection/Acceptance Notifications Sent**: Timestamp
   - System stores full email thread for each supplier
   - System associates all events with Project ID and Supplier ID

2. **Communication Dashboard**
   - System displays communication status per supplier in dashboard:
     - Supplier Name
     - Status: Pending / Responded / Overdue / Complete / Rejected
     - RFQ Sent: Date/time
     - Reminders Sent: Count
     - Responses Received: Count
     - Last Activity: Date/time
     - Days Since RFQ: Auto-calculated
   - Visual indicators:
     - 🟢 Green: Responded (quote received)
     - 🟡 Yellow: Pending (no response, <3 days)
     - 🔴 Red: Overdue (no response, >3 days)
     - ✅ Complete: Quote processed successfully
     - ❌ Rejected: Quote rejected (incomplete/non-competitive)

3. **Automated Reminder System**
   - System automatically sends reminder emails based on configurable schedule:
     - Reminder 1: 3 days after initial RFQ (default)
     - Reminder 2: 5 days after initial RFQ (default)
     - Reminder 3: 7 days after initial RFQ (default)
   - Buyer can configure reminder schedule per RFQ
   - Buyer can disable auto-reminders and send manual reminders
   - Reminder email includes:
     - Reference to original RFQ
     - Deadline reminder
     - Contact information for questions
     - Professional, polite tone

4. **Overdue Supplier Highlighting**
   - System highlights suppliers with no response after 3 days (configurable)
   - Dashboard shows: "Supplier B: OVERDUE - 5 days since RFQ, 2 reminders sent, 0 responses"
   - System sends notification to buyer: "3 suppliers overdue for RFQ-2025-001"
   - Buyer can take action: Send manual follow-up, extend deadline, or remove supplier

5. **Communication Log Export**
   - System provides exportable communication log per RFQ:
     - All events in chronological order
     - Supplier name, event type, timestamp, details
     - Full email thread per supplier
   - Export formats: Excel, PDF, CSV
   - Log serves as audit trail for compliance

6. **Response Rate Analytics**
   - System calculates response rate per RFQ:
     - Total suppliers contacted
     - Suppliers responded
     - Response rate %
     - Average response time (days)
   - System displays: "Response Rate: 6/8 suppliers (75%), Avg Response Time: 2.3 days"

**Priority:** P0 (Must Have - Critical for audit trail)

**Dependencies:**
- REQ-MVP-01A (Email Communication) - for email tracking
- REQ-MVP-02 (Email Quote Intake) - for response detection

**Cross-Reference to Main Product:**
- **New in MVP:** Comprehensive communication tracking (not in Main Product scope)
- **Rationale:** Essential for audit trail and supplier management

**Acceptance Testing:**
- Create 3 RFQs with 5 suppliers each; verify all communication events tracked
- Test automated reminder system; verify reminders sent at correct intervals
- Verify overdue supplier highlighting after 3 days
- Test communication dashboard; verify status indicators correct
- Export communication log; verify all events included
- Verify response rate analytics calculated correctly

---

#### REQ-MVP-13: Lead Time Milestone Tracking (NEW - Mebarek Feedback)

**Description:**
The system shall track detailed lead time milestones (Sample A/B/C/D, Prototype, Off-tool parts, PPAP, SOP) for each supplier, comparing supplier-provided lead times against buyer's target lead times to identify schedule risks.

**Acceptance Criteria:**

1. **Lead Time Milestone Definition**
   - System supports 7 standard lead time milestones:
     - **Sample A**: First sample for initial review
     - **Sample B/C/D**: Subsequent samples for iterative refinement
     - **Prototype**: Prototype tooling/parts
     - **Off-tool Parts**: First parts from production tooling
     - **Off-tool or Process**: Process validation parts
     - **PPAP**: Production Part Approval Process
     - **SOP**: Start of Production
   - Buyer can customize milestone names per RFQ (optional)
   - System stores target lead time (in weeks) per milestone

2. **Target Lead Time Configuration**
   - During RFQ creation, buyer specifies target lead time for each milestone:
     - Sample A: 4 weeks (example)
     - Sample B/C/D: 6 weeks
     - Prototype: 8 weeks
     - Off-tool Parts: 10 weeks
     - Off-tool or Process: 12 weeks
     - PPAP: 14 weeks
     - SOP: 16 weeks
   - System includes target lead times in RFQ email to suppliers
   - Buyer can mark milestones as "Not Applicable" if not needed

3. **Supplier Lead Time Extraction**
   - System extracts supplier-provided lead times for each milestone from quote
   - System uses LLM to identify lead time data in various formats:
     - Table format: "Sample A: 5 weeks, Sample B: 7 weeks..."
     - Narrative format: "We can deliver Sample A in 5 weeks from PO"
     - Gantt chart or timeline (OCR + LLM extraction)
   - System flags if supplier doesn't provide lead time for required milestone

4. **Lead Time Comparison**
   - System compares supplier lead time vs target lead time per milestone:
     - **On Time**: Supplier ≤ Target (🟢 Green)
     - **At Risk**: Supplier > Target by 1-2 weeks (🟡 Yellow)
     - **Delayed**: Supplier > Target by >2 weeks (🔴 Red)
   - System calculates variance: "Supplier A: Sample A +1 week vs target (5 weeks vs 4 weeks target)"
   - System highlights critical path delays (SOP milestone)

5. **Comparison Board Enhancement**
   - Comparison board includes lead time comparison table:
     - Rows: Milestones (Sample A, B/C/D, Prototype, Off-tool, PPAP, SOP)
     - Columns: Target, Supplier A, Supplier B, ..., Best Lead Time
     - Color coding: Green (on time), Yellow (at risk), Red (delayed)
   - System identifies supplier with best lead time per milestone
   - System displays: "Best Overall Lead Time: Supplier C (all milestones on/ahead of target)"

6. **Schedule Risk Flagging**
   - System flags schedule risks:
     - "Supplier B: SOP delayed by 3 weeks - Project timeline at risk 🔴"
     - "Supplier D: PPAP delayed by 1 week - Monitor closely ⚠️"
   - System prioritizes SOP milestone (most critical for production start)
   - Buyer can weight lead time in supplier selection decision

**Priority:** P0 (Must Have - Critical for automotive/manufacturing)

**Dependencies:**
- REQ-MVP-01 (RFQ Creation) - for target lead time configuration
- REQ-MVP-04 (LLM Extraction) - for extracting supplier lead times
- REQ-MVP-08 (Comparison Board) - for lead time comparison display

**Cross-Reference to Main Product:**
- **New in MVP:** Detailed lead time milestone tracking (not in Main Product scope)
- **Rationale:** Critical for automotive/manufacturing projects with strict timelines

**Acceptance Testing:**
- Create 5 RFQs with different milestone configurations; verify target lead times captured
- Test LLM extraction with 10 supplier quotes in various formats; verify 90%+ accuracy
- Verify lead time comparison calculations (on time, at risk, delayed)
- Test comparison board lead time table; verify color coding correct
- Verify schedule risk flagging for delayed milestones
- Test with "Not Applicable" milestones; verify system handles correctly

---

#### REQ-MVP-14: Negotiation Round Tracking (NEW - Mebarek Feedback)

**Description:**
The system shall track multiple negotiation rounds per supplier, capturing quote updates over time and calculating price improvements, enabling buyers to see negotiation progress and identify best final offers.

**Acceptance Criteria:**

1. **Round Detection & Versioning**
   - System detects new negotiation round when supplier sends updated quote:
     - Same Project ID + Same Supplier = New Round
     - System auto-increments round number: Round 1, Round 2, Round 3...
   - System timestamps each round
   - System stores all rounds (no overwriting previous rounds)
   - System marks latest round as "Current"

2. **Round Comparison**
   - System calculates price change per round:
     - Round 2 vs Round 1: Absolute change (€), Percentage change (%)
     - Round 3 vs Round 2: Absolute change (€), Percentage change (%)
     - Round 3 vs Round 1: Total improvement (€), Total improvement (%)
   - System tracks changes per cost category:
     - Material cost change
     - Process cost change
     - Tooling cost change
     - Total cost change
   - System displays: "Supplier A: Round 2: -5% vs Round 1 (€9,500 vs €10,000)"

3. **Negotiation Progress Dashboard**
   - Dashboard shows negotiation rounds per supplier:
     - Supplier Name
     - Current Round
     - Round 1 Price, Round 2 Price, Round 3 Price
     - Total Improvement (Round 3 vs Round 1)
     - Best Round (lowest price)
   - Visual indicators:
     - 🟢 Green arrow: Price decreased
     - 🔴 Red arrow: Price increased
     - ➡️ Gray arrow: No change
   - System highlights best improvement: "Supplier C: 12% reduction from Round 1 to Round 3"

4. **Round-by-Round Comparison View**
   - Buyer can view side-by-side comparison of all rounds for a supplier:
     - Dropdown: "View Rounds: Round 1 | Round 2 | Round 3 | All Rounds"
     - Table shows all cost categories across rounds
     - Highlights changes between rounds (color-coded)
   - Buyer can compare specific rounds: "Compare Round 1 vs Round 3"

5. **Best Round Identification**
   - System identifies best round (lowest total cost) per supplier
   - System displays: "Best Round: Round 3 (€9,000) - Use this for comparison"
   - Comparison board uses best round by default
   - Buyer can override and select different round if needed

6. **Negotiation History Export**
   - System exports negotiation history per supplier:
     - All rounds with timestamps
     - Price changes per round
     - Cost breakdown per round
   - Export formats: Excel, PDF
   - Serves as negotiation audit trail

**Priority:** P0 (Must Have - Critical for negotiation)

**Dependencies:**
- REQ-MVP-02 (Email Quote Intake) - for detecting updated quotes
- REQ-MVP-04 (LLM Extraction) - for extracting updated quote data
- REQ-MVP-08 (Comparison Board) - for displaying round comparison

**Cross-Reference to Main Product:**
- **New in MVP:** Negotiation round tracking (not in Main Product scope)
- **Rationale:** Essential for tracking negotiation progress and price improvements

**Acceptance Testing:**
- Test with 3 suppliers sending 3 rounds each; verify all rounds captured
- Verify round detection (same Project ID + Supplier = new round)
- Test price change calculations; verify accuracy
- Verify negotiation progress dashboard displays correct data
- Test round-by-round comparison view; verify side-by-side display
- Verify best round identification; verify comparison board uses best round
- Export negotiation history; verify all rounds included

---

#### REQ-MVP-15: ESG/Sustainability Scoring (NEW - Mebarek Feedback)

**Description:**
The system shall capture and display ESG (Environmental, Social, Governance) and sustainability scores per supplier, including ECOVADIS scores and internal assessments, enabling buyers to factor sustainability into sourcing decisions.

**Acceptance Criteria:**

1. **ESG Data Capture**
   - System captures ESG data per supplier:
     - **ECOVADIS Score**: 0-100 scale (industry standard)
     - **Internal Assessment Score**: 0-100 scale (company-specific)
     - **Certifications**: ISO 14001, ISO 45001, ISO 50001, etc.
     - **Other**: Carbon footprint, renewable energy %, waste reduction %
   - Data sources:
     - Manual entry by buyer (MVP)
     - Supplier self-reporting (optional)
     - Future: API integration with ECOVADIS, CDP, etc.

2. **ESG Score Display**
   - Comparison board includes ESG section:
     - Supplier Name
     - ECOVADIS Score
     - Internal Assessment Score
     - Certifications (list)
     - ESG Status: High (>70), Medium (50-70), Low (<50)
   - Visual indicators:
     - 🟢 Green: High ESG (>70)
     - 🟡 Yellow: Medium ESG (50-70)
     - 🔴 Red: Low ESG (<50)
     - ❓ Gray: No ESG data available

3. **ESG Flagging**
   - System flags suppliers with low ESG scores:
     - "Supplier D: Low ECOVADIS score (42) - ESG risk ⚠️"
     - "Supplier E: No ESG data available - Request assessment ❓"
   - Buyer can set minimum ESG threshold per RFQ
   - System excludes suppliers below threshold (optional)

4. **ESG-Weighted Ranking**
   - System provides ESG-weighted supplier ranking options:
     - **Option 1: Price Only** (default) - Sort by total cost
     - **Option 2: Price + ESG (70/30)** - 70% price, 30% ESG score
     - **Option 3: Price + ESG (50/50)** - 50% price, 50% ESG score
     - **Option 4: Custom Weighting** - Buyer defines weights
   - System calculates composite score: (Price Score × Weight) + (ESG Score × Weight)
   - System displays: "ESG-Weighted Ranking (70/30): 1. Supplier A, 2. Supplier C, 3. Supplier B"

5. **ESG Comparison**
   - System compares ESG scores across suppliers:
     - Best ECOVADIS Score: Supplier A (85)
     - Average ECOVADIS Score: 67
     - Suppliers above average: 4/6
   - System highlights ESG leaders: "Supplier A: ESG Leader (ECOVADIS 85, ISO 14001 certified)"

6. **ESG Reporting**
   - System exports ESG data per RFQ:
     - All suppliers with ESG scores
     - ESG-weighted ranking
     - ESG compliance summary
   - Export formats: Excel, PDF
   - Supports sustainability reporting requirements

**Priority:** P0 (Must Have - Critical for compliance)

**Dependencies:**
- REQ-MVP-08 (Comparison Board) - for displaying ESG data
- Supplier database (for storing ESG scores)

**Cross-Reference to Main Product:**
- **New in MVP:** ESG/Sustainability scoring (not in Main Product scope)
- **Rationale:** Increasingly critical for corporate sustainability goals and compliance

**Acceptance Testing:**
- Manually enter ESG data for 6 suppliers; verify data captured correctly
- Verify ESG score display in comparison board
- Test ESG flagging for low scores (<50); verify warnings displayed
- Test ESG-weighted ranking with different weight options; verify calculations
- Verify ESG comparison identifies best/average scores
- Export ESG report; verify all data included

---

#### REQ-MVP-16: Sign-off Governance Workflow (NEW - Mebarek Feedback)

**Description:**
The system shall enforce multi-level approval workflow based on RFQ total value, requiring sign-offs from appropriate stakeholders (Buyer, Commodity Buyer, Purchasing Manager, Director, VP, VPGM) before final decision, with complete audit trail for compliance.

**Acceptance Criteria:**

1. **Approval Level Configuration**
   - System determines required approvers based on total RFQ value:
     - **<€50K**: Buyer only (no additional approvals)
     - **€50K-€100K**: Buyer + Commodity Buyer
     - **€100K-€250K**: Buyer + Commodity Buyer + Purchasing Manager
     - **€250K-€500K**: + Purchasing Director
     - **€500K-€1M**: + VP Purchasing
     - **>€1M**: + VPGM (VP General Manager)
   - Thresholds are configurable per customer
   - System calculates total RFQ value: (Selected Supplier Total Cost) × (Annual Volume) × (Contract Years)

2. **Additional Approver Assignment**
   - Buyer can add additional approvers beyond required levels:
     - Project Manager (PM)
     - Project Management Director (PMD)
     - Sales
     - Plant Manager
     - Quality Manager
     - Engineering Lead
   - Buyer specifies reason for additional approver
   - System sends approval request to all required + additional approvers

3. **Approval Request Workflow**
   - After buyer selects winning supplier, system:
     - Calculates total RFQ value
     - Determines required approvers based on value
     - Generates approval request email for each approver
     - Sends approval requests simultaneously (parallel approval)
   - Approval request email includes:
     - RFQ summary (Project ID, Project Name, Customer, Parts)
     - Selected supplier and justification
     - Total cost breakdown (material, process, tooling, logistics)
     - Comparison with other suppliers (why this supplier was selected)
     - Anomaly flags and risk assessment
     - ESG scores (if applicable)
     - Approval link (web form or email reply)

4. **Approval Actions**
   - Each approver can take one of three actions:
     - **Approve**: Sign off on decision (with optional comments)
     - **Reject**: Reject decision with mandatory reason
     - **Request Changes**: Request modifications with specific feedback
   - System tracks approval status per approver:
     - Pending: Awaiting response
     - Approved: Signed off
     - Rejected: Rejected with reason
     - Changes Requested: Feedback provided
   - System sends reminder emails if no response after 2 days (configurable)

5. **Approval Dashboard**
   - System displays approval status in dashboard:
     - RFQ ID, Project Name, Total Value
     - Required Approvers (list with status)
     - Approval Progress: "3/5 approved, 2 pending"
     - Visual indicators:
       - ✅ Green: Approved
       - ⏳ Yellow: Pending
       - ❌ Red: Rejected
       - 🔄 Blue: Changes Requested
   - Buyer can view approval chain and status in real-time
   - System highlights blockers: "Approval blocked: Purchasing Director rejected"

6. **Final Decision Gating**
   - System prevents final decision until all approvals received:
     - "Final Decision" button disabled until all approvers sign off
     - System displays: "Awaiting approvals: Purchasing Manager, VP Purchasing"
   - If any approver rejects, buyer must:
     - Address rejection reason
     - Resubmit for approval (new round)
     - Or select different supplier
   - Once all approvals received, buyer can finalize decision

7. **Audit Trail**
   - System stores complete audit trail:
     - Who approved, when, IP address, device
     - Approval comments
     - Rejection reasons
     - Changes requested
     - Email thread
   - Audit trail is immutable (cannot be edited or deleted)
   - Export formats: Excel, PDF
   - Serves as compliance record for internal/external audits

8. **Notification System**
   - System sends notifications at key milestones:
     - Approval request sent: "Your approval is required for RFQ-2025-001"
     - Approval received: "Purchasing Manager approved RFQ-2025-001"
     - Rejection received: "Purchasing Director rejected RFQ-2025-001 - Review required"
     - All approvals complete: "All approvals received - Ready for final decision"
   - Notifications via email (MVP)
   - Future: In-app notifications, SMS

**Priority:** P0 (Must Have - Critical for compliance)

**Dependencies:**
- REQ-MVP-08 (Comparison Board) - for sourcing decision data
- User management system (for approver roles and permissions)
- Email system (for approval requests and notifications)

**Cross-Reference to Main Product:**
- **New in MVP:** Sign-off governance workflow (not in Main Product scope)
- **Rationale:** Essential for risk mitigation and audit compliance

**Acceptance Testing:**
- Create 6 RFQs with values spanning all approval levels; verify correct approvers determined
- Test approval request workflow; verify emails sent to all required approvers
- Test approval actions (approve, reject, request changes); verify status updates
- Verify approval dashboard displays correct status
- Test final decision gating; verify button disabled until all approvals received
- Test rejection handling; verify buyer must address before proceeding
- Export audit trail; verify all approval events included
- Test reminder emails; verify sent after 2 days if no response

---

### 2.5 MVP Requirements Summary

The following table summarizes all MVP functional requirements with priorities and cross-references to Main Product:

| Requirement ID | Requirement Name | Priority | Main Product Reference | MVP Status |
|----------------|------------------|----------|------------------------|------------|
| REQ-MVP-00A | BOM Upload & Project Initialization (ENHANCED) | P0 | Related to REQ-RFQ-01 | Enhanced (added Project/Platform/Customer/Location) |
| REQ-MVP-00B | "The Split" - Existing vs New Parts | P0 | Related to REQ-RFQ-02 | New (automatic classification) |
| REQ-MVP-00C | Master Field List Configuration | P0 | N/A | **Killer Feature** (flexibility) |
| REQ-MVP-00D | Project/RFQ Field Selection | P0 | N/A | **Killer Feature** (per-project flexibility) |
| REQ-MVP-00E | Adaptive UI Generation | P0 | N/A | **Killer Feature** (LLM-powered UI) |
| REQ-MVP-01 | Three RFQ Creation Methods | P0 | Related to REQ-RFQ-01 | New (from scratch, clone, upload) |
| REQ-MVP-01A | Email Communication via mailto: Links | P0 | Related to REQ-RFQ-04 | New (no plugin, no internal email client) |
| REQ-MVP-02 | Email Quote Intake & Monitoring | P0 | Related to REQ-RFQ-04 | Subset (email only) |
| REQ-MVP-03 | File Format Conversion | P0 (Excel/PDF/CSV), P1 (PPT/Images) | Related to REQ-RFQ-05 | New (multi-format + OCR) |
| REQ-MVP-04 | Modular LLM Extraction | P0 | Related to REQ-RFQ-05 | New approach (LLM vs. template) |
| REQ-MVP-05 | Completeness Check & Immediate Quality Control | P0 | Related to REQ-RFQ-05 | New (automated rejection messages) |
| REQ-MVP-06 | Data Normalization (ENHANCED) | P0 | Related to REQ-RFQ-06 | Enhanced (added liters, unit converter) |
| REQ-MVP-07 | Hybrid Anomaly Detection | P0 (rule-based), P1 (LLM-based) | Related to REQ-RFQ-07 | New (hybrid approach + severity levels) |
| REQ-MVP-08 | Incremental Comparison Board | P0 (Sheets 1-3), P1 (Sheets 4-5) | Related to REQ-RFQ-06 | New approach (Excel vs. web) |
| REQ-MVP-08A | Supplier Rejection Notifications | P1 | Related to REQ-RFQ-12A | Subset (basic feedback) |
| REQ-MVP-09 | Simple Web Portal | P2 | Related to REQ-RFQ-06 | Optional |
| REQ-MVP-10 | Supplier Guidance | P2 | N/A | New (optional) |
| **REQ-MVP-11** | **Multi-Part RFQ Support** | **P0** | **N/A** | **NEW - Mebarek Feedback** |
| **REQ-MVP-12** | **Supplier Communication Tracking** | **P0** | **N/A** | **NEW - Mebarek Feedback** |
| **REQ-MVP-13** | **Lead Time Milestone Tracking** | **P0** | **N/A** | **NEW - Mebarek Feedback** |
| **REQ-MVP-14** | **Negotiation Round Tracking** | **P0** | **N/A** | **NEW - Mebarek Feedback** |
| **REQ-MVP-15** | **ESG/Sustainability Scoring** | **P0** | **N/A** | **NEW - Mebarek Feedback** |
| **REQ-MVP-16** | **Sign-off Governance Workflow** | **P0** | **N/A** | **NEW - Mebarek Feedback** |

**Killer Features (Core Differentiators):**
- **REQ-MVP-00C, 00D, 00E:** Dynamic Field Management + Adaptive UI Orchestration - enables extreme flexibility without schema migrations
- **REQ-MVP-01:** Three RFQ Creation Methods - 60-70% time savings with clone existing
- **REQ-MVP-05:** Immediate Quality Control - automated rejection for incomplete submissions
- **REQ-MVP-07:** Hybrid Anomaly Detection - rule-based + LLM semantic checks with severity levels
- **REQ-MVP-11:** Multi-Part RFQ Support - addresses reality that 60-70% of RFQs involve multiple parts (NEW)
- **REQ-MVP-12:** Supplier Communication Tracking - complete audit trail for compliance (NEW)
- **REQ-MVP-13:** Lead Time Milestone Tracking - critical for automotive/manufacturing timelines (NEW)
- **REQ-MVP-14:** Negotiation Round Tracking - tracks price improvements over multiple rounds (NEW)
- **REQ-MVP-15:** ESG/Sustainability Scoring - enables sustainability-driven sourcing decisions (NEW)
- **REQ-MVP-16:** Sign-off Governance Workflow - multi-level approvals for risk mitigation (NEW)

**Excluded from MVP (Main Product Features):**
- REQ-RFQ-01: Advanced BOM Analysis (automatic part classification, engineering collaboration) - MVP uses manual classification
- REQ-RFQ-02: Existing Parts Intelligence & Re-Evaluation (renegotiation opportunities, automated outreach) - MVP uses manual ERP upload
- REQ-RFQ-03: Supplier Selection & Bid List Management (bid list access, commodity buyer collaboration) - MVP uses manual supplier selection
- REQ-RFQ-08: AI-Powered Sourcing Recommendations (multi-criteria scoring, recommendation engine) - MVP uses simple ranking
- REQ-RFQ-09: Portfolio Analytics & Reporting (supplier spend aggregation, concentration risk, cost trends) - MVP focuses on individual RFQs
- REQ-RFQ-12A: Advanced Supplier Feedback Management (feedback tracking over time, supplier improvement analytics, supplier portal) - MVP uses basic rejection emails
- REQ-RFQ-10: Supplier Risk & Compliance (risk assessment, performance tracking, compliance monitoring) - Not in MVP scope

---

## 3. Technical Architecture & AI Integration

### 3.1 System Architecture Overview

**MVP Architecture Principles:**
- **Extreme Flexibility (Killer Feature):** DynamoDB graph model + Adaptive UI Orchestration enable dynamic field management without schema migrations
- **Email-centric:** All interactions via email using `mailto:` links (no internal email client, no plugin required)
- **Alma-based:** Alma serves as core backend platform/rules engine
- **LLM-driven:** Modular LLM extraction for 90-95% accuracy + Adaptive UI generation + Semantic validation
- **Incremental:** Event-driven processing (process each supplier as they respond)
- **Graph-based data model:** Project → BOM → RFQ → Quote relationships in DynamoDB

**High-Level Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│  BUYER INTERFACE                                                 │
│  • Web Application (Adaptive UI - dynamically generated)         │
│  • Email Client (via mailto: links - Outlook)                    │
│  • Excel (Receive Comparison Boards)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ADAPTIVE UI ORCHESTRATION LAYER (Core Innovation)               │
│  • LLM-based UI Generation (self-describing UI payloads)         │
│  • Dynamic Form Rendering (no hardcoded templates)               │
│  • Field Configuration Management (Master List + Project subset) │
│  • UI Payload Caching (consistency across sessions)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  EMAIL LAYER                                                     │
│  • mailto: Links (opens buyer's default mail app)                │
│  • rfq-agent@[customer].optiroq.com (Dedicated Inbox)            │
│  • IMAP Monitoring (Poll every 5 minutes)                        │
│  • SMTP Sending (Notifications, Follow-ups, Rejections)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ALMA BACKEND PLATFORM (Core Platform/Rules Engine)              │
│  • Business Logic & Workflow Orchestration                       │
│  • Rules Engine (validation, anomaly detection rules)            │
│  • Integration Layer (DynamoDB, LLM APIs, Email)                 │
│  • Event Processing (supplier response triggers)                 │
└─────────────────────────────────────────────────────────────────┐
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PROCESSING LAYER                                                │
│  • Email Parser (Extract attachments, Project ID)                │
│  • File Converter (Excel/PDF/CSV/PPT/Images → JSON)              │
│  • OCR Engine (Tesseract + LLM for images/scans)                 │
│  • LLM Extractor (Modular block-by-block extraction)             │
│  • Validator (Completeness check, hidden cost detection)         │
│  • Normalizer (Currency, units, cost categories)                 │
│  • Hybrid Anomaly Detector (Rule-based + LLM semantic checks)    │
│  • Excel Generator (Incremental comparison boards)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  DATA LAYER (DynamoDB - Graph Model)                             │
│  • Graph Structure: Project → BOM → RFQ → Quote                  │
│  • Dynamic Entity Graph (no schema migrations)                   │
│  • Master Field List (organization-wide field definitions)       │
│  • Project Field Configurations (per-RFQ field selections)       │
│  • S3: File storage (attachments, Excel boards)                  │
│  • Knowledge Base: JSON files (mandatory fields, price indices)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI/ML LAYER                                                     │
│  • LLM API: OpenAI GPT-4, Anthropic Claude, or Google Gemini    │
│    - Adaptive UI Generation                                      │
│    - Modular Data Extraction                                     │
│    - Semantic Anomaly Detection                                  │
│    - OCR Enhancement (Tesseract + LLM)                           │
│  • Exchange Rate API: ECB, Federal Reserve, or commercial        │
│  • OCR: Tesseract (open-source) or AWS Textract                  │
└─────────────────────────────────────────────────────────────────┘
```

**Core Innovation - Adaptive UI Orchestration:**

"The core innovation is a shift from writing brittle, imperative parsers and hard-coded UI components to orchestrating LLM agents that dynamically interpret any supplier data format. These agents semantically enrich unstructured inputs and produce a self-describing UI payload that tells the frontend exactly what to render. Unlike traditional architectures—where every format change breaks both backend parsers and frontend displays—this approach decouples data structure from the codebase using a Dynamic Entity Graph and AI-driven interpretation. As a result, the system adapts automatically in real time, and the developer's role evolves from coding every detail to orchestrating intelligence."

---

### 3.2 DynamoDB Graph Model (Flexibility Architecture)

**Graph Structure:**

```
Project (PRJ-2025-001)
  │
  ├─ BOM
  │   ├─ Part 1 (Existing)
  │   │   ├─ Current Supplier: Supplier X
  │   │   ├─ Current Price: $10.50
  │   │   └─ Lead Time: 4 weeks
  │   │
  │   ├─ Part 2 (New)
  │   │   ├─ RFQ (RFQ-2025-001)
  │   │   │   ├─ Field Configuration (selected fields from Master List)
  │   │   │   ├─ Supplier A
  │   │   │   │   └─ Quote A
  │   │   │   │       ├─ Material Cost: $5.20/kg
  │   │   │   │       ├─ Process Cost: $3.50
  │   │   │   │       ├─ Tooling Cost: $2,500
  │   │   │   │       └─ Anomalies: [High: Material cost 10x above index]
  │   │   │   │
  │   │   │   ├─ Supplier B
  │   │   │   │   └─ Quote B
  │   │   │   │       ├─ Material Cost: $0.52/kg
  │   │   │   │       ├─ Process Cost: $3.20
  │   │   │   │       ├─ Tooling Cost: $2,200
  │   │   │   │       └─ Anomalies: []
  │   │   │   │
  │   │   │   └─ Comparison Board (Excel)
  │   │   │
  │   │   └─ Target Weight: 0.5 kg
  │   │
  │   └─ Part 3 (New)
  │       └─ RFQ (RFQ-2025-002)
  │
  └─ Project Summary
      ├─ Total Parts: 25
      ├─ Existing Parts: 15 (60%)
      ├─ New Parts: 10 (40%)
      ├─ Existing Parts Cost: $150,000
      └─ New Parts Target Cost: $100,000
```

**Benefits of Graph Model:**
- **Flexibility:** Add new attributes to any entity without schema migration
- **Relationships:** Natural representation of Project → BOM → RFQ → Quote hierarchy
- **Queries:** Efficient traversal of relationships (e.g., "All quotes for Part 2")
- **Scalability:** DynamoDB handles unlimited entities and relationships
- **Consistency:** Master Field List ensures organizational consistency while allowing per-project flexibility

---

### 3.3 Alma Backend Integration

**Alma Platform Role:**
- **Core Platform:** Alma serves as the backend platform/rules engine
- **Business Logic:** Workflow orchestration, validation rules, anomaly detection rules
- **Integration Layer:** Connects DynamoDB, LLM APIs, Email, S3
- **Event Processing:** Handles supplier response events, triggers processing pipeline
- **Custom Logic:** Manufacturing RFQ-specific logic built on top of Alma

**Alma Integration Points:**
- **Data Storage:** Alma uses DynamoDB for flexible data storage
- **Workflow Engine:** Alma orchestrates RFQ creation → Email sending → Quote processing → Comparison
- **Rules Engine:** Alma executes validation rules, anomaly detection rules, completeness checks
- **API Layer:** Alma exposes REST APIs for frontend (Adaptive UI)

**MVP Scope:**
- Alma provides core platform capabilities
- Custom UI and RFQ-specific logic built on top of Alma
- No deep Alma customization required for MVP

---

### 3.4 Adaptive UI Orchestration (Killer Feature Implementation)

**LLM-Based UI Generation Process:**

1. **Input:** Buyer selects fields for RFQ (from Master List)
   ```json
   {
     "selected_fields": [
       {"name": "Material Type", "type": "dropdown", "mandatory": true},
       {"name": "Cost per kg", "type": "currency", "unit": "USD/kg", "mandatory": true},
       {"name": "Coating Thickness", "type": "number", "unit": "mm", "mandatory": false},
       {"name": "Tensile Strength", "type": "number", "unit": "MPa", "mandatory": false}
     ],
     "commodity_type": "metal"
   }
   ```

2. **LLM Prompt:** System sends prompt to LLM
   ```
   Generate a self-describing UI payload for an RFQ form with the following fields:
   - Material Type (dropdown, mandatory)
   - Cost per kg (currency USD/kg, mandatory)
   - Coating Thickness (number mm, optional)
   - Tensile Strength (number MPa, optional)
   
   Commodity type: metal
   
   Output JSON with:
   - Form sections (Material, Process, Tooling, etc.)
   - Field order and grouping
   - Input types and validation rules
   - Help text and placeholders
   ```

3. **LLM Output:** Self-describing UI payload
   ```json
   {
     "form_sections": [
       {
         "section_name": "Material Costs",
         "fields": [
           {
             "field_name": "Material Type",
             "input_type": "dropdown",
             "options": ["Aluminum 6061", "Aluminum 7075", "Steel 1018", "Steel 4140"],
             "mandatory": true,
             "help_text": "Select the material grade for this part",
             "validation": {"required": true}
           },
           {
             "field_name": "Cost per kg",
             "input_type": "currency",
             "unit": "USD/kg",
             "mandatory": true,
             "help_text": "Enter the material cost per kilogram",
             "placeholder": "e.g., 2.50",
             "validation": {"required": true, "min": 0, "max": 1000}
           }
         ]
       },
       {
         "section_name": "Material Properties",
         "fields": [
           {
             "field_name": "Coating Thickness",
             "input_type": "number",
             "unit": "mm",
             "mandatory": false,
             "help_text": "Enter the coating thickness if applicable",
             "placeholder": "e.g., 0.05",
             "validation": {"min": 0, "max": 10}
           },
           {
             "field_name": "Tensile Strength",
             "input_type": "number",
             "unit": "MPa",
             "mandatory": false,
             "help_text": "Enter the tensile strength if applicable",
             "placeholder": "e.g., 310",
             "validation": {"min": 0, "max": 2000}
           }
         ]
       }
     ]
   }
   ```

4. **Caching:** UI payload cached in DynamoDB per RFQ
   - Key: `RFQ-2025-001_ui_payload`
   - Value: JSON UI payload
   - TTL: Until RFQ field configuration changes

5. **Frontend Rendering:** Frontend receives UI payload and renders form dynamically
   - No hardcoded templates
   - Form adapts to any field combination
   - Validation rules applied client-side and server-side

**Benefits:**
- **Zero Hardcoding:** No hardcoded form templates, fully adaptive
- **Instant Adaptation:** Add new fields to Master List, UI adapts automatically
- **Consistency:** Cached UI payload ensures consistent experience
- **Scalability:** Works for any field combination without code changes

---

### 3.5 LLM Integration Strategy

**Modular LLM Extraction:**
1. **Block Identification:** Pattern matching or LLM-based
2. **Per-Block Extraction:** Dedicated LLM call per block with knowledge base
3. **Confidence Scoring:** Based on LLM response + validation checks
4. **Result Combination:** Merge block results into single structured quote

**LLM Selection:**
- **Primary:** Google Gemini 3.0 (most powerful for complex extraction and UI generation)
- **Fallback:** OpenAI GPT-4 or Anthropic Claude
- **Criteria:** Accuracy, cost, latency, token limits

**LLM Use Cases in MVP:**
1. **Adaptive UI Generation:** Generate self-describing UI payloads based on selected fields
2. **Data Extraction:** Extract structured data from heterogeneous supplier documents
3. **Semantic Validation:** Check material consistency, price reasonableness, process feasibility
4. **OCR Enhancement:** Improve Tesseract OCR results for images/scans
5. **Hidden Cost Detection:** Analyze if tooling is embedded in process costs

**Prompt Engineering:**
- Knowledge base per block (field definitions, examples, validation rules)
- Clear instructions for extraction and validation
- Confidence scoring guidelines
- Error handling (missing fields, ambiguous data)

**Cost Optimization:**
- Use smaller models for simple tasks (e.g., terms extraction)
- Use larger models for complex tasks (e.g., UI generation, semantic validation)
- Cache UI payloads (reduce regeneration)
- Batch processing where possible

---

### 3.6 Data Flow

**End-to-End Data Flow:**

1. **BOM Upload:**
   - Buyer uploads BOM file (Excel)
   - System extracts BOM data and stores in DynamoDB graph
   - System performs "The Split": Existing vs New parts
   - System displays project dashboard with split summary

2. **RFQ Creation (3 Methods):**
   - **Method 1 (From Scratch):** Buyer selects fields from Master List → LLM generates UI payload → Buyer fills form
   - **Method 2 (Clone Existing):** Buyer selects existing RFQ → System copies data and field configuration → Buyer modifies
   - **Method 3 (From Upload):** Buyer uploads RFQ document → System extracts data → LLM pre-fills form → Buyer reviews
   - Buyer selects suppliers and clicks "Send RFQ"
   - System generates `mailto:` link with pre-filled email
   - Buyer's mail app opens, buyer sends email (CC: rfq-agent@[customer].com)

3. **Email Intake:**
   - System monitors inbox (IMAP poll every 5 minutes)
   - System detects supplier response (Project ID in headers/subject)
   - System downloads attachments (Excel, PDF, CSV, PPT, images)
   - System stores files in S3
   - System sends notification to buyer

4. **File Conversion:**
   - System converts files to JSON (Excel → JSON, PDF → JSON, CSV → JSON, PPT → JSON, Images → Text via OCR)
   - System logs conversion errors

5. **LLM Extraction:**
   - System identifies data blocks (material, process, tooling, logistics, terms)
   - System extracts each block separately with LLM + knowledge base
   - System assigns confidence scores
   - System combines results into structured quote

6. **Completeness Check & Immediate Quality Control:**
   - System validates mandatory fields (configured per RFQ)
   - System detects hidden costs (embedded tooling)
   - **If incomplete:** System immediately sends "Quote will not be considered" message
   - **If minor issues:** System generates follow-up email for buyer review
   - Buyer reviews and approves follow-up

7. **Normalization:**
   - System converts currency (via exchange rate API)
   - System converts units (kg, lbs, pieces)
   - System maps cost categories
   - System un-embeds hidden costs

8. **Hybrid Anomaly Detection:**
   - **Rule-Based:** System calculates peer average, compares against price indices, checks scrap ratio, validates consistency
   - **LLM-Based:** System performs semantic checks (material consistency, price deviation, process feasibility)
   - System assigns severity levels (High/Medium/Low)
   - **High Severity:** Blocks processing, requires human review
   - **Medium/Low Severity:** Flags for review, allows proceeding

9. **Comparison Board Generation:**
   - System generates Excel with 5 sheets (summary, detailed, anomalies, raw data, email thread)
   - System sends Excel to buyer via email
   - System updates Excel as more suppliers respond (incremental)

10. **BOM-Level Analysis:**
    - System aggregates costs across all RFQs for project
    - System combines with existing parts costs (from manual ERP upload)
    - System displays project-level cost summary with variance from targets

---

### 3.7 Scalability & Performance

**Performance Targets:**
- BOM upload: <30 seconds for 100-part BOM
- RFQ creation (from scratch): <5 minutes
- RFQ creation (clone): <3 minutes
- RFQ creation (upload): <4 minutes
- Email detection: <5 minutes
- File conversion: <60 seconds per file (Excel/PDF/CSV/PPT), <60 seconds per image (OCR)
- LLM extraction: <2 minutes per supplier
- Adaptive UI generation: <5 seconds per RFQ (cached thereafter)
- Normalization: <30 seconds per supplier
- Hybrid anomaly detection: <45 seconds per supplier (rule-based + LLM)
- Excel generation: <30 seconds per update
- **Total processing time: <6 minutes per supplier**

**Scalability:**
- DynamoDB auto-scales based on load (unlimited storage)
- Alma backend handles workflow orchestration
- S3 handles unlimited file storage
- LLM API has rate limits (need to monitor)
- UI payload caching reduces LLM API calls

**Cost Estimates (per RFQ with 6 suppliers):**
- LLM API:
  - Adaptive UI generation: $0.10 per RFQ (one-time, cached)
  - Data extraction: $0.50-1.00 per supplier = $3-6 per RFQ
  - Semantic anomaly detection: $0.20 per supplier = $1.20 per RFQ
  - OCR enhancement: $0.10 per image (if applicable)
- DynamoDB: $0.05 per RFQ
- S3 storage: $0.01 per RFQ
- Exchange rate API: $0.01 per RFQ
- OCR (Tesseract): Free (open-source)
- **Total: ~$4-8 per RFQ**

---

## 4. User Experience & Interface Design

### 4.1 BOM Upload & "The Split" Experience

**BOM Upload Flow:**

```
1. Buyer navigates to Optiroq Portal
   ↓
2. Buyer clicks "New Project" or "Upload BOM"
   ↓
3. BOM Upload Screen:
   ┌─────────────────────────────────────────────────────────┐
   │  Upload Bill of Materials (BOM)                          │
   │                                                          │
   │  Project ID: [PRJ-2025-001] (auto-generated)            │
   │                                                          │
   │  BOM File:                                               │
   │  ┌─────────────────────────────────────────────────┐   │
   │  │  📁 Drag and drop your BOM file here            │   │
   │  │     or click to browse                           │   │
   │  │                                                  │   │
   │  │  Supports Excel files (.xlsx, .xls)             │   │
   │  └─────────────────────────────────────────────────┘   │
   │                                                          │
   │  Required BOM Fields:                                    │
   │  • Part Name - Unique identifier                         │
   │  • Material - Material type (e.g., Aluminum 6061)       │
   │  • Quantity - Annual volume required                     │
   │  • Target Weight - Expected part weight (optional)       │
   │                                                          │
   │  [Upload BOM]  [Cancel]                                 │
   └─────────────────────────────────────────────────────────┘
   ↓
4. System processes BOM (< 30 seconds for 100 parts):
   - Extracts part data
   - Checks against existing contracts
   - Classifies parts as Existing or New
   ↓
5. "The Split" Analysis Screen:
   ┌─────────────────────────────────────────────────────────┐
   │  "The Split" - BOM Analysis                              │
   │  Project: PRJ-2025-001 • BOM: BOM_DoorAssembly_v2.xlsx  │
   │                                                          │
   │  Summary:                                                │
   │  ┌──────────┬──────────┬──────────┬──────────┐         │
   │  │ 25 Total │ 15 Exist │ 10 New   │ €2.1M    │         │
   │  │ Parts    │ (60%)    │ (40%)    │ Value    │         │
   │  └──────────┴──────────┴──────────┴──────────┘         │
   │                                                          │
   │  [All] [Existing (15)] [New (10)]  [Search...]          │
   │                                                          │
   │  ┌─────────────────────────────────────────────────┐   │
   │  │ Status │ Part Name      │ Material  │ Qty      │   │
   │  ├────────┼────────────────┼───────────┼──────────┤   │
   │  │ ✓ Exist│ ALU-BRACKET-001│ Alu 6061  │ 50,000   │   │
   │  │        │ Supplier A • €2.35/pc • 8w lead time  │   │
   │  ├────────┼────────────────┼───────────┼──────────┤   │
   │  │ ⚠️ New │ HOUSING-CTRL-001│ Alu 6061 │ 25,000   │   │
   │  │        │ Requires RFQ                           │   │
   │  └─────────────────────────────────────────────────┘   │
   │                                                          │
   │  [Create RFQs for New Parts →]                          │
   └─────────────────────────────────────────────────────────┘
   ↓
6. Buyer clicks "Create RFQs for New Parts"
   ↓
7. System navigates to RFQ Creation Form (pre-filled with new parts)
```

**Design Principles:**
- **Fast:** BOM processing < 30 seconds for 100 parts
- **Clear:** Visual distinction between Existing (green ✓) and New (orange ⚠️) parts
- **Informative:** Shows current supplier and pricing for existing parts
- **Actionable:** One-click to create RFQs for all new parts

**Key Features:**
- **Automatic Classification:** System checks each part against existing contracts
- **Manual ERP Upload:** For MVP, buyer uploads ERP report with existing part data
- **Cost Visibility:** Shows total project value (existing + target for new parts)
- **Search & Filter:** Buyer can search parts by name/material, filter by status

---

### 4.2 Plugin User Experience

**RFQ Initiation Flow:**

```
1. Buyer clicks "Start RFQ" button in Outlook/Gmail toolbar
   ↓
2. Plugin shows structured form:
   ┌─────────────────────────────────────────────────────────┐
   │  Start New RFQ                                           │
   │                                                          │
   │  Project ID: [RFQ-2024-001] (auto-generated)            │
   │  Part Numbers: [ALU-BRACKET-001, ALU-BRACKET-002]       │
   │  Suppliers:                                              │
   │    • supplier-a@example.com                              │
   │    • supplier-b@example.com                              │
   │    • supplier-c@example.com                              │
   │  Requirements Checklist:                                 │
   │    ☑ Material costs                                      │
   │    ☑ Process costs                                       │
   │    ☑ Tooling costs (explicit)                            │
   │    ☑ Logistics                                           │
   │    ☑ Terms                                               │
   │    ☑ Capacity confirmation                               │
   │  Attachments: [BOM.xlsx, Drawing.pdf]                    │
   │  Deadline: [2024-01-15]                                  │
   │                                                          │
   │  [Generate Email]  [Save Draft]  [Cancel]               │
   └─────────────────────────────────────────────────────────┘
   ↓
3. Plugin generates email:
   ┌─────────────────────────────────────────────────────────┐
   │  To: supplier-a@example.com, supplier-b@example.com     │
   │  CC: rfq-agent@danone.optiroq.com                       │
   │  Subject: RFQ [RFQ-2024-001] - Aluminum Bracket         │
   │                                                          │
   │  Dear Supplier,                                          │
   │                                                          │
   │  We are requesting quotations for the following parts:  │
   │  - Part Number: ALU-BRACKET-001                          │
   │  - Annual Volume: 100,000 pieces                         │
   │  - Material: Aluminum 6061                               │
   │                                                          │
   │  Please provide your quotation including:                │
   │  ✓ Material costs (raw material type, cost/kg, ...)     │
   │  ✓ Process costs (operations, cycle time, ...)          │
   │  ✓ Tooling costs (investment, amortization, ...)        │
   │  ✓ Logistics (packaging, transportation, ...)           │
   │  ✓ Terms (payment terms, currency, ...)                 │
   │  ✓ Capacity confirmation (equipment, shifts, ...)       │
   │                                                          │
   │  Please respond by 2024-01-15.                           │
   │                                                          │
   │  Best regards,                                           │
   │  Sarah Chen                                              │
   └─────────────────────────────────────────────────────────┘
   ↓
4. Buyer reviews and edits email (if needed)
   ↓
5. Buyer clicks "Send"
   ↓
6. Email sent to suppliers (with Project ID in headers)
```

**Design Principles:**
- **Simple:** Form completion time <3 minutes
- **Clear:** Requirements checklist is comprehensive and easy to understand
- **Flexible:** Buyer can edit email before sending
- **Trackable:** Project ID embedded in headers for tracking

---

### 4.3 Email Notification Experience

**Supplier Response Notification:**

```
From: Optiroq System <noreply@optiroq.com>
To: sarah.chen@company.com
Subject: Quote Received - Supplier A (Project RFQ-2024-001)

Dear Sarah,

We have received a quotation from Supplier A for Project RFQ-2024-001.

Details:
- Supplier: Supplier A (supplier-a@example.com)
- Received: 2024-01-10 14:32 UTC
- Attachments: 1 file (quote.xlsx)
- Status: Processing

We are extracting and normalizing the data. You will receive an updated 
comparison board shortly.

Best regards,
Optiroq System
```

**Comparison Board Update Notification:**

```
From: Optiroq System <noreply@optiroq.com>
To: sarah.chen@company.com
Subject: Comparison Board Updated - 3 Suppliers (Project RFQ-2024-001)
Attachments: RFQ-2024-001_Comparison_v3.xlsx

Dear Sarah,

Your comparison board has been updated with 3 supplier quotations.

Summary:
- Supplier A: €52,000 (✓ ✓ ✓)
- Supplier B: €51,705 (✓ ⚠️ ✓) - High scrap ratio
- Supplier C: €49,930 (✓ ✓ ✓) - Lowest cost

Anomalies Detected:
- Supplier B: Scrap ratio 35% (⚠️ Yellow flag)

Please review the attached Excel file for detailed comparison.

Best regards,
Optiroq System
```

---

### 4.4 Excel Comparison Board Design

**Sheet 1: Summary Comparison**

```
┌──────────┬──────────┬─────────┬─────────┬─────────┬────────┬──────────────────────┐
│ Supplier │ Material │ Process │ Tooling │ Total   │ Flags  │ Notes                │
├──────────┼──────────┼─────────┼─────────┼─────────┼────────┼──────────────────────┤
│ Supp. C  │ €1,180   │ €750    │ €48,000 │ €49,930 │ ✓ ✓ ✓  │ Lowest cost          │
│ Supp. A  │ €1,200   │ €800    │ €50,000 │ €52,000 │ ✓ ✓ ✓  │                      │
│ Supp. B  │ €1,350   │ €855    │ €49,500 │ €51,705 │ ✓ ⚠️ ✓  │ High scrap (35%)     │
│ Supp. D  │ €1,220   │ €820    │ €51,000 │ €53,040 │ ✓ ✓ ⚠️  │ Missing capacity     │
│ Supp. E  │ €1,650   │ €780    │ €47,000 │ €49,430 │ 🔴 ✓ ✓  │ Material 37% above avg│
└──────────┴──────────┴─────────┴─────────┴─────────┴────────┴──────────────────────┘

Conditional Formatting:
- Green: ✓ (OK)
- Yellow: ⚠️ (Warning)
- Red: 🔴 (Issue)

Charts:
- Cost Comparison Bar Chart (Total cost by supplier)
- Cost Breakdown Pie Chart (Material, Process, Tooling for each supplier)
```

**Design Principles:**
- **Scannable:** Buyer can quickly identify best option
- **Visual:** Conditional formatting and charts make patterns obvious
- **Actionable:** Notes column explains flags and provides context
- **Sortable:** Buyer can sort by any column

---

### 4.4 Follow-up Email Design

**Missing Information Follow-up:**

```
From: sarah.chen@company.com
To: supplier-a@example.com
CC: rfq-agent@danone.optiroq.com
Subject: Re: RFQ [RFQ-2024-001] - Additional Information Needed

Dear Supplier A,

Thank you for your quotation for Project RFQ-2024-001. To complete our 
evaluation, we need the following additional information:

1. Cycle time for Operation 2 (stamping)
   - Current: Not provided
   - Required: Cycle time in seconds

2. Capacity confirmation
   - Current: Not provided
   - Required: Equipment count, shifts, annual capacity

3. Tooling cost breakdown
   - Current: Not found (may be embedded in process costs)
   - Required: Explicit breakdown:
     • Tooling investment: [amount]
     • Amortization period: [shots or years]
     • Maintenance cost: [amount]
   
   Note: This helps us compare fairly with other suppliers who list 
   tooling separately.

Please provide this information by 2024-01-13.

Best regards,
Sarah Chen
```

**Design Principles:**
- **Specific:** Lists exactly what's missing
- **Helpful:** Explains why information is needed
- **Professional:** Polite and respectful tone
- **Actionable:** Clear deadline

---

**Deliverable:** Full end-to-end workflow working with incremental updates

---

## 6. Success Metrics & Validation

### 6.1 Success Metrics

**Efficiency Metrics:**
- Time Savings: 70% reduction in manual data entry time (baseline: 10-15 hours per RFQ)
- Extraction Accuracy: 90%+ automatic extraction accuracy
- Processing Time: <5 minutes per supplier quote

**Quality Metrics:**
- Anomaly Detection: 90%+ of cost issues flagged
- Hidden Cost Detection: 80%+ of embedded costs identified
- Data Quality: 95%+ of responses normalized correctly

**Adoption Metrics:**
- Plugin Usage: 80%+ of RFQs initiated via plugin
- Pilot Customers: 3-5 customers actively using system
- RFQs Processed: 20+ RFQs in first 3 months post-launch
- User Satisfaction: 4/5 rating from pilot users

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 26, 2024 | Kiro | Initial MVP PRD |
