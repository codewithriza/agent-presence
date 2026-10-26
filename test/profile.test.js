import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activity} from '../src/activity.js';
import {validateProfile,loadProfile} from '../src/profile.js';
import {spawnSync} from 'node:child_process';
const profile=loadProfile('profiles/showcase.json');
const state={tool:'codex',project:'checkout',started:1000,profile};
test('showcase maps rich fields into Discord payload',()=>{
 const result=activity({...state,now:1001});
 assert.equal(result.assets.small_image,'agent_badge');
 assert.equal(result.assets.large_image,'codex');
 assert.equal(result.status_display_type,1);
 assert.equal(result.buttons.length,2);
 assert.equal(result.timestamps.end,4000);
});
test('expired focus returns to elapsed timer',()=>{
 assert.deepEqual(activity({...state,now:4000}).timestamps,{start:1000});
});
test('privacy suppresses all project-identifying rich fields',()=>{
 const result=activity({...state,now:1001,privateMode:true});
 for(const key of ['assets','buttons','details_url','state_url'])assert.equal(result[key],undefined);
 assert.equal(result.state,'Building');assert.equal(result.details,profile.task);
});
test('rejects invalid or misleading configurations',()=>{
 for(const value of [null,[],{type:'streaming'},{focusMinutes:0},{focusMinutes:1.5},{statusDisplay:'task'},{largeText:'Missing artwork'},{buttons:[{label:'a',url:'javascript:alert(1)'}]},{buttons:Array(3).fill({label:'a',url:'https://example.com'})},{largeImage:'/local/file.png'},{surprise:true}])assert.throws(()=>validateProfile(value));
});
test('supports external animated art and clickable fields',()=>{
 const p=validateProfile({largeImage:'https://example.com/art.gif',smallImage:'badge',stateUrl:'https://example.com',smallUrl:'https://example.com',type:'watching'});
 const result=activity({...state,profile:p});
 assert.equal(result.type,3);assert.equal(result.assets.large_image,p.largeImage);assert.equal(result.state_url,p.stateUrl);
});
test('invalid profile or focus fails before launching an agent',()=>{
 for(const flags of [['--profile','missing.json'],['--focus','NaN']]){
 const result=spawnSync(process.execPath,['src/cli.js','codex',...flags,'--preview'],{encoding:'utf8'});
 assert.equal(result.status,2);assert.match(result.stderr,/agent-presence/);
 }
});

test('main logo follows active agent',()=>{
 assert.equal(activity({...state,tool:'codex',profile:{}}).assets.large_image,'codex');
 assert.equal(activity({...state,tool:'claude',profile:{}}).assets.large_image,'claude-code');
 assert.equal(activity({...state,tool:'claude',profile:{}}).assets.large_text,'Claude Code');
});

test('member status shows only product or Building fallback',()=>{
 assert.equal(activity({...state,project:'Agent Presence',profile:{}}).state,'Agent Presence');
 assert.equal(activity({...state,project:'',profile:{}}).state,'Building');
 assert.equal(activity({...state,profile:{}}).status_display_type,1);
});
