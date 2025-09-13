self.importScripts('config.js');

self.addEventListener('message', async (e) => {
  const payload = e.data;
  if (!payload || typeof payload !== 'object') return;
  const url = (CONFIG && (CONFIG.CLOUDFLARE_WORKER_URL || CONFIG.APPS_SCRIPT_URL)) || (self.location.origin + '/api/order');
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit'
    });
    self.postMessage({ ok: true });
  } catch (err) {
    self.postMessage({ ok: false, error: err.message });
  }
});
