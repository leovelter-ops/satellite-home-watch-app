/* ============================================================
   Satellite Home Watch — Notifications Data & Engine
   Shared across Client, Staff, and Admin portals
   v2 — deployment bundle refresh
   ============================================================ */

// ── Notification categories ──────────────────────────────────
const NOTIF_CATEGORIES = {
  message:      { label: 'Message',        color: '#3b82f6', icon: 'message'   },
  report:       { label: 'Report',         color: '#8b5cf6', icon: 'report'    },
  inspection:   { label: 'Inspection',     color: '#10b981', icon: 'inspection'},
  alert:        { label: 'Alert',          color: '#ef4444', icon: 'alert'     },
  document:     { label: 'Document',       color: '#f59e0b', icon: 'document'  },
  service:      { label: 'Service',        color: '#06b6d4', icon: 'service'   },
  account:      { label: 'Account',        color: '#6366f1', icon: 'account'   },
  system:       { label: 'System',         color: '#64748b', icon: 'system'    },
};

// ── SVG icon paths by type ────────────────────────────────────
function getNotifIcon(type, size = 18) {
  const s = size;
  switch (type) {
    case 'message':
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
    case 'report':
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
    case 'inspection':
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`;
    case 'alert':
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    case 'document':
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
    case 'service':
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h2M2 12h2M18.66 18.66l1.41 1.41M4.93 4.93l1.41 1.41M12 20v2M12 2v2"/></svg>`;
    case 'account':
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    case 'system':
    default:
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
  }
}

