# Screen Requirements: Tooling Clarity Form

## 1. Overview
- **Screen ID:** SCR-015
- **Component File:** `src/app/components/ToolingClarityForm.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 3 - Multi-Format Extraction & Normalization
- **Priority:** P0 (Must Have)
- **Flexibility Level:** Low - Critical fixed structure for tooling cost transparency

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** clearly identify whether tooling costs are embedded in piece price or separate  
**So that** I can compare suppliers fairly and avoid hidden tooling costs that distort pricing

### Related User Stories
- **REQ-MVP-05:** Tooling amortization transparency (explicit breakdown: piece price vs tooling amortization)
- **US-MVP-12:** Detect Hidden Costs (Embedded Tooling)
- **US-MVP-23:** Review Summary with Target Price and Supplier Ranking
- **US-MVP-24:** Drill Down to Detailed Breakdown

## 3. Screen Purpose & Context

### Purpose
This screen addresses a critical pain point in supplier quote comparison: **hidden tooling costs**. Many suppliers embed tooling amortization into the piece price, making it impossible to compare fairly with suppliers who quote tooling separately. This form:
- **Detects embedded tooling:** Explicitly asks if tooling is included in piece price
- **Separates costs:** If embedded, captures the amortization amount per piece
- **Enables fair comparison:** System can subtract embedded tooling from piece price for apples-to-apples comparison
- **Provides transparency:** All tooling costs are visible and comparable

### Context
- **When user sees this:** 
  - During RFQ creation (Step 3 of RFQ Form - Requirements Checklist)
  - When "Tooling Costs" requirement is selected
  - During quote extraction review (Screen 20)
  - When LLM detects potential embedded tooling
- **Why it exists:** 
  - Tooling costs are often 20-50% of total project cost
  - Embedded tooling prevents fair comparison (can't compare €5/piece with embedded tooling to €4/piece + €50K tooling)
  - This is a major pain point identified in user research
  - Critical for accurate cost analysis and decision making
- **Position in journey:** 
  - Part of RFQ Form (Screen 13) - Requirements section
  - Appears in Extraction Review (Screen 20) when processing supplier quotes
  - Data feeds into Comparison Board (Screen 22) for normalized comparison


### Key Characteristics
- **Embedded form:** Appears within RFQ Form or Extraction Review
- **Per-supplier configuration:** Each supplier has their own tooling structure
- **Critical question:** "Is tooling amortization already included in piece price?" (Yes/No)
- **Conditional fields:** If embedded, amortization amount per piece is required
- **Warning system:** Visual alerts when embedded tooling is detected
- **Cost separation:** System automatically separates embedded tooling for fair comparison
- **Editable/Read-only modes:** Can be editable (RFQ creation) or read-only (review)



## 4. Visual Layout & Structure

### 4.1 Main Sections

**Card Container:**
1. **Card Header**
   - Wrench icon (size-4)
   - Title: "Tooling Cost Clarity - [Supplier Name]"
   - Text size: base (16px)

2. **Card Content**
   - Tooling Investment field
   - Amortization Period (number + unit selector)
   - Critical Question section (orange border, highlighted)
   - Conditional: Amortization Amount field (if embedded)
   - Maintenance Cost field
   - Warning banner (if embedded)
   - Summary note (blue banner)

### 4.2 Key UI Elements

**Card Header:**
- **Icon:** Wrench icon (h-4, w-4)
- **Title:** "Tooling Cost Clarity - [Supplier Name]"
  - Font: text-base
  - Flex layout with gap-2
  - Supplier name is dynamic

**Tooling Investment Field:**
- **Label:** "Tooling Investment (€)" (text-sm, font-semibold)
- **Input:** 
  - Type: number
  - Step: 0.01
  - Placeholder: "0.00"
  - Size: text-sm
  - Margin: mt-1
- **Purpose:** Total upfront tooling cost

**Amortization Period Section:**
- **Grid Layout:** 2 columns with gap-2
- **Field 1: Period**
  - Label: "Amortization Period" (text-sm, font-semibold)
  - Input: number
  - Placeholder: "0"
  - Size: text-sm
  - Margin: mt-1

- **Field 2: Unit**
  - Label: "Unit" (text-sm, font-semibold)
  - Select dropdown with options:
    - Pieces
    - Months
    - Years
  - Margin: mt-1
  - Default: "pieces"


**Critical Question Section (Highlighted):**
- **Container:**
  - Border: border-2 border-orange-300
  - Background: bg-orange-50
  - Rounded: rounded-lg
  - Padding: p-4
- **Label:** 
  - Text: "Is tooling amortization already included in piece price?"
  - Size: text-sm
  - Weight: font-semibold
  - Color: text-orange-900
- **Button Group:**
  - Flex layout with gap-4
  - Margin: mt-2
  
  **Button 1: No - Separate**
  - Width: flex-1
  - Padding: py-2 px-4
  - Border: border-2
  - Rounded: rounded-lg
  - Transition: transition-colors
  - **When selected:**
    - Border: border-green-500
    - Background: bg-green-100
    - Text: text-green-900
    - Weight: font-semibold
  - **When not selected:**
    - Border: border-gray-300
    - Background: bg-white
    - Text: text-gray-700
    - Hover: hover:bg-gray-50

  **Button 2: Yes - Embedded**
  - Width: flex-1
  - Padding: py-2 px-4
  - Border: border-2
  - Rounded: rounded-lg
  - Transition: transition-colors
  - **When selected:**
    - Border: border-orange-500
    - Background: bg-orange-100
    - Text: text-orange-900
    - Weight: font-semibold
  - **When not selected:**
    - Border: border-gray-300
    - Background: bg-white
    - Text: text-gray-700
    - Hover: hover:bg-gray-50

**Conditional: Embedded Tooling Section (shown if "Yes - Embedded" selected):**
- **Container:**
  - Background: bg-orange-50
  - Border: border border-orange-300
  - Rounded: rounded-lg
  - Padding: p-3
  - Space: space-y-2

- **Header:**
  - Flex layout with gap-2
  - Alignment: items-center
  - **Icon:** AlertTriangle (h-4, w-4)
  - **Text:** "Embedded Tooling Detected"
    - Size: text-sm
    - Weight: font-semibold
    - Color: text-orange-900

- **Amortization Amount Field:**
  - Label: "Amortization Amount per Piece (€) *"
    - Size: text-sm
    - Color: text-orange-900
  - Input:
    - Type: number
    - Step: 0.01
    - Placeholder: "0.00"
    - Size: text-sm
    - Margin: mt-1
    - Border: Red if error, normal otherwise
  - Error message (if empty when required):
    - Size: text-xs
    - Color: text-red-600
    - Margin: mt-1
  - Help text:
    - Text: "This amount will be separated from the piece price for accurate comparison"
    - Size: text-xs
    - Color: text-orange-700
    - Margin: mt-1


**Maintenance Cost Field:**
- **Label:** "Tooling Maintenance Cost (€/year)" (text-sm, font-semibold)
- **Input:** 
  - Type: number
  - Step: 0.01
  - Placeholder: "0.00"
  - Size: text-sm
  - Margin: mt-1
- **Purpose:** Annual maintenance cost for tooling

**Warning Banner (shown if embedded tooling detected):**
- **Container:**
  - Background: bg-yellow-50
  - Border: border border-yellow-300
  - Rounded: rounded-lg
  - Padding: p-3
- **Content:**
  - Flex layout with gap-2
  - Alignment: items-start
  - **Icon:** AlertTriangle (h-4, w-4, text-yellow-700, mt-0.5)
  - **Text:**
    - Size: text-xs
    - Color: text-yellow-900
    - Content: "**Warning:** This supplier has embedded tooling costs in the piece price. The system will automatically separate these costs for accurate comparison with other suppliers."

**Summary Note:**
- **Container:** 
  - Background: blue-50
  - Border: blue-200
  - Rounded: rounded-lg
  - Padding: p-3
  - Margin: mt-4, pt-4, border-t (top border separator)
- **Text:** 
  - Size: text-xs
  - Color: blue-900
  - Content: "**Note:** Tooling cost clarity ensures apples-to-apples comparison between suppliers. Embedded tooling costs are automatically separated for fair evaluation."
  - Bold: "Note:" is wrapped in <strong>

### 4.3 Information Hierarchy

**Primary Information:**
- Critical question: "Is tooling amortization included in piece price?" (most important)
- Tooling investment amount
- Amortization period and unit

**Secondary Information:**
- Amortization amount per piece (if embedded)
- Maintenance cost
- Warning banner (if embedded)

**Tertiary Information:**
- Field labels and placeholders
- Help text
- Summary note



## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| supplier_id | String | Parent context | Yes | Unique supplier identifier |
| supplier_name | String | Parent context | Yes | Display name for supplier |
| rfq_id | String | Parent context | Yes | Associated RFQ ID |
| quote_id | String | Parent context | No | Associated quote ID (if from extraction) |
| created_at | DateTime | System timestamp | Yes | ISO 8601 format |
| updated_at | DateTime | System timestamp | Yes | ISO 8601 format |


### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| tooling_investment | Decimal | Yes | No | Non-negative, 2 decimal places |
| amortization_period | Integer | Yes | No | Positive integer |
| amortization_unit | Enum | Yes | No | 'pieces', 'months', 'years' |
| included_in_piece_price | Boolean | Yes | No | True/False (critical field) |
| maintenance_cost | Decimal | No | Yes | Non-negative, 2 decimal places |

### 5.3 Dynamic Fields (Buyer-Selectable)
| Field Name | Data Type | Conditions | Validation Rules | Default Value |
|------------|-----------|------------|------------------|---------------|
| toolingInvestment | Decimal | Always | Min 0, 2 decimal places | 0.00 |
| amortizationPeriod | Integer | Always | Min 1 | 0 |
| amortizationUnit | Enum | Always | 'pieces', 'months', 'years' | 'pieces' |
| includedInPiecePrice | Boolean | Always | True/False | false |
| amortizationAmount | Decimal | If includedInPiecePrice=true | Min 0, 2 decimal places, REQUIRED | undefined |
| maintenanceCost | Decimal | Always | Min 0, 2 decimal places | 0.00 |

### 5.4 Data Displayed
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| supplier_name | String | Props | Yes | Display in header |
| toolingInvestment | Decimal | State | No | Display in input, € symbol |
| amortizationPeriod | Integer | State | No | Display in input |
| amortizationUnit | Enum | State | Yes | Display in dropdown |
| includedInPiecePrice | Boolean | State | Yes | Button group state |
| amortizationAmount | Decimal | State | Conditional | Display in input if includedInPiecePrice=true, € symbol |
| maintenanceCost | Decimal | State | No | Display in input, € symbol |
| embedded_warning | String | Computed | No | Show if includedInPiecePrice=true |
| summary_note | String | Static | Yes | Always visible |

### 5.5 Data Collected from User
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| toolingInvestment | Number input | No | Decimal, min 0, step 0.01 | 0.00 |
| amortizationPeriod | Number input | No | Integer, min 1 | 0 |
| amortizationUnit | Dropdown select | Yes | Must be 'pieces', 'months', or 'years' | 'pieces' |
| includedInPiecePrice | Button group | Yes | Boolean (true/false) | false |
| amortizationAmount | Number input | Conditional | Decimal, min 0, step 0.01, REQUIRED if includedInPiecePrice=true | undefined |
| maintenanceCost | Number input | No | Decimal, min 0, step 0.01 | 0.00 |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| show_embedded_section | includedInPiecePrice === true | includedInPiecePrice |
| show_warning_banner | includedInPiecePrice === true | includedInPiecePrice |
| validation_error | includedInPiecePrice === true && !amortizationAmount | includedInPiecePrice, amortizationAmount |
| tooling_cost_per_piece | If separate: toolingInvestment / amortizationPeriod (if unit=pieces); If embedded: amortizationAmount | toolingInvestment, amortizationPeriod, amortizationUnit, includedInPiecePrice, amortizationAmount |
| adjusted_piece_price | If embedded: original_piece_price - amortizationAmount | includedInPiecePrice, amortizationAmount, original_piece_price |
| is_form_valid | All required fields filled + conditional validation | All fields |




## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**How buyer selects fields:**
- Tooling Clarity Form is accessed when "Tooling Costs" requirement is selected in RFQ Form (Step 3)
- Buyer can configure tooling requirements per supplier or use template for all
- Critical question (embedded vs separate) is always required
- All selections persist and are included in RFQ email to suppliers

**Field selection UI:**
- **Tooling Investment:** Always visible, optional to fill
- **Amortization Period/Unit:** Always visible, optional to fill
- **Included in Piece Price:** Always visible, REQUIRED (critical question)
- **Amortization Amount:** Conditional - only visible if "Yes - Embedded" selected, then REQUIRED
- **Maintenance Cost:** Always visible, optional to fill

**Mandatory field rules:**
- **includedInPiecePrice:** REQUIRED (must select Yes or No)
- **amortizationAmount:** REQUIRED if includedInPiecePrice=true
- All other fields are optional

**Field dependencies:**
- Embedded tooling section depends on includedInPiecePrice=true
- Amortization amount field depends on includedInPiecePrice=true
- Warning banner depends on includedInPiecePrice=true
- Validation error depends on includedInPiecePrice=true && !amortizationAmount

### 6.2 UI Adaptation Logic

**Form generation:**
- Form is statically structured (not dynamically generated)
- Conditional sections show/hide based on includedInPiecePrice state
- All fields are present in DOM, visibility controlled by React state

**Layout rules:**
- Card container: Full width of parent
- Grid layout: 2 columns for amortization period/unit
- Conditional section: Full width, indented with orange background
- Responsive: Grid collapses to single column on mobile (<768px)

**Validation adaptation:**
- Validation rules change based on includedInPiecePrice state
- If includedInPiecePrice=false: amortizationAmount not validated
- If includedInPiecePrice=true: amortizationAmount becomes REQUIRED
- Real-time validation on field blur
- Form-level validation before submission
- Error state managed in local component state

**Caching strategy:**
- Form state managed in parent component (RFQ Form or Extraction Review)
- Changes propagate via onUpdate callback
- No local caching (state lives in parent)
- Data persists in parent component state

### 6.3 LLM Integration (if applicable)

**LLM role:**
- During quote extraction (Screen 20), LLM analyzes supplier quotes for tooling structure
- LLM attempts to detect if tooling is embedded in piece price or separate
- LLM extracts tooling investment, amortization period, maintenance costs
- LLM provides confidence scores for each extracted field

**Input to LLM:**
- Supplier quote text (email body, PDF, Excel)
- Context: "Analyze tooling cost structure. Is tooling amortization included in piece price or quoted separately?"
- Schema: ToolingCostDetails interface structure

**Output from LLM:**
- Structured ToolingCostDetails object
- includedInPiecePrice: Boolean (true if embedded, false if separate)
- If embedded: amortizationAmount per piece
- If separate: toolingInvestment and amortizationPeriod
- Confidence scores per field

**Confidence scoring:**
- High confidence (>90%): Auto-fill, no review needed
- Medium confidence (80-89%): Auto-fill, flag for review
- Low confidence (<80%): Leave empty, manual entry required
- **Critical:** If LLM detects embedded tooling with low confidence, always flag for manual review

**Fallback behavior:**
- If LLM extraction fails: Form shows empty, manual entry required
- If LLM returns partial data: Fill available fields, leave rest empty
- If LLM confidence low on includedInPiecePrice: Default to false (separate), flag for review
- If embedded but no amortizationAmount: Show error, require manual entry




## 7. User Interactions

### 7.1 Primary Actions

**Action: Enter Tooling Investment**
- **Trigger:** User types in tooling investment input field
- **Behavior:** 
  - Decimal number updates in real-time
  - Value stored in data.toolingInvestment
  - onUpdate callback fires with updated data
- **Validation:** 
  - Must be decimal with max 2 decimal places
  - Must be >= 0
  - Optional field
- **Success:** Value saved to parent state
- **Error:** If negative: Error message "Tooling investment must be 0 or greater.", value reset to 0.00
- **Navigation:** Stays on form

**Action: Enter Amortization Period**
- **Trigger:** User types in amortization period input field
- **Behavior:** 
  - Integer number updates in real-time
  - Value stored in data.amortizationPeriod
  - onUpdate callback fires
- **Validation:** 
  - Must be integer
  - Must be >= 1
  - Optional field
- **Success:** Value saved to parent state
- **Error:** If < 1: Error message "Amortization period must be at least 1.", value reset to 0
- **Navigation:** Stays on form

**Action: Select Amortization Unit**
- **Trigger:** User clicks amortization unit dropdown and selects option
- **Behavior:** 
  - Dropdown opens with 3 options: Pieces, Months, Years
  - User selects one option
  - Value stored in data.amortizationUnit
  - Dropdown closes
  - onUpdate callback fires
- **Validation:** 
  - Must be one of: 'pieces', 'months', 'years'
  - Required field (defaults to 'pieces')
- **Success:** Value saved to parent state
- **Error:** None (dropdown enforces valid values)
- **Navigation:** Stays on form

**Action: Select "No - Separate" (Tooling NOT Embedded)**
- **Trigger:** User clicks "No - Separate" button
- **Behavior:** 
  - Button shows selected state (green border, green background)
  - "Yes - Embedded" button shows unselected state
  - Value stored in data.includedInPiecePrice = false
  - Embedded tooling section disappears (if previously visible)
  - amortizationAmount value cleared
  - Warning banner disappears
  - Validation error cleared
  - onUpdate callback fires
- **Validation:** None (boolean value)
- **Success:** Value saved, UI updated
- **Error:** None
- **Navigation:** Stays on form

**Action: Select "Yes - Embedded" (Tooling IS Embedded)**
- **Trigger:** User clicks "Yes - Embedded" button
- **Behavior:** 
  - Button shows selected state (orange border, orange background)
  - "No - Separate" button shows unselected state
  - Value stored in data.includedInPiecePrice = true
  - Embedded tooling section appears (orange background)
  - Amortization amount field becomes visible and REQUIRED
  - Warning banner appears
  - onUpdate callback fires
- **Validation:** None (boolean value)
- **Success:** Value saved, conditional section appears
- **Error:** If amortizationAmount not filled: Validation error appears
- **Navigation:** Stays on form


**Action: Enter Amortization Amount per Piece (Conditional)**
- **Trigger:** User types in amortization amount field (only visible if includedInPiecePrice=true)
- **Behavior:** 
  - Decimal number updates in real-time
  - Value stored in data.amortizationAmount
  - Validation error cleared if value is valid
  - onUpdate callback fires
- **Validation:** 
  - Must be decimal with max 2 decimal places
  - Must be >= 0
  - REQUIRED if includedInPiecePrice=true
- **Success:** Value saved, validation error cleared
- **Error:** 
  - If empty when required: Error message "Amortization amount is required when tooling is included in piece price"
  - If negative: Error message "Amortization amount must be 0 or greater.", value reset to 0.00
  - Field highlighted in red
- **Navigation:** Stays on form

**Action: Enter Maintenance Cost**
- **Trigger:** User types in maintenance cost input field
- **Behavior:** 
  - Decimal number updates in real-time
  - Value stored in data.maintenanceCost
  - onUpdate callback fires
- **Validation:** 
  - Must be decimal with max 2 decimal places
  - Must be >= 0
  - Optional field
- **Success:** Value saved to parent state
- **Error:** If negative: Error message "Maintenance cost must be 0 or greater.", value reset to 0.00
- **Navigation:** Stays on form

### 7.2 Secondary Actions

**Action: View Warning Banner**
- **Trigger:** User selects "Yes - Embedded" button
- **Behavior:** 
  - Yellow banner appears below maintenance cost field
  - Shows warning icon and text explaining embedded tooling
  - Banner is informational only (no interaction)
- **Validation:** None (informational only)
- **Success:** User understands embedded tooling implications
- **Error:** None
- **Navigation:** Stays on form

**Action: View Summary Note**
- **Trigger:** User scrolls to bottom of form
- **Behavior:** 
  - Blue banner with note is always visible
  - Explains tooling cost clarity purpose
- **Validation:** None (informational only)
- **Success:** User understands form purpose
- **Error:** None
- **Navigation:** Stays on form

**Action: Form in Read-Only Mode**
- **Trigger:** isEditable prop is false (during review/comparison)
- **Behavior:** 
  - All input fields are disabled
  - Button group is disabled
  - Dropdown is disabled
  - Values are displayed but cannot be edited
  - Form shows supplier's provided tooling details
  - Conditional sections still show/hide based on data
- **Validation:** None (read-only)
- **Success:** User can view but not edit
- **Error:** None
- **Navigation:** Stays on form

### 7.3 Navigation

**From:**
- Screen 13: RFQ Form (Step 3 - Requirements Checklist, when "Tooling Costs" selected)
- Screen 16: Email Preview (to review tooling requirements)
- Screen 20: Extraction Review (to review/edit extracted tooling data)

**To:**
- No direct navigation (embedded form)
- Data flows back to parent component via onUpdate callback
- Parent component handles navigation

**Exit Points:**
- No direct exit (embedded component)
- Parent component controls when form is shown/hidden
- Data persists in parent component state




## 8. Business Rules

### 8.1 Validation Rules

**Tooling Investment Validation:**
- **Rule:** Must be non-negative decimal with max 2 decimal places
- **Error:** "Tooling investment must be 0 or greater."
- **Format:** Step 0.01 (e.g., 50000.00, 125000.50)
- **Optional:** Field is not required

**Amortization Period Validation:**
- **Rule:** Must be positive integer (>= 1)
- **Error:** "Amortization period must be at least 1."
- **Optional:** Field is not required

**Amortization Unit Validation:**
- **Rule:** Must be one of: 'pieces', 'months', 'years'
- **Error:** None (dropdown enforces valid values)
- **Required:** Field has default value 'pieces'

**Included in Piece Price Validation:**
- **Rule:** Must be boolean (true or false)
- **Error:** None (button group enforces valid values)
- **Required:** User must select one option (critical question)

**Amortization Amount Validation (Conditional):**
- **Rule:** Must be non-negative decimal with max 2 decimal places
- **Rule:** REQUIRED if includedInPiecePrice=true
- **Error:** "Amortization amount is required when tooling is included in piece price"
- **Error:** "Amortization amount must be 0 or greater."
- **Format:** Step 0.01 (e.g., 0.50, 1.25)
- **Critical:** This field is the key to separating embedded tooling costs

**Maintenance Cost Validation:**
- **Rule:** Must be non-negative decimal with max 2 decimal places
- **Error:** "Maintenance cost must be 0 or greater."
- **Format:** Step 0.01 (e.g., 5000.00, 12500.50)
- **Optional:** Field is not required

### 8.2 Calculation Logic

**Tooling Cost per Piece (Separate Tooling):**
- **Condition:** includedInPiecePrice = false
- **Formula:** `toolingInvestment / amortizationPeriod` (if unit = pieces)
- **Formula:** `toolingInvestment / (amortizationPeriod * pieces_per_month)` (if unit = months)
- **Formula:** `toolingInvestment / (amortizationPeriod * 12 * pieces_per_month)` (if unit = years)
- **Example:** €50,000 / 100,000 pieces = €0.50 per piece
- **Used in:** Total cost comparison

**Tooling Cost per Piece (Embedded Tooling):**
- **Condition:** includedInPiecePrice = true
- **Formula:** `amortizationAmount` (directly provided by supplier)
- **Example:** €0.50 per piece (embedded in piece price)
- **Used in:** Separating embedded tooling from piece price

**Adjusted Piece Price (Embedded Tooling):**
- **Condition:** includedInPiecePrice = true
- **Formula:** `original_piece_price - amortizationAmount`
- **Example:** €5.00 (quoted) - €0.50 (tooling) = €4.50 (actual piece price)
- **Used in:** Fair comparison with suppliers who quote tooling separately
- **Critical:** This is the key calculation that enables apples-to-apples comparison

**Total Tooling Cost (Lifetime):**
- **Formula:** `toolingInvestment + (maintenanceCost * years_of_production)`
- **Example:** €50,000 + (€5,000 * 5 years) = €75,000
- **Used in:** Total cost of ownership analysis

**Tooling Amortization by Year:**
- **Formula:** `tooling_cost_per_piece * annual_volume`
- **Example:** €0.50 * 50,000 pieces = €25,000 per year
- **Used in:** Multi-year cost projections


### 8.3 Conditional Display Logic

**Show Embedded Tooling Section:**
- **Condition:** `includedInPiecePrice === true`
- **Display:** Orange-bordered section with:
  - "Embedded Tooling Detected" header
  - Amortization amount per piece field (REQUIRED)
  - Help text explaining cost separation
- **Hide:** Section not shown if includedInPiecePrice === false

**Show Warning Banner:**
- **Condition:** `includedInPiecePrice === true`
- **Display:** Yellow banner with warning icon and text
- **Hide:** Banner not shown if includedInPiecePrice === false

**Show Validation Error:**
- **Condition:** `includedInPiecePrice === true && !amortizationAmount`
- **Display:** Red error message below amortization amount field
- **Hide:** Error not shown if amortizationAmount is filled or includedInPiecePrice === false

**Disable All Fields (Read-Only Mode):**
- **Condition:** `isEditable === false`
- **Display:** All fields shown but disabled
- **Behavior:** User can view but not edit
- **Use Case:** During review/comparison screens

### 8.4 Error Handling

**Invalid Number Input:**
- **Detection:** User enters non-numeric value in number field
- **Handling:** 
  - Input rejects non-numeric characters
  - If somehow entered: Value reset to 0
  - Error message: "Please enter a valid number."
- **Recovery:** User enters valid number

**Negative Number Input:**
- **Detection:** User enters negative value
- **Handling:** 
  - Error message: "[Field name] must be 0 or greater."
  - Value reset to 0
  - Field highlighted in red
- **Recovery:** User enters non-negative number

**Missing Required Field (Amortization Amount):**
- **Detection:** includedInPiecePrice=true but amortizationAmount is empty
- **Handling:** 
  - Error message: "Amortization amount is required when tooling is included in piece price"
  - Field highlighted in red
  - Form validation fails
  - Error state stored in component state
- **Recovery:** User fills amortization amount or changes to "No - Separate"

**Too Many Decimal Places:**
- **Detection:** User enters more than 2 decimal places
- **Handling:** 
  - Value automatically rounded to 2 decimal places
  - No error message (automatic correction)
- **Recovery:** Automatic

**Zero Amortization Period:**
- **Detection:** User enters 0 for amortization period
- **Handling:** 
  - Error message: "Amortization period must be at least 1."
  - Value reset to 0
  - Field highlighted in red
- **Recovery:** User enters positive integer

**Parent Component Update Failure:**
- **Detection:** onUpdate callback fails or throws error
- **Handling:** 
  - Error caught and logged
  - Error message: "Failed to save changes. Please try again."
  - Local state preserved
  - User can retry
- **Recovery:** User retries action or refreshes page

**LLM Extraction Uncertainty:**
- **Detection:** LLM confidence < 80% on includedInPiecePrice
- **Handling:** 
  - Default to false (separate tooling)
  - Flag field for manual review
  - Warning badge: "Please verify tooling structure"
- **Recovery:** User manually verifies and corrects if needed




## 9. Acceptance Criteria

### 9.1 Functional Criteria

**Tooling Investment**
1. WHEN user loads form THEN tooling investment field SHALL be visible
2. WHEN user enters tooling investment THEN value SHALL update in real-time
3. WHEN tooling investment is negative THEN error message SHALL appear
4. WHEN tooling investment exceeds 2 decimal places THEN value SHALL be rounded
5. WHEN user enters valid tooling investment THEN value SHALL be saved to parent state

**Amortization Period**
6. WHEN user loads form THEN amortization period field SHALL be visible
7. WHEN user enters amortization period THEN value SHALL update in real-time
8. WHEN amortization period is 0 or negative THEN error message SHALL appear
9. WHEN user enters valid amortization period THEN value SHALL be saved to parent state

**Amortization Unit**
10. WHEN user loads form THEN amortization unit dropdown SHALL be visible
11. WHEN user clicks dropdown THEN options SHALL show: Pieces, Months, Years
12. WHEN user selects unit THEN value SHALL be saved to parent state
13. WHEN form loads THEN default unit SHALL be "pieces"

**Critical Question: Included in Piece Price**
14. WHEN user loads form THEN button group SHALL be visible
15. WHEN user clicks "No - Separate" THEN button SHALL show selected state (green)
16. WHEN user clicks "Yes - Embedded" THEN button SHALL show selected state (orange)
17. WHEN user clicks "No - Separate" THEN "Yes - Embedded" SHALL show unselected state
18. WHEN user clicks "Yes - Embedded" THEN "No - Separate" SHALL show unselected state
19. WHEN user selects option THEN value SHALL be saved to parent state

**Embedded Tooling Section (Conditional)**
20. WHEN includedInPiecePrice is false THEN embedded section SHALL NOT be visible
21. WHEN user clicks "Yes - Embedded" THEN embedded section SHALL appear
22. WHEN embedded section appears THEN it SHALL have orange background and border
23. WHEN embedded section appears THEN "Embedded Tooling Detected" header SHALL be visible
24. WHEN embedded section appears THEN amortization amount field SHALL be visible
25. WHEN embedded section appears THEN amortization amount field SHALL be REQUIRED
26. WHEN user clicks "No - Separate" THEN embedded section SHALL disappear
27. WHEN embedded section disappears THEN amortization amount value SHALL be cleared

**Amortization Amount (Conditional)**
28. WHEN includedInPiecePrice is true THEN amortization amount field SHALL be visible
29. WHEN includedInPiecePrice is false THEN amortization amount field SHALL NOT be visible
30. WHEN user enters amortization amount THEN value SHALL update in real-time
31. WHEN amortization amount is empty and required THEN error message SHALL appear
32. WHEN amortization amount is negative THEN error message SHALL appear
33. WHEN amortization amount exceeds 2 decimal places THEN value SHALL be rounded
34. WHEN user enters valid amortization amount THEN error SHALL be cleared
35. WHEN user enters valid amortization amount THEN value SHALL be saved to parent state

**Maintenance Cost**
36. WHEN user loads form THEN maintenance cost field SHALL be visible
37. WHEN user enters maintenance cost THEN value SHALL update in real-time
38. WHEN maintenance cost is negative THEN error message SHALL appear
39. WHEN maintenance cost exceeds 2 decimal places THEN value SHALL be rounded
40. WHEN user enters valid maintenance cost THEN value SHALL be saved to parent state

**Warning Banner (Conditional)**
41. WHEN includedInPiecePrice is false THEN warning banner SHALL NOT be visible
42. WHEN user clicks "Yes - Embedded" THEN warning banner SHALL appear
43. WHEN warning banner appears THEN it SHALL have yellow background and border
44. WHEN warning banner appears THEN warning icon SHALL be visible
45. WHEN warning banner appears THEN warning text SHALL explain automatic cost separation
46. WHEN user clicks "No - Separate" THEN warning banner SHALL disappear

**Summary Note**
47. WHEN user loads form THEN summary note SHALL be visible at bottom
48. WHEN user scrolls to bottom THEN note SHALL explain tooling cost clarity purpose

**Read-Only Mode**
49. WHEN isEditable is false THEN all input fields SHALL be disabled
50. WHEN isEditable is false THEN button group SHALL be disabled
51. WHEN isEditable is false THEN dropdown SHALL be disabled
52. WHEN isEditable is false THEN values SHALL be displayed
53. WHEN isEditable is false THEN conditional sections SHALL still show/hide based on data
54. WHEN isEditable is false THEN user SHALL not be able to edit

**Data Persistence**
55. WHEN user enters any value THEN onUpdate callback SHALL fire
56. WHEN onUpdate fires THEN parent component SHALL receive updated data
57. WHEN parent component updates THEN form SHALL reflect new values
58. WHEN form unmounts THEN data SHALL persist in parent state
59. WHEN form remounts THEN data SHALL be restored from parent state

**Validation**
60. WHEN includedInPiecePrice is true and amortizationAmount is empty THEN form SHALL be invalid
61. WHEN includedInPiecePrice is false THEN form SHALL be valid (amortization amount not required)
62. WHEN all required fields filled THEN form SHALL be valid
63. WHEN validation fails THEN error messages SHALL be displayed
64. WHEN validation passes THEN error messages SHALL be cleared


### 9.2 Flexibility Criteria

1. WHEN admin adds new tooling field to Master List THEN it SHALL appear in form (future)
2. WHEN buyer selects tooling requirement THEN form SHALL be accessible
3. WHEN buyer deselects tooling requirement THEN form SHALL be hidden
4. WHEN LLM extracts tooling data THEN form SHALL be pre-filled
5. WHEN LLM detects embedded tooling THEN includedInPiecePrice SHALL be set to true
6. WHEN LLM detects separate tooling THEN includedInPiecePrice SHALL be set to false
7. WHEN LLM confidence is low THEN fields SHALL be flagged for review
8. WHEN supplier provides different tooling structure THEN form SHALL adapt
9. WHEN multiple suppliers THEN form SHALL support per-supplier configuration
10. WHEN custom tooling field added THEN form SHALL display it (future)

### 9.3 UX Criteria

1. Form SHALL load within 1 second
2. All fields SHALL have clear labels
3. All number fields SHALL have appropriate placeholders (0, 0.00)
4. Currency symbol (€) SHALL be shown in labels
5. Button group SHALL have clear visual states (selected vs unselected)
6. Selected button SHALL use color coding (green=separate, orange=embedded)
7. Conditional section SHALL appear/disappear smoothly
8. Error messages SHALL be clear and actionable
9. Error messages SHALL appear immediately on validation failure
10. Help text SHALL explain amortization amount purpose
11. Warning banner SHALL be visually distinct (yellow theme)
12. Summary note SHALL use blue theme for information
13. Form SHALL be responsive on desktop and tablet
14. Grid layout SHALL collapse to single column on mobile
15. Disabled fields SHALL have grayed-out appearance
16. Hover states SHALL be visible on interactive elements
17. Focus states SHALL be clearly visible
18. Tab order SHALL be logical and sequential
19. Form SHALL fit within parent container without scrolling
20. Critical question SHALL be visually prominent (orange border)

### 9.4 Performance Criteria

1. Form rendering SHALL complete within 500ms
2. Field updates SHALL be instant (<100ms)
3. Button clicks SHALL be instant (<100ms)
4. Conditional section show/hide SHALL be instant (<200ms)
5. onUpdate callback SHALL fire within 100ms of change
6. Calculation updates SHALL be instant (<50ms)
7. Validation SHALL complete within 200ms
8. Error messages SHALL appear within 200ms
9. Form SHALL handle 100+ updates without lag
10. Memory usage SHALL remain stable during extended use

### 9.5 Accessibility Criteria

1. All form fields SHALL have associated labels
2. Button group SHALL have descriptive labels
3. All inputs SHALL be keyboard accessible
4. Tab order SHALL be logical (top to bottom)
5. Focus indicators SHALL be clearly visible
6. Error messages SHALL be announced to screen readers
7. Required fields SHALL be indicated to screen readers
8. Disabled fields SHALL be announced as disabled
9. Conditional section SHALL announce visibility changes
10. Warning banner SHALL be accessible to screen readers
11. Summary note SHALL be accessible to screen readers
12. Number inputs SHALL have appropriate input modes
13. Form SHALL be navigable with keyboard only
14. Button group SHALL be toggleable with space/enter keys
15. Color SHALL not be the only indicator of state

### 9.6 Security Criteria

1. User input SHALL be sanitized to prevent XSS
2. Number inputs SHALL reject non-numeric characters
3. Decimal inputs SHALL be validated for format
4. Data SHALL be transmitted over HTTPS
5. Sensitive data SHALL not be logged in console
6. Form data SHALL be validated on backend
7. SQL injection SHALL be prevented (parameterized queries)
8. CSRF protection SHALL be implemented
9. Rate limiting SHALL prevent form spam
10. User permissions SHALL be checked before editing
11. Audit log SHALL record all changes
12. Data SHALL be encrypted at rest
13. Session SHALL timeout after inactivity
14. Tooling cost data SHALL be protected (competitive information)
15. Access control SHALL restrict who can view tooling details




## 10. Edge Cases & Error Scenarios

### 10.1 Edge Cases

**Empty Form:**
- **Scenario:** User loads form with no pre-filled data
- **Expected Behavior:** 
  - All fields empty
  - includedInPiecePrice defaults to false (No - Separate)
  - No conditional section visible
  - Form is valid (tooling is optional)

**All Fields Filled:**
- **Scenario:** User fills every field in the form
- **Expected Behavior:** 
  - All values saved
  - Conditional section visible if embedded
  - Form is valid
  - All data passed to parent

**Very Large Tooling Investment:**
- **Scenario:** User enters €10,000,000 tooling investment
- **Expected Behavior:** 
  - Value accepted
  - No overflow errors
  - Display formatted with commas: €10,000,000.00

**Very Small Amortization Amount:**
- **Scenario:** User enters €0.01 per piece
- **Expected Behavior:** 
  - Value accepted
  - Calculation uses correct precision
  - No rounding errors

**Zero Values:**
- **Scenario:** User enters 0 for all numeric fields
- **Expected Behavior:** 
  - Values accepted (except amortization period must be >= 1)
  - No error messages
  - Form is valid

**Decimal Precision:**
- **Scenario:** User enters 1.999 (3 decimal places)
- **Expected Behavior:** 
  - Value automatically rounded to 2.00
  - No error message
  - Calculation uses rounded value

**Toggle Embedded Multiple Times:**
- **Scenario:** User clicks "Yes - Embedded", then "No - Separate", then "Yes - Embedded" repeatedly
- **Expected Behavior:** 
  - Section appears/disappears correctly each time
  - amortizationAmount cleared when switching to "No - Separate"
  - No memory leaks
  - No performance degradation

**Rapid Field Updates:**
- **Scenario:** User types very quickly in multiple fields
- **Expected Behavior:** 
  - All updates captured
  - onUpdate callback fires for each change
  - No lost updates
  - No performance issues

**Special Characters in Number Fields:**
- **Scenario:** User tries to enter "€50,000" in tooling investment field
- **Expected Behavior:** 
  - Currency symbol and comma stripped
  - Value stored as 50000
  - Display shows 50000.00

**Negative Number via Keyboard:**
- **Scenario:** User types "-50000" in tooling investment field
- **Expected Behavior:** 
  - Minus sign rejected or value reset to 0
  - Error message: "Tooling investment must be 0 or greater."
  - Field highlighted in red

**Scientific Notation:**
- **Scenario:** User enters "5e4" (50,000) in tooling investment field
- **Expected Behavior:** 
  - Value converted to 50000
  - Displayed as "50,000.00"
  - Calculation uses correct value

**Tab Through Form:**
- **Scenario:** User tabs through all fields without entering data
- **Expected Behavior:** 
  - Focus moves logically through fields
  - No errors triggered
  - Optional fields remain empty
  - Form is valid

**Read-Only Mode with Embedded Tooling:**
- **Scenario:** Form loaded in read-only mode with includedInPiecePrice=true
- **Expected Behavior:** 
  - All fields disabled
  - "Yes - Embedded" button shows selected state
  - Embedded section visible
  - Warning banner visible
  - User cannot edit

**Read-Only Mode with Separate Tooling:**
- **Scenario:** Form loaded in read-only mode with includedInPiecePrice=false
- **Expected Behavior:** 
  - All fields disabled
  - "No - Separate" button shows selected state
  - Embedded section not visible
  - Warning banner not visible
  - User cannot edit

**Parent Component Unmounts:**
- **Scenario:** Parent component unmounts while user is editing
- **Expected Behavior:** 
  - Form unmounts cleanly
  - No memory leaks
  - No console errors
  - Data lost (expected behavior)

**Parent Component Re-Mounts:**
- **Scenario:** Parent component re-mounts with same data
- **Expected Behavior:** 
  - Form re-initializes with data
  - All fields show correct values
  - Conditional section visible if applicable
  - No duplicate event listeners

**LLM Extracts Embedded with No Amount:**
- **Scenario:** LLM sets includedInPiecePrice=true but doesn't provide amortizationAmount
- **Expected Behavior:** 
  - Embedded section appears
  - amortizationAmount field is empty
  - Validation error appears
  - Form is invalid until user fills amount

**LLM Confidence Low on Critical Field:**
- **Scenario:** LLM confidence < 80% on includedInPiecePrice
- **Expected Behavior:** 
  - Default to false (separate tooling)
  - Flag field for manual review
  - Warning badge: "Please verify tooling structure"
  - User must manually verify


### 10.2 Error Scenarios

**onUpdate Callback Fails:**
- **Trigger:** Parent component's onUpdate throws error
- **Response:** 
  - Error caught and logged
  - Error message: "Failed to save changes. Please try again."
  - Local state preserved
  - User can retry
- **Recovery:** User retries action or parent component fixes issue

**Invalid Data Type Passed:**
- **Trigger:** Parent passes string instead of number for tooling investment
- **Response:** 
  - Type coercion attempted
  - If fails: Default to 0
  - Warning logged to console
  - Form remains functional
- **Recovery:** Automatic (type coercion)

**Missing Required Props:**
- **Trigger:** Component rendered without supplierName or toolingData
- **Response:** 
  - Error boundary catches error
  - Error message: "Missing required data. Please refresh."
  - Form does not render
- **Recovery:** Parent component provides required props

**Null/Undefined Values:**
- **Trigger:** toolingData contains null/undefined values
- **Response:** 
  - Values treated as empty
  - Default values used (0, false, 'pieces')
  - Form renders normally
- **Recovery:** Automatic (default values)

**Network Error During Save:**
- **Trigger:** Network drops while saving to backend
- **Response:** 
  - Error message: "Network error. Changes not saved."
  - Local state preserved
  - Retry button appears
- **Recovery:** User retries when network restored

**Backend Validation Failure:**
- **Trigger:** Backend rejects data (e.g., negative cost)
- **Response:** 
  - Error message from backend displayed
  - Field highlighted in red
  - User must correct before proceeding
- **Recovery:** User corrects invalid data

**Concurrent Updates:**
- **Trigger:** Multiple users edit same RFQ simultaneously
- **Response:** 
  - Last write wins (no conflict resolution in MVP)
  - Warning: "This RFQ was updated by another user"
  - User can refresh to see latest
- **Recovery:** User refreshes and re-enters changes

**Browser Compatibility Issue:**
- **Trigger:** User on unsupported browser (IE11)
- **Response:** 
  - Warning message: "Unsupported browser. Please use Chrome, Edge, Firefox, or Safari."
  - Form may not render correctly
  - Some features may not work
- **Recovery:** User switches to supported browser

**JavaScript Disabled:**
- **Trigger:** User has JavaScript disabled
- **Response:** 
  - Form does not render (React requires JS)
  - Message: "JavaScript is required to use this application."
- **Recovery:** User enables JavaScript

**Memory Leak:**
- **Trigger:** Form rendered/unmounted 100+ times
- **Response:** 
  - Memory usage increases
  - Performance degrades
  - Browser may slow down
- **Recovery:** User refreshes page, developer fixes leak

**Validation State Inconsistency:**
- **Trigger:** includedInPiecePrice changes but error state not updated
- **Response:** 
  - Error state recalculated on every render
  - Validation runs on includedInPiecePrice change
  - Error cleared automatically when condition no longer applies
- **Recovery:** Automatic (validation recalculation)




## 11. Backend API Requirements

### 11.1 API Endpoints

**GET /api/rfqs/{rfqId}/tooling**
- **Purpose:** Fetch tooling requirements for RFQ
- **Request:**
  - Method: GET
  - Headers: Authorization token
  - Path params: rfqId
- **Response:**
  - Status: 200 OK
  - Body:
```json
{
  "rfqId": "RFQ-2025-047",
  "toolingTemplate": {
    "toolingInvestment": 50000.00,
    "amortizationPeriod": 100000,
    "amortizationUnit": "pieces",
    "includedInPiecePrice": false,
    "maintenanceCost": 5000.00
  }
}
```
- **Error Responses:**
  - 401: Unauthorized
  - 404: RFQ not found
  - 500: Server error

**PUT /api/rfqs/{rfqId}/tooling**
- **Purpose:** Update tooling requirements for RFQ
- **Request:**
  - Method: PUT
  - Headers: Authorization token, Content-Type: application/json
  - Path params: rfqId
  - Body:
```json
{
  "toolingTemplate": {
    "toolingInvestment": 50000.00,
    "amortizationPeriod": 100000,
    "amortizationUnit": "pieces",
    "includedInPiecePrice": false,
    "maintenanceCost": 5000.00
  }
}
```
- **Response:**
  - Status: 200 OK
  - Body: Updated tooling data
- **Error Responses:**
  - 400: Validation error
  - 401: Unauthorized
  - 404: RFQ not found
  - 500: Server error

**GET /api/quotes/{quoteId}/tooling**
- **Purpose:** Fetch extracted tooling details from supplier quote
- **Request:**
  - Method: GET
  - Headers: Authorization token
  - Path params: quoteId
- **Response:**
  - Status: 200 OK
  - Body:
```json
{
  "quoteId": "QUOTE-001",
  "supplierId": "SUP-001",
  "supplierName": "Supplier A",
  "toolingDetails": {
    "toolingInvestment": 50000.00,
    "amortizationPeriod": 100000,
    "amortizationUnit": "pieces",
    "includedInPiecePrice": false,
    "maintenanceCost": 5000.00,
    "toolingAmortization": {
      "2025": 0.50,
      "2026": 0.50,
      "2027": 0.50
    }
  },
  "extractionConfidence": {
    "toolingInvestment": 0.95,
    "amortizationPeriod": 0.92,
    "amortizationUnit": 0.98,
    "includedInPiecePrice": 0.88,
    "maintenanceCost": 0.85
  }
}
```
- **Error Responses:**
  - 401: Unauthorized
  - 404: Quote not found
  - 500: Server error

**GET /api/quotes/{quoteId}/tooling/embedded**
- **Purpose:** Fetch embedded tooling details (if detected)
- **Request:**
  - Method: GET
  - Headers: Authorization token
  - Path params: quoteId
- **Response:**
  - Status: 200 OK
  - Body:
```json
{
  "quoteId": "QUOTE-002",
  "supplierId": "SUP-002",
  "supplierName": "Supplier B",
  "toolingDetails": {
    "toolingInvestment": 0,
    "amortizationPeriod": 0,
    "amortizationUnit": "pieces",
    "includedInPiecePrice": true,
    "amortizationAmount": 0.50,
    "maintenanceCost": 0,
    "toolingAmortization": {
      "2025": 0.50,
      "2026": 0.50,
      "2027": 0.50
    }
  },
  "extractionConfidence": {
    "includedInPiecePrice": 0.75,
    "amortizationAmount": 0.82
  },
  "detectionReason": "No separate tooling cost found. Piece price appears high compared to market average."
}
```
- **Error Responses:**
  - 401: Unauthorized
  - 404: Quote not found
  - 500: Server error

**PUT /api/quotes/{quoteId}/tooling**
- **Purpose:** Update tooling details after manual review/correction
- **Request:**
  - Method: PUT
  - Headers: Authorization token, Content-Type: application/json
  - Path params: quoteId
  - Body: Same structure as GET response
- **Response:**
  - Status: 200 OK
  - Body: Updated tooling data
- **Error Responses:**
  - 400: Validation error (e.g., embedded but no amortization amount)
  - 401: Unauthorized
  - 404: Quote not found
  - 500: Server error


### 11.2 Data Structures

**ToolingCostDetails Entity (DynamoDB):**
```json
{
  "PK": "RFQ#RFQ-2025-047",
  "SK": "TOOLING#TEMPLATE",
  "rfqId": "RFQ-2025-047",
  "toolingTemplate": {
    "toolingInvestment": 50000.00,
    "amortizationPeriod": 100000,
    "amortizationUnit": "pieces",
    "includedInPiecePrice": false,
    "maintenanceCost": 5000.00
  },
  "createdAt": "2025-01-02T10:30:00Z",
  "updatedAt": "2025-01-02T10:35:00Z"
}
```

**Quote Tooling Entity (DynamoDB) - Separate Tooling:**
```json
{
  "PK": "QUOTE#QUOTE-001",
  "SK": "TOOLING",
  "quoteId": "QUOTE-001",
  "supplierId": "SUP-001",
  "supplierName": "Supplier A",
  "toolingDetails": {
    "toolingInvestment": 50000.00,
    "amortizationPeriod": 100000,
    "amortizationUnit": "pieces",
    "includedInPiecePrice": false,
    "maintenanceCost": 5000.00,
    "toolingAmortization": {
      "2025": 0.50,
      "2026": 0.50,
      "2027": 0.50
    }
  },
  "extractionConfidence": {
    "toolingInvestment": 0.95,
    "amortizationPeriod": 0.92,
    "amortizationUnit": 0.98,
    "includedInPiecePrice": 0.88,
    "maintenanceCost": 0.85
  },
  "extractedAt": "2025-01-05T14:20:00Z",
  "reviewedAt": "2025-01-05T14:25:00Z",
  "reviewedBy": "sarah.chen@company.com"
}
```

**Quote Tooling Entity (DynamoDB) - Embedded Tooling:**
```json
{
  "PK": "QUOTE#QUOTE-002",
  "SK": "TOOLING",
  "quoteId": "QUOTE-002",
  "supplierId": "SUP-002",
  "supplierName": "Supplier B",
  "toolingDetails": {
    "toolingInvestment": 0,
    "amortizationPeriod": 0,
    "amortizationUnit": "pieces",
    "includedInPiecePrice": true,
    "amortizationAmount": 0.50,
    "maintenanceCost": 0,
    "toolingAmortization": {
      "2025": 0.50,
      "2026": 0.50,
      "2027": 0.50
    }
  },
  "extractionConfidence": {
    "includedInPiecePrice": 0.75,
    "amortizationAmount": 0.82
  },
  "detectionReason": "No separate tooling cost found. Piece price appears high compared to market average.",
  "extractedAt": "2025-01-05T14:30:00Z",
  "reviewedAt": "2025-01-05T14:35:00Z",
  "reviewedBy": "sarah.chen@company.com"
}
```

### 11.3 DynamoDB Graph Relationships

**RFQ → Tooling Template:**
- PK: RFQ#RFQ-2025-047
- SK: TOOLING#TEMPLATE
- Relationship: One RFQ has one tooling template

**Quote → Tooling Details:**
- PK: QUOTE#QUOTE-001
- SK: TOOLING
- Relationship: One quote has one tooling details

**Supplier → Quote → Tooling:**
- PK: SUPPLIER#SUP-001
- SK: QUOTE#QUOTE-001
- Relationship: One supplier provides one quote with tooling details

### 11.4 Validation Rules (Backend)

**Tooling Investment Validation:**
- Type: Decimal
- Min: 0
- Max decimal places: 2
- Optional: Yes

**Amortization Period Validation:**
- Type: Integer
- Min: 1
- Optional: Yes

**Amortization Unit Validation:**
- Type: Enum
- Values: 'pieces', 'months', 'years'
- Required: Yes (default: 'pieces')

**Included in Piece Price Validation:**
- Type: Boolean
- Required: Yes

**Amortization Amount Validation:**
- Type: Decimal
- Min: 0
- Max decimal places: 2
- Required: Yes if includedInPiecePrice=true
- Optional: If includedInPiecePrice=false

**Maintenance Cost Validation:**
- Type: Decimal
- Min: 0
- Max decimal places: 2
- Optional: Yes

**Cross-Field Validation:**
- If includedInPiecePrice=true, amortizationAmount MUST be provided
- If includedInPiecePrice=false, amortizationAmount MUST be null/undefined
- If toolingInvestment > 0, amortizationPeriod SHOULD be > 0 (warning, not error)


### 11.5 LLM Extraction Prompts

**Tooling Extraction Prompt:**
```
Analyze the supplier quote to extract tooling cost structure. This is CRITICAL for fair comparison.

