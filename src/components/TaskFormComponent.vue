<template>
  <ion-list>
    <ion-item>
      <ion-input label="Title" v-model="title" required />
    </ion-item>
    <ion-item>
      <ion-textarea label="Description" v-model="description" required />
    </ion-item>
    <ion-item>
      <ion-input label="Due Date" type="datetime-local" v-model="dueDate" required />
    </ion-item>
    <ion-item>
      <ion-select label="Priority" v-model="priority">
        <ion-select-option value="Low">Low</ion-select-option>
        <ion-select-option value="Medium">Medium</ion-select-option>
        <ion-select-option value="High">High</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item>
      <ion-input label="Link (optional)" type="url" v-model="link" placeholder="https://..." />
    </ion-item>
    <ion-item lines="none">
      <ion-label>Attachment (optional)</ion-label>
      <ion-button slot="end" size="small" fill="outline" @click="fileInputRef?.click()">
        {{ fileName || 'Choose File' }}
      </ion-button>
      <input ref="fileInputRef" type="file" hidden @change="onFileSelected" />
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
  IonList, IonItem, IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonImg, IonButton, IonText, IonLabel,
} from '@ionic/vue';
import { addTask, updateTask, type Task } from '@/services/taskService';
import { webPathToDataUrl, fileToDataUrl } from '@/utils/media';
import CameraComponent from './CameraComponent.vue';

const props = defineProps<{ task?: Task | null }>();
const emit = defineEmits<{(e: 'taskSaved'): void}>();

const isEditing = computed(() => !!props.task);

const title = ref('');
const description = ref('');
const dueDate = ref('');
const priority = ref<'low' | 'medium' | 'high'>('medium');
const photoPreview = ref('');
const link = ref('');
const fileName = ref('');
const fileDataUrl = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const saving = ref(false);

onMounted(() => {
  if (props.task) {
    title.value = props.task.title;
    description.value = props.task.description;
    dueDate.value = props.task.due_date;
    priority.value = props.task.priority;
    photoPreview.value = props.task.image || '';
    link.value = props.task.link || '';
    fileName.value = props.task.fileName || '';
    fileDataUrl.value = props.task.fileData || '';
  }
});

const canSave = computed(() =>
  title.value.trim() !== '' && description.value.trim() !== '' && dueDate.value !== ''
);

const onPhotoCaptured = (webPath: string) => { photoPreview.value = webPath; };

const onFileSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  fileDataUrl.value = await fileToDataUrl(file);
};

const save = async () => {
  if (!canSave.value) return;
  saving.value = true;
  try {
    const photoDataUrl = photoPreview.value
      ? (photoPreview.value.startsWith('data:') ? photoPreview.value : await webPathToDataUrl(photoPreview.value))
      : undefined;

    const payload = {
      title: title.value,
      description: description.value,
      due_date: dueDate.value,
      priority: priority.value,
      photoDataUrl,
      link: link.value || undefined,
      fileName: fileName.value || undefined,
      fileData: fileDataUrl.value || undefined,
    };

    if (isEditing.value && props.task) await updateTask(props.task.id, payload);
    else await addTask(payload);
    emit('taskSaved');
  } catch (error) {
    console.error('Failed to save task:', error);
  } finally {
    saving.value = false;
  }
};
</script>