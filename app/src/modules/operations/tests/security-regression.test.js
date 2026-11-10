const { test } = require('node:test');
const assert = require('node:assert/strict');
const { OperationsController } = require('../api/operations-controller');

function response() {
  return { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
const controller = new OperationsController({});
test('operator endpoints require authenticated identity and ignore forged headers', () => {
  const res = response();
  assert.equal(controller.requireRole({ headers: { 'x-user-role': 'operator', 'x-user-id': 'forged' }, query: {} }, res, 'operator'), false);
  assert.equal(res.statusCode, 401);
});
test('authenticated user cannot become operator via header', () => {
  const res = response();
  assert.equal(controller.requireRole({ headers: { 'x-user-role': 'operator' }, user: { id: 'u', role: 'user' } }, res, 'operator'), false);
  assert.equal(res.statusCode, 403);
});
test('authenticated operator can access operator endpoints', () => {
  assert.equal(controller.requireRole({ headers: {}, user: { id: 'o', role: 'operator' } }, response(), 'operator'), true);
});
test('trip incident endpoint requires user role', () => {
  const res = response();
  assert.equal(controller.requireRole({headers:{},user:{id:'o',role:'operator'}},res,'user'),false);
  assert.equal(res.statusCode,403);
});
test('unexpected errors do not expose internal messages', () => {
  const {sendError}=require('../api/operations-controller'); const res=response();
  sendError(res,500,'SQLITE_ERROR','sensitive SQL detail');
  assert.equal(res.body.error.code,'INTERNAL_ERROR');
  assert.notEqual(res.body.error.message,'sensitive SQL detail');
});
test('actor identity comes only from authentication middleware', () => {
  const {extractActor}=require('../api/operations-controller');
  assert.deepEqual(extractActor({headers:{'x-user-id':'forged','x-actor-id':'forged','x-user-role':'operator'},query:{role:'operator'},user:{id:'actual',role:'user'}}),{actorId:'actual',role:'user'});
});
test('one authenticated account may hold both User and Operator roles', () => {
 const req={headers:{},user:{id:'dual',roles:['User','Operator']}};
 assert.equal(controller.requireRole(req,response(),'user'),true);
 assert.equal(controller.requireRole(req,response(),'operator'),true);
});
test('internal transfer creation requires an explicit actor', async () => {
 const {TransferService}=require('../application/transfer-service');
 const service=new TransferService({},{});
 await assert.rejects(service.createTransfer({sourceHubId:'a',destinationHubId:'b',vehicleIds:['v'],destinationSlotIds:['s']}),{code:'INVALID_REPORTER'});
});
test('internal equipment reports require an explicit trusted reporter', async () => {
 const {IncidentService}=require('../application/incident-service');
 const service=new IncidentService({},{client:{}});
 await assert.rejects(service.reportEquipmentIncident({resourceKind:'vehicle',resourceId:'v',description:'fault'}),{code:'INVALID_REPORTER'});
});
test('transfer domain does not invent an operator identity', () => {
 const {Transfer}=require('../domain/transfer');
 assert.throws(()=>new Transfer({id:'t',sourceHubId:'a',destinationHubId:'b',vehicleIds:['v'],destinationSlotIds:['s']}),{code:'INVALID_REPORTER'});
});
