import { Capacitor, registerPlugin } from '@capacitor/core';
import type { TaskFile } from '@/models/task';

interface TaskAttachmentsPlugin {
  save(options: { name: string; mimeType: string; data: string }): Promise<{ saved: boolean }>;
}

const TaskAttachments = registerPlugin<TaskAttachmentsPlugin>('TaskAttachments');
let androidSaveInProgress = false;

function attachmentPayload(file: TaskFile) {
  const match = /^data:([^,]*),([\s\S]*)$/i.exec(file.data);
  if (!match || !/(?:^|;)base64$/i.test(match[1])) {
    throw new Error('This attachment could not be read. Attach the file again and retry.');
  }
  const data = match[2].replace(/\s/g, '');
  if (data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    throw new Error('This attachment could not be read. Attach the file again and retry.');
  }
  const embeddedType = match[1].split(';')[0];
  const validType = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;
  const mimeType = file.type && validType.test(file.type) ? file.type
    : validType.test(embeddedType) ? embeddedType : 'application/octet-stream';
  const name = file.name.replace(/[\\/\p{Cc}]/gu, '_').trim() || 'Attachment';
  return { name, mimeType, data };
}

export async function saveTaskAttachment(file: TaskFile): Promise<'saved' | 'started' | 'canceled'> {
  const payload = attachmentPayload(file);
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    if (!Capacitor.isPluginAvailable('TaskAttachments')) {
      throw new Error('Install the latest Android app to download attachments.');
    }
    if (androidSaveInProgress) {
      throw new Error('Finish saving the current attachment first.');
    }
    androidSaveInProgress = true;
    try {
      const result = await TaskAttachments.save(payload);
      return result.saved ? 'saved' : 'canceled';
    } finally {
      androidSaveInProgress = false;
    }
  }

  const anchor = document.createElement('a');
  anchor.href = file.data;
  anchor.download = payload.name;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
  }
  return 'started';
}
