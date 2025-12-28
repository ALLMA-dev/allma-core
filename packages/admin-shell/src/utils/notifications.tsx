import React from 'react';
import { notifications } from '@mantine/notifications';
import { Text, Code, Accordion, Stack } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import axios from 'axios';
import { AdminApiErrorResponse } from '@allma/core-types';

const xIcon = <IconX size="1.1rem" />;

/**
 * Displays a standardized error notification, parsing backend error details if available.
 * @param title The title of the notification.
 * @param error The error object, typically from a react-query `onError` callback.
 * @param defaultMessage A fallback message if the error object is not informative.
 */
export function showErrorNotification(title: string, error: unknown, defaultMessage = 'An unexpected error occurred.') {
    let message: React.ReactNode = defaultMessage;
    let autoClose: number | false = 10000;

    if (axios.isAxiosError(error) && error.response?.data?.error) {
        const apiError = (error.response.data as AdminApiErrorResponse).error;
        if (apiError.message) {
            if (apiError.details && Object.keys(apiError.details).length > 0) {
                autoClose = false; // Don't auto-close notifications with details
                message = (
                    <Stack gap="xs" style={{ maxWidth: 400 }}>
                        <Text size="sm">{apiError.message}</Text>
                        <Accordion variant="transparent" radius={0}>
                            <Accordion.Item value="details">
                                <Accordion.Control p={0}>
                                    <Text size="xs">View Details</Text>
                                </Accordion.Control>
                                <Accordion.Panel p="xs">
                                    <Code block fz="xs">
                                        {JSON.stringify(apiError.details, null, 2)}
                                    </Code>
                                </Accordion.Panel>
                            </Accordion.Item>
                        </Accordion>
                    </Stack>
                );
            } else {
                message = apiError.message;
                // If message is long, give the user time to read it.
                if (typeof message === 'string' && message.length > 120) {
                    autoClose = false;
                }
            }
        }
    } else if (error instanceof Error) {
        message = error.message;
    }

    notifications.show({
        title,
        message,
        color: 'red',
        icon: xIcon,
        autoClose,
    });
}