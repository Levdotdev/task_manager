import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import AppDialog from '@/components/AppDialog.vue';
const stubs = { IonModal: { name: 'IonModal', props: ['isOpen', 'canDismiss'], template: '<div><slot /></div>' }, IonIcon: true, IonSpinner: true };
describe('Dialog dismissal during authentication changes', () => {
  test('blocks user cancellation while busy, then permits a successful owner close', async () => {
    const wrapper = mount(AppDialog, { props: { isOpen: true, busy: true, title: 'Sign out' }, global: { stubs } });
    const canDismiss = wrapper.findComponent({ name: 'IonModal' }).props('canDismiss');
    expect(canDismiss()).toBe(false);
    await wrapper.setProps({ isOpen: false });
    expect(canDismiss()).toBe(true);
    wrapper.unmount();
  });
  test('permits overlay cleanup when logout unmounts its still-busy owner', () => {
    const wrapper = mount(AppDialog, { props: { isOpen: true, busy: true, title: 'Sign out' }, global: { stubs } });
    const canDismiss = wrapper.findComponent({ name: 'IonModal' }).props('canDismiss');
    expect(canDismiss()).toBe(false);
    wrapper.unmount(); expect(canDismiss()).toBe(true);
  });
});
