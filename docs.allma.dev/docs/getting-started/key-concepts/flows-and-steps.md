# Key Concept: Flows & Steps

At the heart of Allma are two fundamental building blocks: **Flows** and **Steps**. Understanding their relationship is the key to mastering the platform.

### What is a Flow?

A **Flow** is a complete, versioned definition of a business process. It is a declarative JSON object that describes:
- The **Steps** that make up the process.
- The **order** in which the Steps should be executed.
- The **conditional logic** (`if/else`) that determines the path of execution.
- How data is **mapped** from one step to the next.

Every Flow is identified by a unique `flowId` and can have multiple versions, but only one version can be **Published** (live) at any given time. This ensures a safe and controlled deployment lifecycle.

### What is a Step?

A **Step** is a single, atomic unit of work within a Flow. Each step has a specific `stepType` that determines its function. Allma provides a rich library of built-in step types for common tasks:

- `LLM_INVOCATION`: Call a Large Language Model like GPT or Gemini.
- `API_CALL`: Make an HTTP request to an external service.
- `PARALLEL_FORK_MANAGER`: Process items in an array concurrently.
- `WAIT_FOR_EXTERNAL_EVENT`: Pause the Flow until an external system resumes it.
- `CUSTOM_LAMBDA_INVOKE`: Execute your own custom business logic in an AWS Lambda function.

Each step in a Flow is configured with its own parameters, error handling policies (like retries), and data mappings.

### The Visual Flow Editor

While Flows are defined as JSON under the hood, Allma provides a web-based **Visual Flow Editor** to design and manage them. This canvas allows you to:
- Drag, drop, and connect Steps to build your process visually.
- Configure the parameters for each Step in an intuitive UI.
- Test individual Steps in isolation using the live **Sandbox**, dramatically speeding up development.