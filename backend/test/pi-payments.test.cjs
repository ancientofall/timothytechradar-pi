const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
process.env.PI_NETWORK_API_KEY = 'test-only-key';
const platform = require('../build/services/platformAPIClient').default;
const mount = require('../build/handlers/payments').default;

test('Pi U2A: verified pricing, ownership, retries, interrupted payments and delivery', async t => {
  const original = platform.defaults.adapter;
  const records = new Map(); let payment, failComplete = false, lostResponse = false, confirm = true, posts = [];
  const match = (r, q) => Object.entries(q).every(([k,v]) => r[k] === v);
  const orders = {
    findOne: async q => [...records.values()].find(r => match(r,q)) || null,
    find: q => ({ toArray: async () => [...records.values()].filter(r => match(r,q)) }),
    updateOne: async (q, op, options) => {
      let record = [...records.values()].find(r => match(r,q));
      if (!record && options?.upsert) { record = { ...q, ...op.$setOnInsert }; records.set(record._id, record); }
      if (record) Object.assign(record, op.$set || {});
    },
  };
  const fresh = (productId='ai_productivity_starter_kit_1', amount=3, name='AI Productivity Starter Kit') => {
    records.clear(); posts=[]; failComplete=false; lostResponse=false; confirm=true;
    payment = { identifier:'payment-1', user_uid:'owner', direction:'user_to_app', amount,
      memo:`Order ${name}`, metadata:{productId}, status:{developer_approved:false, developer_completed:false,
        transaction_verified:false, cancelled:false, user_cancelled:false}, transaction:null };
  };
  platform.defaults.adapter = async config => {
    assert.equal(config.baseURL, 'https://api.minepi.com');
    assert.equal(config.headers.Authorization, 'Key test-only-key');
    assert.match(config.url, /^\/v2\/payments\/payment-1(?:\/(approve|complete))?$/);
    if (config.method === 'post') {
      posts.push(config.url);
      if (config.url.endsWith('/approve')) payment.status.developer_approved = true;
      if (config.url.endsWith('/complete')) {
        if (failComplete) throw new Error('Pi unavailable');
        const {txid} = JSON.parse(config.data);
        assert.equal(txid, 'transaction-1');
        if (confirm) { payment.status.developer_completed=true; payment.status.transaction_verified=true;
          payment.transaction={txid,verified:true}; }
        if (lostResponse) throw new Error('response lost after completion');
      }
    }
    return { config, headers:{},status:200,statusText:'OK',data:structuredClone(payment) };
  };
  const app=express(); app.use(express.json());
  app.use((req,res,next)=>{ req.session={currentUser:req.get('x-test-user') ? {uid:req.get('x-test-user')} : null}; next(); });
  app.locals.orderCollection=orders; const router=express.Router(); mount(router); app.use('/payments',router);
  const server=app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}/payments`;
  const post=(action,body={paymentId:'payment-1'},user='owner')=>fetch(base+'/'+action,{method:'POST',headers:{'Content-Type':'application/json',...(user?{'x-test-user':user}:{})},body:JSON.stringify(body)});
  try {
    await t.test('all three kits approve and complete once across retries', async()=>{
      for(const [id,price,name] of [['ai_productivity_starter_kit_1',3,'AI Productivity Starter Kit'],['idea_ignition_kit_1',5,'Idea Ignition Kit'],['pi_nft_signal_field_guide_1',10,'Pi NFT Signal Field Guide']]) {
        fresh(id,price,name);
        assert.equal((await post('approve')).status,200); assert.equal((await post('approve')).status,200);
        assert.equal(records.size,1); assert.equal(posts.length,1); assert.equal([...records.values()][0].paid,false);
        assert.equal((await post('complete',{paymentId:'payment-1',txid:'transaction-1'})).status,200);
        assert.equal((await post('complete',{paymentId:'payment-1',txid:'transaction-1'})).status,200);
        assert.equal(posts.length,2); assert.equal([...records.values()][0].paid,true);
      }
    });
    await t.test('unauthenticated requests, ownership, price, memo, direction, cancellation and unknown products rejected',async()=>{
      fresh(); assert.equal((await post('approve',{},'')).status,401);
      assert.equal((await post('approve',undefined,'attacker')).status,400);
      for(const mutate of [p=>p.amount=0.01,p=>p.memo='free kit',p=>p.direction='app_to_user',p=>p.status.cancelled=true,p=>p.metadata.productId='__proto__']) {
        fresh(); mutate(payment); assert.equal((await post('approve')).status,400); assert.equal(records.size,0); assert.equal(posts.length,0);
      }
    });
    await t.test('failed/unverified completion cannot unlock downloads',async()=>{
      fresh(); await post('approve'); failComplete=true;
      assert.equal((await post('complete',{paymentId:'payment-1',txid:'transaction-1'})).status,502);
      assert.equal([...records.values()][0].paid,false);
      failComplete=false; confirm=false;
      assert.equal((await post('complete',{paymentId:'payment-1',txid:'transaction-1'})).status,409);
      assert.equal([...records.values()][0].paid,false);
    });
    await t.test('recovery ignores forged transaction URLs and verifies authoritative transaction',async()=>{
      fresh(); payment.status.developer_approved=true; payment.transaction={txid:'transaction-1',verified:true};
      assert.equal((await post('incomplete',{paymentId:'payment-1',payment:{transaction:{_link:'http://localhost/private',txid:'forged'}}})).status,200);
      assert.equal([...records.values()][0].paid,true);
      assert.equal((await post('complete',{paymentId:'payment-1',txid:'forged'})).status,409);
    });
    await t.test('completion with lost response is reconciled and cannot be cancelled by forged callback',async()=>{
      fresh(); lostResponse=true;
      assert.equal((await post('complete',{paymentId:'payment-1',txid:'transaction-1'})).status,200);
      assert.equal((await post('cancelled_payment')).status,409); assert.equal([...records.values()][0].paid,true);
    });
    await t.test('download access requires authoritative completion and preserves earlier purchase prices',async()=>{
      fresh(); await post('approve');
      const access = () => fetch(base+'/product-access?productId=ai_productivity_starter_kit_1',{headers:{'x-test-user':'owner'}});
      assert.deepEqual(await (await access()).json(),{hasAccess:false});
      await post('complete',{paymentId:'payment-1',txid:'transaction-1'});
      assert.deepEqual(await (await access()).json(),{hasAccess:true});
      payment.amount=1;
      assert.deepEqual(await (await access()).json(),{hasAccess:true});
      payment.status.cancelled=true;
      assert.deepEqual(await (await access()).json(),{hasAccess:false});
    });
    await t.test('cancellation and missing recovery transaction never grant access',async()=>{
      fresh(); assert.equal((await post('incomplete')).status,409); payment.status.user_cancelled=true;
      assert.equal((await post('cancelled_payment')).status,200);
      assert.equal([...records.values()][0].cancelled,true); assert.equal([...records.values()][0].paid,false);
    });
  } finally { platform.defaults.adapter=original; server.closeAllConnections(); await new Promise(r=>server.close(r)); }
});
