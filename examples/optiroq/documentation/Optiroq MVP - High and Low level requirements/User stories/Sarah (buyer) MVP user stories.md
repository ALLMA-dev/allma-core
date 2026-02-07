# User Stories for MVP Persona: Sarah Chen - Project Buyer

**Document Version:** 4.0  
**Date:** January 2, 2026  
**Based on:** MVP Product Requirements Document v3.0 + Mebarek Feedback Analysis (Jan 2, 2026)

---

## Overview

This document contains user stories for **Sarah Chen**, a Project Buyer, for the **MVP scope** of Optiroq. The MVP focuses on the killer feature: automated email quote intake, extraction, normalization, and comparison with extreme flexibility through dynamic field management.

**MVP Scope:** BOM upload with "The Split" → Agent-based RFQ creation (3 methods) → Dynamic field management → Multi-part RFQ support → Email quote intake → Modular LLM extraction → Immediate quality control → Communication tracking → Lead time milestones → Normalized comparison → Negotiation rounds → ESG scoring → Sign-off governance

**Persona Summary:**
- **Role:** Project Buyer (New Product Introduction)
- **Experience:** 6 years in procurement
- **MVP Goals:** Eliminate 10-15 hours of manual data entry per RFQ, compare suppliers fairly, identify cost anomalies, track complete audit trail
- **Main Pain Points:** Manual data entry from multiple formats, hidden costs, currency/unit conversion, incomplete supplier responses, lack of communication tracking

**Key MVP Enhancements (Jan 2, 2026 - Mebarek Feedback):**
- ✅ **Multi-part RFQ support** (REQ-MVP-11): Handle multiple parts per RFQ with package pricing
- ✅ **Enhanced project details** (REQ-MVP-00A): Project Name, Platform, Customer, Delivery Location
- ✅ **Supplier communication tracking** (REQ-MVP-12): Complete audit trail, automated reminders, response tracking
- ✅ **Lead time milestone tracking** (REQ-MVP-13): 7 milestones (Sample A/B/C/D, Prototype, Off-tool, PPAP, SOP)
- ✅ **Negotiation round tracking** (REQ-MVP-14): Track multiple quote rounds and price improvements
- ✅ **ESG/Sustainability scoring** (REQ-MVP-15): ECOVADIS scores, internal assessments, ESG-weighted ranking
- ✅ **Sign-off governance workflow** (REQ-MVP-16): Multi-level approvals based on spend thresholds
- ✅ **Enhanced logistics fields** (REQ-MVP-04): Carton, Euro Pallet, Returnable Packaging, Cleaning
- ✅ **Tooling amortization transparency** (REQ-MVP-05): Explicit breakdown (piece price vs tooling amortization)
- ✅ **Target price rejection logic** (REQ-MVP-07): Auto-reject if >10% above target
- ✅ **Tooling cost savings tracking** (REQ-MVP-08): Best tooling cost vs target/average

**Previous MVP Features:**
- ✅ Agent-based approach (no plugin installation required)
- ✅ 3 RFQ creation methods: manual, duplicate, file upload
- ✅ Portal + Email mixed experience
- ✅ Volume scenarios and multi-year projections
- ✅ BOM-level project analysis
- ✅ Immediate automatic quality control responses
- ✅ Supplier ranking with target price comparison
- ✅ Multi-language support (English, Spanish, French, German, Mandarin)
- ✅ Company domain emails (purchasingrfq@companyname.com)

---

## Epic 1: RFQ Initiation (Agent-Based - 3 Methods)

### US-MVP-01: Access Optiroq Portal

**As** Sarah (Project Buyer)  
**I want to** access Optiroq portal without complex installation  
**So that** I can start using the system immediately

**Acceptance Criteria:**
- I receive portal URL and login credentials from System Admin
- I can log in with company email (SSO preferred)
- Portal is accessible from desktop browser (Chrome, Edge, Firefox, Safari)
- Portal is mobile-responsive (can view on tablet/phone)
- No software installation required
- Login takes <30 seconds

**Priority:** P0 (Must Have)  
**Related Features:** Feature 0 (Portal Access)  
**Development Effort:** 1 week (authentication + portal framework)

---

### US-MVP-02A: Create RFQ Manually from Scratch

**As** Sarah  
**I want to** create RFQ manually from scratch using a structured form  
**So that** I can initiate new RFQs for completely new projects

**Acceptance Criteria:**
- I click "Create New RFQ" button in portal
- Portal shows structured form with fields:
  - Project ID (auto-generated or manual entry)
  - Project name and description
  - Part numbers (list with descriptions)
  - Volume scenarios (10K, 50K, 100K units - configurable)
  - Multi-year projections (Year 1, 2, 3+ with ramp-up/ramp-down)
  - Multiple locations (if applicable)
  - Suppliers (email addresses - can select from list or add new)
  - Requirements checklist (material, process, tooling, logistics, terms, capacity)
  - Attachments (BOM, drawings, specs, PPT)
  - Deadline date
  - Language preference (English, Spanish, French, German, Mandarin)
- Form validates required fields before proceeding
- I can save draft and return later
- Form takes <5 minutes to complete
- System generates unique Project ID automatically

**Priority:** P0 (Must Have)  
**Related Features:** Feature 0 (RFQ Creation - Manual)  
**Development Effort:** 1 week

---

### US-MVP-02B: Duplicate Existing RFQ with Modifications

**As** Sarah  
**I want to** duplicate an existing RFQ and modify only what's different  
**So that** I save 60-70% of time on similar RFQs (key selling point)

**Acceptance Criteria:**
- I can view list of past RFQs in portal
- I click "Duplicate" button on any past RFQ
- System creates new RFQ with all fields pre-filled from original:
  - Suppliers (same list)
  - Requirements checklist (same)
  - Company details (same)
  - Commodity type (same)
  - Volume scenarios (same structure, can modify values)
  - Attachments (same, can add/remove)
- I only need to change:
  - Part numbers and descriptions (different)
  - Volumes (different)
  - Project name (different)
  - Deadline (different)
- System uses AI to detect similarity and asks: "This RFQ is 90% similar to RFQ-2024-045. Is this intentional?"
- I confirm and make necessary changes
- Duplication + modification takes <3 minutes (vs. 10 minutes from scratch)
- System tracks duplication for metrics

**Priority:** P0 (Must Have) - Critical selling point  
**Related Features:** Feature 0 (RFQ Creation - Duplicate)  
**Development Effort:** 1 week

---

### US-MVP-02C: Create RFQ from Uploaded Files (Auto-Parsing)

**As** Sarah  
**I want to** upload project files (PPT, Excel, PDF) and have system auto-extract RFQ data  
**So that** I eliminate zero-value manual data entry

**Acceptance Criteria:**
- I click "Create RFQ from Files" button in portal
- I can upload files: PowerPoint, Excel, PDF (from project team)
- System automatically extracts and pre-fills:
  - Project name and platform
  - Customer name (if mentioned)
  - Part numbers and descriptions
  - Volumes (annual, lifetime)
  - SOP date
  - Delivery location
  - Any technical specifications
- System shows extracted data with confidence scores
- I review and correct any errors (LLM audits using past RFQ knowledge)
- System flags low-confidence extractions for my attention
- I add missing information (suppliers, requirements checklist, deadline)
- Extraction + review takes <5 minutes (vs. 15 minutes manual entry)
- System achieves 90-95% extraction accuracy

**Priority:** P0 (Must Have) - Critical for efficiency  
**Related Features:** Feature 0 (RFQ Creation - File Upload)  
**Development Effort:** 2 weeks

---

### US-MVP-03: Review and Send RFQ Package

**As** Sarah  
**I want to** review auto-generated RFQ package before sending to suppliers  
**So that** I ensure accuracy and completeness

**Acceptance Criteria:**
- After creating RFQ (any method), system shows preview of RFQ package
- Preview includes:
  - Professional email template with all details
  - Requirements checklist
  - Attachments list
  - Supplier list
  - Volume scenarios and multi-year projections
  - Language (can switch before sending)
- I can edit any field before sending
- I can add/remove suppliers
- I can add/remove attachments
- System validates completeness before allowing send
- I click "Send RFQ" button
- System sends emails from company domain: purchasingrfq@companyname.com
- System CC's me on all emails
- Agent handles primary communication with suppliers
- Confirmation: "RFQ sent to 8 suppliers successfully"

