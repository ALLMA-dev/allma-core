# Screen 25: Anomalies Dashboard

## 1. Screen Overview

### Purpose
The Anomalies Dashboard is a specialized quality control screen that automatically detects and presents data quality issues, inconsistencies, outliers, and missing information across all supplier quotations. It enables buyers to systematically review, classify, and resolve anomalies before proceeding with supplier comparison and decision-making.

### User Story Reference
- **Primary:** US-B-019 (Review Data Quality Issues)
- **Supporting:** US-B-020 (Classify Anomaly Severity), US-B-021 (Send Follow-up Emails), US-B-022 (Add Manual Anomalies)

### Position in User Flow
- **Entry Points:** 
  - From Screen 20 (Extraction Review) after quotation data validation
  - From Screen 24 (Comparison Dashboard) when anomalies detected
  - From Screen 06 (Projects List) for existing RFQ review
- **Exit Points:**
  - To Screen 20 (Extraction Review) to correct source data
  - To Screen 24 (Comparison Dashboard) after anomaly resolution
  - To Screen 21 (Follow-Up Preview) to send clarification emails

### Key Interactions
- Multi-part RFQ navigation with part selector
- Snapshot/versioning system for tracking anomaly resolution over time
- Collapsible supplier groups with severity-based highlighting
- Three-tier severity classification (High/Medium/Low) with action workflows
- Automated follow-up email generation with severity-specific messaging
- Comment system for audit trail and team collaboration
- Manual anomaly creation for buyer-identified issues
- Anomaly deletion for false positives

## 2. User Goals & Success Criteria

### Primary User Goals
1. **Identify Issues:** Quickly identify all data quality issues across supplier quotations
2. **Prioritize Actions:** Understand which anomalies require immediate attention vs. awareness
3. **Classify Severity:** Reclassify auto-detected anomalies based on business context
4. **Take Action:** Send follow-up emails to suppliers for clarification or resolution
5. **Document Decisions:** Add comments explaining severity decisions and rationale
6. **Track Resolution:** Monitor anomaly resolution progress through snapshots
7. **Add Manual Anomalies:** Flag buyer-identified issues not caught by automation
8. **Maintain Quality:** Ensure only high-quality data proceeds to comparison

### Success Metrics
- Time to review all anomalies: < 10 minutes per RFQ
- Anomaly resolution rate: > 80% before decision-making
- False positive rate: < 10% of auto-detected anomalies
- Follow-up email response rate: > 70% within 48 hours
- Manual anomaly additions: Average 1-2 per RFQ
- User confidence in data quality: > 90% (survey-based)


## 3. Functional Requirements

### FR-25.1: Automated Anomaly Detection
**Priority:** P0 (Critical)

**Description:** Automatically detect and categorize data quality issues across all supplier quotations using rule-based and statistical analysis.

**Detailed Requirements:**
- Detect four types of anomalies:
  1. **Missing Data:** Required fields not provided by supplier
  2. **Low Confidence:** LLM extraction confidence below threshold (< 70%)
  3. **Outlier:** Values significantly different from other suppliers (>15% deviation)
  4. **Inconsistency:** Data conflicts with RFQ specifications or internal logic
- Assign initial severity based on detection rules:
  - High: Missing critical data (pricing, lead time), major specification deviations
  - Medium: Missing non-critical data, moderate outliers, low confidence extractions
  - Low: Minor inconsistencies, informational outliers
- Calculate severity based on:
  - Field importance (pricing > quality > logistics)
  - Deviation magnitude (>20% = high, 10-20% = medium, <10% = low)
  - Business impact (affects supplier eligibility, comparison accuracy)
- Generate anomaly metadata:
  - Unique anomaly ID
  - Detection timestamp
  - Supplier association
  - Category (Material Specification, Pricing, Quality, etc.)
  - Description (human-readable summary)
  - Details (specific data points, comparisons)
  - Impact assessment (business consequences)
  - Recommended action (what buyer should do)
- Support anomaly detection across multiple data sources:
  - LLM-extracted quotation data
  - Structured form submissions
  - Email attachments (PDFs, Excel files)
  - Historical supplier data
- Run detection automatically after extraction completion
- Re-run detection when quotation data updated
- Store detection results in versioned snapshots

**Acceptance Criteria:**
- All four anomaly types detected correctly
- Severity assignment follows defined rules
- Anomaly metadata complete and accurate
- Detection runs automatically after extraction
- Results stored in versioned snapshots
- Detection completes within 5 seconds per supplier
- False positive rate < 10%
- False negative rate < 5%


### FR-25.2: Summary Statistics Cards
**Priority:** P0 (Critical)

**Description:** Display four summary cards showing total anomalies and breakdown by severity level with dynamic styling based on counts.

**Detailed Requirements:**
- Display four cards in horizontal grid layout:
  1. **Total Anomalies Card:**
     - Show total count across all suppliers
     - Display "Detected across all quotes" subtitle
     - Show "X modified" badge if user reclassified any anomalies
     - Purple badge styling for modified count
  
  2. **High Severity Card:**
     - Show count of high severity anomalies
     - Dynamic styling: Red theme if count > 0, gray theme if count = 0
     - Red background (bg-red-50) and border (border-red-200) when active
     - Gray background (bg-gray-50) and border (border-gray-200) when inactive
     - Text: "Requires immediate action" if count > 0, "No high severity issues" if count = 0
     - Animated transition when count changes (300ms duration)
  
  3. **Medium Severity Card:**
     - Show count of medium severity anomalies
     - Dynamic styling: Yellow theme if count > 0, gray theme if count = 0
     - Yellow background (bg-yellow-50) and border (border-yellow-200) when active
     - Text: "Needs review" if count > 0, "No medium severity issues" if count = 0
     - Animated transition when count changes
  
  4. **Low Severity Card:**
     - Show count of low severity anomalies
     - Dynamic styling: Blue theme if count > 0, gray theme if count = 0
     - Blue background (bg-blue-50) and border (border-blue-200) when active
     - Text: "For awareness" if count > 0, "No low severity issues" if count = 0
     - Animated transition when count changes

- Update counts in real-time when user reclassifies anomalies
- Show modified count badge on Total Anomalies card
- Apply smooth color transitions (300ms) when severity changes
- Responsive layout: Stack vertically on mobile devices

**Acceptance Criteria:**
- All four cards display with correct counts
- Dynamic styling applies based on counts (colored when > 0, gray when = 0)
- Modified count badge shows when user reclassifies anomalies
- Counts update immediately when severity changed
- Color transitions smooth (300ms duration)
- Cards responsive on mobile (stack vertically)
- Text changes based on count (action text vs. "no issues" text)
- Animated transitions work without performance issues


### FR-25.3: Supplier Grouping and Expansion
**Priority:** P0 (Critical)

**Description:** Group anomalies by supplier with collapsible sections, severity-based highlighting, and smart default expansion.

