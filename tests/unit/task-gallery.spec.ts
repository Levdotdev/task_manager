import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import type { Task } from '@/models/task';
import TaskGallery from '@/components/TaskGalleryComponent.vue';
const mocks = vi.hoisted(() => ({
  listener: undefined as ((tasks: Task[]) => void) | undefined,
  intent: null as { value: string | null } | null,
  state: { native: false, granted: false, enabling: false, exactAllowed: true, error: '', deferred: 0 },
  sync: vi.fn(), consume: vi.fn(),
}));
vi.mock('@/services/taskService', () => ({
  subscribeToTasks: (callback: (tasks: Task[]) => void) => { mocks.listener = callback; return () => undefined; },
  markTaskCompleted: vi.fn(), revertTaskToPending: vi.fn(), deleteTask: vi.fn(), reorderTasks: vi.fn(), addTask: vi.fn(), updateTask: vi.fn(),
}));
vi.mock('@/services/reminderService', async () => {
  const { ref } = await import('vue');
  mocks.intent = ref<string | null>(null);
  return { reminderState: mocks.state, pendingReminderTask: mocks.intent, syncTaskReminders: mocks.sync, consumeReminderTask: mocks.consume, enableDeviceReminders: vi.fn(), openExactReminderSettings: vi.fn() };
});
const stubs = {
  IonIcon: true,
  AppDialog: { name: 'AppDialog', props: ['isOpen'], emits: ['dismiss', 'closed'], template: '<section v-if="isOpen" data-test="dialog"><slot /><button type="button" @click="$emit(\'dismiss\')">Close dialog</button></section>' },
  TaskFormComponent: { name: 'TaskFormComponent', props: ['task'], template: '<p>Editing {{ task?.title }}</p>' },
  TaskTile: { props: ['task'], emits: ['edit'], template: '<article><span>{{ task.title }}</span><button type="button" @click="$emit(\'edit\')">Edit</button></article>' },
  TaskCalendar: true,
};
const first: Task = { id: 'first', title: 'Weekly report', description: 'Notes', priority: 'medium', due_date: '2099-04-10T17:00', status: 'Pending' };
const second: Task = { ...first, id: 'second', title: 'Project brief' };
let wrapper: VueWrapper | undefined;
function render(realForm = false) { wrapper = mount(TaskGallery, { global: { stubs: realForm ? { ...stubs, TaskFormComponent: false, CameraComponent: true, IonSpinner: true } : stubs } }); return wrapper; }
beforeEach(() => { vi.clearAllMocks(); mocks.listener = undefined; mocks.intent!.value = null; mocks.state.native = false; mocks.consume.mockImplementation((id: string) => { if (mocks.intent!.value === id) mocks.intent!.value = null; }); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.useRealTimers(); });
describe('Reminder navigation in the task workspace', () => {
  test('a startup tap opens its task only after the task snapshot arrives', async () => {
    mocks.intent!.value = 'first'; const view = render();
    expect(view.find('[data-test="dialog"]').exists()).toBe(false);
    mocks.listener!([first]); await flushPromises();
    expect(view.findComponent({ name: 'TaskFormComponent' }).props('task')).toMatchObject({ id: 'first' });
    expect(mocks.consume).toHaveBeenCalledWith('first');
  });
  test('a tap waits for an existing edit form to close', async () => {
    const view = render(); mocks.listener!([first, second]); await flushPromises();
    await view.findAll('article button')[0].trigger('click');
    mocks.intent!.value = 'second'; await flushPromises();
    expect(view.findComponent({ name: 'TaskFormComponent' }).props('task')).toMatchObject({ id: 'first' });
    expect(mocks.consume).not.toHaveBeenCalled();
    await view.get('[data-test="dialog"] button').trigger('click'); await flushPromises();
    expect(view.find('[data-test="dialog"]').exists()).toBe(false); expect(mocks.consume).not.toHaveBeenCalled();
    view.findAllComponents({ name: 'AppDialog' })[0].vm.$emit('closed'); await flushPromises();
    expect(view.findComponent({ name: 'TaskFormComponent' }).props('task')).toMatchObject({ id: 'second' });
    expect(mocks.consume).toHaveBeenCalledWith('second');
  });
  test('the queued task opens with its own fields after cancelling another task form', async () => {
    const view = render(true); mocks.listener!([first, second]); await flushPromises();
    await view.findAll('article button')[0].trigger('click'); await flushPromises();
    await view.get('input[name="title"]').setValue('Unsaved first-task draft');
    mocks.intent!.value = 'second'; await flushPromises();
    expect(view.get<HTMLInputElement>('input[name="title"]').element.value).toBe('Unsaved first-task draft');
    await view.get('.cancel-button').trigger('click'); await flushPromises();
    expect(view.find('[data-test="dialog"]').exists()).toBe(false);
    view.findAllComponents({ name: 'AppDialog' })[0].vm.$emit('closed'); await flushPromises();
    expect(view.get<HTMLInputElement>('input[name="title"]').element.value).toBe(second.title);
  });
  test('a tap for a deleted task is cleared after the task snapshot arrives', async () => {
    mocks.intent!.value = 'deleted'; const view = render();
    expect(mocks.consume).not.toHaveBeenCalled(); mocks.listener!([]); await flushPromises();
    expect(view.find('[data-test="dialog"]').exists()).toBe(false); expect(mocks.consume).toHaveBeenCalledWith('deleted');
  });
  test('the foreground clock does not replace unknown tasks with an empty reminder plan', async () => {
    vi.useFakeTimers(); mocks.state.native = true; const view = render();
    vi.advanceTimersByTime(60_000); expect(mocks.sync).not.toHaveBeenCalled();
    mocks.listener!([]); await view.vm.$nextTick(); vi.advanceTimersByTime(250);
    expect(mocks.sync).toHaveBeenCalledWith([]);
  });
});
