const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const { appStudioAuth } = require('../build/services/appStudioAuth');
const { validatePiSession } = require('../build/services/piSession');
const mount = require('../build/handlers/users').default;
const mountPayments = require('../build/handlers/payments').default;
const platform = require('../build/services/platformAPIClient').default;
test('verified identity, single exchange, restoration, logout and rejection', async () => {
  const original = appStudioAuth.defaults.adapter;
  const originalGet = platform.get, originalPost = platform.post;
  let storedOrder;
  platform.get = async () => ({ data: { identifier: 'payment-1', user_uid: 'trusted', direction: 'user_to_app',
    amount: 3, memo: 'Order AI Productivity Starter Kit', metadata: {productId: 'ai_productivity_starter_kit_1'}, status: {} } });
  platform.post = async () => ({data:{}});
  let calls = 0, mode = 'valid', saved;
  appStudioAuth.defaults.adapter = async config => {
    calls++;
    assert.equal(config.baseURL, 'https://backend.appstudio-u7cm9zhmha0ruwv8.piappengine.com');
    assert.equal(config.url, '/pi/auth/v1/login');
    assert.deepEqual(JSON.parse(config.data), { accessToken: 'test-token' });
    if (mode === 'invalid') throw { isAxiosError: true, response: { status: 401 } };
    if (mode === 'offline') throw new Error('offline');
    return { status: 200, statusText: 'OK', headers: {}, config,
      data: mode === 'malformed' ? { user: { uid: 'trusted' } } :
        { sessionToken: 'upstream-secret', user: { uid: 'trusted', username: 'Pioneer', roles: ['admin'] } } };
  };
  const app = express(); app.use(express.json());
  app.use(session({ secret: 'test-only-session-secret', resave: false, saveUninitialized: false }));
  app.use(validatePiSession);
  app.locals.userCollection = { updateOne: async (...args) => { saved = args; } };
  app.locals.orderCollection = {
    findOne: async () => storedOrder,
    updateOne: async (query, update) => { storedOrder = {...query, ...update.$setOnInsert}; },
  };
  const payments = express.Router(); mountPayments(payments); app.use('/payments', payments);
  const router = express.Router(); mount(router); app.use('/user', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/user`;
  const signin = body => fetch(base + '/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await signin({ uid: 'forged' })).status, 400); assert.equal(calls, 0);
    const response = await signin({ accessToken: 'test-token', uid: 'forged', username: 'admin', authResult: { user: { uid: 'forged' } } });
    assert.equal(response.status, 200);
    const expected = { user: { uid: 'trusted', username: 'Pioneer', roles: [] } };
    const signedIn = await response.json();
    assert.deepEqual(signedIn.user, expected.user);
    assert.match(signedIn.sessionToken, /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
    const bearer = { Authorization: `Bearer ${signedIn.sessionToken}` };
    assert.deepEqual(await (await fetch(base + '/session', { headers: bearer })).json(), expected);
    assert.equal(calls, 1);
    assert.deepEqual(saved[0], { uid: 'trusted' }); assert.deepEqual(saved[1].$set, expected.user);
    assert.equal(calls, 1);
    const approval = await fetch(base.replace('/user','/payments/approve'), {
      method:'POST', headers:{...bearer, 'Content-Type':'application/json'}, body:JSON.stringify({paymentId:'payment-1'})
    });
    assert.equal(approval.status, 200);
    assert.equal(storedOrder.user, 'trusted');
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const restored = await fetch(base + '/session', { headers: { cookie } });
    assert.equal(restored.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await restored.json(), expected); assert.equal(calls, 1);
    assert.equal((await fetch(base + '/session', { headers: { Authorization: 'Bearer test-token', uid: 'forged' } })).status, 401);
    assert.equal((await fetch(base + '/session', { headers: { Authorization: bearer.Authorization.slice(0,-1) + (bearer.Authorization.endsWith('0') ? '1' : '0') } })).status, 401);
    assert.equal((await fetch(base + '/signout', { headers: bearer })).status, 200);
    assert.deepEqual(await (await fetch(base + '/session', { headers: { cookie } })).json(), { user: null });
    assert.equal((await fetch(base + '/session', { headers: bearer })).status, 401);
    for (const [value, status] of [['invalid',401], ['malformed',503], ['offline',503]]) {
      mode = value; assert.equal((await signin({ accessToken: 'test-token' })).status, status);
    }
    assert.equal(calls, 4);
  } finally { platform.get = originalGet; platform.post = originalPost; appStudioAuth.defaults.adapter = original; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('legacy and expired session identities are rejected', async () => {
  for (const data of [{}, { piAuthVersion: 1, piAuthenticatedUntil: Date.now() - 1 }]) {
    const req = { get: () => undefined, session: { currentUser: { uid: 'untrusted' }, ...data } };
    await validatePiSession(req, {}, () => {}); assert.equal(req.session.currentUser, null);
  }
});
