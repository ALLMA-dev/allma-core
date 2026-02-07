# Screen Requirements: Email Preview

## 1. Overview
- **Screen ID:** SCR-018
- **Component File:** `src/app/components/EmailPreview.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** Medium - Dynamic content based on RFQ configuration

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** review the auto-generated RFQ email before sending to suppliers  
**So that** I can ensure accuracy, completeness, and professionalism before initiating the RFQ process

### Related User Stories
- **US-MVP-03:** Review and Send RFQ Package
- **US-MVP-04:** Track RFQ via Project ID
- **US-MVP-02A:** Create RFQ Manually from Scratch
- **US-MVP-02B:** Duplicate Existing RFQ with Modifications
- **US-MVP-02C:** Create RFQ from Uploaded Files (Auto-Parsing)

## 3. Screen Purpose & Context

### Purpose
This screen is the final checkpoint before sending RFQs to suppliers. It provides:
- **Email preview:** Full preview of auto-generated email with all RFQ details
- **Validation:** Ensures all required information is included
- **Editing capability:** Allows last-minute changes before sending
- **Tracking setup:** Confirms Project ID embedding and response monitoring
- **Professional presentation:** Shows how suppliers will receive the RFQ
- **Confidence building:** Gives buyer control and visibility before commitment

### Context
- **When user sees this:** 
  - After completing RFQ Form (Screen 13) and clicking "Review & Send"
  - Final step in RFQ creation workflow (any of 3 methods)
  - Before emails are sent to suppliers
- **Why it exists:** 
  - Buyers need to verify accuracy before sending to suppliers
  - Mistakes in RFQs can damage supplier relationships
  - Professional presentation is critical for response quality
  - Last chance to catch errors or missing information
- **Position in journey:** 
  - Final step in RFQ creation (Screens 8-13 → Screen 18)
  - Precedes email sending and supplier response monitoring
  - Gateway to Quote Processing phase (Screens 19-22)


### Key Characteristics
- **Read-only preview:** Shows final email as suppliers will see it
- **Editable elements:** Subject line and email body can be edited
- **System notifications:** Confirms tracking setup and monitoring
- **Requirements checklist:** Displays all selected requirements with emphasis on critical items
- **Attachments list:** Shows all files that will be sent
- **Supplier list:** Displays all recipients with ability to modify
- **Action buttons:** Cancel, Edit, or Send
- **Professional formatting:** Clean, structured email layout



## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Container:**
1. **Page Header**
   - Title: "Screen 18: Auto-Generated RFQ Email"
   - Subtitle: "Review the email before sending to suppliers"

2. **System Notification Banner (Green)**
   - Success message: "Email Ready to Send"
   - Tracking confirmation
   - Monitoring setup confirmation

3. **Email Preview Card**
   - Card header (gray background)
   - Email metadata (Subject, To, CC)
   - Email body (white background)
   - Action buttons (gray footer)

4. **Demo Navigation Hint (Blue)**
   - Next step guidance

### 4.2 Key UI Elements

**Page Header:**
- **Title:** "Screen 18: Auto-Generated RFQ Email"
  - Font: text-3xl, font-bold
  - Color: text-gray-900
- **Subtitle:** "Review the email before sending to suppliers"
  - Font: text-base
  - Color: text-gray-600
  - Margin: mt-2

**System Notification Banner:**
- **Container:**
  - Background: bg-green-50
  - Border: border border-green-200
  - Rounded: rounded-lg
  - Padding: p-4
  - Max width: max-w-4xl mx-auto
- **Icon:** Check icon (size-5, text-green-600)
- **Title:** "Email Ready to Send"
  - Font: text-sm, font-semibold
  - Color: text-green-900
- **Checklist:**
  - Font: text-sm
  - Color: text-green-800
  - Items:
    - "✓ Project ID embedded in email headers for automatic tracking"
    - "✓ rfq-agent@customer-domain.optiroq.com will monitor responses"

**Email Preview Card Header:**
- **Background:** bg-gray-50 border-b
- **Title:** "Email Preview" (text-lg)
- **Badge:** "Ready to Send" (variant-outline)
- **Layout:** Flex with space-between


**Email Metadata Section:**
- **Subject Line:**
  - Label: "Subject:" (text-gray-500, w-16)
  - Value: "RFQ RFQ-2025-047 - Aluminum Mounting Bracket"
    - Font: font-medium, text-gray-900
  - Edit button: Blue pencil icon (size-3)
  - Layout: Flex with gap-2

- **To Field:**
  - Label: "To:" (text-gray-500, w-16)
  - Value: List of supplier email badges
    - Badge: variant-secondary
    - Example: "supplier-a@company.com"
  - Layout: Flex wrap with gap-2

- **CC Field:**
  - Label: "CC:" (text-gray-500, w-16)
  - Value: Agent email badge
    - Badge: variant-outline, bg-blue-50, border-blue-300, text-blue-700
    - Icon: Mail icon (size-3)
    - Text: "rfq-agent@customer-domain.optiroq.com"
  - Help text: "Auto-added for response tracking"
    - Font: text-xs, text-gray-500
    - Margin: mt-1

**Email Body Section:**
- **Container:** p-6, space-y-6, text-sm

- **Greeting:**
  - Text: "Dear Supplier,"
  - Font: text-gray-900

- **Introduction:**
  - Text: "We are requesting quotations for the following parts for our upcoming vehicle platform project."
  - Font: text-gray-900
  - Margin: mt-2

- **Part Information Box:**
  - Container: bg-gray-50, rounded-lg, p-4, border border-gray-200
  - Title: "Part Information" (font-semibold, text-gray-900, mb-3)
  - Grid: grid-cols-2, gap-3
  - Fields:
    - Part Number
    - Annual Volume
    - Description (col-span-2)
    - Commodity
  - Each field:
    - Label: text-gray-500, text-xs
    - Value: text-gray-900, font-medium

**Requirements Checklist:**
- **Title:** "Please provide the following information in your quotation:"
  - Font: font-semibold, text-gray-900, mb-3

- **Requirement Items:**
  - Container: space-y-4
  - Each item:
    - Border: border-l-2 (blue or red for critical)
    - Padding: pl-4
    - Title: font-medium, text-gray-900, mb-1
    - Checkmark: "✓" prefix
    - Sub-items: ul with ml-4, text-gray-600, space-y-1

- **Material Cost Breakdown:**
  - Border: border-blue-500
  - Items: Raw material type, cost/kg, weights, scrap value

- **Process Cost Breakdown:**
  - Border: border-blue-500
  - Items: Operations, cycle time, labor, overhead
  - Critical note: "IMPORTANT: Tooling costs must be listed separately"
    - Color: text-red-600, font-medium

- **Tooling Cost (Critical):**
  - Border: border-red-500
  - Items: Investment, amortization, maintenance
  - Badge: "Critical Requirement" (variant-destructive, mt-2)

- **Logistics Costs:**
  - Border: border-blue-500
  - Items: Packaging, transportation, IncoTerms

- **Terms & Capacity:**
  - Border: border-blue-500
  - Items: Payment terms, lead time, capacity, equipment


**Attachments Section:**
- **Container:** bg-blue-50, rounded-lg, p-4, border border-blue-200
- **Header:**
  - Icon: Paperclip (size-4, text-blue-700)
  - Title: "Attached Files" (font-semibold, text-blue-900)
  - Layout: Flex with gap-2, mb-2
- **File List:**
  - Font: text-sm, text-blue-800
  - Space: space-y-1
  - Format: "• filename.ext"

**Deadline & Instructions Section:**
- **Container:** bg-yellow-50, rounded-lg, p-4, border border-yellow-200
- **Deadline:** "Response Deadline: January 15, 2025"
  - Font: font-semibold, text-yellow-900, mb-2
- **Instructions:**
  - Font: text-sm, text-yellow-800
  - Space: space-y-2
  - Items:
    - Reply instructions
    - "Reply All" emphasis (font-medium)
    - AI assistant link (text-blue-600, hover:underline)

**Closing Section:**
- **Thank you:** "Thank you for your prompt attention to this request."
  - Font: text-gray-900
- **Signature:**
  - Margin: mt-4
  - Lines:
    - "Best regards,"
    - Name (font-medium, mt-1)
    - Title (text-gray-600)
    - Department (text-gray-600)

**Action Buttons Footer:**
- **Container:** bg-gray-50, border-t, px-6, py-4
- **Layout:** Flex with gap-3
- **Buttons:**
  1. **Cancel:**
     - Variant: outline
     - Icon: X (size-4, mr-2)
     - Text: "Cancel"
  
  2. **Edit Email:**
     - Variant: outline
     - Icon: Edit (size-4, mr-2)
     - Text: "Edit Email"
  
  3. **Send RFQ:**
     - Position: ml-auto (right-aligned)
     - Style: bg-blue-600, hover:bg-blue-700
     - Icon: Send (size-4, mr-2)
     - Text: "Send RFQ to 4 Suppliers" (dynamic count)

**Demo Navigation Hint:**
- **Container:** bg-blue-50, border border-blue-200, rounded-lg, p-4, max-w-4xl mx-auto
- **Text:** "Demo Navigation: Click 'Next' in the header to see email notifications →"
  - Font: text-sm, text-blue-900, text-center
  - Bold: "Demo Navigation:"

### 4.3 Information Hierarchy

**Primary Information:**
- Email subject line
- Supplier list (To field)
- Requirements checklist (what suppliers must provide)
- Deadline
- Send button

**Secondary Information:**
- Part information
- Attachments list
- Instructions
- CC field (agent email)

**Tertiary Information:**
- System notifications
- Greeting and closing
- Demo navigation hint




## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| rfq_id | String | RFQ creation | Yes | Unique RFQ identifier |
| project_id | String | RFQ creation | Yes | Unique project identifier |
| created_at | DateTime | System timestamp | Yes | ISO 8601 format |
| created_by | String | User session | Yes | User email/ID |
| agent_email | String | System config | Yes | rfq-agent@customer-domain.optiroq.com |
| email_status | Enum | System | Yes | 'draft', 'ready', 'sent' |

### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| subject_line | String | Yes | No | Max 200 chars |
| greeting | String | Yes | Yes | Customizable template |
| closing | String | Yes | Yes | Customizable template |
| signature | Object | Yes | Yes | Name, title, department |
| deadline_days | Integer | Yes | Yes | Default 14 days |

### 5.3 Dynamic Fields (Buyer-Selectable)
| Field Name | Data Type | Conditions | Validation Rules | Default Value |
|------------|-----------|------------|------------------|---------------|
| subject_line | String | Always | Max 200 chars | "RFQ {rfq_id} - {part_name}" |
| supplier_emails | Array<String> | Always | Valid email format, min 1 | [] |
| part_numbers | Array<String> | Always | Min 1 | [] |
| part_descriptions | Array<String> | Always | Min 1 | [] |
| annual_volume | Integer | Always | Min 1 | 0 |
| commodity | String | Always | Max 100 chars | '' |
| requirements_checklist | Array<Object> | Always | Min 1 requirement | [] |
| attachments | Array<Object> | Optional | Max 10 files, 50MB total | [] |
| deadline_date | Date | Always | Future date | Today + 14 days |
| custom_instructions | String | Optional | Max 1000 chars | '' |

### 5.4 Data Displayed
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| email_status_badge | String | Computed | Yes | "Ready to Send" |
| subject_line | String | RFQ data | Yes | Display in header |
| supplier_emails | Array<String> | RFQ data | Yes | Display as badges |
| agent_email | String | System config | Yes | Display in CC field |
| part_numbers | Array<String> | RFQ data | Yes | Comma-separated |
| part_descriptions | Array<String> | RFQ data | Yes | Display in part info box |
| annual_volume | Integer | RFQ data | Yes | Formatted with commas |
| commodity | String | RFQ data | Yes | Display in part info box |
| requirements_checklist | Array<Object> | RFQ data | Yes | Formatted list with checkmarks |
| attachments | Array<Object> | RFQ data | No | File names with icons |
| deadline_date | Date | RFQ data | Yes | Formatted: "January 15, 2025" |
| buyer_name | String | User profile | Yes | Display in signature |
| buyer_title | String | User profile | Yes | Display in signature |
| buyer_department | String | User profile | Yes | Display in signature |
| supplier_count | Integer | Computed | Yes | Count of supplier_emails |

### 5.5 Data Collected from User
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| subject_line_edit | Text input | No | Max 200 chars | Current subject |
| email_body_edit | Rich text | No | Max 10000 chars | Current body |
| action_selection | Button click | Yes | 'cancel', 'edit', 'send' | None |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| supplier_count | supplier_emails.length | supplier_emails |
| attachment_count | attachments.length | attachments |
| is_ready_to_send | All required fields filled + min 1 supplier | All RFQ data |
| email_preview_html | Generate HTML from RFQ data + template | All RFQ data |
| tracking_headers | Generate X-Optiroq-Project-ID header | project_id, rfq_id |
| send_button_text | "Send RFQ to {supplier_count} Suppliers" | supplier_count |




## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**How buyer selects fields:**
- Email Preview is automatically generated from RFQ Form (Screen 13) data
- Requirements checklist reflects buyer's selections in Step 3 of RFQ Form
- Attachments list reflects files uploaded in RFQ Form
- Supplier list reflects suppliers selected in Step 2 of RFQ Form

**Field selection UI:**
- **Subject line:** Editable via pencil icon
- **Email body:** Editable via "Edit Email" button
- **Supplier list:** Can be modified (add/remove suppliers)
- **Requirements checklist:** Reflects RFQ Form selections (not editable here)
- **Attachments:** Reflects uploaded files (not editable here)

**Mandatory field rules:**
- **Subject line:** Required (auto-generated, can be edited)
- **Supplier list:** Min 1 supplier required
- **Part information:** All fields required
- **Requirements checklist:** Min 1 requirement required
- **Deadline:** Required (auto-calculated, can be edited)

**Field dependencies:**
- Send button enabled only if all required fields filled
- Supplier count in button text depends on supplier_emails.length
- Requirements checklist content depends on RFQ Form selections
- Attachments section visibility depends on attachments.length > 0

### 6.2 UI Adaptation Logic

**Form generation:**
- Email preview is dynamically generated from RFQ data
- Requirements checklist adapts to selected requirements
- Critical requirements (tooling) highlighted with red border
- Attachments section only shown if files attached

**Layout rules:**
- Card container: max-w-4xl mx-auto (centered, max width)
- Email body: Structured sections with consistent spacing
- Requirements: Vertical list with left border indicators
- Responsive: Single column layout on all screen sizes

**Validation adaptation:**
- Send button disabled if validation fails
- Error messages shown for missing required fields
- Warning shown if no attachments (optional but recommended)
- Confirmation dialog before sending (not shown in preview)

**Caching strategy:**
- Email preview generated on page load
- Changes to subject/body cached in component state
- Full RFQ data cached in parent component
- No backend calls until "Send" clicked

### 6.3 LLM Integration (if applicable)

**LLM role:**
- Generates professional email body from RFQ data
- Adapts tone and language based on buyer preferences
- Translates email to selected language (English, Spanish, French, German, Mandarin)
- Ensures all critical information is included

**Input to LLM:**
- RFQ data (parts, volumes, requirements, deadline)
- Buyer profile (name, title, department, company)
- Language preference
- Custom instructions (if provided)
- Email template structure

**Output from LLM:**
- Professional email body text
- Structured requirements checklist
- Appropriate greeting and closing
- Formatted part information

**Confidence scoring:**
- Not applicable (email generation is deterministic)
- LLM output is always used (no confidence threshold)

**Fallback behavior:**
- If LLM fails: Use static template with placeholders
- If translation fails: Default to English
- If formatting fails: Use plain text format




## 7. User Interactions

### 7.1 Primary Actions

**Action: Edit Subject Line**
- **Trigger:** User clicks pencil icon next to subject line
- **Behavior:** 
  - Subject line becomes editable inline
  - User can type new subject
  - Changes saved on blur or Enter key
  - Preview updates immediately
- **Validation:** 
  - Max 200 characters
  - Cannot be empty
- **Success:** Subject line updated in preview
- **Error:** If empty: "Subject line is required", if too long: "Subject line must be 200 characters or less"
- **Navigation:** Stays on preview screen

**Action: Edit Email Body**
- **Trigger:** User clicks "Edit Email" button
- **Behavior:** 
  - Modal or inline editor opens
  - Rich text editor with formatting options
  - User can modify email body
  - Preview updates on save
- **Validation:** 
  - Max 10,000 characters
  - Cannot be empty
- **Success:** Email body updated in preview
- **Error:** If empty: "Email body is required", if too long: "Email body must be 10,000 characters or less"
- **Navigation:** Stays on preview screen

**Action: Modify Supplier List**
- **Trigger:** User clicks on supplier badges or "Edit" button
- **Behavior:** 
  - Supplier list becomes editable
  - User can add/remove suppliers
  - Email validation on add
  - Supplier count updates in send button
- **Validation:** 
  - Min 1 supplier required
  - Valid email format
  - No duplicates
- **Success:** Supplier list updated, send button text updated
- **Error:** If no suppliers: "At least 1 supplier is required", if invalid email: "Invalid email format"
- **Navigation:** Stays on preview screen

**Action: Cancel**
- **Trigger:** User clicks "Cancel" button
- **Behavior:** 
  - Confirmation dialog: "Are you sure? Unsaved changes will be lost."
  - If confirmed: Navigate back to RFQ Form (Screen 13)
  - If cancelled: Stay on preview screen
- **Validation:** None
- **Success:** Navigate back to RFQ Form
- **Error:** None
- **Navigation:** Back to Screen 13 (RFQ Form)

**Action: Send RFQ**
- **Trigger:** User clicks "Send RFQ to X Suppliers" button
- **Behavior:** 
  - Final validation check
  - Confirmation dialog: "Send RFQ to X suppliers? This cannot be undone."
  - If confirmed:
    - Show loading spinner
    - Send emails to all suppliers
    - Embed Project ID in email headers
    - CC agent email for monitoring
    - Navigate to Notifications screen (Screen 19)
  - If cancelled: Stay on preview screen
- **Validation:** 
  - All required fields filled
  - Min 1 supplier
  - Valid deadline (future date)
- **Success:** 
  - Emails sent successfully
  - Success message: "RFQ sent to X suppliers successfully"
  - Navigate to Screen 19 (Notifications)
- **Error:** 
  - If validation fails: Show error messages, disable send button
  - If send fails: "Failed to send emails. Please try again."
  - If partial send: "Sent to X of Y suppliers. Failed: [list]"
- **Navigation:** To Screen 19 (Notifications) on success

### 7.2 Secondary Actions

**Action: View System Notification**
- **Trigger:** User loads preview screen
- **Behavior:** 
  - Green banner shows at top
  - Confirms email is ready to send
  - Shows tracking setup confirmation
- **Validation:** None (informational only)
- **Success:** User understands email is ready
- **Error:** None
- **Navigation:** Stays on preview screen

**Action: View Requirements Checklist**
- **Trigger:** User scrolls through email body
- **Behavior:** 
  - Requirements displayed with checkmarks
  - Critical requirements highlighted (red border)
  - Tooling requirement emphasized
- **Validation:** None (informational only)
- **Success:** User understands what suppliers must provide
- **Error:** None
- **Navigation:** Stays on preview screen

**Action: View Attachments**
- **Trigger:** User scrolls to attachments section
- **Behavior:** 
  - Blue box shows list of attached files
  - File names displayed with paperclip icon
- **Validation:** None (informational only)
- **Success:** User confirms correct files attached
- **Error:** None
- **Navigation:** Stays on preview screen

**Action: View Deadline**
- **Trigger:** User scrolls to deadline section
- **Behavior:** 
  - Yellow box shows deadline date
  - Instructions for suppliers displayed
- **Validation:** None (informational only)
- **Success:** User confirms deadline is correct
- **Error:** None
- **Navigation:** Stays on preview screen

### 7.3 Navigation

**From:**
- Screen 13: RFQ Form (after completing all steps and clicking "Review & Send")
- Screen 8: RFQ Method Selection (via any of 3 creation methods)

**To:**
- Screen 13: RFQ Form (if user clicks "Cancel" or "Edit Email")
- Screen 19: Notifications (after successfully sending RFQ)

**Exit Points:**
- Cancel button → Back to RFQ Form
- Send button → Forward to Notifications
- Browser back button → Warning: "Unsaved changes will be lost"




## 8. Business Rules

### 8.1 Validation Rules

**Subject Line Validation:**
- **Rule:** Max 200 characters, cannot be empty
- **Error:** "Subject line is required" or "Subject line must be 200 characters or less"
- **Format:** "RFQ {rfq_id} - {part_name}"
- **Required:** Yes

**Supplier List Validation:**
- **Rule:** Min 1 supplier, valid email format, no duplicates
- **Error:** "At least 1 supplier is required" or "Invalid email format" or "Duplicate email address"
- **Format:** Valid email (RFC 5322)
- **Required:** Yes

**Part Information Validation:**
- **Rule:** All part fields must be filled
- **Error:** "Part information is incomplete"
- **Required:** Yes

**Requirements Checklist Validation:**
- **Rule:** Min 1 requirement selected
- **Error:** "At least 1 requirement must be selected"
- **Required:** Yes

**Deadline Validation:**
- **Rule:** Must be future date, reasonable timeframe (1-90 days)
- **Error:** "Deadline must be in the future" or "Deadline must be within 90 days"
- **Format:** Date (YYYY-MM-DD)
- **Required:** Yes

**Attachments Validation:**
- **Rule:** Max 10 files, 50MB total size
- **Error:** "Maximum 10 files allowed" or "Total file size exceeds 50MB"
- **Optional:** Yes (but recommended)

**Email Body Validation:**
- **Rule:** Max 10,000 characters, cannot be empty
- **Error:** "Email body is required" or "Email body must be 10,000 characters or less"
- **Required:** Yes

### 8.2 Calculation Logic

**Supplier Count:**
- **Formula:** `supplier_emails.length`
- **Example:** 4 suppliers → "Send RFQ to 4 Suppliers"
- **Used in:** Send button text

**Attachment Count:**
- **Formula:** `attachments.length`
- **Example:** 3 files → "3 files attached"
- **Used in:** Attachments section header

**Deadline Date:**
- **Formula:** `today + deadline_days` (default 14 days)
- **Example:** Today is Jan 1 → Deadline is Jan 15
- **Used in:** Deadline section

**Email Preview HTML:**
- **Formula:** Generate HTML from RFQ data + template
- **Example:** Structured email with all sections
- **Used in:** Email body display

**Tracking Headers:**
- **Formula:** `X-Optiroq-Project-ID: {project_id}`, `X-Optiroq-RFQ-ID: {rfq_id}`
- **Example:** X-Optiroq-Project-ID: PRJ-2025-001
- **Used in:** Email headers for response tracking

### 8.3 Conditional Display Logic

**Show Attachments Section:**
- **Condition:** `attachments.length > 0`
- **Display:** Blue box with file list
- **Hide:** Section not shown if no attachments

**Show Critical Requirement Badge:**
- **Condition:** Requirement is marked as critical (e.g., tooling)
- **Display:** Red border + "Critical Requirement" badge
- **Hide:** Normal blue border if not critical

**Enable Send Button:**
- **Condition:** All required fields filled + validation passes
- **Display:** Blue button, enabled
- **Disable:** Gray button, disabled with tooltip explaining why

**Show System Notification:**
- **Condition:** Email is ready to send (all validations pass)
- **Display:** Green banner at top
- **Hide:** Yellow warning banner if validations fail

### 8.4 Error Handling

**Missing Required Field:**
- **Detection:** Validation check on page load and before send
- **Handling:** 
  - Error message displayed
  - Send button disabled
  - Field highlighted in red
- **Recovery:** User fills missing field

**Invalid Email Format:**
- **Detection:** Email validation regex
- **Handling:** 
  - Error message: "Invalid email format"
  - Supplier badge highlighted in red
  - Send button disabled
- **Recovery:** User corrects email format

**Send Email Failure:**
- **Detection:** API call fails
- **Handling:** 
  - Error message: "Failed to send emails. Please try again."
  - User stays on preview screen
  - Retry button appears
- **Recovery:** User retries send

**Partial Send Failure:**
- **Detection:** Some emails sent, some failed
- **Handling:** 
  - Warning message: "Sent to X of Y suppliers. Failed: [list]"
  - Option to retry failed sends
  - Option to proceed anyway
- **Recovery:** User retries failed sends or proceeds

**Network Error:**
- **Detection:** Network connection lost
- **Handling:** 
  - Error message: "Network error. Please check your connection."
  - Send button disabled
  - Retry button appears
- **Recovery:** User checks connection and retries

**Timeout Error:**
- **Detection:** Send operation takes > 30 seconds
- **Handling:** 
  - Warning message: "Send operation is taking longer than expected. Please wait..."
  - Loading spinner continues
  - After 60 seconds: "Operation timed out. Please try again."
- **Recovery:** User retries send




## 9. Acceptance Criteria

### 9.1 Functional Criteria

**Page Load**
1. WHEN user completes RFQ Form THEN Email Preview screen SHALL load
2. WHEN screen loads THEN system notification banner SHALL be visible
3. WHEN screen loads THEN email preview card SHALL be visible
4. WHEN screen loads THEN all RFQ data SHALL be displayed correctly

**System Notification**
5. WHEN email is ready THEN green banner SHALL show "Email Ready to Send"
6. WHEN email is ready THEN banner SHALL confirm Project ID embedding
7. WHEN email is ready THEN banner SHALL confirm agent email monitoring

**Email Metadata**
8. WHEN screen loads THEN subject line SHALL be displayed
9. WHEN screen loads THEN subject line SHALL include RFQ ID and part name
10. WHEN user clicks edit icon THEN subject line SHALL become editable
11. WHEN user edits subject THEN changes SHALL be saved
12. WHEN screen loads THEN supplier list SHALL be displayed as badges
13. WHEN screen loads THEN CC field SHALL show agent email
14. WHEN screen loads THEN CC field SHALL show "Auto-added for response tracking" note

**Part Information**
15. WHEN screen loads THEN part information box SHALL be visible
16. WHEN screen loads THEN part numbers SHALL be displayed
17. WHEN screen loads THEN annual volume SHALL be displayed
18. WHEN screen loads THEN description SHALL be displayed
19. WHEN screen loads THEN commodity SHALL be displayed

**Requirements Checklist**
20. WHEN screen loads THEN requirements checklist SHALL be visible
21. WHEN screen loads THEN each requirement SHALL have checkmark prefix
22. WHEN screen loads THEN material cost breakdown SHALL be listed
23. WHEN screen loads THEN process cost breakdown SHALL be listed
24. WHEN screen loads THEN tooling cost SHALL be listed with red border
25. WHEN screen loads THEN tooling SHALL have "Critical Requirement" badge
26. WHEN screen loads THEN logistics costs SHALL be listed
27. WHEN screen loads THEN terms & capacity SHALL be listed
28. WHEN screen loads THEN critical note about separate tooling SHALL be visible

**Attachments**
29. WHEN attachments exist THEN attachments section SHALL be visible
30. WHEN attachments exist THEN file names SHALL be listed
31. WHEN no attachments THEN attachments section SHALL NOT be visible

**Deadline & Instructions**
32. WHEN screen loads THEN deadline section SHALL be visible
33. WHEN screen loads THEN deadline date SHALL be displayed
34. WHEN screen loads THEN reply instructions SHALL be visible
35. WHEN screen loads THEN "Reply All" emphasis SHALL be visible
36. WHEN screen loads THEN AI assistant link SHALL be visible

**Signature**
37. WHEN screen loads THEN closing SHALL be visible
38. WHEN screen loads THEN buyer name SHALL be displayed
39. WHEN screen loads THEN buyer title SHALL be displayed
40. WHEN screen loads THEN buyer department SHALL be displayed

**Action Buttons**
41. WHEN screen loads THEN Cancel button SHALL be visible
42. WHEN screen loads THEN Edit Email button SHALL be visible
43. WHEN screen loads THEN Send RFQ button SHALL be visible
44. WHEN screen loads THEN Send button SHALL show supplier count
45. WHEN validation passes THEN Send button SHALL be enabled
46. WHEN validation fails THEN Send button SHALL be disabled

**Cancel Action**
47. WHEN user clicks Cancel THEN confirmation dialog SHALL appear
48. WHEN user confirms cancel THEN navigate to RFQ Form
49. WHEN user cancels dialog THEN stay on preview screen

**Edit Email Action**
50. WHEN user clicks Edit Email THEN editor SHALL open
51. WHEN user edits email body THEN changes SHALL be saved
52. WHEN user saves edits THEN preview SHALL update

**Send RFQ Action**
53. WHEN user clicks Send RFQ THEN confirmation dialog SHALL appear
54. WHEN user confirms send THEN loading spinner SHALL appear
55. WHEN send succeeds THEN success message SHALL appear
56. WHEN send succeeds THEN navigate to Notifications screen
57. WHEN send fails THEN error message SHALL appear
58. WHEN send fails THEN user SHALL stay on preview screen
59. WHEN partial send THEN warning message SHALL show failed suppliers
60. WHEN emails sent THEN Project ID SHALL be embedded in headers
61. WHEN emails sent THEN agent email SHALL be CC'd
62. WHEN emails sent THEN all suppliers SHALL receive email


### 9.2 Flexibility Criteria

1. WHEN RFQ has different requirements THEN checklist SHALL adapt
2. WHEN RFQ has different parts THEN part information SHALL adapt
3. WHEN RFQ has different suppliers THEN supplier list SHALL adapt
4. WHEN RFQ has different attachments THEN attachments section SHALL adapt
5. WHEN RFQ has different deadline THEN deadline SHALL adapt
6. WHEN buyer has different signature THEN signature SHALL adapt
7. WHEN language preference changes THEN email SHALL be translated
8. WHEN custom instructions provided THEN they SHALL be included
9. WHEN critical requirements selected THEN they SHALL be highlighted
10. WHEN optional requirements selected THEN they SHALL be listed normally

### 9.3 UX Criteria

1. Screen SHALL load within 2 seconds
2. Email preview SHALL be clearly readable
3. Requirements checklist SHALL be well-organized
4. Critical requirements SHALL be visually distinct (red border)
5. System notification SHALL be prominent (green banner)
6. Action buttons SHALL be clearly labeled
7. Send button SHALL show supplier count
8. Edit icons SHALL be visible and clickable
9. Supplier badges SHALL be clearly formatted
10. Attachments SHALL be listed with icons
11. Deadline SHALL be prominently displayed (yellow box)
12. Signature SHALL be professional
13. Email body SHALL have consistent spacing
14. Sections SHALL be visually separated
15. Colors SHALL indicate importance (green=ready, yellow=deadline, red=critical)
16. Font sizes SHALL be appropriate for readability
17. Layout SHALL be centered and max-width constrained
18. Hover states SHALL be visible on interactive elements
19. Focus states SHALL be clearly visible
20. Loading states SHALL be shown during send operation

### 9.4 Performance Criteria

1. Screen rendering SHALL complete within 2 seconds
2. Email preview generation SHALL complete within 1 second
3. Subject line edit SHALL update instantly (<100ms)
4. Supplier list edit SHALL update instantly (<100ms)
5. Send operation SHALL complete within 10 seconds
6. Confirmation dialogs SHALL appear instantly (<100ms)
7. Navigation SHALL be instant (<200ms)
8. Email body edit SHALL be responsive (<200ms)
9. Validation SHALL complete within 500ms
10. Error messages SHALL appear within 200ms

### 9.5 Accessibility Criteria

1. All interactive elements SHALL be keyboard accessible
2. Tab order SHALL be logical (top to bottom)
3. Focus indicators SHALL be clearly visible
4. Screen reader SHALL announce all content
5. Buttons SHALL have descriptive labels
6. Links SHALL have descriptive text
7. Images SHALL have alt text
8. Color SHALL not be the only indicator of state
9. Contrast ratios SHALL meet WCAG AA standards
10. Form fields SHALL have associated labels
11. Error messages SHALL be announced to screen readers
12. Success messages SHALL be announced to screen readers
13. Loading states SHALL be announced to screen readers
14. Confirmation dialogs SHALL be accessible
15. Email preview SHALL be readable by screen readers

### 9.6 Security Criteria

1. User input SHALL be sanitized to prevent XSS
2. Email addresses SHALL be validated
3. Attachments SHALL be scanned for malware
4. Data SHALL be transmitted over HTTPS
5. Sensitive data SHALL not be logged in console
6. Email content SHALL be validated on backend
7. SQL injection SHALL be prevented (parameterized queries)
8. CSRF protection SHALL be implemented
9. Rate limiting SHALL prevent email spam
10. User permissions SHALL be checked before sending
11. Audit log SHALL record all email sends
12. Data SHALL be encrypted at rest
13. Session SHALL timeout after inactivity
14. Email headers SHALL be validated
15. Project ID SHALL be securely embedded




## 10. Edge Cases & Error Scenarios

### 10.1 Edge Cases

**Empty Attachments:**
- **Scenario:** User creates RFQ without attaching files
- **Expected Behavior:** 
  - Attachments section not shown
  - Warning message: "No attachments. Consider adding technical drawings."
  - Send button still enabled (attachments optional)

**Single Supplier:**
- **Scenario:** User selects only 1 supplier
- **Expected Behavior:** 
  - Send button text: "Send RFQ to 1 Supplier"
  - Email sent to single supplier
  - No comparison possible (warning shown)

**Many Suppliers:**
- **Scenario:** User selects 20 suppliers
- **Expected Behavior:** 
  - Supplier badges wrap to multiple lines
  - Send button text: "Send RFQ to 20 Suppliers"
  - Confirmation dialog warns about large send

**Very Long Subject Line:**
- **Scenario:** User enters 250 character subject line
- **Expected Behavior:** 
  - Input stops at 200 characters
  - Error message: "Subject line must be 200 characters or less"
  - Cannot send until shortened

**Very Long Part Description:**
- **Scenario:** Part description is 500 characters
- **Expected Behavior:** 
  - Description displayed in full in email body
  - May wrap to multiple lines
  - No truncation

**Many Requirements:**
- **Scenario:** User selects 10 requirements
- **Expected Behavior:** 
  - All requirements listed in checklist
  - Email body becomes longer
  - Scrollable preview

**Past Deadline:**
- **Scenario:** User sets deadline to yesterday
- **Expected Behavior:** 
  - Validation error: "Deadline must be in the future"
  - Send button disabled
  - User must change deadline

**Far Future Deadline:**
- **Scenario:** User sets deadline to 6 months from now
- **Expected Behavior:** 
  - Warning: "Deadline is more than 90 days away. Is this correct?"
  - User can proceed or change
  - Send button enabled

**No Requirements Selected:**
- **Scenario:** User completes RFQ Form without selecting requirements
- **Expected Behavior:** 
  - Validation error: "At least 1 requirement must be selected"
  - Cannot reach Email Preview screen
  - Must go back and select requirements

**Duplicate Supplier Emails:**
- **Scenario:** User adds same supplier email twice
- **Expected Behavior:** 
  - Validation error: "Duplicate email address"
  - Second instance highlighted in red
  - Cannot send until removed

**Invalid Email Format:**
- **Scenario:** User enters "supplier@" (incomplete email)
- **Expected Behavior:** 
  - Validation error: "Invalid email format"
  - Badge highlighted in red
  - Cannot send until corrected

**Large Attachments:**
- **Scenario:** User attaches 60MB of files
- **Expected Behavior:** 
  - Validation error: "Total file size exceeds 50MB"
  - Cannot send until files removed
  - Suggestion: "Consider using file sharing link"

**Many Attachments:**
- **Scenario:** User attaches 15 files
- **Expected Behavior:** 
  - Validation error: "Maximum 10 files allowed"
  - Cannot send until files removed
  - Suggestion: "Combine files or use ZIP"

**Special Characters in Subject:**
- **Scenario:** User enters subject with emoji or special chars
- **Expected Behavior:** 
  - Special characters allowed (UTF-8 support)
  - Email sent with special characters
  - No sanitization (unless XSS risk)

**Multi-Part RFQ:**
- **Scenario:** RFQ includes 5 different parts
- **Expected Behavior:** 
  - All part numbers listed (comma-separated)
  - Part information box shows all parts
  - Email body includes all part details

**No Part Description:**
- **Scenario:** User creates RFQ without part description
- **Expected Behavior:** 
  - Part description field shows "N/A"
  - Warning: "Part description recommended"
  - Send button still enabled

**Browser Back Button:**
- **Scenario:** User clicks browser back button
- **Expected Behavior:** 
  - Warning dialog: "Unsaved changes will be lost. Continue?"
  - If confirmed: Navigate back
  - If cancelled: Stay on preview

**Page Refresh:**
- **Scenario:** User refreshes page
- **Expected Behavior:** 
  - Warning dialog: "Unsaved changes will be lost. Continue?"
  - If confirmed: Reload from saved RFQ data
  - If cancelled: Stay on current state

**Network Disconnect During Send:**
- **Scenario:** Network drops while sending emails
- **Expected Behavior:** 
  - Error message: "Network error. Please check your connection."
  - Emails not sent
  - User can retry when connection restored

**Slow Network:**
- **Scenario:** Send operation takes 25 seconds
- **Expected Behavior:** 
  - Loading spinner continues
  - Progress message: "Sending emails... (X of Y sent)"
  - Timeout after 60 seconds


### 10.2 Error Scenarios

**Email Send Failure (All Suppliers):**
- **Trigger:** Backend email service fails
- **Response:** 
  - Error message: "Failed to send emails. Please try again."
  - User stays on preview screen
  - Retry button appears
  - Error logged for debugging
- **Recovery:** User retries send or contacts support

**Email Send Failure (Partial):**
- **Trigger:** Some emails sent, some failed
- **Response:** 
  - Warning message: "Sent to 3 of 5 suppliers. Failed: supplier-d@company.com, supplier-e@company.com"
  - Option to retry failed sends
  - Option to proceed anyway
  - Successful sends logged
- **Recovery:** User retries failed sends or proceeds with partial send

**Invalid Email Address (Backend Validation):**
- **Trigger:** Backend rejects email address
- **Response:** 
  - Error message: "Invalid email address: supplier@invalid"
  - Supplier badge highlighted in red
  - Send button disabled
- **Recovery:** User corrects email address

**Spam Filter Rejection:**
- **Trigger:** Email service flags content as spam
- **Response:** 
  - Error message: "Email flagged as spam. Please review content."
  - Suggestion: "Remove promotional language or links"
  - User can edit and retry
- **Recovery:** User edits email content and retries

**Rate Limit Exceeded:**
- **Trigger:** User sends too many emails in short time
- **Response:** 
  - Error message: "Rate limit exceeded. Please wait 5 minutes."
  - Send button disabled with countdown timer
  - User must wait before retrying
- **Recovery:** User waits and retries

**Attachment Upload Failure:**
- **Trigger:** Attachment fails to upload to email service
- **Response:** 
  - Error message: "Failed to attach files. Please try again."
  - Option to retry upload
  - Option to send without attachments
- **Recovery:** User retries upload or sends without attachments

**Project ID Embedding Failure:**
- **Trigger:** System fails to embed Project ID in headers
- **Response:** 
  - Error message: "Failed to set up tracking. Please contact support."
  - Send button disabled
  - User cannot proceed
- **Recovery:** User contacts support, developer fixes issue

**Agent Email CC Failure:**
- **Trigger:** System fails to CC agent email
- **Response:** 
  - Warning message: "Failed to CC monitoring email. Responses may not be tracked automatically."
  - Option to proceed anyway
  - Option to cancel and retry
- **Recovery:** User proceeds (manual tracking) or retries

**Database Save Failure:**
- **Trigger:** System fails to save sent email record
- **Response:** 
  - Warning message: "Email sent but failed to save record. Please note RFQ ID: RFQ-2025-047"
  - User can proceed
  - Error logged for manual recovery
- **Recovery:** Automatic (background retry) or manual (support intervention)

**Concurrent Edit Conflict:**
- **Trigger:** Another user edits same RFQ simultaneously
- **Response:** 
  - Warning message: "This RFQ was updated by another user. Please refresh."
  - User must refresh to see latest changes
  - Unsaved changes lost
- **Recovery:** User refreshes and re-enters changes

**Session Timeout:**
- **Trigger:** User session expires while on preview screen
- **Response:** 
  - Error message: "Session expired. Please log in again."
  - User redirected to login screen
  - RFQ data preserved (can resume after login)
- **Recovery:** User logs in and resumes

**Browser Compatibility Issue:**
- **Trigger:** User on unsupported browser (IE11)
- **Response:** 
  - Warning message: "Unsupported browser. Please use Chrome, Edge, Firefox, or Safari."
  - Preview may not render correctly
  - Send functionality may not work
- **Recovery:** User switches to supported browser

**JavaScript Disabled:**
- **Trigger:** User has JavaScript disabled
- **Response:** 
  - Error message: "JavaScript is required to use this application."
  - Preview does not render
  - User cannot proceed
- **Recovery:** User enables JavaScript

**Memory Leak:**
- **Trigger:** Preview screen open for extended time
- **Response:** 
  - Performance degrades
  - Browser may slow down
  - User may experience lag
- **Recovery:** User refreshes page




## 11. Backend API Requirements

### 11.1 API Endpoints

**GET /api/rfqs/{rfqId}/email-preview**
- **Purpose:** Generate email preview from RFQ data
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
  "projectId": "PRJ-2025-001",
  "emailPreview": {
    "subject": "RFQ RFQ-2025-047 - Aluminum Mounting Bracket",
    "to": ["supplier-a@company.com", "supplier-b@company.com"],
    "cc": ["rfq-agent@customer-domain.optiroq.com"],
    "body": "Dear Supplier,\n\nWe are requesting...",
    "bodyHtml": "<html>...</html>",
    "attachments": [
      {
        "filename": "BOM_ALU-BRACKET-001.xlsx",
        "size": 1024000,
        "url": "https://s3.../file.xlsx"
      }
    ],
    "deadline": "2025-01-15",
    "signature": {
      "name": "Sarah Chen",
      "title": "Project Buyer",
      "department": "Automotive Components Division"
    }
  },
  "validation": {
    "isValid": true,
    "errors": []
  }
}
```
- **Error Responses:**
  - 401: Unauthorized
  - 404: RFQ not found
  - 500: Server error

