<template>
  <section class="task-workspace">
    <div class="overview-heading">
      <div><p class="eyebrow">Your internship, organized</p><h1>Your work, in one place.</h1><p class="overview-description">Keep a clear head. Take it one task at a time.</p></div>
      <button class="primary-button add-task" type="button" @click="newTask"><ion-icon :icon="addOutline" aria-hidden="true" />Add task</button>
    </div>
    <div class="summary-grid" aria-label="Task overview">
      <button v-for="summary in summaries" :key="summary.status" class="summary-card" :class="{ selected: filter === summary.status }" type="button" :aria-pressed="filter === summary.status" @click="filter = summary.status">
        <span class="summary-icon" :class="summary.tone"><ion-icon :icon="summary.icon" aria-hidden="true" /></span>
        <span class="summary-copy"><span class="summary-label">{{ summary.label }}</span><strong>{{ summary.count }}</strong></span>
        <span class="summary-caption">{{ summary.caption }}</span>
      </button>
    </div>
    <div v-if="reminderState.native && (hasReminders || reminderState.error)" class="reminder-banner"><ion-icon :icon="notificationsOutline" aria-hidden="true" /><div><strong>{{ reminderState.granted ? 'Device reminders are on.' : 'Give your deadlines a gentle nudge.' }}</strong><p>{{ reminderState.error || (!reminderState.granted ? 'Allow notifications to receive your saved reminders on this device.' : !reminderState.exactAllowed ? 'Allow precise alarms in Android settings for reminders at the selected time.' : reminderState.deferred ? `${reminderState.deferred} later reminders will be scheduled as you reopen the app. The nearest reminders are ready.` : 'Upcoming task reminders are scheduled on this device.') }}</p></div><button v-if="!reminderState.granted" class="secondary-button" type="button" :disabled="reminderState.enabling" @click="enableDeviceReminders">{{ reminderState.enabling ? 'Enabling…' : 'Enable reminders' }}</button><button v-else-if="!reminderState.exactAllowed" class="secondary-button" type="button" @click="openExactReminderSettings">Open settings</button></div>
    <section class="task-list-section" aria-labelledby="task-list-title">
      <div class="list-toolbar">
        <div class="list-heading"><h2 id="task-list-title">Your tasks</h2><span aria-live="polite">{{ visibleCount }} {{ visibleCount === 1 ? 'task' : 'tasks' }}</span></div>
        <div class="view-switch" aria-label="Task view"><button type="button" :class="{ active: view === 'list' }" :aria-pressed="view === 'list'" @click="view = 'list'"><ion-icon :icon="gridOutline" aria-hidden="true" />List</button><button type="button" :class="{ active: view === 'calendar' }" :aria-pressed="view === 'calendar'" @click="view = 'calendar'"><ion-icon :icon="calendarOutline" aria-hidden="true" />Calendar</button></div>
      </div>
      <div class="filter-panel">
        <label class="search-field"><ion-icon :icon="searchOutline" aria-hidden="true" /><input v-model="query" name="taskSearch" type="search" aria-label="Search tasks, notes, categories, files and links" placeholder="Search tasks, notes, files, links…" /><button v-if="query" type="button" aria-label="Clear search" @click="query = ''"><ion-icon :icon="closeOutline" aria-hidden="true" /></button></label>
        <div class="filter-controls">
          <label class="field"><span>Category</span><select v-model="categoryFilter" aria-label="Filter by category"><option value="all">All categories</option><option value="uncategorized">Uncategorized</option><option v-for="name in categories" :key="name" :value="`category:${name}`">{{ categoryLabel(name) }}</option></select></label>
          <label class="field"><span>Priority</span><select v-model="priorityFilter" aria-label="Filter by priority"><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select></label>
          <label class="field"><span>Repeat</span><select v-model="repeatFilter" aria-label="Filter by repeat"><option value="all">All tasks</option><option value="recurring">Recurring tasks</option><option value="none">Does not repeat</option><option v-for="option in RECURRENCE_OPTIONS.filter(o => o.value !== 'none')" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
          <label v-if="view === 'list'" class="field"><span>Sort by</span><select v-model="sort" aria-label="Sort tasks"><option value="date">Due date</option><option value="priority">Priority</option><option value="manual">Your order</option></select></label>
        </div>
        <div class="filter-bottom"><div class="status-filter" aria-label="Filter by status"><button v-for="status in statuses" :key="status" type="button" :class="{ active: filter === status }" :aria-pressed="filter === status" @click="filter = status">{{ status }}</button></div><button v-if="hasFilters" class="clear-filters" type="button" @click="clearFilters">Clear filters</button></div>
      </div>
      <p v-if="view === 'list' && sort !== 'manual' && tasks.some(t => t.recurrence && t.recurrence !== 'none')" class="order-hint">Upcoming repeats for the next 30 days. Calendar shows repeats for any month.</p>
      <p v-if="loadError" class="form-error" role="alert">{{ loadError }}</p>
      <p v-if="orderError" class="form-error" role="alert">{{ orderError }}</p>
      <p class="sr-only" role="status">{{ orderMessage }}</p>
      <TaskCalendar v-if="view === 'calendar'" :tasks="matchingTasks" :selected-date="selectedDate" :now="now" @select="selectedDate = $event" />
      <div v-if="view === 'calendar'" class="selected-day-heading"><h3>{{ formatDateHeader(selectedDate) }}</h3><button class="clear-filters" type="button" @click="newTask">Add a task this day</button></div>
      <template v-if="view === 'list' && sort === 'manual' && filteredTasks.length">
        <p class="order-hint"><ion-icon :icon="reorderThreeOutline" aria-hidden="true" />{{ orderBusy ? 'Saving your order…' : 'Drag a card by its handle, or use its arrow buttons. Recurring schedules appear once here; Calendar shows every date.' }}</p>
        <Draggable v-model="manualTasks" class="task-grid manual-grid" item-key="id" handle=".drag-handle" :animation="150" :delay="120" :delay-on-touch-only="true" :disabled="orderBusy" ghost-class="task-ghost" @change="saveOrder"><template #item="{ element, index }"><TaskTile :task="element" :now="now" manual-order :busy="orderBusy" :can-move-up="index > 0" :can-move-down="index < manualTasks.length - 1" @move="moveTask(index, $event)" @edit="editTask(element)" @complete="openConfirmation('complete', element)" @revert="openConfirmation('revert', element)" @delete="openConfirmation('delete', element)" /></template></Draggable>
      </template>
      <template v-else><div v-for="group in visibleGroups" :key="group.date" class="date-group"><div v-if="view === 'list'" class="date-heading"><h3>{{ group.date === 'priority' ? 'Highest priority first' : formatDateHeader(group.date) }}</h3><span>{{ group.tasks.length }}</span><div class="date-rule" /></div><div class="task-grid"><TaskTile v-for="task in group.tasks" :key="task.id" :task="task" :now="now" @edit="editTask(task)" @complete="openConfirmation('complete', task)" @revert="openConfirmation('revert', task)" @delete="openConfirmation('delete', task)" /></div></div></template>
      <div v-if="filteredTasks.length === 0 && !loadError" class="empty-state"><span class="empty-icon"><ion-icon :icon="emptyState.icon" aria-hidden="true" /></span><h3>{{ emptyState.title }}</h3><p>{{ emptyState.description }}</p><button v-if="hasFilters" class="secondary-button" type="button" @click="clearFilters">Clear filters</button><button v-else class="secondary-button" type="button" @click="newTask"><ion-icon :icon="addOutline" aria-hidden="true" />Add a task</button></div>
    </section>
    <p class="workspace-footer"><ion-icon :icon="leafOutline" aria-hidden="true" />Small steps still move you forward.</p>
  </section>
  <AppDialog :is-open="modalTask !== null" :title="modalTask === 'new' ? 'A new task, a fresh start.' : 'Make a few adjustments.'" :description="modalTask === 'new' ? 'Add the details now. Your future self will thank you.' : 'Update the details and keep your plans on track.'" :icon="createOutline" :busy="formSaving" wide hide-footer @dismiss="closeTaskForm" @closed="taskDialogActive = false"><TaskFormComponent :key="modalTask === 'new' ? 'new' : modalTask?.id" :task="modalTask === 'new' ? null : modalTask" :categories="categories" :default-due-date="defaultDueDate" @task-saved="modalTask = null" @saving-change="formSaving = $event" @cancel="closeTaskForm" /></AppDialog>
  <AppDialog :is-open="confirmation !== null" :title="confirmationDetails.title" :description="confirmationDetails.description" :icon="confirmationDetails.icon" :confirm-label="confirmationDetails.label" :busy="actionBusy" busy-label="Working…" :danger="confirmation?.action === 'delete'" @dismiss="closeConfirmation" @closed="confirmationDialogActive = false" @confirm="confirmAction"><div v-if="confirmation" class="confirmation-task"><ion-icon :icon="documentTextOutline" aria-hidden="true" /><strong>{{ confirmation.task.title }}</strong></div><p v-if="actionError" class="form-error" role="alert">{{ actionError }}</p></AppDialog>
