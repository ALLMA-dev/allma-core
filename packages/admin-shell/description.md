# Allma Admin Panel: User Guide & Feature Deep Dive

## 1. Introduction

Welcome to the Allma Admin Panel, the central command and control interface for the Allma automation platform. This web-based UI is the "cockpit" for developers, automation specialists, and administrators to design, manage, monitor, and debug the powerful workflows, or **Flows**, that drive your business processes.

This document serves as a comprehensive guide to all the features available within the Admin Panel. It is intended for anyone who interacts with the platform, from developers building new automations to operations staff monitoring their health.

### Core Principles of the UI

The Admin Panel is designed around a few key principles:

*   **Clarity and Insight:** Provide deep visibility into every aspect of a Flow's design and execution.
*   **Rapid Iteration:** Enable developers to test and debug components quickly without running entire complex processes.
*   **Safe Management:** Use a robust versioning and publishing system to ensure changes can be developed and tested without impacting live, production workflows.
*   **Operational Control:** Give administrators the tools they need to monitor the health of the system and intervene when necessary.

---

## 2. Getting Started: Access & Layout

### 2.1. Authentication & Authorization

Access to the Allma Admin Panel is secured using AWS Cognito.

*   **Login:** Users log in with their email and password. The system supports multi-factor authentication for enhanced security.
*   **Permissions:** Access to features is governed by a role-based access control (RBAC) system. Your assigned role (e.g., `Viewer`, `Developer`, `Admin`) determines which actions you can perform. For example, a `Viewer` may be able to see flow executions but cannot edit or create new flows. If you attempt an action you don't have permission for, the UI will prevent it and may show an alert.

### 2.2. Main Layout

The Admin Panel is organized into a clean, consistent layout:

*   **Header:** Contains the application title, the currently logged-in user's email, and controls for signing out and switching between light/dark mode.
*   **Navigation Sidebar (Left):** This is your primary means of navigating the panel. It provides access to all major sections. The sidebar can be collapsed to an icon-only view to maximize screen real estate.
*   **Main Content Area:** This is where the primary interface for each section is displayed.

---

## 3. Dashboard: The 30,000-Foot View

The Dashboard is the landing page after you log in. It provides a high-level, real-time overview of the platform's health and activity.

*   **Key Performance Indicators (KPIs):** A set of prominent cards at the top display critical metrics for the **last 24 hours**:
    *   **Total Executions:** The total number of flows that have started.
    *   **Successful:** The count of flows that completed successfully.
    *   **Failed:** The count of flows that ended in an error state.
    *   **Avg Duration:** The average time it takes for a flow to complete, helping you spot performance degradation.
*   **Execution Status Chart:** A stacked bar chart that visualizes the breakdown of flow statuses (`COMPLETED`, `FAILED`, `RUNNING`, `TIMED_OUT`) over the **last 7 days**. This is useful for identifying trends, such as a sudden spike in failures.
*   **Recent Failures Table:** A live-updating table that shows the most recent failed flow executions. This is your first stop for troubleshooting active issues. Each entry includes:
    *   A clickable **Execution ID** that takes you directly to the detailed log page.
    *   The **Flow** name and version that failed.
    *   The specific **Error** name (e.g., `ApiCallFailedError`, `States.Timeout`).
    *   The **Time** the failure occurred.

---

## 4. Flow Management

This section is where you design, configure, and manage your automation "recipes" or **Flows**.

### 4.1. Flow List Page

This page displays all the Flow "families" in the system. A Flow family is a collection of all versions of a single logical workflow (e.g., "Customer Onboarding").

*   **Search & Filter:** You can quickly find flows by searching for their name or description, or by filtering by tags.
*   **Flow Summary:** The table provides key information at a glance:
    *   **Name / ID:** The user-friendly name and the unique system ID.
    *   **Published Version:** The version currently "live" and being triggered for new executions. If none is published, it will be indicated.
    *   **Total Versions:** The total number of draft and published versions that exist for this flow.
*   **Actions:**
    *   **Create New Flow:** Opens a modal to define a new Flow family by giving it a name and description. This creates the first draft (Version 1).
    *   **Manage Versions & Settings (Settings Icon):** Navigates to the version management page for that specific flow.
    *   **Clone Flow (Copy Icon):** Creates a brand new Flow family, including a new Version 1 that is a deep copy of the latest version of the flow you are cloning. This is extremely useful for bootstrapping new automations based on existing patterns.

### 4.2. Flow Versions & Settings Page

This is the central hub for managing a single Flow family. It's divided into two parts:

#### Flow Settings

A form at the top of the page allows you to edit the metadata for the entire Flow family, which applies across all versions:
*   **Flow Name:** The user-friendly name.
*   **Description:** A more detailed explanation of the flow's purpose.
*   **Tags:** Keywords that help categorize and find the flow.

#### Version List

A table lists every version of the flow, sorted from newest to oldest.

