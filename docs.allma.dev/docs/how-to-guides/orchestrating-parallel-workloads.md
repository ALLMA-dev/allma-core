---
title: Orchestrating Parallel Workloads
sidebar_position: 3
---

# Orchestrating Parallel Workloads

The `PARALLEL_FORK_MANAGER` step is one of Allma's most powerful features, allowing you to process large amounts of data concurrently. It operates in two modes: **In-Memory** for smaller arrays and **S3 Distributed Map** for massive datasets.

---

## Part 1: In-Memory Parallel Processing

This mode is ideal for processing arrays of data that are already in your flow's context, typically up to a few hundred items.

### Goal

To take an array of product IDs, fetch details for each one via an API call in parallel, and collect all the results.

### Step 1: Define the Branch Logic

A parallel step executes a "branch," which is a mini-flow. First, let's define the steps for that branch.

1.  **`get_product_details` (API Call):**
    -   **URL Template:** `https://api.yourstore.com/products/{{currentItem.id}}`
    -   **Key Concept:** Inside a parallel branch, the special variable `currentItem` refers to the item from the source array being processed in that specific branch execution.
2.  **`format_output` (Data Transformation):**
    -   **Module:** `system/compose-object-from-input`
    -   **Input Mappings:**
        -   `id`: `$.currentItem.id`
        -   `name`: `$.steps_output.get_product_details.data.productName`
        -   `price`: `$.steps_output.get_product_details.data.price`
    -   This step shapes the API response into a clean object.

### Step 2: Configure the Parallel Fork Manager

1.  Drag a **Parallel Fork Manager** step onto your canvas.
2.  **Display Name:** `Process Products in Parallel`.
3.  **Items Path:** Set this to the JSONPath of the array you want to iterate over. For this example: `$.initialContextData.productIds`.
4.  **Parallel Branches:** This is where you define the branch workflow.
    -   Click "Add Branch".
    -   **Branch ID:** `process_product_branch`.
    -   **Start Step:** `get_product_details`.
    -   **Steps:** Add the `get_product_details` and `format_output` steps you defined above.
5.  **Aggregation Config:**
    -   **Strategy:** `COLLECT_ARRAY`. This will gather the final output of each branch into a single array.
    -   **Data Path:** `$.` (dollar sign). This tells the aggregator to collect the *entire output* of the last step in the branch (`format_output`).

### Step 3: Map the Aggregated Output

1.  In the **Output Mappings** of the `Process Products in Parallel` step, map the results back to the main context.
    -   **Target Path:** `$.steps_output.processed_products`
    -   **Source JSONPath:** `$.aggregatedData`
    -   The aggregator's output is always placed in a field named `aggregatedData`.

### Step 4: Trigger and Verify

Trigger your flow with a payload containing the array:

```json
{
  "productIds": [
    { "id": 101 },
    { "id": 102 },
    { "id": 103 }
  ]
}
```

In the execution log, you'll see the main `Process Products in Parallel` step. You can click to expand it and view the individual executions for each branch, allowing you to debug each parallel run independently. The final output will show the `processed_products` array in the flow context.

---

## Part 2: S3 Distributed Map for Large-Scale Processing

When you need to process thousands or millions of items, loading them into memory is not feasible. The S3 Distributed Map mode reads items one by one from a file in S3 and processes them in a massively parallel fashion.

### Goal

To process a large manifest file of user records from S3, enriching each one with an API call.

### Step 1: Prepare the S3 Manifest File

The key prerequisite is a **JSON Lines (.jsonl)** file in an S3 bucket. Each line in the file must be a valid, self-contained JSON object.

```json title="s3://my-data-bucket/manifests/users.jsonl"
{"userId": "user-a", "region": "us-east-1"}
{"userId": "user-b", "region": "eu-west-1"}
{"userId": "user-c", "region": "us-east-1"}
```

A common pattern is to use a `DATA_LOAD` step with the `system/ddb-query-to-s3-manifest` module to generate this file dynamically from a database query. This step's output is an **S3 Pointer object**.

### Step 2: Configure the Parallel Fork Manager

The configuration is almost identical to the in-memory version, with one critical difference in the `itemsPath`.

1.  Add a `PARALLEL_FORK_MANAGER` step.
2.  **Items Path:** Point this to the S3 Pointer object from your previous step.
    -   Example JSONPath: `$.steps_output.generate_manifest.manifest`
    -   The context value at this path should look like: `{"_s3_output_pointer": {"bucket": "my-data-bucket", "key": "manifests/users.jsonl"}}`
3.  **Automatic Mode Switch:** Allma automatically detects that the `itemsPath` resolves to an S3 Pointer and switches the execution mode to a distributed map. You don't need to configure anything else.
4.  **Parallel Branches & Aggregation:** Configure your branches and aggregation exactly as you did for the in-memory example. The `currentItem` variable will now refer to each JSON object read from the S3 file (e.g., `{"userId": "user-a", "region": "us-east-1"}`).

When you execute the flow, AWS Step Functions will orchestrate a large-scale distributed map job, providing immense scalability with no extra configuration on your part.