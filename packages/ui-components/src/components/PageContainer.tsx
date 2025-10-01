import { Paper, type PaperProps, Title, Box, Group, Stack, BoxProps, LoadingOverlay } from '@mantine/core';
import React from 'react';

export interface PageContainerProps extends Omit<BoxProps, 'children'> {
  title?: React.ReactNode;
  children: React.ReactNode;
  backLink?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  rightSection?: React.ReactNode;
  fluid?: boolean;
  shadow?: PaperProps['shadow'];
  radius?: PaperProps['radius'];
  withBorder?: PaperProps['withBorder'];
  loading?: boolean;
}

export function PageContainer({
  title,
  children,
  backLink,
  breadcrumb,
  rightSection,
  fluid = false,
  // Paper-specific props with their default values.
  shadow = 'xs',
  radius = 'md',
  withBorder = true,
  loading = false,
  // `...others` safely contains BoxProps, compatible with both Paper and Stack.
  ...others
}: PageContainerProps) {
  const hasHeaderContent = title || backLink || rightSection || breadcrumb;

  // Render the fluid layout using a single Stack as a flex container
  if (fluid) {
    return (
      <Stack h="100%" gap="md" {...others} pos="relative">
        <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />
        {hasHeaderContent && (
          <Box p="md" pb={0}>
             <Group justify="space-between" align="flex-start">
              <Stack gap="md">
                {breadcrumb}
                <Stack gap={4}>
                  {backLink}
                  {title && <Title order={2}>{title}</Title>}
                </Stack>
              </Stack>
              {rightSection && <Box>{rightSection}</Box>}
            </Group>
          </Box>
        )}
        {children}
      </Stack>
    );
  }

  // Render the default layout using a Paper component
  return (
    <Paper shadow={shadow} p="xl" radius={radius} withBorder={withBorder} {...others} pos="relative">
       <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />
      {hasHeaderContent && (
        <Group justify="space-between" align="flex-start" mb="xl">
          <Stack gap="md">
            {breadcrumb}
            <Stack gap={4}>
              {backLink}
              {title && <Title order={2}>{title}</Title>}
            </Stack>
          </Stack>
          {rightSection && <Box>{rightSection}</Box>}
        </Group>
      )}
      {children}
    </Paper>
  );
}