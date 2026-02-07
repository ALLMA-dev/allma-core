# Screen Requirements: Logistics Details Form

## 1. Overview
- **Screen ID:** SCR-014
- **Component File:** `src/app/components/LogisticsDetailsForm.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** Medium - Dynamic logistics fields based on requirements

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** specify detailed logistics requirements for each supplier  
**So that** I can accurately compare total landed costs including packaging, transportation, and special requirements

### Related User Stories
- **US-MVP-03:** Review and Send RFQ Package
- **REQ-MVP-04:** Enhanced logistics fields (Carton, Euro Pallet, Returnable Packaging, Cleaning)
- **US-MVP-23:** Review Summary with Target Price and Supplier Ranking
- **US-MVP-24:** Drill Down to Detailed Breakdown

## 3. Screen Purpose & Context

### Purpose
This screen provides a detailed form for specifying logistics requirements that suppliers must address in their quotes. It captures:
- **Carton packaging:** Type, quantity, cost per carton
- **Euro Pallet usage:** Standard 1200x800mm pallets
- **Returnable packaging:** Type, cost, deposit requirements
- **Cleaning requirements:** Whether cleaning is needed and cost
- **Incoterms:** Shipping terms (FOB, EXW, DDP, etc.)
- **Cost transparency:** All logistics costs included in total cost calculation

### Context
- **When user sees this:** 
  - During RFQ creation (Step 3 of RFQ Form - Requirements Checklist)
  - When "Logistics Costs" requirement is selected
  - Can be shown per-supplier or as template for all suppliers
  - Also appears during quote extraction review
- **Why it exists:** 
  - Logistics costs can be 10-30% of total cost
  - Hidden logistics costs prevent fair comparison
  - Different suppliers have different packaging/shipping approaches
  - Standardizing logistics requirements ensures apples-to-apples comparison
- **Position in journey:** 
  - Part of RFQ Form (Screen 13) - Requirements section
  - Can be accessed from Email Preview (Screen 16) to review
  - Appears in Extraction Review (Screen 20) when processing supplier quotes

### Key Characteristics
- **Embedded form:** Appears within RFQ Form or Extraction Review
- **Per-supplier configuration:** Can specify different requirements per supplier
- **Conditional fields:** Fields appear/hide based on checkbox selections
- **Cost calculation:** All costs feed into total cost comparison
- **Editable/Read-only modes:** Can be editable (RFQ creation) or read-only (review)
- **Validation:** Ensures all required fields are filled when checkboxes are selected



## 4. Visual Layout & Structure

### 4.1 Main Sections

**Card Container:**
1. **Card Header**
   - Package icon (size-4)
   - Title: "Logistics Details - [Supplier Name]"
   - Text size: base (16px)

2. **Card Content**
   - Carton Packaging section
   - Euro Pallet checkbox
   - Returnable Packaging section (conditional)
   - Cleaning section (conditional)
   - Incoterms input
   - Summary note (blue banner)

### 4.2 Key UI Elements

**Card Header:**
- **Icon:** Package icon (h-4, w-4)
- **Title:** "Logistics Details - [Supplier Name]"
  - Font: text-base
  - Flex layout with gap-2
  - Supplier name is dynamic

**Carton Packaging Section:**
- **Label:** "Carton Packaging" (text-sm, font-semibold)
- **Grid Layout:** 3 columns with gap-2
- **Fields:**
  1. **Type:**
     - Label: "Type" (text-xs, gray-600)
     - Input: text
     - Placeholder: "e.g., Standard"
     - Size: text-sm
  
  2. **Quantity:**
     - Label: "Quantity" (text-xs, gray-600)
     - Input: number
     - Placeholder: "0"
     - Size: text-sm
  
  3. **Cost per Carton:**
     - Label: "Cost per Carton (€)" (text-xs, gray-600)
     - Input: number, step 0.01
     - Placeholder: "0.00"
     - Size: text-sm

**Euro Pallet Checkbox:**
- **Checkbox:** Standard checkbox component
- **Label:** "Uses Euro Pallet" (text-sm, cursor-pointer)
- **Badge:** "Standard 1200x800mm" (variant-outline, ml-2)
  - Only shown when checkbox is checked
- **Layout:** Flex with space-x-2

**Returnable Packaging Section:**
- **Main Checkbox:**
  - Checkbox: Standard component
  - Label: "Returnable Packaging Required" (text-sm, cursor-pointer)
  - Layout: Flex with space-x-2

- **Conditional Fields (shown when checked):**
  - Margin: ml-6 (indented)
  - Grid: 3 columns with gap-2
  
  1. **Type:**
     - Label: "Type" (text-xs, gray-600)
     - Input: text
     - Placeholder: "e.g., Plastic bins"
     - Size: text-sm
  
  2. **Cost:**
     - Label: "Cost (€)" (text-xs, gray-600)
     - Input: number, step 0.01
     - Placeholder: "0.00"
     - Size: text-sm
  
  3. **Deposit Required:**
     - Checkbox: Standard component
     - Label: "Deposit Required" (text-xs, cursor-pointer)
     - Layout: Flex with space-x-2
     - Alignment: items-end (bottom-aligned)

**Cleaning Section:**
- **Main Checkbox:**
  - Checkbox: Standard component
  - Label: "Cleaning Required" (text-sm, cursor-pointer)
  - Layout: Flex with space-x-2

- **Conditional Field (shown when checked):**
  - Margin: ml-6 (indented)
  - **Cleaning Cost:**
    - Label: "Cleaning Cost (€)" (text-xs, gray-600)
    - Input: number, step 0.01
    - Placeholder: "0.00"
    - Size: text-sm
    - Width: w-48 (192px)

**Incoterms Input:**
- **Label:** "Incoterms" (text-sm, font-semibold)
- **Input:** text
- **Placeholder:** "e.g., FOB, EXW, DDP"
- **Size:** text-sm
- **Margin:** mt-1

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
  - Content: "Note: All logistics costs are included in the total cost calculation for accurate comparison."
  - Bold: "Note:" is wrapped in <strong>

### 4.3 Information Hierarchy

**Primary Information:**
- Carton packaging details (always visible)
- Incoterms (always visible)
- Checkbox states (always visible)

**Secondary Information:**
- Euro Pallet badge (conditional)
- Returnable packaging details (conditional)
- Cleaning cost (conditional)

**Tertiary Information:**
- Field labels and placeholders
- Summary note
- Supplier name in header



## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| supplier_id | String | Parent context | Yes | Unique supplier identifier |
| supplier_name | String | Parent context | Yes | Display name for supplier |
| rfq_id | String | Parent context | Yes | Associated RFQ ID |
| created_at | DateTime | System timestamp | Yes | ISO 8601 format |
| updated_at | DateTime | System timestamp | Yes | ISO 8601 format |

### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| incoterms | String | Yes | No | Standard Incoterms codes |
| euro_pallet | Boolean | No | Yes | True/False |
| cleaning | Boolean | No | Yes | True/False |

### 5.3 Dynamic Fields (Buyer-Selectable)
| Field Name | Data Type | Conditions | Validation Rules | Default Value |
|------------|-----------|------------|------------------|---------------|
| carton.type | String | Always | Max 100 chars | '' |
| carton.quantity | Integer | Always | Min 0 | 0 |
| carton.costPerCarton | Decimal | Always | Min 0, 2 decimal places | 0.00 |
| returnablePackaging.required | Boolean | Always | True/False | false |
| returnablePackaging.type | String | If required=true | Max 100 chars | '' |
| returnablePackaging.cost | Decimal | If required=true | Min 0, 2 decimal places | 0.00 |
| returnablePackaging.depositRequired | Boolean | If required=true | True/False | false |
| cleaningCost | Decimal | If cleaning=true | Min 0, 2 decimal places | 0.00 |

### 5.4 Data Displayed
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| supplier_name | String | Props | Yes | Display in header |
| carton.type | String | State | No | Display in input |
| carton.quantity | Integer | State | No | Display in input |
| carton.costPerCarton | Decimal | State | No | Display in input, € symbol |
| euro_pallet | Boolean | State | Yes | Checkbox state |
| euro_pallet_badge | String | Computed | No | "Standard 1200x800mm" if checked |
| returnablePackaging.required | Boolean | State | Yes | Checkbox state |
| returnablePackaging.type | String | State | No | Display in input if required |
| returnablePackaging.cost | Decimal | State | No | Display in input if required, € symbol |
| returnablePackaging.depositRequired | Boolean | State | No | Checkbox state if required |
| cleaning | Boolean | State | Yes | Checkbox state |
| cleaningCost | Decimal | State | No | Display in input if cleaning=true, € symbol |
| incoterms | String | State | No | Display in input |

### 5.5 Data Collected from User
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| carton.type | Text input | No | Max 100 characters | '' |
| carton.quantity | Number input | No | Integer, min 0 | 0 |
| carton.costPerCarton | Number input | No | Decimal, min 0, step 0.01 | 0.00 |
| euro_pallet | Checkbox | No | Boolean | false |
| returnablePackaging.required | Checkbox | No | Boolean | false |
| returnablePackaging.type | Text input | Conditional | Max 100 chars, required if returnablePackaging.required=true | '' |
| returnablePackaging.cost | Number input | Conditional | Decimal, min 0, step 0.01, required if returnablePackaging.required=true | 0.00 |
| returnablePackaging.depositRequired | Checkbox | Conditional | Boolean, only if returnablePackaging.required=true | false |
| cleaning | Checkbox | No | Boolean | false |
| cleaningCost | Number input | Conditional | Decimal, min 0, step 0.01, required if cleaning=true | 0.00 |
| incoterms | Text input | No | Max 50 characters, standard Incoterms codes | '' |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| total_carton_cost | carton.quantity * carton.costPerCarton | carton.quantity, carton.costPerCarton |
| total_logistics_cost | total_carton_cost + returnablePackaging.cost + cleaningCost | All logistics fields |
| show_euro_pallet_badge | euro_pallet === true | euro_pallet |
| show_returnable_fields | returnablePackaging.required === true | returnablePackaging.required |
| show_cleaning_cost | cleaning === true | cleaning |
| is_form_valid | All conditional required fields filled | All fields |



## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**How buyer selects fields:**
- Logistics Details Form is accessed when "Logistics Costs" requirement is selected in RFQ Form (Step 3)
- Buyer can configure logistics requirements per supplier or use template for all
- Checkboxes control which logistics components are required
- All selections persist and are included in RFQ email to suppliers

**Field selection UI:**
- **Carton Packaging:** Always visible, optional to fill
- **Euro Pallet:** Checkbox to indicate usage
- **Returnable Packaging:** Checkbox reveals additional fields
- **Cleaning:** Checkbox reveals cost field
- **Incoterms:** Always visible, optional to fill

**Mandatory field rules:**
- No fields are strictly mandatory (logistics is optional)
- If checkbox is checked, related fields become required:
  - If returnablePackaging.required=true → type and cost required
  - If cleaning=true → cleaningCost required
- Incoterms recommended but not required

**Field dependencies:**
- Euro Pallet badge depends on euro_pallet checkbox
- Returnable packaging fields depend on returnablePackaging.required checkbox
- Cleaning cost field depends on cleaning checkbox
- Total logistics cost depends on all filled cost fields

### 6.2 UI Adaptation Logic

**Form generation:**
- Form is statically structured (not dynamically generated)
- Conditional sections show/hide based on checkbox state
- All fields are present in DOM, visibility controlled by React state

**Layout rules:**
- Card container: Full width of parent
- Grid layouts: 3 columns for related fields
- Indentation: ml-6 for conditional fields (visual hierarchy)
- Responsive: Grid collapses to single column on mobile (<768px)

**Validation adaptation:**
- Validation rules change based on checkbox state
- If checkbox unchecked: Related fields not validated
- If checkbox checked: Related fields become required
- Real-time validation on field blur
- Form-level validation before submission

**Caching strategy:**
- Form state managed in parent component (RFQ Form or Extraction Review)
- Changes propagate via onUpdate callback
- No local caching (state lives in parent)
- Data persists in parent component state

### 6.3 LLM Integration (if applicable)

**LLM role:**
- During quote extraction (Screen 20), LLM extracts logistics details from supplier quotes
- LLM identifies carton types, quantities, costs from unstructured text
- LLM recognizes Incoterms codes (FOB, EXW, DDP, etc.)
- LLM detects mentions of returnable packaging, cleaning requirements

**Input to LLM:**
- Supplier quote text (email body, PDF, Excel)
- Context: "Extract logistics details including packaging, transportation, Incoterms"
- Schema: LogisticsDetails interface structure

**Output from LLM:**
- Structured LogisticsDetails object
- Confidence scores per field
- Extracted values pre-fill this form

**Confidence scoring:**
- High confidence (>90%): Auto-fill, no review needed
- Medium confidence (80-89%): Auto-fill, flag for review
- Low confidence (<80%): Leave empty, manual entry required

**Fallback behavior:**
- If LLM extraction fails: Form shows empty, manual entry required
- If LLM returns partial data: Fill available fields, leave rest empty
- If LLM confidence low: Show extracted value with warning badge



## 7. User Interactions

### 7.1 Primary Actions

**Action: Enter Carton Type**
- **Trigger:** User types in carton type input field
- **Behavior:** 
  - Text updates in real-time
  - Value stored in data.carton.type
  - onUpdate callback fires with updated data
- **Validation:** 
  - Max 100 characters
  - Optional field
- **Success:** Value saved to parent state
- **Error:** If >100 chars: Error message appears, input truncated
- **Navigation:** Stays on form

**Action: Enter Carton Quantity**
- **Trigger:** User types in carton quantity input field
- **Behavior:** 
  - Number updates in real-time
  - Value stored in data.carton.quantity
  - Total carton cost recalculated
  - onUpdate callback fires
- **Validation:** 
  - Must be integer
  - Must be >= 0
  - Optional field
- **Success:** Value saved, total cost updated
- **Error:** If negative: Error message, value reset to 0
- **Navigation:** Stays on form

**Action: Enter Cost per Carton**
- **Trigger:** User types in cost per carton input field
- **Behavior:** 
  - Decimal number updates in real-time
  - Value stored in data.carton.costPerCarton
  - Total carton cost recalculated
  - onUpdate callback fires
- **Validation:** 
  - Must be decimal with max 2 decimal places
  - Must be >= 0
  - Optional field
- **Success:** Value saved, total cost updated
- **Error:** If negative: Error message, value reset to 0.00
- **Navigation:** Stays on form

**Action: Toggle Euro Pallet**
- **Trigger:** User clicks "Uses Euro Pallet" checkbox
- **Behavior:** 
  - Checkbox toggles checked/unchecked
  - Value stored in data.euroPallet
  - If checked: Badge "Standard 1200x800mm" appears
  - If unchecked: Badge disappears
  - onUpdate callback fires
- **Validation:** None (boolean value)
- **Success:** Value saved, badge visibility updated
- **Error:** None
- **Navigation:** Stays on form

**Action: Toggle Returnable Packaging Required**
- **Trigger:** User clicks "Returnable Packaging Required" checkbox
- **Behavior:** 
  - Checkbox toggles checked/unchecked
  - Value stored in data.returnablePackaging.required
  - If checked: Type, Cost, and Deposit Required fields appear
  - If unchecked: Fields disappear, values cleared
  - onUpdate callback fires
- **Validation:** None (boolean value)
- **Success:** Value saved, conditional fields visibility updated
- **Error:** None
- **Navigation:** Stays on form

**Action: Enter Returnable Packaging Type**
- **Trigger:** User types in returnable packaging type input field (only visible if required=true)
- **Behavior:** 
  - Text updates in real-time
  - Value stored in data.returnablePackaging.type
  - onUpdate callback fires
- **Validation:** 
  - Max 100 characters
  - Required if returnablePackaging.required=true
- **Success:** Value saved to parent state
- **Error:** 
  - If empty when required: Error message "Returnable packaging type is required"
  - If >100 chars: Error message, input truncated
- **Navigation:** Stays on form

**Action: Enter Returnable Packaging Cost**
- **Trigger:** User types in returnable packaging cost input field (only visible if required=true)
- **Behavior:** 
  - Decimal number updates in real-time
  - Value stored in data.returnablePackaging.cost
  - Total logistics cost recalculated
  - onUpdate callback fires
- **Validation:** 
  - Must be decimal with max 2 decimal places
  - Must be >= 0
  - Required if returnablePackaging.required=true
- **Success:** Value saved, total cost updated
- **Error:** 
  - If empty when required: Error message "Returnable packaging cost is required"
  - If negative: Error message, value reset to 0.00
- **Navigation:** Stays on form

**Action: Toggle Deposit Required**
- **Trigger:** User clicks "Deposit Required" checkbox (only visible if returnablePackaging.required=true)
- **Behavior:** 
  - Checkbox toggles checked/unchecked
  - Value stored in data.returnablePackaging.depositRequired
  - onUpdate callback fires
- **Validation:** None (boolean value)
- **Success:** Value saved
- **Error:** None
- **Navigation:** Stays on form

**Action: Toggle Cleaning Required**
- **Trigger:** User clicks "Cleaning Required" checkbox
- **Behavior:** 
  - Checkbox toggles checked/unchecked
  - Value stored in data.cleaning
  - If checked: Cleaning Cost field appears
  - If unchecked: Field disappears, value cleared
  - onUpdate callback fires
- **Validation:** None (boolean value)
- **Success:** Value saved, conditional field visibility updated
- **Error:** None
- **Navigation:** Stays on form

**Action: Enter Cleaning Cost**
- **Trigger:** User types in cleaning cost input field (only visible if cleaning=true)
- **Behavior:** 
  - Decimal number updates in real-time
  - Value stored in data.cleaningCost
  - Total logistics cost recalculated
  - onUpdate callback fires
- **Validation:** 
  - Must be decimal with max 2 decimal places
  - Must be >= 0
  - Required if cleaning=true
- **Success:** Value saved, total cost updated
- **Error:** 
  - If empty when required: Error message "Cleaning cost is required"
  - If negative: Error message, value reset to 0.00
- **Navigation:** Stays on form

**Action: Enter Incoterms**
- **Trigger:** User types in Incoterms input field
- **Behavior:** 
  - Text updates in real-time
  - Value stored in data.incoterms
  - onUpdate callback fires
- **Validation:** 
  - Max 50 characters
  - Should be standard Incoterms code (FOB, EXW, DDP, etc.)
  - Optional field
- **Success:** Value saved to parent state
- **Error:** 
  - If >50 chars: Error message, input truncated
  - If non-standard code: Warning (not blocking)
- **Navigation:** Stays on form

### 7.2 Secondary Actions

**Action: View Summary Note**
- **Trigger:** User scrolls to bottom of form
- **Behavior:** 
  - Blue banner with note is always visible
  - Explains that all logistics costs are included in total cost calculation
- **Validation:** None (informational only)
- **Success:** User understands cost inclusion
- **Error:** None
- **Navigation:** Stays on form

**Action: Form in Read-Only Mode**
- **Trigger:** isEditable prop is false (during review/comparison)
- **Behavior:** 
  - All input fields are disabled
  - Checkboxes are disabled
  - Values are displayed but cannot be edited
  - Form shows supplier's provided logistics details
- **Validation:** None (read-only)
- **Success:** User can view but not edit
- **Error:** None
- **Navigation:** Stays on form

### 7.3 Navigation

**From:**
- Screen 13: RFQ Form (Step 3 - Requirements Checklist, when "Logistics Costs" selected)
- Screen 16: Email Preview (to review logistics requirements)
- Screen 20: Extraction Review (to review/edit extracted logistics data)

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

**Carton Type Validation:**
- **Rule:** Max 100 characters
- **Error:** "Carton type must be 100 characters or less."
- **Optional:** Field is not required

**Carton Quantity Validation:**
- **Rule:** Must be non-negative integer
- **Error:** "Carton quantity must be 0 or greater."
- **Optional:** Field is not required

**Cost per Carton Validation:**
- **Rule:** Must be non-negative decimal with max 2 decimal places
- **Error:** "Cost per carton must be 0 or greater."
- **Format:** Step 0.01 (e.g., 1.50, 2.99)
- **Optional:** Field is not required

**Returnable Packaging Type Validation:**
- **Rule:** Max 100 characters
- **Rule:** Required if returnablePackaging.required=true
- **Error:** "Returnable packaging type is required when returnable packaging is selected."
- **Error:** "Returnable packaging type must be 100 characters or less."

**Returnable Packaging Cost Validation:**
- **Rule:** Must be non-negative decimal with max 2 decimal places
- **Rule:** Required if returnablePackaging.required=true
- **Error:** "Returnable packaging cost is required when returnable packaging is selected."
- **Error:** "Returnable packaging cost must be 0 or greater."
- **Format:** Step 0.01

**Cleaning Cost Validation:**
- **Rule:** Must be non-negative decimal with max 2 decimal places
- **Rule:** Required if cleaning=true
- **Error:** "Cleaning cost is required when cleaning is selected."
- **Error:** "Cleaning cost must be 0 or greater."
- **Format:** Step 0.01

**Incoterms Validation:**
- **Rule:** Max 50 characters
- **Rule:** Should be standard Incoterms code (FOB, EXW, DDP, CIF, FCA, etc.)
- **Warning:** "Non-standard Incoterms code. Please verify." (not blocking)
- **Optional:** Field is not required

**Standard Incoterms Codes:**
- EXW (Ex Works)
- FCA (Free Carrier)
- CPT (Carriage Paid To)
- CIP (Carriage and Insurance Paid To)
- DAP (Delivered at Place)
- DPU (Delivered at Place Unloaded)
- DDP (Delivered Duty Paid)
- FAS (Free Alongside Ship)
- FOB (Free on Board)
- CFR (Cost and Freight)
- CIF (Cost, Insurance and Freight)

### 8.2 Calculation Logic

**Total Carton Cost:**
- **Formula:** `carton.quantity * carton.costPerCarton`
- **Example:** 100 cartons * €2.50 = €250.00
- **Used in:** Total logistics cost calculation

**Total Logistics Cost:**
- **Formula:** `total_carton_cost + returnablePackaging.cost + cleaningCost`
- **Example:** €250.00 (cartons) + €50.00 (returnable) + €10.00 (cleaning) = €310.00
- **Used in:** Total supplier cost comparison

**Cost per Piece (Logistics):**
- **Formula:** `total_logistics_cost / total_pieces_ordered`
- **Example:** €310.00 / 50,000 pieces = €0.0062 per piece
- **Used in:** Piece price comparison across suppliers

### 8.3 Conditional Display Logic

**Show Euro Pallet Badge:**
- **Condition:** `euro_pallet === true`
- **Display:** Badge with text "Standard 1200x800mm"
- **Hide:** Badge not shown if euro_pallet === false

**Show Returnable Packaging Fields:**
- **Condition:** `returnablePackaging.required === true`
- **Display:** Type, Cost, and Deposit Required fields
- **Hide:** Fields not shown if returnablePackaging.required === false
- **Clear:** Values cleared when checkbox unchecked

**Show Cleaning Cost Field:**
- **Condition:** `cleaning === true`
- **Display:** Cleaning Cost input field
- **Hide:** Field not shown if cleaning === false
- **Clear:** Value cleared when checkbox unchecked

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

**Missing Required Field:**
- **Detection:** Checkbox checked but related field empty
- **Handling:** 
  - Error message: "[Field name] is required when [checkbox name] is selected."
  - Field highlighted in red
  - Form validation fails
- **Recovery:** User fills required field or unchecks checkbox

**Too Many Decimal Places:**
- **Detection:** User enters more than 2 decimal places
- **Handling:** 
  - Value automatically rounded to 2 decimal places
  - No error message (automatic correction)
- **Recovery:** Automatic

**Text Too Long:**
- **Detection:** User enters text exceeding max length
- **Handling:** 
  - Input stops accepting characters at max length
  - Error message: "[Field name] must be [X] characters or less."
  - Character counter shows "X/X"
- **Recovery:** User shortens text

**Non-Standard Incoterms:**
- **Detection:** User enters Incoterms code not in standard list
- **Handling:** 
  - Warning message: "Non-standard Incoterms code. Please verify."
  - Yellow warning icon
  - Not blocking (user can proceed)
- **Recovery:** User verifies or changes to standard code

**Parent Component Update Failure:**
- **Detection:** onUpdate callback fails or throws error
- **Handling:** 
  - Error message: "Failed to save changes. Please try again."
  - Local state preserved
  - User can retry
- **Recovery:** User retries action or refreshes page



## 9. Acceptance Criteria

### 9.1 Functional Criteria

**Carton Packaging**
1. WHEN user loads form THEN carton packaging section SHALL be visible
2. WHEN user enters carton type THEN value SHALL update in real-time
3. WHEN user enters carton quantity THEN value SHALL update in real-time
4. WHEN user enters cost per carton THEN value SHALL update in real-time
5. WHEN user enters carton quantity and cost THEN total carton cost SHALL be calculated
6. WHEN carton quantity is negative THEN error message SHALL appear
7. WHEN cost per carton is negative THEN error message SHALL appear
8. WHEN carton type exceeds 100 chars THEN error message SHALL appear

**Euro Pallet**
9. WHEN user loads form THEN Euro Pallet checkbox SHALL be visible
10. WHEN user checks Euro Pallet THEN checkbox SHALL show checked state
11. WHEN user checks Euro Pallet THEN badge "Standard 1200x800mm" SHALL appear
12. WHEN user unchecks Euro Pallet THEN badge SHALL disappear
13. WHEN user toggles Euro Pallet THEN value SHALL be saved to parent state

**Returnable Packaging**
14. WHEN user loads form THEN Returnable Packaging checkbox SHALL be visible
15. WHEN user checks Returnable Packaging THEN Type, Cost, and Deposit fields SHALL appear
16. WHEN user unchecks Returnable Packaging THEN fields SHALL disappear
17. WHEN user unchecks Returnable Packaging THEN values SHALL be cleared
18. WHEN Returnable Packaging checked THEN Type field SHALL be required
19. WHEN Returnable Packaging checked THEN Cost field SHALL be required
20. WHEN Type empty and required THEN error message SHALL appear
21. WHEN Cost empty and required THEN error message SHALL appear
22. WHEN user enters Type THEN value SHALL update in real-time
23. WHEN user enters Cost THEN value SHALL update in real-time
24. WHEN user checks Deposit Required THEN value SHALL be saved
25. WHEN Type exceeds 100 chars THEN error message SHALL appear
26. WHEN Cost is negative THEN error message SHALL appear

**Cleaning**
27. WHEN user loads form THEN Cleaning checkbox SHALL be visible
28. WHEN user checks Cleaning THEN Cleaning Cost field SHALL appear
29. WHEN user unchecks Cleaning THEN field SHALL disappear
30. WHEN user unchecks Cleaning THEN value SHALL be cleared
31. WHEN Cleaning checked THEN Cleaning Cost field SHALL be required
32. WHEN Cleaning Cost empty and required THEN error message SHALL appear
33. WHEN user enters Cleaning Cost THEN value SHALL update in real-time
34. WHEN Cleaning Cost is negative THEN error message SHALL appear

**Incoterms**
35. WHEN user loads form THEN Incoterms field SHALL be visible
36. WHEN user enters Incoterms THEN value SHALL update in real-time
37. WHEN Incoterms exceeds 50 chars THEN error message SHALL appear
38. WHEN Incoterms is non-standard THEN warning message SHALL appear
39. WHEN Incoterms is standard code THEN no warning SHALL appear

**Summary Note**
40. WHEN user loads form THEN summary note SHALL be visible at bottom
41. WHEN user scrolls to bottom THEN note SHALL explain cost inclusion

**Read-Only Mode**
42. WHEN isEditable is false THEN all fields SHALL be disabled
43. WHEN isEditable is false THEN checkboxes SHALL be disabled
44. WHEN isEditable is false THEN values SHALL be displayed
45. WHEN isEditable is false THEN user SHALL not be able to edit

**Data Persistence**
46. WHEN user enters any value THEN onUpdate callback SHALL fire
47. WHEN onUpdate fires THEN parent component SHALL receive updated data
48. WHEN parent component updates THEN form SHALL reflect new values
49. WHEN form unmounts THEN data SHALL persist in parent state
50. WHEN form remounts THEN data SHALL be restored from parent state

### 9.2 Flexibility Criteria

1. WHEN admin adds new logistics field to Master List THEN it SHALL appear in form (future)
2. WHEN buyer selects logistics requirement THEN form SHALL be accessible
3. WHEN buyer deselects logistics requirement THEN form SHALL be hidden
4. WHEN LLM extracts logistics data THEN form SHALL be pre-filled
5. WHEN LLM confidence is low THEN fields SHALL be flagged for review
6. WHEN supplier provides different logistics structure THEN form SHALL adapt (future)
7. WHEN multiple suppliers THEN form SHALL support per-supplier configuration
8. WHEN template mode THEN form SHALL apply same values to all suppliers
9. WHEN custom logistics field added THEN form SHALL display it (future)
10. WHEN logistics requirements change THEN form SHALL update dynamically

### 9.3 UX Criteria

1. Form SHALL load within 1 second
2. All fields SHALL have clear labels
3. All number fields SHALL have appropriate placeholders (0, 0.00)
4. All text fields SHALL have example placeholders
5. Checkboxes SHALL have descriptive labels
6. Conditional fields SHALL appear/disappear smoothly
7. Error messages SHALL be clear and actionable
8. Error messages SHALL appear immediately on validation failure
9. Success states SHALL be indicated (green checkmarks)
10. Currency symbol (€) SHALL be shown in labels
11. Euro Pallet badge SHALL be visually distinct
12. Summary note SHALL use blue theme for information
13. Form SHALL be responsive on desktop and tablet
14. Grid layout SHALL collapse to single column on mobile
15. Indentation SHALL clearly show field hierarchy
16. Disabled fields SHALL have grayed-out appearance
17. Hover states SHALL be visible on interactive elements
18. Focus states SHALL be clearly visible
19. Tab order SHALL be logical and sequential
20. Form SHALL fit within parent container without scrolling

### 9.4 Performance Criteria

1. Form rendering SHALL complete within 500ms
2. Field updates SHALL be instant (<100ms)
3. Checkbox toggles SHALL be instant (<100ms)
4. Conditional field show/hide SHALL be instant (<200ms)
5. onUpdate callback SHALL fire within 100ms of change
6. Calculation updates SHALL be instant (<50ms)
7. Validation SHALL complete within 200ms
8. Error messages SHALL appear within 200ms
9. Form SHALL handle 100+ updates without lag
10. Memory usage SHALL remain stable during extended use

### 9.5 Accessibility Criteria

1. All form fields SHALL have associated labels
2. All checkboxes SHALL have descriptive labels
3. All inputs SHALL be keyboard accessible
4. Tab order SHALL be logical (top to bottom, left to right)
5. Focus indicators SHALL be clearly visible
6. Error messages SHALL be announced to screen readers
7. Required fields SHALL be indicated to screen readers
8. Disabled fields SHALL be announced as disabled
9. Conditional fields SHALL announce visibility changes
10. Summary note SHALL be accessible to screen readers
11. Euro Pallet badge SHALL have aria-label
12. Number inputs SHALL have appropriate input modes
13. Form SHALL be navigable with keyboard only
14. Checkboxes SHALL be toggleable with space key
15. Color SHALL not be the only indicator of state

### 9.6 Security Criteria

1. User input SHALL be sanitized to prevent XSS
2. Number inputs SHALL reject non-numeric characters
3. Text inputs SHALL have max length limits
4. Decimal inputs SHALL be validated for format
5. Data SHALL be transmitted over HTTPS
6. Sensitive data SHALL not be logged in console
7. Form data SHALL be validated on backend
8. SQL injection SHALL be prevented (parameterized queries)
9. CSRF protection SHALL be implemented
10. Rate limiting SHALL prevent form spam
11. File uploads SHALL be validated (if attachments added)
12. User permissions SHALL be checked before editing
13. Audit log SHALL record all changes
14. Data SHALL be encrypted at rest
15. Session SHALL timeout after inactivity



## 10. Edge Cases & Error Scenarios

### 10.1 Edge Cases

**Empty Form:**
- **Scenario:** User loads form with no pre-filled data
- **Expected Behavior:** 
  - All fields empty
  - All checkboxes unchecked
  - No conditional fields visible
  - Form is valid (logistics is optional)

**All Fields Filled:**
- **Scenario:** User fills every field in the form
- **Expected Behavior:** 
  - All values saved
  - Total logistics cost calculated correctly
  - All conditional fields visible
  - Form is valid

**Very Large Carton Quantity:**
- **Scenario:** User enters 1,000,000 cartons
- **Expected Behavior:** 
  - Value accepted
  - Total cost calculated correctly
  - No overflow errors
  - Display formatted with commas

**Very High Cost per Carton:**
- **Scenario:** User enters €999.99 per carton
- **Expected Behavior:** 
  - Value accepted
  - Total cost calculated correctly
  - No overflow errors

**Zero Values:**
- **Scenario:** User enters 0 for all numeric fields
- **Expected Behavior:** 
  - Values accepted
  - Total cost is €0.00
  - No error messages
  - Form is valid

**Decimal Precision:**
- **Scenario:** User enters 1.999 (3 decimal places)
- **Expected Behavior:** 
  - Value automatically rounded to 2.00
  - No error message
  - Calculation uses rounded value

**Very Long Carton Type:**
- **Scenario:** User enters 150 character carton type
- **Expected Behavior:** 
  - Input stops at 100 characters
  - Error message: "Carton type must be 100 characters or less."
  - Cannot proceed until shortened

**Very Long Incoterms:**
- **Scenario:** User enters 100 character Incoterms
- **Expected Behavior:** 
  - Input stops at 50 characters
  - Error message: "Incoterms must be 50 characters or less."
  - Cannot proceed until shortened

**Non-Standard Incoterms:**
- **Scenario:** User enters "CUSTOM" as Incoterms
- **Expected Behavior:** 
  - Value accepted
  - Warning message: "Non-standard Incoterms code. Please verify."
  - Yellow warning icon
  - Can proceed (not blocking)

**Toggle Returnable Packaging Multiple Times:**
- **Scenario:** User checks, unchecks, checks returnable packaging repeatedly
- **Expected Behavior:** 
  - Fields appear/disappear correctly each time
  - Values cleared when unchecked
  - No memory leaks
  - No performance degradation

**Toggle Cleaning Multiple Times:**
- **Scenario:** User checks, unchecks, checks cleaning repeatedly
- **Expected Behavior:** 
  - Field appears/disappears correctly each time
  - Value cleared when unchecked
  - No memory leaks
  - No performance degradation

**Rapid Field Updates:**
- **Scenario:** User types very quickly in multiple fields
- **Expected Behavior:** 
  - All updates captured
  - onUpdate callback fires for each change
  - No lost updates
  - No performance issues

**Copy-Paste Large Text:**
- **Scenario:** User pastes 500 character text into carton type field
- **Expected Behavior:** 
  - Text truncated at 100 characters
  - Error message appears
  - Remaining text discarded

**Special Characters in Text Fields:**
- **Scenario:** User enters "Carton <script>alert('xss')</script>"
- **Expected Behavior:** 
  - Text sanitized to prevent XSS
  - Special characters escaped or removed
  - Safe text stored

**Negative Number via Keyboard:**
- **Scenario:** User types "-5" in quantity field
- **Expected Behavior:** 
  - Minus sign rejected or value reset to 0
  - Error message: "Quantity must be 0 or greater."
  - Field highlighted in red

**Scientific Notation:**
- **Scenario:** User enters "1e5" (100,000) in quantity field
- **Expected Behavior:** 
  - Value converted to 100000
  - Displayed as "100,000"
  - Calculation uses correct value

**Currency Symbol in Input:**
- **Scenario:** User types "€5.00" in cost field
- **Expected Behavior:** 
  - Currency symbol stripped
  - Value stored as 5.00
  - Display shows 5.00 (€ in label)

**Comma as Decimal Separator:**
- **Scenario:** User enters "5,50" (European format) in cost field
- **Expected Behavior:** 
  - Depends on locale settings
  - If US locale: Treated as 550 (error)
  - If EU locale: Converted to 5.50
  - Recommendation: Use period for consistency

**Tab Through Form:**
- **Scenario:** User tabs through all fields without entering data
- **Expected Behavior:** 
  - Focus moves logically through fields
  - No errors triggered
  - Optional fields remain empty
  - Form is valid

**Read-Only Mode with Pre-Filled Data:**
- **Scenario:** Form loaded in read-only mode with supplier data
- **Expected Behavior:** 
  - All fields disabled
  - All values displayed
  - Checkboxes show correct state
  - Conditional fields visible if applicable
  - User cannot edit

**Read-Only Mode with Empty Data:**
- **Scenario:** Form loaded in read-only mode with no data
- **Expected Behavior:** 
  - All fields disabled and empty
  - No error messages
  - Form displays "No logistics details provided"

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
  - Conditional fields visible if applicable
  - No duplicate event listeners

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
- **Trigger:** Parent passes string instead of number for cost field
- **Response:** 
  - Type coercion attempted
  - If fails: Default to 0
  - Warning logged to console
  - Form remains functional
- **Recovery:** Automatic (type coercion)

**Missing Required Props:**
- **Trigger:** Component rendered without supplierName or logisticsData
- **Response:** 
  - Error boundary catches error
  - Error message: "Missing required data. Please refresh."
  - Form does not render
- **Recovery:** Parent component provides required props

**Null/Undefined Values:**
- **Trigger:** logisticsData contains null/undefined values
- **Response:** 
  - Values treated as empty
  - Default values used (0, false, '')
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



## 11. Backend API Requirements

### 11.1 API Endpoints

**GET /api/rfqs/{rfqId}/logistics**
- **Purpose:** Fetch logistics requirements for RFQ
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
  "logisticsTemplate": {
    "carton": {
      "type": "Standard",
      "quantity": 100,
      "costPerCarton": 2.50
    },
    "euroPallet": true,
    "returnablePackaging": {
      "required": false
    },
    "cleaning": false,
    "incoterms": "FOB"
  }
}
```
- **Error Responses:**
  - 401: Unauthorized
  - 404: RFQ not found
  - 500: Server error

