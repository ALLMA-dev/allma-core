# Screen 24: Comparison Dashboard

## 1. Screen Overview

### Purpose
The Comparison Dashboard is the central analytical workspace where buyers conduct comprehensive side-by-side comparisons of supplier quotations across all critical dimensions: pricing, quality, logistics, lead time, technical specifications, and ESG/sustainability metrics. This screen transforms raw quotation data into actionable intelligence through visual analytics, automated ranking, and anomaly detection.

### User Story Reference
- **Primary:** US-B-014 (Compare Supplier Quotations)
- **Supporting:** US-B-015 (Analyze Cost Structures), US-B-016 (Review Quality Metrics), US-B-017 (Evaluate Lead Times), US-B-018 (Assess ESG Compliance)

### Position in User Flow
- **Entry Points:** 
  - From Screen 20 (Extraction Review) after quotation data validation
  - From Screen 23 (Comparison Board) for detailed analysis
  - From Screen 06 (Projects List) for existing RFQ review
- **Exit Points:**
  - To Screen 25 (Anomalies Dashboard) for detailed anomaly investigation
  - To Screen 26 (Decision Dashboard) to finalize supplier selection
  - To Screen 27 (Lead Time Breakdown) for milestone analysis
  - To Screen 28 (Tooling Savings Display) for cost optimization review

### Key Interactions
- Multi-part RFQ navigation with part selector dropdown
- Snapshot/versioning system for tracking price changes over time
- Collapsible category sections (Pricing, Quality, Logistics, Lead Time, Technical, ESG)
- Integrated supplier comments sidebar for collaborative decision-making
- Interactive cost visualization (lifetime vs yearly spend analysis)
- Real-time anomaly detection with visual highlighting
- T&C Requirements comparison against target specifications
- Best value highlighting with automated ranking

## 2. User Goals & Success Criteria

### Primary User Goals
1. **Comprehensive Comparison:** View all supplier quotations side-by-side across multiple dimensions
2. **Cost Analysis:** Understand lifetime and yearly spend implications for each supplier
3. **Quality Assessment:** Evaluate quality metrics, certifications, and defect rates
4. **Lead Time Evaluation:** Compare delivery timelines across 7 critical milestones
5. **ESG Compliance:** Assess sustainability scores and environmental metrics
6. **Anomaly Detection:** Identify and investigate pricing or specification anomalies
7. **Collaborative Review:** Add comments and notes for team discussion
8. **Version Tracking:** Monitor quotation changes over time through snapshots

### Success Metrics
- Time to complete supplier comparison: < 15 minutes per RFQ
- Accuracy of best value identification: > 95%
- Anomaly detection rate: 100% of significant deviations flagged
- User confidence in decision-making: > 90% (survey-based)
- Comments collaboration usage: > 60% of multi-stakeholder RFQs
- Snapshot comparison usage: > 40% of RFQs with multiple quotation rounds


## 3. Functional Requirements

### FR-24.1: Multi-Part RFQ Navigation
**Priority:** P0 (Critical)

**Description:** For RFQs containing multiple parts, provide a part selector dropdown that allows buyers to switch between different parts while maintaining context and comparison state.

**Detailed Requirements:**
- Display part selector dropdown prominently at the top of the dashboard
- Show part number, description, and key identifiers in dropdown options
- Preserve expanded/collapsed category states when switching between parts
- Maintain comment sidebar state and active section when navigating parts
- Display current part information in dashboard header
- Support keyboard navigation (arrow keys, Enter to select)
- Show part count indicator (e.g., "Part 2 of 5")
- Auto-save comparison state before switching parts
- Load comparison data asynchronously with loading indicator
- Handle missing quotation data gracefully (show "No quotations available" message)

**Acceptance Criteria:**
- Part selector dropdown displays all parts in the RFQ
- Switching parts loads correct supplier quotations within 2 seconds
- Category expansion states persist across part switches
- Comment sidebar maintains active section when switching parts
- Keyboard navigation works for part selection
- Part count indicator shows correct position
- Loading states display during part data fetch
- Error handling for missing or incomplete part data

### FR-24.2: Snapshot/Versioning System
**Priority:** P0 (Critical)

**Description:** Track and compare different versions of supplier quotations over time, allowing buyers to see how prices and terms have evolved through negotiation rounds.

**Detailed Requirements:**
- Display snapshot selector dropdown next to part selector
- Show snapshot metadata: version number, date created, creator name
- Label snapshots with meaningful names (e.g., "Initial Quotes", "After Negotiation Round 1")
- Highlight current/active snapshot with visual indicator
- Allow comparison between two snapshots (side-by-side or diff view)
- Show price change indicators (up/down arrows with percentage change)
- Display "New" badge for suppliers added in later snapshots
- Track which fields changed between snapshots
- Provide snapshot creation functionality with custom naming
- Auto-create snapshots at key milestones (initial submission, after follow-ups)
- Support snapshot deletion with confirmation (admin only)
- Export snapshot comparison reports

**Acceptance Criteria:**
- Snapshot selector shows all available versions with metadata
- Switching snapshots loads correct historical data within 2 seconds
- Price change indicators display accurate percentage differences
- New suppliers in later snapshots are clearly marked
- Snapshot comparison view highlights all changed fields
- Snapshot creation saves current state with user-defined name
- Auto-snapshots created at initial submission and after follow-ups
- Snapshot deletion requires confirmation and admin privileges
- Export generates comparison report in PDF/Excel format


### FR-24.3: Collapsible Category Sections
**Priority:** P0 (Critical)

**Description:** Organize comparison data into six collapsible category sections (Pricing, Quality, Logistics, Lead Time, Technical, ESG) to reduce cognitive load and allow focused analysis.

**Detailed Requirements:**
- Implement six category sections with distinct color coding:
  - Pricing: Blue theme
  - Quality: Purple theme
  - Logistics: Orange theme
  - Lead Time: Indigo theme
  - Technical: Teal theme
  - ESG/Sustainability: Green theme
- Each category header shows icon, title, and comment count badge
- Click category header to expand/collapse section
- Show chevron icon indicating expansion state (down = expanded, up = collapsed)
- Default state: All categories collapsed except Pricing
- Persist expansion state in user preferences
- Support "Expand All" / "Collapse All" quick actions
- Display row count indicator in collapsed state (e.g., "8 metrics")
- Smooth animation for expand/collapse transitions (300ms)
- Keyboard shortcuts: Space to toggle, Tab to navigate between categories
- Mobile-responsive: Stack categories vertically, maintain collapsible behavior

**Acceptance Criteria:**
- All six categories display with correct color themes and icons
- Clicking category header toggles expansion state
- Chevron icons update to reflect current state
- Default state shows only Pricing expanded
- Expansion preferences save and restore on page reload
- "Expand All" / "Collapse All" buttons work correctly
- Row count indicators show accurate metric counts
- Animations complete smoothly without performance issues
- Keyboard shortcuts function as specified
- Mobile view maintains full functionality

### FR-24.4: T&C Requirements Comparison Column
**Priority:** P0 (Critical)

**Description:** Display target Terms & Conditions (T&C) requirements in a dedicated column, allowing buyers to compare supplier quotations against original specifications.

**Detailed Requirements:**
- Show T&C Requirements column immediately after metric name column
- Apply distinct visual styling: amber background, bold text, bordered
- Display target values for all comparable metrics
- Show "Target" or "Required" label in column header
- Include target ranges where applicable (e.g., "≤ 0.5%" for defect rate)
- Display minimum/maximum thresholds with comparison operators
- Highlight when supplier values meet or exceed targets (green checkmark)
- Flag when supplier values fall short of targets (red warning icon)
- Support multiple data types: numeric, text, boolean, date, list
- Show "N/A" for metrics without target specifications
- Make column sticky (fixed position) when scrolling horizontally
- Display tooltips with detailed target explanations on hover
- Support unit conversions for international standards

**Acceptance Criteria:**
- T&C Requirements column displays with amber styling
- All target values show correctly formatted data
- Comparison operators display appropriately (≤, ≥, =, etc.)
- Green checkmarks appear when suppliers meet targets
- Red warnings flag values below targets
- Column remains fixed when scrolling horizontally
- Tooltips provide detailed target context
- Unit conversions work for metric/imperial systems
- "N/A" displays for metrics without targets
- Column width adjusts to content without truncation


### FR-24.5: Pricing Category Analysis
**Priority:** P0 (Critical)

**Description:** Comprehensive pricing comparison including unit costs, tooling costs, lifetime spend, and cost breakdowns with visual highlighting of best values.

**Detailed Requirements:**
- Display pricing metrics in structured rows:
  - Unit Price (per piece)
  - Tooling Cost (one-time investment)
  - Lifetime Spend (6-year projection based on volume profile)
  - Cost Breakdown (material, labor, overhead, profit margin)
- Highlight lowest unit price with green background and "LOWEST" badge
- Show price rejection logic: auto-flag if >10% above target price
- Display rejected prices with red background and "REJECTED" badge
- Calculate and show lifetime spend based on yearly volume profile:
  - 2026: 10,000 pieces
  - 2027: 20,000 pieces
  - 2028: 30,000 pieces
  - 2029: 50,000 pieces
  - 2030: 50,000 pieces
  - 2031: 50,000 pieces
  - Total: 210,000 pieces
