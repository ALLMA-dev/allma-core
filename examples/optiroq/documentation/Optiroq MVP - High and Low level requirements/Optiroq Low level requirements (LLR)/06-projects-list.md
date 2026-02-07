# Screen Requirements: Projects List (RFQs Overview)

## 1. Overview
- **Screen ID:** SCR-006
- **Component File:** `src/app/components/ProjectsList.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** Medium - Displays dynamic project attributes

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** see all my RFQs in one list with status indicators and key metrics  
**So that** I can quickly navigate to any project, track progress, and manage my workload

### Related User Stories
- **US-MVP-01:** Access Optiroq Portal
- **US-MVP-26A:** View Project-Level BOM Dashboard
- **Requirement 13:** Screen 11 - Projects List (RFQs Overview)

## 3. Screen Purpose & Context

### Purpose
This screen provides a comprehensive overview of all RFQ projects, enabling buyers to:
- View all projects in a centralized list with status indicators
- Monitor progress across multiple RFQs simultaneously
- Access project details and comparison dashboards
- Track supplier responses and identify issues
- Search, filter, and sort projects for efficient management

### Context
- **When user sees this:** 
  - After login (alternative landing screen to Project Initiation)
  - When clicking app logo/home button
  - After completing project workflows
  - When navigating from other screens via breadcrumbs
- **Why it exists:** 
  - Provide centralized project monitoring and management
  - Enable quick access to any project
  - Support workload tracking and prioritization
  - Identify projects requiring attention (pending reviews, anomalies)
- **Position in journey:** 
  - Alternative landing screen after authentication
  - Central hub for project navigation
  - Gateway to project details and analysis screens

### Key Characteristics
- **Comprehensive overview:** All projects visible with key metrics
- **Status tracking:** Visual indicators for Active, Completed, Pending Review, Draft
- **Progress monitoring:** Supplier response tracking and progress bars
- **Quick actions:** Direct access to project details, comparison, and management
- **Flexible views:** Grid and list view options (future enhancement)


## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Main Header Section**
   - Background: white with bottom border
   - Screen title: "Screen 11: Optiroq Portal - RFQs Overview" (demo only)
   - Subtitle: "Manage and track all your RFQ projects"
   - Portal title: "Optiroq Portal" (large, bold)
   - Portal subtitle: "Manage and track all your RFQ projects"

2. **Summary Statistics Bar**
   - Grid layout: 4 columns on desktop, 2 columns on tablet, 1 column on mobile
   - Four metric cards:
     - Total Projects (blue theme, Package icon)
     - Active RFQs (green theme, TrendingUp icon)
     - Total Suppliers (purple theme, Users icon)
     - Pending Review (orange theme, Calendar icon)

**Projects List Section:**
1. **Section Header**
   - Title: "All Projects"
   - Font: text-xl, bold, gray-900

2. **Project Cards**
   - Vertical stack with spacing
   - Each card contains:
     - Header with project ID, status badge, and optional click indicator
     - Project description
     - Part numbers and commodity information
     - Metrics grid (4 columns): Suppliers, Created date, Deadline, Progress
     - Progress bar with percentage

**Info Banner:**
- Blue background (#eff6ff)
- Navigation instructions for demo
- Explains clickable project

### 4.2 Key UI Elements

**Summary Statistics Cards:**
- **Total Projects Card:**
  - Icon: Package (blue #2563eb)
  - Count: Total number of projects
  - Label: "Total Projects"
  
- **Active RFQs Card:**
  - Icon: TrendingUp (green #16a34a)
  - Count: Projects with status = "Active"
  - Label: "Active RFQs"
  
- **Total Suppliers Card:**
  - Icon: Users (purple #9333ea)
  - Count: Sum of all suppliers across projects
  - Label: "Total Suppliers"
  
- **Pending Review Card:**
  - Icon: Calendar (orange #ea580c)
  - Count: Projects with status = "Pending Review"
  - Label: "Pending Review"

**Project Cards:**
- **Card Header:**
  - Project ID: text-lg, bold, monospace-style
  - Status badge: colored background and text
    - Active: green-100 bg, green-800 text
    - Completed: blue-100 bg, blue-800 text
    - Pending Review: yellow-100 bg, yellow-800 text
    - Draft: gray-100 bg, gray-800 text
  - Click indicator badge: "Click to view details →" (blue theme, outline)
  - Chevron right icon (blue, for clickable projects)

- **Project Description:**
  - Text: base size, gray-700
  - Truncated if too long

- **Metadata Row:**
  - Parts: Bold label + part numbers
  - Commodity: Bold label + commodity type
  - Separator: bullet point (•)

- **Metrics Grid:**
  - 4 columns: Suppliers, Created, Deadline, Progress
  - Labels: gray-600, small text
  - Values: gray-900, bold, small text
  - Progress: Progress bar + percentage

- **Progress Bar:**
  - Container: gray-200 background, rounded, height 2px
  - Fill: blue-600, rounded, dynamic width
  - Percentage: gray-900, bold, displayed next to bar

**Hover States:**
- Clickable cards: shadow-lg, border-blue-400
- Non-clickable cards: opacity-75, no hover effect
- Cursor: pointer for clickable, default for non-clickable

### 4.3 Information Hierarchy

**Primary Information:**
- Project ID and status
- Project description
- Progress percentage and status
- Summary statistics (total, active, pending)

**Secondary Information:**
- Part numbers and commodity
- Supplier count
- Created and deadline dates
- Total suppliers across all projects

**Tertiary Information:**
- Info banner with navigation instructions
- Detailed metrics in grid layout


## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| user_id | String | Authentication | Yes | UUID |
| user_email | String | Authentication | Yes | Valid email format |
| session_id | String | System | Yes | UUID |
| load_timestamp | DateTime | System | Yes | ISO 8601 |

### 5.2 Project Data Fields (Core)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_id | String | System/User | Yes | Unique, 3-50 characters (e.g., "RFQ-2025-047") |
| project_description | String | User | Yes | 2-500 characters |
| project_status | Enum | System | Yes | "active", "completed", "pending_review", "draft" |
| part_numbers | String | BOM/User | Yes | Comma-separated list |
| commodity | String | User | Yes | 2-100 characters |
| supplier_count | Number | Calculated | Yes | Integer, ≥0 |
| creation_date | Date | System | Yes | ISO 8601 date |
| deadline_date | Date | User | No | ISO 8601 date |
| progress_percentage | Number | Calculated | Yes | Integer, 0-100 |
| created_by | String | System | Yes | User ID |

### 5.3 Summary Statistics (Calculated)
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| total_projects_count | Count of all projects for user | All projects |
| active_rfqs_count | Count where status = "active" | project_status |
| total_suppliers_count | Sum of supplier_count across all projects | supplier_count |
| pending_review_count | Count where status = "pending_review" | project_status |
| completed_count | Count where status = "completed" | project_status |
| draft_count | Count where status = "draft" | project_status |

### 5.4 Display Data (Derived)
| Field Name | Data Type | Source | Format |
|------------|-----------|--------|--------|
| status_badge_color | String | project_status | CSS class (bg-green-100, etc.) |
| status_badge_text_color | String | project_status | CSS class (text-green-800, etc.) |
| progress_bar_width | String | progress_percentage | CSS percentage (e.g., "75%") |
| formatted_creation_date | String | creation_date | "MMM DD, YYYY" (e.g., "Dec 28, 2024") |
| formatted_deadline_date | String | deadline_date | "MMM DD, YYYY" (e.g., "Jan 15, 2025") |
| is_clickable | Boolean | project_id | true for specific projects (e.g., first project) |

### 5.5 Optional Fields (Future Enhancement)
| Field Name | Data Type | Purpose | Default Value |
|------------|-----------|---------|---------------|
| anomaly_count | Number | Number of detected anomalies | 0 |
| response_count | Number | Number of supplier responses received | 0 |
| file_count | Number | Number of uploaded files | 0 |
| last_modified | DateTime | Last modification timestamp | creation_date |
| platform_name | String | Platform/product name | null |
| customer_name | String | Customer name | null |


## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**Dynamic Project Attributes:**
- System displays project metadata from Master List configuration
- Core fields always present: Project ID, Description, Status, Parts, Commodity
- Optional fields: Platform, Customer, Deadline, Anomaly Count, Response Count
- Admin can add custom project attributes to Master List
- Buyer cannot add fields (only Admin can modify Master List)

**Project Status Types:**
- Standard statuses: Active, Completed, Pending Review, Draft
- Admin can configure additional custom statuses
- Status colors and icons configurable per organization
- Badge styling adapts to configured status types

**Commodity Types:**
- Standard commodities: Stamping, Welding, Injection Molding, Machining, Casting
- Admin can configure custom commodity types
- Commodity badges adapt to configured types

### 6.2 UI Adaptation Logic

**Card Display:**
- Cards adapt to available data fields
- Optional fields only shown if data exists
- Custom attributes displayed in expandable section (future)
- Progress calculation adapts to workflow configuration

**Summary Statistics:**
- Statistics cards adapt to configured status types
- Custom statuses get auto-generated cards with default colors
- Card order configurable by Admin
- Calculations update based on status configuration

**Responsive Layout:**
- Desktop: 4-column statistics grid, full project cards
- Tablet: 2-column statistics grid, full project cards
- Mobile: 1-column statistics grid, stacked project cards
- Grid adapts to screen size automatically

**Empty State:**
- Shows when no projects exist
- Provides clear call-to-action to create first project
- Adapts message based on user role

### 6.3 LLM Integration

**Smart Search (Future Enhancement):**
- LLM enhances search with semantic matching
- Matches synonyms and related terms
- Example: "aluminum bracket" matches "Al mounting component"
- Improves search accuracy beyond exact text matching

**Project Recommendations:**
- LLM suggests which projects need attention based on:
  - Approaching deadlines
  - Low response rates
  - Detected anomalies
  - Stalled progress
- Displayed as priority indicators on cards

**Anomaly Detection:**
- LLM analyzes project data for issues
- Flags projects with potential problems
- Provides explanations for detected anomalies
- Updates anomaly count in real-time

**Fallback Behavior:**
- If LLM unavailable: Use exact text matching for search
- If anomaly detection fails: Show manual review indicators
- System remains fully functional without LLM
- Core features never depend on LLM availability


## 7. User Interactions

### 7.1 Primary Actions

**Action: View Project Details**
- **Trigger:** User clicks on clickable project card (e.g., RFQ-2025-047)
- **Behavior:**
  1. Highlight card with visual feedback
  2. Navigate to RFQ Details screen
  3. Pass project_id as parameter
  4. Load project details and supplier information
- **Validation:** None
- **Success:** Navigate to RFQ Details screen
- **Error:** Display error toast if project not found
- **Navigation:** Projects List → RFQ Details

**Action: Hover Project Card**
- **Trigger:** User hovers over clickable project card
- **Behavior:**
  1. Increase shadow (shadow-lg)
  2. Change border color to blue-400
  3. Cursor changes to pointer
  4. Chevron icon becomes more prominent
- **Validation:** None
- **Success:** Visual feedback provided
- **Error:** N/A
- **Navigation:** None

**Action: View Summary Statistics**
- **Trigger:** User views statistics cards at page load
- **Behavior:**
  1. Calculate statistics from project data
  2. Display counts in large, bold text
  3. Show appropriate icons for each metric
  4. Update in real-time as projects change
- **Validation:** None
- **Success:** Statistics displayed accurately
- **Error:** Show "0" if calculation fails
- **Navigation:** None

**Action: Refresh Project List**
- **Trigger:** User refreshes page or returns to screen
- **Behavior:**
  1. Fetch latest project data from API
  2. Update project cards with new information
  3. Recalculate summary statistics
  4. Maintain scroll position if possible
  5. Show loading indicator during fetch
- **Validation:** None
- **Success:** Updated project list displayed
- **Error:** Display error toast, show cached data
- **Navigation:** None

**Action: Create New Project (Future Enhancement)**
- **Trigger:** User clicks "Create New RFQ" button
- **Behavior:**
  1. Navigate to Project Initiation screen
  2. Show new project options
  3. Pass context: source = "projects_list"
- **Validation:** None
- **Success:** Navigate to Project Initiation
- **Error:** N/A
- **Navigation:** Projects List → Project Initiation

### 7.2 Secondary Actions

**Action: View Non-Clickable Project**
- **Trigger:** User hovers over non-clickable project card
- **Behavior:**
  - No hover effects (opacity remains at 75%)
  - Cursor remains default (not pointer)
  - No visual feedback
  - Card appears disabled/inactive
- **Validation:** None
- **Success:** No action taken (expected behavior)
- **Error:** N/A
- **Navigation:** None

**Action: Scroll Project List**
- **Trigger:** User scrolls page
- **Behavior:**
  - Smooth scrolling through project cards
  - Header remains visible (sticky, future enhancement)
  - Statistics bar scrolls with content
  - Maintain scroll position on return
- **Validation:** None
- **Success:** Smooth scrolling experience
- **Error:** N/A
- **Navigation:** None

**Action: Resize Window**
- **Trigger:** User resizes browser window
- **Behavior:**
  - Responsive layout adapts immediately
  - Statistics grid adjusts columns (4→2→1)
  - Project cards maintain readability
  - No content overflow or clipping
- **Validation:** None
- **Success:** Layout adapts smoothly
- **Error:** N/A
- **Navigation:** None

### 7.3 Navigation

**From:**
- Login/Portal Access (alternative landing screen)
- Project Initiation (via app header logo)
- Any screen via app header logo/home button
- BOM Upload (via back button or cancel)
- The Split (via back button or cancel)
- RFQ Details (via back button or breadcrumb)

**To:**
- RFQ Details (via clickable project card)
- Project Initiation (via "Create New RFQ" button, future)
- Project Summary (via project card, future)
- Comparison Dashboard (via project card action, future)

**Exit Points:**
- Project card click → RFQ Details
- App header navigation → other main sections
- "Create New RFQ" button → Project Initiation (future)
- Browser back button → previous screen


## 8. Business Rules

### 8.1 Validation Rules

**User Authentication:**
- User must be authenticated to access screen
- Session must be valid (not expired)
- User must have buyer role (any function type)
- Error: Redirect to login if session invalid

**Project Access:**
- User can only see their own projects (created_by = user_id)
- Exception: Admin users can see all projects
- Exception: Shared projects (future enhancement)

**Project ID Format:**
- Format: "RFQ-YYYY-NNN" (e.g., "RFQ-2025-047")
- Year: Current or past year
- Number: Sequential, zero-padded to 3 digits
- Validation: Regex pattern `^RFQ-\d{4}-\d{3}$`

**Status Values:**
- Must be one of: "active", "completed", "pending_review", "draft"
- Case-insensitive matching
- Invalid status defaults to "draft"

**Progress Percentage:**
- Range: 0-100 (integer)
- Cannot be negative
- Cannot exceed 100
- Default: 0 for new projects

**Supplier Count:**
- Minimum: 0 (no suppliers assigned yet)
- Maximum: 100 (practical limit)
- Must be non-negative integer

### 8.2 Calculation Logic

**Total Projects Count:**
```
total_projects_count = COUNT(projects WHERE created_by = user_id)
```

**Active RFQs Count:**
```
active_rfqs_count = COUNT(projects WHERE created_by = user_id AND status = "active")
```

**Total Suppliers Count:**
```
total_suppliers_count = SUM(supplier_count) FOR ALL projects WHERE created_by = user_id
```

**Pending Review Count:**
```
pending_review_count = COUNT(projects WHERE created_by = user_id AND status = "pending_review")
```

**Status Badge Color:**
```
SWITCH project_status:
  CASE "active":
    background = green-100 (#dcfce7)
    text = green-800 (#166534)
  CASE "completed":
    background = blue-100 (#dbeafe)
    text = blue-800 (#1e40af)
  CASE "pending_review":
    background = yellow-100 (#fef9c3)
    text = yellow-800 (#854d0e)
  CASE "draft":
    background = gray-100 (#f3f4f6)
    text = gray-800 (#1f2937)
  DEFAULT:
    background = gray-100
    text = gray-800
```

**Progress Bar Width:**
```
progress_bar_width = progress_percentage + "%"
Constrain to 0-100%
```

**Date Formatting:**
```
formatted_date = FORMAT(date, "MMM DD, YYYY")
Example: "2024-12-28" → "Dec 28, 2024"
```

**Clickable Project Logic:**
```
is_clickable = (project_id === "RFQ-2025-047") OR (index === 0)
// Demo: Only first project is clickable
// Production: All projects clickable
```

### 8.3 Conditional Display Logic

**Summary Statistics Cards:**
- Always show all four cards
- Show count = 0 if no projects in that category
- Icons and colors fixed per card type
- No conditional hiding

**Project Cards:**
- Show if: `projects.length > 0`
- Show empty state if: `projects.length === 0`
- Show all projects (no pagination in current version)
- Order: Most recent first (by creation_date DESC)

**Clickable Indicator:**
- Show "Click to view details →" badge if: `is_clickable === true`
- Show chevron icon if: `is_clickable === true`
- Apply hover effects if: `is_clickable === true`
- Set opacity to 75% if: `is_clickable === false`

**Progress Bar:**
- Always show progress bar and percentage
- Bar width = progress_percentage
- Color: blue-600 (fixed)
- Show "0%" if progress_percentage = 0

**Info Banner:**
- Show in demo mode only
- Hide in production
- Explains navigation for demo purposes

**Part Numbers Display:**
- Show full list if ≤3 parts
- Truncate with "..." if >3 parts
- Full list visible on hover (tooltip, future)

### 8.4 Error Handling

**Authentication Error:**
- **Detection:** Session expired or invalid token
- **Handling:**
  - Redirect to login screen
  - Show message: "Session expired. Please log in again."
  - Preserve intended destination for post-login redirect

**Project Load Error:**
- **Detection:** API call fails or times out
- **Handling:**
  - Display error toast: "Failed to load projects. Please refresh the page."
  - Show retry button
  - Show cached projects if available
  - Log error for monitoring

**Statistics Calculation Error:**
- **Detection:** Calculation fails or returns invalid value
- **Handling:**
  - Show "0" for failed statistic
  - Log error for monitoring
  - Continue showing other statistics
  - Don't block UI rendering

**Navigation Error:**
- **Detection:** Target screen not found or unauthorized
- **Handling:**
  - Display error toast: "Unable to navigate. Please try again."
  - Stay on current screen
  - Log error for monitoring

**Data Inconsistency Error:**
- **Detection:** Project data missing required fields
- **Handling:**
  - Skip corrupted project (don't crash)
  - Log error with project_id
  - Show warning: "Some projects could not be displayed"
  - Provide support contact

**Network Error:**
- **Detection:** No internet connection or API unreachable
- **Handling:**
  - Display error banner: "Connection lost. Showing cached data."
  - Show cached projects if available
  - Disable refresh and navigation
  - Auto-retry when connection restored
  - Show success message when reconnected


## 9. Acceptance Criteria

### 9.1 Functional Criteria

1. WHEN user navigates to Projects List THEN screen SHALL display within 2 seconds
2. WHEN screen loads THEN summary statistics SHALL show correct counts
3. WHEN screen loads THEN all user's projects SHALL be displayed
4. WHEN screen loads THEN projects SHALL be ordered by creation date (newest first)
5. WHEN user hovers over clickable project card THEN card SHALL show hover effects
6. WHEN user clicks clickable project card THEN system SHALL navigate to RFQ Details
7. WHEN user hovers over non-clickable project card THEN no hover effects SHALL appear
8. WHEN user clicks non-clickable project card THEN no action SHALL occur
9. WHEN no projects exist THEN empty state SHALL be displayed
10. WHEN project status is "active" THEN badge SHALL be green
11. WHEN project status is "completed" THEN badge SHALL be blue
12. WHEN project status is "pending_review" THEN badge SHALL be yellow
13. WHEN project status is "draft" THEN badge SHALL be gray
14. WHEN progress is 0% THEN progress bar SHALL be empty
15. WHEN progress is 100% THEN progress bar SHALL be full
16. WHEN progress is 50% THEN progress bar SHALL be half-filled
17. WHEN supplier count is 0 THEN "0" SHALL be displayed
18. WHEN deadline is missing THEN deadline field SHALL show "N/A" or be hidden
19. WHEN part numbers exceed display space THEN text SHALL truncate with ellipsis
20. WHEN total projects count is calculated THEN it SHALL match number of displayed projects
21. WHEN active RFQs count is calculated THEN it SHALL match projects with "active" status
22. WHEN total suppliers count is calculated THEN it SHALL be sum of all supplier counts
23. WHEN pending review count is calculated THEN it SHALL match projects with "pending_review" status
24. WHEN user refreshes page THEN latest project data SHALL be fetched
25. WHEN project data updates THEN summary statistics SHALL recalculate
26. WHEN window is resized THEN layout SHALL adapt responsively
27. WHEN statistics grid is on mobile THEN it SHALL display in 1 column
28. WHEN statistics grid is on tablet THEN it SHALL display in 2 columns
29. WHEN statistics grid is on desktop THEN it SHALL display in 4 columns
30. WHEN info banner is in demo mode THEN it SHALL be visible

### 9.2 Flexibility Criteria

1. WHEN admin adds custom project status THEN new status SHALL appear in project cards
2. WHEN admin configures custom status colors THEN cards SHALL use configured colors
3. WHEN project has custom attributes THEN attributes SHALL be stored and retrievable
4. WHEN commodity types are configured THEN badges SHALL display configured types
5. WHEN optional fields are missing THEN UI SHALL adapt gracefully
6. WHEN LLM is unavailable THEN all core functionality SHALL remain operational
7. WHEN anomaly detection is enabled THEN anomaly counts SHALL be displayed
8. WHEN response tracking is enabled THEN response counts SHALL be displayed

### 9.3 UX Criteria

1. Screen loads within 2 seconds on standard broadband connection
2. Project cards display in consistent vertical stack
3. Summary statistics cards display in consistent grid layout
4. All interactive elements show clear hover states
5. Clickable projects have pointer cursor
6. Non-clickable projects have default cursor
7. Progress bars animate smoothly when displayed
8. Color coding is consistent (green=active, blue=completed, yellow=pending, gray=draft)
9. Typography is clear and readable (appropriate font sizes and weights)
10. Spacing is consistent throughout the screen
11. Mobile responsive design works on screens ≥320px width
12. Touch targets are ≥44px for mobile usability
13. Empty state provides clear call-to-action
14. Error messages are clear and actionable
15. Loading indicators show during data fetch

### 9.4 Performance Criteria

1. Initial page load completes within 2 seconds
2. Project list loads within 1 second
3. Statistics calculation completes within 500ms
4. Navigation to project details completes within 1 second
5. Hover effects respond within 100ms
6. Screen handles 100+ projects without performance degradation
7. Scroll performance remains smooth with large project lists
8. Memory usage remains stable during extended use
9. No memory leaks during navigation
10. Animations run at 60fps (smooth, no jank)

### 9.5 Accessibility Criteria

1. All interactive elements are keyboard accessible (tab navigation)
2. Focus indicators are clearly visible
3. Color is not the only means of conveying information
4. Text has sufficient contrast ratio (WCAG AA: 4.5:1 for normal text)
5. Screen reader announces all important information
6. Status badges have aria-labels describing status
7. Progress bars have aria-valuenow, aria-valuemin, aria-valuemax
8. Project cards have descriptive aria-labels
9. Icons have aria-labels or are marked as decorative
10. Error messages are announced to screen readers

### 9.6 Security Criteria

1. User can only access their own projects (unless admin)
2. Session validation occurs on page load
3. Expired sessions redirect to login
4. API calls include authentication tokens
5. Project IDs are validated before navigation
6. No sensitive data exposed in client-side code
7. XSS protection on all displayed text
8. CSRF protection on all state-changing actions
9. Rate limiting on API calls
10. Audit log records all project access


## 10. Edge Cases & Error Scenarios

### 10.1 Data Edge Cases

**No Projects Exist:**
- **Scenario:** New user with no projects
- **Handling:**
  - Show empty state with illustration
  - Message: "No RFQs Yet"
  - Description: "Create your first RFQ to get started"
  - Show "Create New RFQ" button (prominent)
  - Summary statistics show all zeros

**Single Project:**
- **Scenario:** User has only one project
- **Handling:**
  - Display single project card
  - Summary statistics show counts (1 in one status, 0 in others)
  - All functionality works normally
  - No special handling needed

**Very Long Project Description:**
- **Scenario:** Project description exceeds card space
- **Handling:**
  - Truncate description with ellipsis (...)
  - Show full description on hover (tooltip, future)
  - Limit to 2-3 lines in card
  - Full description visible in project details screen

**Very Long Project ID:**
- **Scenario:** Project ID exceeds expected length
- **Handling:**
  - Display full ID (no truncation for IDs)
  - Ensure monospace font maintains readability
  - Card width adjusts if needed
  - Validate ID format on backend

**Very Long Part Numbers List:**
- **Scenario:** Project has 10+ part numbers
- **Handling:**
  - Show first 3 part numbers
  - Add "..." to indicate more
  - Show full list on hover (tooltip, future)
  - Full list visible in project details screen

**Missing Deadline:**
- **Scenario:** Project has no deadline set
- **Handling:**
  - Show "N/A" in deadline field
  - Or hide deadline field entirely
  - No error or warning
  - Allow project to proceed normally

**Progress = 0%:**
- **Scenario:** Project just created, no progress
- **Handling:**
  - Show progress bar at 0% (empty)
  - Display "0%" text
  - Show "Draft" status
  - Normal display, no error

**Progress = 100%:**
- **Scenario:** Project completed
- **Handling:**
  - Show progress bar at 100% (full)
  - Display "100%" text
  - Show "Completed" status
  - Normal display, no error

**Zero Suppliers:**
- **Scenario:** Project has no suppliers assigned
- **Handling:**
  - Show "0" in suppliers field
  - No error or warning (valid for draft projects)
  - Allow project to proceed
  - Validation occurs when sending RFQs

**Large Number of Suppliers:**
- **Scenario:** Project has 50+ suppliers
- **Handling:**
  - Display count normally: "52"
  - No truncation needed
  - Full list visible in project details
  - Consider performance for very large counts (100+)

**All Projects Same Status:**
- **Scenario:** All projects are "Active" (or any single status)
- **Handling:**
  - Show correct counts in summary cards
  - Other status cards show 0
  - No error or warning
  - Normal display

**Mixed Status Projects:**
- **Scenario:** Projects have various statuses
- **Handling:**
  - Display each project with appropriate badge color
  - Summary statistics show correct distribution
  - No special handling needed
  - Normal display

**Very Old Projects:**
- **Scenario:** Projects from several years ago
- **Handling:**
  - Display creation date normally
  - No archiving or hiding
  - Allow access to all historical projects
  - Consider adding date range filter (future)

**Future Deadline:**
- **Scenario:** Deadline is far in the future (1+ year)
- **Handling:**
  - Display deadline date normally
  - No warning or error
  - Allow any future date
  - Validation on backend only

**Past Deadline:**
- **Scenario:** Current date > deadline date
- **Handling:**
  - Display deadline date normally (no "overdue" indicator in list view)
  - Overdue status visible in project details
  - No blocking or restrictions
  - Allow deadline to be updated

### 10.2 Interaction Edge Cases

**Rapid Card Clicks:**
- **Scenario:** User clicks project card multiple times quickly
- **Handling:**
  - Prevent duplicate navigation
  - Navigate only once
  - Disable card after first click
  - Re-enable if navigation fails

**Click Non-Clickable Card:**
- **Scenario:** User clicks card that's not interactive
- **Handling:**
  - No action taken (expected behavior)
  - No error message
  - No visual feedback
  - Cursor remains default

**Hover During Load:**
- **Scenario:** User hovers over card while data loading
- **Handling:**
  - Show loading state (skeleton or spinner)
  - Disable hover effects during load
  - Enable hover effects after load complete
  - No interaction until data loaded

**Scroll During Load:**
- **Scenario:** User scrolls while projects loading
- **Handling:**
  - Allow scrolling (don't lock)
  - Show loading indicators
  - Load projects in background
  - Maintain scroll position

**Resize Window During Display:**
- **Scenario:** User resizes browser window
- **Handling:**
  - Responsive layout adapts immediately
  - Grid columns adjust (4→2→1)
  - No content overflow or clipping
  - Maintain scroll position

**Browser Back Button:**
- **Scenario:** User clicks browser back button
- **Handling:**
  - Return to previous screen
  - Preserve Projects List state (if returning)
  - No data loss
  - Normal browser behavior

**Refresh During Display:**
- **Scenario:** User refreshes page (F5 or Ctrl+R)
- **Handling:**
  - Reload all project data
  - Reset to default state
  - Fetch latest data from API
  - Show loading indicator

**Navigate Away and Return:**
- **Scenario:** User navigates to another screen and returns
- **Handling:**
  - Reload project data (check for updates)
  - Maintain scroll position if possible
  - Show any new projects
  - Update statistics

### 10.3 System Edge Cases

**Session Expires During Use:**
- **Scenario:** User's session expires while viewing screen
- **Handling:**
  - Detect expired session on next API call
  - Show modal: "Session expired. Please log in again."
  - Redirect to login after confirmation
  - Preserve intended action for post-login redirect

**API Timeout:**
- **Scenario:** Project load API call times out (>10 seconds)
- **Handling:**
  - Show error toast: "Loading projects is taking longer than expected"
  - Provide retry button
  - Show cached projects if available
  - Log timeout for monitoring

**Partial Data Load:**
- **Scenario:** Some projects load, others fail
- **Handling:**
  - Display successfully loaded projects
  - Show warning: "Some projects could not be loaded"
  - Provide retry button for failed projects
  - Log errors for monitoring

**Concurrent Updates:**
- **Scenario:** Project status changes while user viewing screen
- **Handling:**
  - Poll for updates every 30 seconds (configurable)
  - Update project cards in real-time
  - Show notification: "Project X status updated"
  - Maintain user's current scroll position

**Network Disconnection:**
- **Scenario:** User loses internet connection
- **Handling:**
  - Show banner: "Connection lost. Showing cached data."
  - Disable navigation and refresh
  - Allow viewing cached projects
  - Auto-retry connection every 10 seconds
  - Show success message when reconnected

**Slow Network:**
- **Scenario:** User on slow connection (2G/3G)
- **Handling:**
  - Show loading indicators
  - Load critical data first (statistics, first 5 projects)
  - Lazy load remaining projects
  - Optimize payload sizes
  - Provide feedback on load progress

**Browser Compatibility:**
- **Scenario:** User on unsupported browser
- **Handling:**
  - Detect browser version on load
  - Show warning if unsupported
  - Provide graceful degradation (basic functionality)
  - Recommend supported browsers

**JavaScript Disabled:**
- **Scenario:** User has JavaScript disabled
- **Handling:**
  - Show message: "JavaScript required for Optiroq"
  - Provide instructions to enable JavaScript
  - No functionality available (SPA requires JS)

**Large Dataset (100+ Projects):**
- **Scenario:** User has accumulated 100+ projects
- **Handling:**
  - Implement virtual scrolling for performance
  - Load projects in batches (50 at a time)
  - Maintain smooth performance
  - Consider pagination or infinite scroll
  - Add search and filter capabilities (future)

**Corrupted Project Data:**
- **Scenario:** Project data is malformed or missing required fields
- **Handling:**
  - Skip corrupted projects (don't crash)
  - Log errors for investigation
  - Show warning: "Some projects could not be displayed"
  - Provide support contact for data recovery
  - Continue displaying valid projects

**Statistics Calculation Overflow:**
- **Scenario:** Total suppliers count exceeds display space
- **Handling:**
  - Format large numbers with commas (e.g., "1,234")
  - Use abbreviations for very large numbers (e.g., "1.2K")
  - Ensure card layout doesn't break
  - Full number visible on hover (tooltip)


## 11. Backend API Requirements

### 11.1 API Endpoints

**GET /api/v1/projects**
- **Purpose:** Retrieve all projects for authenticated user
- **Authentication:** Required (Bearer token)
- **Query Parameters:**
  - `user_id` (optional): Filter by user (admin only)
  - `status` (optional): Filter by status
  - `limit` (optional): Number of projects to return (default: 100)
  - `offset` (optional): Pagination offset (default: 0)
  - `sort` (optional): Sort field and direction (default: "creation_date:desc")
- **Response:** 200 OK
  ```json
  {
    "projects": [
      {
        "project_id": "RFQ-2025-047",
        "project_description": "Aluminum Mounting Bracket for Door Assembly",
        "part_numbers": "ALU-BRACKET-001, ALU-BRACKET-002",
        "commodity": "Stamping",
        "project_status": "active",
        "supplier_count": 4,
        "creation_date": "2024-12-28",
        "deadline_date": "2025-01-15",
        "progress_percentage": 75,
        "created_by": "user-123"
      }
    ],
    "total_count": 5,
    "has_more": false
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: User not authorized
  - 500 Internal Server Error: Server error

**GET /api/v1/projects/statistics**
- **Purpose:** Retrieve project count statistics by status
- **Authentication:** Required (Bearer token)
- **Query Parameters:**
  - `user_id` (optional): Filter by user (admin only)
- **Response:** 200 OK
  ```json
  {
    "total_projects": 5,
    "active_rfqs": 2,
    "total_suppliers": 20,
    "pending_review": 1,
    "completed": 1,
    "draft": 1,
    "last_updated": "2025-01-02T10:00:00Z"
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 500 Internal Server Error: Server error

**GET /api/v1/projects/:project_id**
- **Purpose:** Retrieve detailed information for specific project
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `project_id` (required): Unique project identifier
- **Response:** 200 OK
  ```json
  {
    "project_id": "RFQ-2025-047",
    "project_description": "Aluminum Mounting Bracket for Door Assembly",
    "part_numbers": "ALU-BRACKET-001, ALU-BRACKET-002",
    "commodity": "Stamping",
    "project_status": "active",
    "supplier_count": 4,
    "creation_date": "2024-12-28",
    "deadline_date": "2025-01-15",
    "progress_percentage": 75,
    "created_by": "user-123",
    "platform_name": "Model X",
    "customer_name": "Acme Corp",
    "parts": [...],
    "rfqs": [...],
    "suppliers": [...]
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: User not authorized to access this project
  - 404 Not Found: Project not found
  - 500 Internal Server Error: Server error

### 11.2 Data Models

**Project Model:**
```typescript
interface Project {
  // Core fields
  project_id: string;                    // Unique identifier (e.g., "RFQ-2025-047")
  project_description: string;           // Project description
  part_numbers: string;                  // Comma-separated list
  commodity: string;                     // Commodity type
  project_status: ProjectStatus;         // Current status
  supplier_count: number;                // Number of suppliers
  creation_date: string;                 // ISO 8601 date
  deadline_date?: string;                // ISO 8601 date (optional)
  progress_percentage: number;           // 0-100
  created_by: string;                    // User ID
  
  // Optional fields
  platform_name?: string;                // Platform/product name
  customer_name?: string;                // Customer name
  last_modified?: string;                // ISO 8601 datetime
  
  // Future enhancements
  anomaly_count?: number;                // Number of detected anomalies
  response_count?: number;               // Number of supplier responses
  file_count?: number;                   // Number of uploaded files
  
  // Relationships
  parts?: Part[];                        // Associated parts
  rfqs?: RFQ[];                          // Associated RFQs
  suppliers?: Supplier[];                // Associated suppliers
  
  // Flexibility
  custom_attributes?: Record<string, any>; // Dynamic custom fields
}

enum ProjectStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  PENDING_REVIEW = "pending_review",
  DRAFT = "draft"
}

interface ProjectStatistics {
  total_projects: number;
  active_rfqs: number;
  total_suppliers: number;
  pending_review: number;
  completed: number;
  draft: number;
  last_updated: string;                  // ISO 8601 datetime
}

interface ProjectListResponse {
  projects: Project[];
  total_count: number;
  has_more: boolean;
}
```

### 11.3 Caching Strategy

**Client-Side Caching:**
- Cache project list for 5 minutes
- Cache statistics for 2 minutes
- Invalidate cache on:
  - Project creation
  - Project status change
  - Manual refresh action
  - Session change

**Server-Side Caching:**
- Cache project statistics (Redis, 1 minute TTL)
- Cache project list (Redis, 2 minutes TTL)
- Invalidate on data mutations

**Optimistic Updates:**
- Update UI immediately on user actions
- Sync with backend in background
- Rollback on error
- Show sync status indicator

### 11.4 Real-Time Updates

**WebSocket Connection:**
- Establish WebSocket on screen load
- Subscribe to project updates for user
- Receive real-time notifications:
  - Project status changes
  - New projects created
  - Project deletions
  - Supplier responses received
  - Progress updates

**Update Handling:**
```typescript
interface ProjectUpdateEvent {
  event_type: "project_created" | "project_updated" | "project_deleted";
  project_id: string;
  updated_fields?: Partial<Project>;
  timestamp: string;
}

// Client handles update
onProjectUpdate(event: ProjectUpdateEvent) {
  switch (event.event_type) {
    case "project_created":
      // Add new project to list
      // Update statistics
      // Show notification
      break;
    case "project_updated":
      // Update project in list
      // Update statistics if status changed
      // Show notification
      break;
    case "project_deleted":
      // Remove project from list
      // Update statistics
      // Show notification
      break;
  }
}
```

**Polling Fallback:**
- If WebSocket unavailable: poll every 30 seconds
- Poll /api/v1/projects/statistics for count changes
- If count changed: fetch full project list
- Show "Updates available" notification

### 11.5 Error Handling

**Network Errors:**
- Retry failed requests (exponential backoff: 1s, 2s, 4s)
- Max 3 retries
- Show error toast after final failure
- Provide manual retry button

**Authentication Errors:**
- 401 Unauthorized: Redirect to login
- 403 Forbidden: Show access denied message
- Refresh token if expired (if refresh token available)

**Validation Errors:**
- 400 Bad Request: Show specific error message
- Log error details for monitoring

**Server Errors:**
- 500 Internal Server Error: Show generic error message
- Log error details for monitoring
- Provide retry option
- Show cached data if available

**Timeout Handling:**
- Request timeout: 10 seconds
- Show loading indicator after 2 seconds
- Show "taking longer than expected" after 5 seconds
- Cancel request and show error after 10 seconds

---

## 12. Notes & Considerations

### 12.1 Design Decisions

**Vertical Card Stack:**
- Rationale: Easier to scan than grid layout for list view
- Each card shows comprehensive information
- Consistent card height improves readability
- Mobile-friendly (no horizontal scrolling)

**Summary Statistics at Top:**
- Rationale: Provides quick overview before diving into details
- Four key metrics cover most common questions
- Icon + color coding aids quick recognition
- Always visible (no scrolling needed)

**Clickable vs Non-Clickable Cards:**
- Rationale: Demo limitation (only first project clickable)
- Production: All projects should be clickable
- Visual distinction (opacity, hover effects) shows interactivity
- Clear indicator badge for clickable projects

**No Pagination:**
- Rationale: Current version shows all projects
- Suitable for users with <100 projects
- Future: Add pagination or infinite scroll for large datasets
- Virtual scrolling for performance with 100+ projects

**No Search/Filter:**
- Rationale: MVP focuses on core functionality
- Future enhancement: Add search by project ID, description, parts
- Future enhancement: Add filter by status, commodity, date range
- Future enhancement: Add sort by various fields

### 12.2 Future Enhancements

**Search and Filter:**
- Search by project ID, description, part numbers, commodity
- Filter by status, commodity, date range, supplier count
- Multi-select filters
- Save filter presets
- Clear all filters button

**Sorting Options:**
- Sort by creation date (newest/oldest)
- Sort by deadline (soonest/latest)
- Sort by progress (highest/lowest)
- Sort by supplier count
- Sort by project ID (alphabetical)
- Sort by status

**View Options:**
- Grid view (current)
- List view (table format)
- Compact view (more projects per screen)
- Detailed view (expanded cards)
- Toggle between views

**Bulk Actions:**
- Select multiple projects
- Bulk status change
- Bulk export
- Bulk archive
- Bulk delete (with confirmation)

**Quick Actions:**
- "View Comparison" button on card
- "Edit RFQ" button on card
- "Clone RFQ" button on card
- "Export Data" button on card
- More menu with additional actions

**Advanced Features:**
- Anomaly indicators on cards
- Response tracking (X of Y suppliers responded)
- File count indicators
- Last modified timestamp
- Project tags/labels
- Project notes/comments
- Favorite/pin projects

**Analytics:**
- Project completion time trends
- Average supplier count
- Status distribution chart
- Commodity distribution chart
- Timeline view

### 12.3 Dependencies

**Required Screens:**
- Login/Portal Access (prerequisite)
- RFQ Details (navigation target)
- Project Initiation (navigation target, future)
- Project Summary (navigation target, future)

**Required APIs:**
- Authentication API
- Projects API
- Statistics API

**Required Services:**
- WebSocket service (for real-time updates)
- Caching service (Redis)

**External Dependencies:**
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Lucide React (icons)
- shadcn/ui components

### 12.4 Testing Considerations

**Unit Tests:**
- Statistics calculation logic
- Status badge color mapping
- Progress bar width calculation
- Date formatting
- Clickable project logic

**Integration Tests:**
- API integration (projects, statistics)
- WebSocket connection and updates
- Authentication flow
- Navigation between screens

**E2E Tests:**
- Complete user journey: login → view projects → click project → view details
- Empty state display
- Error handling scenarios
- Real-time updates

**Performance Tests:**
- Load time with 100+ projects
- Scroll performance with large lists
- Real-time update handling
- Memory leak detection

**Accessibility Tests:**
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

**Browser Compatibility Tests:**
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)
- Responsive design (320px - 2560px)

---

**Document Version:** 1.0  
**Last Updated:** January 2, 2026  
**Author:** Requirements Team  
**Status:** Complete - Ready for Development
