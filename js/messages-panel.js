/* ============================================================
   Satellite Home Watch — Messages Panel
   messages-panel.js
   v2 — deployment bundle refresh
   Provides a lightweight unread messages dropdown for the
   admin/executive topbar. Separate from the notifications bell.

   Usage:
     Include this script on admin pages.
     Add the messages button via: SHWMsgPanel.buildButton()
     or use the pre-rendered button HTML in the topbar.
   ============================================================ */

(function (global) {
  'use strict';

  /* ── Message previews loaded dynamically from backend ─────── */
  const ADMIN_UNREAD_MESSAGES = [];

  /* ── State ────────────────────────────────────────────────── */
  let _open      = false;
  let _panelEl   = null;
  let _backdropEl = null;
  let _msgs      = ADMIN_UNREAD_MESSAGES.map(m => ({ ...m }));

  /* ── Helpers ─────────────────────────────────────────────── */
  function _timeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const m    = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'Yesterday' : `${d}d ago`;
  }

  function _unreadCount() {
    return _msgs.filter(m => !m.read).length;
  }

  function _refreshBadge() {
    const count = _unreadCount();
    document.querySelectorAll('[data-msg-badge]').forEach(el => {
      if (count <= 0) { el.textContent = ''; el.style.display = 'none'; }
      else            { el.textContent = count > 9 ? '9+' : count; el.style.display = ''; }
    });
  }

  /* ── Panel HTML ──────────────────────────────────────────── */
  function _buildPanel() {
    const unread = _unreadCount();
    const recent = [..._msgs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

    const badge  = unread > 0 ? `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:9px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;padding:0 4px;margin-left:6px;">${unread > 9 ? '9+' : unread}</span>` : '';

    const itemsHTML = recent.length === 0
      ? `<div style="padding:32px 20px;text-align:center;color:#94a3b8;">
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 8px;display:block;opacity:.5;">
             <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
           </svg>
           <p style="font-size:13px;margin:0;">No new messages</p>
         </div>`
      : recent.map(m => `
          <div onclick="SHWMsgPanel._handleClick('${m.id}')"
               style="display:flex;gap:12px;padding:11px 16px;cursor:pointer;border-bottom:1px solid #f8fafc;transition:background .12s;${!m.read ? 'background:#fafcff;' : ''}"
               onmouseover="this.style.background='#f0f5ff'"
               onmouseout="this.style.background='${!m.read ? '#fafcff' : '#fff'}'">
            <div style="width:36px;height:36px;border-radius:50%;background:${m.fromColor};color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;">
              ${m.fromInitials}
              ${!m.read ? '<span style="position:absolute;top:-1px;right:-1px;width:9px;height:9px;border-radius:50%;background:#3b82f6;border:1.5px solid #fff;"></span>' : ''}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-bottom:2px;">
                <span style="font-size:12px;font-weight:${!m.read ? '700' : '600'};color:#0f1e38;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${m.from}</span>
                <span style="font-size:10px;color:#94a3b8;white-space:nowrap;flex-shrink:0;">${_timeAgo(m.timestamp)}</span>
              </div>
              <div style="font-size:12px;font-weight:${!m.read ? '600' : '500'};color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">${m.subject}</div>
              <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.preview}</div>
            </div>
          </div>`).join('');

    return `
      <div id="msgPanelEl" style="
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
            ${badge}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${unread > 0 ? `<button onclick="SHWMsgPanel.markAllRead()" style="font-size:11px;font-weight:600;color:#162d56;background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:5px;" title="Mark all read">Mark all read</button>` : ''}
            <button onclick="SHWMsgPanel.close()" style="width:26px;height:26px;border-radius:6px;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer;display:flex;align-items:center;justify-content:center;" aria-label="Close messages">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <!-- List -->
        <div id="msgPanelList" style="overflow-y:auto;flex:1;">
          ${itemsHTML}
        </div>
        <!-- Footer -->
        <div style="padding:10px 16px;border-top:1px solid #f1f5f9;">
          <a href="admin-messages.html" onclick="SHWMsgPanel.close()" style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:600;color:#162d56;text-decoration:none;padding:7px;border-radius:8px;background:#f0f5ff;transition:background .15s;" onmouseover="this.style.background='#e0eaff'" onmouseout="this.style.background='#f0f5ff'">
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

    /* Backdrop */
    _backdropEl = document.createElement('div');
    _backdropEl.id = 'msgPanelBackdrop';
    Object.assign(_backdropEl.style, { position:'fixed', inset:'0', zIndex:'99990', background:'transparent' });
    _backdropEl.addEventListener('click', _closePanel);
    document.body.appendChild(_backdropEl);

    /* Wrapper */
    const wrapper = document.createElement('div');
    wrapper.id = 'msgPanelWrapper';
    wrapper.style.cssText = 'position:fixed;z-index:99991;';
    wrapper.innerHTML = _buildPanel();
    document.body.appendChild(wrapper);
    _panelEl = wrapper;

    /* Position */
    _positionPanel(triggerEl);

    /* Animate in */
    requestAnimationFrame(() => {
      const panel = document.getElementById('msgPanelEl');
      if (panel) { panel.style.opacity = '1'; panel.style.transform = 'translateY(0)'; }
    });

    /* Mark trigger active */
    document.querySelectorAll('[data-msg-trigger]').forEach(b => b.classList.add('np-trigger--active'));
  }

  function _closePanel() {
    if (!_open) return;
    _open = false;
    const panel = document.getElementById('msgPanelEl');
    if (panel) { panel.style.opacity = '0'; panel.style.transform = 'translateY(-8px)'; }
    document.querySelectorAll('[data-msg-trigger]').forEach(b => b.classList.remove('np-trigger--active'));
    setTimeout(() => {
      if (_panelEl)   { _panelEl.remove();    _panelEl = null; }
      if (_backdropEl){ _backdropEl.remove();  _backdropEl = null; }
    }, 220);
  }

  function _positionPanel(triggerEl) {
    const wrapper = document.getElementById('msgPanelWrapper');
    if (!wrapper) return;

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      wrapper.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99991;';
      const panel = document.getElementById('msgPanelEl');
      if (panel) {
        panel.style.width = '100%';
        panel.style.borderRadius = '0 0 16px 16px';
        panel.style.maxHeight = '80vh';
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
    if (left < 8)              left = 8;
    if (left + panelW > vpW - 8) left = vpW - panelW - 8;

    const top = rect.bottom + 10;
    wrapper.style.cssText = `position:fixed;top:${top}px;left:${left}px;z-index:99991;`;
  }

  /* ── Actions ─────────────────────────────────────────────── */
  function _handleClick(id) {
    const msg = _msgs.find(m => m.id === id);
    if (!msg) return;
    msg.read = true;
    _refreshBadge();
    _closePanel();
    setTimeout(() => {
      window.location.href = `admin-messages.html${msg.threadId ? '?threadId=' + msg.threadId : ''}`;
    }, 100);
  }

  function _markAllRead() {
    _msgs.forEach(m => { m.read = true; });
    _refreshBadge();
    _closePanel();
    // Re-open with updated data
    setTimeout(() => _openPanel(null), 250);
  }

  /* ── Keyboard ────────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (_open && e.key === 'Escape') _closePanel();
  });

  /* ── Public API ──────────────────────────────────────────── */
  const SHWMsgPanel = {
    toggle:      (triggerEl) => _openPanel(triggerEl),
    open:        (triggerEl) => { if (!_open) _openPanel(triggerEl); },
    close:       _closePanel,
    markAllRead: _markAllRead,
    getUnread:   _unreadCount,
    _handleClick,
    /* Build the HTML for the messages button */
    buildButton: function () {
      const count = _unreadCount();
      return `<button
        class="topbar-icon-btn"
        data-msg-trigger="admin"
        aria-label="Open messages"
        aria-haspopup="dialog"
        aria-expanded="false"
        title="Messages"
        type="button"
        onclick="SHWMsgPanel.toggle(this)"
        style="position:relative;"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span data-msg-badge style="display:${count > 0 ? '' : 'none'};position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;border-radius:8px;background:#ef4444;color:#fff;font-size:9px;font-weight:700;line-height:16px;text-align:center;padding:0 3px;border:1.5px solid #fff;">${count > 9 ? '9+' : (count || '')}</span>
      </button>`;
    },
  };

  global.SHWMsgPanel = SHWMsgPanel;

  /* Auto-init badge on page load */
  document.addEventListener('DOMContentLoaded', function () {
    // Only initialize on admin pages
    const path = window.location.pathname.split('/').pop() || '';
    if (path.startsWith('admin-') || path.startsWith('crm-')) {
      _refreshBadge();
    }
  });

})(window);
