<template>
    <div class="task-detail-container" v-if="task">
        <h2>{{ task.name }}</h2>
        <div class="task-info">
            <p><strong>Описание:</strong></p>
            <div class="task-description-container">
                <div v-if="!isEditingDescription" class="task-description" v-html="task.description || 'Без описания'"></div>
                <button v-if="!isEditingDescription" @click="startEditingDescription" class="edit-description-btn">✏️</button>
                <div v-else class="description-editor">
                    <div class="editor-toolbar">
                        <button
                            type="button"
                            @click="editor?.chain().focus().toggleBold().run()"
                            :class="{ 'is-active': editor?.isActive('bold') }"
                        >B</button>
                        <button
                            type="button"
                            @click="editor?.chain().focus().toggleItalic().run()"
                            :class="{ 'is-active': editor?.isActive('italic') }"
                        >I</button>
                        <button
                            type="button"
                            @click="editor?.chain().focus().toggleUnderline().run()"
                            :class="{ 'is-active': editor?.isActive('underline') }"
                        >U</button>
                        <button
                            type="button"
                            @click="editor?.chain().focus().toggleBulletList().run()"
                            :class="{ 'is-active': editor?.isActive('bulletList') }"
                        >•</button>
                        <button
                            type="button"
                            @click="editor?.chain().focus().toggleOrderedList().run()"
                            :class="{ 'is-active': editor?.isActive('orderedList') }"
                        >1.</button>
                        <button
                            type="button"
                            @click="toggleLink"
                            :class="{ 'is-active': editor?.isActive('link') }"
                        >🔗</button>
                        <input
                            type="file"
                            ref="imageInput"
                            @change="uploadImage"
                            accept="image/png,image/jpeg"
                            style="display: none"
                        />
                        <button
                            type="button"
                            @click="$refs.imageInput.click()"
                        >🖼️</button>
                        <input
                            type="file"
                            ref="fileInput"
                            @change="uploadFile"
                            accept=".png,.jpeg,.jpg,.pdf,.txt,.xls,.xlsx,.csv,.zip,.rar"
                            style="display: none"
                        />
                        <button
                            type="button"
                            @click="$refs.fileInput.click()"
                        >📎</button>
                    </div>
                    <EditorContent v-if="editor" :editor="editor" class="editor-content" />
                    <div class="editor-actions">
                        <button @click="saveDescription" class="save-btn">Сохранить</button>
                        <button @click="cancelEditingDescription" class="cancel-btn">Отмена</button>
                    </div>
                </div>
            </div>
            <p>
                <strong>Статус:</strong>
                <span v-if="!isEditingStatus">{{ task.status.name }}</span>
                <select v-else v-model="editStatusId" @change="saveStatus" class="inline-select">
                    <option v-for="status in projectStatuses" :key="status.id" :value="status.id">
                        {{ status.name }}
                    </option>
                </select>
                <button v-if="!isEditingStatus" @click="startEditingStatus" class="edit-field-btn">✏️</button>
            </p>
            <p>
                <strong>Проект:</strong> <NuxtLink :to="`/projects/${task.project.id}`">{{ task.project.name }}</NuxtLink>
            </p>
            <p>
                <strong>Исполнитель:</strong>
                <span v-if="!isEditingAssignee">{{ task.assignee ? (task.assignee.name || task.assignee.email) : 'Не назначен' }}</span>
                <select v-else v-model="editAssigneeId" @change="saveAssignee" class="inline-select">
                    <option :value="null">Без исполнителя</option>
                    <option v-for="user in authStore.users" :key="user.id" :value="user.id">
                        {{ user.name || user.email }}
                    </option>
                </select>
                <button v-if="!isEditingAssignee" @click="startEditingAssignee" class="edit-field-btn">✏️</button>
            </p>
            <p><strong>Создано:</strong> {{ formatDate(task.createdAt) }}</p>
            <p><strong>Обновлено:</strong> {{ formatDate(task.updatedAt) }}</p>
            <p><strong>Время отслеживания:</strong> {{ formatTotalTrackedTime }}</p>
        </div>

        <button @click="deleteTask" class="delete-btn">Удалить задачу</button>
        <button v-if="!isTracking" @click="startTracking" class="play-btn">▶️</button>
        <button v-if="isTracking" @click="stopTracking" class="pause-btn">⏸️</button>
        <span v-if="isTracking" class="timer">{{ currentSessionTime }}</span>

        <div class="task-details-section">
            <div class="tabs">
                <button
                    :class="{ 'tab-button': true, 'active': activeTab === 'comments' }"
                    @click="activeTab = 'comments'"
                >Комментарии</button>
                <button
                    :class="{ 'tab-button': true, 'active': activeTab === 'time' }"
                    @click="activeTab = 'time'"
                >Время</button>
            </div>

            <div v-if="activeTab === 'comments'" class="comments-tab">
                <h3>Комментарии</h3>
                <div v-if="task.comments && task.comments.length > 5" class="spoiler">
                    <button @click="toggleCommentsSpoiler" class="spoiler-btn">
                        {{ showAllComments ? 'Скрыть предыдущие' : `Показать предыдущие (${task.comments.length - 5})` }}
                    </button>
                    <ul v-if="showAllComments" class="comment-list older-comments">
                        <li v-for="comment in olderComments" :key="comment.id" class="comment-item">
                            <div v-if="editingCommentId !== comment.id">
                                <p>{{ comment.content }}</p>
                                <p v-if="comment.filePath" class="file-link">
                                    <a :href="comment.filePath" target="_blank" download>Скачать файл</a>
                                </p>
                                <p class="comment-meta">Автор: {{ comment.user.name || comment.user.email }} | {{ formatDate(comment.createdAt) }}</p>
                                <button @click="startEditingComment(comment)" class="edit-comment-btn">✏️</button>
                                <button @click="deleteComment(comment.id)" class="delete-comment-btn">🗑️</button>
                            </div>
                            <form v-else @submit.prevent="saveComment(comment.id)" class="edit-comment-form">
                <textarea
                    v-model="editCommentContent"
                    placeholder="Введите комментарий"
                    required
                    class="comment-input"
                ></textarea>
                                <input
                                    type="file"
                                    @change="onEditFileChange($event, comment.id)"
                                    class="file-input"
                                    accept=".png,.jpeg,.jpg,.pdf,.txt,.xls,.xlsx,.csv,.zip,.rar"
                                />
                                <p class="file-restrictions">Разрешены PNG, JPEG, PDF, TXT, XLS, XLSX, CSV, ZIP, RAR до 5 МБ</p>
                                <button type="submit" class="save-comment-btn">Сохранить</button>
                                <button type="button" @click="cancelEditingComment" class="cancel-comment-btn">Отмена</button>
                            </form>
                        </li>
                    </ul>
                </div>
                <ul class="comment-list recent-comments">
                    <li v-for="comment in recentComments" :key="comment.id" class="comment-item">
                        <div v-if="editingCommentId !== comment.id">
                            <p>{{ comment.content }}</p>
                            <p v-if="comment.filePath" class="file-link">
                                <a :href="comment.filePath" target="_blank" download>Скачать файл</a>
                            </p>
                            <p class="comment-meta">Автор: {{ comment.user.name || comment.user.email }} | {{ formatDate(comment.createdAt) }}</p>
                            <button @click="startEditingComment(comment)" class="edit-comment-btn">✏️</button>
                            <button @click="deleteComment(comment.id)" class="delete-comment-btn">🗑️</button>
                        </div>
                        <form v-else @submit.prevent="saveComment(comment.id)" class="edit-comment-form">
              <textarea
                  v-model="editCommentContent"
                  placeholder="Введите комментарий"
                  required
                  class="comment-input"
              ></textarea>
                            <input
                                type="file"
                                @change="onEditFileChange($event, comment.id)"
                                class="file-input"
                                accept=".png,.jpeg,.jpg,.pdf,.txt,.xls,.xlsx,.csv,.zip,.rar"
                            />
                            <p class="file-restrictions">Разрешены PNG, JPEG, PDF, TXT, XLS, XLSX, CSV, ZIP, RAR до 5 МБ</p>
                            <button type="submit" class="save-comment-btn">Сохранить</button>
                            <button type="button" @click="cancelEditingComment" class="cancel-comment-btn">Отмена</button>
                        </form>
                    </li>
                </ul>
                <form @submit.prevent="addComment" class="comment-form">
          <textarea
              v-model="newComment"
              placeholder="Введите комментарий"
              required
              class="comment-input"
          ></textarea>
                    <input
                        type="file"
                        @change="onFileChange"
                        class="file-input"
                        accept=".png,.jpeg,.jpg,.pdf,.txt,.xls,.xlsx,.csv,.zip,.rar"
                    />
                    <p class="file-restrictions">Разрешены PNG, JPEG, PDF, TXT, XLS, XLSX, CSV, ZIP, RAR до 5 МБ</p>
                    <button type="submit" class="comment-btn">Добавить</button>
                </form>
            </div>

            <div v-if="activeTab === 'time'" class="time-tab">
                <h3>Время выполнения</h3>
                <div v-if="task.timeEntries && task.timeEntries.length > 5" class="spoiler">
                    <button @click="toggleTimeSpoiler" class="spoiler-btn">
                        {{ showAllTimeEntries ? 'Скрыть предыдущие' : `Показать предыдущие (${task.timeEntries.length - 5})` }}
                    </button>
                    <ul v-if="showAllTimeEntries" class="time-list older-time-entries">
                        <li v-for="entry in olderTimeEntries" :key="entry.id" class="time-entry">
                            <div v-if="editingTimeEntryId !== entry.id">
                                <p><strong>Пользователь:</strong> {{ entry.user.name || entry.user.email }}</p>
                                <p><strong>Начало:</strong> {{ formatDateTime(entry.startTime) }}</p>
                                <p><strong>Конец:</strong> {{ entry.endTime ? formatDateTime(entry.endTime) : 'Ещё идёт' }}</p>
                                <p><strong>Длительность:</strong> {{ formatDuration(entry.startTime, entry.endTime) }}</p>
                                <button @click="startEditingTimeEntry(entry)" class="edit-time-btn">✏️</button>
                            </div>
                            <form v-else @submit.prevent="saveTimeEntry(entry.id)" class="edit-time-form">
                                <div class="form-group">
                                    <label>Начало</label>
                                    <input
                                        type="datetime-local"
                                        v-model="editStartTime"
                                        required
                                        class="time-input"
                                    />
                                </div>
                                <div class="form-group">
                                    <label>Конец</label>
                                    <input
                                        type="datetime-local"
                                        v-model="editEndTime"
                                        :required="entry.endTime !== null"
                                        class="time-input"
                                    />
                                </div>
                                <button type="submit" class="save-time-btn">Сохранить</button>
                                <button type="button" @click="cancelEditingTimeEntry" class="cancel-time-btn">Отмена</button>
                            </form>
                        </li>
                    </ul>
                </div>
                <ul class="time-list recent-time-entries" v-if="task.timeEntries && task.timeEntries.length > 0">
                    <li v-for="entry in recentTimeEntries" :key="entry.id" class="time-entry">
                        <div v-if="editingTimeEntryId !== entry.id">
                            <p><strong>Пользователь:</strong> {{ entry.user.name || entry.user.email }}</p>
                            <p><strong>Начало:</strong> {{ formatDateTime(entry.startTime) }}</p>
                            <p><strong>Конец:</strong> {{ entry.endTime ? formatDateTime(entry.endTime) : 'Ещё идёт' }}</p>
                            <p><strong>Длительность:</strong> {{ formatDuration(entry.startTime, entry.endTime) }}</p>
                            <button @click="startEditingTimeEntry(entry)" class="edit-time-btn">✏️</button>
                        </div>
                        <form v-else @submit.prevent="saveTimeEntry(entry.id)" class="edit-time-form">
                            <div class="form-group">
                                <label>Начало</label>
                                <input
                                    type="datetime-local"
                                    v-model="editStartTime"
                                    required
                                    class="time-input"
                                />
                            </div>
                            <div class="form-group">
                                <label>Конец</label>
                                <input
                                    type="datetime-local"
                                    v-model="editEndTime"
                                    :required="entry.endTime !== null"
                                    class="time-input"
                                />
                            </div>
                            <button type="submit" class="save-time-btn">Сохранить</button>
                            <button type="button" @click="cancelEditingTimeEntry" class="cancel-time-btn">Отмена</button>
                        </form>
                    </li>
                </ul>
                <p v-else>Нет записей времени для этой задачи.</p>
            </div>
        </div>

        <NuxtLink :to="`/projects/${task.project.id}`" class="back-link">Назад к проекту</NuxtLink>
    </div>
    <div v-else class="loading">Загрузка...</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRuntimeConfig } from 'nuxt/app';
