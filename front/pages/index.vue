<template>
    <div>
        <h2>Добро пожаловать в {{ appName }}</h2>
        <p>Управляйте задачами и временем вашей команды с TimeForge!</p>
        <FriendInvite v-if="authStore.isAuthenticated" />
        <FriendsList v-if="authStore.isAuthenticated" />
        <div v-if="authStore.isAuthenticated" class="projects-section">
            <h3>Ваши проекты</h3>

            <div class="filter-section">
                <input
                    type="text"
                    v-model="filter"
                    placeholder="Фильтр по названию проекта"
                    @input="applyFilter"
                    class="filter-input"
                />
            </div>

            <ul class="project-list">
                <li v-for="project in authStore.projects" :key="project.id" class="project-item">
                    <div v-if="editingProjectId !== project.id" class="project-view">
                        <div v-if="!showTasks[project.id]" class="project-card">
                            <NuxtLink :to="`/projects/${project.id}`" class="project-card-link">
                                <span class="project-title">{{ project.name }}</span>
                                <span class="project-description"> - {{ project.description || 'Без описания' }}</span>
                                <span v-if="project.deadline" class="project-deadline"> (Дедлайн: {{ formatDate(project.deadline) }})</span>
                            </NuxtLink>
                        </div>
                        <div v-else class="project-static">
                            <NuxtLink :to="`/projects/${project.id}`" class="project-title-link">
                                <span class="project-title">{{ project.name }}</span>
                            </NuxtLink>
                            <span class="project-description"> - {{ project.description || 'Без описания' }}</span>
                            <span v-if="project.deadline" class="project-deadline"> (Дедлайн: {{ formatDate(project.deadline) }})</span>
                        </div>
                        <div class="project-actions">
                            <button @click.stop="startEditing(project)" class="edit-btn">Редактировать</button>
                            <button @click.stop="deleteProject(project.id)" class="delete-btn">Удалить</button>
                            <button @click.stop="toggleTasks(project.id)" class="tasks-btn">
                                {{ showTasks[project.id] ? 'Скрыть задачи' : 'Показать задачи' }}
                            </button>
                        </div>
                    </div>
                    <form v-else @submit.prevent="saveProject(project.id)" class="edit-form">
                        <input
                            type="text"
                            v-model="editName"
                            placeholder="Название"
                            required
                        />
                        <input
                            type="text"
                            v-model="editDescription"
                            placeholder="Описание"
                        />
                        <input
                            type="date"
                            v-model="editDeadline"
                        />
                        <button type="submit" class="save-btn">Сохранить</button>
                        <button type="button" @click="cancelEditing" class="cancel-btn">Отмена</button>
                    </form>

                    <div v-if="showTasks[project.id]" class="tasks-section">
                        <div class="task-filter-section">
                            <input
                                type="text"
                                v-model="taskFilter[project.id]"
                                placeholder="Фильтр по названию задачи"
                                @input="applyTaskFilter(project.id)"
                                class="filter-input"
                            />
                        </div>

                        <ul class="task-list">
                            <li v-for="task in authStore.tasks[project.id]?.data" :key="task.id" class="task-item">
                                <NuxtLink :to="`/projects/${project.id}/tasks/${task.id}`" class="task-card">
                                    <h4 class="task-title">{{ task.name }}</h4>
                                    <div class="task-details">
                                        <span class="task-status">
                                            <strong>Статус:</strong> {{ task.status.name }}
                                        </span>
                                        <span class="task-date">
                                            <strong>Создано:</strong> {{ formatDate(task.status.createdAt) }}
                                        </span>
                                        <span class="task-assignee" v-if="task.assignee">
                                            <strong>Исполнитель:</strong> {{ task.assignee.name || task.assignee.email }}
                                        </span>
                                    </div>
                                </NuxtLink>
                                <button @click="deleteTask(project.id, task.id)" class="delete-btn">Удалить</button>
                            </li>
                        </ul>

                        <div class="pagination" v-if="authStore.tasks[project.id]?.totalPages > 1">
                            <button
                                :disabled="authStore.tasks[project.id].page === 1"
                                @click="changeTaskPage(project.id, authStore.tasks[project.id].page - 1)"
                                class="page-btn"
                            >
                                Назад
                            </button>
                            <span>Страница {{ authStore.tasks[project.id].page }} из {{ authStore.tasks[project.id].totalPages }}</span>
                            <button
                                :disabled="authStore.tasks[project.id].page === authStore.tasks[project.id].totalPages"
                                @click="changeTaskPage(project.id, authStore.tasks[project.id].page + 1)"
                                class="page-btn"
                            >
                                Вперед
                            </button>
                        </div>
                    </div>
                </li>
            </ul>

            <div class="pagination" v-if="authStore.totalPages > 1">
                <button
                    :disabled="authStore.currentPage === 1"
                    @click="changePage(authStore.currentPage - 1)"
                    class="page-btn"
                >
                    Назад
                </button>
                <span>Страница {{ authStore.currentPage }} из {{ authStore.totalPages }}</span>
                <button
                    :disabled="authStore.currentPage === authStore.totalPages"
                    @click="changePage(authStore.currentPage + 1)"
                    class="page-btn"
                >
                    Вперед
                </button>
            </div>

            <form @submit.prevent="handleCreateProject" class="project-form">
                <div class="form-group">
                    <label for="project-name">Название проекта</label>
                    <input
                        type="text"
                        id="project-name"
                        v-model="projectName"
                        placeholder="Введите название"
                        required
                    />
                </div>
                <div class="form-group">
                    <label for="project-description">Описание</label>
                    <input
                        type="text"
                        id="project-description"
                        v-model="projectDescription"
                        placeholder="Введите описание"
                    />
                </div>
                <div class="form-group">
                    <label for="project-deadline">Дедлайн</label>
                    <input
                        type="date"
                        id="project-deadline"
                        v-model="projectDeadline"
                    />
                </div>
                <button type="submit" class="button">Создать проект</button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';

