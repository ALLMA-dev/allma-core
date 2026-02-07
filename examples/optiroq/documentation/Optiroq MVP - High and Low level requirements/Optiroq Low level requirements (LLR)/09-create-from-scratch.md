# Create From Scratch

## 1. Overview
- **Screen ID:** SCR-009
- **Component File:** `src/app/components/CreateFromScratch.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** High - Uses dynamic field management for parts

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** create RFQ manually from scratch using a structured form  
**So that** I can initiate new RFQs for completely new projects with full control over all fields

### Related User Stories
- **US-MVP-02A:** Create RFQ Manually from Scratch
- **REQ-MVP-00A:** BOM Upload & Project Initialization (Enhanced)
- **REQ-MVP-00B:** "The Split" - Existing vs New Parts Classification

## 3. Screen Purpose & Context

### Purpose
This screen provides a manual form for creating a new project from scratch, allowing buyers to:
- Enter project information (ID, description, commodity)
- Add multiple parts with detailed specifications
- Define part attributes (name, material, quantity, weight)
- Create projects with 1-5 parts efficiently
- Have full control over all data entry

### Context
- **When user sees this:** 
  - After selecting "Create From Scratch" method from RFQ Method Selection
  - When starting completely new project with unique requirements
  - When project has 1-5 parts (recommended range)
- **Why it exists:** 
  - Support projects that don't have existing documents or similar RFQs
  - Provide full control over all fields for unique requirements
  - Enable quick setup for small projects (1-5 parts)
  - Serve as fallback when other methods aren't suitable
- **Position in journey:** 
  - After RFQ Method Selection
  - Before The Split (parts classification)
  - Alternative to Upload Files or Clone Existing

### Key Characteristics
- **Manual data entry:** All fields entered by user
- **Multi-part support:** Add/remove parts dynamically
- **Structured form:** Step-by-step sections (Project Info → Parts)
- **Real-time validation:** Immediate feedback on required fields
- **Project summary:** Live preview of entered data
- **Best for 1-5 parts:** Recommended for small projects


## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Title:** "Project Initiation - Method 3: Create From Scratch"
2. **Subtitle:** "Manually enter project details and parts information"

**Main Form Card:**
1. **Card Header**
   - Green circular icon (PlusCircle)
   - Title: "New Project Setup"
   - Description: "Enter all project details manually. Best for 1-5 parts with unique requirements."

2. **Section 1: Project Information**
   - Badge: "1" (numbered step indicator)
   - Title: "Project Information"
   - Fields: Project ID, Commodity Type, Project Description

3. **Section 2: Parts Information**
   - Badge: "2" (numbered step indicator)
   - Title: "Parts Information"
   - "Add Part" button (top-right)
   - Part cards (one per part, expandable list)
   - Tip banner: Suggests Upload BOM for 10+ parts

4. **Project Summary Section**
   - Gray background box
   - Shows: Project ID, Total Parts, Commodity
   - Live updates as user enters data

5. **Action Buttons**
   - "Back to Methods" (outline, left)
   - "Continue to Analysis" (green, right, with chevron)

**Info Banner:**
- Green background
- Explains what happens next (The Split)


### 4.2 Key UI Elements

**Card Header:**
- Icon container: size-12, rounded-full, bg-green-100
- Icon: PlusCircle (size-6, green-600)
- Title: text-lg, font-semibold
- Description: text-sm, gray-600

**Section Headers:**
- Badge: variant-outline, size-6, rounded-full, numbered (1, 2)
- Title: text-lg, font-semibold, gray-900
- Flex layout with gap-2

**Project Information Fields:**
- **Project ID:**
  - Input field with auto-generated value
  - Placeholder: "PRJ-2025-002"
  - Help text: "Auto-generated, but you can customize it"
  - Required field (marked with *)

- **Commodity Type:**
  - Select dropdown
  - Options: Stamping, Machining, Casting, Injection Molding, Forging, Welding, Assembly
  - Placeholder: "Select commodity type"
  - Required field (marked with *)

- **Project Description:**
  - Textarea (2 rows)
  - Placeholder: "e.g., Aluminum Mounting Bracket for Door Assembly"
  - Required field (marked with *)

**Parts Information Section:**
- **Add Part Button:**
  - Position: top-right of section header
  - Variant: outline, size-sm
  - Icon: Plus (size-4)
  - Text: "Add Part"

- **Part Cards:**
  - Background: gray-50
  - Border: gray-200
  - Padding: pt-4
  - Grid layout: 2 columns on desktop, 1 on mobile

**Part Fields (per card):**
- **Part Name:**
  - Input field
  - Placeholder: "e.g., ALU-BRACKET-001"
  - Required field (marked with *)
  - First part shows "(Required)" hint

- **Material:**
  - Input field
  - Placeholder: "e.g., Aluminum 6061"
  - Required field (marked with *)

- **Description:**
  - Input field (full width, col-span-2)
  - Placeholder: "e.g., Aluminum mounting bracket for door assembly"
  - Optional field

- **Annual Quantity:**
  - Number input
  - Placeholder: "e.g., 50000"
  - Required field (marked with *)

- **Target Weight:**
  - Number input with step 0.001
  - Placeholder: "e.g., 0.45"
  - Unit: kg
  - Optional field

- **Remove Button:**
  - Position: top-right of part card
  - Variant: ghost, size-sm
  - Icon: X (size-4)
  - Color: red-600, hover:red-700
  - Only shown if more than 1 part exists

**Tip Banner:**
- Background: blue-50
- Border: blue-200
- Icon: 💡 emoji
- Text: "For projects with 10+ parts, consider using the 'Upload BOM' method instead for faster setup."

**Project Summary Box:**
- Background: gray-50
- Border: gray-200
- Title: "Project Summary" (text-sm, font-semibold)
- Grid: 3 columns
- Fields: Project ID, Total Parts (X of Y), Commodity
- Live updates as user types

**Action Buttons:**
- **Back to Methods:**
  - Variant: outline
  - Flex: flex-1
  - Navigates to RFQ Method Selection

- **Continue to Analysis:**
  - Background: green-600, hover:green-700
  - Flex: flex-1
  - Icon: ChevronRight (size-4, ml-2)
  - Disabled if form invalid
  - Navigates to The Split

**Info Banner (bottom):**
- Background: green-50
- Border: green-200
- Text: "What's next?" explanation
- Describes The Split process

### 4.3 Information Hierarchy

**Primary Information:**
- Project ID and description
- Part names and materials
- Required field indicators (*)

**Secondary Information:**
- Commodity type
- Part quantities and weights
- Project summary statistics

**Tertiary Information:**
- Help text and placeholders
- Tip banners
- "What's next" explanation


## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_id | String | Auto-generated/User | Yes | Format: "PRJ-YYYY-NNN", unique |
| creation_date | Date | System | Yes | ISO 8601 date |
| created_by | String | System | Yes | User ID |
| method_used | Enum | System | Yes | "scratch" |

### 5.2 Project Data Fields (Core)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_description | String | User | Yes | 2-500 characters |
| commodity | Enum | User | Yes | One of: Stamping, Machining, Casting, Injection Molding, Forging, Welding, Assembly |

### 5.3 Part Data Fields (Core)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| part_name | String | User | Yes | 2-200 characters, unique within project |
| description | String | User | No | 0-500 characters |
| material | String | User | Yes | 2-100 characters |
| quantity | Number | User | Yes | Integer, >0 (annual quantity) |
| target_weight | Number | User | No | Decimal, >0 (kg), step 0.001 |

### 5.4 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| total_parts_count | COUNT(parts) | parts array |
| filled_parts_count | COUNT(parts WHERE part_name != '') | parts array, part_name |
| is_form_valid | project_id AND project_description AND commodity AND at least 1 part with name, material, quantity | all fields |



## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**Dynamic Part Attributes:**
- Core fields always displayed: Part Name, Material, Quantity
- Optional fields: Description, Target Weight
- Future: Custom attributes from Master Field List
- Admin can add new part attributes to Master List
- Buyer cannot add fields (only Admin can modify Master List)

**Commodity Types:**
- Standard commodities: Stamping, Machining, Casting, Injection Molding, Forging, Welding, Assembly
- Admin can configure additional custom commodity types
- Dropdown adapts to configured types

**Project ID Format:**
- Auto-generated with format: "PRJ-YYYY-NNN"
- User can customize if needed
- System validates uniqueness

### 6.2 UI Adaptation Logic

**Part Cards:**
- Minimum 1 part required
- Maximum: No hard limit, but UI recommends Upload BOM for 10+ parts
- Add/remove parts dynamically
- Remove button only shown if more than 1 part exists

**Form Validation:**
- Real-time validation as user types
- Required fields marked with *
- "Continue" button disabled until form valid
- Form valid when:
  - Project ID exists
  - Project Description exists
  - Commodity selected
  - At least 1 part has: part_name, material, quantity

**Project Summary:**
- Updates in real-time as user enters data
- Shows filled parts count: "X of Y"
- Shows selected commodity
- Shows project ID

**Tip Banner:**
- Always shown in Parts section
- Recommends Upload BOM for 10+ parts
- Blue theme for informational message

### 6.3 LLM Integration

**Smart Defaults (Future Enhancement):**
- LLM suggests commodity type based on part names/materials
- LLM suggests material based on part name
- LLM validates part name format
- LLM detects duplicate or similar part names

**Auto-Complete (Future Enhancement):**
- LLM suggests part descriptions based on part name
- LLM suggests typical quantities for commodity type
- LLM suggests typical weights based on material and size

**Validation Assistance:**
- LLM checks for common data entry errors
- LLM suggests corrections for typos
- LLM validates material names against standard list

**Fallback Behavior:**
- If LLM unavailable: Manual entry only
- No auto-suggestions
- Basic validation only
- System remains fully functional


## 7. User Interactions

### 7.1 Primary Actions

**Action: Enter Project ID**
- **Trigger:** User types in Project ID field
- **Behavior:**
  1. Update project_id state
  2. Validate format (alphanumeric, hyphens allowed)
  3. Check uniqueness (backend validation)
  4. Update project summary
  5. Update form validation state
- **Validation:**
  - Format: "PRJ-YYYY-NNN" or custom
  - Length: 3-50 characters
  - Unique across all projects
- **Success:** Project ID accepted
- **Error:** Display error message if invalid or duplicate
- **Navigation:** None (stays on screen)

**Action: Select Commodity Type**
- **Trigger:** User selects from commodity dropdown
- **Behavior:**
  1. Update commodity state
  2. Update project summary
  3. Update form validation state
- **Validation:** Must select one of available options
- **Success:** Commodity selected
- **Error:** N/A (dropdown prevents invalid selection)
- **Navigation:** None (stays on screen)

**Action: Enter Project Description**
- **Trigger:** User types in description textarea
- **Behavior:**
  1. Update project_description state
  2. Validate length (2-500 characters)
  3. Update form validation state
- **Validation:**
  - Length: 2-500 characters
  - Cannot be empty
- **Success:** Description accepted
- **Error:** Display error if too short or too long
- **Navigation:** None (stays on screen)

**Action: Add Part**
- **Trigger:** User clicks "Add Part" button
- **Behavior:**
  1. Add new empty part to parts array
  2. Render new part card
  3. Scroll to new part card
  4. Focus on part name field
- **Validation:** None
- **Success:** New part card displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Remove Part**
- **Trigger:** User clicks X button on part card
- **Behavior:**
  1. Show confirmation if part has data: "Remove this part?"
  2. If confirmed, remove part from array
  3. Update parts list
  4. Update project summary (total parts count)
  5. Update form validation state
- **Validation:** Cannot remove if only 1 part exists
- **Success:** Part removed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Enter Part Data**
- **Trigger:** User types in any part field
- **Behavior:**
  1. Update part data in state
  2. Validate field (if required)
  3. Update project summary (filled parts count)
  4. Update form validation state
- **Validation:**
  - Part Name: Required, 2-200 characters, unique within project
  - Material: Required, 2-100 characters
  - Quantity: Required, positive integer
  - Weight: Optional, positive decimal
- **Success:** Part data accepted
- **Error:** Display error message if invalid
- **Navigation:** None (stays on screen)

**Action: Continue to Analysis**
- **Trigger:** User clicks "Continue to Analysis" button
- **Behavior:**
  1. Validate entire form
  2. If valid:
     - Save project data to backend
     - Save all parts data
     - Navigate to The Split screen
     - Pass project_id as parameter
  3. If invalid:
     - Display error messages
     - Highlight invalid fields
     - Keep user on screen
- **Validation:**
  - All required project fields filled
  - At least 1 part with name, material, quantity
  - All filled fields valid
- **Success:** Navigate to The Split
- **Error:** Display validation errors
- **Navigation:** Create From Scratch → The Split

**Action: Back to Methods**
- **Trigger:** User clicks "Back to Methods" button
- **Behavior:**
  1. Show confirmation if form has data: "Discard changes?"
  2. If confirmed, navigate to RFQ Method Selection
  3. If cancelled, stay on screen
- **Validation:** None
- **Success:** Navigate to RFQ Method Selection
- **Error:** N/A
- **Navigation:** Create From Scratch → RFQ Method Selection

### 7.2 Secondary Actions

**Action: View Project Summary**
- **Trigger:** User views summary box (always visible)
- **Behavior:**
  - Display current project data
  - Update in real-time as user types
  - Show filled parts count
- **Validation:** None
- **Success:** Summary displayed
- **Error:** N/A
- **Navigation:** None

**Action: Read Tip Banner**
- **Trigger:** User views tip banner
- **Behavior:**
  - Display recommendation for 10+ parts
  - Suggest Upload BOM method
- **Validation:** None
- **Success:** Tip displayed
- **Error:** N/A
- **Navigation:** None

**Action: Read Info Banner**
- **Trigger:** User scrolls to bottom info banner
- **Behavior:**
  - Display "What's next" explanation
  - Describe The Split process
- **Validation:** None
- **Success:** Info displayed
- **Error:** N/A
- **Navigation:** None

### 7.3 Navigation

**From:**
- RFQ Method Selection (via "Create From Scratch" selection)

**To:**
- The Split (via "Continue to Analysis" button)
- RFQ Method Selection (via "Back to Methods" button)

**Exit Points:**
- "Continue to Analysis" → The Split
- "Back to Methods" → RFQ Method Selection
- Browser back button → RFQ Method Selection (with confirmation)
- App Header logo → Projects List (with confirmation)


## 8. Business Rules

### 8.1 Validation Rules

**Project ID Validation:**
- Format: Alphanumeric, hyphens, underscores allowed
- Length: 3-50 characters
- Must be unique across all projects
- Auto-generated but user can customize
- Error: "Project ID is required"
- Error: "Project ID already exists"

**Project Description Validation:**
- Length: 2-500 characters
- Cannot be empty
- Error: "Project Description is required"
- Error: "Description must be at least 2 characters"

**Commodity Validation:**
- Must select one of available options
- Cannot be empty
- Error: "Commodity Type is required"

**Part Name Validation:**
- Length: 2-200 characters
- Cannot be empty (for at least 1 part)
- Must be unique within project
- Error: "Part name is required"
- Error: "Part name already exists in this project"

**Material Validation:**
- Length: 2-100 characters
- Cannot be empty (for parts with name)
- Error: "Material is required"

**Quantity Validation:**
- Must be positive integer
- Cannot be zero or negative
- Error: "Quantity must be positive"
- Error: "Quantity is required"

**Target Weight Validation (Optional):**
- If provided, must be positive decimal
- Cannot be zero or negative
- Step: 0.001 (3 decimal places)
- Error: "Target weight must be positive"

**Form Validation:**
- At least 1 part must have: part_name, material, quantity
- All required project fields must be filled
- All filled fields must be valid

### 8.2 Calculation Logic

**Total Parts Count:**
```
total_parts_count = parts.length
```

**Filled Parts Count:**
```
filled_parts_count = parts.filter(p => p.partName !== '').length
```

**Form Valid:**
```
is_form_valid = 
  projectId !== '' AND
  projectDescription !== '' AND
  commodity !== '' AND
  parts.some(p => p.partName !== '' AND p.material !== '' AND p.quantity !== '')
