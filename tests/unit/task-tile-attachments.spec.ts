import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Task } from '@/models/task';
import TaskTile from '@/components/TaskTile.vue';

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('@/services/attachmentService', () => ({ saveTaskAttachment: mocks.save }));
const task: Task = {
  id: 'task', title: 'Read the instructions', description: 'Two attached documents.',
  due_date: '2099-04-10T17:00', priority: 'medium', status: 'Pending',
  files: [
    { id: 'first', name: 'instructions.pdf', data: 'data:application/pdf;base64,JVBERi0xLjQK' },
    { id: 'second', name: 'notes.txt', data: 'data:text/plain;base64,bm90ZXM=' },
  ],
};
let wrapper: VueWrapper | undefined;
function render(value = task) {
  wrapper = mount(TaskTile, { props: { task: value }, global: { stubs: { IonIcon: true } } });
  return wrapper;
}
beforeEach(() => mocks.save.mockReset().mockResolvedValue('saved'));
afterEach(() => { wrapper?.unmount(); wrapper = undefined; });

describe('Attachment actions on task cards', () => {
  test('saving one attachment prevents duplicate taps until native saving finishes', async () => {
    let finish!: (result: string) => void;
    mocks.save.mockReturnValueOnce(new Promise<string>(resolve => { finish = resolve; }));
    const view = render();
    const first = view.get('button[aria-label="Download instructions.pdf"]');
    await first.trigger('click');
    expect(first.attributes('aria-busy')).toBe('true');
    expect(view.findAll('.attachments button').every(button => button.attributes('disabled') !== undefined)).toBe(true);
    expect(mocks.save).toHaveBeenCalledWith(task.files![0]);
    finish('saved');
    await flushPromises();
    expect(view.get('[role="status"]').text()).toBe('File saved.');
    expect(first.attributes('aria-busy')).toBe('false');
    expect(first.attributes('disabled')).toBeUndefined();
    await view.get('button[aria-label="Download notes.txt"]').trigger('click');
    expect(mocks.save).toHaveBeenLastCalledWith(task.files![1]);
  });

  test('canceling a picker leaves no success message and allows another attempt', async () => {
    mocks.save.mockResolvedValueOnce('canceled');
    const view = render();
    await view.get('button[aria-label="Download instructions.pdf"]').trigger('click');
    await flushPromises();
    expect(view.find('[role="status"]').exists()).toBe(false);
    expect(view.find('[role="alert"]').exists()).toBe(false);
    expect(view.get('button[aria-label="Download instructions.pdf"]').attributes('disabled')).toBeUndefined();
    await view.get('button[aria-label="Download instructions.pdf"]').trigger('click');
    await flushPromises();
    expect(view.get('[role="status"]').text()).toBe('File saved.');
  });

  test('failed saving shows an error and clears it after a successful retry', async () => {
    mocks.save.mockRejectedValueOnce(new Error('Choose another folder and try again.'));
    const view = render();
    await view.get('button[aria-label="Download instructions.pdf"]').trigger('click');
    await flushPromises();
    expect(view.get('[role="alert"]').text()).toBe('Choose another folder and try again.');
    expect(view.find('[role="status"]').exists()).toBe(false);
    await view.get('button[aria-label="Download instructions.pdf"]').trigger('click');
    await flushPromises();
    expect(view.find('[role="alert"]').exists()).toBe(false);
    expect(view.get('[role="status"]').text()).toBe('File saved.');
  });

  test('older single-file tasks use the same download action', async () => {
    const view = render({ ...task, files: undefined, fileName: 'legacy.txt', fileData: 'data:text/plain;base64,bm90ZXM=' });
    await view.get('button[aria-label="Download legacy.txt"]').trigger('click');
    await flushPromises();
    expect(mocks.save).toHaveBeenCalledWith({
      id: 'legacy-file', name: 'legacy.txt', data: 'data:text/plain;base64,bm90ZXM=',
    });
  });

  test('browser downloads report initiation rather than a confirmed native save', async () => {
    mocks.save.mockResolvedValueOnce('started');
    const view = render();
    await view.get('button[aria-label="Download instructions.pdf"]').trigger('click');
    await flushPromises();
    expect(view.get('[role="status"]').text()).toBe('Download started.');
  });
});
