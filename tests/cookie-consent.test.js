const test = require('node:test');
const assert = require('node:assert/strict');

function setup() {
  const elements = {};
  const banner = {
    hidden: true,
    removed: false,
    setAttribute(attr) { if (attr === 'hidden') this.hidden = true; },
    removeAttribute(attr) { if (attr === 'hidden') this.hidden = false; },
    remove() { this.removed = true; }
  };
  elements['cookieBanner'] = banner;

  function button(id) {
    elements[id] = {
      handler: null,
      addEventListener(ev, fn) { if (ev === 'click') this.handler = fn; },
      click() { this.handler && this.handler(); }
    };
  }
  button('acceptAllCookies');
  button('rejectAllCookies');
  button('acceptNecessaryCookies');

  const cookies = [];
  global.document = {
    getElementById: id => elements[id],
    get cookie() { return cookies.at(-1) || ''; },
    set cookie(val) { cookies.push(val); }
  };

  const store = {};
  global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear() { Object.keys(store).forEach(k => delete store[k]); }
  };

  const events = [];
  global.window = { dispatchEvent: evt => events.push(evt) };
  global.location = { protocol: 'https:' };
  global.CustomEvent = class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    }
  };

  // Reset require cache to run script again
  delete require.cache[require.resolve('../cookie-consent.js')];

  return { elements, banner, store, cookies, events };
}

test('cookie banner shows when no consent is stored', () => {
  const { banner } = setup();
  require('../cookie-consent.js');
  assert.strictEqual(banner.hidden, false, 'Banner should be visible');
  assert.strictEqual(banner.removed, false, 'Banner should not be removed');
});

test('acceptAllCookies sets consent to "all" and removes banner', () => {
  const { elements, banner, store, cookies, events } = setup();
  require('../cookie-consent.js');

  elements['acceptAllCookies'].click();

  const record = JSON.parse(store['cookie-consent']);
  assert.strictEqual(record.value, 'all', 'Consent should be "all"');
  assert.ok(record.timestamp, 'Timestamp captured');
  assert.strictEqual(banner.removed, true, 'Banner should be removed');
  assert.ok(cookies.some(c => c.includes('cookie-consent=all')), 'Cookie should record consent');
  assert.strictEqual(store['analytics-consent'], 'allowed');
  assert.strictEqual(events.at(-1)?.type, 'cookie-consent-change');
});

test('rejectAllCookies sets consent to "none" and removes banner', () => {
  const { elements, banner, store, cookies } = setup();
  global.localStorage.setItem('lang', 'es');
  global.localStorage.setItem('theme', 'dark');
  require('../cookie-consent.js');

  elements['rejectAllCookies'].click();

  const record = JSON.parse(store['cookie-consent']);
  assert.strictEqual(record.value, 'none', 'Consent should be "none"');
  assert.strictEqual(banner.removed, true, 'Banner should be removed');
  assert.ok(cookies.some(c => c.includes('cookie-consent=none')), 'Cookie should record rejection');
  assert.ok(!('lang' in store));
  assert.ok(!('theme' in store));
  assert.ok(!('analytics-consent' in store));
});

test('acceptNecessaryCookies sets consent to "necessary" and removes banner', () => {
  const { elements, banner, store, cookies } = setup();
  require('../cookie-consent.js');

  elements['acceptNecessaryCookies'].click();

  const record = JSON.parse(store['cookie-consent']);
  assert.strictEqual(record.value, 'necessary', 'Consent should be "necessary"');
  assert.strictEqual(banner.removed, true, 'Banner should be removed');
  assert.ok(cookies.some(c => c.includes('cookie-consent=necessary')));
  assert.ok(!('analytics-consent' in store));
});

test('cookie banner does not show when consent is already stored', () => {
  const { banner, store } = setup();
  store['cookie-consent'] = JSON.stringify({ value: 'all', timestamp: '2023-01-01T00:00:00.000Z' });

  require('../cookie-consent.js');

  assert.strictEqual(banner.hidden, true, 'Banner should remain hidden');
  assert.strictEqual(banner.removed, false, 'Banner should not be removed');
  assert.strictEqual(store['analytics-consent'], 'allowed');
});
