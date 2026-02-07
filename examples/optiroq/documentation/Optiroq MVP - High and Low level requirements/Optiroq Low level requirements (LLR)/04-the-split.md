# Screen Requirements: The Split

## 1. Overview
- **Screen ID:** SCR-004
- **Component File:** `src/app/components/TheSplit.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** High - Supports dynamic project attributes and BOM fields

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** review and confirm the classification of BOM parts into Existing and New  
**So that** I can focus RFQ efforts on new parts while leveraging existing contracts

### Related User Stories
- **REQ-MVP-00B:** "The Split" - Existing vs New Parts Classification
- **REQ-MVP-00A:** BOM Upload & Project Initialization (Enhanced)
- **US-MVP-02A:** Create RFQ Manually from Scratch (alternative path)

## 3. Screen Purpose & Context

### Purpose
This screen displays the results of "The Split" analysis, classifying BOM parts into:
- **Existing Parts:** Already under contract (no RFQ needed)
- **New Parts:** Require new RFQs to be created

Buyers can review, edit, and confirm the classification before proceeding to RFQ creation.

### Context
- **When user sees this:** 
  - After successful BOM upload
  - After clicking "View Part Analysis" from BOM Upload screen
  - When reviewing an existing project
- **Why it exists:** 
  - Enable buyers to focus RFQ efforts on new parts only
  - Display existing contract information for reference
  - Allow manual adjustments to classification
  - Support enhanced project details (Platform, Customer, Location)
- **Position in journey:** 
  - After BOM Upload
  - Before RFQ Method Selection
  - Gateway to RFQ creation workflow

### Key Characteristics
- **Dual classification:** Clear visual distinction between Existing and New parts
- **Editable:** Buyers can manually add, edit, or delete parts
- **Project information:** Enhanced project details with Platform, Customer, Location
- **ERP integration:** Upload ERP data to auto-match existing parts
- **Search and filter:** Find parts quickly in large BOMs
- **Summary metrics:** Visual cards showing split statistics


## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Title:** "Project Initiation - Confirm the list of parts"
2. **Description:** "Parts classified into Existing (under contract) and New (require RFQ)"

**Project Information Card:**
1. **Card Header**
   - Title: "Project Information"
   - Description: "Edit project details and manage BOM file"
   - Edit/Save/Cancel buttons (context-dependent)

2. **Two-Column Layout**
   - **Left Column:** Project ID, Project Description, Platform Name, Customer Name
   - **Right Column:** Location (multi-line), BOM File (with upload/remove)

3. **Edit Mode Features**
   - All fields editable
   - BOM file upload/replace functionality
   - Validation on save

**Summary Cards (4 cards in grid):**
1. **Total Parts:** Count of all parts in BOM
2. **New Parts:** Count and percentage requiring RFQ (orange theme)
3. **Existing Parts:** Count and percentage under contract (green theme)
4. **Existing Value:** Total value of existing parts + target for new parts

**BOM Part Classification Card:**
1. **Card Header**
   - Title: "BOM Part Classification"
   - Description: Project ID and BOM file name
   - Action buttons: "Add Manual Part", "Upload data from ERP"

2. **Filters Section**
   - Search bar (by part name or material)
   - Tab buttons: All, New, Existing (with counts)

3. **Info Banners**
   - Orange banner: Explains "New Parts" (require RFQs)
   - Green banner: Explains "Existing Parts" (under contract)

4. **Parts Table**
   - Columns: Status, Part Name, Description, Material, Quantity, Weight, Current Info, Actions
   - Color-coded status badges
   - Hover effects on rows
   - Edit/Delete actions per row

**Footer Actions:**
- "Save Project" button (primary, blue) - navigates to next screen

### 4.2 Key UI Elements

**Project Information Fields:**
- **Project ID:** Text input, required, unique validation
- **Project Description:** Text input, required
- **Platform Name:** Text input, required
- **Customer Name:** Text input, required
- **Location:** Textarea (multi-line), required
- **BOM File:** File display with upload/remove actions

**Edit Mode Toggle:**
- **Edit Button:** Switches to edit mode
- **Save Button:** Validates and saves changes
- **Cancel Button:** Discards changes and exits edit mode

**BOM File Management:**
- **File Display:** Shows current file name with file icon
- **Remove Button:** Deletes current BOM (with confirmation)
- **Upload Zone:** Drag-and-drop area for new BOM
- **Upload Progress:** Loading spinner during upload
- **Warning Banner:** Alerts user that upload replaces current parts

**Summary Cards:**
- **Total Parts Card:** Blue theme, package icon
- **New Parts Card:** Orange theme, alert icon, percentage badge
- **Existing Parts Card:** Green theme, check icon, percentage badge
- **Existing Value Card:** Purple theme, dollar icon, target value

**Search and Filter:**
- **Search Input:** Text field with search icon, placeholder text
- **Tab Buttons:** All/New/Existing with counts, active state styling

**Parts Table:**
- **Status Badge:** Green (Existing) or Orange (New) with icon
- **Part Name:** Monospace font, bold
- **Description:** Gray text, italic if empty
- **Material:** Regular text
- **Quantity:** Right-aligned, formatted with commas
- **Weight:** Right-aligned, 3 decimal places
- **Current Info:** Supplier name, price, lead time (for existing parts)
- **Actions:** Edit and Delete icon buttons

**Add/Edit Part Dialog:**
- **Modal overlay:** Centered dialog
- **Form fields:** Part Name, Description, Material, Quantity, Weight, Status
- **Conditional fields:** Supplier, Price, Lead Time (if status = existing)
- **Action buttons:** Cancel, Save Part

**ERP Upload Dialog:**
- **Three states:** Select, Uploading, Complete
- **Select state:** Drag-and-drop zone
- **Uploading state:** Loading spinner with progress message
- **Complete state:** Success icon with matched parts count


### 4.3 Information Hierarchy

**Primary Information:**
- Part classification status (Existing vs New)
- Part names and materials
- Project ID and BOM file name
- Summary metrics (counts, percentages, values)

**Secondary Information:**
- Part descriptions
- Quantities and weights
- Current supplier information (for existing parts)
- Project details (Platform, Customer, Location)

**Tertiary Information:**
- Search and filter controls
- Action buttons
- Info banners explaining classifications

## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_id | String | BOM Upload | Yes | Unique, 3-50 characters |
| bom_file_name | String | BOM Upload | Yes | Original file name |
| upload_timestamp | DateTime | System | Yes | ISO 8601 |
| parts_count | Number | Calculated | Yes | Integer, >0 |
| existing_parts_count | Number | Calculated | Yes | Integer, ≥0 |
| new_parts_count | Number | Calculated | Yes | Integer, ≥0 |
| classification_status | Enum | System | Yes | "pending", "confirmed", "modified" |

### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| project_description | String | Yes | No | 2-500 characters |
| platform_name | String | Yes | No | 2-100 characters |
| customer_name | String | Yes | No | 2-200 characters |
| delivery_location | String | Yes | No | 2-500 characters |
| sop_date | Date | No | Yes | ISO 8601 date |
| project_manager | String | No | Yes | 2-100 characters |

### 5.3 Part Data Fields (Core)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| part_id | String | System | Yes | Auto-generated unique ID |
| part_name | String | BOM File/User | Yes | 2-200 characters, unique within BOM |
| description | String | BOM File/User | No | 0-500 characters |
| material | String | BOM File/User | Yes | 2-100 characters |
| quantity | Number | BOM File/User | Yes | Integer, >0 |
| target_weight | Number | BOM File/User | No | Decimal, >0 |
| status | Enum | System/User | Yes | "existing", "new" |

### 5.4 Part Data Fields (Existing Parts Only)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| current_supplier | String | ERP/User | Yes (if existing) | 2-200 characters |
| current_price | Number | ERP/User | Yes (if existing) | Decimal, >0 |
| lead_time | Number | ERP/User | Yes (if existing) | Integer, >0 (weeks) |
| contract_id | String | ERP | No | Contract reference |
| contract_expiry | Date | ERP | No | ISO 8601 date |

### 5.5 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| existing_parts_percentage | (existing_parts_count / parts_count) * 100 | parts_count, existing_parts_count |
| new_parts_percentage | (new_parts_count / parts_count) * 100 | parts_count, new_parts_count |
| existing_parts_value | Sum(current_price * quantity) for all existing parts | current_price, quantity |
| new_parts_target_value | Estimated value for new parts | new_parts_count, average_target_price |
| total_project_value | existing_parts_value + new_parts_target_value | Both values |


## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**Dynamic Project Attributes:**
- System displays all project fields from Master List
- Required fields: Project ID, Description, Platform, Customer, Location
- Optional fields: SOP Date, Project Manager, custom attributes
- Admin can add new project attributes to Master List
- Buyer cannot add fields (only Admin can modify Master List)

**Dynamic Part Attributes:**
- Core fields always displayed: Part Name, Material, Quantity, Status
- Optional fields: Description, Target Weight, custom attributes
- Custom attributes from BOM file automatically detected and stored
- Table columns adapt based on which attributes are present

**Field Selection Process:**
- Admin pre-configures Master List with organization-wide project/part attributes
- System automatically detects which Master List fields are present in BOM
- Buyer can edit values but cannot add/remove field types
- Unknown fields in BOM stored as custom attributes

### 6.2 UI Adaptation Logic

**Form Generation:**
- Project information form adapts to Master List configuration
- Required fields marked with red asterisk (*)
- Optional fields shown without asterisk
- Custom fields displayed after standard fields

**Table Generation:**
- Parts table columns adapt to available data
- Standard columns always shown: Status, Part Name, Material, Quantity
- Optional columns shown if data exists: Description, Weight, Current Info
- Custom attribute columns added dynamically

**Layout Rules:**
- Project fields: Two-column grid layout
- Long text fields (Location, Description): Full width
- Numeric fields: Right-aligned
- Status badges: Color-coded (green/orange)

**Validation Adaptation:**
- Required fields: Cannot be empty, validated on save
- Optional fields: No validation if empty
- Custom fields: Validation rules from Master List configuration

### 6.3 LLM Integration

**LLM Role for Classification:**
- Analyze part names and materials
- Match against existing contracts database
- Suggest classification (existing vs new)
- Provide confidence scores

**Input to LLM:**
- Part name, material, specifications
- Historical contract data
- Supplier database
- Previous classification patterns

**Output from LLM:**
- Classification suggestion: "existing" or "new"
- Confidence score: 0-100%
- Matched contract ID (if existing)
- Reasoning explanation

**Confidence Scoring:**
- High confidence (>90%): Auto-classify, no user review
- Medium confidence (70-90%): Auto-classify, flag for review
- Low confidence (<70%): Require user confirmation

**Fallback Behavior:**
- If LLM fails: Use rule-based matching (exact name + material match)
- If rule-based fails: Default to "new" status
- User can always manually override classification


## 7. User Interactions

### 7.1 Primary Actions

**Action: Edit Project Information**
- **Trigger:** User clicks "Edit" button in Project Information card
- **Behavior:**
  1. Switch to edit mode
  2. Enable all input fields
  3. Show Save and Cancel buttons
  4. Hide Edit button
  5. Enable BOM file upload/remove
- **Validation:** None (validation happens on save)
- **Success:** Edit mode activated
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Save Project Information**
- **Trigger:** User clicks "Save" button after editing
- **Behavior:**
  1. Validate all required fields
  2. Check Project ID uniqueness
  3. If validation fails, display errors inline
  4. If validation passes:
     - Save changes to backend
     - Update project metadata
     - Exit edit mode
     - Show success message
- **Validation:**
  - Project ID: Not empty, unique, 3-50 characters
  - Project Description: Not empty, 2-500 characters
  - Platform Name: Not empty, 2-100 characters
  - Customer Name: Not empty, 2-200 characters
  - Location: Not empty, 2-500 characters
  - BOM File: Must exist
- **Success:** Changes saved, edit mode exited
- **Error:** Display validation errors inline
  - "Project ID is required"
  - "Project ID already exists"
  - "BOM File is required. Please upload a BOM file."
- **Navigation:** None (stays on screen)

**Action: Cancel Edit Project Information**
- **Trigger:** User clicks "Cancel" button during edit
- **Behavior:**
  1. Discard all changes
  2. Restore original values
  3. Exit edit mode
  4. Show Edit button
- **Validation:** None
- **Success:** Edit mode exited, changes discarded
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Upload New BOM File**
- **Trigger:** User clicks upload zone or drags file (during edit mode)
- **Behavior:**
  1. Validate file type (.xlsx, .xls, .csv)
  2. Validate file size (<10MB)
  3. Show uploading state with spinner
  4. Upload file to backend
  5. Backend parses BOM file
  6. Backend extracts parts
  7. Replace current parts list with new parts
  8. Update BOM file name
  9. Show success message
  10. Display warning about replacement
- **Validation:**
  - File type: .xlsx, .xls, or .csv
  - File size: <10MB
  - Valid BOM structure
- **Success:** 
  - New BOM uploaded
  - Parts list replaced
  - File name updated
  - Alert: "BOM uploaded successfully! Parts list updated with X parts from the new BOM."
- **Error:** Display error message
  - "Invalid file type"
  - "File too large"
  - "Failed to parse BOM file"
- **Navigation:** None (stays on screen)

**Action: Remove BOM File**
- **Trigger:** User clicks trash icon next to BOM file name (during edit mode)
- **Behavior:**
  1. Show confirmation dialog: "Are you sure you want to remove the current BOM? This will clear all parts."
  2. If confirmed:
     - Clear BOM file name
     - Clear all parts from list
     - Show empty state
- **Validation:** None
- **Success:** BOM removed, parts cleared
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Search Parts**
- **Trigger:** User types in search input field
- **Behavior:**
  1. Filter parts list in real-time
  2. Match against part name and material (case-insensitive)
  3. Update table to show only matching parts
  4. Show "No parts match" message if no results
- **Validation:** None
- **Success:** Filtered parts displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Filter by Status Tab**
- **Trigger:** User clicks All/New/Existing tab button
- **Behavior:**
  1. Update selected tab state
  2. Filter parts list by status
  3. Update table to show only matching parts
  4. Maintain search filter if active
- **Validation:** None
- **Success:** Filtered parts displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Add Manual Part**
- **Trigger:** User clicks "Add Manual Part" button
- **Behavior:**
  1. Open Add/Edit Part dialog
  2. Show empty form
  3. Set default status to "new"
  4. User fills form fields
  5. User clicks "Save Part"
  6. Validate form data
  7. If valid, add part to list
  8. Close dialog
  9. Scroll to new part in table
- **Validation:**
  - Part Name: Required, 2-200 characters, unique within BOM
  - Material: Required, 2-100 characters
  - Quantity: Positive integer
  - Weight: Positive decimal (if provided)
  - If status = existing: Supplier, Price, Lead Time required
- **Success:** Part added to list, dialog closed
- **Error:** Display validation errors in dialog
  - "Part name is required"
  - "Part name already exists"
  - "Please fill in required fields"
- **Navigation:** None (stays on screen)

**Action: Edit Part**
- **Trigger:** User clicks edit icon (pencil) on part row
- **Behavior:**
  1. Open Add/Edit Part dialog
  2. Pre-fill form with part data
  3. User modifies fields
  4. User clicks "Save Part"
  5. Validate form data
  6. If valid, update part in list
  7. Close dialog
- **Validation:** Same as Add Manual Part
- **Success:** Part updated, dialog closed
- **Error:** Display validation errors in dialog
- **Navigation:** None (stays on screen)

**Action: Delete Part**
- **Trigger:** User clicks delete icon (trash) on part row
- **Behavior:**
  1. Show confirmation dialog: "Are you sure you want to delete this part?"
  2. If confirmed:
     - Remove part from list
     - Update summary metrics
     - Show success message
- **Validation:** None
- **Success:** Part deleted, list updated
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Upload ERP Data**
- **Trigger:** User clicks "Upload data from ERP" button
- **Behavior:**
  1. Open ERP Upload dialog
  2. Show file upload zone
  3. User selects/drops ERP file
  4. Show uploading state with spinner
  5. Backend parses ERP file
  6. Backend matches parts against ERP data
  7. Update matched parts to "existing" status
  8. Add supplier, price, lead time data
  9. Show completion state with matched count
  10. User clicks "View Updated Parts"
  11. Close dialog
  12. Highlight updated parts in table
- **Validation:**
  - File type: .xlsx, .xls, .csv, .xml
  - File size: <10MB
  - Valid ERP structure
- **Success:** 
  - Parts matched and updated
  - Dialog shows: "X parts matched and updated to 'Existing'"
- **Error:** Display error message
  - "Invalid file format"
  - "Failed to parse ERP file"
  - "No parts matched"
- **Navigation:** None (stays on screen)

**Action: Save Project**
- **Trigger:** User clicks "Save Project" button (footer)
- **Behavior:**
  1. Validate project information is complete
  2. Validate at least 1 part exists
  3. Save project to backend
  4. Save all parts with classifications
  5. Update project status to "confirmed"
  6. Navigate to next screen (RFQ Method Selection or Projects List)
- **Validation:**
  - Project information complete
  - At least 1 part in BOM
  - All required part fields filled
- **Success:** Project saved, navigate to next screen
- **Error:** Display error message
  - "Please complete project information before saving"
  - "BOM must contain at least one part"
- **Navigation:** The Split → RFQ Method Selection (or Projects List)


### 7.2 Secondary Actions

**Action: View Part Details**
- **Trigger:** User hovers over part row
- **Behavior:** Highlight row with light gray background
- **Validation:** None
- **Success:** Row highlighted
- **Error:** N/A
- **Navigation:** None

**Action: Sort Parts Table**
- **Trigger:** User clicks column header (future enhancement)
- **Behavior:** Sort parts by that column (ascending/descending)
- **Validation:** None
- **Success:** Parts sorted
- **Error:** N/A
- **Navigation:** None

**Action: Export Parts List**
- **Trigger:** User clicks export button (future enhancement)
- **Behavior:** Download parts list as Excel file
- **Validation:** None
- **Success:** File downloaded
- **Error:** Display error message
- **Navigation:** None

### 7.3 Navigation

**From:**
- BOM Upload screen (after successful upload)
- Projects List (when viewing existing project)
- Project Summary (when editing project)

**To:**
- RFQ Method Selection (after saving project with new parts)
- Projects List (after saving project without new parts)
- Project Summary (alternative path)

**Exit Points:**
- "Save Project" button → RFQ Method Selection or Projects List
- Browser back button → BOM Upload or Projects List
- App Header logo → Projects List

## 8. Business Rules

### 8.1 Validation Rules

**Project ID Validation:**
- Must be unique across all projects
- Format: Alphanumeric, hyphens, underscores allowed
- Length: 3-50 characters
- Cannot be empty
- Error: "Project ID is required"
- Error: "Project ID already exists"

**Project Description Validation:**
- Length: 2-500 characters
- Cannot be empty
- Error: "Project Description is required"

**Platform Name Validation:**
- Length: 2-100 characters
- Cannot be empty
- Error: "Platform Name is required"

**Customer Name Validation:**
- Length: 2-200 characters
- Cannot be empty
- Error: "Customer Name is required"

**Location Validation:**
- Length: 2-500 characters
- Cannot be empty
- Supports multi-line text
- Error: "Location is required"

**BOM File Validation:**
- Must exist (file name not empty)
- Error: "BOM File is required. Please upload a BOM file."

**Part Name Validation:**
- Length: 2-200 characters
- Cannot be empty
- Must be unique within BOM
- Error: "Part name is required"
- Error: "Part name already exists"

**Material Validation:**
- Length: 2-100 characters
- Cannot be empty
- Error: "Material is required"

**Quantity Validation:**
- Must be positive integer
- Cannot be zero or negative
- Error: "Quantity must be positive"

**Target Weight Validation (Optional):**
- If provided, must be positive decimal
- Cannot be zero or negative
- Error: "Target weight must be positive"

**Existing Part Additional Validation:**
- If status = "existing":
  - Current Supplier: Required, 2-200 characters
  - Current Price: Required, positive decimal
  - Lead Time: Required, positive integer (weeks)
- Error: "Supplier is required for existing parts"
- Error: "Price is required for existing parts"
- Error: "Lead time is required for existing parts"

### 8.2 Calculation Logic

**Parts Count:**
```
parts_count = total number of parts in list
```

**Existing Parts Count:**
```
existing_parts_count = count of parts where status = "existing"
```

**New Parts Count:**
```
new_parts_count = count of parts where status = "new"
```

**Existing Parts Percentage:**
```
existing_parts_percentage = (existing_parts_count / parts_count) * 100
Round to nearest integer
```

**New Parts Percentage:**
```
new_parts_percentage = (new_parts_count / parts_count) * 100
Round to nearest integer
```

**Existing Parts Value:**
```
existing_parts_value = Sum(current_price * quantity) for all existing parts
Format: €X.XM (millions)
```

**New Parts Target Value:**
```
new_parts_target_value = new_parts_count * estimated_average_price
Estimated average: €50,000 per part (configurable)
Format: €X.XM (millions)
```

**Total Project Value:**
```
total_project_value = existing_parts_value + new_parts_target_value
```

### 8.3 Conditional Display Logic

**Edit Mode:**
- Show "Edit" button if: `isEditingProject === false`
- Show "Save" and "Cancel" buttons if: `isEditingProject === true`
- Enable input fields if: `isEditingProject === true`
- Show BOM upload/remove if: `isEditingProject === true`

**BOM File Display:**
- Show file name and remove button if: `bomFileName !== ''`
- Show "No BOM file uploaded" if: `bomFileName === ''`
- Show upload zone if: `isEditingProject === true`

**Parts Table:**
- Show table if: `parts.length > 0`
- Show "No parts match" message if: `filteredParts.length === 0`
- Show empty state if: `parts.length === 0`

**Status Badge Color:**
- Green badge if: `part.status === 'existing'`
- Orange badge if: `part.status === 'new'`

**Current Info Column:**
- Show supplier/price/lead time if: `part.status === 'existing'`
- Show "Requires RFQ" if: `part.status === 'new'`

**Add/Edit Dialog Conditional Fields:**
- Show Supplier, Price, Lead Time fields if: `formData.status === 'existing'`
- Hide these fields if: `formData.status === 'new'`

**Summary Card Percentages:**
- Calculate and display if: `parts.length > 0`
- Show "0%" if: `parts.length === 0`

### 8.4 Error Handling

**Project Save Validation Error:**
- **Detection:** Required field empty or invalid
- **Handling:**
  - Display error message inline below field
  - Prevent save action
  - Focus first invalid field
  - Keep edit mode active

**BOM Upload Error:**
- **Detection:** Invalid file type, size, or structure
- **Handling:**
  - Display error message in upload zone
  - Change to error state (red border)
  - Allow user to try again
  - Log error for monitoring

**Part Add/Edit Validation Error:**
- **Detection:** Required field empty or invalid
- **Handling:**
  - Display error message in dialog
  - Highlight invalid fields
  - Prevent save action
  - Keep dialog open

**ERP Upload Error:**
- **Detection:** Invalid file or no matches found
- **Handling:**
  - Display error in dialog
  - Show specific error message
  - Allow user to try again
  - Log error for monitoring

**Network Error:**
- **Detection:** API call fails or times out
- **Handling:**
  - Display error toast: "Failed to save. Please check your connection and try again."
  - Keep data in form (don't lose user's work)
  - Provide retry option
  - Log error for monitoring

**Duplicate Part Name Error:**
- **Detection:** Part name already exists in BOM
- **Handling:**
  - Display error: "Part name already exists"
  - Highlight part name field
  - Suggest: "Please use a unique part name"
  - Prevent save action


## 9. Acceptance Criteria

### 9.1 Functional Criteria

1. WHEN user navigates to The Split screen THEN screen SHALL display within 2 seconds
2. WHEN screen loads THEN project information SHALL be displayed in view mode
3. WHEN screen loads THEN summary cards SHALL show correct counts and percentages
4. WHEN screen loads THEN parts table SHALL display all parts from BOM
5. WHEN user clicks "Edit" button THEN project information SHALL enter edit mode
6. WHEN user edits project fields THEN changes SHALL be reflected in real-time
7. WHEN user clicks "Save" button THEN system SHALL validate all required fields
8. WHEN validation fails THEN system SHALL display specific error messages inline
9. WHEN validation passes THEN system SHALL save changes and exit edit mode
10. WHEN user clicks "Cancel" button THEN changes SHALL be discarded and edit mode SHALL exit
11. WHEN user uploads new BOM file THEN system SHALL replace current parts list
12. WHEN user removes BOM file THEN system SHALL clear all parts and show confirmation
13. WHEN user types in search field THEN parts table SHALL filter in real-time
14. WHEN user clicks status tab THEN parts table SHALL filter by status
15. WHEN user clicks "Add Manual Part" THEN dialog SHALL open with empty form
16. WHEN user fills form and clicks "Save Part" THEN part SHALL be added to list
17. WHEN user clicks edit icon on part THEN dialog SHALL open with part data
18. WHEN user updates part and saves THEN part SHALL be updated in list
19. WHEN user clicks delete icon on part THEN confirmation SHALL be shown
20. WHEN user confirms delete THEN part SHALL be removed from list
21. WHEN user clicks "Upload data from ERP" THEN ERP upload dialog SHALL open
22. WHEN user uploads ERP file THEN system SHALL match and update parts
23. WHEN ERP upload completes THEN dialog SHALL show matched parts count
24. WHEN user clicks "Save Project" THEN system SHALL validate and save project
25. WHEN save succeeds THEN system SHALL navigate to next screen
26. WHEN parts list is empty THEN "Save Project" SHALL show error
27. WHEN project info is incomplete THEN "Save Project" SHALL show error
28. WHEN part name is duplicate THEN system SHALL prevent save and show error
29. WHEN existing part missing supplier info THEN system SHALL show error
30. WHEN user hovers over part row THEN row SHALL highlight

### 9.2 Flexibility Criteria

1. WHEN BOM contains custom attributes THEN system SHALL store them
2. WHEN Master List has optional fields THEN system SHALL display them
3. WHEN admin adds new project field THEN it SHALL appear in form
4. WHEN LLM classifies part with >90% confidence THEN auto-classify without review
5. WHEN LLM classifies part with 70-90% confidence THEN auto-classify and flag for review
6. WHEN LLM classifies part with <70% confidence THEN require user confirmation
7. WHEN LLM fails THEN system SHALL fall back to rule-based matching
8. WHEN rule-based matching fails THEN system SHALL default to "new" status

### 9.3 UX Criteria

1. Screen loads within 2 seconds on standard broadband connection
2. All form fields have clear labels with required indicators (*)
3. Edit mode is visually distinct from view mode
4. Summary cards use color coding (blue, orange, green, purple)
5. Status badges are color-coded (green for existing, orange for new)
6. Parts table has hover effects on rows
7. Search filters parts in real-time without lag
8. Tab buttons show active state clearly
9. Action buttons are clearly labeled and appropriately enabled/disabled
10. Dialogs are centered and have smooth animations
11. Loading states show spinners with descriptive messages
12. Success states show check icons with confirmation messages
13. Error messages are specific, actionable, and non-technical
14. All interactive elements have hover states
15. Mobile-responsive design works on screens 768px and wider (tablet+)

### 9.4 Edge Cases

1. WHEN BOM has 0 parts THEN system SHALL show empty state message
2. WHEN BOM has 1000+ parts THEN table SHALL render without performance issues
3. WHEN all parts are existing THEN "New Parts" card SHALL show 0
4. WHEN all parts are new THEN "Existing Parts" card SHALL show 0
5. WHEN search returns no results THEN system SHALL show "No parts match" message
6. WHEN user uploads BOM with same file name THEN system SHALL accept it
7. WHEN user edits project and navigates away THEN system SHALL warn about unsaved changes
8. WHEN user adds part with same name as deleted part THEN system SHALL allow it
9. WHEN ERP upload matches 0 parts THEN system SHALL show "No parts matched" message
10. WHEN ERP upload matches all parts THEN system SHALL update all to existing
11. WHEN user removes BOM and tries to save THEN system SHALL show error
12. WHEN network fails during save THEN system SHALL show error and retain data
13. WHEN user refreshes page during edit THEN system SHALL warn about unsaved changes
14. WHEN project ID already exists THEN system SHALL show error on save
15. WHEN user enters multi-line location THEN system SHALL preserve line breaks

## 10. Dependencies

### 10.1 Prerequisites
- User authenticated and has active session
- User has completed buyer profile
- BOM file uploaded successfully (from BOM Upload screen)
- Project ID generated or provided

### 10.2 Backend/API Requirements

**Project Management Endpoints:**
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project information
- `POST /api/projects/{id}/confirm` - Confirm project and classification
- `GET /api/projects/{id}/check` - Check if project ID exists

**Parts Management Endpoints:**
- `GET /api/projects/{id}/parts` - Get all parts for project
- `POST /api/projects/{id}/parts` - Add new part
- `PUT /api/projects/{id}/parts/{part_id}` - Update part
- `DELETE /api/projects/{id}/parts/{part_id}` - Delete part
- `POST /api/projects/{id}/parts/classify` - Run classification on parts

**BOM Management Endpoints:**
- `POST /api/projects/{id}/bom/upload` - Upload new BOM file
- `DELETE /api/projects/{id}/bom` - Remove BOM file
- `GET /api/projects/{id}/bom/download` - Download current BOM

**ERP Integration Endpoints:**
- `POST /api/projects/{id}/erp/upload` - Upload ERP data file
- `POST /api/projects/{id}/erp/match` - Match parts against ERP data
- `GET /api/erp/contracts` - Get existing contracts for matching

**Data Structures:**

```typescript
interface Project {
  project_id: string;
  project_description: string;
  platform_name: string;
  customer_name: string;
  delivery_location: string;
  bom_file_name: string;
  upload_timestamp: Date;
  parts_count: number;
  existing_parts_count: number;
  new_parts_count: number;
  classification_status: 'pending' | 'confirmed' | 'modified';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface Part {
  part_id: string;
  project_id: string;
  part_name: string;
  description?: string;
  material: string;
  quantity: number;
  target_weight?: number;
  status: 'existing' | 'new';
  current_supplier?: string;
  current_price?: number;
  lead_time?: number;
  contract_id?: string;
  contract_expiry?: Date;
  classification_confidence?: number;
  classification_method?: 'llm' | 'rule' | 'manual';
  custom_attributes?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

interface ProjectUpdateRequest {
  project_description?: string;
  platform_name?: string;
  customer_name?: string;
  delivery_location?: string;
}

interface PartCreateRequest {
  part_name: string;
  description?: string;
  material: string;
  quantity: number;
  target_weight?: number;
  status: 'existing' | 'new';
  current_supplier?: string;
  current_price?: number;
  lead_time?: number;
}

interface PartUpdateRequest {
  part_name?: string;
  description?: string;
  material?: string;
  quantity?: number;
  target_weight?: number;
  status?: 'existing' | 'new';
  current_supplier?: string;
  current_price?: number;
  lead_time?: number;
}

interface ERPUploadResponse {
  success: boolean;
  matched_count: number;
  updated_parts: string[]; // Array of part IDs
  unmatched_parts: string[];
  error?: string;
}

interface ClassificationResponse {
  part_id: string;
  suggested_status: 'existing' | 'new';
  confidence: number;
  matched_contract_id?: string;
  reasoning: string;
}
```

### 10.3 Integration Points

**DynamoDB Storage:**
- Store project metadata in Projects table
- Store parts in Parts table with project_id foreign key
- Store custom attributes flexibly (NoSQL advantage)
- Enable fast queries for classification

**LLM Classification Service:**
- Analyze part names and materials
- Match against contracts database
- Provide confidence scores
- Return reasoning for classification

**ERP Integration:**
- Parse ERP export files (Excel, CSV, XML)
- Match parts by name, material, specifications
- Extract supplier, price, lead time data
- Update parts with existing contract information

**Master Field List:**
- Configuration service for organization-wide fields
- Field definitions: name, type, validation, mandatory flag
- Admin interface for managing Master List (post-MVP)

**File Storage:**
- S3 for BOM file storage
- Versioning for BOM files
- Secure access with signed URLs

## 11. Success Metrics

### 11.1 Performance Metrics
- **Screen Load Time:** <2 seconds for 100-part BOM
- **Classification Accuracy:** >95% of parts correctly classified
- **ERP Match Rate:** >90% of existing parts matched from ERP data
- **Save Success Rate:** >99% of save operations succeed

### 11.2 User Experience Metrics
- **Time to Review:** <5 minutes to review and confirm 100-part BOM
- **Edit Frequency:** <10% of classifications manually changed
- **ERP Upload Usage:** >80% of users upload ERP data
- **User Satisfaction:** >4.5/5 rating for The Split experience

### 11.3 Data Quality Metrics
- **Classification Confidence:** >90% of parts classified with >90% confidence
- **Manual Additions:** <5% of parts manually added
- **Duplicate Detection:** 100% of duplicate part names detected
- **Validation Accuracy:** 100% of invalid data caught before save

## 12. Open Questions

1. **Auto-Save:** Should project information auto-save as user edits, or only on explicit save?
2. **Classification Override:** Should system track when user overrides LLM classification?
3. **Bulk Actions:** Should users be able to bulk edit/delete multiple parts at once?
4. **Export:** Should users be able to export The Split results to Excel?
5. **History:** Should system track classification history and changes over time?
6. **Notifications:** Should users receive notifications when ERP upload completes?
7. **Collaboration:** Can multiple users edit same project simultaneously?
8. **Approval Workflow:** Should The Split require approval before proceeding to RFQ?
9. **Templates:** Should system support project templates for common BOMs?
10. **Integration:** Should system integrate with PLM systems for part data?
11. **Audit Trail:** What level of detail is required for audit logging?
12. **Performance:** What is the maximum BOM size the system should support?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial screen requirements document |
