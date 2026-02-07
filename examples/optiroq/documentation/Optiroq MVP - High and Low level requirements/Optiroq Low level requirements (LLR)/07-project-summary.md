# Screen Requirements: Project Summary

## 1. Overview
- **Screen ID:** SCR-007
- **Component File:** `src/app/components/ProjectSummary.tsx`
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 6A - BOM-Level Project Analysis
- **Priority:** P0 (Must Have)
- **Flexibility Level:** High - Displays dynamic project attributes and BOM fields

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** see a complete overview of all parts in my project with costs, status, and RFQ progress  
**So that** I can understand total project cost, track sourcing progress, and manage parts efficiently

### Related User Stories
- **US-MVP-26A:** View Project-Level BOM Dashboard
- **REQ-MVP-00B:** "The Split" - Existing vs New Parts Classification
- **REQ-MVP-00A:** BOM Upload & Project Initialization (Enhanced)

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** see a complete overview of all parts in my project with costs, status, and RFQ progress  
**So that** I can understand total project cost, track sourcing progress, and manage parts efficiently

### Related User Stories
- **US-MVP-26A:** View Project-Level BOM Dashboard
- **REQ-MVP-00B:** "The Split" - Existing vs New Parts Classification
- **REQ-MVP-00A:** BOM Upload & Project Initialization (Enhanced)

## 3. Screen Purpose & Context

### Purpose
This screen provides a comprehensive project-level dashboard that aggregates all parts (existing and new) to give buyers complete visibility into:
- Total project cost (material + tooling)
- Cost breakdown by part category (existing vs new)
- RFQ progress tracking for new parts
- Individual part details with pricing and status
- Budget performance vs target
- Part management capabilities (add, edit, delete, ERP upload)

### Context
- **When user sees this:** 
  - After completing "The Split" analysis
  - When clicking on a project from Projects List
  - When reviewing project status and costs
  - Before Customer Quote Approval (CQA) process
- **Why it exists:** 
  - Provide project-level cost visibility (mandatory for CQA)
  - Aggregate all parts (new + existing) in one view
  - Track RFQ progress across multiple parts
  - Enable part management and ERP integration
  - Support strategic decision-making with cost analysis
- **Position in journey:** 
  - After The Split (parts classified)
  - Before/during RFQ creation and execution
  - Central hub for project monitoring
  - Gateway to individual RFQ details

### Key Characteristics
- **Comprehensive aggregation:** All parts (existing + new) in single view
- **Cost visibility:** Total known cost with budget comparison
- **RFQ tracking:** Progress indicators for new parts (not started, in progress, completed)
- **Visual analytics:** Pie chart (cost distribution) and bar chart (budget vs target)
- **Part management:** Add, edit, delete parts; upload ERP data
- **Flexible display:** Search, filter by status, detailed part information


## 4. Visual Layout & Structure

### 4.1 Main Sections

**Page Header:**
1. **Title:** "Screen 6: Project Summary" (demo only - production: "Project Summary")
2. **Subtitle:** "Complete overview of parts, costs, and RFQ status"

**Project Information Card:**
1. **Card Header**
   - Project name (large, bold)
   - "View All RFQs" button (top-right)

2. **Two-Column Grid Layout**
   - **Left Column:** Project ID, Platform, Customer
   - **Right Column:** Location (multi-line), BOM File

3. **Timeline Info Bar** (bottom, bordered top)
   - Created date
   - Target date
   - Budget target (€X.XM format)

**Summary Statistics Cards (4 cards):**
1. **Total Parts:** Blue theme, Package icon, count
2. **Existing Parts:** Green theme, CheckCircle2 icon, count + percentage
3. **New Parts:** Orange theme, AlertCircle icon, count + percentage
4. **Total Cost:** Green/Yellow theme (based on completeness), DollarSign icon, cost + status indicator

**Cost Breakdown Card:**
1. **Three-Column Layout:**
   - **Left:** Breakdown details (3 cost categories with values)
   - **Middle:** Donut chart showing cost distribution
   - **Right:** Vertical bar chart (Budget vs Target)

2. **Info Banner** (if pending RFQs exist)
   - Yellow background
   - Warning icon
   - Explanation of incomplete cost information

**RFQ Status Summary Card:**
1. **Card Header**
   - Title: "RFQ Status Summary"
   - Description: "Track progress of new part sourcing"
   - "View All RFQs" button

2. **Three Status Cards** (grid layout)
   - Not Started: Gray theme, Clock icon
   - In Progress: Blue theme, Clock icon
   - Completed: Green theme, CheckCircle2 icon
   - Each shows count and percentage

**Parts List Card:**
1. **Card Header**
   - Title: "Parts List"
   - Description: "All parts in this project with status and actions"
   - Action buttons: "Add Manual Part", "Upload data from ERP"

2. **Filters Section**
   - Search bar (left)
   - View toggle buttons (right): All, Existing, New (with counts)

3. **Parts Table**
   - Columns: Status, Part Name, Description, Material, Quantity, RFQ Status, Unit Cost, Total Cost, Action
   - Color-coded status badges
   - RFQ status badges for new parts
   - Action buttons per row (edit, delete, RFQ actions)

**Dialogs:**
1. **ERP Upload Dialog:** Three states (select, uploading, complete)
2. **Add/Edit Part Dialog:** Form with all part fields

### 4.2 Key UI Elements

**Project Information Display:**
- Project name: text-2xl, bold
- Field labels: text-xs, uppercase, gray-500, tracking-wide
- Field values: text-sm, gray-900
- Location: multi-line (whitespace-pre-line)
- BOM file: text-sm, gray-900
- Timeline info: bordered top, flex layout with gaps

