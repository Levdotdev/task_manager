<template>
  <ion-card class="task-tile">
    <ion-img v-if="task.image" :src="task.image" class="task-thumb" />
    <div v-else class="task-thumb placeholder">
      <ion-icon :icon="imageOutlineIcon" />
      <p>No Photo</p>
    </div>

    <ion-card-header>
      <div class="badge-row">
        <ion-badge :color="priorityColor(task.priority)">{{ task.priority }}</ion-badge>
        <ion-badge :color="statusColor">{{ displayStatus }}</ion-badge>
      </div>
      <ion-card-title class="task-title">{{ task.title }}</ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <p class="task-description">{{ task.description }}</p>
      <p class="task-due">Due: {{ formattedDue }}</p>

      <div v-if="task.link || task.fileData" class="attachments">
        <a v-if="task.link" :href="task.link" target="_blank" rel="noopener" class="attachment-link">
          <ion-icon :icon="linkIcon" /> Link
        </a>
        <a v-if="task.fileData" :href="task.fileData" :download="task.fileName || 'attachment'" class="attachment-link">
          <ion-icon :icon="documentIcon" /> {{ task.fileName || 'File' }}
        </a>
      </div>

      <div class="tile-actions">
        <template v-if="task.status === 'Completed'">
          <ion-button size="small" fill="outline" @click="$emit('revert')">
            <ion-icon slot="start" :icon="revertIcon" />Revert
          </ion-button>
          <ion-button size="small" fill="outline" color="danger" @click="$emit('delete')">
            <ion-icon slot="start" :icon="trashIcon" />Delete
          </ion-button>
        </template>
        <template v-else>
          <ion-button size="small" fill="outline" @click="$emit('edit')">
            <ion-icon slot="start" :icon="editIcon" />Edit
          </ion-button>
          <ion-button size="small" fill="outline" color="success" @click="$emit('complete')">
            <ion-icon slot="start" :icon="checkmarkIcon" />Complete
          </ion-button>
          <ion-button size="small" fill="outline" color="danger" @click="$emit('delete')">
            <ion-icon slot="start" :icon="trashIcon" />Delete
          </ion-button>
        </template>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonImg, IonIcon, IonBadge, IonButton } from '@ionic/vue';
import {
  imageOutline as imageOutlineIcon, create as editIcon, trash as trashIcon,
  checkmarkDone as checkmarkIcon, arrowUndo as revertIcon,
  link as linkIcon, documentAttach as documentIcon,
} from 'ionicons/icons';
import type { Task } from '@/services/taskService';

const props = defineProps<{ task: Task }>();
defineEmits<{ (e: 'edit'): void; (e: 'delete'): void; (e: 'complete'): void; (e: 'revert'): void; }>();

const isMissed = computed(() => props.task.status === 'Pending' && new Date(props.task.due_date) < new Date());
const displayStatus = computed(() => props.task.status === 'Completed' ? 'Completed' : (isMissed.value ? 'Missed' : 'Pending'));
const statusColor = computed(() => props.task.status === 'Completed' ? 'success' : (isMissed.value ? 'danger' : 'warning'));
const formattedDue = computed(() =>
  new Date(props.task.due_date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
);

function priorityColor(priority: Task['priority']) {
  if (priority === 'high') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'medium';
}
</script>

<style scoped>
.task-thumb { width: 100%; display: block; }
.task-thumb::part(image) { width: 100%; height: auto; display: block; }
.task-thumb.placeholder {
  aspect-ratio: 4 / 3; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; background: var(--ion-color-light); color: var(--ion-color-medium);
}
.task-thumb.placeholder ion-icon { font-size: 2.5rem; }
.task-thumb.placeholder p { margin: 0; font-size: 0.75rem; }
.badge-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.task-title { font-size: 1rem; font-weight: 700; margin-top: 4px; }
.task-description {
  font-size: 0.85rem; color: var(--ion-color-dark); margin: 4px 0;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.task-due { font-size: 0.85rem; color: var(--ion-color-medium); }
.attachments { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 8px; }
.attachment-link { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--ion-color-primary); text-decoration: none; }
.tile-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.tile-actions ion-button { --padding-start: 8px; --padding-end: 8px; margin: 0; white-space: nowrap; }
</style>