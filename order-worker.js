self.addEventListener('message', async (e) => {
  const payload = e.data;
  if (!payload || typeof payload !== 'object') return;
  const url = self.CLOUDFLARE_WORKER_URL || self.APPS_SCRIPT_URL || (self.location.origin + '/api/order');
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