**Detailed Requirements:**
- Group all anomalies by supplier name
- Display all suppliers in RFQ (even those with zero anomalies)
- Show supplier header with:
  - Expand/collapse chevron icon (down = expanded, right = collapsed)
  - Package icon
  - Supplier name (bold)
  - Anomaly count text (e.g., "3 anomalies detected" or "No anomalies detected")
  - Severity badge showing highest severity in group
- Apply color-coded left border based on highest severity:
  - Red (border-l-red-500): High severity present
  - Yellow (border-l-yellow-500): Medium severity present (no high)
  - Blue (border-l-blue-500): Low severity only
  - Green (border-l-green-500): No anomalies
- Apply matching background colors:
  - Red theme (bg-red-50): High severity
  - Yellow theme (bg-yellow-50): Medium severity
  - Blue theme (bg-blue-50): Low severity
  - Green theme (bg-green-50): No anomalies
- Default expansion logic:
  - Auto-expand suppliers with high or medium severity anomalies
  - Auto-collapse suppliers with only low severity or no anomalies
  - Persist expansion state in user preferences
- Show "NO ISSUES" badge with checkmark for suppliers with zero anomalies
- Hover effect: Darken background and add shadow
- Click anywhere on header to toggle expansion
- Support keyboard navigation (Tab to focus, Enter/Space to toggle)

**Acceptance Criteria:**
- All suppliers display in alphabetical order
- Suppliers with zero anomalies show "No anomalies detected" message
- Color-coded borders match highest severity in group
- Background colors match severity theme
- Default expansion shows high/medium severity suppliers
- Low severity and no-anomaly suppliers collapsed by default
- Expansion state persists across page reloads
- "NO ISSUES" badge displays for zero-anomaly suppliers
- Hover effects apply to entire header
- Click toggles expansion correctly
- Keyboard navigation works (Tab, Enter, Space)

### FR-25.4: Anomaly Card Display
**Priority:** P0 (Critical)

**Description:** Display individual anomaly cards with expandable details, severity indicators, and metadata badges.

**Detailed Requirements:**
- Show anomaly cards indented under supplier headers (ml-6 margin)
- Apply left border matching severity:
  - Red (border-l-red-500): High severity
  - Yellow (border-l-yellow-500): Medium severity
  - Blue (border-l-blue-500): Low severity
- Display card header with:
  - Expand/collapse chevron icon
  - Severity icon (AlertTriangle for high/medium, Info for low)
  - Anomaly description (title)
  - Metadata badges:
    - Severity badge (HIGH/MEDIUM/LOW SEVERITY)
    - Type badge (MISSING-DATA, LOW-CONFIDENCE, OUTLIER, INCONSISTENCY)
    - Category badge (e.g., Material Specification, Pricing)
    - Detection badge (Auto-detected or Manual Entry)
    - Modified badge (User Modified) if severity changed
    - Reviewed badge (Reviewed) if action selected
- Click header to toggle expansion
- Default state: All anomalies expanded
- Persist expansion state per anomaly

**Expanded Card Content:**
- **Details Section:**
  - Gray background (bg-gray-50)
  - Bullet list of specific data points
  - Each detail on separate line with bullet
- **Impact Section:**
  - Color-coded background matching severity
  - Bold "Impact:" label
  - Impact description text
- **Recommended Action Section:**
  - "Recommended Action:" label
  - Action description text
  - Status badge (Pending, Needs Review, Flagged, Acknowledged)
- **Severity Marking Section:** (See FR-25.5)
- **Comment Section:** (See FR-25.6)
- **Delete Button:** (For manual anomalies only)

**Acceptance Criteria:**
- Anomaly cards display with correct indentation
- Left borders match severity colors
- All metadata badges display correctly
- Expand/collapse works on header click
- Default state shows all anomalies expanded
- Details section displays bullet list correctly
- Impact section uses severity-matched colors
- Recommended action shows with status badge
- Manual anomalies show delete button
- Auto-detected anomalies hide delete button


### FR-25.5: Three-Tier Severity Classification
**Priority:** P0 (Critical)

**Description:** Allow buyers to reclassify anomaly severity with three action tiers, each with specific consequences and follow-up workflows.

**Detailed Requirements:**
- Display three severity options as radio buttons with detailed descriptions:

**1. High Severity - Exclude from RFQ:**
- Red theme (border-red-500, bg-red-50)
- X icon (red)
- Label: "High Severity - Exclude from RFQ"
- Description: "This supplier will be excluded from the comparison. Use when the issue is critical and cannot be resolved."
- When selected: Show "Send Follow-up Email" button (red, bg-red-600)
- Email content includes:
  - Subject: "Follow-up: [Category] - RFQ-2025-047"
  - Severity: HIGH - CRITICAL ISSUE
  - Consequences: "This is a critical issue that may result in your exclusion from this RFQ. We need immediate clarification or resolution to keep your quotation under consideration. Without a satisfactory response, we will be unable to proceed with your offer."
  - Response deadline: "Please respond within 24 hours to keep your quotation under consideration."

**2. Medium Severity - Keep in RFQ, Follow-up Required:**
- Yellow theme (border-yellow-500, bg-yellow-50)
- Mail icon (yellow)
- Label: "Medium Severity - Keep in RFQ, Follow-up Required"
- Description: "Keep supplier in comparison but send follow-up email to clarify or resolve the issue."
- When selected: Show "Send Follow-up Email" button (yellow, bg-yellow-600)
- Email content includes:
  - Subject: "Follow-up: [Category] - RFQ-2025-047"
  - Severity: MEDIUM - REQUIRES CLARIFICATION
  - Consequences: "This issue requires clarification before we can proceed with the evaluation. Your quotation will remain in consideration, but we need the requested information to complete a fair comparison with other suppliers. Timely response will help ensure your offer is properly evaluated."
  - Response request: "Please provide the requested information at your earliest convenience to help us complete our evaluation."

**3. Low Severity - Keep as Warning:**
- Blue theme (border-blue-500, bg-blue-50)
- Info icon (blue)
- Label: "Low Severity - Keep as Warning"
- Description: "Note the issue but no immediate action needed. Keep supplier in comparison with this caveat."
- When selected: Show "Send Follow-up Email" button (blue, bg-blue-600)
- Email content includes:
  - Subject: "Follow-up: [Category] - RFQ-2025-047"
  - Severity: LOW - INFORMATIONAL
  - Consequences: "This is a minor issue that we've noted for our records. Your quotation remains fully competitive and under consideration. We're sharing this information for your awareness and to help improve future submissions. No immediate action is required, but we welcome any clarification you'd like to provide."
  - Response note: "We welcome any clarification you'd like to provide, though no immediate action is required."

**Additional Requirements:**
- Show current severity selection with visual highlight
- Display original severity if different from current selection
- Show "User Modified" badge when severity changed
- Provide "Reset to Original" button to undo changes
- Update summary cards immediately when severity changed
- Update supplier group severity badge when any anomaly changed
- Persist severity changes across page reloads
- Track severity changes in audit trail

