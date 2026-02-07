import { Card, Title, Group, ActionIcon, Tooltip } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface ReviewSectionProps {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}

export function ReviewSection({ title, onEdit, children }: ReviewSectionProps) {
  const { t } = useTranslation('common');
  return (
    <Card withBorder p="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>{title}</Title>
        <Tooltip label={t('Edit')}>
          <ActionIcon variant="subtle" onClick={onEdit}>
            <IconPencil size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {children}
    </Card>
  );
}