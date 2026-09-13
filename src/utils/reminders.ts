import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import { REMINDER_OPTIONS, type Task } from '@/models/task';
import { expandRecurringTasks } from './recurrence';

export const REMINDER_SOURCE = 'task-manager-reminder';
export function reminderId(key: string): number {
  let hash = 2166136261;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) % 2147483646 + 1;
}
export function buildReminderPlan(tasks: Task[], uid: string, now = new Date(), limit = 64, reservedIds: number[] = []) {
  const notifications: LocalNotificationSchema[] = [];
  const usedIds = new Set<number>(reservedIds);
  const end = new Date(now); end.setFullYear(end.getFullYear() + 1);
  const occurrences = expandRecurringTasks(tasks, now, end);
  // Sorting first also makes collision resolution stable across task snapshots.
  for (const task of occurrences.sort((a, b) => a.id.localeCompare(b.id))) {
    if (task.status === 'Completed') continue;
    const due = new Date(task.due_date).getTime();
    if (!Number.isFinite(due)) continue;
    for (const option of REMINDER_OPTIONS) {
      if (!task.reminders?.includes(option.value)) continue;
      const at = new Date(due - option.value * 60_000);
      if (at <= now) continue;
      let id = reminderId(`${uid}:${task.id}:${option.value}`);
      while (usedIds.has(id)) id = id % 2147483646 + 1;
      usedIds.add(id);
      notifications.push({
        id, title: task.title, body: `Due in ${option.label}${task.category ? ` · ${task.category}` : ''}`,
        schedule: { at, allowWhileIdle: true }, channelId: 'task-reminders', sound: 'default',
        extra: { source: REMINDER_SOURCE, uid, taskId: task.id, signature: `${due}:${option.value}:${task.title}:${task.category || ''}` },
      });
    }
  }
  notifications.sort((a, b) => a.schedule!.at!.getTime() - b.schedule!.at!.getTime() || a.id - b.id);
  return { notifications: notifications.slice(0, Math.max(0, limit)), deferred: Math.max(0, notifications.length - limit) };
}
