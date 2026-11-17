import { readFileSync } from 'node:fs';

function string(value, key, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${key} must be a nonempty string of at most ${max} characters`);
}
export function validateProfile(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('Profile must be a JSON object');
  const fields = {name:128,task:128,project:128,largeImage:256,smallImage:256,largeText:128,smallText:128,detailsUrl:512,stateUrl:512,largeUrl:512,smallUrl:512};
  const allowed = new Set([...Object.keys(fields),'buttons','statusDisplay','focusMinutes','type']);
  for (const key of Object.keys(p)) if (!allowed.has(key)) throw new Error(`Unknown profile field: ${key}`);
  for (const [key,max] of Object.entries(fields)) if (p[key] !== undefined) string(p[key],key,max);
  function url(value, key) {
    string(value,key,512);
    let parsed; try { parsed = new URL(value); } catch { throw new Error(`${key} must be an https URL`); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(`${key} must be an https URL without credentials`);
  }
  for (const key of ['detailsUrl','stateUrl','largeUrl','smallUrl']) if (p[key]) url(p[key],key);
  for (const key of ['largeImage','smallImage']) if (p[key]) {
    if (p[key].startsWith('https://')) url(p[key],key);
    else if (!/^[a-z0-9_-]+$/.test(p[key])) throw new Error(`${key} must be a lowercase uploaded asset key or https URL`);
  }
  for (const size of ['large','small']) if ((p[`${size}Text`] || p[`${size}Url`]) && !p[`${size}Image`]) throw new Error(`${size}Image is required for its hover text or URL`);
  if (p.buttons !== undefined) {
    if (!Array.isArray(p.buttons) || p.buttons.length > 2) throw new Error('Discord supports at most two buttons');
    for (const b of p.buttons) {
      if (!b || typeof b !== 'object') throw new Error('Each button needs label and url');
      string(b.label,'Button label',32); url(b.url,'Button URL');
    }
  }
  if (p.statusDisplay !== undefined && !['name','state','details'].includes(p.statusDisplay)) throw new Error('statusDisplay must be name, state, or details');
  if (p.type !== undefined && !['playing','listening','watching','competing'].includes(p.type)) throw new Error('type must be playing, listening, watching, or competing');
  if (p.focusMinutes !== undefined && (!Number.isInteger(p.focusMinutes) || p.focusMinutes < 1 || p.focusMinutes > 1440)) throw new Error('focusMinutes must be an integer from 1 to 1440');
  return p;
}
export function loadProfile(file) {
  try { return validateProfile(JSON.parse(readFileSync(file,'utf8'))); }
  catch (error) { throw new Error(`Invalid profile ${file}: ${error.message}`); }
}