import { useAuthStore } from '~/stores/auth';
import { useCommentsStore } from '~/stores/comments';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const commentsStore = useCommentsStore();
const config = useRuntimeConfig();

const backendUrl = ref(config.public.apiUrl);

const task = ref(null);
const projectStatuses = ref([]);
const newComment = ref('');
const editingCommentId = ref(null);
const editCommentContent = ref('');
const newFile = ref(null);
const editFile = ref(null);
const editor = ref(null);
const imageInput = ref(null);
const fileInput = ref(null);

const isTracking = ref(false);
const currentTimeEntry = ref(null);
const currentSessionTimeMs = ref(0);
let timerInterval = null;

const activeTab = ref('comments');
const editingTimeEntryId = ref(null);
const editStartTime = ref('');
const editEndTime = ref('');
const showAllComments = ref(false);
const showAllTimeEntries = ref(false);

const isEditingStatus = ref(false);
const isEditingAssignee = ref(false);
const isEditingDescription = ref(false);
const editStatusId = ref(null);
const editAssigneeId = ref(null);

onMounted(async () => {
    await authStore.initialize();
    if (!authStore.isAuthenticated) {
        router.push('/login');
    } else {
        console.log('Backend URL:', backendUrl.value);
        await loadTask();
        checkTrackingStatus();
    }
});

