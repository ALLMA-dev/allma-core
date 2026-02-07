import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { Paper, Title, Center, Group, Divider } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

/**
 * The login page for the Optiroq Portal.
 * It uses the pre-built Authenticator component from AWS Amplify UI for a secure,
 * ready-to-use authentication experience (including sign-up, forgot password, etc.).
 */
export function LoginPage() {
  const { authStatus } = useAuthenticator(context => [context.authStatus]);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('login');

  // Redirect the user to their intended destination after successful login.
  useEffect(() => {
    if (authStatus === 'authenticated') {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [authStatus, navigate, location]);


  const components = {
    Header() {
      return (
        <div style={{ textAlign: 'center', marginBottom: 'var(--amplify-space-large)' }}>
          <Title order={2} mb="xs">
            {t('Optiroq Portal')}
          </Title>
        </div>
      );
    },
  };

  return (
    <Center style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-1)' }}>
      <Paper withBorder shadow="md" p={30} mt={-100} radius="md" style={{ minWidth: 400 }}>
        <Authenticator
          components={components}
        />
        <Divider my="md" />
        <Group justify="center">
          <LanguageSwitcher />
        </Group>
      </Paper>
    </Center>
  );
}