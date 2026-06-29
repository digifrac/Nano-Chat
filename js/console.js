// Nano Chat - operator console. The business keeps this page open; it goes
// online as the configured business handle (admin password required) and
// answers chats from website visitors, showing their subject and messages.

'use strict';

(async function () {
  const $ = (id) => document.getElementById(id);
  const screens = { login: $('login'), queue: $('queue'), thread: $('thread') };
  const show = (name) => { for (const k in screens) screens[k].classList.toggle('hidden', k !== name); };

  let cfg = {};
  try { cfg = await NC.getConfig(); } catch { /* defaults below */ }
  ncApplyTheme(cfg.theme, cfg.accent);

  const brand = cfg.brandName || 'Nano Chat';
  document.title = brand + ' - console';
  $('brandName').textContent = brand;
  $('onlineAs').textContent = brand;

  let openId = null;                 // which visitor chat is open, if any
  let lastTotals = {};               // chat id -> message count last seen (for notifications)
  let renderedKey = '';              // signature of the open thread, to skip redundant repaints

  // ---------- desktop notification ----------
  let notif = null;
  function notify(subject, text) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (notif) { try { notif.close(); } catch {} }
      notif = new Notification('New chat: ' + (subject || 'message'), { body: text || '', tag: 'nano-chat' });
      notif.onclick = () => { try { window.focus(); } catch {} };
    } catch { /* notifications unavailable */ }
  }

  // ---------- render the queue ----------
  function renderQueue(chats) {
    const list = $('chatList');
    list.innerHTML = '';
    $('queueTools').classList.toggle('hidden', !chats.length);   // bulk-clear bar only when there is something to clear
    if (!chats.length) { $('queueHint').textContent = 'Waiting for chats. Leave this page open.'; return; }
    $('queueHint').textContent = '';
    chats.forEach((c) => {
      const li = document.createElement('li');
      const unread = c.lastFrom === 'visitor';
      li.className = 'chatItem' + (c.status === 'closed' ? ' closed' : '') + (unread ? ' unread' : '');
      li.innerHTML =
        '<span class="ciDot ' + (c.online ? 'on' : '') + '"></span>' +
        '<span class="ciBody">' +
          '<span class="ciSubject"></span>' +
          '<span class="ciLast"></span>' +
        '</span>' +
        (unread ? '<span class="ciBadge">new</span>' : '') +
        '<button class="ciDelete" title="Delete this chat" aria-label="Delete this chat">&times;</button>';
      li.querySelector('.ciSubject').textContent = c.subject || 'Chat';
      li.querySelector('.ciLast').textContent = (c.lastFrom === 'operator' ? 'You: ' : '') + (c.last || '');
      li.onclick = () => openChat(c.id, c.subject);
      li.querySelector('.ciDelete').onclick = (e) => { e.stopPropagation(); deleteFromQueue(c.id, c.subject); };
      list.appendChild(li);
    });
  }

  // ---------- delete / clear ----------
  async function deleteFromQueue(id, subject) {
    if (!confirm('Delete this chat (' + (subject || 'Chat') + ')? This cannot be undone.')) return;
    try { await NC.remove(id); delete lastTotals[id]; NC.startPolling(); } catch { /* next poll reconciles */ }
  }
  async function deleteOpenChat() {
    if (!openId) return;
    if (!confirm('Delete this chat for good? This cannot be undone.')) return;
    try { await NC.remove(openId); } catch {}
    delete lastTotals[openId];
    backToQueue();
  }
  async function clearClosed() {
    if (!confirm('Clear all closed chats? This cannot be undone.')) return;
    try { await NC.purge('closed'); lastTotals = {}; NC.startPolling(); } catch {}
  }
  async function clearAll() {
    if (!confirm('Clear ALL chats, including open ones? This cannot be undone.')) return;
    try { await NC.purge('all'); lastTotals = {}; if (openId) backToQueue(); else NC.startPolling(); } catch {}
  }

  // the small line under the subject: visitor online/away, or who closed the chat
  function setThreadState(chat, online) {
    const el = $('threadState');
    if (chat.status === 'closed') {
      el.textContent = chat.closed_by === 'visitor' ? 'Visitor closed this chat'
        : chat.closed_by === 'operator' ? 'You closed this chat'
        : 'Chat closed';
      el.className = 'threadState closed';
      return;
    }
    el.textContent = online ? 'Visitor online' : 'Visitor away';
    el.className = 'threadState ' + (online ? 'on' : 'off');
  }

  // ---------- render an open thread ----------
  function renderThread(chat, online) {
    if (!chat) return;
    $('threadSubject').textContent = chat.subject || 'Chat';
    setThreadState(chat, online);            // updated every poll (cheap), separate from the message repaint
    const box = $('threadMsgs');
    const msgs = chat.messages || [];
    const key = openId + ':' + msgs.length;
    if (key === renderedKey) return;         // nothing new - leave the view (and scroll) alone
    renderedKey = key;
    box.innerHTML = '';
    msgs.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'msg ' + (m.from === 'operator' ? 'mine' : 'them');
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = m.text;
      row.appendChild(bubble);
      box.appendChild(row);
    });
    box.scrollTop = box.scrollHeight;
  }

  function openChat(id, subject) {
    openId = id;
    renderedKey = '';
    NC.openThread(id);
    $('threadSubject').textContent = subject || 'Chat';
    $('threadState').textContent = '';
    $('threadMsgs').innerHTML = '';
    show('thread');
    NC.startPolling();                       // force an immediate poll so the thread fills now
    $('reply').focus();
  }

  function backToQueue() { openId = null; NC.openThread(null); renderedKey = ''; show('queue'); NC.startPolling(); }

  NC.setHooks({
    onNet: (ok) => $('netDot').classList.toggle('on', ok),
    onTakenOver: () => { show('login'); $('loginHint').textContent = 'This handle went online elsewhere. Log in again to take it back.'; },
    onQueue: (chats, thread) => {
      renderQueue(chats);
      if (openId) { const cur = chats.find((c) => c.id === openId); renderThread(thread, cur ? cur.online : false); }
      // notify on any chat that gained a new visitor message since last poll
      chats.forEach((c) => {
        const prev = lastTotals[c.id] || 0;
        if (c.count > prev && c.lastFrom === 'visitor' && c.id !== openId) notify(c.subject, c.last);
        lastTotals[c.id] = c.count;
      });
    },
  });

  // ---------- go online ----------
  async function goOnline() {
    const pass = $('adminPass').value;
    if (!pass) { $('loginHint').textContent = 'Enter your admin password.'; return; }
    if ('Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch {} }

    $('goOnline').disabled = true;
    try {
      const out = await NC.registerHost(cfg.business, pass);
      if (out.error === 'bad-password') { loginError('Wrong password. Try again.'); }
      else if (out.error === 'no-admin') { $('loginHint').textContent = 'Not set up yet - open the admin page (/admin/) to create your password and settings.'; }
      else if (out.error) { $('loginHint').textContent = 'Could not go online (' + out.error + ').'; }
      else {
        $('adminPass').value = '';
        clearLoginError();
        lastTotals = {};
        NC.startPolling();
        show('queue');
      }
    } catch { $('loginHint').textContent = 'Server not reachable.'; }
    $('goOnline').disabled = false;
  }

  function goOffline() { NC.stopPolling(); openId = null; show('login'); $('loginHint').textContent = ''; }

  // wrong/blocked password: red field + hint, clear and refocus, brief shake
  function loginError(msg) {
    const p = $('adminPass'), h = $('loginHint');
    h.textContent = msg; h.classList.add('isError');
    p.classList.add('bad'); p.value = ''; p.focus();
    p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake');
  }
  function clearLoginError() {
    $('loginHint').classList.remove('isError');
    $('adminPass').classList.remove('bad', 'shake');
  }

  // show/hide the password
  function togglePeek() {
    const p = $('adminPass'), btn = $('pwPeek'), showing = p.type === 'password';
    p.type = showing ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(showing));
    btn.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
    btn.title = showing ? 'Hide password' : 'Show password';
    btn.querySelector('.ic-eye').classList.toggle('hidden', showing);
    btn.querySelector('.ic-eye-off').classList.toggle('hidden', !showing);
    p.focus();
  }

  // ---------- reply / close ----------
  async function sendReply(e) {
    if (e) e.preventDefault();
    const input = $('reply');
    const text = input.value.trim();
    if (!text || !openId) return;
    input.value = '';
    try { await NC.send(text, openId); renderedKey = ''; NC.startPolling(); }
    catch { input.value = text; }           // put it back so nothing is lost
  }
  async function closeChat() {
    if (!openId) return;
    try { await NC.close(openId); } catch {}
    backToQueue();
  }

  // ---------- wire up ----------
  $('goOnline').onclick = goOnline;
  $('pwPeek').onclick = togglePeek;
  $('adminPass').onkeydown = (e) => { if (e.key === 'Enter') goOnline(); };
  $('adminPass').addEventListener('input', clearLoginError);
  $('goOffline').onclick = goOffline;
  $('backBtn').onclick = backToQueue;
  $('closeChatBtn').onclick = closeChat;
  $('deleteChatBtn').onclick = deleteOpenChat;
  $('clearClosed').onclick = clearClosed;
  $('clearAll').onclick = clearAll;
  $('composer').addEventListener('submit', sendReply);

  // closing the page drops you offline - warn while online
  window.addEventListener('beforeunload', (e) => { if (NC.name) { e.preventDefault(); e.returnValue = ''; } });

  show('login');
})();