onBeforeUnmount(() => {
    if (editor.value) {
        editor.value.destroy();
    }
    if (timerInterval) {
        clearInterval(timerInterval);
    }
});

const loadTask = async () => {
    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);
    try {
        task.value = await authStore.fetchTask(projectId, taskId);
        console.log('Loaded task with timeEntries:', task.value.timeEntries);
        const project = await authStore.fetchProject(projectId);
        projectStatuses.value = project.statuses;
        editStatusId.value = task.value.statusId;
        editAssigneeId.value = task.value.assigneeId || null;
    } catch (error) {
        console.error('Ошибка загрузки задачи:', error);
        router.push(`/projects/${route.params.projectId}`);
    }
};

const initializeEditor = () => {
    if (!editor.value) {
        editor.value = new Editor({
            extensions: [
                StarterKit,
                Underline,
                Link.configure({
                    openOnClick: true,
                    linkOnPaste: true,
                }),
                Image.configure({
                    inline: true,
                    allowBase64: false,
                }),
            ],
            content: task.value.description || '',
            onUpdate: ({ editor }) => {
                task.value.description = editor.getHTML();
            },
            onTransaction: ({ transaction }) => {
                const deletedNodes = transaction.steps.some(step => {
                    if (step.jsonID === 'replace') {
                        const oldDoc = transaction.before;
                        const newDoc = transaction.doc;
                        let deletedImage = false;
                        oldDoc.descendants((node, pos) => {
                            if (node.type.name === 'image' && !newDoc.nodeAt(pos)) {
                                const filePath = node.attrs.src.replace(backendUrl.value, '');
                                deleteFileFromServer(filePath);
                                deletedImage = true;
                            }
                        });
                        return deletedImage;
                    }
                    return false;
                });
            },
        });
        console.log('Editor initialized:', editor.value);
    }
};

