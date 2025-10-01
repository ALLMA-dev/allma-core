import { Breadcrumbs, Anchor, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

interface StepDefinitionsBreadcrumbsProps {
  isCreating?: boolean;
  isEditing?: boolean;
  stepName?: string;
}

export function StepDefinitionsBreadcrumbs({ isCreating, isEditing, stepName }: StepDefinitionsBreadcrumbsProps) {
  const items = [
    <Anchor component={Link} to="/step-definitions" key="breadcrumb-steps">
      Step Definitions
    </Anchor>,
  ];

  if (isCreating) {
    items.push(<Text key="breadcrumb-creating">Create New</Text>);
  }
  
  if (isEditing && stepName) {
    items.push(<Text key="breadcrumb-editing">{stepName}</Text>);
  }

  return <Breadcrumbs>{items}</Breadcrumbs>;
}