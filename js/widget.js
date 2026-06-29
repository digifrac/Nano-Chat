// Nano Chat - visitor widget. The website visitor's view: pick a subject, type
// a first message, hit Start. Opens a throwaway visitor chat with the business
// and shows the live back-and-forth. No account, no name, no install.

'use strict';

(async function () {
  const $ = (id) => document.getElementById(id);
  const screens = { intro: $('intro'), chat: $('chat') };
  const show = (name) => { for (const k in screens) screens[k].classList.toggle('hidden', k !== name); };

  let cfg = {};
  try { cfg = await NC.getConfig(); } catch { /* defaults below */ }
  ncApplyTheme(cfg.theme, cfg.accent);

  const brand = cfg.brandName || 'us';
  document.title = 'Chat with ' + brand;
  $('brandName').textContent = brand;
  $('greeting').textContent = cfg.greeting || '';

  // brand identity: logo if set, otherwise an initial avatar
  $('brandAvatar').textContent = (brand.trim() || 'C').charAt(0);
  if (cfg.logo) { $('logo').src = cfg.logo; $('logo').classList.remove('hidden'); $('brandAvatar').classList.add('hidden'); }

  // subjects: default to the first so the visitor can start in one tap
  const subjects = (cfg.subjects && cfg.subjects.length) ? cfg.subjects : ['General enquiry'];
  const sel = $('subject');
  sel.innerHTML = '';
  subjects.forEach((s) => { const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); });

  // a button can preselect a subject via ?subject= (e.g. a "Chat to Sales" link)
  const wanted = new URLSearchParams(location.search).get('subject');
  if (wanted) {
    const match = Array.from(sel.options).find((o) => o.value.toLowerCase() === wanted.toLowerCase());
    if (match) { sel.value = match.value; }
    else { const o = document.createElement('option'); o.value = wanted; o.textContent = wanted; sel.insertBefore(o, sel.firstChild); sel.value = wanted; }
  }
  if (sel.options.length < 2) $('subjectRow').classList.add('hidden');   // nothing to choose

  // "Powered by Nano Chat" - shown until a valid per-domain licence is set
  $('poweredBy').classList.toggle('hidden', !cfg.poweredBy);

  // ---------- render the conversation ----------
  const thread = $('thread');
  let lastCount = 0;
  function renderMessages(msgs) {
    thread.innerHTML = '';
    msgs.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'msg ' + (m.from === 'operator' ? 'them' : 'mine');
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = m.text;
      row.appendChild(bubble);
      thread.appendChild(row);
    });
    // only auto-scroll when something new arrived (don't yank the view otherwise)
    if (msgs.length !== lastCount) { thread.scrollTop = thread.scrollHeight; lastCount = msgs.length; }
  }

  function setComposerEnabled(on) {
    $('msgInput').disabled = !on;
    const btn = $('composer').querySelector('.sendBtn');
    if (btn) btn.disabled = !on;
    $('msgInput').placeholder = on ? 'Type a message…' : 'Offline right now';
  }

  // grow the message box with the text (up to the CSS max-height, then it scrolls)
  function autoGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }

  function setStatus(online, status, closedBy) {
    const el = $('chatStatus');
    // live-only: if no operator is online there is no one to answer, so we grey
    // out the composer and say so rather than take a message that goes unread
    if (!online) {
      el.textContent = brand + ' is offline right now - please check back when we are online.';
      el.className = 'chatStatus';
      setComposerEnabled(false);
      return;
    }
    if (status === 'closed') {
      el.textContent = (closedBy === 'visitor' ? 'You closed this chat.' : brand + ' closed this chat.')
        + ' Send a message to reopen it.';
      el.className = 'chatStatus';
      setComposerEnabled(true);
      return;
    }
    el.textContent = brand + ' is online'; el.className = 'chatStatus on';
    setComposerEnabled(true);
  }

  // ---------- operator online / offline on the opening screen (live-only) ----------
  // while the visitor is still on the intro, keep a light poll so the form greys
  // out when the operator is away and comes back to life the moment they return.
  let introPoll = null;
  function setIntroOnline(online) {
    $('offlineNote').classList.toggle('hidden', online);
    $('startBtn').disabled = !online;
    screens.intro.classList.toggle('isOffline', !online);
  }
  async function refreshIntroOnline() {
    try { const c = await NC.getConfig(); setIntroOnline(c.online !== false); } catch { /* keep last state */ }
  }
  function startIntroPoll() { setIntroOnline(cfg.online !== false); introPoll = setInterval(refreshIntroOnline, 5000); }
  function stopIntroPoll() { if (introPoll) clearInterval(introPoll); introPoll = null; }

  NC.setHooks({
    onNet: () => {},
    onTakenOver: () => { setStatus(false, 'open'); },
    onThread: (msgs, status, operatorOnline, closedBy) => { renderMessages(msgs); setStatus(operatorOnline, status, closedBy); },
  });

  // ---------- start the chat ----------
  let starting = false;
  async function start() {
    if (starting) return;
    const text = $('firstMsg').value.trim();
    if (!text) { $('startHint').textContent = 'Type a message first.'; $('firstMsg').focus(); return; }
    starting = true;
    $('startBtn').disabled = true;
    $('startHint').textContent = '';

    const subject = sel.value || subjects[0];
    // throwaway, unguessable visitor name - never shown to the visitor
    const guest = 'visitor-' + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
    try {
      const r = await NC.startChat(guest, cfg.business, subject, text);
      if (r.error) { $('startHint').textContent = 'Could not start the chat. Please try again.'; return; }
      stopIntroPoll();
      show('chat');
      renderMessages([{ from: 'visitor', text }]);   // show their first line right away
      NC.startPolling();
      $('msgInput').focus();
    } catch {
      $('startHint').textContent = 'Server not reachable. Please try again.';
    } finally {
      starting = false;
      $('startBtn').disabled = false;
    }
  }

  // ---------- send a follow-up ----------
  async function sendMsg(e) {
    if (e) e.preventDefault();
    const input = $('msgInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    autoGrow(input);              // shrink back to one line after sending
    // optimistic: show it immediately, the next poll reconciles
    const msgs = Array.from(thread.querySelectorAll('.msg .bubble')).map((b, i) => ({
      from: thread.children[i].classList.contains('them') ? 'operator' : 'visitor', text: b.textContent,
    }));
    msgs.push({ from: 'visitor', text });
    renderMessages(msgs);
    try { await NC.send(text); } catch { /* next poll will retry the view */ }
  }

  async function closeWidget() {
    // if a chat is live, end it on the server so the operator is told the
    // visitor closed it (rather than just silently hiding the popup)
    try { if (NC.name) await NC.close(); } catch {}
    try {
      if (window.parent && window.parent !== window) { window.parent.postMessage('nano-call:close', '*'); return; }
    } catch {}
    try { window.close(); } catch {}
  }

  // ---------- wire up ----------
  $('startBtn').onclick = start;
  $('firstMsg').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) start(); });
  $('composer').addEventListener('submit', sendMsg);
  $('msgInput').addEventListener('input', (e) => autoGrow(e.target));
  $('msgInput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  document.querySelectorAll('.closeBtn').forEach((b) => { b.onclick = closeWidget; });

  show('intro');
  startIntroPoll();
})();