*   **Status:** A badge indicates if a version is a `Draft` or `Published`. There can be at most one published version per flow.
*   **Actions (per version):**
    *   **Edit/View (Pencil/Eye Icon):** Opens the visual Flow Editor. If the version is a `Draft`, you can edit it. If it's `Published`, the editor is in read-only mode.
    *   **Publish (Upload Icon):** (Drafts only) Prompts for confirmation and, if confirmed, makes this version the live, active one. If another version was previously published, it is automatically unpublished.
    *   **Unpublish (Cloud-slash Icon):** (Published only) Removes the `Published` status from this version, effectively deactivating the flow until a new version is published.
    *   **Create New Version (Button at top):** This is the primary way to make changes. It creates a new draft version that is a copy of the most recent version, allowing you to work on changes safely.

### 4.3. The Flow Editor

The Flow Editor is a powerful visual canvas for designing and configuring your workflows. It consists of three main areas: the central canvas, a left-side palette/sandbox panel, and a right-side configuration panel.

#### The Canvas

*   **Visual Representation:** Displays steps as nodes and transitions as connecting edges.
*   **Drag & Drop:** You can add new steps by dragging them from the **Step Palette** onto the canvas.
*   **Connecting Nodes:** Create a transition by dragging from a handle on one node to a handle on another. The editor automatically determines if it's a `default` or `conditional` transition.
*   **Start Node:** One node is marked with a "Start" badge. This is the entry point of the flow. You can right-click any node and select "Set as Start Node" to change it.
*   **Read-Only Mode:** If a flow version is published, the canvas is locked. You cannot move nodes, add steps, or change connections. A prominent banner indicates you are in read-only mode.

#### Left Panel: Step Palette & Sandbox

*   **Step Palette:** Clicking the `+` icon opens a palette of available step types (e.g., `LLM Invocation`, `API Call`). Drag any step from this palette onto the canvas to add it to your flow.
*   **Live Data & Sandbox (Test Tube Icon):** This is one of Allma's most powerful debugging features. See section [7.3. Sandbox Execution](#73-sandbox-execution) for a full deep dive.

#### Right Panel: Step & Transition Configuration

This panel appears when you click on a step or an edge on the canvas.

##### Step Editor Panel

When you select a node (a step), this panel allows you to configure every aspect of its behavior.

*   **Core Properties:**
    *   `Display Name`: A user-friendly label for the node on the canvas.
    *   `Step Definition`: For certain step types (`DATA_LOAD`, `DATA_SAVE`), this dropdown lets you select the specific pre-built module to use (e.g., "Save to S3", "Publish to SNS").
*   **Parameters:** A form with fields specific to the selected `StepType`. For an `LLM_INVOCATION` step, this is where you select the prompt template. For an `API_CALL`, you'd enter the URL and HTTP method. Each field has a help icon with detailed documentation.
*   **Common Mappings & Transitions (Accordion):**
    *   `Default Next Step`: A dropdown to select the "happy path" step to execute next.
    *   `Conditional Transitions`: A list of `if/then` conditions. Each condition is a **JSONPath** expression. You can edit the condition directly here. To create a new conditional transition, simply drag a new edge on the canvas.
    *   `Input/Output Mappings`: JSON editors where you define how data flows from the main context into the step, and how the step's result is merged back into the context.
*   **Error Handling (Accordion):** A JSON editor to configure retry policies and a `fallbackStepInstanceId` for graceful failure.
*   **Additional Parameters (Accordion):** A key-value editor for adding advanced or uncommon configuration parameters to the step's JSON definition.
*   **Advanced: Full JSON (Accordion):** A read-only view of the complete JSON configuration for the selected step.

##### Edge Editor Panel

When you select an edge (a transition), this panel appears.
*   **Conditional Edges:** If the edge represents a conditional transition, you can edit the **JSONPath** condition that must be met for the flow to follow that path.
*   **Other Edges:** For default or fallback transitions, the panel simply displays information about the source and target steps.

---

## 5. Prompt Management

Prompt templates are a core component of AI-powered flows. This section allows you to manage your library of reusable, version-controlled prompts.

*   **Prompt Families:** Like flows, prompts are organized into "families" (e.g., "Summarize Customer Issue"), with each family containing multiple versions.
*   **List Pages:** The main list page and the version list page function identically to their Flow counterparts, allowing you to create, clone, and manage versions.
*   **Prompt Editor:** When you edit a draft version, you are presented with a form to manage:
    *   **Name & Description:** Metadata for the prompt family.
    *   **Content:** A large text area for writing the prompt itself. The editor supports Markdown and uses a monospace font for clarity. You can use `{{variable}}` syntax for placeholders that will be filled in by an `LLM_INVOCATION` step.