**Acceptance Criteria:**
- All three severity options display with correct styling
- Radio button selection works correctly
- Descriptions explain consequences clearly
- "Send Follow-up Email" button appears when option selected
- Email content matches severity level
- Original severity displayed when different from current
- "User Modified" badge shows for changed anomalies
- "Reset to Original" button restores initial severity
- Summary cards update immediately
- Supplier group badges update when anomaly severity changed
- Changes persist across page reloads
- Audit trail tracks all severity changes


### FR-25.6: Automated Follow-Up Email Generation
**Priority:** P0 (Critical)

**Description:** Generate severity-specific follow-up emails with pre-populated content, supplier addressing, and CC to RFQ agent.

**Detailed Requirements:**
- Generate mailto: link with pre-populated fields:
  - **To:** Supplier email address (looked up from supplier database)
  - **CC:** rfq-agent@customer-domain.optiroq.com (for tracking and automation)
  - **Subject:** "Follow-up: [Category] - RFQ-[Number]"
  - **Body:** Severity-specific template with anomaly details

**Email Template Structure:**
```
Dear [Supplier Name],

Thank you for your quotation for RFQ-[Number] ([Part Description]).

We are reviewing your response and have identified the following issue that requires your attention:

[SEVERITY-SPECIFIC CONSEQUENCES SECTION]

ISSUE SUMMARY:
Category: [Category]
Type: [TYPE]

Description:
[Description]

Details:
• [Detail 1]
• [Detail 2]
• [Detail 3]

Impact:
[Impact]

REQUESTED ACTION:
[Action - reformatted to address supplier directly]

[SEVERITY-SPECIFIC RESPONSE DEADLINE]

[ADDITIONAL COMMENTS IF ANY]

If you have any questions, please don't hesitate to reach out.

Thank you for your cooperation!

Best regards,
[Buyer Name]
[Buyer Title]
[Department]
```

**Action Text Reformatting:**
- Replace "Request supplier to" with "Please"
- Replace "supplier" references with "you/your"
- Example: "Request supplier to validate requirements" → "Please validate requirements"

**Additional Comments Section:**
- Include all user-added comments in email body
- Format as bullet list
- Only include if comments exist

**Email Button Behavior:**
- Opens default email client with pre-populated content
- Button text: "Send Follow-up Email"
- Button icon: Mail icon
- Button color matches severity (red/yellow/blue)
- Button only visible when severity option selected
- Clicking button opens email client immediately

**Acceptance Criteria:**
- mailto: link generates correctly with all fields
- Supplier email address looked up correctly
- CC includes RFQ agent email
- Subject line includes category and RFQ number
- Email body includes all required sections
- Severity-specific consequences display correctly
- Action text reformatted to address supplier
- Comments included when present
- Email button appears only when severity selected
- Button color matches severity level
- Clicking button opens email client
- Pre-populated content displays correctly in email client


### FR-25.7: Comment System for Audit Trail
**Priority:** P1 (High)

**Description:** Enable buyers to add, view, and delete comments on anomalies for decision documentation and team collaboration.

**Detailed Requirements:**
- Display comment section below severity selection
- Show section header: "Comments" with MessageSquare icon
- Display existing comments in chronological order (newest first)
- Each comment shows:
  - Author name (bold)
  - Timestamp (relative: "2 hours ago" or absolute: "Dec 30, 2025 14:30")
  - Comment text (multi-line, preserves line breaks)
  - Delete button (X icon, only for comment author)
- Comment input area:
  - Multi-line textarea (3 rows)
  - Placeholder: "Add notes about your decision, reasoning, or any additional context..."
  - Character counter (optional)
  - "Add Comment" button with MessageSquare icon
  - Keyboard shortcut: Ctrl+Enter or Cmd+Enter to submit
- Comment submission:
  - Validate non-empty text
  - Trim whitespace
  - Add timestamp automatically
  - Associate with current user
  - Clear input after submission
  - Display immediately in comment list
- Comment deletion:
  - Show delete button (X icon) on hover
  - Require confirmation dialog
  - Remove from list immediately
  - Track deletion in audit trail
- Comment persistence:
  - Save to database immediately
  - Associate with anomaly ID
  - Include in email follow-ups (optional)
  - Export with anomaly reports
- Comment visibility:
  - All team members can view comments
  - Only author can delete own comments
  - Admins can delete any comment
  - Deleted comments show as "[Comment deleted]" with timestamp

**Acceptance Criteria:**
- Comment section displays below severity selection
- Existing comments show in chronological order
- Comment metadata displays correctly (author, timestamp)
- Multi-line text preserves formatting
- Delete button visible only to author (and admins)
- Textarea accepts multi-line input
- Placeholder text displays when empty
- "Add Comment" button disabled when input empty
- Ctrl+Enter submits comment
- Comments save immediately to database
- New comments display without page reload
- Delete confirmation dialog appears
- Deleted comments removed from list
- Audit trail tracks comment additions and deletions
- Comments included in follow-up emails when present

### FR-25.8: Manual Anomaly Creation
**Priority:** P1 (High)

**Description:** Allow buyers to manually add anomalies for issues not detected by automation.

**Detailed Requirements:**
- Show "Add manual anomaly" button under each supplier group
- Button styling: Dashed border, gray theme, hover changes to blue
- Button text: "Add manual anomaly for [Supplier Name]"
- Plus icon on button
- Clicking button expands inline form
- Form fields:
  1. **Severity:** Dropdown (High, Medium, Low) - Required
  2. **Type:** Dropdown (Inconsistency, Missing Data, Outlier, Low Confidence) - Required
  3. **Category:** Text input (e.g., "Material Specification") - Required
  4. **Description:** Text input (brief summary) - Required
  5. **Details:** Multi-line textarea (one detail per line) - Optional
  6. **Impact:** Multi-line textarea (business impact) - Optional
  7. **Recommended Action:** Multi-line textarea (what to do) - Optional
- Form validation:
  - Require severity, type, category, and description
  - Show validation errors inline
  - Disable "Add Anomaly" button until required fields filled
- Form submission:
  - Create new anomaly with unique ID
  - Mark as manual entry (isManual: true)
  - Set status to "needs-review"
  - Add to anomaly list immediately
  - Expand anomaly card automatically
  - Initialize severity state
  - Clear form after submission
- Form cancellation:
  - Show "Cancel" button
  - Clicking cancel collapses form
  - Clears all form inputs
  - No data saved
- Manual anomaly indicators:
  - Show "Manual Entry" badge on anomaly card
  - Display delete button (auto-detected anomalies cannot be deleted)
  - Track manual creation in audit trail

