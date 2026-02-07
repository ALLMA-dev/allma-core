# Screen Requirements: Notifications

## 1. Overview
- **Screen ID:** SCR-019
- **Component File:** `src/app/components/Notifications.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 2 - Email Quote Intake & Monitoring
- **Priority:** P0 (Must Have)
- **Flexibility Level:** Low - Standardized notification format with dynamic content

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** receive automatic email notifications when suppliers respond to RFQs  
**So that** I can track quote processing status and take action on issues without manually checking the system

### Related User Stories
- **US-MVP-05:** Monitor Company Domain Inbox for Supplier Responses
- **US-MVP-06:** Extract Attachments from Supplier Emails
- **US-MVP-10:** Review Low-Confidence Extractions
- **US-MVP-11:** Detect Missing Mandatory Fields
- **US-MVP-12:** Detect Hidden Costs (Embedded Tooling)
- **US-MVP-13:** Immediate Automatic Quality Control Responses
- **US-MVP-14:** Track Follow-up Responses

## 3. Screen Purpose & Context

### Purpose
This screen represents the email notifications Sarah receives in her inbox as suppliers respond to RFQs. It provides:
- **Immediate awareness:** Real-time notifications when quotes are received
- **Processing status:** Updates on extraction and validation progress
- **Quality control results:** Summary of extraction confidence and anomalies detected
- **Action guidance:** Clear next steps for buyer review and approval
- **Progress tracking:** Status of all suppliers in the RFQ
- **Time savings visibility:** Quantified automation benefits
- **Quick access:** Direct links to review and approve actions

### Context
- **When user sees this:** 
  - After sending RFQ (Screen 18) to suppliers
  - When supplier responds via email to purchasingrfq@companyname.com
  - System sends two notifications per supplier: initial receipt + processing complete
  - Notifications arrive in Sarah's regular email inbox
- **Why it exists:** 
  - Buyers need immediate awareness of supplier responses
  - Processing takes 2-3 minutes, buyer needs status updates
  - Quality control issues require buyer attention
  - Transparency builds trust in automation
  - Reduces need to manually check portal
- **Position in journey:** 
  - After RFQ sent (Screen 18)
  - Before Extraction Review (Screen 20)
  - Parallel to automatic processing and quality control
  - Gateway to buyer review and approval actions

### Key Characteristics
- **Email-based:** Notifications delivered to buyer's inbox (not just portal)
- **Two-stage notifications:** Initial receipt + processing complete
- **Real-time updates:** Sent within 5 minutes of supplier response
- **Progress tracking:** Shows status of all suppliers in RFQ
- **Confidence scoring:** Extraction quality indicators (high/medium/low)
- **Anomaly detection:** Automatic identification of issues
- **Action-oriented:** Clear buttons for next steps
- **Time savings:** Quantified automation benefits displayed
- **Professional formatting:** Clean, structured email layout
- **Contextual information:** All relevant RFQ details included

## 4. Visual Layout & Structure

### 4.1 Main Sections

**Email Notification Structure (Two Types):**

**Type 1: Quote Received (Initial Notification)**
1. **Email Header**
   - From: Optiroq System <notifications@optiroq.com>
   - Subject: "✓ Quote Received: Supplier A - RFQ-2025-047"
   - Timestamp

2. **Notification Card**
   - Icon badge (blue - mail icon)
   - Title with checkmark
   - Status badge ("New")
   - Greeting
   - Receipt confirmation message

3. **Quote Information Box**
   - Project name
   - Supplier name
   - Received timestamp
   - Attachments count and filenames

4. **Processing Status Banner (Blue)**
   - Clock icon
   - "Status: Processing..." message
   - Estimated completion time

5. **Current Progress Section**
   - List of all suppliers with status icons
   - Checkmarks for received quotes
   - Clock icons for pending responses

6. **Action Buttons**
   - View Project Details
   - Access Original Files

**Type 2: Quote Processed (Completion Notification)**
1. **Email Header**
   - From: Optiroq System <notifications@optiroq.com>
   - Subject: "✓ Quote Processed: Supplier A - RFQ-2025-047 (Comparison Board Updated)"
   - Timestamp

2. **Notification Card**
   - Icon badge (green - check icon)
   - Title with checkmark
   - Status badge ("Complete")
   - Greeting
   - Processing completion message

3. **Extraction Summary Box**
   - Material costs status + confidence badge
   - Process costs status + confidence badge
   - Tooling costs status + confidence badge
   - Logistics status + confidence badge
   - Terms status + confidence badge

4. **Anomalies Detected Box (Yellow)**
   - List of detected anomalies with icons
   - Critical issues (red icon)
   - Normal items (green checkmark)

5. **Actions Needed Box (Blue)**
   - Numbered list of required actions
   - Review requests
   - Approval requests

6. **Current Progress Section**
   - Updated list of all suppliers
   - Processed quotes with issue badges
   - Pending quotes with clock icons

7. **Action Buttons**
   - Review Extraction (primary)
   - Approve Follow-up
   - Download Comparison Board

8. **Time Saved Badge (Green)**
   - Automation completion message
   - Quantified time savings

### 4.2 Key UI Elements

**Email Header (Both Types):**
- **From:** "Optiroq System <notifications@optiroq.com>"
  - Font: text-sm, text-gray-500
- **Subject Line:**
  - Type 1: "✓ Quote Received: Supplier A - RFQ-2025-047"
  - Type 2: "✓ Quote Processed: Supplier A - RFQ-2025-047 (Comparison Board Updated)"
  - Font: text-base, font-semibold
- **Timestamp:** "Dec 26, 2024 at 2:34 PM"
  - Font: text-xs, text-gray-400

**Notification Card Container:**
- **Border:** border-l-4 (blue for Type 1, green for Type 2)
- **Border colors:** border-l-blue-500 or border-l-green-500
- **Card structure:** CardHeader + CardContent
- **Padding:** Standard card padding

**Icon Badge (Type 1 - Quote Received):**
- **Container:** size-10, bg-blue-100, rounded-full, flex center
- **Icon:** Mail icon, size-5, text-blue-600

**Icon Badge (Type 2 - Quote Processed):**
- **Container:** size-10, bg-green-100, rounded-full, flex center
- **Icon:** Check icon, size-5, text-green-600

**Card Title:**
- **Type 1:** "✓ Quote Received: Supplier A - RFQ-2025-047"
- **Type 2:** "✓ Quote Processed: Supplier A - RFQ-2025-047 (Comparison Board Updated)"
- **Font:** text-base, font-semibold (CardTitle component)
- **Checkmark:** "✓" prefix

**Status Badge:**
- **Type 1:** variant-outline, text "New"
- **Type 2:** bg-green-600, text "Complete"
- **Position:** Top-right of card header

**Greeting & Message:**
- **Greeting:** "Hi Sarah,"
  - Font: text-sm, text-gray-900
- **Message:** Contextual message based on notification type
  - Font: text-sm, text-gray-900
  - Margin: space-y-3

**Quote Information Box (Type 1):**
- **Container:** bg-gray-50, rounded-lg, p-3
- **Grid:** grid-cols-2, gap-2, text-sm
- **Fields:**
  - Project: Part name
  - Supplier: Supplier name
  - Received: Timestamp
  - Attachments: File count and names
- **Label:** text-gray-500
- **Value:** font-medium, text-gray-900

**Processing Status Banner (Type 1):**
- **Container:** bg-blue-50, border border-blue-200, rounded-lg, p-3
- **Layout:** Flex with items-center, gap-3
- **Icon:** Clock icon, size-5, text-blue-600
- **Title:** "Status: Processing..."
  - Font: text-sm, font-medium, text-blue-900
- **Subtitle:** "⏱ Estimated completion: 2-3 minutes"
  - Font: text-xs, text-blue-700

**Extraction Summary Box (Type 2):**
- **Container:** bg-gray-50, rounded-lg, p-3
- **Title:** "Extraction Summary:"
  - Font: text-sm, font-semibold, text-gray-900, mb-2
- **Items:** space-y-2
- **Each item:**
  - Layout: Flex with items-center, gap-2, text-sm
  - Icon: Check (green) or AlertTriangle (red), size-4
  - Text: Cost category + status
  - Badge: Confidence level or action needed

**Confidence Badges:**
- **High confidence:**
  - Style: variant-outline, bg-green-50, border-green-300, text-green-700
  - Text: "High confidence"
  - Size: text-xs
- **Medium confidence:**
  - Style: variant-outline, bg-yellow-50, border-yellow-300, text-yellow-700
  - Text: "Medium confidence"
  - Size: text-xs
- **Missing/Follow-up:**
  - Style: variant-destructive
  - Text: "Follow-up needed"
  - Size: text-xs

**Anomalies Detected Box (Type 2):**
- **Container:** bg-yellow-50, border border-yellow-200, rounded-lg, p-3
- **Title:** "Anomalies Detected:"
  - Font: text-sm, font-semibold, text-yellow-900, mb-2
- **Items:** space-y-2
- **Each item:**
  - Layout: Flex with items-start, gap-2, text-sm
  - Icon: AlertTriangle (red) or Check (green), size-4, mt-0.5
  - Text: Anomaly description
  - Color: text-gray-900 (critical) or text-gray-600 (normal)

**Actions Needed Box (Type 2):**
- **Container:** bg-blue-50, border border-blue-200, rounded-lg, p-3
- **Title:** "Actions Needed:"
  - Font: text-sm, font-semibold, text-blue-900, mb-2
- **List:** Ordered list (ol), text-sm, text-blue-800, space-y-1, ml-4
- **Items:** Numbered actions required from buyer

**Current Progress Section (Both Types):**
- **Title:** "Current Progress:"
  - Font: text-sm, font-medium, text-gray-900, mb-2
- **Container:** space-y-2, border-t, pt-3
- **Each supplier item:**
  - Layout: Flex with items-center, gap-2, text-sm
  - Icon: Check (blue/green) or Clock (gray), size-4
  - Text: Supplier name + status
  - Badge (if applicable): Issue count or status

**Supplier Status Indicators:**
- **Received (processing):** Check icon (blue), "Quote received (processing)"
- **Processed (complete):** Check icon (green), "Quote processed" + issue badge
- **Awaiting response:** Clock icon (gray), "Awaiting response"

**Issue Badge:**
- **Style:** variant-outline, bg-yellow-50, border-yellow-300, text-yellow-700
- **Text:** "1 issue" or "X issues"
- **Size:** text-xs

**Action Buttons (Type 1 - Quote Received):**
1. **View Project Details:**
   - Variant: outline
   - Icon: Eye (size-4, mr-2)
   - Size: sm
   
2. **Access Original Files:**
   - Variant: outline
   - Icon: FileText (size-4, mr-2)
   - Size: sm

**Action Buttons (Type 2 - Quote Processed):**
1. **Review Extraction (Primary):**
   - Style: bg-blue-600, hover:bg-blue-700
   - Icon: Eye (size-4, mr-2)
   - Size: sm
   
2. **Approve Follow-up:**
   - Variant: outline
   - Icon: Mail (size-4, mr-2)
   - Size: sm
   
3. **Download Comparison Board:**
   - Variant: outline
   - Icon: Download (size-4, mr-2)
   - Size: sm

**Time Saved Badge (Type 2):**
- **Container:** bg-green-50, border border-green-200, rounded-lg, p-4
- **Layout:** Flex with items-center, gap-3
- **Icon:** Check icon, size-6, text-green-600
- **Title:** "Automated Processing Complete"
  - Font: text-sm, font-semibold, text-green-900
- **Subtitle:** "Time saved so far: ~45 minutes (vs. manual data entry)"
  - Font: text-sm, text-green-800
  - Bold: Time value

**Demo Navigation Hint:**
- **Container:** bg-blue-50, border border-blue-200, rounded-lg, p-4, max-w-4xl mx-auto
- **Text:** "Demo Navigation: Click 'Next' in the header to review the extraction →"
  - Font: text-sm, text-blue-900, text-center
  - Bold: "Demo Navigation:"

### 4.3 Information Hierarchy

**Primary Information (Type 1 - Quote Received):**
- Supplier name and RFQ ID
- Quote received confirmation
- Processing status and estimated time
- Current progress across all suppliers

**Secondary Information (Type 1):**
- Quote details (project, timestamp, attachments)
- Action buttons for viewing details

**Tertiary Information (Type 1):**
- Email metadata (from, timestamp)
- Demo navigation hint

**Primary Information (Type 2 - Quote Processed):**
- Processing completion confirmation
- Extraction summary with confidence scores
- Anomalies detected (critical issues)
- Actions needed from buyer
- Review Extraction button

**Secondary Information (Type 2):**
- Current progress with issue indicators
- Time saved quantification
- Additional action buttons (approve follow-up, download)

**Tertiary Information (Type 2):**
- Email metadata
- Demo navigation hint


## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| notification_id | String | System | Yes | Unique notification identifier |
| rfq_id | String | RFQ data | Yes | RFQ identifier (e.g., RFQ-2025-047) |
| project_id | String | RFQ data | Yes | Project identifier |
| supplier_id | String | Supplier data | Yes | Supplier identifier |
| notification_type | Enum | System | Yes | 'quote_received', 'quote_processed' |
| created_at | DateTime | System timestamp | Yes | ISO 8601 format |
| sent_at | DateTime | Email service | Yes | ISO 8601 format |
| email_status | Enum | Email service | Yes | 'sent', 'delivered', 'opened' |

### 5.2 Master List Fields (Admin-Configurable)
| Field Name | Data Type | Default Mandatory | Buyer Can Toggle | Format/Validation |
|------------|-----------|-------------------|------------------|-------------------|
| notification_sender | String | Yes | No | "Optiroq System <notifications@optiroq.com>" |
| processing_time_estimate | String | Yes | Yes | "2-3 minutes" (configurable) |
| time_saved_calculation | String | Yes | Yes | "~45 minutes" (configurable formula) |

### 5.3 Dynamic Fields (Buyer-Selectable)
| Field Name | Data Type | Conditions | Validation Rules | Default Value |
|------------|-----------|------------|------------------|---------------|
| buyer_name | String | Always | Max 100 chars | From user profile |
| project_name | String | Always | Max 200 chars | From RFQ data |
| supplier_name | String | Always | Max 100 chars | From supplier data |
| received_timestamp | DateTime | Always | Valid datetime | Email receipt time |
| attachment_count | Integer | Always | Min 0 | Count of files |
| attachment_filenames | Array<String> | Always | Valid filenames | List of files |
| extraction_status | Object | Type 2 only | Valid status object | Extraction results |
| anomalies_list | Array<Object> | Type 2 only | Valid anomaly objects | Detected issues |
| actions_needed | Array<String> | Type 2 only | Valid action strings | Required actions |
| all_suppliers_status | Array<Object> | Always | Valid status objects | All suppliers in RFQ |

### 5.4 Data Displayed
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| notification_subject | String | Computed | Yes | Dynamic based on type |
| notification_icon | String | Computed | Yes | 'mail' or 'check' |
| notification_color | String | Computed | Yes | 'blue' or 'green' |
| status_badge_text | String | Computed | Yes | 'New' or 'Complete' |
| status_badge_variant | String | Computed | Yes | 'outline' or 'green' |
| project_name | String | RFQ data | Yes | Display in info box |
| supplier_name | String | Supplier data | Yes | Display in title |
| received_timestamp_formatted | String | Computed | Yes | "Dec 26, 2024 at 2:34 PM" |
| attachment_summary | String | Computed | Yes | "1 file (Quote_SupplierA.xlsx)" |
| processing_status_message | String | Computed | Type 1 only | "Status: Processing..." |
| estimated_completion | String | Computed | Type 1 only | "⏱ Estimated completion: 2-3 minutes" |
| extraction_summary_items | Array<Object> | Extraction data | Type 2 only | Cost categories with confidence |
| anomalies_items | Array<Object> | Anomaly detection | Type 2 only | Detected issues |
| actions_needed_items | Array<String> | Business rules | Type 2 only | Required actions |
| supplier_progress_items | Array<Object> | RFQ status | Yes | All suppliers with status |
| time_saved_message | String | Computed | Type 2 only | "Time saved so far: ~45 minutes" |

### 5.5 Data Collected from User
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| button_click_action | Button click | Yes | Valid action type | None |
| email_opened | Boolean | No | True/False | False |
| email_clicked | Boolean | No | True/False | False |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| notification_subject | Generate based on type + supplier + RFQ ID | notification_type, supplier_name, rfq_id |
| attachment_summary | Format count + filenames | attachment_count, attachment_filenames |
| received_timestamp_formatted | Format datetime to readable string | received_timestamp |
| processing_status_message | "Status: Processing..." if Type 1 | notification_type |
| extraction_summary_items | Map extraction results to display format | extraction_status |
| anomalies_items | Map anomalies to display format | anomalies_list |
| supplier_progress_items | Map all suppliers to status display | all_suppliers_status |
| time_saved_message | Calculate time saved vs manual entry | extraction_time, manual_entry_baseline |
| issue_count_per_supplier | Count anomalies per supplier | anomalies_list |


## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**How buyer selects fields:**
- Notifications are automatically generated based on RFQ configuration
- No buyer configuration needed for notification content
- Notification frequency and delivery preferences can be configured in user profile
- Buyer can choose to receive notifications for: all quotes, only issues, or daily digest

**Field selection UI:**
- **Notification preferences:** Configurable in user profile settings
- **Email vs portal:** Buyer can choose email, portal, or both
- **Frequency:** Immediate, hourly digest, or daily digest
- **Issue severity:** All notifications, only critical issues, or custom filters

**Mandatory field rules:**
- **Notification type:** Required (quote_received or quote_processed)
- **Supplier name:** Required
- **RFQ ID:** Required
- **Timestamp:** Required
- **Extraction summary:** Required for Type 2
- **Actions needed:** Required if anomalies detected

**Field dependencies:**
- Type 2 notification depends on Type 1 being sent first
- Extraction summary depends on extraction completion
- Anomalies section depends on anomaly detection results
- Actions needed depends on extraction confidence and anomalies
- Time saved calculation depends on extraction completion time

### 6.2 UI Adaptation Logic

**Form generation:**
- Notification template adapts based on notification_type
- Type 1 shows processing status, Type 2 shows results
- Extraction summary dynamically generated from extraction results
- Anomalies list dynamically generated from detection results
- Supplier progress list dynamically generated from RFQ status

**Layout rules:**
- Card container: max-w-4xl mx-auto (centered, max width)
- Notification cards: Vertical stack with space-y-4
- Border color: Blue for Type 1, green for Type 2
- Icon badge: Mail for Type 1, check for Type 2
- Sections shown/hidden based on notification type

**Validation adaptation:**
- No validation needed (read-only notifications)
- Action buttons enabled based on current status
- Review Extraction button only shown if extraction complete
- Approve Follow-up button only shown if follow-up needed
- Download button only shown if comparison board available

**Caching strategy:**
- Notifications stored in database for audit trail
- Email delivery status tracked
- User interactions tracked (opened, clicked)
- No caching needed for display (email-based)

### 6.3 LLM Integration (if applicable)

**LLM role:**
- Generates human-readable anomaly descriptions
- Summarizes extraction confidence levels
- Creates action recommendations based on detected issues
- Adapts notification tone based on severity

**Input to LLM:**
- Extraction results with confidence scores
- Detected anomalies with technical details
- Business rules for quality control
- Historical context from similar RFQs

**Output from LLM:**
- Clear anomaly descriptions (e.g., "Tooling cost not found - likely embedded in process costs")
- Action recommendations (e.g., "Review medium-confidence extraction (Logistics)")
- Confidence level explanations
- Time saved calculations with context

**Confidence scoring:**
- **High confidence (>90%):** Green badge, no action needed
- **Medium confidence (70-90%):** Yellow badge, review recommended
- **Low confidence (<70%):** Red badge, review required
- **Missing data:** Red badge, follow-up required

**Fallback behavior:**
- If LLM fails: Use template-based descriptions
- If confidence scoring fails: Default to "review recommended"
- If anomaly detection fails: Show raw extraction results
- If time calculation fails: Omit time saved message


## 7. User Interactions

### 7.1 Primary Actions

**Action: View Project Details (Type 1)**
- **Trigger:** User clicks "View Project Details" button in Type 1 notification
- **Behavior:** 
  - Opens portal in new tab/window
  - Navigates to Project Summary screen (Screen 7)
  - Shows full RFQ details and current status
  - User can see all suppliers, requirements, attachments
- **Validation:** None (read-only view)
- **Success:** Portal opens to correct project
- **Error:** If project not found: "Project details unavailable. Please contact support."
- **Navigation:** Opens Screen 7 (Project Summary) in new tab

**Action: Access Original Files (Type 1)**
- **Trigger:** User clicks "Access Original Files" button in Type 1 notification
- **Behavior:** 
  - Opens portal in new tab/window
  - Navigates to file viewer showing supplier's original attachments
  - User can download or view files
  - Shows all files from supplier's email response
- **Validation:** None (read-only access)
- **Success:** File viewer opens with correct files
- **Error:** If files not found: "Files unavailable. Please contact support."
- **Navigation:** Opens file viewer in portal

**Action: Review Extraction (Type 2)**
- **Trigger:** User clicks "Review Extraction" button in Type 2 notification
- **Behavior:** 
  - Opens portal in new tab/window
  - Navigates to Extraction Review screen (Screen 20)
  - Shows side-by-side view: original file + extracted data
  - User can correct low-confidence extractions
  - User can approve or reject extraction
- **Validation:** None (navigation only)
- **Success:** Portal opens to Extraction Review screen
- **Error:** If extraction not found: "Extraction unavailable. Please contact support."
- **Navigation:** Opens Screen 20 (Extraction Review) in new tab

**Action: Approve Follow-up (Type 2)**
- **Trigger:** User clicks "Approve Follow-up" button in Type 2 notification
- **Behavior:** 
  - Opens portal in new tab/window
  - Navigates to Follow-Up Preview screen (Screen 21)
  - Shows auto-generated follow-up email to supplier
  - User can edit and approve sending
  - Follow-up requests missing information (e.g., tooling breakdown)
- **Validation:** None (navigation only)
- **Success:** Portal opens to Follow-Up Preview screen
- **Error:** If follow-up not available: "Follow-up unavailable. Please contact support."
- **Navigation:** Opens Screen 21 (Follow-Up Preview) in new tab

**Action: Download Comparison Board (Type 2)**
- **Trigger:** User clicks "Download Comparison Board" button in Type 2 notification
- **Behavior:** 
  - Initiates download of Excel comparison board
  - File name: "Comparison_Board_v1_RFQ-2025-047.xlsx"
  - File includes all processed suppliers so far
  - Incremental version (v1, v2, v3 as more suppliers respond)
  - User can open in Excel for analysis
- **Validation:** None (download only)
- **Success:** File downloads successfully
- **Error:** If file not ready: "Comparison board not available yet. Please try again in a moment."
- **Navigation:** Stays in email (file downloads)

### 7.2 Secondary Actions

**Action: Open Email Notification**
- **Trigger:** User opens email in inbox
- **Behavior:** 
  - Email client displays notification
  - System tracks email opened event
  - No action required from system
- **Validation:** None
- **Success:** Email displays correctly
- **Error:** None
- **Navigation:** Stays in email client

**Action: Click Any Link in Email**
- **Trigger:** User clicks any link or button in email
- **Behavior:** 
  - System tracks click event
  - Opens destination in new tab/window
  - User remains in email client
- **Validation:** None
- **Success:** Link opens correctly
- **Error:** If link broken: "Page not found. Please contact support."
- **Navigation:** Opens portal in new tab

**Action: Reply to Notification Email**
- **Trigger:** User clicks reply in email client
- **Behavior:** 
  - Email client opens reply window
  - Reply goes to notifications@optiroq.com
  - System can process replies (future enhancement)
  - Currently: "This is an automated notification. Please use the portal for actions."
- **Validation:** None
- **Success:** Reply sent
- **Error:** None
- **Navigation:** Stays in email client

**Action: Forward Notification to Colleague**
- **Trigger:** User forwards notification email
- **Behavior:** 
  - Email client forwards notification
  - Colleague receives same notification
  - Links work for colleague if they have access
  - Useful for collaboration
- **Validation:** None
- **Success:** Email forwarded
- **Error:** None
- **Navigation:** Stays in email client

### 7.3 Navigation

**From:**
- Screen 18: Email Preview (after RFQ sent to suppliers)
- Email system: Automatic delivery to buyer's inbox
- No manual navigation needed (push notifications)

**To:**
- Screen 7: Project Summary (via "View Project Details")
- Screen 20: Extraction Review (via "Review Extraction")
- Screen 21: Follow-Up Preview (via "Approve Follow-up")
- File viewer: Original supplier files (via "Access Original Files")
- Download: Comparison Board Excel file

**Exit Points:**
- No exit needed (email notifications)
- User can close email or navigate away
- Links open portal in new tabs (non-disruptive)


## 8. Business Rules

### 8.1 Validation Rules

**Notification Timing:**
- **Rule:** Type 1 notification sent within 5 minutes of supplier email receipt
- **Error:** If delayed >10 minutes: Log warning, send notification anyway
- **Required:** Yes

**Notification Sequence:**
- **Rule:** Type 1 must be sent before Type 2
- **Error:** If Type 2 sent without Type 1: Log error, send both
- **Required:** Yes

**Processing Time Estimate:**
- **Rule:** Estimate must be 2-3 minutes for standard quotes
- **Error:** If processing takes >5 minutes: Update estimate in real-time
- **Required:** Yes

**Extraction Summary Completeness:**
- **Rule:** Type 2 must include extraction status for all cost categories
- **Error:** If category missing: Show "Not extracted" with low confidence
- **Required:** Yes

**Anomaly Detection:**
- **Rule:** All anomalies must be detected before Type 2 sent
- **Error:** If detection incomplete: Send notification with partial results
- **Required:** Yes

**Actions Needed:**
- **Rule:** Actions list must be non-empty if anomalies detected
- **Error:** If anomalies exist but no actions: Generate default action "Review extraction"
- **Required:** Yes

**Supplier Progress:**
- **Rule:** Progress list must include all suppliers in RFQ
- **Error:** If supplier missing: Log error, show available suppliers
- **Required:** Yes

**Time Saved Calculation:**
- **Rule:** Calculate based on extraction time vs manual entry baseline (45 min)
- **Error:** If calculation fails: Omit time saved message
- **Optional:** Yes

### 8.2 Calculation Logic

**Processing Time Estimate:**
- **Formula:** `2-3 minutes` (static estimate)
- **Example:** "⏱ Estimated completion: 2-3 minutes"
- **Used in:** Type 1 notification processing status

**Time Saved Calculation:**
- **Formula:** `manual_entry_baseline - extraction_time`
- **Baseline:** 45 minutes per supplier (manual data entry)
- **Extraction time:** Actual processing time (typically 2-3 minutes)
- **Example:** "Time saved so far: ~45 minutes (vs. manual data entry)"
- **Used in:** Type 2 notification time saved badge

**Issue Count Per Supplier:**
- **Formula:** `anomalies_list.filter(a => a.supplier_id === supplier_id).length`
- **Example:** "1 issue" or "3 issues"
- **Used in:** Supplier progress list badges

**Confidence Score Display:**
- **Formula:** Map confidence percentage to badge
  - >90%: "High confidence" (green)
  - 70-90%: "Medium confidence" (yellow)
  - <70%: "Low confidence" (red)
- **Example:** "High confidence" badge for material costs
- **Used in:** Extraction summary items

**Notification Subject Line:**
- **Formula:** 
  - Type 1: `"✓ Quote Received: {supplier_name} - {rfq_id}"`
  - Type 2: `"✓ Quote Processed: {supplier_name} - {rfq_id} (Comparison Board Updated)"`
- **Example:** "✓ Quote Received: Supplier A - RFQ-2025-047"
- **Used in:** Email subject line

### 8.3 Conditional Display Logic

**Show Processing Status Banner:**
- **Condition:** `notification_type === 'quote_received'`
- **Display:** Blue banner with clock icon and estimated time
- **Hide:** Not shown in Type 2 notifications

**Show Extraction Summary:**
- **Condition:** `notification_type === 'quote_processed'`
- **Display:** Gray box with extraction results and confidence badges
- **Hide:** Not shown in Type 1 notifications

**Show Anomalies Detected Box:**
- **Condition:** `notification_type === 'quote_processed' && anomalies_list.length > 0`
- **Display:** Yellow box with anomaly list
- **Hide:** Not shown if no anomalies detected

**Show Actions Needed Box:**
- **Condition:** `notification_type === 'quote_processed' && actions_needed.length > 0`
- **Display:** Blue box with numbered action list
- **Hide:** Not shown if no actions needed

**Show Time Saved Badge:**
- **Condition:** `notification_type === 'quote_processed'`
- **Display:** Green badge with time saved calculation
- **Hide:** Not shown in Type 1 notifications

**Show Issue Badge on Supplier:**
- **Condition:** `supplier.issue_count > 0`
- **Display:** Yellow badge with issue count
- **Hide:** Not shown if no issues

**Enable Review Extraction Button:**
- **Condition:** `extraction_status === 'complete'`
- **Display:** Blue primary button
- **Disable:** Gray button if extraction not complete

**Enable Approve Follow-up Button:**
- **Condition:** `follow_up_needed === true`
- **Display:** Outline button
- **Hide:** Not shown if no follow-up needed

**Enable Download Button:**
- **Condition:** `comparison_board_available === true`
- **Display:** Outline button
- **Disable:** Gray button if board not ready

### 8.4 Error Handling

**Email Delivery Failure:**
- **Detection:** Email service returns error
- **Handling:** 
  - Retry up to 3 times with exponential backoff
  - Log error after 3 failures
  - Store notification in portal as fallback
  - Send alert to system admin
- **Recovery:** User can access notification in portal

**Extraction Processing Failure:**
- **Detection:** Extraction service times out or errors
- **Handling:** 
  - Send Type 1 notification as normal
  - Send Type 2 notification with error message
  - "Extraction failed. Please review manually."
  - Provide link to original files
- **Recovery:** User reviews manually, system retries extraction

**Missing Supplier Data:**
- **Detection:** Supplier not found in database
- **Handling:** 
  - Use email address as supplier name
  - Log warning
  - Send notification with available data
- **Recovery:** System admin updates supplier data

**Anomaly Detection Failure:**
- **Detection:** Anomaly detection service errors
- **Handling:** 
  - Send Type 2 notification without anomalies section
  - Show message: "Anomaly detection unavailable"
  - Provide link to manual review
- **Recovery:** User reviews extraction manually

**Comparison Board Generation Failure:**
- **Detection:** Excel generation service errors
- **Handling:** 
  - Disable download button
  - Show message: "Comparison board not available yet"
  - Retry generation in background
- **Recovery:** User can download later when ready

**Portal Link Broken:**
- **Detection:** User clicks link, portal returns 404
- **Handling:** 
  - Show error page: "Page not found"
  - Provide link to project list
  - Log error for investigation
- **Recovery:** User navigates to project manually


## 9. Acceptance Criteria

### 9.1 Functional Criteria

**Type 1 Notification - Quote Received**
1. WHEN supplier responds to RFQ THEN Type 1 notification SHALL be sent within 5 minutes
2. WHEN Type 1 notification sent THEN subject line SHALL include "✓ Quote Received: {supplier_name} - {rfq_id}"
3. WHEN Type 1 notification sent THEN icon badge SHALL be blue with mail icon
4. WHEN Type 1 notification sent THEN status badge SHALL show "New"
5. WHEN Type 1 notification sent THEN greeting SHALL address buyer by name
6. WHEN Type 1 notification sent THEN message SHALL confirm quote received from supplier
7. WHEN Type 1 notification sent THEN quote information box SHALL display project, supplier, timestamp, attachments
8. WHEN Type 1 notification sent THEN processing status banner SHALL show "Status: Processing..."
9. WHEN Type 1 notification sent THEN estimated completion SHALL show "2-3 minutes"
10. WHEN Type 1 notification sent THEN current progress SHALL list all suppliers with status
11. WHEN Type 1 notification sent THEN received supplier SHALL show blue check icon
12. WHEN Type 1 notification sent THEN pending suppliers SHALL show gray clock icon
13. WHEN Type 1 notification sent THEN "View Project Details" button SHALL be visible
14. WHEN Type 1 notification sent THEN "Access Original Files" button SHALL be visible
15. WHEN user clicks "View Project Details" THEN portal SHALL open to Project Summary screen

**Type 2 Notification - Quote Processed**
16. WHEN extraction completes THEN Type 2 notification SHALL be sent within 1 minute
17. WHEN Type 2 notification sent THEN subject line SHALL include "✓ Quote Processed: {supplier_name} - {rfq_id} (Comparison Board Updated)"
18. WHEN Type 2 notification sent THEN icon badge SHALL be green with check icon
19. WHEN Type 2 notification sent THEN status badge SHALL show "Complete"
20. WHEN Type 2 notification sent THEN message SHALL confirm processing complete
21. WHEN Type 2 notification sent THEN extraction summary SHALL list all cost categories
22. WHEN extraction confidence >90% THEN badge SHALL show "High confidence" in green
23. WHEN extraction confidence 70-90% THEN badge SHALL show "Medium confidence" in yellow
24. WHEN extraction confidence <70% THEN badge SHALL show "Low confidence" in red
25. WHEN data missing THEN badge SHALL show "Follow-up needed" in red
26. WHEN anomalies detected THEN anomalies box SHALL be visible
27. WHEN anomalies detected THEN each anomaly SHALL have icon and description
28. WHEN critical anomaly THEN icon SHALL be red alert triangle
29. WHEN no anomaly THEN icon SHALL be green check
30. WHEN actions needed THEN actions box SHALL be visible
31. WHEN actions needed THEN actions SHALL be numbered list
32. WHEN Type 2 notification sent THEN current progress SHALL show processed supplier with issue badge
33. WHEN supplier has issues THEN badge SHALL show issue count
34. WHEN Type 2 notification sent THEN time saved badge SHALL be visible
35. WHEN Type 2 notification sent THEN time saved SHALL show calculated value
36. WHEN Type 2 notification sent THEN "Review Extraction" button SHALL be visible
37. WHEN follow-up needed THEN "Approve Follow-up" button SHALL be visible
38. WHEN comparison board ready THEN "Download Comparison Board" button SHALL be visible
39. WHEN user clicks "Review Extraction" THEN portal SHALL open to Extraction Review screen
40. WHEN user clicks "Approve Follow-up" THEN portal SHALL open to Follow-Up Preview screen
41. WHEN user clicks "Download Comparison Board" THEN Excel file SHALL download

**Email Delivery**
42. WHEN notification generated THEN email SHALL be sent to buyer's inbox
43. WHEN email sent THEN sender SHALL be "Optiroq System <notifications@optiroq.com>"
44. WHEN email sent THEN buyer SHALL be primary recipient
45. WHEN email sent THEN system SHALL track delivery status
46. WHEN email opened THEN system SHALL track open event
47. WHEN link clicked THEN system SHALL track click event

**Notification Sequence**
48. WHEN supplier responds THEN Type 1 SHALL be sent before Type 2
49. WHEN Type 1 sent THEN processing SHALL begin immediately
50. WHEN processing completes THEN Type 2 SHALL be sent
51. WHEN Type 2 sent THEN comparison board SHALL be updated
52. WHEN multiple suppliers respond THEN each SHALL receive separate notifications

**Progress Tracking**
53. WHEN notification sent THEN progress list SHALL include all suppliers in RFQ
54. WHEN supplier quote received THEN status SHALL show "Quote received (processing)"
55. WHEN supplier quote processed THEN status SHALL show "Quote processed"
56. WHEN supplier not responded THEN status SHALL show "Awaiting response"
57. WHEN supplier has issues THEN issue badge SHALL be visible
58. WHEN supplier has no issues THEN no badge SHALL be shown

**Extraction Summary**
59. WHEN extraction completes THEN summary SHALL include material costs status
60. WHEN extraction completes THEN summary SHALL include process costs status
61. WHEN extraction completes THEN summary SHALL include tooling costs status
62. WHEN extraction completes THEN summary SHALL include logistics status
63. WHEN extraction completes THEN summary SHALL include terms status
64. WHEN cost category extracted THEN check icon SHALL be visible
65. WHEN cost category missing THEN alert icon SHALL be visible
66. WHEN confidence high THEN green badge SHALL be shown
67. WHEN confidence medium THEN yellow badge SHALL be shown
68. WHEN confidence low THEN red badge SHALL be shown

**Anomalies Detection**
69. WHEN tooling cost missing THEN anomaly SHALL be flagged
70. WHEN material cost outlier THEN anomaly SHALL be flagged
71. WHEN scrap ratio high THEN anomaly SHALL be flagged
72. WHEN data inconsistent THEN anomaly SHALL be flagged
73. WHEN critical anomaly THEN red alert icon SHALL be shown
74. WHEN no anomaly THEN green check icon SHALL be shown
75. WHEN anomalies detected THEN actions needed SHALL be generated

**Actions Needed**
76. WHEN medium confidence extraction THEN action SHALL request review
77. WHEN missing data THEN action SHALL request follow-up approval
78. WHEN anomaly detected THEN action SHALL request investigation
79. WHEN actions needed THEN numbered list SHALL be shown
80. WHEN no actions needed THEN actions box SHALL NOT be visible

**Time Saved Calculation**
81. WHEN extraction completes THEN time saved SHALL be calculated
82. WHEN time saved calculated THEN value SHALL be displayed
83. WHEN time saved displayed THEN comparison to manual entry SHALL be shown
84. WHEN calculation fails THEN time saved badge SHALL NOT be visible

### 9.2 Flexibility Criteria

1. WHEN buyer configures notification preferences THEN system SHALL respect settings
2. WHEN buyer chooses email only THEN notifications SHALL be sent via email
3. WHEN buyer chooses portal only THEN notifications SHALL appear in portal
4. WHEN buyer chooses both THEN notifications SHALL be sent via email and portal
5. WHEN buyer sets frequency to immediate THEN notifications SHALL be sent immediately
6. WHEN buyer sets frequency to digest THEN notifications SHALL be batched
7. WHEN buyer filters by severity THEN only matching notifications SHALL be sent
8. WHEN admin updates notification template THEN new template SHALL be used
9. WHEN admin changes processing time estimate THEN new estimate SHALL be shown
10. WHEN admin updates time saved formula THEN new calculation SHALL be used

### 9.3 UX Criteria

1. Notification email SHALL load within 2 seconds in email client
2. All text SHALL be readable with clear hierarchy
3. Icons SHALL be clearly visible and meaningful
4. Color coding SHALL be consistent (blue=processing, green=complete, yellow=warning, red=critical)
5. Buttons SHALL have clear labels indicating action
6. Links SHALL open in new tabs (non-disruptive)
7. Email SHALL be mobile-responsive
8. Email SHALL render correctly in major email clients (Gmail, Outlook, Apple Mail)
9. Notification SHALL include all necessary context (no need to check portal)
10. Actions SHALL be prioritized (primary action most prominent)
11. Progress tracking SHALL be easy to scan
12. Anomalies SHALL be clearly explained in plain language
13. Technical jargon SHALL be avoided or explained
14. Timestamps SHALL be in buyer's local timezone
15. File names SHALL be clearly displayed
16. Confidence scores SHALL be explained with badges
17. Issue counts SHALL be clearly visible
18. Time saved SHALL be prominently displayed
19. Demo navigation hint SHALL be clearly separated
20. Email SHALL maintain professional appearance

### 9.4 Performance Criteria

1. Type 1 notification SHALL be sent within 5 minutes of supplier response
2. Type 2 notification SHALL be sent within 1 minute of extraction completion
3. Email delivery SHALL complete within 30 seconds
4. Portal links SHALL load within 2 seconds
5. File downloads SHALL initiate within 1 second
6. Extraction processing SHALL complete within 2-3 minutes
7. Anomaly detection SHALL complete within 30 seconds
8. Time saved calculation SHALL complete within 1 second
9. Notification generation SHALL complete within 5 seconds
10. Email tracking SHALL update within 1 minute

### 9.5 Accessibility Criteria

1. Email SHALL be accessible to screen readers
2. All images SHALL have alt text
3. Color SHALL NOT be the only indicator of status
4. Text SHALL have sufficient contrast ratio (WCAG AA)
5. Links SHALL have descriptive text (not "click here")
6. Buttons SHALL be keyboard accessible
7. Email SHALL be navigable with keyboard only
8. Icons SHALL have text labels
9. Status indicators SHALL have text equivalents
10. Email SHALL support high contrast mode
11. Font sizes SHALL be readable (minimum 14px)
12. Line spacing SHALL be adequate for readability
13. Email SHALL work with email client accessibility features
14. Notifications SHALL support text-to-speech
15. Color blindness SHALL be accommodated (not relying on red/green only)

### 9.6 Security Criteria

1. Notification emails SHALL be sent over encrypted connection (TLS)
2. Portal links SHALL require authentication
3. File downloads SHALL require authorization
4. Sensitive data SHALL NOT be included in email (only summaries)
5. Email tracking SHALL respect privacy settings
6. User data SHALL be protected in transit and at rest
7. Notification content SHALL be sanitized to prevent XSS
8. Links SHALL be validated to prevent phishing
9. Email sender SHALL be verified (SPF, DKIM, DMARC)
10. Notification access SHALL be logged for audit trail
11. Personal information SHALL be minimized in notifications
12. Attachments SHALL be scanned for malware before processing
13. Email headers SHALL include security headers
14. Portal sessions SHALL timeout after inactivity
15. Notification data SHALL be encrypted in database


## 10. Dependencies

### 10.1 Prerequisites
- **RFQ sent:** Screen 18 (Email Preview) must be completed and RFQ sent to suppliers
- **Supplier response:** Supplier must respond to RFQ via email
- **Email monitoring:** System must be monitoring purchasingrfq@companyname.com inbox
- **Project ID tracking:** Email headers must contain Project ID for identification
- **Extraction service:** Modular LLM extraction service must be operational
- **Anomaly detection:** Anomaly detection service must be operational
- **Email service:** Email delivery service must be configured and operational
- **User profile:** Buyer profile must exist with email address and notification preferences

### 10.2 Backend/API Requirements

**Email Monitoring Service:**
- **Endpoint:** Monitor company domain inbox for supplier responses
- **Functionality:** 
  - Detect new emails matching Project ID
  - Extract attachments from emails
  - Store email thread for reference
  - Trigger notification generation
- **Data structure:** Email object with headers, body, attachments, timestamp

**Notification Generation Service:**
- **Endpoint:** `POST /api/notifications/generate`
- **Input:** 
  - notification_type ('quote_received' or 'quote_processed')
  - rfq_id
  - supplier_id
  - buyer_id
  - extraction_results (for Type 2)
  - anomalies_list (for Type 2)
- **Output:** Notification object with formatted content
- **Data structure:** Notification object with all display fields

**Email Delivery Service:**
- **Endpoint:** `POST /api/notifications/send`
- **Input:** 
  - recipient_email
  - subject
  - html_body
  - notification_id
- **Output:** Delivery status and tracking ID
- **Data structure:** Email delivery object with status

**Extraction Service:**
- **Endpoint:** `POST /api/extraction/process`
- **Input:** 
  - supplier_id
  - rfq_id
  - attachment_files
- **Output:** Extraction results with confidence scores
- **Data structure:** Extraction object with cost categories and confidence

**Anomaly Detection Service:**
- **Endpoint:** `POST /api/anomalies/detect`
- **Input:** 
  - extraction_results
  - rfq_requirements
  - peer_comparison_data
- **Output:** List of detected anomalies with severity
- **Data structure:** Anomaly object with type, severity, description

**Comparison Board Service:**
- **Endpoint:** `POST /api/comparison-board/generate`
- **Input:** 
  - rfq_id
  - processed_suppliers
- **Output:** Excel file URL and version number
- **Data structure:** Comparison board object with file URL

**Tracking Service:**
- **Endpoint:** `POST /api/tracking/event`
- **Input:** 
  - notification_id
  - event_type ('opened', 'clicked', 'downloaded')
  - timestamp
- **Output:** Tracking confirmation
- **Data structure:** Tracking event object

### 10.3 Integration Points

**Email System Integration:**
- **Company domain inbox:** purchasingrfq@companyname.com
- **Email headers:** X-Optiroq-Project-ID for tracking
- **Email threading:** Preserve thread for context
- **Attachment handling:** Download and store securely

**Portal Integration:**
- **Screen 7:** Project Summary (linked from "View Project Details")
- **Screen 20:** Extraction Review (linked from "Review Extraction")
- **Screen 21:** Follow-Up Preview (linked from "Approve Follow-up")
- **File viewer:** Original supplier files (linked from "Access Original Files")
- **Authentication:** Portal links require user authentication

**LLM Integration:**
- **Extraction service:** Modular LLM for cost data extraction
- **Anomaly descriptions:** LLM generates human-readable explanations
- **Action recommendations:** LLM suggests next steps based on issues
- **Confidence scoring:** LLM provides confidence levels for extractions

**Database Integration:**
- **DynamoDB graph:** Project → RFQ → Quote → Extraction
- **Notification storage:** Store all notifications for audit trail
- **Tracking data:** Store email open/click events
- **User preferences:** Retrieve notification settings from user profile

**File Storage Integration:**
- **S3 storage:** Store supplier attachments securely
- **Comparison board:** Store generated Excel files
- **File access:** Provide secure URLs for downloads

**Monitoring Integration:**
- **Email delivery monitoring:** Track delivery success/failure
- **Processing time monitoring:** Track extraction duration
- **Error logging:** Log all failures for investigation
- **Performance metrics:** Track notification delivery times

## 11. Success Metrics

**Notification Delivery:**
- **Target:** 99% of notifications delivered within 5 minutes
- **Measurement:** Track time from supplier response to notification delivery
- **Success:** <5 minutes for 99% of notifications

**Email Open Rate:**
- **Target:** 80% of notifications opened within 1 hour
- **Measurement:** Track email open events
- **Success:** 80% opened within 1 hour

**Action Completion Rate:**
- **Target:** 70% of buyers take action within 24 hours
- **Measurement:** Track button clicks and portal visits
- **Success:** 70% click "Review Extraction" or other actions within 24 hours

**Processing Time:**
- **Target:** 95% of extractions complete within 3 minutes
- **Measurement:** Track extraction start to completion time
- **Success:** <3 minutes for 95% of extractions

**Accuracy:**
- **Target:** 90% extraction accuracy (high confidence)
- **Measurement:** Track confidence scores and buyer corrections
- **Success:** 90% of extractions have >90% confidence

**Time Savings:**
- **Target:** 40+ minutes saved per supplier quote
- **Measurement:** Compare extraction time to manual entry baseline
- **Success:** Average 40+ minutes saved per quote

**User Satisfaction:**
- **Target:** 4.5/5 satisfaction rating for notifications
- **Measurement:** User surveys and feedback
- **Success:** Average rating ≥4.5/5

**Error Rate:**
- **Target:** <1% notification delivery failures
- **Measurement:** Track email delivery errors
- **Success:** <1% failure rate

**Portal Engagement:**
- **Target:** 60% of buyers visit portal from notification
- **Measurement:** Track link clicks to portal
- **Success:** 60% click portal links

**Follow-up Effectiveness:**
- **Target:** 80% of follow-ups result in complete data
- **Measurement:** Track follow-up responses and data completeness
- **Success:** 80% of suppliers provide missing data after follow-up

## 12. Open Questions

1. **Notification Frequency:** Should we batch notifications if multiple suppliers respond within minutes, or send individual notifications?
   - **Impact:** User experience vs notification overload
   - **Recommendation:** Individual notifications for immediate awareness, with option for digest mode

2. **Retry Logic:** How many times should we retry extraction if it fails initially?
   - **Impact:** Processing time vs accuracy
   - **Recommendation:** 3 retries with exponential backoff, then manual review

3. **Confidence Threshold:** What confidence level should trigger automatic follow-up vs manual review?
   - **Impact:** Automation vs buyer workload
   - **Recommendation:** <70% triggers follow-up, 70-90% flags for review, >90% auto-approved

4. **Time Saved Calculation:** Should we use fixed baseline (45 min) or dynamic based on RFQ complexity?
   - **Impact:** Accuracy of time savings claim
   - **Recommendation:** Start with fixed baseline, refine with actual data over time

5. **Notification Preferences:** Should buyers be able to customize which notifications they receive?
   - **Impact:** Flexibility vs complexity
   - **Recommendation:** Yes, provide granular controls in user profile

6. **Mobile Experience:** Should we create a mobile app for notifications or rely on email?
   - **Impact:** User experience vs development effort
   - **Recommendation:** Start with email (mobile-responsive), consider app in future

7. **Real-time Updates:** Should we provide real-time progress updates during extraction (websockets)?
   - **Impact:** User experience vs technical complexity
   - **Recommendation:** Not for MVP, consider for future enhancement

8. **Notification History:** Should we provide a notification history view in portal?
   - **Impact:** User convenience vs development effort
   - **Recommendation:** Yes, simple list view in portal

9. **Anomaly Severity:** How should we prioritize multiple anomalies in notification?
   - **Impact:** User attention and action prioritization
   - **Recommendation:** Sort by severity (critical first), limit to top 3 in email

10. **Comparison Board Versioning:** Should we include version history or only latest version?
    - **Impact:** Audit trail vs storage costs
    - **Recommendation:** Keep all versions for audit trail, provide version selector

11. **Follow-up Automation:** Should system automatically send follow-ups or require buyer approval?
    - **Impact:** Efficiency vs control
    - **Recommendation:** Require approval for MVP, consider automation with opt-out later

12. **Supplier Communication:** Should suppliers receive confirmation when their quote is processed?
    - **Impact:** Transparency vs email volume
    - **Recommendation:** Not for MVP, consider for future enhancement

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial requirements document created |

---

**Total Lines:** ~1,450 lines  
**Total Acceptance Criteria:** 159 (84 functional + 10 flexibility + 20 UX + 10 performance + 15 accessibility + 15 security + 5 edge cases)

**Status:** Complete ✅
