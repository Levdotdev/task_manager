<template>
  <article class="task-tile" :class="{ 'task-completed': task.status === 'Completed' }">
    <div v-if="task.image" class="task-thumb"><img :src="task.image" :alt="`Photo for ${task.title}`" loading="lazy" /></div>
    <div class="task-body">
      <div class="badge-row"><span class="priority-badge" :class="task.priority"><span />{{ task.priority }} priority</span><span class="status-badge" :class="displayStatus.toLowerCase()">{{ displayStatus }}</span></div>
      <div v-if="task.category || (task.recurrence && task.recurrence !== 'none') || task.reminders?.length" class="task-meta"><span v-if="task.category" class="category-badge">{{ task.category }}</span><span v-if="task.recurrence && task.recurrence !== 'none'"><ion-icon :icon="repeatOutline" aria-hidden="true" />{{ recurrenceLabel(task.recurrence) }}</span><span v-if="task.reminders?.length" :title="reminderLabel"><ion-icon :icon="notificationsOutline" aria-hidden="true" />{{ task.reminders.length }} {{ task.reminders.length === 1 ? 'reminder' : 'reminders' }}</span></div>
      <h3 class="task-title">{{ task.title }}</h3>
      <p class="task-description">{{ task.description }}</p>
      <p class="task-due" :class="{ overdue: displayStatus === 'Missed' }"><ion-icon :icon="calendarOutline" aria-hidden="true" /><time :datetime="task.due_date">{{ formattedDue }}</time></p>
      <div v-if="links.length || files.length" class="attachments">
        <a v-for="link in links" :key="link.id" :href="safeLink(link.url)" :title="link.url" target="_blank" rel="noopener noreferrer" class="attachment-link"><ion-icon :icon="linkOutline" aria-hidden="true" /><span>{{ link.title || link.url }}</span><ion-icon :icon="arrowUpRight" aria-hidden="true" /></a>
        <a v-for="file in files" :key="file.id" :href="file.data" :download="file.name" class="attachment-link"><ion-icon :icon="documentAttachOutline" aria-hidden="true" /><span>{{ file.name }}</span></a>
      </div>
      <div v-if="manualOrder" class="order-controls"><button class="drag-handle" type="button" :disabled="busy" :aria-label="`Drag to reorder ${task.title}`" title="Drag to reorder"><ion-icon :icon="reorderThreeOutline" aria-hidden="true" />Drag to reorder</button><button type="button" :disabled="busy || !canMoveUp" :aria-label="`Move ${task.title} earlier`" @click="$emit('move', -1)"><ion-icon :icon="arrowUpOutline" aria-hidden="true" /></button><button type="button" :disabled="busy || !canMoveDown" :aria-label="`Move ${task.title} later`" @click="$emit('move', 1)"><ion-icon :icon="arrowDownOutline" aria-hidden="true" /></button></div>
      <div class="tile-actions">
        <button v-if="task.status === 'Completed'" type="button" class="task-action" @click="$emit('revert')"><ion-icon :icon="arrowUndoOutline" aria-hidden="true" />Revert</button>
        <template v-else>
          <button type="button" class="task-action" @click="$emit('edit')"><ion-icon :icon="createOutline" aria-hidden="true" />Edit</button>
          <button type="button" class="task-action complete-action" @click="$emit('complete')"><ion-icon :icon="checkmarkOutline" aria-hidden="true" />Complete</button>
        </template>
        <button type="button" class="task-action delete-action" :aria-label="`Delete ${task.title}`" title="Delete task" @click="$emit('delete')"><ion-icon :icon="trashOutline" aria-hidden="true" /></button>
      </div>
    </div>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import { createOutline, trashOutline, checkmarkOutline, arrowUndoOutline, linkOutline, documentAttachOutline, calendarOutline, arrowForwardOutline, repeatOutline, notificationsOutline, reorderThreeOutline, arrowUpOutline, arrowDownOutline } from 'ionicons/icons';
