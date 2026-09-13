<template>
  <ion-button v-if="user" id="user-menu-trigger" fill="clear" class="user-trigger" aria-label="Open your profile menu">
    <span class="toolbar-avatar"><img v-if="user.photoURL" :src="user.photoURL" :alt="user.displayName || 'Your profile'" referrerpolicy="no-referrer" /><span v-else>{{ initials }}</span></span><ion-icon :icon="chevronDownOutline" class="profile-chevron" aria-hidden="true" />
  </ion-button>
  <ion-popover v-if="user" ref="popoverRef" trigger="user-menu-trigger" trigger-action="click" :show-backdrop="false" side="bottom" alignment="end">
    <ion-content>
      <div class="profile-menu">
        <div class="profile-block"><span class="profile-avatar"><img v-if="user.photoURL" :src="user.photoURL" :alt="user.displayName || 'Your profile'" referrerpolicy="no-referrer" /><span v-else>{{ initials }}</span></span><div><p class="profile-name">{{ user.displayName || 'Your workspace' }}</p><p class="profile-email">{{ user.email }}</p></div></div>
        <OjtPieChart v-if="userRecord" :hours-remaining="userRecord.hoursRemaining" />
        <button class="primary-button log-hours-button" type="button" @click="openLogHours"><ion-icon :icon="addOutline" aria-hidden="true" />Log training hours</button>
        <div class="profile-divider" />
        <button class="logout-button" type="button" @click="openLogout"><ion-icon :icon="logOutOutline" aria-hidden="true" />Sign out<ion-icon :icon="arrowForwardOutline" class="logout-arrow" aria-hidden="true" /></button>
      </div>
    </ion-content>
  </ion-popover>
  <AppDialog :is-open="showLogHours" title="A little closer to your goal." description="Log the training hours you’ve completed today." :icon="timeOutline" confirm-label="Log hours" :busy="savingHours" :disabled="!validHours" @dismiss="closeHours" @confirm="submitHours">
    <label class="field"><span>Hours completed</span><input v-model="hours" type="number" min="0" step="any" inputmode="decimal" placeholder="e.g. 8" :disabled="savingHours" @keydown.enter.prevent="submitHours" /><small v-if="userRecord">{{ userRecord.hoursRemaining.toLocaleString() }} hours remaining in your training.</small></label>
    <p v-if="hoursError" class="form-error dialog-error" role="alert">{{ hoursError }}</p>
  </AppDialog>
  <AppDialog :is-open="showLogout" title="Calling it a day?" description="Sign out of your workspace. Your saved tasks and training progress will be here when you’re back." :icon="logOutOutline" confirm-label="Sign out" busy-label="Signing out…" :busy="signingOut" @dismiss="closeLogout" @confirm="confirmLogout"><p v-if="logoutError" class="form-error" role="alert">{{ logoutError }}</p></AppDialog>
</template>
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { IonButton, IonIcon, IonPopover, IonContent } from '@ionic/vue';
import { logOutOutline, chevronDownOutline, addOutline, timeOutline, arrowForwardOutline } from 'ionicons/icons';
import { onAuthChange, logout, subscribeToUserRecord, logHoursRendered, type UserRecord } from '@/services/userService';
import type { User } from 'firebase/auth';
import OjtPieChart from './OjtPieChart.vue';
import AppDialog from './AppDialog.vue';
const user = ref<User | null>(null);
const userRecord = ref<UserRecord | null>(null);
const showLogHours = ref(false);
const showLogout = ref(false);
const hours = ref('');
const hoursError = ref('');
const logoutError = ref('');
const savingHours = ref(false);
const signingOut = ref(false);
const popoverRef = ref<InstanceType<typeof IonPopover>>();
let unsubscribeRecord: (() => void) | null = null;
const stopAuthListener = onAuthChange((u) => {
  user.value = u;
  unsubscribeRecord?.();
  unsubscribeRecord = null;
  userRecord.value = null;
  if (u) unsubscribeRecord = subscribeToUserRecord(u.uid, (record) => { userRecord.value = record; });
  else { showLogout.value = false; showLogHours.value = false; }
});
onUnmounted(() => { stopAuthListener(); unsubscribeRecord?.(); });
const initials = computed(() => (user.value?.displayName || user.value?.email || 'You').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase());
const validHours = computed(() => Number.isFinite(Number(hours.value)) && Number(hours.value) > 0);
async function openLogHours() {
  await popoverRef.value?.$el.dismiss();
  hours.value = '';
  hoursError.value = '';
  showLogHours.value = true;
}
async function openLogout() { await popoverRef.value?.$el.dismiss(); logoutError.value = ''; showLogout.value = true; }
function closeHours() { if (!savingHours.value) showLogHours.value = false; }
function closeLogout() { if (!signingOut.value) showLogout.value = false; }
async function submitHours() {
  if (!user.value || !validHours.value || savingHours.value) return;
  savingHours.value = true;
  hoursError.value = '';
  try { await logHoursRendered(user.value.uid, Number(hours.value)); showLogHours.value = false; }
  catch { hoursError.value = 'We couldn’t log your hours. Check your connection and try again.'; }
  finally { savingHours.value = false; }
}
async function confirmLogout() {
  if (signingOut.value) return;
  signingOut.value = true;
  logoutError.value = '';
  try { await logout(); showLogout.value = false; }
  catch { logoutError.value = 'We couldn’t sign you out. Please try again.'; }
  finally { signingOut.value = false; }
}
</script>
<style scoped>
.user-trigger { --padding-start: 5px; --padding-end: 5px; margin: 0; }
.toolbar-avatar, .profile-avatar { display: grid; place-items: center; flex-shrink: 0; overflow: hidden; border: 1px solid var(--app-line); border-radius: 50%; background: var(--app-primary-soft); color: var(--ion-color-primary); font-weight: 650; }
.toolbar-avatar { width: 36px; height: 36px; font-size: 12px; }
.toolbar-avatar img, .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.profile-chevron { margin-left: 7px; color: var(--app-muted); font-size: 12px; }
.profile-menu { padding: 22px; background: var(--app-surface); }
.profile-block { display: flex; align-items: center; gap: 12px; margin-bottom: 21px; }
.profile-avatar { width: 44px; height: 44px; font-size: 15px; }
.profile-block > div { min-width: 0; }
.profile-name { margin: 0; font-size: 14px; font-weight: 650; overflow-wrap: anywhere; }
.profile-email { margin: 5px 0 0; color: var(--app-muted); font-size: 11px; overflow-wrap: anywhere; }
.log-hours-button { width: 100%; margin-top: 16px; font-size: 12px; }
.log-hours-button ion-icon { font-size: 18px; }
.profile-divider { height: 1px; margin: 20px 0 8px; background: var(--app-line); }
.logout-button { display: flex; align-items: center; gap: 9px; width: 100%; min-height: 44px; padding: 10px 0; border: 0; color: var(--app-muted); background: transparent; font-size: 12px; }
.logout-button:hover { color: var(--ion-color-danger); }
.logout-button ion-icon { font-size: 18px; }
.logout-arrow { margin-left: auto; }
.dialog-error { margin-top: 16px; }
@media (max-width: 600px) { .profile-chevron { display: none; } }
</style>