**Acceptance Criteria:**
- "Add manual anomaly" button displays under each supplier
- Button hover effect changes to blue theme
- Clicking button expands inline form
- All form fields display correctly
- Required field validation works
- "Add Anomaly" button disabled until required fields filled
- Form submission creates new anomaly
- New anomaly displays immediately
- Anomaly card auto-expands after creation
- "Manual Entry" badge displays on card
- Delete button visible for manual anomalies
- Cancel button collapses form without saving
- Form inputs clear after submission or cancellation
- Audit trail tracks manual anomaly creation


### FR-25.9: Anomaly Deletion
**Priority:** P1 (High)

**Description:** Allow deletion of manual anomalies and false positives with confirmation and audit trail.

**Detailed Requirements:**
- Show delete button only for manual anomalies (isManual: true)
- Button styling: Red text, outline style, X icon
- Button text: "Delete Manual Anomaly"
- Button location: Bottom of expanded anomaly card, below comment section
- Clicking button shows confirmation dialog:
  - Title: "Delete Anomaly?"
  - Message: "Are you sure you want to delete this manual anomaly? This action cannot be undone."
  - Buttons: "Cancel" (gray) and "Delete" (red)
- Confirmation required before deletion
- Deletion actions:
  - Remove anomaly from list immediately
  - Update summary card counts
  - Update supplier group severity badge
  - Remove from database
  - Track deletion in audit trail
  - Log deletion reason (optional)
- Auto-detected anomalies cannot be deleted:
  - No delete button shown
  - Provide "Dismiss" option instead (future enhancement)
  - Dismissed anomalies hidden but tracked
- Deletion permissions:
  - Anomaly creator can delete own manual anomalies
  - Admins can delete any manual anomaly
  - Regular users cannot delete auto-detected anomalies
- Audit trail tracking:
  - Record deletion timestamp
  - Record user who deleted
  - Record anomaly details before deletion
  - Maintain deletion history for compliance

**Acceptance Criteria:**
- Delete button visible only for manual anomalies
- Button styling matches design (red text, outline)
- Confirmation dialog appears on click
- Deletion requires explicit confirmation
- Anomaly removed from list immediately after confirmation
- Summary cards update counts correctly
- Supplier group badges update severity
- Database record deleted
- Audit trail records deletion
- Auto-detected anomalies hide delete button
- Only authorized users can delete anomalies
- Deletion history maintained for compliance

### FR-25.10: Snapshot/Versioning System
**Priority:** P1 (High)

**Description:** Track anomaly detection results over time through versioned snapshots, showing resolution progress and changes.

**Detailed Requirements:**
- Display snapshot selector dropdown next to part selector
- Show snapshot metadata:
  - Version number (1, 2, 3, etc.)
  - Timestamp (date and time)
  - Supplier name (if snapshot triggered by supplier action)
  - Trigger event description
  - Email subject (if triggered by email)
  - "Latest" badge on most recent snapshot
- List changes in each snapshot:
  - Detected: New anomaly found (orange icon)
  - Resolved: Anomaly fixed (green checkmark icon)
  - Severity Changed: Severity reclassified (blue arrow icon)
  - Comment Added: New comment added (gray message icon)
- Show severity badge for each change
- Clicking snapshot loads historical anomaly data
- Auto-create snapshots at key events:
  - Initial anomaly detection (after extraction)
  - After supplier follow-up response
  - After major data updates
  - Manual snapshot creation by user
- Snapshot comparison features:
  - Highlight changes between versions
  - Show resolved anomalies count
  - Show new anomalies count
  - Show severity changes count
- Snapshot retention:
  - Keep last 10 snapshots per RFQ
  - Archive older snapshots
  - Prevent deletion of initial snapshot
- Snapshot navigation:
  - Dropdown shows all available snapshots
  - Click to switch between versions
  - Loading indicator during switch
  - Preserve UI state when switching

**Acceptance Criteria:**
- Snapshot selector displays next to part selector
- All snapshot metadata shows correctly
- "Latest" badge appears on most recent snapshot
- Change list displays with correct icons and colors
- Severity badges show for relevant changes
- Clicking snapshot loads historical data within 2 seconds
- Auto-snapshots created at specified events
- Snapshot comparison highlights changes
- Last 10 snapshots retained per RFQ
- Initial snapshot cannot be deleted
- Dropdown shows all available snapshots
- Loading indicator displays during switch
- UI state preserved when switching snapshots


### FR-25.11: Multi-Part RFQ Navigation
**Priority:** P1 (High)

**Description:** For RFQs with multiple parts, provide part selector to filter anomalies by part number.

**Detailed Requirements:**
- Display part selector dropdown in header (next to snapshot selector)
- Show current part name and description
- Dropdown displays all parts in RFQ:
  - Part number (bold)
  - Part description (smaller text)
  - Checkmark icon for selected part
- Clicking part switches anomaly view to that part
- Preserve anomaly states when switching parts:
  - Severity classifications
  - Comments
  - Expansion states
- Load part-specific anomalies:
  - Filter anomalies by part ID
  - Update summary cards for selected part
  - Update supplier groups for selected part
- Show part count indicator (e.g., "Part 2 of 5")
- Support keyboard navigation (arrow keys, Enter to select)
- Auto-save state before switching parts
- Loading indicator during part data fetch

**Acceptance Criteria:**
- Part selector displays in header
- Current part name shows in selector button
- Dropdown lists all parts with descriptions
- Checkmark shows on selected part
- Switching parts loads correct anomalies within 2 seconds
- Anomaly states persist across part switches
- Summary cards update for selected part
- Supplier groups update for selected part
- Part count indicator shows correct position
- Keyboard navigation works
- Auto-save completes before switch
- Loading indicator displays during fetch

### FR-25.12: Navigation and Action Buttons
**Priority:** P0 (Critical)

**Description:** Provide clear navigation to related screens with contextual action buttons.

**Detailed Requirements:**
- Display action card at bottom of page
- Blue theme (bg-blue-50, border-blue-200)
- Card content:
  - Left side: Next steps information
    - Title: "Next Steps" (bold, blue-900)
    - Description: "Review anomalies and proceed to comparison board when ready"
  - Right side: Action buttons
    - "Review Extraction Data" button (outline style)
    - "View Comparison Dashboard" button (primary style, blue-600)
- Navigation targets:
  - "Review Extraction Data" → Screen 20 (Extraction Review)
  - "View Comparison Dashboard" → Screen 24 (Comparison Dashboard)
- Button states:
  - Disable "View Comparison Dashboard" if high severity anomalies unresolved
  - Show tooltip on disabled button explaining why
  - Enable when all high severity anomalies addressed
- Keyboard shortcuts:
  - Alt+E: Review Extraction Data
  - Alt+C: View Comparison Dashboard
- Show progress indicator (e.g., "Step 4 of 5")
- Include breadcrumb navigation at top
- Auto-save all changes before navigation

