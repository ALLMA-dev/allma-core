# Screen 29: Unit Converter

## 1. Overview

- **Screen ID:** SCR-29
- **Component File:** `src/app/components/UnitConverter.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 5 - Normalization & Anomaly Detection
- **Priority:** P1 (Should Have)
- **Flexibility Level:** Low (Fixed unit types, user-defined conversion factors)

## 2. User Story

**As a** Project Buyer (Sarah)  
**I want to** manually convert values between different units when automatic conversion is unavailable or incorrect  
**So that** I can normalize supplier data for fair comparison even when suppliers use non-standard units

### Related User Stories

- **US-MVP-16:** Normalize Units Across Suppliers
- **US-MVP-10:** Review Low-Confidence Extractions
- **REQ-MVP-05:** Normalization (Currency conversion, unit standardization, cost category mapping)

## 3. Screen Purpose & Context

### Purpose
The Unit Converter provides a manual conversion tool for buyers to:
- Convert values between different unit types (pieces, kg, liters, units)
- Apply custom conversion factors when standard conversions don't apply
- Correct extraction errors where units were misidentified
- Handle edge cases like density-based conversions (kg to liters)
- Override automatic conversions when needed

### Context
- **When Shown:** Displayed as modal/overlay when buyer clicks "Convert Units" button on Extraction Review or Comparison screens
- **User Journey Position:** Data normalization phase, after extraction and before final comparison
- **Trigger:** Buyer identifies unit mismatch or needs manual conversion
- **Data Source:** Extracted supplier data with original units

### Business Value
Unit normalization is critical for fair supplier comparison. Suppliers may use different units:
- Weight: kg, lbs, g, tons, ounces
- Volume: liters, gallons, ml, cubic meters
- Quantity: pieces, dozens, hundreds, units

Manual conversion enables:
- Handling non-standard units not in automatic conversion library
- Applying industry-specific conversion factors
- Correcting extraction errors
- Converting between incompatible unit types (e.g., kg to liters using density)

**Key Use Case:** Supplier A quotes in kg, Supplier B quotes in liters. For liquids, buyer needs to convert using density factor (e.g., 1 kg = 1 liter for water, 0.92 liters for oil).

## 4. Visual Layout & Structure

### 4.1 Main Sections

1. **Card Header**
   - Title: "Unit Converter"
   - Description: "Convert between different units"
   - Close button (X icon)

2. **From Section**
   - Original value (disabled input)
   - Original unit (disabled select)
   - Gray background (indicates read-only)

3. **Conversion Factor Section**
   - Numeric input for factor
   - Helper text showing conversion formula
   - Placeholder example

4. **To Section**
   - Converted value (calculated, disabled)
   - Target unit (editable select)
   - Gray background for value (read-only)

5. **Conversion Preview**
   - Blue info box
   - Visual arrow showing conversion
   - Clear before/after display

6. **Error Message** (conditional)
   - Red alert box
   - Validation error text

7. **Action Buttons**
   - Cancel button (outline style)
   - Apply Conversion button (primary style)

8. **Help Text**
   - Gray info box
   - Conversion tips and examples

### 4.2 Key UI Elements

**Card Component:**
- Max width: md (28rem / 448px)
- Standard card styling
- Modal/overlay presentation

**Header:**
- Title and description
- Close button (ghost variant, small size)
- Flex layout with space-between

**From Input Group:**
- Label: "From"
- Value input (disabled, gray-50 background)
- Unit select (disabled, gray-50 background)
- Flex layout with gap

**Conversion Factor Input:**
- Label: "Conversion Factor"
- Number input (step 0.01)
- Placeholder: "e.g., 1.5"
- Helper text: "1 {fromUnit} = {factor} {toUnit}"

**To Input Group:**
- Label: "To"
- Value input (disabled, gray-50 background, formatted)
- Unit select (editable)
- Flex layout with gap

**Conversion Preview Box:**
- Blue-50 background
- Blue-200 border
- Rounded corners
- Arrow icon between values
- Format: "{fromValue} {fromUnit} → {toValue} {toUnit}"

**Error Box:**
- Red-50 background
- Red-200 border
- Red-800 text
- Conditional display

**Action Buttons:**
- Two-button layout (Cancel | Apply)
- Equal width (flex-1)
- Gap between buttons

**Help Box:**
- Gray-50 background
- Gray-200 border
- Small text (text-xs)
- Conversion tips

### 4.3 Information Hierarchy

**Primary Information:**
- Conversion factor input (user's main action)
- Converted value (result)
- Apply button (primary action)

**Secondary Information:**
- Original value and unit
- Target unit selection
- Conversion preview

**Tertiary Information:**
- Helper text
- Tips and examples
- Error messages

## 5. Data Requirements

### 5.1 System Fields (Immutable)

| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| supplier_id | String | System | Yes | UUID |
| field_name | String | System | Yes | Field identifier |
| extraction_id | String | System | Yes | UUID |

### 5.2 Input Data (Props)

| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| fromValue | String | Parent Component | Yes | Formatted number string |
| fromUnit | UnitType | Parent Component | Yes | 'pieces' \| 'kg' \| 'liters' \| 'units' |
| onConversionApplied | Function | Parent Component | Yes | Callback function |
| onClose | Function | Parent Component | Yes | Callback function |

### 5.3 Component State

| Field Name | Data Type | Initial Value | Validation |
|------------|-----------|---------------|------------|
| toUnit | UnitType | fromUnit | Must be valid UnitType |
| conversionFactor | String | '1' | Must be positive number |
| error | String | '' | Error message text |

### 5.4 Output Data (UnitConversion)

| Field Name | Data Type | Calculation | Format |
|------------|-----------|-------------|--------|
| fromValue | Number | Parsed from input | Numeric |
| fromUnit | UnitType | From props | UnitType |
| toUnit | UnitType | From state | UnitType |
| conversionFactor | Number | Parsed from input | Positive number |
| toValue | Number | fromValue * conversionFactor | Numeric |

### 5.5 Unit Types

**Supported Units:**
- **pieces:** Individual items, parts, components
- **kg:** Kilograms (weight/mass)
- **liters:** Liters (volume)
- **units:** Generic units (catch-all)

**Note:** This is a simplified unit system for MVP. Full product may include:
- Weight: kg, lbs, g, tons, ounces
- Volume: liters, gallons, ml, cubic meters
- Length: meters, feet, inches, cm
- Area: square meters, square feet
- Custom units per industry

### 5.6 Number Formatting

**Input Parsing:**
- Remove commas from formatted numbers
- Parse to float
- Handle invalid input (default to 0)

**Output Formatting:**
- Use toLocaleString('en-US')
- Maximum 2 decimal places
- Thousands separator (commas)
- Example: 1234.56 → "1,234.56"

## 6. User Interactions

### 6.1 Primary Actions

**Open Unit Converter**
- **Trigger:** Buyer clicks "Convert Units" button on Extraction Review or Comparison screen
- **Behavior:** Modal/overlay displays with pre-filled fromValue and fromUnit
- **Validation:** fromValue and fromUnit must be provided
- **Success:** Converter displays with original value
- **Error:** If data missing, show error message
- **Navigation:** Opens as modal overlay

**Enter Conversion Factor**
- **Trigger:** Buyer types in conversion factor input
- **Behavior:** 
  - Updates conversionFactor state
  - Clears any existing error
  - Recalculates toValue in real-time
  - Updates preview box
- **Validation:** None during typing (validated on Apply)
- **Success:** Preview updates immediately
- **Error:** N/A (validation on Apply)
- **Navigation:** Remains on converter

**Select Target Unit**
- **Trigger:** Buyer clicks toUnit dropdown and selects unit
- **Behavior:**
  - Updates toUnit state
  - Updates helper text formula
  - Updates preview box
- **Validation:** Must be valid UnitType
- **Success:** Unit changes, preview updates
- **Error:** N/A (dropdown only shows valid options)
- **Navigation:** Remains on converter

**Apply Conversion**
- **Trigger:** Buyer clicks "Apply Conversion" button
- **Behavior:**
  - Validates conversion factor
  - Creates UnitConversion object
  - Calls onConversionApplied callback
  - Closes converter
- **Validation:**
  - Factor must be positive number
  - Factor must be ≤1000 (warning for large factors)
  - Factor must not be NaN
- **Success:** Conversion applied, modal closes
- **Error:** Shows error message, remains open
- **Navigation:** Closes modal on success

**Cancel Conversion**
- **Trigger:** Buyer clicks "Cancel" button or X icon
- **Behavior:** Calls onClose callback without applying conversion
- **Validation:** None
- **Success:** Modal closes, no changes applied
- **Error:** N/A
- **Navigation:** Closes modal

### 6.2 Secondary Actions

**View Conversion Preview**
- **Trigger:** Automatic as user types
- **Behavior:** Real-time calculation and display
- **Success:** Preview updates immediately
- **Navigation:** Remains on converter

**Read Help Text**
- **Trigger:** User reads help box at bottom
- **Behavior:** Provides conversion tips and examples
- **Success:** User understands how to use converter
- **Navigation:** Remains on converter

### 6.3 Navigation

**From:**
- Extraction Review screen (unit conversion needed)
- Comparison Dashboard (unit mismatch identified)
- Any screen where unit conversion is available

**To:**
- Returns to previous screen (on Apply or Cancel)
- Modal closes

**Exit Points:**
- Apply Conversion button (success)
- Cancel button
- Close (X) button
- Click outside modal (if implemented)

## 7. Business Rules

### 7.1 Validation Rules

1. **Conversion Factor Validation**
   - MUST be a positive number (>0)
   - MUST NOT be NaN
   - SHOULD be ≤1000 (warning if larger)
   - Error message: "Conversion factor must be a positive number"
   - Warning message: "Warning: Conversion factor seems unusually large. Please verify."

2. **Unit Selection**
   - fromUnit is read-only (cannot be changed)
   - toUnit can be any valid UnitType
   - toUnit can be same as fromUnit (identity conversion)

3. **Value Parsing**
   - fromValue may contain commas (formatted number)
   - Remove commas before parsing
   - Default to 0 if parsing fails
   - toValue always formatted with commas

### 7.2 Calculation Logic

1. **Conversion Calculation**
   - Formula: `toValue = fromValue * conversionFactor`
   - Example: 100 kg * 1.5 = 150 liters
   - Real-time calculation as factor changes

2. **Number Parsing**
   - Remove commas: "1,234.56" → "1234.56"
   - Parse to float: "1234.56" → 1234.56
   - Handle invalid: "abc" → 0

3. **Number Formatting**
   - Format with commas: 1234.56 → "1,234.56"
   - Maximum 2 decimal places
   - Use en-US locale

### 7.3 Display Logic

1. **Helper Text Formula**
   - Format: "1 {fromUnit} = {conversionFactor} {toUnit}"
   - Example: "1 kg = 1.5 liters"
   - Updates as factor or toUnit changes

2. **Conversion Preview**
   - Format: "{fromValue} {fromUnit} → {toValue} {toUnit}"
   - Example: "100 kg → 150 liters"
   - Arrow icon between values
   - Updates in real-time

3. **Error Display**
   - Only show when error exists
   - Red background and border
   - Clear error when user types

### 7.4 Edge Case Handling

1. **Identity Conversion**
   - IF fromUnit === toUnit AND factor === 1 THEN allow (no-op conversion)
   - Useful for correcting extraction errors

2. **Very Large Factors**
   - IF factor > 1000 THEN show warning
   - Prevents accidental errors (e.g., typing 10000 instead of 1.0)
   - User can proceed if intentional

3. **Very Small Factors**
   - IF factor < 0.001 THEN may show warning (future)
   - Current: no validation for small factors

4. **Zero Factor**
   - IF factor === 0 THEN show error
   - Cannot convert with zero factor

5. **Negative Factor**
   - IF factor < 0 THEN show error
   - Negative conversions don't make sense

## 8. Acceptance Criteria

### 8.1 Functional Criteria

1. WHEN component receives props THEN it SHALL display with fromValue and fromUnit
2. WHEN component loads THEN fromValue input SHALL be disabled
3. WHEN component loads THEN fromUnit select SHALL be disabled
4. WHEN component loads THEN conversionFactor SHALL default to '1'
5. WHEN component loads THEN toUnit SHALL default to fromUnit
6. WHEN component loads THEN toValue SHALL be calculated
7. WHEN component loads THEN conversion preview SHALL be displayed
8. WHEN user types in conversionFactor THEN toValue SHALL update in real-time
9. WHEN user changes toUnit THEN helper text SHALL update
10. WHEN user changes toUnit THEN preview SHALL update

### 8.2 Validation Criteria

11. WHEN user clicks Apply with valid factor THEN conversion SHALL be applied
12. WHEN user clicks Apply with factor ≤ 0 THEN error SHALL be shown
13. WHEN user clicks Apply with NaN factor THEN error SHALL be shown
14. WHEN user clicks Apply with factor > 1000 THEN warning SHALL be shown
15. WHEN user types in factor THEN error SHALL be cleared
16. WHEN factor is invalid THEN Apply button SHALL show error
17. WHEN factor is valid THEN Apply button SHALL work
18. WHEN validation fails THEN modal SHALL remain open
19. WHEN validation passes THEN modal SHALL close
20. WHEN user clicks Cancel THEN modal SHALL close without applying

### 8.3 Calculation Criteria

21. WHEN calculating toValue THEN it SHALL use formula: fromValue * conversionFactor
22. WHEN fromValue is "1,234" THEN it SHALL parse to 1234
23. WHEN fromValue contains commas THEN they SHALL be removed before calculation
24. WHEN conversionFactor is "1.5" THEN it SHALL parse to 1.5
25. WHEN conversionFactor is invalid THEN it SHALL default to 1
26. WHEN toValue is calculated THEN it SHALL be formatted with commas
27. WHEN toValue is 1234.567 THEN it SHALL display as "1,234.57" (2 decimals)
28. WHEN toValue is 1000 THEN it SHALL display as "1,000.00"
29. WHEN calculation completes THEN preview SHALL update immediately
30. WHEN factor changes THEN calculation SHALL update in real-time

### 8.4 Display Criteria - From Section

31. WHEN displaying fromValue THEN it SHALL be in disabled input
32. WHEN displaying fromValue THEN input SHALL have gray-50 background
33. WHEN displaying fromUnit THEN it SHALL be in disabled select
34. WHEN displaying fromUnit THEN select SHALL have gray-50 background
35. WHEN displaying From section THEN label SHALL say "From"
36. WHEN displaying From section THEN input and select SHALL be in flex layout

### 8.5 Display Criteria - Conversion Factor Section

37. WHEN displaying factor input THEN it SHALL be type="number"
38. WHEN displaying factor input THEN it SHALL have step="0.01"
39. WHEN displaying factor input THEN it SHALL have placeholder "e.g., 1.5"
40. WHEN displaying factor input THEN label SHALL say "Conversion Factor"
41. WHEN displaying helper text THEN it SHALL show "1 {fromUnit} = {factor} {toUnit}"
42. WHEN factor is "2" and units are kg→liters THEN helper SHALL say "1 kg = 2 liters"
43. WHEN helper text displays THEN it SHALL be small (text-xs) and gray-500

### 8.6 Display Criteria - To Section

44. WHEN displaying toValue THEN it SHALL be in disabled input
45. WHEN displaying toValue THEN input SHALL have gray-50 background
46. WHEN displaying toValue THEN it SHALL be formatted with commas
47. WHEN displaying toUnit THEN it SHALL be in editable select
48. WHEN displaying toUnit select THEN it SHALL show all 4 unit types
49. WHEN displaying To section THEN label SHALL say "To"
50. WHEN displaying To section THEN input and select SHALL be in flex layout

### 8.7 Display Criteria - Conversion Preview

51. WHEN displaying preview THEN it SHALL have blue-50 background
52. WHEN displaying preview THEN it SHALL have blue-200 border
53. WHEN displaying preview THEN it SHALL show fromValue and fromUnit
54. WHEN displaying preview THEN it SHALL show ArrowRight icon
55. WHEN displaying preview THEN it SHALL show toValue and toUnit
56. WHEN displaying preview THEN toValue SHALL be formatted
57. WHEN displaying preview THEN it SHALL be in flex layout with space-between
58. WHEN displaying preview THEN icon SHALL be blue-600 color

### 8.8 Display Criteria - Error Message

59. WHEN error exists THEN error box SHALL be displayed
60. WHEN error exists THEN box SHALL have red-50 background
61. WHEN error exists THEN box SHALL have red-200 border
62. WHEN error exists THEN text SHALL be red-800 color
63. WHEN error exists THEN text SHALL be small (text-sm)
64. WHEN no error THEN error box SHALL NOT be displayed
65. WHEN user types THEN error SHALL be cleared

### 8.9 Display Criteria - Action Buttons

66. WHEN displaying buttons THEN Cancel SHALL be outline variant
67. WHEN displaying buttons THEN Apply SHALL be primary variant
68. WHEN displaying buttons THEN both SHALL have equal width (flex-1)
69. WHEN displaying buttons THEN they SHALL have gap between them
70. WHEN displaying buttons THEN Cancel SHALL be on left
71. WHEN displaying buttons THEN Apply SHALL be on right
72. WHEN displaying buttons THEN Apply SHALL say "Apply Conversion"

### 8.10 Display Criteria - Help Text

73. WHEN displaying help THEN it SHALL have gray-50 background
74. WHEN displaying help THEN it SHALL have gray-200 border
75. WHEN displaying help THEN text SHALL be extra small (text-xs)
76. WHEN displaying help THEN text SHALL be gray-600 color
77. WHEN displaying help THEN it SHALL include "Tip:" label in bold
78. WHEN displaying help THEN it SHALL provide conversion example
79. WHEN displaying help THEN it SHALL mention density conversions

### 8.11 Interaction Criteria

80. WHEN user clicks Close (X) button THEN onClose SHALL be called
81. WHEN user clicks Cancel button THEN onClose SHALL be called
82. WHEN user clicks Apply with valid data THEN onConversionApplied SHALL be called
83. WHEN user clicks Apply with valid data THEN onClose SHALL be called
84. WHEN onConversionApplied is called THEN it SHALL receive UnitConversion object
85. WHEN UnitConversion is created THEN it SHALL have all required fields
86. WHEN UnitConversion is created THEN fromValue SHALL be numeric
87. WHEN UnitConversion is created THEN toValue SHALL be numeric
88. WHEN UnitConversion is created THEN conversionFactor SHALL be numeric

### 8.12 Layout & Styling Criteria

89. WHEN component renders THEN card SHALL have max-width md
90. WHEN component renders THEN header SHALL have title and description
91. WHEN component renders THEN header SHALL have close button
92. WHEN component renders THEN all sections SHALL have consistent spacing (space-y-4)
93. WHEN component renders THEN inputs SHALL have appropriate widths
94. WHEN component renders THEN selects SHALL be 32 width (w-32)
95. WHEN component renders THEN card SHALL be centered (if modal)

### 8.13 UX Criteria

96. Component SHALL render within 500ms
97. All text SHALL be clearly readable
98. Disabled inputs SHALL be visually distinct (gray background)
99. Error messages SHALL be clearly visible
100. Conversion preview SHALL update smoothly
101. Number formatting SHALL be consistent
102. Helper text SHALL be helpful and clear
103. Action buttons SHALL be easily clickable
104. Close button SHALL be easily accessible

### 8.14 Edge Cases

105. WHEN fromValue is "0" THEN toValue SHALL be "0"
106. WHEN conversionFactor is "0" THEN error SHALL be shown
107. WHEN conversionFactor is negative THEN error SHALL be shown
108. WHEN conversionFactor is "1" and units are same THEN identity conversion allowed
109. WHEN conversionFactor is very large (>1000) THEN warning SHALL be shown
110. WHEN fromValue contains multiple commas THEN they SHALL all be removed
111. WHEN fromValue is "1,234,567.89" THEN it SHALL parse correctly
112. WHEN toValue is very large THEN it SHALL format correctly
113. WHEN toValue has many decimals THEN it SHALL round to 2 places
114. WHEN user types non-numeric factor THEN it SHALL handle gracefully

### 8.15 Accessibility Criteria

115. All inputs SHALL have proper labels
116. Label "for" attributes SHALL match input IDs
117. Error messages SHALL be associated with inputs
118. Close button SHALL have accessible label
119. Keyboard navigation SHALL work for all interactive elements
120. Tab order SHALL be logical (From → Factor → To → Cancel → Apply)

## 9. Dependencies

### 9.1 Prerequisites

**Data Requirements:**
- Original value and unit must be available
- Value must be parseable as number
- Unit must be valid UnitType

**System Requirements:**
- Component must be rendered within React application
- Card, CardHeader, CardTitle, CardDescription, CardContent components must be available
- Button, Input, Label, Select components must be available
- ArrowRight and X icons (lucide-react) must be available

**User Requirements:**
- Buyer must have identified need for unit conversion
- Buyer must understand conversion factors for their industry
- Buyer must be on Extraction Review or Comparison screen

### 9.2 Backend/API Requirements

**Data Structures:**
```typescript
type UnitType = 'pieces' | 'kg' | 'liters' | 'units';

