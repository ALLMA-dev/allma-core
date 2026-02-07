# User Stories for MVP Persona: Raj Patel - Supplier Contact

**Document Version:** 2.0  
**Date:** January 2, 2026  
**Based on:** MVP Product Requirements Document v3.0 + Mebarek Feedback Analysis (Jan 2, 2026)

---

## Overview

This document contains user stories for **Raj Patel**, a Supplier Contact, for the **MVP scope** of Optiroq. The MVP focuses on minimal supplier interaction: receiving RFQs, sending quotations in own format, and responding to follow-ups, with enhanced requirements for multi-part RFQs, detailed logistics, tooling transparency, lead time milestones, and ESG information.

**MVP Scope:** Supplier receives RFQ (multi-part) → prepares quote in own format → sends via email → responds to follow-ups → provides enhanced logistics, tooling amortization, lead times, ESG data

**Persona Summary:**
- **Role:** Supplier Sales/Quotation Manager
- **Experience:** 8 years in supplier sales
- **MVP Goals:** Respond to RFQs quickly, use existing formats, minimize back-and-forth, provide complete information upfront
- **Main Pain Points:** Format requirements, missing information follow-ups, unclear requirements, multiple reminder emails

**Key MVP Enhancements (Jan 2, 2026 - Mebarek Feedback):**
- ✅ **Multi-part RFQ support**: Quote multiple parts with individual and package pricing
- ✅ **Enhanced logistics requirements**: Carton type, Euro Pallet, Returnable Packaging, Cleaning
- ✅ **Tooling amortization transparency**: Explicit breakdown required (not embedded in piece price)
- ✅ **Lead time milestones**: Provide lead times for 7 development milestones
- ✅ **ESG/Sustainability data**: ECOVADIS score, certifications
- ✅ **Negotiation rounds**: Submit updated quotes with price improvements
- ✅ **Automated reminders**: Receive reminders if no response after 3/5/7 days

---

## Epic 1: Receiving RFQs

### US-MVP-S01: Receive Clear RFQ Email

**As** Raj (Supplier Contact)  
**I want to** receive RFQ emails with clear requirements and checklist  
**So that** I know exactly what information to provide

**Acceptance Criteria:**
- I receive RFQ email from buyer with:
  - Clear subject line: "RFQ [Project-123] - Aluminum Bracket"
  - Part numbers and specifications
  - Annual volume
  - Material requirements
  - Comprehensive requirements checklist:
    ✓ Material costs (raw material type, cost/kg, gross/net weight, scrap)
    ✓ Process costs (operations, cycle time, labor, overhead)
    ✓ Tooling costs (investment, amortization, shots, maintenance)
    ✓ Logistics (packaging, transportation, IncoTerms)
    ✓ Terms (payment terms, currency, lead time)
    ✓ Capacity confirmation (equipment, shifts, annual capacity)
  - Deadline date
  - Attachments (BOM, drawings, specs)
- Requirements are clear and comprehensive
- I understand what's expected

**Priority:** P0 (Must Have)  
**Related Features:** Feature 0 (RFQ Initiation Plugin)  
**Development Effort:** Included in plugin development

---

### US-MVP-S02: Access AI Chat for Questions (Optional)

**As** Raj  
**I want to** optionally access an AI chat to ask questions about RFQ requirements  
**So that** I can clarify requirements without emailing buyer

**Acceptance Criteria:**
- RFQ email includes link to AI chat (optional)
- I can click link and ask questions like:
  - "What material grade is required?"
  - "What's the tolerance for cycle time?"
  - "Is tooling cost required separately?"
- AI has full RFQ context (requirements, specifications)
- AI provides clear, helpful answers
- This reduces back-and-forth emails with buyer

**Priority:** P2 (Nice to Have - Optional)  
**Related Features:** Optional: Supplier Guidance (AI Chat Link)  
**Development Effort:** 2 days

---

## Epic 2: Preparing Quotations

### US-MVP-S03: Use My Own Quotation Format

**As** Raj  
**I want to** prepare quotations in my company's existing format  
**So that** I don't have to learn new templates or systems

**Acceptance Criteria:**
- I can use my company's existing quotation format:
  - Excel template (preferred)
  - PDF export from ERP
  - CSV export
  - Google Sheets
- I don't need to fill buyer's specific template
- I don't need to log into any new system
- I can use the same format I use for all customers
- This saves me 30-60 minutes per RFQ