- Show cost per piece average over lifetime
- Display tooling cost savings when applicable
- Include currency conversion support (EUR, USD, GBP, CNY)
- Show price trends with up/down arrows when comparing snapshots
- Calculate total cost of ownership (TCO) including shipping and duties
- Display payment terms and conditions
- Show volume discount tiers if applicable

**Acceptance Criteria:**
- All pricing metrics display with correct calculations
- Lowest unit price highlighted with green background
- Prices >10% above target flagged as rejected with red background
- Lifetime spend calculations accurate based on volume profile
- Cost breakdowns sum to total unit price
- Currency conversions use current exchange rates
- Price trend arrows show correct direction and percentage
- TCO calculations include all cost components
- Payment terms display clearly
- Volume discounts show tier breakpoints and savings

### FR-24.6: Quality Category Analysis
**Priority:** P0 (Critical)

**Description:** Evaluate supplier quality metrics including certifications, defect rates, inspection processes, and experience with similar parts.

**Detailed Requirements:**
- Display quality metrics:
  - ISO Certifications (ISO 9001, ISO 14001, IATF 16949, etc.)
  - Defect Rate (PPM - parts per million)
  - Experience with Similar Parts (Yes/No with details)
  - Quality Control Process description
  - Inspection Equipment and capabilities
  - Warranty Terms and conditions
- Show certification badges with visual icons
- Highlight best defect rate with green background
- Display checkmark icon for "Yes" on experience, gray text for "No"
- Support multiple certifications per supplier (display as badge list)
- Show certification expiry dates with warning for near-expiry
- Include quality score calculation (weighted average of metrics)
- Display quality audit history if available
- Show customer satisfaction ratings
- Include return/rejection rate statistics
- Support quality documentation attachments (certificates, audit reports)

**Acceptance Criteria:**
- All quality metrics display with correct data
- Certification badges show with appropriate icons
- Best defect rate highlighted with green background
- Experience indicators use checkmark/text appropriately
- Multiple certifications display as organized badge list
- Expiry warnings show for certifications within 90 days of expiration
- Quality scores calculate correctly with visible formula
- Audit history displays chronologically
- Customer ratings show with star visualization
- Return rate statistics display with trend indicators
- Documentation attachments accessible via download links


### FR-24.7: Logistics Category Analysis
**Priority:** P1 (High)

**Description:** Compare supplier locations, shipping capabilities, and logistics arrangements to assess delivery feasibility and costs.

**Detailed Requirements:**
- Display logistics metrics:
  - Supplier Location (country, city, facility address)
  - Shipping Method (air, sea, ground, rail)
  - Shipping Cost (per shipment or per piece)
  - Incoterms (FOB, CIF, DDP, etc.)
  - Packaging Requirements
  - Customs/Import considerations
- Show location on interactive map (optional enhancement)
- Calculate distance from buyer's facility
- Display estimated transit times based on shipping method
- Show shipping cost impact on total cost
- Highlight preferred locations (domestic, regional, etc.)
- Include port/airport proximity information
- Display logistics partner information
- Show packaging specifications and costs
- Include insurance and handling requirements
- Support multiple delivery locations

**Acceptance Criteria:**
- All logistics metrics display with complete information
- Supplier locations show country and city clearly
- Shipping methods display with appropriate icons
- Incoterms show with standard abbreviations and tooltips
- Distance calculations accurate within 5%
- Transit time estimates based on historical data
- Shipping costs integrate into total cost calculations
- Preferred locations highlighted with visual indicator
- Packaging specs display with dimensions and weight
- Multiple delivery locations supported in data model

### FR-24.8: Lead Time Category Analysis
**Priority:** P0 (Critical)

**Description:** Compare supplier lead times across seven critical manufacturing milestones to assess production timeline feasibility.

**Detailed Requirements:**
- Display lead time metrics for seven milestones:
  1. Sample A Lead Time (initial sample)
  2. Sample BCD Lead Time (revised samples)
  3. Prototype Lead Time (functional prototype)
  4. Off-Tool Parts Lead Time (first production parts)
  5. Off-Tool Process Lead Time (process validation)
  6. PPAP Lead Time (Production Part Approval Process)
  7. SOP Lead Time (Start of Production)
- Show each lead time in weeks with calendar icon
- Highlight shortest SOP lead time with green background and trending down icon
- Display cumulative timeline visualization (Gantt-style)
- Show critical path analysis
- Compare against target lead times from T&C Requirements
- Flag lead times that exceed targets with warning icons
- Calculate total time-to-production from RFQ to SOP
- Display milestone dependencies and sequencing
- Show lead time breakdown by activity
- Include buffer time recommendations
- Support lead time comparison across snapshots
- Display lead time confidence levels (firm, estimated, TBD)

**Acceptance Criteria:**
- All seven milestones display with correct lead times
- Calendar icons appear next to each lead time value
- Shortest SOP highlighted with green background and icon
- Cumulative timeline shows accurate milestone sequence
- Critical path identifies longest dependency chain
- Target comparisons flag exceeded lead times
- Total time-to-production calculates correctly
- Milestone dependencies display logically
- Lead time breakdowns sum to total milestone time
- Buffer recommendations based on historical data
- Snapshot comparisons show lead time changes
- Confidence levels display with appropriate indicators


### FR-24.9: Technical Specifications Category
**Priority:** P0 (Critical)

**Description:** Compare technical specifications including material grades, cycle times, manufacturing operations, and process capabilities.

**Detailed Requirements:**
- Display technical metrics:
  - Material Grade (specific alloy or polymer designation)
  - Cycle Time (seconds per part)
  - Operations (manufacturing process steps)
  - Cavity Count (for injection molding)
  - Machine Tonnage (press capacity)
  - Surface Finish specifications
  - Tolerance Capabilities (dimensional accuracy)
  - Secondary Operations (post-processing)
- Highlight anomalies with yellow background and "Anomaly" badge
- Show material grade deviations from target specification
- Display cycle time efficiency comparisons
- List operations as comma-separated or bullet list
- Show process capability indices (Cpk values)
- Include tooling specifications and requirements
- Display manufacturing technology (equipment type)
- Show capacity utilization and availability
- Include technical documentation attachments
- Support technical specification comparison against drawings

**Acceptance Criteria:**
- All technical metrics display with correct specifications
- Material grade anomalies highlighted with yellow background
- Anomaly badges appear for specification deviations
- Cycle times show in consistent units (seconds)
- Operations list displays clearly without truncation
- Cpk values show with color coding (green ≥1.33, yellow 1.0-1.33, red <1.0)
- Tooling specs display with complete details
- Manufacturing technology shows equipment type and model
- Capacity data displays with utilization percentages
- Technical documents accessible via download links
- Drawing comparisons highlight specification matches/mismatches

### FR-24.10: ESG/Sustainability Category
**Priority:** P1 (High)

**Description:** Assess supplier environmental, social, and governance (ESG) performance through ECOVADIS scores, internal assessments, certifications, and environmental metrics.

**Detailed Requirements:**
- Display ESG metrics:
  - ECOVADIS Score (0-100 scale)
  - ECOVADIS Level (Platinum, Gold, Silver, Bronze)
  - Internal ESG Assessment Score (0-100 scale)
  - ESG Certifications (ISO 14001, ISO 45001, SA8000, etc.)
  - Environmental Metrics:
    - Carbon Footprint (kg CO2e per part)
    - Renewable Energy Usage (percentage)
    - Waste Recycling Rate (percentage)
    - Water Consumption (liters per part)
- Show ECOVADIS levels with color-coded badges:
  - Platinum: Purple background
  - Gold: Yellow background
  - Silver: Gray background
  - Bronze: Orange background
- Display target ECOVADIS score from T&C Requirements (e.g., "≥ 45")
- Highlight suppliers meeting or exceeding ESG targets
- Show certification badges with expiry dates
- Display environmental metrics with trend indicators
- Calculate ESG composite score
- Include social responsibility metrics (labor practices, safety)
- Show governance metrics (ethics, compliance)
- Support ESG documentation attachments (certificates, reports)
- Display ESG improvement trends over time

**Acceptance Criteria:**
- ECOVADIS scores display with correct values and levels
- Level badges show with appropriate color coding
- Internal assessment scores display on 0-100 scale
- Target comparisons show clearly (≥ symbol with target value)
- Certification badges display with icons and expiry dates
- Environmental metrics show with correct units
- Trend indicators display direction (up/down/stable)
- ESG composite score calculates with visible formula
- Social and governance metrics display in organized sections
- ESG documents accessible via download links
- Historical trends show improvement or decline over time


### FR-24.11: Cost Visualization - Lifetime vs Yearly
**Priority:** P0 (Critical)

**Description:** Provide interactive cost visualization with two views: lifetime spend comparison (vertical bar chart) and yearly spend breakdown (grouped bar chart).

**Detailed Requirements:**
- Implement view toggle buttons: "Lifetime Total" and "Per-Year Breakdown"
- Default view: Lifetime Total

**Lifetime Total View:**
- Display vertical bar chart with suppliers on X-axis, spend on Y-axis
- Show Y-axis labels with currency values (e.g., "€100k", "€200k")
- Color-code bars:
  - Lowest spend: Green gradient (from-green-600 to-green-400)
  - Highest spend: Red gradient (from-red-600 to-red-400)
  - Others: Blue gradient (from-blue-600 to-blue-400)
