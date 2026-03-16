/* ============================================================
   Satellite Home Watch — Global Notification Panel
   notif-panel.js
   v2 — deployment bundle refresh
   Shared across Client Portal, Staff Portal, Admin Portal, CRM
   Provides a modern dropdown / slide panel from the bell icon.
   
   Usage (called automatically after page load):
     initNotifPanel('client')  — client portal
     initNotifPanel('employee') — staff portal
     initNotifPanel('admin')    — admin / CRM portal
   ============================================================ */

(function (global) {
  'use strict';

  /* ── Portal data sources ──────────────────────────────────── */
  const PORTAL_CONFIG = {
    client: {
      dataFn:      () => (typeof CLIENT_NOTIFICATIONS !== 'undefined' ? CLIENT_NOTIFICATIONS : []),
      viewAllLink: 'client-notifications.html',
      label:       'Client Portal',
    },
    employee: {
      dataFn:      () => (typeof EMPLOYEE_NOTIFICATIONS !== 'undefined' ? EMPLOYEE_NOTIFICATIONS : []),
      viewAllLink: 'employee-notifications.html',
      label:       'Staff Portal',
    },
    admin: {
      dataFn:      () => (typeof ADMIN_NOTIFICATIONS !== 'undefined' ? ADMIN_NOTIFICATIONS : []),
      viewAllLink: 'admin-notifications.html',
      label:       'Admin Portal',
    },
  };

  /* ── Max notifications shown in the panel ─────────────────── */
  const PANEL_MAX_ITEMS = 8;

  /* ── Internal state ───────────────────────────────────────── */
  let _portal      = 'client';
  let _notifications = [];
  let _panelOpen   = false;
  let _panelEl     = null;
  let _backdropEl  = null;
  let _initialized = false;

  /* ── Time helper (re-uses notifications-data.js if loaded) ── */
  function _timeAgo(date) {
    if (typeof timeAgo === 'function') return timeAgo(date);
    const now  = Date.now();
    const diff = now - new Date(date).getTime();
    const m    = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'Yesterday';
    if (d < 7)  return `${d}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /* ── Icon helper (re-uses notifications-data.js if loaded) ── */
  function _getIcon(type, size) {
    if (typeof getNotifIcon === 'function') return getNotifIcon(type, size || 16);
    const s = size || 16;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
    </svg>`;
  }

  /* ── Category color map ───────────────────────────────────── */
  const CAT_COLORS = {
    message:    '#3b82f6',
    report:     '#8b5cf6',
    inspection: '#10b981',
    alert:      '#ef4444',
    document:   '#f59e0b',
    service:    '#06b6d4',
    account:    '#6366f1',
    system:     '#64748b',
  };

  /* ─────────────────────────────────────────────────────────── */
  /* BUILD PANEL HTML                                            */
  /* ─────────────────────────────────────────────────────────── */

  function _buildPanel() {
    const cfg    = PORTAL_CONFIG[_portal] || PORTAL_CONFIG.client;
    const data   = _notifications;
    const unread = data.filter(n => !n.read).length;

    /* Top N items for panel */
    const recent = [...data]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, PANEL_MAX_ITEMS);

    const itemsHTML = recent.length === 0
      ? `<div class="np-empty">
           <div class="np-empty-icon">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
               <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
               <path d="M13.73 21a2 2 0 01-3.46 0"/>
             </svg>
           </div>
           <p class="np-empty-text">You're all caught up!</p>
           <p class="np-empty-sub">No recent notifications</p>
         </div>`
      : recent.map(n => _buildItem(n)).join('');

    const badge = unread > 0
      ? `<span class="np-header-badge">${unread > 99 ? '99+' : unread}</span>`
      : '';

    return `
      <div class="np-panel" id="notifPanel" role="dialog" aria-modal="true" aria-label="Notifications panel">
        <!-- Arrow caret -->
        <div class="np-caret" aria-hidden="true"></div>

        <!-- Header -->
        <div class="np-header">
          <div class="np-header-left">
            <span class="np-header-title">Notifications</span>
            ${badge}
          </div>
          <div class="np-header-actions">
            ${unread > 0
              ? `<button class="np-mark-all-btn" onclick="SHWNotifPanel.markAllRead()" title="Mark all as read">
                   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                     <polyline points="20 6 9 17 4 12"/>
                   </svg>
                   Mark all read
                 </button>`
              : ''}
            <button class="np-close-btn" onclick="SHWNotifPanel.close()" aria-label="Close notifications">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Notifications list -->
        <div class="np-list" id="npList">
          ${itemsHTML}
        </div>

        <!-- Footer -->
        <div class="np-footer">
          <a href="${cfg.viewAllLink}" class="np-view-all-btn" onclick="SHWNotifPanel.close()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            View All Notifications
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:auto;">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </div>
      </div>`;
  }

  function _buildItem(n) {
    const color   = CAT_COLORS[n.type] || CAT_COLORS.system;
    const icon    = _getIcon(n.type, 15);
    const ago     = _timeAgo(n.timestamp);
    const isUnread = !n.read;
    const isUrgent = n.priority === 'urgent';

    const urgentBadge = isUrgent
      ? `<span class="np-item-urgent">Urgent</span>`
      : '';

    return `
      <div class="np-item ${isUnread ? 'np-item--unread' : ''} ${isUrgent ? 'np-item--urgent' : ''}"
           data-notif-id="${n.id}"
           data-notif-portal="${_portal}"
           onclick="SHWNotifPanel._handleItemClick('${n.id}', '${n.link || ''}')"
           role="button"
           tabindex="0"
           onkeydown="if(event.key==='Enter'||event.key===' ')SHWNotifPanel._handleItemClick('${n.id}','${n.link || ''}')"
           aria-label="${isUnread ? 'Unread: ' : ''}${n.title}">
        <!-- Icon -->
        <div class="np-item-icon" style="--np-cat-color:${color}">
          ${icon}
          ${isUnread ? '<span class="np-item-dot" aria-hidden="true"></span>' : ''}
        </div>
        <!-- Body -->
        <div class="np-item-body">
          <div class="np-item-top">
            <span class="np-item-title">${n.title}</span>
            ${urgentBadge}
          </div>
          <p class="np-item-desc">${n.body}</p>
          <div class="np-item-meta">
            <span class="np-item-time">${ago}</span>
            ${n.link
              ? `<a class="np-item-link" href="${n.link}" onclick="event.stopPropagation();SHWNotifPanel.close();">${n.linkLabel || 'View'} →</a>`
              : ''}
          </div>
        </div>
        <!-- Unread accent strip rendered via CSS ::before -->
      </div>`;
  }

  /* ─────────────────────────────────────────────────────────── */
  /* DOM INJECTION                                               */
  /* ─────────────────────────────────────────────────────────── */

  function _inject() {
    /* Remove old panel if exists */
    const old = document.getElementById('notifPanelWrapper');
    if (old) old.remove();
    const oldBackdrop = document.getElementById('notifPanelBackdrop');
    if (oldBackdrop) oldBackdrop.remove();

    /* Backdrop */
    _backdropEl = document.createElement('div');
    _backdropEl.id = 'notifPanelBackdrop';
    _backdropEl.className = 'np-backdrop';
    _backdropEl.setAttribute('aria-hidden', 'true');
    _backdropEl.addEventListener('click', _closePanel);
    document.body.appendChild(_backdropEl);

    /* Panel wrapper — attached to body so it overlays everything */
    const wrapper = document.createElement('div');
    wrapper.id = 'notifPanelWrapper';
    wrapper.className = 'np-wrapper';
    wrapper.innerHTML = _buildPanel();
    document.body.appendChild(wrapper);

    _panelEl = wrapper;
  }

  /* ─────────────────────────────────────────────────────────── */
  /* OPEN / CLOSE                                                */
  /* ─────────────────────────────────────────────────────────── */

  function _openPanel(triggerEl) {
    if (_panelOpen) {
      _closePanel();
      return;
    }

    /* Re-inject with fresh data each open */
    _notifications = (PORTAL_CONFIG[_portal]?.dataFn() || []).map(n => ({ ...n }));
    _inject();

    _panelOpen = true;

    /* Position panel relative to trigger button */
    _positionPanel(triggerEl);

    /* Animate in */
    requestAnimationFrame(() => {
      const panel = document.getElementById('notifPanel');
      if (panel) panel.classList.add('np-panel--open');
      if (_backdropEl) _backdropEl.classList.add('np-backdrop--visible');
    });

    /* Mark bell button as active */
    document.querySelectorAll('[data-notif-trigger]').forEach(btn => btn.classList.add('np-trigger--active'));

    /* Focus management */
    setTimeout(() => {
      const firstItem = _panelEl?.querySelector('.np-item, .np-close-btn');
      if (firstItem) firstItem.focus();
    }, 150);
  }

  function _closePanel() {
    if (!_panelOpen) return;
    _panelOpen = false;

    const panel = document.getElementById('notifPanel');
    if (panel) {
      panel.classList.remove('np-panel--open');
      panel.classList.add('np-panel--closing');
    }
    if (_backdropEl) _backdropEl.classList.remove('np-backdrop--visible');

    document.querySelectorAll('[data-notif-trigger]').forEach(btn => btn.classList.remove('np-trigger--active'));

    setTimeout(() => {
      if (_panelEl) { _panelEl.remove(); _panelEl = null; }
      if (_backdropEl) { _backdropEl.remove(); _backdropEl = null; }
    }, 280);
  }

  /* ─────────────────────────────────────────────────────────── */
  /* POSITIONING                                                 */
  /* ─────────────────────────────────────────────────────────── */

  function _positionPanel(triggerEl) {
    const wrapper = document.getElementById('notifPanelWrapper');
    if (!wrapper) return;

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      /* Mobile: full-width sheet from top */
      wrapper.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 99999;
      `;
      const panel = document.getElementById('notifPanel');
      if (panel) {
        panel.style.cssText = `
          position: relative;
          width: 100%;
          max-height: 85vh;
          border-radius: 0 0 20px 20px;
          margin: 0;
        `;
        /* Hide caret on mobile */
        const caret = panel.querySelector('.np-caret');
        if (caret) caret.style.display = 'none';
      }
      return;
    }

    /* Desktop / tablet: dropdown aligned to bell button */
    if (!triggerEl) {
      /* Fallback: top-right corner */
      wrapper.style.cssText = `
        position: fixed;
        top: 60px;
        right: 16px;
        z-index: 99999;
      `;
      return;
    }

    const rect   = triggerEl.getBoundingClientRect();
    const panelW = 400; /* from CSS */
    const vpW    = window.innerWidth;

    let left = rect.right - panelW;
    if (left < 8) left = 8;
    if (left + panelW > vpW - 8) left = vpW - panelW - 8;

    const top = rect.bottom + 10;

    wrapper.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      z-index: 99999;
    `;

    /* Move caret to align with bell */
    const panel = document.getElementById('notifPanel');
    if (panel) {
      panel.style.width = `${panelW}px`;
      const caret = panel.querySelector('.np-caret');
      if (caret) {
        const caretOffset = rect.left + rect.width / 2 - left - 10;
        caret.style.left  = `${Math.max(10, Math.min(panelW - 30, caretOffset))}px`;
      }
    }
  }

  /* ─────────────────────────────────────────────────────────── */
  /* BADGE MANAGEMENT                                            */
  /* ─────────────────────────────────────────────────────────── */

  function _refreshBadges() {
    const unread = _notifications.filter(n => !n.read).length;
    _updateBadgeDisplay(unread);
  }

  function _updateBadgeDisplay(count) {
    document.querySelectorAll(
      '.topbar-notif-badge, .mobile-topbar-badge, [data-notif-badge]'
    ).forEach(el => {
      if (count <= 0) {
        el.textContent = '';
        el.style.display = 'none';
      } else {
        el.textContent = count > 9 ? '9+' : count;
        el.style.display = '';
      }
    });
  }

  /* ─────────────────────────────────────────────────────────── */
  /* ACTIONS                                                     */
  /* ─────────────────────────────────────────────────────────── */

  function _handleItemClick(id, link) {
    /* Mark as read */
    const n = _notifications.find(x => x.id === id);
    if (n && !n.read) {
      n.read = true;
      const itemEl = _panelEl?.querySelector(`[data-notif-id="${id}"]`);
      if (itemEl) {
        itemEl.classList.remove('np-item--unread');
        const dot = itemEl.querySelector('.np-item-dot');
        if (dot) dot.remove();
      }
      /* Refresh badge */
      _refreshBadges();
      /* Refresh unread count in header */
      _refreshPanelHeader();
    }
    /* Navigate — use the notification's own link (deep link) */
    const destination = (n && n.link) ? n.link : link;
    if (destination && destination !== '#') {
      _closePanel();
      setTimeout(() => { window.location.href = destination; }, 100);
    }
  }

  function _markAllRead() {
    _notifications.forEach(n => { n.read = true; });
    /* Re-render list */
    const listEl = document.getElementById('npList');
    if (listEl) {
      listEl.innerHTML = _notifications
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, PANEL_MAX_ITEMS)
        .map(n => _buildItem(n))
        .join('');
    }
    _refreshBadges();
    _refreshPanelHeader();
  }

  function _refreshPanelHeader() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    const unread = _notifications.filter(n => !n.read).length;
    const badgeEl = panel.querySelector('.np-header-badge');
    if (badgeEl) {
      if (unread <= 0) {
        badgeEl.remove();
      } else {
        badgeEl.textContent = unread > 99 ? '99+' : unread;
      }
    }
    const markAllBtn = panel.querySelector('.np-mark-all-btn');
    if (markAllBtn && unread <= 0) markAllBtn.style.display = 'none';
  }

  /* ─────────────────────────────────────────────────────────── */
  /* KEYBOARD NAVIGATION                                         */
  /* ─────────────────────────────────────────────────────────── */

  function _onKeyDown(e) {
    if (!_panelOpen) return;
    if (e.key === 'Escape') {
      _closePanel();
      /* Return focus to bell trigger */
      const trigger = document.querySelector('[data-notif-trigger]');
      if (trigger) trigger.focus();
    }
    /* Tab trap inside panel */
    if (e.key === 'Tab' && _panelEl) {
      const focusable = _panelEl.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex="0"]'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* ─────────────────────────────────────────────────────────── */
  /* BELL BUTTON BUILDER                                         */
  /* Generates the HTML for the bell button with correct attrs.  */
  /* ─────────────────────────────────────────────────────────── */

  /**
   * Returns the HTML string for a bell button that triggers the panel.
   * @param {string} portal   - 'client' | 'employee' | 'admin'
   * @param {string} classes  - extra CSS classes for the button
   * @param {number} [unread] - initial unread count (for badge)
   */
  function buildBellButton(portal, classes, unread) {
    const count      = typeof unread === 'number' ? unread : _getInitialUnread(portal);
    const badgeHTML  = count > 0
      ? `<span class="topbar-notif-badge" aria-label="${count} unread notifications">${count > 9 ? '9+' : count}</span>`
      : `<span class="topbar-notif-badge" style="display:none;" aria-hidden="true"></span>`;

    return `<button
      class="${classes || 'topbar-icon-btn'} np-bell-btn"
      data-notif-trigger="${portal}"
      aria-label="Open notifications"
      aria-haspopup="dialog"
      aria-expanded="false"
      title="Notifications"
      type="button"
      onclick="SHWNotifPanel.toggle(this)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
      ${badgeHTML}
    </button>`;
  }

  /**
   * Returns the HTML for a mobile topbar bell button.
   * @param {string} portal
   */
  function buildMobileBellButton(portal) {
    const count     = _getInitialUnread(portal);
    const badgeHTML = count > 0
      ? `<span class="mobile-topbar-badge" aria-label="${count} unread">${count > 9 ? '9+' : count}</span>`
      : `<span class="mobile-topbar-badge" style="display:none;" aria-hidden="true"></span>`;

    return `<button
      class="mobile-topbar-action-btn np-bell-btn"
      data-notif-trigger="${portal}"
      aria-label="Open notifications"
      aria-haspopup="dialog"
      aria-expanded="false"
      title="Notifications"
      type="button"
      onclick="SHWNotifPanel.toggle(this)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
      ${badgeHTML}
    </button>`;
  }

  function _getInitialUnread(portal) {
    const cfg  = PORTAL_CONFIG[portal] || PORTAL_CONFIG.client;
    const data = cfg.dataFn();
    return data.filter(n => !n.read).length;
  }

  /* ─────────────────────────────────────────────────────────── */
  /* INITIALISE                                                  */
  /* ─────────────────────────────────────────────────────────── */

  function init(portal) {
    _portal = portal || 'client';
    _notifications = ((PORTAL_CONFIG[_portal]?.dataFn()) || []).map(n => ({ ...n }));

    if (!_initialized) {
      document.addEventListener('keydown', _onKeyDown);
      _initialized = true;
    }

    /* Set initial badge counts */
    _refreshBadges();

    /* Wire up any existing bell buttons that are already in DOM */
    _wireBellButtons();

    /* Observe DOM mutations for dynamically added bell buttons */
    if (window.MutationObserver) {
      const obs = new MutationObserver(() => _wireBellButtons());
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  function _wireBellButtons() {
    document.querySelectorAll('[data-notif-trigger]:not([data-np-wired])').forEach(btn => {
      btn.setAttribute('data-np-wired', '1');
      /* onclick is inline in the HTML; nothing extra needed here */
    });
  }

  /* ─────────────────────────────────────────────────────────── */
  /* PUBLIC API                                                  */
  /* ─────────────────────────────────────────────────────────── */

  const SHWNotifPanel = {
    init,
    toggle:       (triggerEl) => _openPanel(triggerEl),
    open:         (triggerEl) => { if (!_panelOpen) _openPanel(triggerEl); },
    close:        _closePanel,
    markAllRead:  _markAllRead,
    buildBell:    buildBellButton,
    buildMobileBell: buildMobileBellButton,
    _handleItemClick,
    isOpen:       () => _panelOpen,
    getUnread:    () => _notifications.filter(n => !n.read).length,
  };

  global.SHWNotifPanel = SHWNotifPanel;

  /* Auto-init: portal is detected from filename */
  document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname.split('/').pop() || '';
    let portal = 'client';
    if (path.startsWith('employee-') || path.startsWith('emp-')) portal = 'employee';
    else if (
      path.startsWith('admin-') ||
      path.startsWith('crm-') ||
      path.startsWith('activate')
    ) portal = 'admin';
    SHWNotifPanel.init(portal);
  });

})(window);
