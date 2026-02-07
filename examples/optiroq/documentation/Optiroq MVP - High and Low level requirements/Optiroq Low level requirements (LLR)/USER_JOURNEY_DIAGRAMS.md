# User Journey Diagrams

**Document Version:** 1.0  
**Date:** January 2, 2026  
**Purpose:** Visual representation of all user journeys through the Optiroq MVP

---

## Overview

This document provides comprehensive Mermaid diagrams for all five primary user journeys in the Optiroq MVP. These diagrams visualize the complete flow from login to decision-making, showing all screens, decision points, and navigation paths.

**Journey Coverage:**
1. Journey 1: BOM to RFQ (Project Initialization)
2. Journey 2: Create RFQ from Scratch
3. Journey 3: Clone Existing RFQ
4. Journey 4: Upload RFQ Files
5. Journey 5: Process Supplier Quotes

---

## Journey 1: BOM to RFQ (Project Initialization)

**Purpose:** Upload BOM, classify parts, initialize project, and start RFQ creation

**Key Screens:** 1 → 6 → 3 → 4 → 5 → 7 → 8 → [9/11/14]

**Description:** This journey represents the complete project initialization workflow, starting from login and ending with RFQ method selection. It includes the critical "The Split" step where parts are classified as existing or new.

```mermaid
graph TD
    Start([User Starts]) --> Login[1. Login/Portal Access]
    Login --> ProjectsList[6. Projects List]
    
    ProjectsList --> BOMUpload[3. BOM Upload]
    
    BOMUpload --> TheSplit[4. The Split]
    TheSplit --> |Classify Parts| TheSplit
    TheSplit --> |Existing Parts Only| ProjectSummary[7. Project Summary]
    TheSplit --> |Has New Parts| ProjectInit[5. Project Initiation]
    
    ProjectInit --> ProjectSummary
    
    ProjectSummary --> |View Only| ProjectsList
    ProjectSummary --> |Create RFQ for New Parts| MethodSelection[8. RFQ Method Selection]
    
    MethodSelection --> |Upload Files| UploadPath[Journey 4: Upload RFQ Files]
    MethodSelection --> |Clone Existing| ClonePath[Journey 3: Clone Existing RFQ]
    MethodSelection --> |From Scratch| ScratchPath[Journey 2: Create From Scratch]
    
    style Login fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#000
    style BOMUpload fill:#dbeafe,stroke:#0284c7,stroke-width:2px,color:#000
    style TheSplit fill:#bfdbfe,stroke:#0284c7,stroke-width:2px,color:#000
    style ProjectInit fill:#93c5fd,stroke:#0369a1,stroke-width:2px,color:#000
    style ProjectSummary fill:#7dd3fc,stroke:#0369a1,stroke-width:2px,color:#000
    style MethodSelection fill:#38bdf8,stroke:#0369a1,stroke-width:2px,color:#000
    style UploadPath fill:#fef3c7,stroke:#ca8a04,stroke-width:2px,color:#000
    style ClonePath fill:#fde68a,stroke:#ca8a04,stroke-width:2px,color:#000
    style ScratchPath fill:#fcd34d,stroke:#ca8a04,stroke-width:2px,color:#000
```

**Key Decision Points:**
- **The Split:** Parts classified as existing vs new
- **Project Summary:** View only vs create RFQ
- **Method Selection:** Choose RFQ creation method

**Time Estimate:** 10-15 minutes (including BOM upload and classification)

---

## Journey 2: Create RFQ from Scratch

**Purpose:** Manually create RFQ using step-by-step wizard

**Key Screens:** 8 → 11 → 15 → 16 → 17 → 18 → Send

**Description:** This journey is for creating completely new RFQs with unique requirements. Users manually enter all information through a guided wizard with dynamic field management.

