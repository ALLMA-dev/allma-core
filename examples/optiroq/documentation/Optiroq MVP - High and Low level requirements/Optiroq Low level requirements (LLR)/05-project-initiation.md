# Screen Requirements: Project Initiation

## 1. Overview
- **Screen ID:** SCR-005
- **Component File:** `src/app/components/ProjectInitiation.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** Medium - Supports dynamic project attributes

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** choose how to start a new project and review my current projects  
**So that** I can efficiently initiate RFQs using the method that best fits my situation

### Related User Stories
- **US-MVP-01:** Access Optiroq Portal
- **US-MVP-02A:** Create RFQ Manually from Scratch
- **US-MVP-02B:** Duplicate Existing RFQ with Modifications
- **US-MVP-02C:** Create RFQ from Uploaded Files (Auto-Parsing)
- **US-MVP-26A:** View Project-Level BOM Dashboard

## 3. Screen Purpose & Context

### Purpose
This is the primary landing screen after login, serving as the central hub for project management. It enables buyers to:
- Start new projects using one of three methods (Upload BOM, Clone Existing, Create From Scratch)
- Review and monitor current projects across all statuses
- Search and filter projects by status and keywords
- Access project details and continue work on existing projects

### Context
- **When user sees this:** 
  - Immediately after successful login
  - When clicking app logo/home button from any screen
  - After completing a project workflow
- **Why it exists:** 
  - Provide flexible project initiation options (60-70% time savings via cloning)
  - Enable quick access to active projects
  - Support different buyer workflows and preferences
  - Centralize project management and monitoring
- **Position in journey:** 
  - First screen after authentication
  - Gateway to all project workflows
  - Return point from other screens

### Key Characteristics
- **Three initiation methods:** Upload BOM (most common for 10+ parts), Clone Existing (60-70% of projects), Create From Scratch (1-5 parts)
- **Collapsible new project section:** Reduces clutter, focuses on current work
- **Real-time project overview:** Search, filter, and monitor all projects
- **Status-based filtering:** Quick access to Active, Pending Review, Completed, Draft projects
- **Progressive loading:** "See more" functionality for large project lists


## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Title:** "Screen 1: Project Initiation - Choose Method" (demo only - production: "Project Initiation")
2. **Subtitle:** "Start a new project or review your current ones"

**Collapsible New Project Section:**
1. **Toggle Button (Divider)**
   - Centered button with horizontal divider lines
   - Green background (#16a34a)
   - Text: "Start a New Project" (collapsed) / "Hide New Project Options" (expanded)
   - Chevron icons indicating state (down/up)

2. **Welcome Card (when expanded)**
   - Gradient background (blue-50 to white)
   - Title: "Create New Project"
   - Description: "Choose one of three methods to start your new sourcing project"

3. **Three Method Cards (when expanded)**
   - Grid layout: 3 columns on desktop, 1 column on mobile
   - Each card contains:
     - Icon circle (64px, colored background)
     - Method title
     - Description
     - "Best for" section (gray background)
     - "Time Savings" or "Flexibility" highlight (green/blue background)
     - Action button with chevron

4. **Info Banner (when expanded)**
   - Blue background (#eff6ff)
   - Tip icon (💡)
   - Usage statistics and recommendations

5. **Method Comparison Table (when expanded)**
   - Card with table showing:
     - Method name with icon
     - Setup time
     - Best use cases
     - Usage percentage

**Current Projects Section:**
1. **Section Header**
   - Title: "Current Projects"
   - Subtitle: "Quick overview of your active and recent projects"

2. **Search Bar**
   - Full-width input with search icon
   - Placeholder: "Search by project number or description..."
   - Clear button (X) when text entered

3. **Summary Statistics Cards (5 cards)**
   - Grid layout: 5 columns on desktop, 2-3 columns on tablet, 1 column on mobile
   - Each card shows:
     - Colored icon circle
     - Count (large number)
     - Label (Total, Active, Pending Review, Completed, Draft)
   - Clickable for filtering
   - Active filter highlighted with ring and background color

4. **Project Cards Grid**
   - Grid layout: 2 columns on desktop, 1 column on mobile
   - Each card displays:
     - Project ID (monospace font)
     - Status badge (colored)
     - Project description
     - Progress bar with percentage
     - Supplier count
     - Deadline date
     - Days remaining (if applicable)
   - Hover effect and click interaction for specific projects

5. **See More Button**
   - Centered below project cards
   - Shows remaining count
   - Loads 4 more projects per click

### 4.2 Key UI Elements

**Toggle Button:**
- Green background (#16a34a), white text
- Hover: darker green (#15803d), shadow effect
- Chevron icons on both sides
- Smooth transition animation

**Method Cards:**
- White background, border
- Hover: shadow lift, colored border (blue/purple/green)
- Icon circle: 64px diameter, colored background
- Action button: full width, colored (blue/purple/green)
- Cursor: pointer on entire card

**Method 1 - Upload BOM:**
- Icon: Upload (blue #2563eb)
- Button: Blue background
- Best for: New projects with existing BOM, 10-100+ parts
- Time Savings: "Auto-classifies existing vs new parts"

**Method 2 - Clone Existing:**
- Icon: Copy (purple #9333ea)
- Button: Purple background
- Best for: Similar to previous RFQ, same suppliers
- Time Savings: "60-70% faster than from scratch"

**Method 3 - Create From Scratch:**
- Icon: PlusCircle (green #16a34a)
- Button: Green background
- Best for: Single or few parts, unique requirements
- Flexibility: "Complete control over all fields"

**Search Input:**
- Left icon: Search (gray)
- Right icon: Clear X (when text entered)
- Border: gray, focus: blue ring
- Full width, responsive

**Summary Cards:**
- **Total Projects:** Blue theme, TrendingUp icon
- **Active:** Green theme, CheckCircle2 icon
- **Pending Review:** Yellow theme, Clock icon
- **Completed:** Purple theme, CheckCircle2 icon
- **Draft:** Gray theme, AlertCircle icon
- Active filter: ring-2 with colored ring, colored background

**Project Cards:**
- White background, border, rounded corners
- Hover: shadow-md effect
- Project ID: monospace font, bold, gray-900
- Status badge: colored background and text
  - Active: green-100 bg, green-800 text
  - Completed: blue-100 bg, blue-800 text
  - Pending Review: yellow-100 bg, yellow-800 text
  - Draft: gray-100 bg, gray-800 text
- Progress bar: colored based on percentage
  - 100%: blue
  - 75-99%: green
  - 50-74%: yellow
  - <50%: orange
- Days remaining: orange text if ≤7 days

**See More Button:**
- Outline style, gray text
- Shows remaining count
- Chevron down icon
- Hover: gray background

### 4.3 Information Hierarchy

**Primary Information:**
- Three project initiation methods (when expanded)
- Current project cards with status and progress
- Project search and filtering
- Summary statistics

**Secondary Information:**
- Method comparison table
- Usage statistics and tips
- Project details (suppliers, deadline, days remaining)
- Search functionality

**Tertiary Information:**
- Method descriptions and best use cases
- Time savings highlights
- Info banner tips


## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| user_id | String | Authentication | Yes | UUID |
| user_email | String | Authentication | Yes | Valid email format |
| user_name | String | User Profile | Yes | 2-100 characters |
| user_function | Enum | User Profile | Yes | "commodity_buyer", "project_buyer", "sourcing_buyer", "advanced_sourcing_buyer" |
| login_timestamp | DateTime | System | Yes | ISO 8601 |
| session_id | String | System | Yes | UUID |

### 5.2 Project Data Fields (Core)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_id | String | System/User | Yes | Unique, 3-50 characters |
| project_description | String | User | Yes | 2-500 characters |
| project_status | Enum | System | Yes | "active", "completed", "pending_review", "draft" |
| creation_date | DateTime | System | Yes | ISO 8601 |
| last_modified | DateTime | System | Yes | ISO 8601 |
| progress_percentage | Number | Calculated | Yes | Integer, 0-100 |
| supplier_count | Number | Calculated | Yes | Integer, ≥0 |
| deadline_date | Date | User | No | ISO 8601 date |
| days_remaining | Number | Calculated | No | Integer, can be negative |
| created_by | String | System | Yes | User ID |

### 5.3 Project Statistics (Calculated)
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| total_projects_count | Count of all projects for user | All projects |
| active_projects_count | Count where status = "active" | project_status |
| pending_review_count | Count where status = "pending_review" | project_status |
| completed_projects_count | Count where status = "completed" | project_status |
| draft_projects_count | Count where status = "draft" | project_status |
| days_remaining | (deadline_date - current_date).days | deadline_date, current_date |
| progress_percentage | Based on workflow completion | Workflow stage data |

### 5.4 UI State Fields (Client-Side)
| Field Name | Data Type | Default Value | Purpose |
|------------|-----------|---------------|---------|
| isNewProjectExpanded | Boolean | false | Toggle new project section visibility |
| visibleProjectsCount | Number | 4 | Number of projects currently displayed |
| statusFilter | Enum | "All" | Current status filter ("All", "Active", "Completed", "Pending Review", "Draft") |
| searchQuery | String | "" | Current search text |
| filteredProjects | Array | [] | Projects matching current filters |

### 5.5 Method Comparison Data (Static)
| Method | Setup Time | Best For | Usage Percentage |
|--------|-----------|----------|------------------|
| Upload BOM | ~2 minutes | 10-100+ parts | 20-30% of projects |
| Clone Existing | ~3 minutes | Similar projects | 60-70% of projects |
| From Scratch | ~5 minutes | 1-5 parts | 10-20% of projects |


## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**Dynamic Project Attributes:**
- System displays project metadata from Master List configuration
- Core fields always present: Project ID, Description, Status, Deadline
- Optional fields: Platform, Customer, Location, SOP Date, Project Manager
- Admin can add custom project attributes to Master List
- Buyer cannot add fields (only Admin can modify Master List)

**Project Status Types:**
- Standard statuses: Active, Completed, Pending Review, Draft
- Admin can configure additional custom statuses
- Status colors and icons configurable per organization

**User Function Types:**
- Four standard buyer functions: Commodity, Project, Sourcing, Advanced Sourcing
- Function determines default project views and permissions
- Admin can configure function-specific workflows

### 6.2 UI Adaptation Logic

**Project Card Display:**
- Cards adapt to available data fields
- Optional fields only shown if data exists
- Custom attributes displayed in expandable section
- Progress calculation adapts to workflow configuration

**Search and Filter:**
- Search matches against all text fields (ID, description, custom attributes)
- Filter options adapt to configured status types
- Custom status filters appear automatically

**Summary Statistics:**
- Statistics cards adapt to configured status types
- Custom statuses get auto-generated cards with default colors
- Card order configurable by Admin

**Progressive Loading:**
- Initial load: 4 projects
- "See more" increments: 4 projects per click
- Configurable per organization (default: 4)

### 6.3 LLM Integration

**Project Similarity Detection (for Clone method):**
- LLM analyzes project attributes when cloning
- Calculates similarity score (0-100%)
- Suggests which fields to review/update
- Warns if similarity is too high (potential duplicate)

**Smart Search:**
- LLM enhances search with semantic matching
- Matches synonyms and related terms
- Example: "aluminum bracket" matches "Al mounting component"
- Improves search accuracy beyond exact text matching

**Project Recommendations:**
- LLM suggests which initiation method to use based on:
  - User's past behavior
  - Project complexity indicators
  - Part count estimates
- Displayed as subtle hints in method cards

**Fallback Behavior:**
- If LLM unavailable: Use exact text matching for search
- If similarity detection fails: Allow clone without warnings
- System remains fully functional without LLM


## 7. User Interactions

### 7.1 Primary Actions

**Action: Toggle New Project Section**
- **Trigger:** User clicks "Start a New Project" / "Hide New Project Options" button
- **Behavior:**
  1. Toggle `isNewProjectExpanded` state
  2. If expanding:
     - Animate section slide-in from top (300ms)
     - Fade in content
     - Update button text and icons
  3. If collapsing:
     - Animate section slide-out
     - Update button text and icons
  4. Smooth scroll to keep button in view
- **Validation:** None
- **Success:** Section expands/collapses smoothly
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Select Upload BOM Method**
- **Trigger:** User clicks "Upload BOM" card or button
- **Behavior:**
  1. Highlight card with visual feedback
  2. Navigate to BOM Upload screen
  3. Pass context: method = "upload_bom"
- **Validation:** None
- **Success:** Navigate to BOM Upload screen
- **Error:** N/A
- **Navigation:** Project Initiation → BOM Upload

**Action: Select Clone Existing Method**
- **Trigger:** User clicks "Clone Project" card or button
- **Behavior:**
  1. Highlight card with visual feedback
  2. Navigate to Clone Project screen
  3. Show list of existing projects to clone
  4. Pass context: method = "clone_existing"
- **Validation:** None
- **Success:** Navigate to Clone Project screen
- **Error:** N/A
- **Navigation:** Project Initiation → Clone Project Selection

**Action: Select Create From Scratch Method**
- **Trigger:** User clicks "Create New" card or button
- **Behavior:**
  1. Highlight card with visual feedback
  2. Navigate to Create From Scratch screen
  3. Show empty project form
  4. Pass context: method = "from_scratch"
- **Validation:** None
- **Success:** Navigate to Create From Scratch screen
- **Error:** N/A
- **Navigation:** Project Initiation → Manual Project Creation

**Action: Search Projects**
- **Trigger:** User types in search input field
- **Behavior:**
  1. Update `searchQuery` state on each keystroke
  2. Filter projects in real-time (debounced 300ms)
  3. Match against: project_id, project_description
  4. Case-insensitive matching
  5. Update project cards display
  6. Show "No projects found" if no matches
  7. Show clear button (X) when text entered
  8. Reset `visibleProjectsCount` to 4
- **Validation:** None
- **Success:** Filtered projects displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Clear Search**
- **Trigger:** User clicks clear button (X) in search field
- **Behavior:**
  1. Clear `searchQuery` state
  2. Remove filter
  3. Show all projects (respecting status filter)
  4. Hide clear button
  5. Reset `visibleProjectsCount` to 4
- **Validation:** None
- **Success:** All projects displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Filter by Status**
- **Trigger:** User clicks summary statistics card (Total, Active, Pending Review, Completed, Draft)
- **Behavior:**
  1. Update `statusFilter` state
  2. Highlight selected card with ring and background
  3. Filter projects by selected status
  4. If "All" selected: show all projects
  5. Maintain search filter if active
  6. Update project cards display
  7. Reset `visibleProjectsCount` to 4
- **Validation:** None
- **Success:** Filtered projects displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: View Project Details**
- **Trigger:** User clicks on project card (specific projects only, e.g., PRJ-2025-001)
- **Behavior:**
  1. Highlight card with visual feedback
  2. Navigate to Project Summary or RFQs Overview screen
  3. Pass project_id as parameter
  4. Load project details
- **Validation:** None
- **Success:** Navigate to project details screen
- **Error:** Display error toast if project not found
- **Navigation:** Project Initiation → Project Summary / RFQs Overview

**Action: See More Projects**
- **Trigger:** User clicks "See more" button
- **Behavior:**
  1. Increment `visibleProjectsCount` by 4
  2. Load next 4 projects from filtered list
  3. Smooth scroll to new projects
  4. Update button text with remaining count
  5. Hide button if all projects visible
- **Validation:** None
- **Success:** More projects displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

### 7.2 Secondary Actions

**Action: Hover Method Card**
- **Trigger:** User hovers over method card
- **Behavior:** 
  - Increase shadow (shadow-lg)
  - Change border color to method color
  - Lighten icon background
  - Cursor changes to pointer
- **Validation:** None
- **Success:** Visual feedback provided
- **Error:** N/A
- **Navigation:** None

**Action: Hover Project Card**
- **Trigger:** User hovers over project card
- **Behavior:** 
  - Increase shadow (shadow-md)
  - Cursor changes to pointer (if clickable)
  - Subtle scale effect
- **Validation:** None
- **Success:** Visual feedback provided
- **Error:** N/A
- **Navigation:** None

**Action: Hover Summary Card**
- **Trigger:** User hovers over summary statistics card
- **Behavior:** 
  - Increase shadow
  - Lighten background
  - Cursor changes to pointer
- **Validation:** None
- **Success:** Visual feedback provided
- **Error:** N/A
- **Navigation:** None

### 7.3 Navigation

**From:**
- Login/Portal Access (after successful authentication)
- Any screen via app header logo/home button
- Project completion workflows

**To:**
- BOM Upload (via Upload BOM method)
- Clone Project Selection (via Clone Existing method)
- Manual Project Creation (via Create From Scratch method)
- Project Summary (via project card click)
- RFQs Overview (via specific project card click)

**Exit Points:**
- Method selection buttons → respective workflow screens
- Project cards → project detail screens
- App header navigation → other main sections


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

**Search Query:**
- No minimum length requirement
- Maximum length: 200 characters
- Special characters allowed
- No validation errors (graceful handling)

**Status Filter:**
- Must be one of: "All", "Active", "Completed", "Pending Review", "Draft"
- Invalid status defaults to "All"
- Case-insensitive matching

**Visible Projects Count:**
- Minimum: 4 projects
- Increment: 4 projects per "See more" click
- Maximum: Total filtered projects count
- Cannot exceed available projects

### 8.2 Calculation Logic

**Days Remaining:**
```
IF deadline_date exists:
  days_remaining = (deadline_date - current_date).days
  IF days_remaining < 0:
    display as "X days overdue"
  ELSE:
    display as "X days left"