**Summary Statistics Cards:**
- **Total Parts Card:**
  - Icon: Package (blue #2563eb), size-8
  - Count: text-2xl, bold, gray-900
  - Label: text-sm, gray-600

- **Existing Parts Card:**
  - Border: green-200, Background: green-50
  - Icon: CheckCircle2 (green #16a34a)
  - Count: text-2xl, bold, green-900
  - Label: text-sm, green-700
  - Percentage: text-xs, green-600

- **New Parts Card:**
  - Border: orange-200, Background: orange-50
  - Icon: AlertCircle (orange #ea580c)
  - Count: text-2xl, bold, orange-900
  - Label: text-sm, orange-700
  - Percentage: text-xs, orange-600

- **Total Cost Card:**
  - Border/Background: yellow (if pending) or green (if complete)
  - Icon: DollarSign
  - Cost: text-2xl, bold, gray-900, €X.XM format
  - Label: text-sm, gray-700
  - Warning indicator: AlertTriangle icon + "Incomplete" text (if pending)

**Cost Breakdown Details:**
- **Existing Parts Cost:**
  - Background: green-50, Border: green-200
  - Legend dot: green-600, size-3, rounded-full
  - Title: font-semibold, gray-900
  - Description: text-sm, gray-600
  - Cost: text-2xl, bold, green-900
  - Percentage: text-sm, green-700

- **New Parts (Confirmed) Cost:**
  - Background: blue-50, Border: blue-200
  - Legend dot: blue-600
  - Similar styling to existing parts

- **Pending Quotes:**
  - Background: yellow-50, Border: yellow-200
  - Legend dot: yellow-600
  - Badge: "Pending" (yellow theme)

**Charts:**
- **Donut Chart:**
  - Size: 320px height
  - Inner radius: 85px, Outer radius: 110px
  - Colors: green-600 (existing), blue-600 (confirmed), yellow-600 (pending)
  - Center text: Total cost with label
  - Custom tooltip with cost formatting

- **Bar Chart:**
  - Size: 320px height
  - Two bars: "Total Known" (teal-600), "Target" (gray)
  - Y-axis: €X.XM format
  - Tooltip: €X.XM format
  - Legend: circle icons

**RFQ Status Cards:**
- **Not Started:** gray-50 bg, gray-200 border, Clock icon
- **In Progress:** blue-50 bg, blue-200 border, Clock icon
- **Completed:** green-50 bg, green-200 border, CheckCircle2 icon
- Each shows: count (text-3xl, bold), percentage (text-sm)

**Parts Table:**
- **Status Badge:**
  - Existing: green-100 bg, green-800 text, CheckCircle2 icon
  - New: orange-100 bg, orange-800 text, AlertCircle icon

- **Part Name:**
  - Font: monospace, text-sm, medium, gray-900
  - RFQ ID: text-xs, gray-500 (if exists)

- **RFQ Status Badge:**
  - Not Started: gray-100 bg, gray-700 text, Clock icon
  - In Progress: blue-100 bg, blue-700 text, Clock icon
  - Completed: green-100 bg, green-700 text, CheckCircle2 icon

- **Action Buttons:**
  - Not Started: "Start RFQ" (blue-600, PlayCircle icon)
  - In Progress: "Review RFQ" (outline, Eye icon)
  - Completed: "View Summary" (outline, FileText icon)
  - Edit: Pencil icon (ghost button)
  - Delete: Trash2 icon (ghost button)

**ERP Upload Dialog:**
- **Select State:**
  - Dashed border, gray-300
  - Upload icon (size-12, gray-400)
  - Click to upload text
  - Supported formats text

- **Uploading State:**
  - Loader2 icon (size-12, blue-600, animated spin)
  - "Processing ERP Data..." text
  - Progress message

- **Complete State:**
  - CheckCircle2 icon in green circle
  - "Upload Complete" title
  - Success message
  - Matched count badge (green theme)

**Add/Edit Part Dialog:**
- Two-column grid layout
- Form fields: Part Name, Description, Material, Quantity, Target Weight, Status
- Conditional fields (if status = existing): Current Supplier, Current Price, Lead Time
- Action buttons: Cancel, Save Part

### 4.3 Information Hierarchy

**Primary Information:**
- Total project cost and budget comparison
- Cost breakdown by category
- RFQ progress summary
- Part status and pricing

**Secondary Information:**
- Project details (platform, customer, location)
- Individual part details
- RFQ status per part
- Timeline information

**Tertiary Information:**
- Part descriptions
- Target weights
- Lead times
- Action buttons and controls


## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_id | String | System | Yes | Unique, format: "PRJ-YYYY-NNN" |
| bom_file_name | String | BOM Upload | Yes | Original file name |
| creation_date | Date | System | Yes | ISO 8601 date |
| created_by | String | System | Yes | User ID |
| last_modified | DateTime | System | Yes | ISO 8601 datetime |

### 5.2 Project Data Fields (Core)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| project_name | String | User | Yes | 2-200 characters |
| platform_name | String | User | Yes | 2-100 characters |
| customer_name | String | User | Yes | 2-200 characters |
| delivery_location | String | User | Yes | 2-500 characters, multi-line |
| target_date | Date | User | No | ISO 8601 date |
| target_cost | Number | User | Yes | Decimal, >0 (budget target in €) |

### 5.3 Part Data Fields (Core)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| part_name | String | BOM/User | Yes | 2-200 characters, unique within project |
| description | String | BOM/User | No | 0-500 characters |
| material | String | BOM/User | Yes | 2-100 characters |
| quantity | Number | BOM/User | Yes | Integer, >0 |
| target_weight | Number | BOM/User | No | Decimal, >0 (kg) |
| status | Enum | System/User | Yes | "existing", "new" |

### 5.4 Part Data Fields (Existing Parts Only)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| current_supplier | String | ERP/User | Yes (if existing) | 2-200 characters |
| current_price | Number | ERP/User | Yes (if existing) | Decimal, >0 (€) |
| lead_time | Number | ERP/User | Yes (if existing) | Integer, >0 (weeks) |

### 5.5 Part Data Fields (New Parts Only)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| rfq_status | Enum | System | No | "not-started", "in-progress", "completed" |
| rfq_id | String | System | No | RFQ identifier (e.g., "RFQ-2025-047") |
| best_quote_price | Number | RFQ System | No | Decimal, >0 (€, from completed RFQs) |

### 5.6 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| total_parts_count | COUNT(all parts) | parts array |
| existing_parts_count | COUNT(parts WHERE status = "existing") | parts array, status |
| new_parts_count | COUNT(parts WHERE status = "new") | parts array, status |
| existing_parts_percentage | (existing_parts_count / total_parts_count) * 100 | counts |
| new_parts_percentage | (new_parts_count / total_parts_count) * 100 | counts |
| existing_parts_cost | SUM(current_price * quantity) for existing parts | current_price, quantity |
| completed_new_parts_cost | SUM(best_quote_price * quantity) for completed RFQs | best_quote_price, quantity |
| total_known_cost | existing_parts_cost + completed_new_parts_cost | both costs |
| pending_new_parts_count | COUNT(new parts WHERE rfq_status != "completed") | rfq_status |
| has_pending_rfqs | pending_new_parts_count > 0 | pending_new_parts_count |
| rfq_not_started_count | COUNT(new parts WHERE rfq_status = "not-started") | rfq_status |
| rfq_in_progress_count | COUNT(new parts WHERE rfq_status = "in-progress") | rfq_status |
| rfq_completed_count | COUNT(new parts WHERE rfq_status = "completed") | rfq_status |
| budget_variance | total_known_cost - target_cost | total_known_cost, target_cost |
| budget_variance_percentage | (budget_variance / target_cost) * 100 | budget_variance, target_cost |

### 5.7 Chart Data Structures
| Data Structure | Fields | Purpose |
|----------------|--------|---------|
| costData | name, value, color | Donut chart cost distribution |
| budgetData | name, known, target | Bar chart budget comparison |


## 6. Flexibility & Adaptive UI

### 6.1 Field Configuration

**Dynamic Project Attributes:**
- System displays all project fields from Master List
- Core fields always present: Project ID, Name, Platform, Customer, Location, Target Cost
- Optional fields: Target Date, SOP Date, Project Manager, custom attributes
- Admin can add new project attributes to Master List
- Buyer cannot add fields (only Admin can modify Master List)

**Dynamic Part Attributes:**
- Core fields always displayed: Part Name, Material, Quantity, Status
- Optional fields: Description, Target Weight, custom attributes
- Custom attributes from BOM file automatically detected and stored
- Table columns adapt based on which attributes are present

**RFQ Status Types:**
- Standard statuses: not-started, in-progress, completed
- Admin can configure additional custom RFQ statuses
- Status colors and icons configurable per organization
- Badge styling adapts to configured status types

### 6.2 UI Adaptation Logic

**Cost Card Theming:**
- If has_pending_rfqs = true: Yellow theme (warning)
- If has_pending_rfqs = false: Green theme (complete)
- Icon and text colors adapt accordingly
- Warning indicator shown only if pending

**Chart Generation:**
- Donut chart adapts to number of cost categories
- If no pending RFQs: 2 slices (existing, confirmed new)
- If pending RFQs: 3 slices (existing, confirmed new, pending)
- Colors assigned dynamically based on categories
- Center text shows total with appropriate label

**Table Generation:**
- Parts table columns adapt to available data
- Standard columns always shown: Status, Part Name, Material, Quantity
- Optional columns shown if data exists: Description, RFQ Status, Unit Cost, Total Cost
- Custom attribute columns added dynamically (future)
- Action column adapts based on part status and RFQ status

**RFQ Action Buttons:**
- Not Started: "Start RFQ" button (blue, primary)
- In Progress: "Review RFQ" button (outline)
- Completed: "View Summary" button (outline)
- Existing parts: No RFQ action (show "-")

**Edit/Delete Permissions:**
- New parts (not-started): Show edit and delete buttons
- New parts (in-progress/completed): Hide edit button, show delete with warning
- Existing parts: Show delete button only
- Admin can configure permission rules

### 6.3 LLM Integration

**Cost Estimation for Pending Parts:**
- LLM analyzes similar parts to estimate costs
- Uses historical data and market indices
- Provides confidence scores for estimates
- Updates estimates as more RFQs complete

**Anomaly Detection:**
- LLM analyzes part costs for outliers
- Flags parts with unusual pricing
- Suggests review for high-cost items
- Provides explanations for detected anomalies

**Smart Recommendations:**
- LLM suggests which RFQs to prioritize
- Identifies parts with similar specifications
- Recommends supplier consolidation opportunities
- Provides cost-saving suggestions

**Fallback Behavior:**
- If LLM unavailable: Use average cost for estimates
- If anomaly detection fails: Show manual review indicators
- System remains fully functional without LLM
- Core features never depend on LLM availability


## 7. User Interactions

### 7.1 Primary Actions

**Action: View All RFQs**
- **Trigger:** User clicks "View All RFQs" button (in project info or RFQ status card)
- **Behavior:**
  1. Navigate to RFQs Overview screen
  2. Pass project_id as filter parameter
  3. Show only RFQs for this project
- **Validation:** None
- **Success:** Navigate to RFQs Overview
- **Error:** Display error toast if navigation fails
- **Navigation:** Project Summary → RFQs Overview

**Action: Search Parts**
- **Trigger:** User types in search input field
- **Behavior:**
  1. Filter parts list in real-time
  2. Match against part name and material (case-insensitive)
  3. Update table to show only matching parts
  4. Maintain status filter if active
- **Validation:** None
- **Success:** Filtered parts displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Filter by Status**
- **Trigger:** User clicks All/Existing/New button
- **Behavior:**
  1. Update selected view state
  2. Filter parts list by status
  3. Update button styling (active state)
  4. Maintain search filter if active
  5. Update table display
- **Validation:** None
- **Success:** Filtered parts displayed
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Start RFQ**
- **Trigger:** User clicks "Start RFQ" button on new part (not-started status)
- **Behavior:**
  1. Navigate to RFQ creation screen
  2. Pass part information as parameters
  3. Pre-fill RFQ form with part details
- **Validation:** None
- **Success:** Navigate to RFQ creation
- **Error:** Display error toast
- **Navigation:** Project Summary → RFQ Creation

**Action: Review RFQ**
- **Trigger:** User clicks "Review RFQ" button on new part (in-progress status)
- **Behavior:**
  1. Navigate to RFQ details screen
  2. Pass rfq_id as parameter
  3. Show RFQ progress and supplier responses
- **Validation:** None
- **Success:** Navigate to RFQ details
- **Error:** Display error toast
- **Navigation:** Project Summary → RFQ Details

**Action: View RFQ Summary**
- **Trigger:** User clicks "View Summary" button on new part (completed status)
- **Behavior:**
  1. Navigate to RFQ comparison screen
  2. Pass rfq_id as parameter
  3. Show supplier quotes and comparison
- **Validation:** None
- **Success:** Navigate to RFQ comparison
- **Error:** Display error toast
- **Navigation:** Project Summary → RFQ Comparison

**Action: Add Manual Part**
- **Trigger:** User clicks "Add Manual Part" button
- **Behavior:**
  1. Open Add/Edit Part dialog
  2. Show empty form
  3. Set default status to "new"
  4. User fills form fields
  5. User clicks "Save Part"
  6. Validate form data
  7. If valid, add part to list
  8. Recalculate statistics and costs
  9. Close dialog
- **Validation:**
  - Part Name: Required, 2-200 characters, unique within project
  - Material: Required, 2-100 characters
  - Quantity: Positive integer
  - If status = existing: Supplier, Price, Lead Time required
- **Success:** Part added, statistics updated, dialog closed
- **Error:** Display validation errors in dialog
- **Navigation:** None (stays on screen)

**Action: Edit Part**
- **Trigger:** User clicks edit icon (pencil) on part row
- **Behavior:**
  1. Open Add/Edit Part dialog
  2. Pre-fill form with part data
  3. User modifies fields
  4. User clicks "Save Part"
  5. Validate form data
  6. If valid, update part in list
  7. Recalculate statistics and costs
  8. Close dialog
- **Validation:** Same as Add Manual Part
- **Success:** Part updated, statistics updated, dialog closed
- **Error:** Display validation errors in dialog
- **Navigation:** None (stays on screen)

**Action: Delete Part**
- **Trigger:** User clicks delete icon (trash) on part row
- **Behavior:**
  1. Show confirmation dialog: "Are you sure you want to delete [part_name]?"
  2. If confirmed:
     - Remove part from list
     - Recalculate statistics and costs
     - Update charts
     - Show success message
- **Validation:** None
- **Success:** Part deleted, statistics updated
- **Error:** N/A
- **Navigation:** None (stays on screen)

**Action: Upload ERP Data**
- **Trigger:** User clicks "Upload data from ERP" button
- **Behavior:**
  1. Open ERP Upload dialog
  2. Show file upload zone (select state)
  3. User clicks upload zone or drops file
  4. Validate file type and size
  5. Show uploading state with spinner
  6. Backend parses ERP file
  7. Backend matches parts against ERP data
  8. Update matched parts to "existing" status
  9. Add supplier, price, lead time data
  10. Show completion state with matched count
  11. User clicks "View Updated Parts"
  12. Close dialog
  13. Recalculate statistics and costs
  14. Update charts
- **Validation:**
  - File type: .xlsx, .xls, .csv, .xml
  - File size: <10MB
  - Valid ERP structure
- **Success:** 
  - Parts matched and updated
  - Dialog shows: "X parts matched and updated to 'Existing'"
  - Statistics and charts updated
- **Error:** Display error message
  - "Invalid file format"
  - "Failed to parse ERP file"
  - "No parts matched"
- **Navigation:** None (stays on screen)

### 7.2 Secondary Actions

**Action: Hover Chart Elements**
- **Trigger:** User hovers over chart slices or bars
- **Behavior:**
  - Show custom tooltip with detailed information
  - Highlight hovered element
  - Display formatted cost values
- **Validation:** None
- **Success:** Tooltip displayed
- **Error:** N/A
- **Navigation:** None

**Action: Hover Part Row**
- **Trigger:** User hovers over part row in table
- **Behavior:** Highlight row with light gray background
- **Validation:** None
- **Success:** Row highlighted
- **Error:** N/A
- **Navigation:** None

**Action: Sort Parts Table**
- **Trigger:** Parts displayed (automatic sorting)
- **Behavior:**
  - Primary sort: New parts before Existing parts
  - Secondary sort (for new parts): not-started, in-progress, completed
  - Maintains sort order during filtering
- **Validation:** None
- **Success:** Parts sorted correctly
- **Error:** N/A
- **Navigation:** None

### 7.3 Navigation

**From:**
- The Split (after saving project)
- Projects List (clicking on project)
- Project Initiation (after project creation)
- RFQ Details (via back button or breadcrumb)

**To:**
- RFQs Overview (via "View All RFQs" button)
- RFQ Creation (via "Start RFQ" button)
- RFQ Details (via "Review RFQ" button)
- RFQ Comparison (via "View Summary" button)

**Exit Points:**
- "View All RFQs" button → RFQs Overview
- RFQ action buttons → respective RFQ screens
- Browser back button → previous screen
- App Header logo → Projects List


## 8. Business Rules

### 8.1 Validation Rules

**Project Name Validation:**
- Length: 2-200 characters
- Cannot be empty
- Error: "Project name is required"

**Platform Name Validation:**
- Length: 2-100 characters
- Cannot be empty
- Error: "Platform name is required"

**Customer Name Validation:**
- Length: 2-200 characters
- Cannot be empty
- Error: "Customer name is required"

**Location Validation:**
- Length: 2-500 characters
- Cannot be empty
- Supports multi-line text
- Error: "Location is required"

**Target Cost Validation:**
- Must be positive number
- Cannot be zero or negative
- Format: Decimal with 2 decimal places
- Error: "Target cost must be positive"

**Part Name Validation:**
- Length: 2-200 characters
- Cannot be empty
- Must be unique within project
- Error: "Part name is required"
- Error: "Part name already exists in this project"

**Material Validation:**
- Length: 2-100 characters
- Cannot be empty
- Error: "Material is required"

**Quantity Validation:**
- Must be positive integer
- Cannot be zero or negative
- Error: "Quantity must be positive"

**Target Weight Validation (Optional):**
- If provided, must be positive decimal
- Cannot be zero or negative
- Error: "Target weight must be positive"

**Existing Part Additional Validation:**
- If status = "existing":
  - Current Supplier: Required, 2-200 characters
  - Current Price: Required, positive decimal
  - Lead Time: Required, positive integer (weeks)
- Error: "Supplier is required for existing parts"
- Error: "Price is required for existing parts"
- Error: "Lead time is required for existing parts"

**ERP File Validation:**
- File type: .xlsx, .xls, .csv, .xml
- File size: <10MB
- Error: "Invalid file type. Please upload XLSX, XLS, CSV, or XML"
- Error: "File too large. Maximum size is 10MB"

### 8.2 Calculation Logic

**Total Parts Count:**
```
total_parts_count = parts.length
```

**Existing Parts Count:**
```
existing_parts_count = parts.filter(p => p.status === 'existing').length
```

**New Parts Count:**
```
new_parts_count = parts.filter(p => p.status === 'new').length
```

**Existing Parts Percentage:**
```
existing_parts_percentage = (existing_parts_count / total_parts_count) * 100
Round to nearest integer
```

**New Parts Percentage:**
```
new_parts_percentage = (new_parts_count / total_parts_count) * 100
Round to nearest integer
```

**Existing Parts Cost:**
```
existing_parts_cost = SUM(current_price * quantity) for all existing parts
Format: €X.XM (millions) or €X,XXX (thousands)
```

**Completed New Parts Cost:**
```
completed_new_parts = new_parts.filter(p => p.rfq_status === 'completed')
completed_new_parts_cost = SUM(best_quote_price * quantity) for completed parts
Format: €X.XM (millions) or €X,XXX (thousands)
```

**Total Known Cost:**
```
total_known_cost = existing_parts_cost + completed_new_parts_cost
Format: €X.XM (millions)
```

**Pending New Parts Count:**
```
pending_new_parts_count = new_parts.filter(p => p.rfq_status !== 'completed').length
```

**Has Pending RFQs:**
```
has_pending_rfqs = pending_new_parts_count > 0
```

**RFQ Status Counts:**
```
rfq_not_started = new_parts.filter(p => p.rfq_status === 'not-started').length
rfq_in_progress = new_parts.filter(p => p.rfq_status === 'in-progress').length
rfq_completed = new_parts.filter(p => p.rfq_status === 'completed').length
```

**RFQ Status Percentages:**
```
rfq_not_started_pct = (rfq_not_started / new_parts_count) * 100
rfq_in_progress_pct = (rfq_in_progress / new_parts_count) * 100
rfq_completed_pct = (rfq_completed / new_parts_count) * 100
Round to nearest integer
```

**Cost Breakdown Percentages:**
```
existing_cost_pct = (existing_parts_cost / total_known_cost) * 100
completed_new_cost_pct = (completed_new_parts_cost / total_known_cost) * 100
Round to 1 decimal place
```

**Budget Variance:**
```
budget_variance = total_known_cost - target_cost
budget_variance_pct = (budget_variance / target_cost) * 100
```

**Unit Cost (for table display):**
```
IF part.status === 'existing':
  unit_cost = part.current_price
ELSE IF part.rfq_status === 'completed':
  unit_cost = part.best_quote_price
ELSE:
  unit_cost = null (display "Pending")
```

**Total Cost (for table display):**
```
IF unit_cost !== null:
  total_cost = unit_cost * part.quantity
ELSE:
  total_cost = null (display "Pending")
```

### 8.3 Conditional Display Logic

**Cost Card Theme:**
- If has_pending_rfqs = true:
  - Border: yellow-200
  - Background: yellow-50
  - Icon color: yellow-600
  - Show warning indicator
- If has_pending_rfqs = false:
  - Border: green-200
  - Background: green-50
  - Icon color: green-600
  - Hide warning indicator

**Cost Breakdown Chart:**
- Always show: Existing Parts Cost (green)
- Show if exists: New Parts (Confirmed) Cost (blue)
- Show if has_pending_rfqs: Pending Quotes (yellow, estimated)
- Donut chart adapts to 2 or 3 slices

**Info Banner:**
- Show if: has_pending_rfqs = true
- Hide if: has_pending_rfqs = false
- Message includes pending parts count

**RFQ Status Badge:**
- not-started: gray-100 bg, gray-700 text, Clock icon
- in-progress: blue-100 bg, blue-700 text, Clock icon
- completed: green-100 bg, green-700 text, CheckCircle2 icon
- existing parts: show "-" (no RFQ status)

**RFQ Action Button:**
- not-started: "Start RFQ" (blue-600, PlayCircle icon)
- in-progress: "Review RFQ" (outline, Eye icon)
- completed: "View Summary" (outline, FileText icon)
- existing parts: no button (empty cell)

**Edit/Delete Buttons:**
- New parts (not-started): Show edit and delete
- New parts (in-progress/completed): Show delete only
- Existing parts: Show delete only
- Buttons: ghost variant, icon only

**Unit Cost Display:**
- If unit_cost exists: "€X.XX"
- If unit_cost null: "Pending" (gray-400, italic)

**Total Cost Display:**
- If total_cost exists: "€X,XXX" (formatted with commas)
- If total_cost null: "Pending" (gray-400, italic)

**Parts Table Sorting:**
- Primary: New parts first, then Existing parts
- Secondary (new parts): not-started, in-progress, completed
- Maintains sort during filtering

### 8.4 Error Handling

**Part Add/Edit Validation Error:**
- **Detection:** Required field empty or invalid
- **Handling:**
  - Display error message in dialog
  - Highlight invalid fields
  - Prevent save action
  - Keep dialog open
  - Alert: "Please fill in required fields (Part Name and Material)"

**Duplicate Part Name Error:**
- **Detection:** Part name already exists in project
- **Handling:**
  - Display error in dialog
  - Highlight part name field
  - Prevent save action
  - Error: "Part name already exists in this project"

**ERP Upload Error:**
- **Detection:** Invalid file type, size, or structure
- **Handling:**
  - Display error message in dialog
  - Allow user to try again
  - Log error for monitoring
  - Error: "Invalid file format" or "Failed to parse ERP file"

**No Parts Matched Error:**
- **Detection:** ERP upload completes but no parts matched
- **Handling:**
  - Show completion state with matched count = 0
  - Message: "0 parts matched and updated to 'Existing'"
  - Allow user to close dialog
  - No changes to parts list

**Network Error:**
- **Detection:** API call fails or times out
- **Handling:**
  - Display error toast: "Failed to save. Please check your connection and try again."
  - Keep data in form (don't lose user's work)
  - Provide retry option
  - Log error for monitoring

**Navigation Error:**
- **Detection:** Target screen not found or unauthorized
- **Handling:**
  - Display error toast: "Unable to navigate. Please try again."
  - Stay on current screen
  - Log error for monitoring

**Chart Rendering Error:**
- **Detection:** Chart fails to render (invalid data)
- **Handling:**
  - Show placeholder message: "Chart unavailable"
  - Log error for monitoring
  - Continue showing other data
  - Don't block UI rendering

**Calculation Error:**
- **Detection:** Cost calculation fails or returns invalid value
- **Handling:**
  - Show "N/A" for failed calculation
  - Log error for monitoring
  - Continue showing other statistics
  - Don't block UI rendering


## 9. Acceptance Criteria

### 9.1 Functional Criteria

1. WHEN user navigates to Project Summary THEN screen SHALL display within 2 seconds
2. WHEN screen loads THEN project information SHALL be displayed correctly
3. WHEN screen loads THEN summary statistics SHALL show correct counts and percentages
4. WHEN screen loads THEN cost breakdown SHALL display accurate values
5. WHEN screen loads THEN donut chart SHALL render with correct data
6. WHEN screen loads THEN bar chart SHALL render with budget comparison
7. WHEN screen loads THEN RFQ status summary SHALL show correct counts
8. WHEN screen loads THEN parts table SHALL display all parts
9. WHEN user types in search field THEN parts table SHALL filter in real-time
10. WHEN user clicks status filter THEN parts table SHALL filter by status
11. WHEN user clicks "Add Manual Part" THEN dialog SHALL open with empty form
12. WHEN user fills form and clicks "Save Part" THEN part SHALL be added to list
13. WHEN user clicks edit icon on part THEN dialog SHALL open with part data
14. WHEN user updates part and saves THEN part SHALL be updated in list
15. WHEN user clicks delete icon on part THEN confirmation SHALL be shown
16. WHEN user confirms delete THEN part SHALL be removed from list
17. WHEN user clicks "Upload data from ERP" THEN ERP upload dialog SHALL open
18. WHEN user uploads ERP file THEN system SHALL match and update parts
19. WHEN ERP upload completes THEN dialog SHALL show matched parts count
20. WHEN user clicks "View All RFQs" THEN system SHALL navigate to RFQs Overview
21. WHEN user clicks "Start RFQ" on new part THEN system SHALL navigate to RFQ creation
22. WHEN user clicks "Review RFQ" on in-progress part THEN system SHALL navigate to RFQ details
23. WHEN user clicks "View Summary" on completed part THEN system SHALL navigate to RFQ comparison
24. WHEN part is added THEN statistics and charts SHALL update automatically
25. WHEN part is deleted THEN statistics and charts SHALL update automatically
26. WHEN part status changes THEN cost breakdown SHALL recalculate
27. WHEN all RFQs are completed THEN total cost card SHALL show green theme
28. WHEN pending RFQs exist THEN total cost card SHALL show yellow theme
29. WHEN pending RFQs exist THEN info banner SHALL be displayed
30. WHEN no pending RFQs THEN info banner SHALL be hidden
31. WHEN part name is duplicate THEN system SHALL prevent save and show error
32. WHEN existing part missing supplier info THEN system SHALL show error
33. WHEN user hovers over chart element THEN tooltip SHALL display
34. WHEN user hovers over part row THEN row SHALL highlight
35. WHEN parts list is empty THEN empty state SHALL be displayed
36. WHEN search returns no results THEN "No parts match" message SHALL be shown
37. WHEN total known cost exceeds target THEN budget variance SHALL be negative
38. WHEN total known cost is below target THEN budget variance SHALL be positive
39. WHEN RFQ status changes THEN RFQ status summary SHALL update
40. WHEN part quantity changes THEN total cost SHALL recalculate

### 9.2 Flexibility Criteria

1. WHEN project has custom attributes THEN system SHALL store and display them
2. WHEN Master List has optional fields THEN system SHALL display them
3. WHEN admin adds new project field THEN it SHALL appear in display
4. WHEN LLM estimates pending part costs THEN estimates SHALL be shown with confidence scores
5. WHEN LLM detects cost anomalies THEN anomalies SHALL be flagged
6. WHEN LLM provides recommendations THEN recommendations SHALL be displayed
7. WHEN LLM is unavailable THEN system SHALL use average cost estimates
8. WHEN anomaly detection fails THEN manual review indicators SHALL be shown
9. WHEN custom RFQ statuses are configured THEN badges SHALL adapt
10. WHEN custom part attributes exist THEN table SHALL display them

### 9.3 UX Criteria

1. Screen loads within 2 seconds on standard broadband connection
2. All interactive elements show clear hover states
3. Charts render smoothly without flickering
4. Color coding is consistent (green=existing, orange=new, blue=confirmed, yellow=pending)
5. Typography is clear and readable (appropriate font sizes and weights)
6. Spacing is consistent throughout the screen
7. Summary cards use clear visual hierarchy
8. Cost values are formatted consistently (€X.XM format)
9. Progress indicators show clear status
10. Action buttons are clearly labeled and appropriately enabled/disabled
11. Dialogs are centered and have smooth animations
12. Loading states show spinners with descriptive messages
13. Success states show check icons with confirmation messages
14. Error messages are specific, actionable, and non-technical
15. All form fields have clear labels with required indicators (*)
16. Search filters parts in real-time without lag
17. Tab buttons show active state clearly
18. Parts table has hover effects on rows
19. Status badges are color-coded and easily distinguishable
20. Charts have clear legends and labels
21. Tooltips provide helpful additional information
22. Mobile-responsive design works on screens 768px and wider (tablet+)
23. Visual feedback is immediate for all user actions
24. Budget comparison is visually clear (bar chart)
25. Cost distribution is visually clear (donut chart)

### 9.4 Performance Criteria

1. Initial page load completes within 2 seconds
2. Project data loads within 1 second
3. Statistics calculation completes within 500ms
4. Chart rendering completes within 1 second
5. Parts table renders within 500ms for 100 parts
6. Search filtering responds within 100ms
7. Part add/edit/delete operations complete within 1 second
8. ERP upload processes within 5 seconds for 100 parts
9. Navigation to RFQ screens completes within 1 second
10. Screen handles 500+ parts without performance degradation
11. Scroll performance remains smooth with large parts lists
12. Memory usage remains stable during extended use
13. No memory leaks during navigation
14. Animations run at 60fps (smooth, no jank)
15. Real-time updates process within 500ms

### 9.5 Accessibility Criteria

1. All interactive elements are keyboard accessible (tab navigation)
2. Focus indicators are clearly visible
3. Color is not the only means of conveying information
4. Text has sufficient contrast ratio (WCAG AA: 4.5:1 for normal text)
5. Screen reader announces all important information
6. Status badges have aria-labels describing status
7. Charts have accessible data tables as fallback
8. Progress indicators have aria-valuenow, aria-valuemin, aria-valuemax
9. Buttons have descriptive aria-labels
10. Icons have aria-labels or are marked as decorative
11. Error messages are announced to screen readers
12. Form validation errors are associated with form fields
13. Dialogs trap focus and can be closed with Escape key
14. Tables have proper header associations
15. Charts provide text alternatives for data

### 9.6 Security Criteria

1. User can only access their own projects (unless admin)
2. Session validation occurs on page load
3. Expired sessions redirect to login
4. API calls include authentication tokens
5. Project IDs are validated before data access
6. No sensitive data exposed in client-side code
7. XSS protection on all displayed text
8. CSRF protection on all state-changing actions
9. Rate limiting on API calls
10. Audit log records all part modifications
11. File uploads are validated for type and size
12. ERP data is sanitized before processing
13. Part deletion requires confirmation
14. Cost data is encrypted in transit
15. User permissions are enforced on all actions


## 10. Edge Cases & Error Scenarios

### 10.1 Data Edge Cases

**No Parts Exist:**
- **Scenario:** Project has no parts (empty BOM)
- **Handling:**
  - Show empty state with illustration
  - Message: "No Parts Yet"
  - Description: "Add parts manually or upload from ERP"
  - Show "Add Manual Part" and "Upload data from ERP" buttons
  - Summary statistics show all zeros
  - Charts show empty state

**Single Part:**
- **Scenario:** Project has only one part
- **Handling:**
  - Display single part in table
  - Summary statistics show counts (1 total, 1 in one status, 0 in other)
  - Charts render with single data point
  - All functionality works normally
  - No special handling needed

**All Parts Existing:**
- **Scenario:** All parts have status = "existing"
- **Handling:**
  - New Parts card shows 0 (0%)
  - RFQ Status Summary shows all zeros
  - No RFQ action buttons in table
  - Cost breakdown shows only existing parts cost
  - Donut chart shows single slice (green)
  - Total cost card shows green theme (complete)
  - No info banner displayed

**All Parts New:**
- **Scenario:** All parts have status = "new"
- **Handling:**
  - Existing Parts card shows 0 (0%)
  - All parts show RFQ status and action buttons
  - Cost breakdown shows only new parts costs
  - Donut chart shows confirmed and pending slices
  - Total cost card shows yellow theme (if pending) or green (if all completed)
  - Info banner displayed if pending RFQs exist

**All RFQs Completed:**
- **Scenario:** All new parts have rfq_status = "completed"
- **Handling:**
  - Total cost card shows green theme
  - No info banner displayed
  - Cost breakdown shows existing + confirmed new (no pending)
  - Donut chart shows 2 slices (existing, confirmed new)
  - All RFQ action buttons show "View Summary"

**No RFQs Started:**
- **Scenario:** All new parts have rfq_status = "not-started"
- **Handling:**
  - RFQ Status Summary shows 100% not started
  - Total cost card shows yellow theme
  - Info banner displayed with pending count
  - Cost breakdown shows pending quotes
  - All RFQ action buttons show "Start RFQ"

**Very Long Part Name:**
- **Scenario:** Part name exceeds display space
- **Handling:**
  - Display full part name (no truncation for part names)
  - Use monospace font for readability
  - Table cell width adjusts if needed
  - Horizontal scroll if necessary (table responsive)

**Very Long Description:**
- **Scenario:** Part description exceeds display space
- **Handling:**
  - Truncate description with ellipsis (...)
  - Show full description on hover (tooltip)
  - Limit to 2-3 lines in table cell
  - Full description visible in edit dialog

**Very Large Quantity:**
- **Scenario:** Part quantity is 10,000+
- **Handling:**
  - Display full quantity with comma formatting (e.g., "10,000")
  - Right-align in table cell
  - Ensure total cost calculation handles large numbers
  - Format total cost appropriately (€X.XM)

**Very High Cost:**
- **Scenario:** Part cost exceeds €1M
- **Handling:**
  - Format as €X.XM (millions)
  - Ensure chart scales appropriately
  - Bar chart Y-axis adjusts to data range
  - Donut chart percentages remain accurate

**Zero Cost Parts:**
- **Scenario:** Existing part has current_price = 0
- **Handling:**
  - Display "€0" (not "Pending")
  - Include in cost calculations (contributes 0)
  - Flag as potential data issue (future: anomaly detection)
  - Allow user to edit and correct

**Missing Target Cost:**
- **Scenario:** Project has no target_cost set
- **Handling:**
  - Bar chart shows only "Total Known" bar
  - Hide "Target" bar or show as "Not Set"
  - Budget variance calculations disabled
  - Show message: "Target cost not set"

**Target Cost Lower Than Known Cost:**
- **Scenario:** total_known_cost > target_cost (over budget)
- **Handling:**
  - Bar chart shows Total Known bar exceeding Target bar
  - Budget variance is negative
  - Show warning indicator (future enhancement)
  - No blocking or restrictions

**Large Number of Parts (500+):**
- **Scenario:** Project has 500+ parts
- **Handling:**
  - Implement virtual scrolling for table performance
  - Load parts in batches (100 at a time)
  - Maintain smooth scroll performance
  - Search and filter remain responsive
  - Charts aggregate data appropriately
  - Consider pagination (future enhancement)

**Mixed RFQ Statuses:**
- **Scenario:** New parts have various RFQ statuses
- **Handling:**
  - Display each part with appropriate status badge
  - RFQ Status Summary shows correct distribution
  - Cost breakdown includes confirmed and pending
  - Donut chart shows 3 slices (existing, confirmed, pending)
  - Info banner shows pending count
  - Total cost card shows yellow theme

**Duplicate Part Names (Edge Case):**
- **Scenario:** User attempts to add part with existing name
- **Handling:**
  - Validation prevents save
  - Show error: "Part name already exists in this project"
  - Highlight part name field
  - Keep dialog open for correction
  - Suggest unique name (future: auto-append number)

**Part With No Material:**
- **Scenario:** Part has empty material field
- **Handling:**
  - Validation prevents save (material is required)
  - Show error: "Material is required"
  - Highlight material field
  - Keep dialog open for correction

**Existing Part Missing Supplier Info:**
- **Scenario:** Part status = "existing" but missing supplier/price/lead time
- **Handling:**
  - Validation prevents save
  - Show error: "Supplier, Price, and Lead Time are required for existing parts"
  - Highlight missing fields
  - Keep dialog open for correction
  - Or suggest changing status to "new"

### 10.2 Interaction Edge Cases

**Rapid Button Clicks:**
- **Scenario:** User clicks "Add Manual Part" multiple times quickly
- **Handling:**
  - Open dialog only once
  - Disable button after first click
  - Re-enable after dialog opens
  - Prevent duplicate dialogs

**Delete Part During Edit:**
- **Scenario:** User opens edit dialog, then clicks delete on same part
- **Handling:**
  - Close edit dialog automatically
  - Show delete confirmation
  - If confirmed, delete part
  - If cancelled, reopen edit dialog

**Search While Adding Part:**
- **Scenario:** User has search filter active, adds new part
- **Handling:**
  - Add part to full list
  - If new part matches search, show in filtered view
  - If new part doesn't match, don't show (but it's added)
  - Show message: "Part added (may be hidden by current filter)"

**Filter Change During ERP Upload:**
- **Scenario:** User changes status filter while ERP upload in progress
- **Handling:**
  - Allow filter change
  - ERP upload continues in background
  - When complete, apply filter to updated parts
  - Show success message with matched count

**Navigate Away During Part Add:**
- **Scenario:** User opens add part dialog, then clicks "View All RFQs"
- **Handling:**
  - Show confirmation: "Unsaved changes will be lost. Continue?"
  - If confirmed, close dialog and navigate
  - If cancelled, stay on screen with dialog open

**Hover During Chart Render:**
- **Scenario:** User hovers over chart while it's still rendering
- **Handling:**
  - Disable hover effects during render
  - Enable hover effects after render complete
  - No tooltip until chart fully loaded
  - Smooth transition to interactive state

**Resize Window During Display:**
- **Scenario:** User resizes browser window
- **Handling:**
  - Responsive layout adapts immediately
  - Charts resize and re-render
  - Table remains readable (horizontal scroll if needed)
  - No content overflow or clipping
  - Maintain scroll position

**Browser Back Button:**
- **Scenario:** User clicks browser back button
- **Handling:**
  - Return to previous screen (The Split or Projects List)
  - No data loss
  - Normal browser behavior
  - No confirmation needed (all changes auto-saved)

**Refresh During Display:**
- **Scenario:** User refreshes page (F5 or Ctrl+R)
- **Handling:**
  - Reload all project data
  - Recalculate statistics and charts
  - Fetch latest part information
  - Show loading indicator
  - Maintain same project view

**Navigate Away and Return:**
- **Scenario:** User navigates to RFQ Details and returns
- **Handling:**
  - Reload project data (check for updates)
  - Recalculate statistics if data changed
  - Show any new parts or status changes
  - Maintain scroll position if possible

### 10.3 System Edge Cases

**Session Expires During Use:**
- **Scenario:** User's session expires while viewing screen
- **Handling:**
  - Detect expired session on next API call
  - Show modal: "Session expired. Please log in again."
  - Redirect to login after confirmation
  - Preserve project ID for post-login redirect

**API Timeout:**
- **Scenario:** Project load API call times out (>10 seconds)
- **Handling:**
  - Show error toast: "Loading project is taking longer than expected"
  - Provide retry button
  - Show cached project data if available
  - Log timeout for monitoring

**Partial Data Load:**
- **Scenario:** Project loads but parts fail to load
- **Handling:**
  - Display project information
  - Show error in parts section: "Failed to load parts"
  - Provide retry button
  - Log error for monitoring
  - Don't block other functionality

**Concurrent Updates:**
- **Scenario:** Part status changes while user viewing screen (e.g., RFQ completed)
- **Handling:**
  - Poll for updates every 30 seconds (configurable)
  - Update parts table in real-time
  - Recalculate statistics and charts
  - Show notification: "Part X RFQ completed"
  - Maintain user's current scroll position

**Network Disconnection:**
- **Scenario:** User loses internet connection
- **Handling:**
  - Show banner: "Connection lost. Showing cached data."
  - Disable navigation and actions
  - Allow viewing cached project data
  - Auto-retry connection every 10 seconds
  - Show success message when reconnected
  - Sync any pending changes

**Slow Network:**
- **Scenario:** User on slow connection (2G/3G)
- **Handling:**
  - Show loading indicators
  - Load critical data first (project info, statistics)
  - Lazy load charts and parts table
  - Optimize payload sizes
  - Provide feedback on load progress

**Chart Rendering Failure:**
- **Scenario:** Chart library fails to render (invalid data or library error)
- **Handling:**
  - Show placeholder: "Chart unavailable"
  - Log error for monitoring
  - Continue showing other data
  - Provide data in table format as fallback
  - Don't block UI rendering

**Corrupted Part Data:**
- **Scenario:** Part data is malformed or missing required fields
- **Handling:**
  - Skip corrupted parts (don't crash)
  - Log errors for investigation
  - Show warning: "Some parts could not be displayed"
  - Provide support contact for data recovery
  - Continue displaying valid parts

**Calculation Overflow:**
- **Scenario:** Total cost calculation exceeds JavaScript number limits
- **Handling:**
  - Use BigDecimal or similar for large numbers
  - Format appropriately (€X.XB for billions)
  - Ensure chart scales handle large values
  - Log warning if approaching limits

**Browser Compatibility:**
- **Scenario:** User on unsupported browser
- **Handling:**
  - Detect browser version on load
  - Show warning if unsupported
  - Provide graceful degradation (basic functionality)
  - Recommend supported browsers
  - Charts may not render (show data tables)

**JavaScript Disabled:**
- **Scenario:** User has JavaScript disabled
- **Handling:**
  - Show message: "JavaScript required for Optiroq"
  - Provide instructions to enable JavaScript
  - No functionality available (SPA requires JS)


## 11. Backend API Requirements

### 11.1 API Endpoints

**GET /api/v1/projects/:project_id/summary**
- **Purpose:** Retrieve complete project summary with all parts and costs
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `project_id` (required): Unique project identifier
- **Response:** 200 OK
  ```json
  {
    "project": {
      "project_id": "PRJ-2025-001",
      "project_name": "Model X Door Assembly",
      "platform_name": "Model X",
      "customer_name": "Acme Corp",
      "delivery_location": "Detroit, MI\nPlant 3, Building A",
      "bom_file_name": "ModelX_BOM_v2.xlsx",
      "creation_date": "2024-12-28",
      "target_date": "2025-06-15",
      "target_cost": 2500000
    },
    "statistics": {
      "total_parts_count": 45,
      "existing_parts_count": 30,
      "new_parts_count": 15,
      "existing_parts_percentage": 67,
      "new_parts_percentage": 33
    },
    "costs": {
      "existing_parts_cost": 1200000,
      "completed_new_parts_cost": 800000,
      "total_known_cost": 2000000,
      "pending_new_parts_count": 5,
      "has_pending_rfqs": true
    },
    "rfq_status": {
      "not_started": 3,
      "in_progress": 2,
      "completed": 10,
      "not_started_percentage": 20,
      "in_progress_percentage": 13,
      "completed_percentage": 67
    },
    "parts": [
      {
        "part_id": "part-001",
        "part_name": "ALU-BRACKET-001",
        "description": "Aluminum mounting bracket",
        "material": "Aluminum 6061",
        "quantity": 100,
        "target_weight": 0.5,
        "status": "existing",
        "current_supplier": "Supplier A",
        "current_price": 25.50,
        "lead_time": 4
      }
    ]
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: User not authorized to access this project
  - 404 Not Found: Project not found
  - 500 Internal Server Error: Server error

**POST /api/v1/projects/:project_id/parts**
- **Purpose:** Add new part to project
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `project_id` (required): Unique project identifier
- **Request Body:**
  ```json
  {
    "part_name": "NEW-PART-001",
    "description": "New component",
    "material": "Steel",
    "quantity": 50,
    "target_weight": 1.2,
    "status": "new"
  }
  ```
- **Response:** 201 Created
  ```json
  {
    "part_id": "part-046",
    "part_name": "NEW-PART-001",
    "status": "new",
    "created_at": "2025-01-02T10:00:00Z"
  }
  ```
- **Error Responses:**
  - 400 Bad Request: Validation error (duplicate name, missing required fields)
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: User not authorized
  - 500 Internal Server Error: Server error

**PUT /api/v1/projects/:project_id/parts/:part_id**
- **Purpose:** Update existing part
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `project_id` (required): Unique project identifier
  - `part_id` (required): Unique part identifier
- **Request Body:** (partial update supported)
  ```json
  {
    "quantity": 75,
    "current_price": 28.00
  }
  ```
- **Response:** 200 OK
  ```json
  {
    "part_id": "part-001",
    "updated_fields": ["quantity", "current_price"],
    "updated_at": "2025-01-02T10:05:00Z"
  }
  ```
- **Error Responses:**
  - 400 Bad Request: Validation error
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: User not authorized
  - 404 Not Found: Part not found
  - 500 Internal Server Error: Server error

**DELETE /api/v1/projects/:project_id/parts/:part_id**
- **Purpose:** Delete part from project
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `project_id` (required): Unique project identifier
  - `part_id` (required): Unique part identifier
- **Response:** 204 No Content
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: User not authorized
  - 404 Not Found: Part not found
  - 500 Internal Server Error: Server error

**POST /api/v1/projects/:project_id/erp/upload**
- **Purpose:** Upload ERP data file and match parts
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `project_id` (required): Unique project identifier
- **Request:** multipart/form-data
  - `file`: ERP data file (.xlsx, .xls, .csv, .xml)
- **Response:** 200 OK
  ```json
  {
    "success": true,
    "matched_count": 12,
    "updated_parts": ["part-001", "part-002", "part-003"],
    "unmatched_parts": ["part-004", "part-005"]
  }
  ```
- **Error Responses:**
  - 400 Bad Request: Invalid file format or size
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: User not authorized
  - 413 Payload Too Large: File exceeds 10MB
  - 500 Internal Server Error: Server error

**GET /api/v1/projects/:project_id/rfqs**
- **Purpose:** Get all RFQs for project
- **Authentication:** Required (Bearer token)
- **Path Parameters:**
  - `project_id` (required): Unique project identifier
- **Response:** 200 OK
  ```json
  {
    "rfqs": [
      {
        "rfq_id": "RFQ-2025-047",
        "part_id": "part-015",
        "part_name": "NEW-PART-001",
        "status": "in-progress",
        "supplier_count": 4,
        "response_count": 2,
        "best_quote_price": null,
        "created_at": "2024-12-29",
        "deadline": "2025-01-15"
      }
    ],
    "total_count": 15
  }
  ```
- **Error Responses:**
  - 401 Unauthorized: Invalid or expired token
  - 403 Forbidden: User not authorized
  - 404 Not Found: Project not found
  - 500 Internal Server Error: Server error

### 11.2 Data Models

**Project Summary Model:**
```typescript
interface ProjectSummary {
  project: ProjectInfo;
  statistics: ProjectStatistics;
  costs: CostBreakdown;
  rfq_status: RFQStatusSummary;
  parts: Part[];
}

interface ProjectInfo {
  project_id: string;
  project_name: string;
  platform_name: string;
  customer_name: string;
  delivery_location: string;
  bom_file_name: string;
  creation_date: string;              // ISO 8601 date
  target_date?: string;               // ISO 8601 date
  target_cost: number;                // In euros
}

interface ProjectStatistics {
  total_parts_count: number;
  existing_parts_count: number;
  new_parts_count: number;
  existing_parts_percentage: number;  // 0-100
  new_parts_percentage: number;       // 0-100
}

interface CostBreakdown {
  existing_parts_cost: number;        // In euros
  completed_new_parts_cost: number;   // In euros
  total_known_cost: number;           // In euros
  pending_new_parts_count: number;
  has_pending_rfqs: boolean;
}

interface RFQStatusSummary {
  not_started: number;
  in_progress: number;
  completed: number;
  not_started_percentage: number;     // 0-100
  in_progress_percentage: number;     // 0-100
  completed_percentage: number;       // 0-100
}

interface Part {
  part_id: string;
  part_name: string;
  description?: string;
  material: string;
  quantity: number;
  target_weight?: number;
  status: 'existing' | 'new';
  
  // Existing parts only
  current_supplier?: string;
  current_price?: number;
  lead_time?: number;
  
  // New parts only
  rfq_status?: 'not-started' | 'in-progress' | 'completed';
  rfq_id?: string;
  best_quote_price?: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

interface PartCreateRequest {
  part_name: string;
  description?: string;
  material: string;
  quantity: number;
  target_weight?: number;
  status: 'existing' | 'new';
  current_supplier?: string;
  current_price?: number;
  lead_time?: number;
}

interface PartUpdateRequest {
  part_name?: string;
  description?: string;
  material?: string;
  quantity?: number;
  target_weight?: number;
  status?: 'existing' | 'new';
  current_supplier?: string;
  current_price?: number;
  lead_time?: number;
}

interface ERPUploadResponse {
  success: boolean;
  matched_count: number;
  updated_parts: string[];            // Array of part IDs
  unmatched_parts: string[];          // Array of part IDs
  error?: string;
}
```

### 11.3 Caching Strategy

**Client-Side Caching:**
- Cache project summary for 5 minutes
- Cache parts list for 2 minutes
- Invalidate cache on:
  - Part add/edit/delete
  - ERP upload completion
  - RFQ status change
  - Manual refresh action
  - Session change

**Server-Side Caching:**
- Cache project summary (Redis, 2 minutes TTL)
- Cache cost calculations (Redis, 1 minute TTL)
- Cache RFQ status summary (Redis, 1 minute TTL)
- Invalidate on data mutations

**Optimistic Updates:**
- Update UI immediately on user actions (add/edit/delete part)
- Sync with backend in background
- Rollback on error
- Show sync status indicator

### 11.4 Real-Time Updates

**WebSocket Connection:**
- Establish WebSocket on screen load
- Subscribe to project updates for current project
- Receive real-time notifications:
  - Part status changes
  - RFQ status changes
  - New parts added
  - Parts deleted
  - Cost updates
  - ERP upload completion

**Update Handling:**
```typescript
interface ProjectUpdateEvent {
  event_type: "part_added" | "part_updated" | "part_deleted" | "rfq_status_changed";
  project_id: string;
  part_id?: string;
  updated_fields?: Partial<Part>;
  timestamp: string;
}

// Client handles update
onProjectUpdate(event: ProjectUpdateEvent) {
  switch (event.event_type) {
    case "part_added":
      // Add new part to list
      // Recalculate statistics and costs
      // Update charts
      // Show notification
      break;
    case "part_updated":
      // Update part in list
      // Recalculate if cost/status changed
      // Update charts if needed
      // Show notification
      break;
    case "part_deleted":
      // Remove part from list
      // Recalculate statistics and costs
      // Update charts
      // Show notification
      break;
    case "rfq_status_changed":
      // Update part RFQ status
      // Recalculate RFQ status summary
      // Update cost if completed
      // Show notification
      break;
  }
}
```

**Polling Fallback:**
- If WebSocket unavailable: poll every 30 seconds
- Poll /api/v1/projects/:project_id/summary
- Compare with cached data
- Update if changes detected
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
- Highlight invalid fields in form
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


## 12. Notes & Considerations

### 12.1 Design Decisions

**Project-Level Aggregation:**
- Rationale: Buyers need complete project cost visibility for CQA
- Aggregates all parts (existing + new) in single view
- Provides both summary metrics and detailed part list
- Supports strategic decision-making with visual analytics

**Cost Breakdown with Pending Indicator:**
- Rationale: Transparency about incomplete cost information
- Yellow theme indicates pending RFQs (cost not final)
- Green theme indicates all costs known (ready for CQA)
- Info banner explains pending status clearly

**Visual Analytics (Charts):**
- Rationale: Quick understanding of cost distribution and budget status
- Donut chart shows cost breakdown by category
- Bar chart shows budget vs target comparison
- Charts complement tabular data for different learning styles

**RFQ Progress Tracking:**
- Rationale: Buyers need to track sourcing progress across multiple parts
- Three status categories: not-started, in-progress, completed
- Visual indicators (badges, percentages) show progress at a glance
- Action buttons adapt to RFQ status (Start, Review, View Summary)

**Part Management Capabilities:**
- Rationale: Flexibility to adjust project scope and data
- Add manual parts for items not in original BOM
- Edit parts to correct data or update quantities
- Delete parts no longer needed
- Upload ERP data to auto-populate existing part information

**Search and Filter:**
- Rationale: Efficient navigation in large BOMs
- Real-time search by part name and material
- Filter by status (All, Existing, New)
- Maintains usability with 100+ parts

**Dual Classification Display:**
- Rationale: Clear distinction between existing and new parts
- Color-coded badges (green=existing, orange=new)
- Separate cost tracking for each category
- Supports different workflows (existing=no action, new=RFQ needed)

### 12.2 Future Enhancements

**Advanced Cost Analysis:**
- Cost trends over time (historical comparison)
- Cost per unit weight analysis
- Cost variance alerts (outliers)
- Predictive cost modeling (LLM-based)
- What-if scenarios (change quantities, suppliers)

**Enhanced RFQ Management:**
- Bulk RFQ creation (select multiple parts)
- RFQ templates for similar parts
- Supplier recommendations per part
- Automated RFQ scheduling
- RFQ priority indicators

**Collaboration Features:**
- Comments on parts
- @mentions for team members
- Activity feed (who changed what)
- Approval workflows
- Shared project access

**Export and Reporting:**
- Export project summary to Excel
- Export cost breakdown to PDF
- Generate executive summary report
- Custom report templates
- Scheduled report delivery

**Advanced Filtering:**
- Filter by cost range
- Filter by supplier
- Filter by lead time
- Filter by material type
- Multi-select filters
- Save filter presets

**Bulk Actions:**
- Select multiple parts
- Bulk edit (quantity, status)
- Bulk delete (with confirmation)
- Bulk RFQ creation
- Bulk export

**Visual Enhancements:**
- Timeline view of RFQ progress
- Gantt chart for project schedule
- Heat map for cost distribution
- Sparklines for cost trends
- Interactive chart drill-down

**Integration Enhancements:**
- PLM system integration
- ERP real-time sync
- Supplier portal integration
- Email notifications
- Calendar integration (deadlines)

### 12.3 Dependencies

**Required Screens:**
- The Split (prerequisite - parts classified)
- Projects List (navigation source)
- RFQs Overview (navigation target)
- RFQ Creation (navigation target)
- RFQ Details (navigation target)
- RFQ Comparison (navigation target)

**Required APIs:**
- Authentication API
- Projects API
- Parts API
- RFQs API
- ERP Integration API
- File Upload API

**Required Services:**
- WebSocket service (for real-time updates)
- Caching service (Redis)
- Chart rendering library (Recharts)
- File upload service (S3)
- LLM service (cost estimation, anomaly detection)

**External Dependencies:**
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Lucide React (icons)
- shadcn/ui components
- Recharts (charts)
- React Hook Form (forms)
- Zod (validation)

### 12.4 Testing Considerations

**Unit Tests:**
- Cost calculation logic (all formulas)
- Percentage calculations
- Status badge color mapping
- Chart data transformation
- Date formatting
- Currency formatting
- Validation rules

**Integration Tests:**
- API integration (project summary, parts, RFQs)
- WebSocket connection and updates
- Authentication flow
- Navigation between screens
- ERP upload and matching
- Part CRUD operations

**E2E Tests:**
- Complete user journey: login → view project → add part → start RFQ
- Search and filter functionality
- Part add/edit/delete workflows
- ERP upload workflow
- Navigation to RFQ screens
- Real-time updates

**Performance Tests:**
- Load time with 500+ parts
- Chart rendering performance
- Scroll performance with large parts lists
- Real-time update handling
- Memory leak detection
- Concurrent user handling

**Accessibility Tests:**
- Keyboard navigation (all interactive elements)
- Screen reader compatibility (NVDA, JAWS)
- Color contrast (WCAG AA compliance)
- Focus management (dialogs, forms)
- Chart accessibility (data tables as fallback)

**Browser Compatibility Tests:**
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)
- Responsive design (768px - 2560px)
- Chart rendering across browsers

**Data Validation Tests:**
- Duplicate part name detection
- Required field validation
- Numeric field validation (positive numbers)
- Status-dependent field validation (existing parts)
- File upload validation (type, size)

### 12.5 Open Questions

1. **Auto-Refresh:** Should project data auto-refresh periodically, or only on user action?
2. **Cost Estimates:** Should system show estimated costs for pending RFQs (LLM-based)?
3. **Anomaly Detection:** Should system automatically flag cost anomalies and outliers?
4. **Bulk Operations:** Should users be able to bulk edit/delete multiple parts at once?
5. **Export:** Should users be able to export project summary to Excel/PDF?
6. **History:** Should system track cost history and changes over time?
7. **Notifications:** Should users receive notifications when RFQ status changes?
8. **Collaboration:** Can multiple users edit same project simultaneously?
9. **Approval Workflow:** Should project summary require approval before CQA?
10. **Templates:** Should system support project templates for common configurations?
11. **Integration:** Should system integrate with financial systems for budget tracking?
12. **Audit Trail:** What level of detail is required for audit logging?
13. **Performance:** What is the maximum number of parts the system should support per project?
14. **Mobile:** Should full functionality be available on mobile devices?
15. **Offline:** Should system support offline mode with sync when reconnected?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial screen requirements document |