```mermaid
graph TD
    Start([From Method Selection]) --> MethodSelection[8. RFQ Method Selection]
    
    MethodSelection --> |Select 'From Scratch'| CreateScratch[11. Create From Scratch]
    
    CreateScratch --> |Select Fields| CreateScratch
    CreateScratch --> |Configure Parts| CreateScratch
    CreateScratch --> |Continue| RFQForm[15. RFQ Form]
    
    RFQForm --> |Fill Basic Info| RFQForm
    RFQForm --> |Add Parts| RFQForm
    RFQForm --> |Continue| LogisticsForm[16. Logistics Details Form]
    
    LogisticsForm --> |Fill Logistics| LogisticsForm
    LogisticsForm --> |Continue| ToolingForm[17. Tooling Clarity Form]
    
    ToolingForm --> |Fill Tooling| ToolingForm
    ToolingForm --> |Continue| EmailPreview[18. Email Preview]
    
    EmailPreview --> |Edit| RFQForm
    EmailPreview --> |Edit Logistics| LogisticsForm
    EmailPreview --> |Edit Tooling| ToolingForm
    EmailPreview --> |Send RFQ| SendRFQ[RFQ Sent to Suppliers]
    
    SendRFQ --> QuoteProcessing[Journey 5: Process Supplier Quotes]
    
    style MethodSelection fill:#38bdf8,stroke:#0369a1,stroke-width:2px,color:#000
    style CreateScratch fill:#86efac,stroke:#16a34a,stroke-width:2px,color:#000
    style RFQForm fill:#6ee7b7,stroke:#16a34a,stroke-width:2px,color:#000
    style LogisticsForm fill:#4ade80,stroke:#15803d,stroke-width:2px,color:#000
    style ToolingForm fill:#34d399,stroke:#15803d,stroke-width:2px,color:#000
    style EmailPreview fill:#10b981,stroke:#166534,stroke-width:2px,color:#000
    style SendRFQ fill:#fde68a,stroke:#ca8a04,stroke-width:2px,color:#000
    style QuoteProcessing fill:#fcd34d,stroke:#ca8a04,stroke-width:2px,color:#000
```

**Key Features:**
- Dynamic field selection from Master List
- Multi-part RFQ support
- Step-by-step wizard
- Preview before sending

**Time Estimate:** ~5 minutes

---

## Journey 3: Clone Existing RFQ

**Purpose:** Duplicate previous RFQ with modifications (60-70% time savings)

**Key Screens:** 8 → 12 → 15 → 18 → Send

**Description:** Most popular method (60-70% usage). Users select a previous RFQ, modify as needed, and send. Pre-filled fields save significant time.

```mermaid
graph TD
    Start([From Method Selection]) --> MethodSelection[8. RFQ Method Selection]
    
    MethodSelection --> |Select 'Clone Existing'| CloneRFQ[12. Clone Existing RFQ]
    
    CloneRFQ --> |Search/Filter| CloneRFQ
    CloneRFQ --> |Select RFQ to Clone| CloneRFQ
    CloneRFQ --> |Preview| CloneRFQ
    CloneRFQ --> |Confirm Clone| RFQForm[15. RFQ Form]
    
    RFQForm --> |Pre-filled Fields| RFQForm
    RFQForm --> |Modify as Needed| RFQForm
    RFQForm --> |Update Parts| RFQForm
    RFQForm --> |Continue| EmailPreview[18. Email Preview]
    
    EmailPreview --> |Edit| RFQForm
    EmailPreview --> |Send RFQ| SendRFQ[RFQ Sent to Suppliers]
    
    SendRFQ --> QuoteProcessing[Journey 5: Process Supplier Quotes]
    
    style MethodSelection fill:#38bdf8,stroke:#0369a1,stroke-width:2px,color:#000
    style CloneRFQ fill:#d8b4fe,stroke:#9333ea,stroke-width:2px,color:#000
    style RFQForm fill:#c084fc,stroke:#9333ea,stroke-width:2px,color:#000
    style EmailPreview fill:#a78bfa,stroke:#7e22ce,stroke-width:2px,color:#000
    style SendRFQ fill:#fde68a,stroke:#ca8a04,stroke-width:2px,color:#000
    style QuoteProcessing fill:#fcd34d,stroke:#ca8a04,stroke-width:2px,color:#000
```

