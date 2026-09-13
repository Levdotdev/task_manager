import { CATEGORY_OPTIONS, RECURRENCE_OPTIONS, REMINDER_OPTIONS, type Task, type TaskFile, type TaskLink, type DisplayStatus, type Recurrence } from '@/models/task';

export function categoryLabel(value: string): string {
  const option = CATEGORY_OPTIONS.find(o => o.value.toLowerCase() === value.toLowerCase());
  return option ? `${option.emoji} ${value}` : value;
}

export function taskFiles(task: Pick<Task, 'files' | 'fileData' | 'fileName'>): TaskFile[] {
  if (Array.isArray(task.files)) return task.files;
  return task.fileData ? [{ id: 'legacy-file', name: task.fileName || 'Attachment', data: task.fileData }] : [];
}
export function taskLinks(task: Pick<Task, 'links' | 'link'>): TaskLink[] {
  if (Array.isArray(task.links)) return task.links;
  return task.link ? [{ id: 'legacy-link', title: 'Open link', url: task.link }] : [];
}
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function localDateTime(date: Date): string {
  return `${localDateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function taskDateKey(task: Task): string {
  const date = new Date(task.due_date);
  return Number.isNaN(date.getTime()) ? task.due_date.slice(0, 10) : localDateKey(date);
}
export function displayStatus(task: Task, now = new Date()): DisplayStatus {
  return task.status === 'Completed' ? 'Completed' : new Date(task.due_date) < now ? 'Missed' : 'Pending';
}
export function matchesSearch(task: Task, query: string): boolean {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = [task.title, task.description, task.category || '', ...taskFiles(task).map(f => f.name), ...taskLinks(task).flatMap(l => [l.title, l.url])].join(' ').toLocaleLowerCase();
  return terms.every(term => haystack.includes(term));
}
export function normalizeTask(id: string, value: Partial<Task>): Task {
  const priority = String(value.priority || 'medium').toLowerCase();
  const recurrence = RECURRENCE_OPTIONS.some(o => o.value === value.recurrence) ? value.recurrence : 'none';
  return {
    ...value, id, title: value.title || '', description: value.description || '', due_date: value.due_date || '',
    priority: priority === 'high' || priority === 'low' ? priority : 'medium',
    status: value.status === 'Completed' ? 'Completed' : 'Pending', category: value.category || '',
    files: taskFiles(value), links: taskLinks(value), recurrence,
    reminders: Array.isArray(value.reminders) ? [...new Set(value.reminders.filter(m => REMINDER_OPTIONS.some(o => o.value === m)))] : [],
  };
}
export function recurrenceLabel(value?: Recurrence): string {
  return RECURRENCE_OPTIONS.find(o => o.value === value)?.label || 'Does not repeat';
}
export function nextOccurrence(date: Date, recurrence: Recurrence, anchorDay = date.getDate()): Date {
  const next = new Date(date);
  if (recurrence === 'monthly') {
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(anchorDay, lastDay));
  } else {
    next.setDate(next.getDate() + (recurrence === 'weekly' ? 7 : 1));
    if (recurrence === 'weekdays') while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
  }
  return next;
}
export function nextDueDate(task: Task, now = new Date()): string | null {
  if (!task.recurrence || task.recurrence === 'none') return null;
  let date = new Date(task.due_date);
  if (Number.isNaN(date.getTime())) return null;
  const anchor = task.recurrenceAnchorDay || date.getDate();
  do { date = nextOccurrence(date, task.recurrence, anchor); } while (date <= now);
  return localDateTime(date);
}
export function manualTaskOrder(tasks: Task[]): Task[] {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    if (a.order !== undefined || b.order !== undefined) return (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id);
    return a.due_date.localeCompare(b.due_date) || rank[a.priority] - rank[b.priority] || a.id.localeCompare(b.id);
  });
}
// Replacing only visible positions keeps tasks hidden by a filter in their order.
export function mergeVisibleOrder(allIds: string[], visibleIds: string[]): string[] {
  const visible = new Set(visibleIds);
  let index = 0;
  return allIds.map(id => visible.has(id) ? visibleIds[index++] : id);
}
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export function dataUrlBytes(data: string): number {
  const comma = data.indexOf(',');
  if (comma < 0) return 0;
  const value = data.slice(comma + 1);
  return data.slice(0, comma).includes(';base64') ? Math.floor(value.length * 3 / 4) - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0) : new TextEncoder().encode(decodeURIComponent(value)).length;
}
export function attachmentBytes(files: TaskFile[], image = ''): number {
  return files.reduce((sum, file) => sum + (file.size ?? dataUrlBytes(file.data)), 0) + (image ? dataUrlBytes(image) : 0);
}
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
