// ── Shared Sidebar Renderer ── v2 deployment bundle refresh
// Renders the full sidebar navigation into #sidebar element
// Usage: renderSidebar('visits') — pass the active page key

const SIDEBAR_PAGES = [
  { key: 'dashboard',        href: 'dashboard.html',            label: 'Client Dashboard',  icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>', section: 'Main' },
  { key: 'properties',       href: 'client-properties.html',    label: 'My Properties',      icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { key: 'visits',           href: 'client-visits.html',         label: 'All Visits',         icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', section: 'Activity' },
  { key: 'alerts',           href: 'client-alerts.html',         label: 'All Alerts',         icon: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  { key: 'reports',          href: 'client-reports.html',        label: 'All Reports',        icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  { key: 'messages',         href: 'client-messages.html',       label: 'Messages',           icon: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>' },
  { key: 'documents',        href: 'client-documents.html',      label: 'All Documents',      icon: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>', section: 'Documents' },
  { key: 'track',            href: 'client-track-visit.html',    label: 'Track Visit',        icon: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>', section: 'Services' },
  { key: 'request-service',  href: 'client-request-service.html', label: 'Request a Service', icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>' },
];

function renderSidebar(activeKey) {
  const el = document.getElementById('sidebar');
  if (!el) return;

  let sectioned = new Set();
  let navHTML = '';

  SIDEBAR_PAGES.forEach(page => {
    if (page.section && !sectioned.has(page.section)) {
      sectioned.add(page.section);
      const mt = page.section !== 'Main' ? ' style="margin-top:var(--space-2);"' : '';
      navHTML += `<div class="sidebar-section-label"${mt}>${page.section}</div>`;
    }
    const active = page.key === activeKey ? ' active' : '';
    const badge = page.badge
      ? `<span class="sidebar-nav-badge${page.badgeClass ? ' ' + page.badgeClass : ''}">${page.badge}</span>`
      : '';
    navHTML += `
      <a href="${page.href}" class="sidebar-nav-item${active}">
        <svg class="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${page.icon}</svg>
        ${page.label}${badge}
      </a>`;
  });

  el.innerHTML = `
    <div class="sidebar-header">
      <a href="dashboard.html" class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <img src="images/logo.png" alt="Satellite Home Watch" class="sidebar-logo-img" />
        </div>
        <div class="sidebar-logo-text">
          <span class="sidebar-logo-primary">Satellite Home Watch</span>
          <span class="sidebar-logo-sub">Client Portal</span>
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
      <div class="sidebar-profile" onclick="window.location.href='client-account.html'">
        <div class="sidebar-profile-avatar" id="sidebarAvatarInitials"></div>
        <div class="sidebar-profile-info">
          <div class="sidebar-profile-name" id="sidebarProfileName">—</div>
          <div class="sidebar-profile-role">Property Owner</div>
        </div>
        <svg style="width:14px;height:14px;color:var(--navy-400);flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <div class="sidebar-footer-links">
        <a href="client-account.html" class="sidebar-footer-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
          My Account
        </a>
        <a href="client-terms.html" class="sidebar-footer-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Terms &amp; Conditions
        </a>
        <a href="auth.html" class="sidebar-footer-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </a>
      </div>
    </div>`;

  // Inject mobile topbar (defined in sidebar.js)
  if (typeof injectMobileTopbar === 'function') {
    injectMobileTopbar('Client Portal');
  }
}