**Key Features:**
- Search and filter previous RFQs
- Pre-filled fields from original RFQ
- Modify suppliers, parts, requirements
- 60-70% time savings vs from scratch

**Time Estimate:** ~3 minutes

---

## Journey 4: Upload RFQ Files

**Purpose:** AI auto-fills RFQ form from existing documents (PPT, Excel, PDF)

**Key Screens:** 8 → 14 → 20 → 15 → 18 → Send

**Description:** Users upload existing RFQ documents, LLM extracts data, buyer reviews and corrects extractions, then sends RFQ.

```mermaid
graph TD
    Start([From Method Selection]) --> MethodSelection[8. RFQ Method Selection]
    
    MethodSelection --> |Select 'Upload Files'| UploadFiles[14. Upload RFQ Files]
    
    UploadFiles --> |Select Files| UploadFiles
    UploadFiles --> |Upload| Processing[LLM Processing]
    Processing --> |2-3 minutes| ExtractionReview[20. Extraction Review]
    
    ExtractionReview --> |Review Extractions| ExtractionReview
    ExtractionReview --> |Correct Low Confidence| ExtractionReview
    ExtractionReview --> |Approve| RFQForm[15. RFQ Form]
    ExtractionReview --> |Reject & Re-extract| UploadFiles
    
    RFQForm --> |Pre-filled from Extraction| RFQForm
    RFQForm --> |Modify as Needed| RFQForm
    RFQForm --> |Continue| EmailPreview[18. Email Preview]
    
    EmailPreview --> |Edit| RFQForm
    EmailPreview --> |Send RFQ| SendRFQ[RFQ Sent to Suppliers]
    
    SendRFQ --> QuoteProcessing[Journey 5: Process Supplier Quotes]
    
    style MethodSelection fill:#38bdf8,stroke:#0369a1,stroke-width:2px,color:#000
    style UploadFiles fill:#7dd3fc,stroke:#0369a1,stroke-width:2px,color:#000
    style Processing fill:#38bdf8,stroke:#0284c7,stroke-width:2px,color:#000
    style ExtractionReview fill:#0ea5e9,stroke:#0284c7,stroke-width:2px,color:#000
    style RFQForm fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff
    style EmailPreview fill:#0369a1,stroke:#075985,stroke-width:2px,color:#fff
    style SendRFQ fill:#fde68a,stroke:#ca8a04,stroke-width:2px,color:#000
    style QuoteProcessing fill:#fcd34d,stroke:#ca8a04,stroke-width:2px,color:#000
```

**Key Features:**
- Multi-format support (PPT, Excel, PDF)
- LLM extraction with confidence scoring
- Side-by-side review (original vs extracted)
- Correction workflow for low confidence

**Time Estimate:** ~4 minutes (including extraction review)

---

## Journey 5: Process Supplier Quotes

**Purpose:** Receive, extract, validate, compare, and decide on supplier quotes

**Key Screens:** 19 → 20 → [21/22] → 23 → 24 → 25 → 26 → Decision

**Description:** Complete quote processing workflow from email notification to decision-making. Includes automatic extraction, quality control, anomaly detection, and comparison.

