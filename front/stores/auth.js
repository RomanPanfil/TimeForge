import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: null,
        user: null,
        isAuthenticated: false,
        projects: [],
        totalProjects: 0,
        currentPage: 1,
        totalPages: 0,
        projectsPerPage: 5,
        projectFilter: '',
        tasks: {},
        users: [],
        assignedTasks: { data: [], total: 0, page: 1, totalPages: 0, limit: 5, filter: '' },
    }),
    actions: {
        async login(email, password) {
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/auth/login`, {
                    method: 'POST',
                    body: { email, password },
                });
                this.token = response.access_token;
                this.isAuthenticated = true;
                if (process.client) {
                    localStorage.setItem('token', this.token);
                }
                await this.fetchUser();
                await this.fetchProjects();
                await this.fetchUsers();
                await this.fetchAssignedTasks();
            } catch (error) {
                console.error('Login error:', error);
                throw error;
            }
        },
        async register(email, password, name, avatarFile, birthday) {
            const config = useRuntimeConfig();
            try {
                const formData = new FormData();
                formData.append('email', email);
                formData.append('password', password);
                if (name) formData.append('name', name);
                if (avatarFile) formData.append('avatar', avatarFile);
                if (birthday) formData.append('birthday', birthday);

                const response = await $fetch(`${config.public.apiUrl}/auth/register`, {
                    method: 'POST',
                    body: formData,
                });
                this.token = response.access_token;
                this.isAuthenticated = true;
                if (process.client) {
                    localStorage.setItem('token', this.token);
                }
                await this.fetchUser();
                await this.fetchProjects();
                await this.fetchUsers();
                await this.fetchAssignedTasks();
            } catch (error) {
                console.error('Register error:', error);
                throw error;
            }
        },
        logout() {
            this.token = null;
            this.user = null;
            this.isAuthenticated = false;
            this.projects = [];
            this.totalProjects = 0;
            this.currentPage = 1;
            this.totalPages = 0;
            this.projectFilter = '';
            this.tasks = {};
            this.users = [];
            this.assignedTasks = { data: [], total: 0, page: 1, totalPages: 0, limit: 5, filter: '' };
            if (process.client) {
                localStorage.removeItem('token');
            }
        },
        async initialize() {
            if (process.client) {
                const token = localStorage.getItem('token');
                if (token) {
                    this.token = token;
                    this.isAuthenticated = true;
                    await this.fetchUser();
                    await this.fetchProjects();
                    await this.fetchUsers();
                    await this.fetchAssignedTasks();
                }
            }
        },
        async fetchUser() {
            if (!this.token) return;
            const config = useRuntimeConfig();
            try {
                const user = await $fetch(`${config.public.apiUrl}/auth/me`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                });
                this.user = user;
            } catch (error) {
                console.error('Fetch user error:', error);
                this.logout();
            }
        },
        async updateProfile(name, avatarFile, birthday) {
            const config = useRuntimeConfig();
            try {
                const formData = new FormData();
                if (name) formData.append('name', name);
                if (avatarFile) formData.append('avatar', avatarFile);
                if (birthday) formData.append('birthday', birthday);

                const response = await $fetch(`${config.public.apiUrl}/auth/me`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    body: formData,
                });
                this.user = response;
            } catch (error) {
                console.error('Update profile error:', error);
                throw error;
            }
        },
        async fetchProjects(page = this.currentPage, limit = this.projectsPerPage, filter = this.projectFilter) {
            if (!this.token) return;
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    params: { page, limit, filter },
                });
                this.projects = response.data;
                this.totalProjects = response.total;
                this.currentPage = response.page;
                this.totalPages = response.totalPages;
            } catch (error) {
                console.error('Fetch projects error:', error);
            }
        },
        async createProject(name, description, deadline) {
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    body: { name, description, deadline },
                });
                this.projects.push(response);
                await this.fetchProjects();
            } catch (error) {
                console.error('Create project error:', error);
                throw error;
            }
        },
        async updateProject(projectId, name, description, deadline) {
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects/${projectId}`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    body: { name, description, deadline },
                });
                const index = this.projects.findIndex((p) => p.id === projectId);
                if (index !== -1) {
                    this.projects[index] = response;
                }
                await this.fetchTasks(projectId);
            } catch (error) {
                console.error('Update project error:', error);
                throw error;
            }
        },
        async deleteProject(projectId) {
            const config = useRuntimeConfig();
            try {
                await $fetch(`${config.public.apiUrl}/projects/${projectId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                });
                await this.fetchProjects();
                delete this.tasks[projectId];
            } catch (error) {
                console.error('Delete project error:', error);
                throw error;
            }
        },
        async fetchTasks(projectId, page = 1, limit = 5, filter = '') {
            if (!this.token) return;
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    params: { page, limit, filter },
                });
                this.tasks[projectId] = {
                    data: response.data,
                    total: response.total,
                    page: response.page,
                    totalPages: response.totalPages,
                    limit,
                    filter,
                };
            } catch (error) {
                console.error('Fetch tasks error:', error);
            }
        },
        async createTask(projectId, name, description, statusId, assigneeId) {
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    body: { name, description, statusId, assigneeId },
                });
                await this.fetchTasks(projectId, this.tasks[projectId]?.page || 1, this.tasks[projectId]?.limit || 5, this.tasks[projectId]?.filter || '');
                await this.fetchAssignedTasks();
            } catch (error) {
                console.error('Create task error:', error);
                throw error;
            }
        },
        async updateTask(projectId, taskId, name, description, statusId, assigneeId) {
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, description, statusId, assigneeId }),
                });
                if (this.tasks[projectId] && this.tasks[projectId].data) {
                    const tasks = this.tasks[projectId].data;
                    const index = tasks.findIndex((t) => t.id === taskId);
                    if (index !== -1) {
                        tasks[index] = response;
                    }
                }
                await this.fetchAssignedTasks();
                return response; // Убедимся, что возвращаем результат
            } catch (error) {
                console.error('Update task error:', error);
                throw error; // Пробрасываем ошибку дальше
            }
        },
        async deleteTask(projectId, taskId) {
            const config = useRuntimeConfig();
            try {
                await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/${taskId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                });
                await this.fetchTasks(projectId, this.tasks[projectId]?.page || 1, this.tasks[projectId]?.limit || 5, this.tasks[projectId]?.filter || '');
                await this.fetchAssignedTasks();
            } catch (error) {
                console.error('Delete task error:', error);
                throw error;
            }
        },
        async fetchUsers() {
            if (!this.token) return;
            const config = useRuntimeConfig();
            try {
                const users = await $fetch(`${config.public.apiUrl}/users`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                });
                this.users = users;
            } catch (error) {
                console.error('Fetch users error:', error);
            }
        },
        async sendFriendRequest(email) {
            const config = useRuntimeConfig();
            await $fetch(`${config.public.apiUrl}/friends/invite`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.token}` },
                body: { email },
            });
        },
        async fetchFriendRequests() {
            const config = useRuntimeConfig();
            return $fetch(`${config.public.apiUrl}/friends/requests`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${this.token}` },
            });
        },
        async respondToFriendRequest(requestId, accept) {
            const config = useRuntimeConfig();
            await $fetch(`${config.public.apiUrl}/friends/respond/${requestId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${this.token}` },
                body: { accept },
            });
        },
        async fetchAssignedTasks(page = 1, limit = 5, filter = '') {
            if (!this.token) return;
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/tasks/my-tasks`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    params: { page, limit, filter },
                });
                this.assignedTasks = {
                    data: response.data,
                    total: response.total,
                    page: response.page,
                    totalPages: response.totalPages,
                    limit,
                    filter,
                };
            } catch (error) {
                console.error('Fetch assigned tasks error:', error);
            }
        },
        async fetchProject(projectId, taskPage = 1, taskLimit = 5, taskFilter = '', allTasks = false) {
            if (!this.token) return;
            const config = useRuntimeConfig();
            try {
                const project = await $fetch(`${config.public.apiUrl}/projects/${projectId}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    params: { taskPage, taskLimit, taskFilter, allTasks },
                });
                this.tasks[projectId] = allTasks
                    ? { data: project.tasks.data, total: project.tasks.total }
                    : {
                        data: project.tasks.data,
                        total: project.tasks.total,
                        page: project.tasks.page,
                        totalPages: project.tasks.totalPages,
                        limit: project.tasks.limit,
                        filter: project.tasks.taskFilter || '',
                    };
                return project;
            } catch (error) {
                console.error('Fetch project error:', error);
                throw error;
            }
        },
        async createTaskStatus(projectId, name) {
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/statuses`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    body: { name },
                });
                return response;
            } catch (error) {
                console.error('Create task status error:', error);
                throw error;
            }
        },
        async fetchTaskStatuses(projectId) {
            const config = useRuntimeConfig();
            try {
                const statuses = await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/statuses`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                });
                return statuses;
            } catch (error) {
                console.error('Fetch task statuses error:', error);
                throw error;
            }
        },
        async updateTaskStatus(projectId, statusId, name) {
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/statuses/${statusId}`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    body: { name },
                });
                return response;
            } catch (error) {
                console.error('Update task status error:', error);
                throw error;
            }
        },
        async deleteTaskStatus(projectId, statusId) {
            const config = useRuntimeConfig();
            try {
                await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/statuses/${statusId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                });
            } catch (error) {
                console.error('Delete task status error:', error);
                throw error;
            }
        },
        async fetchTask(projectId, taskId) {
            const config = useRuntimeConfig();
            try {
                const task = await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/${taskId}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                });
                return task;
            } catch (error) {
                console.error('Fetch task error:', error);
                throw error;
            }
        },

        async updateTimeEntry(projectId, taskId, timeEntryId, startTime, endTime) {
            const config = useRuntimeConfig();
            try {
                const response = await $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/${taskId}/time/${timeEntryId}`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ startTime, endTime }),
                });
                return response;
            } catch (error) {
                console.error('Update time entry error:', error);
                throw error;
            }
        },

        async startTimeTracking(projectId, taskId) {
            const config = useRuntimeConfig();
            const token = localStorage.getItem('token');
            return $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/${taskId}/time/start`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
        },

        async stopTimeTracking(projectId, taskId) {
            const config = useRuntimeConfig();
            const token = localStorage.getItem('token');
            return $fetch(`${config.public.apiUrl}/projects/${projectId}/tasks/${taskId}/time/stop`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
        },
    },
});