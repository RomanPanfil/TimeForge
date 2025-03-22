<template>
    <div class="auth-container">
        <h2 class="auth-title">{{ isLogin ? 'Вход в TimeForge' : 'Регистрация' }}</h2>
        <form @submit.prevent="handleSubmit" class="auth-form" enctype="multipart/form-data">
            <div class="form-group">
                <label for="email">Email</label>
                <input
                    type="email"
                    id="email"
                    v-model="email"
                    placeholder="Введите ваш email"
                    required
                />
            </div>
            <div class="form-group">
                <label for="password">Пароль</label>
                <input
                    type="password"
                    id="password"
                    v-model="password"
                    placeholder="Введите пароль"
                    required
                />
            </div>
            <div class="form-group" v-if="!isLogin">
                <label for="name">Имя</label>
                <input
                    type="text"
                    id="name"
                    v-model="name"
                    placeholder="Введите ваше имя"
                />
            </div>
            <div class="form-group" v-if="!isLogin">
                <label for="avatar">Аватар</label>
                <input
                    type="file"
                    id="avatar"
                    ref="avatarInput"
                    accept="image/*"
                    @change="handleFileChange"
                />
            </div>
            <div class="form-group" v-if="!isLogin">
                <label for="birthday">День рождения</label>
                <input
                    type="date"
                    id="birthday"
                    v-model="birthday"
                />
            </div>
            <button type="submit" class="button auth-button">
                {{ isLogin ? 'Войти' : 'Зарегистрироваться' }}
            </button>
        </form>
        <p class="toggle-text">
            {{ isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?' }}
            <a href="#" @click.prevent="toggleMode">
                {{ isLogin ? 'Зарегистрируйтесь' : 'Войдите' }}
            </a>
        </p>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '~/stores/auth';

const isLogin = ref(true);
const email = ref('');
const password = ref('');
const name = ref('');
const avatar = ref(null);
const birthday = ref('');
const inviteToken = ref(''); // Для хранения токена из URL
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

authStore.initialize();

onMounted(() => {
    inviteToken.value = route.query.invite || ''; // Извлекаем токен из URL
    if (inviteToken.value && !isLogin.value) {
        console.log('Invite token detected:', inviteToken.value);
    }
});

const toggleMode = () => {
    isLogin.value = !isLogin.value;
    email.value = '';
    password.value = '';
    name.value = '';
    avatar.value = null;
    birthday.value = '';
};

const handleFileChange = (event) => {
    avatar.value = event.target.files[0];
};

const handleSubmit = async () => {
    try {
        if (isLogin.value) {
            await authStore.login(email.value, password.value);
            router.push('/');
        } else {
            await authStore.register(email.value, password.value, name.value, avatar.value, birthday.value);
            if (inviteToken.value) {
                await authStore.confirmInvitation(inviteToken.value);
                alert('Регистрация выполнена, и дружба подтверждена!');
            } else {
                alert('Регистрация выполнена!');
            }
            router.push('/');
        }
    } catch (error) {
        alert('Что-то пошло не так. Проверьте данные: ' + error.message);
    }
};
</script>

<style lang="scss" scoped>
.auth-container {
    max-width: 400px;
    margin: 50px auto;
    padding: $spacing-lg;
    background-color: $background-card;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.auth-title {
    color: $primary-color;
    text-align: center;
    margin-bottom: $spacing-lg;
    font-size: 1.8rem;
}

.auth-form {
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
}

.auth-button {
    margin-top: $spacing-md;
}

.toggle-text {
    text-align: center;
    margin-top: $spacing-md;
    font-size: 0.9rem;

    a {
        color: $primary-color;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }
}
</style>