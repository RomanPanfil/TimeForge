<template>
    <div class="project-detail-container" v-if="project">
        <h2>{{ project.name }}</h2>
        <div class="project-info">
            <p><strong>Описание:</strong> {{ project.description || 'Без описания' }}</p>
            <p><strong>Дедлайн:</strong> {{ project.deadline ? formatDate(project.deadline) : 'Не указан' }}</p>
            <p><strong>Владелец:</strong> {{ project.owner.name || project.owner.email }}</p>
            <p><strong>Создан:</strong> {{ formatDate(project.createdAt) }}</p>
            <p><strong>Обновлён:</strong> {{ formatDate(project.updatedAt) }}</p>
        </div>

        <button @click="toggleEditing" class="edit-btn">{{ isEditing ? 'Отменить' : 'Редактировать проект' }}</button>

        <form v-if="isEditing" @submit.prevent="saveProject" class="edit-project-form">
            <div class="form-group">
                <label for="name">Название</label>
                <input
                    type="text"
                    id="name"
                    v-model="editName"
                    placeholder="Введите название"
                    required
                />
            </div>
            <div class="form-group">
                <label for="description">Описание</label>
                <input
                    type="text"
                    id="description"
                    v-model="editDescription"
                    placeholder="Введите описание"
                />
            </div>
            <div class="form-group">
                <label for="deadline">Дедлайн</label>
                <input
                    type="date"
                    id="deadline"
                    v-model="editDeadline"
                />
            </div>
            <button type="submit" class="save-btn">Сохранить</button>
        </form>

        <h3>Задачи</h3>
        <div class="tabs">
            <button
                :class="{ active: activeTab === 'list' }"
                @click="switchTab('list')"
                class="tab-btn"
            >
                Список
            </button>
            <button
                :class="{ active: activeTab === 'kanban' }"
                @click="switchTab('kanban')"
                class="tab-btn"
            >
                Канбан
            </button>
        </div>

        <div v-if="activeTab === 'list'" class="list-view">
            <div class="task-filter-section">
                <input
                    type="text"
                    v-model="taskFilter"
                    placeholder="Фильтр по названию задачи"
                    @input="applyTaskFilter"
                    class="filter-input"
                />
                <button @click="showManageStatusesModal = true" class="manage-statuses-btn">Управление статусами</button>
            </div>

            <ul class="task-list">
                <li v-for="task in project.tasks.data" :key="task.id" class="task-item">
                    <div v-if="editingTaskId !== task.id" class="task-view">
                        <NuxtLink :to="`/projects/${project.id}/tasks/${task.id}`">{{ task.name }}</NuxtLink> - {{ task.description || 'Без описания' }} ({{ task.status.name }})
                        <span v-if="task.assignee"> - Исполнитель: {{ task.assignee.name || task.assignee.email }}</span>
                        <button @click="startEditingTask(task)" class="edit-btn">Редактировать</button>
                        <button @click="deleteTask(task.id)" class="delete-btn">Удалить</button>
                    </div>
                    <form v-else @submit.prevent="saveTask(task.id)" class="edit-task-form">
                        <input
                            type="text"
                            v-model="editTaskName"
                            placeholder="Название"
                            required
                        />
                        <input
                            type="text"
                            v-model="editTaskDescription"
                            placeholder="Описание"
                        />
                        <select v-model="editTaskStatusId" @change="handleStatusChange($event, task.statusId)">
                            <option v-for="status in project.statuses" :key="status.id" :value="status.id">
                                {{ status.name }}
                            </option>
                            <option value="add">Добавить</option>
                        </select>
                        <select v-model="editTaskAssigneeId">
                            <option :value="null">Без исполнителя</option>
                            <option v-for="user in authStore.users" :key="user.id" :value="user.id">
                                {{ user.name || user.email }}
                            </option>
                        </select>
                        <button type="submit" class="save-btn">Сохранить</button>
                        <button type="button" @click="cancelEditingTask" class="cancel-btn">Отмена</button>
                    </form>
                </li>
            </ul>

            <div class="pagination" v-if="project.tasks.totalPages > 1">
                <button
                    :disabled="project.tasks.page === 1"
                    @click="changeTaskPage(project.tasks.page - 1)"
                    class="page-btn"
                >
                    Назад
                </button>
                <span>Страница {{ project.tasks.page }} из {{ project.tasks.totalPages }}</span>
                <button
                    :disabled="project.tasks.page === project.tasks.totalPages"
                    @click="changeTaskPage(project.tasks.page + 1)"
                    class="page-btn"
                >
                    Вперед
                </button>
            </div>
        </div>

        <div v-if="activeTab === 'kanban'" class="kanban-view">
            <div class="kanban-board">
                <div class="kanban-column" v-for="status in project.statuses" :key="status.id" :data-status="status.id">
                    <div class="status-header">
                        <h4>{{ status.name }}</h4>
                        <button @click="editStatus(status)" class="edit-status-btn">✏️</button>
                        <button @click="confirmDeleteStatus(status.id)" class="delete-status-btn">🗑️</button>
                    </div>
                    <draggable
                        :list="getTasksByStatus(status.id)"
                        group="tasks"
                        item-key="id"
                        @end="onDragEnd"
                        class="kanban-list"
                    >
                        <template #item="{ element: task }">
                            <div class="kanban-item">
                                <NuxtLink :to="`/projects/${project.id}/tasks/${task.id}`">{{ task.name }}</NuxtLink>
                                <p>{{ task.description || 'Без описания' }}</p>
                                <p v-if="task.assignee">Исполнитель: {{ task.assignee.name || task.assignee.email }}</p>
                                <button @click="startEditingTask(task)" class="edit-btn">Редактировать</button>
                                <button @click="deleteTask(task.id)" class="delete-btn">Удалить</button>
                            </div>
                        </template>
                    </draggable>
                </div>
                <div class="kanban-column add-status-column">
                    <button @click="showNewStatusModal = true" class="add-status-btn">+</button>
                </div>
            </div>
        </div>

        <form @submit.prevent="handleCreateTask" class="task-form">
            <input
                type="text"
                v-model="newTaskName"
                placeholder="Название задачи"
                required
            />
            <input
                type="text"
                v-model="newTaskDescription"
                placeholder="Описание"
            />
            <select v-model="newTaskStatusId" @change="handleStatusChange($event)">
                <option v-for="status in project.statuses" :key="status.id" :value="status.id">
                    {{ status.name }}
                </option>
                <option value="add">Добавить</option>
            </select>
            <select v-model="newTaskAssigneeId">
                <option :value="null">Без исполнителя</option>
                <option v-for="user in authStore.users" :key="user.id" :value="user.id">
                    {{ user.name || user.email }}
                </option>
            </select>
            <button type="submit" class="button">Добавить задачу</button>
        </form>

        <!-- Модальное окно для добавления нового статуса -->
        <div v-if="showNewStatusModal" class="modal-overlay" @click.self="showNewStatusModal = false">
            <div class="modal-content">
                <h4>{{ editingStatus ? 'Редактировать статус' : 'Добавить новый статус' }}</h4>
                <form @submit.prevent="editingStatus ? updateStatus() : addNewStatus()">
                    <input
                        type="text"
                        v-model="newStatusName"
                        placeholder="Название статуса"
                        required
                        class="modal-input"
                    />
                    <button type="submit" class="save-btn">Сохранить</button>
                    <button type="button" @click="closeNewStatusModal" class="cancel-btn">Отмена</button>
                </form>
            </div>
        </div>

        <!-- Модальное окно для управления статусами в списке -->
        <div v-if="showManageStatusesModal" class="modal-overlay" @click.self="showManageStatusesModal = false">
            <div class="modal-content manage-statuses-modal">
                <h4>Управление статусами</h4>
                <ul class="status-list">
                    <li v-for="status in project.statuses" :key="status.id" class="status-item">
                        <span>{{ status.name }}</span>
                        <button @click="editStatus(status)" class="edit-status-btn">✏️</button>
                        <button @click="confirmDeleteStatus(status.id)" class="delete-status-btn">🗑️</button>
                    </li>
                </ul>
                <button @click="showNewStatusModal = true" class="add-status-btn">Добавить статус</button>
                <button @click="showManageStatusesModal = false" class="close-btn">Закрыть</button>
            </div>
        </div>

        <NuxtLink to="/" class="back-link">Назад к проектам</NuxtLink>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import Draggable from 'vuedraggable';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const project = ref(null);