// ── Time helpers ─────────────────────────────────────────────
function timeAgo(date) {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d} days ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDay(notifications) {
  const groups = {};
  notifications.forEach(n => {
    const d = new Date(n.timestamp);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    let key;
    if (d.toDateString() === today.toDateString()) key = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) key = 'Yesterday';
    else key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
}

// ─────────────────────────────────────────────────────────────
// CLIENT PORTAL NOTIFICATIONS
// Populated at runtime from the backend notifications table.
// ─────────────────────────────────────────────────────────────
const CLIENT_NOTIFICATIONS = [];

// ─────────────────────────────────────────────────────────────
// EMPLOYEE / STAFF PORTAL NOTIFICATIONS
// Populated at runtime from the backend notifications table.
// ─────────────────────────────────────────────────────────────
const EMPLOYEE_NOTIFICATIONS = [];

// ─────────────────────────────────────────────────────────────
// ADMIN / CRM PORTAL NOTIFICATIONS
// Populated at runtime from the backend notifications table.
// ─────────────────────────────────────────────────────────────
const ADMIN_NOTIFICATIONS = [];

// ─────────────────────────────────────────────────────────────
// NOTIFICATION SYSTEM EVENTS REGISTRY
// Defines all system events that generate notifications,
// which user roles receive them, and routing information.
// Ready for backend event-listener implementation.
// ─────────────────────────────────────────────────────────────

const NOTIFICATION_EVENTS = {
  // ── Customer / Invitation Events ────────────────────────────
  'customer.invited': {
    label: 'Customer Invited',
    category: 'account',
    description: 'Triggered when admin sends an invitation to a new customer.',
    recipients: ['admin', 'manager'],
    emailTemplate: 'invitation',
    admin_title: 'Invitation sent to {{customer_name}}',
    admin_body: 'Invitation email sent to {{customer_email}}. Link valid for 7 days.',
    link: 'admin-invitations.html',
  },
  'invitation.accepted': {
    label: 'Invitation Accepted',
    category: 'account',
    description: 'Triggered when a customer clicks their invite link and creates a password.',
    recipients: ['admin', 'manager'],
    emailTemplate: 'welcome',
    admin_title: '{{customer_name}} activated their account',
    admin_body: 'Invitation accepted — account is now active. Properties linked and portal ready.',
    link: 'crm-customers.html',
  },
  'invitation.expired': {
    label: 'Invitation Expired',
    category: 'account',
    description: 'Triggered when an invitation link passes its expiry date without being accepted.',
    recipients: ['admin', 'manager'],
    admin_title: 'Invitation expired for {{customer_name}}',
    admin_body: 'The invitation link for {{customer_email}} has expired. Resend from the Invitations page.',
    link: 'admin-invitations.html',
  },
  'invitation.revoked': {
    label: 'Invitation Revoked',
    category: 'account',
    description: 'Triggered when admin manually revokes a pending invitation.',
    recipients: ['admin', 'manager'],
    admin_title: 'Invitation revoked for {{customer_name}}',
    admin_body: 'The pending invitation for {{customer_email}} has been revoked.',
    link: 'admin-invitations.html',
  },

  // ── Visit Events ─────────────────────────────────────────────
  'visit.started': {
    label: 'Visit Started',
    category: 'inspection',
    description: 'Triggered when an inspector presses Start Inspection (status: in_progress).',
    recipients: ['admin', 'manager', 'client'],
    client_title: 'Inspector arrived — {{property_name}}',
    client_body: '{{inspector_name}} has started the inspection at {{property_name}}.',
    admin_title: 'Visit started — {{property_name}}',
    admin_body: '{{inspector_name}} has started the inspection at {{property_name}} ({{visit_type}}).',
    link_admin: 'admin-schedule.html',
    link_client: 'client-track-visit.html',
  },
  'visit.completed': {
    label: 'Visit Completed',
    category: 'inspection',
    description: 'Triggered when an inspector marks a visit as completed.',
    recipients: ['admin', 'manager', 'client'],
    emailTemplate: 'visit_completed',
    client_title: 'Inspection complete — {{property_name}}',
    client_body: 'Your inspection at {{property_name}} is complete. Report will be available shortly.',
    admin_title: 'Visit completed — {{property_name}}',
    admin_body: '{{inspector_name}} completed the inspection at {{property_name}}. Result: {{overall_result}}.',
    link_admin: 'admin-schedule.html',
    link_client: 'client-visits.html',
  },

  // ── Report Events ────────────────────────────────────────────
  'report.published': {
    label: 'Report Published',
    category: 'report',
    description: 'Triggered when a report PDF is published to the client portal.',
    recipients: ['admin', 'manager', 'client'],
    emailTemplate: 'report_ready',
    client_title: 'New inspection report available — {{property_name}}',
    client_body: 'Your {{report_date}} inspection report is ready to view and download.',
    admin_title: 'Report published — {{property_name}}',
    admin_body: 'Report "{{report_title}}" published to client portal for {{customer_name}}.',
    link_admin: 'admin-documents.html',
    link_client: 'client-reports.html',
  },
  'report.pdf_generated': {
    label: 'PDF Generated',
    category: 'report',
    description: 'Triggered when a PDF is auto-generated from a completed visit.',
    recipients: ['admin', 'manager', 'inspector'],
    admin_title: 'PDF generated — {{report_title}}',
    admin_body: 'PDF report auto-generated for {{property_name}} visit on {{visit_date}}. Ready for review.',
    link_admin: 'admin-documents.html',
  },

  // ── Alert Events ─────────────────────────────────────────────
  'alert.created': {
    label: 'Alert Created',
    category: 'alert',
    description: 'Triggered when an inspector or admin creates a new property alert.',
    recipients: ['admin', 'manager', 'client'],
    emailTemplate: 'new_alert',
    client_title: '⚠️ Property alert: {{alert_title}}',
    client_body: 'A {{alert_severity}} severity alert has been created for {{property_name}}.',
    admin_title: 'New alert — {{alert_title}}',
    admin_body: '{{alert_severity}} severity alert at {{property_name}}: {{alert_description}}',
    link_admin: 'admin-alerts.html',
    link_client: 'client-alerts.html',
  },
  'alert.resolved': {
    label: 'Alert Resolved',
    category: 'alert',
    description: 'Triggered when an alert is marked as resolved.',
    recipients: ['admin', 'manager', 'client'],
    client_title: '✓ Alert resolved — {{alert_title}}',
    client_body: 'The alert at {{property_name}} has been resolved by your coordinator.',
    admin_title: 'Alert resolved — {{alert_title}}',
    admin_body: '{{alert_title}} at {{property_name}} marked as resolved.',
    link_admin: 'admin-alerts.html',
    link_client: 'client-alerts.html',
  },

  // ── Service Request Events ────────────────────────────────────
  'service_request.submitted': {
    label: 'Service Request Submitted',
    category: 'service',
    description: 'Triggered when a customer submits a new service request from their portal.',
    recipients: ['admin', 'manager'],
    emailTemplate: 'service_request_received',
    admin_title: 'New service request — {{request_type}}',
    admin_body: '{{customer_name}} submitted a service request for {{property_name}}: {{request_type}}.',
    link_admin: 'crm-requests.html',
  },
  'service_request.scheduled': {
    label: 'Service Request Scheduled',
    category: 'service',
    description: 'Triggered when a service request is scheduled with a date/vendor.',
    recipients: ['admin', 'manager', 'client'],
    emailTemplate: 'service_request_scheduled',
    client_title: 'Service scheduled — {{request_type}}',
    client_body: 'Your {{request_type}} request has been scheduled for {{scheduled_date}}.',
    admin_title: 'Service request scheduled — {{request_type}}',
    admin_body: '{{request_type}} for {{customer_name}} scheduled for {{scheduled_date}}.',
    link_admin: 'crm-requests.html',
    link_client: 'client-request-service.html',
  },
  'service_request.completed': {
    label: 'Service Request Completed',
    category: 'service',
    description: 'Triggered when a service request is marked as completed.',
    recipients: ['admin', 'manager', 'client'],
    client_title: '✓ Service complete — {{request_type}}',
    client_body: 'Your {{request_type}} service at {{property_name}} has been completed.',
    admin_title: 'Service completed — {{request_type}}',
    admin_body: '{{request_type}} for {{customer_name}} at {{property_name}} marked complete.',
    link_admin: 'crm-requests.html',
    link_client: 'client-request-service.html',
  },
};

// ── Notification routing helper ───────────────────────────────
// Usage: dispatchNotification('alert.created', { property_name: '...', ... }, 'admin')
// In a real backend, this would write to the notifications table and send emails.
function dispatchNotification(eventKey, vars, targetRole) {
  const event = NOTIFICATION_EVENTS[eventKey];
  if (!event) return null;

  const titleTemplate = event[`${targetRole}_title`] || event.admin_title || event.label;
  const bodyTemplate  = event[`${targetRole}_body`]  || event.admin_body  || '';
  const link          = event[`link_${targetRole}`]  || event.link        || '#';

  // Substitute variables
  const substitute = str => str ? str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `{{${k}}}`) : '';

  return {
    id:        `notif-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    type:      event.category,
    title:     substitute(titleTemplate),
    body:      substitute(bodyTemplate),
    timestamp: new Date().toISOString(),
    read:      false,
    link,
    priority:  eventKey.includes('alert') ? 'urgent' : 'normal',
    event_key: eventKey,
  };
}

// Note: All three notification arrays (CLIENT, EMPLOYEE, ADMIN) are populated
// at runtime from the backend notifications table via the portal page scripts.

/**
 * Returns HTML string for a single notification row.
 * @param {object} n  – notification object
 * @param {string} [highlightId] – optional id to auto-highlight
 */
function renderNotifRow(n, highlightId) {
  const cat  = NOTIF_CATEGORIES[n.type] || NOTIF_CATEGORIES.system;
  const icon = getNotifIcon(n.type);
  const ago  = timeAgo(n.timestamp);
  const isUrgent = n.priority === 'urgent';
  const isUnread = !n.read;
  const isHighlight = n.id === highlightId;

  return `
    <div class="notif-row ${isUnread ? 'notif-unread' : ''} ${isUrgent ? 'notif-urgent' : ''} ${isHighlight ? 'notif-highlight' : ''}"
         data-id="${n.id}" data-type="${n.type}" onclick="markRead('${n.id}', this)">
      <div class="notif-icon-wrap" style="--cat-color:${cat.color}">
        ${icon}
        ${isUnread ? '<span class="notif-dot" aria-hidden="true"></span>' : ''}
      </div>
      <div class="notif-body">
        <div class="notif-title-row">
          <span class="notif-title">${n.title}</span>
          <span class="notif-time">${ago}</span>
        </div>
        <p class="notif-desc">${n.body}</p>
        <div class="notif-footer-row">
          <span class="notif-cat-chip" style="--cat-color:${cat.color}">${cat.label}</span>
          ${isUrgent ? '<span class="notif-urgent-chip">Urgent</span>' : ''}
          ${n.link ? `<a class="notif-action-link" href="${n.link}" onclick="event.stopPropagation()">${n.linkLabel || 'View'} →</a>` : ''}
        </div>
      </div>
    </div>`;
}

/**
 * Renders grouped notification feed into a container element.
 * @param {HTMLElement} container
 * @param {Array} notifications
 * @param {string} [filter]  – 'all' | type string
 * @param {boolean} [unreadOnly]
 */
function renderNotifFeed(container, notifications, filter, unreadOnly) {
  filter = filter || 'all';

  let list = [...notifications].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (unreadOnly) list = list.filter(n => !n.read);
  if (filter !== 'all') list = list.filter(n => n.type === filter);

  if (list.length === 0) {
    container.innerHTML = `
      <div class="notif-empty">
        <div class="notif-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>
        <p class="notif-empty-title">All caught up</p>
        <p class="notif-empty-sub">No notifications match your current filter.</p>
      </div>`;
    return;
  }

  const groups = groupByDay(list);
  let html = '';
  for (const [day, items] of Object.entries(groups)) {
    html += `<div class="notif-day-group"><div class="notif-day-label">${day}</div>`;
    items.forEach(n => { html += renderNotifRow(n); });
    html += '</div>';
  }
  container.innerHTML = html;
}

/**
 * Mark a notification as read (visual only — no backend call needed).
 */
function markRead(id, rowEl) {
  if (rowEl) {
    rowEl.classList.remove('notif-unread');
    const dot = rowEl.querySelector('.notif-dot');
    if (dot) dot.remove();
  }
  // Decrement badge
  updateNotifBadge(-1);
}

function markAllRead(notifications, feedContainer, filter, unreadOnly) {
  notifications.forEach(n => { n.read = true; });
  renderNotifFeed(feedContainer, notifications, filter, unreadOnly);
  // Zero out badge
  document.querySelectorAll('.topbar-notif-badge, .mobile-topbar-badge').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
}

function updateNotifBadge(delta) {
  document.querySelectorAll('.topbar-notif-badge, .mobile-topbar-badge').forEach(el => {
    const cur = parseInt(el.textContent || '0', 10);
    const next = Math.max(0, cur + delta);
    if (next === 0) {
      el.textContent = '';
      el.style.display = 'none';
    } else {
      el.textContent = next > 9 ? '9+' : next;
      el.style.display = '';
    }
  });
}
