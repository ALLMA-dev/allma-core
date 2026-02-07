import { Group, Text, rem, SimpleGrid, Card, ActionIcon } from '@mantine/core';
import { IconUpload, IconX, IconFile } from '@tabler/icons-react';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { apiGetUploadUrl } from '@/lib/apiClient';
import axios from 'axios';
import { useState } from 'react';

interface Attachment {
  filename: string;
  s3key: string;
}

interface AttachmentsDropzoneProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
}

export function AttachmentsDropzone({ attachments, onAttachmentsChange }: AttachmentsDropzoneProps) {
  const { t } = useTranslation('rfq_wizard');
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = async (files: File[]) => {
    setIsUploading(true);
    const uploadPromises = files.map(async (file) => {
      try {
        const { uploadUrl, key } = await apiGetUploadUrl(file.name, file.type, 'rfq-attachments');
        await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });
        return { filename: file.name, s3key: key };
      } catch (error) {
        notifications.show({ color: 'red', title: t('common:Error'), message: `Failed to upload ${file.name}` });
        return null;
      }
    });

    const newAttachments = (await Promise.all(uploadPromises)).filter(Boolean) as Attachment[];
    onAttachmentsChange([...attachments, ...newAttachments]);
    setIsUploading(false);
  };
  
  const handleRemove = (s3key: string) => {
      onAttachmentsChange(attachments.filter(a => a.s3key !== s3key));
  };

  return (
    <>
      <Dropzone
        onDrop={handleDrop}
        onReject={() => notifications.show({ color: 'red', title: t('common:Error'), message: t('step1.attachmentError') })}
        maxSize={50 * 1024 ** 2} // 50MB total
        accept={[MIME_TYPES.pdf, MIME_TYPES.doc, MIME_TYPES.docx, MIME_TYPES.xls, MIME_TYPES.xlsx, ...Object.values(MIME_TYPES).filter(v => v.startsWith('image/'))]}
        loading={isUploading}
      >
        <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
          <IconUpload style={{ width: rem(52), height: rem(52) }} stroke={1.5} />
          <div>
            <Text size="xl" inline>{t('step1.dragFiles')}</Text>
            <Text size="sm" c="dimmed" inline mt={7}>{t('step1.addDrawings')}</Text>
          </div>
        </Group>
      </Dropzone>
      {attachments.length > 0 && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mt="md">
              {attachments.map(att => (
                  <Card key={att.s3key} withBorder p="sm">
                      <Group justify="space-between">
                          <Group gap="xs">
                            <IconFile size={18} />
                            <Text size="sm" truncate>{att.filename}</Text>
                          </Group>
                          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleRemove(att.s3key)}>
                              <IconX size={14} />
                          </ActionIcon>
                      </Group>
                  </Card>
              ))}
          </SimpleGrid>
      )}
    </>
  );
}