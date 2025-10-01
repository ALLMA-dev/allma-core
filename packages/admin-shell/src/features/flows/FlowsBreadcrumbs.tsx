import { Breadcrumbs, Anchor, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

interface FlowsBreadcrumbsProps {
  flowId?: string;
  flowName?: string;
  isEditing?: boolean;
}

export function FlowsBreadcrumbs({ flowId, flowName, isEditing }: FlowsBreadcrumbsProps) {
  const items = [
    <Anchor component={Link} to="/flows" key="breadcrumb-flows">
      Flows
    </Anchor>,
  ];

  if (flowId && flowName) {
      if (isEditing) {
        items.push(
            <Anchor component={Link} to={`/flows/versions/${flowId}`} key={`breadcrumb-versions-${flowId}`}>
                {flowName}
            </Anchor>
        );
      } else {
        items.push(<Text key={`breadcrumb-flowName-${flowId}`}>{flowName}</Text>);
      }
  }

  return <Breadcrumbs>{items}</Breadcrumbs>;
}