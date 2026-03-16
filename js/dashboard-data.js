/**
 * ═══════════════════════════════════════════════════════════════════
 *  SATELLITE HOME WATCH — DASHBOARD PAGE CONTROLLER
 *  dashboard-data.js — Wires real backend data to the client dashboard
 *  v2 — deployment bundle refresh
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Replaces all hardcoded placeholder values with live API data.
 *  Preserves existing HTML structure and CSS classes.
 *  Runs after DOM is ready and both db.js + ui.js are loaded.
 * ═══════════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initDashboard();
});

async function initDashboard() {
  try {
    // Load all dashboard data in one optimized parallel call
    const dash = await SHW.Dashboard.loadDashboard();

    // Wire every section
    renderPropertyHealthCard(dash);
    renderSummaryStats(dash);
    renderPropertiesGrid(dash.properties);
    renderAlertsPanel(dash.activeAlerts);
    renderUpcomingVisitsPanel(dash.upcomingVisits);
    renderRecentReportsPanel(dash.recentReports);
    renderRecentDocumentsPanel(dash.recentDocuments);
    renderActivityFeed(dash.activityFeed);
    renderLiveTrackingPreview(dash.activeVisit);
    renderNotificationsPanel(dash.notifications);
    updateWelcomeHeader(dash.client);
    updateSidebarProfile(dash.client);

    // Update live sidebar badges
    await SHWUI.updateSidebarBadges();

  } catch (err) {
    SHWUI.showToast('Unable to load some dashboard data.', 'warning');
  }
}

// ─── WELCOME HEADER ───────────────────────────────────────────────────────────

function updateWelcomeHeader(client) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = client.name.split(' ')[0];

  const welcomeEl = document.querySelector('.topbar-welcome');
  if (welcomeEl) welcomeEl.textContent = `${greeting}, ${firstName} 👋`;

  // Update avatar
  document.querySelectorAll('.topbar-avatar').forEach(el => el.textContent = client.initials);
}

// ─── SIDEBAR PROFILE ──────────────────────────────────────────────────────────

function updateSidebarProfile(client) {
  const nameEl = document.querySelector('.sidebar-profile-name');
  const avatarEl = document.querySelector('.sidebar-profile-avatar');
  if (nameEl)   nameEl.textContent   = client.name;
  if (avatarEl) avatarEl.textContent = client.initials;
}

// ─── PROPERTY HEALTH CARD ─────────────────────────────────────────────────────

function renderPropertyHealthCard(dash) {
  const properties   = dash.properties || [];
  const activeAlerts = dash.activeAlerts || [];
  const activeVisit  = dash.activeVisit;
  const upcoming     = dash.upcomingVisits || [];

  // Show stats from primary (first) property
  const primary = properties[0];
  if (!primary) return;

  // Determine health status
  const healthMap = {
    excellent:        { cls: 'status-green',  icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',      label: 'All Systems Normal',   color: '#16a34a' },
    good:             { cls: 'status-green',  icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',      label: 'All Systems Normal',   color: '#16a34a' },
    attention_needed: { cls: 'status-amber',  icon: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>', label: 'Attention Needed', color: '#d97706' },
    critical:         { cls: 'status-red',    icon: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>', label: 'Critical Issues',  color: '#dc2626' },
  };
  const hCfg = healthMap[primary.property_health] || healthMap['good'];
  const lastVisit   = primary.lastVisit;
  const nextVisit   = primary.nextVisit || upcoming.find(v => v.property_id === primary.id);
  const totalAlerts = activeAlerts.filter(a => a.property_id === primary.id).length;

  // Inspector info from active/next visit
  const inspectorName = (activeVisit || nextVisit)
    ? (activeVisit?.inspector_short || nextVisit?.inspector_short || '—')
    : (lastVisit?.inspector_short || '—');

  const section = document.querySelector('section[aria-label="Property Health Status"]');
  if (!section) return;

  // Update icon
  const iconEl = section.querySelector('.property-health-status-icon');
  if (iconEl) {
    iconEl.className = `property-health-status-icon ${hCfg.cls}`;
    iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${hCfg.icon}</svg>`;
  }
  // Property name
  const nameEl = section.querySelector('.property-health-property-name');
  if (nameEl) nameEl.textContent = primary.property_name;

  // Status badge
  const badgeEl = section.querySelector('.property-health-status-badge');
  if (badgeEl) {
    badgeEl.className = `property-health-status-badge ${hCfg.cls}`;
    badgeEl.innerHTML = `<span class="property-health-status-badge-dot"></span>${hCfg.label}`;
  }

  // Meta items
  const metaItems = section.querySelectorAll('.property-health-meta-item');
  if (metaItems.length >= 3) {
    metaItems[0].querySelector('.property-health-meta-value').textContent =
      lastVisit ? SHW.fmt.date(lastVisit.actual_end || lastVisit.scheduled_start) : '—';
    metaItems[1].querySelector('.property-health-meta-value').textContent =
      nextVisit ? SHW.fmt.date(nextVisit.scheduled_start) : 'TBD';
    metaItems[2].querySelector('.property-health-meta-value').textContent = inspectorName;
  }

  // Alerts count
  const alertsCountEl = section.querySelector('.property-health-alerts-count');
  if (alertsCountEl) alertsCountEl.textContent = totalAlerts;

  // Properties monitored count
  const allCounts = section.querySelectorAll('.property-health-alerts-count');
  if (allCounts.length >= 2) allCounts[1].textContent = properties.length;

  // Color variable
  section.style.setProperty('--health-bar-color', hCfg.color);

  // Keep section hidden if the current view is "All Properties" (default on load)
  // It will be shown when the user selects a specific property via selectProperty()
  if (!window._selectedPropertyId || window._selectedPropertyId === 'all') {
    section.style.display = 'none';
  }
}

// ─── SUMMARY STATS CARDS ──────────────────────────────────────────────────────

function renderSummaryStats(dash) {
  const summary       = dash.summary;
  const activeAlerts  = dash.activeAlerts || [];
  const upcomingVisits = dash.upcomingVisits || [];
  const recentReports = dash.recentReports || [];
  const recentDocs    = dash.recentDocuments || [];

  // Count by severity
  const urgentAlerts = activeAlerts.filter(a => a.severity === 'urgent').length;
  const highAlerts   = activeAlerts.filter(a => a.severity === 'high').length;

  const statsSection = document.querySelector('.stats-grid');
  if (!statsSection) return;

  const cards = statsSection.querySelectorAll('.stat-card');
  if (cards.length < 4) return;

  // Card 0: Active Alerts
  cards[0].querySelector('.stat-value').textContent = activeAlerts.length;
  const alertTrend = cards[0].querySelector('.stat-card-trend');
  if (alertTrend) alertTrend.textContent = activeAlerts.length + ' Open';
  cards[0].querySelector('.stat-sub').textContent =
    urgentAlerts > 0
      ? `${urgentAlerts} urgent · ${highAlerts} high priority`
      : highAlerts > 0 ? `${highAlerts} high priority` : 'No urgent alerts';

  // Card 1: Upcoming Visits
  cards[1].querySelector('.stat-value').textContent = upcomingVisits.length;
  const visitTrend = cards[1].querySelector('.stat-card-trend');
  if (visitTrend) {
    const next = upcomingVisits[0];
    visitTrend.textContent = next ? 'Next: ' + SHW.fmt.date(next.scheduled_start) : 'None scheduled';
  }
  cards[1].querySelector('.stat-sub').textContent =
    upcomingVisits.length === 1 ? '1 visit scheduled' : `${upcomingVisits.length} visits scheduled`;

  // Card 2: Reports (show total all-time)
  const totalReports = dash.completedVisits?.length || recentReports.length;
  cards[2].querySelector('.stat-value').textContent = recentReports.length;
  const reportTrend = cards[2].querySelector('.stat-card-trend');
  if (reportTrend) reportTrend.textContent = recentReports.length + ' Last 90 Days';
  cards[2].querySelector('.stat-sub').textContent = `${recentReports.length} report${recentReports.length !== 1 ? 's' : ''} in last 90 days`;

  // Card 3: Documents
  const unreadDocs = recentDocs.filter(d => d.read_status === 'unread').length;
  cards[3].querySelector('.stat-value').textContent = recentDocs.length;
  const docTrend = cards[3].querySelector('.stat-card-trend');
  if (docTrend) docTrend.textContent = unreadDocs > 0 ? unreadDocs + ' Unread' : 'All read';
  cards[3].querySelector('.stat-sub').textContent =
    unreadDocs > 0 ? `${unreadDocs} unread document${unreadDocs !== 1 ? 's' : ''}` : 'All documents read';
}

// ─── PROPERTIES GRID ─────────────────────────────────────────────────────────

function renderPropertiesGrid(properties) {
  const grid = document.querySelector('.properties-grid');
  if (!grid) return;

  if (!properties || properties.length === 0) {
    grid.innerHTML = '<p style="color:var(--navy-400);text-align:center;padding:24px;">No properties found.</p>';
    return;
  }

  grid.innerHTML = properties.map(prop => {
    const alerts = prop.activeAlertCount || 0;
    const lastVisit = prop.lastVisit;
    const nextVisit = prop.nextVisit;
    const lastReport = lastVisit?.actual_end;

    // Inspector from next or last visit
    const inspector = nextVisit?.inspector_short || lastVisit?.inspector_short || '—';

    // Plan-derived next visit if no real DB visit
    let nextVisitDisplay = nextVisit ? SHW.fmt.date(nextVisit.scheduled_start) : 'TBD';
    const plan = prop.plan;
    if (!nextVisit && plan && plan.status === 'active') {
      // Calculate from plan
      const DAY_IDX = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
      const FREQ_DAYS = { weekly:7, bi_weekly:14, monthly:30, custom:30 };
      const preferredDay = DAY_IDX[plan.preferred_day] ?? 1;
      const intervalDays = FREQ_DAYS[plan.frequency] || 30;
      const today = new Date(); today.setHours(0,0,0,0);
      const planStart = new Date((plan.start_date || today.toISOString().slice(0,10)) + 'T00:00:00');
      let cursor = planStart > today ? new Date(planStart) : new Date(today);
      const curDay = cursor.getDay();
      const daysUntil = (preferredDay - curDay + 7) % 7;
      cursor.setDate(cursor.getDate() + daysUntil);
      const nextDate = cursor.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      nextVisitDisplay = `${nextDate} <span style="font-size:9px;color:#7e22ce;font-weight:700;background:#fdf4ff;padding:0 5px;border-radius:10px;">PLAN</span>`;
    }

    // Alert display
    const alertBadges = { urgent: '#dc2626', high: '#d97706', medium: '#d97706', low: '#16a34a' };
    const alertDisplay = alerts === 0
      ? `<span class="property-meta-value" style="color:#16a34a;">None</span>`
      : `<span class="property-meta-value" style="color:#dc2626;">${alerts} Active</span>`;

    // Status badge class
    const statusBadge = prop.nextVisit
      ? `<span class="badge badge-scheduled"><span class="badge-dot"></span>Scheduled</span>`
      : prop.service_status === 'active'
        ? `<span class="badge badge-completed"><span class="badge-dot"></span>Active</span>`
        : `<span class="badge"><span class="badge-dot"></span>${SHW.utils.capitalize(prop.service_status)}</span>`;

    return `
      <div class="property-card" onclick="window.location.href='client-properties.html'" role="button" tabindex="0"
        aria-label="View ${prop.property_name}">
        <div class="property-card-img" style="background:url('${SHWUI.getPropertyImage(prop)}') center/cover no-repeat;">
          <div class="property-card-img-badge">
            <span class="badge badge-completed"><span class="badge-dot"></span>${SHW.utils.capitalize(prop.service_status)}</span>
          </div>
        </div>
        <div class="property-card-body">
          <div class="property-card-name">${prop.property_name}</div>
          <div class="property-card-addr">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            ${prop.address_line1}, ${prop.city}, ${prop.state} ${prop.zip}
          </div>
          <div class="property-card-meta">
            <div class="property-card-meta-item">
              <span class="property-meta-label">Last Visit</span>
              <span class="property-meta-value">${lastVisit ? SHW.fmt.date(lastVisit.actual_end || lastVisit.scheduled_start) : 'No visits yet'}</span>
            </div>
            <div class="property-card-meta-item">
              <span class="property-meta-label">Next Visit</span>
              <span class="property-meta-value">${nextVisitDisplay}</span>
            </div>
            <div class="property-card-meta-item">
              <span class="property-meta-label">Inspector</span>
              <span class="property-meta-value">${inspector}</span>
            </div>
            <div class="property-card-meta-item">
              <span class="property-meta-label">Active Alerts</span>
              ${alertDisplay}
            </div>
            <div class="property-card-meta-item" style="grid-column:span 2;">
              <span class="property-meta-label">Last Report Uploaded</span>
              <span class="property-meta-value meta-report-date">${lastReport ? SHW.fmt.date(lastReport) : '—'}</span>
            </div>
          </div>
        </div>
        <div class="property-card-footer">
          ${statusBadge}
          <span class="property-card-cta">
            View details
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </div>
      </div>`;
  }).join('');
}

// ─── ALERTS PANEL ─────────────────────────────────────────────────────────────

function renderAlertsPanel(alerts) {
  const panel = document.querySelector('.panel .panel-body-no-pad');
  // Find the right panel — the alerts one (first .panel with .panel-body-no-pad)
  const panels = document.querySelectorAll('.panel');
  let alertsPanel = null;
  panels.forEach(p => {
    const title = p.querySelector('.panel-title');
    if (title && title.textContent.trim() === 'Active Alerts') alertsPanel = p;
  });
  if (!alertsPanel) return;

  const body = alertsPanel.querySelector('.panel-body-no-pad');
  if (!body) return;

  // Update subtitle
  const subtitle = alertsPanel.querySelector('.panel-subtitle');
  if (subtitle) {
    subtitle.textContent = alerts.length === 0
      ? 'No active alerts'
      : `${alerts.length} open alert${alerts.length !== 1 ? 's' : ''} across properties`;
  }

  if (alerts.length === 0) {
    body.innerHTML = `
      <div style="padding:32px;text-align:center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5"
          style="margin:0 auto 12px;display:block;opacity:.7;">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
        <p style="margin:0;font-size:13px;color:var(--navy-500);font-weight:500;">No active alerts — all properties are clear</p>
      </div>`;
    return;
  }

  const sevIconMap = {
    urgent: { cls: 'urgent', color: '#dc2626' },
    high:   { cls: 'high',   color: '#d97706' },
    medium: { cls: 'medium', color: '#f59e0b' },
    low:    { cls: 'low',    color: '#6b7280' },
  };

  const rows = alerts.slice(0, 3).map(alert => {
    const sev = sevIconMap[alert.severity] || sevIconMap['medium'];
    const badge = alert.severity === 'urgent'
      ? `<span class="badge badge-priority-urgent">🔴 Urgent</span>`
      : alert.severity === 'high'
        ? `<span class="badge badge-priority-high">🟠 High</span>`
        : `<span class="badge" style="background:var(--amber-50);color:var(--amber-700);">${SHW.utils.capitalize(alert.severity)}</span>`;

    const statusBadge = alert.status === 'in_progress'
      ? `<span class="badge badge-inprogress"><span class="badge-dot"></span>In Progress</span>`
      : `<span class="badge badge-open"><span class="badge-dot"></span>Open</span>`;

    return `
      <div class="alert-row">
        <div class="alert-icon-wrap ${sev.cls}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="alert-row-body">
          <div class="alert-row-title">${alert.title}</div>
          <div class="alert-row-meta">${alert.property_name} · ${SHW.fmt.date(alert.date_created)}</div>
        </div>
        <div class="alert-row-actions">
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;justify-content:flex-end;">
            ${statusBadge}
            ${badge}
          </div>
          <a href="client-alerts.html" class="alert-action-btn" onclick="event.stopPropagation();">
            View Alert Details
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>
      </div>`;
  }).join('');

  const footer = `
    <div style="padding:var(--space-4) var(--space-5);">
      <div style="background:var(--blue-gray-50);border-radius:var(--radius-xl);padding:var(--space-4);text-align:center;">
        <a href="client-alerts.html" class="btn btn-secondary btn-sm">View All Alerts</a>
      </div>
    </div>`;

  body.innerHTML = rows + footer;
}

// ─── UPCOMING VISITS PANEL ───────────────────────────────────────────────────

function renderUpcomingVisitsPanel(upcoming) {
  const panels = document.querySelectorAll('.panel');
  let visitsPanel = null;
  panels.forEach(p => {
    const title = p.querySelector('.panel-title');
    if (title && title.textContent.trim() === 'Upcoming Visits') visitsPanel = p;
  });
  if (!visitsPanel) return;

  const body = visitsPanel.querySelector('.panel-body-no-pad');
  const subtitle = visitsPanel.querySelector('.panel-subtitle');
  if (subtitle) {
    subtitle.textContent = upcoming.length === 0
      ? 'No upcoming visits'
      : `${upcoming.length} visit${upcoming.length !== 1 ? 's' : ''} scheduled`;
  }
  if (!body) return;

  if (upcoming.length === 0) {
    body.innerHTML = `
      <div style="padding:32px;text-align:center;">
        <p style="font-size:13px;color:var(--navy-500);">No upcoming visits scheduled. <a href="client-request-service.html" style="color:var(--blue-600);">Request one?</a></p>
      </div>`;
    return;
  }

  const rows = upcoming.map(visit => {
    const d     = new Date(visit.scheduled_start);
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day   = d.getDate();

    const isPlanGenerated = !!(visit.is_plan_generated || visit.plan_id);
    const originBadge = isPlanGenerated
      ? `<span style="font-size:9px;font-weight:700;color:#162d56;background:#e8eef8;border-radius:10px;padding:1px 6px;margin-left:4px;">↻PLAN</span>`
      : `<span style="font-size:9px;font-weight:700;color:#166534;background:#f0fdf4;border-radius:10px;padding:1px 6px;margin-left:4px;">+ONE-OFF</span>`;

    const statusBadge = visit.status === 'in_progress'
      ? `<span class="badge badge-inprogress"><span class="badge-dot"></span>In Progress</span>`
      : visit.status === 'en_route'
        ? `<span class="badge badge-enroute"><span class="badge-dot"></span>En Route</span>`
        : `<span class="badge badge-scheduled"><span class="badge-dot"></span>Scheduled</span>`;

    return `
      <div class="visit-row" onclick="window.location.href='client-visits.html'" role="button" tabindex="0">
        <div class="visit-date-col">
          <div class="visit-date-month">${month}</div>
          <div class="visit-date-day">${day}</div>
        </div>
        <div class="visit-row-body">
          <div class="visit-row-name">${visit.visit_type_label}${originBadge}</div>
          <div class="visit-row-meta">${visit.property_name} · ${visit.inspector_short}</div>
        </div>
        <div class="visit-row-right">
          ${statusBadge}
          <span style="font-size:var(--text-xs);color:var(--color-text-muted);">${SHW.fmt.time(visit.scheduled_start)}</span>
        </div>
      </div>`;
  }).join('');

  // Add footer with link to all visits
  const footer = `
    <div style="padding:var(--space-3) var(--space-5);">
      <a href="client-visits.html" style="font-size:12px;color:var(--blue-600);text-decoration:none;font-weight:500;">
        View all visits →
      </a>
    </div>`;

  body.innerHTML = rows + footer;
}

// ─── RECENT REPORTS PANEL ────────────────────────────────────────────────────

function renderRecentReportsPanel(reports) {
  // Find recent reports section
  const allSections = document.querySelectorAll('.panel, section');
  let reportsEl = null;
  allSections.forEach(el => {
    const t = el.querySelector('.panel-title');
    if (t && (t.textContent.includes('Recent Reports') || t.textContent.includes('Inspection Reports'))) {
      reportsEl = el;
    }
  });
  if (!reportsEl) return;

  const body = reportsEl.querySelector('.panel-body-no-pad, .panel-body');
  if (!body) return;

  if (!reports || reports.length === 0) {
    body.innerHTML = '<p style="padding:24px;text-align:center;color:var(--navy-400);">No recent reports.</p>';
    return;
  }

  const rows = reports.slice(0, 4).map(r => {
    const resultColors = {
      all_clear:              { bg: '#f0fdf4', color: '#16a34a', label: 'All Clear' },
      attention_needed:       { bg: '#fffbeb', color: '#d97706', label: 'Attention' },
      issues_found:           { bg: '#fef2f2', color: '#dc2626', label: 'Issues Found' },
      urgent_action_required: { bg: '#fef2f2', color: '#dc2626', label: 'Urgent' },
    };
    const res = resultColors[r.overall_result] || { bg: '#f9fafb', color: '#6b7280', label: 'Pending' };

    return `
      <div class="report-row" onclick="window.location.href='client-reports.html'" role="button" tabindex="0"
        style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--navy-100);cursor:pointer;">
        <div style="width:8px;height:8px;border-radius:50%;background:${res.color};flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;color:var(--navy-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.report_title}</div>
          <div style="font-size:11px;color:var(--navy-400);margin-top:2px;">${r.property_name} · ${r.date_label} · ${r.photo_count} photo${r.photo_count !== 1 ? 's' : ''}</div>
        </div>
        <div>
          <span style="font-size:10px;font-weight:600;padding:3px 8px;border-radius:10px;background:${res.bg};color:${res.color};">${res.label}</span>
        </div>
      </div>`;
  }).join('');

  body.innerHTML = rows + `
    <div style="padding:12px 20px;">
      <a href="client-reports.html" style="font-size:12px;color:var(--blue-600);text-decoration:none;font-weight:500;">View all reports →</a>
    </div>`;
}

// ─── RECENT DOCUMENTS PANEL ──────────────────────────────────────────────────

function renderRecentDocumentsPanel(docs) {
  const allPanels = document.querySelectorAll('.panel');
  let docsPanel = null;
  allPanels.forEach(p => {
    const t = p.querySelector('.panel-title');
    if (t && (t.textContent.includes('Document') || t.textContent.includes('Recent Files'))) docsPanel = p;
  });
  if (!docsPanel) return;

  const body = docsPanel.querySelector('.panel-body-no-pad, .panel-body');
  if (!body || !docs || docs.length === 0) return;

  const rows = docs.slice(0, 4).map(d => {
    const isUnread = d.read_status === 'unread';
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 20px;border-bottom:1px solid var(--navy-50);cursor:pointer;"
        onclick="window.location.href='client-documents.html'" role="button" tabindex="0">
        <div style="width:32px;height:32px;border-radius:8px;background:${isUnread ? '#eff6ff' : '#f9fafb'};
          display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isUnread ? '#2563eb' : '#94a3b8'}" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:${isUnread ? '600' : '500'};color:var(--navy-800);
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.document_name}</div>
          <div style="font-size:10px;color:var(--navy-400);margin-top:1px;">${d.type_label} · ${d.date_label}</div>
        </div>
        ${isUnread ? '<span style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0;"></span>' : ''}
      </div>`;
  }).join('');

  body.innerHTML = rows + `
    <div style="padding:10px 20px;">
      <a href="client-documents.html" style="font-size:12px;color:var(--blue-600);text-decoration:none;font-weight:500;">View all documents →</a>
    </div>`;
}

// ─── ACTIVITY FEED ───────────────────────────────────────────────────────────

function renderActivityFeed(events) {
  // Find activity timeline container by common patterns
  const selectors = [
    '#activityFeed', '#activityTimeline', '.activity-list',
    '[data-section="activity"]', '.timeline-list',
  ];

  let container = null;
  for (const sel of selectors) {
    container = document.querySelector(sel);
    if (container) break;
  }

  // If not found by ID, search panels
  if (!container) {
    const panels = document.querySelectorAll('.panel');
    panels.forEach(p => {
      const t = p.querySelector('.panel-title');
      if (t && (t.textContent.includes('Activity') || t.textContent.includes('Timeline'))) {
        container = p.querySelector('.panel-body, .panel-body-no-pad');
      }
    });
  }
  if (!container || !events || events.length === 0) return;

  container.innerHTML = events.map(e => `
    <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--navy-50);">
      ${SHWUI.activityIcon(e.icon_type, e.event_type)}
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:600;color:var(--navy-800);">${e.title}</div>
        <div style="font-size:11px;color:var(--navy-500);margin-top:2px;">${e.description}</div>
        <div style="font-size:10px;color:var(--navy-400);margin-top:2px;">${e.date_label} · ${e.time_label}</div>
      </div>
    </div>
  `).join('');
}

// ─── LIVE TRACKING PREVIEW ────────────────────────────────────────────────────

function renderLiveTrackingPreview(activeVisit) {
  // Find the live tracking section/card
  const trackSelectors = ['.live-visit-card', '.live-track-card', '[data-section="tracking"]', '#liveTrackCard'];
  let card = null;
  for (const sel of trackSelectors) { card = document.querySelector(sel); if (card) break; }

  if (!card) {
    // Try to find by panel title
    const panels = document.querySelectorAll('.panel');
    panels.forEach(p => {
      const t = p.querySelector('.panel-title');
      if (t && t.textContent.includes('Track')) card = p;
    });
  }
  if (!card) return;

  if (!activeVisit) {
    // Show fallback state
    const fallback = card.querySelector('.track-no-visit, .live-track-fallback');
    if (fallback) fallback.style.display = '';
    const activeState = card.querySelector('.track-active, .live-track-active');
    if (activeState) activeState.style.display = 'none';
    return;
  }

  // Show active visit info
  const propNameEl = card.querySelector('.live-visit-property, .track-property-name');
  if (propNameEl) propNameEl.textContent = activeVisit.property_name;

  const inspectorEl = card.querySelector('.live-visit-inspector, .track-inspector');
  if (inspectorEl) inspectorEl.textContent = activeVisit.inspector_short;

  const statusEl = card.querySelector('.live-visit-status, .track-status');
  if (statusEl) statusEl.innerHTML = SHWUI.visitStatusPill(activeVisit.status);

  const timeEl = card.querySelector('.live-visit-time, .track-time');
  if (timeEl) timeEl.textContent = SHW.fmt.time(activeVisit.actual_start || activeVisit.scheduled_start);
}

// ─── NOTIFICATIONS PANEL ─────────────────────────────────────────────────────

function renderNotificationsPanel(notifications) {
  const container = document.querySelector('#notificationsPanel, .notifications-list');
  if (!container) return;

  if (!notifications || notifications.length === 0) {
    container.innerHTML = '<p style="text-align:center;font-size:12px;color:var(--navy-400);padding:16px;">No recent notifications.</p>';
    return;
  }

  container.innerHTML = notifications.map(n => {
    const isUnread = n.read_status === 'unread';
    const typeIcons = {
      visit_started:         '🏠',
      visit_scheduled:       '📅',
      visit_completed:       '✅',
      alert_created:         '🔴',
      alert_updated:         '🟡',
      report_published:      '📋',
      document_uploaded:     '📁',
      message_received:      '💬',
      service_request_update:'🔧',
    };
    return `
      <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--navy-50);
        ${isUnread ? 'background:linear-gradient(90deg,#eff6ff 0%,transparent 100%);' : ''}"
        onclick="SHW.Notifications.markRead('${n.id}')" role="button" tabindex="0">
        <span style="font-size:16px;flex-shrink:0;">${typeIcons[n.type] || '🔔'}</span>
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:${isUnread ? '600' : '500'};color:var(--navy-800);">${n.title}</div>
          <div style="font-size:11px;color:var(--navy-500);margin-top:2px;">${n.body}</div>
          <div style="font-size:10px;color:var(--navy-400);margin-top:2px;">${SHW.fmt.date(n.created_at)}</div>
        </div>
        ${isUnread ? '<span style="width:6px;height:6px;border-radius:50%;background:#3b82f6;flex-shrink:0;margin-top:4px;"></span>' : ''}
      </div>`;
  }).join('');
}

// ─── PROPERTY SELECTOR DROPDOWN ──────────────────────────────────────────────

// Override the existing selectProperty function with backend-connected version
// that also handles property health section show/hide and stat card updates.
window.selectProperty = function(propId, propName) {
  // Update selector label
  const selector = document.getElementById('propertySelectorValue');
  if (selector) selector.textContent = propName;

  // Update selected state in dropdown
  const dropdown = document.getElementById('propertyDropdown');
  if (dropdown) {
    dropdown.querySelectorAll('.property-dropdown-item').forEach(item => {
      item.classList.remove('selected');
      const check = item.querySelector('.property-dropdown-check');
      if (check) check.style.display = 'none';
    });
    const clicked = dropdown.querySelector(`[onclick*="${propId}"]`);
    if (clicked) {
      clicked.classList.add('selected');
      const check = clicked.querySelector('.property-dropdown-check');
      if (check) check.style.display = '';
    }
    dropdown.classList.remove('open');
    document.getElementById('propertySelector')?.classList.remove('open');
  }

  // ── Show/hide Property Health Status section ──
  const healthSection = document.getElementById('propertyHealthSection');
  if (healthSection) {
    healthSection.style.display = propId === 'all' ? 'none' : '';
  }

  // Stat cards and panel subtitles are re-rendered from live backend data
  // on next initDashboard() cycle; no client-side override needed here.

  // ── Filter alert rows and visit rows by live property name ──
  // propName is passed directly from the live backend dropdown item — no slug map needed.
  const filterName = propId === 'all' ? '' : propName.toLowerCase();
  document.querySelectorAll('.alert-row').forEach(row => {
    if (propId === 'all') { row.style.display = ''; return; }
    const meta = row.querySelector('.alert-row-meta')?.textContent.toLowerCase() || '';
    row.style.display = meta.includes(filterName) ? '' : 'none';
  });
  document.querySelectorAll('.visit-row').forEach(row => {
    if (propId === 'all') { row.style.display = ''; return; }
    const meta = row.querySelector('.visit-row-meta')?.textContent.toLowerCase() || '';
    row.style.display = meta.includes(filterName) ? '' : 'none';
  });

  // Store selection
  window._selectedPropertyId = propId;
};

// ─── POPULATE PROPERTY DROPDOWN FROM REAL DATA ───────────────────────────────

async function populatePropertyDropdown() {
  const { data: props } = await SHW.Properties.getClientProperties();
  const dropdown = document.getElementById('propertyDropdown');
  if (!dropdown || !props) return;

  // Keep the "All Properties" item and replace property items
  const allItem = dropdown.querySelector('.property-dropdown-item');
  if (!allItem) return;

  // Update "All Properties" count
  const allAddr = allItem.querySelector('.property-dropdown-addr');
  if (allAddr) allAddr.textContent = `Viewing all ${props.length} properties`;

  // Remove old property items (keep first "All Properties" item)
  dropdown.querySelectorAll('.property-dropdown-item:not(:first-child)').forEach(el => el.remove());

  // Add real property items
  props.forEach(prop => {
    const item = document.createElement('div');
    item.className = 'property-dropdown-item';
    item.onclick = () => selectProperty(prop.id, prop.property_name);
    item.innerHTML = `
      <div class="property-dropdown-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div>
        <div class="property-dropdown-name">${prop.property_name}</div>
        <div class="property-dropdown-addr">${prop.address_line1}, ${prop.city}, ${prop.state}</div>
      </div>`;
    dropdown.appendChild(item);
  });
}

// Run on load
document.addEventListener('DOMContentLoaded', populatePropertyDropdown);
