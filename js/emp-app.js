/**
 * ═══════════════════════════════════════════════════════════════
 *  SATELLITE HOME WATCH — EMPLOYEE PORTAL APP
 *  emp-app.js — Session, sidebar renderer, shared utilities
 *  v2 — deployment bundle refresh
 * ═══════════════════════════════════════════════════════════════
 */

// ─── SESSION RESOLVER ────────────────────────────────────────────────────────
// Reads the active session from sessionStorage (written by auth.html on login).
// Returns null if no valid session exists — pages should redirect via role-guard.
//
function _resolveAdminSession(fallback) {
  try {
    const stored = sessionStorage.getItem('shw_admin_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.role && parsed.userId) return parsed;
    }
  } catch(e) { /* ignore */ }
  return fallback || null;
}

function _resolveEmpSession(fallback) {
  try {
    const stored = sessionStorage.getItem('shw_emp_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.role && parsed.userId) {
        return Object.assign({}, fallback || {}, parsed);
      }
    }
  } catch(e) { /* ignore */ }
  return fallback || null;
}

// ─── EMPLOYEE SESSION CONTEXT ────────────────────────────────────────────────
// Session is populated from sessionStorage after authentication.
// Pages that need session data should call _resolveEmpSession() directly.
// EMP_SESSION is kept for sidebar rendering; it may be empty if not signed in.
const EMP_SESSION = _resolveEmpSession(null) || {
  userId:     '',
  employeeId: '',
  role:       'inspector',
  name:       '',
  initials:   '',
  shortName:  '',
};

// ─── EMPLOYEE SIDEBAR PAGES ──────────────────────────────────────────────────
const EMP_SIDEBAR_PAGES = [
  {
    key: 'emp-dashboard',
    href: 'employee-dashboard.html',
    label: 'My Dashboard',
    icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    section: 'Main',
  },
  {
    key: 'emp-visits',
    href: 'employee-visits.html',
    label: 'My Visits',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    section: 'Work',
  },
  {
    key: 'emp-reports',
    href: 'employee-reports.html',
    label: 'My Reports',
    icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  },
  {
    key: 'emp-messages',
    href: 'employee-messages.html',
    label: 'Messages',
    icon: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  },
  // ── Resources ─────────────────────────────────────────────────────────────
  {
    key: 'emp-compensation',
    href: 'employee-compensation.html',
    label: 'Compensation',
    icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
    section: 'Resources',
  },
  {
    key: 'emp-hours',
    href: 'employee-hours.html',
    label: 'Hours Worked',
    icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  },
  {
    key: 'emp-time-off',
    href: 'employee-time-off.html',
    label: 'Request Time Off',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="16" y2="14"/>',
  },
  {
    key: 'emp-account',
    href: 'employee-account.html',
    label: 'My Account',
    icon: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    section: 'Account',
  },
];

// ─── EMPLOYEE SIDEBAR RENDERER ───────────────────────────────────────────────
function renderEmpSidebar(activeKey) {
  const el = document.getElementById('sidebar');
  if (!el) return;

  let sectioned = new Set();
  let navHTML = '';

  EMP_SIDEBAR_PAGES.forEach(page => {
    if (page.section && !sectioned.has(page.section)) {
      sectioned.add(page.section);
      const mt = page.section !== 'Main' ? ' style="margin-top:var(--space-2);"' : '';
      navHTML += `<div class="sidebar-section-label"${mt}>${page.section}</div>`;
    }
    const active = page.key === activeKey ? ' active' : '';
    const badge  = page.badge
      ? `<span class="sidebar-nav-badge${page.badgeClass ? ' ' + page.badgeClass : ''}">${page.badge}</span>`
      : '';
    navHTML += `
      <a href="${page.href}" class="sidebar-nav-item${active}">
        <svg class="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${page.icon}</svg>
        ${page.label}${badge}
      </a>`;
  });

  // Role label
  const roleLabel = { inspector: 'Inspector', manager: 'Manager', corporate: 'Corporate' }[EMP_SESSION.role] || 'Staff';

  el.innerHTML = `
    <div class="sidebar-header">
      <a href="employee-dashboard.html" class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <img src="images/logo.png" alt="Satellite Home Watch" class="sidebar-logo-img" />
        </div>
        <div class="sidebar-logo-text">
          <span class="sidebar-logo-primary">Satellite Home Watch</span>
          <span class="sidebar-logo-sub">Staff Portal</span>
        </div>
      </a>
      <button class="sidebar-drawer-close" onclick="closeSidebar()" aria-label="Close navigation menu" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <nav class="sidebar-nav">${navHTML}</nav>
    <div class="sidebar-footer">
      <div class="sidebar-profile">
        <div class="sidebar-profile-avatar">${EMP_SESSION.initials}</div>
        <div class="sidebar-profile-info">
          <div class="sidebar-profile-name">${EMP_SESSION.name}</div>
          <div class="sidebar-profile-role">${roleLabel}</div>
        </div>
      </div>
      <div class="sidebar-footer-links">
        <a href="auth.html" class="sidebar-footer-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </a>
      </div>
    </div>`;

  // Inject mobile topbar for employee portal
  if (typeof injectMobileTopbar === 'function') {
    injectMobileTopbar('Staff Portal');
  }
}