**Priority:** P0 (Must Have)  
**Related Features:** Feature 2 (File Format Conversion), Feature 3 (Modular LLM Extraction)  
**Development Effort:** N/A (supplier uses own format)

---

### US-MVP-S04: Include All Required Information

**As** Raj  
**I want to** ensure I include all required information in my quotation  
**So that** I avoid follow-up requests from buyer

**Acceptance Criteria:**
- I review requirements checklist from RFQ email
- I ensure my quotation includes:
  - Material costs (all fields)
  - Process costs (all fields)
  - **Tooling costs (listed separately, not embedded in process costs)**
  - Logistics (all fields)
  - Terms (all fields)
  - Capacity confirmation
- I double-check before sending
- This reduces follow-up requests

**Priority:** P0 (Must Have)  
**Related Features:** Feature 4 (Completeness Check & Follow-up Loop)  
**Development Effort:** N/A (supplier responsibility)

---

## Epic 3: Sending Quotations

### US-MVP-S05: Send Quotation via Email

**As** Raj  
**I want to** send quotation via email reply  
**So that** I use familiar communication channel

**Acceptance Criteria:**
- I reply to RFQ email (reply-all)
- I attach my quotation file (Excel, PDF, CSV)
- I ensure rfq-agent@[customer-domain].optiroq.com is CC'd (reply-all does this automatically)
- I include brief message: "Please find attached our quotation for Project-123"
- Email is sent within seconds
- No special software or login required

**Priority:** P0 (Must Have)  
**Related Features:** Feature 1 (Email Quote Intake)  
**Development Effort:** N/A (standard email)

---

### US-MVP-S06: Receive Confirmation of Receipt

**As** Raj  
**I want to** receive confirmation that my quotation was received and is being processed  
**So that** I know it didn't get lost

**Acceptance Criteria:**
- I receive auto-reply email within 5 minutes:
  "Thank you for your quotation for Project-123. We have received your response and are processing it. You will be notified if any additional information is needed."
- Confirmation includes Project ID for reference
- I have peace of mind that quotation was received

**Priority:** P1 (Should Have)  
**Related Features:** Feature 1 (Email Quote Intake)  
**Development Effort:** 1 day

---

## Epic 4: Responding to Follow-ups

### US-MVP-S07: Receive Follow-up for Missing Information

**As** Raj  
**I want to** receive clear follow-up email if information is missing  
**So that** I know exactly what to provide

**Acceptance Criteria:**
- I receive follow-up email within 1 hour of initial submission
- Email clearly lists missing information:
  - "Missing: cycle_time for Operation 2 (stamping)"
  - "Missing: capacity_confirmation (equipment count, shifts, annual capacity)"
  - "Tooling cost not found - is it embedded in process costs? Please provide explicit breakdown."
- Email explains WHY information is needed (e.g., "for fair comparison")
- Email includes deadline (3 days default)
- Email is polite and professional

**Priority:** P0 (Must Have)  
**Related Features:** Feature 4 (Completeness Check & Follow-up Loop)  
**Development Effort:** Included in follow-up feature

---

### US-MVP-S08: Provide Additional Information

**As** Raj  
**I want to** easily provide additional information via email reply  
**So that** I can complete my quotation quickly

**Acceptance Criteria:**
- I reply to follow-up email with additional information
- I can provide information in email body (for simple fields) or attach updated file
- I ensure rfq-agent@[customer-domain].optiroq.com is CC'd
- System re-processes my quotation with new information
- I receive confirmation: "Thank you for the additional information. Your quotation has been updated."

**Priority:** P0 (Must Have)  
**Related Features:** Feature 4 (Completeness Check & Follow-up Loop)  
**Development Effort:** Included in follow-up feature

---

### US-MVP-S09: Clarify Embedded Tooling Costs

**As** Raj  
**I want to** clarify if tooling costs are embedded in process costs  
**So that** buyer can compare my quote fairly with others

**Acceptance Criteria:**
- I receive follow-up: "Tooling cost not found - is it embedded in process costs?"
- I can respond in two ways:
  1. "Yes, tooling is embedded. Breakdown: Process $950 = $760 process + $190 tooling"
  2. "No, tooling is listed separately in row 34"
- System extracts explicit tooling cost from my response
- This enables fair comparison (critical for buyer)

**Priority:** P0 (Must Have)  
**Related Features:** Feature 4 (Completeness Check & Follow-up Loop)  
**Development Effort:** Included in follow-up feature

