<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>OJT Task Manager</ion-title>
        <div slot="end" class="toolbar-end">
          <DarkModeToggle />
          <FirebaseConnectionComponent />
          <UserMenuComponent />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <TaskGalleryComponent />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue';
import FirebaseConnectionComponent from '@/components/FirebaseConnectionComponent.vue';
import UserMenuComponent from '@/components/UserMenuComponent.vue';
import DarkModeToggle from '@/components/DarkModeToggle.vue';
import TaskGalleryComponent from '@/components/TaskGalleryComponent.vue';
</script>

<style scoped>
.toolbar-end {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 8px;
}
</style>