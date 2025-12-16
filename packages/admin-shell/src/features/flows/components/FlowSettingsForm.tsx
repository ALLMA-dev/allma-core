import { useEffect } from 'react';
import { TextInput, Textarea, TagsInput, Group, Button, LoadingOverlay, Alert, Stack, Accordion } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { UpdateFlowConfigInput, UpdateFlowConfigInputSchema, FlowMetadataStorageItem } from '@allma/core-types';
import { useUpdateFlowConfig, useGetAllFlowTags } from '../../../api/flowService';
import { FlowVariablesEditor } from './FlowVariablesEditor.js';

interface FlowSettingsFormProps {
  flowId: string;
  flowConfig: FlowMetadataStorageItem | undefined;
  isLoading: boolean;
}

export function FlowSettingsForm({ flowId, flowConfig, isLoading }: FlowSettingsFormProps) {
  const { data: allTags, isLoading: isLoadingTags } = useGetAllFlowTags();
  const updateConfigMutation = useUpdateFlowConfig();

  const form = useForm<UpdateFlowConfigInput>({
    initialValues: { name: '', description: '', tags: [], flowVariables: {} },
    validate: zodResolver(UpdateFlowConfigInputSchema),
  });

  useEffect(() => {
    if (flowConfig) {
      form.setValues({
        name: flowConfig.name,
        description: flowConfig.description || '',
        tags: flowConfig.tags || [],
        flowVariables: flowConfig.flowVariables || {},
      });
      form.resetDirty();
    }
  }, [flowConfig]);

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
          
          <Accordion variant="contained" radius="md">
            <Accordion.Item value="flow-variables">
                <Accordion.Control>Flow Variables</Accordion.Control>
                <Accordion.Panel>
                    <FlowVariablesEditor form={form as any} readOnly={isLoading} />
                </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Group justify="flex-end" mt="md">
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
  );
}