**POST /api/rfqs/{rfqId}/send**
- **Purpose:** Send RFQ emails to suppliers
- **Request:**
  - Method: POST
  - Headers: Authorization token, Content-Type: application/json
  - Path params: rfqId
  - Body:
```json
{
  "subject": "RFQ RFQ-2025-047 - Aluminum Mounting Bracket",
  "to": ["supplier-a@company.com", "supplier-b@company.com"],
  "cc": ["rfq-agent@customer-domain.optiroq.com"],
  "body": "Dear Supplier,\n\nWe are requesting...",
  "bodyHtml": "<html>...</html>",
  "attachments": ["file-id-1", "file-id-2"],
  "trackingHeaders": {
    "X-Optiroq-Project-ID": "PRJ-2025-001",
    "X-Optiroq-RFQ-ID": "RFQ-2025-047"
  }
}
```
- **Response:**
  - Status: 200 OK
  - Body:
```json
{
  "success": true,
  "sentCount": 4,
  "failedCount": 0,
  "results": [
    {
      "email": "supplier-a@company.com",
      "status": "sent",
      "messageId": "msg-001"
    },
    {
      "email": "supplier-b@company.com",
      "status": "sent",
      "messageId": "msg-002"
    }
  ]
}
```
- **Error Responses:**
  - 400: Validation error
  - 401: Unauthorized
  - 404: RFQ not found
  - 429: Rate limit exceeded
  - 500: Server error

