# User Stories for MVP Persona: System Administrator

**Document Version:** 3.0  
**Date:** January 2, 2026  
**Based on:** MVP Product Requirements Document v3.0 + Mebarek Feedback Analysis (Jan 2, 2026)

---

## Overview

This document contains user stories for **System Administrator**, responsible for setup, configuration, and monitoring of the Optiroq MVP system, including new features for dynamic field management, communication tracking, ESG scoring, and sign-off governance.

**MVP Scope:** Setup customer environment → configure company domain email → configure Master Field List → setup sign-off governance rules → monitor system → update knowledge base → track communication metrics

**Persona Summary:**
- **Role:** IT/Operations Administrator
- **Experience:** IT professional
- **MVP Goals:** Quick setup, reliable monitoring, minimal maintenance, ensure compliance
- **Main Pain Points:** Complex configurations, unclear errors, manual updates, compliance tracking

**Key MVP Enhancements (Jan 2, 2026 - Mebarek Feedback):**
- ✅ **Master Field List configuration**: Manage organization-wide field definitions
- ✅ **Sign-off governance setup**: Configure approval thresholds and workflows
- ✅ **Communication tracking monitoring**: Track supplier response rates and reminder effectiveness
- ✅ **ESG data management**: Configure ESG scoring thresholds and weights
- ✅ **Lead time milestone configuration**: Setup milestone definitions per commodity
- ✅ **Target price management**: Configure rejection thresholds (5%, 10%)
- ✅ **Enhanced logistics fields**: Configure logistics requirements per commodity

**Key MVP Changes (Dec 29, 2024):**
- ✅ No plugin deployment (agent-based approach)
- ✅ Company domain email configuration (purchasingrfq@companyname.com)
- ✅ Portal setup and user management
- ✅ Multi-language configuration
- ✅ BOM dashboard setup

---

## Epic 1: Customer Onboarding

### US-MVP-A01: Configure Company Domain Email

**As** System Administrator  
**I want to** configure company domain email for RFQ agent  
**So that** all supplier communication comes from customer's domain (not optiroq.com)

**Acceptance Criteria:**
- I work with customer IT to create dedicated email: purchasingrfq@companyname.com (or quality@companyname.com)
- I configure IMAP access for inbox monitoring
- I configure SMTP for sending RFQ emails and follow-ups
- I test email delivery (send/receive)
- Email appears to come from customer domain (maintains branding)
- Prevents spam filter issues (not from optiroq.com)
- Buyer is CC'd on all communications
- Setup takes <1 hour per customer

**Priority:** P0 (Must Have)  
**Related Features:** Feature 1 (Email Quote Intake)  
**Development Effort:** 2 days (infrastructure setup)

---

### US-MVP-A02: Setup Portal Access and User Management

**As** System Administrator  
**I want to** setup portal access for buyers  
**So that** buyers can create RFQs and view comparison boards

**Acceptance Criteria:**
- I can create user accounts for buyers
- I can configure SSO (Single Sign-On) with customer's identity provider
- I can assign roles and permissions (buyer, admin, read-only)
- I can configure company branding (logo, colors)
- I can test portal access before rollout
- Setup takes <2 hours per organization

**Priority:** P0 (Must Have)  
**Related Features:** Feature 0 (Portal Access)  
**Development Effort:** 1 week (portal authentication)

---

### US-MVP-A03: Configure Knowledge Base and Multi-Language Support

**As** System Administrator  
**I want to** configure knowledge base for customer's commodity types and languages  
**So that** extraction and validation work correctly in multiple languages

**Acceptance Criteria:**
- I can configure:
  - Mandatory fields by commodity type (aluminum, steel, plastic, etc.)
  - Validation rules (scrap ratio thresholds, etc.)
  - Price indices (material prices for anomaly detection)
  - Language preferences (English, Spanish, French, German, Mandarin)
  - Currency preferences (EUR, USD, GBP, JPY, CNY)
  - Target prices by project (for comparison)
- I can upload JSON configuration files
- I can test configuration with sample quotes
- Configuration takes <3 hours per customer

**Priority:** P0 (Must Have)  
**Related Features:** Feature 3 (Modular LLM Extraction), Feature 6 (Anomaly Detection), Feature 8 (Multi-Language)  
**Development Effort:** 1 week (configuration interface)

