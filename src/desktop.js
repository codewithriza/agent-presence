import {defaultStateDir,defaultSessionsDir} from './setup.js';
import {DEFAULT_CLIENT_ID} from './defaults.js';
import {spawn} from 'node:child_process';
import {watch} from 'node:fs';
import {mkdir,open,readFile,writeFile,rename,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {SessionDiscovery} from './discovery.js';
import {SessionTail,sessionIsActive} from './session.js';
import {activity,safeFile} from './activity.js';
import {loadProfile} from './profile.js';
import {Presence} from './rpc.js';

export async function desktop(args) {
  const command = args.shift();
  if(args.includes('--auto')) {args=args.filter(a=>a!=='--auto');args.push('--sessions-dir',defaultSessionsDir());}
  const options = {};
  for (let i=0;i<args.length;i+=2) {
    if (!['--state-dir','--session','--client-id','--task','--project','--profile','--hours','--watch','--sessions-dir','--project-map'].includes(args[i]) || !args[i+1]) throw new Error(`Invalid desktop option: ${args[i]}`);
    options[args[i].slice(2)] = args[i+1];
  }
  const dir = path.resolve(options['state-dir'] || defaultStateDir());
  const statusPath = path.join(dir,'status.json');
  if (command === 'status') {
    const status = JSON.parse(await readFile(statusPath,'utf8'));
    if (Date.now()-status.heartbeat > 15000 && status.running) { status.running = false; status.connection = 'stale'; }
    console.log(JSON.stringify(status,null,2)); return;
  }
  if (command === 'stop') {
    const status = JSON.parse(await readFile(statusPath,'utf8'));
    await writeFile(path.join(dir,'stop'),status.runId,{mode:0o600});
    console.log('Stop requested; the monitor will clear presence within two seconds.'); return;
  }
  if (command !== 'start' && command !== '_run') throw new Error('Use desktop start, status, or stop');
  if (!options.session && !options['sessions-dir']) throw new Error('Provide --session FILE or --sessions-dir DIR to follow chats');
  if (options.session && options['sessions-dir']) throw new Error('Choose one session or automatic chat switching');
  const session = options.session ? path.resolve(options.session) : undefined;
  if (session && !(await stat(session)).isFile()) throw new Error('Session must be a file');
  if (options['sessions-dir'] && !(await stat(path.resolve(options['sessions-dir']))).isDirectory()) throw new Error('Sessions directory must exist');
  if (options.watch && !(await stat(path.resolve(options.watch))).isDirectory()) throw new Error('--watch must be a directory');
  const profile = options.profile ? loadProfile(path.resolve(options.profile)) : {};
  const projectMap = options['project-map'] ? JSON.parse(await readFile(path.resolve(options['project-map']),'utf8')) : {};
  if (!projectMap || typeof projectMap !== 'object' || Array.isArray(projectMap) || Object.entries(projectMap).some(([k,v])=>!path.isAbsolute(k) || typeof v !== 'string' || !v.trim() || v.length>128)) throw new Error('Project map must map absolute folders to short public names');
  const clientId = options['client-id'] || process.env.DISCORD_CLIENT_ID || DEFAULT_CLIENT_ID;
  if (!/^\d{17,22}$/.test(clientId ?? '')) throw new Error('Provide --client-id or DISCORD_CLIENT_ID');
  const hours = Number(options.hours ?? 8);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) throw new Error('--hours must be > 0 and <= 24');
  await mkdir(dir,{recursive:true,mode:0o700});
  if (command === 'start') {
    const lock = await open(path.join(dir,'lock'),'wx',0o600).catch(()=>{throw new Error('Monitor lock exists. Check desktop status; stop the existing monitor before starting another.');});
    await lock.close();
    const log = await open(path.join(dir,'monitor.log'),'a',0o600);
    try {
      const serialized = Object.entries({...options,...(session ? {session} : {}),'state-dir':dir}).flatMap(([k,v])=>[`--${k}`,v]);
      const child = spawn(process.execPath,[fileURLToPath(new URL('./cli.js',import.meta.url)),'desktop','_run',...serialized],{detached:true,stdio:['ignore',log.fd,log.fd]});
      await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
      child.unref();
      console.log(`Started desktop monitor (PID ${child.pid}). Check: agent-presence desktop status --state-dir "${dir}"`);
    } catch(error) { await rm(path.join(dir,'lock'),{force:true}); throw error; }
    finally {await log.close();}
    return;
  }
  const runId = randomUUID();
  const state = {tool:'codex',task:options.task || profile.task || 'Building Agent Presence',project:options.project || profile.project || 'Agent Presence',started:Math.floor(Date.now()/1000),profile,phase:'Working'};
  const tail = session ? new SessionTail(session) : null;
  const discovery = options['sessions-dir'] ? new SessionDiscovery(path.resolve(options['sessions-dir'])) : null;
  const status = {runId,pid:process.pid,running:true,connection:'connecting',phase:state.phase,heartbeat:Date.now(),expiresAt:Date.now()+hours*3600000};
  const save = async()=>{ status.heartbeat=Date.now(); await writeFile(statusPath+'.tmp',JSON.stringify(status,null,2),{mode:0o600}); await rename(statusPath+'.tmp',statusPath); };
  let visible = false;
  const currentActivity = () => visible ? activity(state) : null;
  const rpc = new Presence(clientId,currentActivity,message=>{
    console.log(new Date().toISOString(),message);
    status.connection = message === 'Discord accepted activity' ? 'published' : message === 'Discord connected' ? 'connected' : message.startsWith('Discord:') ? 'error' : 'connecting';
    status.lastMessage = message;
  });
  let watcher;
  let watchedDirectory;
  function watchProject(directory) {
    if(directory === watchedDirectory)return;
    watcher?.close(); watcher = null; watchedDirectory = directory; state.file = undefined;
    if (!directory) return;
    try {
      watcher = watch(directory,{recursive:true},(_,file)=>{
        if (file && !path.resolve(directory,file).startsWith(dir + path.sep) && safeFile(file)) state.file = file;
      });
      watcher.on('error',error=>console.error('File watcher unavailable:',error.message));
    } catch(error) { console.error('File watcher unavailable:',error.message); }
  }
  if (options.watch) watchProject(path.resolve(options.watch));
  let activeFile;
  let stopped = false;
  for (const signal of ['SIGTERM','SIGINT','SIGHUP']) process.on(signal,()=>{stopped=true;});
  let previous;
  try {
    await save(); rpc.start();
    while (!stopped && Date.now()<status.expiresAt) {
      const stop = await readFile(path.join(dir,'stop'),'utf8').catch(()=>null);
      if (stop === runId) break;
      if (discovery) {
        const active = await discovery.poll();
        visible = sessionIsActive(active?.tail);
        if (active) {
          if (active.file !== activeFile) {
            activeFile = active.file; state.file = undefined;
            state.started = Math.floor(active.promptedAt/1000);
            state.project = options.project || projectMap[active.cwd] || (active.cwd ? path.basename(active.cwd) : 'Building');
            state.task = options.task || `Building ${state.project}`;
            watchProject(active.cwd);
          }
          state.phase = active.tail.phase;
        }
      } else {
        await tail.poll().catch(()=>{tail.caughtUp=false;});
        state.phase = tail.phase;
        visible = sessionIsActive(tail);
      }
      status.visible = visible;
      if (!visible) watchProject(undefined);
      else if (discovery) watchProject(discovery.sessions.get(activeFile)?.cwd);
      else if (options.watch) watchProject(path.resolve(options.watch));
      status.phase = state.phase; status.project = state.project;
      const payload = JSON.stringify(currentActivity());
      if (payload !== previous) {rpc.publish();previous=payload;}
      await save();
      await new Promise(resolve=>setTimeout(resolve,2000));
    }
  } finally {
    watcher?.close();rpc.stop();status.running=false;status.connection='stopped';await save();await rm(path.join(dir,'lock'),{force:true});
  }
}
