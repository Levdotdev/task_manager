<template>
  <ion-buttons>
    <ion-button v-if="!user" @click="handleSignIn">
      <ion-icon slot="start" :icon="logoGoogleIcon" />
      Sign in
    </ion-button>
    <ion-button v-else id="user-menu-trigger" fill="clear">
      <ion-avatar class="toolbar-avatar">
        <img v-if="user.photoURL" :src="user.photoURL" :alt="user.displayName || 'User'" />
        <ion-icon v-else :icon="personCircleIcon" />
      </ion-avatar>
    </ion-button>
  </ion-buttons>

  <ion-popover v-if="user" trigger="user-menu-trigger" trigger-action="click">
    <ion-content class="ion-padding">
      <div class="profile-block">
        <ion-avatar class="profile-avatar">
          <img v-if="user.photoURL" :src="user.photoURL" :alt="user.displayName || 'User'" />
          <ion-icon v-else :icon="personCircleIcon" />
        </ion-avatar>
        <p class="profile-name">{{ user.displayName }}</p>
        <p class="profile-email">{{ user.email }}</p>
      </div>

      <OjtPieChart v-if="userRecord" :hours-remaining="userRecord.hoursRemaining" />

      <ion-button expand="block" size="small" @click="showLogHoursAlert = true">Log Hours</ion-button>
      <ion-button expand="block" fill="outline" color="danger" class="logout-btn" @click="showLogoutAlert = true">
        <ion-icon slot="start" :icon="logOutIcon" />
        Log Out
      </ion-button>
    </ion-content>
  </ion-popover>

  <ion-alert
    :is-open="showLogHoursAlert"
    header="Log Hours Rendered"
    :inputs="[{ name: 'hours', type: 'number', placeholder: 'Hours', min: 0 }]"
    :buttons="logHoursButtons"
    @didDismiss="showLogHoursAlert = false"
  />
  <ion-alert
    :is-open="showLogoutAlert"
    header="Log Out"
    message="Are you sure you want to log out?"
    :buttons="logoutButtons"
    @didDismiss="showLogoutAlert = false"
  />
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { IonButtons, IonButton, IonIcon, IonAvatar, IonPopover, IonContent, IonAlert } from '@ionic/vue';
import { personCircle as personCircleIcon, logOut as logOutIcon, logoGoogle as logoGoogleIcon } from 'ionicons/icons';
import { onAuthChange, signInWithGoogle, logout as doLogout, subscribeToUserRecord, logHoursRendered, type UserRecord } from '@/services/userService';
import type { User } from 'firebase/auth';
import OjtPieChart from './OjtPieChart.vue';

const user = ref<User | null>(null);
const userRecord = ref<UserRecord | null>(null);
const showLogHoursAlert = ref(false);
const showLogoutAlert = ref(false);
let unsubscribeRecord: (() => void) | null = null;

const stopAuthListener = onAuthChange((u) => {
  user.value = u;
  unsubscribeRecord?.();
  unsubscribeRecord = null;
  if (u) unsubscribeRecord = subscribeToUserRecord(u.uid, (record) => { userRecord.value = record; });
  else userRecord.value = null;
});
onUnmounted(() => { stopAuthListener(); unsubscribeRecord?.(); });

const handleSignIn = () => signInWithGoogle();

const logHoursButtons = [
  { text: 'Cancel', role: 'cancel' },
  { text: 'Submit', handler: (data: { hours: string }) => {
      const hours = Number(data.hours);
      if (user.value && hours > 0) logHoursRendered(user.value.uid, hours);
    } },
];
const logoutButtons = [
  { text: 'Cancel', role: 'cancel' },
  { text: 'Log Out', role: 'destructive', handler: () => doLogout() },
];
</script>

<style scoped>
.toolbar-avatar { width: 32px; height: 32px; }
.profile-block { text-align: center; margin-bottom: 8px; }
.profile-avatar { width: 64px; height: 64px; margin: 0 auto 8px; }
.profile-name { font-weight: 600; margin: 0; }
.profile-email { font-size: 0.85rem; color: var(--ion-color-medium); margin: 2px 0 12px; }
.logout-btn { margin-top: 8px; }
</style>