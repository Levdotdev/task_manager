<template>
  <section class="task-workspace">
    <div class="overview-heading">
      <div><p class="eyebrow">Your internship, organized</p><h1>Your work, in one place.</h1><p class="overview-description">Keep a clear head. Take it one task at a time.</p></div>
      <button class="primary-button add-task" type="button" @click="modalTask = 'new'"><ion-icon :icon="addOutline" aria-hidden="true" />Add task</button>
    </div>
    <div class="summary-grid" aria-label="Task overview">
      <button v-for="summary in summaries" :key="summary.status" class="summary-card" :class="{ selected: filter === summary.status }" type="button" :aria-pressed="filter === summary.status" @click="filter = summary.status">
        <span class="summary-icon" :class="summary.tone"><ion-icon :icon="summary.icon" aria-hidden="true" /></span>
        <span class="summary-copy"><span class="summary-label">{{ summary.label }}</span><strong>{{ summary.count }}</strong></span>
        <span class="summary-caption">{{ summary.caption }}</span>
      </button>
    </div>
    <section class="task-list-section" aria-labelledby="task-list-title">
      <div class="list-toolbar">
        <div class="list-heading"><h2 id="task-list-title">Your tasks</h2><span>{{ filteredCount }} {{ filteredCount === 1 ? 'task' : 'tasks' }}</span></div>
        <div class="status-filter" aria-label="Filter tasks">
          <button v-for="status in statuses" :key="status" type="button" :class="{ active: filter === status }" :aria-pressed="filter === status" @click="filter = status">{{ status }}</button>
        </div>
      </div>
      <div v-for="group in visibleGroups" :key="group.date" class="date-group">
        <div class="date-heading"><h3>{{ formatDateHeader(group.date) }}</h3><span>{{ group.tasks.length }}</span><div class="date-rule" /></div>
        <div class="task-grid">
          <TaskTile v-for="task in group.tasks" :key="task.id" :task="task" @edit="modalTask = task" @complete="openConfirmation('complete', task)" @revert="openConfirmation('revert', task)" @delete="openConfirmation('delete', task)" />
        </div>
      </div>
      <div v-if="visibleGroups.length === 0" class="empty-state">
        <span class="empty-icon"><ion-icon :icon="emptyState.icon" aria-hidden="true" /></span><h3>{{ emptyState.title }}</h3><p>{{ emptyState.description }}</p>
        <button v-if="filter === 'Pending'" class="secondary-button" type="button" @click="modalTask = 'new'"><ion-icon :icon="addOutline" aria-hidden="true" />Add your first task</button>
      </div>
    </section>
    <p class="workspace-footer"><ion-icon :icon="leafOutline" aria-hidden="true" />Small steps still move you forward.</p>
  </section>

  <AppDialog :is-open="modalTask !== null" :title="modalTask === 'new' ? 'A new task, a fresh start.' : 'Make a few adjustments.'" :description="modalTask === 'new' ? 'Add the details now. Your future self will thank you.' : 'Update the details and keep your plans on track.'" :icon="createOutline" :busy="formSaving" wide hide-footer @dismiss="closeTaskForm">
    <TaskFormComponent :task="modalTask === 'new' ? null : modalTask" @task-saved="modalTask = null" @saving-change="formSaving = $event" @cancel="closeTaskForm" />
  </AppDialog>
  <AppDialog :is-open="confirmation !== null" :title="confirmationDetails.title" :description="confirmationDetails.description" :icon="confirmationDetails.icon" :confirm-label="confirmationDetails.label" :busy="actionBusy" busy-label="Working…" :danger="confirmation?.action === 'delete'" @dismiss="closeConfirmation" @confirm="confirmAction">
    <div v-if="confirmation" class="confirmation-task"><ion-icon :icon="documentTextOutline" aria-hidden="true" /><strong>{{ confirmation.task.title }}</strong></div>
    <p v-if="actionError" class="form-error" role="alert">{{ actionError }}</p>
  </AppDialog>
