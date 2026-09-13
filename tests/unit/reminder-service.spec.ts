import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Task } from '@/models/task';
const mocks = vi.hoisted(() => ({ native: true, platform: 'android', permission: 'granted', exact: 'granted', pending: [] as LocalNotificationSchema[], delivered: [] as LocalNotificationSchema[], schedule: vi.fn(), cancel: vi.fn(), request: vi.fn(), removeDelivered: vi.fn(), listeners: new Map<string, (event: { notification: LocalNotificationSchema }) => void>(), appListeners: new Map<string, (event: { isActive: boolean }) => void>() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => mocks.platform } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(async (event: string, callback: (event: { isActive: boolean }) => void) => { mocks.appListeners.set(event, callback); return { remove: () => mocks.appListeners.delete(event) }; }) } }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {
  checkPermissions: async () => ({ display: mocks.permission }), requestPermissions: mocks.request,
  checkExactNotificationSetting: async () => ({ exact_alarm: mocks.exact }), changeExactNotificationSetting: async () => ({ exact_alarm: mocks.exact }),
  getPending: async () => ({ notifications: [...mocks.pending] }),
  getDeliveredNotifications: async () => ({ notifications: [...mocks.delivered] }), removeDeliveredNotifications: mocks.removeDelivered,
  schedule: mocks.schedule, cancel: mocks.cancel, createChannel: vi.fn(async () => undefined), addListener: vi.fn(async (event: string, callback: (event: { notification: LocalNotificationSchema }) => void) => { mocks.listeners.set(event, callback); return { remove: () => mocks.listeners.delete(event) }; }),
} }));
const task: Task = { id: 't', title: 'Training report', description: 'Notes', due_date: '2099-04-10T17:00', priority: 'medium', status: 'Pending', reminders: [5, 15] };
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); mocks.native = true; mocks.platform = 'android'; mocks.permission = 'granted'; mocks.exact = 'granted'; mocks.pending = []; mocks.delivered = []; mocks.listeners.clear(); mocks.appListeners.clear();
  mocks.schedule.mockImplementation(async ({ notifications }: { notifications: LocalNotificationSchema[] }) => { mocks.pending.push(...notifications); });
  mocks.cancel.mockImplementation(async ({ notifications }: { notifications: { id: number }[] }) => { mocks.pending = mocks.pending.filter(n => !notifications.some(cancel => cancel.id === n.id)); });
  mocks.removeDelivered.mockImplementation(async ({ notifications }: { notifications: { id: number }[] }) => { mocks.delivered = mocks.delivered.filter(n => !notifications.some(remove => remove.id === n.id)); });
  mocks.request.mockImplementation(async () => ({ display: mocks.permission }));
});
describe('Native notification reconciliation', () => {
  test('schedules saved reminders without prompting, and leaves unchanged schedules intact', async () => { const service = await import('@/services/reminderService'); await service.setReminderUser('u'); await service.syncTaskReminders([task]); expect(mocks.pending).toHaveLength(2); await service.syncTaskReminders([task]); expect(mocks.schedule).toHaveBeenCalledTimes(1); expect(mocks.request).not.toHaveBeenCalled(); });
  test('editing a task cancels and replaces its reminders; completing it cancels them', async () => { const service = await import('@/services/reminderService'); await service.setReminderUser('u'); await service.syncTaskReminders([task]); await service.syncTaskReminders([{ ...task, title: 'Updated title' }]); expect(mocks.cancel).toHaveBeenCalledTimes(1); expect(mocks.pending.every(n => n.title === 'Updated title')).toBe(true); await service.syncTaskReminders([{ ...task, status: 'Completed' }]); expect(mocks.pending).toHaveLength(0); });
  test('sign-out clears owned pending and delivered reminders while keeping other notifications', async () => { const service = await import('@/services/reminderService'); await service.setReminderUser('u'); await service.syncTaskReminders([task]); const foreign = { id: 777, title: 'Other', body: 'Other', extra: { source: 'other-plugin' } }; mocks.delivered = [mocks.pending[0], foreign]; mocks.pending.push(foreign); await service.setReminderUser(null); expect(mocks.pending).toEqual([foreign]); expect(mocks.delivered).toEqual([foreign]); });
  test('a signed-out app launch clears reminders from an earlier session', async () => { mocks.pending = [{ id: 123, title: 'Old session', body: 'Old', extra: { source: 'task-manager-reminder', uid: 'old' } }]; const service = await import('@/services/reminderService'); await service.setReminderUser(null); expect(mocks.pending).toHaveLength(0); });
  test('does not schedule without permission and asks only when enabling explicitly', async () => { mocks.permission = 'denied'; const service = await import('@/services/reminderService'); await service.setReminderUser('u'); await service.syncTaskReminders([task]); expect(mocks.pending).toHaveLength(0); expect(await service.enableDeviceReminders()).toBe(false); expect(mocks.request).toHaveBeenCalledTimes(1); mocks.permission = 'granted'; expect(await service.enableDeviceReminders()).toBe(true); expect(mocks.pending).toHaveLength(2); });
  test('uses approximate alarms without prompting, and reschedules after precise alarms are enabled', async () => { mocks.exact = 'denied'; const service = await import('@/services/reminderService'); await service.setReminderUser('u'); await service.syncTaskReminders([task]); expect(service.reminderState.granted).toBe(true); expect(service.reminderState.exactAllowed).toBe(false); expect(mocks.pending.every(n => n.isExactNotification === false)).toBe(true); mocks.exact = 'granted'; await service.syncTaskReminders([task]); expect(mocks.cancel).toHaveBeenCalledTimes(1); expect(mocks.pending.every(n => n.isExactNotification === true)).toBe(true); });
  test('iOS reserves pending capacity for other notifications', async () => { mocks.platform = 'ios'; const service = await import('@/services/reminderService'); await service.setReminderUser('u'); mocks.pending = [{ id: 999, title: 'Other', body: 'Other' }]; await service.syncTaskReminders(Array.from({ length: 35 }, (_, i) => ({ ...task, id: String(i) }))); expect(mocks.pending).toHaveLength(64); expect(service.reminderState.deferred).toBe(7); });
  test('web saves reminder choices without calling native notification APIs', async () => { mocks.native = false; const service = await import('@/services/reminderService'); await service.setReminderUser('u'); await service.syncTaskReminders([task]); expect(await service.enableDeviceReminders()).toBe(false); expect(mocks.schedule).not.toHaveBeenCalled(); expect(mocks.request).not.toHaveBeenCalled(); });
  test('an account switch drops queued schedules for the previous account', async () => { const service = await import('@/services/reminderService'); await service.setReminderUser('old'); const oldSync = service.syncTaskReminders([task]); const switched = service.setReminderUser('new'); await Promise.all([oldSync, switched]); await service.syncTaskReminders([{ ...task, id: 'new-task' }]); expect(mocks.pending.every(n => n.extra.uid === 'new' && n.extra.taskId === 'new-task')).toBe(true); });
  test('a scheduling failure is visible and a later sync can recover', async () => { const service = await import('@/services/reminderService'); await service.setReminderUser('u'); mocks.schedule.mockRejectedValueOnce(new Error('Native scheduling failed')); await service.syncTaskReminders([task]); expect(service.reminderState.error).toContain('couldn’t be updated'); await service.syncTaskReminders([task]); expect(mocks.pending).toHaveLength(2); expect(service.reminderState.error).toBe(''); });
  test('opening offline preserves the signed-in user’s saved schedules until tasks load', async () => {
    const saved = { id: 123, title: 'Saved task', body: 'Due soon', extra: { source: 'task-manager-reminder', uid: 'u', taskId: 't' } };
    mocks.pending = [saved]; mocks.delivered = [saved];
    const service = await import('@/services/reminderService');
    await service.setReminderUser('u');
    expect(mocks.pending).toEqual([saved]); expect(mocks.delivered).toEqual([saved]);
    const stop = await service.startReminderListeners();
    mocks.appListeners.get('appStateChange')!({ isActive: true }); await flushPromises();
    expect(mocks.pending).toEqual([saved]); expect(mocks.request).not.toHaveBeenCalled(); stop();
    await service.syncTaskReminders([]);
    expect(mocks.pending).toEqual([]);
  });
  test('an account switch preserves the new account’s cached schedules and clears the old account', async () => {
    const current = { id: 1, title: 'Current', body: 'Due soon', extra: { source: 'task-manager-reminder', uid: 'new' } };
    const old = { ...current, id: 2, extra: { source: 'task-manager-reminder', uid: 'old' } };
    mocks.pending = [current, old]; mocks.delivered = [current, old];
    const service = await import('@/services/reminderService'); await service.setReminderUser('new');
    expect(mocks.pending).toEqual([current]); expect(mocks.delivered).toEqual([current]);
  });
  test('a notification tap before authentication is retained for the matching account', async () => {
    const service = await import('@/services/reminderService'); const stop = await service.startReminderListeners();
    mocks.listeners.get('localNotificationActionPerformed')!({ notification: { id: 1, title: 'Report', body: 'Due soon', extra: { source: 'task-manager-reminder', uid: 'u', taskId: 't' } } });
    await service.setReminderUser('u');
    expect(service.pendingReminderTask.value).toBe('t');
    service.consumeReminderTask('t'); expect(service.pendingReminderTask.value).toBeNull(); stop();
  });
  test('a notification tap for another account is discarded after authentication', async () => {
    const service = await import('@/services/reminderService'); const stop = await service.startReminderListeners();
    mocks.listeners.get('localNotificationActionPerformed')!({ notification: { id: 1, title: 'Report', body: 'Due soon', extra: { source: 'task-manager-reminder', uid: 'old', taskId: 'old-task' } } });
    await service.setReminderUser('new'); expect(service.pendingReminderTask.value).toBeNull(); stop();
  });
  test('consuming an earlier tap does not discard a newer tap', async () => {
    const service = await import('@/services/reminderService'); await service.setReminderUser('u'); const stop = await service.startReminderListeners();
    const tap = (taskId: string) => mocks.listeners.get('localNotificationActionPerformed')!({ notification: { id: 1, title: 'Report', body: 'Due soon', extra: { source: 'task-manager-reminder', uid: 'u', taskId } } });
    tap('first'); tap('second'); service.consumeReminderTask('first'); expect(service.pendingReminderTask.value).toBe('second');
    service.consumeReminderTask('second'); expect(service.pendingReminderTask.value).toBeNull(); stop();
  });
});
