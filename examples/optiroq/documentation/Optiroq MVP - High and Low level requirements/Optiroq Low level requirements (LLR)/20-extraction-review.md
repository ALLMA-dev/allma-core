# Extraction Review

## 1. Overview
- **Screen ID:** SCR-020
- **Component File:** `src/app/components/ExtractionReview.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 3 - Multi-Format Extraction & Normalization
- **Priority:** P0 (Must Have)
- **Flexibility Level:** High - Dynamic fields based on RFQ configuration and extraction results

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** review and correct extracted data from supplier quotes side-by-side with original files  
**So that** I can ensure accuracy before the data is used in comparison boards and decision-making

### Related User Stories
- **US-MVP-07:** Extract Data from Excel Files
- **US-MVP-08:** Extract Data from PDF Files
- **US-MVP-10:** Review Low-Confidence Extractions
- **US-MVP-11:** Detect Missing Mandatory Fields
- **US-MVP-12:** Detect Hidden Costs (Embedded Tooling)

## 3. Screen Purpose & Context

### Purpose
This screen is the critical quality control checkpoint for extracted supplier data. It provides:
- **Side-by-side comparison:** Original files next to extracted data
- **Confidence scoring:** Visual indicators for extraction quality
- **Issue detection:** Automatic flagging of missing fields and anomalies
- **Manual correction:** Ability to edit and confirm extracted values
- **Multi-part support:** Review data for multiple parts in same RFQ
- **Version history:** Track changes across multiple supplier responses
- **Batch review:** Review multiple suppliers in single session
- **Original file access:** View all supplier files and emails

### Context
- **When user sees this:** 
  - After clicking "Review Extraction" in notification (Screen 19)
  - After extraction completes for supplier quote
  - When medium/low confidence extractions detected
  - When missing mandatory fields detected
- **Why it exists:** 
  - Extraction is not 100% accurate, needs human verification
  - Missing fields require buyer attention
  - Anomalies need investigation
  - Critical for data quality before comparison
  - Prevents garbage-in-garbage-out in decision-making
- **Position in journey:** 
  - After Notifications (Screen 19)
  - Before Follow-Up Preview (Screen 21) if issues found
  - Before Comparison Board (Screen 23) if data approved
  - Parallel to ongoing quote processing for other suppliers

### Key Characteristics
- **Split-screen layout:** Original file (left) + extracted data (right)
- **Collapsible sections:** Expand/collapse by cost category
- **Confidence badges:** Green (high), yellow (medium), red (low/missing)
- **Inline editing:** Click to edit any extracted value
- **Multi-year data:** Support for 2026-2031 projections
- **Lead time milestones:** 7 milestones (Sample A/B/C/D, Prototype, Off-tool, PPAP, SOP)
- **Enhanced logistics:** Carton, Euro Pallet, Returnable Packaging, Cleaning
- **Tooling transparency:** Amortization unit, included in piece price, maintenance
- **Part selection:** Dropdown to switch between parts in multi-part RFQ
- **Version history:** Snapshot selector to view previous extractions


## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Container:**
1. **Page Header**
   - Title: "Screen 22: Extraction Review"
   - Subtitle: "Review extracted data and confirm accuracy"
   - Part selector dropdown (multi-part RFQs)
   - Version/snapshot selector dropdown

2. **Overall Statistics Card**
   - Total fields across all suppliers
   - Extracted count
   - Missing count
   - Medium confidence count
   - Supplier count

3. **Supplier Cards (Collapsible)**
   - One card per supplier
   - Color-coded by status (red=issues, yellow=warning, blue=good)
   - Supplier name and RFQ ID
   - Summary statistics
   - Issues list
   - Expand/collapse button

4. **Supplier Detail View (When Expanded)**
   - Issues summary box (if issues exist)
   - Extraction summary card
   - Review and edit section (collapsible)
   - Split-screen layout:
     - Left: Original file preview (collapsible)
     - Right: Extracted data fields (editable)
   - Cost category sections (collapsible):
     - Material Costs
     - Process Costs
     - Tooling Costs
     - Logistics
     - Lead Time Milestones
     - Terms & Conditions
   - Action buttons (Approve, Request Follow-up)

5. **Demo Navigation Hint (Blue)**
   - Next step guidance

### 4.2 Key UI Elements

**Page Header:**
- **Title:** "Screen 22: Extraction Review"
  - Font: text-3xl, font-bold, text-gray-900
- **Subtitle:** "Review extracted data and confirm accuracy"
  - Font: text-base, text-gray-600, mt-2

**Part Selector Dropdown:**
- **Container:** Relative positioning with dropdown
- **Button:** Flex with items-center, gap-2, px-4, py-2, border, rounded-lg
- **Icon:** Package icon (size-5)
- **Label:** "Part:" (text-sm, text-gray-600)
- **Value:** Part number (font-medium, text-gray-900)
- **Dropdown icon:** ChevronDown (size-4)
- **Dropdown menu:** Absolute, bg-white, border, rounded-lg, shadow-lg
- **Menu items:** Part number + description

**Version/Snapshot Selector:**
- **Container:** Similar to part selector
- **Icon:** Clock icon (size-5)
- **Label:** "Version:" (text-sm, text-gray-600)
- **Value:** "Latest" or version number
- **Dropdown:** Shows version history with:
  - Version number
  - Timestamp
  - Trigger event description
  - Email subject (if applicable)
  - Changes summary

**Overall Statistics Card:**
- **Container:** Card with max-w-4xl mx-auto
- **Title:** "Overall Extraction Status"
- **Grid:** grid-cols-5, gap-4
- **Each stat:**
  - Label: text-sm, text-gray-600
  - Value: text-2xl, font-bold, text-gray-900
  - Icon: Relevant icon (size-5)

**Supplier Card (Collapsed):**
- **Container:** Card with border-l-4 (color-coded)
- **Border colors:**
  - Red: border-l-red-500 (high issues)
  - Yellow: border-l-yellow-500 (warnings)
  - Blue: border-l-blue-500 (no issues)
- **Header:** Button (full width, clickable)
- **Layout:** Flex with items-center, justify-between
- **Left side:**
  - Supplier name (text-lg, font-semibold)
  - RFQ ID (text-sm, text-gray-600)
  - Status badges (extracted/missing/medium confidence)
- **Right side:**
  - Expand/collapse icon (ChevronDown/ChevronUp)

**Supplier Card (Expanded):**
- **Issues Summary Box (if issues):**
  - Container: p-4, rounded-lg, border, bg-red-50, border-red-300
  - Title: "Issues Detected:" (font-semibold, text-gray-900)
  - List: ul with space-y-2
  - Each issue:
    - Icon: AlertTriangle (size-4, text-red-600)
    - Field name (font-medium)
    - Description (text-sm)

**Extraction Summary Card:**
- **Container:** Card
- **Title:** "Extraction Summary" (text-base)
- **Content:** space-y-3
- **Each category:**
  - Layout: Flex with items-center, justify-between, text-sm
  - Label: Category name (text-gray-600)
  - Badge: Status badge with icon
    - Green: "Extracted" (Check icon)
    - Yellow: "Needs Review" (AlertTriangle icon)
    - Red: "Missing Fields" (X icon)

**Review and Edit Section:**
- **Trigger button:**
  - Full width, flex, items-center, justify-between
  - Background: bg-gray-50, border, rounded-lg
  - Hover: hover:bg-gray-100
  - Title: "Review and edit extracted data"
  - Subtitle: "Compare the original file with extracted values and confirm accuracy"
  - Icon: ChevronUp/ChevronDown

**Split-Screen Layout:**
- **Container:** Flex with gap-6
- **Left panel (Original File):**
  - Width: w-1/2 when open, w-10 when collapsed
  - Transition: transition-all duration-300
  - Collapsible with chevron button
- **Right panel (Extracted Data):**
  - Width: Flex-1 (takes remaining space)
  - Always visible

**Original File Preview:**
- **Header:**
  - Title: "Original File"
  - Buttons: Zoom In, Zoom Out, Download, Collapse
- **File selector dropdown:**
  - Shows all files and emails from supplier
  - Grouped: Files section + Emails section
  - Icons: FileSpreadsheet (Excel), FileText (PDF), Mail (Email)
- **Preview area:**
  - Excel: Table view with highlighted cells
  - PDF: Document view with formatted content
  - Email: Email thread view
- **Highlight legend:**
  - Green: Extracted with high confidence
  - Yellow: Needs review
  - White: Not extracted

**Extracted Data Fields:**
- **Cost Category Sections (Collapsible):**
  - Material Costs
  - Process Costs
  - Tooling Costs
  - Logistics
  - Lead Time Milestones
  - Terms & Conditions

**Field Display Pattern:**
- **Container:** Flex with items-center, justify-between, py-2, border-b
- **Left side:**
  - Field label (text-sm, text-gray-600)
  - Confidence badge (if applicable)
- **Right side:**
  - Field value (text-sm, font-medium, text-gray-900)
  - Edit button (pencil icon)
- **Editable state:**
  - Input field replaces value
  - Confirm (check) and cancel (X) buttons
  - Auto-save on blur or Enter key

**Multi-Year Data Fields:**
- **Container:** Grid with columns for each year (2026-2031)
- **Header row:** Year labels
- **Data row:** Values for each year
- **Editable:** Click any cell to edit

**Confidence Badges:**
- **High confidence:**
  - Style: bg-green-50, border-green-300, text-green-700
  - Icon: Check (size-3)
  - Text: "High confidence"
- **Medium confidence:**
  - Style: bg-yellow-50, border-yellow-300, text-yellow-700
  - Icon: AlertTriangle (size-3)
  - Text: "Medium confidence"
- **Low confidence / Missing:**
  - Style: bg-red-50, border-red-300, text-red-700
  - Icon: X (size-3)
  - Text: "Missing" or "Low confidence"

**Action Buttons (Bottom of Supplier Section):**
1. **Approve Extraction:**
   - Style: bg-blue-600, hover:bg-blue-700
   - Icon: Check (size-4, mr-2)
   - Text: "Approve Extraction"
   - Enabled: When all high-priority issues resolved

2. **Request Follow-up:**
   - Style: variant-outline
   - Icon: Mail (size-4, mr-2)
   - Text: "Request Follow-up"
   - Enabled: When missing fields or low confidence

3. **Download Extracted Data:**
   - Style: variant-outline
   - Icon: Download (size-4, mr-2)
   - Text: "Download as Excel"

**Demo Navigation Hint:**
- **Container:** bg-blue-50, border border-blue-200, rounded-lg, p-4, max-w-4xl mx-auto
- **Text:** "Demo Navigation: Click 'Next' in the header to see follow-up preview →"
  - Font: text-sm, text-blue-900, text-center
  - Bold: "Demo Navigation:"

### 4.3 Information Hierarchy

**Primary Information:**
- Supplier name and status
- Issues detected (if any)
- Missing mandatory fields
- Low/medium confidence extractions
- Approve/Request Follow-up buttons

**Secondary Information:**
- Extraction summary by category
- Original file preview
- Extracted field values
- Confidence scores

**Tertiary Information:**
- Overall statistics
- Part selector
- Version history
- Demo navigation hint


## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| extraction_id | String | System | Yes | Unique extraction identifier |
| rfq_id | String | RFQ data | Yes | RFQ identifier |
| supplier_id | String | Supplier data | Yes | Supplier identifier |
| part_id | String | Part data | Yes | Part identifier (multi-part support) |
| extraction_timestamp | DateTime | System | Yes | ISO 8601 format |
| extraction_version | Integer | System | Yes | Version number (1, 2, 3...) |
| extraction_status | Enum | System | Yes | 'pending', 'reviewed', 'approved' |
| reviewer_id | String | User session | No | User who reviewed |
| reviewed_at | DateTime | System | No | Review timestamp |

### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| confidence_threshold_high | Float | Yes | No | >90% (green badge) |
| confidence_threshold_medium | Float | Yes | No | 70-90% (yellow badge) |
| confidence_threshold_low | Float | Yes | No | <70% (red badge) |
| mandatory_fields_list | Array<String> | Yes | Yes | Per commodity type |

### 5.3 Dynamic Fields (Buyer-Selectable)
| Field Name | Data Type | Conditions | Validation Rules | Default Value |
|------------|-----------|------------|------------------|---------------|
| material_type | String | Always | Max 100 chars | '' |
| cost_per_kg | Object | Always | Multi-year (2026-2031) | {} |
| gross_weight | Float | Always | Min 0, unit: kg | 0 |
| net_weight | Float | Always | Min 0, unit: kg | 0 |
| scrap_value | Object | Always | Multi-year (2026-2031) | {} |
| operations | String | Always | Max 200 chars | '' |
| cycle_time | String | Always | Format: "X seconds" | '' |
| labor_cost | Object | Always | Multi-year (2026-2031) | {} |
| overhead | Object | Always | Multi-year (2026-2031) | {} |
| tooling_investment | Object | Always | Multi-year (2026-2031) | {} |
| amortization_period | String | Always | Format: "X pieces/months/years" | '' |
| amortization_unit | Enum | Always | 'pieces', 'months', 'years' | 'pieces' |
| included_in_piece_price | Boolean | Always | True/False | False |
| amortization_amount | String | Conditional | If included_in_piece_price=true | '' |
| maintenance_cost | String | Always | Format: "€X/year" | '' |
| packaging_cost | Object | Always | Multi-year (2026-2031) | {} |
| packaging_type | String | Always | Carton, Euro Pallet, Returnable | 'Carton' |
| transportation_cost | Object | Always | Multi-year (2026-2031) | {} |
| transport_mode | String | Always | Road, Sea, Air, Rail | 'Road Freight' |
| cleaning_required | Boolean | Always | True/False | False |
| cleaning_cost | String | Conditional | If cleaning_required=true | '' |
| incoterms | String | Always | EXW, FOB, CIF, etc. | '' |
| payment_terms | String | Always | Net 30/60/90 | '' |
| currency | String | Always | EUR, USD, GBP, etc. | 'EUR' |
| lead_time_sample_a | String | Always | Format: "X weeks" | '' |
| lead_time_sample_bcd | String | Always | Format: "X weeks" | '' |
| lead_time_prototype | String | Always | Format: "X weeks" | '' |
| lead_time_off_tool_parts | String | Always | Format: "X weeks" | '' |
| lead_time_off_tool_process | String | Always | Format: "X weeks" | '' |
| lead_time_ppap | String | Always | Format: "X weeks" | '' |
| lead_time_sop | String | Always | Format: "X weeks" | '' |

### 5.4 Data Displayed
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| supplier_name | String | Supplier data | Yes | Display in card header |
| rfq_id | String | RFQ data | Yes | Display in card header |
| part_number | String | Part data | Yes | Display in part selector |
| part_description | String | Part data | Yes | Display in part selector |
| extraction_summary | Object | Extraction results | Yes | Category-level status |
| confidence_scores | Object | Extraction results | Yes | Per-field confidence |
| issues_list | Array<Object> | Validation results | Yes | Detected issues |
| original_files | Array<Object> | File storage | Yes | Supplier files |
| original_emails | Array<Object> | Email storage | Yes | Email thread |
| version_history | Array<Object> | Version tracking | Yes | Previous extractions |
| overall_statistics | Object | Computed | Yes | Aggregate stats |

### 5.5 Data Collected from User
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| field_corrections | Object | No | Per-field edits | {} |
| field_confirmations | Object | No | Per-field boolean | {} |
| approval_decision | Enum | Yes | 'approved', 'follow_up_needed' | None |
| follow_up_notes | String | Conditional | If follow_up_needed | '' |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| total_fields_count | Count all fields per supplier | Field definitions |
| extracted_count | Count fields with values | Extraction results |
| missing_count | Count fields without values | Extraction results |
| medium_confidence_count | Count fields with 70-90% confidence | Confidence scores |
| high_confidence_count | Count fields with >90% confidence | Confidence scores |
| issues_count | Count detected issues | Validation results |
| scrap_ratio | (gross_weight - net_weight) / gross_weight | gross_weight, net_weight |
| overall_status_color | Determine red/yellow/blue based on issues | issues_count, missing_count |


## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration
- **Multi-part support:** Part selector dropdown switches between parts in same RFQ
- **Version history:** Snapshot selector shows previous extractions and changes
- **Dynamic fields:** Fields adapt based on RFQ configuration and commodity type
- **Conditional fields:** Amortization amount only shown if tooling included in piece price
- **Multi-year data:** 2026-2031 projections for cost fields
- **Lead time milestones:** 7 milestones configurable per supplier

### 6.2 UI Adaptation Logic
- **Supplier cards:** Auto-expand if high-priority issues detected
- **Original file panel:** Collapsible to maximize extracted data view
- **Cost categories:** Collapsible sections, auto-expand if issues in category
- **Confidence badges:** Color-coded based on threshold configuration
- **Action buttons:** Enabled/disabled based on validation status

### 6.3 LLM Integration
- **Extraction:** Modular LLM extracts data from files block-by-block
- **Confidence scoring:** LLM provides confidence level per field
- **Anomaly detection:** LLM identifies unusual values or patterns
- **Field mapping:** LLM maps supplier terminology to standard fields
- **Fallback:** Manual review if confidence <70%

## 7. User Interactions

### 7.1 Primary Actions

**Action: Select Part (Multi-Part RFQ)**
- **Trigger:** User clicks part selector dropdown
- **Behavior:** Shows list of parts, user selects one, screen refreshes with that part's data
- **Validation:** None
- **Success:** Screen displays selected part's extraction data
- **Navigation:** Stays on extraction review screen

**Action: Select Version/Snapshot**
- **Trigger:** User clicks version selector dropdown
- **Behavior:** Shows version history, user selects version, screen shows that snapshot
- **Validation:** None
- **Success:** Screen displays historical extraction data
- **Navigation:** Stays on extraction review screen

**Action: Expand/Collapse Supplier Card**
- **Trigger:** User clicks supplier card header
- **Behavior:** Toggles expanded/collapsed state
- **Validation:** None
- **Success:** Card expands or collapses
- **Navigation:** Stays on screen

**Action: Toggle Original File Panel**
- **Trigger:** User clicks collapse/expand button on file panel
- **Behavior:** Collapses to thin bar or expands to half-width
- **Validation:** None
- **Success:** Panel resizes
- **Navigation:** Stays on screen

**Action: Select Original File/Email**
- **Trigger:** User selects from file dropdown
- **Behavior:** Preview area shows selected file or email
- **Validation:** None
- **Success:** File/email displays in preview
- **Navigation:** Stays on screen

**Action: Edit Extracted Field**
- **Trigger:** User clicks edit icon next to field value
- **Behavior:** Field becomes editable input, user types new value, clicks confirm or cancel
- **Validation:** Field-specific validation (format, range, etc.)
- **Success:** Field value updated, confidence set to 100%
- **Error:** Validation error message shown
- **Navigation:** Stays on screen

**Action: Confirm Field Value**
- **Trigger:** User clicks checkmark next to field
- **Behavior:** Field marked as confirmed, confidence set to 100%
- **Validation:** None
- **Success:** Field confirmed
- **Navigation:** Stays on screen

**Action: Approve Extraction**
- **Trigger:** User clicks "Approve Extraction" button
- **Behavior:** 
  - Validates all mandatory fields present
  - Marks extraction as approved
  - Updates comparison board
  - Shows success message
  - Navigates to next supplier or comparison board
- **Validation:** All mandatory fields must be present and confirmed
- **Success:** "Extraction approved for Supplier X"
- **Error:** "Please resolve all high-priority issues before approving"
- **Navigation:** To next supplier with issues, or to Comparison Board (Screen 23)

**Action: Request Follow-up**
- **Trigger:** User clicks "Request Follow-up" button
- **Behavior:** 
  - Opens Follow-Up Preview screen (Screen 21)
  - Pre-fills missing fields and low-confidence items
  - User can edit follow-up email
  - User approves sending
- **Validation:** At least one issue must exist
- **Success:** Navigate to Follow-Up Preview
- **Error:** None
- **Navigation:** To Screen 21 (Follow-Up Preview)

**Action: Download Extracted Data**
- **Trigger:** User clicks "Download as Excel" button
- **Behavior:** Downloads Excel file with all extracted data for this supplier
- **Validation:** None
- **Success:** File downloads
- **Error:** "Download failed. Please try again."
- **Navigation:** Stays on screen

### 7.2 Secondary Actions
- **Zoom In/Out:** Zoom original file preview
- **Download Original File:** Download supplier's original file
- **Upload New File:** Upload additional file from supplier
- **Expand/Collapse Cost Category:** Toggle category sections
- **View Email Thread:** View full email conversation with supplier

### 7.3 Navigation
- **From:** Screen 19 (Notifications) via "Review Extraction" button
- **To:** 
  - Screen 21 (Follow-Up Preview) via "Request Follow-up"
  - Screen 23 (Comparison Board) via "Approve Extraction"
  - Next supplier with issues (if multiple suppliers)

## 8. Business Rules

### 8.1 Validation Rules
- **Mandatory fields:** Must be present for approval (per commodity type)
- **Confidence threshold:** <70% requires review, 70-90% flagged, >90% auto-approved
- **Scrap ratio:** >30% flagged as anomaly
- **Material cost:** >20% above average flagged
- **Tooling:** Must be explicit (not embedded in process costs)
- **Multi-year data:** All years must have values if any year has value
- **Lead time:** All 7 milestones must be present
- **Amortization:** If included in piece price, amount must be specified

### 8.2 Calculation Logic
- **Scrap ratio:** (gross_weight - net_weight) / gross_weight * 100%
- **Overall status:** Red if missing mandatory fields, yellow if medium confidence, blue if all good
- **Issue count:** Sum of missing fields + low confidence + anomalies
- **Extraction progress:** extracted_count / total_fields_count * 100%

### 8.3 Conditional Display Logic
- **Show issues box:** If issues_count > 0
- **Show amortization amount:** If included_in_piece_price = true
- **Show cleaning cost:** If cleaning_required = true
- **Auto-expand supplier:** If hasHighIssues = true
- **Auto-expand category:** If category has issues
- **Enable approve button:** If all mandatory fields present and confirmed

### 8.4 Error Handling
- **Extraction failure:** Show error message, allow manual entry
- **File load failure:** Show error, provide download link
- **Save failure:** Show error, retry automatically
- **Validation failure:** Show specific error per field
- **Network error:** Show error, enable retry

## 9. Acceptance Criteria

### 9.1 Functional Criteria (80 total)

**Page Load & Navigation**
1. WHEN user clicks "Review Extraction" in notification THEN Extraction Review screen SHALL load
2. WHEN screen loads THEN overall statistics card SHALL be visible
3. WHEN screen loads THEN all supplier cards SHALL be visible
4. WHEN screen loads THEN suppliers with high issues SHALL be auto-expanded
5. WHEN screen loads THEN suppliers without issues SHALL be collapsed

**Part Selection (Multi-Part RFQ)**
6. WHEN RFQ has multiple parts THEN part selector dropdown SHALL be visible
7. WHEN user clicks part selector THEN dropdown SHALL show all parts with descriptions
8. WHEN user selects part THEN screen SHALL refresh with that part's data
9. WHEN RFQ has single part THEN part selector SHALL NOT be visible

**Version History**
10. WHEN user clicks version selector THEN dropdown SHALL show version history
11. WHEN version history shown THEN each version SHALL display timestamp, trigger event, changes
12. WHEN user selects version THEN screen SHALL show that snapshot's data
13. WHEN user selects "Latest" THEN screen SHALL show current extraction

**Supplier Cards**
14. WHEN supplier has high issues THEN card SHALL have red left border
15. WHEN supplier has warnings THEN card SHALL have yellow left border
16. WHEN supplier has no issues THEN card SHALL have blue left border
17. WHEN card collapsed THEN summary statistics SHALL be visible
18. WHEN card collapsed THEN issues count SHALL be visible
19. WHEN user clicks card header THEN card SHALL expand or collapse

**Issues Summary**
20. WHEN supplier has issues THEN issues summary box SHALL be visible
21. WHEN issues summary shown THEN each issue SHALL have icon, field name, description
22. WHEN issue is critical THEN red alert icon SHALL be shown
23. WHEN issue is warning THEN yellow alert icon SHALL be shown

**Extraction Summary**
24. WHEN supplier expanded THEN extraction summary card SHALL be visible
25. WHEN category extracted THEN green "Extracted" badge SHALL be shown
26. WHEN category has medium confidence THEN yellow "Needs Review" badge SHALL be shown
27. WHEN category missing fields THEN red "Missing Fields" badge SHALL be shown

**Original File Preview**
28. WHEN review section expanded THEN original file panel SHALL be visible
29. WHEN file panel open THEN file selector dropdown SHALL be visible
30. WHEN file selector clicked THEN all files and emails SHALL be listed
31. WHEN file selected THEN preview SHALL show that file
32. WHEN Excel file selected THEN table view SHALL be shown
33. WHEN PDF file selected THEN document view SHALL be shown
34. WHEN email selected THEN email thread SHALL be shown
35. WHEN file panel collapsed THEN thin bar SHALL be shown
36. WHEN user clicks collapsed panel THEN panel SHALL expand

**Extracted Data Fields**
37. WHEN review section expanded THEN extracted data fields SHALL be visible
38. WHEN field has high confidence THEN green badge SHALL be shown
39. WHEN field has medium confidence THEN yellow badge SHALL be shown
40. WHEN field missing THEN red badge SHALL be shown
41. WHEN field missing THEN value SHALL show "Not found"
42. WHEN user clicks edit icon THEN field SHALL become editable
43. WHEN user edits field THEN confirm and cancel buttons SHALL appear
44. WHEN user confirms edit THEN value SHALL update and confidence set to 100%
45. WHEN user cancels edit THEN original value SHALL be restored
46. WHEN user clicks checkmark THEN field SHALL be marked as confirmed

**Multi-Year Data**
47. WHEN field has multi-year data THEN grid with years 2026-2031 SHALL be shown
48. WHEN user edits multi-year field THEN all years SHALL be editable
49. WHEN user confirms multi-year edit THEN all years SHALL update

**Cost Categories**
50. WHEN supplier expanded THEN Material Costs section SHALL be visible
51. WHEN supplier expanded THEN Process Costs section SHALL be visible
52. WHEN supplier expanded THEN Tooling Costs section SHALL be visible
53. WHEN supplier expanded THEN Logistics section SHALL be visible
54. WHEN supplier expanded THEN Lead Time Milestones section SHALL be visible
55. WHEN supplier expanded THEN Terms & Conditions section SHALL be visible
56. WHEN category has issues THEN category SHALL be auto-expanded
57. WHEN category has no issues THEN category SHALL be collapsed
58. WHEN user clicks category header THEN category SHALL expand or collapse

**Tooling Transparency**
59. WHEN tooling section shown THEN amortization unit dropdown SHALL be visible
60. WHEN tooling section shown THEN "Included in piece price" toggle SHALL be visible
61. WHEN included in piece price = true THEN amortization amount field SHALL be visible
62. WHEN included in piece price = false THEN amortization amount field SHALL NOT be visible
63. WHEN tooling section shown THEN maintenance cost field SHALL be visible

**Lead Time Milestones**
64. WHEN lead time section shown THEN Sample A field SHALL be visible
65. WHEN lead time section shown THEN Sample B/C/D field SHALL be visible
66. WHEN lead time section shown THEN Prototype field SHALL be visible
67. WHEN lead time section shown THEN Off-tool Parts field SHALL be visible
68. WHEN lead time section shown THEN Off-tool Process field SHALL be visible
69. WHEN lead time section shown THEN PPAP field SHALL be visible
70. WHEN lead time section shown THEN SOP field SHALL be visible

**Logistics Fields**
71. WHEN logistics section shown THEN packaging type dropdown SHALL be visible
72. WHEN logistics section shown THEN transport mode dropdown SHALL be visible
73. WHEN logistics section shown THEN cleaning required toggle SHALL be visible
74. WHEN cleaning required = true THEN cleaning cost field SHALL be visible
75. WHEN cleaning required = false THEN cleaning cost field SHALL NOT be visible

**Action Buttons**
76. WHEN all mandatory fields present THEN "Approve Extraction" button SHALL be enabled
77. WHEN mandatory fields missing THEN "Approve Extraction" button SHALL be disabled
78. WHEN issues exist THEN "Request Follow-up" button SHALL be enabled
79. WHEN no issues THEN "Request Follow-up" button SHALL be disabled
80. WHEN user clicks "Download as Excel" THEN Excel file SHALL download

### 9.2 Flexibility Criteria (10 total)
1. WHEN RFQ has 1 part THEN part selector SHALL NOT be shown
2. WHEN RFQ has 2+ parts THEN part selector SHALL be shown
3. WHEN buyer selects different part THEN all data SHALL refresh for that part
4. WHEN extraction has 1 version THEN version selector SHALL show "Latest" only
5. WHEN extraction has 2+ versions THEN version selector SHALL show all versions
6. WHEN buyer selects historical version THEN all data SHALL show that snapshot
7. WHEN admin changes confidence thresholds THEN badge colors SHALL update
8. WHEN admin changes mandatory fields THEN validation SHALL update
9. WHEN commodity type changes THEN mandatory fields SHALL update
10. WHEN RFQ configuration changes THEN displayed fields SHALL update

### 9.3 UX Criteria (20 total)
1. Screen SHALL load within 3 seconds
2. Supplier cards SHALL be sorted by status (red first, then yellow, then blue)
3. High-priority issues SHALL be clearly visible without scrolling
4. Original file preview SHALL be readable and zoomable
5. Extracted data fields SHALL be clearly labeled
6. Confidence badges SHALL be color-coded and consistent
7. Edit mode SHALL be clearly indicated
8. Confirm/cancel buttons SHALL be clearly visible
9. Multi-year data SHALL be displayed in readable grid
10. Cost categories SHALL be clearly separated
11. Action buttons SHALL be prominently placed
12. Success/error messages SHALL be clear and actionable
13. File selector SHALL show file type icons
14. Version history SHALL show meaningful descriptions
15. Issues SHALL be grouped by severity
16. Missing fields SHALL be clearly marked
17. Anomalies SHALL be explained in plain language
18. Navigation SHALL be intuitive
19. Screen SHALL be responsive (desktop focus)
20. Demo navigation hint SHALL be clearly separated

### 9.4 Performance Criteria (10 total)
1. Screen SHALL load within 3 seconds
2. Part switching SHALL complete within 1 second
3. Version switching SHALL complete within 1 second
4. File preview SHALL load within 2 seconds
5. Field edit SHALL save within 500ms
6. Supplier card expand/collapse SHALL be smooth (<300ms)
7. Category expand/collapse SHALL be smooth (<300ms)
8. File panel collapse/expand SHALL be smooth (<300ms)
9. Excel download SHALL initiate within 1 second
10. Approval SHALL process within 2 seconds

### 9.5 Accessibility Criteria (15 total)
1. All interactive elements SHALL be keyboard accessible
2. All images SHALL have alt text
3. Color SHALL NOT be the only indicator of status
4. Text SHALL have sufficient contrast (WCAG AA)
5. Focus indicators SHALL be visible
6. Screen readers SHALL announce status changes
7. Form fields SHALL have labels
8. Error messages SHALL be associated with fields
9. Buttons SHALL have descriptive labels
10. Dropdowns SHALL be keyboard navigable
11. Collapsible sections SHALL announce state
12. Confidence badges SHALL have text equivalents
13. Icons SHALL have text labels
14. File previews SHALL be accessible
15. Multi-year grids SHALL be navigable with keyboard

### 9.6 Security Criteria (15 total)
1. Original files SHALL be accessed over encrypted connection
2. File downloads SHALL require authorization
3. Edits SHALL be logged for audit trail
4. User permissions SHALL be enforced
5. Sensitive data SHALL be protected in transit
6. File uploads SHALL be scanned for malware
7. SQL injection SHALL be prevented
8. XSS attacks SHALL be prevented
9. CSRF protection SHALL be enabled
10. Session timeout SHALL be enforced
11. File access SHALL be logged
12. Data modifications SHALL be logged
13. Approval actions SHALL be logged
14. User identity SHALL be verified
15. Data SHALL be encrypted at rest

## 10. Dependencies

### 10.1 Prerequisites
- Extraction must be complete (from Screen 19)
- Original files must be stored and accessible
- Confidence scores must be calculated
- Anomalies must be detected
- Validation must be complete

### 10.2 Backend/API Requirements
- **GET /api/extraction/{extraction_id}:** Retrieve extraction data
- **GET /api/extraction/{extraction_id}/versions:** Retrieve version history
- **PUT /api/extraction/{extraction_id}/field:** Update field value
- **POST /api/extraction/{extraction_id}/approve:** Approve extraction
- **POST /api/extraction/{extraction_id}/follow-up:** Request follow-up
- **GET /api/files/{file_id}:** Retrieve original file
- **GET /api/files/{file_id}/preview:** Generate file preview
- **POST /api/extraction/{extraction_id}/download:** Generate Excel export

### 10.3 Integration Points
- **Screen 19:** Notifications (entry point)
- **Screen 21:** Follow-Up Preview (if follow-up needed)
- **Screen 23:** Comparison Board (if approved)
- **File storage:** S3 for original files
- **LLM service:** For extraction and confidence scoring
- **Anomaly detection:** For validation
- **Email service:** For follow-up requests

## 11. Success Metrics
- **Review time:** <10 minutes per supplier (vs 45 minutes manual)
- **Accuracy:** 95% of extractions approved without edits
- **Correction rate:** <5% of fields require manual correction
- **Follow-up rate:** <20% of suppliers require follow-up
- **User satisfaction:** 4.5/5 rating for review experience

## 12. Open Questions
1. Should we auto-save field edits or require explicit save?
2. Should we allow bulk edit of multi-year data?
3. Should we provide AI suggestions for missing fields?
4. Should we allow comparison of multiple versions side-by-side?
5. Should we provide keyboard shortcuts for common actions?

---