const appName = 'TimeForge';
const authStore = useAuthStore();

const projectName = ref('');
const projectDescription = ref('');
const projectDeadline = ref('');

const editingProjectId = ref(null);
const editName = ref('');
const editDescription = ref('');
const editDeadline = ref('');

const filter = ref('');
const showTasks = ref({});
const taskFilter = ref({});

onMounted(async () => {
    await authStore.initialize();
});

const handleCreateProject = async () => {
    try {
        await authStore.createProject(projectName.value, projectDescription.value, projectDeadline.value);
        projectName.value = '';
        projectDescription.value = '';
        projectDeadline.value = '';
    } catch (error) {
        alert('Ошибка при создании проекта.');
    }
};

const startEditing = (project) => {
    editingProjectId.value = project.id;
    editName.value = project.name;
    editDescription.value = project.description || '';
    editDeadline.value = project.deadline ? project.deadline.split('T')[0] : '';
};

const saveProject = async (projectId) => {
    try {
        await authStore.updateProject(projectId, editName.value, editDescription.value, editDeadline.value);
        editingProjectId.value = null;
    } catch (error) {
        alert('Ошибка при сохранении проекта.');
    }
};

const cancelEditing = () => {
    editingProjectId.value = null;
};

const deleteProject = async (projectId) => {
    if (confirm('Вы уверены, что хотите удалить проект?')) {
        try {
            await authStore.deleteProject(projectId);
            delete showTasks.value[projectId];
        } catch (error) {
            alert('Ошибка при удалении проекта.');
        }
    }
};

const changePage = (page) => {
    authStore.fetchProjects(page);
};

const applyFilter = () => {
    authStore.projectFilter = filter.value;
    authStore.fetchProjects(1);
};

const toggleTasks = async (projectId) => {
    if (!showTasks.value[projectId]) {
        await authStore.fetchTasks(projectId);
    }
    showTasks.value[projectId] = !showTasks.value[projectId];
};

const deleteTask = async (projectId, taskId) => {
    if (confirm('Вы уверены, что хотите удалить задачу?')) {
        try {
            await authStore.deleteTask(projectId, taskId);
        } catch (error) {
            alert('Ошибка при удалении задачи.');
        }
    }
};

const changeTaskPage = (projectId, page) => {
    authStore.fetchTasks(projectId, page, authStore.tasks[projectId]?.limit, authStore.tasks[projectId]?.filter);
};

const applyTaskFilter = (projectId) => {
    authStore.fetchTasks(projectId, 1, authStore.tasks[projectId]?.limit, taskFilter.value[projectId]);
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
};
</script>

<style lang="scss" scoped>
h2 {
    color: $primary-color;
    margin-bottom: $spacing-md;
    font-size: 2rem;
}

p {
    font-size: 1.2rem;
    margin-bottom: $spacing-lg;
}

.projects-section {
    margin-top: $spacing-lg;
}

h3 {
    color: $primary-color;
    margin-bottom: $spacing-md;
}

.filter-section,
.task-filter-section {
    margin-bottom: $spacing-md;

    .filter-input {
        padding: $spacing-sm;
        border: 1px solid $border-light;
        border-radius: 5px;
        background-color: darken($background-card, 5%);
        color: $text-light;
        width: 100%;
        max-width: 300px;

        &:focus {
            outline: none;
            border-color: $primary-color;
        }
    }
}

