# MVP User Stories - Overview

**Document Version:** 2.0  
**Date:** December 30, 2024  
**Based on:** MVP Product Requirements Document v2.0 + Team Discussion (Dec 29, 2024)

---

## Overview

This folder contains comprehensive user stories for the **MVP scope** of Optiroq. The MVP focuses on the killer feature: automated email quote intake, extraction, normalization, and comparison.

**MVP Scope:** Agent-based RFQ creation (3 methods) → email quote intake from company domain → modular LLM extraction with auto-fill → immediate quality control → normalized comparison board + anomaly flags + supplier ranking + BOM-level analysis + multi-scenario support

**Key MVP Changes (Dec 29, 2024):**
- ✅ Agent-based approach (no plugin installation required)
- ✅ 3 RFQ creation methods: manual, duplicate, file upload with auto-parsing
- ✅ Portal + Email mixed experience (portal is mandatory)
- ✅ Volume scenarios and multi-year projections
- ✅ BOM-level project analysis
- ✅ Immediate automatic quality control responses
- ✅ Supplier ranking with target price comparison
- ✅ Multi-language support (English, Spanish, French, German, Mandarin)
- ✅ Company domain emails (purchasingrfq@companyname.com, not optiroq.com)
- ✅ Live exchange rate integration

---

## Documents in This Folder

### 1. MVP_Actors.md
Defines the actors (personas) for the MVP scope:
- **Sarah Chen** - Project Buyer (Primary Actor)
- **Raj Patel** - Supplier Contact (Secondary Actor)
- **System Administrator** - IT/Operations (Setup & Monitoring)

Also documents actors NOT in MVP scope (Elena, James, Marcus).

### 2. Sarah (buyer) MVP user stories.md
**38 user stories** for Sarah (Project Buyer), organized into 9 epics:
- Epic 1: RFQ Initiation (Agent-Based - 3 Methods) - 5 stories (NEW: manual, duplicate, file upload)
- Epic 2: Email Quote Intake & Monitoring - 2 stories (updated for company domain)
- Epic 3: Multi-Format Extraction & Normalization - 4 stories
- Epic 4: Completeness Check & Automatic Quality Control - 4 stories (NEW: immediate responses)
- Epic 5: Normalization & Anomaly Detection - 7 stories
- Epic 6: Incremental Comparison Board with Supplier Ranking - 5 stories (NEW: target price, ranking)
- Epic 6A: BOM-Level Project Analysis - 2 stories (NEW)
- Epic 7: Decision Making & Export - 3 stories
- Epic 8: Multi-Language and Currency Support - 3 stories (NEW)
- Epic 9: Optional Features - 2 stories (portal now mandatory)

### 3. Raj (supplier) MVP user stories.md
**11 user stories** for Raj (Supplier Contact), organized into 5 epics:
- Epic 1: Receiving RFQs - 2 stories
- Epic 2: Preparing Quotations - 2 stories
- Epic 3: Sending Quotations - 2 stories
- Epic 4: Responding to Follow-ups - 4 stories
- Epic 5: Quotation Status - 1 story

### 4. System Admin MVP user stories.md
**11 user stories** for System Administrator, organized into 4 epics:
- Epic 1: Customer Onboarding - 3 stories (updated: company domain email, portal setup)
- Epic 2: Monitoring & Maintenance - 4 stories
- Epic 3: System Health - 2 stories
- Epic 4: Customer Support - 2 stories (updated: portal support, not plugin)

---

## Total User Stories Summary

| Actor | Total Stories | P0 (Must Have) | P1 (Should Have) | P2 (Nice to Have) |
|-------|--------------|----------------|------------------|-------------------|
| **Sarah (Buyer)** | 38 | 31 | 6 | 1 |
| **Raj (Supplier)** | 11 | 7 | 3 | 1 |
| **System Admin** | 11 | 7 | 4 | 0 |
| **TOTAL** | **60** | **45** | **13** | **2** |

**Changes from v1.0:**
- Total stories increased from 52 to 60 (+8 stories)
- P0 stories increased from 38 to 45 (+7 stories)
- Reflects new requirements from team discussion

