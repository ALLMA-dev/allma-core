---
title: Advanced Error Handling
sidebar_position: 5
---

# Advanced Error Handling

Real-world automations must be resilient to failure. Allma provides a multi-layered error handling system to manage different types of errors, from temporary network hiccups to invalid data from an AI model.

This guide covers three key strategies: **Transient Retries**, **Content-Based Retries**, and **Fallbacks**.

---

### Scenario 1: Handling Transient API Failures

Transient errors are temporary issues, like a brief network outage or a third-party API returning a `503 Service Unavailable` error. These can often be resolved by simply trying again.

**Use Case:** An `API_CALL` step that might occasionally fail due to network instability.

**Configuration:**

1.  Select your `API_CALL` step.
2.  Go to the **Error Handling** section.
3.  Configure the `onError.retries` block:

    ```json
    "onError": {
      "retries": {
        "count": 3,
        "intervalSeconds": 5,
        "backoffRate": 2.0
      }
    }
    ```

**How it Works:**
-   If the API call fails with a transient error (e.g., a 5xx status code), the orchestrator will pause.
-   It will wait **5 seconds** (`intervalSeconds`) before the first retry.
-   If that fails, it will wait **10 seconds** (5 * 2.0) before the second retry.
-   If that fails, it will wait **20 seconds** (10 * 2.0) before the final retry.
-   If all **3** (`count`) retries fail, the error is considered permanent.

This exponential backoff strategy is the standard way to handle transient failures gracefully without overwhelming the target service.

---

### Scenario 2: Handling Bad LLM Output (Content-Based Retries)

Sometimes, the error isn't with the network but with the *content* of a response. A common example is asking an LLM for a JSON object but receiving malformed JSON or plain text instead.

**Use Case:** An `LLM_INVOCATION` step with `jsonOutputMode: true` that occasionally fails to produce valid JSON.

**Configuration:**

1.  Select your `LLM_INVOCATION` step.
2.  Ensure `customConfig.jsonOutputMode` is set to `true`.
3.  Configure the `onError.retryOnContentError` block:

    ```json
    "onError": {
      "retryOnContentError": {
        "count": 2
      }
    }
    ```

**How it Works:**
-   The step handler executes the LLM call.
-   It receives the response and attempts to parse it as JSON.
-   If parsing fails, it throws a special `ContentBasedRetryableError`.
-   The step executor catches this error, sees that `retryOnContentError` is configured, and immediately re-invokes the step handler up to **2** (`count`) times.
-   These retries are internal to the Allma step processor and happen much faster than the transient retries, providing a rapid feedback loop to the LLM.

---

### Scenario 3: Graceful Failure with Fallbacks

What happens after all retries are exhausted? Instead of letting the entire flow fail, you can define a fallback path.

**Use Case:** Our API call from Scenario 1 has failed all of its transient retries. We want to send a notification and end the flow gracefully instead of marking it as "FAILED".

**Configuration:**

1.  Create a separate branch in your flow for handling failures. This might include an `SNS_SEND` step named `Notify Failure` and an `END_FLOW` step.
2.  Select the original `API_CALL` step.
3.  In the `onError` block, add the `fallbackStepInstanceId`:

    ```json
    "onError": {
      "retries": {
        "count": 3,
        "intervalSeconds": 5,
        "backoffRate": 2.0
      },
      "fallbackStepInstanceId": "Notify Failure"
    }
    ```

**Execution Path:**

 <!-- TODO: Add a real diagram -->

1.  The `API_CALL` step fails.
2.  The orchestrator performs its 3 configured retries.
3.  All retries fail. The error is now considered permanent.
4.  Instead of stopping, the orchestrator checks for a `fallbackStepInstanceId`.
5.  It finds the fallback and immediately transitions the flow's execution to the `Notify Failure` step.
6.  The `Notify Failure` step runs, sending an alert.
7.  The flow then proceeds from there, eventually completing with a **"COMPLETED"** status.

By combining these strategies, you can build highly resilient and reliable workflows that can gracefully handle the inherent unpredictability of distributed systems and AI models.