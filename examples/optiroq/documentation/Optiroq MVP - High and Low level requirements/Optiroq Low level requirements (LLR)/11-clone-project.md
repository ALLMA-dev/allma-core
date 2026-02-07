# Screen Requirements: Clone Project

## 1. Overview
- **Screen ID:** SCR-011
- **Component File:** `src/app/components/CloneProject.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - Project Initiation (3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** High - Preserves all dynamic fields from original project

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** duplicate an existing project with all its parts and configurations  
**So that** I save 60-70% of time on similar projects and maintain consistency

### Related User Stories
- **US-MVP-01B:** Clone Existing Project with Modifications
- **REQ-MVP-00A:** BOM Upload & Project Initialization (Enhanced)
- **REQ-MVP-00B:** "The Split" - Existing vs New Parts Classification

## 3. Screen Purpose & Context

### Purpose
This screen allows buyers to select a previous project to clone, providing:
- Search and filter through past projects
- View project details (parts, suppliers, dates, status, commodity)
- Select project to duplicate with all data pre-filled
- Save 60-70% of setup time (from ~10 minutes to ~3-4 minutes)
- Reuse BOM, suppliers, requirements, and configurations
- Option to edit parts before proceeding

### Context
- **When user sees this:** 
  - After selecting "Clone Existing Project" method from Project Initiation
  - When creating similar project to previous work
  - Common method (60-70% of projects use this approach)
- **Why it exists:** 
  - Most projects reuse same parts and suppliers
  - Massive time savings (60-70% reduction in setup time)
  - Reduce repetitive data entry
  - Maintain consistency across similar projects
  - Key selling point of the product
- **Position in journey:** 
  - After Project Initiation (Method Selection)
  - Before The Split (parts classification)
  - Most popular path (60-70% usage)

### Key Characteristics
- **Search functionality:** Find projects by ID, description, or commodity
- **Project list:** Display all previous projects with key details
- **Status indicators:** Visual badges for Completed, Active
- **Quick selection:** Click card to select project
- **Time savings:** 60-70% reduction in setup time
- **Pre-fill all data:** Parts, suppliers, requirements, configurations
- **Edit option:** Choose to edit parts before proceeding


## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Title:** "Screen 3: Project Initiation - Method 2: Clone Existing Project"
2. **Subtitle:** "Select a previous project to duplicate and modify"

**Main Content (2-column layout):**

**Left Column (2/3 width):**
1. **Project Selection Card**
   - Card Header: "Select Project to Clone"
   - Description: "Choose from your recent projects. All data will be pre-filled and editable."
   - Search bar with icon
   - Scrollable project list (max-height: 500px)
   - Empty state if no matches

**Right Column (1/3 width):**
1. **Clone Configuration Card**
   - Card Header: "Clone Configuration" with Copy icon
   - Description: Changes based on selection state
   - New Project ID input field
   - "What will be cloned" info box (purple theme)
   - "Edit parts before proceeding" checkbox option (blue theme)
   - Clone button (purple, full width)
   - Time savings info box (green theme)

**Bottom:**
1. **Info Banner**
   - Purple background
   - Tip about cloning benefits and usage statistics

### 4.2 Key UI Elements

**Page Header:**
- Title: text-3xl, font-bold, gray-900
- Subtitle: text-gray-600, mt-2

**Search Bar:**
- Icon: Search (absolute left, gray-400, size-4)
- Input: pl-10 (padding for icon)
- Placeholder: "Search by project ID, description, or commodity..."
- Real-time filtering on change

**Project Cards:**
- **Card Structure:**
  - Border: gray-200 (default), purple-400 (selected)
  - Background: white (default), purple-50 (selected)
  - Cursor: pointer
  - Hover: border-gray-400, shadow-sm
  - Selected: shadow-md
  - Padding: pt-4

- **Card Content:**
  - Project ID: font-mono, text-sm, font-semibold, gray-900
  - Status badge: outline variant, text-xs
  - Selected badge: purple-600, with CheckCircle2 icon
  - Description: text-sm, font-medium, gray-900, mb-2
  - Metadata grid: 2 columns, gap-3, text-xs, gray-600
  - Icons: Package, Users, Calendar (size-3)
  - Commodity: font-medium
  - Selected checkmark: size-6, purple-600 (top-right)

**Clone Configuration Card:**
- **Header:**
  - Icon: Copy (size-5, purple-600)
  - Title: "Clone Configuration"
  - Description: Dynamic based on selection

- **New Project ID Field:**
  - Label: "New Project ID"
  - Input: Auto-generated value (PRJ-2025-002)
  - Help text: "Auto-generated, but you can customize it"

- **What Will Be Cloned Box:**
  - Background: purple-50
  - Border: purple-200
  - Title: font-semibold, purple-900
  - List items: CheckCircle2 icon (purple-600) + text (purple-800)
  - Items: Parts count, Suppliers count, Requirements, Field configs, Commodity

- **Edit Option Box:**
  - Background: blue-50
  - Border: blue-200
  - Checkbox with label
  - Icon: Edit2 (size-4, blue-600)
  - Title: font-medium, blue-900
  - Description: text-xs, blue-800

- **Clone Button:**
  - Background: purple-600, hover:purple-700
  - Full width
  - Icon: Copy (size-4, mr-2)
  - Text: "Clone Project"
  - Icon: ChevronRight (size-4, ml-2)

- **Time Savings Box:**
  - Background: green-50
  - Border: green-200
  - Title: font-semibold, green-900
  - Text: text-sm, green-800
  - Message: "⚡ Time Savings" + explanation

**Empty States:**
- **No Selection:**
  - Icon: Copy (size-12, gray-400)
  - Text: "Select a project from the list to begin cloning"
  - Center aligned

- **No Search Results:**
  - Icon: Package (size-12, gray-300)
  - Text: "No projects match your search"
  - Center aligned, py-8

**Info Banner:**
- Background: purple-50
- Border: purple-200
- Text: text-sm, purple-900
- Bold: "💡 Tip:"
- Message: Explains cloning benefits and usage statistics

### 4.3 Information Hierarchy

**Primary Information:**
- Project ID and status
- Project selection state
- Clone button availability

**Secondary Information:**
- Project description
- Parts count and suppliers count
- Creation date and commodity
- New project ID

**Tertiary Information:**
- What will be cloned details
- Edit option explanation
- Time savings message
- Tip banner


## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| user_id | String | Authentication | Yes | UUID |
| session_id | String | System | Yes | UUID |

### 5.2 Project Data Fields (Core)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_id | String | Backend | Yes | Format: "PRJ-YYYY-NNN" |
| description | String | Backend | Yes | 2-500 characters |
| total_parts | Number | Backend | Yes | Integer, >0 |
| suppliers | Number | Backend | Yes | Integer, ≥0 |
| created_date | Date | Backend | Yes | ISO 8601 date |
| status | Enum | Backend | Yes | "completed", "active" |
| commodity | String | Backend | Yes | 2-100 characters |
| part_numbers | Array<String> | Backend | Yes | Array of part names |

### 5.3 Clone Configuration Data
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| new_project_id | String | Auto-generated/User | Yes | Format: "PRJ-YYYY-NNN", unique |
| edit_mode | Boolean | User | No | Default: false |
| selected_project | Object | User Selection | Yes | Full project object |

### 5.4 Search/Filter Data
| Field Name | Data Type | Purpose |
|------------|-----------|---------|
| search_query | String | User's search input |
| filtered_projects | Array<Project> | Projects matching search |

### 5.5 Display Data (Derived)
| Field Name | Data Type | Source | Format |
|------------|-----------|--------|--------|
| formatted_created_date | String | created_date | "MMM DD, YYYY" |
| status_badge_variant | String | status | Badge variant |
| is_selected | Boolean | selected_project | Comparison logic |



## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**Dynamic Project Attributes:**
- Project list displays all previous projects with standard fields
- Future: Custom project attributes from Master Field List
- Admin can configure which fields to display in project cards
- Search can be configured to search additional fields

**Status Types:**
- Standard statuses: Completed, Active
- Admin can configure additional custom statuses
- Status badges adapt to configured types
- Colors configurable per status

**BOM Attributes:**
- All BOM attributes from original project are preserved
- Dynamic fields from Master Field List are cloned
- Custom part attributes maintained in clone
- Field configurations preserved

**Search Configuration:**
- Search fields: Project ID, description, commodity (default)
- Admin can add additional searchable fields
- Search algorithm configurable (exact, fuzzy, partial)

### 6.2 UI Adaptation Logic

**Project List Display:**
- If no projects exist: Show empty state with message
- If 1-10 projects: Show all without pagination
- If 11+ projects: Enable search and consider pagination (future)
- Search filters list in real-time

**Status Badge Display:**
- Completed: Outline badge
- Active: Outline badge
- Custom statuses: Configurable colors and variants

**Selection State:**
- Unselected card: White background, gray border
- Selected card: Purple-50 background, purple-400 border, shadow-md
- Selected badge: Purple-600 with CheckCircle2 icon
- Checkmark icon: Size-6, purple-600 (top-right)

**Clone Configuration Panel:**
- No selection: Show empty state with Copy icon
- Project selected: Show configuration options
- Edit mode checked: Navigate to The Split with edit mode
- Edit mode unchecked: Navigate to The Split with cloned data

**Empty State:**
- If no projects match search: Show "No projects match" message
- If user has no projects at all: Show "No previous projects" with suggestion
- Provide clear guidance on next steps

### 6.3 LLM Integration

**Smart Project Recommendation:**
- LLM analyzes current context and recommends most similar project
- Factors considered:
  - Part names and materials
  - Commodity type
  - Supplier overlap
  - Recent usage
  - Success rate
- Recommended project highlighted with badge (future enhancement)

**Search Enhancement:**
- LLM improves search with semantic understanding
- Searches by meaning, not just keywords
- Example: "aluminum brackets" finds "ALU-BRACKET" projects
- Handles typos and variations

**Auto-Fill Intelligence:**
- LLM pre-fills cloned project with smart defaults
- Updates outdated information (prices, lead times)
- Suggests modifications based on differences
- Highlights fields that may need updating

**Fallback Behavior:**
- If LLM unavailable: Standard keyword search only
- No recommendations displayed
- Manual selection required
- System remains fully functional



## 7. User Interactions

### 7.1 Primary Actions

**Action: Search Projects**
- **Trigger:** User types in search bar
- **Behavior:**
  1. Update search_query state
  2. Filter project list in real-time
  3. Match against: Project ID, description, commodity
  4. Display filtered results
  5. Show empty state if no matches
- **Validation:** None
- **Success:** Filtered project list displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Select Project (Click Card)**
- **Trigger:** User clicks anywhere on project card
- **Behavior:**
  1. Set selected_project state
  2. Highlight card with purple theme
  3. Show selected badge and checkmark
  4. Enable clone configuration panel
  5. Reset edit_mode to false
  6. Auto-generate new project ID
- **Validation:** None
- **Success:** Project selected, configuration panel enabled
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Edit New Project ID**
- **Trigger:** User types in New Project ID field
- **Behavior:**
  1. Update new_project_id state
  2. Validate format (alphanumeric, hyphens allowed)
  3. Check uniqueness (backend validation)
- **Validation:**
  - Format: "PRJ-YYYY-NNN" or custom
  - Length: 3-50 characters
  - Unique across all projects
- **Success:** New project ID accepted
- **Error:** Display error message if invalid or duplicate
- **Navigation:** None (stays on screen)

**Action: Toggle Edit Mode**
- **Trigger:** User clicks "Edit parts before proceeding" checkbox
- **Behavior:**
  1. Toggle edit_mode state
  2. Update checkbox visual state
  3. Change navigation behavior for Clone button
- **Validation:** None
- **Success:** Edit mode toggled
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Clone Project**
- **Trigger:** User clicks "Clone Project" button
- **Behavior:**
  1. Validate new_project_id
  2. Fetch full project data from backend
  3. Create new project with cloned data
  4. If edit_mode = true:
     - Navigate to The Split with edit mode enabled
     - Allow user to modify parts before proceeding
  5. If edit_mode = false:
     - Navigate to The Split with cloned data
     - Parts pre-filled, ready for classification
  6. Pass new_project_id and original_project_id as parameters
- **Validation:**
  - Project must be selected
  - New project ID must be valid and unique
- **Success:** Navigate to The Split with cloned data
- **Error:** Display error toast if validation or cloning fails
- **Navigation:** Clone Project → The Split (with cloned data)

### 7.2 Secondary Actions

**Action: Hover Project Card**
- **Trigger:** User hovers over project card
- **Behavior:**
  - Change border to gray-400
  - Add shadow-sm
  - Cursor changes to pointer
  - Smooth transition animation
- **Validation:** None
- **Success:** Visual feedback provided
- **Error:** N/A
- **Navigation:** None

**Action: View Project Details**
- **Trigger:** User views project card content
- **Behavior:**
  - Display Project ID, status, description
  - Show parts count, suppliers count, date
  - Display commodity
  - All information visible without interaction
- **Validation:** None
- **Success:** Details displayed
- **Error:** N/A
- **Navigation:** None

**Action: View Clone Details**
- **Trigger:** User views "What will be cloned" box
- **Behavior:**
  - Display list of items that will be cloned
  - Show counts (parts, suppliers)
  - Show commodity type
  - Purple theme for emphasis
- **Validation:** None
- **Success:** Details displayed
- **Error:** N/A
- **Navigation:** None

**Action: Read Info Banner**
- **Trigger:** User views info banner at bottom
- **Behavior:**
  - Display tip about cloning benefits
  - Show usage statistics (60-70%)
  - Purple theme for emphasis
- **Validation:** None
- **Success:** Info displayed
- **Error:** N/A
- **Navigation:** None

### 7.3 Navigation

**From:**
- Project Initiation (via "Clone Existing Project" selection)

**To:**
- The Split (via "Clone Project" button)
  - With edit_mode = true: Edit parts before classification
  - With edit_mode = false: Proceed directly to classification
  - Pre-filled with cloned project data
  - new_project_id and original_project_id parameters

**Exit Points:**
- Clone button → The Split (with cloned data)
- Browser back button → Project Initiation
- App Header logo → Projects List



## 8. Business Rules

### 8.1 Validation Rules

**Project Availability:**
- User must have at least 1 previous project to access this screen
- If no projects exist: Show empty state with guidance
- Projects must belong to authenticated user
- Only projects with status "completed" or "active" are shown

**Search Validation:**
- Search query: 0-200 characters
- No special validation required
- Empty search shows all projects
- Search is case-insensitive

**New Project ID Validation:**
- Format: Alphanumeric, hyphens, underscores allowed
- Length: 3-50 characters
- Must be unique across all projects
- Auto-generated but user can customize
- Error: "Project ID is required"
- Error: "Project ID already exists"

**Selection Validation:**
- Selected project must exist and be accessible
- User must have permission to clone project
- Project data must be complete and valid

### 8.2 Calculation Logic

**Search Filtering:**
```
filtered_projects = projects.filter(project => 
  project.id.toLowerCase().includes(search_query.toLowerCase()) OR
  project.description.toLowerCase().includes(search_query.toLowerCase()) OR
  project.commodity.toLowerCase().includes(search_query.toLowerCase())
)
```

**Date Formatting:**
```
formatted_date = format(created_date, "MMM DD, YYYY")
Example: "Dec 28, 2024"
```

**New Project ID Generation:**
```
new_project_id = "PRJ-" + current_year + "-" + next_sequence_number
Example: "PRJ-2025-002"
```

**Selection State:**
```
is_selected = selected_project?.id === project.id
```

### 8.3 Conditional Display Logic

**Empty State Display:**
- If user has 0 projects:
  - Show empty state with Package icon
  - Message: "No previous projects available"
  - Suggest using other methods
  - Hide search bar
- If search returns 0 results:
  - Show empty state with Package icon
  - Message: "No projects match your search"
  - Show search bar
  - Allow clearing search

**Project Card Display:**
- Show all projects that match search filter
- Sort by: created_date (newest first)
- Display: Project ID, status, description, parts count, suppliers count, date, commodity
- Selected card: Purple theme, selected badge, checkmark icon

**Clone Configuration Panel:**
- No selection: Show empty state with Copy icon
- Project selected: Show all configuration options
- New Project ID field: Always editable
- What will be cloned: Show counts from selected project
- Edit option: Always available
- Clone button: Enabled when project selected

**Info Banner Display:**
- Always show at bottom
- Highlight 60-70% time savings and usage
- Purple theme for emphasis

### 8.4 Error Handling

**No Projects Available Error:**
- **Detection:** User has 0 previous projects
- **Handling:**
  - Show empty state: "No previous projects available"
  - Display message: "You haven't created any projects yet. Try Upload BOM or Create From Scratch."
  - Provide button to return to Project Initiation
  - Log for monitoring

**Project Fetch Error:**
- **Detection:** API call to fetch project data fails
- **Handling:**
  - Display error toast: "Failed to load project. Please try again."
  - Keep user on current screen
  - Provide retry option
  - Log error for monitoring

**Project Clone Error:**
- **Detection:** Cloning operation fails or project data invalid
- **Handling:**
  - Display error toast: "Unable to clone project. Please try another one."
  - Stay on current screen
  - Allow selecting different project
  - Log error for monitoring

**Duplicate Project ID Error:**
- **Detection:** New project ID already exists
- **Handling:**
  - Display error below New Project ID field
  - Error: "Project ID already exists. Please use a different ID."
  - Highlight field with red border
  - Prevent clone until corrected

**Search Error:**
- **Detection:** Search functionality fails (unlikely)
- **Handling:**
  - Show all projects (ignore search)
  - Display warning: "Search temporarily unavailable"
  - Log error for monitoring

**Session Expired Error:**
- **Detection:** User's session expires while viewing screen
- **Handling:**
  - Show modal: "Session expired. Please log in again."
  - Redirect to login after confirmation
  - Preserve selected project for post-login redirect

**Network Error:**
- **Detection:** No internet connection or API unreachable
- **Handling:**
  - Display error banner: "Connection lost. Please check your connection."
  - Disable project selection and clone button
  - Allow viewing cached projects (if available)
  - Provide retry option
  - Log error for monitoring

**Permission Error:**
- **Detection:** User doesn't have permission to clone project
- **Handling:**
  - Display error toast: "You don't have permission to clone this project."
  - Keep user on current screen
  - Hide or disable affected project card
  - Log error for monitoring



## 9. Acceptance Criteria

### 9.1 Functional Criteria

1. WHEN user navigates to Clone Project THEN screen SHALL display within 2 seconds
2. WHEN screen loads THEN all user's previous projects SHALL be displayed
3. WHEN screen loads THEN search bar SHALL be displayed
4. WHEN screen loads THEN clone configuration panel SHALL show empty state
5. WHEN user types in search bar THEN project list SHALL filter in real-time
6. WHEN user searches by project ID THEN matching projects SHALL be displayed
7. WHEN user searches by description THEN matching projects SHALL be displayed
8. WHEN user searches by commodity THEN matching projects SHALL be displayed
9. WHEN search returns no results THEN empty state SHALL be displayed
10. WHEN user clears search THEN all projects SHALL be displayed again
11. WHEN user clicks project card THEN project SHALL be selected
12. WHEN project is selected THEN card SHALL show purple theme and selected badge
13. WHEN project is selected THEN clone configuration panel SHALL be enabled
14. WHEN project is selected THEN new project ID SHALL be auto-generated
15. WHEN user edits new project ID THEN it SHALL validate format and uniqueness
16. WHEN user toggles edit mode checkbox THEN state SHALL update
17. WHEN user clicks Clone button with edit mode off THEN system SHALL navigate to The Split
18. WHEN user clicks Clone button with edit mode on THEN system SHALL navigate to The Split with edit mode
19. WHEN user hovers over project card THEN card SHALL show hover effects
20. WHEN project has "completed" status THEN outline badge SHALL be displayed
21. WHEN project has "active" status THEN outline badge SHALL be displayed
22. WHEN user has no previous projects THEN empty state SHALL be displayed
23. WHEN project fetch fails THEN error toast SHALL be displayed
24. WHEN clone operation fails THEN error toast SHALL be displayed
25. WHEN new project ID is duplicate THEN error SHALL be displayed
26. WHEN session expires THEN user SHALL be redirected to login
27. WHEN user clicks browser back button THEN system SHALL return to Project Initiation
28. WHEN project is selected THEN selection SHALL be recorded for analytics
29. WHEN project data is fetched THEN it SHALL include all fields for cloning
30. WHEN The Split loads THEN all fields SHALL be pre-filled with cloned data
31. WHEN cloned project is created THEN it SHALL not overwrite original
32. WHEN project list is displayed THEN projects SHALL be sorted by date (newest first)
33. WHEN project card is displayed THEN all key information SHALL be visible
34. WHEN "What will be cloned" box is displayed THEN it SHALL show accurate counts
35. WHEN info banner is displayed THEN 60-70% time savings SHALL be highlighted
36. WHEN user clones project THEN system SHALL pass new_project_id and original_project_id to next screen

### 9.2 Flexibility Criteria

1. WHEN admin adds new status type THEN it SHALL appear with configured badge
2. WHEN admin configures search fields THEN search SHALL include those fields
3. WHEN admin configures card display THEN cards SHALL show configured fields
4. WHEN LLM is available THEN smart recommendations SHALL be provided (future)
5. WHEN LLM is unavailable THEN standard search SHALL work normally
6. WHEN custom project attributes exist THEN they SHALL be preserved in clone
7. WHEN project has dynamic fields THEN they SHALL be cloned correctly
8. WHEN Master Field List changes THEN cloned projects SHALL adapt to new structure
9. WHEN project has optional fields THEN they SHALL be included in clone
10. WHEN project has required fields THEN they SHALL be validated in clone

### 9.3 UX Criteria

1. Screen loads within 2 seconds on standard broadband connection
2. Search filters results within 200ms of typing
3. Project cards are visually distinct and easy to scan
4. Status badges are clearly visible
5. Hover effects are smooth and responsive
6. Selected state is clearly indicated with purple theme
7. Empty state provides clear guidance
8. Clone configuration panel is intuitive
9. All interactive elements have pointer cursor
10. Card shadows increase on hover
11. Typography is clear and readable
12. Spacing is consistent throughout screen
13. Mobile-responsive design works on screens 768px and wider
14. Search bar is easily accessible at top
15. Clone button is clearly visible and prominent
16. Project information is well-organized and scannable
17. Date format is user-friendly (MMM DD, YYYY)
18. Parts and suppliers counts are clearly displayed
19. Commodity is visually distinct
20. "What will be cloned" box is informative
21. Edit option is clearly explained
22. Time savings message is prominent
23. Info banner uses appropriate color (purple for emphasis)
24. Empty state icons are appropriate and clear
25. Error messages are clear and actionable
26. Loading states provide feedback during operations
27. Navigation is smooth and predictable
28. Two-column layout is balanced and readable
29. Selected badge and checkmark are clearly visible
30. New project ID field is easily editable

### 9.4 Performance Criteria

1. Initial page load completes within 2 seconds
2. Project list renders within 1 second
3. Search filtering responds within 200ms
4. Card hover effects respond within 100ms
5. Project selection updates within 100ms
6. Clone operation completes within 3 seconds
7. Screen handles 100+ projects without performance degradation
8. Search handles large project lists efficiently
9. No memory leaks during search operations
10. Smooth scrolling with large project lists
11. Images and icons load progressively
12. No layout shifts during load
13. Animations run at 60fps
14. API calls are optimized with caching
15. Network requests are minimized

### 9.5 Accessibility Criteria

1. All project cards are keyboard accessible (tab navigation)
2. Focus indicators are clearly visible
3. Search bar is keyboard accessible
4. Clone button has descriptive aria-label
5. Status badges have aria-labels
6. Screen reader announces project count
7. Screen reader announces search results count
8. Empty state is announced to screen readers
9. Error messages are announced to screen readers
10. Color is not the only means of conveying selection state
11. Text has sufficient contrast ratio (WCAG AA: 4.5:1)
12. Icons have aria-labels or are marked as decorative
13. Project cards have proper semantic structure
14. Headings have proper hierarchy
15. Form fields have proper labels

### 9.6 Security Criteria

1. User must be authenticated to access screen
2. Session validation occurs on page load
3. Expired sessions redirect to login
4. Only user's own projects are displayed
5. Project data is validated before cloning
6. Permission checks occur before project access
7. XSS protection on all displayed text
8. CSRF protection on project fetch and clone
9. Rate limiting on API calls
10. Audit log records project cloning
11. No sensitive data exposed in client-side code
12. Project IDs are validated before operations
13. User permissions are checked on backend
14. Cloned projects maintain security settings
15. Original projects are not modified by cloning



## 10. Edge Cases & Error Scenarios

### 10.1 Data Edge Cases

**No Previous Projects:**
- **Scenario:** User has never created a project before
- **Handling:**
  - Show empty state with Package icon
  - Display message: "No previous projects available. You haven't created any projects yet."
  - Provide guidance: "Try Upload BOM or Create From Scratch methods."
  - Provide button: "Back to Project Initiation"
  - Hide search bar (no projects to search)
  - Log for monitoring

**Single Previous Project:**
- **Scenario:** User has exactly one previous project
- **Handling:**
  - Display single project card
  - Show search bar (for consistency)
  - All functionality works normally
  - Clear selection path

**Many Previous Projects (100+):**
- **Scenario:** User has 100+ previous projects
- **Handling:**
  - Display all projects (no pagination initially)
  - Search becomes essential for finding projects
  - Performance optimized for large lists
  - Consider pagination in future enhancement
  - Scroll smoothly with virtual scrolling (future)

**Project with Missing Data:**
- **Scenario:** Project has incomplete or corrupted data
- **Handling:**
  - Display project card with available data
  - Show placeholder for missing fields: "-"
  - Allow selection but warn user
  - Validate data before cloning
  - Log warning for monitoring

**Project with Outdated Data:**
- **Scenario:** Project is very old (1+ years)
- **Handling:**
  - Display project normally
  - Show age indicator (future enhancement)
  - LLM suggests updating outdated fields (future)
  - Allow cloning with warning (future)

**Project with Many Parts (100+):**
- **Scenario:** Project has 100+ parts
- **Handling:**
  - Display parts count: "100+ parts"
  - Clone all parts to new project
  - Performance optimized for large clones
  - Show progress indicator during clone

**Project with Many Suppliers (50+):**
- **Scenario:** Project has 50+ suppliers
- **Handling:**
  - Display suppliers count: "50+ suppliers"
  - Clone all suppliers to new project
  - All supplier data preserved

**Duplicate Project Descriptions:**
- **Scenario:** Multiple projects have same description
- **Handling:**
  - Display all matching projects
  - Differentiate by Project ID and date
  - User selects based on ID or date
  - Search works normally

**Auto-Generated ID Collision:**
- **Scenario:** Auto-generated new project ID already exists
- **Handling:**
  - System generates alternative ID (increment counter)
  - Display new ID to user
  - Allow user to customize if desired
  - Validate uniqueness before clone

### 10.2 Interaction Edge Cases

**Rapid Card Clicks:**
- **Scenario:** User clicks project card multiple times quickly
- **Handling:**
  - Select only once
  - Debounce selection updates
  - Smooth transition
  - No duplicate selections

**Click Multiple Cards:**
- **Scenario:** User clicks different cards in quick succession
- **Handling:**
  - Honor last click
  - Update selection smoothly
  - Clear previous selection
  - Update configuration panel

**Search While Loading:**
- **Scenario:** User types in search bar while projects loading
- **Handling:**
  - Queue search until load complete
  - Apply search after projects loaded
  - Show loading indicator
  - Smooth transition to filtered results

**Clear Search:**
- **Scenario:** User clears search bar
- **Handling:**
  - Show all projects again
  - Smooth transition
  - Maintain scroll position if possible
  - Maintain selection if project still visible

**Hover During Load:**
- **Scenario:** User hovers over card while screen loading
- **Handling:**
  - Disable hover effects during load
  - Enable hover effects after load complete
  - Show loading skeleton if needed

**Resize Window:**
- **Scenario:** User resizes browser window
- **Handling:**
  - Responsive layout adapts immediately
  - Two-column layout adjusts
  - No content overflow or clipping
  - Maintain readability

**Browser Back Button:**
- **Scenario:** User clicks browser back button
- **Handling:**
  - Return to Project Initiation
  - No data loss
  - Normal browser behavior

**Long Project Descriptions:**
- **Scenario:** Project description is very long (200+ characters)
- **Handling:**
  - Truncate description in card
  - Show first 150 characters + "..."
  - Full description visible on hover (future)
  - Full description in cloned project

**Edit Mode Toggle During Clone:**
- **Scenario:** User toggles edit mode checkbox multiple times quickly
- **Handling:**
  - Debounce toggle updates
  - Honor final state
  - Update checkbox visual smoothly
  - No duplicate state changes

**Clone Button Rapid Clicks:**
- **Scenario:** User clicks Clone button multiple times quickly
- **Handling:**
  - Clone only once
  - Disable button after first click
  - Show loading indicator
  - Re-enable if clone fails

### 10.3 System Edge Cases

**Session Expires During View:**
- **Scenario:** User's session expires while viewing screen
- **Handling:**
  - Detect expired session on clone attempt
  - Show modal: "Session expired. Please log in again."
  - Redirect to login after confirmation
  - Preserve selected project for post-login redirect

**Network Disconnection:**
- **Scenario:** User loses internet connection
- **Handling:**
  - Show banner: "Connection lost. Please check your connection."
  - Disable project selection and clone button
  - Allow viewing cached projects (if available)
  - Auto-retry connection every 10 seconds
  - Show success message when reconnected

**Slow Network:**
- **Scenario:** User on slow connection (2G/3G)
- **Handling:**
  - Show loading indicators
  - Load project list progressively
  - Provide feedback on load progress
  - Timeout after 30 seconds
  - Allow retry on timeout

**Project Fetch Timeout:**
- **Scenario:** API call to fetch project data times out
- **Handling:**
  - Display error toast: "Request timed out. Please try again."
  - Keep user on current screen
  - Provide retry option
  - Log error for monitoring

**Project Data Validation Failure:**
- **Scenario:** Fetched project data fails validation
- **Handling:**
  - Display error toast: "Project data is invalid. Please try another one."
  - Keep user on current screen
  - Allow selecting different project
  - Log error for monitoring

**Concurrent Project Modification:**
- **Scenario:** Original project is modified while user is cloning
- **Handling:**
  - Clone uses snapshot from selection time
  - No impact on cloning process
  - Original project modifications don't affect clone

**Browser Compatibility:**
- **Scenario:** User on unsupported browser
- **Handling:**
  - Detect browser version on load
  - Show warning if unsupported
  - Provide graceful degradation (basic functionality)
  - Recommend supported browsers

**Large Project Clone:**
- **Scenario:** Cloning project with 100+ parts and 50+ suppliers
- **Handling:**
  - Show progress indicator during clone
  - Optimize data transfer
  - Stream data if necessary
  - Provide feedback on progress
  - Timeout after 60 seconds
  - Allow retry on timeout

**New Project ID Validation During Clone:**
- **Scenario:** New project ID becomes invalid between entry and clone
- **Handling:**
  - Re-validate ID before clone
  - Display error if now invalid
  - Allow user to correct
  - Prevent clone until valid



## 11. Backend API Requirements

### 11.1 API Endpoints

**GET /api/v1/users/:user_id/projects**
- **Purpose:** Get list of user's previous projects for cloning
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `user_id` (required): User ID
- **Query Parameters:**
  - `status` (optional): Filter by status (completed, active)
  - `limit` (optional): Max number of projects to return (default: 100)
  - `offset` (optional): Pagination offset (default: 0)
- **Response:** 200 OK
  ```json
  {
    "projects": [
      {
        "project_id": "PRJ-2025-001",
        "description": "Aluminum Mounting Bracket for Door Assembly",
        "status": "completed",
        "total_parts": 25,
        "suppliers": 5,
        "created_date": "2024-12-28T10:00:00Z",
        "commodity": "Stamping",
        "part_numbers": ["ALU-BRACKET-001", "ALU-BRACKET-002"]
      }
    ],
    "total_count": 45,
    "has_more": false
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: No permission to access projects
  - 500 Internal Server Error: Server error

**GET /api/v1/projects/:project_id**
- **Purpose:** Get full project data for cloning
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `project_id` (required): Project ID to clone
- **Response:** 200 OK
  ```json
  {
    "project_id": "PRJ-2025-001",
    "description": "Aluminum Mounting Bracket for Door Assembly",
    "commodity": "Stamping",
    "status": "completed",
    "created_date": "2024-12-28T10:00:00Z",
    "total_parts": 25,
    "parts": [
      {
        "part_id": "part-123",
        "part_name": "ALU-BRACKET-001",
        "description": "Aluminum mounting bracket",
        "material": "Aluminum 6061",
        "quantity": 50000,
        "target_weight": 0.45,
        "custom_fields": {}
      }
    ],
    "suppliers": [
      {
        "supplier_id": "sup-456",
        "supplier_name": "ABC Manufacturing",
        "email": "contact@abc.com",
        "contact_person": "John Doe"
      }
    ],
    "requirements": {
      "delivery_date": "2025-03-01",
      "incoterms": "FOB",
      "payment_terms": "Net 30",
      "quality_standards": "ISO 9001"
    },
    "field_configurations": {
      "selected_fields": ["coating_thickness", "surface_finish"],
      "mandatory_fields": ["coating_thickness"]
    },
    "files": [
      {
        "file_id": "file-789",
        "file_name": "technical_drawing.pdf",
        "file_url": "https://..."
      }
    ]
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: No permission to access project
  - 404 Not Found: Project not found
  - 500 Internal Server Error: Server error

**POST /api/v1/projects/clone**
- **Purpose:** Clone existing project with new ID
- **Authentication:** Required (Bearer token)
- **Request Body:**
  ```json
  {
    "original_project_id": "PRJ-2025-001",
    "new_project_id": "PRJ-2025-002",
    "edit_mode": false,
    "user_id": "user-123"
  }
  ```
- **Response:** 201 Created
  ```json
  {
    "project_id": "PRJ-2025-002",
    "original_project_id": "PRJ-2025-001",
    "created_at": "2025-01-02T10:00:00Z",
    "parts_count": 25,
    "suppliers_count": 5,
    "status": "created"
  }
  ```
- **Error Responses:**
  - 400 Bad Request: Validation error
  - 401 Unauthorized: Invalid or expired token
  - 404 Not Found: Original project not found
  - 409 Conflict: New project ID already exists
  - 500 Internal Server Error: Server error

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

**POST /api/v1/analytics/project-clone**
- **Purpose:** Record project cloning for analytics
- **Authentication:** Required (Bearer token)
- **Request Body:**
  ```json
  {
    "user_id": "user-123",
    "original_project_id": "PRJ-2025-001",
    "new_project_id": "PRJ-2025-002",
    "edit_mode": false,
    "timestamp": "2025-01-02T10:00:00Z"
  }
  ```
- **Response:** 201 Created
  ```json
  {
    "recorded": true,
    "event_id": "evt-456"
  }
  ```

### 11.2 Data Models

```typescript
interface ProjectListItem {
  project_id: string;
  description: string;
  status: 'completed' | 'active';
  total_parts: number;
  suppliers: number;
  created_date: string;
  commodity: string;
  part_numbers: string[];
}

interface ProjectListResponse {
  projects: ProjectListItem[];
  total_count: number;
  has_more: boolean;
}

interface ProjectFullData {
  project_id: string;
  description: string;
  commodity: string;
  status: string;
  created_date: string;
  total_parts: number;
  parts: Part[];
  suppliers: Supplier[];
  requirements: Requirements;
  field_configurations: FieldConfigurations;
  files: File[];
}

interface Part {
  part_id: string;
  part_name: string;
  description?: string;
  material: string;
  quantity: number;
  target_weight?: number;
  custom_fields?: Record<string, any>;
}

interface Supplier {
  supplier_id: string;
  supplier_name: string;
  email: string;
  contact_person?: string;
}

interface Requirements {
  delivery_date?: string;
  incoterms?: string;
  payment_terms?: string;
  quality_standards?: string;
  [key: string]: any;
}

interface FieldConfigurations {
  selected_fields: string[];
  mandatory_fields: string[];
}

interface File {
  file_id: string;
  file_name: string;
  file_url: string;
}

interface ProjectCloneRequest {
  original_project_id: string;
  new_project_id: string;
  edit_mode: boolean;
  user_id: string;
}

interface ProjectCloneResponse {
  project_id: string;
  original_project_id: string;
  created_at: string;
  parts_count: number;
  suppliers_count: number;
  status: 'created';
}

interface ProjectExistsResponse {
  exists: boolean;
}

interface ProjectCloneAnalytics {
  user_id: string;
  original_project_id: string;
  new_project_id: string;
  edit_mode: boolean;
  timestamp: string;
}
```

### 11.3 Caching Strategy

**Client-Side Caching:**
- Cache project list for 5 minutes
- Invalidate cache on:
  - New project creation
  - Project deletion
  - Manual refresh
- Cache full project data for 10 minutes
- Invalidate on project modification

**Server-Side Caching:**
- Cache project list (Redis, 2 minutes TTL)
- Cache full project data (Redis, 5 minutes TTL)
- Invalidate on project mutations
- Use cache keys: `project:list:user:{user_id}`, `project:full:{project_id}`

### 11.4 Real-Time Updates

**Project List Updates:**
- WebSocket connection for real-time project list updates (future)
- Notify when new project created
- Notify when project status changes
- Auto-refresh list on updates

**Concurrent Access:**
- Handle concurrent cloning of same project
- Each clone creates independent copy
- No locking required

### 11.5 Error Handling

**Network Errors:**
- Retry failed requests (exponential backoff: 1s, 2s, 4s)
- Max 3 retries
- Show error toast after final failure
- Provide manual retry button

**Authentication Errors:**
- 401 Unauthorized: Redirect to login
- 403 Forbidden: Show access denied message

**Not Found Errors:**
- 404 Not Found: Show error message
- Suggest selecting different project
- Log error for monitoring

**Conflict Errors:**
- 409 Conflict: New project ID already exists
- Suggest alternative ID
- Allow user to modify and retry

**Validation Errors:**
- 400 Bad Request: Show specific error message
- Log error details for monitoring

**Timeout Errors:**
- Timeout after 30 seconds
- Show error message
- Provide retry option
- Log error for monitoring



## 12. Notes & Considerations

### 12.1 Design Decisions

**Clone as Primary Method:**
- Rationale: 60-70% of projects reuse same parts and suppliers
- Cloning saves 60-70% of setup time (from ~10 minutes to ~3-4 minutes)
- Most popular method among users
- Key selling point of the product
- Reduces repetitive data entry and errors

**Two-Column Layout:**
- Rationale: Separates selection from configuration
- Left column (2/3): Project selection and search
- Right column (1/3): Clone configuration
- Clear visual hierarchy
- Reduces cognitive load

**Search-First Approach:**
- Rationale: Users may have many previous projects
- Search helps find relevant project quickly
- Real-time filtering provides immediate feedback
- Search by ID, description, or commodity covers most use cases
- Simple search interface reduces cognitive load

**Card-Based Display:**
- Rationale: Cards provide visual hierarchy and scannability
- Each card shows all key information at a glance
- Entire card clickable for better UX
- Hover effects indicate interactivity
- Selected state clearly indicated with purple theme

**Edit Mode Option:**
- Rationale: Some users want to modify parts before proceeding
- Checkbox provides clear choice
- Edit mode = true: Navigate to The Split with edit capability
- Edit mode = false: Navigate to The Split with cloned data
- Flexibility without complexity

**Time Savings Emphasis:**
- Rationale: 60-70% time savings is key selling point
- Green box draws attention
- Reinforces value proposition
- Motivates users to use this method
- Differentiates from other methods

**Auto-Generated Project ID:**
- Rationale: Reduces user effort
- Format: PRJ-YYYY-NNN
- User can customize if needed
- Validates uniqueness before clone
- Prevents ID conflicts

### 12.2 Future Enhancements

**Smart Project Recommendations:**
- LLM analyzes current context and recommends most similar project
- Display recommendation badge on suggested project
- Explain reasoning: "Based on similar parts and commodity"
- Allow user to override recommendation
- Learn from user's selection patterns

**Advanced Search:**
- Filter by date range
- Filter by status
- Filter by commodity
- Filter by parts count
- Filter by suppliers count
- Multi-criteria search
- Saved search filters

**Project Comparison:**
- Select multiple projects to compare
- Side-by-side comparison view
- Highlight differences
- Choose best project to clone
- Merge features from multiple projects

**Quick Preview:**
- Hover over card to see detailed preview
- Show parts list, suppliers list, requirements
- Preview without navigation
- Reduce clicks for exploration

**Bulk Cloning:**
- Clone multiple projects at once
- Merge into single project
- Useful for complex projects
- Combine parts from multiple sources

**Project Templates:**
- Mark projects as templates
- Templates appear at top of list
- Optimized for reuse
- Separate section for templates

**Pagination:**
- Implement pagination for 100+ projects
- Virtual scrolling for performance
- Infinite scroll option
- Configurable page size

**Sorting Options:**
- Sort by date (newest/oldest)
- Sort by parts count
- Sort by suppliers count
- Sort by status
- Sort by commodity
- User preference saved

**Clone History:**
- Track which projects were cloned from which
- Show clone lineage
- Useful for auditing
- Helps understand project relationships

**Favorites:**
- Mark projects as favorites
- Favorites appear at top
- Quick access to frequently cloned projects
- Star icon on cards

### 12.3 Dependencies

**Required Screens:**
- Project Initiation (prerequisite)
- The Split (navigation target - with cloned data)

**Required APIs:**
- Authentication API
- Projects List API
- Project Full Data API
- Project Clone API
- Project ID Exists API
- Analytics API

**External Dependencies:**
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Lucide React (icons)
- shadcn/ui components
- Date formatting library (date-fns)

### 12.4 Testing Considerations

**Unit Tests:**
- Search filtering logic
- Selection state management
- New project ID generation
- Edit mode toggle logic
- Form validation logic

**Integration Tests:**
- API integration (project list fetch)
- API integration (project full data fetch)
- API integration (project clone)
- Authentication flow
- Navigation to The Split
- Analytics recording
- Caching behavior

**E2E Tests:**
- Complete user journey: Project Initiation → Clone Project → The Split
- Search and select project workflow
- Clone project with edit mode off
- Clone project with edit mode on
- Error handling scenarios
- Empty state scenarios
- Multiple projects scenarios

**Performance Tests:**
- Load time with 100+ projects
- Search performance with large lists
- Memory usage during scrolling
- API response times
- Caching effectiveness

**Accessibility Tests:**
- Keyboard navigation
- Screen reader compatibility
- Focus management
- Color contrast
- ARIA labels

### 12.5 Open Questions

1. **Pagination:** Should we implement pagination for 100+ projects or use infinite scroll?
2. **Project Preview:** Should hovering show detailed preview or require click?
3. **Sorting:** What should be the default sort order (date, status, or relevance)?
4. **Filters:** Should we add advanced filters (date range, status, commodity)?
5. **Recommendations:** Should LLM recommendations be shown prominently or subtly?
6. **Templates:** Should we have a separate section for project templates?
7. **Comparison:** Should users be able to compare multiple projects before cloning?
8. **Bulk Clone:** Should system support cloning multiple projects at once?
9. **Project Age:** Should we show age indicator for old projects (1+ years)?
10. **Auto-Update:** Should cloned projects auto-update outdated information (prices, lead times)?
11. **Clone History:** Should we track which projects were cloned from which?
12. **Clone Frequency:** Should we show how often each project has been cloned?
13. **Recent Clones:** Should we show "Recently Cloned" section at top?
14. **Favorites:** Should users be able to favorite projects for quick access?
15. **Search History:** Should we save and suggest previous searches?

### 12.6 Key Metrics to Track

**Usage Metrics:**
- Number of projects cloned per user
- Time spent on screen before selection
- Search usage rate
- Most cloned projects
- Clone success rate
- Edit mode usage rate

**Performance Metrics:**
- Page load time
- Search response time
- Project fetch time
- Clone operation time
- Navigation time
- Error rate

**Business Metrics:**
- Time savings vs. other methods
- User satisfaction with cloning
- Clone completion rate
- Modifications made to cloned projects
- Return rate to this screen
- Edit mode vs. direct clone ratio

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial screen requirements document |
