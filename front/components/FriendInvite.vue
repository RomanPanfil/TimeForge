<template>
    <div class="friend-invite">
        <h3>Пригласить друга</h3>
        <form @submit.prevent="sendInvite">
            <input v-model="email" type="email" placeholder="Введите email" required />
            <button type="submit">Отправить приглашение</button>
        </form>
        <h3>Входящие запросы</h3>
        <ul>
            <li v-for="request in friendRequests" :key="request.id">
                {{ request.sender.name || request.sender.email }}
                <button @click="respondToRequest(request.id, true)">Принять</button>
                <button @click="respondToRequest(request.id, false)">Отклонить</button>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
const email = ref('');
const friendRequests = ref([]);

const sendInvite = async () => {
    try {
        await authStore.sendFriendRequest(email.value);
        alert('Приглашение отправлено!');
        email.value = '';
    } catch (error) {
        alert('Ошибка при отправке приглашения: ' + error.message);
    }
};

const fetchFriendRequests = async () => {
    friendRequests.value = await authStore.fetchFriendRequests();
};

const respondToRequest = async (requestId, accept) => {
    try {
        await authStore.respondToFriendRequest(requestId, accept);
        fetchFriendRequests();
    } catch (error) {
        alert('Ошибка при ответе на запрос: ' + error.message);
    }
};

onMounted(fetchFriendRequests);
</script>

<style scoped>
.friend-invite {
    padding: 20px;
}
input {
    padding: 8px;
    margin-right: 10px;
}
button {
    padding: 8px 16px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}
button:hover {
    background-color: #0056b3;
}
ul {
    list-style: none;
    padding: 0;
}
li {
    margin: 10px 0;
}
</style>