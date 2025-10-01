---
title: API Call
sidebar_position: 2
---

# `API_CALL`

### Purpose

Makes a synchronous HTTP request to an external API and places the full response (`{ status, headers, data }`) into the step's output. It supports dynamic URLs, headers, and request bodies.

---

### Configuration Parameters

| Parameter               | Type     | Required | Description                                                                                                                                                         |
| ----------------------- | -------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiHttpMethod`         | `string` |   Yes    | The HTTP method to use (`GET`, `POST`, `PUT`, `DELETE`, etc.).                                                                                                      |
| `apiUrlTemplate`        | `object` |   Yes    | Defines the URL for the API call. Contains a `template` string with Handlebars variables and `contextMappings` to provide values for those variables.                 |
| `apiStaticHeaders`      | `object` |    No    | A JSON object of headers that are always sent with the request (e.g., `{"Content-Type": "application/json"}`).                                                      |
| `apiHeadersTemplate`    | `object` |    No    | A JSON object for creating dynamic headers. Keys are header names, and values are Handlebars templates (e.g., `{"Authorization": "Bearer {{api_key}}"}`).         |
| `requestBodyTemplate`   | `object` |    No    | A template for building a JSON request body, using the same powerful context mapping as the `LLM_INVOCATION` step.                                                  |
| `customConfig.timeoutMs`| `number` |    No    | The request timeout in milliseconds (default: 10000).                                                                                                               |
| `customConfig.requestBodyPath`| `string`|    No    | An alternative to `requestBodyTemplate`. Provide a single JSONPath to an object in the context that will be used as the entire request body.                 |

---

### Input & Output

#### Input Mappings

Use `inputMappings` to provide variables for the Handlebars templates in `apiHeadersTemplate` and `requestBodyTemplate`.

**Example:**
To provide an API key for the `Authorization` header:
```json
"inputMappings": {
  "api_key": "$.initialContextData.secrets.myApiKey"
}
```

#### Output Schema

The step's output is always a JSON object with this structure:
```json
{
  "status": 200,
  "headers": {
    "content-type": "application/json",
    ...
  },
  "data": {
    "user_id": 123,
    "name": "Jane Doe"
  }
}
```

**Output Mapping Example:**
To save just the response body and the status code to the flow context:
```json
"outputMappings": {
  "$.steps_output.user_profile": "$.data",
  "$.flow_variables.user_api_status": "$.status"
}
```

---

### Full JSON Example

This example fetches a user profile using a dynamic user ID in the URL and an auth token from the context.

```json
"fetch_user_profile": {
  "stepInstanceId": "fetch_user_profile",
  "displayName": "Fetch User Profile from API",
  "stepType": "API_CALL",
  "apiHttpMethod": "GET",
  "apiUrlTemplate": {
    "template": "https://api.myapp.com/v1/users/{{user_id}}",
    "contextMappings": {
      "user_id": { "sourceJsonPath": "$.initialContextData.userId" }
    }
  },
  "apiHeadersTemplate": {
    "Authorization": "Bearer {{auth_token}}"
  },
  "inputMappings": {
    "auth_token": "$.flow_variables.authToken"
  },
  "outputMappings": {
    "$.steps_output.user_profile_data": "$.data"
  },
  "onError": {
    "retries": {
      "count": 3,
      "intervalSeconds": 2,
      "backoffRate": 1.5
    }
  },
  "defaultNextStepInstanceId": "process_profile"
}
```