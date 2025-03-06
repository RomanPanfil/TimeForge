<template>
    <div class="my-tasks-container">
        <h2>Мои задачи</h2>

        <div class="filter-section">
            <input
                    type="text"
                    v-model="filter"
                    placeholder="Фильтр по названию задачи"
                    @input="applyFilter"
                    class="filter-input"
            />
        </div>

        <ul class="task-list">
            <li v-for="task in authStore.assignedTasks.data" :key="task.id" class="task-item">
                <div class="task-view">
                    {{ task.name }} - {{ task.description || 'Без описания' }} ({{ task.status }})
                    <span>Проект: {{ task.project.name }}</span>
                </div>
            </li>
        </ul>

        <div class="pagination" v-if="authStore.assignedTasks.totalPages > 1">
            <button
                    :disabled="authStore.assignedTasks.page === 1"
                    @click="changePage(authStore.assignedTasks.page - 1)"
                    class="page-btn"
            >
                Назад
            </button>
            <span>Страница {{ authStore.assignedTasks.page }} из {{ authStore.assignedTasks.totalPages }}</span>
            <button
                    :disabled="authStore.assignedTasks.page === authStore.assignedTasks.totalPages"
                    @click="changePage(authStore.assignedTasks.page + 1)"
                    class="page-btn"
            >
                Вперед
            </button>
        </div>

        <NuxtLink to="/" class="back-link">Назад к проектам</NuxtLink>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const filter = ref('');

authStore.initialize();

if (!authStore.isAuthenticated) {
    router.push('/login');
}

const applyFilter = () => {
    authStore.fetchAssignedTasks(1, authStore.assignedTasks.limit, filter.value);
};

const changePage = (page) => {
    authStore.fetchAssignedTasks(page, authStore.assignedTasks.limit, filter.value);
};
</script>

<style lang="scss" scoped>
.my-tasks-container {
  max-width: 800px;
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

.filter-section {
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
      flex-direction: column;
      gap: 5px;

      span {
        font-size: 0.9rem;
        color: lighten($text-light, 10%);
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