---

## User Story Mapping to Features

### Feature 0: Agent-Based RFQ Creation (3 Methods)
- US-MVP-01: Access Optiroq Portal
- US-MVP-02A: Create RFQ Manually from Scratch
- US-MVP-02B: Duplicate Existing RFQ with Modifications (KEY SELLING POINT)
- US-MVP-02C: Create RFQ from Uploaded Files (Auto-Parsing)
- US-MVP-03: Review and Send RFQ Package
- US-MVP-04: Track RFQ via Project ID
- US-MVP-A02: Setup Portal Access and User Management

### Feature 1: Email Quote Intake (Company Domain)
- US-MVP-05: Monitor Company Domain Inbox for Supplier Responses
- US-MVP-06: Extract Attachments from Supplier Emails
- US-MVP-S05: Send Quotation via Email
- US-MVP-S06: Receive Confirmation of Receipt
- US-MVP-A01: Configure Company Domain Email

### Feature 2: File Format Conversion
- US-MVP-07: Extract Data from Excel Files
- US-MVP-08: Extract Data from PDF Files
- US-MVP-09: Extract Data from CSV Files
- US-MVP-S03: Use My Own Quotation Format

### Feature 3: Modular LLM Extraction with Auto-Fill
- US-MVP-07: Extract Data from Excel Files (continued)
- US-MVP-10: Review Low-Confidence Extractions
- US-MVP-A03: Configure Knowledge Base and Multi-Language Support
- US-MVP-A05: Monitor Extraction Accuracy
- US-MVP-A07: Troubleshoot Failed Extractions
- US-MVP-A11: Assist Buyers with Extraction Issues

### Feature 4: Completeness Check & Immediate Quality Control
- US-MVP-11: Detect Missing Mandatory Fields
- US-MVP-12: Detect Hidden Costs (Embedded Tooling)
- US-MVP-13: Immediate Automatic Quality Control Responses (NEW)
- US-MVP-14: Track Follow-up Responses
- US-MVP-S04: Include All Required Information
- US-MVP-S07: Receive Follow-up for Missing Information
- US-MVP-S08: Provide Additional Information
- US-MVP-S09: Clarify Embedded Tooling Costs
- US-MVP-S10: Receive Reminder if No Response
- US-MVP-S11: Know When Quotation is Complete

### Feature 5: Normalization
- US-MVP-15: Normalize Currency Across Suppliers
- US-MVP-16: Normalize Units Across Suppliers
- US-MVP-17: Standardize Cost Categories

### Feature 6: Anomaly Detection
- US-MVP-18: Detect Material Cost Outliers
- US-MVP-19: Validate Against Price Indices
- US-MVP-20: Detect Excessive Scrap Ratio
- US-MVP-21: Detect Inconsistent Data
- US-MVP-A06: Update Price Indices

### Feature 7: Incremental Comparison Board with Supplier Ranking
- US-MVP-22: Receive Incremental Excel Updates
- US-MVP-23: Review Summary with Target Price and Supplier Ranking (NEW)
- US-MVP-23A: View Multi-Scenario Analysis (NEW)
- US-MVP-24: Drill Down to Detailed Breakdown
- US-MVP-25: Review Anomaly Explanations
- US-MVP-26: Access Raw Data and Email Thread
- US-MVP-27: Make Sourcing Decision
- US-MVP-28: Export to My Own Tools
- US-MVP-29: Send Rejection Emails to Non-Nominated Suppliers

### Feature 7A: BOM-Level Project Analysis (NEW)
- US-MVP-26A: View Project-Level BOM Dashboard
- US-MVP-26B: Upload Existing Parts Data from ERP

### Feature 8: Multi-Language and Currency Support (NEW)
- US-MVP-32: Select RFQ Language
- US-MVP-33: Switch Currency Display
- US-MVP-34: Track System Improvement Metrics

### Feature 9: Portal (Mandatory)
- US-MVP-30: Access Simple Web Portal (now P0 - mandatory)
- US-MVP-31: Ask Questions via AI Chat (optional)
- US-MVP-A10: Assist Buyers with Portal Issues

