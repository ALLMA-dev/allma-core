import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { Stepper, Button, Group, Text, rem, Alert, Loader, Center, Progress } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { IconCloudUpload, IconX, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiGetUploadUrl } from '@/lib/apiClient';
import { useApiCommand } from '@/hooks/useApi';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export function NewProjectUploadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['upload_bom', 'common']);
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: initiateBomUpload, isPending: isInitiating } = useApiCommand<{ projectId: string }>(
    'project',
    null // No entity ID for creation
  );

  const handleDrop = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setStatus('idle');
      setErrorMessage(null);
      setActiveStep(1);
    }
  };
  
  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setErrorMessage(null);

    try {
      const { uploadUrl, key, bucket } = await apiGetUploadUrl(file.name, file.type, 'bom-uploads');

      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
          setUploadProgress(percentCompleted);
        },
      });

      setStatus('processing');
      setActiveStep(2);

      initiateBomUpload({
        command: 'initiate-bom-upload',
        payload: { s3Bucket: bucket, s3Key: key, fileName: file.name },
      }, {
        onSuccess: (data) => {
          setStatus('success');
          setActiveStep(3);
          notifications.show({
            title: t('Processing Started'),
            message: t('Your BOM file is being processed. You can now see the project in your dashboard.'),
            color: 'green',
          });
          // Invalidate the projects list so the new processing project appears
          queryClient.invalidateQueries({ queryKey: ['view', 'projects-list', 'all'] });
          navigate(`/projects`);
        },
        onError: (error) => {
          setErrorMessage(error.message);
          setStatus('error');
        }
      });

    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'An unknown error occurred during upload.';
      setErrorMessage(message);
      setStatus('error');
      notifications.show({ title: t('Upload Failed'), message, color: 'red' });
    }
  };

  return (
    <AppShell>
      <PageContainer title={t('New Project - Upload BOM')}>
        <Stepper active={activeStep} onStepClick={setActiveStep}>
          <Stepper.Step label={t('Select File')} description={t('Choose your BOM file')}>
            <Dropzone
              onDrop={handleDrop}
              onReject={(files) => console.log('rejected files', files)}
              maxSize={10 * 1024 ** 2} // 10MB
              accept={[MIME_TYPES.xls, MIME_TYPES.xlsx, 'application/vnd.ms-excel.sheet.macroEnabled.12']}
              mt="md"
            >
              <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconCloudUpload style={{ width: rem(52), height: rem(52) }} stroke={1.5} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX style={{ width: rem(52), height: rem(52) }} stroke={1.5} color="var(--mantine-color-red-6)" />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconCloudUpload style={{ width: rem(52), height: rem(52) }} stroke={1.5} />
                </Dropzone.Idle>
                <div>
                  <Text size="xl" inline>{t('Drag your Excel file here or click to select')}</Text>
                  <Text size="sm" c="dimmed" inline mt={7}>{t('Attach one .xls, .xlsx or .xlsm file, up to 10MB')}</Text>
                </div>
              </Group>
            </Dropzone>
            {file && <Text mt="md">{t('Selected file: {{fileName}}', { fileName: file.name })}</Text>}
          </Stepper.Step>

          <Stepper.Step label={t('Upload & Process')} description={t('Confirm and start the workflow')}>
            {file && <Text mb="md">{t('Ready to upload: {{fileName}}', { fileName: file.name })}</Text>}
            {errorMessage && <Alert color="red" title={t('common:Error')} icon={<IconAlertCircle />}>{errorMessage}</Alert>}

            {status === 'uploading' && <Progress.Root size="xl" radius="xl"><Progress.Section value={uploadProgress} striped animated><Progress.Label>{uploadProgress}%</Progress.Label></Progress.Section></Progress.Root>}
            {status === 'processing' && <Center><Loader /> <Text ml="sm">{t('Starting analysis...')}</Text></Center>}
            {status === 'success' && <Alert color="green" title={t('common:Success')} icon={<IconCheck />}>{t('File processing started. Redirecting...')}</Alert>}
          </Stepper.Step>

          <Stepper.Step label={t('Review')} description={t('Confirm extracted data')}>
            <Center p="xl"><Text>{t('reviewInstructions')}</Text></Center>
          </Stepper.Step>
          <Stepper.Completed>
            {t('stepperCompleted')}
          </Stepper.Completed>
        </Stepper>

        <Group justify="center" mt="xl">
          {activeStep > 0 && <Button variant="default" onClick={() => { setFile(null); setStatus('idle'); setActiveStep(0); }}>{t('Back')}</Button>}
          {activeStep === 1 && (
            <Button onClick={handleUpload} loading={status === 'uploading' || isInitiating} disabled={!file}>
              {t('Upload and Process File')}
            </Button>
          )}
        </Group>
      </PageContainer>
    </AppShell>
  );
}