**Acceptance Criteria:**
- Action card displays at bottom with blue theme
- Next steps information shows clearly
- Both navigation buttons display
- "Review Extraction Data" navigates to Screen 20
- "View Comparison Dashboard" navigates to Screen 24
- "View Comparison Dashboard" disabled when high severity unresolved
- Disabled button tooltip explains blocking reason
- Button enables when high severity anomalies addressed
- Keyboard shortcuts work correctly
- Progress indicator shows correct step
- Breadcrumbs display full navigation path
- Auto-save completes before navigation


### FR-25.13: Information Banner
**Priority:** P2 (Low)

**Description:** Display educational banner explaining how anomaly detection works and its purpose.

**Detailed Requirements:**
- Show banner at bottom of page (above action buttons)
- Gray theme (bg-gray-50, border-gray-200)
- Content:
  - Bold label: "How it works:"
  - Explanation text: "Optiroq automatically analyzes all extracted quote data to detect missing information, low-confidence extractions, pricing outliers, and inconsistencies. This anomalies dashboard helps Sarah quickly identify potential issues that may require follow-up or manual verification before making sourcing decisions."
- Banner styling:
  - Rounded corners
  - Padding: 16px
  - Border: 1px solid gray-200
  - Text: Small size (14px), gray-700 color
- Dismissible (optional):
  - Show X button in top-right corner
  - Clicking X hides banner
  - Remember dismissal in user preferences
  - Show "Show Help" button to restore banner
- Responsive:
  - Full width on desktop
  - Stack text on mobile
  - Maintain readability at all sizes

**Acceptance Criteria:**
- Banner displays at bottom of page
- Gray theme styling applied correctly
- "How it works:" label bold
- Explanation text clear and readable
- Banner responsive on all screen sizes
- Dismissal button works (if implemented)
- Dismissal preference saved
- Banner can be restored after dismissal

## 4. User Experience Requirements

### UX-25.1: Visual Hierarchy and Clarity
- Use severity-based color coding consistently (red = high, yellow = medium, blue = low, green = no issues)
- Apply clear visual distinction between supplier groups and individual anomalies
- Highlight critical information (severity badges, anomaly counts)
- Use white space effectively to separate sections
- Implement progressive disclosure: collapsed suppliers by default (except high/medium severity)
- Display clear section headers with icons
- Use consistent typography hierarchy

### UX-25.2: Interaction Feedback
- Provide immediate visual feedback for all actions (clicks, hovers, selections)
- Show loading states during data fetching (skeleton screens or spinners)
- Display success/error messages for comment submissions
- Animate severity changes with smooth transitions (300ms)
- Show hover tooltips for complex terms and abbreviations
- Highlight active selections (severity options, expanded cards)
- Display progress indicators for email generation
- Provide confirmation dialogs for destructive actions (delete anomaly)

### UX-25.3: Navigation and Wayfinding
- Display breadcrumb navigation showing current position
- Show progress indicator (e.g., "Step 4 of 5 - Anomaly Review")
- Provide clear "Back" and "Next" navigation buttons
- Include quick links to related screens
- Highlight current part in multi-part RFQ selector
- Show active snapshot in version selector
- Display scroll position indicators for long lists
- Provide "Jump to Supplier" quick navigation

### UX-25.4: Data Comprehension
- Use visual indicators (icons, badges, colors) to convey severity quickly
- Display anomaly counts prominently in summary cards
- Show clear descriptions for each anomaly type
- Provide contextual tooltips explaining impact and actions
- Use progressive disclosure for detailed information
- Highlight key insights (high severity issues, resolution progress)
- Display summary statistics prominently
- Use color-coded themes to differentiate severity levels

### UX-25.5: Error Prevention and Recovery
- Validate comment input before submission (non-empty)
- Prevent navigation with unsaved changes (show confirmation)
- Disable action buttons when prerequisites not met
- Show clear error messages with recovery suggestions
- Auto-save anomaly states periodically
- Provide undo functionality for severity changes ("Reset to Original")
- Allow dismissal of false positive anomalies
- Handle missing data gracefully (show "N/A" or placeholder)

### UX-25.6: Performance and Responsiveness
- Load anomaly data within 2 seconds
- Render summary cards within 500ms
- Animate transitions smoothly without lag (60fps)
- Implement lazy loading for large anomaly lists
- Optimize rendering for many anomalies (virtualization if >50)
- Cache frequently accessed data (snapshots, supplier info)
- Show loading indicators for operations >500ms
- Provide offline capability for viewing cached anomalies


## 5. Data Requirements

### Input Data
1. **Anomaly Detection Results:**
   - Anomaly ID, type, severity, supplier, category
   - Description, details array, impact, recommended action
   - Detection timestamp, status, isManual flag
   
2. **Supplier Information:**
   - Supplier ID, name, email address
   - Contact information for follow-ups
   
3. **RFQ Context:**
   - RFQ ID, number, part information
   - Target specifications for comparison
   
4. **Historical Data:**
   - Previous snapshots with anomaly states
   - Resolution history and timeline
   
5. **User Data:**
   - User preferences (expansion states, dismissed anomalies)
   - Comment authorship and permissions

### Data Validation Rules
1. **Anomaly Data:**
   - Severity must be: high, medium, or low
   - Type must be: missing-data, low-confidence, outlier, or inconsistency
   - Description required (non-empty string)
   - Supplier ID must reference valid supplier
   
2. **Comment Data:**
   - Text required (non-empty after trim)
   - Maximum length: 1000 characters
   - Author must be valid user
   - Timestamp must be valid date
   
3. **Severity Classification:**
   - Action must be: high, medium, low, or null
   - Cannot be null if anomaly reviewed
   - Must track original severity for comparison

### Data Transformations
1. **Severity Aggregation:**
   - Calculate highest severity per supplier group
   - Count anomalies by severity level
   - Track user-modified anomalies count
   
2. **Email Generation:**
   - Format action text for supplier addressing
   - Replace "Request supplier to" with "Please"
   - Replace "supplier" with "you/your"
   - Include comments in email body
   
3. **Snapshot Comparison:**
   - Identify new anomalies since last snapshot
   - Identify resolved anomalies
   - Track severity changes
   - Calculate resolution rate

## 6. Integration Points

### Internal System Integrations
1. **Screen 20 (Extraction Review):**
   - Receive extracted quotation data
   - Navigate back for data corrections
   - Sync quotation updates
   
2. **Screen 24 (Comparison Dashboard):**
   - Send anomaly resolution status
   - Block navigation if high severity unresolved
   - Sync anomaly dismissals
   
3. **Screen 21 (Follow-Up Preview):**
   - Generate follow-up email content
   - Track email send status
   - Receive supplier responses

### External System Integrations
1. **Email Service:**
   - Generate mailto: links
   - Track email opens and responses
   - Integrate with email client
   
2. **Supplier Database:**
   - Fetch supplier email addresses
   - Retrieve supplier contact information
   - Update supplier communication history
   
