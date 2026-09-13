import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import TaskForm from '@/components/TaskFormComponent.vue';
import App from '@/App.vue';
import type { Task } from '@/services/taskService';

const mocks = vi.hoisted(() => ({
  addTask: vi.fn(), updateTask: vi.fn(), signIn: vi.fn(),
}));
vi.mock('@/services/taskService', () => ({ addTask: mocks.addTask, updateTask: mocks.updateTask }));
vi.mock('@/services/userService', () => ({ onAuthChange: (callback: (user: null) => void) => { callback(null); return () => undefined; }, signInWithGoogle: mocks.signIn }));
const stubs = { IonApp: { template: '<div><slot /></div>' }, IonRouterOutlet: true, IonIcon: true, IonSpinner: true, DarkModeToggle: true, CameraComponent: true };
const task: Task = { id: 'existing', title: 'Training report', description: 'Write the weekly report.', due_date: '2099-03-12T17:00', priority: 'high', status: 'Pending', image: 'data:image/png;base64,photo', link: 'https://example.com/report', fileName: 'notes.txt', fileData: 'data:text/plain;base64,bm90ZXM=' };

beforeEach(() => vi.resetAllMocks());
describe('Task form', () => {
  test('editing preserves the task and attachments and uses the chosen priority', async () => {
    const wrapper = mount(TaskForm, { props: { task }, global: { stubs } });
    await wrapper.get('select[name="priority"]').setValue('low');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.updateTask).toHaveBeenCalledWith('existing', expect.objectContaining({ title: task.title, description: task.description, due_date: task.due_date, priority: 'low', photoDataUrl: task.image, link: task.link, fileName: task.fileName, fileData: task.fileData }));
    expect(mocks.addTask).not.toHaveBeenCalled();
    expect(wrapper.emitted('taskSaved')).toHaveLength(1);
  });
  test('failed saves retain the entered details and allow retry', async () => {
    mocks.addTask.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce('new-task');
    const wrapper = mount(TaskForm, { global: { stubs } });
    await wrapper.get('input[name="title"]').setValue('Finish my report');
    await wrapper.get('textarea').setValue('Document what I learned.');
    await wrapper.get('input[name="dueDate"]').setValue('2099-03-12T17:00');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('couldn’t save');
    expect(wrapper.get<HTMLInputElement>('input[name="title"]').element.value).toBe('Finish my report');
    expect(wrapper.emitted('taskSaved')).toBeUndefined();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('taskSaved')).toHaveLength(1);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
describe('Google sign-in', () => {
  test('a blocked popup explains how to retry', async () => {
    mocks.signIn.mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    const wrapper = mount(App, { global: { stubs } });
    await wrapper.get('.google-button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('Allow pop-ups');
    expect(wrapper.get<HTMLButtonElement>('.google-button').element.disabled).toBe(false);
  });
});