### System Health & Monitoring
- US-MVP-A04: Monitor Email Intake
- US-MVP-A08: Monitor System Performance
- US-MVP-A09: Review System Logs

---

## Development Priority

### Phase 1 (Month 1): Core Infrastructure & RFQ Creation
**Focus:** Portal + Agent Setup + RFQ Creation (3 Methods) + Email Intake

**P0 Stories (Must Complete):**
- US-MVP-01: Access Optiroq Portal
- US-MVP-02A, 02B, 02C: Create RFQ (Manual, Duplicate, File Upload)
- US-MVP-03, 04: Review/Send RFQ + Project Tracking
- US-MVP-05, 06: Email Quote Intake (Company Domain)
- US-MVP-07: Extract Data from Excel Files
- US-MVP-A01, A02, A03: Customer Onboarding (Email, Portal, Knowledge Base)

**Deliverable:** Buyers can create RFQs using 3 methods, system monitors company domain inbox, extracts data from Excel files

---

### Phase 2 (Month 2): Completeness & Normalization & Multi-Scenario
**Focus:** Immediate Quality Control + Multi-Format Support + Normalization + Volume Scenarios

**P0 Stories (Must Complete):**
- US-MVP-11, 12, 13, 14: Completeness Check & Immediate Quality Control
- US-MVP-15, 16, 17: Normalization
- US-MVP-23A: Multi-Scenario Analysis (Volume, Multi-Year, Locations)
- US-MVP-S07, 08, 09: Supplier Follow-up Interaction

**P1 Stories (Should Complete):**
- US-MVP-08, 09: Extract Data from PDF/CSV Files
- US-MVP-10: Review Low-Confidence Extractions

**Deliverable:** System validates completeness, sends immediate automatic responses, normalizes data, supports multiple formats and volume scenarios

---

### Phase 3 (Month 3): Anomaly Detection & Comparison Board & BOM Analysis
**Focus:** Anomaly Detection + Supplier Ranking + BOM Dashboard + Multi-Language

**P0 Stories (Must Complete):**
- US-MVP-18, 19: Anomaly Detection (outliers, price indices)
- US-MVP-22, 23: Incremental Comparison Board with Target Price & Ranking
- US-MVP-26A, 26B: BOM-Level Project Analysis
- US-MVP-27, 29: Make Sourcing Decision + Send Rejection Emails
- US-MVP-30: Portal (Mandatory)
- US-MVP-32, 33: Multi-Language & Currency Support
- US-MVP-A03, 04, 06: Knowledge Base & Monitoring

**P1 Stories (Should Complete):**
- US-MVP-20, 21: Additional Anomaly Detection
- US-MVP-24, 25, 26: Detailed Breakdown + Anomalies + Raw Data
- US-MVP-34: Track System Improvement Metrics
- US-MVP-S06, 10, 11: Supplier Status Updates
- US-MVP-A05, 07, 08, 09: Advanced Monitoring

**P2 Stories (Nice to Have):**
- US-MVP-31: AI Chat (Optional)
- US-MVP-S02: AI Chat for Suppliers (Optional)

**Deliverable:** Full end-to-end workflow with anomaly detection, supplier ranking, BOM dashboard, multi-language support, and incremental comparison board

---

## Success Criteria by Actor

### Sarah (Buyer) Success Criteria
- ✅ **Time Savings:** 10-15 hours saved per RFQ (70% reduction)
- ✅ **Extraction Accuracy:** 90-95% automatic extraction accuracy (with auto-fill)
- ✅ **Anomaly Detection:** 90%+ of cost issues flagged
- ✅ **Hidden Cost Detection:** 80%+ of embedded costs identified
- ✅ **Duplication Usage:** 60-70% of RFQs created by duplication (key selling point)
- ✅ **File Upload Usage:** 30-40% of RFQs created from file upload
- ✅ **Immediate Quality Control:** 100% of incomplete submissions get automatic response
- ✅ **Multi-Scenario Support:** All RFQs support volume scenarios and multi-year projections
- ✅ **BOM Visibility:** 100% of projects have BOM-level cost visibility
- ✅ **Supplier Ranking:** All comparison boards show target price and ranking
- ✅ **User Satisfaction:** 4/5 rating from pilot users

