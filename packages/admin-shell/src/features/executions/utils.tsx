// packages/allma-admin-shell/src/features/executions/utils.ts
import { IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';

export const getStatusColor = (status: string) => {
    switch (status) {
        case 'COMPLETED': return 'green';
        case 'RUNNING': return 'blue';
        case 'FAILED': return 'red';
        case 'TIMED_OUT': return 'orange';
        case 'CANCELLED': return 'gray';
        case 'RETRYING_SFN':
        case 'RETRYING_CONTENT':
             return 'yellow';
        default: return 'dark';
    }
};

export const getStatusIcon = (status: string) => {
    switch (status) {
        case 'COMPLETED': return <IconCheck size="1rem" />;
        case 'FAILED': return <IconX size="1rem" />;
        default: return <IconInfoCircle size="1rem" />;
    }
};