---

### US-MVP-S10: Receive Reminder if No Response

**As** Raj  
**I want to** receive reminder if I don't respond to follow-up  
**So that** I don't miss the deadline

**Acceptance Criteria:**
- I receive reminder email after 3 days if no response
- Reminder is polite: "Friendly reminder: We're still waiting for additional information for Project-123"
- Reminder includes original follow-up request
- Reminder includes new deadline (2 days)
- This helps me stay on track

**Priority:** P1 (Should Have)  
**Related Features:** Feature 4 (Completeness Check & Follow-up Loop)  
**Development Effort:** 1 day

---

## Epic 5: Quotation Status

### US-MVP-S11: Know When Quotation is Complete

**As** Raj  
**I want to** know when my quotation is complete and no further action is needed  
**So that** I can move on to other tasks

**Acceptance Criteria:**
- I receive email notification: "Your quotation for Project-123 is complete. Thank you!"
- Notification confirms all required information has been provided
- I know no further action is needed
- I can focus on other RFQs

**Priority:** P1 (Should Have)  
**Related Features:** Feature 4 (Completeness Check & Follow-up Loop)  
**Development Effort:** 1 day

---

## Epic 6: Multi-Part RFQ Response (NEW - Mebarek Feedback)

### US-MVP-S12: Receive Multi-Part RFQ

**As** Raj  
**I want to** receive RFQs with multiple parts clearly listed  
**So that** I can quote all parts efficiently

**Acceptance Criteria:**
- I receive RFQ email with multiple parts clearly listed:
  - Part 1: Part Number, Description, Quantity, Unit
  - Part 2: Part Number, Description, Quantity, Unit
  - Part 3: Part Number, Description, Quantity, Unit
- Each part has its own requirements and specifications
- RFQ clearly states: "Please provide individual pricing per part AND optional package pricing for all parts"
- I understand I need to quote each part separately
- I understand package pricing is optional but encouraged

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-11 (Multi-Part RFQ Support)  
**Development Effort:** N/A (supplier receives)

---

### US-MVP-S13: Provide Individual and Package Pricing

**As** Raj  
**I want to** provide both individual part pricing and package pricing  
**So that** I can offer volume discounts for complete packages

**Acceptance Criteria:**
- In my quotation, I provide:
  - **Individual pricing**: Part A = €10, Part B = €15, Part C = €8 (Total: €33)
  - **Package pricing** (optional): All 3 parts = €30 (9% discount for package)
- I clearly label individual vs package pricing
- I explain package discount: "Package discount: €3 (9%) for ordering all 3 parts together"
- System extracts both pricing types from my quote
- I can offer package discount to be more competitive

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-11 (Multi-Part RFQ Support)  
**Development Effort:** N/A (supplier provides)

---

### US-MVP-S14: Use Consistent Units Across Parts

**As** Raj  
**I want to** use my preferred units for each part  
**So that** I can quote in units I'm familiar with

**Acceptance Criteria:**
- I can use different units for different parts:
  - Part A (metal): kg or lbs
  - Part B (liquid): liters or gallons
  - Part C (discrete): pieces or dozens
- System automatically converts my units to common basis
- I don't need to manually convert units
- System shows my original units and converted units in comparison

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-11 (Multi-Part RFQ Support)  
**Development Effort:** N/A (system handles conversion)

---

## Epic 7: Enhanced Logistics Information (NEW - Mebarek Feedback)

### US-MVP-S15: Provide Detailed Logistics Information

**As** Raj  
**I want to** provide comprehensive logistics information in my quote  
**So that** buyer has complete picture of logistics costs

**Acceptance Criteria:**
- RFQ email requests detailed logistics information:
  - **Carton type**: Standard or Custom (if custom, specify)
  - **Euro Pallet required**: Yes/No
  - **Returnable Packaging required**: Yes/No (if yes, cost per unit)
  - **Cleaning required**: Yes/No (if yes, cost per unit)
  - Standard packaging cost
  - Transportation cost
  - IncoTerms (EXW, FOB, DDP, etc.)
- I include all logistics fields in my quotation
- I clearly separate logistics costs from piece price
- I specify if any logistics costs are included in piece price
- System extracts all logistics fields from my quote

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-04 (Enhanced Logistics Fields)  
**Development Effort:** N/A (supplier provides)

---

