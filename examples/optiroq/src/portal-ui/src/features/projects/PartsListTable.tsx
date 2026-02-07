import { useState } from 'react';
import { Table, Button, Group, ActionIcon, Text, TextInput, Center, Box, Tooltip, Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconPlus, IconPencil, IconTrash, IconSearch, IconClock, IconCircleCheck, IconPlayerPlay, IconEye, IconFileText } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { BOMPart, MasterField } from '@optiroq/types';
import { useDynamicTableColumns } from '@/hooks/useDynamicTableColumns';
import { formatValueWithUnit } from '@/lib/formatters';

interface PartsListTableProps {
  parts: BOMPart[];
  partFields: MasterField[];
  variant: 'summary' | 'edit';
  onAdd?: () => void;
  onEdit?: (part: BOMPart) => void;
  onDelete?: (partName: string) => void;
  onRfqAction?: (part: BOMPart, action: 'start' | 'review' | 'view_summary') => void;
}

export function PartsListTable({ parts, partFields, variant, onAdd, onEdit, onDelete, onRfqAction }: PartsListTableProps) {
  const { t } = useTranslation(['project_edit', 'project_summary', 'translation', 'status']);
  const [searchQuery, setSearchQuery] = useState('');

  const visibleColumns = useDynamicTableColumns(parts, partFields);

  const filteredParts = parts.filter(part =>
    part.partName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.material?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openDeleteModal = (part: BOMPart) =>
    modals.openConfirmModal({
      title: t('deletePartConfirmTitle'),
      centered: true,
      children: <Text size="sm">{t('deletePartConfirmMessage', { partName: part.partName })}</Text>,
      labels: { confirm: t('delete'), cancel: t('cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => onDelete?.(part.partName),
    });
  
  const getRFQStatusBadge = (status?: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return <Badge color="gray" variant="light" leftSection={<IconClock size={12} />}>{t('status:NOT_STARTED')}</Badge>;
      case 'IN_PROGRESS':
        return <Badge color="blue" variant="light" leftSection={<IconClock size={12} />}>{t('status:IN_PROGRESS')}</Badge>;
      case 'COMPLETED':
        return <Badge color="green" variant="light" leftSection={<IconCircleCheck size={12} />}>{t('status:COMPLETED')}</Badge>;
      default:
        return <Text size="sm" c="dimmed">-</Text>;
    }
  };

  const headers = (
    <Table.Tr>
      {visibleColumns.map(column => (
        <Table.Th key={column.key}>
          {t(`translation:masterFields.${column.key}.label`, { defaultValue: column.displayName })}
        </Table.Th>
      ))}
      {variant === 'summary' && <Table.Th>{t('project_summary:rfqStatus')}</Table.Th>}
      <Table.Th />
    </Table.Tr>
  );

  const rows = filteredParts.map((part) => {
    const isPartLocked = part.rfqStatus && part.rfqStatus !== 'NOT_STARTED';
    const lockedTooltipLabel = t('partIsLocked');
    const rfqStatus = part.partStatus === 'NEW' ? part.rfqStatus || 'NOT_STARTED' : undefined;

    return (
      <Table.Tr key={part.partName}>
        {visibleColumns.map(column => (
          <Table.Td key={`${part.partName}-${column.key}`}>
            {formatValueWithUnit(part[column.key as keyof BOMPart], column)}
          </Table.Td>
        ))}
        {variant === 'summary' && (
          <Table.Td>{getRFQStatusBadge(rfqStatus)}</Table.Td>
        )}
        <Table.Td>
          <Group gap="xs" justify="flex-end">
            {variant === 'edit' && onEdit && onDelete && (
              <>
                <Tooltip label={isPartLocked ? lockedTooltipLabel : t('editPart')}>
                  <Box>
                    <ActionIcon variant="subtle" onClick={() => onEdit(part)} disabled={isPartLocked}>
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Box>
                </Tooltip>
                <Tooltip label={isPartLocked ? lockedTooltipLabel : t('deletePart')}>
                  <Box>
                    <ActionIcon variant="subtle" color="red" onClick={() => openDeleteModal(part)} disabled={isPartLocked}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Box>
                </Tooltip>
              </>
            )}
            {variant === 'summary' && part.partStatus === 'NEW' && onRfqAction && (
              <Group gap="xs">
                {rfqStatus === 'NOT_STARTED' && (
                  <Button size="xs" variant="default" leftSection={<IconPlayerPlay size={14} />} onClick={() => onRfqAction(part, 'start')}>{t('project_summary:startRfq')}</Button>
                )}
                {rfqStatus === 'IN_PROGRESS' && (
                  <Button size="xs" variant="outline" leftSection={<IconEye size={14} />} onClick={() => onRfqAction(part, 'review')}>{t('project_summary:reviewRfq')}</Button>
                )}
                {rfqStatus === 'COMPLETED' && (
                  <Button size="xs" variant="outline" leftSection={<IconFileText size={14} />} onClick={() => onRfqAction(part, 'view_summary')}>{t('project_summary:viewSummary')}</Button>
                )}
              </Group>
            )}
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <>
      <Group justify="space-between" mb="md">
        <TextInput
          placeholder={t('searchPartsPlaceholder')}
          leftSection={<IconSearch size={14} />}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
        {variant === 'edit' && onAdd && (
          <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
            {t('addPart')}
          </Button>
        )}
      </Group>

      {parts.length === 0 ? (
        <Center p="xl">
          <Box style={{ textAlign: 'center' }}>
            <Text c="dimmed">{variant === 'edit' ? t('noPartsAdded') : t('noPartsAssociated')}</Text>
            {variant === 'edit' && onAdd && <Button variant="subtle" onClick={onAdd} mt="sm">{t('addFirstPart')}</Button>}
          </Box>
        </Center>
      ) : (
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>{headers}</Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </>
  );
}