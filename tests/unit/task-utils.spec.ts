import { describe, expect, test } from 'vitest';
import { normalizeTask, nextOccurrence, nextDueDate, localDateTime, matchesSearch, taskFiles, taskLinks, manualTaskOrder, mergeVisibleOrder, attachmentBytes } from '@/utils/tasks';
import { buildReminderPlan, reminderId } from '@/utils/reminders';
import type { Task } from '@/models/task';
const task: Task = { id: 'report', title: 'Weekly training report', description: 'Summarize mentor feedback', category: 'Learning', due_date: '2030-01-31T09:30', priority: 'high', status: 'Pending', files: [{ id: 'f', name: 'outline.pdf', data: 'data:application/pdf;base64,YQ==' }], links: [{ id: 'l', title: 'Project brief', url: 'https://example.org/specification' }] };

describe('Task compatibility and search', () => {
  test('reads old attachments and priority values', () => {
    const value = normalizeTask('old', { ...task, files: undefined, links: undefined, priority: 'High' as Task['priority'], fileName: 'old.txt', fileData: 'data:text/plain;base64,YQ==', link: 'https://example.org' });
    expect(value.priority).toBe('high');
    expect(taskFiles(value)[0].name).toBe('old.txt');
    expect(taskLinks(value)[0].url).toBe('https://example.org');
    expect(taskFiles({ ...value, files: [] })).toEqual([]);
    expect(taskLinks({ ...value, links: [] })).toEqual([]);
  });
  test.each(['training', 'mentor', 'learning', 'outline.pdf', 'project brief', 'example.org/specification', 'MENTOR outline learning'])('searches %s across all supported fields', query => expect(matchesSearch(task, query)).toBe(true));
  test('requires every search term and allows an empty query', () => { expect(matchesSearch(task, 'training missing')).toBe(false); expect(matchesSearch(task, '  ')).toBe(true); });
  test('counts decoded file and photo bytes', () => expect(attachmentBytes(task.files!, 'data:image/png;base64,YWI=')).toBe(3));
});
describe('Recurring dates', () => {
  test.each([['daily', '2030-02-01T09:30'], ['weekdays', '2030-02-01T09:30'], ['weekly', '2030-02-07T09:30'], ['monthly', '2030-02-28T09:30']] as const)('%s keeps the chosen time', (recurrence, expected) => expect(localDateTime(nextOccurrence(new Date(task.due_date), recurrence))).toBe(expected));
  test('weekdays skip Saturday and Sunday', () => expect(localDateTime(nextOccurrence(new Date('2026-09-11T17:00'), 'weekdays'))).toBe('2026-09-14T17:00'));
  test('monthly repeats return to the original day after a short month', () => { const feb = nextOccurrence(new Date(task.due_date), 'monthly', 31); expect(localDateTime(nextOccurrence(feb, 'monthly', 31))).toBe('2030-03-31T09:30'); });
  test('monthly repeats handle leap years', () => expect(localDateTime(nextOccurrence(new Date('2028-01-31T09:30'), 'monthly'))).toBe('2028-02-29T09:30'));
  test('late completion skips elapsed occurrences', () => expect(nextDueDate({ ...task, recurrence: 'daily' }, new Date('2030-02-05T12:00'))).toBe('2030-02-06T09:30'));
  test('preserves the wall-clock time across a daylight saving transition', () => expect(nextOccurrence(new Date('2026-03-07T09:30'), 'daily').getHours()).toBe(9));
  test('non-recurring tasks do not create another date', () => expect(nextDueDate(task)).toBeNull());
});
describe('Manual ordering', () => {
  test('keeps hidden tasks in place when visible tasks move', () => expect(mergeVisibleOrder(['a', 'hidden', 'b', 'done', 'c'], ['c', 'a', 'b'])).toEqual(['c', 'hidden', 'a', 'done', 'b']));
  test('uses saved order independently of dates and priorities', () => expect(manualTaskOrder([{ ...task, id: 'a', order: 2 }, { ...task, id: 'b', order: 0, priority: 'low' }]).map(t => t.id)).toEqual(['b', 'a']));
});
describe('Device reminder plans', () => {
  test('uses every requested offset and orders the soonest reminder first', () => {
    const plan = buildReminderPlan([{ ...task, reminders: [5, 15, 30, 60, 1440] }], 'user', new Date('2030-01-29T00:00'));
    expect(plan.notifications.map(n => localDateTime(n.schedule!.at!))).toEqual(['2030-01-30T09:30', '2030-01-31T08:30', '2030-01-31T09:00', '2030-01-31T09:15', '2030-01-31T09:25']);
  });
  test('never schedules completed tasks or reminders in the past', () => {
    expect(buildReminderPlan([{ ...task, reminders: [5, 60, 1440] }], 'u', new Date('2030-01-31T09:00')).notifications).toHaveLength(1);
    expect(buildReminderPlan([{ ...task, status: 'Completed', reminders: [5] }], 'u', new Date('2030-01-01')).notifications).toHaveLength(0);
  });
  test('keeps IDs stable when details change, and changes the signature', () => {
    const first = buildReminderPlan([{ ...task, reminders: [5] }], 'u', new Date('2030-01-01')).notifications[0];
    const changed = buildReminderPlan([{ ...task, title: 'Updated report', reminders: [5] }], 'u', new Date('2030-01-01')).notifications[0];
    expect(first.id).toBe(changed.id); expect(first.extra.signature).not.toBe(changed.extra.signature);
    expect(reminderId('other-user:report:5')).not.toBe(first.id); expect(first.id).toBeGreaterThan(0); expect(first.id).toBeLessThan(2147483647);
  });
  test('reserves IDs used by other notifications', () => { const first = buildReminderPlan([{ ...task, reminders: [5] }], 'u', new Date('2030-01-01')).notifications[0]; expect(buildReminderPlan([{ ...task, reminders: [5] }], 'u', new Date('2030-01-01'), 64, [first.id]).notifications[0].id).not.toBe(first.id); });
  test('caps pending reminders with the earliest dates first', () => {
    const many = Array.from({ length: 70 }, (_, i) => ({ ...task, id: String(i), due_date: localDateTime(new Date(2030, 1, i + 1, 17)), reminders: [5] as Task['reminders'] }));
    const plan = buildReminderPlan(many, 'u', new Date('2030-01-01'));
    expect(plan.notifications).toHaveLength(64); expect(plan.deferred).toBe(6); expect(plan.notifications[0].extra.taskId).toBe('0');
  });
});