const isEditing = ref(false);
const editName = ref('');
const editDescription = ref('');
const editDeadline = ref('');

const editingTaskId = ref(null);
const editTaskName = ref('');
const editTaskDescription = ref('');
const editTaskStatusId = ref(null);
const editTaskAssigneeId = ref(null);

const newTaskName = ref('');
const newTaskDescription = ref('');
const newTaskStatusId = ref(null);
const newTaskAssigneeId = ref(null);

const taskFilter = ref('');
const taskPage = ref(1);
const taskLimit = ref(5);

const activeTab = ref('list');

const showNewStatusModal = ref(false);
const showManageStatusesModal = ref(false);
const newStatusName = ref('');
const editingStatus = ref(null);

onMounted(async () => {
    await authStore.initialize();
    if (!authStore.isAuthenticated) {
        router.push('/login');
    } else {
        await loadProject();
        if (project.value && project.value.statuses.length > 0) {
            newTaskStatusId.value = project.value.statuses.find(s => s.name === 'К выполнению')?.id || project.value.statuses[0].id;
        }
    }
});

const loadProject = async (allTasks = false) => {
    const projectId = parseInt(route.params.id);
    try {
        project.value = await authStore.fetchProject(projectId, taskPage.value, taskLimit.value, taskFilter.value, allTasks);
        editName.value = project.value.name;
        editDescription.value = project.value.description || '';
        editDeadline.value = project.value.deadline ? project.value.deadline.split('T')[0] : '';
    } catch (error) {
        router.push('/');
    }
};