// ─── ADMIN SIDEBAR PAGES ──────────────────────────────────────────────────────
// Structure:
//   MAIN             → Operations Overview
//   OPERATIONS       → Schedule & Dispatch, Properties, Active Alerts
//   CRM              → Customers, Leads, Requests
//   CLIENT RELATIONS → Messages, Documents
//   ACCESS & USERS   → Invitations, User Management (exec sees User Mgmt)
const ADMIN_SIDEBAR_PAGES = [
  // ── Main ────────────────────────────────────────────────────────────────────
  {
    key: 'admin-dashboard',
    href: 'admin-dashboard.html',
    label: 'Operations Overview',
    icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    section: 'Main',
    roles: ['executive', 'manager'],
  },
  // ── Operations ───────────────────────────────────────────────────────────────
  {
    key: 'admin-schedule',
    href: 'admin-schedule.html',
    label: 'Schedule & Dispatch',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    section: 'Operations',
    roles: ['executive', 'manager'],
  },
  {
    key: 'admin-properties',
    href: 'admin-properties.html',
    label: 'Properties',
    icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    roles: ['executive', 'manager'],
  },
  {
    key: 'admin-alerts',
    href: 'admin-alerts.html',
    label: 'All Alerts',
    icon: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    roles: ['executive', 'manager'],
  },
  {
    key: 'admin-all-visits',
    href: 'admin-all-visits.html',
    label: 'All Visits',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/>',
    roles: ['executive', 'manager'],
  },
  {
    key: 'admin-reports',
    href: 'admin-reports.html',
    label: 'Reports',
    icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    roles: ['executive', 'manager'],
  },
  {
    key: 'admin-analytics',
    href: 'admin-analytics.html',
    label: 'Analytics',
    icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    roles: ['executive', 'manager'],
  },
  // ── CRM ──────────────────────────────────────────────────────────────────────
  {
    key: 'crm-customers',
    href: 'crm-customers.html',
    label: 'Customers',
    icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
    section: 'CRM',
    roles: ['executive', 'manager'],
  },
  {
    key: 'crm-leads',
    href: 'crm-leads.html',
    label: 'Leads',
    icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    roles: ['executive', 'manager'],
  },
  {
    key: 'crm-requests',
    href: 'crm-requests.html',
    label: 'Requests',
    icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
    roles: ['executive', 'manager'],
  },
  // ── Client Relations ─────────────────────────────────────────────────────────
  {
    key: 'admin-messages',
    href: 'admin-messages.html',
    label: 'Messages',
    icon: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
    section: 'Client Relations',
    roles: ['executive', 'manager'],
  },
  {
    key: 'admin-documents',
    href: 'admin-documents.html',
    label: 'Documents',
    icon: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
    roles: ['executive', 'manager'],
  },
  // ── Account ───────────────────────────────────────────────────────────────────
  {
    key: 'admin-account',
    href: 'admin-account.html',
    label: 'My Account',
    icon: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    section: 'Account',
    roles: ['executive', 'manager'],
  },
  // ── Workforce (Executive only) ───────────────────────────────────────────────
  {
    key: 'admin-employees',
    href: 'admin-employees.html',
    label: 'Employees',
    icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
    section: 'Workforce',
    roles: ['executive'],
    execBadge: true,
  },
  {
    key: 'admin-inspection-templates',
    href: 'admin-inspection-templates.html',
    label: 'Inspection Templates',
    icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/><line x1="8" y1="6" x2="8" y2="6"/>',
    roles: ['executive'],
    execBadge: true,
  },
  // ── Access & Users ───────────────────────────────────────────────────────────
  {
    key: 'admin-invitations',
    href: 'admin-invitations.html',
    label: 'Invitations',
    icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    section: 'Access & Users',
    roles: ['executive', 'manager'],
  },
  {
    key: 'admin-email-templates',
    href: 'admin-email-templates.html',
    label: 'Email Templates',
    icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/><line x1="12" y1="13" x2="12" y2="19"/>',
    roles: ['executive', 'manager'],
  },
  {
    key: 'admin-user-management',
    href: 'admin-user-management.html',
    label: 'User Management',
    icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    roles: ['executive'],  // Executive only
    execBadge: true,
  },
];

