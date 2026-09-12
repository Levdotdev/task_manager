// src/services/taskService.ts
import { db } from '@/firebase';
import { ref as databaseRef, push, set, update, onValue, type Unsubscribe } from 'firebase/database';

export interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'Pending' | 'Completed';
  image?: string;
}

export interface NewTask {
  title: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  photoDataUrl?: string;
}

export interface TaskEdits {
  title: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  photoDataUrl?: string;
}

export async function addTask(task: NewTask) {
  const newTaskRef = push(databaseRef(db, 'tasks'));
  await set(newTaskRef, {
    title: task.title,
    description: task.description,
    due_date: task.due_date,
    priority: task.priority,
    status: 'Pending', // always Pending on creation
    image: task.photoDataUrl ?? '',
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
  await update(databaseRef(db, `tasks/${taskId}`), updates);
}

export async function markTaskCompleted(taskId: string) {
  await update(databaseRef(db, `tasks/${taskId}`), { status: 'Completed' });
}

export function subscribeToTasks(callback: (tasks: Task[]) => void): Unsubscribe {
  const tasksRef = databaseRef(db, 'tasks');
  return onValue(tasksRef, (snapshot) => {
    const data = snapshot.val() || {};
    const tasks: Task[] = Object.entries(data)
      .map(([id, value]) => ({ id, ...(value as Omit<Task, 'id'>) }))
      .filter((t) => t.title && t.title.trim() !== ''); // drop stray/blank entries
    callback(tasks);
  });
}