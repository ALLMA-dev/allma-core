// packages/allma-admin-shell/src/features/executions/ExecutionsBreadcrumbs.tsx

import { Breadcrumbs, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';

export function ExecutionsBreadcrumbs() {
  const items = [
    <Anchor component={Link} to="/executions" key="breadcrumb-executions">
      Executions List
    </Anchor>,
  ];
  
  return <Breadcrumbs>{items}</Breadcrumbs>;
}
