export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'Pending' | 'Completed';
export type DisplayStatus = TaskStatus | 'Missed';
export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type ReminderMinutes = 5 | 15 | 30 | 60 | 1440;

export interface TaskFile {
  id: string;
  name: string;
  data: string;
  type?: string;
  size?: number;
}
export interface TaskLink { id: string; title: string; url: string }
export interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  category?: string;
  files?: TaskFile[];
  links?: TaskLink[];
  reminders?: ReminderMinutes[];
  recurrence?: Recurrence;
  recurrenceAnchorDay?: number;
  seriesId?: string;
  nextDueDate?: string;
  nextTaskId?: string;
  nextTaskCreated?: boolean;
  completedAt?: string;
  order?: number;
  image?: string;
  // Read older tasks without requiring a migration.
  link?: string;
  fileName?: string;
  fileData?: string;
}
export interface NewTask {
  title: string;
  description: string;
  due_date: string;
  priority: TaskPriority;
  category?: string;
  files?: TaskFile[];
  links?: TaskLink[];
  reminders?: ReminderMinutes[];
  recurrence?: Recurrence;
  photoDataUrl?: string;
  link?: string;
  fileName?: string;
  fileData?: string;
}
export type TaskEdits = NewTask;

export const REMINDER_OPTIONS: { value: ReminderMinutes; label: string }[] = [
  { value: 5, label: '5 min' }, { value: 15, label: '15 min' },
  { value: 30, label: '30 min' }, { value: 60, label: '1 hour' },
  { value: 1440, label: '1 day' },
];
export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Does not repeat' }, { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' }, { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
