const {test}=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs'); const path=require('node:path'); const {DatabaseSync}=require('node:sqlite');

test('Express routes enforce trusted identity and replay durable writes', async t => {
  let express; try { express=require('express'); } catch { t.skip('Express is not installed'); return; }
  const {createOperationsModule}=require('../index'); const db=new DatabaseSync(':memory:');
  const base=path.resolve(__dirname,'../../../../db');
  for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0003_idempotency.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
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
