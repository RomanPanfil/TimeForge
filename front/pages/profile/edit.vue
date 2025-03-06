<template>
    <div class="profile-container">
        <h2 class="profile-title">Редактировать профиль</h2>
        <form @submit.prevent="handleSubmit" class="profile-form" enctype="multipart/form-data">
            <div class="form-group">
                <label for="name">Имя</label>
                <input
                        type="text"
                        id="name"
                        v-model="name"
                        placeholder="Введите ваше имя"
                />
            </div>
            <div class="form-group">
                <label for="avatar">Аватар</label>
                <input
                        type="file"
                        id="avatar"
                        ref="avatarInput"
                        accept="image/*"
                        @change="handleFileChange"
                />
                <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" alt="Current Avatar" class="current-avatar" />
            </div>
            <div class="form-group">
                <label for="birthday">День рождения</label>
                <input
                        type="date"
                        id="birthday"
                        v-model="birthday"
                />
            </div>
            <button type="submit" class="button profile-button">Сохранить</button>
        </form>
        <NuxtLink to="/" class="back-link">Назад</NuxtLink>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '~/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const name = ref('');
const avatar = ref(null);
const birthday = ref('');

onMounted(() => {
    authStore.initialize();
    if (!authStore.isAuthenticated) {
        router.push('/login');
    } else {
        name.value = authStore.user?.name || '';
        birthday.value = authStore.user?.birthday ? authStore.user.birthday.split('T')[0] : '';
    }
});

const handleFileChange = (event) => {
    avatar.value = event.target.files[0];
};

const handleSubmit = async () => {
    try {
        await authStore.updateProfile(name.value, avatar.value, birthday.value);
        router.push('/');
    } catch (error) {
        alert('Ошибка при сохранении профиля.');
    }
};
</script>

<style lang="scss" scoped>
.profile-container {
  max-width: 400px;
  margin: 50px auto;
  padding: $spacing-lg;
  background-color: $background-card;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.profile-title {
  color: $primary-color;
  text-align: center;
  margin-bottom: $spacing-lg;
  font-size: 1.8rem;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

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

  .current-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    margin-top: $spacing-sm;
  }
}

.profile-button {
  margin-top: $spacing-md;
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