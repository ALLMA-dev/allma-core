# Screen 26: Decision Dashboard

## 1. Screen Overview

### Purpose
The Decision Dashboard is the final decision-making screen where buyers review all analysis, obtain required approvals, document their sourcing decision, and initiate supplier communication (nomination letters and rejection notifications). It consolidates all RFQ information into a comprehensive decision support interface with approval governance workflows.

### User Story Reference
- **Primary:** US-B-023 (Make Final Supplier Selection)
- **Supporting:** US-B-024 (Obtain Approvals), US-B-025 (Document Decision), US-B-026 (Send Nomination Letter), US-B-027 (Send Rejection Notifications)

### Position in User Flow
- **Entry Points:** 
  - From Screen 24 (Comparison Dashboard) after completing analysis
  - From Screen 25 (Anomalies Dashboard) after resolving issues
  - From Screen 06 (Projects List) for existing RFQ review
- **Exit Points:**
  - To Screen 22 (Rejection Notifications) to send rejection letters
  - To supplier nomination workflow (external)
  - To project archive (RFQ complete)

### Key Interactions
- Multi-part RFQ navigation with part selector
- Snapshot/versioning system for tracking decision evolution
- Decision checklist with automated validation
- Multi-level approval governance workflow
- Decision documentation with rationale
- Tooling savings display integration
- Supplier feedback summary aggregation
- Scenario analysis for risk assessment
- Export and sharing capabilities
- Final action buttons (nomination letter, rejection letters)

## 2. User Goals & Success Criteria

### Primary User Goals
1. **Review Decision:** Validate all factors before final selection
2. **Obtain Approvals:** Secure required sign-offs based on cost thresholds
3. **Document Rationale:** Record decision reasoning for audit trail
4. **Assess Risk:** Understand potential risks and mitigation strategies
5. **Communicate Decision:** Send nomination letter to winner and rejections to others
6. **Complete RFQ:** Archive project and close out sourcing cycle

### Success Metrics
- Time to complete decision: < 15 minutes after comparison
- Approval cycle time: < 24 hours for standard RFQs
- Decision documentation completeness: 100%
- Nomination letter send rate: > 95% within 48 hours of decision
- Rejection letter send rate: > 90% within 48 hours of decision
- User confidence in decision: > 95% (survey-based)


## 3. Functional Requirements

### FR-26.1: Success Banner
**Priority:** P0 (Critical)
- Display prominent green success banner at top of page
- Show "RFQ Complete - Decision Ready!" message
- Display three key metrics cards:
  - Time saved vs. manual (e.g., "12 hours")
  - Extraction accuracy percentage (e.g., "94%")
  - Cost issues flagged count (e.g., "3")
- Green theme with checkmark icon
- Responsive layout (stack cards on mobile)

### FR-26.2: Decision Checklist
**Priority:** P0 (Critical)
- Display automated checklist with 6 key decision factors:
  1. Cost Analysis (lowest total cost identified)
  2. Anomaly Review (all anomalies reviewed)
  3. Capacity Check (supplier can handle volume)
  4. Lead Time (acceptable for project timeline)
  5. Quality (no red flags detected)
  6. Risk Assessment (overall risk level)
- Each item shows green checkmark when validated
- Display specific details for each factor
- Auto-validate based on comparison data
- Manual override capability for buyer judgment

### FR-26.3: Approval Governance Workflow
**Priority:** P0 (Critical)
- Display multi-level approval hierarchy based on total cost
- Five approval levels with thresholds:
  1. Commodity Buyer: All amounts (always required)
  2. Purchasing Manager: > €50,000
  3. Purchasing Director: > €100,000
  4. VP Purchasing: > €500,000
  5. GM: > €1,000,000
- Show approval status for each level:
  - **Approved:** Green theme, checkmark icon, approver name, date, comment
  - **Pending:** Yellow theme, clock icon, awaiting approver name, "Request Approval" button
  - **Not Required:** Gray theme, "N/A" badge, threshold not met
- Calculate required approvals based on total RFQ cost
- Track approval progress (X of Y completed)
- Display additional approvers section (Project Manager, PMD, Sales, Plant Manager)
- Show approval status summary with blocking message
- Block nomination letter until all required approvals obtained

### FR-26.4: Decision Documentation
**Priority:** P0 (Critical)
- Display recommended supplier card with:
  - Supplier name and contact
  - Key advantages (lowest cost, no anomalies, capacity, lead time)
  - Cost breakdown (material, process, tooling, logistics, total)
- Show decision rationale section with:
  - Why this supplier was selected
  - Key differentiators
  - Risk mitigation factors
- Display next steps checklist:
  1. Obtain required approvals
  2. Send nomination letter
  3. Notify other suppliers
  4. Initiate contract negotiation
  5. Schedule kick-off meeting
- Auto-generate decision summary from comparison data
- Allow manual editing of rationale
- Save decision documentation to database
- Include in export reports

