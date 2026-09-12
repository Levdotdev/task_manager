import { db, auth } from '@/firebase';
import { ref as databaseRef, push, set, update, remove, onValue, type Unsubscribe } from 'firebase/database';

export interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'Pending' | 'Completed';
  image?: string;
  link?: string;
  fileName?: string;
  fileData?: string;
}

export interface NewTask {
  title: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  photoDataUrl?: string;
  link?: string;
  fileName?: string;
  fileData?: string;
}

export interface TaskEdits extends NewTask {}

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return uid;
}
function tasksRootRef() {
  return databaseRef(db, `tasks/${requireUid()}`);
}
function taskRef(taskId: string) {
  return databaseRef(db, `tasks/${requireUid()}/${taskId}`);
}

export async function addTask(task: NewTask) {
  const newTaskRef = push(tasksRootRef());
  await set(newTaskRef, {
    title: task.title,
    description: task.description,
    due_date: task.due_date,
    priority: task.priority,
    status: 'Pending',
    image: task.photoDataUrl ?? '',
    link: task.link ?? '',
    fileName: task.fileName ?? '',
    fileData: task.fileData ?? '',
  });
  return newTaskRef.key as string;
}

export async function updateTask(taskId: string, edits: TaskEdits) {
  const updates: Record<string, unknown> = {
    title: edits.title,
    description: edits.description,
    due_date: edits.due_date,
    priority: edits.priority,
  };
  if (edits.photoDataUrl) updates.image = edits.photoDataUrl;
  if (edits.link !== undefined) updates.link = edits.link;
  if (edits.fileName !== undefined) updates.fileName = edits.fileName;
  if (edits.fileData !== undefined) updates.fileData = edits.fileData;
  await update(taskRef(taskId), updates);
}

export async function markTaskCompleted(taskId: string) {
  await update(taskRef(taskId), { status: 'Completed' });
}
export async function revertTaskToPending(taskId: string) {
  await update(taskRef(taskId), { status: 'Pending' });
}
export async function deleteTask(taskId: string) {
  await remove(taskRef(taskId));
}

export function subscribeToTasks(callback: (tasks: Task[]) => void): Unsubscribe {
  return onValue(tasksRootRef(), (snapshot) => {
    const data = snapshot.val() || {};
    const tasks: Task[] = Object.entries(data)
      .map(([id, value]) => ({ id, ...(value as Omit<Task, 'id'>) }))
      .filter((t) => t.title && t.title.trim() !== '');
    callback(tasks);
  });
}