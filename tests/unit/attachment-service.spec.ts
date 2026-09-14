import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { TaskFile } from '@/models/task';
import { taskFiles } from '@/utils/tasks';
import { saveTaskAttachment } from '@/services/attachmentService';

const mocks = vi.hoisted(() => ({
  native: true, platform: 'android', available: true, save: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mocks.native,
    getPlatform: () => mocks.platform,
    isPluginAvailable: () => mocks.available,
  },
  registerPlugin: () => ({ save: mocks.save }),
}));

const pdf: TaskFile = {
  id: 'pdf', name: 'Résumé 2026.pdf', type: 'application/pdf',
  data: 'data:application/pdf;base64,JVBERi0xLjQK',
};

beforeEach(() => {
  mocks.native = true;
  mocks.platform = 'android';
  mocks.available = true;
  mocks.save.mockReset().mockResolvedValue({ saved: true });
});
afterEach(() => vi.restoreAllMocks());

describe('Task attachment downloads', () => {
  test('Android sends the original file bytes, filename and MIME type to native saving', async () => {
    expect(await saveTaskAttachment(pdf)).toBe('saved');
    expect(mocks.save).toHaveBeenCalledWith({
      name: 'Résumé 2026.pdf', mimeType: 'application/pdf', data: 'JVBERi0xLjQK',
    });
    expect(document.querySelector('a[download]')).toBeNull();
  });

  test('legacy attachments infer their MIME type from the saved data URL', async () => {
    const file = taskFiles({ fileName: pdf.name, fileData: pdf.data })[0];
    await saveTaskAttachment(file);
    expect(mocks.save).toHaveBeenCalledWith({
      name: pdf.name, mimeType: 'application/pdf', data: 'JVBERi0xLjQK',
    });
  });

  test('unknown binary files keep their data and use a generic MIME type', async () => {
    await saveTaskAttachment({ id: 'binary', name: 'archive.bin', data: 'data:;base64,AP8AAQ==' });
    expect(mocks.save).toHaveBeenCalledWith({
      name: 'archive.bin', mimeType: 'application/octet-stream', data: 'AP8AAQ==',
    });
  });

  test('empty files can still be saved', async () => {
    await saveTaskAttachment({ id: 'empty', name: 'empty.txt', data: 'data:text/plain;base64,' });
    expect(mocks.save).toHaveBeenCalledWith({ name: 'empty.txt', mimeType: 'text/plain', data: '' });
  });

  test('cancellation does not report a completed save and permits retry', async () => {
    mocks.save.mockResolvedValueOnce({ saved: false });
    expect(await saveTaskAttachment(pdf)).toBe('canceled');
    expect(await saveTaskAttachment(pdf)).toBe('saved');
    expect(mocks.save).toHaveBeenCalledTimes(2);
  });

  test('a failed save permits retry', async () => {
    mocks.save.mockRejectedValueOnce(new Error('Not enough storage.'));
    await expect(saveTaskAttachment(pdf)).rejects.toThrow('Not enough storage.');
    expect(await saveTaskAttachment(pdf)).toBe('saved');
  });

  test('two cards cannot replace each other in the Android file picker', async () => {
    let finish!: (value: { saved: boolean }) => void;
    mocks.save.mockReturnValueOnce(new Promise<{ saved: boolean }>(resolve => { finish = resolve; }));
    const pending = saveTaskAttachment(pdf);
    await expect(saveTaskAttachment({ ...pdf, id: 'second', name: 'second.pdf' })).rejects.toThrow('Finish saving');
    expect(mocks.save).toHaveBeenCalledTimes(1);
    finish({ saved: false });
    await pending;
    expect(await saveTaskAttachment({ ...pdf, id: 'second', name: 'second.pdf' })).toBe('saved');
  });

  test('an installed APK without the native plugin requests an app update', async () => {
    mocks.available = false;
    await expect(saveTaskAttachment(pdf)).rejects.toThrow('Install the latest Android app');
    expect(mocks.save).not.toHaveBeenCalled();
    expect(document.querySelector('a[download]')).toBeNull();
  });

  test('unreadable attachments fail before opening the Android picker', async () => {
    for (const data of ['javascript:alert(1)', 'data:application/pdf;base64,not*base64', 'data:text/plain,hello']) {
      await expect(saveTaskAttachment({ ...pdf, data })).rejects.toThrow('could not be read');
    }
    expect(mocks.save).not.toHaveBeenCalled();
  });

  test('browser downloads retain the file data and filename without invoking Android', async () => {
    mocks.native = false;
    mocks.platform = 'web';
    const downloaded: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloaded.push(this);
      expect(this.isConnected).toBe(true);
    });
    expect(await saveTaskAttachment(pdf)).toBe('started');
    expect(downloaded[0].href).toBe(pdf.data);
    expect(downloaded[0].download).toBe(pdf.name);
    expect(downloaded[0].isConnected).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
