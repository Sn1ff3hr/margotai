"use strict";

(function(){
  const worker = new Worker('order-worker.js');

  function sanitizeString(s){
    return typeof s === 'string' ? s.normalize('NFKC').trim().replace(/\p{C}/gu, '') : '';
  }

  function collectFields(){
    return {
      firstName: sanitizeString(document.getElementById('firstName')?.value || ''),
      lastName: sanitizeString(document.getElementById('lastName')?.value || ''),
      idNumber: sanitizeString(document.getElementById('idNumber')?.value || ''),
      phone: sanitizeString(document.getElementById('phone')?.value || ''),
      email: sanitizeString(document.getElementById('email')?.value || '').toLowerCase(),
      address: sanitizeString(document.getElementById('address')?.value || '')
    };
  }

  function collectOrder(){
    const order = { items: [], totals: {}, deliveryMinutes: window.deliveryMinutes || 0 };
    try {
      const lang = window.lang || 'en';
      if(Array.isArray(window.PRODUCTS) && window.cart instanceof Map){
        window.PRODUCTS.forEach(p => {
          const qty = window.cart.get(p.id);
          if(qty > 0){
            order.items.push({
              id: p.id,
              name: sanitizeString(lang === 'en' ? p.name_en : p.name_es),
              qty,
              price: p.price
            });
          }
        });
      }
      if(typeof window.totals === 'function'){
        order.totals = window.totals();
      }
    }catch(err){
      console.error('collectOrder failed', err);
    }
    return order;
  }

  function handlePay(){
    const payload = { customer: collectFields(), order: collectOrder() };
    worker.postMessage(payload);
  }

  worker.addEventListener('message', (e) => {
    if(!e.data?.ok){
      console.error('worker error', e.data.error);
    }
  });

  document.getElementById('confirmBtn')?.addEventListener('click', handlePay);
})();