```mermaid
graph TD
    Start([Supplier Responds via Email]) --> EmailReceived[Email to purchasingrfq@companyname.com]
    
    EmailReceived --> Notification1[19. Notifications - Quote Received]
    Notification1 --> Processing[LLM Processing 2-3 min]
    Processing --> Notification2[19. Notifications - Quote Processed]
    
    Notification2 --> |Click 'Review Extraction'| ExtractionReview[20. Extraction Review]
    
    ExtractionReview --> |High Confidence| ComparisonBoard[23. Comparison Board]
    ExtractionReview --> |Medium/Low Confidence| ReviewCorrect[Review & Correct]
    ReviewCorrect --> ComparisonBoard
    
    ExtractionReview --> |Missing Data| FollowUp[21. Follow-Up Preview]
    ExtractionReview --> |Target Price Rejection| Rejection[22. Rejection Notifications]
    
    FollowUp --> |Approve & Send| WaitResponse[Wait for Supplier Response]
    WaitResponse --> ExtractionReview
    
    Rejection --> |Approve & Send| RejectionSent[Rejection Sent]
    RejectionSent --> ComparisonBoard
    
    ComparisonBoard --> |Incremental Updates| ComparisonBoard
    ComparisonBoard --> |View Dashboard| ComparisonDashboard[24. Comparison Dashboard]
    
    ComparisonDashboard --> |View Anomalies| AnomaliesDashboard[25. Anomalies Dashboard]
    ComparisonDashboard --> |View Lead Times| LeadTimeBreakdown[27. Lead Time Breakdown]
    ComparisonDashboard --> |View Tooling Savings| ToolingSavings[28. Tooling Savings Display]
    ComparisonDashboard --> |Convert Units| UnitConverter[29. Unit Converter]
    ComparisonDashboard --> |View Comments| SupplierComments[30/31. Supplier Comments]
    
    AnomaliesDashboard --> DecisionDashboard[26. Decision Dashboard]
    LeadTimeBreakdown --> DecisionDashboard
    ToolingSavings --> DecisionDashboard
    ComparisonDashboard --> DecisionDashboard
    
    DecisionDashboard --> |Make Decision| Decision[Award Contract]
    
    style EmailReceived fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#000
    style Notification1 fill:#bae6fd,stroke:#0284c7,stroke-width:2px,color:#000
    style Processing fill:#7dd3fc,stroke:#0284c7,stroke-width:2px,color:#000
    style Notification2 fill:#38bdf8,stroke:#0369a1,stroke-width:2px,color:#000
    style ExtractionReview fill:#0ea5e9,stroke:#0369a1,stroke-width:2px,color:#000
    style FollowUp fill:#fef3c7,stroke:#ca8a04,stroke-width:2px,color:#000
    style Rejection fill:#fecaca,stroke:#dc2626,stroke-width:2px,color:#000
    style ComparisonBoard fill:#d8b4fe,stroke:#9333ea,stroke-width:2px,color:#000
    style ComparisonDashboard fill:#c084fc,stroke:#9333ea,stroke-width:2px,color:#000
    style AnomaliesDashboard fill:#fde68a,stroke:#ca8a04,stroke-width:2px,color:#000
    style LeadTimeBreakdown fill:#86efac,stroke:#16a34a,stroke-width:2px,color:#000
    style ToolingSavings fill:#6ee7b7,stroke:#16a34a,stroke-width:2px,color:#000
    style UnitConverter fill:#67e8f9,stroke:#0891b2,stroke-width:2px,color:#000
    style SupplierComments fill:#c7d2fe,stroke:#4f46e5,stroke-width:2px,color:#000
    style DecisionDashboard fill:#a78bfa,stroke:#7e22ce,stroke-width:2px,color:#000
    style Decision fill:#86efac,stroke:#16a34a,stroke-width:2px,color:#000
```

**Key Features:**
- Two-stage email notifications (received + processed)
- Automatic extraction with confidence scoring
- Immediate quality control (follow-up/rejection)
- Incremental comparison board updates
- Multi-dimensional analysis (anomalies, lead times, tooling)
- Comprehensive decision support

**Time Estimate:** 5-10 minutes per supplier (mostly automated)

---

## Complete System Flow (All Journeys Combined)

**Purpose:** Show how all journeys interconnect in the complete system

