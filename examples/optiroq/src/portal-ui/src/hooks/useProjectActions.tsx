// NEW FILE
import { useTranslation } from 'react-i18next';
import { modals } from '@mantine/modals';
import { Text } from '@mantine/core';
import { ProjectSummary, Project } from '@optiroq/types';

/**
 * A centralized hook for handling common actions related to projects,
 * such as opening context-aware deletion modals.
 */
export function useProjectActions() {
  const { t } = useTranslation(['projects_dashboard', 'common']);

  const openDeleteModal = (
    project: ProjectSummary | Project,
    onConfirm: () => void
  ) => {
    let modalProps: any;
    const projectName = project.projectName || project.projectId;

    switch (project.status) {
      case 'DRAFT':
      case 'DRAFT_AWAITING_REVIEW':
      case 'DRAFT_PROCESSING':
      case 'DRAFT_FAILED':
        modalProps = {
          title: t('deleteProjectConfirmTitle'),
          children: <Text size="sm">{t('deleteDraftConfirmMessage', { projectName })}</Text>,
          labels: { confirm: t('confirmDelete'), cancel: t('common:Cancel') },
          confirmProps: { color: 'red' },
        };
        break;
      case 'ACTIVE':
        modalProps = {
          title: t('revertToDraftsOrArchiveConfirmTitle'),
          children: <Text size="sm">{t('revertActiveConfirmMessage', { projectName })}</Text>,
          labels: { confirm: t('confirmRevert'), cancel: t('common:Cancel') },
          confirmProps: { color: 'orange' },
        };
        break;
      case 'COMPLETED':
        modalProps = {
          title: t('archiveProjectConfirmTitle'),
          children: <Text size="sm">{t('archiveCompletedConfirmMessage', { projectName })}</Text>,
          labels: { confirm: t('confirmArchive'), cancel: t('common:Cancel') },
          confirmProps: { color: 'blue' },
        };
        break;
      default:
        // Don't open a modal for already archived projects or unknown statuses.
        return;
    }

    modals.openConfirmModal({
      ...modalProps,
      centered: true,
      onConfirm,
    });
  };

  return { openDeleteModal };
}