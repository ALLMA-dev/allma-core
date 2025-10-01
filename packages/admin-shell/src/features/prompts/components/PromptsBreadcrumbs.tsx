// packages/allma-admin-shell/src/features/prompts/components/PromptsBreadcrumbs.tsx

import { Breadcrumbs, Anchor, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

interface PromptsBreadcrumbsProps {
  promptId?: string;
  promptName?: string;
  version?: string;
  isEditing?: boolean;
  isCreating?: boolean;
  isComparing?: boolean;
}

export function PromptsBreadcrumbs({ promptId, promptName, version, isEditing, isCreating, isComparing }: PromptsBreadcrumbsProps) {
  const items = [
    <Anchor component={Link} to="/prompts" key="breadcrumb-prompts">
      Prompts
    </Anchor>,
  ];

  if (isCreating) {
    items.push(<Text key="breadcrumb-creating">Create New</Text>);
  }

  if (promptId && promptName) {
    items.push(
      <Anchor component={Link} to={`/prompts/versions/${promptId}`} key={`breadcrumb-${promptId}`}>
        {promptName}
      </Anchor>
    );
  }

  if (version && isEditing) {
    items.push(<Text key={`breadcrumb-editor-${version}`}>Editor (v{version})</Text>);
  }

  if (isComparing) {
    items.push(<Text key="breadcrumb-comparing">Compare Versions</Text>);
  }
  
  return <Breadcrumbs>{items}</Breadcrumbs>;
}