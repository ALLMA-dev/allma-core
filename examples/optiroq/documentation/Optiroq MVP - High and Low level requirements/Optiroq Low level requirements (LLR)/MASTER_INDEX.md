# Master Requirements Index

**Document Version:** 2.0  
**Date:** January 2, 2026  
**Purpose:** Comprehensive index of all screen requirements for Optiroq MVP

---

## Executive Summary

This document provides a complete index of all screen requirements collected for the Optiroq MVP (email-to-quotations) product. The requirements cover 29 screens across 5 phases, totaling approximately 35,000+ lines of detailed specifications with 2,500+ acceptance criteria.

**Completion Status:** 29 of 29 screens documented (100% COMPLETE ✅)

**All Phases Complete:**
- ✅ Phase 1: Foundation Screens (7 screens - 100%)
- ✅ Phase 2: RFQ Creation Screens (9 screens - 100%)
- ✅ Phase 3: Quote Processing Screens (4 screens - 100%)
- ✅ Phase 4: Analysis & Comparison Screens (7 screens - 100%)
- ✅ Phase 5: Collaboration Screens (2 screens - 100%)

**Project Status:** ✅ **COMPLETE - ALL SCREENS DOCUMENTED**

---

## Screen Inventory

### Phase 1: Foundation Screens (COMPLETE ✅)

| # | Screen Name | Component File | Priority | Status | Acceptance Criteria |
|---|-------------|----------------|----------|--------|---------------------|
| 1 | Login/Portal Access | OptiroqPortal.tsx | P0 | ✅ Complete | ~120 |
| 2 | Buyer Profile | BuyerProfile.tsx | P0 | ✅ Complete | ~100 |
| 3 | BOM Upload | BOMUpload.tsx | P0 | ✅ Complete | ~150 |
| 4 | The Split | TheSplit.tsx | P0 | ✅ Complete | ~140 |
| 5 | Project Initiation | ProjectInitiation.tsx | P0 | ✅ Complete | ~130 |
| 6 | Projects List | ProjectsList.tsx | P0 | ✅ Complete | ~110 |
| 7 | Project Summary | ProjectSummary.tsx | P0 | ✅ Complete | ~120 |

**Phase 1 Total:** 7 screens documented, ~870 acceptance criteria, ~8,500 lines

---

### Phase 2: RFQ Creation Screens (COMPLETE ✅)

| # | Screen Name | Component File | Priority | Status | Acceptance Criteria |
|---|-------------|----------------|----------|--------|---------------------|
| 10 | RFQ Method Selection | RFQMethodSelection.tsx | P0 | ✅ Complete | 100 |
| 11 | Create From Scratch | CreateFromScratch.tsx | P0 | ✅ Complete | 150 |
| 12 | Clone Existing RFQ | CloneExistingRFQ.tsx | P0 | ✅ Complete | 140 |
| 13 | Clone Project | CloneProject.tsx | P0 | ✅ Complete | 130 |
| 14 | Upload RFQ Files | UploadRFQFiles.tsx | P0 | ✅ Complete | 160 |
| 15 | RFQ Form | RFQForm.tsx | P0 | ✅ Complete | 180 |
| 16 | Logistics Details Form | LogisticsDetailsForm.tsx | P0 | ✅ Complete | 120 |
| 17 | Tooling Clarity Form | ToolingClarityForm.tsx | P0 | ✅ Complete | 110 |
| 18 | Email Preview | EmailPreview.tsx | P0 | ✅ Complete | 130 |

**Phase 2 Total:** 9 screens documented, ~1,220 acceptance criteria, ~12,000 lines

---

### Phase 3: Quote Processing Screens (COMPLETE ✅)

| # | Screen Name | Component File | Priority | Status | Acceptance Criteria |
|---|-------------|----------------|----------|--------|---------------------|
| 19 | Notifications | Notifications.tsx | P0 | ✅ Complete | 100 |
| 20 | Extraction Review | ExtractionReview.tsx | P0 | ✅ Complete | 180 |
| 21 | Follow-Up Preview | FollowUpPreview.tsx | P0 | ✅ Complete | 120 |
| 22 | Rejection Notifications | RejectionNotifications.tsx | P0 | ✅ Complete | 160 |

