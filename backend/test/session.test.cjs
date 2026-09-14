const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const platform = require('../build/services/platformAPIClient').default;
const mount = require('../build/handlers/users').default;

test('restores only a verified Pi identity and never returns the access token', async () => {
  let currentUser = null;
  const original = platform.get;
  const app = express();
  app.use((req, res, next) => { req.session = { currentUser }; next(); });
  const router = express.Router(); mount(router); app.use('/user', router);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/user/session`;
  try {
    assert.deepEqual(await (await fetch(url)).json(), { user: null });
    currentUser = { uid: 'verified-user', accessToken: 'private-test-token' };
    platform.get = async () => ({ data: { uid: 'verified-user', username: 'Pioneer', roles: [] } });
    const result = await fetch(url);
    assert.equal(result.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await result.json(), { user: { uid: 'verified-user', username: 'Pioneer', roles: [] } });
    platform.get = async () => ({ data: { uid: 'different-user' } });
    assert.equal((await fetch(url)).status, 401);
    platform.get = async () => { throw new Error('network unavailable'); };
    assert.equal((await fetch(url)).status, 503);
  } finally { platform.get = original; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