1. Tooling Investment:
   - Total upfront tooling cost (molds, dies, fixtures)
   - Look for: "Tooling", "Mold cost", "Die cost", "NRE", "One-time cost"

2. Amortization Period:
   - How long tooling cost is spread over
   - Look for: "Amortized over X pieces", "X shots", "X months", "X years"
   - Extract number and unit (pieces, months, years)

3. CRITICAL QUESTION: Is tooling amortization included in piece price?
   - Separate: Tooling quoted as separate line item (e.g., "Tooling: €50,000")
   - Embedded: Tooling cost hidden in piece price (no separate tooling line)
   
   Detection logic:
   - If tooling line item exists → includedInPiecePrice = false
   - If no tooling line item AND piece price seems high → includedInPiecePrice = true (flag for review)
   - If supplier explicitly states "tooling included in piece price" → includedInPiecePrice = true

4. If Embedded (includedInPiecePrice = true):
   - Extract or calculate amortization amount per piece
   - Look for: "€X per piece includes tooling", "Piece price with tooling: €X"
   - If not explicit, estimate based on: (total_tooling_cost / expected_volume)

5. Maintenance Cost:
   - Annual tooling maintenance cost
   - Look for: "Maintenance", "Annual tooling cost", "Upkeep"

Return structured JSON with confidence scores for each field.

