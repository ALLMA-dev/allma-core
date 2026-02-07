# Screen Requirements: BOM Upload

## 1. Overview
- **Screen ID:** SCR-003
- **Component File:** `src/app/components/BOMUpload.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** Medium - Supports dynamic BOM attributes beyond core fields

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** upload my Bill of Materials (BOM) file to initialize a new project  
**So that** the system can analyze parts and identify which require new RFQs

### Related User Stories
- **US-MVP-02A:** Create RFQ Manually from Scratch (alternative method)
- **US-MVP-02B:** Duplicate Existing RFQ with Modifications (alternative method)
- **US-MVP-02C:** Create RFQ from Uploaded Files (this is the BOM upload path)
- **REQ-MVP-00A:** BOM Upload & Project Initialization
- **REQ-MVP-00B:** "The Split" - Existing vs New Parts Classification

## 3. Screen Purpose & Context

### Purpose
This screen enables buyers to upload Bill of Materials (BOM) files to initialize new projects. The system extracts part information, validates data structure, and prepares for "The Split" analysis (existing vs new parts).

### Context
- **When user sees this:** 
  - After login when starting a new project
  - From Project Initiation screen when selecting "Upload BOM" method
  - From Projects List when clicking "New Project"
- **Why it exists:** 
  - Automate part data entry from existing BOM files
  - Enable bulk project initialization (multiple parts at once)
  - Prepare data for existing vs new parts analysis
  - Support dynamic BOM attributes for flexibility
- **Position in journey:** 
  - Entry point for project-based RFQ workflow
  - Precedes "The Split" analysis
  - Alternative to manual RFQ creation

### Key Characteristics
- **File-based input:** Accepts Excel files (.xlsx, .xls)
- **Drag-and-drop:** User-friendly upload interface
- **Real-time processing:** Immediate validation and parsing
- **Project ID generation:** Auto-generates unique project identifier
- **Dynamic field support:** Handles standard + custom BOM attributes
- **Fast processing:** <30 seconds for 100-part BOM

## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Title:** "Project Initiation - Upload BOM File"
2. **Description:** "Upload your Bill of Materials to start a new project"

**Main Upload Card:**
1. **Card Header**
   - Title: "Upload Bill of Materials (BOM)"
   - Description: Context about what happens after upload

2. **Project ID Section**
   - Label: "Project ID"
   - Input field with auto-generated value
   - Help text: "Auto-generated, but you can customize it"

3. **File Upload Area** (state-dependent)
   - **Idle State:** Drag-and-drop zone with upload icon
   - **Uploading State:** Loading spinner with progress message
   - **Success State:** Green confirmation with file details
   - **Error State:** Red error message with retry option

4. **Required Fields Info Box**
   - Blue background info panel
   - Lists required BOM fields with descriptions

5. **Action Buttons**
   - "Upload Another BOM" (secondary)
   - "View Part Analysis" (primary) - navigates to The Split

**Info Banner (Bottom):**
- Explains what happens next
- Describes "The Split" concept

### 4.2 Key UI Elements

**Project ID Input:**
- **Label:** "Project ID"
- **Input:** Text field, editable
- **Default Value:** Auto-generated (e.g., "PRJ-2025-001")
- **Help Text:** "Auto-generated, but you can customize it"
- **Validation:** Real-time, unique ID check

**File Upload Zone (Idle):**
- **Container:** Dashed border, hover effect
- **Icon:** Upload icon (large, centered)
- **Primary Text:** "Drag and drop your BOM file here, or click to browse"
- **Secondary Text:** "Supports Excel files (.xlsx, .xls)"
- **Behavior:** Click to open file picker, drag-and-drop support

**File Upload Zone (Uploading):**
- **Container:** Blue border, blue background
- **Icon:** Animated spinner
- **Primary Text:** "Uploading and processing BOM..."
- **Secondary Text:** "Analyzing parts and checking against existing contracts"

**File Upload Zone (Success):**
- **Container:** Green border, green background
- **Icon:** Check circle (green)
- **Primary Text:** "BOM uploaded successfully!"
- **File Name:** Display uploaded file name
- **Part Count:** "25 parts identified • Processing complete"

**File Upload Zone (Error):**
- **Container:** Red border, red background
- **Icon:** Alert circle (red)
- **Primary Text:** "Upload failed"
- **Error Message:** Specific error description
- **Action:** Implicit retry (click zone again)

**Required Fields Info Box:**
- **Container:** Blue background, blue border
- **Title:** "Required BOM Fields:"
- **List Items:**
  - Part Name - Unique identifier for each part
  - Material - Material type (e.g., Aluminum 6061, Steel 1045)
  - Quantity - Annual volume required
  - Target Weight - Expected part weight (optional)

**Action Buttons:**
- **Upload Another BOM:** Outline button, disabled until success
- **View Part Analysis:** Primary button (blue), disabled until success, navigates to The Split

**Info Banner:**
- **Container:** Gray background, gray border
- **Title:** "What happens next?"
- **Content:** Explains The Split (Existing Parts vs New Parts)

### 4.3 Information Hierarchy

**Primary Information:**
- Upload status (idle/uploading/success/error)
- Project ID
- File name (after upload)
- Part count (after upload)

**Secondary Information:**
- Required BOM fields
- Upload instructions
- Processing status messages

**Tertiary Information:**
- What happens next explanation
- Help text for Project ID

## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_id | String | System/User | Yes | Format: "PRJ-YYYY-NNN" or custom |
| upload_timestamp | DateTime | System | Yes | ISO 8601 |
| file_name | String | File Upload | Yes | Original file name |
| file_size | Number | File Upload | Yes | Bytes |
| parts_count | Number | Calculated | Yes | Integer, >0 |
| processing_status | Enum | System | Yes | "idle", "uploading", "processing", "success", "error" |

### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| project_name | String | No | Yes | 2-200 characters |
| platform_name | String | No | Yes | 2-100 characters |
| customer_name | String | No | Yes | 2-200 characters |
| delivery_location | String | No | Yes | 2-200 characters |
| sop_date | Date | No | Yes | ISO 8601 date |

### 5.3 Dynamic Fields (Buyer-Selectable)
| Field Name | Data Type | Conditions | Validation Rules | Default Value |
|------------|-----------|------------|------------------|---------------|
| custom_attribute_1 | String | If defined in Master List | Per field config | null |
| custom_attribute_2 | Number | If defined in Master List | Per field config | null |
| custom_attribute_N | Any | If defined in Master List | Per field config | null |

### 5.4 BOM Part Fields (Required)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| part_name | String | BOM File | Yes | 2-200 characters, unique within BOM |
| material | String | BOM File | Yes | 2-100 characters |
| quantity | Number | BOM File | Yes | Integer, >0 |
| target_weight | Number | BOM File | No | Decimal, >0 |

### 5.5 BOM Part Fields (Optional/Dynamic)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| part_number | String | BOM File | No | Alphanumeric |
| description | String | BOM File | No | 0-500 characters |
| specifications | String | BOM File | No | 0-1000 characters |
| target_price | Number | BOM File | No | Decimal, >0 |
| [custom_fields] | Various | BOM File | No | Per Master List config |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| project_id | Auto-generate if not provided: "PRJ-{YYYY}-{NNN}" | Current year, sequence number |
| parts_count | Count rows in BOM file | BOM file parsing |
| existing_parts_count | Count parts matching existing contracts | Parts database lookup |
| new_parts_count | parts_count - existing_parts_count | parts_count, existing_parts_count |
| upload_duration | processing_end_time - upload_start_time | Timestamps |

## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**Dynamic BOM Attributes:**
- System extracts all columns from BOM file
- Maps known columns to standard fields (Part Name, Material, Quantity, Target Weight)
- Identifies additional columns as custom attributes
- Validates custom attributes against Master Field List
- Flags unknown attributes for admin review

**Field Selection Process:**
- Admin pre-configures Master Field List with organization-wide BOM attributes
- System automatically detects which Master List fields are present in uploaded BOM
- Buyer can later configure which fields are mandatory for RFQs
- Unknown fields in BOM trigger warning but don't block upload

**Mandatory Field Rules:**
- Core system fields (Part Name, Material, Quantity) are always mandatory
- Target Weight is optional but recommended
- Custom fields from Master List can be marked mandatory per project
- Missing mandatory fields trigger validation errors

### 6.2 UI Adaptation Logic

**Form Generation:**
- UI displays all detected BOM columns in preview (post-upload)
- Standard fields shown first, custom fields shown after
- Custom fields labeled with "(Custom)" indicator
- Field order follows Master List configuration

**Layout Rules:**
- Standard fields: Fixed layout (Part Name, Material, Quantity, Target Weight)
- Custom fields: Dynamic grid layout, 2-3 columns depending on field count
- Long text fields: Full width
- Numeric fields: Half width

**Validation Adaptation:**
- Standard fields: Hardcoded validation rules
- Custom fields: Validation rules from Master List configuration
- Unknown fields: No validation, stored as-is

### 6.3 LLM Integration

**LLM Role:**
- Parse Excel file structure
- Identify column headers and data types
- Map columns to standard fields (fuzzy matching)
- Detect data quality issues
- Suggest corrections for ambiguous data

**Input to LLM:**
- Excel file content (first 10 rows for structure analysis)
- Master Field List configuration
- Historical BOM patterns from this buyer

**Output from LLM:**
- Column mapping: Excel column → Standard field
- Data type detection: String, Number, Date, etc.
- Confidence scores per mapping (0-100%)
- Data quality warnings
- Suggested corrections

**Confidence Scoring:**
- High confidence (>90%): Auto-map, no user review
- Medium confidence (70-90%): Auto-map, flag for review
- Low confidence (<70%): Require user confirmation

**Fallback Behavior:**
- If LLM fails: Use rule-based column matching (exact name match)
- If rule-based fails: Prompt user to manually map columns
- If user skips mapping: Store columns as custom attributes

## 7. User Interactions

### 7.1 Primary Actions

**Action: Edit Project ID**
- **Trigger:** User types in Project ID input field
- **Behavior:**
  1. Allow user to edit auto-generated ID
  2. Validate uniqueness in real-time
  3. Display error if ID already exists
  4. Update ID in system state
- **Validation:**
  - Not empty
  - Unique across all projects
  - Valid format (alphanumeric, hyphens, underscores)
  - Max 50 characters
- **Success:** ID updated, ready for upload
- **Error:** Display error below field
  - "Project ID already exists"
  - "Invalid characters in Project ID"
- **Navigation:** None (stays on screen)

**Action: Upload BOM File (Drag-and-Drop)**
- **Trigger:** User drags file over upload zone and drops
- **Behavior:**
  1. Validate file type (.xlsx, .xls)
  2. Validate file size (<10MB)
  3. Change status to "uploading"
  4. Upload file to backend
  5. Backend parses Excel file
  6. Backend extracts part data
  7. Backend validates required fields
  8. Backend checks against existing contracts
  9. Change status to "success" or "error"
  10. Display results
- **Validation:**
  - File type: .xlsx or .xls
  - File size: <10MB
  - Required columns present: Part Name, Material, Quantity
  - At least 1 part row
  - No duplicate part names
- **Success:** 
  - Display success message
  - Show file name
  - Show parts count
  - Enable "View Part Analysis" button
- **Error:** Display specific error message
  - "Invalid file type. Please upload Excel file (.xlsx, .xls)"
  - "File too large. Maximum size is 10MB"
  - "Missing required columns: [list]"
  - "No parts found in BOM file"
  - "Duplicate part names: [list]"
- **Navigation:** None (stays on screen, ready for next action)

**Action: Upload BOM File (Click to Browse)**
- **Trigger:** User clicks on upload zone
- **Behavior:**
  1. Open file picker dialog
  2. User selects Excel file
  3. Same behavior as drag-and-drop from step 1
- **Validation:** Same as drag-and-drop
- **Success:** Same as drag-and-drop
- **Error:** Same as drag-and-drop
- **Navigation:** None

**Action: View Part Analysis**
- **Trigger:** User clicks "View Part Analysis" button (enabled after successful upload)
- **Behavior:**
  1. Save BOM data to project
  2. Navigate to "The Split" screen
  3. Pass project ID and BOM data
- **Validation:** Upload must be successful
- **Success:** Navigate to The Split screen
- **Error:** N/A (button disabled if upload not successful)
- **Navigation:** BOM Upload → The Split (Screen 4)

### 7.2 Secondary Actions

**Action: Upload Another BOM**
- **Trigger:** User clicks "Upload Another BOM" button (enabled after successful upload)
- **Behavior:**
  1. Reset upload status to "idle"
  2. Clear file name
  3. Clear parts count
  4. Keep Project ID (user can change if needed)
  5. Disable action buttons
- **Validation:** None
- **Success:** Upload zone reset, ready for new file
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Cancel Upload (During Processing)**
- **Trigger:** User clicks cancel button or navigates away during upload
- **Behavior:**
  1. Abort file upload
  2. Reset status to "idle"
  3. Clear partial data
- **Validation:** None
- **Success:** Upload cancelled, zone reset
- **Error:** N/A
- **Navigation:** Optional (if user navigates away)

### 7.3 Navigation

**From:**
- Project Initiation screen (selecting "Upload BOM" method)
- Projects List (clicking "New Project")
- App Header (clicking logo, then "New Project")

**To:**
- The Split screen (after successful upload and clicking "View Part Analysis")
- Project Initiation (if user cancels or goes back)

**Exit Points:**
- "View Part Analysis" button → The Split screen
- Browser back button → Project Initiation
- App Header logo → Projects List

## 8. Business Rules

### 8.1 Validation Rules

**Project ID Validation:**
- Must be unique across all projects
- Format: Alphanumeric, hyphens, underscores allowed
- Length: 3-50 characters
- Auto-generated format: "PRJ-YYYY-NNN" (e.g., "PRJ-2025-001")
- Error: "Project ID already exists"
- Error: "Project ID must be 3-50 characters"

**File Type Validation:**
- Allowed: .xlsx, .xls
- Not allowed: .csv, .pdf, .txt, etc.
- Error: "Invalid file type. Please upload Excel file (.xlsx, .xls)"

**File Size Validation:**
- Maximum: 10MB
- Reason: Prevent server overload, ensure fast processing
- Error: "File too large. Maximum size is 10MB"

**BOM Structure Validation:**
- Required columns: Part Name, Material, Quantity
- Optional columns: Target Weight, Part Number, Description, etc.
- At least 1 data row (excluding header)
- Error: "Missing required columns: [list]"
- Error: "No parts found in BOM file"

**Part Name Validation:**
- Must be unique within BOM
- Length: 2-200 characters
- Cannot be empty
- Error: "Duplicate part names: [list]"
- Error: "Part name cannot be empty"

**Material Validation:**
- Length: 2-100 characters
- Cannot be empty
- Error: "Material cannot be empty for part: [part_name]"

**Quantity Validation:**
- Must be positive integer
- Cannot be zero or negative
- Error: "Quantity must be positive for part: [part_name]"

**Target Weight Validation (Optional):**
- If provided, must be positive decimal
- Cannot be zero or negative
- Error: "Target weight must be positive for part: [part_name]"

### 8.2 Calculation Logic

**Project ID Auto-Generation:**
```
project_id = "PRJ-" + current_year + "-" + sequence_number
where sequence_number = zero-padded 3-digit number (001, 002, ...)

