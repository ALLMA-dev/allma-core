import { Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { useApiView } from '@/hooks/useApi';
import { UserProfileViewModel } from '@optiroq/types';
import { ProfileForm } from '@/features/profile/ProfileForm';

export function ProfilePage() {
  const { t } = useTranslation('profile');
  const { data: profile, isLoading } = useApiView<UserProfileViewModel>('profile', 'me');

  const isFirstTimeSetup = !profile?.isProfileComplete;

  const title = isFirstTimeSetup ? t('welcomeTitle') : t('editTitle');
  const subtitle = isFirstTimeSetup ? t('welcomeSubtitle') : t('editSubtitle');

  return (
    <AppShell>
      <PageContainer title={title} loading={isLoading}>
        {isFirstTimeSetup && (
          <Alert
            variant="light"
            color="blue"
            title={subtitle}
            icon={<IconInfoCircle />}
            mb="xl"
          />
        )}
        {profile && <ProfileForm profile={profile} isFirstTimeSetup={isFirstTimeSetup} />}
      </PageContainer>
    </AppShell>
  );
}