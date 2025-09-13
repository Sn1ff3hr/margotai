const test = require('node:test');
const assert = require('node:assert/strict');

test('order-collector posts sanitized data', () => {
  const elements = {};
  function input(id, value) {
    elements[id] = { value, addEventListener: () => {} };
  }
  function button(id) {
    elements[id] = {
      handlers: {},
      addEventListener(ev, fn) { this.handlers[ev] = fn; },
      click() { this.handlers['click'] && this.handlers['click'](); }
    };
  }
  input('firstName', ' John ');
  input('lastName', ' Doe ');
  input('idNumber', ' 123 ');
  input('phone', ' 555 ');
  input('email', ' TEST@Example.com ');
  input('address', ' Main St ');
  button('confirmBtn');

  global.document = { getElementById: id => elements[id] };

  const workerMessages = [];
  class FakeWorker {
    constructor() { this.messages = workerMessages; }
    postMessage(msg) { this.messages.push(msg); }
    addEventListener() {}
  }
  global.Worker = FakeWorker;

  global.window = {
    deliveryMinutes: 30,
    lang: 'en',
    cart: new Map([['p1', 2]]),
    PRODUCTS: [{ id: 'p1', name_en: 'Widget', name_es: 'Artilugio', price: 5 }],
    totals: () => ({ total: 10 })
  };

  require('../order-collector.js');

  elements['confirmBtn'].click();

  assert.deepStrictEqual(workerMessages[0], {
    customer: {
      firstName: 'John',
      lastName: 'Doe',
      idNumber: '123',
      phone: '555',
      email: 'test@example.com',
      address: 'Main St'
    },
    order: {
      items: [{ id: 'p1', name: 'Widget', qty: 2, price: 5 }],
      totals: { total: 10 },
      deliveryMinutes: 30
    }
  });
});