```

**Continue Button State:**
```
IF is_form_valid:
  Enable "Continue to Analysis" button
ELSE:
  Disable "Continue to Analysis" button
```

### 8.3 Conditional Display Logic

**Remove Part Button:**
- Show if: `parts.length > 1`
- Hide if: `parts.length === 1`
- Minimum 1 part always required

**Project Summary Values:**
- Project ID: Display value or "-"
- Total Parts: Display "X of Y" (filled of total)
- Commodity: Display value or "-"

**Continue Button:**
- Enabled if: `is_form_valid === true`
- Disabled if: `is_form_valid === false`
- Visual state: Grayed out when disabled

**Tip Banner:**
- Always shown in Parts section
- Recommends Upload BOM for 10+ parts

**Info Banner:**
- Always shown at bottom
- Explains next step (The Split)

### 8.4 Error Handling

**Duplicate Project ID Error:**
- **Detection:** Backend validation returns duplicate error
- **Handling:**
  - Display error below Project ID field
  - Error: "Project ID already exists. Please use a different ID."
  - Highlight Project ID field
  - Keep user on screen

**Form Validation Error:**
- **Detection:** User clicks Continue with invalid form
- **Handling:**
  - Display error messages for all invalid fields
  - Highlight invalid fields with red border
  - Scroll to first invalid field
  - Keep user on screen
  - Error: "Please fill in all required fields"

**Part Name Duplicate Error:**
- **Detection:** User enters part name that already exists in project
- **Handling:**
  - Display error below part name field
  - Error: "Part name already exists in this project"
  - Highlight part name field
  - Prevent save until corrected

**Network Error:**
- **Detection:** API call fails or times out
- **Handling:**
  - Display error toast: "Failed to save. Please check your connection and try again."
  - Keep data in form (don't lose user's work)
  - Provide retry option
  - Log error for monitoring

**Session Expired Error:**
- **Detection:** User's session expires while on screen
- **Handling:**
  - Show modal: "Session expired. Please log in again."
  - Redirect to login after confirmation
  - Preserve form data for post-login restore (if possible)

**Unsaved Changes Warning:**
- **Detection:** User clicks Back or browser back with unsaved data
- **Handling:**
  - Show confirmation: "You have unsaved changes. Discard them?"
  - If confirmed: Navigate away
  - If cancelled: Stay on screen


## 9. Acceptance Criteria

### 9.1 Functional Criteria

1. WHEN user navigates to Create From Scratch THEN screen SHALL display within 2 seconds
2. WHEN screen loads THEN project ID SHALL be auto-generated
3. WHEN screen loads THEN one empty part card SHALL be displayed
4. WHEN user enters project ID THEN project summary SHALL update
5. WHEN user selects commodity THEN project summary SHALL update
6. WHEN user enters project description THEN form validation SHALL update
7. WHEN user clicks "Add Part" THEN new part card SHALL be added
8. WHEN user clicks remove part THEN part SHALL be removed (if more than 1)
9. WHEN user enters part name THEN project summary SHALL update filled count
10. WHEN user enters all required fields THEN "Continue" button SHALL be enabled
11. WHEN user clicks "Continue" with valid form THEN system SHALL navigate to The Split
12. WHEN user clicks "Continue" with invalid form THEN errors SHALL be displayed
13. WHEN user clicks "Back to Methods" THEN system SHALL navigate to RFQ Method Selection
14. WHEN user clicks "Back" with unsaved data THEN confirmation SHALL be shown
15. WHEN project ID is duplicate THEN error SHALL be displayed
16. WHEN part name is duplicate THEN error SHALL be displayed
17. WHEN form is invalid THEN "Continue" button SHALL be disabled
18. WHEN user has only 1 part THEN remove button SHALL be hidden
19. WHEN user has 2+ parts THEN remove button SHALL be shown
20. WHEN user enters quantity THEN it SHALL accept only positive integers
21. WHEN user enters weight THEN it SHALL accept decimals with 3 decimal places
22. WHEN project summary updates THEN it SHALL show current data
23. WHEN tip banner is displayed THEN it SHALL recommend Upload BOM for 10+ parts
24. WHEN info banner is displayed THEN it SHALL explain The Split
25. WHEN user types in any field THEN project summary SHALL update in real-time
26. WHEN all required fields filled THEN form SHALL be valid
27. WHEN any required field empty THEN form SHALL be invalid
28. WHEN user removes part with data THEN confirmation SHALL be shown
29. WHEN user adds part THEN focus SHALL move to new part name field
30. WHEN save succeeds THEN system SHALL navigate to The Split

### 9.2 Flexibility Criteria

1. WHEN admin adds new commodity type THEN it SHALL appear in dropdown
2. WHEN admin adds new part attribute THEN it SHALL appear in form (future)
3. WHEN Master List has optional fields THEN system SHALL display them
4. WHEN LLM is available THEN smart suggestions SHALL be provided (future)
5. WHEN LLM is unavailable THEN manual entry SHALL work normally

### 9.3 UX Criteria

1. Screen loads within 2 seconds on standard broadband connection
2. All required fields are clearly marked with *
3. Form sections are clearly numbered (1, 2)
4. Part cards are visually distinct with gray background
5. Add Part button is easily accessible
6. Remove button is clearly visible on each part card
7. Project summary updates in real-time
8. Continue button is disabled when form invalid
9. Error messages are clear and actionable
10. Tip banner provides helpful guidance
11. Info banner sets clear expectations
12. All interactive elements have pointer cursor
13. Typography is clear and readable
14. Spacing is consistent throughout screen
15. Mobile-responsive design works on screens 768px and wider

### 9.4 Performance Criteria

1. Initial page load completes within 2 seconds
2. Form updates respond within 100ms
3. Add/remove part operations complete within 200ms
4. Project summary updates within 100ms
5. Form validation completes within 100ms
6. Navigation to The Split completes within 1 second
7. Screen handles 20+ parts without performance degradation
8. No memory leaks during part add/remove operations

### 9.5 Accessibility Criteria

1. All form fields are keyboard accessible (tab navigation)
2. Focus indicators are clearly visible
3. Required fields are announced to screen readers
4. Error messages are associated with form fields
5. Labels are properly associated with inputs
6. Buttons have descriptive aria-labels
7. Form sections have proper heading hierarchy
8. Color is not the only means of conveying required fields
9. Text has sufficient contrast ratio (WCAG AA: 4.5:1)
10. Screen reader announces form validation errors

### 9.6 Security Criteria

1. User must be authenticated to access screen
2. Session validation occurs on page load
3. Expired sessions redirect to login
4. Project ID uniqueness validated on backend
5. All user input sanitized before storage
6. XSS protection on all displayed text
7. CSRF protection on form submission
8. Rate limiting on API calls
9. Audit log records project creation
10. No sensitive data exposed in client-side code


## 10. Edge Cases & Error Scenarios

### 10.1 Data Edge Cases

**Auto-Generated Project ID Collision:**
- **Scenario:** Auto-generated ID already exists
- **Handling:**
  - System generates alternative ID (increment counter)
  - Display new ID to user
  - Allow user to customize if desired
  - Validate uniqueness before save

**Very Long Project Description:**
- **Scenario:** User enters 500+ characters
- **Handling:**
  - Truncate at 500 characters
  - Show character count: "X/500"
  - Display warning at 450 characters
  - Prevent further input at 500

**Very Long Part Name:**
- **Scenario:** User enters 200+ characters
- **Handling:**
  - Truncate at 200 characters
  - Show character count: "X/200"
  - Display warning at 180 characters
  - Prevent further input at 200

**Duplicate Part Names:**
- **Scenario:** User enters same part name twice
- **Handling:**
  - Detect duplicate on blur or save
  - Display error: "Part name already exists"
  - Highlight both duplicate fields
  - Prevent save until corrected

**Zero Quantity:**
- **Scenario:** User enters 0 for quantity
- **Handling:**
  - Display error: "Quantity must be positive"
  - Highlight quantity field
  - Prevent save until corrected

**Negative Weight:**
- **Scenario:** User enters negative weight
- **Handling:**
  - Display error: "Weight must be positive"
  - Highlight weight field
  - Prevent save until corrected

**Many Parts (20+):**
- **Scenario:** User adds 20+ parts manually
- **Handling:**
  - Allow addition (no hard limit)
  - Show warning at 10 parts: "Consider using Upload BOM"
  - Show stronger warning at 20 parts
  - Performance remains acceptable
  - Scroll becomes necessary

**Empty Part Cards:**
- **Scenario:** User adds multiple parts but leaves some empty
- **Handling:**
  - Allow empty parts (not required)
  - Only validate parts with data
  - Project summary shows "X of Y" filled
  - Save only saves filled parts

### 10.2 Interaction Edge Cases

**Rapid Add Part Clicks:**
- **Scenario:** User clicks "Add Part" multiple times quickly
- **Handling:**
  - Debounce clicks (prevent duplicate adds)
  - Add one part per click
  - Scroll to new part smoothly
  - Focus on new part name field

**Remove Part with Data:**
- **Scenario:** User clicks remove on part with filled fields
- **Handling:**
  - Show confirmation: "Remove this part? All data will be lost."
  - If confirmed: Remove part
  - If cancelled: Keep part
  - No confirmation if part is empty

**Remove Last Part:**
- **Scenario:** User tries to remove when only 1 part exists
- **Handling:**
  - Remove button is hidden
  - Cannot remove last part
  - Minimum 1 part always required

**Navigate Away with Unsaved Data:**
- **Scenario:** User clicks Back or browser back with unsaved changes
- **Handling:**
  - Show confirmation: "You have unsaved changes. Discard them?"
  - If confirmed: Navigate away
  - If cancelled: Stay on screen
  - Track "dirty" state of form

**Form Submission During Save:**
- **Scenario:** User clicks Continue multiple times quickly
- **Handling:**
  - Disable button after first click
  - Show loading indicator
  - Prevent duplicate submissions
  - Re-enable if save fails

**Resize Window:**
- **Scenario:** User resizes browser window
- **Handling:**
  - Responsive layout adapts immediately
  - Grid adjusts: 2 columns → 1 column on mobile
  - No content overflow or clipping
  - Maintain scroll position

### 10.3 System Edge Cases

**Session Expires During Entry:**
- **Scenario:** User's session expires while filling form
- **Handling:**
  - Detect expired session on save attempt
  - Show modal: "Session expired. Please log in again."
  - Preserve form data in local storage
  - Restore data after re-login
  - Allow user to continue where they left off

**Network Disconnection:**
- **Scenario:** User loses internet connection
- **Handling:**
  - Show banner: "Connection lost. Your data is saved locally."
  - Disable Continue button
  - Allow continued editing
  - Auto-retry connection every 10 seconds
  - Save to backend when reconnected

**Slow Network:**
- **Scenario:** User on slow connection (2G/3G)
- **Handling:**
  - Show loading indicators
  - Provide feedback on save progress
  - Timeout after 30 seconds
  - Allow retry on timeout

**Backend Validation Failure:**
- **Scenario:** Backend rejects data for business rule violation
- **Handling:**
  - Display specific error message from backend
  - Highlight affected fields
  - Keep user on screen
  - Allow correction and retry

**Browser Compatibility:**
- **Scenario:** User on unsupported browser
- **Handling:**
  - Detect browser version on load
  - Show warning if unsupported
  - Provide graceful degradation (basic functionality)
  - Recommend supported browsers


## 11. Backend API Requirements

### 11.1 API Endpoints

**POST /api/v1/projects**
- **Purpose:** Create new project with parts
- **Authentication:** Required (Bearer token)
- **Request Body:**
  ```json
  {
    "project_id": "PRJ-2025-002",
    "project_description": "Aluminum Mounting Bracket for Door Assembly",
    "commodity": "Stamping",
    "method_used": "scratch",
    "parts": [
      {
        "part_name": "ALU-BRACKET-001",
        "description": "Aluminum mounting bracket",
        "material": "Aluminum 6061",
        "quantity": 50000,
        "target_weight": 0.45
      }
    ]
  }
  ```
- **Response:** 201 Created
  ```json
  {
    "project_id": "PRJ-2025-002",
    "created_at": "2025-01-02T10:00:00Z",
    "parts_count": 1,
    "status": "created"
  }
  ```
- **Error Responses:**
  - 400 Bad Request: Validation error
  - 401 Unauthorized: Invalid or expired token
  - 409 Conflict: Project ID already exists
  - 500 Internal Server Error: Server error

**GET /api/v1/projects/generate-id**
- **Purpose:** Generate unique project ID
- **Authentication:** Required (Bearer token)
- **Response:** 200 OK
  ```json
  {
    "project_id": "PRJ-2025-002",
    "format": "PRJ-YYYY-NNN"
  }
  ```

**GET /api/v1/projects/:project_id/exists**
- **Purpose:** Check if project ID already exists
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `project_id` (required): Project ID to check
- **Response:** 200 OK
  ```json
  {
    "exists": false
  }
  ```

### 11.2 Data Models

```typescript
interface ProjectCreateRequest {
  project_id: string;
  project_description: string;
  commodity: string;
  method_used: 'scratch';
  parts: PartCreateRequest[];
}