// ─── ADMIN SIDEBAR RENDERER ───────────────────────────────────────────────────
function renderAdminSidebar(activeKey) {
  const el = document.getElementById('sidebar');
  if (!el) return;

  // Use admin session from ADMIN_SESSION if available, else fallback
  const session = typeof ADMIN_SESSION !== 'undefined' ? ADMIN_SESSION : {
    name: 'Admin User', initials: 'AU', role: 'manager',
  };

  const sessionRole = session.role || 'manager';

  let sectioned = new Set();
  let navHTML = '';

  ADMIN_SIDEBAR_PAGES.forEach(page => {
    // Role-based visibility
    if (page.roles && !page.roles.includes(sessionRole)) return;

    if (page.section && !sectioned.has(page.section)) {
      sectioned.add(page.section);
      const mt = page.section !== 'Main' ? ' style="margin-top:var(--space-2);"' : '';
      navHTML += `<div class="sidebar-section-label"${mt}>${page.section}</div>`;
    }
    const active = page.key === activeKey ? ' active' : '';
    const badge  = page.badge
      ? `<span class="sidebar-nav-badge${page.badgeClass ? ' ' + page.badgeClass : ''}">${page.badge}</span>`
      : '';
    // Executive-only badge indicator
    const execTag = page.execBadge
      ? `<span style="font-size:9px;font-weight:700;background:rgba(157,23,77,0.15);color:#9d174d;border-radius:4px;padding:1px 5px;margin-left:auto;letter-spacing:.3px;">EXEC</span>`
      : '';
    navHTML += `
      <a href="${page.href}" class="sidebar-nav-item${active}">
        <svg class="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${page.icon}</svg>
        ${page.label}${badge}${execTag}
      </a>`;
  });

  const roleLabelMap = {
    executive: 'Executive',
    manager:   'Manager / Admin',
    corporate: 'Corporate Admin',
  };
  const roleLabel = roleLabelMap[sessionRole] || 'Admin';

  const roleBadgeStyle = sessionRole === 'executive'
    ? 'background:rgba(157,23,77,0.15);color:#fbcfe8;'
    : 'background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);';

  el.innerHTML = `
    <div class="sidebar-header">
      <a href="admin-dashboard.html" class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <img src="images/logo.png" alt="Satellite Home Watch" class="sidebar-logo-img" />
        </div>
        <div class="sidebar-logo-text">
          <span class="sidebar-logo-primary">Satellite Home Watch</span>
          <span class="sidebar-logo-sub">Admin Portal</span>
        </div>
      </a>
      <button class="sidebar-drawer-close" onclick="closeSidebar()" aria-label="Close navigation menu" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <nav class="sidebar-nav">${navHTML}</nav>
    <div class="sidebar-footer">
      <div class="sidebar-profile">
        <div class="sidebar-profile-avatar">${session.initials}</div>
        <div class="sidebar-profile-info">
          <div class="sidebar-profile-name">${session.name}</div>
          <div class="sidebar-profile-role" style="${roleBadgeStyle}font-size:10px;padding:1px 7px;border-radius:10px;display:inline-block;margin-top:2px;">${roleLabel}</div>
        </div>
      </div>
      <div class="sidebar-footer-links">
        <a href="auth.html" class="sidebar-footer-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </a>
      </div>
    </div>`;

  // Inject mobile topbar for admin portal
  if (typeof injectMobileTopbar === 'function') {
    injectMobileTopbar('Admin Portal');
  }

  // Ensure topbar avatar + badge reflect the real session role
  // Use setTimeout(0) so any page-level DOMContentLoaded assignment runs first
  setTimeout(_bootstrapAdminTopbar, 0);
}