const deleteFileFromServer = async (filePath) => {
    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);

    try {
        await $fetch(`${backendUrl.value}/projects/${projectId}/tasks/${taskId}/images`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filePath }),
        });
    } catch (error) {
        console.error('Ошибка при удалении файла с сервера:', error);
    }
};

const startEditingStatus = () => {
    isEditingStatus.value = true;
    editStatusId.value = task.value.statusId;
};

const saveStatus = async () => {
    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);
    try {
        await authStore.updateTask(projectId, taskId, task.value.name, task.value.description, editStatusId.value, task.value.assigneeId);
        task.value = await authStore.fetchTask(projectId, taskId);
        isEditingStatus.value = false;
    } catch (error) {
        console.error('Ошибка при сохранении статуса:', error);
        alert('Ошибка при сохранении статуса.');
    }
};

const startEditingAssignee = () => {
    isEditingAssignee.value = true;
    editAssigneeId.value = task.value.assigneeId || null;
};

const saveAssignee = async () => {
    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);
    try {
        await authStore.updateTask(projectId, taskId, task.value.name, task.value.description, task.value.statusId, editAssigneeId.value);
        task.value = await authStore.fetchTask(projectId, taskId);
        isEditingAssignee.value = false;
    } catch (error) {
        console.error('Ошибка при сохранении исполнителя:', error);
        alert('Ошибка при сохранении исполнителя.');
    }
};

const startEditingDescription = () => {
    isEditingDescription.value = true;
    initializeEditor();
};

const saveDescription = async () => {
    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);
    try {
        const description = editor.value.getHTML();
        await authStore.updateTask(projectId, taskId, task.value.name, description, task.value.statusId, task.value.assigneeId);
        task.value = await authStore.fetchTask(projectId, taskId);
        isEditingDescription.value = false;
    } catch (error) {
        console.error('Ошибка при сохранении описания:', error);
        alert('Ошибка при сохранении описания.');
    }
};

const cancelEditingDescription = () => {
    isEditingDescription.value = false;
    if (editor.value) {
        editor.value.commands.setContent(task.value.description || '');
    }
};