- Display value label on top of each bar (e.g., "€450k")
- Show percentage inside each bar (relative to maximum)
- Add "LOWEST" badge below lowest spend supplier
- Add "RECOMMENDED" badge for recommended suppliers
- Include hover tooltip showing:
  - Supplier name
  - Total lifetime spend
  - Average per-piece cost
  - Average yearly spend
- Display horizontal grid lines for readability
- Show Y-axis label: "Total Lifetime Spend (€)"

**Per-Year Breakdown View:**
- Display grouped bar chart with years on X-axis
- Show volume profile info card above chart:
  - 2026: 10,000 pcs
  - 2027: 20,000 pcs
  - 2028: 30,000 pcs
  - 2029: 50,000 pcs
  - 2030: 50,000 pcs
  - 2031: 50,000 pcs
- Group bars by year, with one bar per supplier per year
- Color-code suppliers consistently:
  - Supplier 1: Blue gradient
  - Supplier 2: Green gradient
  - Supplier 3: Purple gradient
  - Supplier 4: Orange gradient
- Display year label and volume above each group
- Show hover tooltip with:
  - Supplier name
  - Year
  - Annual spend
  - Cost per piece for that year
- Include legend showing supplier names with color indicators
- Display yearly breakdown table below chart:
  - Rows: Suppliers
  - Columns: Years + Total
  - Highlight lowest total with green background
- Show Y-axis label: "Annual Spend (€)"

**Acceptance Criteria:**
- View toggle buttons switch between lifetime and yearly views
- Lifetime view displays vertical bars with correct heights
- Color coding applies correctly (green=lowest, red=highest, blue=others)
- Value labels and percentages display accurately
- Badges appear on appropriate suppliers
- Hover tooltips show complete information
- Per-year view groups bars correctly by year
- Volume profile card displays accurate yearly volumes
- Supplier colors remain consistent across all years
- Legend matches bar colors correctly
- Yearly breakdown table calculates totals accurately
- Grid lines and axis labels display clearly
- Charts responsive to window resizing


### FR-24.12: Summary Statistics Cards
**Priority:** P1 (High)

**Description:** Display three summary statistic cards below cost visualization showing lowest spend, highest spend, and potential savings.

**Detailed Requirements:**
- Display three horizontal cards in grid layout (3 columns)

