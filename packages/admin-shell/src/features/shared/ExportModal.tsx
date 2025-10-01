import { Modal, Button, Group, Checkbox, ScrollArea, TextInput } from '@mantine/core';
import { useExportMutation } from '../../api/importExportService';
import { useState } from 'react';

interface ExportableItem {
  id: string;
  name: string;
}

interface ExportModalProps {
  opened: boolean;
  onClose: () => void;
  items: ExportableItem[];
  itemType: 'flow' | 'step';
}

export function ExportModal({ opened, onClose, items, itemType }: ExportModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const exportMutation = useExportMutation();

  const handleExport = () => {
    const exportData = itemType === 'flow'
      ? { flowIds: selectedIds }
      : { stepDefinitionIds: selectedIds };
    exportMutation.mutate(exportData);
    onClose();
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal opened={opened} onClose={onClose} title={`Export ${itemType === 'flow' ? 'Flows' : 'Step Definitions'}`}>
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
