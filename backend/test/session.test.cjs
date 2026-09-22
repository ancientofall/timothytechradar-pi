const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const { appStudioAuth } = require('../build/services/appStudioAuth');
const { validatePiSession } = require('../build/services/piSession');
const mount = require('../build/handlers/users').default;
test('verified identity, single exchange, restoration, logout and rejection', async () => {
  const original = appStudioAuth.defaults.adapter;
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
    assert.deepEqual(await response.json(), expected);
    assert.deepEqual(saved[0], { uid: 'trusted' }); assert.deepEqual(saved[1].$set, expected.user);
    assert.equal(calls, 1);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const restored = await fetch(base + '/session', { headers: { cookie } });
    assert.equal(restored.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await restored.json(), expected); assert.equal(calls, 1);
    assert.deepEqual(await (await fetch(base + '/session', { headers: { Authorization: 'Bearer test-token', uid: 'forged' } })).json(), { user: null });
    assert.equal((await fetch(base + '/signout', { headers: { cookie } })).status, 200);
    assert.deepEqual(await (await fetch(base + '/session', { headers: { cookie } })).json(), { user: null });
    for (const [value, status] of [['invalid',401], ['malformed',503], ['offline',503]]) {
      mode = value; assert.equal((await signin({ accessToken: 'test-token' })).status, status);
    }
    assert.equal(calls, 4);
  } finally { appStudioAuth.defaults.adapter = original; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('legacy and expired session identities are rejected', () => {
  for (const data of [{}, { piAuthVersion: 1, piAuthenticatedUntil: Date.now() - 1 }]) {
    const req = { session: { currentUser: { uid: 'untrusted' }, ...data } };
    validatePiSession(req, {}, () => {}); assert.equal(req.session.currentUser, null);
  }
});
