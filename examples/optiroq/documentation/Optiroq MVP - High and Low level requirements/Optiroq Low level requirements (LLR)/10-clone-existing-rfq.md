# Clone Existing RFQ

## 1. Overview
- **Screen ID:** SCR-010
- **Component File:** `src/app/components/CloneExistingRFQ.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** High - Preserves dynamic fields from original RFQ

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** duplicate an existing RFQ and modify only what's different  
**So that** I save 60-70% of time on similar RFQs (key selling point)

### Related User Stories
- **US-MVP-02B:** Duplicate Existing RFQ with Modifications
- **REQ-MVP-00A:** BOM Upload & Project Initialization (Enhanced)

## 3. Screen Purpose & Context

### Purpose
This screen allows buyers to select a previous RFQ to clone, providing:
- Search and filter through past RFQs
- View RFQ details (parts, suppliers, dates, status)
- Select RFQ to duplicate with all fields pre-filled
- Save 60-70% of setup time (from ~5 minutes to ~1-2 minutes)
- Reuse suppliers, requirements, and configurations

### Context
- **When user sees this:** 
  - After selecting "Clone Existing RFQ" method from RFQ Method Selection
  - When creating similar RFQ to previous projects
  - Most common method (60-70% of RFQs use this approach)
- **Why it exists:** 
  - Most RFQs reuse same suppliers and requirements
  - Massive time savings (60-70% reduction in setup time)
  - Reduce repetitive data entry
  - Maintain consistency across similar projects
  - Key selling point of the product
- **Position in journey:** 
  - After RFQ Method Selection
  - Before RFQ Form (with pre-filled data)
  - Most popular path (60-70% usage)

### Key Characteristics
- **Search functionality:** Find RFQs by ID, description, or commodity
- **RFQ list:** Display all previous RFQs with key details
- **Status indicators:** Visual badges for Completed, Active, Draft
- **Quick selection:** Click card or Clone button to select
- **Time savings:** 60-70% reduction in setup time
- **Pre-fill all fields:** Parts, suppliers, requirements, files


## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Title:** "RFQ Initiation - Method 2: Clone Existing Project"
2. **Subtitle:** "Select a previous RFQ to duplicate with pre-filled data"

**Info Banner:**
1. **Time Savings Card**
   - Purple background (#f3e8ff)
   - Copy icon
   - Title: "60-70% Time Savings"
   - Message: Explains cloning benefits and time savings

**Search and Filter Card:**
1. **Card Header**
   - Title: "Select RFQ to Clone"
   - Description: "Search and select a previous RFQ to use as a template"

2. **Search Bar**
   - Search icon (left)
   - Placeholder: "Search by RFQ ID, description, or commodity..."
   - Real-time filtering

3. **RFQ List**
   - Vertical stack of RFQ cards
   - Each card shows: ID, status, description, parts count, suppliers count, date, commodity
   - Hover effects and click to select
   - "Clone" button on each card

**Info Card (Bottom):**
1. **Two-Step Process**
   - Grid layout: 2 columns
   - Step 1: Search & Select (purple icon)
   - Step 2: Edit & Send (green icon)

### 4.2 Key UI Elements

**Info Banner:**
- Background: purple-50 (#f3e8ff)
- Border: purple-200
- Icon: Copy (purple-600, size-5)
- Title: text-sm, font-semibold, purple-900
- Message: text-sm, purple-800

**Search Bar:**
- Icon: Search (absolute left, gray-400, size-4)
- Input: pl-10 (padding for icon)
- Placeholder text in gray
- Real-time filtering on change

**RFQ Cards:**
- **Card Structure:**
  - Border: gray-200
  - Hover: shadow-md, border-purple-300
  - Cursor: pointer
  - Clickable entire card
  - Padding: pt-6

- **Card Header:**
  - RFQ ID: text-lg, font-semibold, gray-900
  - Status badge: colored (green/blue/gray)
  - Flex layout with gap-3

- **Card Content:**
  - Description: text-gray-700, mb-3
  - Metadata row: flex with gap-4
  - Icons with text (FileText, Users, Calendar)
  - Commodity badge: outline variant

- **Clone Button:**
  - Variant: outline, size-sm
  - Icon: Copy (size-4, mr-2)
  - Text: "Clone"
  - Position: top-right of card
  - Stops propagation on click

**Status Badges:**
- **Completed:**
  - Background: green-100
  - Text: green-800
  - Border: green-300
  - Icon: CheckCircle2

- **Active:**
  - Background: blue-100
  - Text: blue-800
  - Border: blue-300
  - Icon: Clock

- **Draft:**
  - Background: gray-100
  - Text: gray-800
  - Border: gray-300
  - Icon: FileText

**Empty State:**
- Icon: FileText (size-12, gray-400)
- Text: "No RFQs found matching your search"
- Center aligned
- Padding: py-8

**Info Card Steps:**
- **Step 1:**
  - Icon container: size-12, rounded-full, bg-purple-100
  - Icon: Search (size-6, purple-600)
  - Title: font-semibold, gray-900
  - Description: text-sm, gray-600

- **Step 2:**
  - Icon container: size-12, rounded-full, bg-green-100
  - Icon: CheckCircle2 (size-6, green-600)
  - Title: font-semibold, gray-900
  - Description: text-sm, gray-600

### 4.3 Information Hierarchy

**Primary Information:**
- RFQ ID and status
- Time savings message (60-70%)
- Search functionality

**Secondary Information:**
- RFQ description
- Parts count and suppliers count
- Creation date and commodity

**Tertiary Information:**
- Two-step process explanation
- Empty state message


## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| user_id | String | Authentication | Yes | UUID |
| session_id | String | System | Yes | UUID |

### 5.2 RFQ Data Fields (Core)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| rfq_id | String | Backend | Yes | Format: "RFQ-YYYY-NNN" |
| description | String | Backend | Yes | 2-500 characters |
| part_count | Number | Backend | Yes | Integer, >0 |
| supplier_count | Number | Backend | Yes | Integer, ≥0 |
| created_date | Date | Backend | Yes | ISO 8601 date |
| status | Enum | Backend | Yes | "completed", "active", "draft" |
| commodity | String | Backend | Yes | 2-100 characters |
| parts | Array<String> | Backend | Yes | Array of part names |

### 5.3 Search/Filter Data
| Field Name | Data Type | Purpose |
|------------|-----------|---------|
| search_query | String | User's search input |
| filtered_rfqs | Array<RFQ> | RFQs matching search |

### 5.4 Display Data (Derived)
| Field Name | Data Type | Source | Format |
|------------|-----------|--------|--------|
| formatted_created_date | String | created_date | "MMM DD, YYYY" |
| status_badge_color | String | status | CSS class |
| status_badge_icon | String | status | Icon component name |



## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**Dynamic RFQ Attributes:**
- RFQ list displays all previous RFQs with standard fields
- Future: Custom RFQ attributes from Master Field List
- Admin can configure which fields to display in RFQ cards
- Search can be configured to search additional fields

**Status Types:**
- Standard statuses: Completed, Active, Draft
- Admin can configure additional custom statuses
- Status badges adapt to configured types
- Colors and icons configurable per status

**Search Configuration:**
- Search fields: RFQ ID, description, commodity (default)
- Admin can add additional searchable fields
- Search algorithm configurable (exact, fuzzy, partial)

### 6.2 UI Adaptation Logic

**RFQ List Display:**
- If no RFQs exist: Show empty state with message
- If 1-10 RFQs: Show all without pagination
- If 11+ RFQs: Enable search and consider pagination (future)
- Search filters list in real-time

**Status Badge Display:**
- Completed: Green badge with CheckCircle2 icon
- Active: Blue badge with Clock icon
- Draft: Gray badge with FileText icon
- Custom statuses: Configurable colors and icons

**Empty State:**
- If no RFQs match search: Show "No RFQs found" message
- If user has no RFQs at all: Show "No previous RFQs" with suggestion
- Provide clear guidance on next steps

**Card Interaction:**
- Entire card clickable for selection
- Clone button also triggers selection
- Hover effects indicate interactivity
- Selected card shows visual feedback before navigation

### 6.3 LLM Integration

**Smart RFQ Recommendation:**
- LLM analyzes current project context and recommends most similar RFQ
- Factors considered:
  - Part names and materials
  - Commodity type
  - Supplier overlap
  - Recent usage
  - Success rate
- Recommended RFQ highlighted with badge (future enhancement)

**Search Enhancement:**
- LLM improves search with semantic understanding
- Searches by meaning, not just keywords
- Example: "aluminum brackets" finds "ALU-BRACKET" RFQs
- Handles typos and variations

**Auto-Fill Intelligence:**
- LLM pre-fills cloned RFQ with smart defaults
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

**Action: Search RFQs**
- **Trigger:** User types in search bar
- **Behavior:**
  1. Update search_query state
  2. Filter RFQ list in real-time
  3. Match against: RFQ ID, description, commodity
  4. Display filtered results
  5. Show empty state if no matches
- **Validation:** None
- **Success:** Filtered RFQ list displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Select RFQ (Click Card)**
- **Trigger:** User clicks anywhere on RFQ card
- **Behavior:**
  1. Highlight card with visual feedback
  2. Record RFQ selection
  3. Fetch full RFQ data from backend
  4. Navigate to RFQ Form with pre-filled data
  5. Pass rfq_id and mode="clone" as parameters
- **Validation:** None
- **Success:** Navigate to RFQ Form with cloned data
- **Error:** Display error toast if fetch or navigation fails
- **Navigation:** Clone Existing RFQ → RFQ Form (pre-filled)

**Action: Select RFQ (Click Clone Button)**
- **Trigger:** User clicks "Clone" button on RFQ card
- **Behavior:**
  1. Stop event propagation (prevent card click)
  2. Highlight card with visual feedback
  3. Record RFQ selection
  4. Fetch full RFQ data from backend
  5. Navigate to RFQ Form with pre-filled data
  6. Pass rfq_id and mode="clone" as parameters
- **Validation:** None
- **Success:** Navigate to RFQ Form with cloned data
- **Error:** Display error toast if fetch or navigation fails
- **Navigation:** Clone Existing RFQ → RFQ Form (pre-filled)

### 7.2 Secondary Actions

**Action: Hover RFQ Card**
- **Trigger:** User hovers over RFQ card
- **Behavior:**
  - Increase shadow (shadow-md)
  - Change border color to purple-300
  - Cursor changes to pointer
  - Smooth transition animation
- **Validation:** None
- **Success:** Visual feedback provided
- **Error:** N/A
- **Navigation:** None

**Action: View RFQ Details**
- **Trigger:** User views RFQ card content
- **Behavior:**
  - Display RFQ ID, status, description
  - Show parts count, suppliers count, date
  - Display commodity badge
  - All information visible without interaction
- **Validation:** None
- **Success:** Details displayed
- **Error:** N/A
- **Navigation:** None

**Action: Read Info Banner**
- **Trigger:** User views time savings banner at top
- **Behavior:**
  - Display 60-70% time savings message
  - Explain cloning benefits
  - Purple theme for emphasis
- **Validation:** None
- **Success:** Info displayed
- **Error:** N/A
- **Navigation:** None

**Action: Read Process Steps**
- **Trigger:** User scrolls to bottom info card
- **Behavior:**
  - Display two-step process explanation
  - Step 1: Search & Select
  - Step 2: Edit & Send
  - Visual icons for each step
- **Validation:** None
- **Success:** Info displayed
- **Error:** N/A
- **Navigation:** None

### 7.3 Navigation

**From:**
- RFQ Method Selection (via "Clone Existing RFQ" selection)

**To:**
- RFQ Form (via RFQ card click or Clone button)
  - Pre-filled with cloned RFQ data
  - mode="clone" parameter
  - rfq_id parameter

**Exit Points:**
- RFQ selection → RFQ Form (pre-filled)
- Browser back button → RFQ Method Selection
- App Header logo → Projects List



## 8. Business Rules

### 8.1 Validation Rules

**RFQ Availability:**
- User must have at least 1 previous RFQ to access this screen
- If no RFQs exist: Show empty state with guidance
- RFQs must belong to authenticated user
- Only RFQs with status "completed", "active", or "draft" are shown

**Search Validation:**
- Search query: 0-200 characters
- No special validation required
- Empty search shows all RFQs
- Search is case-insensitive

**Selection Validation:**
- Selected RFQ must exist and be accessible
- User must have permission to clone RFQ
- RFQ data must be complete and valid

### 8.2 Calculation Logic

**Search Filtering:**
```
filtered_rfqs = rfqs.filter(rfq => 
  rfq.rfq_id.toLowerCase().includes(search_query.toLowerCase()) OR
  rfq.description.toLowerCase().includes(search_query.toLowerCase()) OR
  rfq.commodity.toLowerCase().includes(search_query.toLowerCase())
)
```

**Date Formatting:**
```
formatted_date = format(created_date, "MMM DD, YYYY")
Example: "Dec 15, 2024"
```

**Status Badge Mapping:**
```
IF status === "completed":
  badge_color = "green"
  badge_icon = "CheckCircle2"