</template>
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { IonIcon } from '@ionic/vue';
import { addOutline, timeOutline, alertCircleOutline, checkmarkCircleOutline, createOutline, trashOutline, arrowUndoOutline, documentTextOutline, leafOutline, checkboxOutline } from 'ionicons/icons';
import { subscribeToTasks, markTaskCompleted, revertTaskToPending, deleteTask, type Task } from '@/services/taskService';
import TaskFormComponent from './TaskFormComponent.vue';
import TaskTile from './TaskTile.vue';
import AppDialog from './AppDialog.vue';
const tasks = ref<Task[]>([]);
const unsubscribe = subscribeToTasks((updated) => { tasks.value = updated; });
onUnmounted(unsubscribe);
const statuses = ['Pending', 'Missed', 'Completed'] as const;
const filter = ref<typeof statuses[number]>('Pending');
const modalTask = ref<Task | 'new' | null>(null);
const formSaving = ref(false);
type Action = 'delete' | 'complete' | 'revert';
const confirmation = ref<{ action: Action; task: Task } | null>(null);
const actionBusy = ref(false);
const actionError = ref('');
function displayStatus(task: Task): typeof statuses[number] {
  if (task.status === 'Completed') return 'Completed';
  return new Date(task.due_date) < new Date() ? 'Missed' : 'Pending';
}
const counts = computed(() => ({
  Pending: tasks.value.filter(t => displayStatus(t) === 'Pending').length,
  Missed: tasks.value.filter(t => displayStatus(t) === 'Missed').length,
  Completed: tasks.value.filter(t => displayStatus(t) === 'Completed').length,
}));
const summaries = computed(() => [
  { status: 'Pending' as const, label: 'On your list', count: counts.value.Pending, icon: timeOutline, tone: 'pending', caption: 'Ready when you are' },
  { status: 'Missed' as const, label: 'Needs attention', count: counts.value.Missed, icon: alertCircleOutline, tone: 'missed', caption: 'A chance to catch up' },
  { status: 'Completed' as const, label: 'All wrapped up', count: counts.value.Completed, icon: checkmarkCircleOutline, tone: 'completed', caption: 'Look how far you’ve come' },
]);
const priorityRank = { high: 0, medium: 1, low: 2 };
const visibleGroups = computed(() => {
  const groups: Record<string, Task[]> = {};
  for (const task of tasks.value.filter(t => displayStatus(t) === filter.value)) {
    const date = task.due_date.slice(0, 10);
    (groups[date] ??= []).push(task);
  }
  const dates = Object.keys(groups).sort();
  if (filter.value === 'Completed') dates.reverse();
  return dates.map(date => ({ date, tasks: [...groups[date]].sort((a, b) =>
    filter.value === 'Completed' ? priorityRank[b.priority] - priorityRank[a.priority] : priorityRank[a.priority] - priorityRank[b.priority]
  ) }));
});
const filteredCount = computed(() => counts.value[filter.value]);
const emptyState = computed(() => {
  if (filter.value === 'Completed') return { icon: checkboxOutline, title: 'Your wins will live here.', description: 'Complete a task and give yourself a little credit.' };
  if (filter.value === 'Missed') return { icon: checkmarkCircleOutline, title: 'Nothing to catch up on.', description: 'You’re on top of your deadlines. Keep it up.' };
  return { icon: leafOutline, title: 'A little room for your next step.', description: 'Add a task to start planning your day.' };
});
const confirmationDetails = computed(() => {
  if (confirmation.value?.action === 'delete') return { title: 'Delete this task?', description: 'This will remove the task and its attachments permanently.', icon: trashOutline, label: 'Delete task' };
  if (confirmation.value?.action === 'revert') return { title: 'Back on your list?', description: 'Move this task back to pending so you can work on it again.', icon: arrowUndoOutline, label: 'Move to pending' };
  return { title: 'Another task, done.', description: 'Mark this task as completed and celebrate a little progress.', icon: checkmarkCircleOutline, label: 'Mark as completed' };
});
function formatDateHeader(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}
function closeTaskForm() { if (!formSaving.value) modalTask.value = null; }
function openConfirmation(action: Action, task: Task) { actionError.value = ''; confirmation.value = { action, task }; }
function closeConfirmation() { if (!actionBusy.value) { confirmation.value = null; actionError.value = ''; } }
async function confirmAction() {
  if (!confirmation.value || actionBusy.value) return;
  const { action, task } = confirmation.value;
  actionBusy.value = true;
  actionError.value = '';
  try {
    if (action === 'delete') await deleteTask(task.id);
    else if (action === 'complete') await markTaskCompleted(task.id);
    else await revertTaskToPending(task.id);
    confirmation.value = null;
  } catch { actionError.value = 'We couldn’t update this task. Check your connection and try again.'; }
  finally { actionBusy.value = false; }
}
</script>
<style scoped>
.overview-heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 30px; }
h1 { margin: 0; font-family: Georgia, serif; font-size: clamp(30px, 3.5vw, 42px); font-weight: 400; line-height: 1.2; letter-spacing: -1.5px; }
.overview-description { margin: 12px 0 0; color: var(--app-muted); font-size: 14px; line-height: 1.7; }
.add-task { flex-shrink: 0; }
.add-task ion-icon { font-size: 20px; }
.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-bottom: 38px; }
.summary-card { display: grid; grid-template-columns: 44px 1fr; column-gap: 14px; align-items: center; padding: 23px; text-align: left; color: var(--app-text); background: var(--app-surface); border: 1px solid var(--app-line); border-radius: 18px; box-shadow: var(--app-shadow); }
.summary-card:hover, .summary-card.selected { border-color: var(--ion-color-primary); }
.summary-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; font-size: 23px; }
.summary-icon.pending { color: var(--app-warning); background: var(--app-warning-soft); }
.summary-icon.missed { color: var(--ion-color-danger); background: var(--app-danger-soft); }
.summary-icon.completed { color: var(--ion-color-primary); background: var(--app-primary-soft); }
.summary-label { display: block; font-size: 12px; color: var(--app-muted); }
.summary-copy strong { display: block; margin-top: 4px; font-size: 28px; font-weight: 650; line-height: 1; letter-spacing: -1px; }
.summary-caption { grid-column: 1 / -1; margin-top: 18px; color: var(--app-muted); font-size: 11px; }
.list-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
.list-heading { display: flex; align-items: center; gap: 12px; }
.list-heading h2 { margin: 0; font-size: 21px; font-weight: 650; letter-spacing: -.6px; }
.list-heading > span { padding: 5px 9px; border-radius: 8px; background: var(--app-surface-alt); color: var(--app-muted); font-size: 11px; }
.status-filter { display: flex; padding: 4px; gap: 3px; border: 1px solid var(--app-line); border-radius: 12px; background: var(--app-surface-alt); }
.status-filter button { min-height: 38px; padding: 9px 18px; border: 0; border-radius: 8px; background: transparent; color: var(--app-muted); font-size: 12px; font-weight: 600; }
.status-filter button.active { background: var(--app-surface); color: var(--app-text); box-shadow: 0 2px 5px rgb(30 50 36 / 6%); }
.date-group { margin-top: 25px; }
.date-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.date-heading h3 { margin: 0; font-size: 12px; font-weight: 600; color: var(--app-muted); }
.date-heading > span { font-size: 10px; color: var(--app-muted); }
.date-rule { flex: 1; height: 1px; margin-left: 3px; background: var(--app-line); }
.task-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; padding: 40px 24px; border: 1px dashed var(--app-line); border-radius: 20px; text-align: center; background: var(--app-surface); }
.empty-icon { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 20px; background: var(--app-primary-soft); color: var(--ion-color-primary); font-size: 30px; }
.empty-state h3 { margin: 20px 0 8px; font-size: 19px; letter-spacing: -.4px; }
.empty-state p { margin: 0; color: var(--app-muted); font-size: 13px; line-height: 1.8; }
.empty-state button { margin-top: 24px; }
.workspace-footer { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 40px 0 0; color: var(--app-muted); font-size: 11px; }
.confirmation-task { display: flex; align-items: center; gap: 10px; padding: 14px; border: 1px solid var(--app-line); border-radius: 12px; background: var(--app-bg); font-size: 13px; line-height: 1.6; }
.confirmation-task ion-icon { flex-shrink: 0; color: var(--app-muted); font-size: 19px; }
.confirmation-task strong { overflow-wrap: anywhere; font-weight: 600; }
.confirmation-task + .form-error { margin-top: 14px; }
@media (max-width: 950px) { .task-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) {
  .overview-heading { flex-wrap: wrap; gap: 20px; margin-bottom: 24px; }
  .overview-description { margin-top: 10px; font-size: 13px; }
  .summary-grid { gap: 8px; margin-bottom: 28px; }
  .summary-card { display: flex; flex-direction: column; align-items: flex-start; gap: 13px; padding: 14px 12px; border-radius: 14px; }
  .summary-icon { width: 34px; height: 34px; border-radius: 10px; font-size: 19px; }
  .summary-label { font-size: 10px; line-height: 1.5; }
  .summary-copy strong { font-size: 25px; margin-top: 6px; }
  .summary-caption { display: none; }
  .list-toolbar { align-items: flex-start; flex-direction: column; gap: 18px; margin-bottom: 22px; }
  .status-filter { width: 100%; }
  .status-filter button { flex: 1; min-height: 42px; padding: 10px 8px; }
  .task-grid { grid-template-columns: 1fr; gap: 14px; }
  .date-heading h3 { font-size: 11px; }
  .empty-state { min-height: 280px; }
}
</style>
