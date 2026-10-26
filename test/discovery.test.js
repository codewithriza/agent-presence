import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,appendFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {SessionDiscovery,observeSession,selectSession} from '../src/discovery.js';
import {activity} from '../src/activity.js';
import {provider} from '../src/providers.js';
const record=(type,payload,timestamp)=>JSON.stringify({type,payload,timestamp})+'\n';
test('newly prompted chat wins; background completion never steals focus',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ship-chats-'));
 try {
  const a=path.join(dir,'a.jsonl'),b=path.join(dir,'b.jsonl');
  await writeFile(a,record('session_meta',{cwd:'/projects/alpha'})+record('event_msg',{type:'task_started'},'2026-01-01T01:00:00Z'));
  await writeFile(b,record('session_meta',{cwd:'/projects/beta'})+record('event_msg',{type:'task_started'},'2026-01-01T02:00:00Z'));
  const discovery=new SessionDiscovery(dir);
  assert.equal((await discovery.poll()).cwd,'/projects/beta');
  await appendFile(a,record('event_msg',{type:'task_complete'},'2026-01-01T03:00:00Z'));
  assert.equal((await discovery.poll()).cwd,'/projects/beta');
  await appendFile(a,record('event_msg',{type:'task_started'},'2026-01-01T04:00:00Z'));
  assert.equal((await discovery.poll()).cwd,'/projects/alpha');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('subagent logs cannot hijack public chat selection',()=>{
 const child={promptedAt:10};observeSession(child,{type:'session_meta',payload:{source:{subagent:{}}}});
 assert.equal(selectSession([child,{promptedAt:1,cwd:'parent'}]).cwd,'parent');
});
test('all branded providers have an image; custom tools remain supported',()=>{
 for(const tool of ['gemini','opencode','aider','goose','copilot','cursor-agent'])assert.ok(provider(tool).image.startsWith('https://'));
 assert.equal(provider('/usr/local/bin/my-agent').label,'my-agent');
 assert.equal(activity({tool:'opencode',file:'src/checkout.ts',project:'Store'}).details,'Changed checkout.ts');
 assert.equal(activity({tool:'opencode',file:'src/secret.ts',project:'Store',privateMode:true}).details,'Coding with OpenCode');
});