// ─── ADMIN TOPBAR BOOTSTRAP ───────────────────────────────────────────────────
// Call this on DOMContentLoaded (after ADMIN_SESSION is defined) to update the
// hard-coded topbar avatar initials and role badge so they reflect the real
// session (executive vs manager) regardless of which page you land on.
//
// Usage: add one line to each admin page's DOMContentLoaded handler:
//   _bootstrapAdminTopbar();
//
function _bootstrapAdminTopbar() {
  if (typeof ADMIN_SESSION === 'undefined') return;

  const session = ADMIN_SESSION;
  const isExec  = session.role === 'executive';

  // ── Avatar initials ────────────────────────────────────────────────────────
  // Use the ID-based selector first, fall back to class-based for pages
  // that didn't have an id="topbarAvatar" before this fix.
  const avatarEls = document.querySelectorAll(
    '#topbarAvatar, #adminTopbarAvatar'
  );
  avatarEls.forEach(el => { el.textContent = session.initials; });

  // ── Role badge (topbar only — identified by ID) ────────────────────────────
  // Scope by ID to avoid accidentally overwriting record-level status badges.
  const badgeEls = document.querySelectorAll('#topbarRoleBadge, #roleBadge');
  badgeEls.forEach(el => {
    el.textContent = isExec ? 'Executive' : 'Manager';
    el.className   = 'admin-badge ' + (isExec ? 'corporate' : 'manager');
  });
}

// ─── SHARED TOAST UTILITY ────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'emp-toast-container admin-toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `emp-toast admin-toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all .3s'; }, duration - 300);
  setTimeout(() => toast.remove(), duration);
}

// ─── SHARED FORMAT HELPERS ────────────────────────────────────────────────────
const FMT = {
  date: iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  time: iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  },
  dateTime: iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : `${FMT.date(iso)} · ${FMT.time(iso)}`;
  },
  relTime: iso => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'Just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 30) return `${days}d ago`;
    return FMT.date(iso);
  },
  snakeToTitle: s => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—',
  initials: name => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??',
};

// ─── API HELPERS (mirrors db.js pattern for employee/admin) ─────────────────
async function empApiGet(table, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `tables/${table}${qs ? '?' + qs : ''}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { data: null, error: `HTTP ${res.status}` };
    const json = await res.json();
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

async function empApiGetAll(table, params = {}) {
  const { data, error } = await empApiGet(table, { limit: 500, page: 1, ...params });
  return { data: data?.data || [], error };
}

async function empApiPost(table, body) {
  try {
    const res = await fetch(`tables/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { data: null, error: `HTTP ${res.status}` };
    return { data: await res.json(), error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

async function empApiPatch(table, id, body) {
  try {
    const res = await fetch(`tables/${table}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { data: null, error: `HTTP ${res.status}` };
    return { data: await res.json(), error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

async function empApiDelete(table, id) {
  try {
    const res = await fetch(`tables/${table}/${id}`, { method: 'DELETE' });
    return { error: res.ok ? null : `HTTP ${res.status}` };
  } catch (e) {
    return { error: e.message };
  }
}

// Build a lookup map from array by a key field
function buildMap(arr, key = 'id') {
  return arr.reduce((acc, item) => { acc[item[key]] = item; return acc; }, {});
}

// ─── SHARED DATA LOADING HELPERS ─────────────────────────────────────────────
let _empCache = {};
async function empGetCached(table) {
  if (_empCache[table]) return _empCache[table];
  const { data } = await empApiGetAll(table);
  _empCache[table] = data;
  return data;
}
function empClearCache() { _empCache = {}; }
