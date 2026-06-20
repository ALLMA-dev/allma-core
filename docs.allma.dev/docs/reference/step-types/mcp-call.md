---
title: MCP_CALL
sidebar_position: 3.5
---

# `MCP_CALL`

### Purpose

Invokes a tool on a configured **MCP (Model Context Protocol) server connection**. This lets a flow call out to any external capability exposed by an MCP server — search, data retrieval, side-effecting actions, and more — without writing custom integration code.

The step references a stored MCP connection by `mcpConnectionId`, names the remote tool to run via `toolName`, and builds that tool's argument object from `inputMappings` and `literals`. Under the hood, Allma issues a JSON-RPC 2.0 `tools/call` request to the connection's server URL, attaching credentials resolved from the connection's authentication configuration.

:::info MCP Connection Required
`mcpConnectionId` must reference an MCP connection that has already been registered in Allma (server URL + authentication). If the connection ID cannot be resolved, the step fails permanently.
:::

---

### Configuration Parameters

| Parameter         | Type     | Required | Description                                                                                                                              |
| ----------------- | -------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `mcpConnectionId` | `string` |   Yes    | The ID of a stored MCP connection. Defines the MCP server URL and the authentication used to reach it.                                    |
| `toolName`        | `string` |   Yes    | The name of the tool to invoke on the MCP server (as exposed by that server's `tools/list`). Sent as the `name` of the `tools/call` request. |
| `inputMappings`   | `object` |    No    | Maps data from the flow context into the tool's argument object. See [Input Mappings](#input-mappings).                                   |
| `literals`        | `object` |    No    | Static key/value pairs merged into the tool's argument object. See [Literals](#literals).                                                |

---

### Input & Output

#### Input Mappings

The combined result of `inputMappings` and `literals` forms the **argument object** passed to the MCP tool (the JSON-RPC `params.arguments`). Keys are dot-notation paths on the argument object; values are JSONPath expressions resolved against the flow context.

**Input Mapping Example:**
To pass a search query pulled from a previous step and a result limit from the initial context:
```json
"inputMappings": {
  "query": "$.steps_output.build_query.text",
  "max_results": "$.initialContextData.limit"
}
```
The MCP tool would be called with arguments like:
```json
{
  "query": "quarterly revenue trends",
  "max_results": 10
}
```

#### Literals

Use `literals` for static argument values that do not depend on the flow context. They are merged into the same argument object as the mapped inputs:
```json
"literals": {
  "language": "en",
  "include_metadata": true
}
```

#### Output Schema

The step's output is an object with a single `result` field containing the raw JSON-RPC `result` returned by the MCP server's `tools/call` response. The exact structure of `result` is defined by the specific MCP tool that was invoked. MCP tool results conventionally include a `content` array, but the precise fields depend entirely on the tool — treat `result` as the tool's response.

```json
{
  "result": {
    // The tool's response, exactly as returned by the MCP server.
    // Shape is defined by the invoked tool. A typical MCP tool result looks like:
    "content": [
      { "type": "text", "text": "..." }
    ]
  }
}
```

**Output Mapping Example:**
To capture the tool's response into a flow variable:
```json
"outputMappings": {
  "$.flow_variables.mcp_result": "$.result"
}
```

---

### Full JSON Example

This example calls a `web_search` tool on a registered MCP connection, building the tool arguments from a mix of mapped input and static literals, then stores the tool's response in `flow_variables`.

```json
"run_web_search": {
  "stepInstanceId": "run_web_search",
  "displayName": "Search the Web via MCP",
  "stepType": "MCP_CALL",
  "mcpConnectionId": "mcp-conn-search-prod",
  "toolName": "web_search",
  "inputMappings": {
    "query": "$.steps_output.build_query.text"
  },
  "literals": {
    "max_results": 5,
    "language": "en"
  },
  "outputMappings": {
    "$.flow_variables.search_results": "$.result"
  },
  "onError": {
    "retries": { "count": 2, "intervalSeconds": 5 }
  },
  "defaultNextStepInstanceId": "summarize_results"
}
```