interface UnitConversion {
  fromValue: number;
  fromUnit: UnitType;
  toUnit: UnitType;
  conversionFactor?: number;
  toValue: number;
}
```

**API Endpoints:**
- No direct API calls from this component
- Parent component handles saving conversion to backend
- Conversion applied via callback: `onConversionApplied(conversion)`

**Data Flow:**
1. Parent component opens Unit Converter with fromValue and fromUnit
2. User enters conversion factor and selects toUnit
3. Component calculates toValue
4. User clicks Apply
5. Component calls onConversionApplied with UnitConversion object
6. Parent component saves conversion and updates display
7. Component closes

### 9.3 Integration Points

**Extraction Review (Screen 20):**
- Opens Unit Converter when buyer needs to correct units
- Receives UnitConversion and updates extracted data
- Marks field as manually corrected

**Comparison Dashboard (Screen 24):**
- Opens Unit Converter when unit mismatch detected
- Applies conversion to normalize data
- Updates comparison with converted values

**Normalization Service:**
- Unit Converter provides manual override for automatic normalization
- Conversion factors stored for audit trail
- Future: Learn from manual conversions to improve automatic normalization

**Number Formatting Utilities:**
- parseFormattedNumber: Removes commas and parses to float
- formatNumber: Formats with commas and 2 decimal places
- Consistent with other currency/number formatting in app

## 10. Success Metrics

### 10.1 Functional Metrics

- **Conversion Accuracy:** 100% of applied conversions calculate correctly
- **Validation Effectiveness:** 95%+ of invalid factors caught before application
- **Usage Frequency:** 10-15% of extractions require manual unit conversion
- **Error Rate:** <1% of conversions result in errors

### 10.2 User Experience Metrics

- **Conversion Time:** Average 30 seconds to complete conversion
- **Ease of Use:** 4.5/5 rating for converter usability
- **Error Recovery:** 90%+ of validation errors resolved on first retry
- **Help Text Effectiveness:** 70%+ of users understand conversion without external help

### 10.3 Business Impact Metrics

- **Data Quality:** 95%+ of unit conversions improve data normalization
- **Comparison Accuracy:** 20% improvement in fair supplier comparison
- **Manual Correction Rate:** 10-15% of extractions need manual unit conversion
- **Time Savings:** 2-3 minutes saved vs. manual spreadsheet conversion

### 10.4 Adoption Metrics

- **Feature Awareness:** 90%+ of buyers aware of unit converter
- **Feature Usage:** 80%+ of buyers use converter when needed
- **Repeat Usage:** 60%+ of buyers use converter multiple times per RFQ

## 11. Open Questions

1. **Standard Conversion Library:** Should system provide pre-defined conversion factors for common conversions?
   - **Current Approach:** User enters all factors manually
   - **Future Consideration:** Dropdown with common conversions (kg→lbs: 2.20462, liters→gallons: 0.264172)

2. **Conversion History:** Should system remember user's previous conversion factors?
   - **Current Approach:** No history, starts at 1.0 each time
   - **Future Consideration:** "Recently used: 1 kg = 0.92 liters (oil density)"

3. **Bidirectional Conversion:** Should system allow converting back (reverse conversion)?
   - **Current Approach:** One-way conversion only
   - **Future Consideration:** Swap button to reverse from/to units

4. **Multiple Conversions:** Should system allow chaining conversions (kg → lbs → ounces)?
   - **Current Approach:** Single conversion only
   - **Future Consideration:** Multi-step conversion wizard

5. **Validation Thresholds:** Should warning threshold (1000) be configurable per industry?
   - **Current Approach:** Fixed threshold of 1000
   - **Future Consideration:** Industry-specific thresholds (chemical industry may use larger factors)

6. **Unit Categories:** Should system group units by category (weight, volume, quantity)?
   - **Current Approach:** Flat list of 4 units
   - **Future Consideration:** Categorized dropdown with more unit types

7. **Confidence Scoring:** Should system flag conversions with unusual factors for review?
   - **Current Approach:** No confidence scoring
   - **Future Consideration:** Flag factors >10 or <0.1 as "unusual"

8. **Audit Trail:** Should system track who applied conversion and when?
   - **Current Approach:** Conversion applied, no detailed audit
   - **Future Consideration:** Full audit trail with user, timestamp, original/converted values

---

**Document Version:** 1.0  
**Created:** January 2, 2026  
**Status:** Complete  
**Total Acceptance Criteria:** 120