**Priority:** P0 (Must Have)  
**Related Features:** Feature 0 (RFQ Review & Send)  
**Development Effort:** 3 days

---

### US-MVP-04: Track RFQ via Project ID

**As** Sarah  
**I want to** have a unique Project ID for tracking all RFQ communications  
**So that** the system can track supplier responses and I can reference projects easily

**Acceptance Criteria:**
- System generates unique Project ID (e.g., Project-123, RFQ-2024-001)
- Project ID is embedded in email subject line: "RFQ [Project-123] - Aluminum Bracket"
- Project ID is embedded in email headers (X-Optiroq-Project-ID)
- Project ID persists across email thread (replies preserve headers)
- If I forward email to colleague, Project ID is preserved
- System can identify supplier responses via Project ID
- I can search for RFQs by Project ID in portal

**Priority:** P0 (Must Have)  
**Related Features:** Feature 0 (Project Tracking), Feature 1 (Email Quote Intake)  
**Development Effort:** 2 days

---

## Epic 2: Email Quote Intake & Monitoring

### US-MVP-05: Monitor Company Domain Inbox for Supplier Responses

**As** Sarah  
**I want to** have the system automatically detect supplier responses from company domain inbox  
**So that** I don't have to manually forward emails or upload files

**Acceptance Criteria:**
- System monitors purchasingrfq@companyname.com inbox (company domain, not optiroq.com)
- System identifies supplier responses via:
  - Project ID in subject line
  - Project ID in email headers
  - Sender email matching supplier list
