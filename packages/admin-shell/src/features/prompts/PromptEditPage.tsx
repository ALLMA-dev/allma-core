import { useParams, useNavigate } from 'react-router-dom';
import { LoadingOverlay, Text, Alert } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useForm, zodResolver } from '@mantine/form';
import { useEffect } from 'react';

import { PromptForm, type PromptFormValues } from './components/PromptForm';
import { useGetPromptByVersion, useUpdatePromptVersion } from '../../api/promptTemplateService';
import { PageContainer } from '@allma/ui-components';
import { PromptsBreadcrumbs } from './components/PromptsBreadcrumbs';
import { PromptPreviewModal } from './components/PromptPreviewModal';
import { UpdatePromptTemplateInputSchema } from '@allma/core-types';

export function PromptEditPage() {
  const { promptId, versionNumber } = useParams<{ promptId: string; versionNumber: string }>();
  const navigate = useNavigate();
  const { data: prompt, isLoading: isLoadingPrompt, error: promptError } = useGetPromptByVersion(promptId, versionNumber);
  const updatePromptMutation = useUpdatePromptVersion();
  const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false);

  const form = useForm<PromptFormValues>({
    initialValues: {
      name: '',
      description: '',
      content: '',
      tags: [],
    },
    validate: zodResolver(UpdatePromptTemplateInputSchema),
  });

  // Effect to populate the form once the prompt data is fetched.
  useEffect(() => {
    if (prompt) {
      form.setValues({
        name: prompt.name || '',
        description: prompt.description || '',
        content: prompt.content || '',
        tags: prompt.tags || [],
      });
      // Reset Mantine's dirty state so the form is considered "clean" when it opens.
      form.resetDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  const handleSubmit = async (values: PromptFormValues) => {
    if (!promptId || !versionNumber) return;

    // The 'values' from the form contain all the necessary editable fields.
    // We explicitly parse the values to ensure they match the expected schema.
    const submissionValues = UpdatePromptTemplateInputSchema.parse(values);

    const updatePayload = {
      id: promptId,
      version: Number(versionNumber),
      ...submissionValues,
    };

    await updatePromptMutation.mutateAsync(updatePayload, {
      onSuccess: () => {
        // Navigate back to the versions list page on successful save.
        navigate(`/prompts/versions/${promptId}`);
      }
    });
  };

  if (isLoadingPrompt) return <PageContainer title="Edit Prompt Template"><LoadingOverlay visible /></PageContainer>;
  if (promptError) return <PageContainer title="Edit Prompt Template"><Text color="red">Error loading prompt: {promptError.message}</Text></PageContainer>;
  if (!prompt) return <PageContainer title="Edit Prompt Template"><Text>Prompt template not found.</Text></PageContainer>;

  return (
    <>
      <PageContainer 
        title={prompt.isPublished ? `Viewing Prompt: ${prompt.name}` : `Editing Prompt: ${prompt.name}`}
        breadcrumb={<PromptsBreadcrumbs promptId={promptId} promptName={prompt.name} version={versionNumber} isEditing />}
      >
        {prompt.isPublished && (
          <Alert color="orange" title="Read-Only Mode" icon={<IconLock />} mb="md">
            This prompt version is published and cannot be edited. To make changes, please create a new version.
          </Alert>
        )}
        <PromptForm
          form={form}
          promptId={prompt.id}
          promptVersion={prompt.version}
          onPreviewClick={openPreview}
          onSubmit={handleSubmit}
          isSubmitting={updatePromptMutation.isPending}
          isReadOnly={prompt.isPublished}
          submitButtonLabel={prompt.isPublished ? "Published (Read-Only)" : "Save Changes"}
          isEditMode={true}
        />
      </PageContainer>
      <PromptPreviewModal
        opened={previewOpened}
        onClose={closePreview}
        promptContent={form.values.content as string}
      />
    </>
  );
}
