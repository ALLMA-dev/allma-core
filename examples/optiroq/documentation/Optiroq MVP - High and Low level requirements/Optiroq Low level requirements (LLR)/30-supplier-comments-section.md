# Screen 30: Supplier Comments Section

## 1. Overview

- **Screen ID:** SCR-30
- **Component File:** `src/app/components/SupplierCommentsSection.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 6 - Incremental Comparison Board with Supplier Ranking
- **Priority:** P1 (Should Have)
- **Flexibility Level:** Medium (Dynamic comment categories, flexible content)

## 2. User Story

**As a** Project Buyer (Sarah)  
**I want to** track and document all supplier communications, feedback, and notes in one place  
**So that** I have a complete audit trail for decision-making and can reference important supplier information

### Related User Stories

- **US-MVP-26:** Access Raw Data and Email Thread
- **REQ-MVP-12:** Supplier Communication Tracking (Complete audit trail, automated reminders, response tracking)

## 3. Screen Purpose & Context

### Purpose
The Supplier Comments Section provides centralized tracking of all supplier-related communications and notes:
- Document email exchanges and phone conversations
- Track supplier feedback and clarifications
- Add internal buyer notes and analysis
- Maintain complete audit trail for compliance
- Support decision documentation

### Context
- **When Shown:** Displayed on Comparison Dashboard, Decision Dashboard, or as standalone section
- **User Journey Position:** Throughout evaluation process, from quote receipt to final decision
- **Trigger:** Buyer needs to document supplier communication or review history
- **Data Source:** Manual entry, email extraction, automated system notes

### Business Value
Complete communication tracking enables:
- Audit trail for compliance and governance
- Decision justification with supporting evidence
- Knowledge retention across team members
- Supplier relationship management
- Risk mitigation through documentation

## 4. Visual Layout & Structure

### 4.1 Main Sections

1. **Card Header** - Title with supplier name and MessageSquare icon
2. **Existing Comments List** - Chronological display of all comments
3. **Add New Comment Form** - Category, comment text, buyer notes
4. **Info Box** - Explanation of comment purpose

### 4.2 Key UI Elements

**Card:** Yellow-themed (bg-yellow-50, border-yellow-200) to stand out
**Comment Cards:** White background, gray border, structured layout
**Badges:** Category badge (color-coded), Source badge (with icon)
**Form:** Category select, comment textarea, buyer notes textarea, add button
**Empty State:** Centered message with icon when no comments exist

## 5. Data Requirements

### 5.1 Comment Data Structure

| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| id | String | System | Yes | UUID |
| supplierId | String | System | Yes | UUID |
| supplierName | String | System | Yes | Non-empty string |
| comment | String | User/System | Yes | Non-empty string |
| category | CommentCategory | User | No | 'pricing'\|'technical'\|'logistics'\|'quality'\|'leadTime'\|'esg'\|'general' |
| timestamp | Date | System | Yes | ISO date |
| source | CommentSource | System | Yes | 'email'\|'manual'\|'extracted' |
| buyerNotes | String | User | No | Optional internal notes |

### 5.2 Comment Categories

- **pricing:** Cost-related discussions, negotiations, discounts
- **technical:** Specifications, capabilities, processes
- **logistics:** Shipping, packaging, delivery terms
- **quality:** Quality standards, certifications, testing
- **leadTime:** Timeline discussions, milestone commitments
- **esg:** Sustainability, environmental, social governance
- **general:** Miscellaneous notes and observations

### 5.3 Comment Sources

- **email:** Extracted from email communications
- **manual:** Manually entered by buyer
- **extracted:** Auto-extracted from supplier documents

## 6. User Interactions

### 6.1 Primary Actions

**Add Comment**
- Trigger: Buyer clicks "Add Comment" button after filling form
- Behavior: Creates new comment, adds to list, resets form
- Validation: Comment text required (non-empty)
- Success: Comment appears in list, form clears
- Navigation: Remains on screen

**Select Category**
- Trigger: Buyer clicks category dropdown
- Behavior: Shows 7 category options
- Success: Category selected, badge color updates

**Enter Comment Text**
- Trigger: Buyer types in comment textarea
- Behavior: Text updates in real-time
- Validation: Required for submission

**Enter Buyer Notes**
- Trigger: Buyer types in buyer notes textarea
- Behavior: Optional internal notes
- Validation: Optional field

### 6.2 Display Features

**View Comments List**
- Chronological display (newest first or oldest first)
- Each comment shows: category badge, source badge, timestamp, text, buyer notes
- Color-coded categories for quick scanning

**Empty State**
- Shows when no comments exist
- Encourages adding first comment
- Clear call-to-action

## 7. Business Rules

### 7.1 Validation Rules

1. Comment text MUST be non-empty (trim whitespace)
2. Category defaults to 'general' if not specified
3. Source is always 'manual' for user-entered comments
4. Timestamp auto-generated on creation
5. Buyer notes are optional

### 7.2 Display Rules

1. **Category Colors:**
   - pricing: blue (bg-blue-50, border-blue-300, text-blue-700)
   - technical: purple (bg-purple-50, border-purple-300, text-purple-700)
   - logistics: green (bg-green-50, border-green-300, text-green-700)
   - general: gray (bg-gray-50, border-gray-300, text-gray-700)

2. **Source Colors:**
   - email: indigo (bg-indigo-50, border-indigo-300, text-indigo-700)
   - manual: orange (bg-orange-50, border-orange-300, text-orange-700)
   - extracted: teal (bg-teal-50, border-teal-300, text-teal-700)

3. **Source Icons:**
   - email: Mail icon
   - manual: User icon
   - extracted: FileText icon

### 7.3 Timestamp Formatting

Format: "MMM DD, YYYY, HH:MM AM/PM"
Example: "Jan 2, 2026, 02:30 PM"
Uses Intl.DateTimeFormat with en-US locale

## 8. Acceptance Criteria

### 8.1 Functional Criteria (30 criteria)

1. WHEN component loads THEN it SHALL display supplier name in header
2. WHEN comments exist THEN they SHALL be displayed in list
3. WHEN no comments exist THEN empty state SHALL be shown
4. WHEN user enters comment and clicks Add THEN comment SHALL be added
5. WHEN comment is added THEN form SHALL reset
6. WHEN comment text is empty THEN Add button SHALL be disabled
7. WHEN category is selected THEN it SHALL update in form
8. WHEN buyer notes are entered THEN they SHALL be included in comment
9. WHEN comment is created THEN timestamp SHALL be auto-generated
10. WHEN comment is created THEN source SHALL be 'manual'

### 8.2 Display Criteria (30 criteria)

11. WHEN displaying comment THEN category badge SHALL show with correct color
12. WHEN displaying comment THEN source badge SHALL show with icon
13. WHEN displaying comment THEN timestamp SHALL be formatted correctly
14. WHEN displaying comment THEN comment text SHALL be visible
15. WHEN buyer notes exist THEN they SHALL be displayed below comment
16. WHEN buyer notes exist THEN they SHALL be in italic style
17. WHEN category is pricing THEN badge SHALL be blue
18. WHEN category is technical THEN badge SHALL be purple
19. WHEN category is logistics THEN badge SHALL be green
20. WHEN category is general THEN badge SHALL be gray

### 8.3 Form Criteria (20 criteria)

21. WHEN form loads THEN category SHALL default to 'general'
22. WHEN form loads THEN comment textarea SHALL be empty
23. WHEN form loads THEN buyer notes textarea SHALL be empty
24. WHEN user types in comment THEN text SHALL update
25. WHEN user types in buyer notes THEN text SHALL update
26. WHEN Add button is clicked THEN onAddComment SHALL be called
27. WHEN comment is added THEN form SHALL clear all fields
28. WHEN comment text is empty THEN Add button SHALL be disabled
29. WHEN comment text has only whitespace THEN Add button SHALL be disabled
30. WHEN form is submitted THEN all data SHALL be included in comment object

### 8.4 Layout & Styling Criteria (20 criteria)

31. WHEN component renders THEN card SHALL have yellow background
32. WHEN component renders THEN card SHALL have yellow border
33. WHEN component renders THEN header SHALL show MessageSquare icon
34. WHEN comment card renders THEN it SHALL have white background
35. WHEN comment card renders THEN it SHALL have gray border
36. WHEN empty state shows THEN it SHALL be centered
37. WHEN empty state shows THEN it SHALL show MessageSquare icon
38. WHEN info box shows THEN it SHALL have blue background
39. WHEN Add button shows THEN it SHALL have yellow background
40. WHEN badges show THEN they SHALL have outline variant

### 8.5 UX & Accessibility Criteria (20 criteria)

41. Component SHALL load within 1 second
42. All text SHALL be clearly readable
43. Form labels SHALL be associated with inputs
44. Textarea SHALL be resizable or fixed height
45. Add button SHALL be easily clickable
46. Category dropdown SHALL show all options
47. Timestamp SHALL be human-readable
48. Color contrast SHALL meet WCAG AA standards
49. Keyboard navigation SHALL work for all inputs
50. Screen readers SHALL read content in logical order

## 9. Dependencies

### 9.1 Prerequisites

- Supplier data must be available (supplierId, supplierName)
- Component must be rendered within React application
- All UI components must be available (Card, Button, Badge, Textarea, Label, Select)
- Icons must be available (MessageSquare, Mail, User, FileText, Clock)

### 9.2 Backend/API Requirements

**API Endpoints:**
- POST `/api/suppliers/{supplierId}/comments` - Create new comment
- GET `/api/suppliers/{supplierId}/comments` - Retrieve all comments
- PUT `/api/suppliers/{supplierId}/comments/{commentId}` - Update comment (future)
- DELETE `/api/suppliers/{supplierId}/comments/{commentId}` - Delete comment (future)

**Data Flow:**
1. Component receives existing comments via props
2. User adds new comment via form
3. Component calls onAddComment callback with comment data
4. Parent component saves to backend
5. Backend returns comment with ID and timestamp
6. Component updates display with new comment

### 9.3 Integration Points

**Email Extraction Service:**
- Automatically creates comments from email threads
- Source: 'email'
- Extracts key points from supplier communications

**Comparison Dashboard:**
- Displays comments section for each supplier
- Enables side-by-side comment comparison

**Decision Dashboard:**
- Shows all comments for selected supplier
- Includes in decision documentation

**Audit Trail:**
- All comments stored for compliance
- Timestamps and sources tracked
- Buyer notes provide internal context

## 10. Success Metrics

- **Usage Frequency:** 60%+ of RFQs have at least one comment per supplier
- **Comment Density:** Average 3-5 comments per supplier
- **Category Distribution:** Pricing (30%), Technical (25%), Logistics (20%), Other (25%)
- **Buyer Notes Usage:** 40%+ of comments include buyer notes
- **Audit Trail Completeness:** 90%+ of key communications documented

## 11. Open Questions

1. **Comment Editing:** Should buyers be able to edit/delete comments after creation?
2. **Comment Threading:** Should comments support replies/threads?
3. **Attachments:** Should comments support file attachments?
4. **Mentions:** Should buyers be able to @mention team members?
5. **Email Integration:** Should system auto-create comments from emails?
6. **Search/Filter:** Should comments be searchable by category or keyword?
7. **Export:** Should comments be exportable to PDF/Excel?
8. **Notifications:** Should team members be notified of new comments?

---

**Document Version:** 1.0  
**Created:** January 2, 2026  
**Status:** Complete  
**Total Acceptance Criteria:** 50