### US-MVP-S16: Clarify Returnable Packaging Costs

**As** Raj  
**I want to** clearly specify returnable packaging requirements and costs  
**So that** buyer understands total logistics investment

**Acceptance Criteria:**
- If returnable packaging is required, I specify:
  - Initial investment cost (e.g., €5,000 for containers)
  - Cost per unit per cycle (e.g., €0.50 per part per return cycle)
  - Expected lifecycle (e.g., 100 cycles)
  - Maintenance cost (if applicable)
- I explain returnable packaging benefits: "Returnable packaging reduces per-unit cost by €0.30 after 20 cycles"
- System extracts returnable packaging costs
- Buyer can compare returnable vs disposable packaging

**Priority:** P1 (Should Have)  
**Related Features:** REQ-MVP-04 (Enhanced Logistics Fields)  
**Development Effort:** N/A (supplier provides)

---

## Epic 8: Tooling Amortization Transparency (NEW - Mebarek Feedback)

### US-MVP-S17: Provide Explicit Tooling Amortization Breakdown

**As** Raj  
**I want to** clearly separate tooling amortization from piece price  
**So that** buyer can compare my quote fairly with others (critical requirement)

**Acceptance Criteria:**
- RFQ email explicitly asks: "Is tooling amortization included in piece price? (Yes/No)"
- If Yes: "How much per piece is tooling amortization?"
- I provide explicit breakdown in my quotation:
  - **Option A (Preferred)**: Piece price €9.80 (ex-tooling) + Tooling amortization €0.70/piece = Total €10.50/piece
  - **Option B**: Piece price €10.50 (includes €0.70 tooling amortization)