- System detects responses within 5 minutes of receipt
- I receive email notification (CC'd on all communications)
- Notification: "Received quote from Supplier A for Project 123"
- Company domain prevents spam filter issues
- Maintains company branding in all communications

**Priority:** P0 (Must Have)  
**Related Features:** Feature 1 (Email Quote Intake)  
**Development Effort:** 1 week

---

### US-MVP-06: Extract Attachments from Supplier Emails

**As** Sarah  
**I want to** have the system automatically download all attachments from supplier responses  
**So that** I don't have to manually save files

**Acceptance Criteria:**
- System downloads ALL attachments from supplier emails:
  - Excel files (.xlsx, .xls)
  - PDF files (.pdf)
  - CSV files (.csv)
  - Links to Google Drive, Dropbox, etc.
- System stores attachments securely (encrypted S3)
- System associates attachments with Project ID and supplier
- System stores full email thread (for reference)
- I can access original files in portal if needed

**Priority:** P0 (Must Have)  
**Related Features:** Feature 1 (Email Quote Intake)  
**Development Effort:** 3 days

---

## Epic 3: Multi-Format Extraction & Normalization

### US-MVP-07: Extract Data from Excel Files

**As** Sarah  
**I want to** have the system automatically extract cost data from supplier Excel files  
**So that** I don't spend 10-15 hours manually copying data

**Acceptance Criteria:**
- System converts Excel files to structured format
- System extracts data using modular LLM approach (block-by-block):
  - Material costs (raw material type, cost/kg, gross/net weight, scrap)
  - Process costs (operations, cycle time, labor, overhead)
  - Tooling costs (investment, amortization, shots, maintenance)
  - Logistics (packaging, transportation, IncoTerms)
  - Terms (payment terms, currency, lead time)
- System achieves ≥90% extraction accuracy
- System flags low-confidence extractions for my review
- Extraction completes within 2 minutes per supplier

**Priority:** P0 (Must Have)  
**Related Features:** Feature 2 (File Format Conversion), Feature 3 (Modular LLM Extraction)  
**Development Effort:** 2 weeks

---

### US-MVP-08: Extract Data from PDF Files

**As** Sarah  
**I want to** have the system extract cost data from supplier PDF files  
**So that** I can handle suppliers who send PDFs instead of Excel

**Acceptance Criteria:**
- System converts PDF files to text (with OCR if needed)
- System extracts data using same modular LLM approach as Excel
- System handles PDFs with text layer (no OCR needed)
- System handles scanned PDFs (OCR via AWS Textract)
- System achieves ≥85% extraction accuracy for PDFs
- System flags low-confidence extractions for my review

**Priority:** P1 (Should Have - Month 2)  
**Related Features:** Feature 2 (File Format Conversion), Feature 3 (Modular LLM Extraction)  
**Development Effort:** 3 days

---

### US-MVP-09: Extract Data from CSV Files

**As** Sarah  
**I want to** have the system extract cost data from supplier CSV files  
**So that** I can handle suppliers who send simple CSV exports

**Acceptance Criteria:**
- System converts CSV files to structured format
- System extracts data using same modular LLM approach
- System handles various CSV formats (comma, semicolon, tab-delimited)
- System achieves ≥90% extraction accuracy for CSVs
- System flags low-confidence extractions for my review

**Priority:** P1 (Should Have - Month 2)  
**Related Features:** Feature 2 (File Format Conversion), Feature 3 (Modular LLM Extraction)  
**Development Effort:** 2 days

---

### US-MVP-10: Review Low-Confidence Extractions

**As** Sarah  
**I want to** review and correct low-confidence extractions before normalization  
**So that** I ensure data accuracy without losing automation benefits

**Acceptance Criteria:**
- System flags extractions with confidence <80%
- I receive email notification: "Supplier A quote needs review (2 fields unclear)"
- I can access simple review interface showing:
  - Original file (Excel/PDF/CSV)
  - Extracted data with confidence scores
  - Flagged fields highlighted
- I can correct flagged fields with one click
- Corrections take <5 minutes per supplier
- System learns from my corrections (future improvement)

**Priority:** P0 (Must Have)  
**Related Features:** Feature 3 (Modular LLM Extraction)  
**Development Effort:** 3 days

---

## Epic 4: Completeness Check & Automatic Quality Control

### US-MVP-11: Detect Missing Mandatory Fields

**As** Sarah  
**I want to** have the system automatically detect missing mandatory fields  
**So that** I don't have to manually check each supplier's response

**Acceptance Criteria:**
- System validates mandatory fields by commodity type:
  - Material: raw_material_type, cost_per_kg, gross_weight, net_weight
  - Process: operations, cycle_time, total_process_cost
  - Tooling: tooling_investment, amortization_period
  - Terms: payment_terms, incoterms, lead_time
  - Capacity: capacity_confirmation, equipment_count, shifts
- System flags missing fields with severity (red/yellow)
- I see clear list of missing fields per supplier in portal
- System distinguishes between "not provided" and "not found" (extraction issue)

**Priority:** P0 (Must Have)  
**Related Features:** Feature 4 (Completeness Check & Follow-up Loop)  
**Development Effort:** 3 days

---

### US-MVP-12: Detect Hidden Costs (Embedded Tooling)

**As** Sarah  
**I want to** have the system detect when suppliers embed tooling costs in process costs  
**So that** I can compare suppliers fairly (this is a major pain point)

**Acceptance Criteria:**
- System checks if tooling cost is listed separately
- If tooling cost is missing, system flags as "likely embedded"
- System uses LLM to analyze if tooling is mentioned in process costs
- I see clear flag in portal: "Tooling cost not found - likely embedded in process costs"
- System generates follow-up email requesting explicit breakdown
- This is critical for fair comparison (can't compare apples to oranges)

**Priority:** P0 (Must Have)  
**Related Features:** Feature 4 (Completeness Check & Follow-up Loop)  
**Development Effort:** 2 days

---

### US-MVP-13: Immediate Automatic Quality Control Responses

**As** Sarah  
**I want to** have the system immediately send automatic responses for incomplete or anomalous submissions  
**So that** suppliers are disciplined and I save 2-3 days per RFQ

**Acceptance Criteria:**
- System immediately (within 1 hour) sends automated responses for:
  - Missing mandatory fields
  - Embedded tooling costs (not explicit)
  - Wrong materials specified
  - High scrap ratios (>30%)
  - Material costs >20% above market index
  - Any other anomalies detected
- Response tone is professional and asks for clarification (not accusatory)
- Example: "Thank you for your quotation. We noticed the following items need clarification: [list]. Please provide this information by [deadline] for your quote to be considered."
- For incomplete submissions: "Quote will not be considered" messaging
- System does NOT wait for my review before sending (immediate action)
- I receive CC of all automated responses
- This teaches suppliers discipline and saves 2-3 days per RFQ

**Priority:** P0 (Must Have) - Critical for efficiency  
**Related Features:** Feature 4 (Completeness Check & Follow-up Loop)  
**Development Effort:** 1 week

---

### US-MVP-14: Track Follow-up Responses

**As** Sarah  
**I want to** have the system track follow-up responses and re-process quotes  
**So that** I have complete information for all suppliers

**Acceptance Criteria:**
- System monitors for follow-up responses (via Project ID)
- System re-processes quote with additional information
- System updates comparison board with new data
- I receive notification: "Supplier A provided additional information - comparison board updated"
- System sends reminder if no response after 3 days
- I can see follow-up status in portal: complete/incomplete/pending

**Priority:** P0 (Must Have)  
**Related Features:** Feature 4 (Completeness Check & Follow-up Loop)  
**Development Effort:** 2 days

---

## Epic 5: Normalization & Anomaly Detection

### US-MVP-15: Normalize Currency Across Suppliers

**As** Sarah  
**I want to** have all costs converted to a common currency (EUR or USD)  
**So that** I can compare suppliers fairly without manual conversion

**Acceptance Criteria:**
- System identifies currency in each supplier's quote (EUR, USD, GBP, JPY, CNY, etc.)
- System converts all costs to common currency (EUR default, configurable)
- System uses exchange rate from quotation date
- System shows original currency and converted currency
- Conversion accuracy: ±0.1%
- I can see conversion rate used: "Converted from USD @ 0.90 EUR/USD"

**Priority:** P0 (Must Have)  
**Related Features:** Feature 5 (Normalization)  
**Development Effort:** 2 days

---

### US-MVP-16: Normalize Units Across Suppliers

**As** Sarah  
**I want to** have all units converted to common basis (kg, pieces, etc.)  
**So that** I can compare suppliers fairly without manual conversion

**Acceptance Criteria:**
- System identifies units in each supplier's quote (kg, lbs, g, tons, pieces, dozens, etc.)
- System converts all units to common basis:
  - Weight: kg
  - Volume: liters
  - Quantity: pieces
- System handles implicit conversions (e.g., "per 100 pieces" → "per piece")
- Conversion accuracy: ±1%
- I can see conversion: "Converted from 220 lbs to 100 kg"

**Priority:** P0 (Must Have)  
**Related Features:** Feature 5 (Normalization)  
**Development Effort:** 2 days

---

### US-MVP-17: Standardize Cost Categories

**As** Sarah  
**I want to** have all costs mapped to standard categories  
**So that** I can compare apples-to-apples across suppliers

**Acceptance Criteria:**
- System maps supplier cost structures to standard categories:
  - Material → Material
  - Processing/Manufacturing → Process
  - Tooling/Molds/Dies → Tooling (explicit)
  - Packaging/Freight → Logistics
- System un-embeds hidden costs (tooling from process)
- System shows original category and mapped category
- I can see: "Supplier A: 'Manufacturing' → Process, 'Molds' → Tooling"

**Priority:** P0 (Must Have)  
**Related Features:** Feature 5 (Normalization)  
**Development Effort:** 2 days

---

### US-MVP-18: Detect Material Cost Outliers

**As** Sarah  
**I want to** have the system flag suppliers with material costs >20% above average  
**So that** I can quickly identify overpriced quotes

**Acceptance Criteria:**
- System calculates average material cost across all suppliers for this RFQ
- System flags suppliers >20% above average (red flag)
- System flags suppliers >10% above average (yellow flag)
- I see clear indicator: "Supplier E: Material cost 37% above average 🔴"
- System shows peer comparison: "Average: €12.06/kg, Supplier E: €16.50/kg"

**Priority:** P0 (Must Have)  
**Related Features:** Feature 6 (Anomaly Detection)  
**Development Effort:** 2 days

---

### US-MVP-19: Validate Against Price Indices

**As** Sarah  
**I want to** have the system validate costs against material price indices  
**So that** I can catch extraction errors (e.g., 1m = 1,000,000cm)

**Acceptance Criteria:**
- System compares extracted costs against static price indices:
  - Steel: ~$1000/ton
  - Aluminum: ~$2500/ton
  - Plastic: ~$2000/ton
- System flags if cost is 10x higher/lower than index (likely extraction error)
- I see clear indicator: "Aluminum cost seems too high - please review extraction"
- This is order-of-magnitude validation (not precise pricing)
- Price indices updated monthly/quarterly (not real-time)

**Priority:** P0 (Must Have)  
**Related Features:** Feature 6 (Anomaly Detection)  
**Development Effort:** 2 days

---

### US-MVP-20: Detect Excessive Scrap Ratio

**As** Sarah  
**I want to** have the system flag suppliers with excessive scrap (>30%)  
**So that** I can identify inefficient processes

**Acceptance Criteria:**
- System calculates scrap ratio: (gross_weight - net_weight) / gross_weight
- System flags scrap ratio >30% (yellow flag)
- System shows industry norms: "Stamping: 10-20%, Machining: 5-10%"
- I see clear indicator: "Supplier B: Scrap ratio 35% ⚠️ (high scrap)"
- I can investigate why scrap is high (process inefficiency, material waste)

**Priority:** P1 (Should Have)  
**Related Features:** Feature 6 (Anomaly Detection)  
**Development Effort:** 1 day

---

### US-MVP-21: Detect Inconsistent Data

**As** Sarah  
**I want to** have the system flag logical inconsistencies  
**So that** I can catch errors before making decisions

**Acceptance Criteria:**
- System checks logical consistency:
  - Cycle time vs capacity (can they produce the volume?)
  - Tooling shots vs lifetime volume (will tooling last?)
  - Gross weight > net weight (scrap ratio makes sense?)
- System flags inconsistencies with explanation
- I see clear indicator: "Supplier D: Capacity insufficient for annual volume ⚠️"
- I can follow up with supplier to clarify

**Priority:** P1 (Should Have)  
**Related Features:** Feature 6 (Anomaly Detection)  
**Development Effort:** 2 days

---

## Epic 6: Incremental Comparison Board with Supplier Ranking

### US-MVP-22: Receive Incremental Excel Updates

**As** Sarah  
**I want to** receive updated Excel comparison boards as each supplier responds  
**So that** I can see results progressively and make faster decisions

**Acceptance Criteria:**
- System processes each supplier response immediately (not batch)
- System sends updated Excel after each supplier is added:
  - Day 1: Excel v1 (1 supplier)
  - Day 2: Excel v2 (3 suppliers)
  - Day 3: Excel v3 (4 suppliers)
- I receive email notification with Excel attachment
- Excel is formatted for easy analysis (colors, charts, conditional formatting)
- I can decide when to stop collecting quotes (no fixed deadline)

**Priority:** P0 (Must Have)  
**Related Features:** Feature 7 (Incremental Comparison Board Updates)  
**Development Effort:** 1 week

---

### US-MVP-23: Review Summary with Target Price and Supplier Ranking

**As** Sarah  
**I want to** see all suppliers ranked against target price with best price first  
**So that** I can quickly identify the best option

**Acceptance Criteria:**
- Excel Sheet 1: Summary Comparison with Ranking
- First column shows company target price (mandatory)
- Table with columns:
  - Rank (1st, 2nd, 3rd - not just A, B, C)
  - Supplier name
  - Material cost
  - Process cost
  - Tooling cost
  - Total cost
  - vs. Target (% above/below target price)
  - Lead time
  - Anomaly flags (✓ ⚠️ 🔴)
  - Notes (brief explanation of flags)
- Sorted by total cost (best price first)
- Automated recommendation based on price + tooling cost
- Conditional formatting (green/yellow/red)
- Charts: cost comparison bar chart vs target, cost breakdown pie chart
- I can quickly scan and identify best option

**Priority:** P0 (Must Have) - Critical for decision making  
**Related Features:** Feature 7 (Incremental Comparison Board Updates)  
**Development Effort:** 1 week

---

### US-MVP-23A: View Multi-Scenario Analysis

**As** Sarah  
**I want to** see cost analysis for multiple volume scenarios and multi-year projections  
**So that** I can make informed decisions based on different business scenarios

**Acceptance Criteria:**
- Excel includes tabs for each volume scenario (10K, 50K, 100K units)
- Each scenario shows:
  - Piece price at that volume
  - Total material cost
  - Total tooling cost
  - Lifetime spend calculation
- Multi-year projections sheet shows:
  - Year 1, 2, 3+ volume forecasts
  - Ramp-up/ramp-down curves
  - Yearly cost breakdown
  - Lifetime spend by year
- Progressive pricing structures visible (volume discounts)
- Multiple location support (if applicable):
  - Cost comparison by location
  - Logistics cost impact
  - Supplier capacity by location
- Graphs with switchable views:
  - Lifetime total view
  - By year view
  - By volume scenario view
- I can analyze different business scenarios before making decision

**Priority:** P0 (Must Have) - Critical for strategic decisions  
**Related Features:** Feature 7A (Multi-Scenario Analysis)  
**Development Effort:** 1 week

---

### US-MVP-24: Drill Down to Detailed Breakdown

**As** Sarah  
**I want to** see detailed cost breakdown for each supplier  
**So that** I can understand where costs come from

**Acceptance Criteria:**
- Excel Sheet 2: Detailed Breakdown
- One row per supplier per cost category
- All extracted fields visible:
  - Material: raw material type, cost/kg, gross/net weight, scrap value
  - Process: operations, cycle time, labor cost, overhead
  - Tooling: investment, amortization, shots, maintenance
  - Logistics: packaging, transportation, IncoTerms
  - Terms: payment terms, currency, lead time
- Pivot table ready (I can analyze by category, supplier, etc.)
- I can export to my own analysis tools

**Priority:** P0 (Must Have)  
**Related Features:** Feature 7 (Incremental Comparison Board Updates)  
**Development Effort:** 2 days

---

### US-MVP-25: Review Anomaly Explanations

**As** Sarah  
**I want to** see clear explanations for all anomaly flags  
**So that** I understand what issues were detected

**Acceptance Criteria:**
- Excel Sheet 3: Anomalies
- List of all anomalies detected:
  - Supplier name
  - Anomaly type (material cost outlier, missing field, high scrap, etc.)
  - Severity (red/yellow/green)
  - Description (clear explanation)
  - Recommendation (what to do about it)
- Grouped by supplier
- Sorted by severity (red first, then yellow)
- I can quickly review all issues before making decision

**Priority:** P0 (Must Have)  
**Related Features:** Feature 7 (Incremental Comparison Board Updates)  
**Development Effort:** 2 days

---

### US-MVP-26: Access Raw Data and Email Thread

**As** Sarah  
**I want to** access raw extracted data and original email thread  
**So that** I can verify information if needed

**Acceptance Criteria:**
- Excel Sheet 4: Raw Data
- All extracted data with confidence scores
- Links to original files (Excel, PDF, CSV)
- Excel Sheet 5: Email Thread
- Full email thread per supplier
- Timestamps, attachments, follow-ups
- I can trace back to original communication if needed

**Priority:** P1 (Should Have)  
**Related Features:** Feature 7 (Incremental Comparison Board Updates)  
**Development Effort:** 1 day

---

## Epic 6A: BOM-Level Project Analysis

### US-MVP-26A: View Project-Level BOM Dashboard

**As** Sarah  
**I want to** see total project-level cost visibility aggregating all parts  
**So that** I can understand total material cost + tooling cost vs target for the entire project

**Acceptance Criteria:**
- Portal shows BOM Dashboard for each project
- Dashboard aggregates:
  - All new parts (from RFQs)
  - All existing parts (from manual ERP report upload)
- Shows project-level metrics:
  - Total material cost (sum of all parts)
  - Total tooling cost (sum of all parts)
  - Total project cost
  - Variance from company target (% above/below)
  - Cost breakdown by part
  - Cost breakdown by commodity
- Example: AirPods project = Box + 2 earbuds = 3 parts = total BOM cost
- Visual charts showing cost distribution
- I manage 60-260 projects, need project-level view for strategic decisions
- This is mandatory for Customer Quote Approval (CQA) process

**Priority:** P0 (Must Have) - Critical for project management  
**Related Features:** Feature 7B (BOM-Level Analysis)  
**Development Effort:** 1 week

---

### US-MVP-26B: Upload Existing Parts Data from ERP

**As** Sarah  
**I want to** manually upload existing parts data from ERP report  
**So that** I can see complete BOM picture (new + existing parts)

**Acceptance Criteria:**
- Portal allows me to upload Excel report from ERP
- Report contains existing parts:
  - Part number
  - Current supplier
  - Current price
  - Annual volume
- System extracts data from uploaded report
- System adds existing parts to BOM Dashboard
- System calculates total project cost (new RFQ parts + existing parts)
- I can update existing parts data anytime
- Note: Direct ERP integration is Phase 2 (not MVP)

**Priority:** P0 (Must Have)  
**Related Features:** Feature 7B (BOM-Level Analysis)  
**Development Effort:** 3 days

---

## Epic 7: Decision Making & Export

### US-MVP-27: Make Sourcing Decision

**As** Sarah  
**I want to** make sourcing decision based on normalized comparison  
**So that** I can complete RFQ process

**Acceptance Criteria:**
- I review Excel comparison board
- I consider: cost, anomaly flags, supplier capabilities
- I make decision (select winning supplier)
- I can export decision rationale (for documentation)
- Decision process takes <30 minutes (vs. 2-3 hours manually)

**Priority:** P0 (Must Have)  
**Related Features:** Feature 7 (Incremental Comparison Board Updates)  
**Development Effort:** N/A (manual process)

---

### US-MVP-28: Export to My Own Tools

**As** Sarah  
**I want to** export comparison data to my own analysis tools  
**So that** I can perform additional analysis if needed

**Acceptance Criteria:**
- Excel is in standard format (no macros, no protection)
- I can copy-paste data to other tools (Power BI, Tableau, etc.)
- I can share Excel with colleagues (no special software needed)
- I can archive Excel for future reference

**Priority:** P1 (Should Have)  
**Related Features:** Feature 7 (Incremental Comparison Board Updates)  
**Development Effort:** N/A (standard Excel format)

---

### US-MVP-29: Send Rejection Emails to Non-Nominated Suppliers

**As** Sarah  
**I want to** send professional rejection emails to non-selected suppliers with specific feedback  
**So that** I maintain positive relationships and help suppliers improve for future opportunities

**Acceptance Criteria:**
- After making sourcing decision, system prompts me to notify non-selected suppliers
- System auto-generates rejection email for each non-selected supplier with:
  - Professional greeting and appreciation for participation
  - Specific reason for non-selection (e.g., "pricing was 18% above target", "material costs 22% above market index")
  - Constructive feedback based on comparison data
  - Encouragement for future participation
  - Professional closing
- I can review and edit each rejection email before sending
- I can adjust level of detail (high/medium/low feedback)
- I can send all rejection emails with one click after review
- System tracks delivery status (sent, delivered)
- Rejection emails are stored in project record for audit trail

**Priority:** P1 (Should Have)  
**Related Features:** Feature 8 (Supplier Feedback Management)  
**Development Effort:** 3 days

**Cross-Reference to Main Product:**
- **Related to REQ-RFQ-12A** (Supplier Feedback Management) - MVP includes basic rejection letter generation with specific feedback

---

## Epic 8: Multi-Language and Currency Support

### US-MVP-32: Select RFQ Language

**As** Sarah  
**I want to** select language for RFQ emails  
**So that** I can communicate with suppliers in their preferred language

**Acceptance Criteria:**
- When creating RFQ, I can select language:
  - English
  - Spanish
  - French
  - German
  - Mandarin
- System generates RFQ email in selected language
- Requirements checklist translated to selected language
- Professional translation quality (not machine translation)
- I can select different language per supplier if needed

**Priority:** P0 (Must Have) - Critical for global operations  
**Related Features:** Feature 8 (Multi-Language Support)  
**Development Effort:** 1 week

---

### US-MVP-33: Switch Currency Display

**As** Sarah  
**I want to** switch between local currency and international currency in comparison board  
**So that** I can analyze costs in different currencies

**Acceptance Criteria:**
- Comparison board shows costs in default currency (EUR or USD)
- I can switch to view costs in:
  - Original supplier currency
  - Company local currency
  - Any major currency (EUR, USD, GBP, JPY, CNY, etc.)
- System uses live exchange rates (updated daily)
- System also shows budget rates (if configured)
- Currency switch applies to all sheets in Excel
- I can compare live rates vs budget rates

**Priority:** P0 (Must Have)  
**Related Features:** Feature 8 (Currency Support)  
**Development Effort:** 3 days

---

### US-MVP-34: Track System Improvement Metrics

**As** Sarah  
**I want to** have system track correction rates and adherence metrics  
**So that** Optiroq can improve over time and demonstrate value

**Acceptance Criteria:**
- System tracks (backend, not visible to me):
  - Correction rate: % of fields I correct after extraction
  - Duplication usage: % of RFQs created by duplication
  - File upload usage: % of RFQs created from file upload
  - Time saved per RFQ (estimated)
  - Follow-up reduction: # of automatic follow-ups sent
  - Supplier response time improvement
- System Admin can view these metrics
- Metrics used for:
  - Sales pitch: "87% extraction accuracy"
  - System improvement: identify weak areas
  - Customer success: demonstrate ROI

**Priority:** P1 (Should Have) - Important for product improvement  
**Related Features:** Feature 9 (Metrics Tracking)  
**Development Effort:** 1 week

---

## Epic 9: Multi-Part RFQ Support (NEW - Mebarek Feedback)

### US-MVP-35: Create RFQ with Multiple Parts

**As** Sarah  
**I want to** create RFQs with multiple parts in a single package  
**So that** I can handle complex projects efficiently (60-70% of RFQs involve multiple parts)

**Acceptance Criteria:**
- When creating RFQ, I can add multiple parts:
  - Part Number (e.g., "PART-001", "PART-002", "PART-003")
  - Description (e.g., "Aluminum Bracket", "Steel Mount", "Plastic Cover")
  - Quantity per part
  - Unit per part (kg, lbs, pieces, liters, etc.)
  - Target price per part (optional)
- System supports unlimited parts per RFQ
- I can add/remove parts during RFQ creation
- System validates each part has required fields
- System generates RFQ email listing all parts clearly
- Example: "RFQ-2026-001: 3 parts - Aluminum Bracket (10K units), Steel Mount (10K units), Plastic Cover (10K units)"

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-11 (Multi-Part RFQ Support)  
**Development Effort:** 1 week

---

### US-MVP-36: Request Package Pricing from Suppliers

**As** Sarah  
**I want to** request both individual part pricing and package pricing from suppliers  
**So that** I can evaluate bundle discounts

**Acceptance Criteria:**
- RFQ email clearly requests:
  - Individual price per part (required)
  - Package price for all parts (optional - with discount)
- System extracts both pricing types from supplier responses:
  - Individual prices: Part A = €10, Part B = €15, Part C = €8 (Total: €33)
  - Package price: All 3 parts = €30 (9% discount)
- System calculates package savings: "Package discount: €3 (9%) vs individual parts"
- Comparison board shows both pricing options
- I can compare suppliers on individual vs package basis

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-11 (Multi-Part RFQ Support)  
**Development Effort:** 3 days

---

### US-MVP-37: Use Unit Converter for Multi-Part RFQs

**As** Sarah  
**I want to** use built-in unit converter for different part units  
**So that** I can compare suppliers using different units fairly

**Acceptance Criteria:**
- System supports multiple units:
  - Weight: kg, lbs, g, tons
  - Volume: liters, gallons, ml
  - Quantity: pieces, dozens, hundreds
- System provides unit converter tool in portal:
  - I enter value and source unit
  - System shows converted value in target unit
  - Example: "220 lbs = 100 kg" or "5 gallons = 18.9 liters"
- System automatically converts all supplier quotes to common units
- Conversion accuracy: ±1%
- I can see original unit and converted unit in comparison board

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-11 (Multi-Part RFQ Support)  
**Development Effort:** 2 days

---

## Epic 10: Enhanced Project Details (NEW - Mebarek Feedback)

### US-MVP-38: Capture Enhanced Project Information

**As** Sarah  
**I want to** capture comprehensive project details during BOM upload or RFQ creation  
**So that** I have complete project context for tracking and reporting

**Acceptance Criteria:**
- During BOM upload or RFQ creation, system captures:
  - **Project Name** (required): Human-readable name (e.g., "Model X Platform Refresh")
  - **Platform Name** (optional): Vehicle/product platform (e.g., "MQB Platform", "Model 3")
  - **Customer Name** (required): End customer or OEM (e.g., "Tesla", "Volkswagen")
  - **Delivery Location** (optional): Delivery destination with default value
- System provides default delivery location: "Customer Plant - TBD" (configurable)
- I can override default delivery location
- System validates required fields before proceeding
- All fields are displayed in project dashboard
- All fields are included in RFQ emails to suppliers

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-00A (Enhanced BOM Upload)  
**Development Effort:** 2 days

---

### US-MVP-39: View Enhanced Project Dashboard

**As** Sarah  
**I want to** view comprehensive project information in dashboard  
**So that** I can quickly understand project context

**Acceptance Criteria:**
- Project dashboard displays:
  - Project ID (auto-generated)
  - Project Name
  - Platform Name
  - Customer Name
  - Delivery Location
  - Total parts count
  - Existing parts count
  - New parts count
  - Project status
  - Created date
- Dashboard is accessible from portal home page
- I can search/filter projects by any field
- I can export project list to Excel

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-00A (Enhanced BOM Upload)  
**Development Effort:** 2 days

---

## Epic 11: Supplier Communication Tracking (NEW - Mebarek Feedback)

### US-MVP-40: Track All Supplier Communications

**As** Sarah  
**I want to** have complete audit trail of all supplier communications  
**So that** I can track response rates and maintain compliance records

**Acceptance Criteria:**
- System tracks all communications per supplier per RFQ:
  - Initial RFQ sent (timestamp, recipient)
  - Reminder emails sent (count, timestamps)
  - Supplier responses received (count, timestamps, attachments)
  - Follow-up requests sent (count, timestamps)
  - All email content (subject, body, attachments)
- Communication log is accessible in portal per supplier
- Log shows chronological timeline with visual indicators
- I can see at a glance: "Supplier A: 1 RFQ sent, 2 reminders sent, 1 response received"
- Communication log is exportable for audit trail (PDF or Excel)

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-12 (Supplier Communication Tracking)  
**Development Effort:** 1 week

---

### US-MVP-41: View Supplier Response Status Dashboard

**As** Sarah  
**I want to** see real-time status of all supplier responses  
**So that** I can identify overdue suppliers and take action

**Acceptance Criteria:**
- Portal displays supplier response status dashboard:
  - Supplier name
  - RFQ sent date
  - Response status: Responded / Pending / Overdue
  - Days since RFQ sent
  - Number of reminders sent
  - Last communication date
- System highlights overdue suppliers (no response after 3 days) in red
- System shows pending suppliers (within deadline) in yellow
- System shows responded suppliers in green
- Dashboard updates in real-time as responses arrive
- I can filter by status (all / responded / pending / overdue)
- I can sort by any column

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-12 (Supplier Communication Tracking)  
**Development Effort:** 3 days

---

### US-MVP-42: Send Automated Reminders to Overdue Suppliers

**As** Sarah  
**I want to** have system automatically send reminders to overdue suppliers  
**So that** I don't have to manually follow up

**Acceptance Criteria:**
- System automatically sends reminder emails based on configurable schedule:
  - 1st reminder: 3 days after RFQ sent (default)
  - 2nd reminder: 5 days after RFQ sent (default)
  - 3rd reminder: 7 days after RFQ sent (default)
- Reminder email includes:
  - Professional greeting
  - Reference to original RFQ (Project ID, parts)
  - Polite reminder: "We haven't received your quotation yet"
  - Original RFQ requirements (attached or linked)
  - New deadline (2 days from reminder)
  - Contact information for questions
- I receive CC of all reminder emails
- I can manually trigger additional reminders if needed
- I can configure reminder schedule per customer (3/5/7 days default)
- System tracks reminder count per supplier

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-12 (Supplier Communication Tracking)  
**Development Effort:** 3 days

---

### US-MVP-43: Export Communication Audit Trail

**As** Sarah  
**I want to** export complete communication audit trail  
**So that** I can maintain compliance records and share with stakeholders

**Acceptance Criteria:**
- I can export communication log per RFQ or per supplier
- Export formats: PDF (formatted report) or Excel (data table)
- Export includes:
  - All communication timestamps
  - Email subjects and bodies
  - Attachment names and sizes
  - Response status per supplier
  - Reminder count per supplier
  - Total communication count
- PDF report is professionally formatted with company branding
- Excel export is pivot-table ready for analysis
- Export takes <30 seconds per RFQ

**Priority:** P1 (Should Have)  
**Related Features:** REQ-MVP-12 (Supplier Communication Tracking)  
**Development Effort:** 2 days

---

## Epic 12: Lead Time Milestone Tracking (NEW - Mebarek Feedback)

### US-MVP-44: Specify Target Lead Times for Milestones

**As** Sarah  
**I want to** specify target lead times for each development milestone in RFQ  
**So that** suppliers know my expectations and I can compare their commitments

**Acceptance Criteria:**
- During RFQ creation, I can specify target lead times for 7 milestones:
  - **Sample A**: First prototype sample (e.g., 4 weeks)
  - **Sample B/C/D**: Subsequent iteration samples (e.g., 6 weeks)
  - **Prototype**: Final prototype (e.g., 8 weeks)
  - **Off-tool parts**: First parts from production tooling (e.g., 10 weeks)
  - **Off-tool or process**: Process validation (e.g., 12 weeks)
  - **PPAP**: Production Part Approval Process (e.g., 14 weeks)
  - **SOP**: Start of Production (e.g., 16 weeks)
- I can enter lead time in weeks or specific dates
- System validates lead times are sequential (Sample A < Sample B < ... < SOP)
- Target lead times are included in RFQ email to suppliers
- I can mark milestones as "Not Applicable" if not needed for this project

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-13 (Lead Time Milestone Tracking)  
**Development Effort:** 3 days

---

### US-MVP-45: Extract and Compare Supplier Lead Times

**As** Sarah  
**I want to** have system extract supplier lead times for each milestone  
**So that** I can compare supplier commitments against my targets

**Acceptance Criteria:**
- System extracts supplier-provided lead times for each milestone from quotes
- System handles various formats:
  - Weeks from order (e.g., "Sample A: 4 weeks")
  - Specific dates (e.g., "Sample A: March 15, 2026")
  - Calendar weeks (e.g., "Sample A: CW12")
- System normalizes all lead times to common format (weeks from order)
- Comparison board shows: Target vs Supplier lead time per milestone
- System calculates variance: "Supplier A: Sample A = 5 weeks (1 week late vs target)"
- System flags if supplier lead time > target (red flag: ⚠️)
- System highlights best lead time per milestone across all suppliers (green: ✓)

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-13 (Lead Time Milestone Tracking)  
**Development Effort:** 1 week

---

### US-MVP-46: View Lead Time Milestone Comparison

**As** Sarah  
**I want to** view visual comparison of lead time milestones across suppliers  
**So that** I can quickly identify which supplier can deliver fastest

**Acceptance Criteria:**
- Comparison board includes "Lead Time Milestones" sheet with:
  - Table showing all 7 milestones
  - Target lead time per milestone (my requirements)
  - Supplier lead times per milestone (one column per supplier)
  - Variance from target (color-coded: green = on time, yellow = 1 week late, red = 2+ weeks late)
  - Best lead time per milestone (highlighted)
- Visual Gantt chart showing milestone timeline per supplier
- I can quickly see which supplier meets all milestones
- I can identify critical path delays
- I can filter suppliers by milestone performance (e.g., "Show only suppliers meeting PPAP target")

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-13 (Lead Time Milestone Tracking)  
**Development Effort:** 1 week

---

## Epic 13: Negotiation Round Tracking (NEW - Mebarek Feedback)

### US-MVP-47: Track Multiple Quote Rounds per Supplier

**As** Sarah  
**I want to** track multiple quote rounds from same supplier  
**So that** I can see price improvements over negotiation cycles

**Acceptance Criteria:**
- System automatically detects new quote round when supplier sends updated quote:
  - Same Project ID
  - Same supplier email
  - New quote file or updated pricing
- System assigns round number automatically:
  - Round 1: Initial quote (timestamp)
  - Round 2: Updated quote after negotiation (timestamp)
  - Round 3: Final quote (timestamp)
- System stores all rounds (no overwriting)
- System tracks what changed between rounds:
  - Price changes per cost category
  - Lead time changes
  - Terms changes
- I receive notification: "Supplier A submitted Round 2 quote - Price reduced by 5%"

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-14 (Negotiation Round Tracking)  
**Development Effort:** 1 week

---

### US-MVP-48: Compare Quote Rounds Side-by-Side

**As** Sarah  
**I want to** compare different quote rounds side-by-side  
**So that** I can see exactly what changed during negotiations

**Acceptance Criteria:**
- Comparison board includes "Negotiation Rounds" sheet
- I can select supplier and view all rounds:
  - Round 1 (Initial): Material €100, Process €50, Tooling €20K, Total €150
  - Round 2 (After negotiation): Material €95, Process €48, Tooling €18K, Total €143 (-5%)
  - Round 3 (Final): Material €92, Process €48, Tooling €18K, Total €140 (-7%)
- System highlights changes between rounds (color-coded)
- System calculates improvement per round: "Round 2: -5% vs Round 1, Round 3: -2% vs Round 2"
- System shows cumulative improvement: "Round 3: -7% vs Round 1"
- I can view rounds for all suppliers simultaneously
- System identifies best improvement: "Supplier A: 12% reduction from Round 1 to Round 3 (best improvement)"

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-14 (Negotiation Round Tracking)  
**Development Effort:** 1 week

---

### US-MVP-49: View Current vs Historical Rounds

**As** Sarah  
**I want to** switch between current round and historical rounds in comparison board  
**So that** I can analyze negotiation progress

**Acceptance Criteria:**
- Comparison board defaults to "Current Round" (latest quote from each supplier)
- I can switch to view historical rounds via dropdown:
  - "Current Round" (default)
  - "Round 1 (Initial)"
  - "Round 2"
  - "Round 3"
  - "All Rounds (Side-by-Side)"
- When viewing historical round, comparison board shows data from that round only
- I can compare same round across all suppliers
- I can export any round view to separate Excel file
- System tracks which round was used for final decision

**Priority:** P1 (Should Have)  
**Related Features:** REQ-MVP-14 (Negotiation Round Tracking)  
**Development Effort:** 3 days

---

## Epic 14: ESG/Sustainability Scoring (NEW - Mebarek Feedback)

### US-MVP-50: Capture ESG Scores from Suppliers

**As** Sarah  
**I want to** capture ESG/sustainability scores from suppliers  
**So that** I can evaluate suppliers on environmental and social responsibility

**Acceptance Criteria:**
- RFQ email requests ESG information from suppliers:
  - ECOVADIS score (0-100)
  - Internal Assessment score (0-100, if applicable)
  - Other certifications (ISO 14001, ISO 45001, etc.)
- System extracts ESG data from supplier quotes
- System validates score ranges (0-100)
- System handles missing ESG data gracefully (marked as "Not Provided")
- I can manually enter ESG scores if not provided by supplier
- ESG scores are stored per supplier (reused across RFQs)

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-15 (ESG/Sustainability Scoring)  
**Development Effort:** 3 days

---

### US-MVP-51: View ESG Scores in Comparison Board

**As** Sarah  
**I want to** see ESG scores alongside cost data in comparison board  
**So that** I can make holistic sourcing decisions

**Acceptance Criteria:**
- Comparison board includes ESG columns:
  - ECOVADIS Score (0-100)
  - Internal Assessment Score (0-100)
  - Certifications (list)
  - ESG Status (color-coded: green >70, yellow 50-70, red <50)
- System flags suppliers with low ESG scores (<50) with warning icon
- System displays certifications as badges/icons
- I can sort suppliers by ESG score
- I can filter suppliers by minimum ESG score (e.g., "Show only suppliers with ECOVADIS >60")
- Comparison board shows ESG score alongside cost and lead time

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-15 (ESG/Sustainability Scoring)  
**Development Effort:** 3 days

---

### US-MVP-52: Use ESG-Weighted Ranking

**As** Sarah  
**I want to** rank suppliers using ESG-weighted scoring  
**So that** I can balance cost and sustainability

**Acceptance Criteria:**
- Comparison board offers ranking options:
  - **Option 1: Price Only** (default): Rank by total cost only
  - **Option 2: Price + ESG (70/30)**: Weighted ranking (70% price, 30% ESG)
  - **Option 3: Price + ESG (50/50)**: Balanced ranking (50% price, 50% ESG)
  - **Option 4: Custom Weights**: I can set custom weights (e.g., 60% price, 40% ESG)
- System calculates weighted score:
  - Price score: (Best price / Supplier price) × 100
  - ESG score: Supplier ESG score (0-100)
  - Weighted score: (Price score × weight) + (ESG score × weight)
- System re-ranks suppliers based on weighted score
- I can switch between ranking options with one click
- System shows how ranking changes with different weights
- Example: "Supplier A: Rank #3 (price only) → Rank #1 (price + ESG 70/30)"

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-15 (ESG/Sustainability Scoring)  
**Development Effort:** 1 week

---

## Epic 15: Sign-off Governance Workflow (NEW - Mebarek Feedback)

### US-MVP-53: Initiate Sign-off Workflow Based on Spend Threshold

**As** Sarah  
**I want to** have system automatically determine required approvers based on RFQ value  
**So that** I comply with company governance policies

**Acceptance Criteria:**
- After making sourcing decision, system calculates total RFQ value (lifetime spend)
- System determines required approvers based on spend thresholds (configurable):
  - **<50K**: Buyer only (me)
  - **50K-100K**: Buyer + Commodity Buyer
  - **100K-250K**: Buyer + Commodity Buyer + Purchasing Manager
  - **250K-500K**: + Purchasing Director
  - **500K-1M**: + VP Purchasing
  - **>1M**: + VPGM (VP General Manager)
- System displays approval chain: "This RFQ requires approval from: You → Commodity Buyer → Purchasing Manager"
- I can add additional approvers if needed (PM, PMD, Sales, Plant, etc.)
- System validates I cannot skip required approvers
- System sends approval requests via email to each approver in sequence

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-16 (Sign-off Governance Workflow)  
**Development Effort:** 1 week

---

### US-MVP-54: Track Approval Status in Real-Time

**As** Sarah  
**I want to** track approval status in real-time  
**So that** I know where decision is in approval chain

**Acceptance Criteria:**
- Portal displays approval status dashboard:
  - Approval chain (visual flowchart)
  - Current status per approver: Pending / Approved / Rejected / Requested Changes
  - Timestamp per approval action
  - Comments from approvers (if any)
- System highlights current pending approver
- System shows completed approvals (green checkmark)
- System shows rejected approvals (red X with reason)
- I receive email notifications for each approval action:
  - "Commodity Buyer approved your RFQ decision"
  - "Purchasing Manager requested changes: Please review tooling cost justification"
- Dashboard updates in real-time (no page refresh needed)

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-16 (Sign-off Governance Workflow)  
**Development Effort:** 1 week

---

### US-MVP-55: Respond to Approval Requests with Changes

**As** Sarah  
**I want to** respond to approval requests that require changes  
**So that** I can address concerns and resubmit for approval

**Acceptance Criteria:**
- If approver requests changes, I receive email notification with:
  - Approver name and role
  - Specific concerns or questions
  - Requested changes
  - Deadline for response
- I can access RFQ in portal and make changes:
  - Update supplier selection
  - Add justification notes
  - Upload additional documentation
  - Revise cost analysis
- I can add response comments addressing each concern
- I click "Resubmit for Approval" button
- System sends updated approval request to same approver
- System tracks revision history (all changes logged)
- Approver receives notification: "Sarah resubmitted RFQ with requested changes"

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-16 (Sign-off Governance Workflow)  
**Development Effort:** 3 days

---

### US-MVP-56: View Complete Audit Trail for Compliance

**As** Sarah  
**I want to** view complete audit trail of all approval actions  
**So that** I can demonstrate compliance for audits

**Acceptance Criteria:**
- Portal displays complete audit trail per RFQ:
  - All approval requests sent (timestamp, recipient)
  - All approval actions (approved/rejected/requested changes, timestamp, approver)
  - All comments and justifications
  - All document uploads
  - All revisions and resubmissions
  - IP addresses of all actions (for security)
  - Final decision status (approved/rejected)
- Audit trail is immutable (cannot be edited or deleted)
- I can export audit trail to PDF (formatted report) or Excel (data table)
- Export includes digital signatures (if configured)
- Audit trail meets compliance requirements (SOX, ISO, etc.)
- System retains audit trail for 7 years (configurable)

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-16 (Sign-off Governance Workflow)  
**Development Effort:** 1 week

---

## Epic 16: Enhanced Logistics and Tooling Transparency (NEW - Mebarek Feedback)

### US-MVP-57: Capture Enhanced Logistics Details

**As** Sarah  
**I want to** capture detailed logistics information from suppliers  
**So that** I can compare total logistics costs accurately

**Acceptance Criteria:**
- RFQ email requests enhanced logistics information:
  - **Carton type**: Standard or Custom
  - **Euro Pallet required**: Yes/No
  - **Returnable Packaging required**: Yes/No (if yes, cost per unit)
  - **Cleaning required**: Yes/No (if yes, cost per unit)
  - Standard packaging cost
  - Transportation cost
  - IncoTerms
- System extracts all logistics fields from supplier quotes
- System validates completeness (flags if missing)
- System calculates total logistics cost per supplier:
  - Total Logistics = Packaging + Carton + Pallet + Returnable + Cleaning + Transportation
- Comparison board includes logistics cost breakdown
- I can compare logistics costs across suppliers

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-04 (Enhanced Logistics Fields)  
**Development Effort:** 3 days

---

### US-MVP-58: Ensure Tooling Amortization Transparency

**As** Sarah  
**I want to** have explicit tooling amortization breakdown from suppliers  
**So that** I can compare apples-to-apples (critical pain point)

**Acceptance Criteria:**
- RFQ email explicitly asks: "Is tooling amortization included in piece price? (Yes/No)"
- If Yes: "How much per piece is tooling amortization?"
- System extracts tooling amortization data:
  - Piece price (total)
  - Piece price (excluding tooling amortization)
  - Tooling amortization per piece
- System ensures fair comparison (all prices on same basis):
  - Preferred: All prices exclude tooling amortization
  - Alternative: All prices include tooling amortization (if supplier cannot separate)
- Comparison board displays explicit breakdown:
  - "Supplier A: Piece price €10.50 = €9.80 (ex-tooling) + €0.70 (tooling amortization)"
  - "Supplier B: Piece price €9.50 (tooling separate: €50,000 investment)"
- System flags if tooling amortization unclear: "Supplier C: Tooling amortization not specified - Request clarification 🔴"
- System sends automated follow-up if unclear

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-05 (Tooling Amortization Transparency)  
**Development Effort:** 1 week

---

### US-MVP-59: View Tooling Cost Savings

**As** Sarah  
**I want to** see tooling cost savings in comparison board  
**So that** I can demonstrate value of my sourcing decision

**Acceptance Criteria:**
- Comparison board calculates and displays tooling cost savings:
  - Best tooling cost across all suppliers
  - Average tooling cost across all suppliers
  - Target tooling cost (from my requirements)
  - Savings vs average: "Best tooling cost: €45K (€15K saved vs average €60K, 25% below average)"
  - Savings vs target: "Best tooling cost: €45K (€5K saved vs target €50K, 10% below target)"
- System displays savings prominently in summary section
- System tracks cumulative savings across all RFQs (project-level and portfolio-level)
- I can export savings report for management review
- Savings calculation includes tooling amortization impact on piece price

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-08 (Tooling Cost Savings Tracking)  
**Development Effort:** 3 days

---

## Epic 17: Target Price Comparison and Rejection Logic (NEW - Mebarek Feedback)

### US-MVP-60: Set Target Prices for RFQ

**As** Sarah  
**I want to** set target prices for each part in RFQ  
**So that** system can automatically flag overpriced quotes

**Acceptance Criteria:**
- During RFQ creation, I can enter target prices:
  - Target piece price (per part)
  - Target tooling cost (per part)
  - Target total cost (per part)
- Target prices are optional but recommended
- System stores target prices per RFQ
- Target prices are NOT shared with suppliers (internal only)
- I can update target prices anytime before making decision
- System uses target prices for automatic rejection logic

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-07 (Target Price Rejection Logic)  
**Development Effort:** 2 days

---

### US-MVP-61: Automatically Reject Overpriced Quotes

**As** Sarah  
**I want to** have system automatically reject quotes >10% above target  
**So that** I focus only on competitive quotes

**Acceptance Criteria:**
- System compares each supplier price to target price (if set)
- System applies rejection logic:
  - If supplier price > target + 10%: Status = "REJECTED" (red flag 🔴)
  - If supplier price > target + 5%: Status = "WARNING" (yellow flag ⚠️)
  - If supplier price ≤ target: Status = "ACCEPTABLE" (green flag ✓)
- System displays rejection reason: "Price 15% above target - REJECTED"
- Rejected quotes are excluded from comparison board by default
- I can view rejected quotes in separate "Rejected Quotes" sheet
- I can override rejection with justification (e.g., "Best lead time despite high price")
- System tracks override reason for audit trail
- System sends automated rejection email to supplier (optional, configurable)

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-07 (Target Price Rejection Logic)  
**Development Effort:** 1 week

---

### US-MVP-62: View Variance from Target Price

**As** Sarah  
**I want to** see variance from target price for all suppliers  
**So that** I can quickly identify best value

**Acceptance Criteria:**
- Comparison board includes "vs. Target" column:
  - Supplier A: €9.50 (-5% vs target €10.00) ✓
  - Supplier B: €10.80 (+8% vs target €10.00) ⚠️
  - Supplier C: €11.50 (+15% vs target €10.00) 🔴 REJECTED
- System color-codes variance:
  - Green: ≤ target
  - Yellow: target + 5-10%
  - Red: > target + 10%
- System sorts suppliers by variance from target (best first)
- System highlights best price: "Supplier A: Best price (5% below target)"
- I can filter by variance range (e.g., "Show only suppliers within 5% of target")

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-07 (Target Price Rejection Logic)  
**Development Effort:** 2 days

---

## Epic 18: Optional Features

### US-MVP-30: Access Simple Web Portal (Optional)

**As** Sarah  
**I want to** optionally access a simple web portal to view comparison board  
**So that** I can review data without downloading Excel

**Acceptance Criteria:**
- I receive link to web portal in email notification
- Portal displays read-only comparison board
- Portal requires login (SSO preferred)
- Portal shows same data as Excel (summary, details, anomalies)
- Portal is mobile-friendly (I can review on phone/tablet)
- Portal includes all new features:
  - Target price comparison
  - Supplier ranking
  - Multi-scenario views
  - BOM dashboard

**Priority:** P0 (Must Have) - Portal is mandatory per team discussion  
**Related Features:** Portal (Mixed Email + Portal Experience)  
**Development Effort:** 2 weeks

---

### US-MVP-31: Ask Questions via AI Chat (Optional)

**As** Sarah  
**I want to** ask questions about comparison data via AI chat  
**So that** I can get quick answers without manual analysis

**Acceptance Criteria:**
- Portal includes AI chat interface (Gemini or similar)
- I can ask questions like:
  - "Why is Supplier E flagged?"
  - "What's the average material cost?"
  - "Which supplier has the best tooling cost?"
  - "Show me multi-year projection for Supplier A"
  - "Compare volume scenarios for top 3 suppliers"
- AI has full context (all comparison data, BOM data, scenarios)
- AI provides clear, concise answers
- Chat is optional (Excel is primary interface)

**Priority:** P2 (Nice to Have - Optional)  
**Related Features:** Optional: AI Chat  
**Development Effort:** 2 days

---

## Summary Statistics

**Total User Stories:** 62 (increased from 38)
- **P0 (Must Have):** 54 stories (increased from 31)
- **P1 (Should Have):** 7 stories (increased from 6)
- **P2 (Nice to Have):** 1 story (unchanged)

**By Epic:**
- Epic 1 (RFQ Initiation - 3 Methods): 5 stories
- Epic 2 (Email Quote Intake): 2 stories
- Epic 3 (Multi-Format Extraction): 4 stories
- Epic 4 (Completeness Check & Automatic Quality Control): 4 stories
- Epic 5 (Normalization & Anomaly Detection): 7 stories
- Epic 6 (Incremental Comparison Board with Ranking): 5 stories
- Epic 6A (BOM-Level Project Analysis): 2 stories
- Epic 7 (Decision Making): 3 stories
- Epic 8 (Multi-Language & Currency): 3 stories
- **Epic 9 (Multi-Part RFQ Support): 3 stories (NEW)**
- **Epic 10 (Enhanced Project Details): 2 stories (NEW)**
- **Epic 11 (Supplier Communication Tracking): 4 stories (NEW)**
- **Epic 12 (Lead Time Milestone Tracking): 3 stories (NEW)**
- **Epic 13 (Negotiation Round Tracking): 3 stories (NEW)**
- **Epic 14 (ESG/Sustainability Scoring): 3 stories (NEW)**
- **Epic 15 (Sign-off Governance Workflow): 4 stories (NEW)**
- **Epic 16 (Enhanced Logistics & Tooling Transparency): 3 stories (NEW)**
- **Epic 17 (Target Price Comparison & Rejection Logic): 3 stories (NEW)**
- Epic 18 (Optional Features): 2 stories

**Key MVP Enhancements (Jan 2, 2026 - Mebarek Feedback):**
- ✅ **Multi-part RFQ support** (3 stories): Handle multiple parts per RFQ with package pricing and unit conversion
- ✅ **Enhanced project details** (2 stories): Project Name, Platform, Customer, Delivery Location
- ✅ **Supplier communication tracking** (4 stories): Complete audit trail, automated reminders, response status dashboard
- ✅ **Lead time milestone tracking** (3 stories): 7 milestones with target vs actual comparison
- ✅ **Negotiation round tracking** (3 stories): Track multiple quote rounds and price improvements
- ✅ **ESG/Sustainability scoring** (3 stories): ECOVADIS scores, ESG-weighted ranking
- ✅ **Sign-off governance workflow** (4 stories): Multi-level approvals with complete audit trail
- ✅ **Enhanced logistics & tooling** (3 stories): Detailed logistics fields, tooling amortization transparency, savings tracking
- ✅ **Target price rejection logic** (3 stories): Auto-reject overpriced quotes, variance tracking

**Previous MVP Features:**
- ✅ Agent-based approach (no plugin installation required)
- ✅ 3 RFQ creation methods: manual, duplicate, file upload
- ✅ Portal + Email mixed experience
- ✅ Volume scenarios and multi-year projections
- ✅ BOM-level project analysis
- ✅ Immediate automatic quality control responses
- ✅ Supplier ranking with target price comparison
- ✅ Multi-language support (English, Spanish, French, German, Mandarin)
- ✅ Company domain emails (purchasingrfq@companyname.com)

**Total Development Effort:** ~15-16 weeks (4 months) - increased from 14 weeks due to Mebarek feedback enhancements

**Value Delivered:**
- **Time Savings:** 70% reduction in manual data entry (10-15 hours saved per RFQ)
- **Better Decisions:** Compare 6-8 suppliers instead of 3-4 (2x increase)
- **Fair Comparison:** Explicit tooling amortization, enhanced logistics, apples-to-apples comparison
- **Complete Audit Trail:** Communication tracking, sign-off governance, compliance-ready
- **Strategic Insights:** Lead time milestones, negotiation rounds, ESG scoring, multi-scenario analysis
- **Risk Mitigation:** Target price rejection, anomaly detection, governance workflow

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 26, 2024 | Kiro | Initial MVP user stories for Sarah (Buyer) |
| 2.0 | Dec 30, 2024 | Kiro | Updated based on team discussion (Dec 29): agent approach, 3 RFQ methods, BOM analysis, multi-scenario, ranking, multi-language |
| 3.0 | Jan 2, 2026 | Kiro | Added Mebarek feedback enhancements: multi-part RFQs, communication tracking, lead time milestones, negotiation rounds, ESG scoring, sign-off governance |
| 4.0 | Jan 2, 2026 | Kiro | Comprehensive enhancement with 24 new user stories across 9 new epics based on Mebarek feedback analysis |
