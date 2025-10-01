import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import React from 'react';
import { AppShell, Burger, Group, NavLink, ScrollArea, Title, Text, ActionIcon, useMantineColorScheme, Tooltip, Stack } from '@mantine/core';
import { IconGauge, IconListDetails, IconLogout, IconSun, IconMoon, IconPrompt, IconActivity, IconLayoutSidebarLeftCollapse, IconLayoutSidebarRightExpand, IconTemplate } from '@tabler/icons-react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { AdminPermission } from '@allma/core-types';
import { useLocalStorage } from '@mantine/hooks';
import type { PluginNavItem } from '../../types/plugin.ts';

interface AdminLayoutProps {
  navItems: PluginNavItem[];
  children: React.ReactNode;
}

export function AdminLayout({ navItems, children }: AdminLayoutProps) {
  const [opened, setOpened] = useState(false);
  const [navbarCollapsed, setNavbarCollapsed] = useLocalStorage<boolean>({
    key: 'allma-admin-navbar-collapsed',
    defaultValue: false,
  });
  const location = useLocation();
  const { signOut, user } = useAuthenticator();
  const { authContext } = useAdminAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <AppShell
      padding="md"
      navbar={{ 
        width: navbarCollapsed ? 60 : 220, 
        breakpoint: 'sm', 
        collapsed: { mobile: !opened } 
      }}
      header={{ height: 60 }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={() => setOpened((o) => !o)} hiddenFrom="sm" size="sm" />
            <ActionIcon
              onClick={() => setNavbarCollapsed((c) => !c)}
              variant="default"
              size="lg"
              visibleFrom="sm"
              aria-label={navbarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {navbarCollapsed ? <IconLayoutSidebarRightExpand /> : <IconLayoutSidebarLeftCollapse />}
            </ActionIcon>
            <Title order={3}>ALLMA Admin</Title>
          </Group>
          <Group>
            <Text size="sm">{user?.signInDetails?.loginId}</Text>
            <ActionIcon onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')} variant="default" aria-label="Toggle color scheme">
                {colorScheme === 'dark' ? <IconSun size="1rem" /> : <IconMoon size="1rem" />}
            </ActionIcon>
            <ActionIcon onClick={() => signOut()} variant="default" title="Sign Out">
                <IconLogout size="1rem" />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={navbarCollapsed ? 'xs' : 'md'}>
        <ScrollArea>
          <Stack gap="xs">
            {navItems.map((link) => {
              const Icon = link.icon;
              const navLinkComponent = (
                <NavLink
                  key={link.path}
                  label={!navbarCollapsed ? link.label : undefined}
                  leftSection={Icon ? <Icon size={16} /> : undefined}
                  component={Link}
                  to={link.path}
                  onClick={() => setOpened(false)}
                  active={location.pathname.startsWith(link.path)}
                />
              );

              if (navbarCollapsed) {
                return (
                  <Tooltip
                    label={link.label}
                    position="right"
                    withArrow
                    key={link.path}
                  >
                    {navLinkComponent}
                  </Tooltip>
                );
              }
              
              return navLinkComponent;
            })}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
