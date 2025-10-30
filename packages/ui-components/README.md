# @allma/ui-components

[![npm version](https://img.shields.io/npm/v/%40allma%2Fui-components)](https://www.npmjs.com/package/@allma/ui-components)
[![License](https://img.shields.io/npm/l/%40allma%2Fui-components)](https://github.com/ALLMA-dev/allma-core/blob/main/LICENSE)

This package is a library of shared React UI components built with [Mantine](https://mantine.dev/). These components are used to build the Allma Admin Panel and are designed to be composed into custom plugins for extending the Allma UI.

## What is Allma?

**Allma is a serverless, event-driven platform designed to build, execute, and manage complex, AI-powered automated workflows, known as `Flows`.** It acts as a "digital factory" for orchestrating sophisticated business processes, combining data integration, conditional logic, and advanced AI capabilities in a robust, scalable, and observable environment built on AWS.

## Installation

```bash
npm install @allma/ui-components @mantine/core @emotion/react react
```

**Note:** This package has peer dependencies on `@mantine/core`, `@emotion/react`, and `react`, which must be installed in your project.

## Core Usage

You can import and use these components in any React application, but they are most effective when used to build a custom Admin Panel experience with `@allma/admin-shell`.

**Example: Using the `PageContainer` and `CopyableText` components.**

```jsx
import React from 'react';
import { AppShell, MantineProvider } from '@mantine/core';
import { PageContainer, CopyableText } from '@allma/ui-components';

function MyCustomAdminPage() {
  const executionId = 'exec-1234-abcd-5678';

  return (
    <MantineProvider>
      <AppShell>
        <PageContainer
          title="Flow Execution Details"
          rightSection={<CopyableText text={executionId} />}
        >
          <p>
            Here are the details for flow execution ID: {executionId}.
          </p>
          {/* Your other components go here */}
        </PageContainer>
      </AppShell>
    </MantineProvider>
  );
}
```

## Contributing

This package is part of the `allma-core` monorepo. We welcome contributions! Please see our main [repository](https://github.com/ALLMA-dev/allma-core) and [contribution guide](https://docs.allma.dev/docs/community/contribution-guide) for more details.

## License

This project is licensed under the Apache-2.0 License.