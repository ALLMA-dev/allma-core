---
title: Custom Lambda Invoke
sidebar_position: 3
---

# `CUSTOM_LAMBDA_INVOKE`

### Purpose

Invokes one of your custom AWS Lambda functions to perform specialized or proprietary business logic. This is the primary pattern for extending Allma. The Lambda receives the step's input payload and its JSON serializable return value becomes the step's output.

:::info IAM Permissions
For this step to work, Allma's core IAM role (`OrchestrationLambdaRole`) must be granted `lambda:InvokeFunction` permission on the target Lambda function's ARN. This is a critical security consideration.
:::

---

### Configuration Parameters

| Parameter                     | Type     | Required | Description                                                                                                                                                       |
| ----------------------------- | -------- | :------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lambdaFunctionArnTemplate`   | `string` |   Yes    | The full ARN of the Lambda function to invoke. This field supports Handlebars templating (e.g., `...:function:my-func-{{flow_variables.stage}}`) to select a function dynamically. |

---

### Input & Output

#### Lambda Event Payload (Input)

Your Lambda function will be invoked with a JSON event payload containing:
-   The data you construct using **`inputMappings`** and **`literals`**.
-   The `correlationId` (which is the `flowExecutionId`).

**Input Mapping Example:**
To send user data and an order ID to your Lambda:
```json
"inputMappings": {
  "user": "$.steps_output.user_profile",
  "orderId": "$.initialContextData.orderId"
}
```
Your Lambda would receive an event like:
```json
{
  "stepInput": {
    "user": { "name": "Jane Doe", "id": "u-123" },
    "orderId": "ord-456"
  },
  "correlationId": "exec-uuid-..."
}
```

#### Lambda Response (Output)

Your Lambda function **must** return a JSON serializable object. This object becomes the output of the `CUSTOM_LAMBDA_INVOKE` step.

**Output Mapping Example:**
If your Lambda returns `{"premium": 250.75, "risk_level": "low"}`, you can map it back:
```json
"outputMappings": {
  "$.flow_variables.calculated_premium": "$.premium"
}
```

---

### Full JSON Example

This example invokes a custom Lambda function to calculate an insurance premium. It passes the necessary data via `inputMappings` and stores the result in `flow_variables`.

```json
"calculate_premium": {
  "stepInstanceId": "calculate_premium",
  "displayName": "Calculate Insurance Premium",
  "stepType": "CUSTOM_LAMBDA_INVOKE",
  "lambdaFunctionArnTemplate": "arn:aws:lambda:us-east-1:123456789012:function:premium-calculator-prod",
  "inputMappings": {
    "applicant_data": "$.steps_output.gather_applicant_info",
    "policy_type": "$.initialContextData.policyType"
  },
  "outputMappings": {
    "$.flow_variables.premium_details": "$"
  },
  "onError": {
    "retries": { "count": 2, "intervalSeconds": 5 }
  },
  "defaultNextStepInstanceId": "generate_quote_document"
}
```