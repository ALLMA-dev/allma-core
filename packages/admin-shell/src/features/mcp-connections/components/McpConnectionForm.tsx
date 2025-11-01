import { TextInput, SegmentedControl, Stack, Button, Group, Text } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { CreateMcpConnectionInput } from '@allma/core-types/src/admin/api-schemas';

interface McpConnectionFormProps {
    form: UseFormReturnType<CreateMcpConnectionInput>;
    onSubmit: (values: CreateMcpConnectionInput) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export function McpConnectionForm({ form, onSubmit, onCancel, isSubmitting }: McpConnectionFormProps) {
    const authType = form.values.authentication?.type;

    return (
        <form onSubmit={form.onSubmit(onSubmit)}>
            <Stack>
                <TextInput
                    label="Connection Name"
                    placeholder="e.g., My Internal API"
                    withAsterisk
                    {...form.getInputProps('name')}
                />
                <TextInput
                    label="Server URL"
                    placeholder="https://api.example.com"
                    withAsterisk
                    {...form.getInputProps('serverUrl')}
                />

                <Stack gap="xs">
                    <Text fw={500} size="sm">Authentication</Text>
                    <SegmentedControl
                        data={[
                            { label: 'None', value: 'NONE' },
                            { label: 'Bearer Token', value: 'BEARER_TOKEN' },
                            { label: 'API Key', value: 'API_KEY' },
                        ]}
                        {...form.getInputProps('authentication.type')}
                    />
                </Stack>

                {(authType === 'BEARER_TOKEN' || authType === 'API_KEY') && (
                    <Stack>
                        <TextInput
                            label="AWS Secret ARN"
                            description="The full ARN of the secret in AWS Secrets Manager."
                            withAsterisk
                            {...form.getInputProps('authentication.secretArn')}
                        />
                        <TextInput
                            label="Secret JSON Key"
                            description="The key within the secret's JSON value that holds the token/key."
                            withAsterisk
                            {...form.getInputProps('authentication.secretJsonKey')}
                        />
                    </Stack>
                )}

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={isSubmitting}>
                        Save Connection
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
