/* ============================================================
   Satellite Home Watch — Client Messages Dropdown Panel
   client-msg-panel.js

   Provides a lightweight unread messages dropdown for the
   CLIENT portal topbar.  Mirrors the admin SHWMsgPanel but
   uses client-side conversation data and routes to
   client-messages.html?thread=<id>.

   Usage:
     Include this script on every client-facing page.
     The messages button is rendered by SHWClientMsgPanel.buildButton()
     and must exist inside .topbar-right with:
       data-client-msg-trigger
       onclick="SHWClientMsgPanel.toggle(this)"

   Navigation:
     Clicking a conversation item navigates directly to
     client-messages.html#<threadId>
     The messages page already honours the URL hash to
     open the correct thread.
   ============================================================ */

(function (global) {
  'use strict';

  /* ── Client conversation threads ─────────────────────────────
     Loaded dynamically from the backend (SHW.Messages).
     The array below is intentionally empty; threads are fetched
     on first panel open via _loadThreads().
  ─────────────────────────────────────────────────────────── */
  const CLIENT_THREADS = []; // No hardcoded mock data

  /* ── State ────────────────────────────────────────────────── */
  let _open        = false;
  let _panelEl     = null;
  let _backdropEl  = null;
  /* Shallow copy so we can track per-session read state */
  let _threads     = []; // populated by _loadThreads() from backend

  /* ── Load threads from backend ─────────────────────────────
     Runs after DOMContentLoaded; falls back to empty panel.
  ─────────────────────────────────────────────────────────── */
  async function _loadThreads() {
    try {
      if (typeof SHW === 'undefined' || !SHW.Messages) return;
      const enriched = await SHW.Messages.getEnrichedThreads();
      _threads = (enriched || []).map(t => ({
        id:        t.id,
        initials:  (t.property_name || 'P').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
        color:     '#162d56',
        name:      t.property_name || 'Your Property',
        property:  t.property_name || '',
        preview:   t.last_message_preview || t.subject || '',
        timestamp: t.last_message_at || t.created_at || new Date().toISOString(),
        unread:    t.has_unread ? 1 : 0,
      }));
      _refreshBadge();
    } catch (e) {
      // silent fail — panel just shows empty state
    }
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m    = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'Yesterday' : `${d}d ago`;
  }

  function _totalUnread() {
    return _threads.reduce((acc, t) => acc + (t.unread || 0), 0);
  }

  function _refreshBadge() {
    const count = _totalUnread();
    document.querySelectorAll('[data-client-msg-badge]').forEach(el => {
      if (count <= 0) {
        el.textContent = '';
        el.style.display = 'none';
      } else {
        el.textContent   = count > 9 ? '9+' : String(count);
        el.style.display = '';
      }
    });
  }

  /* ── Panel HTML ──────────────────────────────────────────── */
  function _buildPanel() {
    const unread  = _totalUnread();
    const badgeEl = unread > 0
      ? `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:9px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;padding:0 4px;margin-left:6px;">${unread > 9 ? '9+' : unread}</span>`
      : '';

    const recent = [..._threads].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const itemsHTML = recent.length === 0
      ? `<div style="padding:32px 20px;text-align:center;color:#94a3b8;">
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 8px;display:block;opacity:.5;">
             <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
           </svg>
           <p style="font-size:13px;margin:0;">No conversations yet</p>
         </div>`
      : recent.map(t => {
          const isUnread = t.unread > 0;
          const bgIdle   = isUnread ? '#fafcff' : '#fff';
          return `<div
            onclick="SHWClientMsgPanel._handleClick('${t.id}')"
            role="button"
            tabindex="0"
            onkeydown="if(event.key==='Enter'||event.key===' ')SHWClientMsgPanel._handleClick('${t.id}')"
            style="display:flex;gap:12px;padding:11px 16px;cursor:pointer;border-bottom:1px solid #f8fafc;transition:background .12s;background:${bgIdle};"
            onmouseover="this.style.background='#f0f5ff'"
            onmouseout="this.style.background='${bgIdle}'"
          >
            <div style="width:36px;height:36px;border-radius:50%;background:${t.color};color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;">
              ${t.initials}
              ${isUnread ? '<span style="position:absolute;top:-1px;right:-1px;width:9px;height:9px;border-radius:50%;background:#3b82f6;border:1.5px solid #fff;"></span>' : ''}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-bottom:2px;">
                <span style="font-size:12px;font-weight:${isUnread ? '700' : '600'};color:#0f1e38;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${t.name}</span>
                <span style="font-size:10px;color:#94a3b8;white-space:nowrap;flex-shrink:0;">${_timeAgo(t.timestamp)}</span>
              </div>
              <div style="font-size:11px;font-weight:500;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:3px;"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>${t.property}
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                <span style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${isUnread ? '600' : '400'};">${t.preview}</span>
                ${isUnread ? `<span style="flex-shrink:0;min-width:16px;height:16px;border-radius:8px;background:#3b82f6;color:#fff;font-size:9px;font-weight:700;line-height:16px;text-align:center;padding:0 3px;display:inline-flex;align-items:center;justify-content:center;">${t.unread}</span>` : ''}
              </div>
            </div>
          </div>`;
        }).join('');

    return `
      <div id="clientMsgPanelEl" style="
        background:#fff;
        border:1px solid #e2e8f0;
        border-radius:14px;
        box-shadow:0 12px 40px rgba(0,0,0,.14);
        width:360px;
        max-height:480px;
        overflow:hidden;
        display:flex;
        flex-direction:column;
        opacity:0;
        transform:translateY(-8px);
        transition:opacity .2s,transform .2s;
      ">
        <!-- Header -->
        <div style="padding:14px 16px 12px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:14px;font-weight:700;color:#0f1e38;">Messages</span>
            ${badgeEl}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${unread > 0 ? `<button onclick="SHWClientMsgPanel.markAllRead()" style="font-size:11px;font-weight:600;color:#162d56;background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:5px;transition:background .12s;" onmouseover="this.style.background='#f0f5ff'" onmouseout="this.style.background='none'" title="Mark all read">Mark all read</button>` : ''}
            <button onclick="SHWClientMsgPanel.close()" style="width:26px;height:26px;border-radius:6px;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer;display:flex;align-items:center;justify-content:center;" aria-label="Close messages">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <!-- Conversation list -->
        <div id="clientMsgPanelList" style="overflow-y:auto;flex:1;">
          ${itemsHTML}
        </div>
        <!-- Footer -->
        <div style="padding:10px 16px;border-top:1px solid #f1f5f9;">
          <a href="client-messages.html" onclick="SHWClientMsgPanel.close()" style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:600;color:#162d56;text-decoration:none;padding:7px;border-radius:8px;background:#f0f5ff;transition:background .15s;" onmouseover="this.style.background='#e0eaff'" onmouseout="this.style.background='#f0f5ff'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Open All Messages
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:auto;"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>
      </div>`;
  }

  /* ── Open / Close ────────────────────────────────────────── */
  function _openPanel(triggerEl) {
    if (_open) { _closePanel(); return; }
    _open = true;

    /* Transparent backdrop to catch outside-clicks */
    _backdropEl = document.createElement('div');
    _backdropEl.id = 'clientMsgPanelBackdrop';
    Object.assign(_backdropEl.style, {
      position:   'fixed',
      inset:      '0',
      zIndex:     '99990',
      background: 'transparent',
    });
    _backdropEl.addEventListener('click', _closePanel);
    document.body.appendChild(_backdropEl);

    /* Wrapper */
    const wrapper = document.createElement('div');
    wrapper.id = 'clientMsgPanelWrapper';
    wrapper.style.cssText = 'position:fixed;z-index:99991;';
    wrapper.innerHTML = _buildPanel();
    document.body.appendChild(wrapper);
    _panelEl = wrapper;

    /* Position relative to trigger button */
    _positionPanel(triggerEl);

    /* Animate in */
    requestAnimationFrame(() => {
      const panel = document.getElementById('clientMsgPanelEl');
      if (panel) {
        panel.style.opacity   = '1';
        panel.style.transform = 'translateY(0)';
      }
    });

    /* Mark trigger button as active */
    document.querySelectorAll('[data-client-msg-trigger]').forEach(b =>
      b.classList.add('np-trigger--active')
    );
  }

  function _closePanel() {
    if (!_open) return;
    _open = false;

    const panel = document.getElementById('clientMsgPanelEl');
    if (panel) {
      panel.style.opacity   = '0';
      panel.style.transform = 'translateY(-8px)';
    }

    document.querySelectorAll('[data-client-msg-trigger]').forEach(b =>
      b.classList.remove('np-trigger--active')
    );

    setTimeout(() => {
      if (_panelEl)    { _panelEl.remove();    _panelEl    = null; }
      if (_backdropEl) { _backdropEl.remove();  _backdropEl = null; }
    }, 220);
  }

  function _positionPanel(triggerEl) {
    const wrapper = document.getElementById('clientMsgPanelWrapper');
    if (!wrapper) return;

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      wrapper.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99991;';
      const panel = document.getElementById('clientMsgPanelEl');
      if (panel) {
        panel.style.width        = '100%';
        panel.style.borderRadius = '0 0 16px 16px';
        panel.style.maxHeight    = '80vh';
      }
      return;
    }

    if (!triggerEl) {
      wrapper.style.cssText = 'position:fixed;top:60px;right:16px;z-index:99991;';
      return;
    }

    const rect   = triggerEl.getBoundingClientRect();
    const panelW = 360;
    const vpW    = window.innerWidth;

    let left = rect.right - panelW;
    if (left < 8)                left = 8;
    if (left + panelW > vpW - 8) left = vpW - panelW - 8;

    const top = rect.bottom + 10;
    wrapper.style.cssText = `position:fixed;top:${top}px;left:${left}px;z-index:99991;`;
  }

  /* ── Actions ─────────────────────────────────────────────── */
  function _handleClick(threadId) {
    /* Mark that thread as read locally */
    const t = _threads.find(t => t.id === threadId);
    if (t) t.unread = 0;
    _refreshBadge();
    _closePanel();

    /* Navigate directly to that conversation thread.
       client-messages.html uses the URL hash to pre-select
       the correct thread on load (handled by nav.js / messages.js). */
    setTimeout(() => {
      window.location.href = `client-messages.html#${threadId}`;
    }, 120);
  }

  function _markAllRead() {
    _threads.forEach(t => { t.unread = 0; });
    _refreshBadge();
    _closePanel();
    /* Re-open updated panel */
    setTimeout(() => _openPanel(null), 280);
  }

  /* ── Keyboard: close on Escape ───────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (_open && e.key === 'Escape') _closePanel();
  });

  /* ── Public API ──────────────────────────────────────────── */
  const SHWClientMsgPanel = {
    toggle:       (triggerEl) => _openPanel(triggerEl),
    open:         (triggerEl) => { if (!_open) _openPanel(triggerEl); },
    close:        _closePanel,
    markAllRead:  _markAllRead,
    getUnread:    _totalUnread,
    _handleClick,

    /**
     * buildButton()
     * Returns the HTML string for the messages icon button.
     * Drop it into .topbar-right BEFORE the bell and avatar.
     */
    buildButton() {
      const count = _totalUnread();
      return `<button
        class="topbar-icon-btn"
        data-client-msg-trigger="client"
        aria-label="Open messages"
        aria-haspopup="dialog"
        aria-expanded="false"
        title="Messages"
        type="button"
        onclick="SHWClientMsgPanel.toggle(this)"
        style="position:relative;"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span data-client-msg-badge style="display:${count > 0 ? '' : 'none'};position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;border-radius:8px;background:#ef4444;color:#fff;font-size:9px;font-weight:700;line-height:16px;text-align:center;padding:0 3px;border:1.5px solid #fff;">${count > 9 ? '9+' : (count || '')}</span>
      </button>`;
    },
  };

  global.SHWClientMsgPanel = SHWClientMsgPanel;

  /* ── Auto-init badge on DOM ready ────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    _refreshBadge();
    // Load real threads from backend after a short delay
    // (ensures db.js / SHW is ready)
    setTimeout(_loadThreads, 300);
  });

})(window);