ELSE IF status === "active":
  badge_color = "blue"
  badge_icon = "Clock"
ELSE IF status === "draft":
  badge_color = "gray"
  badge_icon = "FileText"
```

### 8.3 Conditional Display Logic

**Empty State Display:**
- If user has 0 RFQs:
  - Show empty state with FileText icon
  - Message: "No previous RFQs available"
  - Suggest using other methods
  - Hide search bar
- If search returns 0 results:
  - Show empty state with FileText icon
  - Message: "No RFQs found matching your search"
  - Show search bar
  - Allow clearing search

**RFQ Card Display:**
- Show all RFQs that match search filter
- Sort by: created_date (newest first)
- Display: RFQ ID, status, description, parts count, suppliers count, date, commodity
- Clone button always visible on each card

**Info Banner Display:**
- Always show time savings banner at top
- Highlight 60-70% time savings
- Purple theme for emphasis

**Process Steps Display:**
- Always show at bottom
- Two-step process explanation
- Visual icons for each step

### 8.4 Error Handling

**No RFQs Available Error:**
- **Detection:** User has 0 previous RFQs
- **Handling:**
  - Show empty state: "No previous RFQs available"
  - Display message: "You haven't created any RFQs yet. Try Upload Files or Create From Scratch."
  - Provide button to return to Method Selection
  - Log for monitoring

**RFQ Fetch Error:**
- **Detection:** API call to fetch RFQ data fails
- **Handling:**
  - Display error toast: "Failed to load RFQ. Please try again."
  - Keep user on current screen
  - Provide retry option
  - Log error for monitoring

**RFQ Clone Error:**
- **Detection:** Navigation to RFQ Form fails or RFQ data invalid
- **Handling:**
  - Display error toast: "Unable to clone RFQ. Please try another one."
  - Stay on current screen
  - Allow selecting different RFQ
  - Log error for monitoring

**Search Error:**
- **Detection:** Search functionality fails (unlikely)
- **Handling:**
  - Show all RFQs (ignore search)
  - Display warning: "Search temporarily unavailable"
  - Log error for monitoring

**Session Expired Error:**
- **Detection:** User's session expires while viewing screen
- **Handling:**
  - Show modal: "Session expired. Please log in again."
  - Redirect to login after confirmation
  - Preserve selected RFQ for post-login redirect

**Network Error:**
- **Detection:** No internet connection or API unreachable
- **Handling:**
  - Display error banner: "Connection lost. Please check your connection."
  - Disable RFQ selection
  - Allow viewing cached RFQs (if available)
  - Provide retry option
  - Log error for monitoring

**Permission Error:**
- **Detection:** User doesn't have permission to clone RFQ
- **Handling:**
  - Display error toast: "You don't have permission to clone this RFQ."
  - Keep user on current screen
  - Hide or disable affected RFQ card
  - Log error for monitoring



## 9. Acceptance Criteria

### 9.1 Functional Criteria

1. WHEN user navigates to Clone Existing RFQ THEN screen SHALL display within 2 seconds
2. WHEN screen loads THEN all user's previous RFQs SHALL be displayed
3. WHEN screen loads THEN time savings banner SHALL be displayed
4. WHEN screen loads THEN search bar SHALL be displayed
5. WHEN user types in search bar THEN RFQ list SHALL filter in real-time
6. WHEN user searches by RFQ ID THEN matching RFQs SHALL be displayed
7. WHEN user searches by description THEN matching RFQs SHALL be displayed
8. WHEN user searches by commodity THEN matching RFQs SHALL be displayed
9. WHEN search returns no results THEN empty state SHALL be displayed
10. WHEN user clears search THEN all RFQs SHALL be displayed again
11. WHEN user clicks RFQ card THEN system SHALL navigate to RFQ Form with pre-filled data
12. WHEN user clicks Clone button THEN system SHALL navigate to RFQ Form with pre-filled data
13. WHEN user hovers over RFQ card THEN card SHALL show hover effects
14. WHEN RFQ has "completed" status THEN green badge SHALL be displayed
15. WHEN RFQ has "active" status THEN blue badge SHALL be displayed
16. WHEN RFQ has "draft" status THEN gray badge SHALL be displayed
17. WHEN user has no previous RFQs THEN empty state SHALL be displayed
18. WHEN RFQ fetch fails THEN error toast SHALL be displayed
19. WHEN navigation fails THEN error toast SHALL be displayed
20. WHEN session expires THEN user SHALL be redirected to login
21. WHEN user clicks browser back button THEN system SHALL return to Method Selection
22. WHEN RFQ is selected THEN selection SHALL be recorded for analytics
23. WHEN RFQ data is fetched THEN it SHALL include all fields for cloning
24. WHEN RFQ Form loads THEN all fields SHALL be pre-filled with cloned data
25. WHEN cloned RFQ is modified THEN it SHALL create new RFQ (not overwrite original)
26. WHEN RFQ list is displayed THEN RFQs SHALL be sorted by date (newest first)
27. WHEN RFQ card is displayed THEN all key information SHALL be visible
28. WHEN process steps are displayed THEN two-step explanation SHALL be shown
29. WHEN info banner is displayed THEN 60-70% time savings SHALL be highlighted
30. WHEN user selects RFQ THEN system SHALL pass rfq_id and mode="clone" to next screen

### 9.2 Flexibility Criteria

1. WHEN admin adds new status type THEN it SHALL appear with configured badge
2. WHEN admin configures search fields THEN search SHALL include those fields
3. WHEN admin configures card display THEN cards SHALL show configured fields
4. WHEN LLM is available THEN smart recommendations SHALL be provided (future)
5. WHEN LLM is unavailable THEN standard search SHALL work normally
6. WHEN custom RFQ attributes exist THEN they SHALL be preserved in clone
7. WHEN RFQ has dynamic fields THEN they SHALL be cloned correctly
8. WHEN Master Field List changes THEN cloned RFQs SHALL adapt to new structure
9. WHEN RFQ has optional fields THEN they SHALL be included in clone
10. WHEN RFQ has required fields THEN they SHALL be validated in clone

### 9.3 UX Criteria

1. Screen loads within 2 seconds on standard broadband connection
2. Search filters results within 200ms of typing
3. RFQ cards are visually distinct and easy to scan
4. Status badges are clearly visible with appropriate colors
5. Hover effects are smooth and responsive
6. Time savings banner is prominent and attention-grabbing
7. Empty state provides clear guidance
8. Process steps explanation sets clear expectations
9. All interactive elements have pointer cursor
10. Card shadows increase on hover
11. Typography is clear and readable
12. Spacing is consistent throughout screen
13. Mobile-responsive design works on screens 768px and wider
14. Search bar is easily accessible at top
15. Clone button is clearly visible on each card
16. RFQ information is well-organized and scannable
17. Date format is user-friendly (MMM DD, YYYY)
18. Parts and suppliers counts are clearly displayed
19. Commodity badges are visually distinct
20. Info banner uses appropriate color (purple for emphasis)
21. Process steps use visual icons for clarity
22. Empty state icon is appropriate and clear
23. Error messages are clear and actionable
24. Loading states provide feedback during fetch
25. Navigation is smooth and predictable

### 9.4 Performance Criteria

1. Initial page load completes within 2 seconds
2. RFQ list renders within 1 second
3. Search filtering responds within 200ms
4. Card hover effects respond within 100ms
5. RFQ selection and navigation complete within 1 second
6. RFQ data fetch completes within 2 seconds
7. Screen handles 100+ RFQs without performance degradation
8. Search handles large RFQ lists efficiently
9. No memory leaks during search operations
10. Smooth scrolling with large RFQ lists
11. Images and icons load progressively
12. No layout shifts during load
13. Animations run at 60fps
14. API calls are optimized with caching
15. Network requests are minimized

### 9.5 Accessibility Criteria

1. All RFQ cards are keyboard accessible (tab navigation)
2. Focus indicators are clearly visible
3. Search bar is keyboard accessible
4. Clone buttons have descriptive aria-labels
5. Status badges have aria-labels
6. Screen reader announces RFQ count
7. Screen reader announces search results count
8. Empty state is announced to screen readers
9. Error messages are announced to screen readers
10. Color is not the only means of conveying status
11. Text has sufficient contrast ratio (WCAG AA: 4.5:1)
12. Icons have aria-labels or are marked as decorative
13. RFQ cards have proper semantic structure
14. Headings have proper hierarchy
15. Links and buttons are distinguishable

### 9.6 Security Criteria

1. User must be authenticated to access screen
2. Session validation occurs on page load
3. Expired sessions redirect to login
4. Only user's own RFQs are displayed
5. RFQ data is validated before cloning
6. Permission checks occur before RFQ access
7. XSS protection on all displayed text
8. CSRF protection on RFQ fetch
9. Rate limiting on API calls
10. Audit log records RFQ cloning
11. No sensitive data exposed in client-side code
12. RFQ IDs are validated before fetch
13. User permissions are checked on backend
14. Cloned RFQs maintain security settings
15. Original RFQs are not modified by cloning



## 10. Edge Cases & Error Scenarios

### 10.1 Data Edge Cases

**No Previous RFQs:**
- **Scenario:** User has never created an RFQ before
- **Handling:**
  - Show empty state with FileText icon
  - Display message: "No previous RFQs available. You haven't created any RFQs yet."
  - Provide guidance: "Try Upload Files or Create From Scratch methods."
  - Provide button: "Back to Method Selection"
  - Hide search bar (no RFQs to search)
  - Log for monitoring

**Single Previous RFQ:**
- **Scenario:** User has exactly one previous RFQ
- **Handling:**
  - Display single RFQ card
  - Show search bar (for consistency)
  - All functionality works normally
  - Clear selection path

**Many Previous RFQs (100+):**
- **Scenario:** User has 100+ previous RFQs
- **Handling:**
  - Display all RFQs (no pagination initially)
  - Search becomes essential for finding RFQs
  - Performance optimized for large lists
  - Consider pagination in future enhancement
  - Scroll smoothly with virtual scrolling (future)

**RFQ with Missing Data:**
- **Scenario:** RFQ has incomplete or corrupted data
- **Handling:**
  - Display RFQ card with available data
  - Show placeholder for missing fields: "-"
  - Allow selection but warn user
  - Validate data before cloning
  - Log warning for monitoring

**RFQ with Outdated Data:**
- **Scenario:** RFQ is very old (1+ years)
- **Handling:**
  - Display RFQ normally
  - Show age indicator (future enhancement)
  - LLM suggests updating outdated fields (future)
  - Allow cloning with warning (future)

**RFQ with Many Parts (50+):**
- **Scenario:** RFQ has 50+ parts
- **Handling:**
  - Display parts count: "50+ parts"
  - Clone all parts to new RFQ
  - Performance optimized for large clones
  - Show progress indicator during clone

**RFQ with Many Suppliers (20+):**
- **Scenario:** RFQ has 20+ suppliers
- **Handling:**
  - Display suppliers count: "20+ suppliers"
  - Clone all suppliers to new RFQ
  - All supplier data preserved

**Duplicate RFQ Descriptions:**
- **Scenario:** Multiple RFQs have same description
- **Handling:**
  - Display all matching RFQs
  - Differentiate by RFQ ID and date
  - User selects based on ID or date
  - Search works normally

### 10.2 Interaction Edge Cases

**Rapid Card Clicks:**
- **Scenario:** User clicks RFQ card multiple times quickly
- **Handling:**
  - Navigate only once
  - Disable all cards after first click
  - Show loading indicator
  - Re-enable if navigation fails

**Click Multiple Cards:**
- **Scenario:** User clicks different cards in quick succession
- **Handling:**
  - Honor first click only
  - Ignore subsequent clicks
  - Navigate to first selected RFQ
  - Log warning for monitoring

**Search While Loading:**
- **Scenario:** User types in search bar while RFQs loading
- **Handling:**
  - Queue search until load complete
  - Apply search after RFQs loaded
  - Show loading indicator
  - Smooth transition to filtered results

**Clear Search:**
- **Scenario:** User clears search bar
- **Handling:**
  - Show all RFQs again
  - Smooth transition
  - Maintain scroll position if possible

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
  - Cards reflow smoothly
  - No content overflow or clipping
  - Maintain readability

**Browser Back Button:**
- **Scenario:** User clicks browser back button
- **Handling:**
  - Return to RFQ Method Selection
  - No data loss
  - Normal browser behavior

**Long RFQ Descriptions:**
- **Scenario:** RFQ description is very long (200+ characters)
- **Handling:**
  - Truncate description in card
  - Show first 150 characters + "..."
  - Full description visible on hover (future)
  - Full description in cloned form

### 10.3 System Edge Cases

**Session Expires During View:**
- **Scenario:** User's session expires while viewing screen
- **Handling:**
  - Detect expired session on RFQ selection
  - Show modal: "Session expired. Please log in again."
  - Redirect to login after confirmation
  - Preserve selected RFQ for post-login redirect

**Network Disconnection:**
- **Scenario:** User loses internet connection
- **Handling:**
  - Show banner: "Connection lost. Please check your connection."
  - Disable RFQ selection
  - Allow viewing cached RFQs (if available)
  - Auto-retry connection every 10 seconds
  - Show success message when reconnected

**Slow Network:**
- **Scenario:** User on slow connection (2G/3G)
- **Handling:**
  - Show loading indicators
  - Load RFQ list progressively
  - Provide feedback on load progress
  - Timeout after 30 seconds
  - Allow retry on timeout

**RFQ Fetch Timeout:**
- **Scenario:** API call to fetch RFQ data times out
- **Handling:**
  - Display error toast: "Request timed out. Please try again."
  - Keep user on current screen
  - Provide retry option
  - Log error for monitoring

**RFQ Data Validation Failure:**
- **Scenario:** Fetched RFQ data fails validation
- **Handling:**
  - Display error toast: "RFQ data is invalid. Please try another one."
  - Keep user on current screen
  - Allow selecting different RFQ
  - Log error for monitoring

**Concurrent RFQ Modification:**
- **Scenario:** Original RFQ is modified while user is cloning
- **Handling:**
  - Clone uses snapshot from selection time
  - No impact on cloning process
  - Original RFQ modifications don't affect clone

**Browser Compatibility:**
- **Scenario:** User on unsupported browser
- **Handling:**
  - Detect browser version on load
  - Show warning if unsupported
  - Provide graceful degradation (basic functionality)
  - Recommend supported browsers

**Large RFQ Clone:**
- **Scenario:** Cloning RFQ with 100+ parts and 50+ suppliers
- **Handling:**
  - Show progress indicator during clone
  - Optimize data transfer
  - Stream data if necessary
  - Provide feedback on progress
  - Timeout after 60 seconds
  - Allow retry on timeout



## 11. Backend API Requirements

### 11.1 API Endpoints

**GET /api/v1/users/:user_id/rfqs**
- **Purpose:** Get list of user's previous RFQs for cloning
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `user_id` (required): User ID
- **Query Parameters:**
  - `status` (optional): Filter by status (completed, active, draft)
  - `limit` (optional): Max number of RFQs to return (default: 100)
  - `offset` (optional): Pagination offset (default: 0)
- **Response:** 200 OK
  ```json
  {
    "rfqs": [
      {
        "rfq_id": "RFQ-2024-045",
        "description": "Aluminum Mounting Brackets",
        "status": "completed",
        "part_count": 3,
        "supplier_count": 5,
        "created_date": "2024-12-15T10:00:00Z",
        "commodity": "Stamping",
        "parts": ["ALU-BRACKET-001", "ALU-BRACKET-002", "ALU-BRACKET-003"]
      }
    ],
    "total_count": 45,
    "has_more": false
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: No permission to access RFQs
  - 500 Internal Server Error: Server error

**GET /api/v1/rfqs/:rfq_id**
- **Purpose:** Get full RFQ data for cloning
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `rfq_id` (required): RFQ ID to clone
- **Response:** 200 OK
  ```json
  {
    "rfq_id": "RFQ-2024-045",
    "project_id": "PRJ-2024-010",
    "description": "Aluminum Mounting Brackets",
    "commodity": "Stamping",
    "status": "completed",
    "created_date": "2024-12-15T10:00:00Z",
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
  - 403 Forbidden: No permission to access RFQ
  - 404 Not Found: RFQ not found
  - 500 Internal Server Error: Server error

**POST /api/v1/analytics/rfq-clone**
- **Purpose:** Record RFQ cloning for analytics
- **Authentication:** Required (Bearer token)
- **Request Body:**
  ```json
  {
    "user_id": "user-123",
    "original_rfq_id": "RFQ-2024-045",
    "project_id": "PRJ-2025-001",
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
- **Error Responses:**
  - 400 Bad Request: Invalid data
  - 401 Unauthorized: Invalid or expired token
  - 500 Internal Server Error: Server error

### 11.2 Data Models

```typescript
interface RFQListItem {
  rfq_id: string;
  description: string;
  status: 'completed' | 'active' | 'draft';
  part_count: number;
  supplier_count: number;
  created_date: string;
  commodity: string;
  parts: string[];
}

interface RFQListResponse {
  rfqs: RFQListItem[];
  total_count: number;
  has_more: boolean;
}

interface RFQFullData {
  rfq_id: string;
  project_id: string;
  description: string;
  commodity: string;
  status: string;
  created_date: string;
  parts: Part[];
  suppliers: Supplier[];
  requirements: Requirements;
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

interface File {
  file_id: string;
  file_name: string;
  file_url: string;
}

interface RFQCloneAnalytics {
  user_id: string;
  original_rfq_id: string;
  project_id: string;
  timestamp: string;
}
```

### 11.3 Caching Strategy

**Client-Side Caching:**
- Cache RFQ list for 5 minutes
- Invalidate cache on:
  - New RFQ creation
  - RFQ deletion
  - Manual refresh
- Cache full RFQ data for 10 minutes
- Invalidate on RFQ modification

**Server-Side Caching:**
- Cache RFQ list (Redis, 2 minutes TTL)
- Cache full RFQ data (Redis, 5 minutes TTL)
- Invalidate on RFQ mutations
- Use cache keys: `rfq:list:user:{user_id}`, `rfq:full:{rfq_id}`

### 11.4 Real-Time Updates

**RFQ List Updates:**
- WebSocket connection for real-time RFQ list updates (future)
- Notify when new RFQ created
- Notify when RFQ status changes
- Auto-refresh list on updates

**Concurrent Access:**
- Handle concurrent cloning of same RFQ
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
- Suggest selecting different RFQ
- Log error for monitoring

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
- Rationale: 60-70% of RFQs reuse same suppliers and requirements
- Cloning saves 60-70% of setup time (from ~5 minutes to ~1-2 minutes)
- Most popular method among users
- Key selling point of the product
- Reduces repetitive data entry and errors

**Search-First Approach:**
- Rationale: Users may have many previous RFQs
- Search helps find relevant RFQ quickly
- Real-time filtering provides immediate feedback
- Search by ID, description, or commodity covers most use cases
- Simple search interface reduces cognitive load

**Card-Based Display:**
- Rationale: Cards provide visual hierarchy and scannability
- Each card shows all key information at a glance
- Entire card clickable for better UX
- Hover effects indicate interactivity
- Status badges provide quick visual cues

**Time Savings Emphasis:**
- Rationale: 60-70% time savings is key selling point
- Purple banner at top draws attention
- Reinforces value proposition
- Motivates users to use this method
- Differentiates from other methods

**Two-Step Process:**
- Rationale: Clear expectations reduce uncertainty
- Step 1: Search & Select (this screen)
- Step 2: Edit & Send (RFQ Form)
- Visual icons aid understanding
- Sets clear mental model

### 12.2 Future Enhancements

**Smart RFQ Recommendations:**
- LLM analyzes current project and recommends most similar RFQ
- Display recommendation badge on suggested RFQ
- Explain reasoning: "Based on similar parts and commodity"
- Allow user to override recommendation
- Learn from user's selection patterns

**Advanced Search:**
- Filter by date range
- Filter by status
- Filter by commodity
- Filter by supplier
- Filter by parts count
- Multi-criteria search
- Saved search filters

**RFQ Comparison:**
- Select multiple RFQs to compare
- Side-by-side comparison view
- Highlight differences
- Choose best RFQ to clone
- Merge features from multiple RFQs

**Quick Preview:**
- Hover over card to see detailed preview
- Show parts list, suppliers list, requirements
- Preview without navigation
- Reduce clicks for exploration

**Bulk Cloning:**
- Clone multiple RFQs at once
- Merge into single project
- Useful for complex projects
- Combine parts from multiple sources

**RFQ Templates:**
- Mark RFQs as templates
- Templates appear at top of list
- Optimized for reuse
- Separate section for templates

**Pagination:**
- Implement pagination for 100+ RFQs
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

### 12.3 Dependencies

**Required Screens:**
- RFQ Method Selection (prerequisite)
- RFQ Form (navigation target - with pre-filled data)

**Required APIs:**
- Authentication API
- RFQs List API
- RFQ Full Data API
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
- Status badge mapping
- Date formatting
- Empty state logic
- Card interaction logic

**Integration Tests:**
- API integration (RFQ list fetch)
- API integration (RFQ full data fetch)
- Authentication flow
- Navigation to RFQ Form
- Analytics recording
- Caching behavior

**E2E Tests:**
- Complete user journey: Method Selection → Clone Existing → RFQ Form
- Search and select RFQ workflow
- Clone RFQ with various data scenarios
- Error handling scenarios
- Empty state scenarios
- Multiple RFQs scenarios

**Performance Tests:**
- Load time with 100+ RFQs
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

1. **Pagination:** Should we implement pagination for 100+ RFQs or use infinite scroll?
2. **RFQ Preview:** Should hovering show detailed preview or require click?
3. **Sorting:** What should be the default sort order (date, status, or relevance)?
4. **Filters:** Should we add advanced filters (date range, status, commodity)?
5. **Recommendations:** Should LLM recommendations be shown prominently or subtly?
6. **Templates:** Should we have a separate section for RFQ templates?
7. **Comparison:** Should users be able to compare multiple RFQs before cloning?
8. **Bulk Clone:** Should system support cloning multiple RFQs at once?
9. **RFQ Age:** Should we show age indicator for old RFQs (1+ years)?
10. **Auto-Update:** Should cloned RFQs auto-update outdated information (prices, lead times)?
11. **Clone History:** Should we track which RFQs were cloned from which?
12. **Clone Frequency:** Should we show how often each RFQ has been cloned?
13. **Recent Clones:** Should we show "Recently Cloned" section at top?
14. **Favorites:** Should users be able to favorite RFQs for quick access?
15. **Search History:** Should we save and suggest previous searches?

### 12.6 Key Metrics to Track

**Usage Metrics:**
- Number of RFQs cloned per user
- Time spent on screen before selection
- Search usage rate
- Most cloned RFQs
- Clone success rate

**Performance Metrics:**
- Page load time
- Search response time
- RFQ fetch time
- Navigation time
- Error rate

**Business Metrics:**
- Time savings vs. other methods
- User satisfaction with cloning
- Clone completion rate
- Modifications made to cloned RFQs
- Return rate to this screen

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial screen requirements document |
