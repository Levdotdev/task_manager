import { reactive, readonly, ref } from 'vue';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Task } from '@/models/task';
import { buildReminderPlan, REMINDER_SOURCE } from '@/utils/reminders';

const state = reactive({ native: Capacitor.isNativePlatform(), granted: false, exactAllowed: true, enabling: false, deferred: 0, error: '' });
export const reminderState = readonly(state);
let uid: string | null | undefined;
let generation = 0;
let tasks: Task[] = [];
let tasksReady = false;
let waitingTap: { uid: string; taskId: string } | null = null;
const taskToOpen = ref<string | null>(null);
export const pendingReminderTask = readonly(taskToOpen);
export function consumeReminderTask(taskId: string) {
  if (taskToOpen.value !== taskId) return;
  taskToOpen.value = null;
  waitingTap = null;
}
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T | undefined> {
  const result = queue.then(job).catch(() => { state.error = 'Reminders couldn’t be updated. Open the app again or try enabling reminders.'; return undefined; });
  queue = result;
  return result;
}
async function clearOwnedReminders(keepUid: string | null, expectedGeneration: number) {
  const pending = await LocalNotifications.getPending();
  if (expectedGeneration !== generation) return;
  const owned = pending.notifications.filter(n => n.extra?.source === REMINDER_SOURCE && (!keepUid || n.extra?.uid !== keepUid));
  if (owned.length) await LocalNotifications.cancel({ notifications: owned.map(n => ({ id: n.id })) });
  const delivered = await LocalNotifications.getDeliveredNotifications();
  if (expectedGeneration !== generation) return;
  const deliveredOwned = delivered.notifications.filter(n => n.extra?.source === REMINDER_SOURCE && (!keepUid || n.extra?.uid !== keepUid));
  if (deliveredOwned.length) await LocalNotifications.removeDeliveredNotifications({ notifications: deliveredOwned });
}
async function reconcile(expectedGeneration: number) {
  if (!state.native || expectedGeneration !== generation) return;
  const permission = await LocalNotifications.checkPermissions();
  state.granted = permission.display === 'granted';
  if (Capacitor.getPlatform() === 'android') {
    state.exactAllowed = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
  }
  // No snapshot is different from an empty task list. An offline launch must
  // keep this account's OS schedules until the first database snapshot arrives.
  if (uid && !tasksReady) return;
  const pending = await LocalNotifications.getPending();
  if (expectedGeneration !== generation) return;
  const owned = pending.notifications.filter(n => n.extra?.source === REMINDER_SOURCE);
  const foreignCount = pending.notifications.length - owned.length;
  const limit = Capacitor.getPlatform() === 'ios' ? Math.max(0, 64 - foreignCount) : 500;
  const plan = state.granted && uid ? buildReminderPlan(tasks, uid, new Date(), limit, pending.notifications.filter(n => n.extra?.source !== REMINDER_SOURCE).map(n => n.id)) : { notifications: [], deferred: 0 };
  // Refreshing tasks must not repeatedly open Android's alarm settings screen.
  // Switching to precise alarms later changes the signature and reschedules.
  for (const notification of plan.notifications) {
    notification.isExactNotification = state.exactAllowed;
    notification.extra.signature += `:${state.exactAllowed ? 'exact' : 'approximate'}`;
  }
  state.deferred = plan.deferred;
  const wanted = new Map(plan.notifications.map(n => [n.id, n]));
  const stale = owned.filter(n => !wanted.has(n.id) || n.extra?.uid !== uid || n.extra?.signature !== wanted.get(n.id)?.extra?.signature);
  if (stale.length) await LocalNotifications.cancel({ notifications: stale.map(n => ({ id: n.id })) });
  if (expectedGeneration !== generation) return;
  const existing = new Map(owned.filter(n => !stale.includes(n)).map(n => [n.id, n]));
  const missing = plan.notifications.filter(n => !existing.has(n.id));
  if (missing.length) {
    if (Capacitor.getPlatform() === 'android') await LocalNotifications.createChannel({ id: 'task-reminders', name: 'Task reminders', description: 'Upcoming task deadlines', importance: 4, visibility: 1 });
    if (expectedGeneration !== generation) return;
    await LocalNotifications.schedule({ notifications: missing });
  }
  state.error = '';
}
export function setReminderUser(nextUid: string | null) {
  if (uid === nextUid) return;
  uid = nextUid;
  generation++;
  tasks = [];
  tasksReady = false;
  if (waitingTap?.uid === nextUid) taskToOpen.value = waitingTap.taskId;
  else { taskToOpen.value = null; waitingTap = null; }
  state.deferred = 0;
  if (!state.native) return;
  const expected = generation;
  return enqueue(async () => { if (expected !== generation) return; await clearOwnedReminders(nextUid, expected); await reconcile(expected); });
}
export function syncTaskReminders(updated: Task[]) {
  tasks = updated;
  tasksReady = true;
  const expected = generation;
  if (state.native) return enqueue(() => reconcile(expected));
}
export async function enableDeviceReminders(): Promise<boolean> {
  if (!state.native) return false;
  state.enabling = true;
  try {
    await enqueue(async () => { await LocalNotifications.requestPermissions(); await reconcile(generation); });
    return state.granted;
  } finally { state.enabling = false; }
}
export async function openExactReminderSettings() {
  if (!state.native || Capacitor.getPlatform() !== 'android') return;
  await enqueue(async () => { await LocalNotifications.changeExactNotificationSetting(); await reconcile(generation); });
}
export async function startReminderListeners(): Promise<() => void> {
  if (!state.native) return () => undefined;
  const handles: PluginListenerHandle[] = [];
  try {
    handles.push(await App.addListener('appStateChange', event => { if (event.isActive) { const expected = generation; void enqueue(() => reconcile(expected)); } }));
    handles.push(await LocalNotifications.addListener('localNotificationActionPerformed', event => {
      const extra = event.notification.extra;
      if (extra?.source === REMINDER_SOURCE && typeof extra.uid === 'string' && typeof extra.taskId === 'string' && (uid === undefined || extra.uid === uid)) {
        waitingTap = { uid: extra.uid, taskId: extra.taskId };
        if (extra.uid === uid) taskToOpen.value = extra.taskId;
      }
    }));
    // Refill the pending window when a notification is delivered in the foreground.
    handles.push(await LocalNotifications.addListener('localNotificationReceived', () => { const expected = generation; void enqueue(() => reconcile(expected)); }));
  } catch { state.error = 'Device reminders couldn’t start. Reopen the app to try again.'; }
  return () => { for (const handle of handles) void handle.remove(); };
}
