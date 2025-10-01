import { Modal, Button, Group, Checkbox, FileInput } from '@mantine/core';
import { useImportMutation } from '../../api/importExportService';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';

interface ImportModalProps {
  opened: boolean;
  onClose: () => void;
}

export function ImportModal({ opened, onClose }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const importMutation = useImportMutation();

  const handleImport = async () => {
    if (!file) {
      notifications.show({
        title: 'No file selected',
        message: 'Please select a file to import.',
        color: 'red',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') {
          throw new Error('Failed to read file content.');
        }
        const data = JSON.parse(content);
        importMutation.mutate({ ...data, options: { overwrite } });
        onClose();
      } catch (error: any) {
        notifications.show({
          title: 'Invalid File',
          message: 'The selected file is not valid JSON.',
          color: 'red',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Import Configuration">
      <FileInput
        label="Configuration file"
        placeholder="Select a JSON file"
        value={file}
        onChange={setFile}
        accept="application/json"
      />
      <Checkbox
        label="Overwrite existing items with the same ID"
        checked={overwrite}
        onChange={(event) => setOverwrite(event.currentTarget.checked)}
        mt="md"
      />
      <Group mt="xl">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          loading={importMutation.isPending}
        >
          Start Import
        </Button>
      </Group>
    </Modal>
  );
}
