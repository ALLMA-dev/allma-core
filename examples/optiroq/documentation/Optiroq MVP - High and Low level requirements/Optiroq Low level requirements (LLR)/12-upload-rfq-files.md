# Upload RFQ Files

## 1. Overview
- **Screen ID:** SCR-012
- **Component File:** `src/app/components/UploadRFQFiles.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** High - LLM extracts data to dynamic fields

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** upload existing RFQ documents and have AI automatically extract the data  
**So that** I save time by not manually entering information that already exists in documents

### Related User Stories
- **US-MVP-02C:** Create RFQ from Uploaded Files (Auto-Parsing)
- **REQ-MVP-00A:** BOM Upload & Project Initialization (Enhanced)

## 3. Screen Purpose & Context

### Purpose
This screen allows buyers to upload existing RFQ documents (PPT, Excel, PDF) and have AI automatically extract and pre-fill RFQ data, providing:
- File upload interface for RFQ documents
- AI-powered data extraction from documents
- Confidence scores for extracted fields
- Pre-filled multi-step RFQ form
- Review and edit capability before sending
- Save ~4 minutes compared to manual entry

### Context
- **When user sees this:** 
  - After selecting "Upload RFQ Files" method from RFQ Method Selection
  - When user has existing RFQ documents (PPT, Excel, PDF)
  - Common method (20-30% of RFQs use this approach)
- **Why it exists:** 
  - Many buyers have existing RFQ documents they want to reuse
  - AI extraction saves time vs. manual data entry
  - Reduces errors from manual transcription
  - Leverages existing documentation
  - Key differentiator of the product
- **Position in journey:** 
  - After RFQ Method Selection
  - Before Email Preview (after completing form)
  - Alternative to Clone Existing or Create From Scratch

### Key Characteristics
- **Three-step process:** Upload → AI Extraction → Form Review
- **File upload:** Drag-and-drop or click to upload
- **AI extraction:** LLM analyzes document and extracts data
- **Confidence scores:** Shows extraction quality per field
- **Pre-filled form:** 5-step wizard with extracted data
- **Editable:** All fields can be reviewed and modified
- **Time savings:** ~4 minutes setup time


## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Title:** "Screen 8: RFQ Initiation - Method 1: Upload RFQ Files"
2. **Subtitle:** "Upload existing RFQ documents for automatic data extraction"

**Step 1: File Selection (uploadStep = 'select')**

**Upload Card:**
1. **Card Header**
   - Title: "Upload RFQ Documents"
   - Description: "Upload PPT, Excel, or PDF files containing RFQ information"

2. **Upload Zone**
   - Dashed border area (drag-and-drop)
   - Upload icon (size-12, gray-400)
   - Text: "Click to upload or drag and drop"
   - Supported formats message
   - "Select File" button (blue)

3. **Info Banner (Blue)**
   - FileText icon
   - Title: "What happens next?"
   - Bullet list explaining process

**Process Steps Card:**
1. **Three Steps Display**
   - Grid: 3 columns
   - Step 1: Upload (blue icon)
   - Step 2: Extract (purple icon, Loader2)
   - Step 3: Review & Send (green icon, CheckCircle2)

**Step 2: Processing (uploadStep = 'processing')**

**Processing Card:**
1. **Card Header**
   - Title: "Upload RFQ Documents"
   - Description: "AI is extracting data from your document..."
   - Badge: "Processing" with spinning loader

2. **Processing Display**
   - Large spinning loader (size-16, blue-600)
   - Title: "Processing Your Document"
   - File name display
   - Progress checklist:
     - Extracting project information (✓)
     - Identifying suppliers (spinner)
     - Parsing requirements (pending)

**Step 3: Form Review (uploadStep = 'form')**

**Extraction Success Banner (Step 1 only):**
- Green theme (green-50, green-200)
- CheckCircle2 icon
- Title: "Extraction Successful!"
- Message: Shows file name, average confidence, instructions

**Multi-Step Form Card:**
1. **Card Header**
   - Title: "Create New RFQ"
   - Description: "Project ID: {projectId}"
   - Badge: "Step X of 5"
   - Progress bar

2. **Step 1: Project Information**
   - Section title with confidence badge
   - Project ID field
   - Part Names field (searchable dropdown)
   - Selected parts badges
   - Part Descriptions (one per selected part)
   - Volume Scenarios (with unit converter)
   - Commodity Type dropdown
   - Attachments upload zone

3. **Step 2: Supplier Selection**
   - Section title with confidence badge
   - Supplier list (checkboxes)
   - Each supplier: Name, Email, Previous RFQs count
   - Add/Remove supplier buttons
   - Minimum 3 suppliers warning

4. **Step 3: Requirements Checklist**
   - Section title with confidence badge
   - Required items (blue box)
   - Optional items (gray box)
   - Each item: Checkbox + description

5. **Step 4: Deadline & Notes**
   - Response Deadline date picker
   - Email Language dropdown
   - Additional Notes textarea

6. **Step 5: Review & Submit**
   - Completion message (green box)
   - "Open in Outlook" button (blue, primary)
   - "Preview Email" button (outline)

**Navigation Buttons:**
- Back button (if step > 1)
- Save Draft button (disabled, TBD)
- Continue button (if step < 5)

**Demo Navigation Hint:**
- Blue info banner at bottom
- Explains demo navigation

### 4.2 Key UI Elements

**Page Header:**
- Title: text-3xl, font-bold, gray-900
- Subtitle: text-gray-600

**Upload Zone (Step 1):**
- Border: border-2, border-dashed, gray-300
- Hover: border-blue-400, bg-blue-50
- Padding: p-12
- Icon: Upload (size-12, gray-400)
- Title: text-lg, font-medium, gray-900
- Description: text-sm, gray-600
- Button: bg-blue-600, hover:bg-blue-700

**Info Banner (Blue):**
- Background: blue-50
- Border: blue-200
- Icon: FileText (size-5, blue-600)
- Title: font-semibold, blue-900
- List: text-sm, blue-800

**Process Steps Card:**
- Grid: 3 columns
- Icon containers: size-12, rounded-full, colored backgrounds
- Icons: size-6, colored
- Titles: font-semibold, gray-900
- Descriptions: text-sm, gray-600

**Processing Display:**
- Loader: size-16, blue-600, animate-spin
- Title: text-xl, font-bold, gray-900
- File name: font-medium
- Checklist items: text-sm, gray-700
- Icons: CheckCircle2 (green-600), Loader2 (blue-600, spinning)

**Extraction Success Banner:**
- Background: green-50
- Border: green-200
- Icon: CheckCircle2 (size-5, green-600)
- Title: font-semibold, green-900
- Message: text-sm, green-800

**Confidence Badges:**
- High (≥90%): bg-green-100, text-green-800, border-green-300
- Medium (80-89%): bg-yellow-100, text-yellow-800, border-yellow-300
- Low (<80%): bg-red-100, text-red-800, border-red-300
- Format: "High (95%)"

**Form Card:**
- Progress bar: Shows completion percentage
- Step badge: variant-outline
- Section titles: text-lg, font-semibold, gray-900

**Part Selection:**
- Dropdown: max-h-60, overflow-y-auto, shadow-lg
- Part items: hover:bg-gray-50, cursor-pointer
- Selected: bg-blue-50
- Badges: Existing (green), New (orange)

**Selected Parts Badges:**
- Valid: bg-blue-100, text-blue-800, border-blue-300
- Invalid: bg-red-100, text-red-800, border-red-300
- With X button to remove

**Validation Warning:**
- Background: red-50
- Border: red-200
- Icon: AlertTriangle (size-5, red-600)
- Button: "Go to Project Summary to Add Parts"

**Volume Scenarios:**
- Input: Formatted with commas
- Unit dropdown: 4 options (pieces, kg, liters, units)
- Converter button: ArrowLeftRight icon
- Remove button: X icon (if > 1 scenario)
- Conversion info: blue-50 box

**Supplier List:**
- Background: gray-50
- Checkbox + 3 inputs (Name, Email, Previous RFQs)
- Remove button (if > 3 suppliers)

**Requirements Checklist:**
- Required items: blue-50 box
- Optional items: gray-50 box
- Each item: Checkbox + title + description
- Tooling has "Critical" badge (red)

**Review & Submit:**
- Success message: green-50 box
- Primary button: bg-blue-600, h-auto, py-4
- Outline button: variant-outline, h-auto, py-4
- Button content: Icon + title + description

**Navigation Buttons:**
- Back: variant-outline, ChevronLeft icon
- Save Draft: disabled, opacity-50
- Continue: bg-blue-600, ChevronRight icon

### 4.3 Information Hierarchy

**Primary Information:**
- Upload status (select/processing/form)
- Extraction confidence scores
- Form step progress
- Required fields

**Secondary Information:**
- File name being processed
- Extraction progress details
- Field descriptions
- Supplier counts

**Tertiary Information:**
- Help text and placeholders
- Info banners
- Demo navigation hints
- Optional fields



## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| user_id | String | Authentication | Yes | UUID |
| session_id | String | System | Yes | UUID |
| project_id | String | Previous Screen | Yes | From Method Selection |

### 5.2 Upload State Fields
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| upload_step | Enum | System | Yes | "select", "processing", "form" |
| uploaded_file | String | User | No | File name |
| extraction_success | Boolean | System | No | Default: false |
| average_confidence | Number | LLM | No | 0-100 percentage |

### 5.3 Confidence Tracking Fields
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| field_confidence | Object | LLM | No | Key-value pairs, values 0-100 |
| projectId_confidence | Number | LLM | No | 0-100 percentage |
| partNames_confidence | Number | LLM | No | 0-100 percentage |
| partDescriptions_confidence | Number | LLM | No | 0-100 percentage |
| volumeScenarios_confidence | Number | LLM | No | 0-100 percentage |
| commodity_confidence | Number | LLM | No | 0-100 percentage |
| suppliers_confidence | Number | LLM | No | 0-100 percentage |
| requirements_confidence | Number | LLM | No | 0-100 percentage |

### 5.4 RFQ Form Fields (Core)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_id | String | LLM/User | Yes | Format: "RFQ-YYYY-NNN" |
| selected_parts | Array<String> | LLM/User | Yes | Part names from BOM |
| part_descriptions | Object | LLM/User | No | Key: part name, Value: description |
| volume_scenarios | Array<Object> | LLM/User | Yes | {volume, unit, conversion?} |
| commodity | Enum | LLM/User | Yes | Stamping, Machining, etc. |
| files | Array<String> | LLM/User | No | File names |
| suppliers | Array<Object> | LLM/User | Yes | {name, email, previousRFQs} |
| requirements | Object | LLM/User | Yes | Boolean flags for each requirement |
| deadline | Date | User | Yes | ISO 8601 date |
| language | Enum | User | Yes | english, german, chinese, etc. |
| notes | String | User | No | 0-1000 characters |

### 5.5 Form State Fields
| Field Name | Data Type | Purpose |
|------------|-----------|---------|
| current_step | Number | Current step in wizard (1-5) |
| part_search_query | String | Search query for part dropdown |
| show_part_dropdown | Boolean | Dropdown visibility state |
| show_converter_index | Number | Which volume scenario shows converter |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| progress | (current_step / 5) * 100 | current_step |
| has_invalid_parts | validation.invalid.length > 0 | selected_parts, BOM |
| average_confidence | AVG(field_confidence values) | field_confidence |
| mailto_link | Generated from form data | All form fields |



## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**Dynamic RFQ Attributes:**
- LLM extracts data to dynamic fields from Master Field List
- Extracted fields adapt based on document content
- Admin can configure which fields LLM should extract
- Buyer cannot add fields (only Admin can modify Master List)

**Supported File Formats:**
- PowerPoint: .ppt, .pptx
- Excel: .xls, .xlsx
- PDF: .pdf
- Admin can configure additional formats (future)

**Extraction Confidence Thresholds:**
- High confidence: ≥90%
- Medium confidence: 80-89%
- Low confidence: <80%
- Admin can configure thresholds

**Commodity Types:**
- Standard commodities: Stamping, Machining, Casting, Injection Molding, Forging, Welding, Assembly
- Admin can configure additional custom commodity types
- Dropdown adapts to configured types

**Requirements Checklist:**
- Required items: Material, Process, Tooling, Logistics, Terms, Capacity
- Optional items: Quality, Prototype, Sustainability
- Admin can configure additional requirements
- LLM attempts to extract requirement preferences from document

### 6.2 UI Adaptation Logic

**Upload Step Display:**
- Step 1 (select): Show upload zone and process steps
- Step 2 (processing): Show loading animation and progress
- Step 3 (form): Show multi-step wizard with extracted data

**Confidence Badge Display:**
- High (≥90%): Green badge
- Medium (80-89%): Yellow badge
- Low (<80%): Red badge
- No badge if confidence not available

**Extraction Success Banner:**
- Only shown on Step 1 of form
- Shows average confidence percentage
- Provides context about confidence badges

**Form Step Progression:**
- Step 1: Project Information (with confidence badges)
- Step 2: Supplier Selection (with confidence badges)
- Step 3: Requirements Checklist (with confidence badges)
- Step 4: Deadline & Notes
- Step 5: Review & Submit

**Part Validation:**
- Valid parts: Blue badges
- Invalid parts: Red badges with warning
- Link to Project Summary to add missing parts

**Volume Scenarios:**
- Minimum 1 scenario required
- Add/remove scenarios dynamically
- Unit converter available per scenario
- Conversion info displayed if applied

**Supplier List:**
- Minimum 3 suppliers recommended
- Add/remove suppliers dynamically
- Warning if < 3 suppliers

**Navigation Buttons:**
- Back: Shown if step > 1
- Save Draft: Disabled (TBD)
- Continue: Shown if step < 5
- Review buttons: Shown on step 5

### 6.3 LLM Integration

**Document Analysis:**
- LLM analyzes uploaded document structure
- Identifies document type (PPT, Excel, PDF)
- Extracts text, tables, and structured data
- Parses RFQ-specific information

**Data Extraction:**
- Project ID: Looks for RFQ/Project identifiers
- Part Names: Extracts from tables, lists, or text
- Part Descriptions: Extracts associated descriptions
- Volume Scenarios: Identifies quantity information
- Commodity: Infers from part descriptions or explicit mentions
- Suppliers: Extracts names and contact information
- Requirements: Identifies requested information types

**Confidence Scoring:**
- Each extracted field receives confidence score (0-100%)
- Based on:
  - Data structure clarity
  - Multiple confirmations in document
  - Pattern matching accuracy
  - Contextual validation
- Average confidence calculated across all fields

**Smart Defaults:**
- LLM suggests commodity type based on part descriptions
- LLM suggests volume scenarios based on historical patterns
- LLM pre-selects common requirements
- LLM formats data to match expected structure

**Fallback Behavior:**
- If LLM extraction fails: Show error, allow manual entry
- If confidence too low: Highlight fields for review
- If document format unsupported: Show error message
- System remains functional with manual entry



## 7. User Interactions

### 7.1 Primary Actions

**Action: Select File (Click Upload Zone)**
- **Trigger:** User clicks upload zone or "Select File" button
- **Behavior:**
  1. Open file picker dialog
  2. Filter to supported formats (.ppt, .pptx, .xls, .xlsx, .pdf)
  3. User selects file
  4. Set uploaded_file state
  5. Change upload_step to 'processing'
  6. Simulate/trigger LLM extraction
- **Validation:** File format must be supported
- **Success:** File uploaded, extraction begins
- **Error:** Display error toast if unsupported format
- **Navigation:** None (stays on screen, changes step)

**Action: Drag and Drop File**
- **Trigger:** User drags file over upload zone and drops
- **Behavior:**
  1. Detect file drop event
  2. Validate file format
  3. Set uploaded_file state
  4. Change upload_step to 'processing'
  5. Simulate/trigger LLM extraction
- **Validation:** File format must be supported
- **Success:** File uploaded, extraction begins
- **Error:** Display error toast if unsupported format
- **Navigation:** None (stays on screen, changes step)

**Action: LLM Extraction (Automatic)**
- **Trigger:** File uploaded, processing step begins
- **Behavior:**
  1. Send file to LLM for analysis
  2. Show processing animation
  3. Display progress checklist
  4. Receive extracted data with confidence scores
  5. Calculate average confidence
  6. Pre-fill form fields with extracted data
  7. Change upload_step to 'form'
  8. Set extraction_success to true
- **Validation:** None
- **Success:** Data extracted, form pre-filled
- **Error:** Display error, allow manual entry
- **Navigation:** None (stays on screen, changes step)

**Action: Navigate Form Steps (Continue)**
- **Trigger:** User clicks "Continue" button
- **Behavior:**
  1. Validate current step fields
  2. If valid: Increment current_step
  3. Scroll to top of page
  4. Update progress bar
- **Validation:** Step-specific validation
- **Success:** Move to next step
- **Error:** Display validation errors, stay on step
- **Navigation:** None (stays on screen, changes step)

**Action: Navigate Form Steps (Back)**
- **Trigger:** User clicks "Back" button
- **Behavior:**
  1. Decrement current_step
  2. Scroll to top of page
  3. Update progress bar
- **Validation:** None
- **Success:** Move to previous step
- **Error:** N/A
- **Navigation:** None (stays on screen, changes step)

**Action: Select Parts from BOM**
- **Trigger:** User types in part search field or clicks dropdown
- **Behavior:**
  1. Show part dropdown
  2. Filter parts by search query
  3. User clicks part to select/deselect
  4. Update selected_parts array
  5. Update part_descriptions object
  6. Show selected parts as badges
  7. Validate parts against BOM
- **Validation:** Parts must exist in BOM
- **Success:** Parts selected, badges displayed
- **Error:** Show warning if parts not in BOM
- **Navigation:** None (stays on screen)

**Action: Edit Part Description**
- **Trigger:** User types in part description field
- **Behavior:**
  1. Update part_descriptions object
  2. Show warning if description missing
- **Validation:** None (optional field)
- **Success:** Description updated
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Add/Edit Volume Scenario**
- **Trigger:** User types in volume field or changes unit
- **Behavior:**
  1. Format volume with commas
  2. Update volume_scenarios array
  3. Validate positive number
- **Validation:** Must be positive number
- **Success:** Volume scenario updated
- **Error:** Display error if invalid
- **Navigation:** None (stays on screen)

**Action: Open Unit Converter**
- **Trigger:** User clicks converter button (ArrowLeftRight icon)
- **Behavior:**
  1. Set show_converter_index to current scenario index
  2. Display UnitConverter component inline
  3. User performs conversion
  4. Apply conversion to scenario
  5. Update volume and unit
  6. Show conversion info
  7. Close converter
- **Validation:** None
- **Success:** Conversion applied
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Add/Remove Volume Scenario**
- **Trigger:** User clicks "Add Scenario" or X button
- **Behavior:**
  1. Add: Append new scenario to array
  2. Remove: Filter out scenario from array
  3. Update volume_scenarios array
- **Validation:** Minimum 1 scenario required
- **Success:** Scenario added/removed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Select/Edit Suppliers**
- **Trigger:** User checks/unchecks supplier or edits fields
- **Behavior:**
  1. Update suppliers array
  2. Validate minimum 3 suppliers
  3. Show warning if < 3
- **Validation:** Minimum 3 suppliers recommended
- **Success:** Suppliers updated
- **Error:** Show warning if < 3
- **Navigation:** None (stays on screen)

**Action: Add/Remove Supplier**
- **Trigger:** User clicks "Add Another Supplier" or X button
- **Behavior:**
  1. Add: Append new supplier to array
  2. Remove: Filter out supplier from array
  3. Update suppliers array
- **Validation:** Minimum 3 suppliers recommended
- **Success:** Supplier added/removed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Toggle Requirements**
- **Trigger:** User checks/unchecks requirement checkbox
- **Behavior:**
  1. Update requirements object
  2. Toggle boolean flag
- **Validation:** None
- **Success:** Requirement toggled
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Set Deadline and Language**
- **Trigger:** User selects date or language
- **Behavior:**
  1. Update deadline or language state
  2. Validate date is in future
- **Validation:** Deadline must be future date
- **Success:** Deadline/language set
- **Error:** Display error if past date
- **Navigation:** None (stays on screen)

**Action: Open in Outlook**
- **Trigger:** User clicks "Open in Outlook" button (Step 5)
- **Behavior:**
  1. Generate mailto link with all form data
  2. Open default email client
  3. Pre-fill email with RFQ content
- **Validation:** All required fields must be filled
- **Success:** Email client opens with pre-filled content
- **Error:** N/A
- **Navigation:** Opens email client (external)

**Action: Preview Email**
- **Trigger:** User clicks "Preview Email" button (Step 5)
- **Behavior:**
  1. Navigate to Email Preview screen
  2. Pass all form data as parameters
- **Validation:** All required fields must be filled
- **Success:** Navigate to Email Preview
- **Error:** N/A
- **Navigation:** Upload RFQ Files → Email Preview

### 7.2 Secondary Actions

**Action: View Confidence Badge**
- **Trigger:** User views field with confidence badge
- **Behavior:**
  - Display badge with color and percentage
  - Provide visual indication of extraction quality
- **Validation:** None
- **Success:** Badge displayed
- **Error:** N/A
- **Navigation:** None

**Action: Close Part Dropdown (Click Outside)**
- **Trigger:** User clicks outside dropdown
- **Behavior:**
  1. Detect click outside
  2. Hide dropdown
- **Validation:** None
- **Success:** Dropdown closed
- **Error:** N/A
- **Navigation:** None

**Action: View Processing Progress**
- **Trigger:** User views processing step
- **Behavior:**
  - Display spinning loader
  - Show progress checklist
  - Animate completion of steps
- **Validation:** None
- **Success:** Progress displayed
- **Error:** N/A
- **Navigation:** None

**Action: View Extraction Success Banner**
- **Trigger:** User views Step 1 of form after extraction
- **Behavior:**
  - Display green success banner
  - Show file name and average confidence
  - Explain confidence badges
- **Validation:** None
- **Success:** Banner displayed
- **Error:** N/A
- **Navigation:** None

### 7.3 Navigation

**From:**
- RFQ Method Selection (via "Upload RFQ Files" selection)

**To:**
- Email Preview (via "Preview Email" button on Step 5)
- Email Client (via "Open in Outlook" button on Step 5)
- Project Summary (via "Go to Project Summary" link if invalid parts)

**Exit Points:**
- "Preview Email" → Email Preview
- "Open in Outlook" → Email Client (external)
- "Go to Project Summary" → Project Summary
- Browser back button → RFQ Method Selection
- App Header logo → Projects List



## 8. Business Rules

### 8.1 Validation Rules

**File Upload Validation:**
- Supported formats: .ppt, .pptx, .xls, .xlsx, .pdf
- Maximum file size: 50MB (configurable)
- Error: "Unsupported file format"
- Error: "File too large (max 50MB)"

**Project ID Validation:**
- Format: Alphanumeric, hyphens allowed
- Length: 3-50 characters
- Auto-generated but user can edit
- Error: "Project ID is required"

**Part Selection Validation:**
- At least 1 part must be selected
- Parts must exist in project BOM
- Error: "Please select at least one part"
- Error: "Parts not in BOM: {part_names}"

**Part Description Validation:**
- Optional field
- Length: 0-500 characters
- Warning if missing (not error)

**Volume Scenario Validation:**
- At least 1 scenario required
- Volume must be positive number
- Unit must be selected
- Error: "Volume must be positive"
- Error: "At least one volume scenario required"

**Commodity Validation:**
- Must select one of available options
- Cannot be empty
- Error: "Commodity Type is required"

**Supplier Validation:**
- Minimum 3 suppliers recommended (warning, not error)
- Email format validation
- Warning: "Minimum 3 suppliers required for competitive RFQ"

**Deadline Validation:**
- Must be future date
- Default: 2 weeks from today
- Error: "Deadline must be in the future"

**Form Completion Validation:**
- All required fields must be filled before Step 5
- Cannot proceed to next step if current step invalid

### 8.2 Calculation Logic

**Average Confidence:**
```
confidence_values = Object.values(field_confidence)
average_confidence = ROUND(SUM(confidence_values) / COUNT(confidence_values))
```

**Progress Percentage:**
```
progress = (current_step / 5) * 100
```

**Confidence Badge Color:**
```
IF confidence >= 90:
  badge_color = "green"
  badge_text = "High"
