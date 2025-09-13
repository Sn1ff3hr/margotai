const test = require('node:test');
const assert = require('node:assert/strict');

test('cookie consent stores choice and hides banner', () => {
  const elements = {};
  const banner = {
    hidden: true,
    setAttribute(attr) { if(attr === 'hidden') this.hidden = true; },
    removeAttribute(attr) { if(attr === 'hidden') this.hidden = false; }
  };
  elements['cookieBanner'] = banner;
  function button(id) {
    elements[id] = {
      handler: null,
      addEventListener(ev, fn) { if(ev === 'click') this.handler = fn; },
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
    setItem: (k, v) => { store[k] = String(v); }
  };

  require('../cookie-consent.js');

  assert.strictEqual(banner.hidden, false);

  elements['acceptAllCookies'].click();
  assert.strictEqual(store['cookie-consent'], 'all');
  assert.strictEqual(banner.hidden, true);
});
