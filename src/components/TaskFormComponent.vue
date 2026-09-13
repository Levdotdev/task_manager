<template>
  <form class="task-form" @submit.prevent="save">
    <label class="field"><span>Task title</span><input v-model="title" name="title" placeholder="What needs to get done?" required :disabled="saving" /></label>
    <label class="field"><span>Description</span><textarea v-model="description" name="description" rows="3" placeholder="A few details to help you get started…" required :disabled="saving" /></label>
    <div class="form-row">
      <label class="field"><span>Due date & time</span><input v-model="dueDate" name="dueDate" type="datetime-local" required :disabled="saving" /></label>
      <label class="field"><span>Priority</span><select v-model="priority" name="priority" :disabled="saving"><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></label>
    </div>
    <div class="attachment-section">
      <div class="section-label"><ion-icon :icon="attachOutline" aria-hidden="true" /><span>A little extra context</span><small>Optional</small></div>
      <label class="field"><span>Link</span><input v-model="link" name="link" type="url" placeholder="https://…" :disabled="saving" /></label>
      <div class="attachment-controls">
        <button class="upload-button" type="button" :disabled="saving || readingFile" @click="fileInputRef?.click()"><ion-icon :icon="documentAttachOutline" aria-hidden="true" /><span>{{ readingFile ? 'Reading file…' : fileName || 'Attach a file' }}</span></button>
        <CameraComponent :disabled="saving" @photo-captured="onPhotoCaptured" />
        <input ref="fileInputRef" type="file" hidden aria-label="Choose an attachment" @change="onFileSelected" />
      </div>
      <div v-if="photoPreview" class="photo-preview"><img :src="photoPreview" alt="Task photo preview" /><span><ion-icon :icon="cameraOutline" aria-hidden="true" />Photo attached</span></div>
    </div>
    <p v-if="saveError" class="form-error" role="alert">{{ saveError }}</p>
    <div class="form-footer"><p>Title, description, and due date are required.</p><button class="primary-button" type="submit" :disabled="saving || readingFile || !canSave"><ion-spinner v-if="saving" name="crescent" aria-hidden="true" /><ion-icon v-else :icon="checkmarkOutline" aria-hidden="true" />{{ saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create task' }}</button><button class="cancel-button" type="button" :disabled="saving" @click="$emit('cancel')">Cancel</button></div>
  </form>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonIcon, IonSpinner } from '@ionic/vue';
import { attachOutline, documentAttachOutline, cameraOutline, checkmarkOutline } from 'ionicons/icons';
import { addTask, updateTask, type Task } from '@/services/taskService';
import { webPathToDataUrl, fileToDataUrl } from '@/utils/media';
import CameraComponent from './CameraComponent.vue';
const props = defineProps<{ task?: Task | null }>();
const emit = defineEmits<{ (e: 'taskSaved'): void; (e: 'savingChange', saving: boolean): void; (e: 'cancel'): void }>();
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
const readingFile = ref(false);
const saveError = ref('');
onMounted(() => {
  if (!props.task) return;
  title.value = props.task.title;
  description.value = props.task.description;
  dueDate.value = props.task.due_date;
  priority.value = props.task.priority;
  photoPreview.value = props.task.image || '';
  link.value = props.task.link || '';
  fileName.value = props.task.fileName || '';
  fileDataUrl.value = props.task.fileData || '';
});
const canSave = computed(() => title.value.trim() !== '' && description.value.trim() !== '' && dueDate.value !== '');
function onPhotoCaptured(webPath: string) { photoPreview.value = webPath; }
async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  readingFile.value = true;
  saveError.value = '';
  try { const data = await fileToDataUrl(file); fileName.value = file.name; fileDataUrl.value = data; }
  catch { saveError.value = 'We couldn’t read that file. Try choosing it again.'; }
  finally { readingFile.value = false; }
}
async function save() {
  if (!canSave.value || saving.value || readingFile.value) return;
  saving.value = true;
  emit('savingChange', true);
  saveError.value = '';
  try {
    const photoDataUrl = photoPreview.value ? (photoPreview.value.startsWith('data:') ? photoPreview.value : await webPathToDataUrl(photoPreview.value)) : undefined;
    const payload = { title: title.value, description: description.value, due_date: dueDate.value, priority: priority.value, photoDataUrl, link: link.value || undefined, fileName: fileName.value || undefined, fileData: fileDataUrl.value || undefined };
    if (isEditing.value && props.task) await updateTask(props.task.id, payload);
    else await addTask(payload);
    emit('taskSaved');
  } catch { saveError.value = 'We couldn’t save your task. Your details are still here—check your connection and try again.'; }
  finally { saving.value = false; emit('savingChange', false); }
}
</script>
<style scoped>
.task-form { display: flex; flex-direction: column; gap: 20px; }
.form-row { display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; }
.attachment-section { display: flex; flex-direction: column; gap: 16px; padding-top: 21px; border-top: 1px solid var(--app-line); }
.section-label { display: flex; align-items: center; gap: 7px; color: var(--app-text); font-size: 12px; font-weight: 600; }
.section-label > ion-icon { font-size: 18px; color: var(--app-muted); }
.section-label small { margin-left: auto; color: var(--app-muted); font-size: 10px; font-weight: 400; }
.attachment-controls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; align-items: start; }
.upload-button { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 46px; padding: 12px; border: 1px dashed var(--app-line); border-radius: 12px; background: var(--app-bg); color: var(--app-muted); font-size: 12px; }
.upload-button span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.upload-button ion-icon { font-size: 18px; flex-shrink: 0; }
.upload-button:hover:not(:disabled) { border-color: var(--ion-color-primary); color: var(--ion-color-primary); }
.photo-preview { position: relative; }
.photo-preview img { width: 100%; max-height: 200px; object-fit: cover; border: 1px solid var(--app-line); border-radius: 13px; }
.photo-preview span { position: absolute; display: inline-flex; align-items: center; gap: 5px; bottom: 12px; left: 12px; padding: 7px 10px; border-radius: 8px; background: var(--app-surface); color: var(--app-text); font-size: 10px; }
.form-footer { position: sticky; bottom: -28px; z-index: 1; display: flex; flex-direction: column; gap: 6px; margin: 4px -28px -28px; padding: 16px 28px 18px; border-top: 1px solid var(--app-line); background: var(--app-surface); }
.form-footer p { margin: 0 0 10px; color: var(--app-muted); font-size: 11px; text-align: center; line-height: 1.6; }
.form-footer ion-spinner { width: 18px; height: 18px; }
@media (max-width: 440px) { .form-row { grid-template-columns: 1fr; } }
@media (max-width: 480px) { .form-footer { bottom: -24px; margin: 4px -20px -24px; padding: 14px 20px 16px; } }
</style>
