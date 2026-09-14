const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const express = require('express');
const axios = require('axios');
const { default: router, validateOrder, validateCapture, validProof } = require('../build/handlers/paypal');
const id = '11111111-1111-4111-8111-111111111111';
const token = 'a'.repeat(64);
const local = { _id: id, tokenHash: createHash('sha256').update(token).digest('hex'), productId: 'ai_productivity_starter_kit_1', amount: '9.99', paypalId: 'ORDER1', mode: 'sandbox' };
const remote = () => ({ id: 'ORDER1', intent: 'CAPTURE', status: 'COMPLETED', purchase_units: [{ reference_id: id, custom_id: local.productId, amount: { value: '9.99', currency_code: 'USD' }, payee: { merchant_id: 'MERCHANT' }, payments: { captures: [{ id: 'CAPTURE1' }] } }] });
const capture = () => ({ id: 'CAPTURE1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '9.99' }, supplementary_data: { related_ids: { order_id: 'ORDER1' } } });

test('rejects forged proof and changed payment details', () => {
  assert.equal(validProof(token, local.tokenHash), true);
  assert.equal(validProof('b'.repeat(64), local.tokenHash), false);
  assert.equal(validProof({ $ne: '' }, local.tokenHash), false);
  for (const change of [r => r.id = 'OTHER', r => r.purchase_units[0].amount.value = '0.01', r => r.purchase_units[0].amount.currency_code = 'EUR', r => r.purchase_units[0].payee.merchant_id = 'OTHER', r => r.purchase_units[0].custom_id = 'OTHER']) {
    const value = remote(); change(value); assert.throws(() => validateOrder(value, local, 'MERCHANT'));
  }
  for (const status of ['PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DECLINED']) assert.throws(() => validateCapture({ ...capture(), status }, local));
});

test('HTTP payment flow: origin, proof, retries, refund and Pi-session restrictions', async () => {
  Object.assign(process.env, { PAYPAL_ENABLED: 'true', PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: 'test', PAYPAL_CLIENT_SECRET: 'test', PAYPAL_MERCHANT_ID: 'MERCHANT' });
  let order = remote(), payment = capture(), captures = 0, verifiedWrites = 0;
  const originalPost = axios.post, originalRequest = axios.request;
  axios.post = async () => ({ data: { access_token: 'test' } });
  axios.request = async options => {
    if (options.method === 'POST' && options.url.endsWith('/capture')) {
      assert.equal(options.headers['PayPal-Request-Id'], id); captures++; order.status = 'COMPLETED'; return { data: order };
    }
    return { data: options.url.includes('/v2/payments/captures/') ? payment : order };
  };
  const app = express(); app.use(express.json());
  app.use((req, _, next) => { req.session = req.get('x-test-pi') ? { currentUser: { uid: 'pi-user' } } : {}; next(); });
  app.locals.paypalOrders = { findOne: async () => local, updateOne: async () => { verifiedWrites++; } };
  app.locals.contactLimits = { findOneAndUpdate: async () => ({ count: 1 }) };
  app.use('/paypal', router('https://shop.example'));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/paypal`;
  const request = (route, body = { id, token }, headers = {}) => fetch(url + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://shop.example', ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await request('/complete', { id, token }, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await request('/complete', { id, token: 'b'.repeat(64) })).status, 403);
    assert.equal((await request('/orders', {}, { 'x-test-pi': '1' })).status, 403);
    assert.equal((await request('/orders', { id, token, productId: '__proto__' })).status, 400);
    order.status = 'APPROVED'; order.purchase_units[0].amount.value = '0.01';
    assert.equal((await request('/complete')).status, 502); assert.equal(captures, 0);
    order = remote(); order.status = 'APPROVED';
    assert.equal((await request('/complete')).status, 200); assert.equal(captures, 1);
    assert.equal((await request('/complete')).status, 200); assert.equal(captures, 1);
    assert.equal(verifiedWrites, 2);
    payment.status = 'REFUNDED';
    assert.equal((await request('/download')).status, 502); assert.equal(verifiedWrites, 2);
    process.env.PAYPAL_ENABLED = 'false';
    assert.equal((await request('/complete')).status, 503);
  } finally { axios.post = originalPost; axios.request = originalRequest; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
