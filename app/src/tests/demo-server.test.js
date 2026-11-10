const {test}=require('node:test');const assert=require('node:assert/strict'); const {spawn}=require('node:child_process');
const {scryptSync}=require('node:crypto');const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
test('demo server starts with provisioned credentials and an initialized database',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'demo-server-'));const file=path.join(dir,'db.sqlite'),accounts=path.join(dir,'accounts.json');
 const db=new DatabaseSync(file),base=path.resolve(__dirname,'../../db');for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0003_idempotency.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql','migrations/0008_incident_isolation.sql','migrations/0009_transfer_slot_assignment.sql'])db.exec(fs.readFileSync(path.join(base,f),'utf8'));db.exec('PRAGMA user_version=9');db.close();
 const salt='0123456789abcdef0123456789abcdef';fs.writeFileSync(accounts,JSON.stringify([{username:'operator',id:'op',roles:['operator'],salt,passwordHash:scryptSync('secret',Buffer.from(salt,'hex'),64).toString('hex')}]),{mode:0o600});
 const child=spawn(process.execPath,[path.resolve(__dirname,'../demo-server.js')],{env:{...process.env,DEMO_ACCOUNTS_FILE:accounts,DEMO_DB_PATH:file,DEMO_PORT:'0',DEMO_INSECURE_HTTP:'1',NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{if(child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}fs.rmSync(dir,{recursive:true,force:true})});
 const output=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(new Error('server did not start')),5000);child.stdout.on('data',chunk=>{text+=chunk;if(text.includes('\n')){clearTimeout(timer);resolve(text)}});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(new Error(`server exited: ${code}`))})});
 const match=output.match(/127\.0\.0\.1:(\d+)/);assert.ok(match,output);const origin=`http://127.0.0.1:${match[1]}`;
 const login=await fetch(origin+'/api/v1/session',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({username:'operator',password:'secret'})});assert.equal(login.status,200);
 const res=await fetch(origin+'/api/v1/operations/hubs',{headers:{cookie:login.headers.get('set-cookie').split(';')[0]}});assert.equal(res.status,200);
});

test('demo account provisioning emits only a salted password hash',()=>{
 const {spawnSync}=require('node:child_process');const result=spawnSync(process.execPath,[path.resolve(__dirname,'../hash-demo-account.js'),'operator','op','operator'],{input:'secret-password\n',encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.ok(!result.stdout.includes('secret-password'));
 const [account]=JSON.parse(result.stdout);assert.equal(account.id,'op');assert.deepEqual(account.roles,['operator']);
 assert.equal(scryptSync('secret-password',Buffer.from(account.salt,'hex'),64).toString('hex'),account.passwordHash);
});
