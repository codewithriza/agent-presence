import { open, stat } from 'node:fs/promises';

// Only event types affect public presence. No message bodies or tool arguments
// are retained or forwarded. Read in bounded chunks so large chats stay cheap.
export function sessionEvent(record, previous = 'Waiting for you') {
  if (record.type !== 'event_msg') return previous;
  if (record.payload?.type === 'task_started') return 'Working';
  if (['task_complete','turn_aborted'].includes(record.payload?.type)) return 'Waiting for you';
  return previous;
}
export class SessionTail {
  constructor(file, onRecord = () => {}) { this.onRecord = onRecord; this.file = file; this.offset = 0; this.partial = ''; this.phase = 'Waiting for you'; this.discard = false; }
  async poll() {
    const info = await stat(this.file);
    if (info.size < this.offset) { this.offset = 0; this.partial = ''; this.discard = false; }
    const handle = await open(this.file,'r');
    try {
      // Cap work per tick at 4 MB, keeping the event loop responsive.
      const limit = Math.min(info.size, this.offset + 4 * 1024 * 1024);
      while (this.offset < limit) {
        const bytes = Buffer.alloc(Math.min(65536,limit-this.offset));
        const {bytesRead} = await handle.read(bytes,0,bytes.length,this.offset);
        if (!bytesRead) break;
        this.offset += bytesRead;
        // Session event tags are ASCII; split UTF-8 in ignored text is harmless.
        const parts = (this.partial + bytes.subarray(0,bytesRead).toString('utf8')).split('\n');
        this.partial = parts.pop();
        for (const line of parts) {
          if (this.discard) { this.discard = false; continue; }
          try { const record = JSON.parse(line); this.phase = sessionEvent(record,this.phase); this.onRecord(record); } catch {}
        }
        if (this.partial.length > 1024 * 1024) { this.partial = ''; this.discard = true; }
      }
    } finally { await handle.close(); }
    return this.phase;
  }
}
