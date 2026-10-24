/* Registered only by the production export; never by the Expo dev server. */
(() => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const base = new URL('./', document.currentScript.src);
  let registration;
  let reloadRequested = false;
  let prompt;

  function showUpdate() {
    if (prompt) return;
    prompt = document.createElement('button');
    prompt.type = 'button';
    prompt.textContent = 'Update available — Reload';
    prompt.setAttribute('aria-label', 'Update available. Reload Puppy Clicker');
    Object.assign(prompt.style, {
      position: 'fixed', bottom: 'max(16px, env(safe-area-inset-bottom))',
      left: '50%', transform: 'translateX(-50%)', zIndex: '10000',
      padding: '12px 20px', borderRadius: '24px', border: '1px solid #ffffff',
      background: '#171717', color: '#ffffff', font: '600 16px system-ui',
      cursor: 'pointer', maxWidth: 'calc(100% - 32px)',
    });
    prompt.addEventListener('click', () => {
      reloadRequested = true;
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    });
    document.body.appendChild(prompt);
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadRequested) window.location.reload();
    // Another tab may accept the update. This tab still waits for its user.
    else if (registration) showUpdate();
  });

  async function register() {
    try {
      registration = await navigator.serviceWorker.register(new URL('sw.js', base), {
        scope: base.pathname, updateViaCache: 'none',
      });
      if (registration.waiting && navigator.serviceWorker.controller) showUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
        });
      });
      // Check again when the installed app returns to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void registration.update().catch(() => {});
      });
    } catch (error) {
      console.warn('Offline support could not start; the app can still run online.', error);
    }
  }
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', register, { once: true });
})();