ELSE IF confidence >= 80:
  badge_color = "yellow"
  badge_text = "Medium"
ELSE:
  badge_color = "red"
  badge_text = "Low"
```

**Volume Formatting:**
```
formatted_volume = volume.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
Example: "50000" → "50,000"
```

**Mailto Link Generation:**
```
subject = "RFQ {project_id}: {first_part_description}"
to = suppliers.map(s => s.email).join(',')
body = Template with all RFQ details
mailto_link = "mailto:{to}?subject={subject}&body={body}"
```

### 8.3 Conditional Display Logic

**Upload Step Display:**
- IF upload_step === 'select': Show upload zone
- IF upload_step === 'processing': Show processing animation
- IF upload_step === 'form': Show multi-step form

**Extraction Success Banner:**
- Show only on Step 1 of form
- Show only if extraction_success === true

**Confidence Badges:**
- Show only if field_confidence[field_name] exists
- Color based on confidence value

**Part Dropdown:**
- Show if show_part_dropdown === true
- Filter parts by part_search_query
- Highlight selected parts

**Selected Parts Badges:**
- Show if selected_parts.length > 0
- Color: Blue if valid, Red if invalid

**Part Validation Warning:**
- Show if has_invalid_parts === true
- Display invalid part names
- Show link to Project Summary

**Part Descriptions:**
- Show one field per selected part
- Show warning if description missing

**Volume Scenarios:**
- Show all scenarios in array
- Show converter if show_converter_index === index
- Show conversion info if conversion applied
- Show remove button if scenarios.length > 1

**Unit Converter:**
- Show inline when show_converter_index === index
- Hide when conversion applied or closed

**Supplier List:**
- Show all suppliers in array
- Show remove button if suppliers.length > 3
- Show warning if suppliers.length < 3

**Navigation Buttons:**
- Back: Show if current_step > 1
- Save Draft: Always show (disabled)
- Continue: Show if current_step < 5
- Review buttons: Show if current_step === 5

### 8.4 Error Handling

**File Upload Error:**
- **Detection:** Unsupported file format or file too large
- **Handling:**
  - Display error toast: "Unsupported file format. Please upload PPT, Excel, or PDF."
  - Keep user on upload screen
  - Allow selecting different file
  - Log error for monitoring

**LLM Extraction Error:**
- **Detection:** LLM extraction fails or times out
- **Handling:**
  - Display error toast: "Failed to extract data. Please enter manually."
  - Change upload_step to 'form'
  - Show empty form (no pre-filled data)
  - Allow manual entry
  - Log error for monitoring

**Low Confidence Warning:**
- **Detection:** Average confidence < 80%
- **Handling:**
  - Display warning banner: "Extraction confidence is low. Please review all fields carefully."
  - Show red/yellow badges on affected fields
  - Allow user to edit all fields
  - Proceed normally

**Part Validation Error:**
- **Detection:** Selected parts not in BOM
- **Handling:**
  - Display red warning box
  - List invalid part names
  - Show link to Project Summary
  - Prevent proceeding until resolved
  - Log warning for monitoring

**Form Validation Error:**
- **Detection:** User clicks Continue with invalid fields
- **Handling:**
  - Display error messages for invalid fields
  - Highlight invalid fields with red border
  - Scroll to first invalid field
  - Keep user on current step
  - Error: "Please fill in all required fields"

**Network Error:**
- **Detection:** API call fails or times out
- **Handling:**
  - Display error toast: "Network error. Please check your connection and try again."
  - Keep data in form (don't lose user's work)
  - Provide retry option
  - Log error for monitoring

**Session Expired Error:**
- **Detection:** User's session expires while on screen
- **Handling:**
  - Show modal: "Session expired. Please log in again."
  - Redirect to login after confirmation
  - Preserve form data in local storage (if possible)
  - Restore data after re-login

**Email Client Error:**
- **Detection:** Email client fails to open
- **Handling:**
  - Display error toast: "Failed to open email client. Please try Preview Email instead."
  - Suggest using Preview Email option
  - Log error for monitoring



## 9. Acceptance Criteria

### 9.1 Functional Criteria

1. WHEN user navigates to Upload RFQ Files THEN screen SHALL display within 2 seconds
2. WHEN screen loads THEN upload zone SHALL be displayed
3. WHEN screen loads THEN process steps card SHALL be displayed
4. WHEN user clicks upload zone THEN file picker SHALL open
5. WHEN user selects supported file THEN file SHALL upload and processing SHALL begin
6. WHEN user selects unsupported file THEN error SHALL be displayed
7. WHEN file uploads THEN upload_step SHALL change to 'processing'
8. WHEN processing begins THEN loading animation SHALL be displayed
9. WHEN processing begins THEN progress checklist SHALL be displayed
10. WHEN LLM extraction completes THEN upload_step SHALL change to 'form'
11. WHEN form loads THEN extraction success banner SHALL be displayed
12. WHEN form loads THEN all fields SHALL be pre-filled with extracted data
13. WHEN form loads THEN confidence badges SHALL be displayed
14. WHEN user views Step 1 THEN project information fields SHALL be displayed
15. WHEN user views Step 2 THEN supplier selection SHALL be displayed
16. WHEN user views Step 3 THEN requirements checklist SHALL be displayed
17. WHEN user views Step 4 THEN deadline and notes SHALL be displayed
18. WHEN user views Step 5 THEN review and submit options SHALL be displayed
19. WHEN user clicks Continue THEN system SHALL validate current step
20. WHEN current step valid THEN system SHALL move to next step
21. WHEN current step invalid THEN errors SHALL be displayed
22. WHEN user clicks Back THEN system SHALL move to previous step
23. WHEN user selects parts THEN selected parts badges SHALL be displayed
24. WHEN user selects invalid parts THEN warning SHALL be displayed
25. WHEN user adds volume scenario THEN new scenario SHALL be added
26. WHEN user removes volume scenario THEN scenario SHALL be removed
27. WHEN user opens unit converter THEN converter SHALL display inline
28. WHEN user applies conversion THEN volume and unit SHALL update
29. WHEN user adds supplier THEN new supplier SHALL be added
30. WHEN user removes supplier THEN supplier SHALL be removed
31. WHEN user has < 3 suppliers THEN warning SHALL be displayed
32. WHEN user toggles requirement THEN checkbox SHALL update
33. WHEN user reaches Step 5 THEN "Open in Outlook" button SHALL be displayed
34. WHEN user clicks "Open in Outlook" THEN email client SHALL open with pre-filled content
35. WHEN user clicks "Preview Email" THEN system SHALL navigate to Email Preview
36. WHEN LLM extraction fails THEN error SHALL be displayed and manual entry allowed
37. WHEN average confidence < 80% THEN warning SHALL be displayed
38. WHEN user edits extracted field THEN field SHALL update
39. WHEN user scrolls during step change THEN page SHALL scroll to top
40. WHEN progress bar updates THEN it SHALL show correct percentage

### 9.2 Flexibility Criteria

1. WHEN admin adds new file format THEN system SHALL support it
2. WHEN admin adds new commodity type THEN it SHALL appear in dropdown
3. WHEN admin adds new requirement THEN it SHALL appear in checklist
4. WHEN admin configures confidence thresholds THEN badges SHALL adapt
5. WHEN LLM is available THEN extraction SHALL work
6. WHEN LLM is unavailable THEN manual entry SHALL work
7. WHEN custom RFQ attributes exist THEN LLM SHALL attempt to extract them
8. WHEN Master Field List changes THEN extraction SHALL adapt
9. WHEN document has dynamic fields THEN LLM SHALL extract them
10. WHEN extraction confidence varies THEN badges SHALL reflect it

### 9.3 UX Criteria

1. Screen loads within 2 seconds on standard broadband connection
2. Upload zone is clearly visible and inviting
3. Drag-and-drop functionality works smoothly
4. Processing animation provides clear feedback
5. Progress checklist shows extraction steps
6. Extraction success banner is prominent and informative
7. Confidence badges are clearly visible and color-coded
8. Form steps are clearly numbered and progress bar updates
9. All required fields are clearly marked
10. Part dropdown is searchable and responsive
11. Selected parts badges are clearly visible
12. Validation warnings are clear and actionable
13. Volume scenarios are easy to add/remove
14. Unit converter is intuitive and inline
15. Supplier list is easy to manage
16. Requirements checklist is well-organized
17. Required vs optional items are clearly distinguished
18. Tooling requirement has "Critical" badge
19. Navigation buttons are clearly visible
20. Back button only shows when applicable
21. Continue button is prominent
22. Step 5 review buttons are well-designed
23. "Open in Outlook" is primary action
24. "Preview Email" is secondary option
25. All interactive elements have pointer cursor
26. Hover effects are smooth and responsive
27. Typography is clear and readable
28. Spacing is consistent throughout screen
29. Mobile-responsive design works on screens 768px and wider
30. Error messages are clear and actionable

### 9.4 Performance Criteria

1. Initial page load completes within 2 seconds
2. File upload begins within 500ms of selection
3. LLM extraction completes within 5 seconds (simulated: 2.5s)
4. Form step changes respond within 100ms
5. Part dropdown opens within 200ms
6. Part search filters within 200ms
7. Volume formatting updates within 100ms
8. Unit converter displays within 200ms
9. Supplier add/remove completes within 100ms
10. Requirement toggle responds within 100ms
11. Progress bar updates smoothly
12. Scroll to top animates smoothly
13. Screen handles 20+ parts without performance degradation
14. Screen handles 10+ suppliers without performance degradation
15. No memory leaks during form interactions

### 9.5 Accessibility Criteria

1. All form fields are keyboard accessible (tab navigation)
2. Focus indicators are clearly visible
3. Upload zone is keyboard accessible
4. File picker opens with Enter/Space key
5. Part dropdown is keyboard navigable
6. Volume scenarios are keyboard accessible
7. Unit converter is keyboard accessible
8. Supplier list is keyboard accessible
9. Requirements checklist is keyboard accessible
10. Navigation buttons are keyboard accessible
11. Required fields are announced to screen readers
12. Error messages are associated with form fields
13. Labels are properly associated with inputs
14. Buttons have descriptive aria-labels
15. Form sections have proper heading hierarchy
16. Color is not the only means of conveying confidence
17. Text has sufficient contrast ratio (WCAG AA: 4.5:1)
18. Icons have aria-labels or are marked as decorative
19. Progress bar has aria-label
20. Screen reader announces step changes

### 9.6 Security Criteria

1. User must be authenticated to access screen
2. Session validation occurs on page load
3. Expired sessions redirect to login
4. Uploaded files are scanned for malware
5. File size limits prevent DoS attacks
6. All user input sanitized before storage
7. XSS protection on all displayed text
8. CSRF protection on file upload
9. Rate limiting on LLM extraction API
10. Audit log records file uploads and extractions
11. No sensitive data exposed in client-side code
12. Extracted data validated before use
13. Email addresses validated before use
14. Mailto links sanitized to prevent injection
15. Form data encrypted in transit



## 10. Edge Cases & Error Scenarios

### 10.1 Data Edge Cases

**Empty Document:**
- **Scenario:** Uploaded document contains no extractable data
- **Handling:**
  - LLM returns empty extraction
  - Display warning: "No data could be extracted. Please enter manually."
  - Show empty form
  - Allow manual entry
  - Log warning for monitoring

**Partially Extractable Document:**
- **Scenario:** LLM can only extract some fields
- **Handling:**
  - Pre-fill extracted fields
  - Leave other fields empty
  - Show confidence badges for extracted fields
  - User fills in missing fields manually
  - Proceed normally

**Low Confidence Extraction:**
- **Scenario:** All fields extracted with <80% confidence
- **Handling:**
  - Display warning banner
  - Show yellow/red badges on all fields
  - Recommend careful review
  - Allow user to edit all fields
  - Proceed normally

**Conflicting Data in Document:**
- **Scenario:** Document contains conflicting information
- **Handling:**
  - LLM chooses most prominent/recent data
  - Lower confidence score for affected fields
  - User reviews and corrects
  - Log warning for monitoring

**Very Large Document:**
- **Scenario:** Document is 50MB (at limit)
- **Handling:**
  - Allow upload
  - Show extended processing time warning
  - LLM processes in chunks if needed
  - Timeout after 30 seconds
  - Allow retry or manual entry

**Document with Images Only:**
- **Scenario:** PDF contains only images, no text
- **Handling:**
  - LLM attempts OCR extraction
  - Lower confidence scores
  - Display warning about image-based extraction
  - Allow manual entry if extraction fails

**Multiple RFQs in One Document:**
- **Scenario:** Document contains multiple RFQ projects
- **Handling:**
  - LLM extracts first/primary RFQ
  - Display warning: "Multiple RFQs detected. Extracted first one."
  - User can upload additional documents separately
  - Log warning for monitoring

**Corrupted File:**
- **Scenario:** File is corrupted or unreadable
- **Handling:**
  - Display error: "File is corrupted or unreadable"
  - Allow selecting different file
  - Suggest trying different format
  - Log error for monitoring

### 10.2 Interaction Edge Cases

**Rapid File Uploads:**
- **Scenario:** User uploads multiple files quickly
- **Handling:**
  - Process only last uploaded file
  - Cancel previous extraction
  - Show warning: "Previous upload cancelled"
  - Proceed with latest file

**Navigate Away During Processing:**
- **Scenario:** User clicks back button during extraction
- **Handling:**
  - Show confirmation: "Extraction in progress. Cancel and go back?"
  - If confirmed: Cancel extraction, navigate back
  - If cancelled: Continue extraction

**Edit Field During Extraction:**
- **Scenario:** User somehow edits field while extraction running
- **Handling:**
  - Extraction completes
  - Don't overwrite user's edits
  - Preserve user input
  - Show confidence badges for other fields

**Select Many Parts (50+):**
- **Scenario:** User selects 50+ parts from BOM
- **Handling:**
  - Allow selection
  - Show warning: "Large number of parts selected. Consider splitting into multiple RFQs."
  - Performance remains acceptable
  - Scroll becomes necessary

**Add Many Suppliers (20+):**
- **Scenario:** User adds 20+ suppliers
- **Handling:**
  - Allow addition
  - No hard limit
  - Performance remains acceptable
  - Scroll becomes necessary

**Add Many Volume Scenarios (10+):**
- **Scenario:** User adds 10+ volume scenarios
- **Handling:**
  - Allow addition
  - No hard limit
  - Performance remains acceptable
  - Scroll becomes necessary

**Rapid Step Navigation:**
- **Scenario:** User clicks Continue/Back multiple times quickly
- **Handling:**
  - Debounce navigation
  - Process one step change at a time
  - Smooth transitions
  - No duplicate step changes

**Close Dropdown While Selecting:**
- **Scenario:** User clicks outside dropdown while selecting parts
- **Handling:**
  - Save current selections
  - Close dropdown
  - Show selected parts badges
  - Allow reopening dropdown

**Unit Converter Open During Step Change:**
- **Scenario:** User navigates to next step with converter open
- **Handling:**
  - Close converter automatically
  - Save any applied conversions
  - Proceed to next step normally

**Browser Back Button:**
- **Scenario:** User clicks browser back button
- **Handling:**
  - Show confirmation if form has data: "Discard changes?"
  - If confirmed: Navigate to RFQ Method Selection
  - If cancelled: Stay on screen

### 10.3 System Edge Cases

**Session Expires During Upload:**
- **Scenario:** User's session expires during file upload
- **Handling:**
  - Detect expired session
  - Show modal: "Session expired. Please log in again."
  - Preserve uploaded file reference (if possible)
  - Redirect to login
  - Restore after re-login

**Session Expires During Extraction:**
- **Scenario:** User's session expires during LLM extraction
- **Handling:**
  - Extraction continues
  - Show modal after extraction: "Session expired. Please log in again."
  - Preserve extracted data in local storage
  - Redirect to login
  - Restore data after re-login

**Session Expires During Form Entry:**
- **Scenario:** User's session expires while filling form
- **Handling:**
  - Detect expired session on step change or submit
  - Show modal: "Session expired. Please log in again."
  - Preserve form data in local storage
  - Redirect to login
  - Restore data after re-login

**Network Disconnection During Upload:**
- **Scenario:** User loses internet connection during upload
- **Handling:**
  - Upload fails
  - Display error: "Upload failed. Please check your connection."
  - Allow retry when reconnected
  - Provide manual entry option

**Network Disconnection During Extraction:**
- **Scenario:** User loses internet connection during extraction
- **Handling:**
  - Extraction fails or times out
  - Display error: "Extraction failed. Please check your connection."
  - Allow retry when reconnected
  - Provide manual entry option

**LLM Service Unavailable:**
- **Scenario:** LLM extraction service is down
- **Handling:**
  - Extraction fails immediately
  - Display error: "Extraction service unavailable. Please enter manually."
  - Show empty form
  - Allow manual entry
  - Log error for monitoring

**LLM Extraction Timeout:**
- **Scenario:** LLM takes too long (>30 seconds)
- **Handling:**
  - Cancel extraction
  - Display error: "Extraction timed out. Please enter manually."
  - Show empty form
  - Allow manual entry
  - Log error for monitoring

**Browser Compatibility:**
- **Scenario:** User on unsupported browser
- **Handling:**
  - Detect browser version on load
  - Show warning if unsupported
  - Provide graceful degradation (basic functionality)
  - Recommend supported browsers

**File Picker Cancelled:**
- **Scenario:** User opens file picker but cancels
- **Handling:**
  - No action taken
  - Stay on upload screen
  - Allow trying again

**Email Client Not Configured:**
- **Scenario:** User clicks "Open in Outlook" but no email client configured
- **Handling:**
  - Browser shows error or does nothing
  - Display message: "Email client not configured. Please use Preview Email."
  - Suggest Preview Email option
  - Log warning for monitoring

**Mailto Link Too Long:**
- **Scenario:** Generated mailto link exceeds browser limit (~2000 chars)
- **Handling:**
  - Truncate email body
  - Display warning: "Email content truncated. Use Preview Email for full content."
  - Suggest Preview Email option
  - Log warning for monitoring



## 11. Backend API Requirements

### 11.1 API Endpoints

**POST /api/v1/rfq/upload**
- **Purpose:** Upload RFQ document file
- **Authentication:** Required (Bearer token)
- **Request:** Multipart form data
  - `file`: File (required)
  - `user_id`: String (required)
  - `project_id`: String (required)
- **Response:** 201 Created
  ```json
  {
    "file_id": "file-789",
    "file_name": "RFQ_Steel_Shaft_2024.pptx",
    "file_size": 2457600,
    "file_url": "https://...",
    "uploaded_at": "2025-01-02T10:00:00Z"
  }
  ```
- **Error Responses:**
  - 400 Bad Request: Invalid file format or size
  - 401 Unauthorized: Invalid or expired token
  - 413 Payload Too Large: File exceeds size limit
  - 500 Internal Server Error: Server error

**POST /api/v1/rfq/extract**
- **Purpose:** Extract RFQ data from uploaded document using LLM
- **Authentication:** Required (Bearer token)
- **Request Body:**
  ```json
  {
    "file_id": "file-789",
    "user_id": "user-123",
    "project_id": "PRJ-2025-001"
  }
  ```
- **Response:** 200 OK
  ```json
  {
    "extraction_id": "ext-456",
    "success": true,
    "average_confidence": 92,
    "extracted_data": {
      "project_id": {
        "value": "RFQ-2025-050",
        "confidence": 95
      },
      "part_names": {
        "value": ["ALU-BRACKET-001", "ALU-BRACKET-002"],
        "confidence": 92
      },
      "part_descriptions": {
        "value": {
          "ALU-BRACKET-001": "Aluminum mounting bracket for door assembly",
          "ALU-BRACKET-002": "Aluminum mounting bracket variant 2"
        },
        "confidence": 88
      },
      "volume_scenarios": {
        "value": [
          {"volume": "50000", "unit": "pieces"},
          {"volume": "100000", "unit": "pieces"}
        ],
        "confidence": 90
      },
      "commodity": {
        "value": "Stamping",
        "confidence": 94
      },
      "suppliers": {
        "value": [
          {"name": "Supplier A", "email": "supplier-a@company.com"},
          {"name": "Supplier B", "email": "supplier-b@company.com"}
        ],
        "confidence": 85
      },
      "requirements": {
        "value": {
          "material": true,
          "process": true,
          "tooling": true,
          "logistics": true,
          "terms": true,
          "capacity": true
        },
        "confidence": 91
      }
    }
  }
  ```
- **Error Responses:**
  - 400 Bad Request: Invalid file_id
  - 401 Unauthorized: Invalid or expired token
  - 404 Not Found: File not found
  - 408 Request Timeout: Extraction timeout
  - 500 Internal Server Error: Server error
  - 503 Service Unavailable: LLM service unavailable

**POST /api/v1/rfq/create**
- **Purpose:** Create RFQ from form data
- **Authentication:** Required (Bearer token)
- **Request Body:**
  ```json
  {
    "user_id": "user-123",
    "project_id": "RFQ-2025-050",
    "selected_parts": ["ALU-BRACKET-001", "ALU-BRACKET-002"],
    "part_descriptions": {
      "ALU-BRACKET-001": "Aluminum mounting bracket"
    },
    "volume_scenarios": [
      {"volume": "50000", "unit": "pieces"}
    ],
    "commodity": "Stamping",
    "files": ["file-789"],
    "suppliers": [
      {"name": "Supplier A", "email": "supplier-a@company.com"}
    ],
    "requirements": {
      "material": true,
      "process": true
    },
    "deadline": "2025-01-15",
    "language": "english",
    "notes": "Additional notes"
  }
  ```
- **Response:** 201 Created
  ```json
  {
    "rfq_id": "rfq-123",
    "project_id": "RFQ-2025-050",
    "created_at": "2025-01-02T10:00:00Z",
    "status": "created"
  }
  ```

**POST /api/v1/analytics/rfq-upload**
- **Purpose:** Record RFQ upload and extraction for analytics
- **Authentication:** Required (Bearer token)
- **Request Body:**
  ```json
  {
    "user_id": "user-123",
    "file_id": "file-789",
    "extraction_id": "ext-456",
    "average_confidence": 92,
    "method": "upload",
    "timestamp": "2025-01-02T10:00:00Z"
  }
  ```
- **Response:** 201 Created

### 11.2 Data Models

```typescript
interface FileUploadResponse {
  file_id: string;
  file_name: string;
  file_size: number;
  file_url: string;
  uploaded_at: string;
}

