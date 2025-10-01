---
title: Integrating with External APIs
sidebar_position: 2
---

# Integrating with External APIs

A core function of any orchestration platform is interacting with other systems. This guide shows how to use the `API_CALL` step to fetch data from an external API, including how to handle dynamic URLs and authentication headers.

### Goal

To create a flow that takes a `userId`, fetches the user's profile from a hypothetical external API at `https://api.yourapi.com/users/{userId}`, and adds the profile to the flow context. The API requires an `Authorization` header.

### Prerequisites

-   An Allma instance deployed.
-   An understanding of [JSONPath and the Data Context](./../getting-started/key-concepts/data-context.md).

### Step 1: Add and Configure the API Call Step

1.  In your Flow Editor, drag an **API Call** step onto the canvas.
2.  Select the step to open its configuration panel.

#### Configure the API Call:

1.  **Display Name:** `Fetch User Profile`.
2.  **API HTTP Method:** `GET`.
3.  **API URL Template:** This is where we make the URL dynamic.
    -   **Template:** `https://api.yourapi.com/users/{{userId}}`
    -   We've defined a Handlebars variable `{{userId}}`. Now we need to provide a value for it.
4.  **API URL Template -> Context Mappings:**
    -   Add a mapping:
        -   **Key:** `userId`
        -   **Source JSONPath:** `$.initialContextData.userId`
    -   This tells Allma to get the `userId` from the flow's initial payload and make it available to the URL template.

### Step 2: Configure Dynamic Authentication Headers

Our API requires an `Authorization` header. We'll assume the API key is passed into the flow and is available in the context.

1.  In the API Call step's configuration, find the **API Headers Template** section.
2.  Add a new header:
    -   **Key:** `Authorization`
    -   **Value:** `Bearer {{apiKey}}`
    -   Just like the URL, we've used a Handlebars variable.

3.  Now, we need to map a value to this `apiKey` variable. This is a crucial concept: **URL context mappings are separate from the main step input mappings**. For headers and body, we use the standard **Input Mappings**.

4.  Go to the **Input Mappings** section of the step.
5.  Add a new mapping:
    -   **Target Path (Key):** `apiKey`
    -   **Source JSONPath (Value):** `$.initialContextData.secretApiKey`

This tells Allma: "Take the value from `$.initialContextData.secretApiKey`, make it available as a variable named `apiKey` to the Handlebars templates in this step (headers, body, etc.)."

### Step 3: Map the API Response

Finally, we need to store the user profile data that the API returns.

1.  Go to the **Output Mappings** section.
2.  Add a new mapping:
    -   **Target Path (Key):** `$.steps_output.user_profile`
    -   **Source JSONPath (Value):** `$.data`

The `API_CALL` step's output is an object containing `{ status, headers, data }`. The `data` field holds the JSON body of the API response. This mapping takes that JSON body and saves it to `steps_output.user_profile` in the flow context.

### Step 4: Publish and Trigger

1.  Connect your steps, **Save Draft**, and **Publish** the flow.
2.  Trigger the flow with a payload that provides the `userId` and `secretApiKey`.

    ```bash title="Example using curl"
    curl -X POST 'https://YOUR_API_GATEWAY_URL/trigger/your-flow-id' \
    -H 'Content-Type: application/json' \
    -d '{
      "userId": "u-12345",
      "secretApiKey": "your-secret-api-key-here"
    }'
    ```

### Step 5: Verify the Execution

1.  Find the execution in the Allma Admin Panel.
2.  Inspect the `Fetch User Profile` step.
3.  In the **Output Context**, you'll see the full response from the API.
4.  In the **Diff** view, you will see the `steps_output.user_profile` object added to the context, ready for the next step in your flow.