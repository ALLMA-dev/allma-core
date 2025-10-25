import { StepType } from '@allma/core-types';

type FieldDocs = { [fieldName: string]: string };
type SectionDocs = {
  general: string;
  fields: FieldDocs;
};

// Using Partial<Record<...>> for step-specific docs makes the type system happy.
export const STEP_DOCUMENTATION: { [key in StepType]?: SectionDocs } & { common: { [key: string]: SectionDocs } } = {
    // Documentation for common sections across all steps
    common: {
        mappings: {
            general: `
### How Mappings Work in Allma

Mappings are the core mechanism for moving data between the central **Flow Context** and individual steps. They use a powerful query language called **JSONPath** to select and shape data.

#### The Flow Context
The Flow Context is a large JSON object that holds all the dynamic data for a flow execution. Think of it as the flow's memory. It has several important top-level keys:
- \`$.\`: The root of the entire context.
- \`$.initialContextData\`: The initial payload that triggered the flow.
- \`$.steps_output\`: An object where the output of each completed step is stored.
- \`$.flow_variables\`: A scratchpad for storing temporary data or flags during execution.
- \`$.currentItem\`: Inside a parallel branch, this refers to the specific item from the array being processed.

#### JSONPath Basics
All paths start with \`$\` representing the root of the context.
- **Dot Notation:** \`$.steps_output.my_step.data\`
- **Bracket Notation:** \`$.steps_output['my_step']['data']\`
- **Array Access:** \`$.my_array[0].content\` (access the first item)
- **Wildcard:** \`$.documents[*].content\` (selects the \`content\` field from every object in the \`documents\` array)
- **Dynamic Paths:** You can build paths dynamically. For example, if \`$.index\` is \`2\`, then \`$.my_array[$.index]\` becomes \`$.my_array[2]\`.
            `,
            fields: {
                inputMappings: `
#### Input Mappings
This defines what data from the **Flow Context** is sent *to* this step as its input.

- **Keys** (on the left): The name of an input field that the step's logic expects (e.g., \`user_query\`). Dot-notation can be used for nested objects.
- **Values** (on the right): A **JSONPath** expression that selects data from the Flow Context (e.g., \`$.initialContextData.query\`).

**Example:**
To pass a user's query to a step, you might have:
\`\`\`json
{
  "user_query": "$.initialContextData.messageContent",
  "convo_id": "$.flow_variables.conversationId"
}
\`\`\`
The step's code will receive an input object like: \`{ "user_query": "Hello, how do I reset my password?", "convo_id": "some-uuid" }\`.
`,
                outputMappings: `
#### Output Mappings
This defines how to take the data *from* this step's output and merge it back into the **Flow Context**. If you don't define any, a default mapping of \`{"$.steps_output.STEP_ID": "$"}\` is used.

- **Keys** (on the left): A **JSONPath** expression specifying where to put the data *in the Flow Context*.
- **Values** (on the right): A **JSONPath** expression that selects data from *this step's output object*.

**Example:**
If a step returns \`{ "finalAnswer": "The sky is blue.", "confidence": 0.95 }\`, you could map it like this:
\`\`\`json
{
  "$.steps_output.answer_generation_result": "$",
  "$.flow_variables.confidence_score": "$.confidence"
}
\`\`\`
This would:
1. Place the entire output object into \`context.steps_output.answer_generation_result\`.
2. Place just the confidence score into \`context.flow_variables.confidence_score\`.
`,
                literals: `
#### Literals
Provides static, hard-coded values to the step's input. It's useful for configuration that doesn't change during the flow.

- **Keys** (on the left): The name of an input field, using dot-notation for nested objects (e.g., \`messageAttributes.source.DataType\`).
- **Values** (on the right): The static value (string, number, boolean, object, array).

**Example:**
To configure a DynamoDB update operation with a static table name:
\`\`\`json
{
  "tableName": "MyUsersTable",
  "updateExpression": "SET #status = :status",
  "expressionAttributeNames": {
    "#status": "status"
  }
}
\`\`\`
`,
                defaultNextStepInstanceId: `
This is the next step to execute if no conditional transitions are met. It's the "happy path" or default route out of this step.
If no conditional transitions are defined, this will always be the next step.
`,
            },
        },
        errorHandling: {
            general: `
### Error Handling & Retries
This section configures how the flow should behave when this step encounters an error. Allma supports multiple layers of error handling for robust workflows.
            `,
            fields: {
                onError: `
This object defines the step's error handling strategy.

- **retries**: Configures retries for **transient** errors (e.g., temporary network issues, API rate limiting). This is handled by the core Step Functions orchestrator.
  - \`count\`: Number of retries (0-5).
  - \`intervalSeconds\`: Wait time before the first retry.
  - \`backoffRate\`: Multiplier for subsequent waits (e.g., 2.0 for exponential backoff).
- **retryOnContentError**: Configures retries specifically for errors caused by **invalid content**, such as an LLM returning malformed JSON when JSON output was expected. This is handled by Allma's internal logic.
  - \`count\`: Number of retries (1-5).
- **fallbackStepInstanceId**: If the step fails permanently (after all retries), the flow will jump to this step instead of failing completely. This allows for graceful failure paths (e.g., sending an error notification).
- **continueOnFailure**: If \`true\`, the flow will ignore the error and proceed to the \`defaultNextStepInstanceId\` as if the step succeeded. The step's output will be empty. Use with caution.
`,
            },
        },
        advanced: {
            general: `
### Advanced Step Controls
This section contains advanced options that control the low-level execution behavior of the step within the Allma orchestrator.
            `,
            fields: {
                delay: `
#### Step Delay
Introduces a pause either before or after the step's execution. Useful for simulating human-like response times, respecting rate limits, or waiting for eventual consistency in external systems.

- **position**: Where to apply the delay: \`before\` or \`after\` (default) the step's logic executes.
- **milliseconds**: A fixed delay time in milliseconds.
- **delayFrom / delayTo**: A random delay between two values (inclusive). Both must be provided.
`,
                disableS3Offload: `
#### Disable S3 Offload
If set to \`true\`, this prevents the step's output from being automatically saved to S3 if it's too large.

**Warning:** Disabling this on a step that can produce large outputs (e.g., >240KB) may cause the entire flow execution to fail due to AWS Step Functions state size limits. Use only if you are certain the output will always be small.
`,
            }
        },
    },

    [StepType.EMAIL_START_POINT]: {
        general: 'Creates a dedicated email address that acts as a starting point for this flow. When an email is sent to this address, a new flow execution will begin.',
        fields: {
            emailAddress: 'The unique email address that will trigger this start point. This must be a valid email address and unique across all flows.',
            keyword: 'An optional, unique code to distinguish between multiple start points for the same email address. The flow will start here if this keyword is found in the email body.',
        },
    },

    [StepType.EMAIL]: {
        general: 'Sends an email using AWS Simple Email Service (SES). All fields support Handlebars templating to insert dynamic data from the flow context.',
        fields: {
            from: 'The sender\'s email address. This address must be a verified identity in your AWS SES account.',
            to: 'The recipient\'s email address. This should be a single email address string (in quotes), or an array of email strings.',
            replyTo: 'An optional email address to be used for replies. This should be a single email address string (in quotes), or an array of email strings.',
            subject: 'The subject line of the email.',
            body: 'The body of the email. Both plain text and HTML are supported.',
        },
    },

    [StepType.SQS_SEND]: {
        general: 'Sends an asynchronous message to an AWS Simple Queue Service (SQS) queue.',
        fields: {
            queueUrl: 'The URL of the target SQS queue. Supports Handlebars templating.',
            payload: 'The message body to send. This should be a valid JSON object. It is often constructed using Input Mappings from the flow context.',
            messageGroupId: '(For FIFO queues only) A string that specifies that a message belongs to a specific message group.',
            messageDeduplicationId: '(For FIFO queues only) A token used for deduplication of sent messages.',
        },
    },
    [StepType.SNS_PUBLISH]: {
        general: 'Publishes a message to an AWS Simple Notification Service (SNS) topic.',
        fields: {
            topicArn: 'The ARN of the target SNS topic. Supports Handlebars templating.',
            payload: 'The message body to send. This should be a valid JSON object. It is often constructed using Input Mappings from the flow context.',
            messageAttributes: 'A JSON object of key-value pairs for SNS message attributes. Used for filtering and routing messages.',
        },
    },

    [StepType.LLM_INVOCATION]: {
        general: 'Invokes a Large Language Model (LLM) to generate text, classify content, or produce structured JSON based on a dynamic prompt.',
        fields: {
            llmProvider: `The AI provider to use, such as \`AWS_BEDROCK\` or \`GEMINI\`.`,
            modelId: `The specific model identifier from the chosen provider (e.g., \`anthropic.claude-3-sonnet-20240229-v1:0\` for Bedrock, or \`gemini-1.5-pro-latest\` for Gemini).`,
            promptTemplateId: `The ID of a versioned, reusable Prompt Template to use for this invocation. The flow will automatically load the latest **published** version of this template.`,
            directPrompt: `A raw prompt string entered directly into the step. If provided, this **overrides** the \`promptTemplateId\`. Useful for simple, one-off prompts. Supports Handlebars templating.`,
            inferenceParameters: `
#### Inference Parameters
Controls the generation behavior of the LLM.

- \`temperature\`: (Number, 0-2) Controls randomness. Lower values are more deterministic, higher values are more creative.
- \`maxOutputTokens\`: (Integer) The maximum number of tokens to generate.
- \`topP\`: (Number, 0-1) Nucleus sampling. The model considers tokens with the highest probability mass.
- \`topK\`: (Integer) The model considers only the top K most likely tokens.
- \`seed\`: (Integer) Makes the output deterministic for the same prompt and parameters (if supported by the model).
`,
            templateContextMappings: `
#### Template Context Mappings
Builds dynamic variables for your prompt template by collecting and formatting data from the Flow Context. Each key in this object becomes a variable name (e.g., \`chat_history\`) available in your prompt (e.g., \`{{chat_history}}\`).

- \`sourceJsonPath\`: **(Required)** The JSONPath to the source data in the Flow Context.
- \`formatAs\`: How to format the extracted data.
    - \`RAW\`: (Default) Use the value as-is.
    - \`JSON\`: Convert the value (e.g., an array or object) into a JSON string.
    - \`CUSTOM_STRING\`: For arrays of objects. Formats each object using \`itemTemplate\` and joins them with \`joinSeparator\`.
- \`selectFields\`: An array of field names to keep from an object or an array of objects.
- \`itemTemplate\`: (Required for \`CUSTOM_STRING\`) A Handlebars template string applied to each item. Use \`{{this.fieldName}}\`.
- \`joinSeparator\`: String to join items when using \`CUSTOM_STRING\`. Defaults to a newline.
`,
            customConfig: `
#### Instance Overrides (Custom Config)
Provider-specific or advanced settings.

- \`jsonOutputMode\`: (boolean) Set to \`true\` to instruct the LLM provider to return a valid JSON object. Your prompt must explicitly ask for JSON. The step will automatically parse the response. If parsing fails, it can trigger the \`retryOnContentError\` policy.
- \`anthropic_version\`: (string, Bedrock/Anthropic only) Specify a different Anthropic version string, e.g., \`bedrock-2023-05-31\`.
`,
            securityValidatorConfig: `
#### Security Validator
An integrated check to prevent prompt leaking or harmful content.
- \`forbiddenStrings\`: A list of case-insensitive strings. If any of these appear in the LLM's output, the step will fail.
`,
            outputValidation: `
#### Output Validation
Validates the structure of the LLM's output, which is crucial when using \`jsonOutputMode\`.
- \`requiredFields\`: An array of JSONPath strings. The step checks if each path exists and is not null/undefined in the LLM's parsed JSON output. If any check fails, it can trigger the \`retryOnContentError\` policy.
`,
        },
    },
    [StepType.CUSTOM_LAMBDA_INVOKE]: {
        general: 'Invokes one of your custom AWS Lambda functions to perform specialized business logic. The Lambda receives the step\'s input and is expected to return a JSON object as its output. This is the primary pattern for extending Allma with proprietary logic.',
        fields: {
            lambdaFunctionArnTemplate: 'The full ARN of the Lambda function to invoke. This field supports Handlebars templating (e.g., `arn:aws:lambda:us-east-1:123:function:my-function-{{flow_variables.stage}}`) to dynamically select a function.',
            moduleIdentifier: 'A string identifier that is passed to your Lambda function within the event payload. This allows a single Lambda function to act as a router for multiple tasks. Your Lambda code can use this identifier to decide which block of logic to execute.',
            payloadTemplate: `Defines the JSON payload to send to the Lambda function. This is a powerful feature that allows you to construct the exact input your function expects by mapping data from the flow context.`,
            customConfig: 'This step type does not use this field. All configuration is defined in the top-level fields like `lambdaFunctionArnTemplate` and `payloadTemplate`.'
        },
    },
    [StepType.DATA_LOAD]: {
        general: 'Loads data from an external source (like S3 or DynamoDB) and places it into the step\'s output, making it available for subsequent steps.',
        fields: {
            moduleIdentifier: `Specifies which data loading module to use. Each module has its own required configuration provided via the **Custom Config** field below.`,
            customConfig: `
#### Module Configuration
Defines the parameters for the selected module. Fields here can use Handlebars templating (e.g., \`{{flowExecutionId}}\`).

- **\`system/s3-data-loader\`**: Fetches an object from S3.
  - \`sourceS3Uri\`: (string) The full S3 URI (e.g., \`s3://my-bucket/path/to/file.txt\`).
  - \`outputFormat\`: (string) How to return the content: \`JSON\`, \`TEXT\` (default), or \`RAW_BUFFER\`.
  - \`onMissing\`: (string) Behavior if the file doesn't exist: \`FAIL\` (default) or \`IGNORE\`.

- **\`system/dynamodb-data-loader\`**: Performs a DynamoDB read operation.
  - \`operation\`: (string) \`GET\`, \`QUERY\`, or \`SCAN\`.
  - \`tableName\`: (string) The name of the table.
  - \`key\`: (object, for \`GET\`) The primary key object.
  - \`keyConditionExpression\`: (string, for \`QUERY\`) The query expression.
  - \`expressionAttributeValues\`: (object) The values for placeholders in expressions.

- **\`system/ddb-query-to-s3-manifest\`**: Queries a DynamoDB table for many items and writes them to a JSONL file in S3. The output is an S3 Pointer, ideal for a distributed parallel step.

- **\`system/sqs-get-queue-attributes\`**: Fetches attributes for an SQS queue.
  - \`queueUrl\`: (string) The URL of the queue.
  - \`attributeNames\`: (array) Attributes to fetch (e.g., \`["ApproximateNumberOfMessages"]\`).

- **\`system/sqs-receive-messages\`**: Receives messages from an SQS queue.
  - \`queueUrl\`: (string) The URL of the queue.
  - \`maxNumberOfMessages\`: (number) Max messages to receive (1-10).
  - \`deleteMessages\`: (boolean) If \`true\` (default), messages are deleted after being received.
`,
        },
    },
    [StepType.DATA_SAVE]: {
        general: 'Saves or sends data from the flow context to an external system, like updating a DynamoDB table or saving a file to S3.',
        fields: {
            moduleIdentifier: `Specifies which data saving module to use. Each module has its own required configuration provided via the **Custom Config** field below.`,
            customConfig: `
#### Module Configuration
Defines the parameters for the selected module. Fields here can use Handlebars templating. Dynamic data (like the content to save) should be passed via **Input Mappings**.

- **\`system/s3-data-saver\`**: Saves content to an S3 object.
  - \`destinationS3UriTemplate\`: (string) S3 URI for the destination (e.g., \`s3://my-bucket/results/{{flowExecutionId}}.json\`).
  - \`contentType\`: (string) The object's content type (e.g., \`application/json\`).
  - **Note:** The content to save must be mapped to the \`contentToSave\` field via **Input Mappings**.

- **\`system/dynamodb-update-item\`**: Performs a DynamoDB \`UpdateItem\` operation.
  - \`tableName\`: (string) The name of the table.
  - \`key\`: (object) The primary key of the item to update.
  - \`updateExpression\`: (string) The DynamoDB update expression.
  - \`expressionAttributeValues\`: (object) Values for placeholders.

- **\`system/dynamodb-query-and-update\`**: Atomically finds items via a query and applies an update.
  - \`query\`: (object) Defines the query to find items.
  - \`update\`: (object) Defines the update expression to apply.
  - \`keyAttributes\`: (array, **Recommended**) Primary key attributes of the table (e.g., \`["pk", "sk"]\`) to improve performance.
`,
        },
    },
    [StepType.DATA_TRANSFORMATION]: {
        general: 'Performs common data manipulation tasks within the flow, such as creating objects, calculating dates, or aggregating arrays.',
        fields: {
            moduleIdentifier: `Specifies which transformation module to use.`,
            customConfig: `
#### Module Configuration
This step type generally receives its configuration directly from **Input Mappings** rather than this field. For example, the \`date-time-calculator\` expects \`baseTime\`, \`offsetSeconds\`, and \`operation\` to be mapped via inputs. This field is reserved for modules that require static configuration.
`,
        },
    },
    [StepType.CUSTOM_LOGIC]: {
        general: 'Executes a custom business logic module that is part of an external Allma module. This is used for deeply integrated, reusable business logic.',
        fields: {
            moduleIdentifier: 'The unique identifier for the custom logic module to execute (e.g., `my-module/calculate-premium`).',
            customConfig: 'A JSON object containing static configuration for the module. Dynamic data should be passed via Input Mappings.',
        },
    },
    [StepType.START_SUB_FLOW]: {
        general: 'Starts another Allma Flow as a child process. This allows you to create modular, reusable workflows.',
        fields: {
            subFlowDefinitionId: 'The ID of the flow definition to start.',
            subFlowVersion: 'The version to execute (e.g., `1` or `LATEST_PUBLISHED`).',
            subFlowExecutionMode: `
- **SYNC**: The parent flow pauses and waits for the sub-flow to complete. The sub-flow's final context is returned as the output of this step.
- **ASYNC**: The parent flow triggers the sub-flow and immediately continues to the next step without waiting for it to finish.
`,
            inputMappingsToSubFlow: 'Maps data from the parent flow\'s context to the sub-flow\'s `initialContextData`.',
            customConfig: 'This step type does not have any specific custom configuration fields.'
        },
    },
    [StepType.START_FLOW_EXECUTION]: {
        general: 'Triggers a new, completely independent Allma flow execution. This is an asynchronous, "fire-and-forget" operation.',
        fields: {
            moduleIdentifier: 'The module to use. Should be set to `system/start-flow-execution`.',
            customConfig: `
#### Module Configuration
The configuration for this step is built by combining this \`customConfig\` with dynamic values from **Input Mappings**. The final combined object must include:
- \`flowDefinitionId\`: The ID of the flow to trigger.
- \`flowVersion\`: The version to trigger (e.g., \`LATEST_PUBLISHED\`).
- \`initialContextData\`: The JSON object to use as the new flow's starting context.
`,
        },
    },
    [StepType.WAIT_FOR_EXTERNAL_EVENT]: {
        general: 'Pauses the flow execution indefinitely until an external system resumes it by calling the secure Allma Resume API. Ideal for human-in-the-loop workflows or waiting for long-running asynchronous jobs.',
        fields: {
            correlationKeyTemplate: 'A template string that generates a unique business key for this specific wait state (e.g., `user-response:{{flow_variables.userId}}`). The Resume API uses this key to find the correct paused flow. Supports Handlebars templating.',
            maxWaitTimeSeconds: 'The maximum time (in seconds) the flow will wait for the resume event before timing out and failing. Defaults to 7 days.',
            customConfig: 'This step type does not have any specific custom configuration fields.'
        },
    },
    [StepType.PARALLEL_FORK_MANAGER]: {
        general: 'Executes one or more branches of logic concurrently. This is the cornerstone of parallel processing in Allma.',
        fields: {
            itemsPath: `
A **JSONPath** expression pointing to the data to be processed in parallel. This determines the execution mode:

- **In-Memory (Map State)**: If the path points to an array in the Flow Context (e.g., \`$.steps_output.my_step.documents\`), the step will create a branch for each item in the array. Best for dozens or hundreds of items.
- **S3 Distributed Map**: If the path points to an **S3 Pointer object** (from a step like \`ddb-query-to-s3-manifest\`), the step will trigger a massively parallel distributed map job. The S3 object must be a JSONL file. Best for thousands or millions of items.
`,
            parallelBranches: `Defines the sub-workflows (branches) to be executed. For each item in \`itemsPath\`, the flow will evaluate the conditions on these branches and execute the first one that matches. Inside the branch, the item being processed is available at \`$.currentItem\`.`,
            aggregationConfig: `
Configures how the results from all the parallel branches are combined.

- \`strategy\`: Can be \`COLLECT_ARRAY\` (default), \`MERGE_OBJECTS\`, or \`SUM\`.
- \`dataPath\`: A JSONPath to extract a specific piece of data from each branch's output before aggregating. Recommended to prevent state bloat.
- \`failOnBranchError\`: If \`true\` (default), the entire parallel step fails if any single branch fails.
- \`maxConcurrency\`: (In-Memory only) Limits how many branches run at the same time.
`,
            customConfig: 'This step type does not have any specific custom configuration fields. All parameters are defined at the top level of the step.'
        },
    },
    [StepType.API_CALL]: {
        general: 'Makes a synchronous HTTP request to an external API and places the response into the step\'s output. The output contains `{ status, headers, data }`.',
        fields: {
            apiUrlTemplate: `Defines the URL for the API call. Supports Handlebars templating for dynamic path parameters.
\`\`\`json
{
  "template": "https://api.example.com/users/{{userId}}",
  "contextMappings": {
    "userId": { "sourceJsonPath": "$.flow_variables.user_id" }
  }
}
\`\`\``,
            apiHttpMethod: 'The HTTP method to use (`GET`, `POST`, `PUT`, etc.).',
            apiStaticHeaders: 'A JSON object of headers that are always sent with the request.',
            apiHeadersTemplate: 'A JSON object for creating dynamic headers. Keys are header names, values are JSONPaths to the data in the flow context.',
            requestBodyTemplate: 'A template for building a JSON request body. Uses the same powerful context mapping as the LLM Invocation step.',
            customConfig: `
#### Instance Overrides (Custom Config)
Advanced settings for the HTTP request.

- \`timeoutMs\`: The request timeout in milliseconds (default: 10000).
- \`requestBodyPath\`: An alternative to \`requestBodyTemplate\`. Provide a single JSONPath to an object in the context that will be used as the entire request body.
`,
        },
    },
    [StepType.POLL_EXTERNAL_API]: {
        general: 'Repeatedly calls an API endpoint until a specific success or failure condition is met. The parent flow pauses and waits for the polling to complete.',
        fields: {
            apiCallDefinition: 'Defines the API endpoint to call, including URL, method, and headers. Same structure as the API Call step.',
            pollingConfig: `
- \`intervalSeconds\`: The time to wait between each API call.
- \`maxAttempts\`: The maximum number of times to poll before the step fails.
`,
            exitConditions: `
Defines when the polling loop should stop. These are JSONPath expressions evaluated against the API response body.
- \`successCondition\`: If this path resolves to a truthy value, the step succeeds.
- \`failureCondition\`: If this path resolves to a truthy value, the step fails.
`,
            customConfig: 'This step type does not have any specific custom configuration fields.'
        },
    },
    [StepType.NO_OP]: {
        general: 'A "No Operation" step. It does nothing except pass its input directly to its output. Useful as a starting point, a placeholder, or for merging branches of a flow.',
        fields: {
            customConfig: 'This step type does not have any specific custom configuration fields.'
        },
    },
    [StepType.END_FLOW]: {
        general: 'Immediately terminates the current execution path of the flow. If this step is in the main path, the entire flow will stop and finalize. If it\'s in a parallel branch, only that branch will stop.',
        fields: {
            customConfig: 'This step type does not have any specific custom configuration fields.'
        },
    },
};