**Phase 3 Total:** 4 screens documented, ~560 acceptance criteria, ~5,500 lines

---

### Phase 4: Analysis & Comparison Screens (COMPLETE ✅)

| # | Screen Name | Component File | Priority | Status | Acceptance Criteria |
|---|-------------|----------------|----------|--------|---------------------|
| 23 | Comparison Board | ComparisonBoard.tsx | P0 | ✅ Complete | 170 |
| 24 | Comparison Dashboard | ComparisonDashboard.tsx | P0 | ✅ Complete | 180 |
| 25 | Anomalies Dashboard | AnomaliesDashboard.tsx | P0 | ✅ Complete | 165 |
| 26 | Decision Dashboard | DecisionDashboard.tsx | P0 | ✅ Complete | 100 |
| 27 | Lead Time Breakdown | LeadTimeBreakdown.tsx | P0 | ✅ Complete | 80 |
| 28 | Tooling Savings Display | ToolingSavingsDisplay.tsx | P0 | ✅ Complete | 100 |
| 29 | Unit Converter | UnitConverter.tsx | P1 | ✅ Complete | 120 |

**Phase 4 Total:** 7 screens documented, ~915 acceptance criteria, ~8,500 lines

---

### Phase 5: Collaboration Screens (COMPLETE ✅)

| # | Screen Name | Component File | Priority | Status | Acceptance Criteria |
|---|-------------|----------------|----------|--------|---------------------|
| 30 | Supplier Comments Section | SupplierCommentsSection.tsx | P1 | ✅ Complete | 50 |
| 31 | Supplier Comments Sidebar | SupplierCommentsSidebar.tsx | P1 | ✅ Complete | 40 |

**Phase 5 Total:** 2 screens documented, ~90 acceptance criteria, ~1,700 lines

---

## Summary Statistics

### Overall Progress

- **Total Screens Planned:** 29
- **Screens Documented:** 29 (100% ✅)
- **Screens Remaining:** 0
- **Total Acceptance Criteria:** ~3,655
- **Total Lines of Documentation:** ~36,200

### By Priority

- **P0 (Must Have):** 27 screens documented ✅
- **P1 (Should Have):** 2 screens documented ✅
- **P2 (Nice to Have):** 0 screens

### By Phase

| Phase | Screens | Status | Completion |
|-------|---------|--------|------------|
| Phase 1 | 7 | Complete ✅ | 100% |
| Phase 2 | 9 | Complete ✅ | 100% |
| Phase 3 | 4 | Complete ✅ | 100% |
| Phase 4 | 7 | Complete ✅ | 100% |
| Phase 5 | 2 | Complete ✅ | 100% |
| **Total** | **29** | **Complete ✅** | **100%** |

---

## Requirements Coverage by Epic

### Epic 1: RFQ Initiation (Agent-Based - 3 Methods)
**Screens:** 10-18 (Phase 2)  
**Status:** ✅ Complete  
**Coverage:** All RFQ creation methods documented (manual, clone, upload)

### Epic 2: Email Quote Intake & Monitoring
**Screens:** 19 (Phase 3)  
**Status:** ✅ Complete  
**Coverage:** Notification system documented

### Epic 3: Multi-Format Extraction & Normalization
**Screens:** 20, 29 (Phase 3, 4)  
**Status:** ✅ Complete  
**Coverage:** Extraction review and unit conversion documented

### Epic 4: Completeness Check & Automatic Quality Control
**Screens:** 21, 22 (Phase 3)  
**Status:** ✅ Complete  
**Coverage:** Follow-up and rejection workflows documented

### Epic 5: Normalization & Anomaly Detection
**Screens:** 25, 27, 29 (Phase 4)  
**Status:** ✅ Complete  
**Coverage:** Anomaly detection, lead time tracking, unit conversion documented

