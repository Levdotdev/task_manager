import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: {}, db: {}, platform: 'android',
  initialize: vi.fn(), nativeSignIn: vi.fn(), nativeSignOut: vi.fn(),
  credential: vi.fn(), credentialSignIn: vi.fn(), popupSignIn: vi.fn(), firebaseSignOut: vi.fn(),
  get: vi.fn(), set: vi.fn(),
}));
vi.mock('@/firebase', () => ({ auth: mocks.auth, db: mocks.db }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => mocks.platform } }));
vi.mock('@capawesome/capacitor-google-sign-in', () => ({ GoogleSignIn: {
  initialize: mocks.initialize, signIn: mocks.nativeSignIn, signOut: mocks.nativeSignOut,
} }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class { static credential = mocks.credential; },
  signInWithCredential: mocks.credentialSignIn, signInWithPopup: mocks.popupSignIn,
  signOut: mocks.firebaseSignOut, onAuthStateChanged: vi.fn(),
}));
vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => path, get: mocks.get, set: mocks.set,
  onValue: vi.fn(), runTransaction: vi.fn(),
}));

const user = { uid: 'firebase-user', displayName: 'Lance', email: 'lance@example.test' };
const clientId = '123456789-test.apps.googleusercontent.com';
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks();
  vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', clientId);
  mocks.platform = 'android';
  mocks.initialize.mockResolvedValue(undefined);
  mocks.nativeSignIn.mockResolvedValue({ idToken: 'google-id-token', userId: 'google-user' });
  mocks.nativeSignOut.mockResolvedValue(undefined);
  mocks.credential.mockReturnValue({ providerId: 'google.com' });
  mocks.credentialSignIn.mockResolvedValue({ user });
  mocks.popupSignIn.mockResolvedValue({ user });
  mocks.firebaseSignOut.mockResolvedValue(undefined);
  mocks.get.mockResolvedValue({ exists: () => true });
});
afterEach(() => vi.unstubAllEnvs());

describe('Android Google sign-in', () => {
  test('uses the native ID token in the app Firebase session and preserves existing user data', async () => {
    const { signInWithGoogle } = await import('@/services/userService');
    expect(await signInWithGoogle()).toBe(user);
    expect(mocks.initialize).toHaveBeenCalledWith({ clientId });
    expect(mocks.nativeSignIn).toHaveBeenCalledOnce();
    expect(mocks.credential).toHaveBeenCalledWith('google-id-token');
    expect(mocks.credentialSignIn).toHaveBeenCalledWith(mocks.auth, { providerId: 'google.com' });
    expect(mocks.popupSignIn).not.toHaveBeenCalled();
    expect(mocks.get).toHaveBeenCalledWith('users/firebase-user');
    expect(mocks.set).not.toHaveBeenCalled();
  });
  test('creates a new training-hours record under the verified Firebase UID', async () => {
    mocks.get.mockResolvedValue({ exists: () => false });
    const { signInWithGoogle } = await import('@/services/userService');
    await signInWithGoogle();
    expect(mocks.set).toHaveBeenCalledWith('users/firebase-user', {
      displayName: user.displayName, email: user.email, hoursRemaining: 486,
    });
  });
  test('cancellation keeps Firebase signed out and allows a retry without reinitializing Google', async () => {
    mocks.nativeSignIn.mockRejectedValueOnce({ code: 'SIGN_IN_CANCELED' });
    const { signInWithGoogle } = await import('@/services/userService');
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'SIGN_IN_CANCELED' });
    expect(mocks.credentialSignIn).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
    await expect(signInWithGoogle()).resolves.toBe(user);
    expect(mocks.initialize).toHaveBeenCalledOnce();
  });
  test.each(['', 'not-a-google-client'])('rejects a missing or invalid OAuth configuration (%s) before opening sign-in', async (value) => {
    vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', value);
    const { signInWithGoogle } = await import('@/services/userService');
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'auth/native-not-configured' });
    expect(mocks.nativeSignIn).not.toHaveBeenCalled();
    expect(mocks.popupSignIn).not.toHaveBeenCalled();
  });
  test('a failed native initialization can be retried', async () => {
    mocks.initialize.mockRejectedValueOnce(new Error('Provider unavailable'));
    const { signInWithGoogle } = await import('@/services/userService');
    await expect(signInWithGoogle()).rejects.toThrow('Provider unavailable');
    await expect(signInWithGoogle()).resolves.toBe(user);
    expect(mocks.initialize).toHaveBeenCalledTimes(2);
  });
  test('rejects a missing native ID token without authenticating or writing user data', async () => {
    mocks.nativeSignIn.mockResolvedValue({ idToken: '' });
    const { signInWithGoogle } = await import('@/services/userService');
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'auth/invalid-credential' });
    expect(mocks.credentialSignIn).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
  });
  test('Firebase token verification failure never creates a user record', async () => {
    mocks.credentialSignIn.mockRejectedValue(new Error('Invalid credential'));
    const { signInWithGoogle } = await import('@/services/userService');
    await expect(signInWithGoogle()).rejects.toThrow('Invalid credential');
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });
});

describe('Sign-out and browser compatibility', () => {
  test('browser sign-in keeps the Firebase popup flow without requiring native configuration', async () => {
    mocks.platform = 'web'; vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', '');
    const { signInWithGoogle, logout } = await import('@/services/userService');
    await expect(signInWithGoogle()).resolves.toBe(user);
    expect(mocks.popupSignIn).toHaveBeenCalledWith(mocks.auth, expect.any(Object));
    expect(mocks.initialize).not.toHaveBeenCalled();
    expect(mocks.credentialSignIn).not.toHaveBeenCalled();
    await logout();
    expect(mocks.firebaseSignOut).toHaveBeenCalledWith(mocks.auth);
    expect(mocks.nativeSignOut).not.toHaveBeenCalled();
  });
  test('clears the Firebase session before waiting for Android credential cleanup', async () => {
    let finishCleanup: () => void = () => undefined;
    mocks.nativeSignOut.mockImplementation(() => new Promise<void>(resolve => { finishCleanup = resolve; }));
    const { logout } = await import('@/services/userService');
    const pending = logout();
    await vi.waitFor(() => expect(mocks.nativeSignOut).toHaveBeenCalledOnce());
    expect(mocks.firebaseSignOut.mock.invocationCallOrder[0]).toBeLessThan(mocks.nativeSignOut.mock.invocationCallOrder[0]);
    finishCleanup(); await pending;
  });
  test('credential cleanup errors cannot prevent a completed Firebase logout', async () => {
    mocks.nativeSignOut.mockRejectedValue(new Error('Provider unavailable'));
    const { logout } = await import('@/services/userService');
    await expect(logout()).resolves.toBeUndefined();
    vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', '');
    await expect(logout()).resolves.toBeUndefined();
    expect(mocks.firebaseSignOut).toHaveBeenCalledTimes(2);
  });
  test('a failed Firebase logout leaves the native account state available for retry', async () => {
    mocks.firebaseSignOut.mockRejectedValue(new Error('Unable to sign out'));
    const { logout } = await import('@/services/userService');
    await expect(logout()).rejects.toThrow('Unable to sign out');
    expect(mocks.nativeSignOut).not.toHaveBeenCalled();
  });
});
