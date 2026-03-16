/**
 * ═══════════════════════════════════════════════════════════════════
 *  SATELLITE HOME WATCH — MESSAGES PAGE CONTROLLER
 *  messages-data.js — Wires backend to client-messages.html
 *  v2 — deployment bundle refresh
 * ═══════════════════════════════════════════════════════════════════
 *
 *  The existing messages.js handles the UI rendering logic (thread list,
 *  message bubbles, send form). This controller hooks into the existing
 *  rendering functions and replaces the static CONVERSATIONS data with
 *  real backend data.
 * ═══════════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Wait a tick for existing messages.js to initialize
  setTimeout(async () => {
    await initMessagesPage();
  }, 100);
});

let _threads  = [];
let _activeThreadId = null;

async function initMessagesPage() {
  try {
    const threads = await SHW.Messages.getEnrichedThreads();
    _threads = threads;

    renderThreadList(threads);
    updateUnreadBadges(threads);

    // Auto-open first thread if any
    if (threads.length > 0) {
      await openThread(threads[0].id);
    }

    await SHWUI.updateSidebarBadges();
  } catch (err) {
    SHWUI.showToast('Unable to load messages.', 'error');
  }
}

// ─── THREAD LIST ──────────────────────────────────────────────────────────────

function renderThreadList(threads) {
  // Find the conversation list container (works with existing messages.html layout)
  const listEl = document.querySelector(
    '#msgThreadList, .conv-list, .thread-list, .conversations-list, #convList, #threadList'
  );
  if (!listEl) {
    renderThreadListInline(threads);
    return;
  }

  // Remove loading spinner if present
  const loadingEl = document.getElementById('msgThreadsLoading');
  if (loadingEl) loadingEl.remove();

  if (threads.length === 0) {
    listEl.innerHTML = `
      <div style="padding:32px 16px;text-align:center;color:var(--navy-400);">
        <p style="font-size:13px;font-weight:500;">No messages yet</p>
      </div>`;
    return;
  }

  listEl.innerHTML = threads.map(t => buildThreadListItem(t)).join('');
}

function buildThreadListItem(t) {
  const isUnread  = t.has_unread;
  const typeColors = {
    alert_related:   '#dc2626',
    property_update: '#2563eb',
    service_request: '#d97706',
    billing:         '#16a34a',
    general_support: '#6b7280',
    system:          '#6b7280',
  };
  const typeColor = typeColors[t.thread_type] || '#6b7280';
  const isActive  = _activeThreadId === t.id;

  return `
    <div class="conv-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}"
      onclick="openThread('${t.id}')"
      data-thread-id="${t.id}"
      role="button" tabindex="0"
      onkeydown="if(event.key==='Enter')openThread('${t.id}')"
      style="padding:14px 16px;border-bottom:1px solid var(--navy-100);cursor:pointer;
        background:${isActive ? 'var(--blue-50)' : isUnread ? '#fffbf0' : '#fff'};
        transition:background .15s;position:relative;">

      <!-- Thread type indicator dot -->
      <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${isActive ? '#2563eb' : isUnread ? typeColor : 'transparent'};border-radius:0 2px 2px 0;"></div>

      <div style="display:flex;align-items:flex-start;gap:10px;padding-left:6px;">
        <!-- Property icon/avatar -->
        <div style="width:36px;height:36px;border-radius:50%;background:${typeColor}15;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${typeColor}" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
            <span style="font-size:13px;font-weight:${isUnread ? '700' : '600'};color:var(--navy-900);
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">${t.property_name}</span>
            <span style="font-size:10px;color:var(--navy-400);flex-shrink:0;">${t.time_label}</span>
          </div>
          <div style="font-size:12px;font-weight:${isUnread ? '600' : '400'};color:var(--navy-700);margin-bottom:3px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.subject}</div>
          <div style="font-size:11px;color:var(--navy-400);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${t.last_message_preview || '—'}
          </div>
        </div>
        ${isUnread ? `<div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;flex-shrink:0;margin-top:6px;"></div>` : ''}
      </div>
    </div>`;
}

function renderThreadListInline(threads) {
  // If the existing UI has a different structure, inject into body
  const sidebar = document.querySelector('.msg-left-panel, .messages-sidebar, .msg-sidebar, .conv-panel');
  if (!sidebar) return;

  let listEl = sidebar.querySelector('.conv-list-data');
  if (!listEl) {
    listEl = document.createElement('div');
    listEl.className = 'conv-list-data';
    const origList = sidebar.querySelector('.conv-list, .conversation-list');
    if (origList) origList.style.display = 'none';
    sidebar.appendChild(listEl);
  }
  listEl.innerHTML = threads.map(t => buildThreadListItem(t)).join('');
}

// ─── OPEN THREAD / LOAD MESSAGES ─────────────────────────────────────────────

window.openThread = async function(threadId) {
  _activeThreadId = threadId;

  // Update thread list active state
  document.querySelectorAll('[data-thread-id]').forEach(el => {
    el.classList.toggle('active', el.dataset.threadId === threadId);
    const style = el.style;
    style.background = el.dataset.threadId === threadId ? 'var(--blue-50)' : '';
    // Clear unread indicator
    if (el.dataset.threadId === threadId) {
      el.classList.remove('unread');
      style.background = 'var(--blue-50)';
    }
  });

  // Load messages for this thread
  const messages = await SHW.Messages.getEnrichedMessages(threadId);
  const thread   = _threads.find(t => t.id === threadId);

  // Mark thread as read
  await SHW.Messages.markThreadRead(threadId);

  renderMessages(messages, thread);
  scrollToLatestMessage();
  await SHWUI.updateSidebarBadges();
};

// ─── MESSAGE RENDERING ────────────────────────────────────────────────────────

function renderMessages(messages, thread) {
  // Find the message body/panel
  const panels = [
    document.querySelector('.msg-body, .messages-body, .thread-messages, #messagesBody'),
    document.querySelector('.message-thread, .msg-thread'),
  ];
  const container = panels.find(p => p !== null);
  if (!container) return;

  // Render thread header if available
  const headerEl = document.querySelector('.msg-panel-header, .thread-header, #threadHeader');
  if (headerEl && thread) {
    headerEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;color:var(--navy-900);">${thread.subject}</div>
          <div style="font-size:11px;color:var(--navy-500);margin-top:2px;">
            ${thread.property_name} · ${SHW.utils.snakeToTitle(thread.thread_type)}
          </div>
        </div>
      </div>`;
  }

  if (messages.length === 0) {
    container.innerHTML = `
      <div style="padding:48px;text-align:center;color:var(--navy-400);">
        <p style="font-size:13px;">No messages in this thread yet.</p>
      </div>`;
    return;
  }

  container.innerHTML = messages.map(m => buildMessageBubble(m)).join('');
}

function buildMessageBubble(m) {
  const isSystem = m.message_type === 'system';
  const isMine   = m.is_mine;

  if (isSystem) {
    return `
      <div style="text-align:center;padding:10px 20px;margin:8px 0;">
        <span style="display:inline-block;font-size:11px;color:var(--navy-500);padding:4px 14px;
          border-radius:20px;background:var(--navy-100);">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            style="display:inline;margin-right:4px;vertical-align:middle;">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          </svg>
          ${m.body} · ${m.time_label}
        </span>
      </div>`;
  }

  return `
    <div class="msg-row ${isMine ? 'msg-mine' : 'msg-theirs'}"
      style="display:flex;gap:8px;padding:4px 20px;margin-bottom:8px;
        ${isMine ? 'flex-direction:row-reverse;' : ''}">

      ${!isMine ? `
        <div style="width:30px;height:30px;border-radius:50%;background:var(--navy-200);
          display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;
          font-weight:700;color:var(--navy-700);">${m.sender_initials}</div>
      ` : ''}

      <div style="max-width:70%;">
        ${!isMine ? `
          <div style="font-size:10px;color:var(--navy-400);margin-bottom:3px;font-weight:600;">
            ${m.sender_name} · ${SHW.utils.capitalize(m.sender_role)}
          </div>` : ''}
        <div style="background:${isMine ? '#1d4ed8' : '#f3f4f6'};color:${isMine ? '#fff' : 'var(--navy-800)'};
          padding:10px 14px;border-radius:${isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
          font-size:13px;line-height:1.5;">
          ${m.body}
          ${m.attachments && m.attachments.length > 0 ? `
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid ${isMine ? 'rgba(255,255,255,.2)' : 'var(--navy-200)'};">
              ${m.attachments.map(a => `
                <div style="display:flex;align-items:center;gap:6px;font-size:11px;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                  ${a.filename}
                </div>`).join('')}
            </div>` : ''}
        </div>
        <div style="font-size:10px;color:var(--navy-400);margin-top:3px;
          ${isMine ? 'text-align:right;' : ''}">${m.time_label}</div>
      </div>
    </div>`;
}

function scrollToLatestMessage() {
  const container = document.querySelector('.msg-body, .messages-body, .thread-messages');
  if (container) setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
}

function updateUnreadBadges(threads) {
  const unread = threads.filter(t => t.has_unread).length;
  const badge = document.querySelector('.messages-unread-badge, .conv-unread-count');
  if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? '' : 'none'; }
}

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────

// Hook into the existing send form (from messages.js)
document.addEventListener('DOMContentLoaded', () => {
  const sendForm  = document.getElementById('msgSendForm') ||
                    document.querySelector('.msg-compose-form, .send-message-form');
  const sendInput = document.getElementById('msgInput') ||
                    document.querySelector('.msg-input, textarea[placeholder*="message"]');
  const sendBtn   = document.getElementById('msgSendBtn') ||
                    document.querySelector('.msg-send-btn, button[type="submit"]');

  if (sendBtn && sendInput) {
    // Override existing send handler
    sendBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const body = sendInput.value.trim();
      if (!body || !_activeThreadId) return;

      sendInput.value = '';
      sendInput.disabled = true;
      sendBtn.disabled   = true;

      const { data, error } = await SHW.Messages.sendMessage(_activeThreadId, body);
      if (error) {
        SHWUI.showToast('Failed to send message. Please try again.', 'error');
      } else {
        SHWUI.showToast('Message sent', 'success');
        // Reload messages
        const messages = await SHW.Messages.getEnrichedMessages(_activeThreadId);
        const thread   = _threads.find(t => t.id === _activeThreadId);
        renderMessages(messages, thread);
        scrollToLatestMessage();
      }

      sendInput.disabled = false;
      sendBtn.disabled   = false;
      sendInput.focus();
    });
  }
});
