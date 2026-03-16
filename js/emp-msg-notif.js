/**
 * ═══════════════════════════════════════════════════════════════
 *  SATELLITE HOME WATCH — Employee Message Notification Panel
 *  js/emp-msg-notif.js
 *  v2 — deployment bundle refresh
 *
 *  Provides:
 *    initEmpMsgNotif()        — call on DOMContentLoaded
 *    openEmpMsgNotif(btn)     — toggle the panel open
 *    closeEmpMsgNotif()       — close the panel
 *
 *  Requires: emp-app.js (EMP_SESSION, empApiGetAll, buildMap, FMT)
 * ═══════════════════════════════════════════════════════════════
 */

(function () {

  let _unreadThreads = [];
  let _panelOpen     = false;
  let _initialized   = false;

  // ── Public API ────────────────────────────────────────────────────────────

  window.initEmpMsgNotif = async function () {
    if (_initialized) return;
    _initialized = true;
    await _refresh();
    // Poll every 60 s
    setInterval(_refresh, 60000);
    // Close panel on outside click
    document.addEventListener('click', _onOutsideClick, true);
  };

  window.openEmpMsgNotif = function (btn) {
    const panel = document.getElementById('empMsgNotifPanel');
    if (!panel) return;
    if (_panelOpen) {
      _closePanel(panel);
    } else {
      _openPanel(panel, btn);
    }
  };

  window.closeEmpMsgNotif = function () {
    const panel = document.getElementById('empMsgNotifPanel');
    if (panel) _closePanel(panel);
  };

  // ── Internals ─────────────────────────────────────────────────────────────

  async function _refresh() {
    try {
      const [threadsRes, participantsRes, messagesRes, usersRes] = await Promise.all([
        empApiGetAll('message_threads'),
        empApiGetAll('thread_participants'),
        empApiGetAll('messages'),
        empApiGetAll('users'),
      ]);

      const threads      = threadsRes.data      || [];
      const participants = participantsRes.data  || [];
      const messages     = messagesRes.data      || [];
      const userMap      = buildMap(usersRes.data || []);

      // Find threads where this user is a participant
      const myParticipations = participants.filter(p => p.user_id === EMP_SESSION.userId);
      const myThreadIds      = new Set(myParticipations.map(p => p.thread_id));

      // For each thread, find messages NOT sent by me that are unread
      const unread = [];
      threads
        .filter(t => myThreadIds.has(t.id) && !t.is_archived)
        .forEach(t => {
          const threadMsgs = messages
            .filter(m => m.thread_id === t.id && m.sender_user_id !== EMP_SESSION.userId && !m.is_read)
            .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

          if (threadMsgs.length > 0) {
            const latestMsg  = threadMsgs[0];
            const senderUser = userMap[latestMsg.sender_user_id] || {};
            // Determine assigned admin label
            let assignedLabel = 'Support Team';
            if (t.assigned_admin_id && userMap[t.assigned_admin_id]) {
              assignedLabel = userMap[t.assigned_admin_id].full_name || assignedLabel;
            }
            unread.push({
              threadId:      t.id,
              subject:       t.subject || 'Conversation',
              assignedLabel,
              senderName:    senderUser.full_name || assignedLabel,
              preview:       latestMsg.body ? latestMsg.body.slice(0, 80) + (latestMsg.body.length > 80 ? '…' : '') : '(attachment)',
              sentAt:        latestMsg.sent_at,
              unreadCount:   threadMsgs.length,
            });
          }
        });

      _unreadThreads = unread.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
      _updateBadge();
      _renderList();
    } catch (e) {
      // Silent fail — don't disrupt the page
    }
  }

  function _updateBadge() {
    // Desktop topbar badge
    const badge = document.getElementById('empMsgBadge');
    if (badge) {
      if (_unreadThreads.length > 0) {
        badge.textContent = _unreadThreads.length > 9 ? '9+' : String(_unreadThreads.length);
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }
    // Mobile topbar message badge (injected by sidebar.js)
    const mobileBadge = document.getElementById('mobileEmpMsgBadge');
    if (mobileBadge) {
      if (_unreadThreads.length > 0) {
        mobileBadge.textContent = _unreadThreads.length > 9 ? '9+' : String(_unreadThreads.length);
        mobileBadge.style.display = '';
      } else {
        mobileBadge.style.display = 'none';
      }
    }
  }

  function _renderList() {
    const list = document.getElementById('empMsgNotifList');
    if (!list) return;

    if (!_unreadThreads.length) {
      list.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">No new messages</div>`;
      return;
    }

    list.innerHTML = _unreadThreads.map(t => `
      <a href="employee-messages.html?threadId=${encodeURIComponent(t.threadId)}"
         onclick="closeEmpMsgNotif()"
         style="display:block;padding:12px 16px;border-bottom:1px solid #f1f5f9;cursor:pointer;text-decoration:none;transition:background .15s;"
         onmouseenter="this.style.background='#f8fafc'"
         onmouseleave="this.style.background=''"
      >
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;gap:8px;">
          <div style="font-size:13px;font-weight:700;color:#0f1e38;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;">
            ${_esc(t.subject)}
          </div>
          ${t.unreadCount > 1 ? `<span style="font-size:10px;font-weight:700;background:#162d56;color:#fff;border-radius:10px;padding:1px 7px;flex-shrink:0;">${t.unreadCount}</span>` : ''}
        </div>
        <div style="font-size:12px;color:#162d56;font-weight:600;margin-bottom:2px;">
          From: ${_esc(t.senderName)}
        </div>
        <div style="font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${_esc(t.preview)}
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-top:3px;">${FMT.relTime(t.sentAt)}</div>
      </a>`).join('');
  }

  function _openPanel(panel, btn) {
    _panelOpen = true;
    panel.style.display = '';
    // Align panel below the button if possible
    if (btn) {
      const rect = btn.getBoundingClientRect();
      panel.style.top  = (rect.bottom + 8) + 'px';
      panel.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
    }
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  function _closePanel(panel) {
    _panelOpen = false;
    panel.style.display = 'none';
    const btn = document.getElementById('empMsgNotifBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function _onOutsideClick(e) {
    if (!_panelOpen) return;
    const panel = document.getElementById('empMsgNotifPanel');
    const btn   = document.getElementById('empMsgNotifBtn');
    if (!panel) return;
    if (!panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
      _closePanel(panel);
    }
  }

  function _esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
