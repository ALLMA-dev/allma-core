# RFQ Method Selection

## 1. Overview
- **Screen ID:** SCR-008
- **Component File:** `src/app/components/RFQMethodSelection.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** Low - Method selection is standardized

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** choose how to create my RFQ from three different methods  
**So that** I can use the approach that best fits my situation and saves the most time

### Related User Stories
- **US-MVP-02A:** Create RFQ Manually from Scratch
- **US-MVP-02B:** Duplicate Existing RFQ with Modifications (60-70% time savings)
- **US-MVP-02C:** Create RFQ from Uploaded Files (Auto-Parsing)

## 3. Screen Purpose & Context

### Purpose
This screen presents three distinct methods for creating an RFQ, allowing buyers to choose the approach that best fits their workflow:
- **Upload RFQ Files:** AI auto-fills form from existing documents (PPT, Excel, PDF)
- **Clone Existing RFQ:** Duplicate previous RFQ with pre-filled fields (most popular, 60-70% usage)
- **Create From Scratch:** Manual entry using step-by-step wizard

### Context
- **When user sees this:** 
  - After completing "The Split" and saving project with new parts
  - When clicking "Create New RFQ" from Projects List
  - When starting RFQ creation workflow
- **Why it exists:** 
  - Provide flexibility for different workflows and situations
  - Highlight time-saving options (cloning saves 60-70% of time)
  - Guide users to most efficient method based on their needs
  - Support different starting points (existing docs, previous RFQs, blank slate)
- **Position in journey:** 
  - After The Split (parts classified as "new")
  - Before RFQ creation workflow
  - Gateway to three different RFQ creation paths

### Key Characteristics
- **Three clear options:** Visual cards with distinct colors and icons
- **Usage statistics:** Shows how often each method is used (60-70% clone, 20-30% upload, 10-20% scratch)
- **Time estimates:** Displays expected setup time for each method
- **Comparison table:** Side-by-side comparison of all three methods
- **Guidance:** "Best for" descriptions help users choose appropriate method


## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Title:** "RFQ Initiation - Choose Method"
2. **Subtitle:** "Select how you want to create your Request for Quotation"

**Info Banner:**
1. **Time-Saving Tip Card**
   - Blue background (#eff6ff)
   - TrendingUp icon
   - Title: "Time-Saving Tip"
   - Message: Explains that 60-70% of users clone existing RFQs for 60-70% time savings

**Method Cards (3 cards in grid):**
1. **Upload RFQ Files Card**
   - Blue theme (#2563eb)
   - Upload icon
   - Time: ~4 minutes
   - Usage: 20-30%
   - Best for: Existing RFQ documents

2. **Clone Existing RFQ Card**
   - Purple theme (#9333ea)
   - Copy icon
   - "Most Popular" badge
   - Time: ~3 minutes
   - Usage: 60-70%
   - Best for: Similar projects

3. **Create From Scratch Card**
   - Green theme (#16a34a)
   - PenSquare icon
   - Time: ~5 minutes
   - Usage: 10-20%
   - Best for: Unique requirements

**Comparison Table:**
1. **Table Header**
   - Title: "Method Comparison"
   - Description: "Choose the method that best fits your workflow"

2. **Table Columns**
   - Method (with icon)
   - Setup Time
   - Best For
   - Usage
   - Key Benefit

3. **Table Rows**
   - One row per method
   - Clone Existing row highlighted (purple background)

**Additional Info Card:**
1. **What Happens Next Section**
   - FileText icon
   - Title: "What happens next?"
   - Bullet list explaining next steps for each method

### 4.2 Key UI Elements

**Info Banner:**
- Background: blue-50 (#eff6ff)
- Border: blue-200
- Icon: TrendingUp (blue-600, size-5)
- Title: text-sm, font-semibold, blue-900
- Message: text-sm, blue-800

**Method Cards:**
- **Card Structure:**
  - Border color matches theme
  - Background color matches theme (lighter shade)
  - Cursor: pointer
  - Hover: shadow-lg, darker background
  - Clickable entire card

- **Card Header:**
  - Icon in colored box (p-3, rounded-lg)
  - Title: text-lg, bold
  - Description: text-gray-700

- **Card Content:**
  - Time estimate with Clock icon
  - Usage percentage
  - "Best For" section (white/50 background, rounded, bordered)
  - "Select This Method" button (full width, colored)

- **Badge (Clone card only):**
  - Position: absolute, -top-2, -right-2
  - Background: purple-600
  - Text: white
  - Content: "Most Popular"

**Comparison Table:**
- **Table Styling:**
  - Header: bg-gray-50, border-b
  - Rows: divide-y, hover:bg-gray-50
  - Clone row: bg-purple-50 (highlighted)
  - Cells: px-4, py-3

- **Method Column:**
  - Icon + method name
  - Badge for "Most Popular" (Clone row)

- **Data Columns:**
  - Text: text-sm, gray-700
  - Font: medium for method names

**Additional Info Card:**
- Border: gray-200
- Icon: FileText (gray-600, size-5)
- Title: text-sm, font-semibold, gray-900
- List items: text-sm, gray-700
- Bold method names in list

### 4.3 Information Hierarchy

**Primary Information:**
- Three method options with clear visual distinction
- Time estimates and usage statistics
- "Most Popular" indicator for Clone method

**Secondary Information:**
- "Best for" descriptions for each method
- Key benefits in comparison table
- Time-saving tip in info banner

**Tertiary Information:**
- Detailed comparison table
- "What happens next" explanations
- Usage percentages


## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| user_id | String | Authentication | Yes | UUID |
| session_id | String | System | Yes | UUID |
| project_id | String | Previous Screen | Yes | From The Split or Projects List |

### 5.2 Method Configuration Data
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| method_id | Enum | System | Yes | "upload", "clone", "scratch" |
| method_title | String | System | Yes | Display name |
| method_description | String | System | Yes | 2-200 characters |
| icon_name | String | System | Yes | Lucide icon name |
| icon_color | String | System | Yes | Tailwind color class |
| bg_color | String | System | Yes | Tailwind color class |
| border_color | String | System | Yes | Tailwind color class |
| time_estimate | String | System | Yes | Format: "~X minutes" |
| usage_percentage | String | System | Yes | Format: "XX-XX%" |
| best_for | String | System | Yes | 2-200 characters |
| key_benefit | String | System | Yes | 2-200 characters |
| target_screen_id | Number | System | Yes | Navigation target |

### 5.3 Display Data (Static)
| Field Name | Value | Purpose |
|------------|-------|---------|
| upload_time | "~4 minutes" | Time estimate for upload method |
| upload_usage | "20-30%" | Usage statistics for upload method |
| clone_time | "~3 minutes" | Time estimate for clone method |
| clone_usage | "60-70%" | Usage statistics for clone method |
| scratch_time | "~5 minutes" | Time estimate for scratch method |
| scratch_usage | "10-20%" | Usage statistics for scratch method |

### 5.4 Navigation Data
| Field Name | Data Type | Purpose |
|------------|-----------|---------|
| selected_method | Enum | Track which method user selected |
| navigation_timestamp | DateTime | When user made selection |
| source_screen | String | Where user came from (The Split, Projects List) |


## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**Method Configuration:**
- Three methods are standard and fixed
- Method order, colors, and descriptions are configurable by Admin
- Usage statistics can be updated based on actual usage data
- Time estimates can be adjusted based on user feedback

**Badge Display:**
- "Most Popular" badge shown on method with highest usage
- Badge can be configured to show on different method
- Badge text and color configurable

### 6.2 UI Adaptation Logic

**Method Availability:**
- All three methods always available
- If user has no previous RFQs: Clone method shows message "No previous RFQs available"
- If user has previous RFQs: Clone method shows count "X previous RFQs available"

**Usage Statistics:**
- Statistics calculated from actual user behavior
- Updated monthly or quarterly
- Displayed as ranges (e.g., "60-70%") for flexibility

**Time Estimates:**
- Based on average completion times
- Can be personalized per user (future enhancement)
- Displayed as approximations ("~X minutes")

### 6.3 LLM Integration

**Method Recommendation:**
- LLM analyzes user's situation and recommends best method
- Factors considered:
  - Availability of previous similar RFQs
  - Availability of existing documents
  - Project complexity
  - User's past behavior
- Recommendation displayed as subtle indicator (future enhancement)

**Smart Defaults:**
- LLM pre-selects most likely method based on context
- If coming from The Split with new parts: suggest Clone if similar RFQs exist
- If user uploaded documents in previous step: suggest Upload method
- If completely new project type: suggest From Scratch

**Fallback Behavior:**
- If LLM unavailable: Show all methods equally
- No recommendation displayed
- User makes choice based on descriptions
- System remains fully functional


## 7. User Interactions

### 7.1 Primary Actions

**Action: Select Upload RFQ Files Method**
- **Trigger:** User clicks "Upload RFQ Files" card or "Select This Method" button
- **Behavior:**
  1. Highlight card with visual feedback
  2. Record method selection
  3. Navigate to Upload RFQ Files screen
  4. Pass project_id and method="upload" as parameters
- **Validation:** None
- **Success:** Navigate to Upload RFQ Files screen
- **Error:** Display error toast if navigation fails
- **Navigation:** RFQ Method Selection → Upload RFQ Files

**Action: Select Clone Existing RFQ Method**
- **Trigger:** User clicks "Clone Existing RFQ" card or "Select This Method" button
- **Behavior:**
  1. Highlight card with visual feedback
  2. Record method selection
  3. Navigate to Clone Existing RFQ screen
  4. Pass project_id and method="clone" as parameters
- **Validation:** Check if user has previous RFQs
- **Success:** Navigate to Clone Existing RFQ screen
- **Error:** 
  - If no previous RFQs: Show message "No previous RFQs available. Please use another method."
  - If navigation fails: Display error toast
- **Navigation:** RFQ Method Selection → Clone Existing RFQ

**Action: Select Create From Scratch Method**
- **Trigger:** User clicks "Create From Scratch" card or "Select This Method" button
- **Behavior:**
  1. Highlight card with visual feedback
  2. Record method selection
  3. Navigate to RFQ Form screen
  4. Pass project_id and method="scratch" as parameters
- **Validation:** None
- **Success:** Navigate to RFQ Form screen
- **Error:** Display error toast if navigation fails
- **Navigation:** RFQ Method Selection → RFQ Form

### 7.2 Secondary Actions

**Action: Hover Method Card**
- **Trigger:** User hovers over method card
- **Behavior:**
  - Increase shadow (shadow-lg)
  - Darken background color
  - Cursor changes to pointer
  - Smooth transition animation
- **Validation:** None
- **Success:** Visual feedback provided
- **Error:** N/A
- **Navigation:** None

**Action: View Comparison Table**
- **Trigger:** User scrolls to comparison table
- **Behavior:**
  - Display side-by-side comparison of all methods
  - Highlight Clone Existing row (purple background)
  - Show all details in structured format
- **Validation:** None
- **Success:** Table displayed
- **Error:** N/A
- **Navigation:** None

**Action: Read Additional Info**
- **Trigger:** User scrolls to "What happens next" section
- **Behavior:**
  - Display detailed explanation of next steps for each method
  - Provide context for what to expect after selection
- **Validation:** None
- **Success:** Info displayed
- **Error:** N/A
- **Navigation:** None

### 7.3 Navigation

**From:**
- The Split (after saving project with new parts)
- Projects List (via "Create New RFQ" button)
- Project Summary (via "Start RFQ" button on new part)

**To:**
- Upload RFQ Files (via Upload method selection)
- Clone Existing RFQ (via Clone method selection)
- RFQ Form (via From Scratch method selection)

**Exit Points:**
- Method selection → respective RFQ creation screen
- Browser back button → previous screen (The Split or Projects List)
- App Header logo → Projects List


## 8. Business Rules

### 8.1 Validation Rules

**Method Availability:**
- Upload method: Always available
- Clone method: Available only if user has at least 1 previous RFQ
- From Scratch method: Always available

**Navigation Validation:**
- project_id must be valid and exist
- User must be authenticated
- User must have permission to create RFQs for this project

### 8.2 Calculation Logic

**Usage Statistics:**
```
upload_usage_percentage = (upload_count / total_rfqs) * 100
clone_usage_percentage = (clone_count / total_rfqs) * 100
scratch_usage_percentage = (scratch_count / total_rfqs) * 100
Display as ranges: "XX-XX%" (e.g., "60-70%")
```

**Time Estimates:**
```
Average time calculated from historical data
Displayed as: "~X minutes"
Rounded to nearest minute
```

**Most Popular Badge:**
```
IF clone_usage_percentage > upload_usage_percentage AND clone_usage_percentage > scratch_usage_percentage:
  Show "Most Popular" badge on Clone card
