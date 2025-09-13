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

  global.document = { getElementById: id => elements[id] };

  const store = {};
  global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    clear() { Object.keys(store).forEach(k => delete store[k]); }
  };

  // Reset require cache to run script again
  delete require.cache[require.resolve('../cookie-consent.js')];

  return { elements, banner, store };
}

test('cookie banner shows when no consent is stored', () => {
  const { banner } = setup();
  require('../cookie-consent.js');
  assert.strictEqual(banner.hidden, false, 'Banner should be visible');
  assert.strictEqual(banner.removed, false, 'Banner should not be removed');
});

test('acceptAllCookies sets consent to "all" and removes banner', () => {
  const { elements, banner, store } = setup();
  require('../cookie-consent.js');

  elements['acceptAllCookies'].click();

  assert.strictEqual(store['cookie-consent'], 'all', 'Consent should be "all"');
  assert.strictEqual(banner.removed, true, 'Banner should be removed');
});

test('rejectAllCookies sets consent to "none" and removes banner', () => {
  const { elements, banner, store } = setup();
  require('../cookie-consent.js');

  elements['rejectAllCookies'].click();

  assert.strictEqual(store['cookie-consent'], 'none', 'Consent should be "none"');
  assert.strictEqual(banner.removed, true, 'Banner should be removed');
});

test('acceptNecessaryCookies sets consent to "necessary" and removes banner', () => {
  const { elements, banner, store } = setup();
  require('../cookie-consent.js');

  elements['acceptNecessaryCookies'].click();

  assert.strictEqual(store['cookie-consent'], 'necessary', 'Consent should be "necessary"');
  assert.strictEqual(banner.removed, true, 'Banner should be removed');
});

test('cookie banner does not show when consent is already stored', () => {
  const { banner, store } = setup();
  store['cookie-consent'] = 'all'; // Pre-set consent

  require('../cookie-consent.js');

  assert.strictEqual(banner.hidden, true, 'Banner should remain hidden');
  assert.strictEqual(banner.removed, false, 'Banner should not be removed');
});
