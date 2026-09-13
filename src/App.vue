<template>
  <ion-app>
    <ion-router-outlet v-if="user" />
    <main v-else class="login-page">
      <section class="login-story">
        <div class="brand"><span class="brand-mark"><ion-icon :icon="layersOutline" aria-hidden="true" /></span><span>OJT Task Manager</span></div>
        <div class="story-content">
          <p class="eyebrow">Make every day count</p>
          <h1>A little focus.<br />A lot of progress.</h1>
          <p class="story-description">Keep your tasks, deadlines, and training hours together. Give your internship a little more breathing room.</p>
          <div class="planner-art" aria-hidden="true">
            <div class="art-note"><ion-icon :icon="sparklesOutline" /> One step at a time.</div>
            <div class="art-planner">
              <div class="art-heading"><span>Your week, sorted.</span><span class="art-dots">•••</span></div>
              <div class="art-rule" />
              <div class="art-task"><span class="art-check checked"><ion-icon :icon="checkmarkOutline" /></span><span><strong>Show up & learn something</strong><small>A good place to start</small></span></div>
              <div class="art-task"><span class="art-check checked"><ion-icon :icon="checkmarkOutline" /></span><span><strong>Finish today's tasks</strong><small>Small wins add up</small></span></div>
              <div class="art-task"><span class="art-check" /><span><strong>Log your training hours</strong><small>You're making progress</small></span></div>
              <div class="art-progress"><span /><span /><span /><span /><span class="inactive" /><span class="inactive" /></div>
              <div class="art-footer">A little closer to your goal.<ion-icon :icon="arrowForwardOutline" /></div>
            </div>
            <div class="art-tag"><ion-icon :icon="checkmarkCircleOutline" /> You've got this.</div>
          </div>
        </div>
        <p class="story-footer">Less keeping track. More moving forward.</p>
      </section>
      <section class="login-panel">
        <div class="login-controls"><DarkModeToggle /></div>
        <div class="login-card">
          <span class="welcome-icon"><ion-icon :icon="leafOutline" aria-hidden="true" /></span>
          <p class="eyebrow">Your everyday workspace</p>
          <h2>Welcome aboard.</h2>
          <p class="login-description">A fresh start for your tasks.<br />Sign in to pick up where you left off.</p>
          <button class="google-button" type="button" :disabled="!authReady || signingIn" @click="handleSignIn">
            <ion-spinner v-if="!authReady || signingIn" name="crescent" aria-hidden="true" />
            <svg v-else width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.2H24v8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.2Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.6-4.9l-6.7-5.2c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.7v5.4A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.4a12 12 0 0 1 0-7.7v-5.4H5.7a20 20 0 0 0 0 18.5l6.9-5.4Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3l5.8-5.8A19.6 19.6 0 0 0 24 4 20 20 0 0 0 5.7 14.3l6.9 5.4c1.6-4.8 6.1-7.6 11.4-7.6Z"/></svg>
            {{ !authReady ? 'Getting ready…' : signingIn ? 'Signing in…' : 'Continue with Google' }}
            <ion-icon v-if="authReady && !signingIn" :icon="arrowForwardOutline" class="sign-in-arrow" aria-hidden="true" />
          </button>
          <p v-if="signInError" class="form-error" role="alert">{{ signInError }}</p>
          <div class="login-divider"><span>Your work, organized</span></div>
          <div class="login-benefits">
            <span><ion-icon :icon="checkboxOutline" aria-hidden="true" /> Stay on top of tasks</span>
            <span><ion-icon :icon="timeOutline" aria-hidden="true" /> Keep track of OJT hours</span>
            <span><ion-icon :icon="attachOutline" aria-hidden="true" /> Save files and photos</span>
          </div>
        </div>
        <p class="login-footer"><ion-icon :icon="lockClosedOutline" aria-hidden="true" /> Secure sign-in with your Google account</p>
      </section>
    </main>
  </ion-app>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { IonApp, IonRouterOutlet, IonIcon, IonSpinner } from '@ionic/vue';
import { layersOutline, leafOutline, arrowForwardOutline, checkmarkOutline, checkmarkCircleOutline, sparklesOutline, checkboxOutline, timeOutline, attachOutline, lockClosedOutline } from 'ionicons/icons';
import { onAuthChange, signInWithGoogle } from '@/services/userService';
import type { User } from 'firebase/auth';
import DarkModeToggle from '@/components/DarkModeToggle.vue';
import { setReminderUser, startReminderListeners } from '@/services/reminderService';
const user = ref<User | null>(null);
const authReady = ref(false);
const signingIn = ref(false);
const signInError = ref('');
const stop = onAuthChange((u) => { setReminderUser(u?.uid || null); user.value = u; authReady.value = true; });
let stopReminders: (() => void) | undefined;
let disposed = false;
onMounted(async () => { const cleanup = await startReminderListeners(); if (disposed) cleanup(); else stopReminders = cleanup; });
onUnmounted(() => { disposed = true; stop(); stopReminders?.(); });
async function handleSignIn() {
  if (signingIn.value) return;
  signingIn.value = true;
  signInError.value = '';
  try { await signInWithGoogle(); }
  catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/popup-closed-by-user') signInError.value = 'Sign-in was closed. You can try again when you’re ready.';
    else if (code === 'auth/popup-blocked') signInError.value = 'Allow pop-ups for this page, then try signing in again.';
    else signInError.value = 'We couldn’t sign you in. Check your connection and try again.';
  } finally { signingIn.value = false; }
}
</script>