```mermaid
graph TD
    Start([User Starts]) --> Login[1. Login/Portal Access]
    Login --> ProjectsList[6. Projects List]
    
    %% BOM Upload Path
    ProjectsList --> |New Project| BOMUpload[3. BOM Upload]
    BOMUpload --> TheSplit[4. The Split]
    TheSplit --> ProjectInit[5. Project Initiation]
    ProjectInit --> ProjectSummary[7. Project Summary]
    
    %% RFQ Creation Entry Points
    ProjectsList --> |Existing Project| ProjectSummary
    ProjectSummary --> |Create RFQ| MethodSelection[8. RFQ Method Selection]
    
    %% Three RFQ Creation Methods
    MethodSelection --> |Upload| UploadFiles[14. Upload RFQ Files]
    MethodSelection --> |Clone| CloneRFQ[12. Clone Existing RFQ]
    MethodSelection --> |Scratch| CreateScratch[11. Create From Scratch]
    
    %% Upload Path
    UploadFiles --> ExtractionReview1[20. Extraction Review]
    ExtractionReview1 --> RFQForm1[15. RFQ Form]
    
    %% Clone Path
    CloneRFQ --> RFQForm2[15. RFQ Form]
    
    %% Scratch Path
    CreateScratch --> RFQForm3[15. RFQ Form]
    
    %% Common RFQ Form Path
    RFQForm1 --> LogisticsForm[16. Logistics Details Form]
    RFQForm2 --> LogisticsForm
    RFQForm3 --> LogisticsForm
    
    LogisticsForm --> ToolingForm[17. Tooling Clarity Form]
    ToolingForm --> EmailPreview[18. Email Preview]
    EmailPreview --> SendRFQ[RFQ Sent]
    
    %% Quote Processing
    SendRFQ --> Notifications[19. Notifications]
    Notifications --> ExtractionReview2[20. Extraction Review]
    
    ExtractionReview2 --> |Missing Data| FollowUp[21. Follow-Up Preview]
    ExtractionReview2 --> |Rejection| RejectionNotif[22. Rejection Notifications]
    ExtractionReview2 --> |Approved| ComparisonBoard[23. Comparison Board]
    
    FollowUp --> |Sent| Notifications
    RejectionNotif --> ComparisonBoard
    
    %% Analysis & Decision
    ComparisonBoard --> ComparisonDashboard[24. Comparison Dashboard]
    ComparisonDashboard --> AnomaliesDashboard[25. Anomalies Dashboard]
    ComparisonDashboard --> DecisionDashboard[26. Decision Dashboard]
    ComparisonDashboard --> LeadTimeBreakdown[27. Lead Time Breakdown]
    ComparisonDashboard --> ToolingSavings[28. Tooling Savings Display]
    ComparisonDashboard --> UnitConverter[29. Unit Converter]
    ComparisonDashboard --> SupplierComments[30/31. Comments]
    
    AnomaliesDashboard --> DecisionDashboard
    LeadTimeBreakdown --> DecisionDashboard
    ToolingSavings --> DecisionDashboard
    
    DecisionDashboard --> Decision[Award Contract]
    Decision --> ProjectsList
    
    style Login fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#000
    style ProjectsList fill:#bae6fd,stroke:#0284c7,stroke-width:2px,color:#000
    style BOMUpload fill:#93c5fd,stroke:#0369a1,stroke-width:2px,color:#000
    style TheSplit fill:#7dd3fc,stroke:#0369a1,stroke-width:2px,color:#000
    style ProjectInit fill:#38bdf8,stroke:#0369a1,stroke-width:2px,color:#000
    style ProjectSummary fill:#0ea5e9,stroke:#0284c7,stroke-width:2px,color:#000
    style MethodSelection fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff
    style UploadFiles fill:#0ea5e9,stroke:#0369a1,stroke-width:2px,color:#000
    style CloneRFQ fill:#d8b4fe,stroke:#9333ea,stroke-width:2px,color:#000
    style CreateScratch fill:#86efac,stroke:#16a34a,stroke-width:2px,color:#000
    style RFQForm1 fill:#6ee7b7,stroke:#16a34a,stroke-width:2px,color:#000
    style RFQForm2 fill:#c084fc,stroke:#9333ea,stroke-width:2px,color:#000
    style RFQForm3 fill:#4ade80,stroke:#15803d,stroke-width:2px,color:#000
    style LogisticsForm fill:#34d399,stroke:#15803d,stroke-width:2px,color:#000
    style ToolingForm fill:#10b981,stroke:#166534,stroke-width:2px,color:#000
    style EmailPreview fill:#059669,stroke:#166534,stroke-width:2px,color:#fff
    style SendRFQ fill:#fde68a,stroke:#ca8a04,stroke-width:2px,color:#000
    style Notifications fill:#38bdf8,stroke:#0369a1,stroke-width:2px,color:#000
    style ExtractionReview1 fill:#0ea5e9,stroke:#0369a1,stroke-width:2px,color:#000
    style ExtractionReview2 fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff
    style FollowUp fill:#fef3c7,stroke:#ca8a04,stroke-width:2px,color:#000
    style RejectionNotif fill:#fecaca,stroke:#dc2626,stroke-width:2px,color:#000
    style ComparisonBoard fill:#d8b4fe,stroke:#9333ea,stroke-width:2px,color:#000
    style ComparisonDashboard fill:#c084fc,stroke:#9333ea,stroke-width:2px,color:#000
    style AnomaliesDashboard fill:#fde68a,stroke:#ca8a04,stroke-width:2px,color:#000
    style DecisionDashboard fill:#a78bfa,stroke:#7e22ce,stroke-width:2px,color:#000
    style LeadTimeBreakdown fill:#86efac,stroke:#16a34a,stroke-width:2px,color:#000
    style ToolingSavings fill:#6ee7b7,stroke:#16a34a,stroke-width:2px,color:#000
    style UnitConverter fill:#67e8f9,stroke:#0891b2,stroke-width:2px,color:#000
    style SupplierComments fill:#c7d2fe,stroke:#4f46e5,stroke-width:2px,color:#000
    style Decision fill:#86efac,stroke:#16a34a,stroke-width:2px,color:#000
```

