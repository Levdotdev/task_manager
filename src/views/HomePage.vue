<template>
  <ion-page>
    <ion-header class="app-header ion-no-border">
      <ion-toolbar>
        <div class="header-brand" slot="start"><span class="brand-mark"><AppLogo /></span><div><strong>OJT Task Manager</strong><small>A little progress, every day.</small></div></div>
        <div slot="end" class="toolbar-end"><FirebaseConnectionComponent /><DarkModeToggle /><span class="toolbar-divider" /><UserMenuComponent /></div>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="workspace"><TaskGalleryComponent /></div>
    </ion-content>
  </ion-page>
</template>
<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue';
import { IonPage, IonHeader, IonToolbar, IonContent } from '@ionic/vue';
import FirebaseConnectionComponent from '@/components/FirebaseConnectionComponent.vue';
import UserMenuComponent from '@/components/UserMenuComponent.vue';
import DarkModeToggle from '@/components/DarkModeToggle.vue';
import TaskGalleryComponent from '@/components/TaskGalleryComponent.vue';
</script>
<style scoped>
.app-header { border-bottom: 1px solid var(--app-line); }
ion-toolbar { --min-height: 80px; --padding-start: max(32px, var(--ion-safe-area-left, 0px)); --padding-end: max(24px, var(--ion-safe-area-right, 0px)); }
.header-brand { display: flex; align-items: center; gap: 12px; }
.brand-mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: var(--ion-color-primary-contrast); background: var(--ion-color-primary); font-size: 23px; }
.header-brand strong { display: block; font-size: 16px; font-weight: 650; letter-spacing: -.4px; }
.header-brand small { display: block; margin-top: 4px; color: var(--app-muted); font-size: 11px; }
.toolbar-end { display: flex; align-items: center; gap: 8px; }
.toolbar-divider { height: 25px; width: 1px; margin: 0 6px; background: var(--app-line); }
.workspace { max-width: 1240px; margin: 0 auto; padding: 44px max(36px, var(--ion-safe-area-left, 0px)) max(60px, var(--ion-safe-area-bottom, 0px)); }
@media (max-width: 600px) {
  ion-toolbar { --min-height: 72px; --padding-start: max(16px, var(--ion-safe-area-left, 0px)); --padding-end: max(10px, var(--ion-safe-area-right, 0px)); }
  .header-brand { gap: 9px; }
  .brand-mark { width: 34px; height: 34px; font-size: 20px; }
  .header-brand strong { font-size: 13px; }
  .header-brand small, .toolbar-divider { display: none; }
  .toolbar-end { gap: 0; }
  .workspace { padding: 28px 18px max(40px, var(--ion-safe-area-bottom, 0px)); }
}
@media (max-width: 360px) { .header-brand strong { max-width: 90px; line-height: 1.3; } }
</style>