**PUT /api/rfqs/{rfqId}/email-preview**
- **Purpose:** Update email preview (subject, body, suppliers)
- **Request:**
  - Method: PUT
  - Headers: Authorization token, Content-Type: application/json
  - Path params: rfqId
  - Body:
```json
{
  "subject": "Updated subject line",
  "body": "Updated email body",
  "to": ["supplier-a@company.com", "supplier-c@company.com"]
}
```
- **Response:**
  - Status: 200 OK
  - Body: Updated email preview
- **Error Responses:**
  - 400: Validation error
  - 401: Unauthorized
  - 404: RFQ not found
  - 500: Server error

**GET /api/rfqs/{rfqId}/validation**
- **Purpose:** Validate RFQ before sending
- **Request:**
  - Method: GET
  - Headers: Authorization token
  - Path params: rfqId
- **Response:**
  - Status: 200 OK
  - Body:
```json
{
  "isValid": true,
  "errors": [],
  "warnings": [
    "No attachments. Consider adding technical drawings."
  ]
}
```
- **Error Responses:**
  - 401: Unauthorized
  - 404: RFQ not found
  - 500: Server error


### 11.2 Data Structures

**RFQ Email Entity (DynamoDB):**
```json
{
  "PK": "RFQ#RFQ-2025-047",
  "SK": "EMAIL#PREVIEW",
  "rfqId": "RFQ-2025-047",
  "projectId": "PRJ-2025-001",
  "emailData": {
    "subject": "RFQ RFQ-2025-047 - Aluminum Mounting Bracket",
    "to": ["supplier-a@company.com", "supplier-b@company.com"],
    "cc": ["rfq-agent@customer-domain.optiroq.com"],
    "body": "Dear Supplier,\n\nWe are requesting...",
    "bodyHtml": "<html>...</html>",
    "attachments": [
      {
        "filename": "BOM_ALU-BRACKET-001.xlsx",
        "size": 1024000,
        "url": "https://s3.../file.xlsx",
        "fileId": "file-001"
      }
    ],
    "deadline": "2025-01-15",
    "signature": {
      "name": "Sarah Chen",
      "title": "Project Buyer",
      "department": "Automotive Components Division"
    }
  },
  "status": "draft",
  "createdAt": "2025-01-02T10:30:00Z",
  "updatedAt": "2025-01-02T10:35:00Z"
}
```

