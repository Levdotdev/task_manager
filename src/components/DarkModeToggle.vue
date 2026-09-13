<template>
  <ion-button fill="clear" class="theme-toggle" :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'" :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'" @click="toggleDark">
    <ion-icon slot="icon-only" :icon="isDark ? sunnyOutline : moonOutline" aria-hidden="true" />
  </ion-button>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
const isDark = ref(false);
onMounted(() => { isDark.value = document.documentElement.classList.contains('ion-palette-dark'); });
function toggleDark() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('ion-palette-dark', isDark.value);
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
}
</script>
<style scoped>
.theme-toggle { --color: var(--app-muted); --padding-start: 10px; --padding-end: 10px; width: 44px; margin: 0; }
.theme-toggle ion-icon { font-size: 20px; }
</style>