### Raj (Supplier) Success Criteria
- ✅ **Format Flexibility:** 90%+ of responses processed successfully (Excel, PDF, CSV)
- ✅ **Clear Requirements:** 80%+ of suppliers understand requirements on first read
- ✅ **Reduced Follow-ups:** 50% reduction in follow-up emails (due to clear requirements + immediate responses)
- ✅ **Time Savings:** 30-60 minutes saved per RFQ (no template filling)
- ✅ **User Satisfaction:** 4/5 rating from pilot suppliers

### System Admin Success Criteria
- ✅ **Onboarding Time:** <6 hours per customer (one-time)
- ✅ **System Uptime:** 99%+ uptime
- ✅ **Processing Time:** <5 minutes per supplier quote
- ✅ **Monitoring:** Real-time alerts for failures
- ✅ **Support Time:** <2 hours per week (ongoing)

---

## Key Differentiators (Reflected in User Stories)

### 1. Agent-Based Approach (No Plugin)
- **US-MVP-01, 02A, 02B, 02C:** Buyers use portal to create RFQs (not plugin)
- **Value:** No installation required, immediate access, easier adoption

### 2. 3 RFQ Creation Methods
- **US-MVP-02A:** Manual creation from scratch
- **US-MVP-02B:** Duplicate existing RFQ (60-70% time savings - KEY SELLING POINT)
- **US-MVP-02C:** File upload with auto-parsing (eliminate zero-value data entry)
- **Value:** Flexibility for different workflows, massive time savings

### 3. Immediate Automatic Quality Control
- **US-MVP-13:** System immediately sends responses for incomplete/anomalous submissions
- **Value:** Teaches suppliers discipline, saves 2-3 days per RFQ, no manual review needed

### 4. Multi-Scenario Analysis
- **US-MVP-23A:** Volume scenarios, multi-year projections, multiple locations
- **Value:** Strategic decision-making, lifetime spend calculations, progressive pricing

### 5. BOM-Level Project Analysis
- **US-MVP-26A, 26B:** Project-level cost visibility (new + existing parts)
- **Value:** Complete project picture, variance from targets, CQA process support

### 6. Supplier Ranking with Target Price
- **US-MVP-23:** Target price comparison, best price first, automated recommendations
- **Value:** Quick decision-making, clear performance vs target

### 7. Multi-Language Support
- **US-MVP-32:** English, Spanish, French, German, Mandarin
- **Value:** Global operations, supplier communication in their language

### 8. Company Domain Emails
- **US-MVP-05, A01:** purchasingrfq@companyname.com (not optiroq.com)
- **Value:** Prevents spam issues, maintains company branding

### 9. Multi-Format Support
- **US-MVP-07, 08, 09:** System handles Excel, PDF, CSV (not just templates)
- **US-MVP-S03:** Suppliers use own formats (no new templates to learn)
- **Value:** Handles real-world supplier responses, not idealized workflows

### 10. Modular LLM Extraction with Auto-Fill
- **US-MVP-07, 02C:** Block-by-block extraction with knowledge base, auto-fill from uploaded files
- **US-MVP-10:** Review low-confidence extractions
- **Value:** 90-95% accuracy (vs. 70-80% single-pass), learns from past RFQs

---

## Next Steps

1. **Validate user stories** with Mibarek and pilot customers
2. **Prioritize P0 stories** for 3.5-month MVP timeline (increased from 3 months)
3. **Estimate development effort** per story (detailed)
4. **Create sprint plan** (2-week sprints, 7 sprints total)
5. **Assign stories to developers** (senior vs. junior)
6. **Begin development** (Week 1: Portal + Agent Setup)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 26, 2024 | Kiro | Initial MVP user stories overview |
| 2.0 | Dec 30, 2024 | Kiro | Updated based on team discussion (Dec 29): agent approach, 3 RFQ methods, BOM analysis, multi-scenario, ranking, multi-language, company domain emails |
