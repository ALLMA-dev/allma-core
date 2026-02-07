# MVP Actors - Email Quote Intake & Normalization

**Document Version:** 1.0  
**Date:** December 26, 2024  
**Based on:** MVP Product Requirements Document v1.0

---

## Overview

This document defines the actors (personas) for the MVP scope of Optiroq. The MVP focuses on the **killer feature**: automated email quote intake, extraction, normalization, and comparison. This is a significantly reduced scope compared to the full product, focusing on solving the single biggest pain point: manual data entry and normalization.

**MVP Scope:** Plugin-initiated RFQ → email quote intake → modular LLM extraction → completeness loop → normalized comparison board + anomaly flags

---

## Primary Actors (MVP)

### Actor 1: Sarah Chen - Project Buyer

**Role:** Project Buyer (New Product Introduction)

**Experience:** 6 years in procurement

**MVP Responsibilities:**
- Initiating RFQs via email (using Outlook/Gmail plugin)
- Sending RFQ requests to suppliers
- Receiving supplier quotations via email
- Reviewing normalized comparison boards
- Making sourcing decisions based on comparison data

**MVP Goals:**
- Eliminate 10-15 hours of manual data entry per RFQ
- Compare suppliers fairly (with explicit cost breakdowns)
- Identify cost anomalies quickly
- Make faster sourcing decisions

**MVP Pain Points (Addressed):**
- **Manual data entry:** Copying data from 6-8 supplier Excel files into comparison spreadsheet
- **Multi-format chaos:** Suppliers send responses in different formats (Excel, PDF, CSV)
- **Hidden costs:** Suppliers embed tooling costs in process costs, making comparison impossible
- **Currency/unit conversion:** Manual conversion of currencies and units
- **Anomaly detection:** Missing obvious cost outliers due to manual process

