const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('order worker posts payload to API', async () => {
  const logs = {};
  const context = {
    fetch: async (url, opts) => { logs.url = url; logs.opts = opts; },
    CONFIG: { CLOUDFLARE_WORKER_URL: '', APPS_SCRIPT_URL: '' },
    console,
    self: {}
  };
  context.self.location = { origin: 'https://example.com' };
  context.self.importScripts = () => {};
  context.self.postMessage = msg => { logs.msg = msg; };
  context.self.addEventListener = (event, handler) => { context.onMessage = handler; };

  vm.createContext(context);
  const code = fs.readFileSync(path.join(__dirname, '..', 'order-worker.js'), 'utf8');
  vm.runInContext(code, context);

  await context.onMessage({ data: { hello: 'world' } });

  assert.strictEqual(logs.url, 'https://example.com/api/order');
  assert.strictEqual(logs.opts.method, 'POST');
  assert.deepStrictEqual(JSON.parse(logs.opts.body), { hello: 'world' });
  assert.strictEqual(logs.msg && logs.msg.ok, true);
});
