import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@allma/ui-components';
import { useCreateStepDefinition } from '../../api/stepDefinitionService';
import { CreateStepDefinitionInput, CreateStepDefinitionInputSchema, StepDefinition, StepType } from '@allma/core-types';
import { StepDefinitionsBreadcrumbs } from './components/StepDefinitionsBreadcrumbs';
import { useForm, zodResolver } from '@mantine/form';
import { StepConfigurationForm } from '../shared/step-form/StepConfigurationForm';

export function StepDefinitionCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateStepDefinition();

  const form = useForm<CreateStepDefinitionInput>({
    initialValues: {
      name: '',
      description: '',
      stepType: StepType.NO_OP,
      customConfig: {},
      inputMappings: {},
      outputMappings: {},
      literals: {},
    },
    validate: zodResolver(CreateStepDefinitionInputSchema),
  });

  const handleSubmit = async (values: StepDefinition) => {
    await createMutation.mutateAsync(values as CreateStepDefinitionInput, {
      onSuccess: () => navigate('/step-definitions'),
    });
  };

  return (
    <PageContainer title="Create New Step Definition" breadcrumb={<StepDefinitionsBreadcrumbs isCreating />}>
      <StepConfigurationForm
        form={form as any}
        onSubmit={handleSubmit as any}
        isSubmitting={createMutation.isPending}
        variant="create-definition"
        submitButtonLabel="Create Step Definition"
        appliedDefinition={null}
      />
    </PageContainer>
  );
}
