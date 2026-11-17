import {readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {SessionTail} from './session.js';

export function observeSession(session, record) {
 const p=record.payload ?? {};
 if (record.type==='session_meta') {
  if(typeof p.cwd==='string') session.cwd=p.cwd;
  if(p.source && typeof p.source==='object' && p.source.subagent) session.subagent=true;
 }
 // Select by turn start, never token usage or background tool traffic.
 if (record.type==='event_msg' && p.type==='task_started') {
  session.promptedAt=Date.parse(record.timestamp) || 0;
 }
}
export function selectSession(sessions) {
 return [...sessions].filter(s=>s.promptedAt>0 && !s.subagent).sort((a,b)=>b.promptedAt-a.promptedAt)[0];
}
async function files(dir, depth=0) {
 if(depth>4)return [];
 const entries=await readdir(dir,{withFileTypes:true}).catch(()=>[]);
 const result=[];
 for(const e of entries) {
  const p=path.join(dir,e.name);
  if(e.isDirectory())result.push(...await files(p,depth+1));
  else if(e.isFile() && e.name.endsWith('.jsonl'))result.push(p);
 }
 return result;
}
export class SessionDiscovery {
 constructor(root) {this.root=root;this.sessions=new Map();this.lastScan=0;}
 async poll() {
  if(Date.now()-this.lastScan>5000) {
   const candidates=await Promise.all((await files(this.root)).map(async file=>({file,mtime:(await stat(file).catch(()=>({mtimeMs:0}))).mtimeMs})));
   const latest=candidates.sort((a,b)=>b.mtime-a.mtime).slice(0,32);
   const keep=new Set(latest.map(x=>x.file));
   for(const file of this.sessions.keys())if(!keep.has(file))this.sessions.delete(file);
   for(const {file} of latest)if(!this.sessions.has(file)) {
    const session={file,promptedAt:0,cwd:null};
    session.tail=new SessionTail(file,record=>observeSession(session,record));
    this.sessions.set(file,session);
   }
   this.lastScan=Date.now();
  }
  for(const session of this.sessions.values())await session.tail.poll().catch(()=>{session.tail.caughtUp=false;});
  return selectSession(this.sessions.values());
 }
}
