<template>
  <ion-chip :color="chipColor" outline>
    <ion-icon :icon="statusIcon" />
    <ion-label>{{ statusLabel }}</ion-label>
  </ion-chip>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { IonChip, IonIcon, IonLabel } from '@ionic/vue';
import { checkmarkCircle, closeCircle } from 'ionicons/icons';
import { ref as databaseRef, onValue } from 'firebase/database';
import { db } from '@/firebase';

const status = ref<'connected' | 'disconnected'>('connected');
const connectionRef = databaseRef(db, '.info/connected');
const unsubscribe = onValue(connectionRef, (snapshot) => {
  status.value = snapshot.val() === true ? 'connected' : 'disconnected';
});
onUnmounted(() => unsubscribe());

const statusLabel = computed(() => (status.value === 'connected' ? 'Connected' : 'Disconnected'));
const chipColor = computed(() => (status.value === 'connected' ? 'success' : 'danger'));
const statusIcon = computed(() => (status.value === 'connected' ? checkmarkCircle : closeCircle));
</script>