const toggleEditing = () => {
    isEditing.value = !isEditing.value;
    if (!isEditing.value) {
        editName.value = project.value.name;
        editDescription.value = project.value.description || '';
        editDeadline.value = project.value.deadline ? project.value.deadline.split('T')[0] : '';
    }
};

const saveProject = async () => {
    const projectId = parseInt(route.params.id);
    try {
        await authStore.updateProject(projectId, editName.value, editDescription.value, editDeadline.value);
        await loadProject(activeTab.value === 'kanban');
        isEditing.value = false;
    } catch (error) {
        alert('Ошибка при сохранении проекта.');
    }
};

const handleCreateTask = async () => {
    const projectId = parseInt(route.params.id);
    try {
        await authStore.createTask(projectId, newTaskName.value, newTaskDescription.value, newTaskStatusId.value, newTaskAssigneeId.value);
        await loadProject(activeTab.value === 'kanban');
        newTaskName.value = '';
        newTaskDescription.value = '';
        newTaskStatusId.value = project.value.statuses.find(s => s.name === 'К выполнению')?.id || project.value.statuses[0].id;
        newTaskAssigneeId.value = null;
    } catch (error) {
        alert('Ошибка при создании задачи.');
    }
};

const startEditingTask = (task) => {
    editingTaskId.value = task.id;
    editTaskName.value = task.name;
    editTaskDescription.value = task.description || '';
    editTaskStatusId.value = task.statusId;
    editTaskAssigneeId.value = task.assigneeId || null;
};

const saveTask = async (taskId) => {
    const projectId = parseInt(route.params.id);
    try {
        await authStore.updateTask(projectId, taskId, editTaskName.value, editTaskDescription.value, editTaskStatusId.value, editTaskAssigneeId.value);
        await loadProject(activeTab.value === 'kanban');
        editingTaskId.value = null;
    } catch (error) {
        alert('Ошибка при сохранении задачи.');
    }
};

const cancelEditingTask = () => {
    editingTaskId.value = null;
};

const deleteTask = async (taskId) => {
    if (confirm('Вы уверены, что хотите удалить задачу?')) {
        const projectId = parseInt(route.params.id);
        try {
            await authStore.deleteTask(projectId, taskId);
            await loadProject(activeTab.value === 'kanban');
        } catch (error) {
            alert('Ошибка при удалении задачи.');
        }
    }
};

const changeTaskPage = async (page) => {
    taskPage.value = page;
    const projectId = parseInt(route.params.id);
    project.value = await authStore.fetchProject(projectId, taskPage.value, taskLimit.value, taskFilter.value);
};

const applyTaskFilter = async () => {
    taskPage.value = 1;
    const projectId = parseInt(route.params.id);
    project.value = await authStore.fetchProject(projectId, taskPage.value, taskLimit.value, taskFilter.value);
};

const switchTab = async (tab) => {
    activeTab.value = tab;
    await loadProject(tab === 'kanban');
};

const getTasksByStatus = (statusId) => {
    return project.value.tasks.data.filter(task => task.statusId === statusId);
};