**PUT /api/rfqs/{rfqId}/logistics**
- **Purpose:** Update logistics requirements for RFQ
- **Request:**
  - Method: PUT
  - Headers: Authorization token, Content-Type: application/json
  - Path params: rfqId
  - Body:
```json
{
  "logisticsTemplate": {
    "carton": {
      "type": "Standard",
      "quantity": 100,
      "costPerCarton": 2.50
    },
    "euroPallet": true,
    "returnablePackaging": {
      "required": true,
      "type": "Plastic bins",
      "cost": 50.00,
      "depositRequired": true
    },
    "cleaning": true,
    "cleaningCost": 10.00,
    "incoterms": "DDP"
  }
}
```
- **Response:**
  - Status: 200 OK
  - Body: Updated logistics data
- **Error Responses:**
  - 400: Validation error
  - 401: Unauthorized
  - 404: RFQ not found
  - 500: Server error

**GET /api/quotes/{quoteId}/logistics**
- **Purpose:** Fetch extracted logistics details from supplier quote
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
  "logisticsDetails": {
    "carton": {
      "type": "Standard",
      "quantity": 100,
      "costPerCarton": 2.50
    },
    "euroPallet": true,
    "returnablePackaging": {
      "required": false
    },
    "cleaning": false,
    "incoterms": "FOB",
    "packaging": {
      "2025": 250.00,
      "2026": 250.00,
      "2027": 250.00
    },
    "transportation": {
      "2025": 500.00,
      "2026": 500.00,
      "2027": 500.00
    }
  },
  "extractionConfidence": {
    "carton.type": 0.95,
    "carton.quantity": 0.98,
    "carton.costPerCarton": 0.92,
    "euroPallet": 0.88,
    "incoterms": 0.99
  }
}
```
- **Error Responses:**
  - 401: Unauthorized
  - 404: Quote not found
  - 500: Server error

**PUT /api/quotes/{quoteId}/logistics**
- **Purpose:** Update logistics details after manual review/correction
- **Request:**
  - Method: PUT
  - Headers: Authorization token, Content-Type: application/json
  - Path params: quoteId
  - Body: Same structure as GET response
- **Response:**
  - Status: 200 OK
  - Body: Updated logistics data
- **Error Responses:**
  - 400: Validation error
  - 401: Unauthorized
  - 404: Quote not found
  - 500: Server error

### 11.2 Data Structures

**LogisticsDetails Entity (DynamoDB):**
```json
{
  "PK": "RFQ#RFQ-2025-047",
  "SK": "LOGISTICS#TEMPLATE",
  "rfqId": "RFQ-2025-047",
  "logisticsTemplate": {
    "carton": {
      "type": "Standard",
      "quantity": 100,
      "costPerCarton": 2.50
    },
    "euroPallet": true,
    "returnablePackaging": {
      "required": true,
      "type": "Plastic bins",
      "cost": 50.00,
      "depositRequired": true
    },
    "cleaning": true,
    "cleaningCost": 10.00,
    "incoterms": "DDP",
    "packaging": {},
    "transportation": {}
  },
  "createdAt": "2025-01-02T10:30:00Z",
  "updatedAt": "2025-01-02T10:35:00Z"
}
```

**Quote Logistics Entity (DynamoDB):**
```json
{
  "PK": "QUOTE#QUOTE-001",
  "SK": "LOGISTICS",
  "quoteId": "QUOTE-001",
  "supplierId": "SUP-001",
  "supplierName": "Supplier A",
  "logisticsDetails": {
    "carton": {
      "type": "Standard",
      "quantity": 100,
      "costPerCarton": 2.50
    },
    "euroPallet": true,
    "returnablePackaging": {
      "required": false
    },
    "cleaning": false,
    "incoterms": "FOB",
    "packaging": {
      "2025": 250.00,
      "2026": 250.00,
      "2027": 250.00
    },
    "transportation": {
      "2025": 500.00,
      "2026": 500.00,
      "2027": 500.00
    }
  },
  "extractionConfidence": {
    "carton.type": 0.95,
    "carton.quantity": 0.98,
    "carton.costPerCarton": 0.92,
    "euroPallet": 0.88,
    "incoterms": 0.99
  },
  "extractedAt": "2025-01-05T14:20:00Z",
  "reviewedAt": "2025-01-05T14:25:00Z",
  "reviewedBy": "sarah.chen@company.com"
}
```

### 11.3 DynamoDB Graph Relationships

**RFQ → Logistics Template:**
- PK: RFQ#RFQ-2025-047
- SK: LOGISTICS#TEMPLATE
- Relationship: One RFQ has one logistics template

**Quote → Logistics Details:**
- PK: QUOTE#QUOTE-001
- SK: LOGISTICS
- Relationship: One quote has one logistics details

**Supplier → Quote → Logistics:**
- PK: SUPPLIER#SUP-001
- SK: QUOTE#QUOTE-001
- Relationship: One supplier provides one quote with logistics details

### 11.4 Validation Rules (Backend)

**Carton Validation:**
- Type: Max 100 characters, optional
- Quantity: Non-negative integer, optional
- Cost per Carton: Non-negative decimal, max 2 decimal places, optional

**Returnable Packaging Validation:**
- Required: Boolean, required
- Type: Max 100 characters, required if required=true
- Cost: Non-negative decimal, max 2 decimal places, required if required=true
- Deposit Required: Boolean, optional

**Cleaning Validation:**
- Cleaning: Boolean, required
- Cleaning Cost: Non-negative decimal, max 2 decimal places, required if cleaning=true

**Incoterms Validation:**
- Max 50 characters, optional
- Should be standard Incoterms code (warning if not)

**Total Cost Validation:**
- All costs must be non-negative
- Total logistics cost must be calculable
- No overflow errors

### 11.5 LLM Extraction Prompts

**Logistics Extraction Prompt:**
```
Extract logistics details from the supplier quote:

