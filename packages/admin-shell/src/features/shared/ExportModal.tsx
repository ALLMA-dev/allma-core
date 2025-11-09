import { Modal, Button, Group, Checkbox, ScrollArea, TextInput } from '@mantine/core';
import { useExportMutation } from '../../api/importExportService';
import { useState } from 'react';
import { ExportApiInput } from '@allma/core-types';

interface ExportableItem {
  id: string;
  name: string;
}

interface ExportModalProps {
  opened: boolean;
  onClose: () => void;
  items: ExportableItem[];
  itemType: 'flow' | 'step' | 'prompt';
}

export function ExportModal({ opened, onClose, items, itemType }: ExportModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const exportMutation = useExportMutation();

  const handleExport = () => {
    let exportData: ExportApiInput;
    if (itemType === 'flow') {
      exportData = { flowIds: selectedIds };
    } else if (itemType === 'step') {
      exportData = { stepDefinitionIds: selectedIds };
    } else { // 'prompt'
      exportData = { promptTemplateIds: selectedIds };
    }
    exportMutation.mutate(exportData);
    onClose();
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const itemTypeLabels = {
    flow: 'Flows',
    step: 'Step Definitions',
    prompt: 'Prompts',
  };
  const title = `Export ${itemTypeLabels[itemType]}`;

  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <TextInput
        placeholder="Search..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
        mb="md"
      />
      <ScrollArea style={{ height: 300 }}>
        {filteredItems.map(item => (
          <Checkbox
            key={item.id}
            label={item.name}
            checked={selectedIds.includes(item.id)}
            onChange={(event) => {
              const { checked } = event.currentTarget;
              setSelectedIds(currentIds =>
                checked ? [...currentIds, item.id] : currentIds.filter(id => id !== item.id)
              );
            }}
            m="xs"
          />
        ))}
      </ScrollArea>
      <Group mt="xl">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={selectedIds.length === 0}
          loading={exportMutation.isPending}
        >
          Export Selected ({selectedIds.length})
        </Button>
      </Group>
    </Modal>
  );
}