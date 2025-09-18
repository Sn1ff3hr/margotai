const test = require('node:test');
const assert = require('node:assert/strict');
const Checkout = require('../checkout.js');

test('buildPayload sanitizes inputs and assembles cart items', () => {
  const inputs = {
    firstName: '  Jane\u200b ',
    lastName: '  Doe  ',
    idNumber: '  1234567890  ',
    phone: ' +593 99 123 4567 ',
    email: ' TEST@Example.COM ',
    address: '  Main St  '
  };
  const cleaned = {};
  Object.entries(inputs).forEach(([key, value]) => {
    cleaned[key] = Checkout.sanitizeString(value);
  });
  cleaned.phone = cleaned.phone.replace(/[^+\d]/g, '');
  cleaned.email = cleaned.email.toLowerCase();

  const cart = new Map([
    ['p1', 2],
    ['p2', 0]
  ]);
  const products = [
    { id: 'p1', name_en: ' Coffee ', name_es: ' Café ', desc_en: ' Fresh brew ', desc_es: ' Fresco ', price: 3.5 },
    { id: 'p2', name_en: ' Tea', name_es: ' Té', desc_en: 'Hot', desc_es: 'Caliente', price: 2 }
  ];
  const now = () => new Date('2024-01-01T00:00:00Z');

  const payload = Checkout.buildPayload({
    inputs: cleaned,
    products,
    cart,
    totalsFn: () => ({ sub: 7, tax: 1.05, del: 3, total: 11.05 }),
    lang: 'es',
    business: { name: ' Biz ', address: ' Addr ', city: ' Gye ', contact: ' +593 99 ' },
    delivery: { minutes: 45, fee: 3, included: true, display: '45 min' },
    gps: { lat: -2.17, lng: -79.92 },
    instructions: 'No onions\nPlease ring bell\u0007',
    now
  });

  assert.strictEqual(payload.lang, 'es');
  assert.strictEqual(payload.timestamp, '2024-01-01T00:00:00.000Z');
  assert.strictEqual(payload.customer.firstName, 'Jane');
  assert.strictEqual(payload.customer.phone, '+593991234567');
  assert.strictEqual(payload.cart.items.length, 1);
  assert.deepEqual(payload.cart.items[0], {
    id: 'p1',
    name: 'Café',
    desc: 'Fresco',
    qty: 2,
    unit: 3.5
  });
  assert.strictEqual(payload.cart.instructions.includes('No onions'), true);
  assert.strictEqual(payload.cart.instructions.includes('\u0007'), false);
  assert.strictEqual(payload.cart.subtotal, 7);
  assert.strictEqual(payload.business.name, 'Biz');
});

test('submitToEndpoints posts to Cloudflare when available', async () => {
  const payload = { hello: 'world' };
  const calls = [];
  const responses = await Checkout.submitToEndpoints(
    payload,
    { cloudflare: 'https://cf.example/order', appsScript: 'https://script.google/api' },
    async (url, opts) => {
      calls.push({ url, opts });
      return { ok: true };
    }
  );

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, 'https://cf.example/order');
  const body = JSON.parse(calls[0].opts.body);
  assert.strictEqual(body.hello, 'world');
  assert.strictEqual(body.apps_script_url, 'https://script.google/api');
  assert.strictEqual(responses[0].ok, true);
});

test('submitToEndpoints falls back to Apps Script when Cloudflare fails', async () => {
  const payload = { hello: 'world' };
  let attempt = 0;
  const calls = [];
  const responses = await Checkout.submitToEndpoints(
    payload,
    { cloudflare: 'https://cf.example/order', appsScript: 'https://script.google/api' },
    async (url, opts) => {
      calls.push(url);
      attempt += 1;
      if (attempt === 1) {
        throw new Error('network error');
      }
      return { ok: true };
    }
  );

  assert.deepStrictEqual(calls, ['https://cf.example/order', 'https://script.google/api']);
  assert.strictEqual(responses.at(-1).url, 'https://script.google/api');
  assert.strictEqual(responses.at(-1).ok, true);
});

test('submitToEndpoints reports lack of endpoints', async () => {
  const payload = { hello: 'world' };
  const responses = await Checkout.submitToEndpoints(payload, {}, async () => ({ ok: true }));
  assert.strictEqual(responses[0].ok, false);
  assert.strictEqual(responses[0].url, null);
});
