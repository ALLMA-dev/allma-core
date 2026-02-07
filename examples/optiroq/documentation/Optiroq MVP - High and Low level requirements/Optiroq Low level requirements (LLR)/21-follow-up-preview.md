# Screen Requirements: Follow-Up Preview

## 1. Overview
- **Screen ID:** SCR-021
- **Component File:** `src/app/components/FollowUpPreview.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 4 - Completeness Check & Automatic Quality Control
- **Priority:** P0 (Must Have)
- **Flexibility Level:** Medium - Dynamic content based on missing fields and anomalies

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** review and approve auto-generated follow-up emails to suppliers requesting missing information  
**So that** I can quickly obtain complete data without manually writing emails

### Related User Stories
- **US-MVP-11:** Detect Missing Mandatory Fields
- **US-MVP-12:** Detect Hidden Costs (Embedded Tooling)
- **US-MVP-13:** Immediate Automatic Quality Control Responses
- **US-MVP-14:** Track Follow-up Responses

## 3. Screen Purpose & Context

### Purpose
This screen is the approval checkpoint for automated follow-up emails to suppliers. It provides:
- **Auto-generated email:** Professional follow-up requesting missing data
- **Missing information summary:** Clear list of what's needed
- **Explanation:** Why the information matters (fair comparison)
- **Deadline:** Clear timeframe for response (default 3 days)
- **Tracking confirmation:** Automatic monitoring and reminders
- **Editing capability:** Ability to customize email before sending
- **Skip option:** Ability to proceed without follow-up

### Context
- **When user sees this:** 
  - After clicking "Request Follow-up" in Extraction Review (Screen 20)
  - After clicking "Approve Follow-up" in Notifications (Screen 19)
  - When missing mandatory fields detected
  - When low-confidence extractions need clarification
- **Why it exists:** 
  - Saves time writing follow-up emails manually
  - Ensures professional, consistent communication
  - Provides clear, actionable requests to suppliers
  - Maintains audit trail of communications
  - Disciplines suppliers to provide complete data
- **Position in journey:** 
  - After Extraction Review (Screen 20)
  - Before Comparison Board (Screen 23) if data incomplete
  - Parallel to processing other suppliers
  - Can loop back to Extraction Review after supplier responds

### Key Characteristics
- **Auto-generated content:** LLM creates professional email
- **Missing fields list:** Automatically populated from extraction issues
- **Polite but firm tone:** Professional request with clear deadline
- **Explanation included:** Why data is needed (fair comparison)
- **Editable:** Subject and body can be modified
- **Automatic tracking:** Project ID embedded, responses monitored
- **Reminder system:** Auto-reminder if no response in 3 days
- **Multiple formats accepted:** Supplier can respond in any format

## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Container:**
1. **Page Header**
   - Title: "Screen 19: Follow-up Email Preview"
   - Subtitle: "Request missing tooling data from supplier"

2. **System Notification Banner (Blue)**
   - Automated follow-up ready message
   - Tracking confirmation
   - Reminder confirmation

3. **Email Preview Card**
   - Card header (gray background)
   - Email metadata (Subject, To, CC)
   - Email body (white background)
   - Action buttons (gray footer)

4. **Additional Context Cards (2 columns)**
   - Follow-up Strategy card
   - Automatic Tracking card

5. **Demo Navigation Hint (Blue)**
   - Next step guidance

### 4.2 Key UI Elements

**Page Header:**
- **Title:** "Screen 19: Follow-up Email Preview"
  - Font: text-3xl, font-bold, text-gray-900
- **Subtitle:** "Request missing tooling data from supplier"
  - Font: text-base, text-gray-600, mt-2

**System Notification Banner:**
- **Container:** bg-blue-50, border border-blue-200, rounded-lg, p-4, max-w-4xl mx-auto
- **Icon:** Check icon (size-5, text-blue-600)
- **Title:** "Automated Follow-up Ready"
  - Font: text-sm, font-semibold, text-blue-900
- **Checklist:**
  - Font: text-sm, text-blue-800, space-y-1
  - Items:
    - "✓ Follow-up will be tracked automatically via Project ID"
    - "✓ Reminder will be sent if no response in 3 days"

**Email Preview Card Header:**
- **Background:** bg-gray-50, border-b
- **Title:** "Follow-up Email Preview" (text-lg)
- **Badge:** "Missing Data Request" (variant-outline, bg-yellow-50, border-yellow-300, text-yellow-700)
  - Icon: AlertTriangle (size-3, mr-1)
- **Layout:** Flex with space-between

**Email Metadata Section:**
- **Subject Line:**
  - Label: "Subject:" (text-gray-500, w-16)
  - Value: "Re: RFQ RFQ-2025-047 - Additional Information Needed"
    - Font: font-medium, text-gray-900
  - Edit button: Blue pencil icon (size-3)
  - Layout: Flex with gap-2

- **To Field:**
  - Label: "To:" (text-gray-500, w-16)
  - Value: Supplier email badge
    - Badge: variant-secondary
    - Example: "supplier-a@company.com"

- **CC Field:**
  - Label: "CC:" (text-gray-500, w-16)
  - Value: Agent email badge
    - Badge: variant-outline, bg-blue-50, border-blue-300, text-blue-700
    - Icon: Mail icon (size-3)
    - Text: "rfq-agent@customer-domain.optiroq.com"

**Email Body Section:**
- **Container:** p-6, space-y-6, text-sm

- **Greeting:**
  - Text: "Dear Supplier A,"
  - Font: text-gray-900

- **Introduction:**
  - Text: "Thank you for your quotation for RFQ-2025-047 (Aluminum Mounting Bracket)."
  - Font: text-gray-900
  - Bold: RFQ ID

- **Request Statement:**
  - Text: "We are reviewing your response and need the following additional information for a fair comparison:"
  - Font: text-gray-900

**Missing Information Box:**
- **Container:** bg-red-50, border-l-4 border-l-red-500, rounded-r-lg, p-4
- **Title:** "Missing Information:"
  - Font: font-semibold, text-red-900, mb-3
- **Items:** space-y-2
- **Each item:**
  - Icon: X icon (size-4, text-red-600, mt-0.5)
  - Field name: font-medium, text-red-900
  - Details: ul with ml-4, space-y-1, text-sm, text-red-800
  - Example:
    - "Tooling Cost Breakdown"
    - "• Tooling investment (molds, dies, fixtures)"
    - "• Amortization period and total shots"
    - "• Maintenance costs per year"

**Why This Matters Box:**
- **Container:** bg-yellow-50, border border-yellow-200, rounded-lg, p-4
- **Title:** "Why This Matters:"
  - Font: font-semibold, text-yellow-900, mb-2
- **Explanation:** text-sm, text-yellow-800
  - Example: "We noticed that tooling costs may be embedded in your process costs. To ensure a fair comparison across all suppliers, we need tooling costs listed as a separate line item."
  - Bold: "separate line item"

**Deadline Box:**
- **Container:** bg-blue-50, border border-blue-200, rounded-lg, p-4
- **Layout:** Flex with items-start, gap-3
- **Icon:** Clock icon (size-5, text-blue-600)
- **Title:** "Please provide this information by:"
  - Font: font-semibold, text-blue-900
- **Date:** "December 29, 2024 (3 days)"
  - Font: text-lg, font-bold, text-blue-900, mt-1

**Instructions Box:**
- **Container:** bg-gray-50, rounded-lg, p-4, border border-gray-200
- **Text:** "You can reply to this email with the additional details in any format (Excel, PDF, or simple email text)."
  - Font: text-gray-900

**Closing Section:**
- **Thank you:** "Thank you for your cooperation!"
  - Font: text-gray-900
- **Signature:**
  - Margin: mt-4
  - Lines:
    - "Best regards,"
    - Name (font-medium, mt-1)
    - Title (text-gray-600)
    - Department (text-gray-600)

**Automated Tracking Notice:**
- **Container:** bg-green-50, border border-green-200, rounded-lg, p-3
- **Layout:** Flex with items-start, gap-2
- **Icon:** Check icon (size-4, text-green-600)
- **Title:** "System Note:" (font-semibold, text-xs, text-green-900)
- **Text:** "This follow-up will be automatically tracked. If no response is received within 3 days, a reminder will be sent."
  - Font: text-xs, text-green-900

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
  
  3. **Skip for Now:**
     - Variant: outline
     - Position: ml-auto (right-aligned)
     - Text: "Skip for Now"
  
  4. **Send Follow-up:**
     - Style: bg-blue-600, hover:bg-blue-700
     - Icon: Send (size-4, mr-2)
     - Text: "Send Follow-up"

**Follow-up Strategy Card:**
- **Container:** Card
- **Title:** "Follow-up Strategy" (text-base)
- **Content:** text-sm, space-y-2
- **Items:** Each with check icon (size-4, text-green-600)
  - "Email is polite but firm"
  - "Explains WHY data is needed"
  - "Clear deadline (3 days)"
  - "Easy to respond (any format)"

**Automatic Tracking Card:**
- **Container:** Card
- **Title:** "Automatic Tracking" (text-base)
- **Content:** text-sm, space-y-2
- **Items:** Each with check or clock icon (size-4, text-blue-600)
  - "Response monitored via Project ID"
  - "Reminder sent if no response in 3 days"
  - "Updated data auto-extracted when received"
  - "Comparison board refreshed automatically"

**Demo Navigation Hint:**
- **Container:** bg-blue-50, border border-blue-200, rounded-lg, p-4, max-w-4xl mx-auto
- **Text:** "Demo Navigation: Click 'Next' in the header to see the comparison board →"
  - Font: text-sm, text-blue-900, text-center
  - Bold: "Demo Navigation:"

### 4.3 Information Hierarchy

**Primary Information:**
- Missing information list
- Deadline
- Send Follow-up button

**Secondary Information:**
- Why this matters explanation
- Instructions for response
- Action buttons (Cancel, Edit, Skip)

**Tertiary Information:**
- System notifications
- Follow-up strategy
- Automatic tracking details
- Demo navigation hint


## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| follow_up_id | String | System | Yes | Unique follow-up identifier |
| rfq_id | String | RFQ data | Yes | RFQ identifier |
| supplier_id | String | Supplier data | Yes | Supplier identifier |
| extraction_id | String | Extraction data | Yes | Related extraction |
| created_at | DateTime | System timestamp | Yes | ISO 8601 format |
| sent_at | DateTime | Email service | No | When email sent |
| follow_up_status | Enum | System | Yes | 'draft', 'sent', 'responded', 'reminded' |
| reminder_sent_at | DateTime | System | No | When reminder sent |
| response_received_at | DateTime | System | No | When supplier responded |

### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| default_deadline_days | Integer | Yes | Yes | Default 3 days |
| reminder_delay_days | Integer | Yes | Yes | Default 3 days |
| email_template | String | Yes | Yes | Customizable template |
| tone_preference | Enum | Yes | Yes | 'polite', 'firm', 'urgent' |

### 5.3 Dynamic Fields (Buyer-Selectable)
| Field Name | Data Type | Conditions | Validation Rules | Default Value |
|------------|-----------|------------|------------------|---------------|
| subject_line | String | Always | Max 200 chars | "Re: RFQ {rfq_id} - Additional Information Needed" |
| supplier_email | String | Always | Valid email format | From supplier data |
| missing_fields_list | Array<Object> | Always | Min 1 item | From extraction issues |
| deadline_date | Date | Always | Future date | Today + 3 days |
| custom_message | String | Optional | Max 1000 chars | '' |
| explanation_text | String | Always | Max 500 chars | Auto-generated |

### 5.4 Data Displayed
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| supplier_name | String | Supplier data | Yes | Display in greeting |
| rfq_id | String | RFQ data | Yes | Display in subject and body |
| part_name | String | Part data | Yes | Display in introduction |
| missing_fields | Array<Object> | Extraction issues | Yes | Formatted list |
| deadline_formatted | String | Computed | Yes | "December 29, 2024 (3 days)" |
| buyer_name | String | User profile | Yes | Display in signature |
| buyer_title | String | User profile | Yes | Display in signature |
| buyer_department | String | User profile | Yes | Display in signature |
| agent_email | String | System config | Yes | Display in CC field |

### 5.5 Data Collected from User
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| subject_line_edit | Text input | No | Max 200 chars | Current subject |
| email_body_edit | Rich text | No | Max 10000 chars | Current body |
| action_selection | Button click | Yes | 'cancel', 'edit', 'skip', 'send' | None |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| deadline_date | today + default_deadline_days | default_deadline_days |
| deadline_formatted | Format date with days remaining | deadline_date |
| missing_fields_count | missing_fields_list.length | missing_fields_list |
| email_preview_html | Generate HTML from template + data | All email data |
| tracking_headers | Generate X-Optiroq-Project-ID header | rfq_id, follow_up_id |

## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration
- **Missing fields list:** Dynamically populated from extraction issues
- **Explanation text:** Adapts based on issue type (missing vs embedded vs low confidence)
- **Deadline:** Configurable (default 3 days)
- **Tone:** Adjustable (polite, firm, urgent)
- **Template:** Customizable email template

### 6.2 UI Adaptation Logic
- **Missing fields box:** Shows all detected issues
- **Explanation:** Adapts based on primary issue (tooling, material, etc.)
- **Deadline:** Calculated from current date + configured days
- **Signature:** Auto-populated from user profile
- **Tracking notice:** Always shown to confirm automation

### 6.3 LLM Integration
- **Email generation:** LLM creates professional follow-up email
- **Explanation:** LLM generates context-appropriate explanation
- **Tone adjustment:** LLM adapts tone based on preference
- **Translation:** LLM translates to supplier's language if needed
- **Fallback:** Static template if LLM fails

## 7. User Interactions

### 7.1 Primary Actions

**Action: Edit Subject Line**
- **Trigger:** User clicks pencil icon next to subject
- **Behavior:** Subject becomes editable, user types, confirms or cancels
- **Validation:** Max 200 characters, cannot be empty
- **Success:** Subject updated in preview
- **Error:** "Subject line is required" or "Subject line must be 200 characters or less"
- **Navigation:** Stays on preview screen

**Action: Edit Email Body**
- **Trigger:** User clicks "Edit Email" button
- **Behavior:** Modal or inline editor opens, user modifies body, saves or cancels
- **Validation:** Max 10,000 characters, cannot be empty
- **Success:** Email body updated in preview
- **Error:** "Email body is required" or "Email body must be 10,000 characters or less"
- **Navigation:** Stays on preview screen

**Action: Cancel**
- **Trigger:** User clicks "Cancel" button
- **Behavior:** 
  - Confirmation dialog: "Are you sure? Follow-up will not be sent."
  - If confirmed: Navigate back to Extraction Review
  - If cancelled: Stay on preview screen
- **Validation:** None
- **Success:** Navigate back to Extraction Review
- **Error:** None
- **Navigation:** Back to Screen 20 (Extraction Review)

**Action: Skip for Now**
- **Trigger:** User clicks "Skip for Now" button
- **Behavior:** 
  - Confirmation dialog: "Skip follow-up? You can send it later from the extraction review."
  - If confirmed: Mark extraction as "skipped follow-up", navigate to next supplier or comparison board
  - If cancelled: Stay on preview screen
- **Validation:** None
- **Success:** Navigate to next supplier or Comparison Board
- **Error:** None
- **Navigation:** To next supplier with issues, or to Screen 23 (Comparison Board)

**Action: Send Follow-up**
- **Trigger:** User clicks "Send Follow-up" button
- **Behavior:** 
  - Final validation check
  - Confirmation dialog: "Send follow-up to Supplier A? Reminder will be sent automatically if no response in 3 days."
  - If confirmed:
    - Show loading spinner
    - Send email to supplier
    - Embed Project ID in email headers
    - CC agent email for monitoring
    - Set reminder for 3 days
    - Show success message
    - Navigate to next supplier or comparison board
  - If cancelled: Stay on preview screen
- **Validation:** 
  - Subject line not empty
  - Email body not empty
  - Supplier email valid
  - Deadline is future date
- **Success:** 
  - "Follow-up sent to Supplier A successfully"
  - "Reminder will be sent automatically if no response in 3 days"
  - Navigate to next supplier or Comparison Board
- **Error:** 
  - If validation fails: Show error messages
  - If send fails: "Failed to send follow-up. Please try again."
- **Navigation:** To next supplier with issues, or to Screen 23 (Comparison Board)

### 7.2 Secondary Actions
- **View original extraction:** Link back to Extraction Review
- **View missing fields details:** Expand/collapse missing fields list
- **Copy email to clipboard:** Copy email text for external use
- **Preview in email client:** Open preview in default email client

### 7.3 Navigation
- **From:** 
  - Screen 20 (Extraction Review) via "Request Follow-up"
  - Screen 19 (Notifications) via "Approve Follow-up"
- **To:** 
  - Screen 20 (Extraction Review) via "Cancel"
  - Screen 23 (Comparison Board) via "Send" or "Skip"
  - Next supplier with issues (if multiple suppliers)

## 8. Business Rules

### 8.1 Validation Rules
- **Subject line:** Max 200 characters, cannot be empty
- **Email body:** Max 10,000 characters, cannot be empty
- **Supplier email:** Valid email format (RFC 5322)
- **Deadline:** Must be future date, reasonable timeframe (1-30 days)
- **Missing fields:** Min 1 field required to generate follow-up

### 8.2 Calculation Logic
- **Deadline date:** `today + default_deadline_days` (default 3 days)
- **Deadline formatted:** Format as "Month Day, Year (X days)"
- **Reminder date:** `sent_at + reminder_delay_days` (default 3 days)
- **Missing fields count:** `missing_fields_list.length`

### 8.3 Conditional Display Logic
- **Show missing fields box:** Always (min 1 field required)
- **Show explanation box:** Always (context-appropriate)
- **Show deadline box:** Always
- **Show tracking notice:** Always
- **Enable send button:** If validation passes
- **Show skip button:** Always (optional action)

### 8.4 Error Handling
- **Email generation failure:** Use static template
- **Send failure:** Show error, enable retry
- **Network error:** Show error, enable retry
- **Validation failure:** Show specific error per field
- **Timeout:** Show warning, continue trying

## 9. Acceptance Criteria

### 9.1 Functional Criteria (60 total)

**Page Load**
1. WHEN user clicks "Request Follow-up" THEN Follow-Up Preview screen SHALL load
2. WHEN screen loads THEN system notification banner SHALL be visible
3. WHEN screen loads THEN email preview card SHALL be visible
4. WHEN screen loads THEN all action buttons SHALL be visible

**System Notification**
5. WHEN screen loads THEN notification SHALL confirm automatic tracking
6. WHEN screen loads THEN notification SHALL confirm reminder will be sent
7. WHEN screen loads THEN notification SHALL be blue (informational)

**Email Metadata**
8. WHEN screen loads THEN subject line SHALL be displayed
9. WHEN screen loads THEN subject line SHALL include RFQ ID
10. WHEN user clicks edit icon THEN subject line SHALL become editable
11. WHEN user edits subject THEN changes SHALL be saved
12. WHEN screen loads THEN supplier email SHALL be displayed as badge
13. WHEN screen loads THEN CC field SHALL show agent email
14. WHEN screen loads THEN CC field SHALL show auto-added note

**Email Body - Greeting**
15. WHEN screen loads THEN greeting SHALL address supplier by name
16. WHEN screen loads THEN introduction SHALL thank supplier for quotation
17. WHEN screen loads THEN introduction SHALL reference RFQ ID and part name

**Email Body - Request**
18. WHEN screen loads THEN request statement SHALL be visible
19. WHEN screen loads THEN request SHALL mention "fair comparison"

**Missing Information Box**
20. WHEN screen loads THEN missing information box SHALL be visible
21. WHEN screen loads THEN box SHALL have red left border
22. WHEN screen loads THEN box SHALL list all missing fields
23. WHEN tooling missing THEN box SHALL list tooling investment, amortization, maintenance
24. WHEN material missing THEN box SHALL list material type, cost, weights
25. WHEN process missing THEN box SHALL list operations, cycle time, costs
26. WHEN logistics missing THEN box SHALL list packaging, transportation, incoterms
27. WHEN terms missing THEN box SHALL list payment terms, currency, lead time
28. WHEN each field listed THEN X icon SHALL be shown
29. WHEN each field listed THEN field name SHALL be bold
30. WHEN each field listed THEN details SHALL be bulleted list

**Why This Matters Box**
31. WHEN screen loads THEN explanation box SHALL be visible
32. WHEN screen loads THEN box SHALL have yellow background
33. WHEN tooling missing THEN explanation SHALL mention embedded costs
34. WHEN tooling missing THEN explanation SHALL emphasize "separate line item"
35. WHEN other fields missing THEN explanation SHALL be context-appropriate

**Deadline Box**
36. WHEN screen loads THEN deadline box SHALL be visible
37. WHEN screen loads THEN box SHALL have blue background
38. WHEN screen loads THEN clock icon SHALL be shown
39. WHEN screen loads THEN deadline date SHALL be displayed
40. WHEN screen loads THEN days remaining SHALL be shown in parentheses
41. WHEN deadline calculated THEN date SHALL be today + 3 days (default)

**Instructions Box**
42. WHEN screen loads THEN instructions box SHALL be visible
43. WHEN screen loads THEN instructions SHALL mention "any format"
44. WHEN screen loads THEN instructions SHALL mention Excel, PDF, email text

**Closing**
45. WHEN screen loads THEN thank you message SHALL be visible
46. WHEN screen loads THEN signature SHALL include buyer name
47. WHEN screen loads THEN signature SHALL include buyer title
48. WHEN screen loads THEN signature SHALL include buyer department

**Tracking Notice**
49. WHEN screen loads THEN tracking notice SHALL be visible
50. WHEN screen loads THEN notice SHALL have green background
51. WHEN screen loads THEN notice SHALL mention automatic tracking
52. WHEN screen loads THEN notice SHALL mention 3-day reminder

**Action Buttons**
53. WHEN screen loads THEN Cancel button SHALL be visible
54. WHEN screen loads THEN Edit Email button SHALL be visible
55. WHEN screen loads THEN Skip for Now button SHALL be visible
56. WHEN screen loads THEN Send Follow-up button SHALL be visible
57. WHEN validation passes THEN Send button SHALL be enabled
58. WHEN validation fails THEN Send button SHALL be disabled

**Additional Context Cards**
59. WHEN screen loads THEN Follow-up Strategy card SHALL be visible
60. WHEN screen loads THEN Automatic Tracking card SHALL be visible

### 9.2 Flexibility Criteria (10 total)
1. WHEN admin changes default deadline THEN deadline SHALL update
2. WHEN admin changes reminder delay THEN reminder date SHALL update
3. WHEN admin changes email template THEN email body SHALL update
4. WHEN admin changes tone preference THEN email tone SHALL update
5. WHEN buyer edits subject THEN custom subject SHALL be used
6. WHEN buyer edits body THEN custom body SHALL be used
7. WHEN missing fields change THEN list SHALL update
8. WHEN explanation needed THEN context-appropriate text SHALL be generated
9. WHEN language preference set THEN email SHALL be translated
10. WHEN multiple issues THEN all SHALL be listed

### 9.3 UX Criteria (20 total)
1. Screen SHALL load within 2 seconds
2. Email preview SHALL be clearly formatted
3. Missing fields SHALL be easy to scan
4. Explanation SHALL be clear and concise
5. Deadline SHALL be prominently displayed
6. Action buttons SHALL be clearly labeled
7. Edit mode SHALL be clearly indicated
8. Success/error messages SHALL be clear
9. Confirmation dialogs SHALL be clear
10. Email SHALL look professional
11. Tone SHALL be polite but firm
12. Request SHALL be actionable
13. Instructions SHALL be simple
14. Signature SHALL be complete
15. Tracking notice SHALL be reassuring
16. Strategy card SHALL explain approach
17. Tracking card SHALL explain automation
18. Demo navigation hint SHALL be clearly separated
19. Color coding SHALL be consistent
20. Layout SHALL be clean and organized

### 9.4 Performance Criteria (10 total)
1. Screen SHALL load within 2 seconds
2. Email generation SHALL complete within 1 second
3. Subject edit SHALL save within 500ms
4. Body edit SHALL save within 1 second
5. Send SHALL process within 3 seconds
6. Skip SHALL process within 1 second
7. Cancel SHALL process within 500ms
8. Validation SHALL complete within 500ms
9. Confirmation dialog SHALL appear within 300ms
10. Navigation SHALL complete within 1 second

### 9.5 Accessibility Criteria (15 total)
1. All interactive elements SHALL be keyboard accessible
2. All images SHALL have alt text
3. Color SHALL NOT be the only indicator of status
4. Text SHALL have sufficient contrast (WCAG AA)
5. Focus indicators SHALL be visible
6. Screen readers SHALL announce content
7. Form fields SHALL have labels
8. Buttons SHALL have descriptive labels
9. Confirmation dialogs SHALL be accessible
10. Email preview SHALL be readable by screen readers
11. Missing fields list SHALL be navigable
12. Action buttons SHALL be keyboard accessible
13. Edit mode SHALL announce state changes
14. Success messages SHALL be announced
15. Error messages SHALL be announced

### 9.6 Security Criteria (15 total)
1. Email SHALL be sent over encrypted connection (TLS)
2. Supplier email SHALL be validated
3. Agent email SHALL be verified
4. Project ID SHALL be embedded securely
5. Email content SHALL be sanitized (XSS prevention)
6. User identity SHALL be verified
7. Send action SHALL be logged
8. Skip action SHALL be logged
9. Edit actions SHALL be logged
10. Email delivery SHALL be tracked
11. Reminder SHALL be sent securely
12. Response SHALL be monitored securely
13. Data SHALL be encrypted in transit
14. Data SHALL be encrypted at rest
15. Audit trail SHALL be maintained

## 10. Dependencies

### 10.1 Prerequisites
- Extraction must be complete (from Screen 20)
- Missing fields must be detected
- Supplier email must be available
- User profile must exist (for signature)
- Email service must be operational

### 10.2 Backend/API Requirements
- **GET /api/follow-up/{extraction_id}/generate:** Generate follow-up email
- **PUT /api/follow-up/{follow_up_id}/edit:** Update email content
- **POST /api/follow-up/{follow_up_id}/send:** Send follow-up email
- **POST /api/follow-up/{follow_up_id}/skip:** Skip follow-up
- **POST /api/follow-up/{follow_up_id}/reminder:** Schedule reminder

### 10.3 Integration Points
- **Screen 20:** Extraction Review (entry point)
- **Screen 19:** Notifications (entry point)
- **Screen 23:** Comparison Board (exit point)
- **Email service:** For sending follow-ups
- **LLM service:** For email generation
- **Reminder service:** For automatic reminders
- **Tracking service:** For response monitoring

## 11. Success Metrics
- **Follow-up rate:** 20% of suppliers require follow-up
- **Response rate:** 80% of suppliers respond within 3 days
- **Reminder rate:** <20% require reminder
- **Completion rate:** 90% provide complete data after follow-up
- **Time saved:** 10 minutes per follow-up (vs manual email)
- **User satisfaction:** 4.5/5 rating for follow-up feature

## 12. Open Questions
1. Should we allow scheduling follow-up for later?
2. Should we provide multiple follow-up templates?
3. Should we escalate if no response after reminder?
4. Should we allow attaching files to follow-up?
5. Should we provide follow-up analytics (response rates, etc.)?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial requirements document created |

---

**Total Lines:** ~1,200 lines  
**Total Acceptance Criteria:** 130 (60 functional + 10 flexibility + 20 UX + 10 performance + 15 accessibility + 15 security)

**Status:** Complete ✅