import { REMINDER_OPTIONS, type Task } from '@/models/task';
import { taskFiles, taskLinks, recurrenceLabel, displayStatus as getDisplayStatus } from '@/utils/tasks';
const props = defineProps<{ task: Task; now?: Date; manualOrder?: boolean; canMoveUp?: boolean; canMoveDown?: boolean; busy?: boolean }>();
defineEmits<{ (e: 'edit'): void; (e: 'delete'): void; (e: 'complete'): void; (e: 'revert'): void; (e: 'move', direction: number): void }>();
const arrowUpRight = arrowForwardOutline;
const displayStatus = computed(() => getDisplayStatus(props.task, props.now));
const files = computed(() => taskFiles(props.task));
const links = computed(() => taskLinks(props.task));
const reminderLabel = computed(() => REMINDER_OPTIONS.filter(o => props.task.reminders?.includes(o.value)).map(o => o.label).join(', ') + ' before due');
function safeLink(value: string) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } }
const formattedDue = computed(() => new Date(props.task.due_date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
</script>
<style scoped>
.task-tile { display: flex; flex-direction: column; min-width: 0; overflow: hidden; border: 1px solid var(--app-line); border-radius: 18px; background: var(--app-surface); box-shadow: var(--app-shadow); }
.task-thumb { height: 170px; padding: 8px 8px 0; }
.task-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
.task-body { display: flex; flex-direction: column; flex: 1; padding: 21px; }
.badge-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
.priority-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; text-transform: capitalize; color: var(--app-muted); }
.priority-badge > span { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.priority-badge.high { color: var(--app-danger-text); }
.priority-badge.medium { color: var(--app-warning); }
.status-badge { padding: 5px 8px; border-radius: 7px; color: var(--app-warning); background: var(--app-warning-soft); font-size: 10px; font-weight: 600; }
.status-badge.missed { color: var(--app-danger-text); background: var(--app-danger-soft); }
.status-badge.completed { color: var(--ion-color-primary); background: var(--app-primary-soft); }
.task-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 15px; font-size: 10px; color: var(--app-muted); }
.task-meta > span { display: inline-flex; align-items: center; gap: 4px; }
.category-badge { padding: 4px 7px; border-radius: 6px; background: var(--app-primary-soft); color: var(--ion-color-primary); overflow-wrap: anywhere; }
.order-controls { display: flex; align-items: center; gap: 4px; padding: 4px 0 10px; }
.order-controls button { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 8px; background: var(--app-bg); color: var(--app-muted); font-size: 16px; }
.order-controls .drag-handle { justify-content: flex-start; flex: 1; gap: 6px; width: auto; font-size: 11px; cursor: grab; touch-action: none; padding: 0 10px; }
.drag-handle:active { cursor: grabbing; }
.task-title { margin: 20px 0 9px; color: var(--app-text); font-size: 17px; font-weight: 650; line-height: 1.5; letter-spacing: -.4px; overflow-wrap: anywhere; }
.task-description { margin: 0 0 20px; color: var(--app-muted); font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.task-due { display: flex; align-items: center; gap: 7px; margin: auto 0 14px; padding-top: 8px; color: var(--app-muted); font-size: 12px; }
.task-due ion-icon { flex-shrink: 0; font-size: 15px; }
.task-due.overdue { color: var(--app-danger-text); }
.attachments { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.attachment-link { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; padding: 6px 8px; border-radius: 7px; color: var(--app-muted); background: var(--app-bg); font-size: 11px; text-decoration: none; }
.attachment-link span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.attachment-link ion-icon { flex-shrink: 0; font-size: 13px; }
.attachment-link:hover { color: var(--ion-color-primary); }
.tile-actions { display: flex; gap: 8px; padding-top: 15px; border-top: 1px solid var(--app-line); }
.task-action { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 9px 12px; border: 1px solid var(--app-line); border-radius: 9px; color: var(--app-muted); background: transparent; font-size: 12px; font-weight: 600; }
.task-action:hover { background: var(--app-surface-alt); color: var(--app-text); }
.task-action ion-icon { font-size: 16px; }
.complete-action { border-color: transparent; color: var(--ion-color-primary); background: var(--app-primary-soft); }
.delete-action { width: 40px; padding: 9px; margin-left: auto; border-color: transparent; }
.delete-action:hover { color: var(--app-danger-text); background: var(--app-danger-soft); }
@media (max-width: 600px) { .task-body { padding: 20px; } .task-action { min-height: 44px; } }
</style>