1. Carton Packaging:
   - Type (e.g., Standard, Heavy-duty, Custom)
   - Quantity (number of cartons)
   - Cost per carton (in currency specified)

2. Euro Pallet:
   - Does the supplier use Euro Pallets? (Yes/No)
   - Standard size: 1200x800mm

3. Returnable Packaging:
   - Is returnable packaging required? (Yes/No)
   - If yes:
     - Type (e.g., Plastic bins, Metal containers)
     - Cost
     - Is deposit required? (Yes/No)

4. Cleaning:
   - Is cleaning required? (Yes/No)
   - If yes: Cleaning cost

5. Incoterms:
   - Shipping terms (e.g., FOB, EXW, DDP, CIF)

6. Packaging Costs by Year:
   - Year 1, Year 2, Year 3, etc.

7. Transportation Costs by Year:
   - Year 1, Year 2, Year 3, etc.

Return structured JSON with confidence scores for each field.
```

**Confidence Scoring:**
- High (>90%): Explicit mention in quote
- Medium (80-89%): Implied or calculated
- Low (<80%): Guessed or missing



## 12. Notes & Considerations

### 12.1 Design Decisions

**Why Embedded Form?**
- **Rationale:** Logistics details are part of RFQ requirements, not standalone screen
- **Alternative considered:** Separate screen (rejected - adds unnecessary navigation)
- **Decision:** Embed within RFQ Form and Extraction Review for context

**Why Conditional Fields?**
- **Rationale:** Not all logistics components apply to every RFQ
- **User feedback:** "I don't always need returnable packaging or cleaning"
- **Decision:** Use checkboxes to show/hide optional sections

**Why Euro Pallet Checkbox?**
- **Rationale:** Euro Pallets are standard in Europe (1200x800mm)
- **Business value:** Standardization reduces confusion
- **Decision:** Simple checkbox with informational badge

**Why Separate Carton Fields?**
- **Rationale:** Carton packaging is most common logistics component
- **User feedback:** "I always need to know carton costs"
- **Decision:** Always visible, not conditional

**Why Incoterms Field?**
- **Rationale:** Incoterms define shipping responsibilities and costs
- **Industry standard:** Critical for international shipping
- **Decision:** Always visible, with validation for standard codes

**Why Cost per Carton (not total)?**
- **Rationale:** Easier to compare across suppliers
- **Calculation:** Total = quantity * cost per carton
- **Decision:** Store per-unit cost, calculate total

**Why Read-Only Mode?**
- **Rationale:** Form used in both creation and review contexts
- **Use cases:** 
  - Creation: Editable (buyer specifies requirements)
  - Review: Read-only (viewing supplier's provided details)
- **Decision:** isEditable prop controls mode

**Why No File Upload?**
- **Rationale:** Logistics details are structured data, not documents
- **Alternative:** Attachments handled at RFQ level
- **Decision:** No file upload in this form

**Why Summary Note?**
- **Rationale:** Users need to understand cost inclusion
- **User feedback:** "I didn't realize logistics costs were included in total"
- **Decision:** Always-visible note at bottom

### 12.2 Technical Considerations

**State Management:**
- **Approach:** Local state (useState) with parent callback (onUpdate)
- **Rationale:** Simple, no need for Redux/Context
- **Consideration:** Parent component manages persistence

**Validation Strategy:**
- **Approach:** Real-time validation on blur, form-level on submit
- **Rationale:** Balance between immediate feedback and not annoying user
- **Consideration:** Conditional validation based on checkbox state

**Conditional Rendering:**
- **Approach:** CSS display:none vs React conditional rendering
- **Decision:** React conditional rendering (fields not in DOM when hidden)
- **Rationale:** Better performance, cleaner code

**Number Formatting:**
- **Approach:** HTML5 number input with step attribute
- **Rationale:** Browser-native, accessible
- **Consideration:** Handle international formats (comma vs period)

**Callback Pattern:**
- **Approach:** onUpdate fires on every change
- **Rationale:** Parent always has latest data
- **Consideration:** May cause frequent re-renders (acceptable for small form)

**Checkbox State:**
- **Approach:** Controlled components (value from props/state)
- **Rationale:** Predictable, testable
- **Consideration:** Must handle checked/unchecked explicitly

**Cost Calculation:**
- **Approach:** Calculate in parent component, not in form
- **Rationale:** Form is presentation, parent handles business logic
- **Decision:** Form only collects data, parent calculates totals

### 12.3 Future Enhancements

**Custom Logistics Fields:**
- **Description:** Allow admin to add custom logistics fields
- **Benefit:** Flexibility for unique requirements
- **Complexity:** Medium (requires dynamic form generation)
- **Priority:** Medium

**Logistics Templates:**
- **Description:** Save logistics configurations as templates
- **Benefit:** Faster RFQ creation for similar projects
- **Complexity:** Low (template storage and selection)
- **Priority:** Medium

**Multi-Currency Support:**
- **Description:** Support costs in different currencies
- **Benefit:** International suppliers
- **Complexity:** Medium (currency conversion, display)
- **Priority:** High (international expansion)

**Packaging Calculator:**
- **Description:** Calculate optimal carton quantity based on part size
- **Benefit:** Helps buyers estimate packaging needs
- **Complexity:** High (requires part dimensions, packing algorithms)
- **Priority:** Low (nice-to-have)

**Logistics Cost Breakdown Chart:**
- **Description:** Visual chart showing logistics cost components
- **Benefit:** Easier to understand cost distribution
- **Complexity:** Low (chart library integration)
- **Priority:** Low

**Supplier Logistics History:**
- **Description:** Show supplier's typical logistics costs
- **Benefit:** Helps validate current quote
- **Complexity:** Medium (historical data analysis)
- **Priority:** Medium

**Logistics Anomaly Detection:**
- **Description:** Flag unusual logistics costs (e.g., 10x higher than average)
- **Benefit:** Catch errors or overcharging
- **Complexity:** Medium (anomaly detection logic)
- **Priority:** High (cost savings)

**Bulk Edit:**
- **Description:** Apply same logistics requirements to multiple suppliers
- **Benefit:** Faster configuration
- **Complexity:** Low (template application)
- **Priority:** Medium

**Logistics Comparison View:**
- **Description:** Side-by-side comparison of logistics costs across suppliers
- **Benefit:** Easier to identify best logistics option
- **Complexity:** Medium (comparison UI)
- **Priority:** High (decision support)

**Import/Export:**
- **Description:** Import logistics data from Excel, export for analysis
- **Benefit:** Integration with existing workflows
- **Complexity:** Medium (file parsing, generation)
- **Priority:** Low

### 12.4 Known Limitations

**No Multi-Currency:**
- **Limitation:** All costs must be in same currency (€)
- **Workaround:** Manual conversion before entry
- **Mitigation:** Add currency selector (future)
- **Impact:** Medium (international suppliers)

**No Historical Data:**
- **Limitation:** Cannot see supplier's past logistics costs
- **Workaround:** Manual lookup in previous RFQs
- **Mitigation:** Add historical data view (future)
- **Impact:** Low (nice-to-have)

**No Validation Against Market Rates:**
- **Limitation:** Cannot validate if costs are reasonable
- **Workaround:** Manual comparison with industry benchmarks
- **Mitigation:** Add market rate validation (future)
- **Impact:** Medium (cost savings opportunity)

**No Packaging Optimization:**
- **Limitation:** Cannot calculate optimal packaging configuration
- **Workaround:** Manual calculation
- **Mitigation:** Add packaging calculator (future)
- **Impact:** Low (edge case)

**No Logistics Provider Integration:**
- **Limitation:** Cannot get real-time shipping quotes
- **Workaround:** Manual quotes from logistics providers
- **Mitigation:** Integrate with shipping APIs (future)
- **Impact:** Low (manual process acceptable)

**Limited Incoterms Validation:**
- **Limitation:** Only warns for non-standard codes, doesn't enforce
- **Workaround:** User must verify manually
- **Mitigation:** Stricter validation (future)
- **Impact:** Low (warning is sufficient)

**No Conditional Logic:**
- **Limitation:** Cannot show/hide fields based on other field values (except checkboxes)
- **Workaround:** Show all fields, user ignores irrelevant ones
- **Mitigation:** Add conditional logic engine (future)
- **Impact:** Low (current structure is sufficient)

### 12.5 Dependencies

**Upstream Dependencies:**
- **Screen 13:** RFQ Form (embeds this form in Step 3)
- **Screen 20:** Extraction Review (embeds this form for quote review)
- **LLM Service:** Extracts logistics data from supplier quotes
- **Master Field List:** Defines available logistics fields (future)

**Downstream Dependencies:**
- **Cost Calculation Service:** Uses logistics costs in total cost calculation
- **Comparison Board:** Displays logistics costs for comparison
- **Email Generation:** Includes logistics requirements in RFQ email

**External Dependencies:**
- **React:** UI framework
- **TypeScript:** Type safety
- **Tailwind CSS:** Styling
- **Lucide Icons:** Package and Truck icons

### 12.6 Testing Considerations

**Unit Tests:**
- Validation functions (number, text, conditional)
- Calculation functions (total carton cost, total logistics cost)
- State management (checkbox toggles, field updates)
- Callback firing (onUpdate)

**Integration Tests:**
- Parent-child communication (onUpdate callback)
- Conditional field visibility
- Read-only mode behavior
- Data persistence

**E2E Tests:**
- Fill all fields and submit
- Toggle checkboxes and verify conditional fields
- Enter invalid data and verify errors
- Read-only mode viewing

**Accessibility Tests:**
- Keyboard navigation
- Screen reader compatibility
- Focus management
- ARIA labels

**Performance Tests:**
- Rapid field updates
- Multiple checkbox toggles
- Large number values
- Memory leaks

**Browser Compatibility:**
- Chrome, Edge, Firefox, Safari
- Number input behavior
- Checkbox styling
- Layout responsiveness

### 12.7 Documentation Needs

**User Documentation:**
- How to specify logistics requirements
- What each field means
- When to use returnable packaging
- How to interpret Incoterms
- How logistics costs affect total cost

**Admin Documentation:**
- How to configure logistics fields (future)
- How to set up logistics templates (future)
- How to validate logistics data

**Developer Documentation:**
- Component API (props, callbacks)
- State management approach
- Validation logic
- Integration with parent components
- LLM extraction format

---

## Document Metadata

**Document Version:** 1.0  
**Created:** January 2, 2026  
**Last Updated:** January 2, 2026  
**Author:** Kiro AI Assistant  
**Status:** Complete  
**Total Lines:** 1,100+

**Related Documents:**
- `.kiro/specs/detailed-screen-requirements/plan.md` (Execution Plan)
- `MVP (email-to-quotations)/MVP_Product_Requirements_Document.md` (MVP PRD)
- `MVP (email-to-quotations)/User stories/Sarah (buyer) MVP user stories.md` (User Stories)
- `.kiro/specs/detailed-screen-requirements/screens/13-rfq-form.md` (Parent Screen)
- `.kiro/specs/detailed-screen-requirements/screens/20-extraction-review.md` (Usage Context - TBD)

**Change Log:**
- v1.0 (Jan 2, 2026): Initial complete document with all 12 sections