Example: "PRJ-2025-001", "PRJ-2025-002", etc.
```

**Parts Count:**
```
parts_count = number of rows in BOM file (excluding header)
```

**Upload Duration:**
```
upload_duration = processing_end_time - upload_start_time
Target: <30 seconds for 100-part BOM
```

**File Size Check:**
```
if file_size > 10MB:
  reject_upload("File too large")
```

### 8.3 Conditional Display Logic

**Upload Zone States:**
- Show "Idle" state if: `uploadStatus === 'idle'`
- Show "Uploading" state if: `uploadStatus === 'uploading'`
- Show "Success" state if: `uploadStatus === 'success'`
- Show "Error" state if: `uploadStatus === 'error'`

**Action Buttons:**
- "Upload Another BOM" enabled if: `uploadStatus === 'success'`
- "View Part Analysis" enabled if: `uploadStatus === 'success'`
- Both disabled if: `uploadStatus !== 'success'`

**File Name Display:**
- Show if: `uploadStatus === 'success' && fileName !== ''`
- Hide if: `uploadStatus !== 'success'`

**Parts Count Display:**
- Show if: `uploadStatus === 'success' && partsCount > 0`
- Hide if: `uploadStatus !== 'success'`

### 8.4 Error Handling

**File Type Error:**
- **Detection:** File extension not .xlsx or .xls
- **Handling:**
  - Display error in upload zone
  - Change status to "error"
  - Allow user to try again
  - Log error for monitoring

**File Size Error:**
- **Detection:** File size >10MB
- **Handling:**
  - Display error: "File too large. Maximum size is 10MB"
  - Suggest: "Please reduce file size or split into multiple BOMs"
  - Allow retry

**Missing Columns Error:**
- **Detection:** Required columns not found in Excel file
- **Handling:**
  - Display error: "Missing required columns: [list]"
  - Show required columns list
  - Suggest: "Please ensure your BOM file has these columns"
  - Allow retry

**Duplicate Part Names Error:**
- **Detection:** Multiple rows with same Part Name
- **Handling:**
  - Display error: "Duplicate part names: [list]"
  - List duplicate names
  - Suggest: "Please ensure each part has a unique name"
  - Allow retry

**Empty BOM Error:**
- **Detection:** No data rows in Excel file
- **Handling:**
  - Display error: "No parts found in BOM file"
  - Suggest: "Please ensure your BOM file has at least one part"
  - Allow retry

**Network Error:**
- **Detection:** Upload fails due to network issue
- **Handling:**
  - Display error: "Upload failed. Please check your connection and try again."
  - Retry button
  - Log error for monitoring

**Backend Processing Error:**
- **Detection:** Backend returns error during parsing
- **Handling:**
  - Display error: "Failed to process BOM file. Please try again."
  - If specific error available, display it
  - Allow retry
  - Log error with details for debugging

## 9. Acceptance Criteria

### 9.1 Functional Criteria

1. WHEN user navigates to BOM Upload screen THEN screen SHALL display within 2 seconds
2. WHEN screen loads THEN Project ID field SHALL be pre-filled with auto-generated ID
3. WHEN user edits Project ID THEN system SHALL validate uniqueness in real-time
4. WHEN user drags Excel file over upload zone THEN zone SHALL highlight with hover effect
5. WHEN user drops valid Excel file THEN system SHALL start upload and processing
6. WHEN user clicks upload zone THEN file picker dialog SHALL open
7. WHEN user selects valid Excel file THEN system SHALL start upload and processing
8. WHEN file is uploading THEN system SHALL display loading spinner and progress message
9. WHEN upload succeeds THEN system SHALL display success message with file name and parts count
10. WHEN upload fails THEN system SHALL display specific error message
11. WHEN upload succeeds THEN "View Part Analysis" button SHALL be enabled
12. WHEN user clicks "View Part Analysis" THEN system SHALL navigate to The Split screen
13. WHEN user clicks "Upload Another BOM" THEN upload zone SHALL reset to idle state
14. WHEN BOM file has required columns THEN upload SHALL succeed
15. WHEN BOM file missing required columns THEN upload SHALL fail with error message
16. WHEN BOM file has duplicate part names THEN upload SHALL fail with error message
17. WHEN BOM file is >10MB THEN upload SHALL fail with error message
18. WHEN BOM file is not Excel format THEN upload SHALL fail with error message
19. WHEN BOM has 100 parts THEN processing SHALL complete within 30 seconds
20. WHEN BOM has custom columns THEN system SHALL detect and store them

### 9.2 Flexibility Criteria

1. WHEN BOM contains Master List fields THEN system SHALL automatically map them
2. WHEN BOM contains unknown fields THEN system SHALL store them as custom attributes
3. WHEN LLM maps columns with >90% confidence THEN system SHALL auto-map without user review
4. WHEN LLM maps columns with 70-90% confidence THEN system SHALL flag for user review
5. WHEN LLM maps columns with <70% confidence THEN system SHALL require user confirmation
6. WHEN LLM fails THEN system SHALL fall back to rule-based matching
7. WHEN rule-based matching fails THEN system SHALL prompt user to manually map columns
8. WHEN user skips manual mapping THEN system SHALL store columns as-is

### 9.3 UX Criteria

1. Screen loads within 2 seconds on standard broadband connection
2. Upload zone has clear visual feedback for drag-and-drop (hover effect)
3. Upload zone has clear instructions for file selection
4. Loading spinner is animated and visible during upload
5. Success message is clear and includes file name and parts count
6. Error messages are specific, actionable, and non-technical
7. Action buttons are clearly labeled and appropriately enabled/disabled
8. Required fields info box is visible and easy to read
9. Info banner explains what happens next
10. All interactive elements have hover states
11. File picker dialog opens immediately when clicking upload zone
12. Upload progress is visible (spinner + message)
13. Success state is visually distinct (green color, check icon)
14. Error state is visually distinct (red color, alert icon)
15. Mobile-responsive design works on screens 320px and wider

### 9.4 Edge Cases

1. WHEN user uploads BOM with only 1 part THEN upload SHALL succeed
2. WHEN user uploads BOM with 1000+ parts THEN upload SHALL succeed (may take longer)
3. WHEN user uploads BOM with empty rows THEN system SHALL skip empty rows
4. WHEN user uploads BOM with extra columns THEN system SHALL store them as custom attributes
5. WHEN user uploads BOM with missing optional columns THEN upload SHALL succeed
6. WHEN user uploads BOM with special characters in part names THEN upload SHALL succeed
7. WHEN user uploads BOM with non-English characters THEN upload SHALL succeed
8. WHEN user uploads BOM with formulas in cells THEN system SHALL extract calculated values
9. WHEN user uploads BOM with multiple sheets THEN system SHALL use first sheet
10. WHEN user uploads BOM with merged cells THEN system SHALL handle gracefully
11. WHEN user navigates away during upload THEN upload SHALL be cancelled
12. WHEN user refreshes page during upload THEN upload SHALL be cancelled
13. WHEN network fails during upload THEN error message SHALL display with retry option
14. WHEN backend is unavailable THEN error message SHALL display with retry option
15. WHEN user uploads same BOM twice THEN system SHALL warn about duplicate Project ID

## 10. Dependencies

### 10.1 Prerequisites
- User authenticated and has active session
- User has completed buyer profile
- Browser supports drag-and-drop file upload
- Browser supports FileReader API

### 10.2 Backend/API Requirements

**BOM Upload Endpoints:**
- `POST /api/projects/bom/upload` - Upload and process BOM file
- `POST /api/projects/bom/validate` - Validate BOM structure before upload
- `GET /api/projects/id/generate` - Generate unique Project ID
- `GET /api/projects/id/check/{id}` - Check if Project ID exists

**Data Structures:**

```typescript
interface BOMUploadRequest {
  project_id: string;
  file: File; // Excel file
  buyer_id: string;
}