<style scoped>
.login-page { display: grid; grid-template-columns: 1.05fr 1fr; min-height: 100dvh; overflow: auto; background: var(--app-surface); }
.login-story { display: flex; flex-direction: column; min-width: 0; padding: max(40px, var(--ion-safe-area-top, 0px)) 8%; background: var(--app-primary-soft); }
.brand { display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 650; letter-spacing: -.4px; }
.brand-mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: var(--ion-color-primary-contrast); background: var(--ion-color-primary); font-size: 23px; }
.story-content { width: 100%; max-width: 490px; margin: auto; padding: 60px 0 35px; }
.story-content .eyebrow { color: var(--ion-color-primary); }
.story-content h1 { margin: 16px 0 20px; font-family: Georgia, serif; font-size: clamp(38px, 3.8vw, 56px); font-weight: 400; line-height: 1.12; letter-spacing: -2px; }
.story-description { max-width: 370px; margin: 0; color: var(--app-muted); font-size: 15px; line-height: 1.9; }
.planner-art { position: relative; margin: 55px 8px 38px; padding: 0 12px; }
.art-planner { position: relative; padding: 25px; transform: rotate(-3deg); border: 1px solid var(--app-line); border-radius: 20px; background: var(--app-surface); box-shadow: 0 18px 40px rgb(38 60 48 / 8%); }
.art-heading { display: flex; justify-content: space-between; font-size: 17px; font-weight: 650; letter-spacing: -.4px; }
.art-dots { color: var(--app-muted); letter-spacing: 2px; }
.art-rule { height: 1px; margin: 18px 0 5px; background: var(--app-line); }
.art-task { display: flex; align-items: center; gap: 13px; padding: 13px 0; }
.art-check { display: grid; place-items: center; flex-shrink: 0; width: 24px; height: 24px; border: 1.5px solid var(--app-line); border-radius: 8px; }
.art-check.checked { border: 0; background: var(--app-primary-soft); color: var(--ion-color-primary); }
.art-task strong { display: block; font-size: 13px; font-weight: 600; }
.art-task small { display: block; margin-top: 4px; color: var(--app-muted); font-size: 11px; }
.art-progress { display: flex; gap: 5px; margin: 16px 0 10px; }
.art-progress span { flex: 1; height: 6px; border-radius: 5px; background: var(--ion-color-primary); }
.art-progress .inactive { background: var(--app-line); }
.art-footer { display: flex; align-items: center; justify-content: space-between; color: var(--app-muted); font-size: 11px; }
.art-note, .art-tag { position: absolute; z-index: 1; display: flex; align-items: center; gap: 8px; padding: 12px 15px; border-radius: 12px; font-size: 12px; box-shadow: 0 8px 25px rgb(38 60 48 / 8%); }
.art-note { top: -24px; right: -8px; transform: rotate(5deg); color: var(--app-warning); background: var(--app-warning-soft); }
.art-tag { bottom: -21px; left: 0; transform: rotate(3deg); color: var(--ion-color-primary-contrast); background: var(--ion-color-primary); }
.art-note ion-icon, .art-tag ion-icon { font-size: 18px; }
.story-footer { margin: 0; font-size: 12px; color: var(--app-muted); }
.login-panel { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 50px; min-width: 0; padding: 95px 40px 40px; }
.login-controls { position: absolute; top: max(24px, var(--ion-safe-area-top, 0px)); right: 28px; }
.login-card { width: 100%; max-width: 355px; }
.welcome-icon { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 28px; border: 1px solid var(--app-line); border-radius: 16px; color: var(--ion-color-primary); background: var(--app-bg); font-size: 27px; }
.login-card h2 { margin: 12px 0 15px; font-size: 34px; letter-spacing: -1.4px; font-weight: 650; }
.login-description { margin: 0 0 32px; color: var(--app-muted); font-size: 15px; line-height: 1.8; }
.google-button { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 54px; padding: 14px 17px; border: 1px solid var(--app-line); border-radius: 13px; color: var(--app-text); background: var(--app-surface); font-size: 14px; font-weight: 600; box-shadow: 0 3px 10px rgb(38 60 48 / 3%); }
.google-button:hover:not(:disabled) { border-color: var(--ion-color-primary); background: var(--app-bg); }
.google-button ion-spinner { width: 20px; height: 20px; }
.sign-in-arrow { margin-left: auto; color: var(--app-muted); }
.google-button svg { margin-right: auto; }
.login-card .form-error { margin-top: 14px; }
.login-divider { display: flex; align-items: center; gap: 14px; margin: 30px 0 23px; color: var(--app-muted); font-size: 11px; }
.login-divider::before, .login-divider::after { content: ''; flex: 1; height: 1px; background: var(--app-line); }
.login-benefits { display: grid; gap: 16px; color: var(--app-muted); font-size: 13px; }
.login-benefits span { display: flex; align-items: center; gap: 10px; }
.login-benefits ion-icon { color: var(--ion-color-primary); font-size: 18px; }
.login-footer { display: flex; align-items: center; gap: 7px; color: var(--app-muted); font-size: 11px; text-align: center; line-height: 1.7; }
@media (max-width: 760px) {
  .login-page { grid-template-columns: 1fr; }
  .login-story { padding: 28px 26px; padding-top: max(28px, var(--ion-safe-area-top, 0px)); }
  .brand { font-size: 15px; }
  .story-content { max-width: none; padding: 33px 0 0; }
  .story-content h1 { margin: 12px 0; font-size: 37px; letter-spacing: -1.3px; }
  .story-description { font-size: 13px; line-height: 1.8; }
  .planner-art, .story-footer { display: none; }
  .login-panel { padding: 48px 26px max(24px, var(--ion-safe-area-bottom, 0px)); gap: 24px; }
  .login-card { max-width: 430px; }
  .login-controls { top: 12px; right: 16px; }
  .welcome-icon { display: none; }
  .login-card h2 { font-size: 28px; }
  .login-description { margin-bottom: 24px; font-size: 14px; }
}
</style>
