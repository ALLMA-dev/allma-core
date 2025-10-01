import { useEffect } from 'react';
import { Paper, TextInput, Textarea, TagsInput, Group, Button, LoadingOverlay, Alert, Stack } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { UpdateFlowConfigInput, UpdateFlowConfigInputSchema, FlowMetadataStorageItem } from '@allma/core-types';
import { useUpdateFlowConfig, useGetAllFlowTags } from '../../../api/flowService';

interface FlowSettingsFormProps {
  flowId: string;
  flowConfig: FlowMetadataStorageItem | undefined;
  isLoading: boolean;
}

export function FlowSettingsForm({ flowId, flowConfig, isLoading }: FlowSettingsFormProps) {
  const { data: allTags, isLoading: isLoadingTags } = useGetAllFlowTags();
  const updateConfigMutation = useUpdateFlowConfig();

  const form = useForm<UpdateFlowConfigInput>({
    initialValues: { name: '', description: '', tags: [] },
    validate: zodResolver(UpdateFlowConfigInputSchema),
  });

  useEffect(() => {
    if (flowConfig) {
      form.setValues({
        name: flowConfig.name,
        description: flowConfig.description || '',
        tags: flowConfig.tags || [],
      });
      form.resetDirty();
    }
  }, [flowConfig?.name, flowConfig?.description, JSON.stringify(flowConfig?.tags), form.setValues, form.resetDirty]);

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!flowConfig) {
    return <Alert color="red">Could not load flow settings.</Alert>;
  }

  const handleSubmit = (values: UpdateFlowConfigInput) => {
    updateConfigMutation.mutate({ flowId, data: values }, {
      onSuccess: () => form.resetDirty()
    });
  };

  return (
    <Paper withBorder p="lg" mb="xl" shadow="sm">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput label="Flow Name" withAsterisk {...form.getInputProps('name')} />
          <Textarea label="Description" minRows={2} {...form.getInputProps('description')} />
          <TagsInput
            label="Tags"
            placeholder="Add or create tags"
            data={allTags || []}
            {...form.getInputProps('tags')}
            disabled={isLoadingTags}
          />
          <Group justify="flex-end">
            <Button
              type="submit"
              disabled={!form.isDirty()}
              loading={updateConfigMutation.isPending}
              leftSection={<IconDeviceFloppy size="1rem" />}
            >
              Save Settings
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
