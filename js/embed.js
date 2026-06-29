/* Nano Chat - embed loader.
 *
 * Paste ONE of these on any website:
 *
 *   Floating button (parks in a corner):
 *     <script src="https://YOURHOST/chat/js/embed.js" data-nano-call="floating"></script>
 *
 *   Inline button (renders where you drop the placeholder):
 *     <script src="https://YOURHOST/chat/js/embed.js"></script>
 *     ... then anywhere in the page:
 *     <span data-nano-call-button></span>
 *
 * Both open the same chat popup (widget.html) in an overlay. You can use
 * both at once. Branding, label, position and the "Powered by" line come from
 * the server config; data-* attributes can override label/position locally.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;
  // site root, e.g. .../chat/ - strip the js/ folder this script lives in
  // (still works if embed.js is served from the root, for compatibility)
  var base = script.src.replace(/(?:js\/)?embed\.js(\?.*)?$/, '');
  var widgetUrl = base + 'widget.html?v=3';
  var mode = (script.getAttribute('data-nano-call') || '').toLowerCase();   // 'floating' | 'inline' | ''

  // ---------- styles (scoped to .nanocall- classes) ----------
  var css = ''
    + '.nanocall-launch{position:fixed;z-index:2147483000;display:inline-flex;flex-direction:column;align-items:stretch;gap:6px;max-width:calc(100vw - 40px);box-sizing:border-box;font-family:system-ui,"Segoe UI",sans-serif}'
    + '.nanocall-launch.br{right:20px;bottom:20px}.nanocall-launch.bl{left:20px;bottom:20px}'
    + '.nanocall-launch.tr{right:20px;top:20px}.nanocall-launch.tl{left:20px;top:20px}'
    + '.nanocall-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:999px;cursor:pointer;'
    + 'font:600 15px/1 system-ui,"Segoe UI",sans-serif;color:#fff;background:#ff4d00;padding:13px clamp(28px,7vw,64px);'
    + 'max-width:100%;box-sizing:border-box;'
    + 'box-shadow:0 6px 20px rgba(0,0,0,.18);transition:transform .12s,filter .12s}'
    + '.nanocall-btn:hover{filter:brightness(1.05)}.nanocall-btn:active{transform:scale(.97)}'
    + '.nanocall-btn svg{width:18px;height:18px;fill:currentColor;flex:none}'
    + '.nanocall-inline{display:inline-flex;max-width:100%;min-width:0;box-sizing:border-box}'
    + '.nanocall-pb{font:400 11px/1.3 system-ui,sans-serif;color:#888;text-align:center;margin:0}'
    + '.nanocall-pb a{color:#888;text-decoration:none}.nanocall-pb a:hover{text-decoration:underline}'
    + '.nanocall-overlay{position:fixed;inset:0;z-index:2147483600;display:none;align-items:center;justify-content:center;'
    + 'background:rgba(10,12,16,.55);backdrop-filter:blur(2px);padding:16px}'
    + '.nanocall-overlay.open{display:flex}'
    + '.nanocall-frameWrap{position:relative;width:min(380px,96vw);height:min(600px,92vh);'
    + 'border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.5);background:#fff}'
    + '.nanocall-frameWrap iframe{width:100%;height:100%;border:0;display:block}';
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var CHAT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z"/></svg>';

  // ---------- the shared overlay (built once, on first open) ----------
  function widgetUrlWith(subject) {
    if (!subject) return widgetUrl;
    return widgetUrl + (widgetUrl.indexOf('?') >= 0 ? '&' : '?') + 'subject=' + encodeURIComponent(subject);
  }
  var overlay = null;
  function openOverlay(subject) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'nanocall-overlay';
      overlay.innerHTML = '<div class="nanocall-frameWrap">'
        + '<iframe title="Chat with us"></iframe>'
        + '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeOverlay(); });
    }
    var frame = overlay.querySelector('iframe');
    frame.src = widgetUrlWith(subject);        // (re)load with the chosen subject
    overlay.classList.add('open');
  }
  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove('open');
    // reset so the next open starts fresh (and any call is torn down)
    var frame = overlay.querySelector('iframe');
    frame.src = ''; setTimeout(function () { frame.src = ''; }, 0);
  }
  // the widget asks us to close when the visitor finishes
  window.addEventListener('message', function (e) { if (e.data === 'nano-call:close') closeOverlay(); });

  // On phones we open the widget as its OWN first-party page instead of a
  // cramped in-page iframe: a full-screen chat is far easier to use on a small
  // screen, and a top-level page sidesteps any third-party-iframe quirks.
  function isMobile() {
    var ua = navigator.userAgent || '';
    // iPadOS reports as "Macintosh" but is touch-capable
    var ios = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var coarseNarrow = false;
    try {
      coarseNarrow = window.matchMedia('(pointer: coarse)').matches
        && Math.min(window.innerWidth || 9999, window.innerHeight || 9999) <= 820;
    } catch (e) { /* matchMedia unsupported - fall through */ }
    return ios || coarseNarrow;
  }

  function launch(subject) {
    if (isMobile()) {
      // first-party full page (new tab) - keeps the client's site behind it
      window.open(widgetUrlWith(subject), '_blank');
    } else {
      openOverlay(subject);
    }
  }

  function makeButton(label, subject, cls, styleStr, block, guard) {
    var b = document.createElement('button');
    b.type = 'button';
    if (cls) {
      // inherit the host site's own button styling (no Nano Chat pill, no icon).
      // Reset only the bits where a <button> differs from the host's <a> button
      // (UA border + font), so it renders identically to the site's own button.
      b.className = cls;
      b.textContent = label;
      b.style.cssText = 'border:0;cursor:pointer;font-family:inherit;font-size:inherit;line-height:inherit';
    } else {
      b.className = 'nanocall-btn';
      b.innerHTML = CHAT_SVG + '<span></span>';
      b.querySelector('span').textContent = label;
    }
    if (block) b.style.cssText += ';display:block;width:100%';   // full-width block button
    if (styleStr) b.style.cssText += ';' + styleStr;             // optional per-button overrides
    b.addEventListener('click', function () {
      if (guard && !guard()) {
        console.warn('Nano Chat: keep the "Powered by Nano Chat" link visible, or add a licence for this domain to remove it.');
        return;   // unlicensed + attribution removed -> button does nothing
      }
      launch(subject);
    });
    return b;
  }
  function poweredByEl() {
    var p = document.createElement('p');
    p.className = 'nanocall-pb';
    p.innerHTML = 'Powered by <a href="https://www.digitalfracture.co.uk/nano.php" target="_blank" rel="noopener noreferrer">Nano Chat</a>';
    return p;
  }

  // Unlicensed buttons only work while the attribution stays visible. A valid
  // per-domain licence sets cfg.poweredBy=false, which lifts the check entirely.
  function attribGuard(cfg, pb) {
    return function () {
      if (!cfg.poweredBy) return true;                            // licensed - always works
      if (!pb || !pb.isConnected || !pb.querySelector('a')) return false;
      var cs = window.getComputedStyle(pb);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') >= 0.1;
    };
  }

  // ---------- build launchers once config arrives ----------
  function build(cfg) {
    var label = script.getAttribute('data-label') || cfg.buttonLabel || 'Chat with us';
    var accent = cfg.accent || '#ff4d00';
    var pos = (script.getAttribute('data-position') || cfg.position || 'bottom-right').toLowerCase();
    var posClass = { 'bottom-right': 'br', 'bottom-left': 'bl', 'top-right': 'tr', 'top-left': 'tl' }[pos] || 'br';

    // accent override for every Nano Chat button on the page
    styleEl.textContent += '.nanocall-btn{background:' + accent + '}';

    var inlineTargets = document.querySelectorAll('[data-nano-call-button]');
    var wantFloating = (mode === 'floating' || mode === 'both') || (mode === '' && inlineTargets.length === 0);

    if (wantFloating) {
      var wrap = document.createElement('div');
      wrap.className = 'nanocall-launch ' + posClass;
      var fpb = cfg.poweredBy ? poweredByEl() : null;
      wrap.appendChild(makeButton(label, script.getAttribute('data-subject') || '', script.getAttribute('data-class') || '', script.getAttribute('data-style') || '', false, attribGuard(cfg, fpb)));
      if (fpb) wrap.appendChild(fpb);
      document.body.appendChild(wrap);
    }

    inlineTargets.forEach(function (t) {
      var block = t.hasAttribute('data-block');
      var holder = document.createElement('span');
      holder.className = 'nanocall-inline';
      holder.style.display = block ? 'block' : 'inline-flex';
      holder.style.flexDirection = 'column';
      holder.style.gap = '5px';
      var pb = cfg.poweredBy ? poweredByEl() : null;
      holder.appendChild(makeButton(t.getAttribute('data-label') || label, t.getAttribute('data-subject') || '', t.getAttribute('data-class') || '', t.getAttribute('data-style') || '', block, attribGuard(cfg, pb)));
      if (pb) holder.appendChild(pb);
      t.replaceWith(holder);
    });
  }

  // simple cross-origin GET (no preflight); fall back to defaults on failure
  fetch(base + 'signal.php?action=config')
    .then(function (r) { return r.json(); })
    .then(function (d) { build((d && d.config) || {}); })
    .catch(function () { build({}); });
})();
