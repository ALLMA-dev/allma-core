# Key Concept: Serverless Architecture Principles

Allma is built entirely on a **serverless-first AWS stack**. This architectural choice is deliberate, providing immense benefits in scalability, resilience, and operational efficiency. You don't need to manage any servers, and you only pay for what you use.

Here are the core AWS services that power Allma and the roles they play:

-   **AWS Step Functions (The Conductor):** At its heart, Step Functions orchestrates the execution of Flows. It manages the state, transitions between steps, error handling, and parallel processing logic.

-   **AWS Lambda (The Worker):** All business logic and step processing happens inside Lambda functions. Each function has a specific responsibility and is scoped with least-privilege IAM roles for maximum security.

-   **Amazon SQS (The Front Door):** Flows are typically triggered asynchronously via an SQS (Simple Queue Service) queue. This decouples the system that requests a workflow from the orchestration engine, providing durability and resilience. If the platform is busy, messages simply wait in the queue to be processed.

-   **Amazon DynamoDB (The Brain):** All platform configuration and metadata are stored in DynamoDB. This includes all versioned Flow and Prompt definitions, as well as detailed execution logs. We use a single-table design for highly optimized query performance.

-   **Amazon S3 (The Filing Cabinet):** To handle large data payloads efficiently, Allma uses the "Payload Offload" pattern. Large data objects, such as the inputs and outputs of each step or detailed execution traces, are stored in S3. This overcomes service limits and reduces cost.

### High-Level Data Flow

This diagram illustrates how a typical execution travels through the platform:

`Trigger (API/Event) -> SQS Queue -> Lambda Listener -> Step Functions Orchestrator -> Lambda Step Processor -> Data Layer (DynamoDB/S3) -> Egress (SNS/API)`

By building on these managed AWS services, Allma inherits their enterprise-grade reliability and scale, allowing you to run your most critical business processes with confidence.