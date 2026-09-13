import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Task } from '@/models/task';
const memory = vi.hoisted(() => ({ data: {} as Record<string, unknown>, auth: { currentUser: { uid: 'user' } as { uid: string } | null }, failNextOccurrence: false, updates: [] as { path: string; values: Record<string, unknown> }[], listeners: new Map<string, Set<(snapshot: unknown) => void>>() }));
vi.mock('@/firebase', () => ({ db: {}, auth: memory.auth }));
vi.mock('firebase/database', () => {
  function read(path: string): unknown { return path.split('/').reduce<unknown>((value, part) => (value as Record<string, unknown> | undefined)?.[part], memory.data); }
  function snapshot(path: string) { return { val: () => structuredClone(read(path) ?? null), exists: () => read(path) != null }; }
  function write(path: string, value: unknown) { const parts = path.split('/'); const last = parts.pop()!; let current = memory.data; for (const part of parts) current = (current[part] ||= {}) as Record<string, unknown>; if (value == null) delete current[last]; else current[last] = JSON.parse(JSON.stringify(value, (_key, item) => item === null ? undefined : item)); queueMicrotask(() => { for (const [key, listeners] of memory.listeners) for (const callback of listeners) callback(snapshot(key)); }); }
  return {
    ref: (_db: unknown, path: string) => ({ path, key: path.split('/').pop() }),
    push: (ref: { path: string }) => ({ path: `${ref.path}/new-task`, key: 'new-task' }),
    set: async (ref: { path: string }, value: unknown) => write(ref.path, value),
    remove: async (ref: { path: string }) => write(ref.path, null),
    update: async (ref: { path: string }, values: Record<string, unknown>) => { memory.updates.push({ path: ref.path, values }); for (const [key, value] of Object.entries(values)) write(`${ref.path}/${key}`, value); },
    runTransaction: async (ref: { path: string }, callback: (value: unknown) => unknown) => { if (memory.failNextOccurrence && ref.path.includes('original_')) { memory.failNextOccurrence = false; throw new Error('Offline'); } const next = callback(structuredClone(read(ref.path) ?? null)); if (next !== undefined) write(ref.path, next); return { committed: true, snapshot: snapshot(ref.path) }; },
    onValue: (ref: { path: string }, callback: (snapshot: unknown) => void) => { const listeners = memory.listeners.get(ref.path) || new Set(); listeners.add(callback); memory.listeners.set(ref.path, listeners); callback(snapshot(ref.path)); return () => listeners.delete(callback); },
  };
});
import { addTask, updateTask, markTaskCompleted, revertTaskToPending, deleteTask, reorderTasks, subscribeToTasks } from '@/services/taskService';
const original: Task = { id: 'original', title: 'Weekly report', description: 'Training notes', due_date: '2099-01-31T17:00', priority: 'high', status: 'Pending', category: 'Learning', recurrence: 'monthly', recurrenceAnchorDay: 31, reminders: [15, 60], files: [{ id: 'f', name: 'notes.txt', data: 'data:text/plain;base64,YQ==' }], links: [{ id: 'l', title: 'Brief', url: 'https://example.org' }] };
function records() { return ((memory.data.tasks as Record<string, unknown>).user || {}) as Record<string, Task>; }
beforeEach(() => { memory.data = { tasks: { user: { original: structuredClone(original) } } }; memory.auth.currentUser = { uid: 'user' }; memory.failNextOccurrence = false; memory.updates = []; memory.listeners.clear(); });
describe('Task persistence', () => {
  test('stores all new metadata and removes old attachment fields when edited', async () => {
    records().original.link = 'https://old.example.org'; records().original.fileData = 'old-data';
    await updateTask('original', { ...original, title: '  Updated report  ', files: [], links: [] });
    expect(records().original).toMatchObject({ title: 'Updated report', category: 'Learning', recurrence: 'monthly', reminders: [15, 60], files: [], links: [] });
    expect(records().original.link).toBeUndefined(); expect(records().original.fileData).toBeUndefined();
  });
  test('creates tasks for the signed-in user and refuses signed-out writes', async () => { await addTask(original); expect(records()['new-task'].status).toBe('Pending'); memory.auth.currentUser = null; await expect(addTask(original)).rejects.toThrow('Not signed in'); });
  test('stores only order fields in a reorder operation', async () => { await reorderTasks(['original', 'other']); expect(memory.updates[0]).toEqual({ path: 'tasks/user', values: { 'original/order': 0, 'other/order': 1 } }); });
});
describe('Recurring task completion', () => {
  test('completing and reverting a displayed date persists only that date on its series', async () => {
    await markTaskCompleted('original', '2099-02-28T17:00');
    await markTaskCompleted('original', '2099-02-28T17:00');
    expect(Object.keys(records())).toHaveLength(1);
    expect(records().original.status).toBe('Pending');
    expect(records().original.occurrenceStates?.['209902281700'].status).toBe('Completed');
    await revertTaskToPending('original', '2099-02-28T17:00');
    expect(records().original.occurrenceStates?.['209902281700'].status).toBe('Pending');
  });
  test('deleting a pending date stops future repeats while retaining earlier completed history', async () => {
    await markTaskCompleted('original', original.due_date);
    await deleteTask('original', '2099-02-28T17:00');
    expect(records().original.recurrenceUntil).toBe('2099-02-28T17:00');
    expect(records().original.occurrenceStates?.['209901311700'].status).toBe('Completed');
    await expect(markTaskCompleted('original', '2099-03-31T17:00')).rejects.toThrow('no longer scheduled');
  });
  test('deleting completed history does not restore that date or stop the schedule', async () => {
    await markTaskCompleted('original', '2099-02-28T17:00');
    await deleteTask('original', '2099-02-28T17:00');
    expect(records().original.occurrenceStates?.['209902281700'].status).toBe('Skipped');
    expect(records().original.recurrenceUntil).toBeUndefined();
  });
  test('keeps history and inherits attachments, category, and reminders in the next occurrence', async () => {
    await markTaskCompleted('original');
    expect(records().original.status).toBe('Completed');
    expect(records().original.nextTaskCreated).toBe(true);
    const next = records()[records().original.nextTaskId!];
    expect(next).toMatchObject({ title: original.title, due_date: '2099-02-28T17:00', status: 'Pending', category: 'Learning', recurrence: 'monthly', recurrenceAnchorDay: 31, reminders: original.reminders, files: original.files, links: original.links });
  });
  test('simultaneous completion and repeated retries create one occurrence', async () => { await Promise.all([markTaskCompleted('original'), markTaskCompleted('original')]); await markTaskCompleted('original'); expect(Object.keys(records())).toHaveLength(2); });
  test('an interrupted occurrence write can be retried without changing its date', async () => { memory.failNextOccurrence = true; await expect(markTaskCompleted('original')).rejects.toThrow('Offline'); const id = records().original.nextTaskId; await markTaskCompleted('original'); expect(records().original.nextTaskId).toBe(id); expect(Object.keys(records())).toHaveLength(2); });
  test('subscription repairs an interrupted completion when the app reopens', async () => { memory.failNextOccurrence = true; await expect(markTaskCompleted('original')).rejects.toThrow(); const stop = subscribeToTasks(() => undefined); await vi.waitFor(() => expect(records().original.nextTaskCreated).toBe(true)); expect(Object.keys(records())).toHaveLength(2); stop(); });
  test('reverting, editing, and completing the same occurrence preserves its existing next occurrence', async () => { await markTaskCompleted('original'); const id = records().original.nextTaskId!; records()[id].title = 'Edited future report'; await revertTaskToPending('original'); await updateTask('original', { ...original, description: 'Updated history' }); await markTaskCompleted('original'); expect(Object.keys(records())).toHaveLength(2); expect(records()[id].title).toBe('Edited future report'); });
  test('deleting the next occurrence stops repeats and completion retries do not recreate it', async () => { await markTaskCompleted('original'); const id = records().original.nextTaskId!; await deleteTask(id); await markTaskCompleted('original'); expect(records()[id]).toBeUndefined(); const stop = subscribeToTasks(() => undefined); await Promise.resolve(); expect(Object.keys(records())).toHaveLength(1); stop(); });
  test('one-off completion does not create a repeat', async () => { records().original.recurrence = 'none'; await markTaskCompleted('original'); expect(Object.keys(records())).toHaveLength(1); });
});
