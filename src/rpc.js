import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function frame(op, data) {
  const body = Buffer.from(JSON.stringify(data));
  const header = Buffer.alloc(8);
  header.writeUInt32LE(op, 0); header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}
export function decoder(receive) {
  let buffer = Buffer.alloc(0);
  return chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 8) {
      const size = buffer.readUInt32LE(4);
      if (size > 1024 * 1024) throw new Error('Oversized RPC frame');
      if (buffer.length < size + 8) return;
      const op = buffer.readUInt32LE(0);
      const data = JSON.parse(buffer.subarray(8, 8 + size).toString());
      buffer = buffer.subarray(8 + size);
      receive(op, data);
    }
  };
}
export function socketPaths() {
  if (process.platform === 'win32') return Array.from({length:10}, (_, i) => `\\\\?\\pipe\\discord-ipc-${i}`);
  const roots = [...new Set([process.env.XDG_RUNTIME_DIR, process.env.TMPDIR, process.env.TMP, os.tmpdir(), '/tmp'].filter(Boolean))];
  return roots.flatMap(root => Array.from({length:10}, (_, i) => path.join(root, `discord-ipc-${i}`)));
}
export class Presence {
  constructor(clientId, activity, report = () => {}, paths = socketPaths()) {
    Object.assign(this, {clientId, activity, report, paths});
  }
  start() { this.stopped = false; void this.connect(); }
  async connect() {
    for (const endpoint of this.paths) {
      if (this.stopped) return;
      const connected = await new Promise(resolve => {
        const socket = net.createConnection(endpoint);
        this.socket = socket;
        let ready = false;
        const timeout = setTimeout(() => socket.destroy(), 1500);
        const parse = decoder((op, data) => {
          if (op === 3) socket.write(frame(4, data));
          if (op === 2) socket.destroy();
          if (data.cmd === 'SET_ACTIVITY' && data.evt !== 'ERROR') this.report('Discord accepted activity');
          if (data.evt === 'ERROR') this.report(`Discord: ${data.data?.message ?? 'RPC error'}`);
          if (data.evt === 'READY') {
            ready = true; clearTimeout(timeout); this.ready = true;
            this.report('Discord connected'); this.publish(); resolve(true);
          }
        });
        socket.on('connect', () => socket.write(frame(0, {v:1, client_id:this.clientId})));
        socket.on('data', data => { try { parse(data); } catch { socket.destroy(); } });
        socket.on('error', () => {});
        socket.on('close', () => {
          clearTimeout(timeout); this.ready = false;
          if (ready && !this.stopped) this.retry();
          resolve(false);
        });
      });
      if (connected) return;
    }
    if (!this.stopped) this.retry();
  }
  retry() {
    this.report('Waiting for Discord desktop…');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.connect(), 5000);
    this.timer.unref();
  }
  publish() {
    if (this.ready && !this.stopped) this.socket.write(frame(1, {
      cmd:'SET_ACTIVITY', args:{pid:process.pid, activity:this.activity()}, nonce:randomUUID()
    }));
  }
  stop() {
    this.stopped = true; clearTimeout(this.timer);
    const socket = this.socket;
    if (!socket) return;
    if (this.ready) {
      socket.end(frame(1, {cmd:'SET_ACTIVITY',args:{pid:process.pid,activity:null},nonce:randomUUID()}));
      const cleanup = setTimeout(()=>socket.destroy(),500);
      cleanup.unref(); socket.once('close',()=>clearTimeout(cleanup));
    } else socket.destroy();
    this.ready = false;
  }
}