IMPORTANT: 
- If confidence on includedInPiecePrice < 80%, default to false and flag for manual review
- If embedded but no amortizationAmount found, flag as error
- This field is critical for fair comparison - accuracy is paramount
```

**Confidence Scoring:**
- High (>90%): Explicit mention in quote
- Medium (80-89%): Implied or calculated
- Low (<80%): Guessed or missing

**Embedded Tooling Detection Logic:**
```
1. Check for explicit tooling line item:
   - If found → includedInPiecePrice = false (confidence: 95%)

2. Check for explicit statement:
   - "Tooling included in piece price" → includedInPiecePrice = true (confidence: 98%)
   - "Piece price includes tooling" → includedInPiecePrice = true (confidence: 98%)

3. If no explicit information:
   - Compare piece price to market average
   - If piece price > 20% above average AND no tooling line → includedInPiecePrice = true (confidence: 70%)
   - Flag for manual review

4. If embedded detected:
   - Try to extract amortization amount per piece
   - If not found, calculate: tooling_investment / expected_volume
   - If calculation not possible, flag as error (requires manual entry)
```

**Example LLM Response (Separate Tooling):**
```json
{
  "toolingInvestment": 50000.00,
  "amortizationPeriod": 100000,
  "amortizationUnit": "pieces",
  "includedInPiecePrice": false,
  "maintenanceCost": 5000.00,
  "confidence": {
    "toolingInvestment": 0.95,
    "amortizationPeriod": 0.92,
    "amortizationUnit": 0.98,
    "includedInPiecePrice": 0.95,
    "maintenanceCost": 0.85
  },
  "extractionNotes": "Tooling quoted as separate line item: €50,000 for 100,000 pieces"
}
```

**Example LLM Response (Embedded Tooling):**
```json
{
  "toolingInvestment": 0,
  "amortizationPeriod": 0,
  "amortizationUnit": "pieces",
  "includedInPiecePrice": true,
  "amortizationAmount": 0.50,
  "maintenanceCost": 0,
  "confidence": {
    "includedInPiecePrice": 0.75,
    "amortizationAmount": 0.82
  },
  "extractionNotes": "No separate tooling line found. Piece price (€5.00) appears high. Estimated tooling amortization: €0.50/piece",
  "flagForReview": true,
  "reviewReason": "Embedded tooling detected with medium confidence. Please verify."
}
```




## 12. Notes & Considerations

### 12.1 Design Decisions

**Why This Form Exists?**
- **Critical Pain Point:** Embedded tooling costs are the #1 reason for unfair supplier comparisons
- **User Research:** "I can't compare €5/piece (with embedded tooling) to €4/piece + €50K tooling"
- **Business Impact:** Hidden tooling can distort decisions by 20-50% of total cost
- **Decision:** Create dedicated form to explicitly capture tooling structure

**Why Button Group (Not Checkbox)?**
- **Rationale:** This is a binary, mutually exclusive choice (embedded OR separate, not both)
- **UX Research:** Button group is clearer than checkbox for binary choices
- **Visual Prominence:** Buttons are more prominent than checkbox, emphasizing importance
- **Decision:** Use button group with color coding (green=good/separate, orange=warning/embedded)

**Why Orange Theme for Embedded?**
- **Rationale:** Orange signals caution/warning (not error, but needs attention)
- **Psychology:** Orange draws attention without being alarming (red would be too strong)
- **Consistency:** Orange used throughout app for "needs review" states
- **Decision:** Orange border, background, and text for embedded tooling section

**Why Conditional Required Field?**
- **Rationale:** amortizationAmount only makes sense if tooling is embedded
- **Validation:** Can't require field that doesn't apply to all cases
- **UX:** Showing/hiding field based on context is clearer than disabling
- **Decision:** Field appears only when needed, becomes required when visible

**Why Warning Banner?**
- **Rationale:** Users need to understand what happens with embedded tooling
- **Education:** Explains that system will automatically separate costs
- **Transparency:** Makes it clear this is not an error, but a different structure
- **Decision:** Yellow banner with warning icon and explanatory text

**Why Read-Only Mode?**
- **Rationale:** Form used in both creation and review contexts
- **Use Cases:** 
  - Creation: Editable (buyer specifies requirements)
  - Review: Read-only (viewing supplier's provided details)
- **Decision:** isEditable prop controls mode

**Why Amortization Unit Dropdown?**
- **Rationale:** Different suppliers amortize over different units
- **Industry Practice:** Some use pieces, others use time (months/years)
- **Flexibility:** Support all common amortization methods
- **Decision:** Dropdown with 3 options: pieces, months, years

**Why Summary Note?**
- **Rationale:** Users need to understand the purpose of this form
- **Education:** Explains why tooling clarity matters
- **Reassurance:** Confirms that system handles cost separation automatically
- **Decision:** Always-visible note at bottom

### 12.2 Technical Considerations

**State Management:**
- **Approach:** Local state (useState) with parent callback (onUpdate)
- **Rationale:** Simple, no need for Redux/Context
- **Consideration:** Parent component manages persistence
- **Error State:** Managed locally, not passed to parent

**Validation Strategy:**
- **Approach:** Real-time validation on blur, form-level on submit
- **Rationale:** Balance between immediate feedback and not annoying user
- **Consideration:** Conditional validation based on includedInPiecePrice state
- **Critical:** amortizationAmount validation only runs if includedInPiecePrice=true

**Conditional Rendering:**
- **Approach:** React conditional rendering (fields not in DOM when hidden)
- **Rationale:** Better performance, cleaner code
- **Consideration:** Must clear values when section disappears

**Button Group Implementation:**
- **Approach:** Two buttons with controlled state
- **Rationale:** More flexible than radio buttons, better styling control
- **Consideration:** Must handle keyboard navigation (space/enter)

**Number Formatting:**
- **Approach:** HTML5 number input with step attribute
- **Rationale:** Browser-native, accessible
- **Consideration:** Handle international formats (comma vs period)

**Callback Pattern:**
- **Approach:** onUpdate fires on every change
- **Rationale:** Parent always has latest data
- **Consideration:** May cause frequent re-renders (acceptable for small form)

**Error Handling:**
- **Approach:** Local error state, not passed to parent
- **Rationale:** Error is form-specific, parent doesn't need to know
- **Consideration:** Parent can check form validity via data completeness


### 12.3 Future Enhancements

**Tooling Cost Calculator:**
- **Description:** Calculate optimal amortization period based on expected volume
- **Benefit:** Helps buyers estimate tooling cost per piece
- **Complexity:** Medium (requires volume forecasting)
- **Priority:** Medium

**Tooling Comparison View:**
- **Description:** Side-by-side comparison of tooling structures across suppliers
- **Benefit:** Easier to see which supplier has better tooling terms
- **Complexity:** Medium (comparison UI)
- **Priority:** High (decision support)

**Tooling History:**
- **Description:** Show supplier's typical tooling costs for similar parts
- **Benefit:** Helps validate current quote
- **Complexity:** Medium (historical data analysis)
- **Priority:** Medium

**Tooling Anomaly Detection:**
- **Description:** Flag unusual tooling costs (e.g., 10x higher than average)
- **Benefit:** Catch errors or overcharging
- **Complexity:** Medium (anomaly detection logic)
- **Priority:** High (cost savings)

**Multi-Part Tooling:**
- **Description:** Support tooling for multiple parts in one RFQ
- **Benefit:** Handle complex projects with shared tooling
- **Complexity:** High (requires tooling allocation logic)
- **Priority:** Medium

**Tooling Lifecycle Tracking:**
- **Description:** Track tooling from investment through maintenance to end-of-life
- **Benefit:** Better total cost of ownership analysis
- **Complexity:** High (requires long-term tracking)
- **Priority:** Low (future phase)

**Tooling Negotiation:**
- **Description:** Track tooling cost negotiations across rounds
- **Benefit:** See how tooling costs change during negotiation
- **Complexity:** Medium (negotiation tracking)
- **Priority:** Medium

**Tooling Ownership:**
- **Description:** Track who owns tooling (buyer vs supplier)
- **Benefit:** Important for contract terms and future sourcing
- **Complexity:** Low (additional field)
- **Priority:** High (legal/contractual)

**Tooling Transfer Cost:**
- **Description:** Estimate cost to transfer tooling to different supplier
- **Benefit:** Helps evaluate switching costs
- **Complexity:** Medium (transfer cost estimation)
- **Priority:** Low (edge case)

**Tooling Depreciation:**
- **Description:** Calculate tooling depreciation over time
- **Benefit:** Accounting and tax purposes
- **Complexity:** Medium (depreciation schedules)
- **Priority:** Low (accounting feature)

### 12.4 Known Limitations

**No Automatic Embedded Detection:**
- **Limitation:** System cannot automatically detect embedded tooling with 100% accuracy
- **Workaround:** LLM provides best guess, user must verify
- **Mitigation:** Flag low-confidence detections for manual review
- **Impact:** High (critical for fair comparison)

**No Multi-Currency:**
- **Limitation:** All costs must be in same currency (€)
- **Workaround:** Manual conversion before entry
- **Mitigation:** Add currency selector (future)
- **Impact:** Medium (international suppliers)

**No Tooling Ownership Tracking:**
- **Limitation:** Cannot track who owns tooling (buyer vs supplier)
- **Workaround:** Manual tracking in notes
- **Mitigation:** Add ownership field (future)
- **Impact:** Medium (contractual implications)

**No Shared Tooling:**
- **Limitation:** Cannot handle tooling shared across multiple parts
- **Workaround:** Manual allocation of tooling cost
- **Mitigation:** Add multi-part tooling support (future)
- **Impact:** Low (edge case)

**No Tooling Lifecycle:**
- **Limitation:** Cannot track tooling maintenance, repairs, end-of-life
- **Workaround:** Manual tracking outside system
- **Mitigation:** Add lifecycle tracking (future)
- **Impact:** Low (long-term feature)

**Limited Amortization Methods:**
- **Limitation:** Only supports pieces, months, years (not custom formulas)
- **Workaround:** Use closest standard method
- **Mitigation:** Add custom amortization formulas (future)
- **Impact:** Low (standard methods cover 95% of cases)

**No Tooling Transfer Cost:**
- **Limitation:** Cannot estimate cost to transfer tooling to different supplier
- **Workaround:** Manual estimation
- **Mitigation:** Add transfer cost calculator (future)
- **Impact:** Low (edge case)

### 12.5 Dependencies

**Upstream Dependencies:**
- **Screen 13:** RFQ Form (embeds this form in Step 3)
- **Screen 20:** Extraction Review (embeds this form for quote review)
- **LLM Service:** Extracts tooling data and detects embedded tooling
- **Master Field List:** Defines available tooling fields (future)

**Downstream Dependencies:**
- **Cost Calculation Service:** Uses tooling costs in total cost calculation
- **Cost Separation Service:** Separates embedded tooling from piece price
- **Comparison Board:** Displays normalized tooling costs for comparison
- **Email Generation:** Includes tooling requirements in RFQ email

**External Dependencies:**
- **React:** UI framework
- **TypeScript:** Type safety
- **Tailwind CSS:** Styling
- **Lucide Icons:** Wrench and AlertTriangle icons

**Critical Path:**
- This form is on the critical path for fair supplier comparison
- If embedded tooling not detected/separated, comparison will be inaccurate
- High priority for testing and validation


### 12.6 Testing Considerations

**Unit Tests:**
- Validation functions (number, conditional required)
- Calculation functions (tooling cost per piece, adjusted piece price)
- State management (button group toggles, field updates)
- Callback firing (onUpdate)
- Error state management

**Integration Tests:**
- Parent-child communication (onUpdate callback)
- Conditional field visibility
- Read-only mode behavior
- Data persistence
- LLM extraction integration

**E2E Tests:**
- Fill all fields and submit
- Toggle between embedded/separate and verify conditional fields
- Enter invalid data and verify errors
- Read-only mode viewing
- LLM pre-fill and manual correction

**Accessibility Tests:**
- Keyboard navigation
- Screen reader compatibility
- Focus management
- ARIA labels
- Button group accessibility

**Performance Tests:**
- Rapid field updates
- Multiple button toggles
- Large number values
- Memory leaks

**Browser Compatibility:**
- Chrome, Edge, Firefox, Safari
- Number input behavior
- Button group styling
- Layout responsiveness

**Critical Path Tests:**
- Embedded tooling detection accuracy
- Cost separation calculation accuracy
- Validation of conditional required field
- Data integrity across form state changes

### 12.7 Documentation Needs

**User Documentation:**
- What is embedded tooling and why it matters
- How to identify if tooling is embedded or separate
- How to fill out the form correctly
- What happens with embedded tooling costs
- How tooling costs affect total cost comparison

**Admin Documentation:**
- How to configure tooling fields (future)
- How to set up tooling templates (future)
- How to validate tooling data

**Developer Documentation:**
- Component API (props, callbacks)
- State management approach
- Validation logic
- Integration with parent components
- LLM extraction format
- Cost separation algorithm

**Business Documentation:**
- Why tooling clarity is critical for fair comparison
- Impact of embedded tooling on decision making
- ROI of tooling cost transparency
- Case studies of cost savings from detecting embedded tooling

---

## Document Metadata

**Document Version:** 1.0  
**Created:** January 2, 2026  
**Last Updated:** January 2, 2026  
**Author:** Kiro AI Assistant  
**Status:** Complete  
**Total Lines:** 1,400+

**Related Documents:**
- `.kiro/specs/detailed-screen-requirements/plan.md` (Execution Plan)
- `MVP (email-to-quotations)/MVP_Product_Requirements_Document.md` (MVP PRD)
- `MVP (email-to-quotations)/User stories/Sarah (buyer) MVP user stories.md` (User Stories)
- `.kiro/specs/detailed-screen-requirements/screens/13-rfq-form.md` (Parent Screen)
- `.kiro/specs/detailed-screen-requirements/screens/14-logistics-details-form.md` (Similar Structure)
- `.kiro/specs/detailed-screen-requirements/screens/20-extraction-review.md` (Usage Context - TBD)

**Change Log:**
- v1.0 (Jan 2, 2026): Initial complete document with all 12 sections

**Acceptance Criteria Summary:**
- **Functional:** 64 criteria
- **Flexibility:** 10 criteria
- **UX:** 20 criteria
- **Performance:** 10 criteria
- **Accessibility:** 15 criteria
- **Security:** 15 criteria
- **Total:** 134 acceptance criteria

**Key Features:**
- Critical question: "Is tooling amortization included in piece price?"
- Conditional required field (amortization amount if embedded)
- Visual warning system for embedded tooling
- Automatic cost separation for fair comparison
- LLM integration for embedded tooling detection
- Read-only mode support

**Business Value:**
- Enables fair supplier comparison (apples-to-apples)
- Prevents hidden tooling costs from distorting decisions
- Saves 20-50% of total cost analysis errors
- Critical for accurate cost analysis and decision making
