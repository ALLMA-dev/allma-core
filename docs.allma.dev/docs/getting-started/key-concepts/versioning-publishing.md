# Key Concept: Versioning & Publishing

In any production system, making changes safely and predictably is critical. Allma enforces a disciplined development and deployment lifecycle through its built-in versioning system.

Every Flow and Prompt Template in Allma has versions. You can never modify the "live" version directly.

### The Lifecycle: Draft -> Published

1.  **Creating a Draft:** When you create a new Flow or edit an existing one, you are creating a new **`Draft`** version. This is your personal development sandbox. You can make any changes you want to a `Draft` without affecting the live, production version.

2.  **Iterating and Testing:** You can test `Draft` versions of your Flows by triggering them with a specific version number. The powerful **Sandbox** feature in the Flow Editor also allows you to test individual steps of your draft in isolation.

3.  **Publishing a Version:** Once you are confident that your `Draft` version is working correctly, you can **Publish** it. This action does two things:
    - It marks the selected version as the single, official **`Published`** version.
    - It archives the previously `Published` version, preserving its history.

### How It Works in Practice

- **Only one version can be `Published` at a time.** This is the version that will be executed by default when a Flow is triggered without specifying a version number.
- You can have multiple `Draft` versions of a Flow, allowing different team members to work on different features simultaneously.
- The Admin Panel provides a clear view of all versions, with the ability to visually **diff** the changes between any two versions.

This `Draft` -> `Published` lifecycle provides critical governance and safety, preventing accidental changes to production workflows and ensuring a complete, auditable history of every change made to your business processes.