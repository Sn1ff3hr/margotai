"use strict";

(function(){
  async function hashResponse(resp){
    const buf = await resp.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-384', buf);
    const hashArray = Array.from(new Uint8Array(hash));
    return btoa(String.fromCharCode(...hashArray));
  }

  async function verifyScript(el){
    const src = el.src;
    const expected = (el.integrity || '').split('-')[1];
    if(!src || !expected) return;
    try {
      const resp = await fetch(src, {integrity: el.integrity, cache: 'no-cache'});
      if(!resp.ok) return console.error('integrity fetch failed', src);
      const actual = await hashResponse(resp);
      if(actual !== expected){
        console.error('integrity mismatch', src);
      }
    } catch(err){
      console.error('integrity check error', err);
    }
  }

  window.addEventListener('load', () => {
    document.querySelectorAll('script[src][integrity][data-check]').forEach(verifyScript);
  });
})();