const toggleLink = () => {
    if (editor.value) {
        const url = prompt('Введите URL ссылки:', 'https://');
        if (url) {
            editor.value.chain().focus().setLink({ href: url }).run();
        } else if (editor.value.isActive('link')) {
            editor.value.chain().focus().unsetLink().run();
        }
    }
};

const uploadImage = async (event) => {
    const file = event.target.files[0];
    if (!file || !editor.value) return;

    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);

    try {
        const formData = new FormData();
        formData.append('image', file);
        const response = await $fetch(`${backendUrl.value}/projects/${projectId}/tasks/${taskId}/images`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
        });
        const imageUrl = `${backendUrl.value}${response.url}`;
        editor.value.chain().focus().setImage({ src: imageUrl }).run();
        event.target.value = '';
    } catch (error) {
        alert('Ошибка при загрузке изображения.');
    }
};

const uploadFile = async (event) => {
    const file = event.target.files[0];
    if (!file || !editor.value) return;

    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);

    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await $fetch(`${backendUrl.value}/projects/${projectId}/tasks/${taskId}/files`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
        });
        const fileUrl = `${backendUrl.value}${response.url}`;
        editor.value
            .chain()
            .focus()
            .insertContent(`<a href="${fileUrl}" target="_blank">${response.originalName}</a> `)
            .run();
        event.target.value = '';
    } catch (error) {
        alert('Ошибка при загрузке файла.');
    }
};

const deleteTask = async () => {
    if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
        const projectId = parseInt(route.params.projectId);
        const taskId = parseInt(route.params.id);
        try {
            await authStore.deleteTask(projectId, taskId);
            router.push(`/projects/${projectId}`);
        } catch (error) {
            alert('Ошибка при удалении задачи.');
        }
    }
};

const startTracking = async () => {
    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);
    try {
        console.log(`Starting tracking with URL: ${backendUrl.value}/projects/${projectId}/tasks/${taskId}/time/start`);
        const timeEntry = await authStore.startTimeTracking(projectId, taskId);
        currentTimeEntry.value = timeEntry;
        isTracking.value = true;
        startTimer();
    } catch (error) {
        console.error('Ошибка при запуске трекера:', error);
        alert('Ошибка при запуске трекера времени: ' + (error.response?.data?.message || error.message));
    }
};

const stopTracking = async () => {
    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);
    try {
        console.log(`Stopping tracking with URL: ${backendUrl.value}/projects/${projectId}/tasks/${taskId}/time/stop`);
        await authStore.stopTimeTracking(projectId, taskId);
        task.value = await authStore.fetchTask(projectId, taskId);
        console.log('Task after stopTracking:', task.value.timeEntries);
        isTracking.value = false;
        currentTimeEntry.value = null;
        stopTimer();
        currentSessionTimeMs.value = 0;
    } catch (error) {
        console.error('Ошибка при остановке трекера:', error);
        alert('Ошибка при остановке трекера времени: ' + (error.response?.data?.message || error.message));
    }
};

const checkTrackingStatus = () => {
    if (task.value && task.value.timeEntries) {
        const activeEntry = task.value.timeEntries.find(
            entry => entry.userId === authStore.user.id && !entry.endTime
        );
        if (activeEntry) {
            isTracking.value = true;
            currentTimeEntry.value = activeEntry;
            const startTime = new Date(activeEntry.startTime).getTime();
            currentSessionTimeMs.value = Date.now() - startTime;
            startTimer();
        }
    }
};

const startTimer = () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (currentTimeEntry.value) {
            const startTime = new Date(currentTimeEntry.value.startTime).getTime();
            currentSessionTimeMs.value = Date.now() - startTime;
        }
    }, 1000);
};

const stopTimer = () => {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
};

