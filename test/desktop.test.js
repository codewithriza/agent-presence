import {test} from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,writeFile,readFile,appendFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {frame,decoder} from '../src/rpc.js';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn) {for(let i=0;i<80;i++){if(await fn())return;await wait(100);}throw new Error('Timed out');}
test('background desktop monitor publishes, transitions, and stops',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'ship-live-'));const stateDir=path.join(root,'state');const session=path.join(root,'chat.jsonl');
 const activities=[];const sockets=new Set();
 const server=net.createServer(socket=>{sockets.add(socket);socket.on('data',decoder((op,data)=>{
  if(op===0)socket.write(frame(1,{evt:'READY'}));
  if(data.cmd==='SET_ACTIVITY'){activities.push(data.args.activity);socket.write(frame(1,{cmd:data.cmd,nonce:data.nonce,data:{}}));}
 }));});
 await new Promise(r=>server.listen(path.join(root,'discord-ipc-0'),r));
 await writeFile(session,'{"type":"event_msg","payload":{"type":"task_started"}}\n');
 const invoke=(...args)=>execFileSync(process.execPath,['src/cli.js','desktop',...args,'--state-dir',stateDir],{encoding:'utf8',env:{...process.env,XDG_RUNTIME_DIR:root}});
 let started=false;
 try {
  invoke('start','--session',session,'--client-id','123456789012345678','--task','Public test','--hours','0.01');started=true;
  await until(()=>activities.some(a=>a?.assets?.large_text.includes('Working')));
  assert.throws(()=>invoke('start','--session',session,'--client-id','123456789012345678'));
  await appendFile(session,'{"type":"event_msg","payload":{"type":"task_complete"}}\n');
  await until(()=>activities.some(a=>a?.assets?.large_text.includes('Waiting for you')));
  const status=JSON.parse(invoke('status'));assert.equal(status.connection,'published');
  invoke('stop');await until(async()=>JSON.parse(await readFile(path.join(stateDir,'status.json'),'utf8')).running===false);started=false;
 } finally {
  if(started){invoke('stop');await wait(2500);}
  for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});
 }
});
