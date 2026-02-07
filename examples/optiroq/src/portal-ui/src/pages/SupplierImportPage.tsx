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

export function SupplierImportPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['upload_suppliers', 'common']);
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: initiateSupplierUpload, isPending: isInitiating } = useApiCommand(
    'supplier',
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
      const { uploadUrl, key, bucket } = await apiGetUploadUrl(file.name, file.type, 'supplier-imports');

      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
          setUploadProgress(percentCompleted);
        },
      });

      setStatus('processing');
      setActiveStep(2);

      initiateSupplierUpload({
        command: 'initiate-supplier-upload',
        payload: { s3Bucket: bucket, s3Key: key, fileName: file.name },
      }, {
        onSuccess: () => {
          setStatus('success');
          setActiveStep(2); // Keep stepper on "Upload & Process"
          notifications.show({
            title: t('processingStarted'),
            message: t('processingMessage'),
            color: 'green',
          });
          queryClient.invalidateQueries({ queryKey: ['view', 'suppliers-list'] });
          navigate(`/suppliers`);
        },
        onError: (error) => {
          setErrorMessage(error.message);
          setStatus('error');
        }
      });

    } catch (error: any) {
      const message = error.response?.data?.message || error.message || t('common:unexpectedError');
      setErrorMessage(message);
      setStatus('error');
      notifications.show({ title: t('uploadFailed'), message, color: 'red' });
    }
  };

  return (
    <AppShell>
      <PageContainer title={t('pageTitle')}>
        <Stepper active={activeStep}>
          <Stepper.Step label={t('selectFile')} description={t('chooseFile')}>
            <Dropzone
              onDrop={handleDrop}
              onReject={() => notifications.show({ title: t('common:Error'), message: t('fileRejected'), color: 'red' })}
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
                  <Text size="xl" inline>{t('dragFile')}</Text>
                  <Text size="sm" c="dimmed" inline mt={7}>{t('attachFile')}</Text>
                </div>
              </Group>
            </Dropzone>
            {file && <Text mt="md">{t('selectedFile', { fileName: file.name })}</Text>}
          </Stepper.Step>

          <Stepper.Step label={t('uploadAndProcess')} description={t('confirmAndStart')}>
            {file && <Text mb="md">{t('readyToUpload', { fileName: file.name })}</Text>}
            {errorMessage && <Alert color="red" title={t('common:Error')} icon={<IconAlertCircle />}>{errorMessage}</Alert>}

            {status === 'uploading' && <Progress.Root size="xl" radius="xl"><Progress.Section value={uploadProgress} striped animated><Progress.Label>{uploadProgress}%</Progress.Label></Progress.Section></Progress.Root>}
            {status === 'processing' && <Center><Loader /> <Text ml="sm">{t('startingAnalysis')}</Text></Center>}
          </Stepper.Step>
          
          <Stepper.Completed>
            {t('stepperCompleted')}
          </Stepper.Completed>
        </Stepper>

        <Group justify="center" mt="xl">
          {activeStep > 0 && <Button variant="default" onClick={() => { setFile(null); setStatus('idle'); setActiveStep(0); }}>{t('common:Back')}</Button>}
          {activeStep === 1 && (
            <Button onClick={handleUpload} loading={status === 'uploading' || isInitiating} disabled={!file}>
              {t('uploadAndProcessFile')}
            </Button>
          )}
        </Group>
      </PageContainer>
    </AppShell>
  );
}