const onDragEnd = async (evt) => {
    const projectId = parseInt(route.params.id);
    const taskId = evt.item.__draggable_context.element.id;
    const newStatusId = evt.to.closest('.kanban-column').getAttribute('data-status');

    if (!newStatusId) {
        console.error('Не удалось определить новый статус');
        return;
    }

    const task = project.value.tasks.data.find(t => t.id === taskId);
    if (task && task.statusId !== parseInt(newStatusId)) {
        try {
            console.log(`Перетаскивание задачи ${taskId} из ${task.status.name} в статус с ID ${newStatusId}`);
            await authStore.updateTask(projectId, taskId, task.name, task.description, parseInt(newStatusId), task.assigneeId);
            task.statusId = parseInt(newStatusId);
            task.status = project.value.statuses.find(s => s.id === parseInt(newStatusId));
        } catch (error) {
            console.error('Ошибка при обновлении статуса задачи:', error);
            alert('Ошибка при обновлении статуса задачи.');
            await loadProject(activeTab.value === 'kanban');
        }
    }
};

const addNewStatus = async () => {
    const projectId = parseInt(route.params.id);
    try {
        await authStore.createTaskStatus(projectId, newStatusName.value);
        await loadProject(activeTab.value === 'kanban');
        showNewStatusModal.value = false;
        newStatusName.value = '';
        if (editingTaskId.value) {
            editTaskStatusId.value = project.value.statuses.find(s => s.name === newStatusName.value)?.id || editTaskStatusId.value;
        } else {
            newTaskStatusId.value = project.value.statuses.find(s => s.name === newStatusName.value)?.id || newTaskStatusId.value;
        }
    } catch (error) {
        alert('Ошибка при добавлении статуса: ' + error.message);
    }
};

const editStatus = (status) => {
    editingStatus.value = status;
    newStatusName.value = status.name;
    showNewStatusModal.value = true;
};

const updateStatus = async () => {
    const projectId = parseInt(route.params.id);
    try {
        await authStore.updateTaskStatus(projectId, editingStatus.value.id, newStatusName.value);
        await loadProject(activeTab.value === 'kanban');
        showNewStatusModal.value = false;
        newStatusName.value = '';
        editingStatus.value = null;
    } catch (error) {
        alert('Ошибка при редактировании статуса: ' + error.message);
    }
};

const confirmDeleteStatus = (statusId) => {
    const status = project.value.statuses.find(s => s.id === statusId);
    if (confirm(`Вы уверены, что хотите удалить статус "${status.name}"? Это действие нельзя отменить, если статус не используется в задачах.`)) {
        deleteStatus(statusId);
    }
};

const deleteStatus = async (statusId) => {
    const projectId = parseInt(route.params.id);
    try {
        await authStore.deleteTaskStatus(projectId, statusId);
        await loadProject(activeTab.value === 'kanban');
    } catch (error) {
        alert('Ошибка при удалении статуса: ' + error.message);
    }
};

const handleStatusChange = (event, previousStatusId = null) => {
    if (event.target.value === 'add') {
        showNewStatusModal.value = true;
        if (editingTaskId.value) {
            editTaskStatusId.value = previousStatusId;
        } else {
            newTaskStatusId.value = project.value.statuses.find(s => s.name === 'К выполнению')?.id || project.value.statuses[0].id;
        }
    }
};

const closeNewStatusModal = () => {
    showNewStatusModal.value = false;
    newStatusName.value = '';
    editingStatus.value = null;
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
};
</script>

<style lang="scss" scoped>
.project-detail-container {
    max-width: 1200px;
    margin: 50px auto;
    padding: $spacing-lg;
    background-color: $background-card;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

h2 {
    color: $primary-color;
    margin-bottom: $spacing-md;
    font-size: 2rem;
}

.project-info {
    margin-bottom: $spacing-lg;

    p {
        margin: 5px 0;
        strong {
            color: $primary-color;
        }
    }
}

.edit-btn {
    padding: $spacing-sm $spacing-md;
    background-color: $primary-color;
    color: $text-light;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-bottom: $spacing-md;

    &:hover {
        background-color: $primary-hover;
    }
}

.edit-project-form {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    margin-bottom: $spacing-lg;

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

            &:focus {
                outline: none;
                border-color: $primary-color;
            }
        }
    }

    .save-btn {
        padding: $spacing-sm $spacing-md;
        background-color: $primary-color;
        color: $text-light;
        border: none;
        border-radius: 5px;
        cursor: pointer;

        &:hover {
            background-color: $primary-hover;
        }
    }
}

h3 {
    color: $primary-color;
    margin-bottom: $spacing-md;
}

