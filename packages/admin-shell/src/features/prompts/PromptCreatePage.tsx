import { useNavigate } from 'react-router-dom';
import { PromptForm, type PromptFormValues } from './components/PromptForm';
import { useCreatePrompt } from '../../api/promptTemplateService';
import { CreatePromptTemplateInputSchema } from '@allma/core-types';
import { PageContainer } from '@allma/ui-components';
import { PromptsBreadcrumbs } from './components/PromptsBreadcrumbs';
import { useForm, zodResolver } from '@mantine/form';

export function PromptCreatePage() {
  const navigate = useNavigate();
  const createPromptMutation = useCreatePrompt();

  // The form should validate against the data it collects, which is name and description
  const form = useForm<PromptFormValues>({
    initialValues: {
      name: '',
      description: '',
      content: '',
      tags: [],
    },
    validate: zodResolver(CreatePromptTemplateInputSchema),
  });

  const handleSubmit = async (values: PromptFormValues) => {
    // The form data is richer than what the create API needs.
    // We shape the object to match the CreatePromptTemplateInput schema.
    const submissionValues = CreatePromptTemplateInputSchema.parse(values);

    await createPromptMutation.mutateAsync(submissionValues, {
        onSuccess: (data) => {
            // After creating the prompt family, go to the versions list page for it.
            navigate(`/prompts/versions/${data.id}`);
        }
    });
  };

  return (
    <PageContainer 
        title="Create New Prompt Template"
        breadcrumb={<PromptsBreadcrumbs isCreating />}
    >
      <PromptForm
        form={form}
        onSubmit={handleSubmit}
        isSubmitting={createPromptMutation.isPending}
        isEditMode={false}
        submitButtonLabel="Create Prompt"
      />
    </PageContainer>
  );
}
