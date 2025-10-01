// packages/allma-admin-shell/src/features/prompts/components/PromptForm.tsx
import { type UseFormReturnType } from '@mantine/form';
import {
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Paper,
  Grid,
  Title,
  Text,
} from '@mantine/core';

// This base interface defines the fields that the form component interacts with.
export interface PromptFormValues {
  name: string;
  description?: string | null;
  content: string;
  tags: string[];
}

interface PromptFormProps<TData extends PromptFormValues> {
  form: UseFormReturnType<TData>;
  onSubmit: (values: TData) => Promise<void>;
  onPreviewClick?: () => void;
  promptId?: string;
  promptVersion?: number;
  isSubmitting: boolean;
  isReadOnly?: boolean;
  submitButtonLabel?: string;
  isEditMode: boolean;
}

export function PromptForm<TData extends PromptFormValues>({
  form,
  onSubmit,
  onPreviewClick,
  promptId,
  promptVersion,
  isSubmitting,
  isReadOnly = false,
  submitButtonLabel = 'Submit',
  isEditMode,
}: PromptFormProps<TData>) {

  return (
    <form onSubmit={form.onSubmit(async (values) => onSubmit(values as TData))}>
      <Stack gap="lg">
        <Paper shadow="xs" p="xl" withBorder>
          <Title order={3} mb="lg">Prompt Template Details</Title>
          <Grid>
            {isEditMode && (
              <>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Prompt Template ID"
                    description="Unique identifier for this prompt family."
                    value={promptId || ''}
                    disabled
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Version"
                    description="Version number for this specific template."
                    value={promptVersion || 1}
                    disabled
                  />
                </Grid.Col>
              </>
            )}
            <Grid.Col span={12}>
              <TextInput
                withAsterisk
                label="Name"
                placeholder="Descriptive name for the prompt (e.g., Main Query Analyzer)"
                {...form.getInputProps('name')}
                readOnly={isReadOnly}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Description"
                placeholder="Optional: What this prompt is for, variable usage, etc."
                minRows={2}
                {...form.getInputProps('description')}
                readOnly={isReadOnly}
              />
            </Grid.Col>
          </Grid>
        </Paper>

        {isEditMode && (
          <Paper shadow="xs" p="xl" withBorder>
            <Group justify="space-between" align="center" mb="md">
                <Title order={3}>Prompt Content</Title>
                {onPreviewClick && (
                  <Button variant="outline" onClick={onPreviewClick} disabled={!form.values.content}>
                      Preview
                  </Button>
                )}
              </Group>
            <Textarea
              withAsterisk
              label="Content"
              placeholder="Enter your prompt template here. Use {{variables}} for placeholders."
              minRows={10}
              autosize
              styles={{ input: { fontFamily: 'monospace', fontSize: '0.9rem' } }}
              {...form.getInputProps('content')}
              readOnly={isReadOnly}
            />
            <Text size="sm" mt="xs" c="dimmed">
              You can use Markdown. Variables should be in double curly braces, e.g., {"{{user_query}}"}.
            </Text>
          </Paper>
        )}
        
        <Group justify="flex-end" mt="xl">
          <Button type="submit" loading={isSubmitting} size="md" disabled={isReadOnly || !form.isDirty()}>
            {submitButtonLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
