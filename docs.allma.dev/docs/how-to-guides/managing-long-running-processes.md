---
title: Managing Long-Running Processes
sidebar_position: 4
---

# Managing Long-Running Processes

Many critical business workflows aren't fully automated; they require human intervention or need to wait for slow, external systems. Allma handles these scenarios with the `WAIT_FOR_EXTERNAL_EVENT` step, which can pause a flow indefinitely and resume it via a secure API call.

### Goal

To create a simple expense approval workflow. The flow will pause until a manager approves or rejects the expense by calling an API, and then continue down the appropriate path.

![Wait and Resume Flow Diagram](https://i.imgur.com/your-diagram-image.png) <!-- TODO: Add a real diagram -->

### The "Wait and Resume" Lifecycle

1.  **Execution:** The Allma flow runs until it reaches a `WAIT_FOR_EXTERNAL_EVENT` step.
2.  **Pause:** The step generates a unique **Correlation Key** and saves the flow's pause state (a `taskToken`) in a database. The Step Functions execution then pauses.
3.  **External Action:** An external system (e.g., a Slack bot, a frontend UI, an email service) performs an action and gets a result (e.g., a manager clicks "Approve").
4.  **Resume:** This external system makes a `POST` request to the Allma **Resume API**, providing the `correlationValue` and a JSON `payload` with the result.
5.  **Continuation:** Allma uses the `correlationValue` to look up the saved `taskToken`, resumes the paused Step Functions execution, and passes the `payload` as the output of the wait step.
6.  **Mapping & Transition:** The flow applies the step's **Output Mappings** to merge the payload into the context and continues to the next step.

### Step 1: Configure the Wait Step

1.  In your flow, add a **Wait for External Event** step.
2.  **Display Name:** `Wait for Manager Approval`.
3.  **Correlation Key Template:** This is the most important field. It must generate a unique business key for this specific wait instance. Use Handlebars to make it dynamic.
    -   Template: `expense-approval:{{initialContextData.expenseId}}`
    -   This ensures that if the flow is for expense report "EXP-123", the key will be `expense-approval:EXP-123`.
4.  **Output Mappings:** Define how the data from the Resume API's `payload` will be merged into the context.
    -   **Target Path:** `$.flow_variables.approval_decision`
    -   **Source JSONPath:** `$.decision`
    -   This expects the Resume API to be called with a payload like `{"decision": "APPROVED"}`.

### Step 2: Set up Conditional Transitions

After the wait step, we need to route the flow based on the manager's decision.

1.  Add two `END_FLOW` steps to the canvas, named `Approved` and `Rejected`.
2.  Select the `Wait for Manager Approval` step.
3.  Go to the **Transitions** section.
4.  **Add Transition:**
    -   **Condition:** `$.flow_variables.approval_decision == 'APPROVED'`
    -   **Next Step:** `Approved`
5.  Set the **Default Next Step** to `Rejected`.

The flow will now check the value we mapped from the resume payload and choose the correct path.

### Step 3: Triggering and Resuming the Flow

1.  **Publish** your flow.
2.  **Trigger** it with an initial payload:

    ```bash
    curl -X POST 'https://YOUR_API_GATEWAY_URL/trigger/your-flow-id' \
    -H 'Content-Type: application/json' \
    -d '{"expenseId": "EXP-123", "amount": 500}'
    ```
3.  In the **Executions** log, you will see the flow has a status of **RUNNING** and is paused at the `Wait for Manager Approval` step.
4.  **Simulate the manager's approval** by calling the Resume API.

    ```bash title="Resume API Call"
    # The Resume API endpoint is part of your Allma deployment
    curl -X POST 'https://YOUR_API_GATEWAY_URL/resume' \
    -H 'Content-Type: application/json' \
    -d '{
      "correlationValue": "expense-approval:EXP-123",
      "payload": {
        "decision": "APPROVED",
        "approvedBy": "manager@example.com"
      }
    }'
    ```

### Step 4: Verify the Resumption

Go back to the execution log for your flow. You will see that it has now resumed, evaluated the transition condition, and moved to the `Approved` step, completing the execution. Inspecting the `Wait for Manager Approval` step will show its output, which matches the `payload` you sent to the Resume API.