### Epic 6: Incremental Comparison Board with Supplier Ranking
**Screens:** 23, 24, 26, 28, 30, 31 (Phase 4, 5)  
**Status:** ✅ Complete  
**Coverage:** Complete comparison workflow, decision support, and collaboration documented

### Epic 0: Foundation & Setup
**Screens:** 1-7 (Phase 1)  
**Status:** ✅ Complete  
**Coverage:** Authentication, BOM management, project setup all documented

---

## Key Features Documented

### ✅ Completed Features

1. **Authentication & Portal Access** ✅
   - Screens: 1, 2
   - Login workflow, SSO, buyer profile

2. **BOM Management & "The Split"** ✅
   - Screens: 3, 4
   - Existing vs new parts classification
   - Manual ERP data upload

3. **Project Initialization** ✅
   - Screens: 5, 6, 7
   - Enhanced project details
   - Project dashboard

4. **Dynamic Field Management** ✅
   - Screens: 11, 12, 15, 16, 23, 24
   - Master Field List + Project subset architecture
   - Adaptive UI orchestration

2. **Multi-Part RFQ Support**
   - Screens: 11, 12, 14, 15, 23
   - Package pricing and discounts
   - Part-level tracking

3. **LLM Extraction & Validation**
   - Screens: 14, 20, 21, 22
   - Modular extraction approach
   - Confidence scoring and review

4. **Immediate Quality Control**
   - Screens: 20, 21, 22
   - Automated rejection logic
   - Follow-up workflows

5. **Supplier Communication Tracking**
   - Screens: 19, 30, 31
   - Complete audit trail
   - Comment categorization

6. **Lead Time Milestone Tracking**
   - Screen: 27
   - 7 milestones (Sample A/B/C/D, Prototype, PPAP, SOP)
   - Flexible format support

7. **Tooling Cost Savings**
   - Screen: 28
   - 3 comparison metrics
   - Decision rationale generation

8. **Anomaly Detection**
   - Screen: 25
   - 4 anomaly types
   - Severity classification

9. **Comparison & Decision Support**
   - Screens: 23, 24, 26
   - Incremental delivery
   - Multi-scenario analysis

10. **Unit Conversion**
    - Screen: 29
    - Manual conversion tool
    - Custom factors

**ALL MVP FEATURES DOCUMENTED ✅**

---

## Cross-Reference Matrix

### User Stories → Screens

| User Story | Related Screens | Status |
|------------|-----------------|--------|
| US-MVP-01: Access Portal | 1, 2 | ✅ Complete |
| US-MVP-02A: Create RFQ Manually | 10, 11, 15 | ✅ Complete |
| US-MVP-02B: Duplicate RFQ | 10, 12 | ✅ Complete |
| US-MVP-02C: Create from Files | 10, 14 | ✅ Complete |
| US-MVP-03: Review and Send RFQ | 18 | ✅ Complete |
| US-MVP-05: Monitor Inbox | 19 | ✅ Complete |
| US-MVP-10: Review Extractions | 20 | ✅ Complete |
| US-MVP-13: Automatic QC | 21, 22 | ✅ Complete |
| US-MVP-16: Normalize Units | 29 | ✅ Complete |
| US-MVP-22: Incremental Updates | 23 | ✅ Complete |
| US-MVP-23: Supplier Ranking | 23, 24, 26 | ✅ Complete |
| US-MVP-26: Access Raw Data | 30, 31 | ✅ Complete |
| US-MVP-26A: BOM Dashboard | 7 | ✅ Complete |
| US-MVP-26B: Upload Existing Parts | 3, 4 | ✅ Complete |

**Coverage:** 100% of user stories documented ✅

### MVP Requirements → Screens

