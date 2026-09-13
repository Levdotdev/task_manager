import { describe, expect, test } from 'vitest';
import type { Task } from '@/models/task';
import { expandRecurringTasks, findTaskOccurrence, occurrenceKey } from '@/utils/recurrence';
import { buildReminderPlan } from '@/utils/reminders';
const task: Task = { id: 'daily', title: 'Report', description: 'Notes', due_date: '2026-09-11T17:00', priority: 'medium', status: 'Pending', recurrence: 'daily' };
function expand(tasks: Task[], start = '2026-09-11', end = '2026-09-16') { return expandRecurringTasks(tasks, new Date(`${start}T00:00`), new Date(`${end}T00:00`), false); }
describe('Automatically displayed recurring dates', () => {
  test('daily dates appear before the first occurrence is completed', () => {
    expect(expand([task]).map(t => t.due_date)).toEqual(['2026-09-11T17:00', '2026-09-12T17:00', '2026-09-13T17:00', '2026-09-14T17:00', '2026-09-15T17:00']);
  });
  test('weekdays skip weekends and weekly dates retain their weekday', () => {
    expect(expand([{ ...task, recurrence: 'weekdays' }]).map(t => t.due_date)).toEqual(['2026-09-11T17:00', '2026-09-14T17:00', '2026-09-15T17:00']);
    expect(expand([{ ...task, recurrence: 'weekly' }], '2026-09-11', '2026-09-26').map(t => t.due_date)).toEqual(['2026-09-11T17:00', '2026-09-18T17:00', '2026-09-25T17:00']);
  });
  test('month-end dates return to the original anchor and work in distant months', () => {
    const monthly = { ...task, due_date: '2028-01-31T09:30', recurrence: 'monthly' as const, recurrenceAnchorDay: 31 };
    expect(expand([monthly], '2028-02-01', '2028-04-01').map(t => t.due_date)).toEqual(['2028-02-29T09:30', '2028-03-31T09:30']);
    expect(expand([monthly], '2099-02-01', '2099-03-01')[0].due_date).toBe('2099-02-28T09:30');
  });
  test('preserves local time over daylight saving changes', () => {
    const dates = expand([{ ...task, due_date: '2026-03-07T09:30' }], '2026-03-07', '2026-03-10');
    expect(dates.map(t => t.due_date)).toEqual(['2026-03-07T09:30', '2026-03-08T09:30', '2026-03-09T09:30']);
  });
  test('completion is specific to one date and does not duplicate the next date', () => {
    const due = '2026-09-12T17:00';
    const dates = expand([{ ...task, occurrenceStates: { [occurrenceKey(due)]: { due_date: due, status: 'Completed', completedAt: '2026-09-12T18:00Z' } } }]);
    expect(dates.filter(t => t.status === 'Completed').map(t => t.due_date)).toEqual([due]);
    expect(dates.filter(t => t.status === 'Pending')).toHaveLength(4);
    expect(new Set(dates.map(t => t.id)).size).toBe(5);
  });
  test('legacy saved successors win over projections from a reverted occurrence', () => {
    const previous = { ...task, seriesId: 'daily' };
    const next = { ...task, id: 'daily_202609121700', seriesId: 'daily', due_date: '2026-09-12T17:00', title: 'Edited next' };
    const dates = expand([previous, next]);
    expect(dates).toHaveLength(5); expect(dates.filter(t => t.due_date === next.due_date)).toHaveLength(1);
    expect(dates.find(t => t.due_date === '2026-09-15T17:00')?.title).toBe('Edited next');
  });
  test('a stopped schedule retains completed history and removes later dates', () => {
    const due = '2026-09-12T17:00';
    const source = { ...task, recurrenceUntil: '2026-09-14T17:00', occurrenceStates: { [occurrenceKey(due)]: { due_date: due, status: 'Completed' as const } } };
    expect(expand([source]).map(t => t.due_date).sort()).toEqual(['2026-09-11T17:00', due, '2026-09-13T17:00']);
    expect(expand([{ ...source, recurrence: 'none' }]).find(t => t.due_date === due)?.status).toBe('Completed');
  });
  test('notification navigation resolves a recurring date outside the current view', () => {
    expect(findTaskOccurrence([task], 'daily_202801121700')).toMatchObject({ due_date: '2028-01-12T17:00', occurrenceSourceId: 'daily' });
    expect(findTaskOccurrence([{ ...task, recurrenceUntil: '2026-09-14T17:00' }], 'daily_202801121700')).toBeUndefined();
  });
  test('reminders are scheduled for future repeating dates without completion', () => {
    const now = new Date('2026-09-11T12:00');
    const plan = buildReminderPlan([{ ...task, reminders: [15] }], 'user', now, 5);
    expect(plan.notifications.map(n => n.extra.taskId)).toEqual(['daily', 'daily_202609121700', 'daily_202609131700', 'daily_202609141700', 'daily_202609151700']);
  });
});