### FR-26.5: Tooling Savings Display Integration
**Priority:** P1 (High)
- Embed ToolingSavingsDisplay component
- Calculate savings for selected supplier vs. alternatives
- Show savings vs. average and vs. best
- Display tooling cost comparison chart
- Highlight cost advantages in decision rationale

### FR-26.6: Supplier Feedback Summary
**Priority:** P1 (High)
- Aggregate all comments from comparison process
- Group comments by supplier
- Display comment count badge per supplier
- Show each comment with:
  - Category badge (pricing, technical, logistics, general)
  - Timestamp
  - Comment text
  - Buyer notes (if any)
- Color-code categories (blue=pricing, purple=technical, green=logistics, gray=general)
- Include traceability note at bottom

### FR-26.7: Scenario Analysis
**Priority:** P1 (High)
- Display "what-if" scenarios for risk assessment:
  - Volume increase scenario (e.g., 100K pcs/year)
  - Tooling amortization variations (2-year vs. 3-year)
  - Lead time compression scenarios
- Show impact on supplier selection for each scenario
- Highlight capacity constraints
- Indicate if recommendation changes under scenarios
- Provide backup supplier suggestions

### FR-26.8: Other Suppliers Summary
**Priority:** P1 (High)
- Display non-selected suppliers in ranked order
- Show for each:
  - Supplier name
  - Total cost badge
  - Brief reason for non-selection
- Use color coding:
  - Gray: Standard non-selected
  - Red: Issues or concerns
- Provide quick comparison to recommended supplier

### FR-26.9: Export and Sharing
**Priority:** P1 (High)
- Provide four export options:
  1. Save Decision (PDF) - Complete decision document
  2. Share with Team - Email to stakeholders
  3. Download Excel - Data export for analysis
  4. Archive Project - Move to completed projects
- Generate PDF with:
  - Decision summary
  - Recommended supplier details
  - Approval signatures
  - Cost comparison
  - Risk assessment
  - Next steps
- Email sharing includes decision summary and PDF attachment
- Excel export includes all comparison data
- Archive moves RFQ to completed status

### FR-26.10: Risk Assessment
**Priority:** P1 (High)
- Display risk level for each supplier
- Show risk score as percentage bar
- Color-code risk levels:
  - Green: Low risk (0-30%)
  - Yellow: Medium risk (31-60%)
  - Red: High risk (61-100%)
- Provide risk explanation for each supplier
- Calculate risk based on:
  - Anomalies detected
  - Quality concerns
  - Capacity constraints
  - Lead time issues
  - Cost outliers

### FR-26.11: Final Action Buttons
**Priority:** P0 (Critical)
- Display action banner at bottom with three buttons:
  1. "Review Again" - Return to comparison dashboard
  2. "Send Rejection Letters" - Navigate to Screen 22
  3. "Send Nomination Letter" - Initiate winner notification
- Disable "Send Rejection Letters" and "Send Nomination Letter" until all required approvals obtained
- Show blocking message when approvals pending
- Display approval progress (X of Y completed)
- Show pending approvers list
- Provide tip to use "Request Approval" buttons
- Enable buttons when all approvals complete

### FR-26.12: Journey Complete Banner
**Priority:** P2 (Low)
- Display celebratory banner showing:
  - "Sarah's Journey Complete!" message
  - Time saved metric (e.g., "~60 minutes instead of 10-15 hours")
  - Three key achievements:
    - Time saved percentage (e.g., "89%")
    - Suppliers evaluated (e.g., "4/4")
    - Annual savings (e.g., "€5K")
- Gradient background (blue to green)
- Large checkmark icon
- Center-aligned layout

### FR-26.13: Snapshot/Versioning System
**Priority:** P1 (High)
- Track decision evolution through snapshots
- Show five change types:
  - Ranking Changed
  - Recommendation Changed
  - Supplier Added
  - Supplier Removed
  - Score Updated
- Display snapshot metadata and change details
- Auto-create snapshots at key events
- Allow snapshot comparison

### FR-26.14: Multi-Part RFQ Navigation
**Priority:** P1 (High)
- Part selector dropdown in header
- Filter decision by part number
- Preserve decision states across parts
- Load part-specific data
- Show part count indicator

## 4. User Experience Requirements

### UX-26.1: Visual Hierarchy
- Use green theme for success and completion
- Apply blue theme for primary actions
- Use yellow theme for pending approvals
- Highlight recommended supplier prominently
- Clear section separation with cards

### UX-26.2: Interaction Feedback
- Immediate visual feedback for all actions
- Loading states for data fetching
- Success messages for approvals
- Confirmation dialogs for final actions
- Hover effects on interactive elements

### UX-26.3: Navigation and Wayfinding
- Breadcrumb navigation
- Progress indicator
- Clear "Back" and "Next" buttons
- Quick links to related screens

