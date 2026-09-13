<template>
  <span class="connection-status" :class="{ offline: !connected }" role="status" :title="connected ? 'Your workspace is connected' : 'Waiting for a connection'">
    <span class="connection-dot" aria-hidden="true" /><span class="connection-label">{{ connected ? 'Connected' : 'Offline' }}</span><span class="sr-only">{{ connected ? 'Your workspace is connected' : 'Waiting for a connection' }}</span>
  </span>
</template>
<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { ref as databaseRef, onValue } from 'firebase/database';
import { db } from '@/firebase';
const connected = ref(false);
const unsubscribe = onValue(databaseRef(db, '.info/connected'), (snapshot) => { connected.value = snapshot.val() === true; });
onUnmounted(unsubscribe);
</script>
<style scoped>
.connection-status { display: inline-flex; align-items: center; gap: 7px; padding: 8px 10px; color: var(--app-muted); font-size: 12px; }
.connection-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ion-color-primary); box-shadow: 0 0 0 4px var(--app-primary-soft); }
.offline .connection-dot { background: var(--app-warning); box-shadow: 0 0 0 4px var(--app-warning-soft); }
@media (max-width: 600px) { .connection-label { display: none; } .connection-status { padding: 8px; } }
</style>
