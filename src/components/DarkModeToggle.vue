<template>
  <ion-button @click="toggleDark">
    <ion-icon slot="icon-only" :icon="isDark ? moonIcon : sunnyIcon" />
  </ion-button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import { moon as moonIcon, sunny as sunnyIcon } from 'ionicons/icons';

const isDark = ref(false);

onMounted(() => {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = saved ? saved === 'dark' : prefersDark;
  isDark.value = shouldBeDark;
  document.documentElement.classList.toggle('ion-palette-dark', shouldBeDark);
});

const toggleDark = () => {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('ion-palette-dark', isDark.value);
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
};
</script>