**Sent Email Record (DynamoDB):**
```json
{
  "PK": "RFQ#RFQ-2025-047",
  "SK": "EMAIL#SENT#2025-01-02T10:40:00Z",
  "rfqId": "RFQ-2025-047",
  "projectId": "PRJ-2025-001",
  "sentAt": "2025-01-02T10:40:00Z",
  "sentBy": "sarah.chen@company.com",
  "recipients": [
    {
      "email": "supplier-a@company.com",
      "status": "sent",
      "messageId": "msg-001",
      "sentAt": "2025-01-02T10:40:01Z"
    },
    {
      "email": "supplier-b@company.com",
      "status": "sent",
      "messageId": "msg-002",
      "sentAt": "2025-01-02T10:40:02Z"
    }
  ],
  "trackingHeaders": {
    "X-Optiroq-Project-ID": "PRJ-2025-001",
    "X-Optiroq-RFQ-ID": "RFQ-2025-047"
  },
  "emailData": {
    "subject": "RFQ RFQ-2025-047 - Aluminum Mounting Bracket",
    "body": "Dear Supplier,\n\nWe are requesting...",
    "attachments": ["file-001", "file-002"]
  }
}
```

### 11.3 DynamoDB Graph Relationships

**RFQ → Email Preview:**
- PK: RFQ#RFQ-2025-047
- SK: EMAIL#PREVIEW
- Relationship: One RFQ has one email preview

