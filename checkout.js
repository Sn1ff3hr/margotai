"use strict";
(function(root){

  function sanitizeString(value){
    if(typeof value !== "string") return "";
    return value.normalize("NFKC").replace(/\p{C}/gu, "").trim();
  }

  function sanitizeMultiline(value){
    if(typeof value !== "string") return "";
    return value.normalize("NFKC").replace(/[^\P{C}\n\r]/gu, "").replace(/\s+$/u, "").trim();
  }

  function pickInput(inputs, key){
    const source = inputs && inputs[key];
    if(typeof source === "string") return source;
    if(source && typeof source.value === "string") return source.value;
    return "";
  }

  function normaliseNumber(value){
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function buildPayload(options){
    if(!options || typeof options !== "object"){
      throw new TypeError("buildPayload requires an options object");
    }
    const {
      inputs = {},
      products = [],
      cart,
      totalsFn,
      lang = "en",
      business = {},
      delivery = {},
      gps = {},
      instructions = "",
      now
    } = options;

    const langCode = lang === "es" ? "es" : "en";
    const totals = typeof totalsFn === "function" ? totalsFn() : {};
    const cartMap = cart instanceof Map ? cart : new Map();
    const deliveryMinutes = normaliseNumber(delivery.minutes);
    const payload = {
      lang: langCode,
      timestamp: (typeof now === "function" ? now() : new Date()).toISOString(),
      business: {
        name: sanitizeString(business.name || ""),
        address: sanitizeString(business.address || ""),
        city: sanitizeString(business.city || ""),
        contact: sanitizeString(business.contact || "")
      },
      customer: {
        firstName: sanitizeString(pickInput(inputs, "firstName")),
        lastName: sanitizeString(pickInput(inputs, "lastName")),
        idNumber: sanitizeString(pickInput(inputs, "idNumber")),
        phone: sanitizeString(pickInput(inputs, "phone")),
        email: sanitizeString(pickInput(inputs, "email")).toLowerCase(),
        address: sanitizeString(pickInput(inputs, "address")),
        gps: {
          lat: Number.isFinite(gps.lat) ? gps.lat : null,
          lng: Number.isFinite(gps.lng) ? gps.lng : null
        },
        city: sanitizeString(options.customerCity || "")
      },
      delivery: {
        minutes: deliveryMinutes,
        fee: normaliseNumber(delivery.fee),
        included: Boolean(delivery.included),
        display: sanitizeString(delivery.display || "")
      },
      cart: {
        items: [],
        subtotal: normaliseNumber(totals.sub ?? totals.subtotal),
        vat: normaliseNumber(totals.tax ?? totals.vat),
        delivery: normaliseNumber(totals.del ?? totals.delivery),
        total: normaliseNumber(totals.total),
        instructions: sanitizeMultiline(instructions)
      }
    };

    if(Array.isArray(products)){
      products.forEach(product => {
        const id = product && product.id;
        if(!id) return;
        const quantity = cartMap.get(id) || 0;
        if(quantity <= 0) return;
        const name = langCode === "es" ? product.name_es : product.name_en;
        payload.cart.items.push({
          id,
          name: sanitizeString(name || ""),
          desc: sanitizeString(langCode === "es" ? product.desc_es : product.desc_en || ""),
          qty: quantity,
          unit: normaliseNumber(product.price)
        });
      });
    }

    return payload;
  }

  async function submitToEndpoints(payload, endpoints = {}, fetcher){
    if(!payload || typeof payload !== "object"){
      throw new TypeError("payload is required");
    }
    const fetchFn = typeof fetcher === "function" ? fetcher : root.fetch;
    if(typeof fetchFn !== "function"){
      throw new TypeError("A fetch implementation is required");
    }
    const { cloudflare, appsScript } = endpoints;
    const headers = { "Content-Type": "application/json" };
    const responses = [];

    if(cloudflare){
      try{
        const body = { ...payload, apps_script_url: appsScript || "" };
        const res = await fetchFn(cloudflare, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          credentials: "omit"
        });
        responses.push({ url: cloudflare, ok: !!(res && res.ok) });
        return responses;
      }catch(err){
        responses.push({ url: cloudflare, ok: false, error: err });
        if(!appsScript){
          const error = new Error("Cloudflare request failed");
          error.responses = responses;
          throw error;
        }
      }
    }

    if(appsScript){
      const res = await fetchFn(appsScript, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "omit"
      });
      responses.push({ url: appsScript, ok: !!(res && res.ok) });
      return responses;
    }

    responses.push({ url: null, ok: false, error: new Error("No endpoints configured") });
    return responses;
  }

  const api = { sanitizeString, buildPayload, submitToEndpoints };

  if(typeof module !== "undefined" && module.exports){
    module.exports = api;
  }else{
    root.Checkout = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
