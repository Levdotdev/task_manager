<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Firebase Status</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ion-chip :color="chipColor">
        <ion-icon :icon="statusIcon" />
        <ion-label>{{ statusLabel }}</ion-label>
      </ion-chip>

      <ion-button expand="block" :disabled="checking" @click="checkConnection">
        {{ checking ? 'Checking…' : 'Check Firebase Connection' }}
      </ion-button>

      <ion-text v-if="lastChecked" color="medium">
        <p>Last checked: {{ lastChecked }}</p>
      </ion-text>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonChip, IonIcon, IonLabel, IonButton, IonText,
} from '@ionic/vue';
import { checkmarkCircle, closeCircle, helpCircle } from 'ionicons/icons';
import { ref as databaseRef, onValue, goOffline, goOnline } from 'firebase/database';
import { db } from '@/firebase';

type Status = 'connected' | 'disconnected' | 'unknown';

const status = ref<Status>('unknown');
const checking = ref(false);
const lastChecked = ref('');

const connectionRef = databaseRef(db, '.info/connected');

// live badge — updates automatically the instant the socket state changes
const unsubscribe = onValue(connectionRef, (snapshot) => {
  status.value = snapshot.val() === true ? 'connected' : 'disconnected';
});

const checkConnection = async () => {
  checking.value = true;
  goOffline(db);
  await new Promise((resolve) => setTimeout(resolve, 300));
  goOnline(db);

  await new Promise((resolve) => setTimeout(resolve, 1500));
  lastChecked.value = new Date().toLocaleTimeString();
  checking.value = false;
};

onUnmounted(() => unsubscribe());

const statusLabel = computed(() =>
  status.value === 'connected' ? 'Connected' :
  status.value === 'disconnected' ? 'Disconnected' : 'Checking…'
);
const chipColor = computed(() =>
  status.value === 'connected' ? 'success' :
  status.value === 'disconnected' ? 'danger' : 'medium'
);
const statusIcon = computed(() =>
  status.value === 'connected' ? checkmarkCircle :
  status.value === 'disconnected' ? closeCircle : helpCircle
);
</script>