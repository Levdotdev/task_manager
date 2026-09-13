<template>
  <form class="task-form" @submit.prevent="save">
    <label class="field"><span>Task title</span><input v-model="title" name="title" placeholder="What needs to get done?" required :disabled="saving" /></label>
    <label class="field"><span>Notes</span><textarea v-model="description" name="description" rows="3" placeholder="A few details to help you get started…" required :disabled="saving" /></label>
    <div class="form-row">
      <label class="field"><span>Due date & time</span><input v-model="dueDate" name="dueDate" type="datetime-local" required :disabled="saving" /></label>
      <label class="field"><span>Priority</span><select v-model="priority" name="priority" :disabled="saving"><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></label>
    </div>
    <div class="form-row">
      <label class="field"><span>Category <small>Optional</small></span><select v-model="categorySelection" name="category" :disabled="saving"><option value="">No category</option><option v-for="name in categoryNames" :key="name" :value="name">{{ categoryLabel(name) }}</option><option value="__custom__">Custom category…</option></select><input v-if="customCategory" v-model="category" name="customCategory" placeholder="Category name" :disabled="saving" aria-label="Custom category name" /></label>
      <label class="field"><span>Repeat</span><select v-model="recurrence" name="recurrence" :disabled="saving"><option v-for="option in RECURRENCE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
    </div>
    <p v-if="recurrence !== 'none'" class="field-hint">Repeats appear automatically on their dates in the calendar. Complete each date separately. Editing this task updates its recurring schedule.</p>
    <fieldset class="reminder-section" :disabled="saving">
      <legend><ion-icon :icon="notificationsOutline" aria-hidden="true" />Remind me before it’s due</legend>
      <div class="reminder-options"><label v-for="option in REMINDER_OPTIONS" :key="option.value" :class="{ checked: reminders.includes(option.value) }"><input v-model="reminders" type="checkbox" :value="option.value" /><span>{{ option.label }}</span></label></div>
      <p class="field-hint">{{ reminderState.native ? 'Delivered on this device, even when the app is closed.' : 'Delivered by the installed Android or iOS app. Your choices are saved with the task.' }}</p>
      <button v-if="reminderState.native && !reminderState.granted" class="secondary-button" type="button" :disabled="reminderState.enabling || saving" @click="enableDeviceReminders">{{ reminderState.enabling ? 'Enabling…' : 'Enable device reminders' }}</button>
      <p v-if="reminderState.native && !reminderState.granted && reminders.length" class="field-hint warning">Allow notifications in your device settings to receive these reminders.</p>
    </fieldset>
    <section class="attachment-section" aria-label="Task attachments">
      <div class="section-label"><ion-icon :icon="attachOutline" aria-hidden="true" /><span>A little extra context</span><small>Optional</small></div>
      <div v-for="(link, index) in links" :key="link.id" class="link-entry">
        <div class="link-heading"><strong>Link {{ index + 1 }}</strong><button class="remove-button" type="button" :disabled="saving" :aria-label="`Remove link ${index + 1}`" @click="links.splice(index, 1)"><ion-icon :icon="closeOutline" aria-hidden="true" /></button></div>
        <label class="field"><span>Link title</span><input v-model="link.title" :name="`linkTitle-${index}`" placeholder="Project brief, useful article…" :disabled="saving" /></label>
        <label class="field"><span>URL</span><input v-model="link.url" :name="`linkUrl-${index}`" type="url" placeholder="https://…" :disabled="saving" /></label>
      </div>
      <button class="secondary-button add-link" type="button" :disabled="saving" @click="links.push({ id: newId(), title: '', url: '' })"><ion-icon :icon="addOutline" aria-hidden="true" />Add {{ links.length ? 'another ' : 'a ' }}link</button>
      <div class="attachment-controls">
        <button class="upload-button" type="button" :disabled="saving || readingFile" @click="fileInputRef?.click()"><ion-icon :icon="documentAttachOutline" aria-hidden="true" /><span>{{ readingFile ? 'Reading files…' : 'Attach files' }}</span></button>
        <CameraComponent :disabled="saving" @photo-captured="photoPreview = $event" />
        <input ref="fileInputRef" type="file" multiple hidden aria-label="Choose attachments" :disabled="saving || readingFile" @change="onFilesSelected" />
      </div>
      <p class="field-hint">Up to 5 MB per file · 10 MB total for files and photo.</p>
      <ul v-if="files.length" class="file-list"><li v-for="(file, index) in files" :key="file.id"><ion-icon :icon="documentAttachOutline" aria-hidden="true" /><span><strong>{{ file.name }}</strong><small>{{ formatFileSize(file.size) }}</small></span><button class="remove-button" type="button" :disabled="saving || readingFile" :aria-label="`Remove ${file.name}`" @click="files.splice(index, 1)"><ion-icon :icon="closeOutline" aria-hidden="true" /></button></li></ul>
      <div v-if="photoPreview" class="photo-preview"><img :src="photoPreview" alt="Task photo preview" /><span><ion-icon :icon="cameraOutline" aria-hidden="true" />Photo attached</span><button class="remove-button" type="button" :disabled="saving" aria-label="Remove photo" @click="photoPreview = ''"><ion-icon :icon="closeOutline" aria-hidden="true" /></button></div>
    </section>
    <p v-if="saveError" class="form-error" role="alert">{{ saveError }}</p>
    <div class="form-footer"><p>Title, notes, and due date are required.</p><button class="primary-button" type="submit" :disabled="saving || readingFile || !canSave"><ion-spinner v-if="saving" name="crescent" aria-hidden="true" /><ion-icon v-else :icon="checkmarkOutline" aria-hidden="true" />{{ saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create task' }}</button><button class="cancel-button" type="button" :disabled="saving" @click="$emit('cancel')">Cancel</button></div>
  </form>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonIcon, IonSpinner } from '@ionic/vue';
import { attachOutline, documentAttachOutline, cameraOutline, checkmarkOutline, notificationsOutline, addOutline, closeOutline } from 'ionicons/icons';
import { addTask, updateTask } from '@/services/taskService';
import { CATEGORY_OPTIONS, REMINDER_OPTIONS, RECURRENCE_OPTIONS, type Task, type TaskFile, type TaskLink, type TaskPriority, type Recurrence, type ReminderMinutes } from '@/models/task';
import { categoryLabel, taskFiles, taskLinks, localDateTime, attachmentBytes, MAX_ATTACHMENT_BYTES, MAX_FILE_BYTES, formatFileSize } from '@/utils/tasks';
import { reminderState, enableDeviceReminders } from '@/services/reminderService';
import { webPathToDataUrl, fileToDataUrl } from '@/utils/media';
import CameraComponent from './CameraComponent.vue';
const props = withDefaults(defineProps<{ task?: Task | null; categories?: string[]; defaultDueDate?: string }>(), { categories: () => [], defaultDueDate: '' });
const emit = defineEmits<{ (e: 'taskSaved'): void; (e: 'savingChange', saving: boolean): void; (e: 'cancel'): void }>();
const isEditing = computed(() => !!props.task);
const title = ref('');
const description = ref('');
const dueDate = ref(props.defaultDueDate);
const priority = ref<TaskPriority>('medium');
const category = ref('');
const customCategory = ref(false);
const categoryNames = computed(() => [...new Set([...CATEGORY_OPTIONS.map(o => o.value), ...props.categories, ...(props.task?.category ? [props.task.category] : [])])]);
const categorySelection = computed({ get: () => customCategory.value ? '__custom__' : category.value, set: (value: string) => { customCategory.value = value === '__custom__'; category.value = customCategory.value ? '' : value; } });
const recurrence = ref<Recurrence>('none');
const reminders = ref<ReminderMinutes[]>([]);
const photoPreview = ref('');
const links = ref<TaskLink[]>([]);
const files = ref<TaskFile[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const saving = ref(false);
const readingFile = ref(false);
const saveError = ref('');
function newId() { return crypto.randomUUID(); }
onMounted(() => {
  const task = props.task;
  if (!task) return;
  title.value = task.title;
  description.value = task.description;
  const date = new Date(task.due_date);
  dueDate.value = Number.isNaN(date.getTime()) ? task.due_date : localDateTime(date);
  priority.value = task.priority;
  category.value = task.category || '';
  recurrence.value = task.recurrence || 'none';
  reminders.value = [...(task.reminders || [])];
  photoPreview.value = task.image || '';
  links.value = taskLinks(task).map(link => ({ ...link }));
  files.value = taskFiles(task).map(file => ({ ...file }));
});
const canSave = computed(() => title.value.trim() !== '' && description.value.trim() !== '' && dueDate.value !== '');
async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const chosen = Array.from(input.files || []);
  if (!chosen.length) return;
  readingFile.value = true;
  saveError.value = '';
  try {
    if (chosen.some(file => file.size > MAX_FILE_BYTES)) throw new Error('Choose files smaller than 5 MB each.');
    if (attachmentBytes(files.value, photoPreview.value) + chosen.reduce((sum, file) => sum + file.size, 0) > MAX_ATTACHMENT_BYTES) throw new Error('Keep files and photo under 10 MB in total.');
    const added = await Promise.all(chosen.map(async file => ({ id: newId(), name: file.name, data: await fileToDataUrl(file), type: file.type, size: file.size })));
    files.value.push(...added);
  } catch (error) { saveError.value = error instanceof Error ? error.message : 'We couldn’t read those files. Try choosing them again.'; }
  finally { readingFile.value = false; input.value = ''; }
}
async function save() {
  if (!canSave.value || saving.value || readingFile.value) return;
  const savedLinks: TaskLink[] = [];
  saveError.value = '';
  for (const link of links.value) {
    if (!link.url.trim() && !link.title.trim()) continue;
    try {
      const url = new URL(link.url.trim());
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported URL');
      savedLinks.push({ ...link, url: url.href, title: link.title.trim() || url.hostname });
    } catch { saveError.value = 'Give each link a valid URL starting with https:// or http://.'; return; }
  }
  saving.value = true;
  emit('savingChange', true);
  try {
    const photoDataUrl = photoPreview.value ? (photoPreview.value.startsWith('data:') ? photoPreview.value : await webPathToDataUrl(photoPreview.value)) : undefined;
    if (attachmentBytes(files.value, photoDataUrl) > MAX_ATTACHMENT_BYTES) { saveError.value = 'Keep files and photo under 10 MB in total.'; return; }
    const payload = { title: title.value, description: description.value, due_date: dueDate.value, priority: priority.value, category: category.value, recurrence: recurrence.value, reminders: reminders.value, photoDataUrl, links: savedLinks, files: files.value };
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
.field small { color: var(--app-muted); font-weight: 400; }
.field-hint { margin: -6px 0 0; color: var(--app-muted); font-size: 11px; line-height: 1.7; }
.field-hint.warning { color: var(--app-warning); }
.reminder-section { display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 18px; border: 1px solid var(--app-line); border-radius: 13px; background: var(--app-bg); }
.reminder-section legend { padding: 0 7px; font-size: 12px; font-weight: 600; }
.reminder-section legend ion-icon { margin-right: 6px; vertical-align: middle; font-size: 16px; }
.reminder-options { display: flex; flex-wrap: wrap; gap: 8px; }
.reminder-options label { display: flex; align-items: center; gap: 7px; min-height: 42px; padding: 8px 10px; border: 1px solid var(--app-line); border-radius: 9px; font-size: 12px; background: var(--app-surface); cursor: pointer; }
.reminder-options label.checked { color: var(--ion-color-primary); border-color: var(--ion-color-primary); background: var(--app-primary-soft); }
.reminder-options input { width: 15px; height: 15px; accent-color: var(--ion-color-primary); }
.attachment-section { display: flex; flex-direction: column; gap: 16px; padding-top: 21px; border-top: 1px solid var(--app-line); }
.section-label { display: flex; align-items: center; gap: 7px; color: var(--app-text); font-size: 12px; font-weight: 600; }
.section-label > ion-icon { font-size: 18px; color: var(--app-muted); }
.section-label small { margin-left: auto; color: var(--app-muted); font-size: 10px; font-weight: 400; }
.link-entry { display: flex; flex-direction: column; gap: 12px; padding: 12px 16px 16px; border: 1px solid var(--app-line); border-radius: 12px; }
.link-heading { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--app-muted); }
.add-link { align-self: flex-start; }
.attachment-controls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; align-items: start; }
.upload-button { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 46px; padding: 12px; border: 1px dashed var(--app-line); border-radius: 12px; background: var(--app-bg); color: var(--app-muted); font-size: 12px; }
.upload-button span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.upload-button ion-icon { font-size: 18px; flex-shrink: 0; }
.upload-button:hover:not(:disabled) { border-color: var(--ion-color-primary); color: var(--ion-color-primary); }
.file-list { display: flex; flex-direction: column; gap: 7px; margin: 0; padding: 0; list-style: none; }
.file-list li { display: flex; align-items: center; gap: 9px; padding: 5px 8px 5px 12px; border: 1px solid var(--app-line); border-radius: 10px; font-size: 12px; }
.file-list li > ion-icon { flex-shrink: 0; color: var(--app-muted); }
.file-list li > span { flex: 1; min-width: 0; }
.file-list strong { display: block; overflow-wrap: anywhere; font-weight: 500; }
.file-list small { display: block; margin-top: 3px; color: var(--app-muted); font-size: 10px; }
.remove-button { display: grid; place-items: center; flex-shrink: 0; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 9px; background: transparent; color: var(--app-muted); font-size: 19px; }
.remove-button:hover:not(:disabled) { color: var(--app-danger-text); background: var(--app-danger-soft); }
.photo-preview { position: relative; }
.photo-preview img { width: 100%; max-height: 200px; object-fit: cover; border: 1px solid var(--app-line); border-radius: 13px; }
.photo-preview > span { position: absolute; display: inline-flex; align-items: center; gap: 5px; bottom: 12px; left: 12px; padding: 7px 10px; border-radius: 8px; background: var(--app-surface); color: var(--app-text); font-size: 10px; }
.photo-preview .remove-button { position: absolute; right: 10px; top: 10px; background: var(--app-surface); }
.form-footer { position: sticky; bottom: -28px; z-index: 1; display: flex; flex-direction: column; gap: 6px; margin: 4px -28px -28px; padding: 16px 28px 18px; border-top: 1px solid var(--app-line); background: var(--app-surface); }
.form-footer p { margin: 0 0 10px; color: var(--app-muted); font-size: 11px; text-align: center; line-height: 1.6; }
.form-footer ion-spinner { width: 18px; height: 18px; }
@media (max-width: 440px) { .form-row { grid-template-columns: 1fr; } .reminder-section { padding: 14px; } }
@media (max-width: 480px) { .form-footer { bottom: -24px; margin: 4px -20px -24px; padding: 14px 20px 16px; } }
</style>
