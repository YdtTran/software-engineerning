const {test}=require('node:test'); const assert=require('node:assert/strict');
const {scryptSync}=require('node:crypto'); const fs=require('node:fs'); const path=require('node:path'); const {DatabaseSync}=require('node:sqlite');
let createApp; try {({createApp}=require('../app'));} catch (err) {if(err.code!=='MODULE_NOT_FOUND') throw err;}

test('server-side demo sessions authenticate and authorize operations',async t=>{
 assert.equal(typeof createApp,'function','Express composition root must exist');
 const db=new DatabaseSync(':memory:'), base=path.resolve(__dirname,'../../db');
 for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0003_idempotency.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql'])db.exec(fs.readFileSync(path.join(base,f),'utf8'));
 const salt='0123456789abcdef0123456789abcdef'; const account=(username,id,roles,password)=>({username,id,roles,salt,passwordHash:scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex')});
 const app=createApp({db,secureCookies:false,demoAccounts:[account('rider','u',['User'],'rider-secret'),account('operator','o',['Operator'],'operator-secret')]});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close()});
 const origin=`http://127.0.0.1:${server.address().port}`, endpoint=origin+'/api/v1/operations/hubs';
 const login=(username,password)=>fetch(origin+'/api/v1/session',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({username,password})});
 assert.equal((await fetch(endpoint,{headers:{'x-user-id':'o','x-user-role':'operator'}})).status,401);
 assert.equal((await login('operator','wrong')).status,401);
 const user=await login('rider','rider-secret'); assert.equal(user.status,200); const userCookie=user.headers.get('set-cookie').split(';')[0];
 assert.equal((await fetch(endpoint,{headers:{cookie:userCookie,'x-user-role':'operator'}})).status,403);
 const operator=await login('operator','operator-secret'); assert.equal(operator.status,200); const cookie=operator.headers.get('set-cookie').split(';')[0];
 assert.equal((await fetch(endpoint,{headers:{cookie}})).status,200);
 assert.equal((await fetch(origin+'/api/v1/session',{method:'DELETE',headers:{cookie,origin}})).status,200);
 assert.equal((await fetch(endpoint,{headers:{cookie}})).status,401);
});

test('demo authentication rejects unprovisioned accounts and foreign origins',async t=>{
 assert.equal(typeof createApp,'function');
 assert.throws(()=>createApp({demoAccounts:[]}),/Provision/);
 const db=new DatabaseSync(':memory:'), salt='fedcba9876543210fedcba9876543210';
 const app=createApp({db,secureCookies:false,demoAccounts:[{username:'op',id:'o',roles:['operator'],salt,passwordHash:scryptSync('secret',Buffer.from(salt,'hex'),64).toString('hex')}]});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))}); t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close()});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const response=await fetch(origin+'/api/v1/session',{method:'POST',headers:{'content-type':'application/json',origin:'https://attacker.example'},body:JSON.stringify({username:'op',password:'secret'})});
 assert.equal(response.status,403); assert.equal(response.headers.get('set-cookie'),null);
 const malformed=await fetch(origin+'/api/v1/session',{method:'POST',headers:{'content-type':'application/json',origin},body:'{'});
 assert.equal(malformed.status,400); assert.equal((await malformed.json()).error.code,'INVALID_INPUT');
});

test('unknown endpoints use the API error envelope',async t=>{
 assert.equal(typeof createApp,'function'); const db=new DatabaseSync(':memory:'),salt='0123456789abcdef0123456789abcdef';
 const app=createApp({db,demoAccounts:[{username:'op',id:'o',roles:['operator'],salt,passwordHash:scryptSync('secret',Buffer.from(salt,'hex'),64).toString('hex')}]});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close()});
 const res=await fetch(`http://127.0.0.1:${server.address().port}/api/v1/not-a-route`);assert.equal(res.status,404);assert.equal((await res.json()).error.code,'NOT_FOUND');
});

test('cookie-authenticated writes require a same-origin request',async t=>{
 assert.equal(typeof createApp,'function');const db=new DatabaseSync(':memory:'),base=path.resolve(__dirname,'../../db');
 for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0003_idempotency.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql'])db.exec(fs.readFileSync(path.join(base,f),'utf8'));
 const salt='0123456789abcdef0123456789abcdef',app=createApp({db,secureCookies:false,demoAccounts:[{username:'op',id:'o',roles:['operator'],salt,passwordHash:scryptSync('secret',Buffer.from(salt,'hex'),64).toString('hex')}]});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close()});
 const origin=`http://127.0.0.1:${server.address().port}`,login=await fetch(origin+'/api/v1/session',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({username:'op',password:'secret'})});
 const cookie=login.headers.get('set-cookie').split(';')[0],url=origin+'/api/v1/operations/resources',body=JSON.stringify({kind:'vehicle',hubId:'metro',attributes:{id:'csrf-test'}});
 const send=extra=>fetch(url,{method:'POST',headers:{'content-type':'application/json',cookie,'idempotency-key':'k',...extra},body});
 assert.equal((await send({})).status,403);assert.equal((await send({origin:'https://attacker.example'})).status,403);
 assert.equal((await send({origin})).status,201);
});
