const {test}=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs'); const path=require('node:path'); const {DatabaseSync}=require('node:sqlite');
const {applyMigrations}=require('./fixtures/operations-fixtures');

test('Express routes enforce trusted identity and replay durable writes', async t => {
  let express; try { express=require('express'); } catch { t.skip('Express is not installed'); return; }
  const {createOperationsModule}=require('../index'); const db=new DatabaseSync(':memory:');
  applyMigrations(db);
  const app=express(); app.use(express.json()); app.use((req,res,next)=>{if(req.headers.authorization==='test-operator') req.user={id:'op',role:'operator'}; if(req.headers.authorization==='test-user') req.user={id:'user',role:'user'}; next();});
  app.use('/api/v1',createOperationsModule({db}).router);
  const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
  t.after(async()=>{await new Promise(resolve=>server.close(resolve)); db.close();});
  const url=`http://127.0.0.1:${server.address().port}/api/v1/operations/resources`;
  const body=JSON.stringify({kind:'vehicle',hubId:'metro',attributes:{id:'http-vehicle'}});
  const call=(auth,headers={})=>fetch(url,{method:'POST',headers:{'content-type':'application/json',...auth && {authorization:auth},...headers},body});
  assert.equal((await call(null,{'x-user-role':'operator','x-user-id':'op','idempotency-key':'key'})).status,401);
  assert.equal((await call('test-user',{'x-user-role':'operator','idempotency-key':'key'})).status,403);
  assert.equal((await call('test-operator')).status,400);
  const first=await call('test-operator',{'idempotency-key':'key'}); const firstBody=await first.json(); assert.equal(first.status,201);
  const retry=await call('test-operator',{'idempotency-key':'key'}); assert.equal(retry.status,201); assert.deepEqual(await retry.json(),firstBody);
  assert.equal(db.prepare("SELECT count(*) AS n FROM electric_vehicles WHERE id='http-vehicle'").get().n,1);
});

test('trip incident endpoint rejects impersonation and preserves the active trip',async t=>{
 let express; try{express=require('express')}catch{t.skip('Express is not installed');return;}
 const {createOperationsModule}=require('../index'); const db=new DatabaseSync(':memory:');
 applyMigrations(db);
 const operations=createOperationsModule({db,tripReader:{getTrip:async id=>id==='trip'?{id:'trip',userId:'owner',vehicleId:'EB-024',status:'Active'}:null}});
 await operations.inventoryInterface.reserveVehicle('EB-024','reservation','metro');
 await operations.inventoryInterface.claimVehiclePickup('EB-024','reservation','metro');
 await operations.inventoryInterface.pickupVehicle('EB-024','trip','reservation','metro');
 const app=express();app.use(express.json());app.use((req,res,next)=>{if(req.headers.authorization)req.user={id:req.headers.authorization,role:'user'};next()});app.use('/api/v1',operations.router);
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))}); t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close()});
 const url=`http://127.0.0.1:${server.address().port}/api/v1/trips/trip/incidents`;
 const send=(actor,key)=>fetch(url,{method:'POST',headers:{'content-type':'application/json',authorization:actor,'x-user-id':'owner','idempotency-key':key},body:JSON.stringify({description:'flat tire',vehicleId:'forged'})});
 const forbidden=await send('other','wrong');assert.equal(forbidden.status,403);assert.equal(db.prepare('SELECT count(*) AS n FROM incidents').get().n,0);
 const accepted=await send('owner','right');assert.equal(accepted.status,201);const body=await accepted.json();assert.equal(body.data.resourceId,'EB-024');
 const vehicle=db.prepare("SELECT status,trip_id FROM electric_vehicles WHERE id='EB-024'").get();assert.equal(vehicle.status,'InUse');assert.equal(vehicle.trip_id,'trip');
});

test('Operations HTTP endpoints reject missing, null, and malformed request bodies with 400 INVALID_INPUT', async t => {
  let express; try { express = require('express'); } catch { t.skip('Express is not installed'); return; }
  const { createOperationsModule } = require('../index');
  const db = new DatabaseSync(':memory:');
  applyMigrations(db);
  const operations = createOperationsModule({
    db,
    tripReader: { getTrip: async () => ({ id: 'trip-1', userId: 'user-1', vehicleId: 'EB-024', status: 'Active' }) }
  });

  const app = express();
  app.use(express.json({ strict: false }));
  app.use((req, res, next) => {
    if (req.headers.authorization === 'operator') req.user = { id: 'op-1', role: 'operator' };
    else if (req.headers.authorization === 'user') req.user = { id: 'user-1', role: 'user' };
    next();
  });
  app.use('/api/v1', operations.router);
  app.use((err, req, res, next) => {
    const status = err.type === 'entity.parse.failed' ? 400 : err.type === 'entity.too.large' ? 413 : 500;
    const code = status === 500 ? 'INTERNAL_ERROR' : 'INVALID_INPUT';
    return res.status(status).json({ error: { code, message: status === 500 ? 'Unable to process the request.' : 'Invalid request body.', details: {} } });
  });

  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;

  let keyIndex = 0;
  const post = async (endpoint, auth, body) => {
    keyIndex++;
    return fetch(base + endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: auth,
        'idempotency-key': `neg-key-${keyIndex}`
      },
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  };

  const patch = async (endpoint, auth, body) => {
    keyIndex++;
    return fetch(base + endpoint, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: auth,
        'idempotency-key': `neg-key-${keyIndex}`
      },
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  };

  // 1. POST /operations/resources with null or empty body
  let res = await post('/operations/resources', 'operator', null);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_INPUT');

  res = await post('/operations/resources', 'operator', {});
  assert.equal(res.status, 400);
  assert.ok(['INVALID_INPUT', 'INVALID_RESOURCE_KIND'].includes((await res.json()).error.code));

  // 2. PATCH /operations/resources/:id with null body
  res = await patch('/operations/resources/EB-024', 'operator', null);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_INPUT');

  // 3. POST /transfers with null or empty body
  res = await post('/transfers', 'operator', null);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_INPUT');

  res = await post('/transfers', 'operator', { sourceHubId: 'metro' });
  assert.equal(res.status, 400);
  assert.ok(['INVALID_INPUT', 'INVALID_HUBS'].includes((await res.json()).error.code));

  // 4. POST /transfers/:id/arrive with null body
  res = await post('/transfers/trf-nonexistent/arrive', 'operator', null);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_INPUT');

  // 5. POST /transfers/:id/cancel with invalid non-object body
  res = await post('/transfers/trf-nonexistent/cancel', 'operator', 'invalid-string-body');
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_INPUT');

  // 6. POST /incidents/:id/handle with null body
  res = await post('/incidents/inc-nonexistent/handle', 'operator', null);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_INPUT');

  // 7. POST /incidents/:id/resolve with invalid non-object body
  res = await post('/incidents/inc-nonexistent/resolve', 'operator', 'invalid-string-body');
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_INPUT');

  // 8. POST /trips/:tripId/incidents with null body or missing description
  res = await post('/trips/trip-1/incidents', 'user', null);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_INPUT');

  res = await post('/trips/trip-1/incidents', 'user', {});
  assert.equal(res.status, 400);
  assert.ok(['INVALID_INPUT', 'INVALID_DESCRIPTION'].includes((await res.json()).error.code));
});
