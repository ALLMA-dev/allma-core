# RFQ Form (5-Step Wizard)

## 1. Overview
- **Screen ID:** SCR-013
- **Component File:** `src/app/components/RFQForm.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** High - Adaptive UI based on selected fields, dynamic field management

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** complete a comprehensive 5-step RFQ form with all necessary details  
**So that** I can send complete, professional RFQ packages to suppliers with all required information

### Related User Stories
- **US-MVP-02A:** Create RFQ Manually from Scratch
- **US-MVP-02B:** Duplicate Existing RFQ with Modifications
- **US-MVP-02C:** Create RFQ from Uploaded Files (Auto-Parsing)
- **US-MVP-03:** Review and Send RFQ Package
- **US-MVP-04:** Track RFQ via Project ID
- **REQ-MVP-11:** Multi-part RFQ support with package pricing
- **REQ-MVP-00A:** Enhanced project details (Project Name, Platform, Customer, Delivery Location)

## 3. Screen Purpose & Context

### Purpose
This screen is the core RFQ creation wizard that collects all necessary information to generate a complete RFQ package. It provides:
- **5-step structured wizard:** Project Info → Suppliers → Requirements → Deadline → Review
- **Multi-part RFQ support:** Handle 1-N parts per RFQ with individual descriptions
- **Volume scenarios:** Define multiple volume tiers for pricing
- **Unit conversion:** Built-in converter for volume units
- **Supplier management:** Add/edit/remove suppliers with history
- **Requirements checklist:** Select what information to request from suppliers
- **Validation:** Real-time validation with clear error messages
- **Review & preview:** Final review before sending

### Context
- **When user sees this:** 
  - After selecting any RFQ creation method (Create From Scratch, Clone Existing, Clone Project, Upload Files)
  - After completing project initiation and The Split
  - When ready to configure RFQ details and send to suppliers
- **Why it exists:** 
  - Centralized form for all RFQ configuration
  - Ensures completeness before sending to suppliers
  - Provides structured workflow to prevent missing information
  - Supports all 3 RFQ creation methods with same interface
- **Position in journey:** 
  - After RFQ Method Selection and method-specific screens
  - Before Email Preview (Screen 16)
  - Core screen for RFQ creation workflow

### Key Characteristics
- **5-step wizard:** Progressive disclosure, one step at a time
- **Progress indicator:** Visual progress bar showing completion
- **Multi-part support:** Handle multiple parts with individual descriptions
- **Dynamic fields:** Adapts based on selected parts and requirements
- **Real-time validation:** Immediate feedback on errors
- **Save draft:** Can save and return later
- **Responsive:** Works on desktop and tablet



## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Title:** "Screen 10: RFQ Initiation - Method 3: Create From Scratch" (dynamic based on method)
2. **Subtitle:** "Multi-step wizard to create a new request for quotation"

**Main Form Card:**
1. **Card Header**
   - Title: "Create New RFQ"
   - Description: "Project ID: [RFQ-2025-047]" (dynamic)
   - Badge: "Step X of 5" (current step indicator)
   - Progress bar: Visual indicator (0-100%)

2. **Step 1: Project Information**
   - Project ID (editable, auto-generated)
   - Part Name(s) (multi-select dropdown from BOM)
   - Part Descriptions (one per selected part)
   - Volume Scenarios (multiple tiers with unit converter)
   - Commodity Type (dropdown)
   - Attachments (file upload area)

3. **Step 2: Supplier Selection**
   - Supplier list (name, email, previous RFQs count)
   - Add/remove suppliers
   - Select All / Clear All actions
   - Minimum 3 suppliers validation

4. **Step 3: Requirements Checklist**
   - Required items (pre-selected, blue section)
   - Optional items (white section)
   - Each item has title and description
   - Checkboxes for selection

5. **Step 4: Deadline & Notes**
   - Response deadline date picker
   - Additional notes textarea
   - Language preference selector

6. **Step 5: Review & Submit**
   - Summary of all entered information
   - Edit buttons for each section
   - Final validation check
   - Submit button

**Navigation Buttons:**
- Previous (left, outline, with ChevronLeft icon)
- Next / Submit (right, primary, with ChevronRight icon)

**Demo Navigation Hint:**
- Blue banner at bottom
- Explains next step in demo flow


### 4.2 Key UI Elements

**Card Header Elements:**
- **Title:** text-lg, font-semibold
- **Description:** text-sm, gray-600
- **Badge:** variant-outline, "Step X of 5"
- **Progress Bar:** 
  - Component: Progress
  - Value: (currentStep / 5) * 100
  - Visual: blue fill, gray background
  - Height: 8px
  - Margin: mt-4

**Step 1: Project Information Fields**

**Project ID:**
- Input field
- Value: Auto-generated (e.g., "RFQ-2025-047")
- Editable by user
- Help text: "Auto-generated, but you can edit it"
- Validation: Required, unique

**Part Name(s) - Multi-Select Dropdown:**
- **Search Input:**
  - Placeholder: "Search and select parts from BOM..."
  - Icon: ChevronRight (rotates 90° when open)
  - Focus triggers dropdown
  - Real-time search filtering

- **Dropdown List:**
  - Position: absolute, full width
  - Max height: 240px (60 units)
  - Scrollable
  - Background: white, shadow-lg
  - Z-index: 10

- **Part Items in Dropdown:**
  - Checkbox (checked if selected)
  - Part name (font-mono, text-sm, font-medium)
  - Material and quantity (text-xs, gray-600)
  - Status badge (Existing: green, New: orange)
  - Hover: bg-gray-50
  - Selected: bg-blue-50
  - Click toggles selection

- **Selected Parts Badges:**
  - Display below search input
  - Background: gray-50, rounded-lg, padding
  - Each badge shows:
    - Part name (font-mono, text-xs)
    - Remove button (X icon)
    - Color: blue (valid) or red (invalid)
    - Alert icon if invalid

- **Validation Warning (Invalid Parts):**
  - Red background (red-50)
  - Red border (red-200)
  - Alert triangle icon
  - Message: "Parts Not in BOM"
  - Lists invalid part names
  - Button: "Go to Project Summary to Add Parts"
  - Links to Screen 7 (Project Summary)

**Part Descriptions:**
- Label: "Part Descriptions"
- Help text: "Edit or add descriptions for each selected part"
- Empty state: "No parts selected. Please select parts from the list above."
- **Per-Part Description Card:**
  - Background: gray-50
  - Border: gray-200
  - Padding: p-4
  - Part name label (font-mono, font-semibold)
  - Material info (text-xs, gray-500)
  - Input field for description
  - Placeholder: "Enter part description..."
  - Warning if empty: amber icon + "Description is missing - consider adding one for clarity"

**Volume Scenarios:**
- Label: "Volume Scenarios"
- Help text: "Define volume tiers for suppliers to provide pricing"
- Add Scenario button (top-right, outline, Plus icon)
- **Per-Scenario Row:**
  - Volume input (formatted with commas)
  - Unit selector (dropdown: pieces/year, kg/year, liters/year, units/year)
  - Convert button (ArrowLeftRight icon)
  - Remove button (X icon, only if >1 scenario)
  - Conversion info badge (if conversion applied)
  - Inline unit converter (if active)

**Commodity Type:**
- Select dropdown
- Options: Stamping, Machining, Casting, Injection Molding, Forging, Welding
- Required field

**Attachments:**
- Drag-and-drop area
- Border: dashed, gray-300
- Hover: gray-400
- Upload icon (size-8, gray-400)
- Text: "Drag and drop files here, or click to browse"
- Help text: "Add BOM, drawings, specifications"
- File list (if files added):
  - Gray background
  - File name
  - Remove button (X icon)

**Step 2: Supplier Selection Fields**

**Section Header:**
- Title: "Supplier Selection"
- Actions: "Select All" | "Clear All" (blue links)

**Supplier Rows:**
- Background: gray-50, rounded-lg
- Checkbox (checked by default)
- Grid: 3 columns
  - Name input (placeholder: "Supplier Name")
  - Email input (placeholder: "email@company.com")
  - Previous RFQs count (text-sm, gray-500)
- Remove button (X icon, only if >3 suppliers)

**Add Supplier Button:**
- Full width
- Variant: outline
- Icon: Plus
- Text: "Add Another Supplier"

**Minimum Suppliers Warning:**
- Background: yellow-50
- Border: yellow-200
- Text: "Minimum 3 suppliers required for a competitive RFQ"
- Only shown if <3 suppliers

**Step 3: Requirements Checklist Fields**

**Section Header:**
- Title: "Requirements Checklist"
- Subtitle: "Select the information you need from suppliers"

**Required Items Section:**
- Background: blue-50
- Border: blue-200
- Title: "Required Items (Pre-selected)"
- **Checklist Items:**
  - Material Cost Breakdown
  - Process Cost Breakdown
  - Tooling Cost (MUST be separate) - Badge: "Critical" (red)
  - Logistics Costs
  - Payment Terms and Lead Time
  - Capacity Confirmation

**Optional Items Section:**
- Background: white
- Title: "Optional Items"
- **Checklist Items:**
  - Quality Certifications
  - Prototype Samples
  - Sustainability/ESG Information

**Checklist Item Structure:**
- Checkbox (interactive)
- Title (font-medium, gray-900)
- Description (text-sm, gray-600)
- Badge (if critical)
- Flex layout with gap-3



**Step 4: Deadline & Notes Fields**

**Response Deadline:**
- Label: "Response Deadline"
- Date picker input
- Default: 2 weeks from today
- Help text: "When do you need supplier responses?"
- Validation: Must be future date

**Additional Notes:**
- Label: "Additional Notes (Optional)"
- Textarea (4 rows)
- Placeholder: "Add any special instructions or requirements for suppliers..."
- Character limit: 1000 characters
- Counter: Shows remaining characters

**Language Preference:**
- Label: "Email Language"
- Select dropdown
- Options: English, Spanish, French, German, Mandarin
- Default: English
- Help text: "Language for RFQ email to suppliers"

**Step 5: Review & Submit Fields**

**Success Banner:**
- Background: green-50
- Border: green-200
- Icon: CheckCircle (green-600)
- Title: "Ready to Send"
- Message: "Review your RFQ details below. Click 'Send RFQ' to send to all selected suppliers."

**Review Sections:**
Each section shows:
- Section title (font-semibold)
- Edit button (blue link, top-right)
- Content summary in gray box

**Project Information Summary:**
- Project ID
- Parts list (with descriptions)
- Volume scenarios
- Commodity type
- Attachments count

**Suppliers Summary:**
- Count: "X suppliers selected"
- List of supplier names and emails

**Requirements Summary:**
- List of selected requirements (checkmarks)

**Deadline & Notes Summary:**
- Response deadline date
- Additional notes (if provided)
- Language preference

**Navigation Buttons:**
- **Previous Button:**
  - Variant: outline
  - Icon: ChevronLeft (mr-2)
  - Text: "Previous"
  - Flex: flex-1
  - Only shown if currentStep > 1

- **Next Button:**
  - Background: blue-600, hover:blue-700
  - Icon: ChevronRight (ml-2)
  - Text: "Next" (steps 1-4) or "Send RFQ" (step 5)
  - Flex: flex-1
  - Disabled if validation fails

**Demo Navigation Hint:**
- Background: blue-50
- Border: blue-200
- Text: "Demo Navigation: Click 'Next' in the header to see the auto-generated email preview →"
- Center aligned


### 4.3 Information Hierarchy

**Primary Information (Always Visible):**
- Current step number and title
- Progress bar
- Current step fields
- Navigation buttons

**Secondary Information (Contextual):**
- Help text for each field
- Validation messages
- Selected parts badges
- Supplier count
- Requirements count

**Tertiary Information (Supporting):**
- Field descriptions
- Character counters
- Conversion info
- Demo hints



## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| rfq_id | String | Auto-generated | Yes | Format: RFQ-YYYY-NNN |
| created_date | DateTime | System timestamp | Yes | ISO 8601 format |
| created_by | String | Current user ID | Yes | User email |
| project_id | String | From project context | Yes | Format: PRJ-YYYY-NNN |
| status | Enum | System | Yes | draft, sent, active, closed |
| version | Integer | System | Yes | Starts at 1, increments on edit |

### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| commodity_type | Enum | Yes | No | Stamping, Machining, Casting, Injection Molding, Forging, Welding |
| response_deadline | Date | Yes | No | Future date, min 3 days from today |
| language_preference | Enum | Yes | No | English, Spanish, French, German, Mandarin |

### 5.3 Dynamic Fields (Buyer-Selectable)
| Field Name | Data Type | Conditions | Validation Rules | Default Value |
|------------|-----------|------------|------------------|---------------|
| part_names | Array<String> | Always | Min 1, max 50 parts, must exist in BOM | [] |
| part_descriptions | Object<String, String> | Per selected part | Max 500 chars per description | {} |
| volume_scenarios | Array<Object> | Always | Min 1, max 10 scenarios | [{volume: '', unit: 'pieces'}] |
| suppliers | Array<Object> | Always | Min 3, max 50 suppliers | [] |
| requirements | Object<String, Boolean> | Always | At least 3 required items must be true | Default required items |
| additional_notes | String | Optional | Max 1000 characters | '' |
| attachments | Array<File> | Optional | Max 10 files, max 50MB total | [] |

### 5.4 Data Displayed
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_id | String | Project context | Yes | Display only |
| current_step | Integer | Component state | Yes | 1-5 |
| progress_percentage | Integer | Calculated | Yes | (currentStep / 5) * 100 |
| selected_parts_count | Integer | Calculated | Yes | selectedParts.length |
| selected_suppliers_count | Integer | Calculated | Yes | suppliers.length |
| selected_requirements_count | Integer | Calculated | Yes | Count of true values in requirements |
| validation_errors | Array<String> | Calculated | No | List of current validation errors |

### 5.5 Data Collected from User

**Step 1: Project Information**
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| project_id | Text input | Yes | Unique, alphanumeric with hyphens | Auto-generated: RFQ-YYYY-NNN |
| part_names | Multi-select dropdown | Yes | Min 1 part, must exist in BOM | [] |
| part_descriptions | Text input (per part) | No | Max 500 chars per part | Sourced from BOM |
| volume_scenarios | Array of objects | Yes | Min 1 scenario, volume > 0 | [{volume: '50,000', unit: 'pieces'}] |
| volume_scenarios[].volume | Number input | Yes | Positive integer, formatted with commas | '' |
| volume_scenarios[].unit | Select dropdown | Yes | pieces/year, kg/year, liters/year, units/year | 'pieces' |
| volume_scenarios[].conversion | Object | No | Applied from unit converter | null |
| commodity_type | Select dropdown | Yes | One of predefined options | '' |
| attachments | File upload | No | Max 10 files, 50MB total, PDF/Excel/Word/Image | [] |

**Step 2: Supplier Selection**
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| suppliers | Array of objects | Yes | Min 3 suppliers | Pre-populated list |
| suppliers[].name | Text input | Yes | Max 100 chars | '' |
| suppliers[].email | Email input | Yes | Valid email format | '' |
| suppliers[].selected | Checkbox | No | Boolean | true |
| suppliers[].previous_rfqs | Integer | No | Display only, from system | 0 |

**Step 3: Requirements Checklist**
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| requirements.material | Checkbox | Yes (pre-selected) | Boolean | true |
| requirements.process | Checkbox | Yes (pre-selected) | Boolean | true |
| requirements.tooling | Checkbox | Yes (pre-selected) | Boolean | true |
| requirements.logistics | Checkbox | Yes (pre-selected) | Boolean | true |
| requirements.terms | Checkbox | Yes (pre-selected) | Boolean | true |
| requirements.capacity | Checkbox | Yes (pre-selected) | Boolean | true |
| requirements.quality | Checkbox | No | Boolean | false |
| requirements.prototype | Checkbox | No | Boolean | false |
| requirements.sustainability | Checkbox | No | Boolean | false |

**Step 4: Deadline & Notes**
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| response_deadline | Date picker | Yes | Future date, min 3 days from today | Today + 14 days |
| additional_notes | Textarea | No | Max 1000 characters | '' |
| language_preference | Select dropdown | Yes | One of supported languages | 'English' |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| progress_percentage | (currentStep / 5) * 100 | currentStep |
| selected_parts_count | selectedParts.length | selectedParts |
| selected_suppliers_count | suppliers.filter(s => s.selected).length | suppliers |
| selected_requirements_count | Object.values(requirements).filter(v => v).length | requirements |
| is_step_valid | Validation logic per step | All fields in current step |
| can_proceed | is_step_valid && !hasInvalidParts | Validation state |
| formatted_volume | formatNumber(volume) - adds commas | volume input |
| mailto_link | generateMailtoLink() - creates email link | All form data |
| email_subject | `RFQ ${projectId}: ${firstPartDescription}` | projectId, partDescriptions |
| email_body | Template with all RFQ details | All form data |



## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**How buyer selects fields:**
- Parts are selected from BOM dropdown (multi-select)
- Volume scenarios are added/removed dynamically
- Suppliers are added/removed from list
- Requirements are toggled via checkboxes
- All selections persist across steps

**Field selection UI:**
- **Parts:** Searchable dropdown with checkboxes, shows selected as badges
- **Volume Scenarios:** Add/remove rows with + and X buttons
- **Suppliers:** Add/remove rows with + and X buttons
- **Requirements:** Checkbox list with pre-selected required items

**Mandatory field rules:**
- System fields: Always required, cannot be disabled
- Project ID: Required, auto-generated but editable
- Parts: Min 1 part required
- Volume Scenarios: Min 1 scenario required
- Suppliers: Min 3 suppliers required
- Requirements: Min 3 required items must be selected (pre-selected)
- Response Deadline: Required, must be future date

**Field dependencies:**
- Part descriptions depend on selected parts (1:1 relationship)
- Volume unit converter depends on selected unit type
- Supplier removal depends on count (must keep min 3)
- Volume scenario removal depends on count (must keep min 1)
- Navigation depends on validation state

### 6.2 UI Adaptation Logic

**Form generation:**
- Each step renders conditionally based on currentStep state
- Fields within each step are static (not dynamically generated)
- Part description fields are dynamically generated per selected part
- Volume scenario rows are dynamically generated per scenario
- Supplier rows are dynamically generated per supplier

**Layout rules:**
- Single-column layout on mobile (<768px)
- Two-column grid for part fields on desktop
- Full-width for textareas and file upload
- Responsive card max-width: 4xl (896px)
- Centered layout with auto margins

**Validation adaptation:**
- Real-time validation on field blur
- Step validation before allowing Next
- Cross-field validation (e.g., parts must exist in BOM)
- Visual feedback: red borders, error messages, disabled buttons
- Validation messages appear below fields

**Caching strategy:**
- Form state persists in component state (React useState)
- No automatic save to backend (draft functionality future enhancement)
- State resets on component unmount
- Browser back button may lose state (warning needed)

### 6.3 LLM Integration (if applicable)

**LLM role:**
- Not directly used in this screen
- LLM is used in upstream screens (Upload RFQ Files) to pre-fill this form
- LLM will be used in downstream screens (Email Preview) to generate email content

**Input to LLM:**
- N/A for this screen

**Output from LLM:**
- N/A for this screen

**Confidence scoring:**
- N/A for this screen

**Fallback behavior:**
- N/A for this screen

**Note:** This screen is a pure data collection form. LLM integration happens before (extraction) and after (email generation) this screen.



## 7. User Interactions

### 7.1 Primary Actions

**Action: Select Parts from BOM**
- **Trigger:** User clicks on part search input or chevron button
- **Behavior:** 
  - Dropdown opens showing all BOM parts
  - User can search by part name or material
  - User clicks on part to toggle selection
  - Checkbox updates to show selection state
  - Selected part appears as badge below input
  - Part description field is auto-populated from BOM
- **Validation:** 
  - At least 1 part must be selected
  - Selected parts must exist in BOM
  - Invalid parts show red badge with warning
- **Success:** 
  - Part added to selectedParts array
  - Badge appears with part name
  - Description field created for part
- **Error:** 
  - If part not in BOM: Red warning banner appears
  - Message: "Parts Not in BOM" with list of invalid parts
  - Button to navigate to Project Summary to add parts
- **Navigation:** Stays on Step 1

**Action: Add/Edit Part Description**
- **Trigger:** User types in part description input field
- **Behavior:** 
  - Description updates in real-time
  - Character count updates (max 500)
  - Warning disappears if description was empty
- **Validation:** 
  - Max 500 characters per description
  - Not required but recommended
- **Success:** 
  - Description saved to partDescriptions object
  - Warning removed if present
- **Error:** 
  - If >500 chars: Error message appears, input truncated
- **Navigation:** Stays on Step 1

**Action: Add Volume Scenario**
- **Trigger:** User clicks "Add Scenario" button
- **Behavior:** 
  - New scenario row appears
  - Empty volume input and unit selector
  - Remove button appears (if >1 scenario)
- **Validation:** 
  - Max 10 scenarios allowed
  - Each scenario must have volume > 0
- **Success:** 
  - New scenario added to volumeScenarios array
  - Form expands to show new row
- **Error:** 
  - If 10 scenarios exist: Button disabled, tooltip shows "Maximum 10 scenarios"
- **Navigation:** Stays on Step 1

**Action: Convert Volume Units**
- **Trigger:** User clicks convert button (ArrowLeftRight icon) on scenario row
- **Behavior:** 
  - Unit converter component appears inline
  - Shows current value and unit
  - User selects target unit
  - User enters conversion factor
  - User clicks "Apply Conversion"
  - Volume and unit update to converted values
  - Conversion info badge appears
- **Validation:** 
  - Conversion factor must be positive number
  - Target unit must be different from source unit
- **Success:** 
  - Volume converted and formatted
  - Unit updated
  - Conversion info saved
  - Converter closes
- **Error:** 
  - If invalid factor: Error message in converter
- **Navigation:** Stays on Step 1

**Action: Upload Attachments**
- **Trigger:** User drags files or clicks upload area
- **Behavior:** 
  - File picker opens (if clicked)
  - Files are validated
  - File names appear in list below upload area
  - Each file has remove button
- **Validation:** 
  - Max 10 files
  - Max 50MB total size
  - Allowed types: PDF, Excel, Word, Images
- **Success:** 
  - Files added to attachments array
  - File list displays with names
- **Error:** 
  - If too many files: "Maximum 10 files allowed"
  - If too large: "Total size exceeds 50MB limit"
  - If wrong type: "File type not supported"
- **Navigation:** Stays on Step 1

**Action: Navigate to Next Step**
- **Trigger:** User clicks "Next" button
- **Behavior:** 
  - Current step validation runs
  - If valid: currentStep increments
  - Page scrolls to top
  - Progress bar updates
  - Next step content appears
- **Validation:** 
  - Step 1: Project ID, parts (min 1), volume scenarios (min 1), commodity required
  - Step 2: Min 3 suppliers with valid emails
  - Step 3: Min 3 required items selected
  - Step 4: Future deadline date required
  - Step 5: All previous steps valid
- **Success:** 
  - Move to next step
  - Progress bar advances
  - Button text updates ("Next" or "Send RFQ")
- **Error:** 
  - Button disabled if validation fails
  - Error messages appear on invalid fields
  - User cannot proceed until fixed
- **Navigation:** Advances to next step (1→2→3→4→5)

**Action: Navigate to Previous Step**
- **Trigger:** User clicks "Previous" button
- **Behavior:** 
  - currentStep decrements
  - Page scrolls to top
  - Progress bar updates
  - Previous step content appears
  - All entered data preserved
- **Validation:** None (can always go back)
- **Success:** 
  - Move to previous step
  - Progress bar decreases
  - Data preserved
- **Error:** None
- **Navigation:** Goes back one step (5→4→3→2→1)

**Action: Submit RFQ (Step 5)**
- **Trigger:** User clicks "Send RFQ" button on Step 5
- **Behavior:** 
  - Final validation runs
  - Loading state appears
  - RFQ data sent to backend
  - Email generation triggered
  - Navigation to Email Preview screen
- **Validation:** 
  - All required fields complete
  - Min 3 suppliers
  - Valid email addresses
  - Future deadline date
  - At least 1 part selected
- **Success:** 
  - RFQ created in backend
  - Status: "sent"
  - Navigate to Email Preview (Screen 16)
  - Success message appears
- **Error:** 
  - If backend error: Error message appears
  - User stays on Step 5
  - Can retry submission
- **Navigation:** Navigate to Screen 16 (Email Preview)

### 7.2 Secondary Actions

**Action: Remove Selected Part**
- **Trigger:** User clicks X button on part badge
- **Behavior:** 
  - Part removed from selectedParts array
  - Badge disappears
  - Part description field removed
  - Dropdown checkbox unchecked
- **Validation:** Must keep at least 1 part
- **Success:** Part removed, UI updates
- **Error:** If last part: Button disabled or warning appears
- **Navigation:** Stays on Step 1

**Action: Remove Volume Scenario**
- **Trigger:** User clicks X button on scenario row
- **Behavior:** 
  - Scenario removed from volumeScenarios array
  - Row disappears
- **Validation:** Must keep at least 1 scenario
- **Success:** Scenario removed, UI updates
- **Error:** If last scenario: Button disabled
- **Navigation:** Stays on Step 1

**Action: Add Supplier**
- **Trigger:** User clicks "Add Another Supplier" button
- **Behavior:** 
  - New supplier row appears
  - Empty name and email inputs
  - Previous RFQs shows 0
  - Remove button appears
- **Validation:** Max 50 suppliers
- **Success:** New supplier added to suppliers array
- **Error:** If 50 suppliers: Button disabled
- **Navigation:** Stays on Step 2

**Action: Remove Supplier**
- **Trigger:** User clicks X button on supplier row
- **Behavior:** 
  - Supplier removed from suppliers array
  - Row disappears
- **Validation:** Must keep at least 3 suppliers
- **Success:** Supplier removed, UI updates
- **Error:** If only 3 suppliers: Button disabled or hidden
- **Navigation:** Stays on Step 2

**Action: Select All / Clear All Suppliers**
- **Trigger:** User clicks "Select All" or "Clear All" link
- **Behavior:** 
  - All supplier checkboxes update
  - Selected count updates
- **Validation:** Must keep at least 3 selected
- **Success:** All suppliers selected/deselected
- **Error:** If Clear All would leave <3: Warning appears
- **Navigation:** Stays on Step 2

**Action: Toggle Requirement**
- **Trigger:** User clicks checkbox on requirement item
- **Behavior:** 
  - Checkbox toggles
  - Requirement value updates in requirements object
- **Validation:** Required items cannot be unchecked
- **Success:** Requirement toggled
- **Error:** If required item: Checkbox stays checked, tooltip explains
- **Navigation:** Stays on Step 3

**Action: Edit Section from Review (Step 5)**
- **Trigger:** User clicks "Edit" button on any review section
- **Behavior:** 
  - Navigate back to corresponding step
  - User can make changes
  - Return to Step 5 to review again
- **Validation:** None
- **Success:** Navigate to edit step
- **Error:** None
- **Navigation:** 
  - Edit Project Info → Step 1
  - Edit Suppliers → Step 2
  - Edit Requirements → Step 3
  - Edit Deadline → Step 4

**Action: Close Part Dropdown (Click Outside)**
- **Trigger:** User clicks outside dropdown area
- **Behavior:** 
  - Dropdown closes
  - Selected parts remain
- **Validation:** None
- **Success:** Dropdown closes
- **Error:** None
- **Navigation:** Stays on Step 1

### 7.3 Navigation

**From:**
- Screen 8: RFQ Method Selection (all 3 methods lead here)
- Screen 9: Create From Scratch (leads here)
- Screen 10: Clone Existing RFQ (leads here with pre-filled data)
- Screen 11: Clone Project (leads here with pre-filled data)
- Screen 12: Upload RFQ Files (leads here with LLM-extracted data)

**To:**
- Screen 16: Email Preview (after Step 5 submission)
- Screen 7: Project Summary (if invalid parts need to be added)
- Screen 8: RFQ Method Selection (if user clicks "Back to Methods" - future enhancement)

**Exit Points:**
- Submit button on Step 5 → Email Preview
- Browser back button (with warning about losing data)
- Navigation menu (with warning about losing data)
- Invalid parts link → Project Summary



## 8. Business Rules

### 8.1 Validation Rules

**Project ID Validation:**
- **Rule:** Must be unique across all RFQs
- **Format:** Alphanumeric with hyphens (e.g., RFQ-2025-047)
- **Error:** "Project ID already exists. Please use a different ID."

**Part Selection Validation:**
- **Rule:** At least 1 part must be selected
- **Error:** "Please select at least one part from the BOM."
- **Rule:** All selected parts must exist in project BOM
- **Error:** "The following parts are not in the project BOM: [list]. Please add them to the project before proceeding."

**Part Description Validation:**
- **Rule:** Max 500 characters per description
- **Warning:** "Description is missing - consider adding one for clarity" (not blocking)
- **Error:** "Description exceeds 500 characters. Please shorten it."

**Volume Scenario Validation:**
- **Rule:** At least 1 volume scenario required
- **Error:** "Please add at least one volume scenario."
- **Rule:** Volume must be positive number
- **Error:** "Volume must be greater than 0."
- **Rule:** Max 10 scenarios allowed
- **Error:** "Maximum 10 volume scenarios allowed."

**Supplier Validation:**
- **Rule:** Minimum 3 suppliers required
- **Error:** "Minimum 3 suppliers required for a competitive RFQ."
- **Rule:** Each supplier must have name and valid email
- **Error:** "Please provide name and email for all suppliers."
- **Rule:** Email must be valid format
- **Error:** "Invalid email format for [supplier name]."
- **Rule:** Max 50 suppliers allowed
- **Error:** "Maximum 50 suppliers allowed."

**Requirements Validation:**
- **Rule:** At least 3 required items must be selected (pre-selected by default)
- **Error:** "At least 3 required items must be selected."
- **Rule:** Required items (material, process, tooling, logistics, terms, capacity) cannot be unchecked
- **Error:** "This is a required item and cannot be deselected."

**Deadline Validation:**
- **Rule:** Must be future date
- **Error:** "Response deadline must be in the future."
- **Rule:** Must be at least 3 days from today
- **Error:** "Response deadline must be at least 3 days from today."

**Additional Notes Validation:**
- **Rule:** Max 1000 characters
- **Error:** "Additional notes exceed 1000 characters. Please shorten."

**Attachment Validation:**
- **Rule:** Max 10 files
- **Error:** "Maximum 10 files allowed."
- **Rule:** Max 50MB total size
- **Error:** "Total file size exceeds 50MB limit."
- **Rule:** Allowed types: PDF, Excel (.xlsx, .xls), Word (.docx, .doc), Images (.jpg, .png, .gif)
- **Error:** "File type not supported. Please upload PDF, Excel, Word, or Image files."

### 8.2 Calculation Logic

**Progress Percentage:**
- **Formula:** `(currentStep / 5) * 100`
- **Example:** Step 3 of 5 = 60%

**Selected Parts Count:**
- **Formula:** `selectedParts.length`
- **Example:** 2 parts selected = "2 parts"

**Selected Suppliers Count:**
- **Formula:** `suppliers.filter(s => s.selected).length`
- **Example:** 5 suppliers, 4 selected = "4 suppliers"

**Selected Requirements Count:**
- **Formula:** `Object.values(requirements).filter(v => v).length`
- **Example:** 6 requirements checked = "6 requirements"

**Formatted Volume:**
- **Formula:** Remove non-digits, add commas every 3 digits
- **Example:** "50000" → "50,000"

**Email Subject:**
- **Formula:** `RFQ ${projectId}: ${firstPartDescription || 'Parts'}`
- **Example:** "RFQ RFQ-2025-047: Aluminum mounting bracket for door assembly"

**Email Body:**
- **Template:**
```
Dear Supplier,

