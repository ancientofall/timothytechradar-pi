import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compile = path => ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const catalog={}; vm.runInNewContext(compile('../src/products.ts'),{exports:catalog});
function setup({pending=false,failRecovery=false,failApproval=false}={}) {
  const calls=[]; let creations=0, initialized=false;
  const client={post:async(url,body)=>{
    calls.push([url,body]);
    if((failRecovery&&url.endsWith('incomplete')) || (failApproval&&url.endsWith('approve'))) throw Error('offline');
    return {data:{completed:true}};
  }};
  const pi={authenticate:async(scopes,cb)=>{
    assert.equal(initialized,true); assert.equal(JSON.stringify(scopes),'["username","payments"]');
    if(pending) cb({identifier:'old-payment',transaction:{_link:'untrusted'}});
  },createPayment:async(data,cb)=>{
    creations++; assert.equal(initialized,true); calls.push(['create',data]);
    await cb.onReadyForServerApproval('p1');
    if(!failApproval) await cb.onReadyForServerCompletion('p1','tx1');
  }};
  const exports={}; vm.runInNewContext(compile('../src/lib/piPayments.ts'),{exports,require:name=>{
    if(name==='./axiosClient') return {axiosClient:client};
    if(name==='./piSdk') return {getPiSdk:async()=>{await Promise.resolve();initialized=true;return pi;}};
    if(name==='../products')return catalog;
    throw Error(name);
  }});
  return {...exports,calls,get creations(){return creations;}};
}
test('all kit requests use catalog price, memo and metadata with backend approval/completion',async()=>{
  const state=setup();
  for(const p of catalog.products){
    assert.equal(await state.buyPiKit(p.id),true);
    const data=state.calls.filter(c=>c[0]==='create').at(-1)[1];
    assert.equal(JSON.stringify(data),JSON.stringify({amount:p.price,memo:`Order ${p.name}`,metadata:{productId:p.id}}));
  }
  assert.equal(state.creations,3);
  assert.equal(state.calls.filter(c=>c[0]==='/payments/complete').length,3);
});
test('incomplete payment is recovered without opening another charge',async()=>{
  const state=setup({pending:true}); assert.equal(await state.buyPiKit(catalog.products[0].id),true);
  assert.equal(state.creations,0);
  assert.equal(JSON.stringify(state.calls[0]),JSON.stringify(['/payments/incomplete',{paymentId:'old-payment'}]));
});
test('failed recovery blocks new payment and approval failure is surfaced',async()=>{
  const recovery=setup({pending:true,failRecovery:true});
  await assert.rejects(recovery.buyPiKit(catalog.products[0].id),/do not pay again/);
  assert.equal(recovery.creations,0);
  const approval=setup({failApproval:true});
  await assert.rejects(approval.buyPiKit(catalog.products[0].id),/do not pay again/);
});
