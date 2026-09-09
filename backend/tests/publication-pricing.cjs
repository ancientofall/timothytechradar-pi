const assert = require('node:assert/strict');
const clientPath = require.resolve('../build/services/platformAPIClient');
let payment;
let approvals = 0;
require.cache[clientPath] = { id: clientPath, filename: clientPath, loaded: true, exports: {
  __esModule: true,
  default: { get: async () => ({ data: payment }), post: async () => { approvals++; } }
}};
const routes = {};
require('../build/handlers/payments').default({
  get: (paths, fn) => { for (const path of paths) routes[path] = fn; },
  post: (path, fn) => { routes[path] = fn; }
});
async function approve(productId, amount, payer = 'buyer') {
  payment = { metadata: { productId }, amount, user_uid: payer };
  let inserts = 0;
  const req = { session: { currentUser: { uid: 'buyer' } }, body: { paymentId: 'test' },
    app: { locals: { orderCollection: { insertOne: async () => { inserts++; } } } } };
  const res = { code: 200, status(n) { this.code = n; return this; }, json(value) { this.value = value; return this; } };
  await routes['/approve'](req, res);
  return { code: res.code, inserts };
}
(async () => {
  for (const [id, price, old] of [['ai_productivity_starter_kit_1',3,0.1],['idea_ignition_kit_1',5,0.1],['pi_nft_signal_field_guide_1',10,3]]) {
    assert.deepEqual(await approve(id, price), {code:200,inserts:1});
    assert.deepEqual(await approve(id, old), {code:400,inserts:0});
    assert.deepEqual(await approve(id, price, 'someone-else'), {code:400,inserts:0});
  }
  for (const id of ['missing','__proto__','constructor']) assert.deepEqual(await approve(id,3),{code:400,inserts:0});
  assert.equal(approvals,3);
  // A previously completed lower-price purchase must retain download access.
  payment = {metadata:{productId:'ai_productivity_starter_kit_1'},amount:0.1,user_uid:'buyer',
    status:{developer_completed:true,transaction_verified:true}};
  const req = {path:'/product-download',query:{productId:'ai_productivity_starter_kit_1'},
    session:{currentUser:{uid:'buyer'}},app:{locals:{orderCollection:{find:()=>({toArray:async()=>[{pi_payment_id:'old'}]})}}}};
  let download;
  const res = {setHeader(){},download(file,name){download={file,name};},status(n){throw Error('Unexpected status '+n);}};
  await routes['/product-download'](req,res);
  assert.equal(download.name,'AI_Productivity_Starter_Kit.zip');
  assert.ok(download.file.endsWith('AI_Productivity_Starter_Kit.zip'));
  console.log('Passed: current prices accepted; old prices, wrong payer, and unknown products rejected; previous buyer retains download access.');
})().catch(err=>{console.error(err);process.exitCode=1;});
