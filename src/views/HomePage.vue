<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Daily Task Manager</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <FirebaseConnectionComponent />
      <TaskGalleryComponent />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue';
import FirebaseConnectionComponent from '@/components/FirebaseConnectionComponent.vue';
import TaskGalleryComponent from '@/components/TaskGalleryComponent.vue';
</script>