**RFQ → Sent Emails:**
- PK: RFQ#RFQ-2025-047
- SK: EMAIL#SENT#{timestamp}
- Relationship: One RFQ can have multiple sent email records (negotiation rounds)

**Project → RFQ → Email:**
- PK: PROJECT#PRJ-2025-001
- SK: RFQ#RFQ-2025-047
- Relationship: One project has multiple RFQs, each with email records

### 11.4 Validation Rules (Backend)

**Subject Line Validation:**
- Type: String
- Min length: 1
- Max length: 200
- Required: Yes

**Supplier Email Validation:**
- Type: Array<String>
- Min length: 1
- Max length: 50
- Format: Valid email (RFC 5322)
- No duplicates
- Required: Yes

**Email Body Validation:**
- Type: String
- Min length: 1
- Max length: 10,000
- Required: Yes

**Attachments Validation:**
- Type: Array<Object>
- Max count: 10
- Max total size: 50MB
- Allowed types: .xlsx, .xls, .pdf, .csv, .doc, .docx, .ppt, .pptx
- Required: No

**Deadline Validation:**
- Type: Date
- Min: Today + 1 day
- Max: Today + 90 days
- Required: Yes

**Tracking Headers Validation:**
- X-Optiroq-Project-ID: Required, valid project ID
- X-Optiroq-RFQ-ID: Required, valid RFQ ID

