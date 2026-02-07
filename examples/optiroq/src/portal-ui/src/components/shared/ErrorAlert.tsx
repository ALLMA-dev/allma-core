import { Alert, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface ErrorAlertProps {
  title: string;
  message?: string;
}

export function ErrorAlert({ title, message }: ErrorAlertProps) {
  const { t } = useTranslation(['common']);
  const defaultMessage = t('unexpectedError');

  return (
    <Alert icon={<IconAlertCircle size="1rem" />} title={title} color="red">
      <Text>{message || defaultMessage}</Text>
    </Alert>
  );
}