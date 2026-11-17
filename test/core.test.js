import {test} from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {frame,decoder,Presence} from '../src/rpc.js';
import {activity,safeFile} from '../src/activity.js';
test('fragmented and coalesced RPC frames',()=>{
 const received=[];const parse=decoder((...a)=>received.push(a));
 const bytes=Buffer.concat([frame(1,{text:'hello 🌍'}),frame(3,{ping:true})]);
 for(let i=0;i<bytes.length;i+=3)parse(bytes.subarray(i,i+3));
 assert.deepEqual(received,[[1,{text:'hello 🌍'}],[3,{ping:true}]]);
});
test('private activity hides project and filename',()=>{
 assert.equal(activity({tool:'claude',project:'secret',file:'auth.ts',privateMode:true,started:1}).state,'Building');
});
test('file filter',()=>{
 for(const f of ['node_modules/a.js','.env','.git/config','src/credentials.json'])assert.equal(safeFile(f),false);
 assert.equal(safeFile('src/checkout.tsx'),true);
});
test('offline preview',()=>{
 const out=execFileSync(process.execPath,['src/cli.js','codex','--task','Building checkout','--preview'],{encoding:'utf8'});
 assert.equal(JSON.parse(out).details,'Building checkout');
});
test('mock Discord handshake, presence and ping',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ship-'));const endpoint=path.join(dir,'rpc');const messages=[];const sockets=new Set();
 let resolve;const done=new Promise(r=>resolve=r);
 const server=net.createServer(socket=>{sockets.add(socket);socket.on('data',decoder((op,data)=>{
 messages.push([op,data]);if(op===0)socket.write(Buffer.concat([frame(1,{evt:'READY'}),frame(3,{ping:42})]));if(op===4)resolve();
 }));});
 await new Promise(r=>server.listen(endpoint,r));
 const rpc=new Presence('123456789012345678',()=>({details:'Test session'}),()=>{},[endpoint]);const timeout=setTimeout(resolve,2000);
 try{rpc.start();await done;assert.equal(messages[0][1].client_id,'123456789012345678');assert.equal(messages.find(([,d])=>d.cmd==='SET_ACTIVITY')[1].args.activity.details,'Test session');assert.deepEqual(messages.find(([op])=>op===4),[4,{ping:42}]);}
 finally{clearTimeout(timeout);rpc.stop();for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
