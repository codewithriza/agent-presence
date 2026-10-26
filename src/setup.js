import os from 'node:os';
import path from 'node:path';
import {access} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {socketPaths} from './rpc.js';
export const defaultStateDir = () => path.join(os.homedir(),'.local','state','ship-signal');
export const defaultSessionsDir = () => path.join(process.env.CODEX_HOME || path.join(os.homedir(),'.codex'),'sessions');
export async function doctor() {
 console.log(`Ship Signal · Node ${process.versions.node} · ${process.platform}`);
 const paths=socketPaths();let found=false;
 if(process.platform==='win32') console.log('Discord: named-pipe detection requires launching a session (Windows is unverified).');
 else {for(const p of paths){try{await access(p);found=true;break;}catch{}}
 console.log(found ? 'Discord desktop: socket found' : 'Discord desktop: not detected. Open Discord before starting.');}
 try {await access(defaultSessionsDir());console.log('Codex sessions: found');}catch{console.log('Codex sessions: not found. Start a Codex chat first, or use terminal mode.');}
 console.log('Activity visibility: enable activity sharing in Discord settings. No Discord token needed.');
}
export async function setup() {
 console.log('\nShip Signal — put what you’re building on Discord.\n');
 await doctor();
 if(!process.stdin.isTTY){console.log('\nTerminal: ship-signal codex (or claude, gemini, opencode…)\nDesktop: ship-signal desktop start --auto\nStop: ship-signal desktop stop');return;}
 const rl=createInterface({input:process.stdin,output:process.stdout});
 try {
  console.log('\n1. Terminal agents — launch any tool through Ship Signal\n2. Codex desktop — follow the most recently prompted chat');
  const choice=(await rl.question('\nChoose [1/2] (default 1): ')).trim();
  if(choice==='2') {
   console.log('\nThis shows project folder names and changed source filenames from your Codex chats on Discord. It does not publish prompts or code contents. Runs for up to 8 hours.');
   if((await rl.question('Start now? [y/N]: ')).trim().toLowerCase()==='y'){
    const {desktop}=await import('./desktop.js');await desktop(['start','--auto']);
    console.log('Status: ship-signal desktop status\nStop: ship-signal desktop stop');
   }
  } else if(choice==='' || choice==='1') console.log('\nFrom your project folder, run:\n  ship-signal codex\n  ship-signal claude\n  ship-signal gemini\n\nOptional public product name:\n  ship-signal codex --project "My app"\n\nPass agent flags after --. Hide project/files with --private.');
  else throw new Error('Choose 1 or 2; run ship-signal setup again.');
 }finally{rl.close();}
}
