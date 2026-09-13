import type { Task } from '@/models/task';
import { localDateKey, localDateTime } from './tasks';

export function occurrenceKey(dueDate: string): string { return dueDate.replace(/[^0-9]/g, ''); }
function seriesId(task: Task) { return task.seriesId || task.id; }
function dayNumber(date: Date) { return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000; }

export function isOccurrence(task: Task, dueDate: string): boolean {
  if (!task.recurrence || task.recurrence === 'none') return false;
  const base = new Date(task.due_date);
  const date = new Date(dueDate);
  if (!Number.isFinite(base.getTime()) || !Number.isFinite(date.getTime()) || date < base) return false;
  if (task.recurrenceUntil && date >= new Date(task.recurrenceUntil)) return false;
  if (date.getHours() !== base.getHours() || date.getMinutes() !== base.getMinutes()) return false;
  const days = dayNumber(date) - dayNumber(base);
  if (days === 0) return true;
  if (task.recurrence === 'daily') return true;
  if (task.recurrence === 'weekdays') return date.getDay() !== 0 && date.getDay() !== 6;
  if (task.recurrence === 'weekly') return days % 7 === 0;
  const months = (date.getFullYear() - base.getFullYear()) * 12 + date.getMonth() - base.getMonth();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return months > 0 && date.getDate() === Math.min(task.recurrenceAnchorDay || base.getDate(), lastDay);
}

function displayedOccurrence(task: Task, dueDate: string): Task {
  const state = task.occurrenceStates?.[occurrenceKey(dueDate)];
  return {
    ...task, id: dueDate === task.due_date ? task.id : `${seriesId(task)}_${occurrenceKey(dueDate)}`,
    due_date: dueDate, status: state?.status === 'Completed' ? 'Completed' : 'Pending', completedAt: state?.completedAt,
    occurrenceSourceId: task.id,
  };
}

// Expand only the visible date window. Attachments stay shared in memory;
// completing a date stores a small exception on the original task.
export function expandRecurringTasks(tasks: Task[], start: Date, end: Date, includeSaved = true): Task[] {
  const withinRange = (due: string) => new Date(due) >= start && new Date(due) < end;
  const result = new Map<string, Task>();
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const group = groups.get(seriesId(task)) || [];
    group.push(task); groups.set(seriesId(task), group);
    if (includeSaved || withinRange(task.due_date)) {
      if (task.status === 'Pending' && task.recurrence && task.recurrence !== 'none') {
        const state = task.occurrenceStates?.[occurrenceKey(task.due_date)];
        if (state?.status !== 'Skipped' && (state || isOccurrence(task, task.due_date))) result.set(task.id, displayedOccurrence(task, task.due_date));
      } else {
        const state = task.occurrenceStates?.[occurrenceKey(task.due_date)];
        if (state?.status !== 'Skipped') result.set(task.id, state ? displayedOccurrence(task, task.due_date) : task);
      }
    }
  }
  for (const group of groups.values()) group.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  for (const task of tasks) {
    for (const state of Object.values(task.occurrenceStates || {})) {
      if (state.status !== 'Skipped' && (includeSaved || withinRange(state.due_date))) {
        const occurrence = displayedOccurrence(task, state.due_date);
        result.set(occurrence.id, occurrence);
      }
    }
    if (task.status === 'Completed' || !task.recurrence || task.recurrence === 'none') continue;
    // Legacy completion-created tasks remain distinct. An older reverted
    // occurrence cannot also generate dates belonging to its saved successor.
    const successor = groups.get(seriesId(task))!.find(t => new Date(t.due_date) > new Date(task.due_date));
    const base = new Date(task.due_date);
    if (!Number.isFinite(base.getTime())) continue;
    const day = new Date(start); day.setHours(0, 0, 0, 0);
    while (day < end) {
      const date = new Date(day); date.setHours(base.getHours(), base.getMinutes(), 0, 0);
      const due = localDateKey(date) === localDateKey(base) ? task.due_date : localDateTime(date);
      if (task.occurrenceStates?.[occurrenceKey(due)]?.status !== 'Skipped' && (!successor || date < new Date(successor.due_date)) && withinRange(due) && isOccurrence(task, due)) {
        const occurrence = displayedOccurrence(task, due);
        if (!result.has(occurrence.id)) result.set(occurrence.id, occurrence);
      }
      day.setDate(day.getDate() + 1);
    }
  }
  return [...result.values()];
}

export function findTaskOccurrence(tasks: Task[], taskId: string): Task | undefined {
  const saved = tasks.find(t => t.id === taskId);
  if (saved) {
    const state = saved.occurrenceStates?.[occurrenceKey(saved.due_date)];
    if (state?.status === 'Skipped') return undefined;
    if (saved.status === 'Pending' && saved.recurrence && saved.recurrence !== 'none') return state || isOccurrence(saved, saved.due_date) ? displayedOccurrence(saved, saved.due_date) : undefined;
    return state ? displayedOccurrence(saved, saved.due_date) : saved;
  }
  for (const task of tasks) {
    const prefix = `${seriesId(task)}_`;
    if (!taskId.startsWith(prefix)) continue;
    const key = taskId.slice(prefix.length);
    if (!/^\d{12}$/.test(key)) continue;
    const date = new Date(`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}T00:00`);
    if (!Number.isFinite(date.getTime())) continue;
    const end = new Date(date); end.setDate(end.getDate() + 1);
    const occurrence = expandRecurringTasks(tasks, date, end, false).find(t => t.id === taskId);
    if (occurrence) return occurrence;
  }
}