ELSE:
  days_remaining = null (not displayed)
```

**Progress Percentage:**
```
Based on workflow stage completion:
- Draft: 0-20%
- BOM uploaded: 20-30%
- RFQs sent: 30-50%
- Quotes received: 50-70%
- Analysis complete: 70-90%
- Pending review: 90-95%
- Completed: 100%

Calculated from workflow_stage and completion_flags
```

**Progress Bar Color:**
```
IF progress_percentage = 100:
  color = blue (#2563eb)
ELSE IF progress_percentage >= 75:
  color = green (#16a34a)
ELSE IF progress_percentage >= 50:
  color = yellow (#ca8a04)
ELSE:
  color = orange (#ea580c)
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
```

**Days Remaining Alert:**
```
IF days_remaining <= 7 AND days_remaining > 0:
  display_color = orange (#ea580c)
  show_alert_icon = true
ELSE:
  display_color = gray (#6b7280)
  show_alert_icon = false
```

### 8.3 Conditional Display Logic

**New Project Section:**
- Show expanded if: `isNewProjectExpanded === true`
- Show collapsed if: `isNewProjectExpanded === false`
- Default: collapsed (false)

**Method Cards:**
- Always show all three methods
- No conditional hiding based on user function
- All methods available to all buyer types

**Summary Statistics Cards:**
- Always show all five cards (Total, Active, Pending Review, Completed, Draft)
- Highlight active filter with ring and background
- Show count = 0 if no projects in that status

**Project Cards:**
- Show if: `filteredProjects.length > 0`
- Show "No projects found" if: `filteredProjects.length === 0`
- Show only first `visibleProjectsCount` projects
- Show "See more" button if: `visibleProjectsCount < filteredProjects.length`

**Days Remaining:**
- Show if: `deadline_date !== null AND status !== "completed"`
- Hide if: project completed or no deadline set
- Show alert icon if: `days_remaining <= 7`

**Clear Search Button:**
- Show if: `searchQuery.length > 0`
- Hide if: `searchQuery === ""`

**Clickable Project Cards:**
- Specific projects clickable (e.g., PRJ-2025-001)
- Show "Click to view →" badge for clickable projects
- Cursor: pointer for clickable, default for non-clickable
- Hover effects only on clickable projects

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
  - Log error for monitoring
  - Keep UI functional (show cached data if available)

**Search Error:**
- **Detection:** Search query causes backend error
- **Handling:**
  - Fall back to client-side filtering
  - Log error for monitoring
  - Continue showing projects (graceful degradation)

**Filter Error:**
- **Detection:** Invalid status filter value
- **Handling:**
  - Default to "All" filter
  - Log warning
  - Continue showing all projects

**Navigation Error:**
- **Detection:** Target screen not found or unauthorized
- **Handling:**
  - Display error toast: "Unable to navigate. Please try again."
  - Stay on current screen
  - Log error for monitoring

**Network Error:**
- **Detection:** No internet connection or API unreachable
- **Handling:**
  - Display error banner: "Connection lost. Some features may be unavailable."
  - Show cached project data if available
  - Disable method selection buttons
  - Provide retry option
  - Auto-retry when connection restored


## 9. Acceptance Criteria

### 9.1 Functional Criteria

1. WHEN user logs in successfully THEN Project Initiation screen SHALL display within 2 seconds
2. WHEN screen loads THEN new project section SHALL be collapsed by default
3. WHEN screen loads THEN current projects section SHALL display all user's projects
4. WHEN screen loads THEN summary statistics SHALL show correct counts for each status
5. WHEN user clicks "Start a New Project" button THEN section SHALL expand with animation
6. WHEN new project section expands THEN three method cards SHALL be visible
7. WHEN user clicks "Hide New Project Options" button THEN section SHALL collapse with animation
8. WHEN user clicks "Upload BOM" card THEN system SHALL navigate to BOM Upload screen
9. WHEN user clicks "Clone Project" card THEN system SHALL navigate to Clone Project Selection screen
10. WHEN user clicks "Create New" card THEN system SHALL navigate to Manual Project Creation screen
11. WHEN user types in search field THEN projects SHALL filter in real-time (300ms debounce)
12. WHEN user clears search THEN all projects SHALL be displayed (respecting status filter)
13. WHEN user clicks summary statistics card THEN projects SHALL filter by that status
14. WHEN user clicks "All" card THEN all projects SHALL be displayed
15. WHEN user clicks project card (if clickable) THEN system SHALL navigate to project details
16. WHEN user clicks "See more" button THEN 4 additional projects SHALL be displayed
17. WHEN all projects are visible THEN "See more" button SHALL be hidden
18. WHEN no projects match filters THEN "No projects found" message SHALL be displayed
19. WHEN no projects match filters THEN "Clear filters" button SHALL be displayed
20. WHEN user clicks "Clear filters" THEN search and status filter SHALL reset to defaults
21. WHEN project has deadline ≤7 days THEN days remaining SHALL be displayed in orange with alert icon
22. WHEN project is overdue THEN "X days overdue" SHALL be displayed
23. WHEN project has no deadline THEN days remaining SHALL not be displayed
24. WHEN project status is "completed" THEN days remaining SHALL not be displayed
25. WHEN user hovers over method card THEN card SHALL show hover effects (shadow, border)
26. WHEN user hovers over project card THEN card SHALL show hover effects (shadow)
27. WHEN user hovers over summary card THEN card SHALL show hover effects
28. WHEN active filter is selected THEN summary card SHALL show ring and background highlight
29. WHEN search query is entered THEN clear button (X) SHALL be visible
30. WHEN search query is empty THEN clear button SHALL be hidden

### 9.2 Flexibility Criteria

1. WHEN admin adds custom project status THEN new status SHALL appear in summary cards
2. WHEN admin configures custom status colors THEN cards SHALL use configured colors
3. WHEN project has custom attributes THEN attributes SHALL be searchable
4. WHEN user function changes THEN appropriate project views SHALL be displayed
5. WHEN LLM suggests project method THEN subtle hint SHALL be displayed in method card
6. WHEN LLM is unavailable THEN search SHALL fall back to exact text matching
7. WHEN LLM is unavailable THEN all core functionality SHALL remain operational
8. WHEN progressive loading increment is configured THEN "See more" SHALL load configured count

### 9.3 UX Criteria

1. Screen loads within 2 seconds on standard broadband connection
2. New project section expands/collapses smoothly with 300ms animation
3. Search filtering responds within 300ms of last keystroke
4. Status filtering responds immediately (<100ms)
5. Project cards display in consistent grid layout (2 columns desktop, 1 column mobile)
6. Method cards display in consistent grid layout (3 columns desktop, 1 column mobile)
7. Summary cards display in consistent grid layout (5 columns desktop, responsive on mobile)
8. All interactive elements show clear hover states
9. All buttons have appropriate cursor (pointer for clickable)
10. Progress bars animate smoothly when displayed
11. Color coding is consistent (green=active, blue=completed, yellow=pending, gray=draft)
12. Typography is clear and readable (appropriate font sizes and weights)
13. Spacing is consistent throughout the screen
14. Mobile responsive design works on screens ≥320px width
15. Touch targets are ≥44px for mobile usability

### 9.4 Performance Criteria

1. Initial page load completes within 2 seconds
2. Project list loads within 1 second
3. Search filtering completes within 300ms
4. Status filtering completes within 100ms
5. "See more" loading completes within 500ms
6. Navigation to next screen completes within 1 second
7. Animations run at 60fps (smooth, no jank)
8. Screen handles 100+ projects without performance degradation
9. Search handles 1000+ projects efficiently
10. Memory usage remains stable during extended use

### 9.5 Accessibility Criteria

1. All interactive elements are keyboard accessible (tab navigation)
2. Focus indicators are clearly visible
3. Color is not the only means of conveying information
4. Text has sufficient contrast ratio (WCAG AA: 4.5:1 for normal text)
5. Screen reader announces all important information
6. Form inputs have associated labels
7. Buttons have descriptive aria-labels
8. Status badges have aria-labels describing status
9. Progress bars have aria-valuenow, aria-valuemin, aria-valuemax
10. Error messages are announced to screen readers

### 9.6 Security Criteria

1. User can only access their own projects (unless admin)
2. Session validation occurs on page load
3. Expired sessions redirect to login
4. API calls include authentication tokens
5. Project IDs are validated before navigation
6. No sensitive data exposed in client-side code
7. XSS protection on search input
8. CSRF protection on all state-changing actions
9. Rate limiting on search API calls
10. Audit log records all project access


## 10. Edge Cases & Error Scenarios

### 10.1 Data Edge Cases

**No Projects Exist:**
- **Scenario:** New user with no projects
- **Handling:**
  - Show empty state message: "No projects yet. Start your first project above!"
  - Show new project section expanded by default
  - Hide summary statistics or show all zeros
  - Provide clear call-to-action to create first project

**Single Project:**
- **Scenario:** User has only one project
- **Handling:**
  - Display single project card
  - Hide "See more" button
  - Show summary statistics with counts (1 in one status, 0 in others)
  - All filtering works normally

**Very Long Project Description:**
- **Scenario:** Project description exceeds card space
- **Handling:**
  - Truncate description with ellipsis (...)
  - Show full description on hover (tooltip)
  - Limit to 2-3 lines in card
  - Full description visible in project details screen

**Very Long Project ID:**
- **Scenario:** Project ID exceeds expected length
- **Handling:**
  - Truncate with ellipsis if >20 characters
  - Show full ID on hover (tooltip)
  - Ensure monospace font maintains readability
  - Full ID visible in project details screen

**Missing Deadline:**
- **Scenario:** Project has no deadline set
- **Handling:**
  - Hide "days remaining" section
  - Show "No deadline set" in project details (not on card)
  - No alert icons or warnings
  - Allow project to proceed normally

**Past Deadline:**
- **Scenario:** Current date > deadline date
- **Handling:**
  - Show "X days overdue" in red text
  - Show alert icon
  - Do not block project access
  - Allow deadline to be updated

**Progress = 0%:**
- **Scenario:** Project just created, no progress
- **Handling:**
  - Show progress bar at 0% (orange color)
  - Display "0%" text
  - Show "Draft" status
  - Encourage user to continue setup

**Progress = 100%:**
- **Scenario:** Project completed
- **Handling:**
  - Show progress bar at 100% (blue color)
  - Display "100%" text
  - Show "Completed" status
  - Hide days remaining
  - Allow viewing but not editing (read-only)

**Zero Suppliers:**
- **Scenario:** Project has no suppliers assigned
- **Handling:**
  - Show "0 suppliers"
  - No error or warning (valid for draft projects)
  - Allow project to proceed
  - Validation occurs when sending RFQs

**Large Number of Suppliers:**
- **Scenario:** Project has 20+ suppliers
- **Handling:**
  - Display count normally: "23 suppliers"
  - No truncation needed
  - Full list visible in project details

**All Projects Same Status:**
- **Scenario:** All projects are "Active" (or any single status)
- **Handling:**
  - Show correct counts in summary cards
  - Other status cards show 0
  - Filtering still works (shows all or none)
  - No error or warning

**Search Returns No Results:**
- **Scenario:** Search query matches no projects
- **Handling:**
  - Show "No projects match your search criteria"
  - Show "Clear filters" button
  - Keep search query visible
  - Allow user to modify search or clear

**Search with Special Characters:**
- **Scenario:** User enters special characters (!@#$%^&*)
- **Handling:**
  - Treat as literal characters (no regex interpretation)
  - Escape special characters for safety
  - Search works normally
  - No errors or crashes

### 10.2 Interaction Edge Cases

**Rapid Toggle of New Project Section:**
- **Scenario:** User clicks toggle button multiple times quickly
- **Handling:**
  - Debounce toggle action (prevent animation conflicts)
  - Complete current animation before starting new one
  - Ignore clicks during animation
  - Smooth user experience

**Rapid Status Filter Changes:**
- **Scenario:** User clicks multiple status cards quickly
- **Handling:**
  - Cancel previous filter operation
  - Apply latest filter immediately
  - Update UI to show latest selection
  - No race conditions or stale data

**Search While Filtering:**
- **Scenario:** User types search while status filter active
- **Handling:**
  - Apply both filters simultaneously (AND logic)
  - Show projects matching both search AND status
  - Clear button clears search only (status filter remains)
  - "Clear filters" button clears both

**Click "See More" at End of List:**
- **Scenario:** User clicks "See more" when only 1-3 projects remain
- **Handling:**
  - Load remaining projects (even if <4)
  - Hide "See more" button
  - Smooth scroll to new projects
  - No error or blank space

**Navigate Away During Load:**
- **Scenario:** User clicks method card while projects still loading
- **Handling:**
  - Cancel pending project load requests
  - Navigate immediately to selected screen
  - No blocking or waiting
  - Clean up resources

**Double-Click Method Card:**
- **Scenario:** User double-clicks method card
- **Handling:**
  - Prevent duplicate navigation
  - Navigate only once
  - Disable card after first click
  - Re-enable if navigation fails

**Click Project Card During Filter:**
- **Scenario:** User clicks project card while filter is processing
- **Handling:**
  - Allow navigation immediately
  - Don't wait for filter to complete
  - Cancel filter operation
  - Navigate to project details

**Resize Window During Display:**
- **Scenario:** User resizes browser window
- **Handling:**
  - Responsive layout adapts immediately
  - Grid columns adjust (3→2→1 for methods, 2→1 for projects)
  - No content overflow or clipping
  - Maintain scroll position

**Scroll During "See More" Load:**
- **Scenario:** User scrolls while new projects loading
- **Handling:**
  - Allow scrolling (don't lock)
  - Load projects in background
  - Append to list when ready
  - Maintain user's scroll position

**Browser Back Button:**
- **Scenario:** User clicks browser back button
- **Handling:**
  - If came from login: log out or show confirmation
  - If came from other screen: return to that screen
  - Preserve Project Initiation state (filters, search)
  - No data loss

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
  - Maintain user's current filters and scroll position

**Network Disconnection:**
- **Scenario:** User loses internet connection
- **Handling:**
  - Show banner: "Connection lost. Showing cached data."
  - Disable method selection buttons
  - Allow viewing cached projects
  - Auto-retry connection every 10 seconds
  - Show success message when reconnected

**Slow Network:**
- **Scenario:** User on slow connection (2G/3G)
- **Handling:**
  - Show loading indicators
  - Load critical data first (summary stats, first 4 projects)
  - Lazy load remaining projects
  - Optimize image sizes
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

**Large Dataset (1000+ Projects):**
- **Scenario:** User has accumulated 1000+ projects
- **Handling:**
  - Implement virtual scrolling for performance
  - Load projects in batches (50 at a time)
  - Optimize search with backend filtering
  - Maintain smooth performance
  - Consider pagination or date range filters

**Corrupted Project Data:**
- **Scenario:** Project data is malformed or missing required fields
- **Handling:**
  - Skip corrupted projects (don't crash)
  - Log errors for investigation
  - Show warning: "Some projects could not be displayed"
  - Provide support contact for data recovery


## 11. Backend API Requirements

### 11.1 API Endpoints

**GET /api/v1/projects**
- **Purpose:** Retrieve all projects for authenticated user
- **Authentication:** Required (Bearer token)
- **Query Parameters:**
  - `user_id` (optional): Filter by user (admin only)
  - `status` (optional): Filter by status ("active", "completed", "pending_review", "draft")
  - `search` (optional): Search query string
  - `limit` (optional): Number of projects to return (default: 50)
  - `offset` (optional): Pagination offset (default: 0)
- **Response:** 200 OK
  ```json
  {
    "projects": [
      {
        "project_id": "PRJ-2025-001",
        "project_description": "Aluminum Mounting Bracket for Door Assembly",
        "project_status": "active",
        "creation_date": "2024-12-15T10:30:00Z",
        "last_modified": "2025-01-01T14:22:00Z",
        "progress_percentage": 75,
        "supplier_count": 4,
        "deadline_date": "2025-01-15",
        "created_by": "user-123",
        "platform_name": "Model X",
        "customer_name": "Acme Corp",
        "delivery_location": "Detroit, MI"
      }
    ],
    "total_count": 12,
    "has_more": false
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: User not authorized to access projects
  - 500 Internal Server Error: Server error

**GET /api/v1/projects/statistics**
- **Purpose:** Retrieve project count statistics by status
- **Authentication:** Required (Bearer token)
- **Query Parameters:**
  - `user_id` (optional): Filter by user (admin only)
- **Response:** 200 OK
  ```json
  {
    "total_projects": 12,
    "active_projects": 5,
    "pending_review_projects": 2,
    "completed_projects": 3,
    "draft_projects": 2,
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
    "project_id": "PRJ-2025-001",
    "project_description": "Aluminum Mounting Bracket for Door Assembly",
    "project_status": "active",
    "creation_date": "2024-12-15T10:30:00Z",
    "last_modified": "2025-01-01T14:22:00Z",
    "progress_percentage": 75,
    "supplier_count": 4,
    "deadline_date": "2025-01-15",
    "created_by": "user-123",
    "platform_name": "Model X",
    "customer_name": "Acme Corp",
    "delivery_location": "Detroit, MI",
    "parts": [...],
    "rfqs": [...],
    "custom_attributes": {...}
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: User not authorized to access this project
  - 404 Not Found: Project not found
  - 500 Internal Server Error: Server error

**POST /api/v1/projects/search**
- **Purpose:** Advanced search with semantic matching (LLM-powered)
- **Authentication:** Required (Bearer token)
- **Request Body:**
  ```json
  {
    "query": "aluminum bracket",
    "status_filter": "active",
    "use_semantic_search": true,
    "limit": 50,
    "offset": 0
  }
  ```
- **Response:** 200 OK (same format as GET /api/v1/projects)
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 400 Bad Request: Invalid search parameters
  - 500 Internal Server Error: Server error

**GET /api/v1/user/profile**
- **Purpose:** Retrieve authenticated user profile
- **Authentication:** Required (Bearer token)
- **Response:** 200 OK
  ```json
  {
    "user_id": "user-123",
    "email": "sarah.chen@company.com",
    "name": "Sarah Chen",
    "function": "project_buyer",
    "company": "Acme Corp",
    "preferences": {
      "default_currency": "EUR",
      "language": "en"
    }
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 500 Internal Server Error: Server error

### 11.2 Data Models

**Project Model:**
```typescript
interface Project {
  // Core fields
  project_id: string;                    // Unique identifier
  project_description: string;           // Project description
  project_status: ProjectStatus;         // Current status
  creation_date: string;                 // ISO 8601 datetime
  last_modified: string;                 // ISO 8601 datetime
  created_by: string;                    // User ID
  
  // Calculated fields
  progress_percentage: number;           // 0-100
  supplier_count: number;                // Number of suppliers
  
  // Optional fields
  deadline_date?: string;                // ISO 8601 date
  platform_name?: string;                // Platform/product name
  customer_name?: string;                // Customer name
  delivery_location?: string;            // Delivery location
  sop_date?: string;                     // Start of production date
  project_manager?: string;              // Project manager name
  
  // Relationships
  parts?: Part[];                        // Associated parts
  rfqs?: RFQ[];                          // Associated RFQs
  
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
  active_projects: number;
  pending_review_projects: number;
  completed_projects: number;
  draft_projects: number;
  last_updated: string;                  // ISO 8601 datetime
}

interface ProjectListResponse {
  projects: Project[];
  total_count: number;
  has_more: boolean;
}
```

**User Model:**
```typescript
interface User {
  user_id: string;
  email: string;
  name: string;
  function: BuyerFunction;
  company: string;
  preferences: UserPreferences;
}

enum BuyerFunction {
  COMMODITY_BUYER = "commodity_buyer",
  PROJECT_BUYER = "project_buyer",
  SOURCING_BUYER = "sourcing_buyer",
  ADVANCED_SOURCING_BUYER = "advanced_sourcing_buyer"
}

interface UserPreferences {
  default_currency: string;              // "EUR", "USD", etc.
  language: string;                      // "en", "es", "fr", etc.
  projects_per_page?: number;            // Default: 4
  default_status_filter?: string;        // Default: "All"
}
```

### 11.3 Caching Strategy

**Client-Side Caching:**
- Cache project list for 5 minutes
- Cache statistics for 2 minutes
- Cache user profile for session duration
- Invalidate cache on:
  - Project creation
  - Project status change
  - Manual refresh action
  - Session change

**Server-Side Caching:**
- Cache project statistics (Redis, 1 minute TTL)
- Cache user profile (Redis, 5 minutes TTL)
- Cache search results (Redis, 30 seconds TTL)
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
- Highlight invalid fields
- Provide correction guidance

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

**Collapsible New Project Section:**
- Rationale: Reduces visual clutter, focuses user on current work
- Most users (60-70%) clone existing projects, don't need constant visibility
- Toggle button provides clear affordance
- Default collapsed state emphasizes project monitoring over creation

**Three Method Cards:**
- Rationale: Clear visual distinction between initiation methods
- Icon + color coding aids quick recognition
- "Best for" and "Time Savings" sections guide method selection
- Equal visual weight prevents bias toward any method

**Progressive Loading (4 projects at a time):**
- Rationale: Balances initial load time with content visibility
- 4 projects fit well on most screens without scrolling
- "See more" provides control over data loading
- Reduces initial API payload size

**Status-Based Filtering:**
- Rationale: Most common filtering need for buyers
- Summary cards double as filter buttons (efficient UI)
- Visual feedback (ring + background) shows active filter
- Counts provide quick project status overview

**Real-Time Search:**
- Rationale: Immediate feedback improves UX
- 300ms debounce balances responsiveness with API load
- Client-side filtering for small datasets (<50 projects)
- Server-side filtering for large datasets (>50 projects)

### 12.2 Future Enhancements

**Advanced Filtering:**
- Filter by date range (creation date, deadline)
- Filter by supplier count
- Filter by progress percentage
- Multi-select status filtering
- Save custom filter presets

**Sorting Options:**
- Sort by creation date (newest/oldest)
- Sort by deadline (soonest/latest)
- Sort by progress (highest/lowest)
- Sort by supplier count
- Sort by project ID (alphabetical)

**Bulk Actions:**
- Select multiple projects
- Bulk status change
- Bulk export
- Bulk delete (with confirmation)

**Project Templates:**
- Save project as template
- Create project from template
- Template library (organization-wide)
- Template categories (by commodity, customer, etc.)

**Dashboard Widgets:**
- Upcoming deadlines widget
- Recent activity feed
- Project health indicators
- Cost savings metrics

**Collaboration Features:**
- Share projects with colleagues
- Project comments and notes
- @mention notifications
- Activity timeline

**Analytics:**
- Project completion time trends
- Method usage analytics
- Success rate by method
- Time savings metrics

### 12.3 Dependencies

**Required Screens:**
- Login/Portal Access (prerequisite)
- BOM Upload (navigation target)
- Clone Project Selection (navigation target)
- Manual Project Creation (navigation target)
- Project Summary (navigation target)
- RFQs Overview (navigation target)

**Required APIs:**
- Authentication API
- Projects API
- User Profile API
- Search API (optional, for semantic search)

**Required Services:**
- WebSocket service (for real-time updates)
- Caching service (Redis)
- LLM service (optional, for semantic search)

**External Dependencies:**
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Lucide React (icons)
- shadcn/ui components

### 12.4 Testing Considerations

**Unit Tests:**
- Filter logic (status, search)
- Calculation logic (days remaining, progress color)
- State management (toggle, pagination)
- Data transformations

**Integration Tests:**
- API integration (projects, statistics, search)
- WebSocket connection and updates
- Authentication flow
- Navigation between screens

**E2E Tests:**
- Complete user journey: login → view projects → select method → navigate
- Search and filter workflows
- Progressive loading
- Error handling scenarios

**Performance Tests:**
- Load time with 100+ projects
- Search performance with 1000+ projects
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