3. **Audit System:**
   - Log all anomaly state changes
   - Track severity reclassifications
   - Record comment additions/deletions
   - Maintain compliance trail

### API Endpoints Required
1. **GET /api/rfq/{rfqId}/anomalies** - Fetch all anomalies
2. **POST /api/rfq/{rfqId}/anomalies** - Create manual anomaly
3. **PUT /api/rfq/{rfqId}/anomalies/{anomalyId}** - Update anomaly severity
4. **DELETE /api/rfq/{rfqId}/anomalies/{anomalyId}** - Delete manual anomaly
5. **GET /api/rfq/{rfqId}/anomaly-snapshots** - Fetch snapshots
6. **POST /api/rfq/{rfqId}/anomaly-snapshots** - Create snapshot
7. **POST /api/rfq/{rfqId}/anomalies/{anomalyId}/comments** - Add comment
8. **DELETE /api/rfq/{rfqId}/anomalies/{anomalyId}/comments/{commentId}** - Delete comment
9. **GET /api/suppliers/{supplierId}/contact** - Get supplier email
10. **POST /api/rfq/{rfqId}/follow-up-email** - Log email send


## 7. Business Rules

### BR-25.1: Anomaly Detection Rules
- Run detection automatically after extraction completion
- Detect missing data for required fields only
- Flag low confidence when LLM confidence < 70%
- Identify outliers when deviation > 15% from median
- Detect inconsistencies against RFQ specifications
- Assign severity based on field importance and deviation magnitude
- Re-run detection when quotation data updated

### BR-25.2: Severity Classification Rules
- High severity: Missing critical data, major specification deviations (>20%)
- Medium severity: Missing non-critical data, moderate outliers (10-20%)
- Low severity: Minor inconsistencies, informational outliers (<10%)
- User can reclassify any anomaly severity
- Original severity preserved for audit trail
- Reclassification tracked as "User Modified"

### BR-25.3: Navigation Blocking Rules
- Block navigation to Comparison Dashboard if high severity anomalies unresolved
- High severity considered "unresolved" if action not selected
- Medium and low severity do not block navigation
- Show tooltip explaining blocking reason
- Allow override with manager approval (future enhancement)

### BR-25.4: Comment Permissions
- All team members can view comments
- Only comment author can delete own comments within 24 hours
- Admins can delete any comment
- Deleted comments show as "[Comment deleted]" with timestamp
- Comments cannot be edited after 24 hours (create new comment instead)

### BR-25.5: Manual Anomaly Rules
- Only buyers and managers can create manual anomalies
- Manual anomalies marked with isManual: true flag
- Manual anomalies can be deleted by creator or admin
- Auto-detected anomalies cannot be deleted (only dismissed)
- Manual anomalies require category and description minimum

### BR-25.6: Email Generation Rules
- Email content varies by severity level
- High severity: 24-hour response deadline
- Medium severity: "At earliest convenience" request
- Low severity: "No immediate action required" note
- Include all comments in email body
- CC rfq-agent@customer-domain.optiroq.com for tracking
- Format action text to address supplier directly

### BR-25.7: Snapshot Management
- Auto-create snapshot at initial detection
- Auto-create snapshot after supplier follow-up
- Auto-create snapshot before major data updates
- Retain last 10 snapshots per RFQ
- Archive older snapshots
- Prevent deletion of initial snapshot
- Track changes between snapshots (detected, resolved, severity-changed, comment-added)

### BR-25.8: Data Visibility Rules
- Buyers see anomalies for their assigned RFQs
- Suppliers see only their own anomalies (not competitors)
- Managers see all anomalies across department RFQs
- Admins have full visibility across all RFQs
- Historical snapshots visible to all users with RFQ access

## 8. Edge Cases & Error Handling

### Edge Case 1: No Anomalies Detected
**Scenario:** All supplier quotations pass validation with no issues
**Handling:**
- Display "No anomalies detected" message for each supplier
- Show green theme with checkmark icon
- Display "NO ISSUES" badge on supplier headers
- Show zero counts in all severity summary cards
- Enable immediate navigation to Comparison Dashboard
- Display success message: "All data validated successfully"

### Edge Case 2: All Anomalies High Severity
**Scenario:** Every detected anomaly classified as high severity
**Handling:**
- Display prominent warning banner
- Block navigation to Comparison Dashboard
- Suggest reviewing extraction data or contacting suppliers
- Show "All suppliers have critical issues" message
- Provide "Review All" bulk action option
- Allow manager override with justification

### Edge Case 3: Supplier with No Email Address
**Scenario:** Supplier contact information missing email
**Handling:**
- Disable "Send Follow-up Email" button
- Show tooltip: "Supplier email address not available"
- Provide "Add Email Address" link to supplier profile
- Log missing email as system issue
- Suggest manual contact through phone or portal message

### Edge Case 4: Concurrent Anomaly Updates
**Scenario:** Multiple users editing same anomaly simultaneously
**Handling:**
- Implement optimistic locking
- Detect conflicts on save attempt
- Display conflict resolution dialog
- Show both versions side-by-side
- Allow user to choose which version to keep
- Log all conflict resolutions

### Edge Case 5: Email Client Not Configured
**Scenario:** User's system has no default email client
**Handling:**
- Detect mailto: link failure
- Show error message: "Email client not configured"
- Provide "Copy Email Content" button
- Display email content in modal for manual copying
- Suggest using web-based email
- Log email generation for tracking

### Edge Case 6: Snapshot Load Failure
**Scenario:** Historical snapshot data corrupted or unavailable
**Handling:**
- Display error message: "Snapshot data unavailable"
- Fall back to current version
- Log error for technical investigation
- Notify admin of data integrity issue
- Offer data recovery from backup
- Continue with current data

### Edge Case 7: Large Number of Anomalies
**Scenario:** More than 50 anomalies detected across all suppliers
**Handling:**
- Implement virtual scrolling for performance
- Add "Filter by Severity" quick action
- Provide "Show High Severity Only" toggle
- Add pagination (20 anomalies per page)
- Show anomaly count warning
- Suggest reviewing extraction quality

### Edge Case 8: Manual Anomaly Spam
**Scenario:** User creates many duplicate or invalid manual anomalies
**Handling:**
- Detect duplicate descriptions within same supplier
- Show warning: "Similar anomaly already exists"
- Limit manual anomaly creation to 10 per supplier
- Require manager approval for >5 manual anomalies
- Track manual anomaly creation rate
- Flag suspicious activity for review

## 9. Performance Requirements

### Response Time Requirements
- **Initial Page Load:** < 2 seconds for dashboard with up to 20 anomalies
- **Supplier Group Expansion:** < 300ms animation duration
- **Anomaly Card Expansion:** < 300ms animation duration
- **Comment Submission:** < 1 second to save and display
- **Severity Change:** < 500ms to update UI and summary cards
- **Snapshot Switching:** < 2 seconds to load historical data
- **Email Generation:** < 500ms to generate mailto: link
- **Manual Anomaly Creation:** < 1 second to add and display
- **Auto-save:** < 2 seconds background operation

