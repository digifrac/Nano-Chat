// Nano Chat - shared chat core. Used by the operator console (console.js) and
// the visitor widget (widget.js). Plain JavaScript, no framework. All it does
// is shuttle small JSON messages to signal.php over plain HTTPS and poll for
// replies - no WebRTC, no relay, no database.

'use strict';

const NC = (() => {
  // signal.php sits next to whichever page loaded core.js
  const BASE = (window.NANO_CALL_BASE || '');
  const SIGNAL_URL = BASE + 'signal.php';
  const POLL_MS = 2500;            // how often we ask the server for new messages

  // per-browser token so a reload is not mistaken for someone else
  const TOKEN_KEY = 'nano-call.token';
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) { token = crypto.randomUUID(); localStorage.setItem(TOKEN_KEY, token); }

  let myName = null;               // our handle once registered
  let role = null;                 // 'host' (operator) | 'guest' (visitor)
  let openChat = null;             // operator: which visitor thread is open
  let pollTimer = null, hooks = {};

  const normName = (s) =>
    String(s).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').slice(0, 40);

  async function api(body) {
    const res = await fetch(SIGNAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, token, me: body.me ?? myName }),
    });
    if (!res.ok) throw new Error('http ' + res.status);
    return res.json();
  }

  async function getConfig() {
    const out = await api({ action: 'config' });
    return out.config || {};
  }

  // ---------- registration ----------
  // operator: password-gated, goes online as the business handle
  async function registerHost(name, password) {
    myName = null; role = null;
    const out = await api({ action: 'register-host', me: name, password });
    if (out.registered) { myName = out.registered; role = 'host'; }
    return out;
  }
  // visitor: open (or re-open) a throwaway conversation with the business
  async function startChat(name, business, subject, text) {
    myName = name; role = 'guest';
    const out = await api({ action: 'start', me: name, subject, text });
    if (out.error) { myName = null; role = null; }
    return out;
  }

  // ---------- poll loop ----------
  function startPolling() { stopPolling(); pollTimer = setInterval(poll, POLL_MS); poll(); }
  function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }

  async function poll() {
    if (!myName) return;
    let out;
    try { out = await api({ action: 'poll', chat: role === 'host' ? openChat : undefined }); hooks.onNet && hooks.onNet(true); }
    catch { hooks.onNet && hooks.onNet(false); return; }
    if (out.error === 'name-taken' || out.error === 'not-host') {
      stopPolling(); const was = role; myName = null; role = null;
      hooks.onTakenOver && hooks.onTakenOver(was); return;
    }
    if (role === 'host') { hooks.onQueue && hooks.onQueue(out.chats || [], out.thread || null); }
    else { hooks.onThread && hooks.onThread(out.messages || [], out.status || 'open', out.operatorOnline !== false, out.closedBy || ''); }
  }

  // ---------- messaging ----------
  // operator passes the visitor's chat id; visitor omits it (writes their own)
  async function send(text, chatId) {
    return api({ action: 'send', text, chat: chatId });
  }
  async function close(chatId) {
    return api({ action: 'close', chat: chatId });
  }
  // operator only: delete one chat for good, or bulk-clear ('closed' | 'all')
  async function remove(chatId) {
    return api({ action: 'delete', chat: chatId });
  }
  async function purge(scope) {
    return api({ action: 'purge', scope });
  }

  return {
    normName, getConfig, registerHost, startChat,
    startPolling, stopPolling, send, close, remove, purge,
    setHooks: (h) => { hooks = h; },
    openThread: (id) => { openChat = id ? normName(id) : null; },
    get name() { return myName; },
    get role() { return role; },
    BASE,
  };
})();

// ---------- shared theme helper ----------
// From one brand hex we derive the whole accent set so a custom colour stays
// coherent: a darker press shade, a readable ink (the text ON the accent), a
// text shade with enough contrast on the page surface, and a translucent ring.
function ncHexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function ncMix(rgb, target, amt) {                 // amt 0..1 toward target (0 or 255)
  const f = (c) => Math.round(c + (target - c) * amt);
  return { r: f(rgb.r), g: f(rgb.g), b: f(rgb.b) };
}
function ncCss(rgb) { return 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')'; }
function ncLum(rgb) {                               // relative luminance (sRGB)
  const ch = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(rgb.r) + 0.7152 * ch(rgb.g) + 0.0722 * ch(rgb.b);
}

function ncApplyTheme(theme, accent) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  const rgb = ncHexToRgb(accent);
  if (!rgb) return;

  const dark = theme === 'dark'
    || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);

  const press = ncMix(rgb, 0, 0.14);                              // 14% toward black
  const ink   = ncLum(rgb) > 0.45 ? '#10131a' : '#ffffff';        // text ON the accent
  const text  = dark ? ncMix(rgb, 255, 0.3) : ncMix(rgb, 0, 0.22); // accent text on the surface

  const s = document.documentElement.style;
  s.setProperty('--accent', ncCss(rgb));
  s.setProperty('--accent-press', ncCss(press));
  s.setProperty('--accent-ink', ink);
  s.setProperty('--accent-text', ncCss(text));
  s.setProperty('--ring', 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.22)');
}
