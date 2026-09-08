const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const axios = require('axios');
const {default: contactRouter} = require('../build/handlers/contact');

test('contact rejects abuse, keeps delivery private, and reports failures honestly', async () => {
  const keys = ['CONTACT_TO','CONTACT_FROM','BREVO_API_KEY','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','CONTACT_RATE_SECRET'];
  const oldEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  keys.forEach(key => process.env[key] = 'test-only');
  process.env.CONTACT_TO = 'owner@example.com';
  process.env.CONTACT_FROM = 'support@example.com';
  let calls = [], fail = false, hostname = 'shop.example.com', action = 'contact', globalLimit = false;
  const counts = new Map();
  const oldPost = axios.post;
  axios.post = async (url, body) => {
    calls.push({url, body});
    if (url.includes('siteverify')) return {data: {success: true, hostname, action}};
    if (fail) throw new Error('private provider detail');
    return {data: {messageId:'test-id'}};
  };
  const app = express();
  app.locals.contactLimits = {findOneAndUpdate: async ({_id}) => {
    const count = (counts.get(_id) || 0) + 1; counts.set(_id, count);
    return {count: globalLimit ? 999 : count};
  }};
  app.use('/contact', contactRouter('https://shop.example.com'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/contact';
  const body = {email:'visitor@example.com',reason:'Download problem',message:'Please help with my kit.',token:'test-token'};
  async function send(data = body, origin = 'https://shop.example.com') {
    return fetch(url, {method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
  }
  try {
    const config = await (await fetch(url+'/config')).json();
    assert.deepEqual(Object.keys(config), ['siteKey']);
    assert.equal((await send(body,'https://evil.example')).status,403);
    assert.equal((await send({...body,email:'x@example.com\r\nBcc: bad@example.com'})).status,400);
    assert.equal((await send({...body,reason:'arbitrary subject'})).status,400);
    assert.equal((await send({...body,message:'x'.repeat(20000)})).status,413);
    assert.equal((await send({...body,website:'spam'})).status,400);
    assert.equal(calls.length,0);
    hostname = 'evil.example'; assert.equal((await send()).status,400);
    hostname = 'shop.example.com'; action = 'other'; assert.equal((await send()).status,400);
    action = 'contact';
    assert.equal((await send({...body,to:'attacker@example.com'})).status,200);
    const delivered = calls.at(-1).body;
    assert.deepEqual(delivered.to,[{email:'owner@example.com'}]);
    assert.deepEqual(delivered.replyTo,{email:body.email});
    assert.equal(delivered.htmlContent,undefined);
    fail = true;
    const failure = await send(); assert.equal(failure.status,503);
    assert.ok(!(await failure.text()).includes('private provider'));
    fail = false;
    counts.clear();
    for(let i=0;i<5;i++) assert.equal((await send()).status,200);
    const previous = calls.length;
    assert.equal((await send()).status,429);
    assert.equal(calls.length,previous+1); // verification only; no sixth email
    globalLimit = true;
    assert.equal((await send()).status,429);
    delete process.env.BREVO_API_KEY;
    assert.equal((await send()).status,503);
    assert.equal((await fetch(url+'/config')).status,503);
  } finally {
    axios.post = oldPost;
    keys.forEach(key => { if(oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key]; });
    await new Promise(resolve => server.close(resolve));
  }
});