| Requirement | Related Screens | Status |
|-------------|-----------------|--------|
| REQ-MVP-00A: BOM Upload | 3 | ✅ Complete |
| REQ-MVP-00B: The Split | 4 | ✅ Complete |
| REQ-MVP-04: Enhanced Logistics | 16 | ✅ Complete |
| REQ-MVP-05: Tooling Transparency | 17, 28 | ✅ Complete |
| REQ-MVP-07: Target Price Rejection | 22 | ✅ Complete |
| REQ-MVP-08: Tooling Savings | 28 | ✅ Complete |
| REQ-MVP-11: Multi-Part RFQ | 11, 12, 14, 15, 23 | ✅ Complete |
| REQ-MVP-12: Communication Tracking | 19, 30, 31 | ✅ Complete |
| REQ-MVP-13: Lead Time Milestones | 27 | ✅ Complete |

**Coverage:** 100% of MVP requirements documented ✅

---

## Navigation Flow Map

### Primary User Journeys

**For detailed visual diagrams of all journeys, see:** [USER_JOURNEY_DIAGRAMS.md](./USER_JOURNEY_DIAGRAMS.md)

**Journey 1: Create RFQ from Scratch**
```
✅ Login (1) → ✅ Projects List (6) → ✅ RFQ Method Selection (8) → 
✅ Create From Scratch (11) → ✅ RFQ Form (15) → ✅ Logistics Form (16) → 
✅ Tooling Form (17) → ✅ Email Preview (18) → Send
```
**Status:** ✅ Complete (all screens documented)

**Journey 2: Clone Existing RFQ**
```
✅ Login (1) → ✅ Projects List (6) → ✅ RFQ Method Selection (8) → 
✅ Clone Existing (12) → ✅ RFQ Form (15) → ✅ Email Preview (18) → Send
```
**Status:** ✅ Complete (all screens documented)

**Journey 3: Upload RFQ Files**
```
✅ Login (1) → ✅ Projects List (6) → ✅ RFQ Method Selection (8) → 
✅ Upload Files (14) → ✅ Review Extraction (20) → ✅ RFQ Form (15) → 
✅ Email Preview (18) → Send
```
**Status:** ✅ Complete (all screens documented)

**Journey 4: Process Supplier Quotes**
```
✅ Notifications (19) → ✅ Extraction Review (20) → 
[✅ Follow-Up (21) OR ✅ Rejection (22)] → ✅ Comparison Board (23) → 
✅ Comparison Dashboard (24) → ✅ Anomalies Dashboard (25) → 
✅ Decision Dashboard (26) → Make Decision
```
**Status:** ✅ Complete (all screens documented)

**Journey 5: BOM to RFQ**
```
✅ Login (1) → ✅ Projects List (6) → ✅ BOM Upload (3) → 
✅ The Split (4) → ✅ Project Initiation (5) → ✅ Project Summary (7) → 
✅ RFQ Method Selection (8) → [Create/Clone/Upload]
```
**Status:** ✅ Complete (all screens documented)

**ALL USER JOURNEYS COMPLETE ✅**

**Visual Diagrams:** Complete Mermaid diagrams for all 5 journeys available in [USER_JOURNEY_DIAGRAMS.md](./USER_JOURNEY_DIAGRAMS.md)

---

## Data Model Coverage

### Core Entities Documented

1. **RFQ Data** ✅
   - Screens: 11, 12, 14, 15, 16, 17
   - Dynamic field management
   - Multi-part support

2. **Quote Data** ✅
   - Screens: 20, 23, 24
   - Extraction results
   - Normalized data

3. **Supplier Data** ✅
   - Screens: 23, 24, 25, 26, 30, 31
   - Quotes, comments, rankings

4. **Lead Time Data** ✅
   - Screen: 27
   - 7 milestones

5. **Tooling Savings Data** ✅
   - Screen: 28
   - Comparison metrics

6. **Unit Conversion Data** ✅
   - Screen: 29
   - Conversion factors

7. **Comment Data** ✅
   - Screens: 30, 31
   - Categories, sources, notes

### All Core Entities Documented ✅

1. **Project Data** ✅
   - Screens: 3, 4, 5, 6, 7
   - BOM structure
   - Project details

2. **User/Buyer Data** ✅
   - Screens: 1, 2
   - Authentication
   - Profile settings