- I clearly label which costs include tooling amortization
- I explain amortization calculation: "Tooling €50K ÷ 70K pieces = €0.71/piece"
- System extracts explicit tooling amortization
- This enables fair comparison (buyer's critical pain point)

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-05 (Tooling Amortization Transparency)  
**Development Effort:** N/A (supplier provides)

---

### US-MVP-S18: Receive Follow-up for Unclear Tooling Amortization

**As** Raj  
**I want to** receive clear follow-up if tooling amortization is unclear  
**So that** I can provide missing information quickly

**Acceptance Criteria:**
- If I don't provide explicit tooling amortization, I receive automated follow-up:
  - "Your quotation does not clearly specify tooling amortization"
  - "Is tooling amortization included in piece price? (Yes/No)"
  - "If yes, please provide breakdown: Piece price (ex-tooling) + Tooling amortization per piece"
  - "This information is required for fair comparison"
- Follow-up is professional and explains WHY information is needed
- I can respond via email with clarification
- System re-processes my quote with updated information
- I receive confirmation: "Thank you for clarification. Your quotation has been updated."

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-05 (Tooling Amortization Transparency)  
**Development Effort:** Included in follow-up feature

---

## Epic 9: Lead Time Milestones (NEW - Mebarek Feedback)

### US-MVP-S19: Provide Lead Times for Development Milestones

**As** Raj  
**I want to** provide lead times for each development milestone  
**So that** buyer can evaluate my delivery capabilities

**Acceptance Criteria:**
- RFQ email requests lead times for 7 milestones:
  - **Sample A**: First prototype sample (buyer target: e.g., 4 weeks)
  - **Sample B/C/D**: Subsequent iteration samples (buyer target: e.g., 6 weeks)
  - **Prototype**: Final prototype (buyer target: e.g., 8 weeks)
  - **Off-tool parts**: First parts from production tooling (buyer target: e.g., 10 weeks)
  - **Off-tool or process**: Process validation (buyer target: e.g., 12 weeks)
  - **PPAP**: Production Part Approval Process (buyer target: e.g., 14 weeks)
  - **SOP**: Start of Production (buyer target: e.g., 16 weeks)
- I provide lead time for each milestone in my quotation:
  - Format: Weeks from order (e.g., "Sample A: 5 weeks")
  - Or specific dates (e.g., "Sample A: March 15, 2026")
- I can mark milestones as "Not Applicable" if not relevant
- System extracts all lead times from my quote
- System compares my lead times to buyer's targets

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-13 (Lead Time Milestone Tracking)  
**Development Effort:** N/A (supplier provides)

---

### US-MVP-S20: Explain Lead Time Constraints

**As** Raj  
**I want to** explain any lead time constraints or dependencies  
**So that** buyer understands my delivery timeline

**Acceptance Criteria:**
- I can add comments explaining lead time constraints:
  - "Sample A: 5 weeks (requires 2 weeks for material procurement)"
  - "PPAP: 16 weeks (depends on customer approval of Sample D)"
  - "SOP: 20 weeks (tooling lead time is 12 weeks)"
- I can propose alternative timelines if buyer's targets are aggressive
- System extracts my comments and displays in comparison board
- Buyer can see my reasoning and constraints

**Priority:** P1 (Should Have)  
**Related Features:** REQ-MVP-13 (Lead Time Milestone Tracking)  
**Development Effort:** N/A (supplier provides)

---

## Epic 10: ESG/Sustainability Information (NEW - Mebarek Feedback)

### US-MVP-S21: Provide ESG Scores and Certifications

**As** Raj  
**I want to** provide my company's ESG scores and certifications  
**So that** buyer can evaluate my sustainability performance

**Acceptance Criteria:**
- RFQ email requests ESG information:
  - **ECOVADIS score** (0-100, if available)
  - **Internal Assessment score** (0-100, if buyer has assessed us before)
  - **Certifications**: ISO 14001 (Environmental), ISO 45001 (Health & Safety), etc.
- I provide ESG information in my quotation:
  - "ECOVADIS Score: 72/100 (Silver rating)"
  - "Certifications: ISO 14001:2015, ISO 45001:2018"
  - "Carbon footprint: 50 kg CO2e per part"
- I can attach certification documents if requested
- System extracts ESG data from my quote
- ESG information is optional but encouraged

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-15 (ESG/Sustainability Scoring)  
**Development Effort:** N/A (supplier provides)

---

### US-MVP-S22: Understand ESG Impact on Selection

**As** Raj  
**I want to** understand how ESG scores impact buyer's decision  
**So that** I can prioritize sustainability improvements

**Acceptance Criteria:**
- RFQ email explains ESG evaluation:
  - "ESG scores will be considered alongside price and lead time"
  - "Suppliers with ECOVADIS score >70 receive preference"
  - "ESG-weighted ranking: 70% price, 30% ESG"
- I understand providing ESG information improves my competitiveness
- I can see my ESG score compared to other suppliers (if buyer shares feedback)
- This motivates me to improve sustainability performance

**Priority:** P2 (Nice to Have)  
**Related Features:** REQ-MVP-15 (ESG/Sustainability Scoring)  
**Development Effort:** N/A (buyer communication)

---

## Epic 11: Negotiation Rounds (NEW - Mebarek Feedback)

### US-MVP-S23: Submit Updated Quote After Negotiation

**As** Raj  
**I want to** submit updated quote after negotiation discussions  
**So that** I can improve my competitiveness

**Acceptance Criteria:**
- After initial quote, buyer may request price improvement
- I can submit updated quote via email (same Project ID)
- System automatically detects this is Round 2 (or Round 3, etc.)
- I clearly indicate what changed:
  - "Round 2: Reduced material cost from €100 to €95 (-5%)"
  - "Round 2: Reduced tooling cost from €50K to €45K (-10%)"
- System tracks all rounds and calculates improvement
- I receive confirmation: "Round 2 quote received. Price improvement: -5% vs Round 1"
- Buyer can compare all my rounds side-by-side

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-14 (Negotiation Round Tracking)  
**Development Effort:** N/A (supplier submits)

---

### US-MVP-S24: View My Quote History

**As** Raj  
**I want to** view my quote history for this RFQ  
**So that** I can track my negotiation progress

**Acceptance Criteria:**
- I can access optional supplier portal (if provided)
- Portal shows my quote history:
  - Round 1: €150 (submitted Jan 5)
  - Round 2: €143 (submitted Jan 10, -5% improvement)
  - Round 3: €140 (submitted Jan 15, -2% improvement, -7% cumulative)
- I can see buyer's feedback (if shared): "Price competitive, but lead time needs improvement"
- I can download my previous quotes for reference
- This helps me track negotiation progress

**Priority:** P2 (Nice to Have)  
**Related Features:** REQ-MVP-14 (Negotiation Round Tracking)  
**Development Effort:** 2 days (supplier portal feature)

---

## Epic 12: Automated Reminders (NEW - Mebarek Feedback)

### US-MVP-S25: Receive Automated Reminders for Overdue Quotes

**As** Raj  
**I want to** receive automated reminders if I haven't responded  
**So that** I don't miss RFQ deadlines

**Acceptance Criteria:**
- If I don't respond to RFQ within 3 days, I receive 1st reminder:
  - Professional greeting
  - Reference to original RFQ (Project ID, parts)
  - Polite reminder: "We haven't received your quotation yet"
  - Original RFQ requirements (attached or linked)
  - New deadline (2 days from reminder)
- If I still don't respond, I receive 2nd reminder after 5 days
- If I still don't respond, I receive 3rd reminder after 7 days
- Reminders are professional and not accusatory
- I can respond to any reminder with my quotation
- System stops sending reminders once I respond

**Priority:** P0 (Must Have)  
**Related Features:** REQ-MVP-12 (Supplier Communication Tracking)  
**Development Effort:** Included in communication tracking

---

### US-MVP-S26: Acknowledge Receipt of Reminder

**As** Raj  
**I want to** acknowledge receipt of reminder if I need more time  
**So that** buyer knows I'm working on quotation

**Acceptance Criteria:**
- I can reply to reminder email with acknowledgment:
  - "Received your reminder. Working on quotation, will submit by [date]"
- System logs my acknowledgment
- Buyer sees my status: "Supplier A: Acknowledged, quote expected by Jan 12"
- System may extend deadline based on my commitment
- This maintains good communication with buyer

**Priority:** P1 (Should Have)  
**Related Features:** REQ-MVP-12 (Supplier Communication Tracking)  
**Development Effort:** 1 day

---

## Summary Statistics

**Total User Stories:** 26 (increased from 11)
- **P0 (Must Have):** 18 stories (increased from 7)
- **P1 (Should Have):** 5 stories (increased from 3)
- **P2 (Nice to Have):** 3 stories (increased from 1)

**By Epic:**
- Epic 1 (Receiving RFQs): 2 stories
- Epic 2 (Preparing Quotations): 2 stories
- Epic 3 (Sending Quotations): 2 stories
- Epic 4 (Responding to Follow-ups): 4 stories
- Epic 5 (Quotation Status): 1 story
- **Epic 6 (Multi-Part RFQ Response): 3 stories (NEW)**
- **Epic 7 (Enhanced Logistics Information): 2 stories (NEW)**
- **Epic 8 (Tooling Amortization Transparency): 2 stories (NEW)**
- **Epic 9 (Lead Time Milestones): 2 stories (NEW)**
- **Epic 10 (ESG/Sustainability Information): 2 stories (NEW)**
- **Epic 11 (Negotiation Rounds): 2 stories (NEW)**
- **Epic 12 (Automated Reminders): 2 stories (NEW)**

**Key Enhancements for Raj (Jan 2, 2026 - Mebarek Feedback):**
- ✅ **Multi-part RFQ support**: Quote multiple parts with individual and package pricing
- ✅ **Enhanced logistics requirements**: Detailed logistics information (carton, pallet, returnable packaging, cleaning)
- ✅ **Tooling amortization transparency**: Explicit breakdown required (critical for fair comparison)
- ✅ **Lead time milestones**: Provide lead times for 7 development milestones
- ✅ **ESG/Sustainability data**: ECOVADIS score, certifications
- ✅ **Negotiation rounds**: Submit updated quotes with price improvements
- ✅ **Automated reminders**: Receive reminders if no response after 3/5/7 days

**Key Benefits for Raj:**
- ✅ Use own quotation format (no new templates to learn)
- ✅ Clear requirements checklist (know what to provide)
- ✅ Email-only interaction (no new systems to log into)
- ✅ Clear follow-ups (know exactly what's missing)
- ✅ Optional AI chat (for questions)
- ✅ Confirmation and status updates (peace of mind)
- ✅ Automated reminders (don't miss deadlines)
- ✅ Negotiation tracking (see improvement progress)

**Time Impact:**
- **Additional time per RFQ**: +15-20 minutes (for enhanced logistics, tooling breakdown, lead times, ESG data)
- **Time saved**: Fewer follow-up emails due to clearer requirements upfront
- **Net impact**: Neutral to slightly positive (more complete quotes upfront = fewer iterations)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 26, 2024 | Kiro | Initial MVP user stories for Raj (Supplier) |
| 2.0 | Jan 2, 2026 | Kiro | Enhanced with Mebarek feedback: multi-part RFQs, enhanced logistics, tooling transparency, lead time milestones, ESG data, negotiation rounds, automated reminders (15 new stories) |
