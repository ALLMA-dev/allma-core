# Screen 31: Supplier Comments Sidebar

## 1. Overview

- **Screen ID:** SCR-31
- **Component File:** `src/app/components/SupplierCommentsSidebar.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 6 - Incremental Comparison Board with Supplier Ranking
- **Priority:** P1 (Should Have)
- **Flexibility Level:** Medium (Dynamic sections, flexible content)

## 2. User Story

**As a** Project Buyer (Sarah)  
**I want to** access supplier comments from any screen via a persistent sidebar  
**So that** I can quickly add notes and review feedback without leaving my current context

### Related User Stories

- **US-MVP-26:** Access Raw Data and Email Thread
- **REQ-MVP-12:** Supplier Communication Tracking

## 3. Screen Purpose & Context

### Purpose
The Supplier Comments Sidebar provides persistent, context-aware access to supplier comments:
- Always accessible via toggle button (fixed position)
- Organized by comparison dashboard sections
- Auto-scrolls to relevant section based on context
- Supports multi-supplier comment management
- Maintains context while navigating

### Context
- **When Shown:** Accessible from any screen via fixed toggle button
- **User Journey Position:** Throughout evaluation process
- **Trigger:** Buyer clicks toggle button or needs to add/review comments
- **Data Source:** All supplier comments, organized by section

### Business Value
Persistent sidebar enables:
- Contextual note-taking without navigation
- Quick reference to supplier feedback
- Section-based organization matching dashboard structure
- Efficient multi-supplier comment management
- Seamless workflow integration

## 4. Visual Layout & Structure

### 4.1 Main Sections

1. **Toggle Button** (Fixed) - Opens/closes sidebar, shows comment count
2. **Sidebar Header** - Title and close button
3. **Supplier Selector** - Dropdown to switch between suppliers
4. **Comments List** - Organized by 7 sections with auto-scroll
5. **Add Comment Form** - Quick entry at bottom

### 4.2 Key UI Elements

**Toggle Button:**
- Fixed position: right side, vertically centered
- Sky-600 background
- Shows MessageSquare icon + comment count badge
- Slides with sidebar (mr-96 when open, mr-0 when closed)

**Sidebar Panel:**
- Fixed position: right edge, full height
- Width: 96 (384px)
- Slides in/out with animation (translate-x)
- White background, shadow-2xl

**Section Headers:**
- Sticky positioning within scroll area
- Color-coded dot indicator
- Section label + comment count badge
- Active section highlighted (blue ring, blue background)

**Comment Cards:**
- White background, gray border
- Hover effect (shadow transition)
- Category and source badges
- Timestamp
- Comment text
- Optional buyer notes (blue background)

**Form:**
- Fixed at bottom (border-top, gray-50 background)
- Section select, comment textarea, buyer notes textarea
- Add button (sky-600)

## 5. Data Requirements

### 5.1 Props

| Field Name | Data Type | Required | Description |
|------------|-----------|----------|-------------|
| suppliers | Array<{id, name}> | Yes | List of all suppliers |
| comments | Record<string, SupplierComment[]> | Yes | Comments by supplier ID |
| onAddComment | Function | No | Callback for adding comment |
| isOpen | Boolean | Yes | Sidebar open/closed state |
| onToggle | Function | Yes | Toggle sidebar callback |
| activeSection | String | No | Current section for auto-scroll |

### 5.2 Comment Sections

**7 Sections (matching Comparison Dashboard):**
1. **general:** General / Header
2. **pricing:** Pricing & Commercial Terms
3. **quality:** Quality & Performance
4. **technical:** Technical Specifications
5. **logistics:** Logistics & Location
6. **leadTime:** Lead Time
7. **esg:** Sustainability / ESG

### 5.3 Component State

| Field Name | Data Type | Initial Value | Description |
|------------|-----------|---------------|-------------|
| selectedSupplier | String | suppliers[0].id | Currently selected supplier |
| newComment | String | '' | Comment text being entered |
| newCategory | CommentCategory | 'general' | Selected category for new comment |
| newBuyerNotes | String | '' | Buyer notes being entered |
| sectionRefs | Ref<Record> | {} | Refs for auto-scroll |

## 6. User Interactions

### 6.1 Primary Actions

**Toggle Sidebar**
- Trigger: Click toggle button
- Behavior: Slides sidebar in/out, updates button position
- Animation: 300ms translate transition
- Success: Sidebar opens/closes smoothly

**Select Supplier**
- Trigger: Click supplier dropdown
- Behavior: Shows all suppliers with comment counts
- Success: Comments update for selected supplier

**Auto-Scroll to Section**
- Trigger: Sidebar opens with activeSection prop
- Behavior: Scrolls to section after 300ms delay
- Animation: Smooth scroll
- Success: Relevant section visible

**Add Comment**
- Trigger: Click "Add Comment" button
- Behavior: Creates comment, adds to list, resets form
- Validation: Comment text required
- Success: Comment appears in appropriate section

### 6.2 Display Features

**Section Grouping**
- Comments automatically grouped by category
- Sections only shown if they have comments
- Active section highlighted with blue ring

**Comment Count Badge**
- Toggle button shows total comments for selected supplier
- Supplier dropdown shows count per supplier
- Section headers show count per section

**Empty State**
- Centered message when no comments exist
- Encourages adding first comment

## 7. Business Rules

### 7.1 Section Mapping

Category → Section mapping:
- pricing → pricing
- technical → technical
- logistics → logistics
- quality → quality
- leadTime → leadTime
- esg → esg
- general (default) → general

### 7.2 Auto-Scroll Logic

1. WHEN sidebar opens AND activeSection is provided THEN scroll to that section
2. Wait 300ms for sidebar animation to complete
3. Use smooth scroll behavior
4. Scroll to start of section (block: 'start')

### 7.3 Active Section Highlighting

1. WHEN section matches activeSection THEN apply blue ring (ring-2 ring-blue-400)
2. WHEN section matches activeSection THEN use blue background for header
3. WHEN section matches activeSection THEN use blue dot indicator
4. WHEN section is not active THEN use sky colors

### 7.4 Comment Count Display

1. Toggle button: Total comments for selected supplier
2. Supplier dropdown: Comments per supplier in parentheses
3. Section headers: Comments per section in badge

## 8. Acceptance Criteria

### 8.1 Functional Criteria (25 criteria)

1. WHEN toggle button clicked THEN sidebar SHALL open/close
2. WHEN sidebar opens THEN it SHALL slide in from right
3. WHEN sidebar closes THEN it SHALL slide out to right
4. WHEN supplier selected THEN comments SHALL update
5. WHEN activeSection provided THEN sidebar SHALL auto-scroll
6. WHEN comment added THEN it SHALL appear in correct section
7. WHEN comment added THEN form SHALL reset
8. WHEN no comments exist THEN empty state SHALL show
9. WHEN section has no comments THEN section SHALL be hidden
10. WHEN sidebar opens THEN toggle button SHALL move left

### 8.2 Display Criteria (25 criteria)

11. WHEN displaying toggle button THEN it SHALL be fixed position
12. WHEN displaying toggle button THEN it SHALL show comment count
13. WHEN displaying sidebar THEN it SHALL be 96 width
14. WHEN displaying sidebar THEN it SHALL be full height
15. WHEN displaying section THEN it SHALL show header with count
16. WHEN displaying active section THEN it SHALL have blue ring
17. WHEN displaying active section THEN header SHALL have blue background
18. WHEN displaying comment THEN it SHALL show category badge
19. WHEN displaying comment THEN it SHALL show source badge
20. WHEN displaying comment THEN it SHALL show timestamp

### 8.3 Animation Criteria (15 criteria)

21. WHEN sidebar opens THEN animation SHALL take 300ms
22. WHEN sidebar closes THEN animation SHALL take 300ms
23. WHEN auto-scrolling THEN scroll SHALL be smooth
24. WHEN auto-scrolling THEN delay SHALL be 300ms
25. WHEN hovering comment THEN shadow SHALL transition

### 8.4 Layout & Styling Criteria (20 criteria)

26. WHEN sidebar renders THEN header SHALL be sky-600
27. WHEN sidebar renders THEN supplier selector SHALL be yellow-50
28. WHEN sidebar renders THEN form SHALL be gray-50
29. WHEN sidebar renders THEN comments SHALL be scrollable
30. WHEN sidebar renders THEN form SHALL be fixed at bottom

### 8.5 UX & Accessibility Criteria (15 criteria)

31. Sidebar SHALL slide smoothly
32. Toggle button SHALL be easily clickable
33. Supplier dropdown SHALL show all suppliers
34. Section headers SHALL be sticky
35. Comments SHALL be readable
36. Form SHALL be accessible
37. Keyboard navigation SHALL work
38. Screen readers SHALL read content logically
39. Color contrast SHALL meet WCAG AA
40. Auto-scroll SHALL not be jarring

## 9. Dependencies

### 9.1 Prerequisites

- All suppliers must be available
- Comments must be organized by supplier ID
- Component must be rendered at app level (for fixed positioning)
- All UI components must be available

### 9.2 Backend/API Requirements

**API Endpoints:**
- GET `/api/rfqs/{rfqId}/comments` - Get all comments for RFQ
- POST `/api/suppliers/{supplierId}/comments` - Create comment

**Data Flow:**
1. Parent component fetches all comments
2. Organizes by supplier ID
3. Passes to sidebar via props
4. Sidebar groups by section
5. User adds comment
6. Callback to parent
7. Parent saves to backend
8. Updates comments prop

### 9.3 Integration Points

**Comparison Dashboard:**
- Provides activeSection prop based on current view
- Enables contextual auto-scroll
- Maintains sidebar state across navigation

**Decision Dashboard:**
- Accessible from decision screen
- Shows all comments for review

**All Screens:**
- Toggle button always visible
- Sidebar accessible from anywhere
- Maintains selected supplier across screens

## 10. Success Metrics

- **Usage Frequency:** 70%+ of buyers use sidebar at least once per RFQ
- **Context Switching:** 50% reduction in navigation for comment access
- **Comment Density:** Average 4-6 comments per supplier via sidebar
- **Section Organization:** 80%+ of comments properly categorized
- **Auto-Scroll Effectiveness:** 90%+ of auto-scrolls land on correct section

## 11. Open Questions

1. **Sidebar Width:** Should width be adjustable/resizable?
2. **Multi-Select:** Should buyers be able to view multiple suppliers simultaneously?
3. **Filtering:** Should comments be filterable by source or date?
4. **Pinning:** Should important comments be pinnable to top?
5. **Keyboard Shortcuts:** Should sidebar have keyboard shortcut (e.g., Ctrl+K)?
6. **Mobile:** How should sidebar behave on mobile devices?
7. **Persistence:** Should sidebar state persist across sessions?
8. **Notifications:** Should new comments trigger visual indicator on toggle button?

---

**Document Version:** 1.0  
**Created:** January 2, 2026  
**Status:** Complete  
**Total Acceptance Criteria:** 40