interface ExtractionRequest {
  file_id: string;
  user_id: string;
  project_id: string;
}

interface ExtractedField<T> {
  value: T;
  confidence: number;
}

interface ExtractionResponse {
  extraction_id: string;
  success: boolean;
  average_confidence: number;
  extracted_data: {
    project_id: ExtractedField<string>;
    part_names: ExtractedField<string[]>;
    part_descriptions: ExtractedField<Record<string, string>>;
    volume_scenarios: ExtractedField<VolumeScenario[]>;
    commodity: ExtractedField<string>;
    suppliers: ExtractedField<Supplier[]>;
    requirements: ExtractedField<Record<string, boolean>>;
  };
}

interface VolumeScenario {
  volume: string;
  unit: string;
  conversion?: UnitConversion;
}

interface Supplier {
  name: string;
  email: string;
  previousRFQs?: number;
}

interface RFQCreateRequest {
  user_id: string;
  project_id: string;
  selected_parts: string[];
  part_descriptions: Record<string, string>;
  volume_scenarios: VolumeScenario[];
  commodity: string;
  files: string[];
  suppliers: Supplier[];
  requirements: Record<string, boolean>;
  deadline: string;
  language: string;
  notes?: string;
}

interface RFQCreateResponse {
  rfq_id: string;
  project_id: string;
  created_at: string;
  status: 'created';
}
```

### 11.3 Caching Strategy

**Client-Side Caching:**
- Cache extracted data in session storage
- Invalidate on new upload
- Preserve form data in local storage (for session restore)

**Server-Side Caching:**
- Cache uploaded files (S3, 24 hours)
- Cache extraction results (Redis, 1 hour TTL)
- Invalidate on new extraction

### 11.4 LLM Integration

**Extraction Process:**
1. File uploaded to S3
2. LLM service receives file URL
3. LLM analyzes document structure
4. LLM extracts structured data
5. LLM assigns confidence scores
6. Results returned to frontend

**Confidence Scoring:**
- Based on pattern matching accuracy
- Multiple confirmations increase confidence
- Contextual validation
- Historical accuracy data

**Timeout Handling:**
- 30 second timeout for extraction
- Exponential backoff for retries
- Fallback to manual entry

### 11.5 Error Handling

**Network Errors:**
- Retry failed requests (exponential backoff: 1s, 2s, 4s)
- Max 3 retries
- Show error toast after final failure
- Provide manual retry button

**File Upload Errors:**
- 413 Payload Too Large: Show file size error
- 400 Bad Request: Show format error
- Provide clear error messages

**Extraction Errors:**
- 408 Timeout: Show timeout error, allow retry
- 503 Service Unavailable: Show service error, allow manual entry
- 500 Server Error: Show generic error, allow manual entry

**Validation Errors:**
- 400 Bad Request: Show specific error messages
- Log error details for monitoring


## 12. Notes & Considerations

### 12.1 Design Decisions

**Upload as Primary Method:**
- Rationale: Many buyers have existing RFQ documents
- AI extraction saves time vs. manual entry
- Reduces transcription errors
- Leverages existing documentation
- Key differentiator of the product

**Three-Step Process:**
- Rationale: Clear progression (Upload → Extract → Review)
- Step 1: File selection with clear instructions
- Step 2: Processing with progress feedback
- Step 3: Form review with confidence scores
- Reduces cognitive load

**Confidence Scores:**
- Rationale: Transparency about extraction quality
- Color-coded badges (green/yellow/red)
- Helps users know which fields to review carefully
- Builds trust in AI extraction
- Unique feature

**Multi-Step Form:**
- Rationale: Breaks complex form into manageable steps
- 5 steps: Project Info, Suppliers, Requirements, Deadline, Review
- Progress bar shows completion
- Back/Continue navigation
- Same structure as Create From Scratch

**Inline Unit Converter:**
- Rationale: Convenient conversion without leaving form
- Shows conversion info after applied
- Preserves conversion history
- Reduces errors

**Editable Extracted Data:**
- Rationale: AI not perfect, user has final say
- All fields editable
- Confidence badges guide review
- Flexibility without forcing manual entry

### 12.2 Future Enhancements

**Multi-File Upload:**
- Upload multiple documents at once
- LLM merges data from all documents
- Conflict resolution UI
- Useful for complex RFQs

**Batch Extraction:**
- Extract multiple RFQs from one document
- Create separate RFQs for each
- Useful for consolidated documents

**OCR Enhancement:**
- Better image-based text extraction
- Handle scanned documents
- Support handwritten notes

**Smart Field Mapping:**
- LLM learns from user corrections
- Improves extraction accuracy over time
- Personalized per user/organization

**Template Detection:**
- Recognize common RFQ templates
- Optimize extraction for known formats
- Higher confidence for template matches

**Extraction Preview:**
- Show extracted data before form
- Allow accepting/rejecting extraction
- Faster workflow for high-confidence extractions

**Confidence Threshold Settings:**
- User configures acceptable confidence levels
- Auto-flag fields below threshold
- Customizable per organization

**Extraction History:**
- Track extraction accuracy over time
- Show improvement metrics
- Identify problematic document types

### 12.3 Dependencies

**Required Screens:**
- RFQ Method Selection (prerequisite)
- Email Preview (navigation target)
- Project Summary (navigation target for invalid parts)

**Required APIs:**
- Authentication API
- File Upload API
- LLM Extraction API
- RFQ Creation API
- Analytics API

**Required Services:**
- LLM Service (OpenAI, Anthropic, or custom)
- File Storage (S3 or equivalent)
- OCR Service (for image-based documents)

**External Dependencies:**
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Lucide React (icons)
- shadcn/ui components
- Unit Converter component
- Date formatting library (date-fns)

### 12.4 Testing Considerations

**Unit Tests:**
- File format validation
- Confidence badge logic
- Volume formatting
- Mailto link generation
- Form validation logic
- Step navigation logic

**Integration Tests:**
- File upload API
- LLM extraction API
- RFQ creation API
- Authentication flow
- Navigation flows
- Analytics recording

**E2E Tests:**
- Complete upload workflow: Select file → Extract → Fill form → Submit
- Upload with high confidence extraction
- Upload with low confidence extraction
- Upload with extraction failure
- Manual entry after failed extraction
- Part validation scenarios
- Supplier management
- Requirements selection
- Email preview navigation

**LLM Tests:**
- Extraction accuracy across document types
- Confidence score calibration
- Timeout handling
- Error recovery
- Edge case documents

**Performance Tests:**
- File upload speed
- Extraction time
- Form rendering with large datasets
- Memory usage during extraction
- API response times

**Accessibility Tests:**
- Keyboard navigation through all steps
- Screen reader compatibility
- Focus management
- Color contrast
- ARIA labels

### 12.5 Open Questions

1. **File Size Limit:** Should 50MB be the limit or adjust based on format?
2. **Extraction Timeout:** Is 30 seconds appropriate or should it be longer?
3. **Confidence Threshold:** What confidence level should trigger warnings?
4. **Multi-File:** Should users be able to upload multiple files at once?
5. **Extraction Preview:** Should users see extraction results before form?
6. **Auto-Save:** Should form auto-save during entry?
7. **Template Library:** Should system recognize common RFQ templates?
8. **OCR Quality:** What OCR service provides best results?
9. **Batch Processing:** Should system support batch RFQ extraction?
10. **Learning:** Should LLM learn from user corrections?

### 12.6 Key Metrics to Track

**Usage Metrics:**
- Number of files uploaded per user
- File formats used (PPT vs Excel vs PDF)
- Extraction success rate
- Average confidence scores
- Fields most often edited
- Time spent on each step

**Performance Metrics:**
- File upload time
- Extraction time
- Form completion time
- Error rate
- Timeout rate

**Business Metrics:**
- Time savings vs. manual entry
- User satisfaction with extraction
- Extraction accuracy over time
- Most common document types
- Adoption rate of upload method

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial screen requirements document |
