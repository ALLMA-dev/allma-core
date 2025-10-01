---
title: Admin API Overview
---

# Admin API Reference

The Allma Admin API provides a comprehensive set of RESTful endpoints for programmatically managing and interacting with your Allma instance. It is the same API used by the Allma Admin Panel UI.

### Authentication

All endpoints are secured and require a valid JWT bearer token obtained from your configured authentication provider (e.g., AWS Cognito). The token must be included in the `Authorization` header of every request.

```
Authorization: Bearer <your_jwt_token>
```

### Permissions

Access to endpoints is controlled by permissions associated with the authenticated user. Each endpoint documentation specifies the required permission (e.g., `DEFINITIONS_READ`, `DEFINITIONS_WRITE`). If the user's token does not contain the required permission, the API will respond with a `403 Forbidden` error.

### Common Concepts

-   **Versioning:** Resources like Flows and Prompts are versioned. The API provides endpoints to manage both the master record (metadata) and its individual, immutable versions.
-   **Path Parameters:** Dynamic values in the URL path are denoted with curly braces, e.g., `/allma/flows/{flowId}`.
-   **Standard Responses:**
    -   `200 OK`: Request was successful. The body contains the requested resource(s).
    -   `201 Created`: A new resource was successfully created.
    -   `204 No Content`: The request was successful, but there is no data to return (e.g., on successful deletion).
    -   `400 Bad Request`: The request was malformed (e.g., invalid JSON, missing required fields). The response body will contain validation details.
    -   `401 Unauthorized`: The request is missing a valid `Authorization` token.
    -   `403 Forbidden`: The user is authenticated but lacks the required permission for the action.
    -   `404 Not Found`: The requested resource does not exist.
    -   `409 Conflict`: The request could not be completed due to a conflict with the current state of the resource (e.g., trying to delete a published version).
    -   `500 Internal Server Error`: An unexpected error occurred on the server.