interface BOMUploadResponse {
  success: boolean;
  project_id: string;
  file_name: string;
  parts_count: number;
  existing_parts_count: number;
  new_parts_count: number;
  processing_duration: number; // seconds
  parts: BOMPart[];
  custom_fields: string[]; // List of detected custom columns
  warnings?: string[];
  error?: string;
}

interface BOMPart {
  part_name: string;
  material: string;
  quantity: number;
  target_weight?: number;
  part_number?: string;
  description?: string;
  specifications?: string;
  target_price?: number;
  custom_attributes?: Record<string, any>;
  is_existing: boolean; // Determined by "The Split" logic
  existing_contract_id?: string;
}

interface ProjectIDGenerateResponse {
  project_id: string; // e.g., "PRJ-2025-001"
}

interface ProjectIDCheckResponse {
  exists: boolean;
  project_id: string;
}
```

### 10.3 Integration Points

**Excel Parsing:**
- Library: xlsx or exceljs (Node.js)
- Parse Excel file structure
- Extract headers and data rows
- Handle multiple sheets (use first sheet)
- Handle formulas (extract calculated values)

**File Upload:**
- Multipart form data upload
- Progress tracking (optional for MVP)
- File size validation (client and server)
- File type validation (client and server)

**LLM Integration:**
- Column mapping service
- Data type detection
- Data quality analysis
- Confidence scoring

**DynamoDB Storage:**
- Store project metadata
- Store BOM parts in graph structure: Project → BOM → Parts
- Store custom attributes flexibly (NoSQL advantage)
- Enable fast queries for "The Split" analysis

**Master Field List:**
- Configuration service for organization-wide BOM fields
- Field definitions: name, type, validation rules, mandatory flag
- Admin interface for managing Master List (post-MVP)

## 11. Success Metrics

### 11.1 Performance Metrics
- **Upload Success Rate:** >98% of valid BOM uploads succeed
- **Processing Time:** <30 seconds for 100-part BOM
- **Processing Time:** <60 seconds for 500-part BOM
- **Error Rate:** <2% of uploads fail due to system errors

### 11.2 User Experience Metrics
- **Time to Upload:** <2 minutes from screen load to successful upload
- **Retry Rate:** <5% of users need to retry upload
- **Custom Field Detection:** >95% of custom columns correctly identified
- **User Satisfaction:** >4.5/5 rating for BOM upload experience

### 11.3 Data Quality Metrics
- **Column Mapping Accuracy:** >95% of columns correctly mapped
- **Data Extraction Accuracy:** >98% of part data correctly extracted
- **Duplicate Detection:** 100% of duplicate part names detected
- **Validation Accuracy:** 100% of missing required fields detected

## 12. Open Questions

1. **Multiple Sheets:** Should system support BOMs with multiple sheets? If yes, how to select sheet?
2. **BOM Templates:** Should system provide downloadable BOM template for users?
3. **Column Mapping UI:** Should users be able to manually map columns if auto-mapping fails?
4. **Progress Indicator:** Should upload show detailed progress (%, MB uploaded)?
5. **File Storage:** Where should uploaded BOM files be stored? (S3, database, temporary?)
6. **BOM Versioning:** Should system support multiple versions of same BOM?
7. **BOM Editing:** Can users edit BOM data after upload, or must re-upload?
8. **Custom Fields Limit:** Is there a limit to number of custom fields per BOM?
9. **Data Retention:** How long should uploaded BOM files be retained?
10. **Export:** Should users be able to export processed BOM data back to Excel?
11. **Validation Rules:** Should validation rules be configurable per organization?
12. **Batch Upload:** Should system support uploading multiple BOMs at once?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial screen requirements document |