---

## Journey Comparison Matrix

| Journey | Entry Point | Key Screens | Decision Points | Time Estimate | Usage % |
|---------|-------------|-------------|-----------------|---------------|---------|
| **1. BOM to RFQ** | Login | 1→6→3→4→5→7→8 | The Split, Method Selection | 10-15 min | 100% (first time) |
| **2. From Scratch** | Method Selection | 8→11→15→16→17→18 | Field Selection, Parts Config | ~5 min | 10-20% |
| **3. Clone Existing** | Method Selection | 8→12→15→18 | RFQ Selection, Modifications | ~3 min | 60-70% |
| **4. Upload Files** | Method Selection | 8→14→20→15→18 | Extraction Review, Corrections | ~4 min | 20-30% |
| **5. Process Quotes** | Email Notification | 19→20→[21/22]→23→24→25→26 | Review, Follow-up/Reject, Decision | 5-10 min/supplier | 100% |

---

## Screen Usage Frequency

Based on user journeys, here's how often each screen is used:

**Every Journey:**
- Screen 1: Login/Portal Access (100%)
- Screen 6: Projects List (100%)
- Screen 18: Email Preview (100% for RFQ creation)
- Screen 19: Notifications (100% for quote processing)

**High Frequency (60%+):**
- Screen 8: RFQ Method Selection (100% for RFQ creation)
- Screen 12: Clone Existing RFQ (60-70%)
- Screen 15: RFQ Form (100% for RFQ creation)
- Screen 20: Extraction Review (100% for quote processing)
- Screen 23: Comparison Board (100% for quote processing)
- Screen 24: Comparison Dashboard (100% for quote processing)
- Screen 26: Decision Dashboard (100% for quote processing)

