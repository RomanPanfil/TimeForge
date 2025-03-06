import { defineStore } from 'pinia';

export const useCommentsStore = defineStore('comments', {
    actions: {
        async createComment(projectId, taskId, content, file = null) {
            const config = useRuntimeConfig();
            const formData = new FormData();
            formData.append('content', content);
            if (file) {
                formData.append('file', file);
            }
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/${taskId}/comments`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: formData,
                });
                return response;
            } catch (error) {
                console.error('Create comment error:', error);
                throw error;
            }
        },
        async updateComment(projectId, taskId, commentId, content, file = null) {
            const config = useRuntimeConfig();
            const formData = new FormData();
            formData.append('content', content);
            if (file) {
                formData.append('file', file);
            }
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: formData,
                });
                return response;
            } catch (error) {
                console.error('Update comment error:', error);
                throw error;
            }
        },
        async deleteComment(projectId, taskId, commentId) {
            const config = useRuntimeConfig();
            try {
                await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
            } catch (error) {
                console.error('Delete comment error:', error);
                throw error;
            }
        },
    },
});