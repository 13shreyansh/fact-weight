import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {createServer} from 'node:net';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
test('the Docker sponsor bootstrap actually starts the HTTP service',async()=>{
 const socket=createServer();await new Promise(ok=>socket.listen(0,'127.0.0.1',ok));const port=socket.address().port;await new Promise(ok=>socket.close(ok));
 const child=spawn(process.execPath,['scripts/sponsor-bootstrap.mjs'],{stdio:'ignore',env:{...process.env,PORT:String(port),HOST:'127.0.0.1',SIGNAL_DATA:fs.mkdtempSync(path.join(os.tmpdir(),'sf-boot-')),SIGNAL_SCHEDULER:'0',V2_SCHEDULER:'0'}});
 let health=null;try{for(let i=0;i<50;i++){try{const r=await fetch('http://127.0.0.1:'+port+'/api/health',{signal:AbortSignal.timeout(250)});if(r.ok){health=await r.json();break;}}catch{}if(child.exitCode!==null)break;await new Promise(ok=>setTimeout(ok,50));}assert.equal(health?.app,'Signal Fire');}finally{child.kill('SIGTERM');}
});
