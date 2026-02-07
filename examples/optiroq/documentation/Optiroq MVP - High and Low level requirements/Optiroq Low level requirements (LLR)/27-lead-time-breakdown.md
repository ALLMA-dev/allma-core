# Screen 27: Lead Time Breakdown

## 1. Overview

- **Screen ID:** SCR-27
- **Component File:** `src/app/components/LeadTimeBreakdown.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 5 - Normalization & Anomaly Detection
- **Priority:** P0 (Must Have)
- **Flexibility Level:** Low (Fixed milestone structure)

## 2. User Story

**As a** Project Buyer (Sarah)  
**I want to** view detailed lead time breakdowns by milestone for each supplier  
**So that** I can compare supplier timelines across critical manufacturing milestones and identify schedule risks

### Related User Stories

- **US-MVP-23:** Review Summary with Target Price and Supplier Ranking
- **US-MVP-24:** Drill Down to Detailed Breakdown
- **REQ-MVP-13:** Lead Time Milestone Tracking (7 milestones: Sample A/B/C/D, Prototype, Off-tool, PPAP, SOP)

## 3. Screen Purpose & Context

### Purpose
The Lead Time Breakdown screen provides a detailed view of supplier-specific lead times broken down by 7 critical manufacturing milestones. This enables buyers to:
- Compare supplier timelines milestone-by-milestone
- Identify schedule risks and bottlenecks
- Validate supplier capacity and planning
- Make informed decisions based on project timeline requirements

### Context
- **When Shown:** Accessed from Comparison Dashboard or Decision Dashboard when buyer needs detailed lead time analysis
- **User Journey Position:** Analysis phase, after quote extraction and before final decision
- **Trigger:** Buyer clicks on lead time details for a specific supplier
- **Data Source:** Extracted from supplier quote documents (Excel, PDF, CSV) via LLM

### Business Value
Lead time analysis is critical for project planning and supplier selection. Different suppliers may have vastly different timelines for tooling, prototyping, and production ramp-up. This screen enables buyers to:
- Identify suppliers who can meet project SOP (Start of Production) dates
- Compare milestone timelines across suppliers
- Detect unrealistic timelines (too fast or too slow)
- Plan project schedules based on supplier capabilities

## 4. Visual Layout & Structure

### 4.1 Main Sections

1. **Card Header**
   - Clock icon (visual indicator)
   - Title: "Lead Time Breakdown - {Supplier Name}"
   - Supplier name dynamically displayed

2. **Milestone Table**
   - Two-column layout: Milestone | Supplier Value
   - 7 rows (one per milestone)
   - Clean, scannable design

3. **Information Note**
   - Blue info box at bottom
   - Explains data source: "Lead times are extracted from supplier documents"

### 4.2 Key UI Elements

**Card Component:**
- Standard card with header and content sections
- Consistent with other dashboard cards
- White background, subtle border

**Header Row:**
- Column labels: "Milestone" | "Supplier Value"
- Bold font, bottom border separator
- Small text (text-sm)

**Milestone Rows:**
- Left column: Milestone name (bold, gray-700)
- Right column: Supplier value (editable input or static text)
- Consistent spacing between rows
- Aligned grid layout

**Input Fields (Editable Mode):**
- Text input for each milestone value
- Placeholder: "e.g., 2 weeks"
- Small size (text-sm)
- Standard input styling

**Static Text (Read-Only Mode):**
- Display supplier value as text
- Shows "-" if no value provided
- Small size (text-sm)

**Information Note:**
- Blue background (bg-blue-50)
- Blue border (border-blue-200)
- Rounded corners
- Small text with bold "Note:" label

### 4.3 Information Hierarchy

**Primary Information:**
- Supplier name (in header)
- Milestone values (main content)

**Secondary Information:**
- Milestone names (labels)
- Column headers

**Tertiary Information:**
- Data source note (bottom)

## 5. Data Requirements

### 5.1 System Fields (Immutable)

| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| supplier_id | String | System | Yes | UUID |
| supplier_name | String | System | Yes | Text |
| rfq_id | String | System | Yes | UUID |
| project_id | String | System | Yes | UUID |

### 5.2 Lead Time Milestone Fields

| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| sampleA | String | LLM Extraction | No | Free text (e.g., "2 weeks", "14 days") |
| sampleBCD | String | LLM Extraction | No | Free text |
| prototype | String | LLM Extraction | No | Free text |
| offToolParts | String | LLM Extraction | No | Free text |
| offToolOrProcess | String | LLM Extraction | No | Free text |
| ppap | String | LLM Extraction | No | Free text |
| sop | String | LLM Extraction | No | Free text |

### 5.3 Data Displayed

| Field Name | Display Format | Source | Notes |
|------------|----------------|--------|-------|
| Supplier Name | Text | System | Shown in card header |
| Sample A | Text/Input | LLM Extraction | First milestone |
| Sample B/C/D | Text/Input | LLM Extraction | Combined sample phases |
| Prototype | Text/Input | LLM Extraction | Prototype delivery |
| Off-tool Parts | Text/Input | LLM Extraction | First parts from tooling |
| Off-tool or Process | Text/Input | LLM Extraction | Process validation |
| PPAP | Text/Input | LLM Extraction | Production Part Approval Process |
| SOP | Text/Input | LLM Extraction | Start of Production |

### 5.4 Milestone Definitions

**Sample A:**
- First sample parts for initial validation
- Typically hand-made or soft tooling
- Used for fit/form/function testing

**Sample B/C/D:**
- Progressive sample iterations
- Refinement of design and process
- Moving toward production-intent parts

**Prototype:**
- Production-intent prototype parts
- Full validation of design
- May use production tooling

**Off-tool Parts:**
- First parts from production tooling
- Validates tooling quality
- May require adjustments

**Off-tool or Process:**
- Process validation and optimization
- Ensures production capability
- Quality system validation

**PPAP (Production Part Approval Process):**
- Formal approval for production
- Complete documentation package
- Customer sign-off required

**SOP (Start of Production):**
- Full production begins
- Regular shipments to customer
- Project milestone completion

### 5.5 Data Format Flexibility

The system accepts various formats for lead time values:
- **Weeks:** "2 weeks", "8 weeks"
- **Days:** "14 days", "60 days"
- **Months:** "2 months", "6 months"
- **Dates:** "Jan 15, 2026", "2026-01-15"
- **Ranges:** "4-6 weeks", "30-45 days"
- **Relative:** "After tooling approval", "T+8 weeks"

No strict validation is enforced to accommodate supplier-specific formats. Normalization for comparison happens in backend analytics.

## 6. User Interactions

### 6.1 Primary Actions

**View Lead Time Breakdown**
- **Trigger:** Buyer clicks on lead time details link from Comparison Dashboard or Decision Dashboard
- **Behavior:** Screen displays with supplier name and all milestone values
- **Validation:** None (read-only view)
- **Success:** Buyer sees complete lead time breakdown
- **Error:** If no data available, shows "-" for all milestones
- **Navigation:** Remains on current screen

**Edit Milestone Values (Editable Mode)**
- **Trigger:** Buyer clicks on input field (if isEditable=true)
- **Behavior:** Input field becomes active, buyer can type/edit value
- **Validation:** None (free text accepted)
- **Success:** Value updates immediately, onUpdate callback triggered
- **Error:** N/A (no validation)
- **Navigation:** Remains on current screen

### 6.2 Secondary Actions

**Copy/Export Data**
- **Trigger:** Buyer selects text to copy
- **Behavior:** Standard browser copy functionality
- **Success:** Data copied to clipboard
- **Navigation:** Remains on current screen

### 6.3 Navigation

**From:**
- Comparison Dashboard (lead time column click)
- Decision Dashboard (lead time details link)
- Supplier detail view

**To:**
- Returns to previous screen (via browser back or close action)
- No explicit navigation buttons on this screen

**Exit Points:**
- Browser back button
- Close modal/card (if displayed in modal)
- Click outside card (if in overlay)

## 7. Business Rules

### 7.1 Display Rules

1. **Supplier Name Display**
   - MUST display supplier name in card header
   - Format: "Lead Time Breakdown - {Supplier Name}"
   - Supplier name MUST be non-empty

2. **Milestone Order**
   - Milestones MUST be displayed in chronological order:
     1. Sample A
     2. Sample B/C/D
     3. Prototype
     4. Off-tool Parts
     5. Off-tool or Process
     6. PPAP
     7. SOP
   - Order is fixed and cannot be changed

3. **Empty Value Handling**
   - If milestone value is null/undefined/empty, display "-"
   - Do not display "null" or "undefined" text
   - Empty values are acceptable (not all suppliers provide all milestones)

4. **Editable vs Read-Only Mode**
   - If isEditable=true, display input fields
   - If isEditable=false, display static text
   - Default: isEditable=true (allows buyer corrections)

### 7.2 Data Extraction Rules

1. **LLM Extraction**
   - System extracts lead time data from supplier documents
   - Looks for keywords: "lead time", "delivery", "timeline", "schedule", "sample", "prototype", "PPAP", "SOP"
   - Extracts values associated with each milestone
   - Confidence scoring applied to each extraction

2. **Format Tolerance**
   - System accepts any text format for lead time values
   - No strict validation or normalization at display level
   - Buyer can enter/edit values in any format

3. **Missing Data Handling**
   - If LLM cannot extract milestone data, field remains empty
   - Buyer can manually enter values if needed
   - System does not flag missing milestones as errors (optional data)

### 7.3 Update Rules

1. **Real-Time Updates**
   - When buyer edits value, onUpdate callback fires immediately
   - No "Save" button required
   - Changes persist to backend via callback

2. **Validation**
   - No validation applied to milestone values
   - Buyer can enter any text
   - Backend may normalize for comparison purposes

## 8. Acceptance Criteria

### 8.1 Functional Criteria

1. WHEN screen loads THEN it SHALL display supplier name in card header
2. WHEN screen loads THEN it SHALL display all 7 milestones in correct order
3. WHEN milestone has value THEN it SHALL display the value
4. WHEN milestone has no value THEN it SHALL display "-"
5. WHEN isEditable=true THEN milestone values SHALL be displayed in input fields
6. WHEN isEditable=false THEN milestone values SHALL be displayed as static text
7. WHEN buyer edits value in editable mode THEN onUpdate callback SHALL fire immediately
8. WHEN buyer edits value THEN new value SHALL be stored in component state
9. WHEN screen loads THEN it SHALL display information note about data source
10. WHEN supplier name is provided THEN it SHALL be displayed in header

### 8.2 Data Display Criteria

11. WHEN Sample A value exists THEN it SHALL be displayed in first row
12. WHEN Sample B/C/D value exists THEN it SHALL be displayed in second row
13. WHEN Prototype value exists THEN it SHALL be displayed in third row
14. WHEN Off-tool Parts value exists THEN it SHALL be displayed in fourth row
15. WHEN Off-tool or Process value exists THEN it SHALL be displayed in fifth row
16. WHEN PPAP value exists THEN it SHALL be displayed in sixth row
17. WHEN SOP value exists THEN it SHALL be displayed in seventh row
18. WHEN any milestone value is null/undefined/empty THEN it SHALL display "-"
19. WHEN milestone value is "0" or "N/A" THEN it SHALL display the actual value (not "-")
20. WHEN milestone value contains special characters THEN it SHALL display without escaping

### 8.3 Editable Mode Criteria

21. WHEN isEditable=true THEN each milestone SHALL have an input field
22. WHEN buyer clicks input field THEN it SHALL become active for editing
23. WHEN buyer types in input field THEN text SHALL appear immediately
24. WHEN buyer changes value THEN onUpdate SHALL be called with new data
25. WHEN buyer clears value THEN empty string SHALL be passed to onUpdate
26. WHEN input field has placeholder THEN it SHALL show "e.g., 2 weeks"
27. WHEN buyer tabs through fields THEN focus SHALL move to next input
28. WHEN buyer presses Enter THEN focus SHALL move to next input (optional)

### 8.4 Read-Only Mode Criteria

29. WHEN isEditable=false THEN milestone values SHALL be displayed as text
30. WHEN isEditable=false THEN no input fields SHALL be shown
31. WHEN isEditable=false THEN buyer SHALL NOT be able to edit values
32. WHEN isEditable=false AND value is empty THEN it SHALL display "-"
33. WHEN isEditable=false THEN text SHALL be styled consistently (text-sm)

### 8.5 Layout & Styling Criteria

34. WHEN screen loads THEN it SHALL display as a card component
35. WHEN screen loads THEN card SHALL have header with title and icon
36. WHEN screen loads THEN card SHALL have content section with table
37. WHEN screen loads THEN table SHALL have two columns: Milestone | Supplier Value
38. WHEN screen loads THEN header row SHALL have bold font and bottom border
39. WHEN screen loads THEN milestone rows SHALL have consistent spacing
40. WHEN screen loads THEN milestone names SHALL be bold and gray-700 color
41. WHEN screen loads THEN grid layout SHALL align columns properly
42. WHEN screen loads THEN information note SHALL be displayed at bottom
43. WHEN screen loads THEN information note SHALL have blue background and border
44. WHEN screen loads THEN Clock icon SHALL be displayed in header

### 8.6 UX Criteria

45. Screen SHALL load within 1 second
46. All milestone labels SHALL be clearly readable
47. Input fields SHALL be easily clickable (adequate size)
48. Placeholder text SHALL provide helpful example
49. Information note SHALL be clearly visible but not distracting
50. Card SHALL fit within standard dashboard layout
51. Text SHALL be legible at standard zoom levels
52. Color contrast SHALL meet accessibility standards (WCAG AA)

### 8.7 Data Integration Criteria

53. WHEN component receives leadTimeData prop THEN it SHALL display all values
54. WHEN component receives supplierName prop THEN it SHALL display in header
55. WHEN component receives onUpdate callback THEN it SHALL call on value changes
56. WHEN component receives isEditable=true THEN it SHALL enable editing
57. WHEN component receives isEditable=false THEN it SHALL disable editing
58. WHEN leadTimeData is empty object THEN all milestones SHALL show "-"
59. WHEN leadTimeData has partial data THEN only provided values SHALL show
60. WHEN supplierName is empty THEN header SHALL still display (with empty name)

### 8.8 Error Handling Criteria

61. WHEN leadTimeData prop is null THEN component SHALL handle gracefully (show "-" for all)
62. WHEN supplierName prop is null THEN component SHALL handle gracefully (show empty string)
63. WHEN onUpdate callback is not provided THEN component SHALL not crash
64. WHEN invalid data type is provided THEN component SHALL handle gracefully
65. WHEN milestone key doesn't exist in data THEN component SHALL show "-"

### 8.9 Accessibility Criteria

66. All input fields SHALL have proper labels (implicit via table structure)
67. Card SHALL have proper heading hierarchy (CardTitle as h3)
68. Information note SHALL be readable by screen readers
69. Icon SHALL have proper aria-label or be decorative
70. Keyboard navigation SHALL work for all interactive elements
71. Focus indicators SHALL be visible on input fields
72. Color SHALL not be the only means of conveying information

### 8.10 Edge Cases

73. WHEN milestone value is very long (>100 chars) THEN it SHALL wrap or truncate gracefully
74. WHEN milestone value contains line breaks THEN it SHALL display properly
75. WHEN milestone value contains HTML/script tags THEN it SHALL be escaped
76. WHEN multiple users edit simultaneously THEN last write SHALL win (no conflict resolution)
77. WHEN network fails during update THEN error SHALL be handled gracefully
78. WHEN buyer enters emoji or special Unicode THEN it SHALL display correctly
79. WHEN buyer copies text from milestone values THEN it SHALL copy cleanly
80. WHEN screen is resized THEN layout SHALL remain usable (responsive)

## 9. Dependencies

### 9.1 Prerequisites

**Data Requirements:**
- Supplier quote must be processed and extracted
- Lead time data must be extracted from supplier documents (or empty)
- Supplier name must be available

**System Requirements:**
- Component must be rendered within React application
- Card, CardHeader, CardTitle, CardContent components must be available
- Input component must be available
- Clock icon (lucide-react) must be available

**User Requirements:**
- Buyer must have access to Comparison Dashboard or Decision Dashboard
- Buyer must have permission to view supplier details

### 9.2 Backend/API Requirements

**Data Structure:**
```typescript
interface LeadTimeBreakdown {
  sampleA?: string;
  sampleBCD?: string;
  prototype?: string;
  offToolParts?: string;
  offToolOrProcess?: string;
  ppap?: string;
  sop?: string;
}
```

**API Endpoints:**
- GET `/api/suppliers/{supplierId}/lead-time` - Retrieve lead time data
- PUT `/api/suppliers/{supplierId}/lead-time` - Update lead time data (if editable)

**Data Flow:**
1. Parent component fetches lead time data from API
2. Parent component passes data to LeadTimeBreakdown component
3. Component displays data
4. If editable, component calls onUpdate callback on changes
5. Parent component sends updates to API

### 9.3 Integration Points

**Comparison Dashboard:**
- Lead time column shows summary (e.g., "SOP: 12 weeks")
- Click on lead time opens detailed breakdown (this screen)
- Can be displayed in modal or side panel

**Decision Dashboard:**
- Lead time section shows summary for all suppliers
- Click on supplier lead time opens detailed breakdown
- Can be displayed in modal or side panel

**LLM Extraction Service:**
- Extracts lead time data from supplier documents
- Maps extracted values to milestone fields
- Provides confidence scores for each extraction

**DynamoDB:**
- Stores lead time data in Quote entity
- Graph structure: Project → RFQ → Quote → LeadTimeBreakdown
- Flexible schema allows additional milestones in future

## 10. Success Metrics

### 10.1 Functional Metrics

- **Data Completeness:** % of suppliers with at least 4 of 7 milestones populated
- **Extraction Accuracy:** % of lead time values correctly extracted by LLM
- **Edit Frequency:** % of lead time values manually corrected by buyers
- **Usage Frequency:** % of RFQs where buyers view lead time breakdown

### 10.2 User Experience Metrics

- **Load Time:** Screen loads within 1 second
- **Interaction Time:** Buyers spend <30 seconds reviewing lead time breakdown
- **Error Rate:** <1% of interactions result in errors
- **User Satisfaction:** 4/5 rating for lead time breakdown usefulness

### 10.3 Business Impact Metrics

- **Decision Quality:** Lead time analysis contributes to 20% of supplier selection decisions
- **Schedule Risk Reduction:** 30% reduction in schedule-related supplier issues
- **Time Savings:** 5 minutes saved per RFQ by having structured lead time comparison

## 11. Open Questions

1. **Milestone Customization:** Should buyers be able to add custom milestones beyond the standard 7?
   - **Current Approach:** Fixed 7 milestones for MVP
   - **Future Consideration:** Allow custom milestones in post-MVP

2. **Target Lead Times:** Should system allow buyers to set target lead times for each milestone?
   - **Current Approach:** No targets in MVP, just display supplier values
   - **Future Consideration:** Add target comparison and variance highlighting

3. **Lead Time Normalization:** Should system normalize lead time formats (e.g., "2 weeks" → "14 days")?
   - **Current Approach:** Display as-is, no normalization at UI level
   - **Future Consideration:** Backend normalization for comparison analytics

4. **Historical Comparison:** Should system show historical lead times from previous RFQs with same supplier?
   - **Current Approach:** No historical comparison in MVP
   - **Future Consideration:** Add historical trend analysis

5. **Milestone Dependencies:** Should system validate milestone sequence (e.g., PPAP must come after Prototype)?
   - **Current Approach:** No validation in MVP
   - **Future Consideration:** Add logical sequence validation

6. **Multi-Part RFQs:** How should lead times be displayed for RFQs with multiple parts?
   - **Current Approach:** One lead time breakdown per supplier (assumes same timeline for all parts)
   - **Future Consideration:** Part-specific lead time breakdowns

7. **Confidence Scores:** Should system display LLM confidence scores for each extracted milestone?
   - **Current Approach:** No confidence scores displayed in MVP
   - **Future Consideration:** Add confidence indicators for low-confidence extractions

8. **Comparison View:** Should system provide side-by-side comparison of lead times across all suppliers?
   - **Current Approach:** One supplier at a time in MVP
   - **Future Consideration:** Add multi-supplier comparison matrix

---

**Document Version:** 1.0  
**Created:** January 2, 2026  
**Status:** Complete  
**Total Acceptance Criteria:** 80