### Scalability Requirements
- **Anomaly Count:** Support up to 100 anomalies per RFQ without performance degradation
- **Supplier Count:** Handle up to 20 suppliers per RFQ
- **Comment Volume:** Support up to 50 comments per anomaly
- **Snapshot History:** Maintain 10 snapshots with fast switching
- **Concurrent Users:** Handle 50 simultaneous users viewing same RFQ
- **Data Volume:** Process anomaly lists with up to 500 total data points

### Optimization Strategies
1. **Lazy Loading:** Load anomaly details only when expanded
2. **Virtual Scrolling:** Implement for >50 anomalies
3. **Debouncing:** Apply to comment input (300ms)
4. **Caching:** Cache supplier information and email addresses
5. **Batch Updates:** Group severity changes for bulk save
6. **Progressive Enhancement:** Load summary cards first, details second


## 10. Security & Compliance Requirements

### Authentication & Authorization
- **User Authentication:** Require valid session token for dashboard access
- **Role-Based Access Control:**
  - Buyer: View assigned RFQs, classify severity, add comments, create manual anomalies
  - Manager: View all department RFQs, override classifications, delete any manual anomaly
  - Admin: Full access, delete any anomaly, configure detection rules
  - Supplier: View only own anomalies (no competitor data)
- **Session Management:** Auto-logout after 30 minutes of inactivity
- **MFA Required:** For admin actions (anomaly deletion, detection rule changes)

### Data Security
- **Encryption in Transit:** All API calls use HTTPS/TLS 1.3
- **Encryption at Rest:** Anomaly data and comments encrypted in database
- **Data Masking:** Redact competitor anomalies in supplier view
- **Audit Logging:** Track all anomaly state changes, comments, deletions
- **Data Retention:** Anomaly data retained for 7 years per compliance requirements
- **API Security:** Implement rate limiting (100 requests/minute per user)

### Privacy & Compliance
- **GDPR Compliance:**
  - Allow users to request anomaly data deletion
  - Provide data export in machine-readable format
  - Anonymize user data in analytics
  - Obtain consent for email notifications
- **Data Minimization:** Collect only necessary anomaly information
- **Access Logging:** Log all access to sensitive anomaly data
- **Data Breach Response:** Notify affected users within 72 hours

### Input Validation & Sanitization
- **Comment Input:** Sanitize HTML/JavaScript to prevent XSS attacks
- **SQL Injection Prevention:** Use parameterized queries
- **CSRF Protection:** Implement CSRF tokens for state-changing operations
- **Input Length Limits:** Enforce maximum lengths (comments: 1000 chars, descriptions: 500 chars)

### Compliance Requirements
- **SOC 2 Type II:** Maintain security controls for anomaly data processing
- **ISO 27001:** Follow information security management standards
- **Audit Trail:** Maintain complete history of anomaly classifications and resolutions
- **Financial Regulations:** Track pricing anomalies for SOX compliance

## 11. Acceptance Criteria Summary

### Functional Acceptance Criteria (120 total)

#### Automated Anomaly Detection (8 criteria)
- [ ] All four anomaly types detected correctly (missing-data, low-confidence, outlier, inconsistency)
- [ ] Severity assignment follows defined rules (high/medium/low)
- [ ] Anomaly metadata complete (ID, timestamp, supplier, category, description, details, impact, action)
- [ ] Detection runs automatically after extraction completion
- [ ] Results stored in versioned snapshots
- [ ] Detection completes within 5 seconds per supplier
- [ ] False positive rate < 10%
- [ ] False negative rate < 5%

#### Summary Statistics Cards (8 criteria)
- [ ] All four cards display with correct counts (total, high, medium, low)
- [ ] Dynamic styling applies based on counts (colored when > 0, gray when = 0)
- [ ] Modified count badge shows when user reclassifies anomalies
- [ ] Counts update immediately when severity changed
- [ ] Color transitions smooth (300ms duration)
- [ ] Cards responsive on mobile (stack vertically)
- [ ] Text changes based on count (action text vs. "no issues" text)
- [ ] Animated transitions work without performance issues

#### Supplier Grouping (11 criteria)
- [ ] All suppliers display in alphabetical order
- [ ] Suppliers with zero anomalies show "No anomalies detected" message
- [ ] Color-coded borders match highest severity in group
- [ ] Background colors match severity theme
- [ ] Default expansion shows high/medium severity suppliers
- [ ] Low severity and no-anomaly suppliers collapsed by default
- [ ] Expansion state persists across page reloads
- [ ] "NO ISSUES" badge displays for zero-anomaly suppliers
- [ ] Hover effects apply to entire header
- [ ] Click toggles expansion correctly
- [ ] Keyboard navigation works (Tab, Enter, Space)

#### Anomaly Card Display (10 criteria)
- [ ] Anomaly cards display with correct indentation (ml-6)
- [ ] Left borders match severity colors
- [ ] All metadata badges display correctly
- [ ] Expand/collapse works on header click
- [ ] Default state shows all anomalies expanded
- [ ] Details section displays bullet list correctly
- [ ] Impact section uses severity-matched colors
- [ ] Recommended action shows with status badge
- [ ] Manual anomalies show delete button
- [ ] Auto-detected anomalies hide delete button

#### Three-Tier Severity Classification (12 criteria)
- [ ] All three severity options display with correct styling
- [ ] Radio button selection works correctly
- [ ] Descriptions explain consequences clearly
- [ ] "Send Follow-up Email" button appears when option selected
- [ ] Email content matches severity level (high/medium/low)
- [ ] Original severity displayed when different from current
- [ ] "User Modified" badge shows for changed anomalies
- [ ] "Reset to Original" button restores initial severity
- [ ] Summary cards update immediately when severity changed
- [ ] Supplier group badges update when anomaly severity changed
- [ ] Changes persist across page reloads
- [ ] Audit trail tracks all severity changes

#### Automated Follow-Up Email (12 criteria)
- [ ] mailto: link generates correctly with all fields
- [ ] Supplier email address looked up correctly
- [ ] CC includes RFQ agent email (rfq-agent@customer-domain.optiroq.com)
- [ ] Subject line includes category and RFQ number
- [ ] Email body includes all required sections
- [ ] Severity-specific consequences display correctly
- [ ] Action text reformatted to address supplier ("Please" instead of "Request supplier to")
- [ ] Comments included in email body when present
- [ ] Email button appears only when severity selected
- [ ] Button color matches severity level (red/yellow/blue)
- [ ] Clicking button opens email client
- [ ] Pre-populated content displays correctly in email client