ELSE:
  Show badge on method with highest usage
```

### 8.3 Conditional Display Logic

**Clone Method Availability:**
- If user has 0 previous RFQs:
  - Show card with disabled state
  - Display message: "No previous RFQs available"
  - Disable "Select This Method" button
- If user has 1+ previous RFQs:
  - Show card in normal state
  - Enable "Select This Method" button
  - Show count: "X previous RFQs available" (optional)

**Badge Display:**
- Show "Most Popular" badge on Clone card (default)
- Badge position: absolute, -top-2, -right-2
- Badge only shown on one card at a time

**Info Banner:**
- Always show time-saving tip
- Highlight Clone method's 60-70% time savings
- Blue theme for informational message

### 8.4 Error Handling

**No Previous RFQs Error:**
- **Detection:** User clicks Clone method but has 0 previous RFQs
- **Handling:**
  - Show error toast: "No previous RFQs available. Please use Upload Files or Create From Scratch."
  - Keep user on current screen
  - Highlight other two methods
  - Log error for monitoring

**Navigation Error:**
- **Detection:** Navigation to target screen fails
- **Handling:**
  - Display error toast: "Unable to navigate. Please try again."
  - Stay on current screen
  - Log error for monitoring
  - Provide retry option

**Session Expired Error:**
- **Detection:** User's session expires while viewing screen
- **Handling:**
  - Show modal: "Session expired. Please log in again."
  - Redirect to login after confirmation
  - Preserve method selection for post-login redirect

**Network Error:**
- **Detection:** No internet connection or API unreachable
- **Handling:**
  - Display error banner: "Connection lost. Please check your connection."
  - Disable method selection buttons
  - Provide retry option
  - Log error for monitoring


## 9. Acceptance Criteria

### 9.1 Functional Criteria

1. WHEN user navigates to RFQ Method Selection THEN screen SHALL display within 2 seconds
2. WHEN screen loads THEN three method cards SHALL be displayed
3. WHEN screen loads THEN info banner SHALL be displayed
4. WHEN screen loads THEN comparison table SHALL be displayed
5. WHEN user clicks Upload method card THEN system SHALL navigate to Upload RFQ Files
6. WHEN user clicks Clone method card THEN system SHALL navigate to Clone Existing RFQ
7. WHEN user clicks From Scratch method card THEN system SHALL navigate to RFQ Form
8. WHEN user clicks "Select This Method" button THEN system SHALL navigate to respective screen
9. WHEN user has no previous RFQs THEN Clone method SHALL show disabled state
10. WHEN user has previous RFQs THEN Clone method SHALL be enabled
11. WHEN user hovers over method card THEN card SHALL show hover effects
12. WHEN Clone method has highest usage THEN "Most Popular" badge SHALL be displayed
13. WHEN navigation fails THEN error toast SHALL be displayed
14. WHEN session expires THEN user SHALL be redirected to login
15. WHEN user clicks browser back button THEN system SHALL return to previous screen
16. WHEN comparison table is displayed THEN Clone row SHALL be highlighted
17. WHEN info banner is displayed THEN time-saving tip SHALL be shown
18. WHEN "What happens next" section is displayed THEN all three methods SHALL be explained
19. WHEN method is selected THEN selection SHALL be recorded for analytics
20. WHEN user comes from The Split THEN project_id SHALL be passed to next screen

### 9.2 UX Criteria

1. Screen loads within 2 seconds on standard broadband connection
2. All three method cards are visually distinct with different colors
3. "Most Popular" badge is clearly visible on Clone card
4. Time estimates are displayed prominently on each card
5. Usage statistics are displayed on each card
6. "Best for" descriptions are clear and helpful
7. Hover effects are smooth and responsive
8. Comparison table is easy to read and scan
9. Info banner provides helpful guidance
10. "What happens next" section sets clear expectations
11. All interactive elements have pointer cursor
12. Card shadows increase on hover
13. Typography is clear and readable
14. Spacing is consistent throughout screen
15. Mobile-responsive design works on screens 768px and wider

### 9.3 Performance Criteria

1. Initial page load completes within 2 seconds
2. Method card hover effects respond within 100ms
3. Navigation to next screen completes within 1 second
4. Screen handles window resize smoothly
5. No memory leaks during navigation
6. Animations run at 60fps

### 9.4 Accessibility Criteria

1. All method cards are keyboard accessible (tab navigation)
2. Focus indicators are clearly visible
3. Color is not the only means of conveying information
4. Text has sufficient contrast ratio (WCAG AA: 4.5:1)
5. Screen reader announces all method options
6. Method cards have descriptive aria-labels
7. Buttons have descriptive aria-labels
8. Icons have aria-labels or are marked as decorative
9. Comparison table has proper header associations
10. Error messages are announced to screen readers

### 9.5 Security Criteria

1. User must be authenticated to access screen
2. Session validation occurs on page load
3. Expired sessions redirect to login
4. project_id is validated before navigation
5. Method selection is logged for audit trail
6. No sensitive data exposed in client-side code
7. XSS protection on all displayed text
8. Rate limiting on navigation actions


## 10. Edge Cases & Error Scenarios

### 10.1 Data Edge Cases

**No Previous RFQs:**
- **Scenario:** User has never created an RFQ before
- **Handling:**
  - Clone method card shows disabled state
  - Display message: "No previous RFQs available"
  - Disable "Select This Method" button
  - Show tooltip on hover: "Create your first RFQ using Upload Files or From Scratch"
  - Other two methods remain fully functional

**Single Previous RFQ:**
- **Scenario:** User has exactly one previous RFQ
- **Handling:**
  - Clone method is enabled
  - Show message: "1 previous RFQ available"
  - Navigate to Clone screen with single RFQ pre-selected
  - All functionality works normally

**Many Previous RFQs (100+):**
- **Scenario:** User has 100+ previous RFQs
- **Handling:**
  - Clone method is enabled
  - Show message: "100+ previous RFQs available"
  - Navigate to Clone screen with search/filter capabilities
  - Performance optimized for large lists

### 10.2 Interaction Edge Cases

**Rapid Card Clicks:**
- **Scenario:** User clicks method card multiple times quickly
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
  - Navigate to first selected method
  - Log warning for monitoring

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
  - Grid adjusts: 3 columns → 1 column on mobile
  - No content overflow or clipping
  - Maintain readability

**Browser Back Button:**
- **Scenario:** User clicks browser back button
- **Handling:**
  - Return to previous screen (The Split or Projects List)
  - No data loss
  - Normal browser behavior

### 10.3 System Edge Cases

**Session Expires During View:**
- **Scenario:** User's session expires while viewing screen
- **Handling:**
  - Detect expired session on method selection
  - Show modal: "Session expired. Please log in again."
  - Redirect to login after confirmation
  - Preserve project_id for post-login redirect

**Network Disconnection:**
- **Scenario:** User loses internet connection
- **Handling:**
  - Show banner: "Connection lost. Please check your connection."
  - Disable method selection buttons
  - Allow viewing screen content
  - Auto-retry connection every 10 seconds
  - Show success message when reconnected

**Slow Network:**
- **Scenario:** User on slow connection (2G/3G)
- **Handling:**
  - Show loading indicators
  - Load critical content first (method cards)
  - Lazy load comparison table and additional info
  - Provide feedback on load progress

**Invalid project_id:**
- **Scenario:** project_id in URL is invalid or doesn't exist
- **Handling:**
  - Show error message: "Project not found"
  - Provide button to return to Projects List
  - Log error for monitoring
  - Don't allow method selection

**Browser Compatibility:**
- **Scenario:** User on unsupported browser
- **Handling:**
  - Detect browser version on load
  - Show warning if unsupported
  - Provide graceful degradation (basic functionality)
  - Recommend supported browsers


## 11. Backend API Requirements

### 11.1 API Endpoints

**GET /api/v1/users/:user_id/rfqs/count**
- **Purpose:** Get count of user's previous RFQs to determine Clone method availability
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `user_id` (required): User ID
- **Response:** 200 OK
  ```json
  {
    "total_rfqs": 45,
    "has_previous_rfqs": true
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 500 Internal Server Error: Server error

**POST /api/v1/analytics/method-selection**
- **Purpose:** Record method selection for analytics
- **Authentication:** Required (Bearer token)
- **Request Body:**
  ```json
  {
    "user_id": "user-123",
    "project_id": "PRJ-2025-001",
    "method_selected": "clone",
    "source_screen": "the-split",
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
interface MethodSelectionData {
  user_id: string;
  project_id: string;
  method_selected: 'upload' | 'clone' | 'scratch';
  source_screen: string;
  timestamp: string;
}

interface RFQCountResponse {
  total_rfqs: number;
  has_previous_rfqs: boolean;
}

interface MethodConfig {
  method_id: 'upload' | 'clone' | 'scratch';
  title: string;
  description: string;
  icon_name: string;
  icon_color: string;
  bg_color: string;
  border_color: string;
  time_estimate: string;
  usage_percentage: string;
  best_for: string;
  key_benefit: string;
  target_screen_id: number;
  badge?: string;
  badge_color?: string;
}
```

### 11.3 Caching Strategy

**Client-Side Caching:**
- Cache RFQ count for 5 minutes
- Invalidate cache on:
  - New RFQ creation
  - RFQ deletion
  - Manual refresh

**Server-Side Caching:**
- Cache RFQ count (Redis, 2 minutes TTL)
- Invalidate on RFQ mutations

### 11.4 Error Handling

**Network Errors:**
- Retry failed requests (exponential backoff: 1s, 2s, 4s)
- Max 3 retries
- Show error toast after final failure
- Provide manual retry button

**Authentication Errors:**
- 401 Unauthorized: Redirect to login
- 403 Forbidden: Show access denied message

**Validation Errors:**
- 400 Bad Request: Show specific error message
- Log error details for monitoring


## 12. Notes & Considerations

### 12.1 Design Decisions

**Three Method Approach:**
- Rationale: Supports different workflows and starting points
- Upload: For users with existing documents
- Clone: For users with similar previous RFQs (most common)
- From Scratch: For completely new projects
- Flexibility without overwhelming users

**Clone as "Most Popular":**
- Rationale: 60-70% of RFQs reuse same suppliers/requirements
- Highlighting this method guides users to most efficient option
- Purple theme and badge make it stand out
- Time savings (60-70%) is key selling point

**Visual Card Design:**
- Rationale: Cards are more engaging than list or buttons
- Color coding aids quick recognition
- Icons provide visual anchors
- Hover effects indicate interactivity
- Full card clickable for better UX

**Comparison Table:**
- Rationale: Some users prefer detailed side-by-side comparison
- Provides all information in structured format
- Complements visual cards for different learning styles
- Highlights Clone method with background color

**Time Estimates:**
- Rationale: Helps users make informed decisions
- Based on average completion times
- Displayed as approximations ("~X minutes")
- Sets realistic expectations

### 12.2 Future Enhancements

**Smart Recommendations:**
- LLM analyzes user's situation and recommends best method
- Display recommendation badge on suggested method
- Explain reasoning: "Based on your previous RFQs, we recommend..."
- Allow user to override recommendation

**Personalized Statistics:**
- Show user's own usage statistics instead of global averages
- Display: "You typically use Clone 80% of the time"
- Adapt time estimates based on user's historical performance

**Method Previews:**
- Show preview/screenshot of next screen for each method
- Help users visualize what to expect
- Reduce uncertainty and increase confidence

**Quick Start:**
- "Skip this screen" option for experienced users
- Remember user's preferred method
- Auto-navigate to preferred method with confirmation

**Method Comparison Tool:**
- Interactive comparison with checkboxes
- Filter methods by criteria (time, complexity, etc.)
- Show only methods that match user's needs

### 12.3 Dependencies

**Required Screens:**
- The Split (prerequisite - provides project_id)
- Projects List (alternative entry point)
- Upload RFQ Files (navigation target)
- Clone Existing RFQ (navigation target)
- RFQ Form (navigation target)

**Required APIs:**
- Authentication API
- RFQ Count API
- Analytics API

**External Dependencies:**
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Lucide React (icons)
- shadcn/ui components

### 12.4 Testing Considerations

**Unit Tests:**
- Method availability logic (Clone disabled if no previous RFQs)
- Usage statistics calculations
- Badge display logic
- Navigation logic

**Integration Tests:**
- API integration (RFQ count)
- Authentication flow
- Navigation to all three target screens
- Analytics recording

**E2E Tests:**
- Complete user journey: login → The Split → Method Selection → Upload/Clone/Scratch
- Method selection with no previous RFQs
- Method selection with previous RFQs
- Error handling scenarios

**Accessibility Tests:**
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

### 12.5 Open Questions

1. **Default Selection:** Should system pre-select a method based on user's situation?
2. **Method Ordering:** Should method order change based on user's history?
3. **Usage Statistics:** Should statistics be global or organization-specific?
4. **Time Estimates:** Should estimates be personalized per user?
5. **Method Availability:** Should Upload method be disabled if user has no documents?
6. **Recommendation:** Should LLM recommendation be shown prominently or subtly?
7. **Skip Option:** Should experienced users be able to skip this screen?
8. **Method Tracking:** What level of detail is required for analytics?
9. **A/B Testing:** Should we test different card layouts or messaging?
10. **Mobile:** Should mobile show one method at a time (carousel) or stacked cards?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial screen requirements document |
