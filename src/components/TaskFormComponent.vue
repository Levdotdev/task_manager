<template>
  <ion-list>
    <ion-item>
      <ion-input label="Title" v-model="title" required />
    </ion-item>
    <ion-item>
      <ion-textarea label="Description" v-model="description" required />
    </ion-item>
    <ion-item>
      <ion-input label="Due Date" type="date" v-model="dueDate" required />
    </ion-item>
    <ion-item>
      <ion-select label="Priority" v-model="priority">
        <ion-select-option value="low">Low</ion-select-option>
        <ion-select-option value="medium">Medium</ion-select-option>
        <ion-select-option value="high">High</ion-select-option>
      </ion-select>
    </ion-item>
  </ion-list>

  <CameraComponent @photo-captured="onPhotoCaptured" />
  <ion-img v-if="photoPreview" :src="photoPreview" />

  <ion-text v-if="!canSave" color="medium">
    <p>Title, description, and due date are required.</p>
  </ion-text>

  <ion-button expand="block" :disabled="saving || !canSave" @click="save">
    {{ saving ? 'Saving…' : (isEditing ? 'Update Task' : 'Save Task') }}
  </ion-button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonList, IonItem, IonInput, IonTextarea,
  IonSelect, IonSelectOption, IonImg, IonButton, IonText,
} from '@ionic/vue';
import { addTask, updateTask, type Task } from '@/services/taskService';
import { webPathToDataUrl } from '@/utils/media';
import CameraComponent from './CameraComponent.vue';

const props = defineProps<{ task?: Task | null }>();
const emit = defineEmits<{(e: 'taskSaved'): void}>();

const isEditing = computed(() => !!props.task);

const title = ref('');
const description = ref('');
const dueDate = ref('');
const priority = ref<'low' | 'medium' | 'high'>('medium');
const photoPreview = ref('');
const saving = ref(false);

onMounted(() => {
  if (props.task) {
    title.value = props.task.title;
    description.value = props.task.description;
    dueDate.value = props.task.due_date;
    priority.value = props.task.priority;
    photoPreview.value = props.task.image || '';
  }
});

const canSave = computed(() =>
  title.value.trim() !== '' && description.value.trim() !== '' && dueDate.value !== ''
);

const onPhotoCaptured = (webPath: string) => {
  photoPreview.value = webPath;
};

const save = async () => {
  if (!canSave.value) return;
  saving.value = true;
  try {
    // already a data URL (existing task's photo, untouched) vs a fresh capture
    const photoDataUrl = photoPreview.value
      ? (photoPreview.value.startsWith('data:') ? photoPreview.value : await webPathToDataUrl(photoPreview.value))
      : undefined;

    if (isEditing.value && props.task) {
      await updateTask(props.task.id, {
        title: title.value,
        description: description.value,
        due_date: dueDate.value,
        priority: priority.value,
        photoDataUrl,
      });
    } else {
      await addTask({
        title: title.value,
        description: description.value,
        due_date: dueDate.value,
        priority: priority.value,
        photoDataUrl,
      });
    }
    emit('taskSaved');
  } catch (error) {
    console.error('Failed to save task:', error);
  } finally {
    saving.value = false;
  }
};
</script>