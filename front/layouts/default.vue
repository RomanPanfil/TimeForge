<template>
    <div>
        <header>
            <div class="container">
                <h1 class="metallic">{{ appName }}</h1>
                <nav>
                    <NuxtLink to="/">Главная</NuxtLink>
                    <span v-if="authStore.isAuthenticated">
            Привет, {{ authStore.user?.name || authStore.user?.email }}
            <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" alt="Avatar" class="avatar" />
            <NuxtLink to="/profile/edit" class="edit-link">Редактировать</NuxtLink>
            <NuxtLink to="/my-tasks" class="tasks-link">Мои задачи</NuxtLink>
          </span>
                    <NuxtLink to="/login" v-if="!authStore.isAuthenticated">Войти</NuxtLink>
                    <button @click="authStore.logout" v-if="authStore.isAuthenticated" class="button">Выйти</button>
                </nav>
            </div>
        </header>
        <main class="container">
            <slot />
        </main>
    </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth';

const appName = 'TimeForge';
const authStore = useAuthStore();

authStore.initialize();
</script>

<style lang="scss" scoped>
header {
  background-color: $background-card;
  padding: $spacing-md 0;
  border-bottom: 1px solid $primary-color;

  .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

nav {
  display: flex;
  align-items: center;
  gap: $spacing-md;

  a,
  button {
    text-decoration: none;
    color: $text-light;

    &:hover {
      color: $primary-color;
    }
  }

  span {
    color: $text-light;
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .edit-link,
  .tasks-link {
    font-size: 0.9rem;
  }
}
</style>