.tabs {
    display: flex;
    gap: $spacing-md;
    margin-bottom: $spacing-lg;

    .tab-btn {
        padding: $spacing-sm $spacing-md;
        background-color: $border-light;
        color: $text-light;
        border: none;
        border-radius: 5px;
        cursor: pointer;

        &.active {
            background-color: $primary-color;
        }

        &:hover:not(.active) {
            background-color: lighten($border-light, 10%);
        }
    }
}

.list-view {
    .task-filter-section {
        display: flex;
        gap: $spacing-md;
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

        .manage-statuses-btn {
            padding: $spacing-sm $spacing-md;
            background-color: $primary-color;
            color: $text-light;
            border: none;
            border-radius: 5px;
            cursor: pointer;

            &:hover {
                background-color: $primary-hover;
            }
        }
    }

    .task-list {
        list-style: none;
        padding: 0;

        .task-item {
            padding: $spacing-sm;
            background-color: darken($background-card, 5%);
            border-radius: 5px;
            margin-bottom: $spacing-sm;

            .task-view {
                display: flex;
                align-items: center;
                gap: $spacing-md;
            }

            .edit-task-form {
                display: flex;
                flex-direction: column;
                gap: $spacing-sm;

                input,
                select {
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
            .delete-btn {
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
}

.kanban-view {
    .kanban-board {
        display: flex;
        gap: $spacing-md;
        overflow-x: auto;

        .kanban-column {
            flex: 1;
            min-width: 300px;
            background-color: darken($background-card, 5%);
            border-radius: 5px;
            padding: $spacing-sm;

            .status-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: $spacing-sm;

                h4 {
                    color: $primary-color;
                    margin: 0;
                    flex-grow: 1;
                    text-align: center;
                }

                .edit-status-btn,
                .delete-status-btn {
                    padding: 5px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                    color: $text-light;

                    &:hover {
                        color: $primary-hover;
                    }
                }

                .delete-status-btn {
                    &:hover {
                        color: #dc3545;
                    }
                }
            }

            .kanban-list {
                min-height: 100px;
            }

            .kanban-item {
                background-color: $background-card;
                border-radius: 5px;
                padding: $spacing-sm;
                margin-bottom: $spacing-sm;
                cursor: move;

                p {
                    margin: 5px 0;
                }

                .edit-btn,
                .delete-btn {
                    padding: 5px $spacing-md;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-right: $spacing-sm;
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
            }
        }

        .add-status-column {
            display: flex;
            align-items: center;
            justify-content: center;

            .add-status-btn {
                width: 40px;
                height: 40px;
                background-color: $primary-color;
                color: $text-light;
                font-size: 1.5rem;
                border: none;
                border-radius: 50%;
                cursor: pointer;

                &:hover {
                    background-color: $primary-hover;
                }
            }
        }
    }
}

.task-form {
    display: flex;
    gap: $spacing-md;
    margin-top: $spacing-md;

    input,
    select {
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

    .button {
        padding: $spacing-sm $spacing-md;
        background-color: $primary-color;
        color: $text-light;
        border: none;
        border-radius: 5px;
        cursor: pointer;

        &:hover {
            background-color: $primary-hover;
        }
    }
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal-content {
    background: $background-card;
    padding: $spacing-lg;
    border-radius: 10px;
    width: 300px;

    &.manage-statuses-modal {
        width: 400px;
    }

    h4 {
        color: $primary-color;
        margin-bottom: $spacing-md;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: $spacing-md;

        .modal-input {
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

    .status-list {
        list-style: none;
        padding: 0;
        margin-bottom: $spacing-md;

        .status-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: $spacing-sm;
            background-color: darken($background-card, 5%);
            border-radius: 5px;
            margin-bottom: $spacing-sm;

            span {
                flex-grow: 1;
            }

            .edit-status-btn,
            .delete-status-btn {
                padding: 5px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 1rem;
                color: $text-light;

                &:hover {
                    color: $primary-hover;
                }
            }

            .delete-status-btn {
                &:hover {
                    color: #dc3545;
                }
            }
        }
    }

    .add-status-btn,
    .close-btn {
        padding: $spacing-sm $spacing-md;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }

    .add-status-btn {
        background-color: $primary-color;
        color: $text-light;

        &:hover {
            background-color: $primary-hover;
        }
    }

    .close-btn {
        background-color: $border-light;
        color: $text-light;

        &:hover {
            background-color: darken($border-light, 10%);
        }
    }
}

.back-link {
    display: block;
    text-align: center;
    margin-top: $spacing-md;
    color: $primary-color;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
}
</style>