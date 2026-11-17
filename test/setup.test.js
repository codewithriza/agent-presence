import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('noninteractive setup gives instructions without starting a monitor',()=>{
 const r=spawnSync(process.execPath,['src/cli.js','setup'],{encoding:'utf8'});
 assert.equal(r.status,0);assert.match(r.stdout,/desktop start --auto/);assert.doesNotMatch(r.stdout,/Started desktop monitor/);
});
test('doctor explains activity visibility without needing credentials',()=>{
 const r=spawnSync(process.execPath,['src/cli.js','doctor'],{encoding:'utf8'});
 assert.equal(r.status,0);assert.match(r.stdout,/No Discord token needed/);
});
