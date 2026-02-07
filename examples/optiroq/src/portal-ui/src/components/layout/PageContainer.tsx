import { Paper, Title, Box, Group, Stack, LoadingOverlay } from '@mantine/core';
import React from 'react';

interface PageContainerProps {
  title: React.ReactNode;
  children: React.ReactNode;
  rightSection?: React.ReactNode;
  loading?: boolean;
}

/**
 * A consistent wrapper for page content, providing a title bar and a content area.
 */
export function PageContainer({
  title,
  children,
  rightSection,
  loading = false,
}: PageContainerProps) {
  return (
    <Stack>
      <Group justify="space-between" align="center" mb="md">
        <Title order={2}>{title}</Title>
        {rightSection && <Box>{rightSection}</Box>}
      </Group>

      <Paper withBorder shadow="sm" p="lg" pos="relative">
        <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />
        {children}
      </Paper>
    </Stack>
  );
}