We are requesting a quotation for the following parts:

Project ID: ${projectId}
Parts:
${partsList}

Volume Scenarios:
${volumeScenarios}

Commodity: ${commodity}

Please provide:
${requirementsList}

Response Deadline: ${deadline}

Please find attached technical drawings and specifications.

Best regards,
${buyerName}
${buyerTitle}
```

### 8.3 Conditional Display Logic

**Show/Hide Part Dropdown:**
- **Condition:** `showPartDropdown === true`
- **Trigger:** Focus on search input or click chevron button
- **Hide:** Click outside dropdown area

**Show/Hide Selected Parts Badges:**
- **Condition:** `selectedParts.length > 0`
- **Display:** Badges for each selected part

**Show/Hide Invalid Parts Warning:**
- **Condition:** `validation.invalid.length > 0`
- **Display:** Red warning banner with list of invalid parts

**Show/Hide Part Description Fields:**
- **Condition:** `selectedParts.length > 0`
- **Display:** One description field per selected part
- **Empty State:** "No parts selected. Please select parts from the list above."

**Show/Hide Volume Scenario Remove Button:**
- **Condition:** `volumeScenarios.length > 1`
- **Display:** X button on each scenario row

**Show/Hide Unit Converter:**
- **Condition:** `showConverterIndex === index`
- **Display:** Inline converter below scenario row

**Show/Hide Conversion Info Badge:**
- **Condition:** `scenario.conversion !== null`
- **Display:** Blue badge with conversion details

**Show/Hide Supplier Remove Button:**
- **Condition:** `suppliers.length > 3`
- **Display:** X button on each supplier row

**Show/Hide Minimum Suppliers Warning:**
- **Condition:** `suppliers.length < 3`
- **Display:** Yellow warning banner

**Show/Hide Previous Button:**
- **Condition:** `currentStep > 1`
- **Display:** Previous button in navigation

**Change Next Button Text:**
- **Condition:** `currentStep === 5`
- **Text:** "Send RFQ" (else "Next")

**Disable Next Button:**
- **Condition:** `!is_step_valid || hasInvalidParts`
- **State:** Disabled, gray background

**Show/Hide Step Content:**
- **Condition:** `currentStep === X`
- **Display:** Only current step content visible

### 8.4 Error Handling

**Invalid Part Selection:**
- **Detection:** Part name not found in BOM
- **Handling:** 
  - Show red badge on part
  - Display warning banner
  - Provide link to Project Summary
  - Disable Next button
- **Recovery:** User adds part to BOM or removes from selection

**Network Error on Submit:**
- **Detection:** Backend API call fails
- **Handling:** 
  - Show error message: "Failed to send RFQ. Please try again."
  - Keep user on Step 5
  - Enable retry
- **Recovery:** User clicks Send RFQ again

**File Upload Error:**
- **Detection:** File too large, wrong type, or upload fails
- **Handling:** 
  - Show error message below upload area
  - File not added to list
  - User can try different file
- **Recovery:** User uploads valid file

**Email Validation Error:**
- **Detection:** Invalid email format
- **Handling:** 
  - Red border on email input
  - Error message below field
  - Disable Next button
- **Recovery:** User corrects email format

**Date Validation Error:**
- **Detection:** Past date or too soon
- **Handling:** 
  - Red border on date picker
  - Error message below field
  - Disable Next button
- **Recovery:** User selects valid future date

**Browser Back Button:**
- **Detection:** User clicks browser back
- **Handling:** 
  - Warning: "You have unsaved changes. Are you sure you want to leave?"
  - If confirmed: Navigate away, lose data
  - If cancelled: Stay on page
- **Recovery:** User saves draft (future enhancement) or continues editing



## 9. Acceptance Criteria

### 9.1 Functional Criteria

**Step 1: Project Information**
1. WHEN user loads screen THEN Project ID SHALL be auto-generated in format RFQ-YYYY-NNN
2. WHEN user clicks Project ID field THEN user SHALL be able to edit the ID
3. WHEN user clicks part search input THEN dropdown SHALL open showing all BOM parts
4. WHEN user types in search input THEN parts SHALL filter by name or material in real-time
5. WHEN user clicks on part in dropdown THEN part SHALL toggle selection (add/remove)
6. WHEN part is selected THEN checkbox SHALL show checked state
7. WHEN part is selected THEN badge SHALL appear below search input
8. WHEN part is selected THEN description field SHALL be created with BOM description
9. WHEN user clicks X on part badge THEN part SHALL be removed from selection
10. WHEN part is removed THEN description field SHALL be removed
11. WHEN selected part not in BOM THEN red warning banner SHALL appear
12. WHEN invalid parts exist THEN "Go to Project Summary" button SHALL be shown
13. WHEN user clicks outside dropdown THEN dropdown SHALL close
14. WHEN user types in part description THEN description SHALL update in real-time
15. WHEN description exceeds 500 chars THEN error message SHALL appear
16. WHEN user clicks "Add Scenario" THEN new volume scenario row SHALL appear
17. WHEN user types in volume input THEN number SHALL be formatted with commas
18. WHEN user selects unit THEN unit SHALL update for that scenario
19. WHEN user clicks convert button THEN unit converter SHALL appear inline
20. WHEN user applies conversion THEN volume and unit SHALL update with converted values
21. WHEN conversion applied THEN blue info badge SHALL show conversion details
22. WHEN user clicks X on scenario THEN scenario SHALL be removed (if >1 exists)
23. WHEN only 1 scenario exists THEN X button SHALL not appear
24. WHEN user selects commodity THEN commodity type SHALL update
25. WHEN user drags files to upload area THEN files SHALL be validated and added
26. WHEN file exceeds size limit THEN error message SHALL appear
27. WHEN file wrong type THEN error message SHALL appear
28. WHEN file added THEN file name SHALL appear in list with remove button
29. WHEN user clicks X on file THEN file SHALL be removed from list
30. WHEN user clicks Next THEN validation SHALL run for Step 1 fields
31. WHEN Step 1 valid THEN user SHALL advance to Step 2
32. WHEN Step 1 invalid THEN Next button SHALL be disabled
33. WHEN Step 1 invalid THEN error messages SHALL appear on invalid fields
34. WHEN no parts selected THEN error message SHALL appear
35. WHEN no volume scenarios THEN error message SHALL appear
36. WHEN commodity not selected THEN error message SHALL appear

**Step 2: Supplier Selection**
37. WHEN user loads Step 2 THEN pre-populated supplier list SHALL appear
38. WHEN user clicks "Add Another Supplier" THEN new supplier row SHALL appear
39. WHEN user types supplier name THEN name SHALL update in real-time
40. WHEN user types supplier email THEN email SHALL update in real-time
41. WHEN email invalid format THEN error message SHALL appear
42. WHEN user clicks X on supplier THEN supplier SHALL be removed (if >3 exist)
43. WHEN only 3 suppliers exist THEN X button SHALL not appear
44. WHEN <3 suppliers THEN yellow warning banner SHALL appear
45. WHEN user clicks "Select All" THEN all supplier checkboxes SHALL be checked
46. WHEN user clicks "Clear All" THEN all supplier checkboxes SHALL be unchecked (if >3 remain selected)
47. WHEN user clicks Next THEN validation SHALL run for Step 2 fields
48. WHEN <3 suppliers selected THEN error message SHALL appear
49. WHEN any supplier missing name/email THEN error message SHALL appear
50. WHEN Step 2 valid THEN user SHALL advance to Step 3

**Step 3: Requirements Checklist**
51. WHEN user loads Step 3 THEN required items SHALL be pre-selected
52. WHEN user clicks optional item checkbox THEN item SHALL toggle
53. WHEN user tries to uncheck required item THEN checkbox SHALL stay checked
54. WHEN user hovers over required item THEN tooltip SHALL explain it's required
55. WHEN user clicks Next THEN validation SHALL run for Step 3 fields
56. WHEN <3 required items selected THEN error message SHALL appear
57. WHEN Step 3 valid THEN user SHALL advance to Step 4

**Step 4: Deadline & Notes**
58. WHEN user loads Step 4 THEN deadline SHALL default to today + 14 days
59. WHEN user selects date THEN deadline SHALL update
60. WHEN date in past THEN error message SHALL appear
61. WHEN date <3 days from today THEN error message SHALL appear
62. WHEN user types in notes THEN character count SHALL update
63. WHEN notes exceed 1000 chars THEN error message SHALL appear
64. WHEN user selects language THEN language preference SHALL update
65. WHEN user clicks Next THEN validation SHALL run for Step 4 fields
66. WHEN deadline invalid THEN error message SHALL appear
67. WHEN Step 4 valid THEN user SHALL advance to Step 5

**Step 5: Review & Submit**
68. WHEN user loads Step 5 THEN success banner SHALL appear
69. WHEN user loads Step 5 THEN all entered data SHALL be displayed in review sections
70. WHEN user clicks Edit on any section THEN user SHALL navigate to corresponding step
71. WHEN user returns from edit THEN updated data SHALL be reflected in review
72. WHEN user clicks "Send RFQ" THEN final validation SHALL run
73. WHEN all valid THEN RFQ SHALL be created in backend
74. WHEN RFQ created THEN user SHALL navigate to Email Preview screen
75. WHEN backend error THEN error message SHALL appear and user stays on Step 5

**Navigation**
76. WHEN user on Step 1 THEN Previous button SHALL not appear
77. WHEN user on Step 2-5 THEN Previous button SHALL appear
78. WHEN user clicks Previous THEN user SHALL go back one step
79. WHEN user clicks Previous THEN all data SHALL be preserved
80. WHEN user on Step 1-4 THEN Next button text SHALL be "Next"
81. WHEN user on Step 5 THEN Next button text SHALL be "Send RFQ"
82. WHEN step changes THEN page SHALL scroll to top
83. WHEN step changes THEN progress bar SHALL update
84. WHEN step changes THEN step badge SHALL update

### 9.2 Flexibility Criteria

1. WHEN buyer selects 1 part THEN 1 description field SHALL appear
2. WHEN buyer selects 5 parts THEN 5 description fields SHALL appear
3. WHEN buyer selects 50 parts THEN 50 description fields SHALL appear
4. WHEN buyer adds 1 volume scenario THEN 1 scenario row SHALL appear
5. WHEN buyer adds 10 volume scenarios THEN 10 scenario rows SHALL appear
6. WHEN buyer adds 3 suppliers THEN 3 supplier rows SHALL appear
7. WHEN buyer adds 50 suppliers THEN 50 supplier rows SHALL appear
8. WHEN buyer selects 3 requirements THEN 3 requirements SHALL be checked
9. WHEN buyer selects 9 requirements THEN 9 requirements SHALL be checked
10. WHEN buyer changes part selection THEN description fields SHALL update dynamically

### 9.3 UX Criteria

1. Screen SHALL load within 2 seconds
2. All required fields SHALL be clearly marked with asterisk (*)
3. Error messages SHALL be clear and actionable
4. Error messages SHALL appear immediately on validation failure
5. Success states SHALL be clearly indicated (green banner, checkmarks)
6. Progress bar SHALL accurately reflect completion percentage
7. Step transitions SHALL be smooth with scroll to top
8. Dropdown SHALL close when clicking outside
9. File upload area SHALL show hover state
10. Buttons SHALL show hover and disabled states
11. Form SHALL be responsive on desktop and tablet (min 768px)
12. Text inputs SHALL have appropriate placeholders
13. Dropdowns SHALL have appropriate default values
14. Checkboxes SHALL have clear labels and descriptions
15. Date picker SHALL show calendar interface
16. Character counters SHALL update in real-time
17. Formatted numbers SHALL display with commas
18. Validation SHALL occur on field blur (not on every keystroke)
19. Loading states SHALL appear during async operations
20. Success messages SHALL appear after successful actions
21. Warning messages SHALL use yellow background
22. Error messages SHALL use red background
23. Info messages SHALL use blue background
24. Icons SHALL be consistent with design system
25. Spacing SHALL be consistent throughout form
26. Typography SHALL follow design system hierarchy
27. Colors SHALL follow design system palette
28. Buttons SHALL have consistent sizing and spacing
29. Form SHALL be keyboard accessible
30. Focus states SHALL be clearly visible

### 9.4 Performance Criteria

1. Initial page load SHALL complete within 2 seconds
2. Step transitions SHALL complete within 500ms
3. Dropdown open/close SHALL complete within 200ms
4. Search filtering SHALL complete within 100ms
5. Form validation SHALL complete within 500ms
6. File upload SHALL show progress indicator
7. Large file uploads (>10MB) SHALL show percentage progress
8. Backend submission SHALL complete within 5 seconds
9. Error recovery SHALL be immediate (no page reload required)
10. Form state updates SHALL be immediate (no lag)
11. Scroll to top SHALL be smooth (not instant jump)
12. Unit converter calculations SHALL be instant
13. Number formatting SHALL be instant
14. Character counting SHALL be instant
15. Real-time search SHALL not lag with 100+ parts

### 9.5 Accessibility Criteria

1. All form fields SHALL have associated labels
2. All buttons SHALL have descriptive text or aria-labels
3. All icons SHALL have aria-labels or titles
4. Error messages SHALL be announced to screen readers
5. Success messages SHALL be announced to screen readers
6. Form SHALL be navigable via keyboard only
7. Tab order SHALL be logical and sequential
8. Focus indicators SHALL be clearly visible
9. Color SHALL not be the only indicator of state
10. Text SHALL have sufficient contrast (WCAG AA)
11. Interactive elements SHALL have minimum 44x44px touch target
12. Dropdown SHALL be keyboard accessible (arrow keys, enter, escape)
13. Date picker SHALL be keyboard accessible
14. File upload SHALL be keyboard accessible
15. Checkboxes SHALL be keyboard accessible (space to toggle)

### 9.6 Security Criteria

1. Project ID SHALL be validated for uniqueness
2. Email addresses SHALL be validated for format
3. File uploads SHALL be validated for type and size
4. File uploads SHALL be scanned for malware (backend)
5. User input SHALL be sanitized to prevent XSS
6. Form data SHALL be transmitted over HTTPS
7. Sensitive data SHALL not be logged in browser console
8. Session SHALL timeout after 30 minutes of inactivity
9. User SHALL be warned before session timeout
10. Draft data SHALL not persist after logout
11. File uploads SHALL be stored securely (encrypted S3)
12. Email addresses SHALL not be exposed in client-side logs
13. API calls SHALL include authentication tokens
14. CSRF protection SHALL be implemented
15. Rate limiting SHALL prevent form spam



## 10. Edge Cases & Error Scenarios

### 10.1 Edge Cases

**Empty BOM:**
- **Scenario:** User tries to create RFQ but project has no parts in BOM
- **Expected Behavior:** 
  - Part dropdown shows "No parts available"
  - Message: "Please add parts to your project BOM first"
  - Link to Project Summary to add parts
  - Cannot proceed to next step

**Single Part in BOM:**
- **Scenario:** Project has only 1 part in BOM
- **Expected Behavior:** 
  - Dropdown shows only 1 part
  - Part can be selected
  - Form works normally with 1 part

**Maximum Parts Selected (50):**
- **Scenario:** User selects 50 parts (maximum allowed)
- **Expected Behavior:** 
  - All 50 parts show as badges
  - All 50 description fields appear
  - Dropdown still works but shows "Maximum 50 parts selected" message
  - Cannot select more parts

**Duplicate Part Selection Attempt:**
- **Scenario:** User tries to select same part twice
- **Expected Behavior:** 
  - Second click deselects the part (toggle behavior)
  - No duplicate parts in selection

**Very Long Part Names:**
- **Scenario:** Part name exceeds 100 characters
- **Expected Behavior:** 
  - Part name truncates with ellipsis in dropdown
  - Full name shows on hover (tooltip)
  - Badge shows truncated name
  - Full name stored in data

**Very Long Part Descriptions:**
- **Scenario:** User enters 500+ character description
- **Expected Behavior:** 
  - Input stops accepting characters at 500
  - Error message: "Description exceeds 500 characters"
  - Character counter shows "500/500"

**Zero Volume Scenario:**
- **Scenario:** User enters 0 or negative volume
- **Expected Behavior:** 
  - Error message: "Volume must be greater than 0"
  - Cannot proceed to next step
  - Field highlighted in red

**Very Large Volume (Billions):**
- **Scenario:** User enters volume like 1,000,000,000
- **Expected Behavior:** 
  - Number formatted with commas: "1,000,000,000"
  - Accepted if valid number
  - No upper limit (business decision)

**Unit Conversion with Same Units:**
- **Scenario:** User tries to convert pieces to pieces
- **Expected Behavior:** 
  - Converter shows error: "Target unit must be different from source unit"
  - Cannot apply conversion

**Unit Conversion with Zero Factor:**
- **Scenario:** User enters 0 as conversion factor
- **Expected Behavior:** 
  - Error message: "Conversion factor must be greater than 0"
  - Cannot apply conversion

**No Suppliers in System:**
- **Scenario:** User has no suppliers in their supplier list
- **Expected Behavior:** 
  - Step 2 shows empty state
  - "Add Another Supplier" button available
  - User must manually add at least 3 suppliers

**Duplicate Supplier Emails:**
- **Scenario:** User enters same email for multiple suppliers
- **Expected Behavior:** 
  - Warning message: "Duplicate email detected: [email]"
  - Allowed but warned (supplier might have multiple contacts)

**Invalid Email Format:**
- **Scenario:** User enters "notanemail" without @ symbol
- **Expected Behavior:** 
  - Error message: "Invalid email format"
  - Field highlighted in red
  - Cannot proceed to next step

**All Requirements Unchecked:**
- **Scenario:** User tries to uncheck all requirements
- **Expected Behavior:** 
  - Required items cannot be unchecked
  - At least 3 required items always selected
  - Error if somehow <3: "At least 3 required items must be selected"

**Past Deadline Date:**
- **Scenario:** User selects yesterday's date
- **Expected Behavior:** 
  - Error message: "Response deadline must be in the future"
  - Field highlighted in red
  - Cannot proceed to next step

**Deadline Too Soon (< 3 days):**
- **Scenario:** User selects tomorrow's date
- **Expected Behavior:** 
  - Error message: "Response deadline must be at least 3 days from today"
  - Field highlighted in red
  - Cannot proceed to next step

**Very Long Additional Notes:**
- **Scenario:** User pastes 2000 character text into notes
- **Expected Behavior:** 
  - Text truncated at 1000 characters
  - Error message: "Additional notes exceed 1000 characters"
  - Character counter shows "1000/1000"

**File Upload: Wrong Type:**
- **Scenario:** User tries to upload .exe file
- **Expected Behavior:** 
  - Error message: "File type not supported. Please upload PDF, Excel, Word, or Image files."
  - File not added to list

**File Upload: Too Large:**
- **Scenario:** User uploads 100MB file
- **Expected Behavior:** 
  - Error message: "File size exceeds 50MB limit"
  - File not added to list

**File Upload: Total Size Exceeded:**
- **Scenario:** User uploads 10 files totaling 60MB
- **Expected Behavior:** 
  - Error message: "Total file size exceeds 50MB limit"
  - Last file not added
  - User must remove some files first

**File Upload: Too Many Files:**
- **Scenario:** User tries to upload 11th file
- **Expected Behavior:** 
  - Error message: "Maximum 10 files allowed"
  - File not added to list

**Browser Back Button:**
- **Scenario:** User clicks browser back button while on Step 3
- **Expected Behavior:** 
  - Warning dialog: "You have unsaved changes. Are you sure you want to leave?"
  - If confirmed: Navigate away, lose all data
  - If cancelled: Stay on current step

**Session Timeout:**
- **Scenario:** User leaves form open for 30+ minutes
- **Expected Behavior:** 
  - Warning appears at 25 minutes: "Your session will expire in 5 minutes"
  - At 30 minutes: Session expires, redirect to login
  - Data lost (no auto-save in MVP)

**Network Error on Submit:**
- **Scenario:** Backend API is down when user clicks Send RFQ
- **Expected Behavior:** 
  - Error message: "Failed to send RFQ. Please check your connection and try again."
  - User stays on Step 5
  - Can retry submission
  - Data preserved

**Partial Backend Response:**
- **Scenario:** Backend creates RFQ but fails to send emails
- **Expected Behavior:** 
  - Success message: "RFQ created but email sending failed. You can resend from RFQ list."
  - Navigate to RFQ list or Email Preview
  - RFQ marked as "draft" status

### 10.2 Error Scenarios

**Validation Error: Missing Required Field:**
- **Trigger:** User clicks Next without filling required field
- **Response:** 
  - Next button disabled
  - Error message appears below field
  - Field highlighted in red
  - Focus moves to first error field

**Validation Error: Invalid Format:**
- **Trigger:** User enters invalid email format
- **Response:** 
  - Error message: "Invalid email format"
  - Field highlighted in red
  - Cannot proceed until fixed

**Validation Error: Business Rule Violation:**
- **Trigger:** User selects parts not in BOM
- **Response:** 
  - Red warning banner appears
  - Lists invalid parts
  - Provides link to fix (Project Summary)
  - Cannot proceed until fixed

**Backend Error: API Timeout:**
- **Trigger:** Backend takes >30 seconds to respond
- **Response:** 
  - Error message: "Request timed out. Please try again."
  - User stays on current step
  - Can retry action

**Backend Error: Server Error (500):**
- **Trigger:** Backend returns 500 error
- **Response:** 
  - Error message: "Server error. Please try again later or contact support."
  - User stays on current step
  - Error logged for debugging

**Backend Error: Unauthorized (401):**
- **Trigger:** User session expired
- **Response:** 
  - Error message: "Your session has expired. Please log in again."
  - Redirect to login page
  - Data lost (no auto-save)

**Backend Error: Forbidden (403):**
- **Trigger:** User doesn't have permission to create RFQ
- **Response:** 
  - Error message: "You don't have permission to create RFQs. Please contact your administrator."
  - User stays on current step
  - Cannot proceed

**Backend Error: Conflict (409):**
- **Trigger:** Project ID already exists
- **Response:** 
  - Error message: "Project ID already exists. Please use a different ID."
  - Focus moves to Project ID field
  - User must change ID

**File Upload Error: Network Failure:**
- **Trigger:** Network drops during file upload
- **Response:** 
  - Error message: "File upload failed. Please try again."
  - File not added to list
  - Can retry upload

**File Upload Error: Malware Detected:**
- **Trigger:** Backend detects malware in uploaded file
- **Response:** 
  - Error message: "File contains malware and cannot be uploaded."
  - File not added to list
  - Security team notified

**Data Loss: Browser Crash:**
- **Trigger:** Browser crashes while user is filling form
- **Response:** 
  - All data lost (no auto-save in MVP)
  - User must start over
  - Future enhancement: Auto-save drafts

**Data Loss: Tab Closed:**
- **Trigger:** User accidentally closes tab
- **Response:** 
  - Browser shows warning: "Changes you made may not be saved"
  - If confirmed: Data lost
  - If cancelled: Tab stays open



## 11. Backend API Requirements

### 11.1 API Endpoints

**GET /api/projects/{projectId}/parts**
- **Purpose:** Fetch all parts in project BOM for dropdown
- **Request:**
  - Method: GET
  - Headers: Authorization token
  - Path params: projectId
- **Response:**
  - Status: 200 OK
  - Body:
```json
{
  "parts": [
    {
      "partName": "ALU-BRACKET-001",
      "material": "Aluminum 6061",
      "quantity": 50000,
      "description": "Aluminum mounting bracket for door assembly",
      "status": "existing",
      "weight": 0.45
    }
  ]
}
```
- **Error Responses:**
  - 401: Unauthorized
  - 404: Project not found
  - 500: Server error

**GET /api/suppliers**
- **Purpose:** Fetch user's supplier list for pre-population
- **Request:**
  - Method: GET
  - Headers: Authorization token
- **Response:**
  - Status: 200 OK
  - Body:
```json
{
  "suppliers": [
    {
      "id": "SUP-001",
      "name": "Supplier A",
      "email": "supplier-a@company.com",
      "previousRFQs": 12
    }
  ]
}
```
- **Error Responses:**
  - 401: Unauthorized
  - 500: Server error

**POST /api/rfqs**
- **Purpose:** Create new RFQ and send to suppliers
- **Request:**
  - Method: POST
  - Headers: Authorization token, Content-Type: application/json
  - Body:
```json
{
  "projectId": "PRJ-2025-001",
  "rfqId": "RFQ-2025-047",
  "partNames": ["ALU-BRACKET-001", "ALU-BRACKET-002"],
  "partDescriptions": {
    "ALU-BRACKET-001": "Aluminum mounting bracket for door assembly",
    "ALU-BRACKET-002": "Aluminum mounting bracket variant 2"
  },
  "volumeScenarios": [
    {
      "volume": "50000",
      "unit": "pieces",
      "conversion": null
    },
    {
      "volume": "100000",
      "unit": "pieces",
      "conversion": null
    }
  ],
  "commodityType": "Stamping",
  "suppliers": [
    {
      "name": "Supplier A",
      "email": "supplier-a@company.com",
      "selected": true
    }
  ],
  "requirements": {
    "material": true,
    "process": true,
    "tooling": true,
    "logistics": true,
    "terms": true,
    "capacity": true,
    "quality": false,
    "prototype": false,
    "sustainability": false
  },
  "responseDeadline": "2025-01-15",
  "additionalNotes": "Please provide detailed breakdown",
  "languagePreference": "English",
  "attachments": ["file-id-1", "file-id-2"]
}
```
- **Response:**
  - Status: 201 Created
  - Body:
```json
{
  "rfqId": "RFQ-2025-047",
  "status": "sent",
  "emailsSent": 5,
  "createdAt": "2025-01-02T10:30:00Z"
}
```
- **Error Responses:**
  - 400: Validation error (invalid data)
  - 401: Unauthorized
  - 409: RFQ ID already exists
  - 500: Server error

**POST /api/files/upload**
- **Purpose:** Upload attachment files
- **Request:**
  - Method: POST
  - Headers: Authorization token, Content-Type: multipart/form-data
  - Body: FormData with files
- **Response:**
  - Status: 200 OK
  - Body:
```json
{
  "files": [
    {
      "fileId": "file-id-1",
      "fileName": "BOM_DoorAssembly_v2.xlsx",
      "fileSize": 1024000,
      "uploadedAt": "2025-01-02T10:25:00Z"
    }
  ]
}
```
- **Error Responses:**
  - 400: Invalid file type or size
  - 401: Unauthorized
  - 413: File too large
  - 500: Server error

**GET /api/rfqs/{rfqId}**
- **Purpose:** Fetch existing RFQ data (for clone/edit)
- **Request:**
  - Method: GET
  - Headers: Authorization token
  - Path params: rfqId
- **Response:**
  - Status: 200 OK
  - Body: Same structure as POST /api/rfqs request body
- **Error Responses:**
  - 401: Unauthorized
  - 404: RFQ not found
  - 500: Server error

**PUT /api/rfqs/{rfqId}**
- **Purpose:** Update existing RFQ (draft mode)
- **Request:**
  - Method: PUT
  - Headers: Authorization token, Content-Type: application/json
  - Path params: rfqId
  - Body: Same structure as POST /api/rfqs
- **Response:**
  - Status: 200 OK
  - Body: Updated RFQ data
- **Error Responses:**
  - 400: Validation error
  - 401: Unauthorized
  - 404: RFQ not found
  - 500: Server error

### 11.2 Data Structures

**RFQ Entity (DynamoDB):**
```json
{
  "PK": "PROJECT#PRJ-2025-001",
  "SK": "RFQ#RFQ-2025-047",
  "rfqId": "RFQ-2025-047",
  "projectId": "PRJ-2025-001",
  "status": "sent",
  "createdBy": "sarah.chen@company.com",
  "createdAt": "2025-01-02T10:30:00Z",
  "updatedAt": "2025-01-02T10:30:00Z",
  "version": 1,
  "partNames": ["ALU-BRACKET-001", "ALU-BRACKET-002"],
  "partDescriptions": {
    "ALU-BRACKET-001": "Aluminum mounting bracket for door assembly",
    "ALU-BRACKET-002": "Aluminum mounting bracket variant 2"
  },
  "volumeScenarios": [...],
  "commodityType": "Stamping",
  "suppliers": [...],
  "requirements": {...},
  "responseDeadline": "2025-01-15",
  "additionalNotes": "Please provide detailed breakdown",
  "languagePreference": "English",
  "attachments": ["file-id-1", "file-id-2"],
  "emailsSent": 5,
  "emailsSentAt": "2025-01-02T10:30:00Z"
}
```

**Part Entity (from BOM):**
```json
{
  "PK": "PROJECT#PRJ-2025-001",
  "SK": "PART#ALU-BRACKET-001",
  "partName": "ALU-BRACKET-001",
  "material": "Aluminum 6061",
  "quantity": 50000,
  "description": "Aluminum mounting bracket for door assembly",
  "status": "existing",
  "weight": 0.45,
  "createdAt": "2025-01-01T08:00:00Z"
}
```

**Supplier Entity:**
```json
{
  "PK": "USER#sarah.chen@company.com",
  "SK": "SUPPLIER#SUP-001",
  "supplierId": "SUP-001",
  "name": "Supplier A",
  "email": "supplier-a@company.com",
  "previousRFQs": 12,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**File Entity (S3 + DynamoDB):**
```json
{
  "PK": "RFQ#RFQ-2025-047",
  "SK": "FILE#file-id-1",
  "fileId": "file-id-1",
  "fileName": "BOM_DoorAssembly_v2.xlsx",
  "fileSize": 1024000,
  "fileType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "s3Key": "rfqs/RFQ-2025-047/BOM_DoorAssembly_v2.xlsx",
  "uploadedBy": "sarah.chen@company.com",
  "uploadedAt": "2025-01-02T10:25:00Z"
}
```

### 11.3 DynamoDB Graph Relationships

**Project → RFQ:**
- PK: PROJECT#PRJ-2025-001
- SK: RFQ#RFQ-2025-047
- Relationship: One project has many RFQs

**Project → Part:**
- PK: PROJECT#PRJ-2025-001
- SK: PART#ALU-BRACKET-001
- Relationship: One project has many parts (BOM)

**RFQ → File:**
- PK: RFQ#RFQ-2025-047
- SK: FILE#file-id-1
- Relationship: One RFQ has many files (attachments)

**User → Supplier:**
- PK: USER#sarah.chen@company.com
- SK: SUPPLIER#SUP-001
- Relationship: One user has many suppliers

**RFQ → Quote (future):**
- PK: RFQ#RFQ-2025-047
- SK: QUOTE#supplier-a@company.com
- Relationship: One RFQ has many quotes (from suppliers)

### 11.4 Validation Rules (Backend)

**RFQ ID Validation:**
- Must be unique across all RFQs
- Format: RFQ-YYYY-NNN
- Auto-generated if not provided

**Part Names Validation:**
- All parts must exist in project BOM
- Min 1 part, max 50 parts
- Part names must be valid strings

**Volume Scenarios Validation:**
- Min 1 scenario, max 10 scenarios
- Volume must be positive integer
- Unit must be one of: pieces, kg, liters, units

**Suppliers Validation:**
- Min 3 suppliers, max 50 suppliers
- Each supplier must have name and email
- Email must be valid format
- At least 3 suppliers must be selected

**Requirements Validation:**
- At least 3 required items must be true
- Required items: material, process, tooling, logistics, terms, capacity

**Deadline Validation:**
- Must be future date
- Must be at least 3 days from today

**Additional Notes Validation:**
- Max 1000 characters

**Attachments Validation:**
- Max 10 files
- Max 50MB total size
- Allowed types: PDF, Excel, Word, Images
- Files must be scanned for malware

### 11.5 Email Generation

**Email Service:**
- AWS SES (Simple Email Service)
- Send from: purchasingrfq@companyname.com
- CC: sarah.chen@company.com (buyer)
- BCC: optiroq-tracking@companyname.com (for tracking)

**Email Template:**
- Subject: `RFQ ${rfqId}: ${firstPartDescription}`
- Body: Generated from template with all RFQ details
- Attachments: All uploaded files
- Headers: X-Optiroq-Project-ID, X-Optiroq-RFQ-ID (for tracking)

**Email Tracking:**
- Track sent status
- Track open rate (pixel tracking)
- Track click rate (link tracking)
- Track reply rate (email monitoring)



## 12. Notes & Considerations

### 12.1 Design Decisions

**Why 5 Steps?**
- **Rationale:** Breaks complex form into manageable chunks
- **Alternative considered:** Single long form (rejected - too overwhelming)
- **Alternative considered:** 3 steps (rejected - steps too complex)
- **Decision:** 5 steps provides good balance of simplicity and organization

**Why Multi-Part Support?**
- **Rationale:** Real-world RFQs often include multiple related parts
- **Business value:** Package pricing, related parts sourcing
- **User feedback:** "I always quote 2-5 parts together"
- **Decision:** Support 1-50 parts per RFQ

**Why Minimum 3 Suppliers?**
- **Rationale:** Competitive bidding requires multiple quotes
- **Industry standard:** 3-5 suppliers for competitive RFQ
- **Business rule:** Less than 3 is not competitive
- **Decision:** Enforce minimum 3 suppliers

**Why Pre-Select Required Items?**
- **Rationale:** Ensures buyers don't forget critical information
- **User feedback:** "I always need material, process, and tooling costs"
- **Business rule:** These are mandatory for fair comparison
- **Decision:** Pre-select and lock required items

**Why Unit Converter?**
- **Rationale:** Suppliers use different units (pieces, kg, liters)
- **User pain point:** Manual conversion is error-prone
- **Business value:** Accurate volume communication
- **Decision:** Built-in converter with conversion tracking

**Why Part Descriptions?**
- **Rationale:** Part names alone are not descriptive enough
- **User feedback:** "Suppliers need context to understand what they're quoting"
- **Business value:** Reduces clarification emails
- **Decision:** 1:1 part-to-description relationship, sourced from BOM

**Why No Auto-Save?**
- **Rationale:** MVP scope limitation
- **Technical complexity:** Requires draft management, conflict resolution
- **User impact:** Medium (users can complete form in 5-10 minutes)
- **Decision:** Defer to post-MVP, add warning about data loss

**Why Inline Unit Converter?**
- **Rationale:** Keeps user in context, no modal popup
- **UX benefit:** Faster workflow, less context switching
- **Decision:** Show converter inline below scenario row

### 12.2 Technical Considerations

**State Management:**
- **Approach:** React useState for form state
- **Rationale:** Simple, no need for Redux/Context for single-screen form
- **Consideration:** May need Context if form grows more complex

**Validation Strategy:**
- **Approach:** Real-time validation on blur, step validation on Next
- **Rationale:** Balance between immediate feedback and not annoying user
- **Consideration:** Some fields (email) validate on blur, others (required) on Next

**File Upload Strategy:**
- **Approach:** Upload files immediately, store IDs, reference in RFQ
- **Rationale:** Prevents large payload on final submit, better UX
- **Consideration:** Need cleanup for abandoned uploads

**Dropdown Performance:**
- **Approach:** Virtualization if >100 parts
- **Rationale:** Large BOMs (100+ parts) can slow down rendering
- **Consideration:** Monitor performance, implement if needed

**Search Performance:**
- **Approach:** Client-side filtering for <1000 parts
- **Rationale:** Fast enough for MVP scope
- **Consideration:** Move to backend search if BOMs exceed 1000 parts

**Number Formatting:**
- **Approach:** Format on display, parse on submit
- **Rationale:** User-friendly display, accurate calculations
- **Consideration:** Handle international formats (comma vs period)

**Date Handling:**
- **Approach:** Use native date picker, store as ISO 8601
- **Rationale:** Browser-native, accessible, consistent
- **Consideration:** Timezone handling (store UTC, display local)

**Email Generation:**
- **Approach:** Backend generates email from template
- **Rationale:** Consistent formatting, easier to update
- **Consideration:** Preview email before sending (Screen 16)

### 12.3 Future Enhancements

**Auto-Save Drafts:**
- **Description:** Automatically save form progress every 30 seconds
- **Benefit:** Prevents data loss from browser crashes, session timeouts
- **Complexity:** Medium (requires draft management, conflict resolution)
- **Priority:** High (user-requested feature)

**Template Library:**
- **Description:** Save RFQ configurations as templates for reuse
- **Benefit:** Faster RFQ creation for similar projects
- **Complexity:** Medium (requires template storage, management UI)
- **Priority:** Medium

**Supplier Groups:**
- **Description:** Pre-defined supplier groups (e.g., "Stamping Suppliers")
- **Benefit:** Faster supplier selection
- **Complexity:** Low (requires group management UI)
- **Priority:** Medium

**Smart Defaults:**
- **Description:** AI suggests volume scenarios, requirements based on commodity
- **Benefit:** Faster form completion, better defaults
- **Complexity:** High (requires ML model, training data)
- **Priority:** Low (nice-to-have)

**Multi-Language Email Templates:**
- **Description:** Generate emails in supplier's preferred language
- **Benefit:** Better supplier engagement, fewer misunderstandings
- **Complexity:** Medium (requires translation service, templates)
- **Priority:** Medium (already have language selector)

**Collaborative Editing:**
- **Description:** Multiple buyers can edit same RFQ simultaneously
- **Benefit:** Team collaboration on complex RFQs
- **Complexity:** High (requires real-time sync, conflict resolution)
- **Priority:** Low (edge case)

**RFQ Approval Workflow:**
- **Description:** Require manager approval before sending RFQ
- **Benefit:** Governance, quality control
- **Complexity:** Medium (requires approval workflow, notifications)
- **Priority:** Medium (enterprise feature)

**Bulk Part Import:**
- **Description:** Import parts from Excel/CSV instead of selecting one-by-one
- **Benefit:** Faster for large RFQs (10+ parts)
- **Complexity:** Low (similar to BOM upload)
- **Priority:** Medium

**Part Grouping:**
- **Description:** Group related parts (e.g., "Left Bracket", "Right Bracket")
- **Benefit:** Better organization for complex RFQs
- **Complexity:** Medium (requires grouping UI, data structure)
- **Priority:** Low

**Conditional Requirements:**
- **Description:** Show/hide requirements based on commodity type
- **Benefit:** More relevant requirements per commodity
- **Complexity:** Medium (requires conditional logic, configuration)
- **Priority:** Low

### 12.4 Known Limitations

**No Draft Auto-Save:**
- **Limitation:** Form data lost if browser crashes or session expires
- **Workaround:** Complete form in one session (5-10 minutes)
- **Mitigation:** Add warning about data loss, session timeout warning
- **Future:** Implement auto-save drafts

**No Offline Support:**
- **Limitation:** Requires internet connection to use
- **Workaround:** Ensure stable connection before starting
- **Mitigation:** Show clear error messages if connection lost
- **Future:** Consider PWA with offline support

**No Undo/Redo:**
- **Limitation:** Cannot undo changes within form
- **Workaround:** Use Previous button to go back and edit
- **Mitigation:** Confirmation dialogs for destructive actions
- **Future:** Implement undo/redo stack

**No Field-Level Permissions:**
- **Limitation:** All buyers see same fields, no role-based customization
- **Workaround:** Admin configures Master Field List for organization
- **Mitigation:** Keep fields relevant to all buyers
- **Future:** Implement role-based field visibility

**No Real-Time Collaboration:**
- **Limitation:** Only one user can edit RFQ at a time
- **Workaround:** Coordinate with team before editing
- **Mitigation:** Show "Last edited by" timestamp
- **Future:** Implement real-time collaboration

**Limited File Types:**
- **Limitation:** Only PDF, Excel, Word, Images supported
- **Workaround:** Convert other formats before uploading
- **Mitigation:** Clear error messages for unsupported types
- **Future:** Support more file types (CAD, ZIP, etc.)

**No Bulk Operations:**
- **Limitation:** Cannot create multiple RFQs at once
- **Workaround:** Create RFQs one at a time
- **Mitigation:** Clone existing RFQ for similar projects
- **Future:** Implement bulk RFQ creation

**No Version History:**
- **Limitation:** Cannot see previous versions of RFQ
- **Workaround:** Version number increments on edit
- **Mitigation:** Track version in data structure
- **Future:** Implement full version history with diff view

### 12.5 Dependencies

**Upstream Dependencies:**
- **Screen 8:** RFQ Method Selection (user selects creation method)
- **Screen 9:** Create From Scratch (provides initial project data)
- **Screen 10:** Clone Existing RFQ (provides pre-filled data)
- **Screen 11:** Clone Project (provides pre-filled data)
- **Screen 12:** Upload RFQ Files (provides LLM-extracted data)
- **Project BOM:** Must have parts in BOM to select
- **Supplier List:** Pre-populated from user's supplier database

**Downstream Dependencies:**
- **Screen 16:** Email Preview (receives form data for email generation)
- **Backend API:** Creates RFQ entity in DynamoDB
- **Email Service:** Sends RFQ emails to suppliers
- **File Storage:** Stores uploaded attachments in S3

**External Dependencies:**
- **AWS SES:** Email sending service
- **AWS S3:** File storage service
- **AWS DynamoDB:** Database for RFQ entities
- **Date Picker Library:** Browser-native or third-party
- **Unit Converter Component:** Custom component for unit conversion

### 12.6 Testing Considerations

**Unit Tests:**
- Validation functions (email, date, volume)
- Number formatting functions
- Calculation functions (progress, counts)
- State management logic

**Integration Tests:**
- API calls (GET parts, POST RFQ, upload files)
- Navigation between steps
- Form submission flow
- Error handling

**E2E Tests:**
- Complete RFQ creation flow (all 5 steps)
- Clone existing RFQ flow
- Upload files flow
- Validation error scenarios
- Network error scenarios

**Accessibility Tests:**
- Keyboard navigation
- Screen reader compatibility
- Focus management
- ARIA labels

**Performance Tests:**
- Large BOM (100+ parts) rendering
- Large supplier list (50+ suppliers) rendering
- File upload (large files)
- Search filtering performance

**Browser Compatibility:**
- Chrome (latest)
- Edge (latest)
- Firefox (latest)
- Safari (latest)

**Device Testing:**
- Desktop (1920x1080, 1366x768)
- Tablet (iPad, Android tablet)
- Mobile (responsive, but not primary use case)

### 12.7 Documentation Needs

**User Documentation:**
- How to create RFQ from scratch
- How to select parts from BOM
- How to add volume scenarios
- How to use unit converter
- How to select suppliers
- How to choose requirements
- What each requirement means
- How to set deadline
- How to review and submit

**Admin Documentation:**
- How to configure Master Field List
- How to manage supplier database
- How to configure email templates
- How to monitor RFQ creation metrics

**Developer Documentation:**
- Component architecture
- State management approach
- Validation logic
- API integration
- Error handling strategy
- Testing strategy

**API Documentation:**
- Endpoint specifications
- Request/response formats
- Error codes and messages
- Authentication requirements
- Rate limiting

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
- `.kiro/specs/detailed-screen-requirements/screens/08-rfq-method-selection.md` (Previous Screen)
- `.kiro/specs/detailed-screen-requirements/screens/16-email-preview.md` (Next Screen - TBD)

**Change Log:**
- v1.0 (Jan 2, 2026): Initial complete document with all 12 sections