const currentSessionTime = computed(() => {
    const totalSeconds = Math.floor(currentSessionTimeMs.value / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

const formatTotalTrackedTime = computed(() => {
    if (!task.value || !task.value.timeEntries) return '00:00:00';
    const userEntries = task.value.timeEntries.filter(entry => entry.userId === authStore.user.id);
    const totalMs = userEntries.reduce((sum, entry) => {
        const start = new Date(entry.startTime).getTime();
        const end = entry.endTime ? new Date(entry.endTime).getTime() : Date.now();
        return sum + (end - start);
    }, 0);
    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

const formatDateTime = (date) => {
    return new Date(date).toLocaleString();
};

const formatDuration = (startTime, endTime) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const totalMs = end - start;
    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const recentComments = computed(() => {
    if (!task.value || !task.value.comments) return [];
    return task.value.comments.slice(-5);
});

const olderComments = computed(() => {
    if (!task.value || !task.value.comments) return [];
    return task.value.comments.slice(0, -5);
});

const recentTimeEntries = computed(() => {
    if (!task.value || !task.value.timeEntries) return [];
    return task.value.timeEntries.slice(-5);
});

const olderTimeEntries = computed(() => {
    if (!task.value || !task.value.timeEntries) return [];
    return task.value.timeEntries.slice(0, -5);
});

const toggleCommentsSpoiler = () => {
    showAllComments.value = !showAllComments.value;
};

const toggleTimeSpoiler = () => {
    showAllTimeEntries.value = !showAllTimeEntries.value;
};

const addComment = async () => {
    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);
    try {
        await commentsStore.createComment(projectId, taskId, newComment.value, newFile.value);
        task.value = await authStore.fetchTask(projectId, taskId);
        newComment.value = '';
        newFile.value = null;
    } catch (error) {
        if (error.response && error.response.status === 400) {
            alert(error.response.data.message || 'Ошибка: файл должен быть PNG, JPEG, PDF, TXT, XLS, XLSX, CSV, ZIP или RAR и не превышать 5 МБ.');
        } else {
            alert('Ошибка при добавлении комментария.');
        }
    }
};

const startEditingComment = (comment) => {
    editingCommentId.value = comment.id;
    editCommentContent.value = comment.content;
    editFile.value = null;
};

const saveComment = async (commentId) => {
    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);
    try {
        await commentsStore.updateComment(projectId, taskId, commentId, editCommentContent.value, editFile.value);
        task.value = await authStore.fetchTask(projectId, taskId);
        editingCommentId.value = null;
        editCommentContent.value = '';
        editFile.value = null;
    } catch (error) {
        if (error.response && error.response.status === 400) {
            alert(error.response.data.message || 'Ошибка: файл должен быть PNG, JPEG, PDF, TXT, XLS, XLSX, CSV, ZIP или RAR и не превышать 5 МБ.');
        } else {
            alert('Ошибка при редактировании комментария.');
        }
    }
};

const cancelEditingComment = () => {
    editingCommentId.value = null;
    editCommentContent.value = '';
    editFile.value = null;
};

const deleteComment = async (commentId) => {
    if (confirm('Вы уверены, что хотите удалить этот комментарий?')) {
        const projectId = parseInt(route.params.projectId);
        const taskId = parseInt(route.params.id);
        try {
            await commentsStore.deleteComment(projectId, taskId, commentId);
            task.value = await authStore.fetchTask(projectId, taskId);
        } catch (error) {
            alert('Ошибка при удалении комментария.');
        }
    }
};

const startEditingTimeEntry = (entry) => {
    editingTimeEntryId.value = entry.id;
    editStartTime.value = new Date(entry.startTime).toISOString().slice(0, 16);
    editEndTime.value = entry.endTime ? new Date(entry.endTime).toISOString().slice(0, 16) : '';
};

const saveTimeEntry = async (timeEntryId) => {
    const projectId = parseInt(route.params.projectId);
    const taskId = parseInt(route.params.id);
    try {
        await authStore.updateTimeEntry(projectId, taskId, timeEntryId, editStartTime.value, editEndTime.value || undefined);
        task.value = await authStore.fetchTask(projectId, taskId);
        editingTimeEntryId.value = null;
        editStartTime.value = '';
        editEndTime.value = '';
    } catch (error) {
        console.error('Ошибка при сохранении записи времени:', error);
        alert('Ошибка при сохранении записи времени: ' + (error.response?.data?.message || error.message));
    }
};

const cancelEditingTimeEntry = () => {
    editingTimeEntryId.value = null;
    editStartTime.value = '';
    editEndTime.value = '';
};

const onFileChange = (event) => {
    newFile.value = event.target.files[0];
};

const onEditFileChange = (event, commentId) => {
    editFile.value = event.target.files[0];
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
};
</script>

<style lang="scss" scoped>
.task-detail-container {
    max-width: 800px;
    margin: 50px auto;
    padding: $spacing-lg;
    background-color: $background-card;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.loading {
    text-align: center;
    padding: $spacing-lg;
    color: $text-light;
}

h2 {
    color: $primary-color;
    margin-bottom: $spacing-md;
    font-size: 2rem;
}

.task-info {
    margin-bottom: $spacing-lg;

    p {
        margin: 5px 0;
        strong {
            color: $primary-color;
        }

        a {
            color: $primary-color;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }

        .inline-select {
            padding: 2px 5px;
            border: 1px solid $border-light;
            border-radius: 3px;
            background-color: darken($background-card, 5%);
            color: $text-light;
            margin-left: 5px;
        }

        .edit-field-btn {
            padding: 0px 5px;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 0.9rem;
            color: $text-light;
            margin-left: 5px;

            &:hover {
                color: $primary-hover;
            }
        }
    }

    .task-description-container {
        position: relative;
        margin-bottom: $spacing-md;

        .task-description {
            padding: $spacing-sm;
            border: 1px solid $border-light;
            border-radius: 5px;
            background-color: darken($background-card, 5%);
            color: $text-light;
            min-height: 100px;
            overflow-wrap: break-word;

            img {
                max-width: 100%;
                height: auto;
            }

            a {
                color: $primary-color;
                text-decoration: none;

                &:hover {
                    text-decoration: underline;
                }
            }
        }

        .edit-description-btn {
            position: absolute;
            top: 5px;
            right: 5px;
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

        .description-editor {
            .editor-toolbar {
                display: flex;
                gap: 5px;
                padding: $spacing-sm;
                background-color: darken($background-card, 10%);
                border: 1px solid $border-light;
                border-bottom: none;
                border-radius: 5px 5px 0 0;

                button {
                    padding: 5px 10px;
                    background-color: $primary-color;
                    color: $text-light;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;

                    &:hover {
                        background-color: $primary-hover;
                    }

                    &.is-active {
                        background-color: $primary-hover;
                    }
                }
            }

            .editor-content {
                padding: $spacing-sm;
                border: 1px solid $border-light;
                border-radius: 0 0 5px 5px;
                background-color: darken($background-card, 5%);
                color: $text-light;
                min-height: 100px;

                &:focus-within {
                    border-color: $primary-color;
                }

                .ProseMirror {
                    outline: none;

                    p.is-editor-empty:first-child::before {
                        content: attr(data-placeholder);
                        color: $text-light;
                        opacity: 0.5;
                        pointer-events: none;
                    }

                    img {
                        max-width: 100%;
                        height: auto;
                    }

                    a {
                        color: $primary-color;
                        text-decoration: none;

                        &:hover {
                            text-decoration: underline;
                        }
                    }
                }
            }

            .editor-actions {
                margin-top: $spacing-sm;
                display: flex;
                gap: $spacing-md;

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

                .cancel-btn {
                    padding: $spacing-sm $spacing-md;
                    background-color: $border-light;
                    color: $text-light;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;

                    &:hover {
                        background-color: darken($border-light, 10%);
                    }
                }
            }
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
    margin-right: $spacing-md;

    &:hover {
        background-color: $primary-hover;
    }
}

.delete-btn {
    padding: $spacing-sm $spacing-md;
    background-color: #dc3545;
    color: $text-light;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-bottom: $spacing-md;
    margin-right: $spacing-md;

    &:hover {
        background-color: darken(#dc3545, 10%);
    }
}

.play-btn {
    padding: $spacing-sm $spacing-md;
    background-color: #28a745;
    color: $text-light;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-bottom: $spacing-md;
    margin-right: $spacing-sm;

    &:hover {
        background-color: darken(#28a745, 10%);
    }
}

.pause-btn {
    padding: $spacing-sm $spacing-md;
    background-color: #ffc107;
    color: $text-light;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-bottom: $spacing-md;
    margin-right: $spacing-sm;

    &:hover {
        background-color: darken(#ffc107, 10%);
    }
}

.timer {
    padding: $spacing-sm $spacing-md;
    background-color: #6c757d;
    color: $text-light;
    border-radius: 5px;
    margin-bottom: $spacing-md;
    font-family: monospace;
}

.edit-task-form {
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

        .editor-toolbar {
            display: flex;
            gap: 5px;
            padding: $spacing-sm;
            background-color: darken($background-card, 10%);
            border: 1px solid $border-light;
            border-bottom: none;
            border-radius: 5px 5px 0 0;

            button {
                padding: 5px 10px;
                background-color: $primary-color;
                color: $text-light;
                border: none;
                border-radius: 3px;
                cursor: pointer;

                &:hover {
                    background-color: $primary-hover;
                }

                &.is-active {
                    background-color: $primary-hover;
                }
            }
        }

        .editor-content {
            padding: $spacing-sm;
            border: 1px solid $border-light;
            border-radius: 0 0 5px 5px;
            background-color: darken($background-card, 5%);
            color: $text-light;
            min-height: 100px;

            &:focus-within {
                border-color: $primary-color;
            }

            .ProseMirror {
                outline: none;

                p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    color: $text-light;
                    opacity: 0.5;
                    pointer-events: none;
                }

                img {
                    max-width: 100%;
                    height: auto;
                }

                a {
                    color: $primary-color;
                    text-decoration: none;

                    &:hover {
                        text-decoration: underline;
                    }
                }
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

.task-details-section {
    margin-top: $spacing-lg;

    .tabs {
        display: flex;
        gap: $spacing-sm;
        margin-bottom: $spacing-md;

        .tab-button {
            padding: $spacing-sm $spacing-md;
            background-color: $background-card;
            color: $text-light;
            border: 1px solid $border-light;
            border-radius: 5px 5px 0 0;
            cursor: pointer;

            &:hover {
                background-color: darken($background-card, 10%);
            }

            &.active {
                background-color: $primary-color;
                color: $text-light;
                border-bottom: none;
            }
        }
    }

    .comments-tab,
    .time-tab {
        h3 {
            color: $primary-color;
            margin-bottom: $spacing-md;
        }

        .spoiler {
            margin-bottom: $spacing-md;

            .spoiler-btn {
                padding: $spacing-sm $spacing-md;
                background-color: $background-card;
                color: $primary-color;
                border: 1px solid $border-light;
                border-radius: 5px;
                cursor: pointer;

                &:hover {
                    background-color: darken($background-card, 10%);
                }
            }
        }

        .comment-list,
        .time-list {
            list-style: none;
            padding: 0;

            &.older-comments,
            &.older-time-entries {
                margin-bottom: $spacing-md;
                border-bottom: 1px solid $border-light;
            }

            &.recent-comments,
            &.recent-time-entries {
                margin-bottom: $spacing-md;
            }

            .comment-item,
            .time-entry {
                padding: $spacing-sm;
                background-color: darken($background-card, 5%);
                border-radius: 5px;
                margin-bottom: $spacing-sm;

                p {
                    margin: 5px 0;
                }

                .file-link {
                    margin-top: 5px;
                    a {
                        color: $primary-color;
                        text-decoration: none;

                        &:hover {
                            text-decoration: underline;
                        }
                    }
                }

                .comment-meta {
                    font-size: 0.9rem;
                    color: lighten($text-light, 20%);
                }

                .edit-comment-btn,
                .delete-comment-btn,
                .edit-time-btn {
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

                .delete-comment-btn {
                    &:hover {
                        color: #dc3545;
                    }
                }

                .edit-comment-form,
                .edit-time-form {
                    display: flex;
                    flex-direction: column;
                    gap: $spacing-sm;

                    .comment-input {
                        padding: $spacing-sm;
                        border: 1px solid $border-light;
                        border-radius: 5px;
                        background-color: darken($background-card, 5%);
                        color: $text-light;
                        min-height: 80px;
                        resize: vertical;

                        &:focus {
                            outline: none;
                            border-color: $primary-color;
                        }
                    }

                    .file-input,
                    .time-input {
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

                    .file-restrictions {
                        font-size: 0.9rem;
                        color: lighten($text-light, 20%);
                        margin: 0;
                    }

                    .save-comment-btn,
                    .cancel-comment-btn,
                    .save-time-btn,
                    .cancel-time-btn {
                        padding: $spacing-sm $spacing-md;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    }

                    .save-comment-btn,
                    .save-time-btn {
                        background-color: $primary-color;
                        color: $text-light;

                        &:hover {
                            background-color: $primary-hover;
                        }
                    }

                    .cancel-comment-btn,
                    .cancel-time-btn {
                        background-color: $border-light;
                        color: $text-light;

                        &:hover {
                            background-color: darken($border-light, 10%);
                        }
                    }
                }

                .edit-time-form {
                    .form-group {
                        display: flex;
                        flex-direction: column;

                        label {
                            margin-bottom: 5px;
                            font-size: 1rem;
                        }
                    }
                }
            }
        }

        .comment-form {
            display: flex;
            flex-direction: column;
            gap: $spacing-md;

            .comment-input {
                padding: $spacing-sm;
                border: 1px solid $border-light;
                border-radius: 5px;
                background-color: darken($background-card, 5%);
                color: $text-light;
                min-height: 80px;
                resize: vertical;

                &:focus {
                    outline: none;
                    border-color: $primary-color;
                }
            }

            .file-input {
                padding: $spacing-sm;
                color: $text-light;
            }

            .file-restrictions {
                font-size: 0.9rem;
                color: lighten($text-light, 20%);
                margin: 0;
            }

            .comment-btn {
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