### 11.5 Email Service Integration

**Email Service Provider:**
- AWS SES (Simple Email Service) or SendGrid
- Supports HTML emails
- Supports attachments
- Supports custom headers
- Supports CC/BCC
- Provides delivery tracking

**Email Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RFQ {{rfqId}}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <p>Dear Supplier,</p>
  
  <p>We are requesting quotations for the following parts for our upcoming vehicle platform project.</p>
  
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h3 style="margin-top: 0;">Part Information</h3>
    <table>
      <tr><td><strong>Part Number:</strong></td><td>{{partNumbers}}</td></tr>
      <tr><td><strong>Annual Volume:</strong></td><td>{{annualVolume}} pieces/year</td></tr>
      <tr><td><strong>Description:</strong></td><td>{{description}}</td></tr>
      <tr><td><strong>Commodity:</strong></td><td>{{commodity}}</td></tr>
    </table>
  </div>
  
  <h3>Please provide the following information in your quotation:</h3>
  
  {{#each requirements}}
  <div style="border-left: 3px solid {{borderColor}}; padding-left: 16px; margin: 16px 0;">
    <p><strong>✓ {{title}}</strong></p>
    <ul>
      {{#each items}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
  </div>
  {{/each}}
  
  {{#if attachments}}
  <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h4>Attached Files</h4>
    <ul>
      {{#each attachments}}
      <li>{{filename}}</li>
      {{/each}}
    </ul>
  </div>
  {{/if}}
  
  <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p><strong>Response Deadline: {{deadline}}</strong></p>
    <p>Please reply to this email with your quotation in your preferred format (Excel, PDF, or CSV).</p>
    <p><strong>Make sure to "Reply All" so our system can process your response automatically.</strong></p>
  </div>
  
  <p>Thank you for your prompt attention to this request.</p>
  
  <p>Best regards,<br>
  <strong>{{buyerName}}</strong><br>
  {{buyerTitle}}<br>
  {{buyerDepartment}}</p>
</body>
</html>
```

**Tracking Headers:**
```
X-Optiroq-Project-ID: PRJ-2025-001
X-Optiroq-RFQ-ID: RFQ-2025-047
X-Optiroq-Sent-At: 2025-01-02T10:40:00Z
X-Optiroq-Sent-By: sarah.chen@company.com
```




## 12. Notes & Considerations

### 12.1 Design Decisions

**Why Email Preview Screen?**
- **Critical Checkpoint:** Last chance to catch errors before sending to suppliers
- **User Research:** "I need to see exactly what suppliers will receive"
- **Risk Mitigation:** Mistakes in RFQs can damage supplier relationships
- **Decision:** Dedicated preview screen with full email display

**Why System Notification Banner?**
- **Rationale:** Users need confirmation that tracking is set up correctly
- **User Feedback:** "How do I know the system will track responses?"
- **Transparency:** Shows exactly what will happen (Project ID embedding, agent CC)
- **Decision:** Green banner at top with tracking confirmation

**Why Editable Subject Line?**
- **Rationale:** Users may want to customize subject for specific suppliers
- **Flexibility:** Auto-generated subject is good default, but not always perfect
- **Use Case:** "I want to add urgency: 'URGENT: RFQ...'"
- **Decision:** Inline edit with pencil icon

**Why "Edit Email" Button?**
- **Rationale:** Users may want to customize email body
- **Use Case:** "I want to add personal note to specific supplier"
- **Flexibility:** Auto-generated body is good default, but not always perfect
- **Decision:** Separate button opens editor (modal or inline)

**Why Confirmation Dialog Before Send?**
- **Rationale:** Sending emails cannot be undone
- **Risk:** Accidental sends can cause confusion
- **Best Practice:** Always confirm destructive actions
- **Decision:** Confirmation dialog with supplier count

**Why Show Supplier Count in Button?**
- **Rationale:** Users need to know how many emails will be sent
- **Transparency:** "Send RFQ to 4 Suppliers" is clearer than "Send RFQ"
- **Confirmation:** Helps user verify correct supplier list
- **Decision:** Dynamic button text with count

**Why Highlight Critical Requirements?**
- **Rationale:** Tooling cost separation is critical for fair comparison
- **User Feedback:** "Suppliers often embed tooling in process costs"
- **Emphasis:** Red border + "Critical Requirement" badge
- **Decision:** Visual distinction for critical items

**Why Yellow Box for Deadline?**
- **Rationale:** Deadline is important but not critical
- **Psychology:** Yellow signals importance without alarm
- **Visibility:** Stands out from other sections
- **Decision:** Yellow background with border

**Why Blue Box for Attachments?**
- **Rationale:** Attachments are informational, not critical
- **Consistency:** Blue used throughout app for informational content
- **Visibility:** Stands out but not alarming
- **Decision:** Blue background with paperclip icon

**Why "Reply All" Emphasis?**
- **Rationale:** Critical for automatic response tracking
- **Technical:** Agent email must be CC'd for system to detect responses
- **User Education:** Suppliers must understand this requirement
- **Decision:** Bold text + explicit instruction

### 12.2 Technical Considerations

**Email Generation:**
- **Approach:** Server-side HTML generation from template
- **Rationale:** Consistent formatting, security, maintainability
- **Consideration:** Template must support dynamic content

**Tracking Headers:**
- **Approach:** Custom X-Optiroq-* headers
- **Rationale:** Reliable tracking across email threads
- **Consideration:** Headers must persist in replies

**Attachment Handling:**
- **Approach:** Upload to S3, include links in email
- **Rationale:** Email size limits, security, tracking
- **Consideration:** Links must be secure and time-limited

**Email Service:**
- **Approach:** AWS SES or SendGrid
- **Rationale:** Reliable, scalable, supports features needed
- **Consideration:** Must handle rate limits, bounces, spam

**State Management:**
- **Approach:** Local state for edits, backend for persistence
- **Rationale:** Fast UI updates, reliable persistence
- **Consideration:** Must sync edits to backend before send

**Validation:**
- **Approach:** Client-side + server-side validation
- **Rationale:** Fast feedback + security
- **Consideration:** Must validate before send

**Error Handling:**
- **Approach:** Graceful degradation with retry
- **Rationale:** Email sending can fail for many reasons
- **Consideration:** Must handle partial sends


### 12.3 Future Enhancements

**Email Templates:**
- **Description:** Allow buyers to save custom email templates
- **Benefit:** Faster RFQ creation for similar projects
- **Complexity:** Medium (template storage and selection)
- **Priority:** Medium

**Multi-Language Support:**
- **Description:** Auto-translate emails to supplier's preferred language
- **Benefit:** Better response rates from international suppliers
- **Complexity:** High (translation service integration)
- **Priority:** High (international expansion)

**Email Scheduling:**
- **Description:** Schedule emails to be sent at specific time
- **Benefit:** Send during supplier's business hours
- **Complexity:** Low (scheduled job)
- **Priority:** Low

**Email Tracking:**
- **Description:** Track email opens, clicks, downloads
- **Benefit:** Know which suppliers engaged with RFQ
- **Complexity:** Medium (tracking pixels, link tracking)
- **Priority:** Medium

**Supplier-Specific Customization:**
- **Description:** Customize email body per supplier
- **Benefit:** Personalized communication
- **Complexity:** High (per-supplier editing)
- **Priority:** Low

**Email Preview for Suppliers:**
- **Description:** Show how email will look in different email clients
- **Benefit:** Ensure professional appearance
- **Complexity:** Medium (email client rendering)
- **Priority:** Low

**Attachment Preview:**
- **Description:** Preview attachments before sending
- **Benefit:** Verify correct files attached
- **Complexity:** Low (file preview)
- **Priority:** Medium

**Email History:**
- **Description:** View all emails sent for this RFQ
- **Benefit:** Track communication history
- **Complexity:** Low (query sent emails)
- **Priority:** High (audit trail)

**Resend Email:**
- **Description:** Resend email to specific suppliers
- **Benefit:** Handle bounces or non-responses
- **Complexity:** Low (reuse send logic)
- **Priority:** High (common use case)

**Email Analytics:**
- **Description:** Track email performance (open rate, response rate)
- **Benefit:** Optimize email content
- **Complexity:** Medium (analytics dashboard)
- **Priority:** Low

### 12.4 Known Limitations

**No Email Client Preview:**
- **Limitation:** Cannot preview how email looks in different clients (Outlook, Gmail, etc.)
- **Workaround:** Use standard HTML that renders well everywhere
- **Mitigation:** Add email client preview (future)
- **Impact:** Low (standard HTML works well)

**No Per-Supplier Customization:**
- **Limitation:** Same email sent to all suppliers
- **Workaround:** Manual editing before send
- **Mitigation:** Add per-supplier customization (future)
- **Impact:** Medium (some users want personalization)

**No Email Scheduling:**
- **Limitation:** Emails sent immediately, cannot schedule
- **Workaround:** User must send at desired time
- **Mitigation:** Add scheduling feature (future)
- **Impact:** Low (immediate send is usually desired)

**No Attachment Preview:**
- **Limitation:** Cannot preview attachments in email preview
- **Workaround:** User must verify files before reaching preview
- **Mitigation:** Add attachment preview (future)
- **Impact:** Low (file names are shown)

**No Email Tracking:**
- **Limitation:** Cannot track if suppliers opened email
- **Workaround:** Follow up manually
- **Mitigation:** Add tracking pixels (future)
- **Impact:** Medium (useful for follow-ups)

**Limited Attachment Types:**
- **Limitation:** Only common file types supported
- **Workaround:** Use file sharing links for other types
- **Mitigation:** Expand supported types (future)
- **Impact:** Low (common types cover 95% of cases)

**No Undo Send:**
- **Limitation:** Cannot recall sent emails
- **Workaround:** Send correction email
- **Mitigation:** Confirmation dialog prevents accidents
- **Impact:** Medium (mistakes happen)

### 12.5 Dependencies

**Upstream Dependencies:**
- **Screen 13:** RFQ Form (provides all RFQ data)
- **Screen 8:** RFQ Method Selection (initiates RFQ creation)
- **User Profile:** Provides buyer signature information
- **File Upload Service:** Provides attachments

**Downstream Dependencies:**
- **Screen 19:** Notifications (shows after send)
- **Email Service:** AWS SES or SendGrid
- **Email Monitoring:** Agent email inbox monitoring
- **Response Tracking:** Project ID tracking system

**External Dependencies:**
- **React:** UI framework
- **TypeScript:** Type safety
- **Tailwind CSS:** Styling
- **Lucide Icons:** Check, Edit, Send, X, Mail, Paperclip icons
- **Email Service:** AWS SES or SendGrid
- **S3:** Attachment storage

**Critical Path:**
- This screen is on the critical path for RFQ sending
- If email preview fails, RFQ cannot be sent
- High priority for testing and reliability

### 12.6 Testing Considerations

**Unit Tests:**
- Email preview generation
- Validation logic
- Subject line editing
- Supplier list editing
- Button state management

**Integration Tests:**
- Email service integration
- Attachment upload
- Tracking header embedding
- Database persistence

**E2E Tests:**
- Complete RFQ creation → Preview → Send flow
- Edit subject and send
- Edit suppliers and send
- Cancel and return to RFQ Form
- Send with attachments
- Send without attachments

**Accessibility Tests:**
- Keyboard navigation
- Screen reader compatibility
- Focus management
- ARIA labels

**Performance Tests:**
- Email preview generation time
- Send operation time
- Large attachment handling
- Many suppliers handling

**Email Rendering Tests:**
- Test in Outlook, Gmail, Apple Mail
- Test on desktop and mobile
- Test with images enabled/disabled
- Test with HTML enabled/disabled

### 12.7 Documentation Needs

**User Documentation:**
- How to review email preview
- How to edit subject and body
- How to modify supplier list
- What happens when you send
- How to track responses

**Admin Documentation:**
- How to configure email templates
- How to set up email service
- How to monitor email delivery
- How to handle bounces

**Developer Documentation:**
- Email generation logic
- Tracking header format
- Email service integration
- Error handling patterns

---

## Document Metadata

**Document Version:** 1.0  
**Created:** January 2, 2026  
**Last Updated:** January 2, 2026  
**Author:** Kiro AI Assistant  
**Status:** Complete  
**Total Lines:** 1,500+

**Related Documents:**
- `.kiro/specs/detailed-screen-requirements/plan.md` (Execution Plan)
- `MVP (email-to-quotations)/MVP_Product_Requirements_Document.md` (MVP PRD)
- `MVP (email-to-quotations)/User stories/Sarah (buyer) MVP user stories.md` (User Stories)
- `.kiro/specs/detailed-screen-requirements/screens/13-rfq-form.md` (Previous Screen)
- `.kiro/specs/detailed-screen-requirements/screens/19-notifications.md` (Next Screen - TBD)

**Change Log:**
- v1.0 (Jan 2, 2026): Initial complete document with all 12 sections

**Acceptance Criteria Summary:**
- **Functional:** 62 criteria
- **Flexibility:** 10 criteria
- **UX:** 20 criteria
- **Performance:** 10 criteria
- **Accessibility:** 15 criteria
- **Security:** 15 criteria
- **Total:** 132 acceptance criteria

**Key Features:**
- Auto-generated email preview from RFQ data
- Editable subject line and email body
- System notification confirming tracking setup
- Requirements checklist with critical item highlighting
- Attachments list with file names
- Deadline and instructions section
- Professional signature
- Confirmation dialog before send
- Project ID embedding for response tracking
- Agent email CC for automatic monitoring

**Business Value:**
- Final checkpoint prevents costly mistakes
- Professional presentation improves response quality
- Tracking setup ensures automatic response processing
- Critical requirement emphasis reduces hidden costs
- Confidence building increases user adoption
