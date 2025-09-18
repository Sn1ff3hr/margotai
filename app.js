"use strict";

(function(root){
  const { document, localStorage, navigator, alert } = root;
  const CONFIG = root.CONFIG || {};
  const Checkout = root.Checkout;

  if(!Checkout){
    console.error("Checkout module not found. Ensure checkout.js is loaded before app.js");
    return;
  }

  const {
    CLOUDFLARE_WORKER_URL = "",
    APPS_SCRIPT_URL = "",
    WHATSAPP_NUMBER = ""
  } = CONFIG;

  const BUSINESS = {
    name: "Marxia Cafe y Bocaditos",
    address: "Av. Principal y Calle A",
    city: "Guayaquil",
    contact: "+593 99 999 9999"
  };

  const VAT = 0.15;
  const DELIVERY_FEE = 3.00;
  const PRODUCTS = [
    { id: "p1", name_en: "Option 1", name_es: "Opción 1", price: 3.20, desc_en: "Tortilla, Chorizo, Fried Egg, Drink", desc_es: "Tortilla, Chorizo, Huevo frito, Bebida" },
    { id: "p2", name_en: "Option 2", name_es: "Opción 2", price: 2.70, desc_en: "Tortilla, Chorizo, Drink", desc_es: "Tortilla, Chorizo, Bebida" },
    { id: "p3", name_en: "Option 3", name_es: "Opción 3", price: 2.70, desc_en: "Tortilla, Fried Egg, Drink", desc_es: "Tortilla, Huevo frito, Bebida" },
    { id: "p4", name_en: "Option 4", name_es: "Opción 4", price: 6.40, desc_en: "Tortilla, Chorizo, Fried Egg, Drink (Large)", desc_es: "Tortilla, Chorizo, Huevo frito, Bebida (Grande)" },
    { id: "p5", name_en: "Option 5", name_es: "Opción 5", price: 2.25, desc_en: "Tortilla, Drink", desc_es: "Tortilla, Bebida" }
  ];

  const state = {
    lang: (localStorage.getItem("lang") === "es") ? "es" : "en",
    theme: deriveTheme(),
    cart: new Map(),
    deliveryMinutes: 45,
    gps: { lat: null, lng: null }
  };

  const dom = {};

  function deriveTheme(){
    const stored = localStorage.getItem("theme");
    if(stored === "light" || stored === "dark"){
      return stored;
    }
    if(root.matchMedia && root.matchMedia("(prefers-color-scheme: light)").matches){
      return "light";
    }
    return "dark";
  }

  function cacheDom(){
    dom.track = document.getElementById("track");
    dom.langBtn = document.getElementById("langBtn");
    dom.themeBtn = document.getElementById("themeBtn");
    dom.prev = document.getElementById("prev");
    dom.next = document.getElementById("next");
    dom.clearBtn = document.getElementById("clearBtn");
    dom.deliveryChips = document.getElementById("delTimes");
    dom.orderDialog = document.getElementById("orderDlg");
    dom.orderItems = document.getElementById("orderItems");
    dom.m_deliveryTime = document.getElementById("m_deliveryTime");
    dom.m_sub = document.getElementById("m_sub");
    dom.m_tax = document.getElementById("m_tax");
    dom.m_del = document.getElementById("m_del");
    dom.m_total = document.getElementById("m_total");
    dom.instructions = document.getElementById("instructions");
    dom.firstName = document.getElementById("firstName");
    dom.lastName = document.getElementById("lastName");
    dom.idNumber = document.getElementById("idNumber");
    dom.phone = document.getElementById("phone");
    dom.email = document.getElementById("email");
    dom.address = document.getElementById("address");
    dom.locBtn = document.getElementById("locBtn");
    dom.gpsNote = document.getElementById("gpsNote");
    dom.confirmBtn = document.getElementById("confirmBtn");
    dom.cancelBtn = document.getElementById("cancelBtn");
    dom.closeDlg = document.getElementById("closeDlg");
    dom.fabPay = document.getElementById("fabPay");
    dom.chatFab = document.getElementById("chatFab");
    dom.rateBtn = document.getElementById("rateBtn");
    dom.csatStars = document.querySelectorAll("#csatStars button");
    dom.csatFace = document.querySelector(".csat-face");
    dom.visitsToday = document.getElementById("visitsToday");
    dom.visitsMonth = document.getElementById("visitsMonth");
    dom.visitsYear = document.getElementById("visitsYear");
    dom.visitsChart = document.getElementById("visitsChart");
    dom.salesToday = document.getElementById("salesToday");
    dom.salesMonth = document.getElementById("salesMonth");
    dom.salesYear = document.getElementById("salesYear");
    dom.salesChart = document.getElementById("salesChart");
    dom.t_sub = document.getElementById("t_sub");
    dom.t_tax = document.getElementById("t_tax");
    dom.t_del = document.getElementById("t_del");
    dom.t_total = document.getElementById("t_total");
  }

  function t(en, es){
    return state.lang === "es" ? es : en;
  }

  function fmt(value){
    const num = Number(value) || 0;
    return `$${num.toFixed(2)}`;
  }

  function setPlaceholder(input){
    if(!input) return;
    const attr = state.lang === "es" ? "data-ph-es" : "data-ph-en";
    const ph = input.getAttribute(attr);
    if(ph !== null){
      input.setAttribute("placeholder", ph);
    }
  }

  function safePersist(key, value){
    try{
      localStorage.setItem(key, value);
    }catch(err){
      console.warn("Unable to persist preference", key, err);
    }
  }

  function syncLang(){
    document.querySelectorAll("[data-en]").forEach(el => {
      const value = el.getAttribute(state.lang === "es" ? "data-es" : "data-en");
      if(value !== null){
        el.textContent = value;
      }
    });
    document.querySelectorAll("[data-ph-en],[data-ph-es]").forEach(setPlaceholder);
    if(dom.langBtn){
      dom.langBtn.textContent = state.lang === "es" ? "EN" : "ES";
    }
    renderProducts();
    if(dom.orderDialog && dom.orderDialog.open){
      renderModal();
    }else{
      updateTotals();
      updateModalDeliveryLabel();
    }
  }

  function syncTheme(){
    document.documentElement.setAttribute("data-theme", state.theme);
    if(dom.themeBtn){
      dom.themeBtn.textContent = state.theme === "light" ? t("Dark", "Oscuro") : t("Light", "Claro");
    }
  }

  function createProductCard(product){
    const article = document.createElement("article");
    article.className = "product card";
    const name = state.lang === "es" ? product.name_es : product.name_en;
    const desc = state.lang === "es" ? product.desc_es : product.desc_en;
    const quantity = state.cart.get(product.id) || 0;
    article.innerHTML = `
      <div class="product-image">Product Image</div>
      <div class="product-title">${name}</div>
      <div class="product-desc">${desc}</div>
      <div class="product-price">${fmt(product.price)}</div>
      <div class="qty" aria-label="${t("Quantity", "Cantidad")} ${name}">
        <button type="button" data-dir="dec" aria-label="${t("Decrease", "Disminuir")}">−</button>
        <input type="text" inputmode="numeric" value="${quantity}" aria-label="${t("Quantity", "Cantidad")}" />
        <button type="button" data-dir="inc" aria-label="${t("Increase", "Aumentar")}">+</button>
      </div>`;
    const qtyBox = article.querySelector(".qty");
    const input = qtyBox.querySelector("input");
    qtyBox.addEventListener("click", event => {
      const button = event.target.closest("button[data-dir]");
      if(!button) return;
      const current = state.cart.get(product.id) || 0;
      const next = button.dataset.dir === "inc" ? current + 1 : current - 1;
      updateCartQuantity(product.id, next);
    });
    input.addEventListener("input", () => {
      const numeric = parseInt(input.value.replace(/\D+/g, ""), 10);
      const safeValue = Number.isFinite(numeric) ? Math.max(0, Math.min(999, numeric)) : 0;
      updateCartQuantity(product.id, safeValue);
    });
    return article;
  }

  function updateCartQuantity(id, value){
    const normalized = Math.max(0, Math.min(999, Number(value) || 0));
    if(normalized > 0){
      state.cart.set(id, normalized);
    }else{
      state.cart.delete(id);
    }
    renderProducts();
    if(dom.orderDialog && dom.orderDialog.open){
      renderModal();
    }else{
      updateTotals();
    }
  }

  function renderProducts(){
    if(!dom.track) return;
    dom.track.innerHTML = "";
    PRODUCTS.forEach(product => {
      const card = createProductCard(product);
      dom.track.appendChild(card);
    });
  }

  function totals(){
    let subtotal = 0;
    PRODUCTS.forEach(product => {
      const qty = state.cart.get(product.id) || 0;
      if(qty <= 0) return;
      subtotal += product.price * qty;
    });
    const tax = subtotal * VAT;
    const delivery = subtotal > 0 ? DELIVERY_FEE : 0;
    const total = subtotal + tax + delivery;
    return { subtotal, tax, delivery, total };
  }

  function updateTotals(){
    const { subtotal, tax, delivery, total } = totals();
    if(dom.t_sub) dom.t_sub.textContent = fmt(subtotal);
    if(dom.t_tax) dom.t_tax.textContent = fmt(tax);
    if(dom.t_del) dom.t_del.textContent = fmt(delivery);
    if(dom.t_total) dom.t_total.textContent = fmt(total);
    if(dom.m_sub) dom.m_sub.textContent = fmt(subtotal);
    if(dom.m_tax) dom.m_tax.textContent = fmt(tax);
    if(dom.m_del) dom.m_del.textContent = fmt(delivery);
    if(dom.m_total) dom.m_total.textContent = fmt(total);
  }

  function updateModalDeliveryLabel(){
    if(dom.m_deliveryTime){
      dom.m_deliveryTime.textContent = deliveryDisplay();
    }
  }

  function deliveryDisplay(){
    if(state.deliveryMinutes === 60) return t("1 hr", "1 hr");
    if(state.deliveryMinutes === 90) return t("1 hr 30 min", "1 hr 30 min");
    return t("45 min", "45 min");
  }

  function renderModal(){
    if(!dom.orderItems) return;
    dom.orderItems.innerHTML = "";
    const items = [];
    PRODUCTS.forEach(product => {
      const qty = state.cart.get(product.id) || 0;
      if(qty <= 0) return;
      const name = state.lang === "es" ? product.name_es : product.name_en;
      const desc = state.lang === "es" ? product.desc_es : product.desc_en;
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `
        <div>
          <strong>${name}</strong>
          <div class="muted" style="font-size:.9rem">${desc}</div>
        </div>
        <div class="inline-qty" data-id="${product.id}">
          <button type="button" data-dir="dec" aria-label="${t("Remove", "Quitar")}">−</button>
          <span>${qty}</span>
          <button type="button" data-dir="inc" aria-label="${t("Add", "Agregar")}">+</button>
        </div>`;
      items.push(row);
    });

    if(items.length === 0){
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = t("Your cart is empty.", "Su carrito está vacío.");
      dom.orderItems.appendChild(empty);
    }else{
      items.forEach(item => dom.orderItems.appendChild(item));
    }
    updateModalDeliveryLabel();
    updateTotals();
  }

  function handleModalQty(event){
    const target = event.target.closest("button[data-dir]");
    if(!target) return;
    const container = target.closest(".inline-qty");
    if(!container) return;
    const id = container.dataset.id;
    if(!id) return;
    const current = state.cart.get(id) || 0;
    const next = target.dataset.dir === "inc" ? current + 1 : current - 1;
    updateCartQuantity(id, next);
    renderModal();
  }

  function scrollByCards(direction){
    if(!dom.track) return;
    const sample = dom.track.querySelector(".product");
    const width = sample ? (sample.getBoundingClientRect().width + 16) : 300;
    dom.track.scrollBy({ left: direction * width, behavior: "smooth" });
  }

  function initCsat(){
    if(!dom.csatStars || dom.csatStars.length === 0) return;
    let rating = 0;
    const moods = ["😞", "🙁", "😐", "😄", "🤩"];

    const paint = value => {
      dom.csatStars.forEach((star, index) => {
        const active = index < value;
        star.textContent = active ? "★" : "☆";
        star.style.color = active ? "#ffd700" : "var(--muted)";
      });
      const moodIdx = value ? value - 1 : 2;
      if(dom.csatFace){
        dom.csatFace.textContent = moods[moodIdx];
      }
    };

    dom.csatStars.forEach((star, index) => {
      const value = index + 1;
      star.addEventListener("mouseenter", () => paint(value));
      star.addEventListener("focus", () => paint(value));
      star.addEventListener("mouseleave", () => paint(rating));
      star.addEventListener("blur", () => paint(rating));
      star.addEventListener("click", () => { rating = value; paint(rating); });
    });

    if(dom.rateBtn){
      dom.rateBtn.addEventListener("click", () => {
        alert(t("Thanks for rating!", "Gracias por calificar!"));
      });
    }

    paint(0);
  }

  function drawBarChart(canvas, data){
    if(!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    const max = Math.max(0, ...data);
    if(max <= 0) return;
    const gap = 10;
    const barWidth = width / data.length - gap;
    const color = getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#6f7dff";
    data.forEach((value, index) => {
      const barHeight = (value / max) * height;
      const x = index * (barWidth + gap) + gap / 2;
      const y = height - barHeight;
      ctx.fillStyle = color.trim() || "#6f7dff";
      ctx.fillRect(x, y, Math.max(0, barWidth), barHeight);
    });
  }

  function drawLineChart(canvas, data){
    if(!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    if(data.length === 0) return;
    const max = Math.max(0, ...data);
    if(max <= 0) return;
    const color = getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#6f7dff";
    const step = data.length > 1 ? width / (data.length - 1) : width;
    ctx.beginPath();
    data.forEach((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      if(index === 0){
        ctx.moveTo(x, y);
      }else{
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = color.trim() || "#6f7dff";
    ctx.lineWidth = 2;
    ctx.stroke();
    data.forEach((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color.trim() || "#6f7dff";
      ctx.fill();
    });
  }

  function setChatLink(){
    if(!dom.chatFab) return;
    const digits = String(WHATSAPP_NUMBER || "").replace(/[^\d]/g, "");
    if(digits){
      dom.chatFab.href = `https://wa.me/${digits}`;
    }else{
      dom.chatFab.removeAttribute("href");
      dom.chatFab.setAttribute("role", "button");
    }
  }

  function handleDeliveryChip(event){
    const chip = event.target.closest(".chip");
    if(!chip) return;
    document.querySelectorAll("#delTimes .chip").forEach(btn => btn.classList.remove("sel"));
    chip.classList.add("sel");
    const minutes = Number(chip.dataset.min);
    state.deliveryMinutes = minutes && Number.isFinite(minutes) ? minutes : 45;
    updateModalDeliveryLabel();
  }

  function openDialog(){
    renderModal();
    if(dom.orderDialog && typeof dom.orderDialog.showModal === "function"){
      dom.orderDialog.showModal();
    }
  }

  function closeDialog(){
    if(dom.orderDialog && dom.orderDialog.open){
      dom.orderDialog.close();
    }
  }

  function handleGeo(){
    if(!navigator.geolocation){
      alert(t("Geolocation not supported", "Geolocalización no soportada"));
      return;
    }
    let proceed = true;
    if(navigator.permissions && navigator.permissions.query){
      navigator.permissions.query({ name: "geolocation" }).then(permission => {
        if(permission.state === "denied"){
          alert(t("Location permission denied. Enable it in your device settings.", "Permiso de ubicación denegado. Actívelo en la configuración de su dispositivo."));
          proceed = false;
        }else if(permission.state === "prompt"){
          alert(t("Please allow location access when prompted.", "Permita el acceso a la ubicación cuando se le solicite."));
        }
        if(proceed){
          requestPosition();
        }
      }).catch(() => {
        alert(t("Please allow location access when prompted.", "Permita el acceso a la ubicación cuando se le solicite."));
        requestPosition();
      });
    }else{
      alert(t("Please allow location access when prompted.", "Permita el acceso a la ubicación cuando se le solicite."));
      requestPosition();
    }
  }

  function requestPosition(){
    navigator.geolocation.getCurrentPosition(position => {
      state.gps.lat = position.coords.latitude;
      state.gps.lng = position.coords.longitude;
      if(dom.gpsNote){
        dom.gpsNote.textContent = `GPS: ${state.gps.lat.toFixed(5)}, ${state.gps.lng.toFixed(5)}`;
      }
    }, error => {
      if(error.code === error.PERMISSION_DENIED){
        alert(t("Location permission required. Please allow access.", "Se requiere permiso de ubicación. Por favor permita el acceso."));
      }else{
        alert(t("Could not get location", "No se pudo obtener la ubicación"));
      }
    }, { enableHighAccuracy: true, timeout: 8000 });
  }

  function hasCartItems(){
    return PRODUCTS.some(product => (state.cart.get(product.id) || 0) > 0);
  }

  function gatherInputs(){
    return {
      firstName: dom.firstName ? dom.firstName.value : "",
      lastName: dom.lastName ? dom.lastName.value : "",
      idNumber: dom.idNumber ? dom.idNumber.value : "",
      phone: dom.phone ? dom.phone.value : "",
      email: dom.email ? dom.email.value : "",
      address: dom.address ? dom.address.value : ""
    };
  }

  function cleanInputs(rawInputs){
    const cleaned = {};
    Object.entries(rawInputs).forEach(([key, value]) => {
      cleaned[key] = Checkout.sanitizeString(value);
    });
    cleaned.email = cleaned.email.toLowerCase();
    cleaned.phone = cleaned.phone.replace(/[^+\d]/g, "");
    return cleaned;
  }

  function validateInputs(inputs){
    const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputs.email);
    const phoneOK = /^\+?593\d{9,10}$/.test(inputs.phone) || /^0\d{8,9}$/.test(inputs.phone);
    if(!inputs.firstName || !inputs.lastName || !inputs.idNumber || !inputs.address || !emailOK || !phoneOK){
      alert(t(
        "Please fill all fields with valid data (Name, Last name, Céd/RUC, EC phone, Email, Address).",
        "Complete todos los campos con datos válidos (Nombre, Apellido, Céd/RUC, teléfono EC, Correo, Dirección)."
      ));
      return false;
    }
    if(!hasCartItems()){
      alert(t("Your cart is empty.", "Su carrito está vacío."));
      return false;
    }
    return true;
  }

  function buildOrderPayload(cleanedInputs, instructionsRaw){
    return Checkout.buildPayload({
      inputs: cleanedInputs,
      products: PRODUCTS,
      cart: state.cart,
      totalsFn: totals,
      lang: state.lang,
      business: BUSINESS,
      delivery: {
        minutes: state.deliveryMinutes,
        fee: DELIVERY_FEE,
        included: true,
        display: deliveryDisplay()
      },
      gps: state.gps,
      instructions: instructionsRaw
    });
  }

  async function submitOrder(){
    const cleanedInputs = cleanInputs(gatherInputs());
    const instructionsRaw = dom.instructions ? dom.instructions.value : "";
    if(!validateInputs(cleanedInputs)){
      return;
    }

    const payload = buildOrderPayload(cleanedInputs, instructionsRaw);
    try{
      if(CLOUDFLARE_WORKER_URL || APPS_SCRIPT_URL){
        await Checkout.submitToEndpoints(payload, {
          cloudflare: CLOUDFLARE_WORKER_URL,
          appsScript: APPS_SCRIPT_URL
        });
      }
    }catch(error){
      console.warn("Backend request failed:", error);
    }

    const digits = String(WHATSAPP_NUMBER || "").replace(/[^\d]/g, "");
    const coords = payload.customer.gps || {};
    const maps = coords.lat && coords.lng ? `\nMaps: https://maps.google.com/?q=${coords.lat},${coords.lng}` : "";
    const lines = payload.cart.items.map(item => `• ${item.name} x${item.qty} = ${fmt(item.qty * item.unit)}`).join("\n");
    const message = `${t("Order", "Pedido")} – ${BUSINESS.name}\n\n${t("Customer", "Cliente")}: ${payload.customer.firstName} ${payload.customer.lastName}\nID: ${payload.customer.idNumber}\nTel: ${payload.customer.phone}\nEmail: ${payload.customer.email}\nDir: ${payload.customer.address}${maps}\n\n${t("Items Purchased", "Artículos")}\n${lines}\n\n${t("Delivery Time", "Tiempo de entrega")}: ${payload.delivery.display}\nSubtotal: ${fmt(payload.cart.subtotal)}\n${t("VAT 15%", "IVA 15%")}: ${fmt(payload.cart.vat)}\n${t("Delivery", "Entrega")}: ${fmt(payload.cart.delivery)}\n${t("Total", "Total")}: ${fmt(payload.cart.total)}\n\n${t("Instructions", "Instrucciones")}: ${payload.cart.instructions || "-"}`;

    if(digits){
      root.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    }
    closeDialog();
    alert(t("Order sent. We also opened WhatsApp with the details.", "Pedido enviado. También abrimos WhatsApp con los detalles."));
  }

  function clearCart(){
    state.cart.clear();
    renderProducts();
    updateTotals();
    renderModal();
  }

  function handleLangToggle(){
    state.lang = state.lang === "es" ? "en" : "es";
    safePersist("lang", state.lang);
    syncLang();
  }

  function handleThemeToggle(){
    state.theme = state.theme === "light" ? "dark" : "light";
    safePersist("theme", state.theme);
    syncTheme();
  }

  function handleConsentChange(){
    const storedLang = localStorage.getItem("lang");
    state.lang = storedLang === "es" ? "es" : "en";
    const storedTheme = localStorage.getItem("theme");
    if(storedTheme === "dark" || storedTheme === "light"){
      state.theme = storedTheme;
    }else{
      state.theme = deriveTheme();
    }
    syncLang();
    syncTheme();
  }

  function handleStorage(event){
    if(event.key === "lang" && event.newValue !== event.oldValue){
      state.lang = event.newValue === "es" ? "es" : "en";
      syncLang();
    }
    if(event.key === "theme" && event.newValue !== event.oldValue){
      state.theme = event.newValue === "light" ? "light" : "dark";
      syncTheme();
    }
  }

  function handleKeydown(event){
    if(event.key === "ArrowLeft") scrollByCards(-1);
    if(event.key === "ArrowRight") scrollByCards(1);
  }

  function initCharts(){
    const visitCounts = { today: 25, month: 600, year: 7200 };
    if(dom.visitsToday) dom.visitsToday.textContent = visitCounts.today;
    if(dom.visitsMonth) dom.visitsMonth.textContent = visitCounts.month;
    if(dom.visitsYear) dom.visitsYear.textContent = visitCounts.year;
    drawBarChart(dom.visitsChart, [visitCounts.today, visitCounts.month, visitCounts.year]);

    const salesCounts = { today: 12, month: 320, year: 2800 };
    if(dom.salesToday) dom.salesToday.textContent = salesCounts.today;
    if(dom.salesMonth) dom.salesMonth.textContent = salesCounts.month;
    if(dom.salesYear) dom.salesYear.textContent = salesCounts.year;
    drawLineChart(dom.salesChart, [salesCounts.today, salesCounts.month, salesCounts.year]);
  }

  function bindEvents(){
    dom.prev?.addEventListener("click", () => scrollByCards(-1));
    dom.next?.addEventListener("click", () => scrollByCards(1));
    dom.langBtn?.addEventListener("click", handleLangToggle);
    dom.themeBtn?.addEventListener("click", handleThemeToggle);
    dom.clearBtn?.addEventListener("click", event => { event.preventDefault(); clearCart(); });
    dom.deliveryChips?.addEventListener("click", handleDeliveryChip);
    dom.fabPay?.addEventListener("click", openDialog);
    dom.closeDlg?.addEventListener("click", closeDialog);
    dom.cancelBtn?.addEventListener("click", closeDialog);
    dom.locBtn?.addEventListener("click", handleGeo);
    dom.confirmBtn?.addEventListener("click", submitOrder);
    dom.orderItems?.addEventListener("click", handleModalQty);
    document.addEventListener("keydown", handleKeydown);
    root.addEventListener("cookie-consent-change", handleConsentChange);
    root.addEventListener("storage", handleStorage);
  }

  function init(){
    cacheDom();
    setChatLink();
    syncTheme();
    syncLang();
    initCsat();
    initCharts();
    bindEvents();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }

})(typeof globalThis !== "undefined" ? globalThis : window);
