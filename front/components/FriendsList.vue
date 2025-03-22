<template>
    <div class="friends-list">
        <h2>Мои друзья</h2>
        <ul v-if="friends.length > 0">
            <li v-for="friend in friends" :key="friend.id" class="friend-item">
                <img v-if="friend.avatar" :src="friend.avatar" alt="Avatar" class="avatar" />
                <span>{{ friend.name || friend.email }}</span>
            </li>
        </ul>
        <p v-else>У вас пока нет друзей.</p>
        <button @click="authStore.fetchFriends" class="button">Обновить</button>
    </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth';
import { onMounted } from 'vue';

const authStore = useAuthStore();

onMounted(() => {
    if (authStore.isAuthenticated) {
        authStore.fetchFriends(); // Загружаем друзей при монтировании, если пользователь авторизован
    }
});

const friends = computed(() => authStore.friends);
</script>

<style lang="scss" scoped>
.friends-list {
  padding: $spacing-lg;
  background-color: $background-card;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  margin: $spacing-md auto;
  max-width: 600px;

  h2 {
    color: $primary-color;
    margin-bottom: $spacing-md;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  .friend-item {
    display: flex;
    align-items: center;
    padding: $spacing-sm;
    border-bottom: 1px solid $border-light;

    &:last-child {
      border-bottom: none;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-right: $spacing-sm;
    }

    span {
      color: $text-light;
      font-size: 1.1rem;
    }
  }

  p {
    color: $text-light;
    text-align: center;
  }
}
</style>