**MVP Interactions:**
1. Uses Outlook/Gmail plugin to initiate RFQ (auto-generates email template)
2. Sends RFQ to suppliers (system auto-CC's rfq-agent@[customer].com)
3. Receives email notifications as supplier quotes are processed
4. Reviews incremental Excel comparison boards (updated as each supplier responds)
5. Reviews anomaly flags (red/yellow/green indicators)
6. Approves/edits follow-up emails to suppliers (for missing data)
7. Makes sourcing decision based on normalized comparison

**Technical Proficiency:** Intermediate (comfortable with Outlook/Gmail, Excel)

**Tools Used (MVP):**
- Outlook/Gmail (with Optiroq plugin)
- Excel (for reviewing comparison boards)
- Email (for communication)

---

### Actor 2: Raj Patel - Supplier Contact

**Role:** Supplier Sales/Quotation Manager

**Experience:** 8 years in supplier sales

**MVP Responsibilities:**
- Receiving RFQ requests from buyers
- Preparing quotations in supplier's own format
- Responding to RFQ via email with attachments
- Responding to follow-up requests for missing information

**MVP Goals:**
- Respond to RFQs quickly
- Use existing quotation templates/formats (no new systems to learn)
- Minimize back-and-forth with buyers

**MVP Pain Points (Addressed):**
- **Format requirements:** Buyers often require specific Excel templates (time-consuming to fill)
- **Missing information:** Buyers follow up asking for missing data (delays process)
- **Unclear requirements:** RFQ emails sometimes lack clear instructions

**MVP Interactions:**
1. Receives RFQ email from buyer (with clear requirements checklist)
2. Optional: Uses AI chat link for questions about RFQ requirements
3. Prepares quotation in supplier's own format (Excel, PDF, CSV, etc.)
4. Sends quotation via email (reply-all to include rfq-agent@[customer].com)
5. Receives follow-up email if information is missing or unclear
6. Responds to follow-up with additional information

**Technical Proficiency:** Intermediate (comfortable with email, Excel, PDF)

**Tools Used (MVP):**
- Email (for receiving RFQs and sending quotations)
- Excel/PDF/CSV (for preparing quotations)
- Optional: AI chat (for questions about RFQ requirements)

---

## Secondary Actors (MVP - Limited Interaction)

### Actor 3: System Administrator

**Role:** IT/Operations Administrator

**MVP Responsibilities:**
- Setting up customer-specific email subdomain (rfq-agent@[customer].com)
- Configuring plugin for buyer's Outlook/Gmail
- Monitoring system health
- Updating price indices knowledge base (monthly/quarterly)

**MVP Interactions:**
1. Configures customer-specific subdomain
2. Deploys plugin to buyer's Outlook/Gmail
3. Monitors email intake and processing
4. Updates static price indices periodically
5. Reviews extraction accuracy metrics
6. Troubleshoots issues (failed extractions, email delivery)

**Technical Proficiency:** Advanced (IT professional)

**Tools Used (MVP):**
- Admin dashboard (for monitoring)
- Email server configuration
- Plugin deployment tools
- Knowledge base editor (for price indices)

---

## Actors NOT in MVP Scope

The following actors from the full product are **NOT** included in the MVP scope:

### ❌ Elena Rodriguez - Engineering Lead
**Why excluded:** MVP does not include BOM upload, part classification, or engineering collaboration features. Buyers manually create RFQ emails (with plugin assistance).

### ❌ James Wilson - Procurement Director
**Why excluded:** MVP does not include portfolio analytics, strategic dashboards, or approval workflows. Focus is on individual RFQ processing only.

### ❌ Marcus Thompson - Commodity Buyer
**Why excluded:** MVP does not include bid list management, supplier strategy, or commodity-level analytics. Buyers manually select suppliers for RFQs.

---

## Actor Comparison: Full Product vs. MVP

| Actor | Full Product | MVP | Rationale |
|-------|-------------|-----|-----------|
| **Sarah (Buyer)** | ✅ Full features | ✅ Core features only | Primary user - focus on data entry pain point |
| **Raj (Supplier)** | ✅ Full features | ✅ Minimal interaction | Receives RFQs, sends quotes (no portal access) |
| **Elena (Engineering)** | ✅ Full features | ❌ Not included | BOM upload not in MVP scope |
| **James (Director)** | ✅ Full features | ❌ Not included | Analytics not in MVP scope |
| **Marcus (Commodity)** | ✅ Full features | ❌ Not included | Bid list management not in MVP scope |
| **System Admin** | ✅ Full features | ✅ Limited features | Setup and monitoring only |

---

## MVP Actor Workflows

### Sarah's MVP Workflow

```
1. Install Optiroq plugin (Outlook/Gmail) [One-time setup]
   ↓
2. Click "Start RFQ" button in email client
   ↓
3. Fill structured form:
   - Project ID
   - Part numbers
   - Suppliers (email addresses)
   - Requirements checklist
   - Attachments (BOM, drawings)
   ↓
4. Plugin generates RFQ email with:
   - Professional template
   - Clear requirements
   - Auto-CC: rfq-agent@[customer].com
   - Project ID in headers
   ↓
5. Review and send RFQ email
   ↓
6. Wait for supplier responses (system monitors inbox)
   ↓
7. Receive email notification: "Quote received from Supplier A"
   ↓
8. Receive Excel comparison board v1 (1 supplier)
   ↓
9. Review comparison board, anomaly flags
   ↓
10. Receive Excel comparison board v2 (3 suppliers)
    ↓
11. Review updated comparison board
    ↓
12. Approve follow-up email to Supplier B (missing tooling cost)
    ↓
13. Receive Excel comparison board v3 (3 suppliers, Supplier B updated)
    ↓
14. Make sourcing decision based on normalized comparison
```

### Raj's MVP Workflow

```
1. Receive RFQ email from Sarah
   ↓
2. Review requirements checklist
   ↓
3. Optional: Click AI chat link for questions
   ↓
4. Prepare quotation in supplier's own format:
   - Excel (preferred)
   - PDF (acceptable)
   - CSV (acceptable)
   ↓
5. Reply-all to RFQ email with quotation attachment
   (Ensures rfq-agent@[customer].com is CC'd)
   ↓
6. Optiroq system processes quotation automatically
   ↓
7. If information missing, receive follow-up email:
   "Please provide tooling cost breakdown"
   ↓
8. Respond with additional information
   ↓
9. Done (no further interaction needed)
```

---

## Key Differences from Full Product

### Simplified Interactions
- **No web portal:** Buyers use email + Excel only (no login required)
- **No supplier portal:** Suppliers use email only (no login required)
- **No BOM upload:** Buyers manually create RFQ emails (with plugin assistance)
- **No bid list management:** Buyers manually select suppliers
- **No approval workflows:** Buyers make decisions independently
- **No analytics dashboards:** Focus on individual RFQ only

### Reduced Complexity
- **Single workflow:** RFQ initiation → quote intake → comparison (no multi-stage processes)
- **Email-centric:** All interactions via email (familiar tool)
- **Excel-centric:** All outputs via Excel (familiar tool)
- **No integrations:** No ERP, no BI tools (Phase 2)

### Maintained Value
- **Core pain point solved:** Eliminate 10-15 hours of manual data entry per RFQ
- **Multi-format support:** Handle real-world supplier responses (Excel, PDF, CSV)
- **Hidden cost detection:** Identify embedded tooling costs
- **Anomaly detection:** Flag cost outliers automatically
- **Incremental updates:** See results as suppliers respond

---

## Actor Validation Checklist

Before finalizing user stories, validate with pilot customers:

### Sarah (Buyer) Validation
- [ ] Does plugin approach work for your email client? (Outlook vs. Gmail)
- [ ] Is Excel export sufficient or do you need web portal?
- [ ] How many suppliers do you typically contact per RFQ? (6-8 assumed)
- [ ] What formats do suppliers actually send? (Excel, PDF, CSV, other?)
- [ ] Is incremental update approach valuable? (vs. batch at end)
- [ ] What anomalies are most important to detect? (cost outliers, missing data, etc.)

### Raj (Supplier) Validation
- [ ] Do you prefer to use your own quotation format? (vs. standardized template)
- [ ] Would AI chat for RFQ questions be helpful?
- [ ] How often do buyers follow up for missing information?
- [ ] What information do you most often forget to include?
- [ ] Is email-only interaction acceptable? (vs. web portal)

### System Admin Validation
- [ ] Can you configure customer-specific email subdomains?
- [ ] Can you deploy plugins to buyer's email clients?
- [ ] What monitoring/alerting do you need?
- [ ] How often can you update price indices? (monthly/quarterly)

---

## Next Steps

1. **Validate actors** with Mibarek and pilot customers
2. **Create user stories** for Sarah (primary actor)
3. **Create user stories** for Raj (secondary actor)
4. **Create user stories** for System Admin (setup/monitoring)
5. **Map user stories to features** (Feature 0-7)
6. **Prioritize user stories** (P0, P1, P2)
7. **Estimate development effort** per user story

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 26, 2024 | Kiro | Initial MVP actors definition |
