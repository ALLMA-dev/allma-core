# Screen 28: Tooling Savings Display

## 1. Overview

- **Screen ID:** SCR-28
- **Component File:** `src/app/components/ToolingSavingsDisplay.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 6 - Incremental Comparison Board with Supplier Ranking
- **Priority:** P0 (Must Have)
- **Flexibility Level:** None (Fixed calculation logic)

## 2. User Story

**As a** Project Buyer (Sarah)  
**I want to** see clear visualization of tooling cost savings achieved by selecting a specific supplier  
**So that** I can justify my supplier selection decision and demonstrate cost optimization to stakeholders

### Related User Stories

- **US-MVP-23:** Review Summary with Target Price and Supplier Ranking
- **US-MVP-26:** Access Raw Data and Email Thread
- **REQ-MVP-08:** Tooling Cost Savings Tracking (Best tooling cost vs target/average)
- **REQ-MVP-05:** Tooling Amortization Transparency (Explicit breakdown: piece price vs tooling amortization)

## 3. Screen Purpose & Context

### Purpose
The Tooling Savings Display provides a clear, visual summary of cost savings achieved by selecting a supplier with competitive tooling costs. This component:
- Highlights financial benefits of supplier selection
- Compares selected supplier against best alternative, average, and highest costs
- Provides decision rationale for stakeholder communication
- Demonstrates buyer's cost optimization efforts

### Context
- **When Shown:** Displayed on Decision Dashboard after buyer selects a supplier
- **User Journey Position:** Final decision phase, after supplier comparison and before approval
- **Trigger:** Buyer selects a supplier as preferred choice
- **Data Source:** Calculated from extracted tooling costs across all suppliers

### Business Value
Tooling costs represent significant upfront investment (often $50K-$500K+ per part). Demonstrating tooling cost savings:
- Justifies supplier selection to management
- Provides quantifiable ROI for procurement decisions
- Supports negotiation with selected supplier
- Documents cost optimization for audit trail
- Enables comparison across multiple sourcing decisions

**Key Insight:** Tooling costs are often embedded in piece prices by suppliers, making true comparison difficult. This screen explicitly shows tooling cost savings when suppliers provide transparent breakdowns (REQ-MVP-05).

## 4. Visual Layout & Structure

### 4.1 Main Sections

1. **Card Header**
   - Award icon (visual indicator of achievement)
   - Title: "Tooling Cost Savings"
   - Green gradient background (positive reinforcement)

2. **Selected Supplier Section**
   - Supplier name (large, bold)
   - Tooling cost (prominent display)
   - Clear visual hierarchy

3. **Savings Breakdown Grid**
   - Three comparison cards:
     - vs Best Alternative (2nd lowest cost)
     - vs Average (mean of all suppliers)
     - vs Highest Cost (maximum potential savings)
   - 2-column grid layout (responsive)

4. **Decision Rationale Summary**
   - Green info box
   - Natural language explanation
   - Reinforces decision quality

### 4.2 Key UI Elements

**Card Component:**
- Gradient background: green-50 to emerald-50
- Green border (border-green-200)
- Positive, achievement-oriented styling

**Header:**
- Award icon (lucide-react)
- Title in green-900 color
- Consistent with other dashboard cards

**Selected Supplier Display:**
- Label: "Selected Supplier" (gray-600, small)
- Supplier name: Large, bold, green-900
- Tooling cost: Extra large (2xl), bold, green-700
- Clear visual hierarchy (label → name → cost)

**Savings Comparison Cards:**
- White background with green border
- Rounded corners, padding
- Three-part structure:
  - Label (gray-600, extra small)
  - Savings amount (large, bold, color-coded)
  - Context info (gray-500, extra small)

**Icons:**
- TrendingDown icon for positive savings (green-600)
- Award icon in header (green-900)
- Icons provide visual reinforcement

**Badges:**
- Percentage savings badge (green background)
- "X% savings" or "X% higher" text
- Color-coded: green for savings, red for higher cost

**Decision Rationale Box:**
- Green-100 background
- Green-300 border
- Rounded corners
- Natural language summary

### 4.3 Information Hierarchy

**Primary Information:**
- Selected supplier tooling cost (largest, most prominent)
- Savings amounts (large, bold, color-coded)

**Secondary Information:**
- Supplier names
- Percentage savings
- Comparison context

**Tertiary Information:**
- Labels and descriptions
- Decision rationale text

## 5. Data Requirements

### 5.1 System Fields (Immutable)

| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| rfq_id | String | System | Yes | UUID |
| project_id | String | System | Yes | UUID |
| selected_supplier_id | String | System | Yes | UUID |

### 5.2 Tooling Savings Data Structure

| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| selectedSupplier.id | String | System | Yes | UUID |
| selectedSupplier.name | String | System | Yes | Non-empty string |
| selectedSupplier.toolingCost | Number | Calculation | Yes | Positive number, currency |
| bestAlternative.id | String | Calculation | Yes | UUID |
| bestAlternative.name | String | System | Yes | Non-empty string |
| bestAlternative.toolingCost | Number | Calculation | Yes | Positive number, currency |
| averageToolingCost | Number | Calculation | Yes | Positive number, currency |
| highestToolingCost | Number | Calculation | Yes | Positive number, currency |
| savingsVsBest | Number | Calculation | Yes | Can be negative |
| savingsVsAverage | Number | Calculation | Yes | Can be negative |
| savingsVsHighest | Number | Calculation | Yes | Can be negative |
| percentageSavingsVsAverage | Number | Calculation | Yes | Percentage (-100 to 100) |

### 5.3 Calculation Logic

**Best Alternative:**
- Supplier with 2nd lowest tooling cost (excluding selected supplier)
- If selected supplier has lowest cost, best alternative is 2nd lowest
- If selected supplier does not have lowest cost, best alternative is the lowest

**Average Tooling Cost:**
- Mean of all supplier tooling costs
- Formula: `sum(all tooling costs) / count(suppliers)`
- Includes selected supplier in calculation

**Highest Tooling Cost:**
- Maximum tooling cost across all suppliers
- Represents worst-case scenario

**Savings vs Best:**
- Formula: `bestAlternative.toolingCost - selectedSupplier.toolingCost`
- Positive value = savings achieved
- Negative value = selected supplier costs more than best alternative

**Savings vs Average:**
- Formula: `averageToolingCost - selectedSupplier.toolingCost`
- Positive value = below average (savings)
- Negative value = above average (higher cost)

**Savings vs Highest:**
- Formula: `highestToolingCost - selectedSupplier.toolingCost`
- Always positive unless selected supplier is highest
- Represents maximum potential savings achieved

**Percentage Savings vs Average:**
- Formula: `((averageToolingCost - selectedSupplier.toolingCost) / averageToolingCost) * 100`
- Positive percentage = savings
- Negative percentage = higher cost

### 5.4 Data Displayed

| Display Element | Data Source | Format |
|-----------------|-------------|--------|
| Selected Supplier Name | selectedSupplier.name | Text |
| Selected Tooling Cost | selectedSupplier.toolingCost | Currency (formatCurrency) |
| Savings vs Best | savingsVsBest | Currency with +/- indicator |
| Best Alternative Name | bestAlternative.name | Text (small) |
| Savings vs Average | savingsVsAverage | Currency with +/- indicator |
| Percentage Savings | percentageSavingsVsAverage | Percentage badge |
| Savings vs Highest | savingsVsHighest | Currency with +/- indicator |
| Decision Rationale | Computed text | Natural language |

### 5.5 Currency Formatting

All currency values use `formatCurrency()` utility:
- Displays currency symbol (€, $, £, etc.)
- Thousands separator (e.g., €50,000)
- Two decimal places (e.g., €50,000.00)
- Respects user's currency preference

## 6. User Interactions

### 6.1 Primary Actions

**View Tooling Savings**
- **Trigger:** Screen displays automatically when buyer selects supplier on Decision Dashboard
- **Behavior:** Shows complete savings breakdown with all comparisons
- **Validation:** None (read-only display)
- **Success:** Buyer sees clear savings visualization
- **Error:** If data incomplete, shows error message
- **Navigation:** Remains on Decision Dashboard

### 6.2 Secondary Actions

**Copy Savings Data**
- **Trigger:** Buyer selects text to copy
- **Behavior:** Standard browser copy functionality
- **Success:** Data copied to clipboard for reporting
- **Navigation:** Remains on current screen

**Export/Screenshot**
- **Trigger:** Buyer uses browser screenshot or export tools
- **Behavior:** Card renders cleanly for export
- **Success:** Clean image/PDF for stakeholder communication
- **Navigation:** Remains on current screen

### 6.3 Navigation

**From:**
- Decision Dashboard (after supplier selection)
- Comparison Dashboard (if integrated)

**To:**
- No explicit navigation from this component
- Part of Decision Dashboard view

**Exit Points:**
- Navigate away from Decision Dashboard
- Close browser tab

## 7. Business Rules

### 7.1 Display Rules

1. **Positive Savings Display**
   - WHEN savings value is positive (≥0) THEN display with TrendingDown icon and green color
   - WHEN savings value is negative (<0) THEN display absolute value with "more" text and red color
   - Format: "{amount} more" for negative values

2. **Color Coding**
   - Green (green-700, green-600): Positive savings
   - Red (red-700): Higher cost (negative savings)
   - Gray (gray-600, gray-500): Labels and context

3. **Badge Display**
   - WHEN percentageSavingsVsAverage ≥ 0 THEN show green badge with "X% savings"
   - WHEN percentageSavingsVsAverage < 0 THEN show red badge with "X% higher"
   - Percentage formatted to 1 decimal place

4. **Decision Rationale Text**
   - Always uses absolute value for percentage in text
   - Format: "By selecting {supplier}, you save {amount} on average compared to other suppliers, representing a {percentage}% reduction in tooling costs."
   - Text adapts if selected supplier is more expensive (rare case)

### 7.2 Calculation Rules

1. **Best Alternative Selection**
   - IF selected supplier has lowest tooling cost THEN best alternative is 2nd lowest
   - IF selected supplier does not have lowest cost THEN best alternative is lowest cost supplier
   - Best alternative MUST be different from selected supplier

2. **Average Calculation**
   - Include ALL suppliers with valid tooling costs
   - Include selected supplier in average
   - Exclude suppliers with missing/null tooling costs

3. **Savings Calculation**
   - All savings calculated as: `comparison_value - selected_value`
   - Positive result = savings achieved
   - Negative result = selected supplier costs more

4. **Percentage Calculation**
   - Based on average tooling cost as denominator
   - Formula: `((average - selected) / average) * 100`
   - Can be negative if selected supplier is above average

### 7.3 Edge Case Handling

1. **Only One Supplier**
   - IF only one supplier THEN cannot calculate savings
   - Display message: "Savings comparison requires multiple suppliers"
   - Hide comparison cards

2. **Selected Supplier is Highest Cost**
   - Rare but possible (buyer may select for non-cost reasons)
   - All savings values will be negative
   - Display with red color and "more" text
   - Decision rationale adjusts: "Selected supplier has higher tooling cost but may offer other advantages"

3. **Tied Tooling Costs**
   - IF multiple suppliers have same tooling cost THEN use supplier ID as tiebreaker
   - Ensures consistent best alternative selection

4. **Missing Tooling Costs**
   - IF selected supplier has no tooling cost THEN cannot display savings
   - Show error message: "Tooling cost data unavailable"
   - IF some suppliers missing tooling costs THEN exclude from average calculation

### 7.4 Validation Rules

1. **Data Completeness**
   - Selected supplier MUST have valid tooling cost
   - At least 2 suppliers MUST have valid tooling costs for comparison
   - All cost values MUST be non-negative

2. **Calculation Accuracy**
   - All calculations MUST use same currency (normalized)
   - Rounding MUST be consistent (2 decimal places for currency)
   - Percentage MUST be rounded to 1 decimal place

## 8. Acceptance Criteria

### 8.1 Functional Criteria

1. WHEN component receives savings data THEN it SHALL display all sections
2. WHEN component loads THEN it SHALL show selected supplier name
3. WHEN component loads THEN it SHALL show selected supplier tooling cost
4. WHEN component loads THEN it SHALL show savings vs best alternative
5. WHEN component loads THEN it SHALL show savings vs average
6. WHEN component loads THEN it SHALL show savings vs highest
7. WHEN component loads THEN it SHALL show percentage savings badge
8. WHEN component loads THEN it SHALL show decision rationale text
9. WHEN savings are positive THEN it SHALL display with green color and TrendingDown icon
10. WHEN savings are negative THEN it SHALL display with red color and "more" text

### 8.2 Calculation Criteria

11. WHEN selected supplier has lowest cost THEN best alternative SHALL be 2nd lowest
12. WHEN selected supplier is not lowest THEN best alternative SHALL be lowest cost supplier
13. WHEN calculating average THEN it SHALL include all suppliers with valid costs
14. WHEN calculating savingsVsBest THEN it SHALL be bestAlternative.cost - selected.cost
15. WHEN calculating savingsVsAverage THEN it SHALL be average - selected.cost
16. WHEN calculating savingsVsHighest THEN it SHALL be highest - selected.cost
17. WHEN calculating percentage THEN it SHALL be ((average - selected) / average) * 100
18. WHEN percentage is calculated THEN it SHALL be rounded to 1 decimal place
19. WHEN currency is formatted THEN it SHALL use formatCurrency utility
20. WHEN currency is formatted THEN it SHALL show 2 decimal places

### 8.3 Display Criteria - Selected Supplier Section

21. WHEN displaying selected supplier THEN name SHALL be large and bold (text-lg, font-bold)
22. WHEN displaying selected supplier THEN name SHALL be green-900 color
23. WHEN displaying tooling cost THEN it SHALL be extra large (text-2xl)
24. WHEN displaying tooling cost THEN it SHALL be bold and green-700 color
25. WHEN displaying tooling cost THEN it SHALL use formatCurrency
26. WHEN displaying section label THEN it SHALL be small and gray-600

### 8.4 Display Criteria - Savings vs Best Alternative

27. WHEN savingsVsBest ≥ 0 THEN it SHALL show TrendingDown icon
28. WHEN savingsVsBest ≥ 0 THEN it SHALL show amount in green-700
29. WHEN savingsVsBest < 0 THEN it SHALL show absolute value with "more" text
30. WHEN savingsVsBest < 0 THEN it SHALL show amount in red-700
31. WHEN displaying best alternative THEN it SHALL show supplier name below amount
32. WHEN displaying best alternative name THEN it SHALL be small and gray-500

### 8.5 Display Criteria - Savings vs Average

33. WHEN savingsVsAverage ≥ 0 THEN it SHALL show TrendingDown icon
34. WHEN savingsVsAverage ≥ 0 THEN it SHALL show amount in green-700
35. WHEN savingsVsAverage < 0 THEN it SHALL show absolute value with "more" text
36. WHEN savingsVsAverage < 0 THEN it SHALL show amount in red-700
37. WHEN percentageSavingsVsAverage ≥ 0 THEN it SHALL show green badge
38. WHEN percentageSavingsVsAverage ≥ 0 THEN badge SHALL say "X% savings"
39. WHEN percentageSavingsVsAverage < 0 THEN it SHALL show red badge
40. WHEN percentageSavingsVsAverage < 0 THEN badge SHALL say "X% higher"

### 8.6 Display Criteria - Savings vs Highest

41. WHEN savingsVsHighest ≥ 0 THEN it SHALL show TrendingDown icon
42. WHEN savingsVsHighest ≥ 0 THEN it SHALL show amount in green-700
43. WHEN savingsVsHighest < 0 THEN it SHALL show absolute value with "more" text
44. WHEN savingsVsHighest < 0 THEN it SHALL show amount in red-700
45. WHEN displaying highest savings THEN it SHALL span 2 columns (col-span-2)
46. WHEN displaying highest savings THEN it SHALL show "Maximum potential savings achieved" text

### 8.7 Display Criteria - Decision Rationale

47. WHEN displaying rationale THEN it SHALL have green-100 background
48. WHEN displaying rationale THEN it SHALL have green-300 border
49. WHEN displaying rationale THEN it SHALL include selected supplier name
50. WHEN displaying rationale THEN it SHALL include savings amount vs average
51. WHEN displaying rationale THEN it SHALL include percentage savings
52. WHEN displaying rationale THEN text SHALL use absolute value for percentage
53. WHEN displaying rationale THEN it SHALL be in natural language format

### 8.8 Layout & Styling Criteria

54. WHEN component renders THEN card SHALL have gradient background (green-50 to emerald-50)
55. WHEN component renders THEN card SHALL have green-200 border
56. WHEN component renders THEN header SHALL show Award icon
57. WHEN component renders THEN header SHALL show "Tooling Cost Savings" title
58. WHEN component renders THEN savings grid SHALL have 2 columns
59. WHEN component renders THEN comparison cards SHALL have white background
60. WHEN component renders THEN comparison cards SHALL have green-200 border
61. WHEN component renders THEN comparison cards SHALL have rounded corners
62. WHEN component renders THEN all sections SHALL have consistent spacing (space-y-4)

### 8.9 UX Criteria

63. Component SHALL load within 1 second
64. All text SHALL be clearly readable
65. Color contrast SHALL meet WCAG AA standards
66. Icons SHALL be appropriately sized (h-4 w-4 for TrendingDown, h-5 w-5 for Award)
67. Currency amounts SHALL be prominently displayed
68. Positive savings SHALL be visually distinct from negative savings
69. Card SHALL fit within standard dashboard layout
70. Component SHALL be responsive on mobile devices

### 8.10 Data Integration Criteria

71. WHEN component receives savings prop THEN it SHALL extract all required fields
72. WHEN selectedSupplier data is provided THEN it SHALL display correctly
73. WHEN bestAlternative data is provided THEN it SHALL display correctly
74. WHEN savings calculations are provided THEN they SHALL display correctly
75. WHEN formatCurrency is called THEN it SHALL return properly formatted string
76. WHEN savings data is incomplete THEN component SHALL handle gracefully

### 8.11 Error Handling Criteria

77. WHEN savings prop is null THEN component SHALL show error message
78. WHEN selectedSupplier is missing THEN component SHALL show error message
79. WHEN tooling costs are invalid THEN component SHALL show error message
80. WHEN only one supplier exists THEN component SHALL show "comparison requires multiple suppliers" message
81. WHEN calculation fails THEN component SHALL handle gracefully without crashing
82. WHEN formatCurrency fails THEN component SHALL show raw number

### 8.12 Edge Cases

83. WHEN selected supplier has highest tooling cost THEN all savings SHALL be negative
84. WHEN selected supplier has highest cost THEN decision rationale SHALL adjust text
85. WHEN all suppliers have same tooling cost THEN savings SHALL be zero
86. WHEN savings are exactly zero THEN it SHALL display as positive (green, with icon)
87. WHEN tooling cost is very large (>$1M) THEN it SHALL format correctly
88. WHEN tooling cost is very small (<$100) THEN it SHALL format correctly
89. WHEN percentage is >100% THEN it SHALL display correctly
90. WHEN percentage is <-100% THEN it SHALL display correctly

### 8.13 Accessibility Criteria

91. Card SHALL have proper heading hierarchy (CardTitle as h3)
92. Icons SHALL have proper aria-labels or be decorative
93. Color SHALL not be the only means of conveying information
94. Text SHALL have sufficient contrast ratios
95. Component SHALL be keyboard navigable (if interactive elements added)
96. Screen readers SHALL be able to read all content in logical order

### 8.14 Business Logic Criteria

97. WHEN buyer selects supplier with lowest tooling cost THEN savings SHALL be maximized
98. WHEN buyer selects supplier with higher tooling cost THEN rationale SHALL still be positive
99. WHEN tooling costs vary significantly THEN savings SHALL be clearly visible
100. WHEN tooling costs are similar THEN small savings SHALL still be highlighted

## 9. Dependencies

### 9.1 Prerequisites

**Data Requirements:**
- All supplier quotes must be processed and extracted
- Tooling costs must be extracted for all suppliers (or marked as missing)
- Buyer must have selected a supplier
- Currency normalization must be complete

**System Requirements:**
- Component must be rendered within React application
- Card, CardHeader, CardTitle, CardContent components must be available
- Badge component must be available
- Award and TrendingDown icons (lucide-react) must be available
- formatCurrency utility must be available

**User Requirements:**
- Buyer must have completed supplier comparison
- Buyer must have selected preferred supplier
- Buyer must be on Decision Dashboard

### 9.2 Backend/API Requirements

**Data Structure:**
```typescript
interface ToolingSavings {
  selectedSupplier: {
    id: string;
    name: string;
    toolingCost: number;
  };
  bestAlternative: {
    id: string;
    name: string;
    toolingCost: number;
  };
  averageToolingCost: number;
  highestToolingCost: number;
  savingsVsBest: number;
  savingsVsAverage: number;
  savingsVsHighest: number;
  percentageSavingsVsAverage: number;
}
```

**API Endpoints:**
- GET `/api/rfqs/{rfqId}/tooling-savings?selectedSupplierId={id}` - Calculate and return tooling savings

**Calculation Service:**
- Backend service calculates all savings metrics
- Ensures consistent calculation logic
- Handles edge cases (single supplier, missing data)
- Returns pre-calculated values to frontend

**Data Flow:**
1. Buyer selects supplier on Decision Dashboard
2. Frontend calls API with selected supplier ID
3. Backend calculates savings metrics
4. Backend returns ToolingSavings object
5. Component displays savings visualization

### 9.3 Integration Points

**Decision Dashboard:**
- Tooling Savings Display is embedded in Decision Dashboard
- Appears after buyer selects supplier
- Provides justification for selection

**Comparison Dashboard:**
- May be linked from tooling cost comparison section
- Provides detailed savings breakdown

**Tooling Clarity Form (Screen 15):**
- Tooling costs extracted from supplier responses
- Explicit tooling breakdown enables accurate savings calculation
- REQ-MVP-05: Tooling amortization transparency

**Extraction Review (Screen 20):**
- Tooling costs validated during extraction review
- Low-confidence extractions corrected by buyer
- Ensures accurate savings calculations

**formatCurrency Utility:**
- Shared utility for consistent currency formatting
- Respects user's currency preference
- Handles various currency symbols and formats

## 10. Success Metrics

### 10.1 Functional Metrics

- **Display Accuracy:** 100% of savings calculations displayed correctly
- **Data Completeness:** 90%+ of RFQs have complete tooling cost data for savings calculation
- **Calculation Accuracy:** 100% of savings calculations match backend logic
- **Error Rate:** <1% of displays result in errors

### 10.2 User Experience Metrics

- **Load Time:** Component renders within 1 second
- **Comprehension Time:** Buyers understand savings within 10 seconds
- **Usage Frequency:** 80%+ of supplier selections include tooling savings review
- **User Satisfaction:** 4.5/5 rating for savings visualization clarity

### 10.3 Business Impact Metrics

- **Decision Justification:** 90%+ of buyers use savings data in approval requests
- **Cost Optimization:** Average tooling savings of 15-25% vs average
- **Stakeholder Communication:** 70%+ of buyers share savings visualization with management
- **Negotiation Support:** 50%+ of buyers use savings data in supplier negotiations

### 10.4 Adoption Metrics

- **Feature Awareness:** 95%+ of buyers aware of tooling savings display
- **Feature Usage:** 85%+ of supplier selections trigger savings display
- **Export/Share:** 40%+ of buyers export or screenshot savings for reporting

## 11. Open Questions

1. **Target Tooling Cost Comparison:** Should system compare against buyer's target tooling cost (if provided)?
   - **Current Approach:** Compare against best alternative, average, and highest
   - **Future Consideration:** Add target comparison if target tooling cost is available

2. **Historical Savings Tracking:** Should system track cumulative tooling savings across all RFQs?
   - **Current Approach:** Per-RFQ savings only
   - **Future Consideration:** Portfolio-level savings dashboard

3. **Amortization Impact:** Should savings display show impact on piece price (tooling amortization)?
   - **Current Approach:** Tooling cost only, not piece price impact
   - **Future Consideration:** Show "Piece price impact: €0.05/part savings"

4. **Multi-Part RFQs:** How should savings be displayed for RFQs with multiple parts?
   - **Current Approach:** Aggregate tooling cost across all parts
   - **Future Consideration:** Part-by-part savings breakdown

5. **Confidence Indicators:** Should system show confidence scores for extracted tooling costs?
   - **Current Approach:** No confidence indicators in savings display
   - **Future Consideration:** Add asterisk or icon for low-confidence extractions

6. **Negotiation Suggestions:** Should system suggest negotiation targets based on savings?
   - **Current Approach:** Display only, no suggestions
   - **Future Consideration:** "Negotiate down to €X for additional €Y savings"

7. **Savings Threshold:** Should system flag when savings are below a certain threshold?
   - **Current Approach:** Display all savings, no threshold
   - **Future Consideration:** Highlight when savings <5% (marginal benefit)

8. **Alternative Supplier Recommendations:** Should system suggest reconsidering if selected supplier has negative savings?
   - **Current Approach:** Display savings regardless of sign
   - **Future Consideration:** Warning message if selected supplier is significantly more expensive

---

**Document Version:** 1.0  
**Created:** January 2, 2026  
**Status:** Complete  
**Total Acceptance Criteria:** 100
