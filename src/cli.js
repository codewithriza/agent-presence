#!/usr/bin/env node
import {DEFAULT_CLIENT_ID} from './defaults.js';
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadProfile, validateProfile } from './profile.js';
import { Presence } from './rpc.js';
import { activity, safeFile } from './activity.js';

const args = process.argv.slice(2);
if (args[0] === 'setup' || args[0] === 'doctor') {
  try { const commands = await import('./setup.js'); await commands[args[0]](); }
  catch (error) { console.error(`[ship-signal] ${error.message}`); process.exitCode = 2; }
} else if (args[0] === 'desktop') {
  try { const {desktop} = await import('./desktop.js'); await desktop(args.slice(1)); }
  catch (error) { console.error(`[ship-signal] ${error.message}`); process.exitCode = 2; }
} else {

const options = {};
let tool;
let childArgs = [];
for (let i=0; i<args.length; i++) {
  const arg = args[i];
  if (arg === '--') { childArgs = args.slice(i+1); break; }
  if (['--private','--preview','--help'].includes(arg)) options[arg.slice(2)] = true;
  else if (['--task','--project','--client-id','--profile','--focus'].includes(arg)) {
    if (!args[i+1] || args[i+1].startsWith('--')) { console.error(`Missing value for ${arg}`); process.exit(2); }
    options[arg.slice(2)] = args[++i];
  } else if (!tool && !arg.startsWith('-')) tool = arg;
  else { console.error(`Unknown argument: ${arg}. Use --help; pass agent arguments after --.`); process.exit(2); }
}
if (options.help || !tool) {
  console.log(`ship-signal — make your terminal sessions visible on Discord

  ship-signal setup
  ship-signal doctor
  ship-signal desktop start --auto
  ship-signal claude --task "Building checkout" -- --model sonnet
  ship-signal codex --task "Fixing auth" --private
  ship-signal codex --preview

Options:
  --client-id ID   Discord application ID (or DISCORD_CLIENT_ID)
  --task TEXT      Public label describing what you're working on
  --project NAME   Public project label (default: current folder)
  --profile FILE   Load artwork, links, buttons and display style from JSON
  --focus MINUTES  Show a countdown, then return to elapsed time (1–1440)
  --private        Hide project, files, artwork and links; task stays public
  --preview        Print presence JSON without launching the agent

Any executable is supported: gemini, opencode, aider, goose, copilot, cursor-agent, or a custom command.
Pass command arguments after --. Use --profile for custom artwork.

Requires Node 22+ and Discord desktop. Only one active wrapper is recommended.`);
  process.exit(options.help ? 0 : 2);
}
let profile;
try {
  profile = options.profile ? loadProfile(options.profile) : {};
  if (options.focus !== undefined) profile = validateProfile({...profile, focusMinutes:Number(options.focus)});
} catch (error) { console.error(`[ship-signal] ${error.message}`); process.exit(2); }
const state = {tool,task:options.task || profile.task,project:options.project || profile.project || path.basename(process.cwd()),started:Math.floor(Date.now()/1000),privateMode:options.private,profile};
if (options.preview) { console.log(JSON.stringify(activity(state),null,2)); process.exit(0); }
const clientId = options['client-id'] || process.env.DISCORD_CLIENT_ID || DEFAULT_CLIENT_ID;
if (!/^\d{17,22}$/.test(clientId ?? '')) { console.error('Set DISCORD_CLIENT_ID to your Discord application ID, or use --client-id ID. See README.md.'); process.exit(2); }
let lastMessage;
const rpc = new Presence(clientId, () => activity(state), message => {
  if (message !== lastMessage) console.error(`[ship-signal] ${message}`);
  lastMessage = message;
});
let watcher;
let dirty = false;
if (!options.private) {
  try {
    watcher = watch(process.cwd(), {recursive:true}, (_, filename) => {
      if (filename && safeFile(filename)) { state.file = filename; dirty = true; }
    });
    watcher.on('error', error => console.error(`[ship-signal] File watching unavailable: ${error.message}`));
  } catch (error) { console.error(`[ship-signal] File watching unavailable: ${error.message}`); }
}
let previousActivity = JSON.stringify(activity(state));
const timer = setInterval(() => {
  const next = JSON.stringify(activity(state));
  if (dirty || next !== previousActivity) { rpc.publish(); dirty = false; previousActivity = next; }
}, 15000);
timer.unref();
rpc.start();
const child = spawn(tool, childArgs, {stdio:'inherit',shell:false});
let finished = false;
function finish(code) {
  if (finished) return;
  finished = true; watcher?.close(); clearInterval(timer); rpc.stop(); process.exitCode = code;
}
child.on('error', error => { console.error(`[ship-signal] Could not launch ${tool}: ${error.message}`); finish(127); });
child.on('exit', (code, signal) => finish(code ?? (128 + (os.constants.signals[signal] ?? 1))));
for (const signal of ['SIGINT','SIGTERM','SIGHUP']) {
  process.on(signal, () => { if (!finished) child.kill(signal); });
}

}