### UX-26.4: Error Prevention
- Disable buttons until prerequisites met
- Show clear blocking messages
- Require confirmation for final actions
- Auto-save decision documentation

## 5. Data Requirements

### Input Data
- Comparison analysis results
- Supplier quotations and rankings
- Anomaly resolution status
- Comments and feedback
- Approval workflow configuration
- Total RFQ cost

### Data Validation
- All required approvals obtained
- Decision rationale documented
- Recommended supplier selected
- Risk assessment completed

### Data Transformations
- Calculate approval requirements based on cost
- Aggregate comments by supplier
- Generate decision summary
- Calculate risk scores

## 6. Integration Points

### Internal Systems
- Screen 24 (Comparison Dashboard)
- Screen 25 (Anomalies Dashboard)
- Screen 22 (Rejection Notifications)
- ToolingSavingsDisplay component

### External Systems
- Approval workflow system
- Email service for notifications
- Document generation service
- Project archive system

## 7. Business Rules

### BR-26.1: Approval Thresholds
- Commodity Buyer: Always required
- Purchasing Manager: Required if cost > €50,000
- Purchasing Director: Required if cost > €100,000
- VP Purchasing: Required if cost > €500,000
- GM: Required if cost > €1,000,000

### BR-26.2: Navigation Blocking
- Block nomination letter until all required approvals obtained
- Block rejection letters until all required approvals obtained
- Allow "Review Again" at any time

### BR-26.3: Decision Documentation
- Decision rationale required before sending nomination
- All checklist items must be validated
- Risk assessment must be completed
- Approval comments optional but recommended

## 8. Acceptance Criteria Summary

### Functional Acceptance Criteria (80 total)
- [ ] Success banner displays with correct metrics
- [ ] Decision checklist shows all 6 factors with validation
- [ ] Approval governance displays all 5 levels correctly
- [ ] Approval status updates in real-time
- [ ] Required approvals calculated based on total cost
- [ ] "Request Approval" buttons functional
- [ ] Decision documentation auto-generated from comparison
- [ ] Recommended supplier card shows complete information
- [ ] Cost breakdown displays correctly
- [ ] Next steps checklist shows all 5 steps
- [ ] Tooling savings display integrated
- [ ] Supplier feedback summary aggregates all comments
- [ ] Comments grouped by supplier with correct counts
- [ ] Category badges color-coded correctly
- [ ] Scenario analysis displays what-if scenarios
- [ ] Volume increase scenario shows capacity constraints
- [ ] Tooling amortization scenarios calculate correctly
- [ ] Other suppliers summary shows ranked list
- [ ] Export options all functional (PDF, Email, Excel, Archive)
- [ ] PDF export includes all required sections
- [ ] Risk assessment displays for all suppliers
- [ ] Risk scores calculate correctly
- [ ] Risk levels color-coded (green/yellow/red)
- [ ] Final action buttons display correctly
- [ ] Buttons disabled until approvals complete
- [ ] Blocking message shows when approvals pending
- [ ] Buttons enable when all approvals obtained
- [ ] "Send Nomination Letter" initiates winner notification
- [ ] "Send Rejection Letters" navigates to Screen 22
- [ ] Journey complete banner displays
- [ ] Time saved metric calculates correctly
- [ ] Snapshot selector displays decision history
- [ ] Part selector filters by part number
- [ ] All data persists across navigation

### User Experience Acceptance Criteria (15 total)
- [ ] Visual hierarchy clear with color themes
- [ ] Success elements use green theme
- [ ] Pending elements use yellow theme
- [ ] Primary actions use blue theme
- [ ] Loading states display for async operations
- [ ] Success messages appear for approvals
- [ ] Confirmation dialogs for final actions
- [ ] Hover effects on interactive elements
- [ ] Breadcrumb navigation shows position
- [ ] Progress indicator displays step
- [ ] Clear blocking messages when prerequisites not met
- [ ] Auto-save prevents data loss
- [ ] Responsive layout on all devices
- [ ] Touch targets minimum 44x44px on mobile
- [ ] Error messages clear with recovery suggestions

### Performance Acceptance Criteria (5 total)
- [ ] Initial page load < 2 seconds
- [ ] Approval status updates < 500ms
- [ ] Export generation < 10 seconds
- [ ] Snapshot switching < 2 seconds
- [ ] Part switching < 1.5 seconds

---

## Total Acceptance Criteria: 100
- **Functional:** 80
- **User Experience:** 15
- **Performance:** 5

---

## Document Metadata
- **Screen Number:** 26
- **Screen Name:** Decision Dashboard
- **Phase:** 4 (Analysis & Comparison)
- **Priority:** P0 (Critical)
- **Estimated Complexity:** High
- **Dependencies:** Screens 22, 24, 25, ToolingSavingsDisplay
- **Document Version:** 1.0
- **Last Updated:** 2026-01-02
- **Author:** Product Requirements Team

