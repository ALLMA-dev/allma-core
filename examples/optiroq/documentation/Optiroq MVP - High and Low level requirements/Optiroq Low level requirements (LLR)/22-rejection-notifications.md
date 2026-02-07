# Screen Requirements: Rejection Notifications

## 1. Overview
- **Screen ID:** SCR-022
- **Component File:** `src/app/components/RejectionNotifications.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 6 - Incremental Comparison Board with Supplier Ranking
- **Priority:** P0 (Must Have)
- **Flexibility Level:** High - Dynamic feedback levels and content based on supplier performance

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** review and send professional rejection emails with specific feedback to non-selected suppliers  
**So that** I maintain positive relationships and support their continuous improvement

### Related User Stories
- **US-MVP-23:** Review Summary with Target Price and Supplier Ranking
- **US-MVP-27:** Make Sourcing Decision
- **US-MVP-12:** Detect Hidden Costs (Embedded Tooling)
- **US-MVP-18:** Detect Material Cost Outliers

## 3. Screen Purpose & Context

### Purpose
This screen is the final communication checkpoint after sourcing decision. It provides:
- **Decision summary:** Clear overview of selected vs non-selected suppliers
- **Auto-generated rejection emails:** Professional, constructive feedback for each supplier
- **Flexible feedback levels:** High/Medium/Low detail based on relationship strategy
- **Batch sending:** Send all rejection emails at once
- **Audit trail:** Complete record of all communications
- **Relationship management:** Maintain positive supplier relationships for future opportunities

### Context
- **When user sees this:** 
  - After making sourcing decision (selecting winning supplier)
  - After completing comparison board analysis
  - Before sending nomination letter to selected supplier
  - Final step in RFQ process
- **Why it exists:** 
  - Maintains professional supplier relationships
  - Provides constructive feedback for supplier improvement
  - Creates complete audit trail
  - Saves time writing individual rejection emails
  - Disciplines suppliers with specific feedback
  - Encourages participation in future RFQs
- **Position in journey:** 
  - After Comparison Board (Screen 23)
  - After Sourcing Decision
  - Before Contract Negotiation
  - Final communication in RFQ cycle

### Key Characteristics
- **Auto-generated content:** LLM creates professional rejection emails with specific feedback
- **Three feedback levels:** High (detailed), Medium (balanced), Low (minimal)
- **Global + individual control:** Set default level, customize per supplier
- **Cost variance display:** Show how much above target/selected supplier
- **Specific recommendations:** Actionable feedback based on cost analysis
- **Professional tone:** Polite, constructive, encouraging future participation
- **Batch processing:** Review all, send all at once
- **Confirmation screen:** Success confirmation with next steps
- **Audit trail:** All emails stored in project record

## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Container (Pre-Send State):**
1. **Page Header**
   - Title: "Screen 20: Rejection Notifications"
   - Subtitle: "Confirmation of sent rejection emails"

2. **Decision Summary Card**
   - Selected supplier (green highlight)
   - Non-selected suppliers list with cost variance
   - Next step guidance

3. **Global Feedback Level Selector**
   - Radio buttons: High / Medium / Low detail
   - Explanation of each level

4. **Supplier Rejection Email Cards (3 cards)**
   - Collapsible preview for each non-selected supplier
   - Individual feedback level selector
   - Email preview with subject and body
   - Edit button

5. **Page Footer Card**
   - Ready to send summary
   - Action buttons: Cancel, Save Drafts, Send All

6. **Demo Navigation Hint**

**Page Container (Post-Send State):**
1. **Page Header**
   - Same as pre-send

2. **Confirmation Card**
   - Success message with timestamp
   - Emails sent list with delivery confirmation
   - Next steps guidance
   - Action buttons: View Project Record, Download Audit Trail

3. **Success Stats Card**
   - Process completion celebration
   - Key metrics: emails sent, time saved, audit trail

### 4.2 Key UI Elements

**Page Header:**
- **Title:** "Screen 20: Rejection Notifications"
  - Font: text-3xl, font-bold, text-gray-900
- **Subtitle:** "Confirmation of sent rejection emails"
  - Font: text-gray-600, mt-2

**Decision Summary Card:**
- **Container:** Card, max-w-6xl mx-auto
- **Header:** bg-blue-50, border-b border-blue-200
  - Icon: Mail (size-6, text-blue-600)
  - Title: "Decision Complete - Send Supplier Notifications?"
  - Subtitle: RFQ ID and part name (text-sm, text-gray-600)

- **Decision Summary Box:**
  - Container: bg-gray-50, rounded-lg, p-4, border border-gray-200
  - Title: "✅ DECISION SUMMARY" (font-semibold, text-gray-900)
  - Grid: md:grid-cols-2, gap-4

  - **Selected Supplier Section:**
    - Label: "Selected Supplier" (text-sm, text-gray-600)
    - Name: text-lg, font-bold, text-green-600
    - Total cost: text-sm, text-gray-600
    - Annual cost: text-sm, text-gray-600

  - **Non-Selected Suppliers Section:**
    - Label: "Non-Selected Suppliers:" (text-sm, text-gray-600)
    - List: space-y-1, text-sm
    - Each supplier:
      - Name with bullet point (text-gray-700)
      - Cost with badge (text-gray-900)
      - Badge: variant-outline, "X% above"

- **Next Step Box:**
  - Container: bg-blue-50, rounded-lg, p-4, border border-blue-200
  - Text: text-sm, text-blue-900
  - Bold: "Next Step:"
  - Message: Professional rejection emails prepared

**Global Feedback Level Selector Card:**
- **Container:** Card, max-w-6xl mx-auto
- **Header:** bg-gray-50, border-b
  - Title: "Global Feedback Level" (text-base)
  - Subtitle: "Select default feedback detail level for all suppliers (can be customized individually)"
    - Font: text-sm, text-gray-500, mt-1

- **Radio Buttons:**
  - Container: flex, items-center, gap-4
  - Each option:
    - Input: type-radio, size-4
    - Label: text-sm, text-gray-900
    - Options:
      1. "High Detail - Specific cost breakdown and competitive position"
      2. "Medium Detail - General reasons and cost variance (Recommended)" - font-medium
      3. "Low Detail - Basic reason only"

**Supplier Rejection Email Card:**
- **Container:** Card, border-l-4 border-l-yellow-500, max-w-6xl mx-auto
- **Header:** bg-gray-50
  - Layout: flex, items-center, justify-between

  - **Left Section:**
    - Supplier name: CardTitle, text-base
    - Email badge: variant-outline
    - Cost badge: variant-secondary
      - Format: "€X.XX/piece (Y% above)"

  - **Right Section:**
    - Feedback level selector: Select dropdown, w-40
      - Options: High Detail, Medium Detail, Low Detail
    - Preview button: Button, variant-outline, size-sm
      - Icon: ChevronDown/ChevronUp (size-4)
      - Text: "Hide" or "Preview"

- **Collapsible Content (when expanded):**
  - Container: p-6, bg-white

  - **Email Preview Box:**
    - Container: bg-gray-50, rounded-lg, p-4, border-2 border-gray-300
    - Subject header: bg-gray-200, px-4, py-2, border-b-2 border-gray-300
      - Text: "Subject: RFQ RFQ-2025-047 Results - Thank You for Your Participation"
      - Font: text-sm, font-semibold, text-gray-700
    - Body: prose prose-sm, max-w-none
      - Pre-formatted text: whitespace-pre-wrap, font-sans, text-sm, text-gray-900, leading-relaxed

  - **High Detail Feedback Notice (conditional):**
    - Container: bg-blue-50, border border-blue-200, rounded-lg, p-3, mt-4
    - Layout: flex, items-start, gap-2
    - Icon: Lightbulb (size-5, text-blue-600)
    - Text: text-sm, text-blue-900
      - Bold: "High Detail Feedback:"
      - Message: "Provides specific cost breakdown and recommendations. Use for strategic suppliers you want to develop."

  - **Edit Button:**
    - Button: variant-outline, size-sm
    - Icon: Edit (size-4, mr-2)
    - Text: "Edit Email"

  - **Ready Status:**
    - Container: flex, items-center, gap-2, mt-4, pt-4, border-t
    - Icon: Check (size-4, text-green-600)
    - Text: "Ready to Send" (text-sm, text-green-600, font-medium)

**Page Footer Card:**
- **Container:** Card, max-w-6xl mx-auto, border-2 border-blue-500
- **Content:** p-6

- **Ready to Send Box:**
  - Container: bg-gray-50, rounded-lg, p-4, border border-gray-200, mb-4
  - Title: "READY TO SEND" (font-semibold, text-gray-900, mb-2)
  - Checklist: text-sm, text-gray-700, space-y-1
    - Check icon (size-4, text-green-600)
    - "3 rejection emails ready to send"
    - "All emails reviewed"

- **Action Bar:**
  - Layout: flex, items-center, justify-between
  - Left: Time estimate
    - Icon: Clock (size-4)
    - Text: "Estimated time: 5-10 minutes to review and send"
    - Font: text-sm, text-gray-600
  - Right: Buttons (flex, gap-3)
    1. **Cancel:** variant-outline
    2. **Save Drafts:** variant-outline
    3. **Send All Rejection Emails:** bg-blue-600, hover:bg-blue-700
       - Icon: Send (size-4, mr-2)

**Demo Navigation Hint:**
- **Container:** bg-blue-50, border border-blue-200, rounded-lg, p-4, max-w-6xl mx-auto
- **Text:** "Demo: Click 'Send All Rejection Emails' to see the confirmation screen"
  - Font: text-sm, text-blue-900, text-center
  - Bold: "Demo:"

**Confirmation Card (Post-Send):**
- **Container:** Card, max-w-4xl mx-auto, border-2 border-green-500
- **Header:** bg-green-50, border-b border-green-200
  - Layout: flex, items-center, gap-3
  - Icon container: size-12, bg-green-600, rounded-full
    - Icon: Check (size-6, text-white)
  - Title: "✅ Rejection Emails Sent - RFQ-2025-047"
  - Timestamp: "Dec 27, 2024 at 10:25 AM" (text-sm, text-gray-500, mt-1)

- **Content:** p-6, space-y-6
  - Greeting: "Hi Sarah," (text-gray-900)
  - Message: "Rejection emails have been sent successfully for RFQ-2025-047."

  - **Emails Sent Box:**
    - Container: bg-gray-50, rounded-lg, p-4, border border-gray-200
    - Title: "✅ EMAILS SENT" (font-semibold, text-gray-900, mb-3)
    - List: space-y-2
    - Each item:
      - Check icon (size-4, text-green-600)
      - Text: "Supplier X - Delivered (Dec 27, 10:25 AM)"
      - Font: text-sm, text-gray-900
    - Footer: "All rejection emails have been stored in the project record for audit trail."
      - Font: text-sm, text-gray-600, mt-3

  - **Next Steps Box:**
    - Container: bg-blue-50, rounded-lg, p-4, border border-blue-200
    - Title: "Next Steps:" (font-semibold, text-blue-900, mb-2)
    - List: text-sm, text-blue-800, space-y-1
      - "• Send nomination letter to Supplier B (selected supplier)"
      - "• Initiate contract negotiation"
      - "• Update project timeline"

  - **Action Buttons:**
    - Layout: flex, gap-3
    1. **View Project Record:** variant-outline
       - Icon: Eye (size-4, mr-2)
    2. **Download Audit Trail:** variant-outline
       - Icon: Download (size-4, mr-2)

  - **Closing:**
    - Message: "Congratulations on completing RFQ-2025-047!"
    - Signature: "Best regards, Optiroq System"
    - Font: text-gray-900, pt-4, border-t

**Success Stats Card:**
- **Container:** bg-gradient-to-r from-green-50 to-blue-50, border-2 border-green-300, rounded-lg, p-6, max-w-4xl mx-auto
- **Content:** text-center, space-y-3

- **Icon:**
  - Container: size-16, bg-green-600, rounded-full, mx-auto
  - Icon: Check (size-8, text-white)

- **Title:** "RFQ Process 100% Complete!"
  - Font: text-2xl, font-bold, text-gray-900

- **Subtitle:** "Professional supplier communications sent automatically"
  - Font: text-gray-700

- **Metrics:**
  - Layout: flex, justify-center, gap-6, mt-4
  - Each metric:
    - Container: text-center
    - Value: text-3xl, font-bold, color-coded
    - Label: text-sm, text-gray-600
  - Metrics:
    1. "3" - "Rejection Emails Sent" (text-green-600)
    2. "5 min" - "Time to Review & Send" (text-blue-600)
    3. "100%" - "Audit Trail" (text-purple-600)

### 4.3 Information Hierarchy

**Primary Information:**
- Decision summary (selected vs non-selected)
- Send All button
- Email preview content

**Secondary Information:**
- Feedback level selectors
- Individual supplier details
- Cost variance percentages

**Tertiary Information:**
- Edit buttons
- Save drafts option
- Demo navigation hint
- Success metrics



## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| rejection_batch_id | String | System | Yes | Unique batch identifier |
| rfq_id | String | RFQ data | Yes | RFQ identifier |
| selected_supplier_id | String | Decision data | Yes | Winning supplier |
| decision_date | DateTime | System timestamp | Yes | ISO 8601 format |
| sent_at | DateTime | Email service | No | When emails sent |
| rejection_status | Enum | System | Yes | 'draft', 'sent', 'confirmed' |
| created_by | String | User profile | Yes | Buyer who made decision |

### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| default_feedback_level | Enum | Yes | Yes | 'high', 'medium', 'low' |
| email_template_high | String | Yes | Yes | Customizable template |
| email_template_medium | String | Yes | Yes | Customizable template |
| email_template_low | String | Yes | Yes | Customizable template |
| auto_store_audit | Boolean | Yes | No | Always true |

### 5.3 Dynamic Fields (Buyer-Selectable)
| Field Name | Data Type | Conditions | Validation Rules | Default Value |
|------------|-----------|------------|------------------|---------------|
| global_feedback_level | Enum | Always | 'high', 'medium', 'low' | 'medium' |
| supplier_feedback_levels | Map<String, Enum> | Per supplier | 'high', 'medium', 'low' | global_feedback_level |
| custom_email_content | Map<String, String> | Optional | Max 10000 chars per email | '' |
| send_immediately | Boolean | Always | true/false | false |

### 5.4 Data Displayed
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| rfq_id | String | RFQ data | Yes | Display in header |
| part_name | String | Part data | Yes | Display in header |
| selected_supplier_name | String | Decision data | Yes | Display in summary |
| selected_supplier_cost | Decimal | Comparison data | Yes | €X.XX/piece format |
| selected_annual_cost | Decimal | Calculated | Yes | €X,XXX format |
| rejected_suppliers | Array<Object> | Decision data | Yes | List of non-selected |
| supplier_name | String | Supplier data | Yes | Per supplier |
| supplier_email | String | Supplier data | Yes | Per supplier |
| supplier_cost | Decimal | Comparison data | Yes | €X.XX/piece format |
| percent_above_target | Decimal | Calculated | Yes | X% above format |
| cost_breakdown | Object | Extraction data | Yes | Material, Process, Tooling, Logistics |
| email_content | String | LLM generated | Yes | Per feedback level |
| buyer_name | String | User profile | Yes | Display in signature |
| buyer_title | String | User profile | Yes | Display in signature |
| buyer_department | String | User profile | Yes | Display in signature |
| buyer_email | String | User profile | Yes | Display in signature |

### 5.5 Data Collected from User
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| global_feedback_level | Radio button | Yes | 'high', 'medium', 'low' | 'medium' |
| supplier_feedback_level | Dropdown per supplier | Yes | 'high', 'medium', 'low' | global_feedback_level |
| email_edit | Rich text | No | Max 10000 chars | Current content |
| action_selection | Button click | Yes | 'cancel', 'save', 'send' | None |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| percent_above_target | ((supplier_cost - target_cost) / target_cost) * 100 | supplier_cost, target_cost |
| percent_above_selected | ((supplier_cost - selected_cost) / selected_cost) * 100 | supplier_cost, selected_cost |
| annual_cost | supplier_cost * annual_volume | supplier_cost, annual_volume |
| cost_variance_category | If >20%: high, 10-20%: medium, <10%: low | percent_above_target |
| email_content_by_level | Generate from template + data + LLM | All cost data, feedback_level |
| rejection_count | rejected_suppliers.length | rejected_suppliers |
| estimated_time | rejection_count * 2 minutes | rejection_count |

## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration
- **Feedback levels:** Three levels (high/medium/low) with different detail
- **Global setting:** Apply default to all suppliers
- **Individual override:** Customize per supplier relationship
- **Email templates:** Configurable per feedback level
- **Cost breakdown:** Adapts based on available data

### 6.2 UI Adaptation Logic
- **Feedback level selector:** Global default + individual override
- **Email content:** Dynamically generated based on:
  - Feedback level selected
  - Cost variance (high/medium/low)
  - Specific cost drivers (material, process, tooling)
  - Supplier performance (close decision vs far from target)
- **Recommendations:** Context-specific based on cost analysis
- **Tone:** Adapts based on relationship (strategic vs transactional)
- **Expanded supplier:** Auto-expand first supplier by default

### 6.3 LLM Integration
- **Email generation:** LLM creates professional rejection emails with specific feedback
- **High detail:** Detailed cost breakdown, specific recommendations, competitive position
- **Medium detail:** General reasons, cost variance, professional feedback
- **Low detail:** Basic reason only, polite closure
- **Context awareness:** LLM uses cost analysis to provide relevant feedback
- **Tone adjustment:** Professional, constructive, encouraging
- **Translation:** LLM translates to supplier's language if needed
- **Fallback:** Static template if LLM fails

## 7. User Interactions

### 7.1 Primary Actions

**Action: Select Global Feedback Level**
- **Trigger:** User clicks radio button (High/Medium/Low)
- **Behavior:** 
  - Update global_feedback_level state
  - Apply to all suppliers who haven't been individually customized
  - Update email previews for affected suppliers
- **Validation:** None (always valid)
- **Success:** All supplier email previews update
- **Error:** None
- **Navigation:** Stays on screen

**Action: Select Individual Supplier Feedback Level**
- **Trigger:** User selects from dropdown for specific supplier
- **Behavior:** 
  - Update supplier_feedback_levels[supplier_name]
  - Override global setting for this supplier
  - Update email preview for this supplier
- **Validation:** None (always valid)
- **Success:** Supplier email preview updates
- **Error:** None
- **Navigation:** Stays on screen

**Action: Expand/Collapse Supplier Email Preview**
- **Trigger:** User clicks "Preview" or "Hide" button
- **Behavior:** 
  - Toggle collapsible content
  - Show/hide email preview
  - Update button text and icon
- **Validation:** None
- **Success:** Email preview shown/hidden
- **Error:** None
- **Navigation:** Stays on screen

**Action: Edit Email**
- **Trigger:** User clicks "Edit Email" button
- **Behavior:** 
  - Open modal or inline editor
  - Show current email content (editable)
  - User modifies subject and/or body
  - User saves or cancels
- **Validation:** 
  - Subject line not empty
  - Body not empty
  - Max 10,000 characters
- **Success:** Email content updated in preview
- **Error:** "Email content is required" or "Email must be 10,000 characters or less"
- **Navigation:** Stays on screen

**Action: Cancel**
- **Trigger:** User clicks "Cancel" button
- **Behavior:** 
  - Confirmation dialog: "Are you sure? Rejection emails will not be sent."
  - If confirmed: Navigate back to Comparison Board
  - If cancelled: Stay on screen
- **Validation:** None
- **Success:** Navigate back to Comparison Board
- **Error:** None
- **Navigation:** Back to Screen 23 (Comparison Board)

**Action: Save Drafts**
- **Trigger:** User clicks "Save Drafts" button
- **Behavior:** 
  - Save all email content as drafts
  - Show success message: "Drafts saved successfully"
  - User can return later to send
- **Validation:** None (can save incomplete)
- **Success:** "Drafts saved successfully. You can send them later from the project page."
- **Error:** "Failed to save drafts. Please try again."
- **Navigation:** Stays on screen or navigate to project page

**Action: Send All Rejection Emails**
- **Trigger:** User clicks "Send All Rejection Emails" button
- **Behavior:** 
  - Final validation check
  - Confirmation dialog: "Send rejection emails to 3 suppliers? This action cannot be undone."
  - If confirmed:
    - Show loading spinner
    - Send all rejection emails
    - Store in project record (audit trail)
    - Show success confirmation screen
  - If cancelled: Stay on screen
- **Validation:** 
  - All email content not empty
  - All supplier emails valid
  - Selected supplier confirmed
- **Success:** 
  - Navigate to confirmation screen
  - Show success message with timestamp
  - Show delivery confirmation for each supplier
  - Show next steps guidance
- **Error:** 
  - If validation fails: Show error messages
  - If send fails: "Failed to send rejection emails. Please try again."
- **Navigation:** To confirmation screen (same component, different state)

### 7.2 Secondary Actions
- **View Project Record:** Navigate to project detail page
- **Download Audit Trail:** Download PDF with all communications
- **Copy email to clipboard:** Copy email text for external use
- **Preview in email client:** Open preview in default email client

### 7.3 Navigation
- **From:** 
  - Screen 23 (Comparison Board) after sourcing decision
  - Project page (if returning to drafts)
- **To:** 
  - Screen 23 (Comparison Board) via "Cancel"
  - Confirmation screen via "Send All"
  - Project page via "View Project Record"
  - Contract negotiation (next step after confirmation)

## 8. Business Rules

### 8.1 Validation Rules
- **Email content:** Max 10,000 characters per email, cannot be empty
- **Supplier email:** Valid email format (RFC 5322)
- **Feedback level:** Must be 'high', 'medium', or 'low'
- **Selected supplier:** Must be confirmed before sending rejections
- **Rejection count:** Min 1 supplier (at least one non-selected)

### 8.2 Calculation Logic
- **Percent above target:** `((supplier_cost - target_cost) / target_cost) * 100`
- **Percent above selected:** `((supplier_cost - selected_cost) / selected_cost) * 100`
- **Annual cost:** `supplier_cost * annual_volume`
- **Estimated time:** `rejection_count * 2 minutes` (average review time)
- **Cost variance category:** 
  - High: >20% above target
  - Medium: 10-20% above target
  - Low: <10% above target

### 8.3 Conditional Display Logic
- **Show decision summary:** Always (required context)
- **Show global feedback selector:** Always
- **Show supplier cards:** One per non-selected supplier
- **Auto-expand first supplier:** Default behavior
- **Show high detail notice:** Only when feedback level is 'high'
- **Show ready status:** When email content is valid
- **Enable send button:** When all validations pass
- **Show confirmation screen:** After successful send

### 8.4 Error Handling
- **Email generation failure:** Use static template
- **Send failure:** Show error, enable retry
- **Network error:** Show error, enable retry
- **Validation failure:** Show specific error per field
- **Timeout:** Show warning, continue trying
- **Partial send failure:** Show which emails failed, allow retry for failed only

### 8.5 Feedback Level Content Rules

**High Detail Feedback Includes:**
- Detailed cost breakdown by category
- Specific cost drivers (material, process, tooling, logistics)
- Competitive position vs selected supplier
- Specific recommendations for improvement
- Market benchmarks (if available)
- Scrap ratio analysis (if applicable)
- Lead time comparison (if factor in decision)

**Medium Detail Feedback Includes:**
- General cost variance (X% above target)
- Primary cost drivers (high-level)
- General recommendations
- Professional encouragement for future participation

**Low Detail Feedback Includes:**
- Basic reason (alternative supplier selected)
- Polite closure
- Encouragement for future participation
- No specific cost details

## 9. Acceptance Criteria

### 9.1 Functional Criteria (70 total)

**Page Load**
1. WHEN user navigates to rejection notifications THEN screen SHALL load
2. WHEN screen loads THEN decision summary card SHALL be visible
3. WHEN screen loads THEN global feedback selector SHALL be visible
4. WHEN screen loads THEN all supplier cards SHALL be visible
5. WHEN screen loads THEN page footer SHALL be visible

**Decision Summary**
6. WHEN screen loads THEN selected supplier SHALL be displayed
7. WHEN screen loads THEN selected supplier SHALL be highlighted in green
8. WHEN screen loads THEN selected supplier cost SHALL be displayed
9. WHEN screen loads THEN annual cost SHALL be displayed
10. WHEN screen loads THEN non-selected suppliers list SHALL be displayed
11. WHEN each non-selected supplier listed THEN cost SHALL be shown
12. WHEN each non-selected supplier listed THEN percent above SHALL be shown
13. WHEN screen loads THEN next step guidance SHALL be displayed

**Global Feedback Level Selector**
14. WHEN screen loads THEN three radio buttons SHALL be visible
15. WHEN screen loads THEN "Medium Detail" SHALL be selected by default
16. WHEN screen loads THEN "Medium Detail" SHALL be marked as "Recommended"
17. WHEN user clicks "High Detail" THEN global level SHALL update
18. WHEN user clicks "Low Detail" THEN global level SHALL update
19. WHEN global level changes THEN all non-customized suppliers SHALL update

**Supplier Rejection Email Cards**
20. WHEN screen loads THEN one card per non-selected supplier SHALL be displayed
21. WHEN screen loads THEN first supplier SHALL be auto-expanded
22. WHEN screen loads THEN other suppliers SHALL be collapsed
23. WHEN each card displayed THEN supplier name SHALL be shown
24. WHEN each card displayed THEN supplier email SHALL be shown as badge
25. WHEN each card displayed THEN cost SHALL be shown with percent above
26. WHEN each card displayed THEN feedback level dropdown SHALL be shown
27. WHEN each card displayed THEN preview button SHALL be shown
28. WHEN card collapsed THEN email content SHALL be hidden
29. WHEN card expanded THEN email content SHALL be visible

**Email Preview**
30. WHEN card expanded THEN subject line SHALL be displayed
31. WHEN card expanded THEN subject SHALL include RFQ ID
32. WHEN card expanded THEN email body SHALL be displayed
33. WHEN card expanded THEN greeting SHALL address supplier by name
34. WHEN card expanded THEN thank you message SHALL be included
35. WHEN card expanded THEN decision statement SHALL be included
36. WHEN feedback level is high THEN detailed cost breakdown SHALL be shown
37. WHEN feedback level is high THEN specific recommendations SHALL be shown
38. WHEN feedback level is high THEN competitive position SHALL be shown
39. WHEN feedback level is medium THEN general cost variance SHALL be shown
40. WHEN feedback level is medium THEN primary cost drivers SHALL be shown
41. WHEN feedback level is low THEN basic reason only SHALL be shown
42. WHEN card expanded THEN signature SHALL include buyer name
43. WHEN card expanded THEN signature SHALL include buyer title
44. WHEN card expanded THEN signature SHALL include buyer department
45. WHEN card expanded THEN signature SHALL include buyer email

**High Detail Notice**
46. WHEN feedback level is high THEN notice box SHALL be displayed
47. WHEN feedback level is high THEN lightbulb icon SHALL be shown
48. WHEN feedback level is high THEN explanation SHALL be provided
49. WHEN feedback level is medium or low THEN notice SHALL NOT be displayed

**Individual Feedback Level**
50. WHEN user selects dropdown THEN three options SHALL be available
51. WHEN user selects "High Detail" THEN email SHALL update to high detail
52. WHEN user selects "Medium Detail" THEN email SHALL update to medium detail
53. WHEN user selects "Low Detail" THEN email SHALL update to low detail
54. WHEN individual level set THEN it SHALL override global setting

**Edit Email**
55. WHEN user clicks "Edit Email" THEN editor SHALL open
56. WHEN editor opens THEN current content SHALL be editable
57. WHEN user saves edits THEN email preview SHALL update
58. WHEN user cancels edits THEN original content SHALL be restored

**Ready Status**
59. WHEN email content valid THEN "Ready to Send" SHALL be displayed
60. WHEN email content valid THEN green check icon SHALL be shown

**Page Footer**
61. WHEN screen loads THEN "Ready to Send" box SHALL be displayed
62. WHEN screen loads THEN rejection count SHALL be shown
63. WHEN screen loads THEN "All emails reviewed" SHALL be shown
64. WHEN screen loads THEN time estimate SHALL be displayed
65. WHEN screen loads THEN Cancel button SHALL be visible
66. WHEN screen loads THEN Save Drafts button SHALL be visible
67. WHEN screen loads THEN Send All button SHALL be visible
68. WHEN validation passes THEN Send All button SHALL be enabled
69. WHEN validation fails THEN Send All button SHALL be disabled
70. WHEN user clicks Send All THEN confirmation dialog SHALL appear

### 9.2 Post-Send Functional Criteria (20 total)

**Confirmation Screen**
71. WHEN emails sent successfully THEN confirmation card SHALL be displayed
72. WHEN confirmation shown THEN success icon SHALL be displayed
73. WHEN confirmation shown THEN timestamp SHALL be displayed
74. WHEN confirmation shown THEN greeting SHALL address buyer by name
75. WHEN confirmation shown THEN success message SHALL be displayed

**Emails Sent Box**
76. WHEN confirmation shown THEN "Emails Sent" box SHALL be displayed
77. WHEN confirmation shown THEN each supplier SHALL be listed
78. WHEN each supplier listed THEN delivery status SHALL be shown
79. WHEN each supplier listed THEN timestamp SHALL be shown
80. WHEN confirmation shown THEN audit trail message SHALL be displayed

**Next Steps Box**
81. WHEN confirmation shown THEN "Next Steps" box SHALL be displayed
82. WHEN confirmation shown THEN nomination letter step SHALL be listed
83. WHEN confirmation shown THEN contract negotiation step SHALL be listed
84. WHEN confirmation shown THEN timeline update step SHALL be listed

**Action Buttons**
85. WHEN confirmation shown THEN "View Project Record" button SHALL be visible
86. WHEN confirmation shown THEN "Download Audit Trail" button SHALL be visible
87. WHEN user clicks "View Project Record" THEN project page SHALL open
88. WHEN user clicks "Download Audit Trail" THEN PDF SHALL download

**Success Stats**
89. WHEN confirmation shown THEN success stats card SHALL be displayed
90. WHEN stats shown THEN completion message SHALL be displayed
91. WHEN stats shown THEN rejection count SHALL be displayed
92. WHEN stats shown THEN time saved SHALL be displayed
93. WHEN stats shown THEN audit trail percentage SHALL be displayed

### 9.3 Flexibility Criteria (10 total)
1. WHEN admin changes default feedback level THEN new default SHALL apply
2. WHEN admin changes email template THEN new template SHALL be used
3. WHEN buyer sets global level THEN all non-customized suppliers SHALL update
4. WHEN buyer sets individual level THEN it SHALL override global
5. WHEN buyer edits email THEN custom content SHALL be used
6. WHEN cost data changes THEN email content SHALL update
7. WHEN supplier count changes THEN cards SHALL update
8. WHEN language preference set THEN emails SHALL be translated
9. WHEN feedback level changes THEN content SHALL regenerate
10. WHEN multiple rejections THEN all SHALL be processed

### 9.4 UX Criteria (20 total)
1. Screen SHALL load within 2 seconds
2. Decision summary SHALL be clearly formatted
3. Feedback level options SHALL be clearly labeled
4. Email previews SHALL be easy to read
5. Cost variance SHALL be prominently displayed
6. Action buttons SHALL be clearly labeled
7. Confirmation dialog SHALL be clear
8. Success message SHALL be clear and celebratory
9. Email content SHALL look professional
10. Tone SHALL be polite and constructive
11. Recommendations SHALL be actionable
12. Signature SHALL be complete
13. Next steps SHALL be clear
14. Audit trail message SHALL be reassuring
15. Success stats SHALL be motivating
16. Color coding SHALL be consistent
17. Layout SHALL be clean and organized
18. Collapsible cards SHALL be intuitive
19. Feedback level notice SHALL be helpful
20. Demo navigation hint SHALL be clearly separated

### 9.5 Performance Criteria (10 total)
1. Screen SHALL load within 2 seconds
2. Email generation SHALL complete within 1 second per supplier
3. Feedback level change SHALL update within 500ms
4. Email edit SHALL save within 1 second
5. Send all SHALL process within 5 seconds
6. Save drafts SHALL process within 2 seconds
7. Cancel SHALL process within 500ms
8. Validation SHALL complete within 500ms
9. Confirmation dialog SHALL appear within 300ms
10. Navigation SHALL complete within 1 second

### 9.6 Accessibility Criteria (15 total)
1. All interactive elements SHALL be keyboard accessible
2. All images SHALL have alt text
3. Color SHALL NOT be the only indicator of status
4. Text SHALL have sufficient contrast (WCAG AA)
5. Focus indicators SHALL be visible
6. Screen readers SHALL announce content
7. Form fields SHALL have labels
8. Buttons SHALL have descriptive labels
9. Confirmation dialogs SHALL be accessible
10. Email previews SHALL be readable by screen readers
11. Collapsible cards SHALL be keyboard navigable
12. Radio buttons SHALL be keyboard accessible
13. Dropdowns SHALL be keyboard accessible
14. Success messages SHALL be announced
15. Error messages SHALL be announced

### 9.7 Security Criteria (15 total)
1. Emails SHALL be sent over encrypted connection (TLS)
2. Supplier emails SHALL be validated
3. Buyer identity SHALL be verified
4. Send action SHALL be logged
5. Save action SHALL be logged
6. Edit actions SHALL be logged
7. Email delivery SHALL be tracked
8. Audit trail SHALL be maintained
9. Data SHALL be encrypted in transit
10. Data SHALL be encrypted at rest
11. Access SHALL be role-based
12. Email content SHALL be sanitized (XSS prevention)
13. Confirmation SHALL be logged
14. Project record SHALL be immutable
15. Audit trail SHALL be tamper-proof

## 10. Dependencies

### 10.1 Prerequisites
- Sourcing decision must be complete (selected supplier confirmed)
- Comparison board must be complete (all suppliers analyzed)
- Cost data must be available for all suppliers
- Supplier emails must be available
- User profile must exist (for signature)
- Email service must be operational

### 10.2 Backend/API Requirements
- **GET /api/rejection/{rfq_id}/prepare:** Prepare rejection emails
- **PUT /api/rejection/{rejection_batch_id}/edit:** Update email content
- **POST /api/rejection/{rejection_batch_id}/send:** Send all rejection emails
- **POST /api/rejection/{rejection_batch_id}/save-drafts:** Save drafts
- **GET /api/rejection/{rejection_batch_id}/status:** Check send status
- **GET /api/project/{rfq_id}/audit-trail:** Download audit trail

### 10.3 Integration Points
- **Screen 23:** Comparison Board (entry point after decision)
- **Project page:** For viewing project record
- **Email service:** For sending rejection emails
- **LLM service:** For email generation
- **Audit service:** For storing communications
- **Notification service:** For delivery confirmation

## 11. Success Metrics
- **Rejection rate:** 60-75% of suppliers receive rejection (3-4 out of 5)
- **Feedback level usage:** 60% medium, 30% high, 10% low
- **Time saved:** 15 minutes per RFQ (vs manual rejection emails)
- **Supplier satisfaction:** 4.0/5 rating for rejection communication
- **Future participation:** 80% of rejected suppliers participate in future RFQs
- **Audit trail completeness:** 100% of rejections stored
- **User satisfaction:** 4.5/5 rating for rejection feature

## 12. Open Questions
1. Should we allow scheduling rejection emails for later?
2. Should we provide rejection analytics (supplier improvement over time)?
3. Should we allow attaching documents to rejection emails?
4. Should we provide templates for different rejection reasons?
5. Should we track supplier responses to rejection emails?
6. Should we provide a "request feedback" option for suppliers?
7. Should we integrate with supplier relationship management (SRM) system?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial requirements document created |

---

**Total Lines:** ~1,350 lines  
**Total Acceptance Criteria:** 160 (90 functional + 10 flexibility + 20 UX + 10 performance + 15 accessibility + 15 security)

**Status:** Complete ✅