#### Comment System (15 criteria)
- [ ] Comment section displays below severity selection
- [ ] Existing comments show in chronological order (newest first)
- [ ] Comment metadata displays correctly (author, timestamp)
- [ ] Multi-line text preserves formatting
- [ ] Delete button visible only to author (and admins)
- [ ] Textarea accepts multi-line input
- [ ] Placeholder text displays when empty
- [ ] "Add Comment" button disabled when input empty
- [ ] Ctrl+Enter submits comment
- [ ] Comments save immediately to database
- [ ] New comments display without page reload
- [ ] Delete confirmation dialog appears
- [ ] Deleted comments removed from list
- [ ] Audit trail tracks comment additions and deletions
- [ ] Comments included in follow-up emails when present

#### Manual Anomaly Creation (14 criteria)
- [ ] "Add manual anomaly" button displays under each supplier
- [ ] Button hover effect changes to blue theme
- [ ] Clicking button expands inline form
- [ ] All form fields display correctly (severity, type, category, description, details, impact, action)
- [ ] Required field validation works (severity, type, category, description)
- [ ] "Add Anomaly" button disabled until required fields filled
- [ ] Form submission creates new anomaly
- [ ] New anomaly displays immediately
- [ ] Anomaly card auto-expands after creation
- [ ] "Manual Entry" badge displays on card
- [ ] Delete button visible for manual anomalies
- [ ] Cancel button collapses form without saving
- [ ] Form inputs clear after submission or cancellation
- [ ] Audit trail tracks manual anomaly creation

#### Anomaly Deletion (9 criteria)
- [ ] Delete button visible only for manual anomalies
- [ ] Button styling matches design (red text, outline)
- [ ] Confirmation dialog appears on click
- [ ] Deletion requires explicit confirmation
- [ ] Anomaly removed from list immediately after confirmation
- [ ] Summary cards update counts correctly
- [ ] Supplier group badges update severity
- [ ] Database record deleted
- [ ] Audit trail records deletion

#### Snapshot/Versioning (12 criteria)
- [ ] Snapshot selector displays next to part selector
- [ ] All snapshot metadata shows correctly (version, timestamp, supplier, trigger event)
- [ ] "Latest" badge appears on most recent snapshot
- [ ] Change list displays with correct icons and colors
- [ ] Severity badges show for relevant changes
- [ ] Clicking snapshot loads historical data within 2 seconds
- [ ] Auto-snapshots created at specified events
- [ ] Snapshot comparison highlights changes
- [ ] Last 10 snapshots retained per RFQ
- [ ] Initial snapshot cannot be deleted
- [ ] Dropdown shows all available snapshots
- [ ] Loading indicator displays during switch

#### Multi-Part RFQ Navigation (8 criteria)
- [ ] Part selector displays in header
- [ ] Current part name shows in selector button
- [ ] Dropdown lists all parts with descriptions
- [ ] Checkmark shows on selected part
- [ ] Switching parts loads correct anomalies within 2 seconds
- [ ] Anomaly states persist across part switches
- [ ] Summary cards update for selected part
- [ ] Supplier groups update for selected part

#### Navigation and Actions (11 criteria)
- [ ] Action card displays at bottom with blue theme
- [ ] Next steps information shows clearly
- [ ] Both navigation buttons display
- [ ] "Review Extraction Data" navigates to Screen 20
- [ ] "View Comparison Dashboard" navigates to Screen 24
- [ ] "View Comparison Dashboard" disabled when high severity unresolved
- [ ] Disabled button tooltip explains blocking reason
- [ ] Button enables when high severity anomalies addressed
- [ ] Keyboard shortcuts work correctly (Alt+E, Alt+C)
- [ ] Progress indicator shows correct step
- [ ] Auto-save completes before navigation

### User Experience Acceptance Criteria (20 total)
- [ ] Severity-based color coding consistent (red/yellow/blue/green)
- [ ] Visual distinction clear between supplier groups and anomalies
- [ ] Loading states display for all async operations
- [ ] Success/error messages appear for comment submissions
- [ ] Severity change animations smooth (300ms duration)
- [ ] Hover tooltips display for complex terms
- [ ] Active selections highlighted (severity options, expanded cards)
- [ ] Confirmation dialogs appear for destructive actions
- [ ] Breadcrumb navigation shows current workflow position
- [ ] Progress indicator displays step number
- [ ] Quick links to related screens accessible
- [ ] Scroll position indicators visible for long lists
- [ ] Summary statistics prominently displayed
- [ ] Key insights highlighted (high severity, resolution progress)
- [ ] Responsive layout adapts to desktop, tablet, mobile
- [ ] Touch targets minimum 44x44px on mobile
- [ ] Swipe gestures work for mobile navigation
- [ ] Error messages clear with recovery suggestions
- [ ] Auto-save prevents data loss
- [ ] Undo functionality available ("Reset to Original")

### Performance Acceptance Criteria (10 total)
- [ ] Initial page load completes in < 2 seconds (up to 20 anomalies)
- [ ] Supplier group expansion animates in < 300ms
- [ ] Anomaly card expansion animates in < 300ms
- [ ] Comment submission saves in < 1 second
- [ ] Severity change updates UI in < 500ms
- [ ] Snapshot switching loads data in < 2 seconds
- [ ] Email generation completes in < 500ms
- [ ] Manual anomaly creation displays in < 1 second
- [ ] Auto-save completes in < 2 seconds (background)
- [ ] System supports up to 100 anomalies without performance degradation

### Security Acceptance Criteria (15 total)
- [ ] User authentication required for dashboard access
- [ ] Role-based access control enforced (Buyer, Manager, Admin, Supplier)
- [ ] Session auto-logout after 30 minutes of inactivity
- [ ] MFA required for admin actions (anomaly deletion, rule changes)
- [ ] All API calls use HTTPS/TLS 1.3
- [ ] Anomaly data and comments encrypted at rest
- [ ] Competitor anomalies masked in supplier view
- [ ] All state changes logged in audit trail
- [ ] API rate limiting enforced (100 requests/minute per user)
- [ ] Comment input sanitized to prevent XSS attacks
- [ ] CSRF tokens implemented for state-changing operations
- [ ] Input length limits enforced (comments: 1000 chars)
- [ ] SQL injection prevention via parameterized queries
- [ ] Security monitoring alerts for suspicious activity
- [ ] Data retention policy enforced (7 years)

---

## Total Acceptance Criteria: 165
- **Functional:** 120
- **User Experience:** 20
- **Performance:** 10
- **Security:** 15

---

## Document Metadata
- **Screen Number:** 25
- **Screen Name:** Anomalies Dashboard
- **Phase:** 4 (Analysis & Comparison)
- **Priority:** P0 (Critical)
- **Estimated Complexity:** High
- **Dependencies:** Screens 20, 21, 24
- **Document Version:** 1.0
- **Last Updated:** 2026-01-02
- **Author:** Product Requirements Team
- **Approvers:** Product Manager, Engineering Lead, UX Lead