interface PartCreateRequest {
  part_name: string;
  description?: string;
  material: string;
  quantity: number;
  target_weight?: number;
}

interface ProjectCreateResponse {
  project_id: string;
  created_at: string;
  parts_count: number;
  status: 'created';
}

interface ProjectIdGenerateResponse {
  project_id: string;
  format: string;
}

interface ProjectExistsResponse {
  exists: boolean;
}
```

### 11.3 Caching Strategy

**Client-Side Caching:**
- Cache form data in local storage (auto-save)
- Invalidate cache on successful save
- Restore from cache on session restore

**Server-Side Caching:**
- No caching for project creation (always fresh)
- Cache commodity types list (Redis, 1 hour TTL)

### 11.4 Error Handling

**Network Errors:**
- Retry failed requests (exponential backoff: 1s, 2s, 4s)
- Max 3 retries
- Show error toast after final failure
- Provide manual retry button

**Validation Errors:**
- 400 Bad Request: Show specific error messages
- Highlight invalid fields
- Log error details for monitoring

**Conflict Errors:**
- 409 Conflict: Project ID already exists
- Suggest alternative ID
- Allow user to modify and retry


## 12. Notes & Considerations

### 12.1 Design Decisions

**Manual Entry Approach:**
- Rationale: Provides full control for unique projects
- Best for 1-5 parts (small projects)
- Structured form reduces errors
- Step-by-step sections guide user

**Multi-Part Support:**
- Rationale: Most projects have multiple parts
- Dynamic add/remove for flexibility
- Minimum 1 part required
- No hard maximum (but recommend Upload BOM for 10+)

**Real-Time Validation:**
- Rationale: Immediate feedback reduces errors
- Validates as user types
- Disables Continue until form valid
- Clear error messages

**Project Summary:**
- Rationale: Provides live preview of entered data
- Helps user track progress
- Shows filled vs total parts
- Updates in real-time

**Tip Banner:**
- Rationale: Guides users to more efficient method
- Recommends Upload BOM for 10+ parts
- Prevents inefficient manual entry
- Blue theme for informational message

### 12.2 Future Enhancements

**Smart Auto-Complete:**
- LLM suggests part descriptions based on name
- LLM suggests materials based on commodity
- LLM suggests typical quantities
- LLM validates data for common errors

**Template Library:**
- Save project as template
- Reuse templates for similar projects
- Pre-fill common fields
- Reduce repetitive data entry

**Bulk Import:**
- Copy-paste from Excel
- Parse and populate multiple parts
- Validate and correct data
- Faster than manual entry

**Field Customization:**
- Buyer selects which fields to show
- Hide optional fields if not needed
- Simplify form for basic projects
- Advanced mode for complex projects

**Progress Indicator:**
- Show completion percentage
- Highlight incomplete sections
- Guide user through form
- Motivate completion

### 12.3 Dependencies

**Required Screens:**
- RFQ Method Selection (prerequisite)
- The Split (navigation target)

**Required APIs:**
- Authentication API
- Projects API
- Project ID Generation API

**External Dependencies:**
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Lucide React (icons)
- shadcn/ui components

### 12.4 Testing Considerations

**Unit Tests:**
- Form validation logic
- Part add/remove logic
- Project summary calculations
- Form valid state logic

**Integration Tests:**
- API integration (project creation)
- Authentication flow
- Navigation to The Split
- Project ID uniqueness check

**E2E Tests:**
- Complete user journey: Method Selection → Create From Scratch → The Split
- Add/remove parts workflow
- Form validation scenarios
- Error handling scenarios

**Accessibility Tests:**
- Keyboard navigation
- Screen reader compatibility
- Form field associations
- Error message announcements

### 12.5 Open Questions

1. **Maximum Parts:** Should there be a hard limit on number of parts?
2. **Auto-Save:** Should form auto-save to prevent data loss?
3. **Templates:** Should users be able to save projects as templates?
4. **Bulk Import:** Should system support copy-paste from Excel?
5. **Field Customization:** Should buyers be able to hide optional fields?
6. **Progress Indicator:** Should form show completion percentage?
7. **Validation Timing:** Should validation be on blur or on submit?
8. **Duplicate Detection:** Should system detect similar (not just exact) part names?
9. **Material List:** Should materials be dropdown or free text?
10. **Quantity Units:** Should system support different quantity units?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial screen requirements document |