**Lowest Spend Card:**
- Green theme (bg-green-50, border-green-200)
- Show "Lowest Spend" label with trending down icon
- Display minimum lifetime spend value (large, bold, green)
- Show supplier name with lowest spend
- Display average per-piece cost
- Color: Green (#10b981)

**Highest Spend Card:**
- Red theme (bg-red-50, border-red-200)
- Show "Highest Spend" label with trending up icon
- Display maximum lifetime spend value (large, bold, red)
- Show supplier name with highest spend
- Display average per-piece cost
- Color: Red (#ef4444)

**Potential Savings Card:**
- Blue theme (bg-blue-50, border-blue-200)
- Show "Potential Savings" label with dollar sign icon
- Display difference between highest and lowest (large, bold, blue)
- Show explanatory text: "By choosing lowest vs highest"
- Display percentage cost reduction
- Color: Blue (#3b82f6)

**Acceptance Criteria:**
- All three cards display in responsive grid layout
- Lowest spend card shows correct minimum value and supplier
- Highest spend card shows correct maximum value and supplier
- Potential savings calculates as (max - min)
- Percentage reduction calculates as ((max - min) / max) × 100
- Per-piece averages calculate as (lifetime spend / 210,000)
- Icons display correctly (trending down, trending up, dollar sign)
- Color themes apply consistently
- Cards responsive on mobile (stack vertically)
- Font sizes scale appropriately (2xl for main values)

### FR-24.13: Anomalies Alert Section
**Priority:** P0 (Critical)

**Description:** Display detected anomalies in a prominent alert card with navigation to detailed anomaly analysis.

**Detailed Requirements:**
- Show anomalies card with yellow theme (border-yellow-300, bg-yellow-50)
- Display "Detected Anomalies" title with alert triangle icon
- List all suppliers with anomalies in individual alert items
- Each anomaly item shows:
  - Alert triangle icon (yellow)
  - Supplier name (bold)
  - Anomaly description text
  - "View Details" button
- "View Details" button navigates to Screen 25 (Anomalies Dashboard)
- Hide anomalies card if no anomalies detected
- Support multiple anomaly types:
  - Material grade deviations
  - Price outliers (>10% above/below median)
  - Lead time inconsistencies
  - Missing required certifications
  - Specification mismatches
- Display anomaly severity indicator (high, medium, low)
- Show anomaly count badge in section header
- Include "Dismiss" option for false positives (with confirmation)
- Track anomaly resolution status

**Acceptance Criteria:**
- Anomalies card displays with yellow theme
- All suppliers with anomalies listed in card
- Anomaly descriptions clear and actionable
- "View Details" button navigates to Screen 25
- Card hidden when no anomalies present
- Severity indicators display with appropriate colors
- Anomaly count badge shows correct number
- Dismiss functionality requires confirmation
- Dismissed anomalies marked but remain accessible
- Resolution status tracked and displayed


### FR-24.14: Supplier Comments Sidebar
**Priority:** P1 (High)

**Description:** Integrated sidebar for adding, viewing, and managing supplier-specific comments organized by category sections.

**Detailed Requirements:**
- Display collapsible sidebar on right side of screen
- Toggle sidebar open/close with button click
- Show comment count badges on category headers
- Clicking comment badge opens sidebar to that category section
- Sidebar sections match main dashboard categories:
  - Pricing
  - Quality
  - Logistics
  - Lead Time
  - Technical
  - ESG/Sustainability
- Each comment displays:
  - Author name and avatar
  - Timestamp (relative: "2 hours ago" or absolute: "Dec 30, 2025 14:30")
  - Comment text (supports multi-line)
  - Supplier association (which supplier the comment refers to)
  - Category tag
  - Edit/Delete buttons (for comment author only)
- Add comment form at bottom of each section:
  - Supplier selector dropdown
  - Text area for comment (max 500 characters)
  - Character counter
  - "Add Comment" button
- Support @mentions for team collaboration
- Display unread comment indicators
- Filter comments by supplier
- Sort comments by date (newest/oldest)
- Export comments to PDF/Excel
- Email notifications for new comments (optional)
- Comment threading for discussions (optional enhancement)

**Acceptance Criteria:**
- Sidebar toggles open/close smoothly
- Comment count badges display accurate counts per category
- Clicking badge opens sidebar to correct section
- All comment metadata displays correctly
- Add comment form validates input (non-empty, max length)
- Comments save and display immediately
- Edit/Delete buttons visible only to comment authors
- @mentions trigger notifications to mentioned users
- Unread indicators display for new comments
- Supplier filter works correctly
- Sort options change comment order
- Export generates formatted document with all comments
- Email notifications sent when enabled

### FR-24.15: Best Value Highlighting
**Priority:** P0 (Critical)

**Description:** Automatically identify and highlight best values across all comparison metrics to guide buyer decision-making.

**Detailed Requirements:**
- Apply green background highlighting to best values in each metric row
- Best value criteria by metric type:
  - Pricing: Lowest unit price, lowest lifetime spend
  - Quality: Lowest defect rate, most certifications
  - Logistics: Shortest distance, lowest shipping cost
  - Lead Time: Shortest SOP lead time
  - Technical: Best cycle time, highest Cpk
  - ESG: Highest ECOVADIS score, best environmental metrics
- Display bold text for highlighted best values
- Add visual indicator icon next to best value (checkmark, star, or trophy)
- Support tie-breaking when multiple suppliers have same best value
- Show "BEST" badge for overall recommended supplier
- Calculate composite score across all categories
- Weight categories based on buyer preferences (configurable)
- Display scoring methodology in tooltip
- Allow manual override of best value highlighting
- Show second-best values with lighter highlighting (optional)
- Include best value summary card at top of dashboard

**Acceptance Criteria:**
- Best values highlighted with green background across all metrics
- Bold text applied to highlighted values
- Visual indicator icons display next to best values
- Ties handled appropriately (both highlighted or tie-breaker applied)
- "BEST" badge appears on overall recommended supplier
- Composite score calculates correctly with visible formula
- Category weights configurable in settings
- Scoring methodology tooltip provides clear explanation
- Manual overrides save and persist
- Best value summary card shows key highlights


### FR-24.16: Navigation and Action Buttons
**Priority:** P0 (Critical)

**Description:** Provide clear navigation buttons for moving between related screens in the RFQ workflow.

**Detailed Requirements:**
- Display action buttons in footer section
- Left side: "Back to Extraction Review" button (outline style)
- Right side: Two buttons in horizontal group
  - "View Anomalies Dashboard" button (outline style)
  - "Proceed to Decision Dashboard" button (primary style, blue)
- Navigation targets:
  - Back button → Screen 20 (Extraction Review)
  - Anomalies button → Screen 25 (Anomalies Dashboard)
  - Proceed button → Screen 26 (Decision Dashboard)
- Disable "Proceed" button if critical anomalies unresolved
- Show tooltip on disabled button explaining why
- Display confirmation dialog if leaving with unsaved comments
- Support keyboard shortcuts:
  - Alt+Left: Back
  - Alt+A: Anomalies
  - Alt+Right or Enter: Proceed
- Show progress indicator (e.g., "Step 3 of 5")
- Include breadcrumb navigation at top
- Auto-save comparison state before navigation

**Acceptance Criteria:**
- All navigation buttons display in correct positions
- Button styles match design system (outline vs primary)
- Navigation targets correct screens
- "Proceed" button disables when anomalies unresolved
- Disabled button tooltip explains blocking reason
- Confirmation dialog appears for unsaved changes
- Keyboard shortcuts work as specified
- Progress indicator shows correct step
- Breadcrumbs display full navigation path
- Auto-save completes before navigation

### FR-24.17: Responsive Table Design
**Priority:** P1 (High)

**Description:** Ensure comparison table remains usable and readable across different screen sizes and when displaying multiple suppliers.

**Detailed Requirements:**
- Implement horizontal scrolling for tables with many suppliers (>4)
- Make metric name column sticky (fixed left position)
- Make T&C Requirements column sticky (fixed after metric names)
- Apply zebra striping to table rows for readability
- Highlight row on hover with subtle background color
- Support column resizing (drag column borders)
- Provide column visibility toggles (show/hide specific suppliers)
- Implement responsive breakpoints:
  - Desktop (>1200px): Show all suppliers side-by-side
  - Tablet (768-1200px): Horizontal scroll, sticky columns
  - Mobile (<768px): Card-based layout, one supplier per card
- Maintain table header visibility when scrolling vertically
- Show scroll indicators (shadows) at table edges
- Support pinning specific supplier columns
- Provide "Compare Selected" mode (show only 2-3 suppliers)
- Export table to Excel with formatting preserved

**Acceptance Criteria:**
- Horizontal scrolling works smoothly with many suppliers
- Metric name column remains fixed when scrolling horizontally
- T&C Requirements column stays fixed after metric names
- Zebra striping alternates row colors correctly
- Hover effects apply to entire row
- Column resizing works with drag interaction
- Column visibility toggles show/hide suppliers correctly
- Responsive layouts adapt at specified breakpoints
- Mobile card layout displays all information clearly
- Table header remains visible when scrolling down
- Scroll shadows appear at table edges
- Pinned columns stay fixed in position
- "Compare Selected" mode filters to chosen suppliers
- Excel export maintains colors, formatting, and structure


### FR-24.18: Data Export Capabilities
**Priority:** P1 (High)

**Description:** Enable buyers to export comparison data in multiple formats for offline analysis, reporting, and stakeholder sharing.

**Detailed Requirements:**
- Provide "Export" dropdown button in dashboard header
- Support export formats:
  - Excel (.xlsx): Multi-sheet workbook
  - PDF: Formatted comparison report
  - CSV: Raw data for analysis
  - PowerPoint (.pptx): Executive summary slides
- Excel export structure:
  - Sheet 1: Summary (best values, recommendations, key metrics)
  - Sheet 2: Detailed Comparison (full table with all metrics)
  - Sheet 3: Cost Analysis (lifetime and yearly charts as images)
  - Sheet 4: Anomalies (list of detected issues)
  - Sheet 5: Comments (all supplier comments)
- PDF export features:
  - Company branding (logo, colors)
  - Table of contents
  - Executive summary page
  - Detailed comparison tables
  - Cost visualization charts
  - Anomalies section
  - Comments section
  - Page numbers and timestamps
- CSV export: Flat structure with all data points
- PowerPoint export:
  - Slide 1: Title and summary
  - Slide 2: Cost comparison chart
  - Slide 3: Best value highlights
  - Slide 4: Recommendations
  - Slide 5: Next steps
- Include export options:
  - Export all suppliers or selected only
  - Export all categories or specific categories
  - Include/exclude comments
  - Include/exclude anomalies
- Show export progress indicator
- Generate filename with RFQ number and timestamp
- Email export directly to stakeholders (optional)

**Acceptance Criteria:**
- Export dropdown displays all format options
- Excel export creates multi-sheet workbook with correct structure
- PDF export includes all specified sections with formatting
- CSV export contains complete data in flat structure
- PowerPoint export creates presentation with all slides
- Export options filter data correctly
- Progress indicator shows during export generation
- Filenames include RFQ number and timestamp
- All exports download successfully
- Email functionality sends exports to specified recipients
- Exported data matches dashboard display exactly
- Charts and visualizations render correctly in exports

## 4. Flexibility Architecture

### Configurable Elements
1. **Category Weights:** Adjust importance of each category (Pricing, Quality, Lead Time, etc.) in composite scoring
2. **Best Value Criteria:** Customize what constitutes "best value" for each metric type
3. **Anomaly Thresholds:** Configure sensitivity for anomaly detection (e.g., price deviation percentage)
4. **Default Expanded Categories:** Set which categories expand by default
5. **Column Visibility:** Choose which metrics display in comparison table
6. **Cost Visualization Defaults:** Set default view (lifetime vs yearly)
7. **Currency and Units:** Configure preferred currency and measurement units
8. **Snapshot Auto-Creation:** Enable/disable automatic snapshot creation at milestones
9. **Comment Notifications:** Configure email notifications for new comments
10. **Export Templates:** Customize export formats and branding

### Extension Points
1. **Custom Metrics:** Add industry-specific or company-specific comparison metrics
2. **Additional Categories:** Create new category sections beyond the six standard ones
3. **Scoring Algorithms:** Implement custom composite scoring formulas
4. **Visualization Types:** Add new chart types (radar charts, scatter plots, etc.)
5. **Integration Hooks:** Connect to external systems (ERP, PLM, supplier databases)
6. **Approval Workflows:** Add multi-stage approval processes before proceeding
7. **AI Recommendations:** Integrate ML models for supplier recommendations
8. **Risk Assessment:** Add supplier risk scoring and analysis
9. **Compliance Checks:** Automated regulatory compliance verification
10. **Collaboration Features:** Real-time co-viewing and editing with team members

### User Preference Storage
- Category expansion states (per user)
- Column widths and visibility (per user)
- Sort preferences (per user)
- Filter settings (per user)
- Cost view preference (lifetime vs yearly, per user)
- Comment sidebar state (open/closed, per user)
- Export format preferences (per user)
- Notification settings (per user)


## 5. User Experience Requirements

### UX-24.1: Visual Hierarchy and Clarity
- Use consistent color coding across all categories (blue, purple, orange, indigo, teal, green)
- Apply clear visual distinction between T&C Requirements column and supplier columns
- Highlight best values with green background and bold text
- Flag anomalies with yellow background and warning icons
- Use white space effectively to separate sections and reduce cognitive load
- Implement progressive disclosure: collapsed categories by default (except Pricing)
- Display clear section headers with icons and comment count badges
- Use consistent typography hierarchy (headings, body text, labels)

### UX-24.2: Interaction Feedback
- Provide immediate visual feedback for all user actions (clicks, hovers, selections)
- Show loading states during data fetching (skeleton screens or spinners)
- Display success/error messages for comment submissions
- Animate category expand/collapse transitions smoothly (300ms)
- Show hover tooltips for complex metrics and abbreviations
- Highlight active section in comments sidebar
- Display progress indicators for export operations
- Provide confirmation dialogs for destructive actions (delete comments, dismiss anomalies)

### UX-24.3: Navigation and Wayfinding
- Display breadcrumb navigation showing current position in workflow
- Show progress indicator (e.g., "Step 3 of 5 - Comparison Analysis")
- Provide clear "Back" and "Next" navigation buttons
- Include quick links to related screens (Anomalies, Decision Dashboard)
- Highlight current part in multi-part RFQ selector
- Show active snapshot in version selector
- Display scroll position indicators for long tables
- Provide "Jump to Category" quick navigation menu

### UX-24.4: Data Comprehension
- Use visual indicators (icons, badges, colors) to convey meaning quickly
- Display units consistently (€, weeks, %, ppm, kg CO2e)
- Show comparison operators clearly (≤, ≥, =)
- Provide contextual tooltips explaining complex metrics
- Use data visualization (charts, graphs) for cost analysis
- Display summary statistics prominently (lowest, highest, savings)
- Highlight key insights (best values, anomalies, recommendations)
- Use progressive disclosure for detailed breakdowns

### UX-24.5: Responsive and Adaptive Design
- Adapt layout for desktop, tablet, and mobile screen sizes
- Maintain functionality across all breakpoints
- Use horizontal scrolling for wide tables on smaller screens
- Stack cards vertically on mobile devices
- Adjust font sizes for readability on different screens
- Optimize touch targets for mobile (minimum 44x44px)
- Provide swipe gestures for mobile navigation
- Ensure charts remain readable when scaled down

### UX-24.6: Accessibility and Inclusivity
- Support keyboard navigation for all interactive elements
- Provide keyboard shortcuts for common actions
- Ensure sufficient color contrast (WCAG AA minimum)
- Include text alternatives for visual indicators
- Support screen readers with proper ARIA labels
- Allow font size adjustment without breaking layout
- Provide focus indicators for keyboard navigation
- Ensure form inputs have associated labels

### UX-24.7: Error Prevention and Recovery
- Validate comment input before submission (non-empty, max length)
- Prevent navigation with unsaved changes (show confirmation)
- Disable "Proceed" button when critical anomalies unresolved
- Show clear error messages with recovery suggestions
- Auto-save comparison state periodically
- Provide undo functionality for comment deletion
- Allow dismissal of false positive anomalies
- Handle missing data gracefully (show "N/A" or placeholder)

### UX-24.8: Performance and Responsiveness
- Load comparison data within 2 seconds
- Render charts and visualizations within 1 second
- Animate transitions smoothly without lag (60fps)
- Implement lazy loading for comments and historical data
- Optimize table rendering for many suppliers (virtualization)
- Cache frequently accessed data (snapshots, comments)
- Show loading indicators for operations >500ms
- Provide offline capability for viewing cached comparisons


## 6. Data Requirements

### Input Data
1. **RFQ Information:**
   - RFQ ID and number
   - Part number(s) and descriptions
   - Target specifications (T&C Requirements)
   - Volume profile (yearly quantities)
   - Project timeline and milestones
   - Buyer information

2. **Supplier Quotations:**
   - Supplier ID, name, and contact information
   - Pricing data (unit price, tooling cost, cost breakdown)
   - Quality metrics (certifications, defect rates, experience)
   - Logistics information (location, shipping, incoterms)
   - Lead times (7 milestones)
   - Technical specifications (material, cycle time, operations)
   - ESG data (ECOVADIS score, certifications, environmental metrics)
   - Submission timestamp and version

3. **Historical Data:**
   - Previous quotation snapshots
   - Price change history
   - Supplier performance records
   - Past RFQ outcomes
   - Audit trail

4. **User Data:**
   - User preferences (expanded categories, column visibility)
   - Comments and annotations
   - Anomaly dismissals
   - Custom scoring weights

### Data Validation Rules
1. **Pricing Data:**
   - Unit price must be positive number
   - Tooling cost must be non-negative
   - Cost breakdown must sum to unit price
   - Currency must be valid ISO code

2. **Quality Data:**
   - Defect rate must be in PPM (parts per million)
   - Certifications must have valid expiry dates
   - Quality scores must be 0-100 range

3. **Lead Time Data:**
   - All lead times must be positive numbers
   - Lead times must be in consistent units (weeks)
   - Milestone sequence must be logical (Sample A < Sample BCD < Prototype < etc.)

4. **ESG Data:**
   - ECOVADIS score must be 0-100
   - ECOVADIS level must match score range
   - Environmental metrics must have valid units

5. **General Validation:**
   - Required fields must not be empty
   - Dates must be valid and in correct format
   - Numeric fields must be within reasonable ranges
   - Text fields must not exceed maximum length

### Data Transformations
1. **Cost Calculations:**
   - Lifetime spend = Σ(yearly volume × unit price) + tooling cost
   - Yearly spend = yearly volume × unit price
   - Average per-piece cost = lifetime spend / total volume
   - Potential savings = max lifetime spend - min lifetime spend

2. **Scoring Calculations:**
   - Composite score = Σ(category score × category weight)
   - Category score = normalized metric values (0-100 scale)
   - Best value percentage = (value / max value) × 100

3. **Anomaly Detection:**
   - Price outlier = |price - median price| > threshold × median price
   - Specification deviation = supplier value ≠ target value
   - Lead time inconsistency = lead time > target × tolerance factor

4. **Data Normalization:**
   - Currency conversion to base currency (EUR)
   - Unit conversion (metric/imperial)
   - Date formatting (ISO 8601)
   - Text standardization (trim, lowercase for comparison)

### Data Storage
- Comparison state stored in browser local storage
- User preferences stored in user profile database
- Comments stored in comments database with RFQ association
- Snapshots stored in versioned quotation database
- Audit trail stored in immutable log database


## 7. Integration Points

### Internal System Integrations
1. **Screen 20 (Extraction Review):**
   - Receive validated quotation data
   - Navigate back for data corrections
   - Sync quotation updates in real-time

2. **Screen 23 (Comparison Board):**
   - Receive Excel workbook structure and data
   - Maintain consistency in data presentation
   - Share snapshot versions

3. **Screen 25 (Anomalies Dashboard):**
   - Send anomaly detection results
   - Receive anomaly resolution status
   - Sync dismissed anomalies

4. **Screen 26 (Decision Dashboard):**
   - Send comparison analysis results
   - Pass selected supplier recommendation
   - Transfer comments and notes

5. **Screen 27 (Lead Time Breakdown):**
   - Send lead time data for detailed analysis
   - Receive milestone dependency information
   - Sync critical path updates

6. **Screen 28 (Tooling Savings Display):**
   - Send tooling cost data
   - Receive savings calculations
   - Display optimization recommendations

7. **Screen 06 (Projects List):**
   - Update RFQ status (In Comparison)
   - Sync last modified timestamp
   - Store comparison progress

### External System Integrations
1. **ERP System:**
   - Fetch volume profile data
   - Retrieve target cost information
   - Update supplier master data

2. **PLM System:**
   - Retrieve part specifications
   - Fetch technical drawings
   - Sync engineering change orders

3. **Supplier Database:**
   - Fetch supplier profile information
   - Retrieve historical performance data
   - Update supplier ratings

4. **ECOVADIS API:**
   - Fetch current ESG scores
   - Retrieve certification status
   - Update sustainability metrics

5. **Currency Exchange API:**
   - Fetch current exchange rates
   - Convert prices to base currency
   - Update rates daily

6. **Email Service:**
   - Send comment notifications
   - Deliver export documents
   - Trigger workflow alerts

7. **Document Storage:**
   - Store export files
   - Retrieve historical snapshots
   - Archive comparison reports

### API Endpoints Required
1. **GET /api/rfq/{rfqId}/quotations** - Fetch all quotations for RFQ
2. **GET /api/rfq/{rfqId}/snapshots** - Retrieve quotation snapshots
3. **POST /api/rfq/{rfqId}/snapshots** - Create new snapshot
4. **GET /api/rfq/{rfqId}/comments** - Fetch all comments
5. **POST /api/rfq/{rfqId}/comments** - Add new comment
6. **PUT /api/rfq/{rfqId}/comments/{commentId}** - Update comment
7. **DELETE /api/rfq/{rfqId}/comments/{commentId}** - Delete comment
8. **GET /api/rfq/{rfqId}/anomalies** - Fetch detected anomalies
9. **POST /api/rfq/{rfqId}/anomalies/{anomalyId}/dismiss** - Dismiss anomaly
10. **GET /api/rfq/{rfqId}/tc-requirements** - Fetch T&C requirements
11. **POST /api/rfq/{rfqId}/export** - Generate export document
12. **GET /api/suppliers/{supplierId}/profile** - Fetch supplier details
13. **GET /api/exchange-rates** - Fetch current currency rates
14. **GET /api/user/preferences** - Fetch user preferences
15. **PUT /api/user/preferences** - Update user preferences

### Data Synchronization
- Real-time updates for comments (WebSocket connection)
- Periodic refresh of quotation data (every 5 minutes)
- On-demand refresh for snapshot switching
- Background sync for user preferences
- Optimistic updates for comment additions
- Conflict resolution for concurrent edits


## 8. Business Rules

### BR-24.1: Price Rejection Logic
- Automatically flag quotations with unit price >10% above target price
- Display rejected prices with red background and "REJECTED" badge
- Prevent selection of rejected suppliers without explicit override
- Require justification comment for override approval
- Track rejection overrides in audit trail

### BR-24.2: Best Value Determination
- Calculate composite score using weighted category scores
- Default category weights:
  - Pricing: 40%
  - Quality: 25%
  - Lead Time: 20%
  - ESG: 10%
  - Technical: 5%
- Normalize all metrics to 0-100 scale for scoring
- Apply tie-breaking rules: Pricing > Quality > Lead Time > ESG > Technical
- Mark supplier with highest composite score as "RECOMMENDED"
- Allow manual override of recommendation with justification

### BR-24.3: Anomaly Detection Rules
- **Price Anomalies:**
  - Flag if price deviates >15% from median of all quotations
  - Flag if price changed >10% between snapshots without explanation
  - Flag if cost breakdown doesn't sum to unit price (±1% tolerance)

- **Specification Anomalies:**
  - Flag if material grade differs from target specification
  - Flag if cycle time exceeds target by >20%
  - Flag if operations list missing critical steps

- **Lead Time Anomalies:**
  - Flag if any milestone exceeds target by >25%
  - Flag if milestone sequence is illogical (later milestone shorter than earlier)
  - Flag if SOP lead time insufficient for volume ramp-up

- **Quality Anomalies:**
  - Flag if defect rate exceeds target threshold
  - Flag if required certifications missing or expired
  - Flag if no experience with similar parts for complex components

- **ESG Anomalies:**
  - Flag if ECOVADIS score below minimum threshold
  - Flag if critical ESG certifications missing
  - Flag if environmental metrics significantly worse than industry average

### BR-24.4: Snapshot Management
- Auto-create snapshot at initial quotation submission
- Auto-create snapshot after each follow-up round
- Auto-create snapshot before major price negotiations
- Limit snapshot retention to 10 versions (archive older versions)
- Prevent deletion of initial snapshot
- Require admin approval for snapshot deletion
- Track snapshot creator and creation reason

### BR-24.5: Comment Permissions
- All team members can view comments
- Only comment author can edit/delete own comments within 24 hours
- Admins can delete any comment with audit trail entry
- @mentions trigger email notifications to mentioned users
- Comments cannot be edited after 24 hours (create new comment instead)
- Deleted comments show as "[Comment deleted by user]" with timestamp

### BR-24.6: Data Visibility Rules
- Buyers see all quotations for their assigned RFQs
- Suppliers see only their own quotations (not competitors)
- Managers see all quotations across all RFQs in their department
- Admins have full visibility across all RFQs
- Historical snapshots visible to all users with RFQ access
- Comments visible to all team members on the RFQ

### BR-24.7: Export Permissions
- All users can export comparison data for their assigned RFQs
- Excel and PDF exports include company branding
- CSV exports available for data analysis purposes
- PowerPoint exports restricted to managers and above
- Export logs tracked for audit purposes
- Sensitive pricing data redacted in external stakeholder exports

### BR-24.8: Navigation Rules
- Cannot proceed to Decision Dashboard if critical anomalies unresolved
- Cannot proceed if required comments/approvals missing
- Can navigate back to Extraction Review at any time
- Auto-save comparison state before navigation
- Warn user if leaving with unsaved comments
- Preserve comparison state for 7 days after last access

### BR-24.9: Multi-Part RFQ Rules
- Each part maintains independent comparison state
- Comments can be part-specific or RFQ-wide
- Anomalies tracked per part
- Best value determination per part
- Export can include all parts or selected parts only
- Decision can be made per part or for entire RFQ

### BR-24.10: Currency and Unit Handling
- All prices converted to base currency (EUR) for comparison
- Original currency displayed in tooltip
- Exchange rates updated daily at midnight UTC
- Unit conversions use standard conversion factors
- Metric/Imperial toggle available in settings
- Conversion factors displayed in tooltips


## 9. Edge Cases & Error Handling

### Edge Case 1: No Quotations Received
**Scenario:** RFQ has no supplier quotations submitted yet
**Handling:**
- Display empty state message: "No quotations received yet"
- Show "Back to Projects List" button
- Provide "Send Reminder" button to follow up with suppliers
- Hide comparison table and charts
- Show RFQ details and target specifications

### Edge Case 2: Single Quotation Only
**Scenario:** Only one supplier submitted a quotation
**Handling:**
- Display single supplier data in comparison format
- Show comparison against T&C Requirements only
- Disable best value highlighting (no comparison possible)
- Display message: "Only 1 quotation received. Consider requesting more quotes."
- Allow proceeding to Decision Dashboard with warning
- Suggest alternative suppliers from database

### Edge Case 3: Missing Critical Data
**Scenario:** Quotation missing required fields (price, lead time, etc.)
**Handling:**
- Display "N/A" or "Not Provided" in missing fields
- Flag incomplete quotations with warning badge
- Prevent best value calculation if pricing data missing
- Show "Request Missing Information" button
- Allow proceeding with acknowledgment of incomplete data
- Track missing data in anomalies section

### Edge Case 4: Extreme Price Outliers
**Scenario:** One quotation significantly higher/lower than others (>50% deviation)
**Handling:**
- Flag as critical anomaly with red alert
- Display warning message: "Extreme price deviation detected"
- Require investigation before proceeding
- Suggest contacting supplier for clarification
- Allow dismissal with mandatory justification comment
- Track outlier in audit trail

### Edge Case 5: All Prices Above Target
**Scenario:** All supplier quotations exceed target price by >10%
**Handling:**
- Display warning banner: "All quotations above target price"
- Highlight best available option (lowest price)
- Suggest negotiation or re-scoping
- Allow proceeding with manager approval
- Track decision rationale in comments
- Generate cost impact report

### Edge Case 6: Tied Best Values
**Scenario:** Multiple suppliers have identical best values for a metric
**Handling:**
- Highlight all tied suppliers with green background
- Apply tie-breaking rules (secondary metrics)
- Display "TIE" badge on tied values
- Show tie-breaker explanation in tooltip
- Allow manual selection among tied suppliers
- Document tie-breaker decision in comments

### Edge Case 7: Snapshot Data Inconsistency
**Scenario:** Snapshot data corrupted or incomplete
**Handling:**
- Display error message: "Snapshot data unavailable"
- Fall back to current version
- Log error for technical investigation
- Notify admin of data integrity issue
- Prevent snapshot deletion if it's the only version
- Offer data recovery from backup

### Edge Case 8: Currency Conversion Failure
**Scenario:** Exchange rate API unavailable or returns error
**Handling:**
- Use last known exchange rates with warning message
- Display "Exchange rates may be outdated" banner
- Show last update timestamp
- Allow manual exchange rate entry (admin only)
- Retry API call every 5 minutes
- Log conversion failures for monitoring

### Edge Case 9: Large Number of Suppliers
**Scenario:** More than 10 suppliers submitted quotations
**Handling:**
- Implement horizontal scrolling with scroll indicators
- Provide "Compare Selected" mode (choose 2-5 suppliers)
- Add supplier filtering options (by region, price range, etc.)
- Show summary statistics for all suppliers
- Allow exporting full comparison to Excel
- Suggest pre-screening to reduce supplier count

### Edge Case 10: Concurrent User Edits
**Scenario:** Multiple users editing comments simultaneously
**Handling:**
- Implement optimistic locking for comments
- Show "User X is typing..." indicator
- Detect conflicts on save attempt
- Display conflict resolution dialog
- Allow viewing both versions and choosing one
- Merge non-conflicting changes automatically
- Log all conflict resolutions

### Edge Case 11: Export Generation Failure
**Scenario:** Export process fails due to timeout or error
**Handling:**
- Display error message: "Export failed. Please try again."
- Offer retry with exponential backoff
- Provide alternative format options
- Log error details for debugging
- Send error notification to support team
- Allow partial export (e.g., current view only)

### Edge Case 12: Anomaly False Positives
**Scenario:** System flags valid data as anomaly
**Handling:**
- Provide "Dismiss Anomaly" button with reason selection
- Require justification comment for dismissal
- Track dismissed anomalies separately
- Allow re-opening dismissed anomalies
- Learn from dismissals to improve detection (future enhancement)
- Show dismissal history in audit trail

### Edge Case 13: Mobile Device Limitations
**Scenario:** Complex comparison table on small mobile screen
**Handling:**
- Switch to card-based layout automatically
- Show one supplier per card with swipe navigation
- Provide "Compare 2" mode for side-by-side view
- Simplify charts for mobile viewing
- Allow landscape orientation for better viewing
- Provide "View on Desktop" recommendation for complex analysis

### Edge Case 14: Slow Network Connection
**Scenario:** Data loading takes longer than expected
**Handling:**
- Display skeleton screens during loading
- Show progress indicator with percentage
- Implement progressive loading (critical data first)
- Cache previously loaded data
- Provide offline mode for cached comparisons
- Display "Slow connection detected" message
- Offer reduced data mode (fewer metrics)

### Edge Case 15: Browser Compatibility Issues
**Scenario:** User's browser doesn't support required features
**Handling:**
- Detect browser capabilities on page load
- Display compatibility warning for unsupported browsers
- Provide graceful degradation (simpler UI)
- Recommend modern browser upgrade
- Disable advanced features (animations, charts) if needed
- Ensure core functionality works on all browsers
- Log browser compatibility issues for analytics


## 10. Performance Requirements

### Response Time Requirements
- **Initial Page Load:** < 2 seconds for dashboard with up to 5 suppliers
- **Part Switching:** < 1.5 seconds to load new part data
- **Snapshot Switching:** < 1.5 seconds to load historical data
- **Category Expand/Collapse:** < 300ms animation duration
- **Comment Submission:** < 1 second to save and display
- **Chart Rendering:** < 1 second for cost visualizations
- **Export Generation:** < 10 seconds for Excel/PDF (up to 10 suppliers)
- **Search/Filter Operations:** < 500ms to update results
- **Auto-save:** < 2 seconds background operation

### Scalability Requirements
- **Supplier Count:** Support up to 20 suppliers per RFQ without performance degradation
- **Part Count:** Handle multi-part RFQs with up to 50 parts
- **Snapshot History:** Maintain 10 snapshots per RFQ with fast switching
- **Comment Volume:** Support up to 500 comments per RFQ
- **Concurrent Users:** Handle 50 simultaneous users viewing same RFQ
- **Data Volume:** Process comparison tables with up to 100 metrics per supplier
- **Export Size:** Generate exports up to 50MB without timeout

### Optimization Strategies
1. **Data Loading:**
   - Implement lazy loading for non-visible categories
   - Use pagination for large comment lists
   - Cache frequently accessed data (snapshots, supplier profiles)
   - Prefetch next likely navigation target (Decision Dashboard)

2. **Rendering Performance:**
   - Use virtual scrolling for large tables (>10 suppliers)
   - Implement debouncing for search/filter inputs (300ms)
   - Optimize chart rendering with canvas instead of SVG for large datasets
   - Use CSS transforms for animations (GPU acceleration)

3. **Network Optimization:**
   - Compress API responses (gzip)
   - Implement request batching for multiple API calls
   - Use WebSocket for real-time comment updates
   - Cache static assets (icons, images) with long TTL

4. **Memory Management:**
   - Limit snapshot retention in memory (keep 3 most recent)
   - Clean up event listeners on component unmount
   - Use object pooling for frequently created/destroyed objects
   - Implement garbage collection friendly data structures

### Performance Monitoring
- Track page load time with analytics
- Monitor API response times
- Log slow operations (>2 seconds)
- Alert on performance degradation (>20% slower than baseline)
- Collect user-perceived performance metrics (First Contentful Paint, Time to Interactive)
- Generate performance reports weekly


## 11. Security & Compliance Requirements

### Authentication & Authorization
- **User Authentication:** Require valid session token for all dashboard access
- **Role-Based Access Control (RBAC):**
  - Buyer: View assigned RFQs, add comments, export data
  - Manager: View all department RFQs, override decisions, manage snapshots
  - Admin: Full access, delete comments, configure system settings
  - Supplier: View only own quotations (no competitor data)
- **Session Management:** Auto-logout after 30 minutes of inactivity
- **Multi-Factor Authentication (MFA):** Required for admin actions (snapshot deletion, anomaly dismissal overrides)

### Data Security
- **Encryption in Transit:** All API calls use HTTPS/TLS 1.3
- **Encryption at Rest:** Sensitive data (pricing, comments) encrypted in database
- **Data Masking:** Redact competitor pricing in supplier view
- **Audit Logging:** Track all data access, modifications, and exports
- **Data Retention:** Comparison data retained for 7 years per compliance requirements
- **Secure Exports:** Password-protect exported Excel/PDF files containing sensitive data
- **API Security:** Implement rate limiting (100 requests/minute per user)

### Privacy & Compliance
- **GDPR Compliance:**
  - Allow users to request data deletion (right to be forgotten)
  - Provide data export in machine-readable format (right to data portability)
  - Display privacy notice on first access
  - Obtain consent for comment notifications
  - Anonymize user data in analytics

- **Data Minimization:** Collect only necessary data for comparison purposes
- **Purpose Limitation:** Use comparison data only for RFQ decision-making
- **Access Logging:** Log all access to sensitive pricing data
- **Data Breach Response:** Notify affected users within 72 hours of breach detection

### Input Validation & Sanitization
- **Comment Input:** Sanitize HTML/JavaScript to prevent XSS attacks
- **File Uploads:** Validate file types and scan for malware (if attachments supported)
- **SQL Injection Prevention:** Use parameterized queries for all database operations
- **CSRF Protection:** Implement CSRF tokens for all state-changing operations
- **Input Length Limits:** Enforce maximum lengths (comments: 500 chars, supplier names: 100 chars)

### Compliance Requirements
- **SOC 2 Type II:** Maintain security controls for data processing
- **ISO 27001:** Follow information security management standards
- **Export Control:** Comply with international trade regulations for cross-border data
- **Financial Regulations:** Maintain audit trail for pricing decisions (SOX compliance)
- **Industry Standards:** Follow automotive industry security standards (TISAX) if applicable

### Security Monitoring
- **Intrusion Detection:** Monitor for suspicious access patterns
- **Anomaly Detection:** Flag unusual data access or export volumes
- **Security Alerts:** Notify security team of potential threats
- **Vulnerability Scanning:** Regular security assessments and penetration testing
- **Incident Response:** Documented procedures for security incidents


## 12. Acceptance Criteria Summary

### Functional Acceptance Criteria (110 total)

#### Multi-Part RFQ Navigation (8 criteria)
- [ ] Part selector dropdown displays all parts in the RFQ
- [ ] Switching parts loads correct supplier quotations within 2 seconds
- [ ] Category expansion states persist across part switches
- [ ] Comment sidebar maintains active section when switching parts
- [ ] Keyboard navigation works for part selection
- [ ] Part count indicator shows correct position
- [ ] Loading states display during part data fetch
- [ ] Error handling for missing or incomplete part data

#### Snapshot/Versioning System (9 criteria)
- [ ] Snapshot selector shows all available versions with metadata
- [ ] Switching snapshots loads correct historical data within 2 seconds
- [ ] Price change indicators display accurate percentage differences
- [ ] New suppliers in later snapshots are clearly marked
- [ ] Snapshot comparison view highlights all changed fields
- [ ] Snapshot creation saves current state with user-defined name
- [ ] Auto-snapshots created at initial submission and after follow-ups
- [ ] Snapshot deletion requires confirmation and admin privileges
- [ ] Export generates comparison report in PDF/Excel format

#### Collapsible Category Sections (10 criteria)
- [ ] All six categories display with correct color themes and icons
- [ ] Clicking category header toggles expansion state
- [ ] Chevron icons update to reflect current state
- [ ] Default state shows only Pricing expanded
- [ ] Expansion preferences save and restore on page reload
- [ ] "Expand All" / "Collapse All" buttons work correctly
- [ ] Row count indicators show accurate metric counts
- [ ] Animations complete smoothly without performance issues
- [ ] Keyboard shortcuts function as specified
- [ ] Mobile view maintains full functionality

#### T&C Requirements Comparison (10 criteria)
- [ ] T&C Requirements column displays with amber styling
- [ ] All target values show correctly formatted data
- [ ] Comparison operators display appropriately (≤, ≥, =, etc.)
- [ ] Green checkmarks appear when suppliers meet targets
- [ ] Red warnings flag values below targets
- [ ] Column remains fixed when scrolling horizontally
- [ ] Tooltips provide detailed target context
- [ ] Unit conversions work for metric/imperial systems
- [ ] "N/A" displays for metrics without targets
- [ ] Column width adjusts to content without truncation

#### Pricing Category (10 criteria)
- [ ] All pricing metrics display with correct calculations
- [ ] Lowest unit price highlighted with green background
- [ ] Prices >10% above target flagged as rejected with red background
- [ ] Lifetime spend calculations accurate based on volume profile
- [ ] Cost breakdowns sum to total unit price
- [ ] Currency conversions use current exchange rates
- [ ] Price trend arrows show correct direction and percentage
- [ ] TCO calculations include all cost components
- [ ] Payment terms display clearly
- [ ] Volume discounts show tier breakpoints and savings

#### Quality Category (11 criteria)
- [ ] All quality metrics display with correct data
- [ ] Certification badges show with appropriate icons
- [ ] Best defect rate highlighted with green background
- [ ] Experience indicators use checkmark/text appropriately
- [ ] Multiple certifications display as organized badge list
- [ ] Expiry warnings show for certifications within 90 days of expiration
- [ ] Quality scores calculate correctly with visible formula
- [ ] Audit history displays chronologically
- [ ] Customer ratings show with star visualization
- [ ] Return rate statistics display with trend indicators
- [ ] Documentation attachments accessible via download links

#### Logistics Category (10 criteria)
- [ ] All logistics metrics display with complete information
- [ ] Supplier locations show country and city clearly
- [ ] Shipping methods display with appropriate icons
- [ ] Incoterms show with standard abbreviations and tooltips
- [ ] Distance calculations accurate within 5%
- [ ] Transit time estimates based on historical data
- [ ] Shipping costs integrate into total cost calculations
- [ ] Preferred locations highlighted with visual indicator
- [ ] Packaging specs display with dimensions and weight
- [ ] Multiple delivery locations supported in data model

#### Lead Time Category (12 criteria)
- [ ] All seven milestones display with correct lead times
- [ ] Calendar icons appear next to each lead time value
- [ ] Shortest SOP highlighted with green background and icon
- [ ] Cumulative timeline shows accurate milestone sequence
- [ ] Critical path identifies longest dependency chain
- [ ] Target comparisons flag exceeded lead times
- [ ] Total time-to-production calculates correctly
- [ ] Milestone dependencies display logically
- [ ] Lead time breakdowns sum to total milestone time
- [ ] Buffer recommendations based on historical data
- [ ] Snapshot comparisons show lead time changes
- [ ] Confidence levels display with appropriate indicators

#### Technical Specifications (11 criteria)
- [ ] All technical metrics display with correct specifications
- [ ] Material grade anomalies highlighted with yellow background
- [ ] Anomaly badges appear for specification deviations
- [ ] Cycle times show in consistent units (seconds)
- [ ] Operations list displays clearly without truncation
- [ ] Cpk values show with color coding (green ≥1.33, yellow 1.0-1.33, red <1.0)
- [ ] Tooling specs display with complete details
- [ ] Manufacturing technology shows equipment type and model
- [ ] Capacity data displays with utilization percentages
- [ ] Technical documents accessible via download links
- [ ] Drawing comparisons highlight specification matches/mismatches

#### ESG/Sustainability (11 criteria)
- [ ] ECOVADIS scores display with correct values and levels
- [ ] Level badges show with appropriate color coding
- [ ] Internal assessment scores display on 0-100 scale
- [ ] Target comparisons show clearly (≥ symbol with target value)
- [ ] Certification badges display with icons and expiry dates
- [ ] Environmental metrics show with correct units
- [ ] Trend indicators display direction (up/down/stable)
- [ ] ESG composite score calculates with visible formula
- [ ] Social and governance metrics display in organized sections
- [ ] ESG documents accessible via download links
- [ ] Historical trends show improvement or decline over time

#### Cost Visualization (13 criteria)
- [ ] View toggle buttons switch between lifetime and yearly views
- [ ] Lifetime view displays vertical bars with correct heights
- [ ] Color coding applies correctly (green=lowest, red=highest, blue=others)
- [ ] Value labels and percentages display accurately
- [ ] Badges appear on appropriate suppliers
- [ ] Hover tooltips show complete information
- [ ] Per-year view groups bars correctly by year
- [ ] Volume profile card displays accurate yearly volumes
- [ ] Supplier colors remain consistent across all years
- [ ] Legend matches bar colors correctly
- [ ] Yearly breakdown table calculates totals accurately
- [ ] Grid lines and axis labels display clearly
- [ ] Charts responsive to window resizing

#### Summary Statistics (10 criteria)
- [ ] All three cards display in responsive grid layout
- [ ] Lowest spend card shows correct minimum value and supplier
- [ ] Highest spend card shows correct maximum value and supplier
- [ ] Potential savings calculates as (max - min)
- [ ] Percentage reduction calculates as ((max - min) / max) × 100
- [ ] Per-piece averages calculate as (lifetime spend / 210,000)
- [ ] Icons display correctly (trending down, trending up, dollar sign)
- [ ] Color themes apply consistently
- [ ] Cards responsive on mobile (stack vertically)
- [ ] Font sizes scale appropriately (2xl for main values)

#### Anomalies Alert (9 criteria)
- [ ] Anomalies card displays with yellow theme
- [ ] All suppliers with anomalies listed in card
- [ ] Anomaly descriptions clear and actionable
- [ ] "View Details" button navigates to Screen 25
- [ ] Card hidden when no anomalies present
- [ ] Severity indicators display with appropriate colors
- [ ] Anomaly count badge shows correct number
- [ ] Dismiss functionality requires confirmation
- [ ] Dismissed anomalies marked but remain accessible
- [ ] Resolution status tracked and displayed

#### Supplier Comments Sidebar (13 criteria)
- [ ] Sidebar toggles open/close smoothly
- [ ] Comment count badges display accurate counts per category
- [ ] Clicking badge opens sidebar to correct section
- [ ] All comment metadata displays correctly
- [ ] Add comment form validates input (non-empty, max length)
- [ ] Comments save and display immediately
- [ ] Edit/Delete buttons visible only to comment authors
- [ ] @mentions trigger notifications to mentioned users
- [ ] Unread indicators display for new comments
- [ ] Supplier filter works correctly
- [ ] Sort options change comment order
- [ ] Export generates formatted document with all comments
- [ ] Email notifications sent when enabled

#### Best Value Highlighting (10 criteria)
- [ ] Best values highlighted with green background across all metrics
- [ ] Bold text applied to highlighted values
- [ ] Visual indicator icons display next to best values
- [ ] Ties handled appropriately (both highlighted or tie-breaker applied)
- [ ] "BEST" badge appears on overall recommended supplier
- [ ] Composite score calculates correctly with visible formula
- [ ] Category weights configurable in settings
- [ ] Scoring methodology tooltip provides clear explanation
- [ ] Manual overrides save and persist
- [ ] Best value summary card shows key highlights

#### Navigation and Actions (10 criteria)
- [ ] All navigation buttons display in correct positions
- [ ] Button styles match design system (outline vs primary)
- [ ] Navigation targets correct screens
- [ ] "Proceed" button disables when anomalies unresolved
- [ ] Disabled button tooltip explains blocking reason
- [ ] Confirmation dialog appears for unsaved changes
- [ ] Keyboard shortcuts work as specified
- [ ] Progress indicator shows correct step
- [ ] Breadcrumbs display full navigation path
- [ ] Auto-save completes before navigation

#### Responsive Table Design (14 criteria)
- [ ] Horizontal scrolling works smoothly with many suppliers
- [ ] Metric name column remains fixed when scrolling horizontally
- [ ] T&C Requirements column stays fixed after metric names
- [ ] Zebra striping alternates row colors correctly
- [ ] Hover effects apply to entire row
- [ ] Column resizing works with drag interaction
- [ ] Column visibility toggles show/hide suppliers correctly
- [ ] Responsive layouts adapt at specified breakpoints
- [ ] Mobile card layout displays all information clearly
- [ ] Table header remains visible when scrolling down
- [ ] Scroll shadows appear at table edges
- [ ] Pinned columns stay fixed in position
- [ ] "Compare Selected" mode filters to chosen suppliers
- [ ] Excel export maintains colors, formatting, and structure

#### Data Export (12 criteria)
- [ ] Export dropdown displays all format options
- [ ] Excel export creates multi-sheet workbook with correct structure
- [ ] PDF export includes all specified sections with formatting
- [ ] CSV export contains complete data in flat structure
- [ ] PowerPoint export creates presentation with all slides
- [ ] Export options filter data correctly
- [ ] Progress indicator shows during export generation
- [ ] Filenames include RFQ number and timestamp
- [ ] All exports download successfully
- [ ] Email functionality sends exports to specified recipients
- [ ] Exported data matches dashboard display exactly
- [ ] Charts and visualizations render correctly in exports


### Flexibility Acceptance Criteria (10 total)
- [ ] Category weights adjustable in settings (Pricing, Quality, Lead Time, ESG, Technical)
- [ ] Best value criteria customizable per metric type
- [ ] Anomaly detection thresholds configurable (price deviation %, lead time tolerance)
- [ ] Default expanded categories configurable per user
- [ ] Column visibility preferences save and restore correctly
- [ ] Cost visualization default view (lifetime vs yearly) configurable
- [ ] Currency and measurement units selectable in settings
- [ ] Snapshot auto-creation toggle works (enable/disable at milestones)
- [ ] Comment notification preferences save correctly
- [ ] Export templates customizable (branding, format, sections)

### User Experience Acceptance Criteria (20 total)
- [ ] Visual hierarchy clear with consistent color coding across categories
- [ ] T&C Requirements column visually distinct from supplier columns
- [ ] Loading states display for all async operations (skeleton screens/spinners)
- [ ] Success/error messages appear for comment submissions
- [ ] Category expand/collapse animations smooth (300ms duration)
- [ ] Hover tooltips display for complex metrics and abbreviations
- [ ] Active section highlighted in comments sidebar
- [ ] Progress indicators show for export operations
- [ ] Confirmation dialogs appear for destructive actions
- [ ] Breadcrumb navigation shows current workflow position
- [ ] Progress indicator displays step number (e.g., "Step 3 of 5")
- [ ] Quick links to related screens accessible
- [ ] Scroll position indicators visible for long tables
- [ ] Data visualization (charts) aids comprehension
- [ ] Summary statistics prominently displayed
- [ ] Key insights highlighted (best values, anomalies, recommendations)
- [ ] Responsive layout adapts to desktop, tablet, mobile
- [ ] Touch targets minimum 44x44px on mobile
- [ ] Swipe gestures work for mobile navigation
- [ ] Charts remain readable when scaled down

### Performance Acceptance Criteria (10 total)
- [ ] Initial page load completes in < 2 seconds (up to 5 suppliers)
- [ ] Part switching loads new data in < 1.5 seconds
- [ ] Snapshot switching loads historical data in < 1.5 seconds
- [ ] Category expand/collapse animation completes in < 300ms
- [ ] Comment submission saves in < 1 second
- [ ] Chart rendering completes in < 1 second
- [ ] Export generation completes in < 10 seconds (Excel/PDF, up to 10 suppliers)
- [ ] Search/filter operations update in < 500ms
- [ ] Auto-save completes in < 2 seconds (background)
- [ ] System supports up to 20 suppliers without performance degradation

### Accessibility Acceptance Criteria (15 total)
- [ ] All interactive elements accessible via keyboard navigation
- [ ] Keyboard shortcuts work for common actions (Alt+Left, Alt+A, Alt+Right)
- [ ] Color contrast meets WCAG AA standards (minimum 4.5:1)
- [ ] Text alternatives provided for visual indicators (icons, badges)
- [ ] Screen readers announce content correctly with ARIA labels
- [ ] Font size adjustable without breaking layout
- [ ] Focus indicators visible for keyboard navigation
- [ ] Form inputs have associated labels
- [ ] Tab order logical and intuitive
- [ ] Skip links available for main content areas
- [ ] Error messages announced to screen readers
- [ ] Status updates (loading, success) announced to assistive technologies
- [ ] Tables have proper header associations (scope attributes)
- [ ] Charts have text descriptions for screen readers
- [ ] Color not sole means of conveying information (icons + color)

### Security Acceptance Criteria (15 total)
- [ ] User authentication required for dashboard access
- [ ] Role-based access control enforced (Buyer, Manager, Admin, Supplier)
- [ ] Session auto-logout after 30 minutes of inactivity
- [ ] MFA required for admin actions (snapshot deletion, overrides)
- [ ] All API calls use HTTPS/TLS 1.3
- [ ] Sensitive data encrypted at rest in database
- [ ] Competitor pricing masked in supplier view
- [ ] All data access and modifications logged in audit trail
- [ ] Exported files password-protected when containing sensitive data
- [ ] API rate limiting enforced (100 requests/minute per user)
- [ ] Comment input sanitized to prevent XSS attacks
- [ ] CSRF tokens implemented for state-changing operations
- [ ] Input length limits enforced (comments: 500 chars)
- [ ] SQL injection prevention via parameterized queries
- [ ] Security monitoring alerts for suspicious access patterns

---

## Total Acceptance Criteria: 180
- **Functional:** 110
- **Flexibility:** 10
- **User Experience:** 20
- **Performance:** 10
- **Accessibility:** 15
- **Security:** 15

---

## Document Metadata
- **Screen Number:** 24
- **Screen Name:** Comparison Dashboard
- **Phase:** 4 (Analysis & Comparison)
- **Priority:** P0 (Critical)
- **Estimated Complexity:** High
- **Dependencies:** Screens 20, 23, 25, 26, 27, 28
- **Document Version:** 1.0
- **Last Updated:** 2026-01-02
- **Author:** Product Requirements Team
- **Approvers:** Product Manager, Engineering Lead, UX Lead

