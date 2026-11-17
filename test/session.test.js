import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,appendFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {SessionTail,sessionEvent,sessionIsActive,SESSION_LEASE_MS} from '../src/session.js';

test('only allowlisted lifecycle tags affect public state',()=>{
 assert.equal(sessionEvent({type:'event_msg',payload:{type:'task_started'}}),'Working');
 assert.equal(sessionEvent({type:'event_msg',payload:{type:'task_complete'}},'Working'),'Waiting for you');
 assert.equal(sessionEvent({type:'response_item',payload:{type:'message',content:'PRIVATE API KEY'}},'Working'),'Working');
});
test('tail handles partial writes and truncation without exposing content',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ship-tail-'));const file=path.join(dir,'chat.jsonl');
 try {
  await writeFile(file,'{"type":"event_msg","payload":{"type":"task_started"}}\n');
  const tail=new SessionTail(file);assert.equal(await tail.poll(),'Working');
  await appendFile(file,'{"type":"event_msg","payload":');assert.equal(await tail.poll(),'Working');
  await appendFile(file,'{"type":"task_complete"}}\n');assert.equal(await tail.poll(),'Waiting for you');
  await writeFile(file,'{"type":"event_msg","payload":{"type":"task_started"}}\n');assert.equal(await tail.poll(),'Working');
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('completed, stale, missing and partially replayed sessions stay hidden',()=>{
 const now = Date.now();
 const live = {phase:'Working',modifiedAt:now,caughtUp:true};
 assert.equal(sessionIsActive(live,now),true);
 assert.equal(sessionIsActive({...live,phase:'Waiting for you'},now),false);
 assert.equal(sessionIsActive({...live,modifiedAt:now-SESSION_LEASE_MS},now),false);
 assert.equal(sessionIsActive({...live,caughtUp:false},now),false);
 assert.equal(sessionIsActive(undefined,now),false);
});
