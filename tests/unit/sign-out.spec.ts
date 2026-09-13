import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App.vue';
import UserMenu from '@/components/UserMenuComponent.vue';
const mocks = vi.hoisted(() => ({ listeners: new Set<(user: unknown) => void>(), logout: vi.fn(), overlayCleanupAllowed: false }));
const user = { uid: 'test-user', displayName: 'Test User', email: 'test@example.invalid' };
vi.mock('@/services/userService', () => ({
  onAuthChange: (callback: (user: unknown) => void) => { mocks.listeners.add(callback); callback(user); return () => mocks.listeners.delete(callback); },
  subscribeToUserRecord: (_uid: string, callback: (record: unknown) => void) => { callback({ displayName: user.displayName, email: user.email, hoursRemaining: 486 }); return () => undefined; },
  logout: mocks.logout, logHoursRendered: vi.fn(), signInWithGoogle: vi.fn(),
}));
const popover = defineComponent({ setup() { const element = ref<HTMLElement>(); onMounted(() => { Object.assign(element.value!, { dismiss: async () => true }); }); return { element }; }, template: '<div ref="element"><slot /></div>' });
const modal = defineComponent({
  name: 'IonModal', props: ['isOpen', 'canDismiss'],
  setup(props) { onBeforeUnmount(() => { if (props.isOpen) mocks.overlayCleanupAllowed = typeof props.canDismiss === 'function' ? props.canDismiss() : props.canDismiss; }); },
  template: '<section v-if="isOpen"><slot /></section>',
});
function render() { return mount(App, { global: { stubs: {
  IonApp: { template: '<main><slot /></main>' }, IonRouterOutlet: { components: { UserMenu }, template: '<div><UserMenu /></div>' },
  IonButton: { template: '<button><slot /></button>' }, IonContent: { template: '<div><slot /></div>' }, IonPopover: popover, IonModal: modal,
  IonIcon: true, IonSpinner: true, DarkModeToggle: true, OjtPieChart: true,
} } }); }
beforeEach(() => { vi.resetAllMocks(); mocks.listeners.clear(); mocks.overlayCleanupAllowed = false; });
describe('Signing out without a reload', () => {
  test('authentication changing before logout resolves closes the overlay and shows login', async () => {
    mocks.logout.mockImplementation(async () => { await nextTick(); for (const listener of mocks.listeners) listener(null); });
    const view = render(); await flushPromises();
    await view.get('.logout-button').trigger('click'); await flushPromises();
    const dialog = view.findAllComponents({ name: 'IonModal' }).find(component => component.props('isOpen'))!;
    await dialog.get('.primary-button').trigger('click'); await flushPromises();
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.overlayCleanupAllowed).toBe(true);
    expect(view.find('.login-page').exists()).toBe(true);
    expect(view.find('.dialog-shell').exists()).toBe(false);
    view.unmount();
  });
  test('a failed logout retains the dialog and permits retry', async () => {
    mocks.logout.mockRejectedValueOnce(new Error('Offline'));
    const view = render(); await flushPromises();
    await view.get('.logout-button').trigger('click'); await flushPromises();
    const dialog = view.findAllComponents({ name: 'IonModal' }).find(component => component.props('isOpen'))!;
    await dialog.get('.primary-button').trigger('click'); await flushPromises();
    expect(view.find('.login-page').exists()).toBe(false);
    expect(dialog.get('[role="alert"]').text()).toContain('couldn’t sign you out');
    expect(dialog.get<HTMLButtonElement>('.primary-button').element.disabled).toBe(false);
    view.unmount();
  });
});
