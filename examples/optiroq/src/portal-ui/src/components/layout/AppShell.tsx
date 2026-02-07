import { AppShell as MantineAppShell, Burger, Group, NavLink, Title, ActionIcon, useMantineColorScheme, Text, Menu, Avatar, rem } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSun, IconMoon, IconLogout, IconHome, IconBriefcase, IconUser, IconChevronDown, IconUsers } from '@tabler/icons-react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import { useApiView } from '@/hooks/useApi';
import { UserProfileViewModel } from '@optiroq/types';
import { CurrencyPanel } from './CurrencyPanel.js';

interface AppShellProps {
  children: React.ReactNode;
}

const getInitials = (name = '') => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * The main layout for the authenticated application.
 * Provides a consistent header, navigation sidebar, and content area.
 */
export function AppShell({ children }: AppShellProps) {
  const [opened, { toggle }] = useDisclosure();
  const { signOut } = useAuthenticator((context) => [context.signOut]);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['header', 'nav']);

  const { data: profile } = useApiView<UserProfileViewModel>('profile', 'me');

  const navLinks = [
    { icon: IconHome, label: t('nav:Dashboard'), path: '/' },
    { icon: IconBriefcase, label: t('nav:Projects'), path: '/projects' },
    { icon: IconUsers, label: t('nav:Suppliers'), path: '/suppliers' },
    { icon: IconUser, label: t('nav:Profile'), path: '/profile' },
  ];

  const items = navLinks.map((item) => (
    <NavLink
      key={item.label}
      active={location.pathname === item.path}
      label={item.label}
      leftSection={<item.icon size="1rem" stroke={1.5} />}
      component={Link}
      to={item.path}
      onClick={toggle}
    />
  ));

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>Optiroq</Title>
          </Group>
          <Group>
            <CurrencyPanel />
            <LanguageSwitcher />
            <ActionIcon onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')} variant="default" aria-label={t('header:Toggle color scheme')}>
              {colorScheme === 'dark' ? <IconSun size="1rem" /> : <IconMoon size="1rem" />}
            </ActionIcon>

            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <Group gap="xs" style={{ cursor: 'pointer' }}>
                  <Avatar src={profile?.pictureUrl} color="blue" radius="xl">
                    {getInitials(profile?.name)}
                  </Avatar>
                  <Text size="sm" fw={500}>{profile?.name ?? profile?.email}</Text>
                  <IconChevronDown style={{ width: rem(14), height: rem(14) }} />
                </Group>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{profile?.email}</Menu.Label>
                <Menu.Item leftSection={<IconUser style={{ width: rem(14), height: rem(14) }} />} onClick={() => navigate('/profile')}>
                  {t('header:Profile')}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                  onClick={() => signOut()}
                >
                  {t('header:Sign Out')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">{items}</MantineAppShell.Navbar>

      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}