**Medium Frequency (20-60%):**
- Screen 3: BOM Upload (first-time projects)
- Screen 4: The Split (first-time projects)
- Screen 5: Project Initiation (first-time projects)
- Screen 7: Project Summary (project reviews)
- Screen 14: Upload RFQ Files (20-30%)
- Screen 16: Logistics Details Form (100% for RFQ creation)
- Screen 17: Tooling Clarity Form (100% for RFQ creation)
- Screen 21: Follow-Up Preview (when data missing)
- Screen 22: Rejection Notifications (when target price exceeded)
- Screen 25: Anomalies Dashboard (when anomalies detected)

**Low Frequency (<20%):**
- Screen 2: Buyer Profile (profile updates)
- Screen 11: Create From Scratch (10-20%)
- Screen 13: Clone Project (rare)
- Screen 27: Lead Time Breakdown (detailed analysis)
- Screen 28: Tooling Savings Display (detailed analysis)
- Screen 29: Unit Converter (manual conversions)
- Screen 30/31: Supplier Comments (collaboration)

---

## Navigation Patterns

### Primary Navigation Paths

**Linear Progression:**
- BOM Upload → The Split → Project Initiation → Project Summary
- RFQ Form → Logistics Form → Tooling Form → Email Preview
- Notifications → Extraction Review → Comparison Board → Decision Dashboard

**Branching Points:**
- **Method Selection:** 3 paths (Upload, Clone, Scratch)
- **Extraction Review:** 3 paths (Approve, Follow-up, Reject)
- **Comparison Dashboard:** 5 analysis screens (Anomalies, Lead Time, Tooling, Units, Comments)

**Return Paths:**
- Email Preview → RFQ Form (edit)
- Extraction Review → Upload Files (re-extract)
- Any screen → Projects List (via header logo)

### Navigation Depth

**Shallow (1-3 screens):**
- Login → Projects List → Project Summary

**Medium (4-6 screens):**
- Method Selection → Clone → RFQ Form → Email Preview → Send

**Deep (7+ screens):**
- Login → BOM Upload → The Split → Project Init → Project Summary → Method Selection → Upload → Extraction Review → RFQ Form → Email Preview → Send

---

## Key Insights

### Time Savings

**Manual vs Automated:**
- **Manual RFQ Creation:** ~5 minutes (from scratch)
- **Cloning RFQ:** ~3 minutes (60% time savings)
- **Upload Files:** ~4 minutes (20% time savings)
- **Manual Quote Entry:** ~45 minutes per supplier
- **Automated Extraction:** ~3 minutes per supplier (93% time savings)

**Total Time Savings:**
- Per RFQ: 2-3 minutes (cloning vs scratch)
- Per Quote: ~42 minutes (automated vs manual)
- Per Project (5 suppliers): ~210 minutes (3.5 hours)

### User Preferences

**RFQ Creation Methods:**
- Clone Existing: 60-70% (most popular)
- Upload Files: 20-30%
- From Scratch: 10-20%

**Rationale:**
- Buyers typically work with same suppliers and requirements
- Cloning pre-fills most fields, requires minimal changes
- Upload useful when existing documents available
- From Scratch for completely new projects

### Critical Decision Points

**The Split (Screen 4):**
- Determines which parts need RFQs
- Existing parts skip RFQ creation
- New parts proceed to RFQ workflow

**Method Selection (Screen 8):**
- Determines RFQ creation path
- Impacts time and effort required
- Most users choose Clone (60-70%)

**Extraction Review (Screen 20):**
- Determines quote processing path
- High confidence → Comparison Board
- Low confidence → Review & Correct
- Missing data → Follow-up
- Target price exceeded → Rejection

**Decision Dashboard (Screen 26):**
- Final decision point
- Award contract to supplier
- Completes entire workflow

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial user journey diagrams created |

