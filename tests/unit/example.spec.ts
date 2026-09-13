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
  test('offers all six categories before any tasks have been saved', async () => {
    const wrapper = mount(TaskForm, { global: { stubs } });
    expect(wrapper.findAll('select[name="category"] option').map(o => o.text())).toEqual(['No category', '💼 Work', '👤 Personal', '📚 Study', '🛒 Errands', '💰 Finance', '📁 Projects', 'Custom category…']);
    await wrapper.get('select[name="category"]').setValue('Study');
    expect(wrapper.find('input[name="customCategory"]').exists()).toBe(false);
  });
  test('editing preserves the task and attachments and uses the chosen priority', async () => {
    const wrapper = mount(TaskForm, { props: { task }, global: { stubs } });
    await flushPromises();
    await wrapper.get('select[name="priority"]').setValue('low');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.updateTask).toHaveBeenCalledWith('existing', expect.objectContaining({ title: task.title, description: task.description, due_date: task.due_date, priority: 'low', photoDataUrl: task.image, links: [expect.objectContaining({ url: task.link })], files: [expect.objectContaining({ name: task.fileName, data: task.fileData })] }));
    expect(mocks.addTask).not.toHaveBeenCalled();
    expect(wrapper.emitted('taskSaved')).toHaveLength(1);
  });
  test('saves multiple files, titled links, a category, recurrence, and reminder offsets', async () => {
    const wrapper = mount(TaskForm, { props: { task }, global: { stubs } });
    await flushPromises();
    await wrapper.get('select[name="category"]').setValue('__custom__');
    await wrapper.get('input[name="customCategory"]').setValue('Learning');
    await wrapper.get('select[name="recurrence"]').setValue('weekdays');
    await wrapper.get('input[type="checkbox"][value="15"]').setValue(true);
    await wrapper.get('input[name="linkTitle-0"]').setValue('Report guide');
    await wrapper.get('.add-link').trigger('click');
    await wrapper.get('input[name="linkTitle-1"]').setValue('Project brief');
    await wrapper.get('input[name="linkUrl-1"]').setValue('https://example.org/brief');
    const input = wrapper.get<HTMLInputElement>('input[type="file"]');
    Object.defineProperty(input.element, 'files', { value: [new File(['one'], 'one.txt'), new File(['two'], 'two.txt')], configurable: true });
    await input.trigger('change');
    await vi.waitFor(() => expect(wrapper.findAll('.file-list li')).toHaveLength(3));
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    const payload = mocks.updateTask.mock.calls[0][1];
    expect(payload.files.map((file: { name: string }) => file.name)).toEqual(['notes.txt', 'one.txt', 'two.txt']);
    expect(payload.links.map((link: { title: string }) => link.title)).toEqual(['Report guide', 'Project brief']);
    expect(payload).toMatchObject({ category: 'Learning', recurrence: 'weekdays', reminders: [15] });
  });
  test('removing migrated files and links saves empty lists', async () => {
    const wrapper = mount(TaskForm, { props: { task }, global: { stubs } });
    await flushPromises();
    await wrapper.get('button[aria-label="Remove notes.txt"]').trigger('click');
    await wrapper.get('button[aria-label="Remove link 1"]').trigger('click');
    await wrapper.get('form').trigger('submit'); await flushPromises();
    expect(mocks.updateTask.mock.calls[0][1]).toMatchObject({ files: [], links: [] });
  });
  test('rejects unsupported link schemes without losing the form', async () => {
    const wrapper = mount(TaskForm, { props: { task }, global: { stubs } });
    await flushPromises();
    await wrapper.get('input[name="linkUrl-0"]').setValue('javascript:alert(1)');
    await wrapper.get('form').trigger('submit'); await flushPromises();
    expect(mocks.updateTask).not.toHaveBeenCalled(); expect(wrapper.get('[role="alert"]').text()).toContain('valid URL');
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
  test.each([
    ['SIGN_IN_CANCELED', 'Sign-in was closed'],
    ['NO_CREDENTIAL_AVAILABLE', 'Add a Google account'],
    ['PROVIDER_CONFIGURATION_ERROR', 'Google Play services'],
    ['auth/native-not-configured', 'install a configured build'],
  ])('explains Android sign-in error %s and allows retry', async (code, message) => {
    mocks.signIn.mockRejectedValueOnce({ code });
    const wrapper = mount(App, { global: { stubs } });
    await wrapper.get('.google-button').trigger('click'); await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain(message);
    expect(wrapper.get<HTMLButtonElement>('.google-button').element.disabled).toBe(false);
    await wrapper.get('.google-button').trigger('click'); await flushPromises();
    expect(mocks.signIn).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