---

## Epic 2: Monitoring & Maintenance

### US-MVP-A04: Monitor Email Intake

**As** System Administrator  
**I want to** monitor email intake and processing  
**So that** I can ensure system is working correctly

**Acceptance Criteria:**
- I can view dashboard showing:
  - Emails received (last 24 hours, last 7 days)
  - Emails processed successfully
  - Emails failed (with error details)
  - Processing time per email
- I receive alerts for:
  - Email delivery failures
  - Processing failures (extraction errors)
  - High processing time (>5 minutes)
- Dashboard updates in real-time

**Priority:** P0 (Must Have)  
**Related Features:** Feature 1 (Email Quote Intake)  
**Development Effort:** 1 week (monitoring dashboard)

---

### US-MVP-A05: Monitor Extraction Accuracy

**As** System Administrator  
**I want to** monitor extraction accuracy metrics  
**So that** I can identify issues and improve system

**Acceptance Criteria:**
- I can view metrics:
  - Extraction accuracy (% of fields extracted correctly)
  - Confidence scores (average, distribution)
  - Low-confidence extractions (requiring manual review)
  - Extraction time per supplier
- I can drill down by:
  - Customer
  - Commodity type
  - File format (Excel, PDF, CSV)
- I can export metrics for analysis

**Priority:** P1 (Should Have)  
**Related Features:** Feature 3 (Modular LLM Extraction)  
**Development Effort:** 3 days (metrics collection)

---

### US-MVP-A06: Update Price Indices

**As** System Administrator  
**I want to** update price indices periodically  
**So that** anomaly detection remains accurate

**Acceptance Criteria:**
- I can update price indices monthly/quarterly
- I can upload new JSON file with updated prices:
  - Steel: $1000/ton → $1050/ton
  - Aluminum: $2500/ton → $2600/ton
  - Plastic: $2000/ton → $2100/ton
- System validates JSON format before applying
- I can preview changes before applying
- Update takes <10 minutes

**Priority:** P0 (Must Have)  
**Related Features:** Feature 6 (Anomaly Detection)  
**Development Effort:** 2 days (update interface)

---

### US-MVP-A07: Troubleshoot Failed Extractions

**As** System Administrator  
**I want to** troubleshoot failed extractions  
**So that** I can resolve issues quickly

**Acceptance Criteria:**
- I can view failed extractions with:
  - Error message (clear, actionable)
  - Original file (Excel, PDF, CSV)
  - Extracted data (partial)
  - LLM logs (for debugging)
- I can manually re-process failed extractions
- I can adjust extraction parameters if needed
- I can escalate to development team if needed

**Priority:** P0 (Must Have)  
**Related Features:** Feature 3 (Modular LLM Extraction)  
**Development Effort:** 3 days (troubleshooting interface)

---

## Epic 3: System Health

### US-MVP-A08: Monitor System Performance

**As** System Administrator  
**I want to** monitor system performance metrics  
**So that** I can ensure system is responsive

**Acceptance Criteria:**
- I can view metrics:
  - Email processing time (average, p95, p99)
  - LLM API latency
  - File conversion time
  - Excel generation time
- I receive alerts for:
  - High latency (>5 minutes)
  - API errors (LLM, email, storage)
  - Resource utilization (CPU, memory, storage)
- Dashboard shows trends over time

**Priority:** P1 (Should Have)  
**Related Features:** All features  
**Development Effort:** 1 week (performance monitoring)

---

### US-MVP-A09: Review System Logs

**As** System Administrator  
**I want to** review system logs for debugging  
**So that** I can diagnose issues

**Acceptance Criteria:**
- I can view logs:
  - Email intake logs
  - Extraction logs (LLM calls, responses)
  - Normalization logs
  - Anomaly detection logs
  - Excel generation logs
- I can filter logs by:
  - Customer
  - Project ID
  - Supplier
  - Time range
  - Log level (info, warning, error)
- I can export logs for analysis

**Priority:** P1 (Should Have)  
**Related Features:** All features  
**Development Effort:** 3 days (log aggregation)

---

## Epic 4: Customer Support

### US-MVP-A10: Assist Buyers with Portal Issues

