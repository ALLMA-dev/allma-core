# Screen Requirements: Comparison Board

## 1. Overview
- **Screen ID:** SCR-023
- **Component File:** `src/app/components/ComparisonBoard.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 6 - Incremental Comparison Board with Supplier Ranking
- **Priority:** P0 (Must Have)
- **Flexibility Level:** High - Dynamic columns based on active RFQ fields, incremental updates

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** receive incremental Excel comparison boards as each supplier responds  
**So that** I can see results progressively, make faster decisions, and identify the best supplier

### Related User Stories
- **US-MVP-22:** Receive Incremental Excel Updates
- **US-MVP-23:** Review Summary with Target Price and Supplier Ranking
- **US-MVP-24:** Drill Down to Detailed Breakdown
- **US-MVP-25:** Review Anomaly Explanations
- **US-MVP-26:** Access Raw Data and Email Thread

## 3. Screen Purpose & Context

### Purpose
This screen is the central decision-making tool for supplier comparison. It provides:
- **Incremental updates:** Excel files delivered as each supplier responds (v1, v2, v3, final)
- **Multi-sheet workbook:** Summary, Detailed Breakdown, Anomalies, Charts
- **Visual comparison:** Tables, bar charts, pie charts, radar charts
- **Ranking system:** Suppliers sorted by total cost (best first)
- **Anomaly highlighting:** Red/yellow/green flags for issues
- **Recommendation engine:** Automated best supplier suggestion
- **Download capability:** Excel file for offline analysis
- **Progressive decision-making:** No need to wait for all suppliers

### Context
- **When user sees this:** 
  - After extraction and normalization complete for at least one supplier
  - Receives email notification with Excel attachment
  - Can view in portal or download Excel
  - Updates incrementally as more suppliers respond
- **Why it exists:** 
  - Eliminates 10-15 hours of manual comparison work
  - Provides fair apples-to-apples comparison
  - Highlights cost drivers and anomalies automatically
  - Enables faster decision-making (no waiting for all quotes)
  - Creates audit trail for sourcing decisions
  - Supports data-driven supplier selection
- **Position in journey:** 
  - After Extraction Review (Screen 20)
  - After Follow-up responses (if any)
  - Before Sourcing Decision
  - Before Rejection Notifications (Screen 22)
  - Can loop back to Extraction Review if issues found

### Key Characteristics
- **Incremental delivery:** New version sent after each supplier processed
- **Excel format:** Familiar tool for buyers, easy to share
- **Four-sheet structure:** Summary, Breakdown, Anomalies, Charts
- **Color-coded:** Green (best), red (worst/issues), yellow (warnings)
- **Automated ranking:** Sorted by total cost
- **Target price comparison:** Show variance from target
- **Anomaly detection:** Automatic flagging of issues
- **Visual analytics:** Charts for quick insights
- **Downloadable:** Can work offline
- **Version tracking:** v1, v2, v3, final

## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Container:**
1. **Page Header**
   - Title: "Screen 17: Excel file - Comparison Board"
   - Subtitle: "Visual representation of Excel files delivered to Sarah's inbox"

2. **Version Selector Card**
   - File name with version
   - Download button
   - Version tabs (v1, v2, final)

3. **Excel Sheet Tabs**
   - Summary
   - Detailed Breakdown
   - Anomalies
   - Charts

4. **Sheet Content (varies by tab)**
   - Summary: Comparison table with ranking
   - Breakdown: Detailed cost breakdown per supplier
   - Anomalies: Issues and flags
   - Charts: Visual analytics

5. **Demo Navigation Hint**

### 4.2 Key UI Elements

**Page Header:**
- **Title:** "Screen 17: Excel file - Comparison Board"
  - Font: text-3xl, font-bold, text-gray-900
- **Subtitle:** "Visual representation of Excel files delivered to Sarah's inbox"
  - Font: text-gray-600, mt-2

**Version Selector Card:**
- **Container:** Card, max-w-6xl mx-auto
- **Header:** bg-gray-50
  - Layout: flex, items-center, justify-between

  - **Left Section:**
    - Icon: FileSpreadsheet (size-6, text-green-600)
    - Title: "Comparison Board"
    - Filename: "RFQ-2025-047_Comparison_{version}.xlsx"
      - Font: text-sm, text-gray-500, mt-1

  - **Right Section:**
    - Download button: variant-outline, size-sm
      - Icon: Download (size-4, mr-2)
      - Text: "Download Excel"

- **Version Tabs:**
  - Container: Tabs, mt-4
  - TabsList: grid, w-full, max-w-md, grid-cols-3
  - Tabs:
    1. "Version 1 (Day 1)" - 1 supplier
    2. "Version 2 (Day 2)" - 3 suppliers
    3. "Final (Day 3)" - 4 suppliers (complete)

**Excel Sheet Tabs:**
- **Container:** Tabs, max-w-6xl mx-auto
- **TabsList:** grid, w-full, max-w-2xl, grid-cols-4
- **Tabs:**
  1. "Summary" - Main comparison table
  2. "Detailed Breakdown" - Cost details per supplier
  3. "Anomalies" - Issues and flags
  4. "Charts" - Visual analytics

**Sheet 1: Summary Tab**

- **Card Header:**
  - Background: bg-green-700, text-white
  - Title: "Sheet 1: Summary"
  - Badge: bg-white, text-green-700
    - v1: "1 of 4 suppliers"
    - v2: "3 of 4 suppliers"
    - final: "4 of 4 suppliers - Complete"

- **Header Info Section:**
  - Container: bg-gray-50, border-b, p-4, grid grid-cols-3, gap-4, text-sm
  - Fields:
    - Project: "RFQ-2025-047 - Aluminum Mounting Bracket"
    - Generated: Timestamp (varies by version)
    - Status: "Complete ✓" or "In Progress"

- **Summary Table:**
  - Container: overflow-x-auto
  - Table: w-full, text-sm
  - Header: bg-gray-100, border-b-2 border-gray-300
  - Columns:
    1. Supplier (text-left, p-3, font-semibold)
    2. Material (text-right, p-3, font-semibold)
    3. Process (text-right, p-3, font-semibold)
    4. Tooling (text-right, p-3, font-semibold)
    5. Logistics (text-right, p-3, font-semibold)
    6. Total (text-right, p-3, font-semibold)
    7. Status (text-left, p-3, font-semibold)
    8. Flags (text-left, p-3, font-semibold)

  - **Row Styling:**
    - Lowest cost: bg-green-50
    - Highest cost: bg-red-50
    - Normal: white background
    - Border: border-b

  - **Cell Content:**
    - Supplier: font-medium
    - Costs: €X.XX format, text-right
    - Tooling (if missing): "Pending" (text-red-600)
    - Total: font-bold, with trend icons
      - TrendingDown (green) for lowest
      - TrendingUp (red) for highest
    - Status: Badge (default for Complete, secondary for Incomplete)
    - Flags: Color-coded with icons
      - Red: AlertTriangle + text-red-600
      - Green: Check + text-green-600
      - Gray: text-gray-600

- **Missing Data Note (v1 only):**
  - Container: bg-yellow-50, border-t border-yellow-200, p-3
  - Text: "*Note: Total excludes tooling (pending follow-up)"
  - Font: text-sm, text-yellow-900

- **Recommendation Box (final only):**
  - Container: bg-green-50, border-t border-green-200, p-4
  - Title: "Recommendation:" (text-sm, font-semibold, text-green-900, mb-2)
  - Content box: bg-white, rounded-lg, p-3, border border-green-300
    - Title: "✓ Supplier B - Recommended" (font-bold, text-green-900, mb-2)
    - List: text-sm, text-green-800, space-y-1
      - "• Lowest total cost (€1.85/piece)"
      - "• No anomalies detected"
      - "• Competitive in all categories"
      - "• Capacity confirmed: 80,000 pcs/year"

**Sheet 2: Detailed Breakdown Tab**

- **Card Header:**
  - Background: bg-green-700, text-white
  - Title: "Sheet 2: Detailed Breakdown"

- **Supplier Cards:**
  - One card per supplier
  - Card header: bg-gray-50
    - Title: Supplier name (text-base)
  - Card content: pt-4
    - Grid: grid-cols-2, gap-4, text-sm

  - **Four Detail Sections:**
    1. **Material Details:**
       - Label: "Material Details" (text-gray-500, text-xs, mb-2)
       - Fields:
         - Raw Material: "Aluminum 6061-T6"
         - Cost/kg: "€2.80/kg"
         - Weight: "0.45 kg"

    2. **Process Details:**
       - Label: "Process Details"
       - Fields:
         - Operations: "Stamping, Deburring"
         - Cycle Time: "12 seconds"
         - Labor + Overhead: "€X.XX/pc"

    3. **Logistics:**
       - Label: "Logistics"
       - Fields:
         - Packaging: "€0.08/pc"
         - Transportation: "€0.15/pc"
         - IncoTerms: "FOB"

    4. **Terms:**
       - Label: "Terms"
       - Fields:
         - Payment: "Net 60"
         - Lead Time: "8 weeks"
         - Currency: "EUR"

  - **Field Layout:**
    - Each field: flex, justify-between
    - Label: text-gray-700
    - Value: font-medium

**Sheet 3: Anomalies Tab**

- **Card Header:**
  - Background: bg-green-700, text-white
  - Title: "Sheet 3: Anomalies & Issues"

- **Anomaly Cards:**
  - Container: p-6, space-y-3
  - Each anomaly: rounded-lg, p-4, border
  - Layout: flex, items-start, gap-3

  - **Red (Critical):**
    - Background: bg-red-50, border-red-200
    - Icon: AlertTriangle (size-5, text-red-600)
    - Title: font-semibold, text-red-900
    - Description: text-sm, text-red-800, mt-1
    - Example: "Supplier C: Material cost 23% above average"

  - **Yellow (Warning):**
    - Background: bg-yellow-50, border-yellow-200
    - Icon: AlertTriangle (size-5, text-yellow-600)
    - Title: font-semibold, text-yellow-900
    - Description: text-sm, text-yellow-800, mt-1
    - Example: "Supplier D: Lead time 10 weeks"

  - **Green (Resolved/OK):**
    - Background: bg-green-50, border-green-200
    - Icon: Check (size-5, text-green-600)
    - Title: font-semibold, text-green-900
    - Description: text-sm, text-green-800, mt-1
    - Example: "All others: No issues detected"

**Sheet 4: Charts Tab**

- **Card Header:**
  - Background: bg-green-700, text-white
  - Title: "Sheet 4: Visual Comparison"

- **Chart Sections:**
  - Container: p-6, space-y-8

  1. **Total Cost Comparison (Bar Chart):**
     - Title: "Total Cost Comparison" (text-sm, font-semibold, text-gray-900, mb-4)
     - Chart: ResponsiveContainer, height-300
     - Type: BarChart
     - Data: currentData
     - X-axis: Supplier names
     - Y-axis: Cost (€)
     - Bar: Total cost, fill-#0066CC

  2. **Cost Breakdown by Supplier (Stacked Bar Chart):**
     - Title: "Cost Breakdown by Supplier"
     - Chart: ResponsiveContainer, height-300
     - Type: BarChart (stacked)
     - Bars:
       - Material: #0066CC
       - Process: #28A745
       - Tooling: #FFC107
       - Logistics: #DC3545

  3. **Average Cost Distribution (Pie Chart):**
     - Title: "Average Cost Distribution"
     - Chart: ResponsiveContainer, height-300
     - Type: PieChart
     - Data: pieData (Material, Process, Tooling, Logistics)
     - Colors: COLORS array

  4. **Multi-Dimensional Comparison (Radar Chart - final only):**
     - Title: "Multi-Dimensional Comparison"
     - Chart: ResponsiveContainer, height-400
     - Type: RadarChart
     - Dimensions: Cost, Lead Time, Capacity, Quality
     - One radar per supplier (overlaid)
     - Colors: Different per supplier

**Demo Navigation Hint:**
- **Container:** bg-blue-50, border border-blue-200, rounded-lg, p-4, max-w-6xl mx-auto
- **Text:** "Demo Navigation: Click 'Next' in the header to see the final decision dashboard →"
  - Font: text-sm, text-blue-900, text-center
  - Bold: "Demo Navigation:"

### 4.3 Information Hierarchy

**Primary Information:**
- Summary table with total costs
- Supplier ranking (best first)
- Recommendation (final version)

**Secondary Information:**
- Detailed cost breakdown
- Anomalies and flags
- Charts and visualizations

**Tertiary Information:**
- Version selector
- Download button
- Demo navigation hint



## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| comparison_id | String | System | Yes | Unique comparison identifier |
| rfq_id | String | RFQ data | Yes | RFQ identifier |
| version | Enum | System | Yes | 'v1', 'v2', 'v3', 'final' |
| generated_at | DateTime | System timestamp | Yes | ISO 8601 format |
| supplier_count | Integer | Calculated | Yes | Number of suppliers in this version |
| status | Enum | System | Yes | 'in_progress', 'complete' |
| created_by | String | User profile | Yes | Buyer who initiated RFQ |

### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| target_price | Decimal | Yes | No | €X.XX format |
| cost_categories | Array<String> | Yes | Yes | Material, Process, Tooling, Logistics |
| anomaly_thresholds | Object | Yes | Yes | Configurable % thresholds |
| chart_types | Array<String> | Yes | Yes | Bar, Pie, Radar, etc. |

### 5.3 Dynamic Fields (Buyer-Selectable)
| Field Name | Data Type | Conditions | Validation Rules | Default Value |
|------------|-----------|------------|------------------|---------------|
| comparison_columns | Array<String> | Per RFQ | From Master List | Standard cost categories |
| ranking_criteria | String | Per RFQ | 'total_cost', 'lead_time', 'quality' | 'total_cost' |
| anomaly_sensitivity | Enum | Per RFQ | 'high', 'medium', 'low' | 'medium' |
| chart_preferences | Array<String> | Per RFQ | Chart types to include | All charts |

### 5.4 Data Displayed
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| rfq_id | String | RFQ data | Yes | Display in header |
| part_name | String | Part data | Yes | Display in header |
| version_label | String | Calculated | Yes | "Version 1 (Day 1)" format |
| generated_timestamp | String | Formatted | Yes | "Dec 26, 2024 at 3:15 PM" |
| status_label | String | Calculated | Yes | "Complete ✓" or "In Progress" |
| supplier_data | Array<Object> | Comparison data | Yes | Per supplier details |
| supplier_name | String | Supplier data | Yes | Per supplier |
| material_cost | Decimal | Extraction data | Yes | €X.XX format |
| process_cost | Decimal | Extraction data | Yes | €X.XX format |
| tooling_cost | Decimal | Extraction data | No | €X.XX or "Pending" |
| logistics_cost | Decimal | Extraction data | Yes | €X.XX format |
| total_cost | Decimal | Calculated | Yes | €X.XX format |
| status_badge | String | Calculated | Yes | "Complete" or "Incomplete" |
| flags | String | Anomaly detection | Yes | Issue description |
| lead_time | Integer | Extraction data | No | Weeks |
| capacity | Integer | Extraction data | No | Units/year |
| anomalies | Array<Object> | Anomaly detection | Yes | List of issues |
| recommendation | Object | Recommendation engine | No | Best supplier + reasons |

### 5.5 Data Collected from User
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| version_selection | Tab click | Yes | 'v1', 'v2', 'final' | 'v1' |
| sheet_selection | Tab click | Yes | 'summary', 'breakdown', 'anomalies', 'charts' | 'summary' |
| download_action | Button click | No | None | None |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| total_cost | material + process + tooling + logistics | All cost components |
| is_lowest | total_cost === min(all_totals) | All supplier totals |
| is_highest | total_cost === max(all_totals) | All supplier totals |
| percent_above_target | ((total - target) / target) * 100 | total_cost, target_price |
| percent_above_lowest | ((total - lowest) / lowest) * 100 | total_cost, lowest_cost |
| average_material_cost | sum(material_costs) / supplier_count | All material costs |
| average_process_cost | sum(process_costs) / supplier_count | All process costs |
| cost_variance_category | Based on % above average | Cost data, thresholds |
| recommendation_score | Weighted scoring algorithm | Cost, lead time, capacity, quality |
| version_label | Format version with day | version, generated_at |
| supplier_count_label | Format count with total | supplier_count, total_suppliers |

## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration
- **Dynamic columns:** Based on active RFQ fields from Master List
- **Cost categories:** Configurable (Material, Process, Tooling, Logistics, etc.)
- **Anomaly thresholds:** Adjustable per organization
- **Chart types:** Selectable based on data available
- **Ranking criteria:** Configurable (cost, lead time, quality, etc.)

### 6.2 UI Adaptation Logic
- **Incremental updates:** New version generated after each supplier processed
- **Column visibility:** Show only relevant cost categories
- **Chart selection:** Display charts based on data completeness
- **Anomaly display:** Adapt based on issues detected
- **Recommendation:** Only show when all suppliers complete
- **Version tabs:** Show only versions that exist
- **Sheet tabs:** Enable/disable based on data availability

### 6.3 LLM Integration
- **Anomaly explanation:** LLM generates human-readable issue descriptions
- **Recommendation reasoning:** LLM explains why supplier is recommended
- **Cost driver analysis:** LLM identifies primary cost differences
- **Comparison insights:** LLM generates key takeaways
- **Fallback:** Static templates if LLM fails

## 7. User Interactions

### 7.1 Primary Actions

**Action: Select Version**
- **Trigger:** User clicks version tab (v1, v2, final)
- **Behavior:** 
  - Update displayed data to selected version
  - Update all sheets with version-specific data
  - Update charts with version-specific data
  - Update filename display
- **Validation:** None (always valid)
- **Success:** All content updates to selected version
- **Error:** None
- **Navigation:** Stays on screen

**Action: Select Sheet**
- **Trigger:** User clicks sheet tab (Summary, Breakdown, Anomalies, Charts)
- **Behavior:** 
  - Switch to selected sheet content
  - Maintain version selection
  - Load sheet-specific data
- **Validation:** None (always valid)
- **Success:** Selected sheet content displayed
- **Error:** None
- **Navigation:** Stays on screen

**Action: Download Excel**
- **Trigger:** User clicks "Download Excel" button
- **Behavior:** 
  - Generate Excel file with all sheets
  - Include current version data
  - Format with colors, charts, conditional formatting
  - Download to user's device
- **Validation:** None
- **Success:** Excel file downloaded successfully
- **Error:** "Failed to download Excel file. Please try again."
- **Navigation:** Stays on screen

**Action: View Supplier Details**
- **Trigger:** User clicks on supplier row in summary table
- **Behavior:** 
  - Navigate to detailed breakdown for that supplier
  - Highlight supplier's card
  - Scroll to supplier's section
- **Validation:** None
- **Success:** Supplier details displayed
- **Error:** None
- **Navigation:** To Breakdown sheet

**Action: View Anomaly Details**
- **Trigger:** User clicks on flag in summary table
- **Behavior:** 
  - Navigate to Anomalies sheet
  - Highlight relevant anomaly
  - Scroll to anomaly section
- **Validation:** None
- **Success:** Anomaly details displayed
- **Error:** None
- **Navigation:** To Anomalies sheet

### 7.2 Secondary Actions
- **Sort table:** Click column header to sort
- **Filter suppliers:** Filter by status, flags, cost range
- **Export chart:** Download individual chart as image
- **Share comparison:** Generate shareable link
- **Print comparison:** Print-friendly view

### 7.3 Navigation
- **From:** 
  - Screen 20 (Extraction Review) after all extractions complete
  - Email notification with Excel attachment
  - Project page (view past comparisons)
- **To:** 
  - Screen 26 (Decision Dashboard) for final decision
  - Screen 20 (Extraction Review) to review specific supplier
  - Screen 25 (Anomalies Dashboard) for detailed anomaly analysis

## 8. Business Rules

### 8.1 Validation Rules
- **Minimum suppliers:** At least 1 supplier required for v1
- **Complete data:** All cost categories must have values (or "Pending")
- **Target price:** Must be set before comparison
- **Version sequence:** v1 → v2 → v3 → final (sequential)
- **Anomaly thresholds:** Configurable but must be positive numbers

### 8.2 Calculation Logic
- **Total cost:** `material + process + tooling + logistics`
- **Percent above target:** `((total - target) / target) * 100`
- **Percent above lowest:** `((total - lowest) / lowest) * 100`
- **Average cost:** `sum(costs) / supplier_count`
- **Cost variance:** `(cost - average) / average * 100`
- **Recommendation score:** Weighted algorithm:
  - Cost: 50% weight
  - Lead time: 20% weight
  - Capacity: 15% weight
  - Quality: 15% weight

### 8.3 Conditional Display Logic
- **Show version tabs:** Only for versions that exist
- **Show recommendation:** Only when status is 'complete'
- **Show charts:** Only when supplier_count > 1
- **Show radar chart:** Only when supplier_count >= 3
- **Show missing data note:** Only when any tooling is "Pending"
- **Highlight lowest:** Only when supplier_count > 1
- **Highlight highest:** Only when supplier_count > 1
- **Show anomalies:** Only when issues detected

### 8.4 Error Handling
- **Missing data:** Display "Pending" or "N/A"
- **Calculation error:** Show error message, use fallback
- **Chart rendering error:** Show table view instead
- **Download error:** Show error, enable retry
- **Network error:** Show cached version if available

### 8.5 Incremental Update Rules
- **Version trigger:** New version created when:
  - First supplier processed → v1
  - 2-3 suppliers processed → v2
  - 4+ suppliers processed → v3
  - All suppliers processed → final
- **Email notification:** Sent with each new version
- **Version naming:** Sequential (v1, v2, v3, final)
- **Data persistence:** All versions stored for audit trail

## 9. Acceptance Criteria

### 9.1 Functional Criteria (80 total)

**Page Load**
1. WHEN user navigates to comparison board THEN screen SHALL load
2. WHEN screen loads THEN version selector SHALL be visible
3. WHEN screen loads THEN sheet tabs SHALL be visible
4. WHEN screen loads THEN default version SHALL be v1
5. WHEN screen loads THEN default sheet SHALL be Summary

**Version Selector**
6. WHEN screen loads THEN filename SHALL include version
7. WHEN screen loads THEN download button SHALL be visible
8. WHEN screen loads THEN version tabs SHALL be visible
9. WHEN v1 exists THEN "Version 1 (Day 1)" tab SHALL be shown
10. WHEN v2 exists THEN "Version 2 (Day 2)" tab SHALL be shown
11. WHEN final exists THEN "Final (Day 3)" tab SHALL be shown
12. WHEN user clicks version tab THEN content SHALL update
13. WHEN version changes THEN all sheets SHALL update

**Sheet Tabs**
14. WHEN screen loads THEN four sheet tabs SHALL be visible
15. WHEN screen loads THEN Summary tab SHALL be active
16. WHEN user clicks sheet tab THEN content SHALL switch
17. WHEN sheet changes THEN version SHALL remain same

**Summary Sheet - Header**
18. WHEN Summary sheet shown THEN header SHALL be green
19. WHEN Summary sheet shown THEN title SHALL be "Sheet 1: Summary"
20. WHEN Summary sheet shown THEN supplier count badge SHALL be shown
21. WHEN v1 THEN badge SHALL show "1 of 4 suppliers"
22. WHEN v2 THEN badge SHALL show "3 of 4 suppliers"
23. WHEN final THEN badge SHALL show "4 of 4 suppliers - Complete"

**Summary Sheet - Header Info**
24. WHEN Summary sheet shown THEN project name SHALL be displayed
25. WHEN Summary sheet shown THEN RFQ ID SHALL be displayed
26. WHEN Summary sheet shown THEN generated timestamp SHALL be displayed
27. WHEN Summary sheet shown THEN status SHALL be displayed
28. WHEN final THEN status SHALL be "Complete ✓"
29. WHEN not final THEN status SHALL be "In Progress"

**Summary Sheet - Table**
30. WHEN Summary sheet shown THEN table SHALL be displayed
31. WHEN table shown THEN 8 columns SHALL be visible
32. WHEN table shown THEN header row SHALL be gray
33. WHEN table shown THEN one row per supplier SHALL be shown
34. WHEN supplier row shown THEN supplier name SHALL be displayed
35. WHEN supplier row shown THEN material cost SHALL be displayed
36. WHEN supplier row shown THEN process cost SHALL be displayed
37. WHEN supplier row shown THEN tooling cost SHALL be displayed
38. WHEN tooling missing THEN "Pending" SHALL be shown in red
39. WHEN supplier row shown THEN logistics cost SHALL be displayed
40. WHEN supplier row shown THEN total cost SHALL be displayed
41. WHEN supplier row shown THEN status badge SHALL be displayed
42. WHEN supplier row shown THEN flags SHALL be displayed

**Summary Sheet - Highlighting**
43. WHEN supplier has lowest cost THEN row SHALL have green background
44. WHEN supplier has highest cost THEN row SHALL have red background
45. WHEN supplier has lowest cost THEN TrendingDown icon SHALL be shown
46. WHEN supplier has highest cost THEN TrendingUp icon SHALL be shown
47. WHEN only 1 supplier THEN no highlighting SHALL be applied

**Summary Sheet - Flags**
48. WHEN flag is critical THEN AlertTriangle icon SHALL be shown
49. WHEN flag is critical THEN text SHALL be red
50. WHEN flag is positive THEN Check icon SHALL be shown
51. WHEN flag is positive THEN text SHALL be green
52. WHEN flag is neutral THEN text SHALL be gray

**Summary Sheet - Missing Data Note**
53. WHEN v1 AND tooling missing THEN note SHALL be displayed
54. WHEN note shown THEN background SHALL be yellow
55. WHEN note shown THEN text SHALL explain missing tooling

**Summary Sheet - Recommendation**
56. WHEN final version THEN recommendation box SHALL be displayed
57. WHEN recommendation shown THEN background SHALL be green
58. WHEN recommendation shown THEN best supplier SHALL be named
59. WHEN recommendation shown THEN reasons SHALL be listed
60. WHEN not final THEN recommendation SHALL NOT be shown

**Detailed Breakdown Sheet**
61. WHEN Breakdown sheet shown THEN header SHALL be green
62. WHEN Breakdown sheet shown THEN title SHALL be "Sheet 2: Detailed Breakdown"
63. WHEN Breakdown sheet shown THEN one card per supplier SHALL be shown
64. WHEN supplier card shown THEN supplier name SHALL be displayed
65. WHEN supplier card shown THEN four detail sections SHALL be shown
66. WHEN supplier card shown THEN Material Details SHALL be shown
67. WHEN supplier card shown THEN Process Details SHALL be shown
68. WHEN supplier card shown THEN Logistics SHALL be shown
69. WHEN supplier card shown THEN Terms SHALL be shown
70. WHEN detail section shown THEN all fields SHALL be displayed

**Anomalies Sheet**
71. WHEN Anomalies sheet shown THEN header SHALL be green
72. WHEN Anomalies sheet shown THEN title SHALL be "Sheet 3: Anomalies & Issues"
73. WHEN anomalies exist THEN anomaly cards SHALL be shown
74. WHEN critical anomaly THEN card SHALL have red background
75. WHEN warning anomaly THEN card SHALL have yellow background
76. WHEN resolved anomaly THEN card SHALL have green background
77. WHEN anomaly shown THEN icon SHALL be displayed
78. WHEN anomaly shown THEN title SHALL be displayed
79. WHEN anomaly shown THEN description SHALL be displayed
80. WHEN no anomalies THEN "No issues detected" SHALL be shown

### 9.2 Charts Functional Criteria (20 total)

**Charts Sheet**
81. WHEN Charts sheet shown THEN header SHALL be green
82. WHEN Charts sheet shown THEN title SHALL be "Sheet 4: Visual Comparison"
83. WHEN Charts sheet shown THEN Total Cost Comparison chart SHALL be shown
84. WHEN supplier_count > 1 THEN Cost Breakdown chart SHALL be shown
85. WHEN supplier_count > 1 THEN Average Cost Distribution chart SHALL be shown
86. WHEN final version THEN Multi-Dimensional Comparison chart SHALL be shown

**Total Cost Comparison Chart**
87. WHEN chart shown THEN bar chart SHALL be displayed
88. WHEN chart shown THEN X-axis SHALL show supplier names
89. WHEN chart shown THEN Y-axis SHALL show cost in €
90. WHEN chart shown THEN one bar per supplier SHALL be shown
91. WHEN chart shown THEN bars SHALL be blue

**Cost Breakdown Chart**
92. WHEN chart shown THEN stacked bar chart SHALL be displayed
93. WHEN chart shown THEN four segments per bar SHALL be shown
94. WHEN chart shown THEN Material SHALL be blue
95. WHEN chart shown THEN Process SHALL be green
96. WHEN chart shown THEN Tooling SHALL be yellow
97. WHEN chart shown THEN Logistics SHALL be red

**Average Cost Distribution Chart**
98. WHEN chart shown THEN pie chart SHALL be displayed
99. WHEN chart shown THEN four slices SHALL be shown
100. WHEN chart shown THEN labels SHALL show category and value

### 9.3 Flexibility Criteria (10 total)
1. WHEN admin changes cost categories THEN columns SHALL update
2. WHEN admin changes anomaly thresholds THEN flags SHALL update
3. WHEN buyer selects ranking criteria THEN sort order SHALL update
4. WHEN buyer selects chart types THEN charts SHALL update
5. WHEN new supplier added THEN new version SHALL be created
6. WHEN supplier data updated THEN comparison SHALL refresh
7. WHEN dynamic fields added THEN columns SHALL expand
8. WHEN language preference set THEN labels SHALL translate
9. WHEN currency changes THEN all costs SHALL convert
10. WHEN multiple versions THEN all SHALL be accessible

### 9.4 UX Criteria (20 total)
1. Screen SHALL load within 2 seconds
2. Version switching SHALL be instant (<500ms)
3. Sheet switching SHALL be instant (<500ms)
4. Table SHALL be easy to scan
5. Color coding SHALL be intuitive
6. Charts SHALL be clear and readable
7. Download SHALL complete within 5 seconds
8. Excel file SHALL be well-formatted
9. Recommendation SHALL be clear and actionable
10. Anomalies SHALL be easy to understand
11. Flags SHALL be prominently displayed
12. Lowest cost SHALL be clearly highlighted
13. Highest cost SHALL be clearly highlighted
14. Missing data SHALL be clearly indicated
15. Status badges SHALL be clear
16. Timestamps SHALL be formatted clearly
17. Supplier names SHALL be easy to read
18. Cost values SHALL be aligned right
19. Charts SHALL have legends
20. Layout SHALL be clean and organized

### 9.5 Performance Criteria (10 total)
1. Screen SHALL load within 2 seconds
2. Version generation SHALL complete within 5 seconds
3. Chart rendering SHALL complete within 1 second
4. Table sorting SHALL complete within 500ms
5. Download SHALL complete within 5 seconds
6. Sheet switching SHALL complete within 300ms
7. Version switching SHALL complete within 500ms
8. Anomaly detection SHALL complete within 2 seconds
9. Recommendation calculation SHALL complete within 1 second
10. Navigation SHALL complete within 1 second

### 9.6 Accessibility Criteria (15 total)
1. All interactive elements SHALL be keyboard accessible
2. All images SHALL have alt text
3. Color SHALL NOT be the only indicator of status
4. Text SHALL have sufficient contrast (WCAG AA)
5. Focus indicators SHALL be visible
6. Screen readers SHALL announce content
7. Tables SHALL have proper headers
8. Charts SHALL have text alternatives
9. Tabs SHALL be keyboard navigable
10. Buttons SHALL have descriptive labels
11. Status changes SHALL be announced
12. Version changes SHALL be announced
13. Sheet changes SHALL be announced
14. Download action SHALL be announced
15. Error messages SHALL be announced

### 9.7 Security Criteria (15 total)
1. Data SHALL be encrypted in transit
2. Data SHALL be encrypted at rest
3. Access SHALL be role-based
4. User identity SHALL be verified
5. Download action SHALL be logged
6. Version generation SHALL be logged
7. Comparison data SHALL be immutable
8. Audit trail SHALL be maintained
9. Excel file SHALL be virus-scanned
10. Sensitive data SHALL be redacted if needed
11. Sharing SHALL require authentication
12. Export SHALL be tracked
13. Data retention SHALL follow policy
14. Backup SHALL be automated
15. Recovery SHALL be tested

## 10. Dependencies

### 10.1 Prerequisites
- Extraction must be complete for at least one supplier
- Normalization must be complete
- Anomaly detection must be complete
- Target price must be set
- Cost categories must be defined
- User profile must exist

### 10.2 Backend/API Requirements
- **GET /api/comparison/{rfq_id}/versions:** List all versions
- **GET /api/comparison/{rfq_id}/{version}:** Get specific version data
- **POST /api/comparison/{rfq_id}/generate:** Generate new version
- **GET /api/comparison/{rfq_id}/{version}/download:** Download Excel
- **GET /api/comparison/{rfq_id}/recommendation:** Get recommendation
- **GET /api/comparison/{rfq_id}/anomalies:** Get anomalies

### 10.3 Integration Points
- **Screen 20:** Extraction Review (entry point)
- **Screen 25:** Anomalies Dashboard (detailed anomaly view)
- **Screen 26:** Decision Dashboard (final decision)
- **Email service:** For sending Excel attachments
- **Excel generation service:** For creating formatted Excel files
- **Chart rendering service:** For generating charts
- **Anomaly detection service:** For identifying issues
- **Recommendation engine:** For suggesting best supplier

## 11. Success Metrics
- **Time saved:** 10-15 hours per RFQ (vs manual comparison)
- **Accuracy:** 95%+ correct cost comparisons
- **Incremental adoption:** 80% of buyers use incremental updates
- **Download rate:** 60% download Excel for offline analysis
- **Decision speed:** 50% faster sourcing decisions
- **User satisfaction:** 4.5/5 rating for comparison board
- **Anomaly detection:** 90%+ of issues caught automatically

## 12. Open Questions
1. Should we allow custom column ordering?
2. Should we provide comparison templates for different commodities?
3. Should we allow exporting to other formats (PDF, CSV)?
4. Should we provide historical comparison (vs past RFQs)?
5. Should we allow collaborative commenting on comparison?
6. Should we integrate with ERP systems for automatic data sync?
7. Should we provide mobile-optimized view?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial requirements document created |

---

**Total Lines:** ~1,600 lines  
**Total Acceptance Criteria:** 170 (100 functional + 10 flexibility + 20 UX + 10 performance + 15 accessibility + 15 security)

**Status:** Complete ✅