.project-list {
    list-style: none;
    padding: 0;

    .project-item {
        padding: $spacing-sm;
        background-color: $background-card;
        border-radius: 5px;
        margin-bottom: $spacing-sm;
        display: flex;
        flex-direction: column;
        gap: $spacing-sm;

        .project-view {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: $spacing-md;
            padding: $spacing-sm;
            border-radius: 5px;

            .project-card {
                flex-grow: 1;
            }

            .project-card-link {
                text-decoration: none;
                color: $text-light;
                display: flex;
                align-items: center;
                gap: $spacing-sm;

                &:hover {
                    .project-title {
                        text-decoration: underline;
                        color: $primary-color;
                    }
                }
            }

            .project-static {
                flex-grow: 1;
                display: flex;
                align-items: center;
                gap: $spacing-sm;
            }

            .project-title-link {
                text-decoration: none;
                color: $text-light;

                &:hover {
                    .project-title {
                        text-decoration: underline;
                        color: $primary-color;
                    }
                }
            }

            .project-title {
                font-size: 1.2rem;
                font-weight: 500;
            }

            .project-description {
                color: lighten($text-light, 10%);
            }

            .project-deadline {
                color: $text-light;
                font-style: italic;
            }

            .project-actions {
                display: flex;
                gap: $spacing-sm;
            }
        }

        .edit-form {
            display: flex;
            flex-direction: column;
            gap: $spacing-sm;

            input {
                padding: $spacing-sm;
                border: 1px solid $border-light;
                border-radius: 5px;
                background-color: darken($background-card, 5%);
                color: $text-light;

                &:focus {
                    outline: none;
                    border-color: $primary-color;
                }
            }

            .save-btn,
            .cancel-btn {
                padding: $spacing-sm $spacing-md;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }

            .save-btn {
                background-color: $primary-color;
                color: $text-light;

                &:hover {
                    background-color: $primary-hover;
                }
            }

            .cancel-btn {
                background-color: $border-light;
                color: $text-light;

                &:hover {
                    background-color: darken($border-light, 10%);
                }
            }
        }

        .edit-btn,
        .delete-btn,
        .tasks-btn {
            padding: 5px $spacing-md;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }

        .edit-btn {
            background-color: $primary-color;
            color: $text-light;

            &:hover {
                background-color: $primary-hover;
            }
        }

        .delete-btn {
            background-color: #dc3545;
            color: $text-light;

            &:hover {
                background-color: darken(#dc3545, 10%);
            }
        }

        .tasks-btn {
            background-color: #17a2b8;
            color: $text-light;

            &:hover {
                background-color: darken(#17a2b8, 10%);
            }
        }
    }
}

.tasks-section {
    margin-top: $spacing-md;
    padding-left: $spacing-lg;

    .task-list {
        list-style: none;
        padding: 0;

        .task-item {
            display: flex;
            align-items: stretch;
            gap: $spacing-md;
            margin-bottom: $spacing-md;
            background-color: darken($background-card, 3%);
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s ease;

            &:hover {
                transform: translateY(-2px);
            }

            .task-card {
                flex-grow: 1;
                padding: $spacing-md;
                text-decoration: none;
                color: $text-light;
                display: flex;
                flex-direction: column;
                gap: $spacing-sm;

                .task-title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: $primary-color;
                    line-height: 1.3;

                    &:hover {
                        text-decoration: underline;
                    }
                }

                .task-details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: $spacing-sm $spacing-md;
                    font-size: 0.95rem;

                    .task-status {
                        color: darken($primary-color, 10%);
                    }

                    .task-date {
                        color: $text-light;
                    }

                    .task-assignee {
                        grid-column: span 2;
                        color: $text-light;
                    }

                    strong {
                        color: $primary-color;
                        margin-right: 4px;
                    }
                }

                &:hover {
                    color: $text-light;
                }
            }

            .delete-btn {
                padding: $spacing-sm $spacing-md;
                border: none;
                border-radius: 0 8px 8px 0;
                background-color: #dc3545;
                color: $text-light;
                cursor: pointer;
                font-size: 0.9rem;
                transition: background-color 0.2s ease;

                &:hover {
                    background-color: darken(#dc3545, 10%);
                }
            }
        }
    }
}

.pagination {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin: $spacing-md 0;

    .page-btn {
        padding: $spacing-sm $spacing-md;
        background-color: $primary-color;
        color: $text-light;
        border: none;
        border-radius: 5px;
        cursor: pointer;

        &:hover:not(:disabled) {
            background-color: $primary-hover;
        }

        &:disabled {
            background-color: $border-light;
            cursor: not-allowed;
        }
    }
}

.project-form {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    margin-top: $spacing-md;

    .form-group {
        display: flex;
        flex-direction: column;

        label {
            margin-bottom: 5px;
            font-size: 1rem;
        }

        input {
            padding: $spacing-sm;
            border: 1px solid $border-light;
            border-radius: 5px;
            background-color: darken($background-card, 5%);
            color: $text-light;
            font-size: 1rem;

            &:focus {
                outline: none;
                border-color: $primary-color;
            }
        }
    }

    .button {
        align-self: flex-start;
    }
}
</style>