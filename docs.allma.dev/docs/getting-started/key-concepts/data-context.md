# Key Concept: The Data Context

The **Data Context** is the central nervous system of every Flow execution. It is a single, evolving JSON object that carries state and data throughout the entire lifecycle of a workflow.

### `currentContextData`

The official name for the Data Context object within a Flow is `currentContextData`.

- **Initialization:** When a Flow is triggered, the initial payload you provide becomes the starting `currentContextData`.
- **Evolution:** As each Step executes, its output is merged back into `currentContextData`. This means the context grows and changes, accumulating results and making them available to all subsequent steps.
- **Inspection:** The Allma Admin Panel allows you to inspect the exact state of `currentContextData` before and after every single step of an execution, providing complete visibility into your data's journey.

### Mappings & JSONPath

Allma doesn't just pass the entire, massive `currentContextData` object to every step. That would be inefficient and create tightly coupled steps. Instead, we use **mappings** to precisely control what data a step receives as input and what data it contributes back to the context.

To select and shape the data, Allma uses **JSONPath**, a standardized query language for JSON.

- **`inputMappings`**: This configuration on a Step defines which parts of `currentContextData` are extracted and shaped into the `input` payload for that specific step.
- **`outputMappings`**: This configuration defines how the `output` from the step is merged back into the `currentContextData`, making its results available for the rest of the flow.

#### Example:

Imagine your `currentContextData` looks like this after a step that loaded a user profile:
```json
{
  "userId": "u-123",
  "profile": {
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "rawApiResponse": { "... a large object ..." }
  }
}
```

An `LLM_INVOCATION` step might need to generate a welcome email. Its `inputMappings` could look like this:

```json
{
  "customerName": "$.profile.name",
  "emailAddress": "$.profile.email"
}
```

Allma would use these JSONPath expressions to create a clean `input` object for the LLM step, shielding it from the complexity of the full context:

```json
{
  "customerName": "Jane Doe",
  "emailAddress": "jane.doe@example.com"
}
```

This mapping mechanism is fundamental to building clean, maintainable, and decoupled workflows in Allma.