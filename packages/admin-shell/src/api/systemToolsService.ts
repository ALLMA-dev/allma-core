import { useMutation } from '@tanstack/react-query';
import axiosInstance from './axiosInstance.js';
import { AdminApiResponse, ALLMA_ADMIN_API_ROUTES, ALLMA_ADMIN_API_VERSION, S3Pointer } from '@allma/core-types';
import { showErrorNotification } from '../utils/notifications.js';

export const useResolveS3Pointer = () => {
    return useMutation({
        mutationFn: async (pointer: S3Pointer) => {
            const response = await axiosInstance.post<AdminApiResponse<any>>(
                `/${ALLMA_ADMIN_API_VERSION}${ALLMA_ADMIN_API_ROUTES.SYSTEM_TOOLS_RESOLVE_S3}`,
                { pointer }
            );
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.error?.message || 'Failed to resolve S3 pointer');
        },
        onError: (error: unknown) => {
            showErrorNotification('Resolution Failed', error);
        }
    });
};