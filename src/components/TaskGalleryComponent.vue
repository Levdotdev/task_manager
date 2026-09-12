<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Tasks</ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <div class="gallery-toolbar">
        <ion-button class="add-task-btn" @click="modalTask = 'new'">
          <ion-icon slot="start" :icon="addIcon" />
          Add Task
        </ion-button>

        <ion-segment v-model="filter" class="status-filter">
          <ion-segment-button value="Pending"><ion-label>Pending</ion-label></ion-segment-button>
          <ion-segment-button value="Missed"><ion-label>Missed</ion-label></ion-segment-button>
          <ion-segment-button value="Completed"><ion-label>Completed</ion-label></ion-segment-button>
        </ion-segment>
      </div>

      <div v-for="group in visibleGroups" :key="group.date" class="date-group">
        <h3 class="date-heading">{{ formatDateHeader(group.date) }}</h3>
        <ion-grid>
          <ion-row>
            <ion-col v-for="task in group.tasks" :key="task.id" size="6" size-md="4">
              <TaskTile
                :task="task"
                @edit="modalTask = task"
                @complete="completeTargetId = task.id"
                @revert="revertTargetId = task.id"
                @delete="deleteTargetId = task.id"
              />
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>

      <ion-text v-if="visibleGroups.length === 0" color="medium">
        <p>No {{ filter.toLowerCase() }} tasks.</p>
      </ion-text>
    </ion-card-content>
  </ion-card>

  <ion-modal :is-open="modalTask !== null" class="task-modal" @did-dismiss="modalTask = null">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ modalTask === 'new' ? 'New Task' : 'Edit Task' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="modalTask = null">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <TaskFormComponent
        :task="modalTask === 'new' ? null : modalTask"
        @task-saved="modalTask = null"
      />
    </ion-content>
  </ion-modal>

  <ion-alert
    :is-open="deleteTargetId !== null"
    header="Delete Task"
    message="Are you sure you want to delete this task? This can't be undone."
    :buttons="deleteAlertButtons"
    @didDismiss="deleteTargetId = null"
  />

  <ion-alert
    :is-open="completeTargetId !== null"
    header="Mark as Completed"
    message="Mark this task as completed?"
    :buttons="completeAlertButtons"
    @didDismiss="completeTargetId = null"
  />

  <ion-alert
    :is-open="revertTargetId !== null"
    header="Revert to Pending"
    message="Revert this task back to pending?"
    :buttons="revertAlertButtons"
    @didDismiss="revertTargetId = null"
  />
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonIcon, IonText, IonButton,
  IonSegment, IonSegmentButton, IonLabel,
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonAlert,
} from '@ionic/vue';
import { add as addIcon } from 'ionicons/icons';
import { subscribeToTasks, markTaskCompleted, revertTaskToPending, deleteTask, type Task } from '@/services/taskService';
import TaskFormComponent from './TaskFormComponent.vue';
import TaskTile from './TaskTile.vue';

const tasks = ref<Task[]>([]);
const unsubscribe = subscribeToTasks((updated) => { tasks.value = updated; });
onUnmounted(() => unsubscribe());

const filter = ref<'Pending' | 'Missed' | 'Completed'>('Pending');
const modalTask = ref<Task | 'new' | null>(null);
const deleteTargetId = ref<string | null>(null);
const completeTargetId = ref<string | null>(null);
const revertTargetId = ref<string | null>(null);

const deleteAlertButtons = [
  { text: 'Cancel', role: 'cancel' },
  {
    text: 'Delete',
    role: 'destructive',
    handler: () => { if (deleteTargetId.value) deleteTask(deleteTargetId.value); },
  },
];
const completeAlertButtons = [
  { text: 'Cancel', role: 'cancel' },
  { text: 'Complete', handler: () => { if (completeTargetId.value) markTaskCompleted(completeTargetId.value); } },
];
const revertAlertButtons = [
  { text: 'Cancel', role: 'cancel' },
  { text: 'Revert', handler: () => { if (revertTargetId.value) revertTaskToPending(revertTargetId.value); } },
];

function isMissed(task: Task) {
  return task.status === 'Pending' && new Date(task.due_date) < new Date();
}
function displayStatus(task: Task): 'Pending' | 'Missed' | 'Completed' {
  if (task.status === 'Completed') return 'Completed';
  return isMissed(task) ? 'Missed' : 'Pending';
}

const priorityRank = { high: 0, medium: 1, low: 2 };
function sortHighFirst(list: Task[]) {
  return [...list].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}
function sortLowFirst(list: Task[]) {
  return [...list].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
}
function groupByDate(list: Task[], dateAscending: boolean, sortFn: (l: Task[]) => Task[]) {
  const groups: Record<string, Task[]> = {};
  for (const t of list) {
    const dateKey = t.due_date.slice(0, 10);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(t);
  }
  const dates = Object.keys(groups).sort();
  if (!dateAscending) dates.reverse();
  return dates.map((date) => ({ date, tasks: sortFn(groups[date]) }));
}

const visibleGroups = computed(() => {
  const filtered = tasks.value.filter((t) => displayStatus(t) === filter.value);
  if (filter.value === 'Completed') return groupByDate(filtered, false, sortLowFirst);
  return groupByDate(filtered, true, sortHighFirst);
});

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

async function onComplete(taskId: string) { await markTaskCompleted(taskId); }
async function onRevert(taskId: string) { await revertTaskToPending(taskId); }
</script>

<style scoped>
.gallery-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.add-task-btn { --border-radius: 20px; }
.status-filter { flex: 1; min-width: 240px; }
.date-heading {
  margin: 20px 4px 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ion-color-dark);
}
.task-modal {
  --width: 90%;
  --max-width: 480px;
  --height: 80%;
  --border-radius: 12px;
}
</style>