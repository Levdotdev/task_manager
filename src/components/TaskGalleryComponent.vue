<template>
  <div class="flip-container" :class="{ flipped: showCompleted }">
    <div class="flip-inner">
      <ion-card class="flip-face flip-front">
        <ion-card-header>
          <ion-card-title>Tasks</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="6" size-md="4">
                <ion-card class="add-task-tile" button @click="modalTask = 'new'">
                  <div class="add-task-inner">
                    <ion-icon :icon="addIcon" size="large" />
                    <p>Add Task</p>
                  </div>
                </ion-card>
              </ion-col>

              <ion-col v-for="task in pendingTasks" :key="task.id" size="6" size-md="4">
                <ion-card class="task-tile">
                  <ion-img v-if="task.image" :src="task.image" class="task-thumb" />
                  <div v-else class="task-thumb placeholder">
                    <ion-icon :icon="documentIcon" />
                  </div>
                  <ion-card-header>
                    <ion-card-subtitle>
                      <ion-badge :color="priorityColor(task.priority)">{{ task.priority }}</ion-badge>
                    </ion-card-subtitle>
                    <ion-card-title class="task-title">{{ task.title }}</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <p class="task-due">Due: {{ task.due_date }}</p>
                    <ion-button size="small" fill="clear" @click="modalTask = task">
                      <ion-icon slot="icon-only" :icon="editIcon" />
                    </ion-button>
                    <ion-button size="small" fill="clear" color="success" @click="markTaskCompleted(task.id)">
                      <ion-icon slot="icon-only" :icon="checkmarkIcon" />
                    </ion-button>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <ion-card class="flip-face flip-back">
        <ion-card-header>
          <ion-card-title>Completed</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col v-for="task in completedTasks" :key="task.id" size="6" size-md="4">
                <ion-card class="task-tile">
                  <ion-img v-if="task.image" :src="task.image" class="task-thumb" />
                  <div v-else class="task-thumb placeholder">
                    <ion-icon :icon="documentIcon" />
                  </div>
                  <ion-card-header>
                    <ion-card-subtitle>
                      <ion-badge :color="priorityColor(task.priority)">{{ task.priority }}</ion-badge>
                      <ion-badge color="success">Completed</ion-badge>
                    </ion-card-subtitle>
                    <ion-card-title class="task-title">{{ task.title }}</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <p class="task-due">Due: {{ task.due_date }}</p>
                    <ion-button size="small" fill="clear" @click="modalTask = task">
                      <ion-icon slot="icon-only" :icon="editIcon" />
                    </ion-button>
                  </ion-card-content>
                </ion-card>
              </ion-col>
              <ion-text v-if="completedTasks.length === 0" color="medium">
                <p>No completed tasks yet.</p>
              </ion-text>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>
    </div>
  </div>

  <ion-button expand="block" fill="outline" @click="showCompleted = !showCompleted">
    {{ showCompleted ? 'Back to Active Tasks' : 'View Completed Tasks' }}
  </ion-button>

  <ion-modal :is-open="modalTask !== null" @did-dismiss="modalTask = null">
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
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonImg, IonIcon, IonBadge, IonText,
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
} from '@ionic/vue';
import {
  add as addIcon,
  documentTextOutline as documentIcon,
  create as editIcon,
  checkmarkDone as checkmarkIcon,
} from 'ionicons/icons';
import { subscribeToTasks, markTaskCompleted, type Task } from '@/services/taskService';
import TaskFormComponent from './TaskFormComponent.vue';

const tasks = ref<Task[]>([]);
const unsubscribe = subscribeToTasks((updated) => { tasks.value = updated; });
onUnmounted(() => unsubscribe());

const showCompleted = ref(false);
const modalTask = ref<Task | 'new' | null>(null);

const priorityRank = { high: 0, medium: 1, low: 2 };
const sortTasks = (list: Task[]) =>
  [...list].sort((a, b) => {
    const p = priorityRank[a.priority] - priorityRank[b.priority];
    return p !== 0 ? p : a.due_date.localeCompare(b.due_date);
  });

const pendingTasks = computed(() => sortTasks(tasks.value.filter((t) => t.status !== 'Completed')));
const completedTasks = computed(() => sortTasks(tasks.value.filter((t) => t.status === 'Completed')));

const priorityColor = (priority: Task['priority']) => {
  if (priority === 'high') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'medium';
};
</script>

<style scoped>
.flip-container {
  perspective: 1500px;
}
.flip-inner {
  position: relative;
  width: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.flip-container.flipped .flip-inner {
  transform: rotateY(180deg);
}
.flip-face {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.flip-front {
  position: relative;
}
.flip-back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transform: rotateY(180deg);
}

.add-task-tile {
  height: 180px;
  border: 2px dashed var(--ion-color-medium);
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-task-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--ion-color-medium);
}

.task-thumb {
  width: 100%;
  height: 100px;
  background: var(--ion-color-light);
}
.task-thumb::part(image) {
  object-fit: contain;
}
.task-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--ion-color-medium);
}

.task-title { font-size: 1rem; }
.task-due { font-size: 0.85rem; color: var(--ion-color-medium); }
</style>