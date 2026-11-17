import path from 'node:path';
import {provider} from './providers.js';
const ignored = new Set(['node_modules','.git','.next','dist','build','coverage','.venv','vendor']);
export function safeFile(file) {
  const parts = file.split(/[\\/]/);
  return !parts.some(p => ignored.has(p) || p.startsWith('.') || /(?:secret|credential|token|password)/i.test(p)) && /\.(?:[cm]?[jt]sx?|py|rs|go|java|rb|php|html|css|scss|vue|svelte|md|json|ya?ml|toml|sql|sh|swift|kt|c|cpp|h)$/i.test(file);
}
export function activity({tool, task, project, file, started, privateMode, phase, profile = {}, now = Math.floor(Date.now()/1000)}) {
  const {label,image:toolImage} = provider(tool);
  const result = {
    type: {playing:0,listening:2,watching:3,competing:5}[profile.type ?? 'playing'],
    details: (!privateMode && file ? `Changed ${path.basename(file)}` : task || profile.task || `Coding with ${label}`).slice(0,128),
    state: (privateMode ? 'Building' : project || 'Building').slice(0,128),
    status_display_type: 1,
    timestamps:{start:started}, instance:false
  };
  if (profile.name) result.name = profile.name;
  if (profile.statusDisplay) result.status_display_type = {name:0,state:1,details:2}[profile.statusDisplay];
  const end = started + (profile.focusMinutes ?? 0) * 60;
  if (profile.focusMinutes && now < end) result.timestamps.end = end;
  // Private mode keeps the explicit task and branding name, but suppresses profile
  // artwork, hover text and outbound links, which may identify a private project.
  if (!privateMode) {
    const assets = toolImage ? {large_image:toolImage,large_text:[label,phase,task || profile.task,file ? `Changed ${path.basename(file)}` : null].filter(Boolean).join(' · ').slice(0,128)} : {};
    for (const [from,to] of Object.entries({largeImage:'large_image',smallImage:'small_image',largeText:'large_text',smallText:'small_text',largeUrl:'large_url',smallUrl:'small_url'})) {
      if (profile[from]) assets[to] = profile[from];
    }
    if (Object.keys(assets).length) result.assets = assets;
    if (profile.buttons?.length) result.buttons = profile.buttons.map(({label,url})=>({label,url}));
    if (profile.detailsUrl) result.details_url = profile.detailsUrl;
    if (profile.stateUrl) result.state_url = profile.stateUrl;
  }
  return result;
}