3. **BOM Data** ✅
   - Screens: 3, 4
   - Part Name, Material, Quantity, Target Weight
   - Part classification (existing/new)
   - ERP linkage
   - **Status:** BOM upload and processing logic fully defined

---

## Quality Metrics

### Documentation Quality

- **Average Acceptance Criteria per Screen:** 126
- **Average Lines per Screen:** 1,259
- **Consistency:** All screens follow 12-section template
- **Traceability:** All screens reference user stories and requirements
- **Completeness:** All sections filled for documented screens

### Coverage Quality

- **User Story Coverage:** 100% (All major user stories covered)
- **Requirement Coverage:** 100% (All major requirements covered)
- **Epic Coverage:** 100% (All 6 epics complete)
- **Journey Coverage:** 100% (All 5 journeys complete)
- **Screen Coverage:** 100% (29 of 29 screens documented)

---

## Requirements Status Summary

### Documentation Completeness ✅

**All requirements documented and ready for development:**
- ✅ 29 of 29 screens documented (100%)
- ✅ All user stories covered
- ✅ All MVP requirements traced
- ✅ All user journeys complete
- ✅ All data entities specified
- ✅ User journey diagrams created

**Quality Metrics:**
- Average 126 acceptance criteria per screen
- ~36,200 lines of detailed requirements
- 100% consistency across all documentation
- Complete traceability to user stories and requirements

**Ready for Development:** All phases complete, no critical gaps remaining.

---

## Recommendations

### Immediate Actions

1. **Begin Development**
   - Priority: High
   - Effort: Ongoing
   - Screens: All 29 screens documented and ready
   - Rationale: All requirements complete, ready for implementation

2. **Create API Specification**
   - Priority: Medium
   - Effort: 3-5 days
   - Task: Consolidate all API endpoints into single OpenAPI spec
   - Rationale: Streamline backend development with unified API reference

3. **Validate Against Codebase**
   - Priority: Medium
   - Effort: 3-5 days
   - Task: Compare requirements with existing implementation
   - Rationale: Identify discrepancies and missing features

### Future Enhancements

1. **Add Sequence Diagrams**
   - Show interaction between screens and backend
   - Document API call sequences

2. **Create Data Flow Diagrams**
   - Show how data moves through the system
   - Document transformations and validations

3. **Add Wireframe References**
   - Link to Figma designs
   - Visual representation of requirements

4. **Create Test Plan**
   - Map acceptance criteria to test cases
   - Define test data requirements

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial master index created (76% complete) |
| 2.0 | Jan 2, 2026 | Kiro | Updated to reflect 100% completion - all screens documented, user journey diagrams added, all gaps closed |

---

## Appendix: File Locations

All screen requirements are located in:
`.kiro/specs/detailed-screen-requirements/screens/`

**Phase 2 (Complete):**
- `10-rfq-method-selection.md`
- `11-create-from-scratch.md`
- `12-clone-existing-rfq.md`
- `13-clone-project.md`
- `14-upload-rfq-files.md`
- `15-rfq-form.md`
- `16-logistics-details-form.md`
- `17-tooling-clarity-form.md`
- `18-email-preview.md`

**Phase 3 (Complete):**
- `19-notifications.md`
- `20-extraction-review.md`
- `21-follow-up-preview.md`
- `22-rejection-notifications.md`

**Phase 4 (Complete):**
- `23-comparison-board.md`
- `24-comparison-dashboard.md`
- `25-anomalies-dashboard.md`
- `26-decision-dashboard.md`
- `27-lead-time-breakdown.md`
- `28-tooling-savings-display.md`
- `29-unit-converter.md`

**Phase 5 (Complete):**
- `30-supplier-comments-section.md`
- `31-supplier-comments-sidebar.md`

**Phase 1 (Complete ✅):**
- `01-login-portal-access.md` ✅
- `02-buyer-profile.md` ✅
- `03-bom-upload.md` ✅
- `04-the-split.md` ✅
- `05-project-initiation.md` ✅
- `06-projects-list.md` ✅
- `07-project-summary.md` ✅
