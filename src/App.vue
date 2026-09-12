<template>
  <ion-app>
    <ion-router-outlet v-if="user" />

    <ion-modal :is-open="showLoginModal" :backdrop-dismiss="false" class="login-modal">
      <div class="login-content">
        <h2>OJT Task Manager</h2>
        <p>Sign in to continue</p>
        <ion-button expand="block" @click="handleSignIn">
          <ion-icon slot="start" :icon="logoGoogleIcon" />
          Sign in with Google
        </ion-button>
      </div>
    </ion-modal>
  </ion-app>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { IonApp, IonRouterOutlet, IonModal, IonButton, IonIcon } from '@ionic/vue';
import { logoGoogle as logoGoogleIcon } from 'ionicons/icons';
import { onAuthChange, signInWithGoogle } from '@/services/userService';
import type { User } from 'firebase/auth';

const user = ref<User | null>(null);
const authReady = ref(false);

const stop = onAuthChange((u) => {
  user.value = u;
  authReady.value = true;
});
onUnmounted(() => stop());

const showLoginModal = computed(() => authReady.value && !user.value);
const handleSignIn = () => signInWithGoogle();
</script>

<style scoped>
.login-modal { --height: 320px; --width: 90%; --max-width: 400px; --border-radius: 16px; }
.login-content {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; text-align: center; padding: 24px; gap: 16px;
}
</style>