*   **Preview:** A "Preview" button opens a full-screen modal that renders your prompt in different formats (Raw Text, Rendered Markdown, JSON) to help you visualize the final output.
*   **Compare Versions:** On the version list page, a "Compare" icon appears next to each version (except the very first). Clicking this takes you to a side-by-side diff viewer, clearly highlighting the changes between that version and the one before it. You can also use a dropdown to compare against any other version or even an empty baseline.

---

## 6. Execution Monitoring & Debugging

This section is dedicated to observing and troubleshooting your live flows.

### 6.1. Executions List Page

This page is the entry point for monitoring.

*   **Filtering:** A powerful set of filters at the top allows you to find specific executions. You can filter by:
    *   **Flow:** Select a flow family from the dropdown.
    *   **Version:** Further narrow down to a specific version of that flow.
*   **Execution Table:** The table lists matching executions with key summary data:
    *   `Execution ID`: The unique identifier. Clicking this takes you to the detail page.
    *   `Status`: A colored badge (`COMPLETED`, `RUNNING`, `FAILED`, etc.).
    *   `Start Time` and `Duration`.

### 6.2. Execution Detail Page

This page provides a meticulous, step-by-step breakdown of a single flow execution. It is the most critical tool for debugging.

*   **Execution Summary:** A header at the top shows the overall status, start/end times, and any final error information if the flow failed.
*   **Step Accordion:** The main body of the page is an accordion, with one item for each step that was executed, in chronological order. Each accordion header shows:
    *   The step number and name.
    *   The final status of that step (e.g., `COMPLETED`, `FAILED`, `RETRYING_CONTENT`).
    *   The precise duration of the step.
*   **Drilling into Step Details:** Expanding an accordion item reveals a rich set of diagnostic tabs and panels:
    *   **Input/Output Context:** Two JSON viewers show the *entire* flow context state right *before* the step ran, and right *after* its output was merged. A "Diff" button opens a full-screen, side-by-side comparison, highlighting exactly what the step changed in the context.
    *   **Mapping Events:** A detailed log of every input and output mapping action, showing the source path, target path, and the value that was mapped. This is invaluable for debugging why data isn't appearing where you expect.
    *   **Step Metadata:** Contains logs specific to the step's logic. For an `LLM_INVOCATION` step, this is where you will find:
        *   The exact, final prompt that was sent to the model (with all variables filled in).
        *   The raw response received from the model.
        *   Token usage statistics.
    *   **Error Info:** If the step failed, the detailed error object is displayed here.
*   **Parallel Branch Drilling:** For `PARALLEL_FORK_MANAGER` steps, the accordion panel contains tabs for each parallel branch that was executed. Clicking a branch tab reveals another nested accordion showing the detailed execution log for just the steps within that branch.

---

## 7. Advanced Debugging Tools

The Admin Panel includes several advanced features designed to accelerate development and troubleshooting. These are accessible from the **Execution Detail Page**.

### 7.1. Flow Redrive

A "Flow Redrive" button is available on the detail page of any completed or failed execution.

*   **Functionality:** It starts a brand new execution of the *same version* of the flow, using the *exact same initial input* as the original run.
*   **Use Case:** This is perfect for re-testing a flow after you've deployed a fix to an underlying system (e.g., a bug in an external API it calls) without having to manually reconstruct the original trigger event.

### 7.2. Stateful Redrive

This is the platform's "time machine" for debugging. It is available on every step within a failed execution's log.

*   **Functionality:** Clicking "Redrive from this Step" opens a modal. This modal is pre-filled with the flow's context data as it existed *just before* that step originally ran. You can **edit this context data directly in the modal**. When you confirm, Allma starts a new flow execution that "teleports" directly to that step, using your modified context as its starting state.
*   **Use Case:** This is incredibly powerful. Imagine a flow failed because a previous step formatted a phone number incorrectly. Instead of re-running the whole 10-minute flow, you can:
    1.  Go to the failed step.
    2.  Click "Redrive from this Step".
    3.  Manually correct the phone number in the context JSON.
    4.  Click "Confirm".
    The flow resumes from that exact point with the corrected data, allowing you to verify your fix in seconds.

### 7.3. Sandbox Execution

Accessible from the Flow Editor, the Sandbox allows you to test a single step in complete isolation.

*   **Functionality:**
    1.  In the Flow Editor, select a step node.
    2.  Click the "Live Data & Sandbox" icon to open the left-side panel.
    3.  The panel lets you select a real, past execution to load its historical data.
    4.  It populates a JSON editor with the input context that step received in the historical run. **You can edit this JSON freely.**
    5.  Click "Run Sandbox". The platform executes *only that single step* using the context data from the editor.
    6.  A modal appears showing the result: the step's direct output data or the error it produced, along with detailed logs and a diff view.
*   **Use Case:** This is the ultimate tool for rapid development. When designing a complex `LLM_INVOCATION` step, you can tweak your prompt template, then immediately test it in the Sandbox with various mock inputs to see how the LLM responds, all without ever having to trigger or run the entire flow. This reduces the development cycle for a single step from minutes to seconds.