**As** System Administrator  
**I want to** assist buyers with portal access and usage issues  
**So that** buyers can use system successfully

**Acceptance Criteria:**
- I can access portal documentation
- I can troubleshoot common issues:
  - Login problems (SSO, password reset)
  - RFQ creation issues (file upload, duplication)
  - Comparison board access
  - BOM dashboard issues
- I can remotely diagnose portal issues (with buyer's permission)
- I can escalate to development team if needed

**Priority:** P0 (Must Have)  
**Related Features:** Feature 0 (Portal)  
**Development Effort:** 2 days (documentation + troubleshooting guide)

---

### US-MVP-A11: Assist Buyers with Extraction Issues

**As** System Administrator  
**I want to** assist buyers with extraction accuracy issues  
**So that** buyers trust system results

**Acceptance Criteria:**
- I can review buyer's extraction results
- I can identify issues:
  - Low-confidence extractions
  - Missing fields
  - Incorrect conversions
- I can manually correct extractions if needed
- I can adjust knowledge base if needed (improve future extractions)
- I can provide feedback to development team

**Priority:** P0 (Must Have)  
**Related Features:** Feature 3 (Modular LLM Extraction)  
**Development Effort:** 3 days (support interface)

---

## Epic 5: Dynamic Field Management (NEW - Mebarek Feedback)

### US-MVP-A12: Configure Master Field List

**As** System Administrator  
**I want to** configure organization-wide Master Field List  
**So that** buyers have consistent field definitions across all RFQs

**Acceptance Criteria:**
- I can access Master Field List configuration interface
- I can add new fields with attributes:
  - Field Name (e.g., "Coating Thickness")
  - Field Type (text, number, currency, date, dropdown)
  - Unit (if applicable: mm, kg, USD, etc.)
  - Validation Rules (min/max, required format, regex)
  - Description (help text for buyers/suppliers)
  - Commodity Types (which commodities use this field: plastic, metal, etc.)
- I can edit existing field attributes
- I can mark fields as "deprecated" (hidden from new RFQs but preserved in historical data)
- I can assign fields to commodity types (plastic, metal, electronics, etc.)
- Changes take effect immediately for new RFQs
- Historical RFQs retain their original field configurations

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-00C (Master Field List Configuration)  
**Development Effort:** 1 week

---

### US-MVP-A13: Review Field Usage Analytics

**As** System Administrator  
**I want to** view field usage analytics  
**So that** I can optimize Master Field List based on actual usage

**Acceptance Criteria:**
- I can view analytics dashboard showing:
  - Most frequently used fields (across all RFQs)
  - Least used fields (candidates for deprecation)
  - Fields with high correction rates (need better validation)
  - Fields with low extraction accuracy (need better LLM prompts)
  - Field usage by commodity type
  - Field usage by buyer
- I can export analytics to Excel for analysis
- Analytics help me identify:
  - Duplicate fields (consolidation opportunities)
  - Missing fields (addition candidates)
  - Poorly defined fields (improvement opportunities)

**Priority:** P1 (Should Have)  
**Related Features:** REQ-MVP-00C (Master Field List Configuration)  
**Development Effort:** 3 days

---

### US-MVP-A14: Approve Field Addition Requests

**As** System Administrator  
**I want to** review and approve field addition requests from buyers  
**So that** I prevent schema chaos while enabling flexibility

**Acceptance Criteria:**
- Buyers can request new fields via portal
- I receive notification: "Buyer Sarah requested new field: 'Coating Thickness'"
- I can review request:
  - Field name and description
  - Requested by (buyer name)
  - Justification (why needed)
  - Similar existing fields (system suggests)
- I can take actions:
  - **Approve**: Add field to Master List
  - **Reject**: Decline with reason (e.g., "Use existing field 'Surface Treatment'")
  - **Request Changes**: Ask buyer to clarify or modify request
- Buyer receives notification of decision
- Approved fields become available immediately

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-00C (Master Field List Configuration)  
**Development Effort:** 1 week

---

## Epic 6: Sign-off Governance Configuration (NEW - Mebarek Feedback)

### US-MVP-A15: Configure Approval Thresholds

**As** System Administrator  
**I want to** configure approval thresholds based on spend levels  
**So that** sign-off governance matches company policies

**Acceptance Criteria:**
- I can configure approval thresholds per customer:
  - <50K: Buyer only
  - 50K-100K: Buyer + Commodity Buyer
  - 100K-250K: Buyer + Commodity Buyer + Purchasing Manager
  - 250K-500K: + Purchasing Director
  - 500K-1M: + VP Purchasing
  - >1M: + VPGM
- I can customize thresholds per customer (different companies have different policies)
- I can add custom approval roles (e.g., "Quality Manager", "Plant Manager")
- I can configure approval sequence (sequential vs parallel)
- I can configure approval deadlines (e.g., 2 days per approver)
- Configuration takes effect immediately for new RFQs

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-16 (Sign-off Governance Workflow)  
**Development Effort:** 1 week

---

### US-MVP-A16: Setup Approver Directory

**As** System Administrator  
**I want to** maintain approver directory with roles and contact information  
**So that** system can route approval requests correctly

**Acceptance Criteria:**
- I can maintain approver directory:
  - Name, Email, Role (Commodity Buyer, Purchasing Manager, etc.)
  - Approval authority (spend threshold)
  - Backup approver (if primary unavailable)
  - Active/Inactive status
- I can assign approvers to organizational units (e.g., "North America", "Europe")
- I can configure out-of-office rules (auto-route to backup)
- I can bulk import approvers from CSV or LDAP
- System validates approver email addresses
- Changes take effect immediately

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-16 (Sign-off Governance Workflow)  
**Development Effort:** 1 week

---

### US-MVP-A17: Monitor Approval Workflow Performance

**As** System Administrator  
**I want to** monitor approval workflow performance  
**So that** I can identify bottlenecks and improve process

**Acceptance Criteria:**
- I can view approval metrics dashboard:
  - Average approval time per role
  - Approval bottlenecks (which role delays most)
  - Approval rejection rate per role
  - Overdue approvals (past deadline)
  - Approval volume per approver
- I can drill down by:
  - Time period (last week, last month, last quarter)
  - Organizational unit
  - Spend threshold
  - Approver
- I can export metrics to Excel for analysis
- Metrics help me optimize approval workflows

**Priority:** P1 (Should Have)  
**Related Features:** REQ-MVP-16 (Sign-off Governance Workflow)  
**Development Effort:** 1 week

---

## Epic 7: Communication Tracking Monitoring (NEW - Mebarek Feedback)

### US-MVP-A18: Monitor Supplier Response Rates

**As** System Administrator  
**I want to** monitor supplier response rates across all RFQs  
**So that** I can identify communication issues and improve supplier engagement

**Acceptance Criteria:**
- I can view supplier response metrics dashboard:
  - Overall response rate (% of suppliers who responded)
  - Average response time (days from RFQ to response)
  - Response rate by supplier (identify non-responsive suppliers)
  - Response rate by buyer (identify buyer communication issues)
  - Reminder effectiveness (response rate after 1st/2nd/3rd reminder)
- I can drill down by:
  - Time period
  - Commodity type
  - Buyer
  - Supplier
- I can export metrics to Excel for analysis
- Metrics help me optimize reminder schedules

**Priority:** P1 (Should Have)  
**Related Features:** REQ-MVP-12 (Supplier Communication Tracking)  
**Development Effort:** 1 week

---

### US-MVP-A19: Configure Reminder Schedules

**As** System Administrator  
**I want to** configure reminder schedules per customer  
**So that** reminders match customer communication preferences

**Acceptance Criteria:**
- I can configure reminder schedule per customer:
  - 1st reminder: X days after RFQ (default: 3 days)
  - 2nd reminder: Y days after RFQ (default: 5 days)
  - 3rd reminder: Z days after RFQ (default: 7 days)
  - Maximum reminders: N (default: 3)
- I can customize reminder email templates
- I can enable/disable reminders per customer
- I can configure reminder tone (professional, urgent, friendly)
- Configuration takes effect immediately for new RFQs

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-12 (Supplier Communication Tracking)  
**Development Effort:** 3 days

---

### US-MVP-A20: Review Communication Audit Logs

**As** System Administrator  
**I want to** review communication audit logs for compliance  
**So that** I can demonstrate system is tracking all communications correctly

**Acceptance Criteria:**
- I can access communication audit logs:
  - All RFQ emails sent (timestamp, recipient, content)
  - All supplier responses received (timestamp, sender, attachments)
  - All reminder emails sent (timestamp, recipient)
  - All follow-up emails sent (timestamp, recipient)
- I can filter logs by:
  - Date range
  - Project ID
  - Buyer
  - Supplier
  - Communication type (RFQ, reminder, follow-up, response)
- I can export logs to CSV for compliance audits
- Logs are immutable (cannot be edited or deleted)
- Logs are retained for 7 years (configurable)

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-12 (Supplier Communication Tracking)  
**Development Effort:** 3 days

---

## Epic 8: ESG and Target Price Configuration (NEW - Mebarek Feedback)

### US-MVP-A21: Configure ESG Scoring Thresholds

**As** System Administrator  
**I want to** configure ESG scoring thresholds and weights  
**So that** ESG evaluation matches customer sustainability policies

**Acceptance Criteria:**
- I can configure ESG thresholds per customer:
  - Minimum ECOVADIS score (e.g., 50, 60, 70)
  - ESG weighting in ranking (e.g., 70% price, 30% ESG)
  - Required certifications (ISO 14001, ISO 45001, etc.)
  - ESG status thresholds (green >70, yellow 50-70, red <50)
- I can enable/disable ESG-weighted ranking
- I can configure ESG data sources (ECOVADIS, internal assessments, etc.)
- Configuration takes effect immediately for new RFQs
- Historical RFQs retain their original ESG configurations

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-15 (ESG/Sustainability Scoring)  
**Development Effort:** 3 days

---

### US-MVP-A22: Configure Target Price Rejection Thresholds

**As** System Administrator  
**I want to** configure target price rejection thresholds  
**So that** automatic rejection matches customer procurement policies

**Acceptance Criteria:**
- I can configure rejection thresholds per customer:
  - Warning threshold (default: target + 5%)
  - Rejection threshold (default: target + 10%)
  - Auto-send rejection email (yes/no)
  - Allow buyer override (yes/no)
- I can customize rejection email templates
- I can enable/disable automatic rejection per customer
- Configuration takes effect immediately for new RFQs
- I can view rejection statistics (% of quotes rejected, by threshold)

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-07 (Target Price Rejection Logic)  
**Development Effort:** 3 days

---

### US-MVP-A23: Monitor Target Price Accuracy

**As** System Administrator  
**I want to** monitor target price accuracy across RFQs  
**So that** I can help buyers set realistic targets

**Acceptance Criteria:**
- I can view target price metrics dashboard:
  - Average variance from target (% above/below)
  - % of quotes within target
  - % of quotes rejected (above threshold)
  - Target accuracy by commodity type
  - Target accuracy by buyer
- I can identify buyers who set unrealistic targets (high rejection rate)
- I can provide feedback to buyers: "Your targets are 20% below market average"
- Metrics help improve target price setting

**Priority:** P1 (Should Have)  
**Related Features:** REQ-MVP-07 (Target Price Rejection Logic)  
**Development Effort:** 3 days

---

## Epic 9: Lead Time and Logistics Configuration (NEW - Mebarek Feedback)

### US-MVP-A24: Configure Lead Time Milestones per Commodity

**As** System Administrator  
**I want to** configure lead time milestones per commodity type  
**So that** buyers have appropriate milestone templates

**Acceptance Criteria:**
- I can configure milestone templates per commodity:
  - **Plastic parts**: Sample A, Sample B, Prototype, Off-tool, PPAP, SOP (6 milestones)
  - **Metal parts**: Sample A, Sample B/C/D, Prototype, Off-tool, Off-tool process, PPAP, SOP (7 milestones)
  - **Electronics**: Prototype, EVT, DVT, PVT, MP (5 milestones)
- I can customize milestone names per customer
- I can set default target lead times per milestone
- I can mark milestones as required/optional
- Buyers can select appropriate template during RFQ creation
- Configuration takes effect immediately for new RFQs

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-13 (Lead Time Milestone Tracking)  
**Development Effort:** 1 week

---

### US-MVP-A25: Configure Enhanced Logistics Requirements

**As** System Administrator  
**I want to** configure logistics requirements per commodity type  
**So that** buyers request appropriate logistics information

**Acceptance Criteria:**
- I can configure logistics fields per commodity:
  - **All commodities**: Packaging, Transportation, IncoTerms
  - **Bulk materials**: Carton type, Euro Pallet, Returnable Packaging
  - **Sensitive parts**: Cleaning required, ESD packaging
  - **Hazardous materials**: Special handling, MSDS required
- I can mark logistics fields as required/optional per commodity
- I can set default values (e.g., "Euro Pallet: Yes" for European customers)
- Configuration takes effect immediately for new RFQs
- Buyers can override defaults per RFQ

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-04 (Enhanced Logistics Fields)  
**Development Effort:** 3 days

---

## Summary Statistics

**Total User Stories:** 25 (increased from 11)
- **P0 (Must Have):** 17 stories (increased from 7)
- **P1 (Should Have):** 8 stories (increased from 4)

**By Epic:**
- Epic 1 (Customer Onboarding): 3 stories
- Epic 2 (Monitoring & Maintenance): 4 stories
- Epic 3 (System Health): 2 stories
- Epic 4 (Customer Support): 2 stories
- **Epic 5 (Dynamic Field Management): 3 stories (NEW)**
- **Epic 6 (Sign-off Governance Configuration): 3 stories (NEW)**
- **Epic 7 (Communication Tracking Monitoring): 3 stories (NEW)**
- **Epic 8 (ESG and Target Price Configuration): 3 stories (NEW)**
- **Epic 9 (Lead Time and Logistics Configuration): 2 stories (NEW)**

**Key Enhancements (Jan 2, 2026 - Mebarek Feedback):**
- ✅ **Master Field List configuration**: Manage organization-wide field definitions (3 stories)
- ✅ **Sign-off governance setup**: Configure approval thresholds and workflows (3 stories)
- ✅ **Communication tracking monitoring**: Track supplier response rates and reminder effectiveness (3 stories)
- ✅ **ESG data management**: Configure ESG scoring thresholds and weights (3 stories)
- ✅ **Lead time milestone configuration**: Setup milestone definitions per commodity (2 stories)
- ✅ **Target price management**: Configure rejection thresholds (included in Epic 8)
- ✅ **Enhanced logistics fields**: Configure logistics requirements per commodity (included in Epic 9)

**Key Responsibilities:**
- ✅ Customer onboarding (company domain email, portal setup, knowledge base)
- ✅ System monitoring (email intake, extraction accuracy, performance)
- ✅ Maintenance (price indices updates, troubleshooting)
- ✅ Customer support (portal issues, extraction issues)
- ✅ **Dynamic field management** (Master Field List, field approval)
- ✅ **Governance configuration** (approval thresholds, approver directory)
- ✅ **Communication monitoring** (response rates, reminder effectiveness)
- ✅ **ESG and target price setup** (thresholds, weights, rejection logic)
- ✅ **Milestone and logistics configuration** (templates, requirements)

**Time Commitment:**
- **Onboarding:** 6-8 hours per customer (one-time) - increased from 4-6 hours due to additional configurations
- **Monitoring:** 2-3 hours per week (ongoing) - increased from 1-2 hours due to additional metrics
- **Maintenance:** 2-3 hours per month (price indices, field management, governance updates)
- **Support:** Variable (as needed)

**Key Changes (Jan 2, 2026 - Mebarek Feedback):**
- ✅ Added Master Field List configuration and management
- ✅ Added sign-off governance setup and monitoring
- ✅ Added communication tracking monitoring and analytics
- ✅ Added ESG scoring configuration
- ✅ Added target price rejection configuration
- ✅ Added lead time milestone templates
- ✅ Added enhanced logistics configuration

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 26, 2024 | Kiro | Initial MVP user stories for System Administrator |
| 2.0 | Dec 30, 2024 | Kiro | Updated based on team discussion (Dec 29): removed plugin, added portal, company domain email |
| 3.0 | Jan 2, 2026 | Kiro | Enhanced with Mebarek feedback: dynamic field management, sign-off governance, communication tracking, ESG configuration, lead time milestones, enhanced logistics (14 new stories) |
