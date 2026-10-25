// Installation is optional. This module never reads or writes workspace data.
export function startPWA({canRefresh = () => true} = {}) {
  const notice = document.querySelector('#pwa-notice');
  const dialog = document.querySelector('#pwa-dialog');
  if (!notice || !dialog) return;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let installPrompt = null, registration = null, refreshing = false, lastCheck = 0;
  let installed = standalone(), updateError = '', applying = false, offlineDismissed = false;

  function renderNotice() {
    const showOffline = !navigator.onLine && !offlineDismissed;
    notice.hidden = !showOffline && !registration?.waiting;
    notice.innerHTML = `${showOffline ? '<span><strong>Offline</strong> · Working from this device. Account sync and online features are paused.</span><button class="text-button" data-pwa-dismiss aria-label="Dismiss offline notice">Dismiss</button>' : ''}${registration?.waiting ? `<span><strong>App update ready.</strong> Your saved work will stay in place.</span><button class="button" data-pwa-update ${applying?'disabled':''}>${applying?'Checking open windows…':'Update app'}</button>` : ''}${updateError ? `<span class="pwa-update-error">${updateError}</span>` : ''}`;
  }
  function updateInstallLabels() {
    for (const button of document.querySelectorAll('[data-pwa-install]')) {
      button.disabled = installed;
      button.textContent = installed ? 'App installed' : 'Install app';
    }
  }
  function installHelp() {
    const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    dialog.innerHTML = `<h2 id="pwa-dialog-title">Install Faithful Repertoire</h2><p>Open your repertoire from its own home-screen or desktop icon.</p>${installed ? '<p>The app is already open in its installed window.</p>' : apple ? '<ol><li>Open this website in Safari.</li><li>Tap Share, then <strong>Add to Home Screen</strong> (you may need to scroll).</li><li>Leave <strong>Open as Web App</strong> on if shown, then tap Add.</li></ol>' : '<p>In Chrome or Edge, use the install icon beside the address bar, or open the browser menu and choose <strong>Install app</strong> / <strong>Install this site as an app</strong>.</p><p>On a Mac with Safari, choose <strong>File → Add to Dock</strong>. Other browsers may offer a home-screen shortcut instead.</p>'}<p class="muted">Install from the same browser you use for your repertoire. Some devices keep installed-app storage separate; sign in again if prompted. Browser-only work may need a backup transfer.</p><p class="muted">Once the app has finished downloading, it can reopen offline using work already saved on this device. Account sign-in, syncing, cloud history and account files need internet access. Installation does not download attachments.</p><button class="button" data-pwa-close>Close</button>`;
    dialog.showModal();
    dialog.querySelector('[data-pwa-close]').onclick = () => dialog.close();
  }
  async function install() {
    if (installed) return;
    if (!installPrompt) { installHelp(); return; }
    const prompt = installPrompt; installPrompt = null;
    try {
      await prompt.prompt();
      await prompt.userChoice; // Dismissal is not installation.
    } catch { installHelp(); }
  }
  async function applyUpdate() {
    updateError = '';
    if (!canRefresh()) {
      updateError = 'Save or finish editing before updating the app.';
      renderNotice(); return;
    }
    const waiting = registration?.waiting;
    if (!waiting) return;
    applying = true; renderNotice();
    const ready = await new Promise(resolve => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 5000);
      channel.port1.onmessage = event => {
        clearTimeout(timer); channel.port1.close(); resolve(event.data?.ready === true);
      };
      waiting.postMessage({type:'PWA_APPLY_UPDATE'}, [channel.port2]);
    });
    applying = false;
    if (!ready) updateError = 'Finish editing in other Faithful Repertoire windows, or close them, then try again.';
    renderNotice();
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-pwa-install]')) void install();
    if (event.target.closest('[data-pwa-update]')) void applyUpdate();
    if (event.target.closest('[data-pwa-dismiss]')) { offlineDismissed = true; renderNotice(); }
  });
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
  window.addEventListener('appinstalled', () => { installed = true; installPrompt = null; updateInstallLabels(); if (dialog.open) dialog.close(); });
  matchMedia('(display-mode: standalone)').addEventListener('change', () => { installed = standalone(); updateInstallLabels(); });
  // Main app renders replace their own subtree; keep install controls accurate.
  new MutationObserver(updateInstallLabels).observe(document.querySelector('#app'), {childList:true});
  async function checkUpdate() {
    renderNotice();
    if (registration && navigator.onLine && Date.now() - lastCheck > 60000) {
      lastCheck = Date.now();
      try { await registration.update(); } catch { /* Keep the installed shell. */ }
    }
  }
  window.addEventListener('online', () => { offlineDismissed = false; void checkUpdate(); });
  window.addEventListener('offline', renderNotice);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkUpdate(); });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'PWA_CAN_REFRESH') event.ports[0]?.postMessage(canRefresh());
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing || !canRefresh()) return;
      refreshing = true; location.reload();
    });
    // Local Node previews keep their existing live API/config behavior. Build
    // docs/ to test the installed static edition on localhost or HTTPS.
    if (document.documentElement.dataset.edition === 'static' && window.isSecureContext) {
      navigator.serviceWorker.register('./sw.js', {scope:'./',updateViaCache:'none'}).then(result => {
        registration = result; renderNotice();
        result.addEventListener('updatefound', () => {
          result.installing?.addEventListener('statechange', renderNotice);
        });
      }).catch(() => { /* Browser restrictions must not prevent normal app use. */ });
    }
  }
  renderNotice(); updateInstallLabels();
}
