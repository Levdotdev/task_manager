import { db, auth } from '@/firebase';
import { ref as databaseRef, push, set, remove, update, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import type { Task, NewTask, TaskEdits } from '@/models/task';
import { normalizeTask, taskFiles, taskLinks, nextDueDate, attachmentBytes, MAX_ATTACHMENT_BYTES } from '@/utils/tasks';
import { isOccurrence, occurrenceKey } from '@/utils/recurrence';
export type { Task, NewTask, TaskEdits } from '@/models/task';
function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return uid;
}
function taskRef(uid: string, taskId: string) { return databaseRef(db, `tasks/${uid}/${taskId}`); }
function taskValues(task: NewTask) {
  const files = taskFiles(task);
  const links = taskLinks(task);
  if (attachmentBytes(files, task.photoDataUrl) > MAX_ATTACHMENT_BYTES) throw new Error('Attachments must total 10 MB or less.');
  return {
    title: task.title.trim(), description: task.description.trim(), due_date: task.due_date,
    priority: task.priority, category: task.category?.trim() || '',
    files, links, reminders: task.reminders || [], recurrence: task.recurrence || 'none',
    image: task.photoDataUrl || '',
  };
}
export async function addTask(task: NewTask) {
  const ref = push(databaseRef(db, `tasks/${requireUid()}`));
  await set(ref, { ...taskValues(task), status: 'Pending', recurrenceAnchorDay: new Date(task.due_date).getDate(), order: Date.now() });
  return ref.key as string;
}
export async function updateTask(taskId: string, edits: TaskEdits) {
  const uid = requireUid();
  const values = taskValues(edits);
  const result = await runTransaction(taskRef(uid, taskId), (current: Task | null) => {
    if (!current) return current;
    return {
      ...current, ...values,
      recurrenceAnchorDay: edits.due_date === current.due_date ? current.recurrenceAnchorDay || new Date(edits.due_date).getDate() : new Date(edits.due_date).getDate(),
      recurrenceUntil: edits.due_date !== current.due_date || edits.recurrence !== current.recurrence ? null : current.recurrenceUntil || null,
      // Clear legacy fields so removing a migrated attachment stays removed.
      link: null, fileName: null, fileData: null,
    };
  });
  if (!result.snapshot.exists()) throw new Error('Task no longer exists');
}
export async function markTaskCompleted(taskId: string, occurrenceDueDate?: string) {
  const uid = requireUid();
  if (occurrenceDueDate) {
    const key = occurrenceKey(occurrenceDueDate);
    const result = await runTransaction(taskRef(uid, taskId), (current: Task | null) => {
      if (!current) return current;
      if (current.occurrenceStates?.[key]?.status === 'Completed') return current;
      if ((!isOccurrence(current, occurrenceDueDate) && current.occurrenceStates?.[key]?.status !== 'Pending') || current.occurrenceStates?.[key]?.status === 'Skipped') throw new Error('Occurrence is no longer scheduled');
      return { ...current, occurrenceStates: { ...current.occurrenceStates, [key]: { due_date: occurrenceDueDate, status: 'Completed', completedAt: new Date().toISOString() } } };
    });
    if (!result.snapshot.exists()) throw new Error('Task no longer exists');
    return;
  }
  const result = await runTransaction(taskRef(uid, taskId), (current: Task | null) => {
    if (!current || current.status === 'Completed') return current;
    const task = normalizeTask(taskId, current);
    const next = task.nextDueDate || nextDueDate(task);
    const seriesId = task.seriesId || taskId;
    return { ...current, status: 'Completed', completedAt: new Date().toISOString(),
      ...(next ? { seriesId, nextDueDate: next, nextTaskId: `${seriesId}_${next.replace(/[^0-9]/g, '')}`, nextTaskCreated: current.nextTaskCreated || false } : {}),
    };
  });
  if (!result.snapshot.exists()) throw new Error('Task no longer exists');
  const task = normalizeTask(taskId, result.snapshot.val());
  await ensureNextOccurrence(uid, task);
}
const occurrenceWrites = new Map<string, Promise<void>>();
function ensureNextOccurrence(uid: string, task: Task): Promise<void> {
  if (!task.nextTaskId || !task.nextDueDate || task.nextTaskCreated) return Promise.resolve();
  const key = `${uid}/${task.id}`;
  const existing = occurrenceWrites.get(key);
  if (existing) return existing;
  const write = Promise.resolve().then(() => createNextOccurrence(uid, task)).finally(() => occurrenceWrites.delete(key));
  occurrenceWrites.set(key, write);
  return write;
}
async function createNextOccurrence(uid: string, task: Task) {
  const nextTask = {
    ...taskValues({ ...task, due_date: task.nextDueDate!, photoDataUrl: task.image }),
    status: 'Pending', seriesId: task.seriesId || task.id,
    recurrenceAnchorDay: task.recurrenceAnchorDay || new Date(task.due_date).getDate(), order: Date.now(),
  };
  // A deterministic ID makes retries and simultaneous completion idempotent.
  await runTransaction(taskRef(uid, task.nextTaskId!), current => current || nextTask);
  await update(taskRef(uid, task.id), { nextTaskCreated: true });
}
export async function revertTaskToPending(taskId: string, occurrenceDueDate?: string) {
  const uid = requireUid();
  if (occurrenceDueDate) {
    const result = await runTransaction(taskRef(uid, taskId), (current: Task | null) => {
      if (!current) return current;
      const key = occurrenceKey(occurrenceDueDate);
      if (!isOccurrence(current, occurrenceDueDate) && current.occurrenceStates?.[key]?.status !== 'Completed') throw new Error('Occurrence no longer exists');
      return { ...current, occurrenceStates: { ...current.occurrenceStates, [key]: { due_date: occurrenceDueDate, status: 'Pending' } } };
    });
    if (!result.snapshot.exists()) throw new Error('Task no longer exists');
  } else await update(taskRef(uid, taskId), { status: 'Pending', completedAt: null });
}
export async function deleteTask(taskId: string, occurrenceDueDate?: string) {
  const uid = requireUid();
  if (!occurrenceDueDate) { await remove(taskRef(uid, taskId)); return; }
  await runTransaction(taskRef(uid, taskId), (current: Task | null) => {
    if (!current) return current;
    const key = occurrenceKey(occurrenceDueDate);
    if (current.occurrenceStates?.[key]?.status === 'Completed' || (current.occurrenceStates?.[key]?.status === 'Pending' && !isOccurrence(current, occurrenceDueDate))) {
      return { ...current, occurrenceStates: { ...current.occurrenceStates, [key]: { due_date: occurrenceDueDate, status: 'Skipped' } } };
    }
    if (!isOccurrence(current, occurrenceDueDate)) return current;
    if (new Date(occurrenceDueDate) <= new Date(current.due_date) && !Object.values(current.occurrenceStates || {}).some(s => s.status === 'Completed')) return null;
    return { ...current, recurrenceUntil: occurrenceDueDate };
  });
}
export async function reorderTasks(orderedIds: string[]) {
  const updates: Record<string, number> = {};
  orderedIds.forEach((id, index) => { updates[`${id}/order`] = index; });
  if (orderedIds.length) await update(databaseRef(db, `tasks/${requireUid()}`), updates);
}
export function subscribeToTasks(callback: (tasks: Task[]) => void, onError?: (error: Error) => void): Unsubscribe {
  const uid = requireUid();
  return onValue(databaseRef(db, `tasks/${uid}`), snapshot => {
    const data: Record<string, Partial<Task>> = snapshot.val() || {};
    const tasks = Object.entries(data).map(([id, value]) => normalizeTask(id, value)).filter(task => task.title.trim());
    callback(tasks);
    // Recover if the app closed after completion but before creating its repeat.
    for (const task of tasks) if (task.status === 'Completed' && task.nextTaskCreated === false) void ensureNextOccurrence(uid, task).catch(() => undefined);
  }, onError);
}
