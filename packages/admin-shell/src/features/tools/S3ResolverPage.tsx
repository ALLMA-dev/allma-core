import { useState } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Button, Group, Stack, Paper, Title, Text, Alert, JsonInput, Code } from '@mantine/core';
import { PageContainer, EditableJsonView } from '@allma/ui-components';
import { useResolveS3Pointer } from '../../api/systemToolsService.js';
import { IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { S3Pointer } from '@allma/core-types';

export function S3ResolverPage() {
    const resolveMutation = useResolveS3Pointer();
    const [result, setResult] = useState<any>(null);
    
    const form = useForm({
        initialValues: {
            bucket: '',
            key: '',
        },
        validate: {
            bucket: (value) => (value.trim().length > 0 ? null : 'Bucket is required'),
            key: (value) => (value.trim().length > 0 ? null : 'Key is required'),
        }
    });
    
    const [jsonPaste, setJsonPaste] = useState('');
    
    const handleJsonPaste = (value: string) => {
        setJsonPaste(value);
        try {
            const parsed = JSON.parse(value);
            const pointer = parsed._s3_output_pointer || parsed;
            if (pointer.bucket && pointer.key) {
                form.setValues({ bucket: pointer.bucket, key: pointer.key });
            }
        } catch (e) {
            // Ignore parsing errors while typing
        }
    };

    const handleSubmit = (values: { bucket: string, key: string }) => {
        setResult(null);
        resolveMutation.mutate(
            { bucket: values.bucket, key: values.key } as S3Pointer,
            {
                onSuccess: (data) => {
                    setResult(data);
                }
            }
        );
    };

    return (
        <PageContainer title="S3 Pointer Resolver">
            <Stack gap="xl">
                <Paper withBorder p="md" shadow="sm">
                    <Stack gap="md">
                        <Text size="sm" c="dimmed">
                            Paste an <Code>_s3_output_pointer</Code> JSON object or enter the bucket and key manually to retrieve and view its contents directly in the browser.
                        </Text>
                        
                        <JsonInput 
                            label="Paste JSON Pointer" 
                            placeholder='{"bucket": "...", "key": "..."} or {"_s3_output_pointer": {...}}'
                            value={jsonPaste}
                            onChange={handleJsonPaste}
                            formatOnBlur
                            minRows={4}
                            autosize
                            styles={{ input: { fontFamily: 'monospace' } }}
                        />
                        
                        <form onSubmit={form.onSubmit(handleSubmit)}>
                            <Group align="flex-end">
                                <TextInput 
                                    label="Bucket" 
                                    placeholder="allma-execution-traces-..." 
                                    withAsterisk 
                                    style={{ flex: 1 }}
                                    {...form.getInputProps('bucket')}
                                />
                                <TextInput 
                                    label="Key" 
                                    placeholder="log_artifacts/..." 
                                    withAsterisk 
                                    style={{ flex: 2 }}
                                    {...form.getInputProps('key')}
                                />
                                <Button type="submit" loading={resolveMutation.isPending} leftSection={<IconSearch size="1rem"/>}>
                                    Resolve
                                </Button>
                            </Group>
                        </form>
                    </Stack>
                </Paper>

                {resolveMutation.isError && (
                    <Alert color="red" title="Error Resolving Pointer" icon={<IconAlertCircle />}>
                        {(resolveMutation.error as Error)?.message || 'An unknown error occurred while resolving the S3 pointer.'}
                    </Alert>
                )}

                {result !== null && (
                    <Paper withBorder p="md" shadow="sm">
                        <Title order={4} mb="md">Resolution Result</Title>
                        {result._is_large_s3_payload ? (
                            <Alert color="blue" title="Large Data Offloaded to S3">
                                <Text size="sm" mb="sm">{result.message}</Text>
                                <Button component="a" href={result.presignedUrl} target="_blank" rel="noopener noreferrer" size="xs" variant="light">
                                    Download / View File ({(result.sizeBytes / 1024 / 1024).toFixed(2)} MB)
                                </Button>
                            </Alert>
                        ) : (
                            <EditableJsonView value={result} readOnly />
                        )}
                    </Paper>
                )}
            </Stack>
        </PageContainer>
    );
}