</template>
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { IonIcon } from '@ionic/vue';
import Draggable from 'vuedraggable';
import { addOutline, timeOutline, alertCircleOutline, checkmarkCircleOutline, createOutline, trashOutline, arrowUndoOutline, documentTextOutline, leafOutline, checkboxOutline, gridOutline, calendarOutline, searchOutline, closeOutline, reorderThreeOutline, notificationsOutline } from 'ionicons/icons';
import { subscribeToTasks, markTaskCompleted, revertTaskToPending, deleteTask, reorderTasks } from '@/services/taskService';
import { CATEGORY_OPTIONS, RECURRENCE_OPTIONS, type Task, type TaskPriority, type Recurrence } from '@/models/task';
import { categoryLabel, displayStatus, matchesSearch, taskDateKey, localDateKey, localDateTime, manualTaskOrder, mergeVisibleOrder } from '@/utils/tasks';
import { expandRecurringTasks, findTaskOccurrence } from '@/utils/recurrence';
import { reminderState, syncTaskReminders, enableDeviceReminders, openExactReminderSettings, pendingReminderTask, consumeReminderTask } from '@/services/reminderService';
import TaskFormComponent from './TaskFormComponent.vue';
import TaskTile from './TaskTile.vue';
import TaskCalendar from './TaskCalendar.vue';
import AppDialog from './AppDialog.vue';
const tasks = ref<Task[]>([]);
const tasksLoaded = ref(false);
const now = ref(new Date());
const statuses = ['All', 'Pending', 'Missed', 'Completed'] as const;
const filter = ref<typeof statuses[number]>('Pending');
const query = ref('');
const categoryFilter = ref('all');
const priorityFilter = ref<TaskPriority | 'all'>('all');
const repeatFilter = ref<Recurrence | 'all' | 'recurring'>('all');
const sort = ref<'date' | 'priority' | 'manual'>('date');
const view = ref<'list' | 'calendar'>('list');
const selectedDate = ref(localDateKey(now.value));
const modalTask = ref<Task | 'new' | null>(null);
const defaultDueDate = ref('');
const formSaving = ref(false);
const taskDialogActive = ref(false);
const confirmationDialogActive = ref(false);
const loadError = ref('');
const orderError = ref('');
const orderMessage = ref('');
const orderBusy = ref(false);
const optimisticOrder = ref<string[] | null>(null);
type Action = 'delete' | 'complete' | 'revert';
const confirmation = ref<{ action: Action; task: Task } | null>(null);
const actionBusy = ref(false);
const actionError = ref('');
const categories = computed(() => [...new Set([...CATEGORY_OPTIONS.map(o => o.value), ...tasks.value.map(t => t.category?.trim()).filter((name): name is string => !!name)])]);
const listTasks = computed(() => {
  const start = new Date(now.value); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 30);
  return expandRecurringTasks(tasks.value, start, end);
});
const workspaceTasks = computed(() => {
  if (view.value === 'list') return listTasks.value;
  const start = new Date(`${selectedDate.value.slice(0, 7)}-01T00:00`); start.setDate(start.getDate() - start.getDay());
  const end = new Date(start); end.setDate(end.getDate() + 42);
  return expandRecurringTasks(tasks.value, start, end);
});
const hasReminders = computed(() => tasks.value.some(t => t.status !== 'Completed' && t.reminders?.length));
const hasFilters = computed(() => !!query.value.trim() || categoryFilter.value !== 'all' || priorityFilter.value !== 'all' || repeatFilter.value !== 'all' || filter.value !== 'All');
const counts = computed(() => ({ Pending: listTasks.value.filter(t => displayStatus(t, now.value) === 'Pending').length, Missed: listTasks.value.filter(t => displayStatus(t, now.value) === 'Missed').length, Completed: listTasks.value.filter(t => t.status === 'Completed').length }));
const summaries = computed(() => [
  { status: 'Pending' as const, label: 'On your list', count: counts.value.Pending, icon: timeOutline, tone: 'pending', caption: 'Ready when you are' },
  { status: 'Missed' as const, label: 'Needs attention', count: counts.value.Missed, icon: alertCircleOutline, tone: 'missed', caption: 'A chance to catch up' },
  { status: 'Completed' as const, label: 'All wrapped up', count: counts.value.Completed, icon: checkmarkCircleOutline, tone: 'completed', caption: 'Look how far you’ve come' },
]);
const matchingTasks = computed(() => workspaceTasks.value.filter(task => {
  if (filter.value !== 'All' && displayStatus(task, now.value) !== filter.value) return false;
  if (categoryFilter.value === 'uncategorized' && task.category) return false;
  if (categoryFilter.value.startsWith('category:') && task.category !== categoryFilter.value.slice(9)) return false;
  if (priorityFilter.value !== 'all' && task.priority !== priorityFilter.value) return false;
  const repeat = task.recurrence || 'none';
  if (repeatFilter.value === 'recurring' && repeat === 'none') return false;
  if (repeatFilter.value !== 'all' && repeatFilter.value !== 'recurring' && repeat !== repeatFilter.value) return false;
  return matchesSearch(task, query.value);
}));
const filteredTasks = computed(() => view.value === 'calendar' ? matchingTasks.value.filter(t => taskDateKey(t) === selectedDate.value) : matchingTasks.value);
const priorityRank = { high: 0, medium: 1, low: 2 };
function byDate(a: Task, b: Task) { return new Date(a.due_date).getTime() - new Date(b.due_date).getTime() || priorityRank[a.priority] - priorityRank[b.priority]; }
const visibleGroups = computed(() => {
  if (view.value === 'list' && sort.value === 'priority') return filteredTasks.value.length ? [{ date: 'priority', tasks: [...filteredTasks.value].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || byDate(a, b)) }] : [];
  const groups: Record<string, Task[]> = {};
  for (const task of filteredTasks.value) (groups[taskDateKey(task)] ??= []).push(task);
  const dates = Object.keys(groups).sort();
  if (filter.value === 'Completed') dates.reverse();
  return dates.map(date => ({ date, tasks: [...groups[date]].sort(byDate) }));
});
const allOrderedTasks = computed(() => {
  const ordered = manualTaskOrder(tasks.value);
  if (!optimisticOrder.value) return ordered;
  const positions = new Map(optimisticOrder.value.map((id, index) => [id, index]));
  return ordered.sort((a, b) => (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER));
});
const manualTasks = computed({
  get: () => {
    const visible = new Map<string, Task>();
    for (const task of [...filteredTasks.value].sort(byDate)) { const source = task.occurrenceSourceId || task.id; if (!visible.has(source)) visible.set(source, task); }
    return allOrderedTasks.value.flatMap(t => visible.has(t.id) ? [visible.get(t.id)!] : []);
  },
  set: (visible: Task[]) => { optimisticOrder.value = mergeVisibleOrder(allOrderedTasks.value.map(t => t.id), visible.map(t => t.occurrenceSourceId || t.id)); },
});
const visibleCount = computed(() => view.value === 'list' && sort.value === 'manual' ? manualTasks.value.length : filteredTasks.value.length);
const emptyState = computed(() => {
  if (query.value || categoryFilter.value !== 'all' || priorityFilter.value !== 'all' || repeatFilter.value !== 'all') return { icon: searchOutline, title: 'No tasks match just yet.', description: 'Try another search or clear a filter to see more tasks.' };
  if (view.value === 'calendar') return { icon: calendarOutline, title: 'A little room in your day.', description: 'There are no tasks for this date with your current status filter.' };
  if (filter.value === 'Completed') return { icon: checkboxOutline, title: 'Your wins will live here.', description: 'Complete a task and give yourself a little credit.' };
  if (filter.value === 'Missed') return { icon: checkmarkCircleOutline, title: 'Nothing to catch up on.', description: 'You’re on top of your deadlines. Keep it up.' };
  return { icon: leafOutline, title: 'A little room for your next step.', description: 'Add a task to start planning your day.' };
});
const confirmationDetails = computed(() => {
  if (confirmation.value?.action === 'delete') return { title: 'Delete this task?', description: confirmation.value.task.occurrenceSourceId ? confirmation.value.task.status === 'Completed' ? 'Remove this completed date. Other dates in the schedule will stay.' : 'Remove this date and stop its future repeats. Earlier dates and completed history will stay.' : 'This will remove the task and its attachments permanently.', icon: trashOutline, label: 'Delete task' };
  if (confirmation.value?.action === 'revert') return { title: 'Back on your list?', description: confirmation.value.task.nextTaskId ? 'Move this occurrence back to pending. Its next occurrence will stay on your list.' : 'Move this task back to pending so you can work on it again.', icon: arrowUndoOutline, label: 'Move to pending' };
  return { title: 'Another task, done.', description: confirmation.value?.task.occurrenceSourceId ? 'Mark this date as completed. Other dates in the schedule will stay pending.' : 'Mark this task as completed and celebrate a little progress.', icon: checkmarkCircleOutline, label: 'Mark as completed' };
});
function clearFilters() { query.value = ''; categoryFilter.value = 'all'; priorityFilter.value = 'all'; repeatFilter.value = 'all'; filter.value = 'All'; }
function newTask() { defaultDueDate.value = view.value === 'calendar' ? `${selectedDate.value}T17:00` : localDateTime(new Date(now.value.getTime() + 3600_000)); modalTask.value = 'new'; }
function formatDateHeader(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }); }
function closeTaskForm() { if (!formSaving.value) modalTask.value = null; }
function editTask(task: Task) { modalTask.value = tasks.value.find(t => t.id === task.occurrenceSourceId) || task; }
function openConfirmation(action: Action, task: Task) { actionError.value = ''; confirmation.value = { action, task }; }
function closeConfirmation() { if (!actionBusy.value) { confirmation.value = null; actionError.value = ''; } }
async function saveOrder() {
  if (orderBusy.value || !optimisticOrder.value) return;
  const ids = [...optimisticOrder.value];
  orderBusy.value = true; orderError.value = '';
  try { await reorderTasks(ids); orderMessage.value = 'Your task order was saved.'; }
  catch { orderError.value = 'We couldn’t save your order. Check your connection and try again.'; }
  finally { optimisticOrder.value = null; orderBusy.value = false; }
}
async function moveTask(index: number, direction: number) { const ordered = [...manualTasks.value]; const next = index + direction; if (orderBusy.value || next < 0 || next >= ordered.length) return; [ordered[index], ordered[next]] = [ordered[next], ordered[index]]; manualTasks.value = ordered; await saveOrder(); }
async function confirmAction() {
  if (!confirmation.value || actionBusy.value) return;
  const { action, task } = confirmation.value; actionBusy.value = true; actionError.value = '';
  const id = task.occurrenceSourceId || task.id;
  const due = task.occurrenceSourceId ? task.due_date : undefined;
  try { if (action === 'delete') await deleteTask(id, due); else if (action === 'complete') await markTaskCompleted(id, due); else await revertTaskToPending(id, due); confirmation.value = null; }
  catch { actionError.value = 'We couldn’t update this task. Check your connection and try again.'; }
  finally { actionBusy.value = false; }
}
watch([modalTask, confirmation], ([task, action]) => {
  if (task !== null) taskDialogActive.value = true;
  if (action !== null) confirmationDialogActive.value = true;
});
watch([tasks, tasksLoaded, pendingReminderTask, modalTask, confirmation, taskDialogActive, confirmationDialogActive], () => {
  const taskId = pendingReminderTask.value;
  if (!taskId || !tasksLoaded.value || modalTask.value !== null || confirmation.value !== null || taskDialogActive.value || confirmationDialogActive.value) return;
  const task = findTaskOccurrence(tasks.value, taskId);
  if (task) { clearFilters(); view.value = 'list'; editTask(task); }
  consumeReminderTask(taskId);
}, { immediate: true });
let reminderTimer: ReturnType<typeof setTimeout> | undefined;
watch(tasks, updated => { if (!reminderState.native) return; clearTimeout(reminderTimer); reminderTimer = setTimeout(() => syncTaskReminders(updated), 250); });
const unsubscribe = subscribeToTasks(updated => { tasks.value = updated; tasksLoaded.value = true; loadError.value = ''; }, () => { loadError.value = 'Your tasks couldn’t be loaded. Check your connection and reopen the app.'; });
const clock = setInterval(() => { now.value = new Date(); if (reminderState.native && tasksLoaded.value) syncTaskReminders(tasks.value); }, 60_000);
onUnmounted(() => { unsubscribe(); clearInterval(clock); clearTimeout(reminderTimer); });
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
.view-switch { display: flex; gap: 4px; padding: 4px; border: 1px solid var(--app-line); border-radius: 11px; background: var(--app-surface-alt); }
.view-switch button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 8px 13px; border: 0; border-radius: 7px; color: var(--app-muted); background: transparent; font-size: 12px; font-weight: 600; }
.view-switch button.active { color: var(--app-text); background: var(--app-surface); box-shadow: 0 2px 5px rgb(30 50 36 / 6%); }
.filter-panel { display: flex; flex-direction: column; gap: 18px; padding: 20px; margin-bottom: 26px; border: 1px solid var(--app-line); border-radius: 16px; background: var(--app-surface); }
.search-field { display: flex; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid var(--app-line); border-radius: 10px; background: var(--app-bg); }
.search-field > ion-icon { flex-shrink: 0; color: var(--app-muted); font-size: 19px; }
.search-field input { min-width: 0; width: 100%; height: 46px; padding: 0; border: 0; outline: 0; background: transparent; color: var(--app-text); font-size: 13px; }
.search-field:focus-within { border-color: var(--ion-color-primary); }
.search-field button { display: grid; place-items: center; flex-shrink: 0; width: 40px; height: 44px; padding: 0; border: 0; background: transparent; color: var(--app-muted); font-size: 17px; }
.filter-controls { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.filter-controls .field { gap: 7px; }
.filter-controls .field > span { font-size: 10px; }
.filter-controls select { font-size: 12px; min-height: 44px; padding: 10px 11px; }
.filter-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.clear-filters { min-height: 44px; padding: 8px 5px; border: 0; background: transparent; color: var(--ion-color-primary); font-size: 11px; font-weight: 600; }
.selected-day-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }
.selected-day-heading h3 { margin: 0; font-size: 14px; color: var(--app-text); }
.order-hint { display: flex; align-items: center; gap: 7px; margin: 0 0 16px; color: var(--app-muted); font-size: 12px; line-height: 1.6; }
.task-ghost { opacity: .35; }
.reminder-banner { display: flex; align-items: center; gap: 16px; padding: 18px; margin-bottom: 26px; border: 1px solid var(--app-line); border-radius: 13px; background: var(--app-primary-soft); }
.reminder-banner > ion-icon { flex-shrink: 0; font-size: 24px; color: var(--ion-color-primary); }
.reminder-banner > div { flex: 1; }
.reminder-banner strong { font-size: 12px; }
.reminder-banner p { margin: 5px 0 0; color: var(--app-muted); font-size: 11px; line-height: 1.6; }
.reminder-banner .secondary-button { flex-shrink: 0; font-size: 11px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
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
  .list-toolbar { flex-direction: row; align-items: center; flex-wrap: wrap; }
  .filter-panel { padding: 15px; gap: 15px; }
  .filter-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .filter-controls select, .search-field input { font-size: 16px; }
  .status-filter { width: 100%; }
  .filter-bottom { align-items: stretch; }
  .reminder-banner { flex-wrap: wrap; }
  .reminder-banner .secondary-button { width: 100%; }
  .view-switch button { min-height: 42px; padding: 8px 10px; }
  .status-filter button { flex: 1; min-height: 42px; padding: 10px 8px; }
  .task-grid { grid-template-columns: 1fr; gap: 14px; }
  .date-heading h3 { font-size: 11px; }
  .empty-state { min-height: 280px; }
}
</style>
