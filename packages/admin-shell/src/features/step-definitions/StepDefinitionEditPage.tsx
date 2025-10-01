import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '@mantine/core';
import { PageContainer } from '@allma/ui-components';
import { useGetStepDefinition, useUpdateStepDefinition } from '../../api/stepDefinitionService';
import { UpdateStepDefinitionInput, StepDefinition, UpdateStepDefinitionInputSchema } from '@allma/core-types';
import { StepDefinitionsBreadcrumbs } from './components/StepDefinitionsBreadcrumbs';
import { useForm, zodResolver } from '@mantine/form';
import { useEffect } from 'react';
import { StepConfigurationForm } from '../shared/step-form/StepConfigurationForm';

export function StepDefinitionEditPage() {
  const { stepDefinitionId } = useParams<{ stepDefinitionId: string }>();
  const navigate = useNavigate();

  const { data: stepDef, isLoading, error } = useGetStepDefinition(stepDefinitionId);
  const updateMutation = useUpdateStepDefinition();

  const form = useForm<StepDefinition>({
    // Initial values are now correctly set to an empty object shape
    // to prevent issues with controlled/uncontrolled components.
    initialValues: {
      id: '',
      name: '',
      description: '',
      stepType: 'NO_OP' as any,
      createdAt: '',
      updatedAt: '',
      version: 1,
    },
    validate: zodResolver(UpdateStepDefinitionInputSchema)
  });

  useEffect(() => {
    // This effect now reliably populates the form from fetched data.
    if (stepDef) {
        form.setValues(stepDef);
        form.resetDirty();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepDef]);

  const handleSubmit = async (values: StepDefinition) => {
    if (!stepDefinitionId) return;
    await updateMutation.mutateAsync({ id: stepDefinitionId, data: values as UpdateStepDefinitionInput }, {
      onSuccess: () => navigate('/step-definitions'),
    });
  };

  if (error) return <PageContainer title="Error"><Alert color="red">{error.message}</Alert></PageContainer>;

  return (
    <PageContainer
      title={`Edit: ${stepDef?.name || '...'}`}
      breadcrumb={<StepDefinitionsBreadcrumbs isEditing stepName={stepDef?.name} />}
      loading={isLoading}
    >
      {stepDef && (
        <StepConfigurationForm
          form={form as any}
          onSubmit={handleSubmit as any}
          isSubmitting={updateMutation.isPending}
          variant="edit-definition"
          submitButtonLabel="Save Changes"
          appliedDefinition={null}
        />
      )}
    </PageContainer>
  );
}
