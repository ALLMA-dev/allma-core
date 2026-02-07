import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Group,
  Stack,
  Badge,
  Skeleton,
  Divider,
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconArchive, IconArchiveOff, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { DynamicFormSection } from '@/components/shared/DynamicFormSection';
import { useApiView, useApiCommand } from '@/hooks/useApi';
import { SupplierDetailViewModel, MasterField } from '@optiroq/types';

import supplierFieldsFallback from '../../../../config/supplier-fields.json';

export function SupplierDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['supplier_detail', 'common']);

  const isCreating = !supplierId;

  const {
    data: viewModel,
    isLoading,
    error,
  } = useApiView<SupplierDetailViewModel>('supplier-detail', supplierId ?? null, {
    enabled: !isCreating,
  });

  const { mutate: sendCommand, isPending: isSaving } = useApiCommand(
    'supplier',
    isCreating ? null : supplierId!,
  );

  // Use the fields from the API when available, fall back to static config.
  const fields: MasterField[] = viewModel?.supplierFields ?? (supplierFieldsFallback as unknown as MasterField[]);

  // Local editable copy of the supplier data.
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Merge API data with local overrides.
  const effectiveData: Record<string, unknown> = {
    ...(viewModel?.supplier as unknown as Record<string, unknown> | undefined),
    ...formData,
  };

  const isArchived = (effectiveData.status as string | undefined) === 'ARCHIVED';

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (isCreating) {
      sendCommand(
        {
          command: 'create-supplier',
          payload: formData,
        },
        {
          onSuccess: (response: any) => {
            const newId = response?.supplierId;
            if (newId) {
              navigate(`/suppliers/${newId}`, { replace: true });
            } else {
              navigate('/suppliers');
            }
          },
        },
      );
    } else {
      sendCommand(
        {
          command: 'update-supplier',
          payload: formData,
        },
        {
          onSuccess: () => {
            setFormData({});
            setIsDirty(false);
          },
        },
      );
    }
  }, [sendCommand, formData, isCreating, navigate]);

  const handleToggleArchive = useCallback(() => {
    const newStatus = isArchived ? 'ACTIVE' : 'ARCHIVED';
    sendCommand({
      command: 'update-status',
      payload: { status: newStatus },
    });
  }, [sendCommand, isArchived]);

  // --- Loading state (edit mode only) ---
  if (!isCreating && isLoading) {
    return (
      <AppShell>
        <PageContainer title="">
          <Stack gap="sm">
            <Skeleton height={28} width={300} />
            <Skeleton height={200} />
            <Skeleton height={200} />
          </Stack>
        </PageContainer>
      </AppShell>
    );
  }

  // --- Error state (edit mode only) ---
  if (!isCreating && error) {
    return (
      <AppShell>
        <PageContainer title={t('pageTitle')}>
          <ErrorAlert title={t('errorLoadingTitle')} message={error.message} />
        </PageContainer>
      </AppShell>
    );
  }

  const pageTitle = isCreating
    ? t('createTitle')
    : (viewModel?.supplier?.supplierName ?? t('pageTitle'));

  return (
    <AppShell>
      <PageContainer
        title={pageTitle}
        rightSection={
          !isCreating ? (
            <Group gap="sm">
              {isArchived ? (
                <Badge color="gray" variant="light" size="lg">
                  {t('archived')}
                </Badge>
              ) : (
                <Badge color="green" variant="light" size="lg">
                  {t('active')}
                </Badge>
              )}
            </Group>
          ) : undefined
        }
      >
        <Stack gap="lg">
          {/* Back navigation */}
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={14} />}
              onClick={() => navigate('/suppliers')}
            >
              {t('backToList')}
            </Button>
          </Group>

          {/* Dynamic form driven by supplier-fields config */}
          <DynamicFormSection
            fields={fields}
            data={effectiveData}
            onFieldChange={handleFieldChange}
            disabled={!isCreating && isArchived}
          />

          <Divider />

          {/* Action buttons */}
          <Group justify="space-between">
            {!isCreating ? (
              <Button
                variant="light"
                color={isArchived ? 'blue' : 'orange'}
                leftSection={isArchived ? <IconArchiveOff size={14} /> : <IconArchive size={14} />}
                onClick={handleToggleArchive}
                loading={isSaving}
              >
                {isArchived ? t('unarchive') : t('archive')}
              </Button>
            ) : (
              <div />
            )}

            <Button
              leftSection={isCreating ? <IconPlus size={14} /> : <IconDeviceFloppy size={14} />}
              onClick={handleSave}
              loading={isSaving}
              disabled={!isDirty || (!isCreating && isArchived)}
            >
              {isCreating ? t('create') : t('save')}
            </Button>
          </Group>
        </Stack>
      </PageContainer>
    </AppShell>
  );
}
