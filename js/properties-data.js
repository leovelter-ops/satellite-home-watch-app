/**
 * ═══════════════════════════════════════════════════════════════════
 *  SATELLITE HOME WATCH — MY PROPERTIES PAGE CONTROLLER
 *  properties-data.js — Wires backend to client-properties.html
 *  v2 — deployment bundle refresh
 * ═══════════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initPropertiesPage();
});

async function initPropertiesPage() {
  // Show skeleton loaders while data loads
  const propertiesList = document.getElementById('propertiesListContainer');
  const summaryBar     = document.querySelector('.properties-summary-bar');

  if (propertiesList) SHWUI.showLoading('propertiesListContainer', 3, false);

  try {
    const properties = await SHW.Properties.getEnrichedProperties();
    renderPropertiesSummaryBar(properties);
    renderPropertiesGrid(properties);
    await SHWUI.updateSidebarBadges();
  } catch (err) {
    if (propertiesList) SHWUI.showError('propertiesListContainer', 'Unable to load properties. Please refresh.');
  }
}

// ─── SUMMARY BAR ──────────────────────────────────────────────────────────────

function renderPropertiesSummaryBar(properties) {
  const activeCount = properties.filter(p => p.service_status === 'active').length;
  const alertTotal  = properties.reduce((sum, p) => sum + (p.activeAlertCount || 0), 0);
  const nextVisit   = properties
    .filter(p => p.nextVisit)
    .sort((a, b) => new Date(a.nextVisit.scheduled_start) - new Date(b.nextVisit.scheduled_start))[0];

  const bar = document.querySelector('.properties-summary-bar');
  if (!bar) return;

  const items = bar.querySelectorAll('.properties-summary-item');
  if (items.length >= 3) {
    // Active Properties
    const v0 = items[0].querySelector('.properties-summary-value');
    if (v0) v0.textContent = activeCount;
    const s0 = items[0].querySelector('.properties-summary-sub');
    if (s0) s0.textContent = `${activeCount} active service plan${activeCount !== 1 ? 's' : ''}`;

    // Active Alerts
    const v1 = items[1].querySelector('.properties-summary-value');
    if (v1) v1.textContent = alertTotal;
    const s1 = items[1].querySelector('.properties-summary-sub');
    if (s1) s1.textContent = alertTotal === 0 ? 'No active alerts' : `Across ${properties.length} properties`;

    // Next Visit
    const v2 = items[2].querySelector('.properties-summary-value');
    if (v2) v2.textContent = nextVisit ? SHW.fmt.date(nextVisit.nextVisit.scheduled_start) : 'TBD';
    const s2 = items[2].querySelector('.properties-summary-sub');
    if (s2) s2.textContent = nextVisit ? nextVisit.property_name : 'No visits scheduled';
  }
}

// ─── PROPERTIES GRID / LIST ───────────────────────────────────────────────────

function renderPropertiesGrid(properties) {
  const container = document.getElementById('propertiesListContainer') ||
                    document.querySelector('.properties-list-container, .properties-grid-main');
  if (!container) {
    // Fallback: find the properties cards area
    renderInlineProperties(properties);
    return;
  }

  if (!properties || properties.length === 0) {
    const emptyState = document.getElementById('propertiesEmptyState');
    if (emptyState) emptyState.style.display = '';
    const countEl = document.getElementById('propertiesCount');
    if (countEl) countEl.textContent = '0 Properties';
    return;
  }

  container.innerHTML = properties.map(prop => buildPropertyCard(prop)).join('');

  // Update the visible count label
  const countEl = document.getElementById('propertiesCount');
  if (countEl) {
    countEl.textContent = properties.length === 1 ? '1 Property' : `${properties.length} Properties`;
  }
}

function renderInlineProperties(properties) {
  // Locate all property cards in the existing layout and update them
  const cards = document.querySelectorAll('.property-main-card, .prop-detail-card');
  if (cards.length > 0) {
    cards.forEach((card, i) => {
      if (properties[i]) updateExistingPropertyCard(card, properties[i]);
    });
    return;
  }

  // Inject new cards into the page body
  const pageBody = document.querySelector('.properties-page, main.dashboard-content');
  if (!pageBody) return;

  // Find or create properties container
  let gridEl = pageBody.querySelector('.properties-main-grid');
  if (!gridEl) {
    gridEl = document.createElement('div');
    gridEl.className = 'properties-main-grid';
    gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:20px;';
    pageBody.appendChild(gridEl);
  }

  gridEl.innerHTML = properties.map(prop => buildPropertyCard(prop)).join('');
}

function buildPropertyCard(prop) {
  const lastVisit = prop.lastVisit;
  const nextVisit = prop.nextVisit;
  const alerts    = prop.activeAlertCount || 0;
  const visits    = prop.recentVisits || [];

  // Inspector name
  const inspector = nextVisit?.inspector_short || lastVisit?.inspector_short || '—';

  // Last 5 visit dates
  const visitDates = visits.slice(0, 5).map(v =>
    `<span class="prop-visit-date-pill">${SHW.fmt.date(v.actual_end || v.scheduled_start)}</span>`
  ).join('');

  // Plan info — enhanced to show plan-derived next visit
  const plan = prop.plan;
  let planLabel = 'No Active Plan';
  let planBadgeHtml = `<span style="font-size:10px;color:var(--navy-400);">—</span>`;
  let nextVisitDisplay = nextVisit ? SHW.fmt.date(nextVisit.scheduled_start) : 'TBD';

  if (plan) {
    const freq = plan.frequency || plan.visit_frequency;
    planLabel = (freq ? freq.replace('_', '-').replace(/\b\w/g, c => c.toUpperCase()) : 'Standard') + ' Watch';

    // If plan is active and no real upcoming visit, derive next visit date from plan
    if (plan.status === 'active' && !nextVisit) {
      try {
        // Use ServicePlanEngine if available (admin context)
        if (typeof ServicePlanEngine !== 'undefined') {
          const dates = ServicePlanEngine.generateVisitDates(plan, 4);
          if (dates[0]) {
            const d = new Date(dates[0] + 'T12:00:00');
            nextVisitDisplay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              + ' <span style="font-size:9px;color:#7e22ce;font-weight:700;">PLAN</span>';
          }
        }
      } catch (e) {}
    }

    const planStatusColor = plan.status === 'active' ? '#166534' : plan.status === 'paused' ? '#92400e' : '#64748b';
    const planStatusBg    = plan.status === 'active' ? '#dcfce7' : plan.status === 'paused' ? '#fef9ec' : '#f1f5f9';
    planBadgeHtml = `<span style="display:inline-flex;align-items:center;gap:3px;background:${planStatusBg};color:${planStatusColor};border-radius:20px;padding:1px 7px;font-size:10px;font-weight:600;">
      ${planLabel}
    </span>`;
  }

  // Alert display
  const alertText = alerts === 0
    ? `<span style="color:#16a34a;font-weight:600;">Clear</span>`
    : `<span style="color:#dc2626;font-weight:600;">${alerts} Active</span>`;

  const statusAttr = (prop.service_status || 'inactive').toLowerCase();

  return `
    <div class="property-main-card" onclick="window.location.href='client-property-detail.html?id=${prop.id || ''}'" role="button" tabindex="0"
      data-status="${statusAttr}" data-name="${prop.property_name}"
      style="background:#fff;border:1px solid var(--navy-100);border-radius:16px;overflow:hidden;cursor:pointer;
      transition:box-shadow .2s,transform .2s;" aria-label="${prop.property_name}">

      <!-- Property Image Header -->
      <div style="height:180px;background:url('${SHWUI.getPropertyImage(prop)}') center/cover no-repeat;position:relative;">
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(10,25,50,.7));"></div>
        <div style="position:absolute;top:12px;right:12px;display:flex;gap:6px;">
          ${SHWUI.serviceStatusBadge(prop.service_status)}
        </div>
        <div style="position:absolute;bottom:14px;left:16px;right:16px;">
          <div style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-.02em;">${prop.property_name}</div>
          <div style="font-size:12px;color:rgba(255,255,255,.8);margin-top:2px;">
            ${prop.address_line1}, ${prop.city}, ${prop.state} ${prop.zip}
          </div>
        </div>
      </div>

      <!-- Card Body -->
      <div style="padding:16px 20px;">

        <!-- Owner + Health Row -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--navy-400);margin-bottom:2px;">Owner</div>
            <div style="font-size:13px;font-weight:600;color:var(--navy-800);">${prop.owner_name}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--navy-400);margin-bottom:2px;">Property Health</div>
            ${SHWUI.healthBadge(prop.property_health)}
          </div>
        </div>

        <!-- Meta Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div style="background:var(--navy-50);border-radius:10px;padding:10px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:3px;">Service Plan</div>
            <div style="font-size:12px;">${planBadgeHtml}</div>
          </div>
          <div style="background:var(--navy-50);border-radius:10px;padding:10px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:3px;">Active Alerts</div>
            <div style="font-size:12px;">${alertText}</div>
          </div>
          <div style="background:var(--navy-50);border-radius:10px;padding:10px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:3px;">Last Visit</div>
            <div style="font-size:12px;font-weight:600;color:var(--navy-700);">${lastVisit ? SHW.fmt.date(lastVisit.actual_end || lastVisit.scheduled_start) : '—'}</div>
          </div>
          <div style="background:${plan && plan.status === 'active' ? '#f0f9ff' : 'var(--navy-50)'};border-radius:10px;padding:10px;${plan && plan.status === 'active' ? 'border:1px solid #bae6fd;' : ''}">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:3px;">Next Visit</div>
            <div style="font-size:12px;font-weight:600;color:var(--navy-700);">${nextVisitDisplay}</div>
          </div>
          <div style="background:var(--navy-50);border-radius:10px;padding:10px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:3px;">Assigned Inspector</div>
            <div style="font-size:12px;font-weight:600;color:var(--navy-700);">${inspector}</div>
          </div>
          <div style="background:var(--navy-50);border-radius:10px;padding:10px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:3px;">Last Report</div>
            <div style="font-size:12px;font-weight:600;color:var(--navy-700);">${lastVisit ? SHW.fmt.date(lastVisit.actual_end || lastVisit.scheduled_start) : '—'}</div>
          </div>
        </div>

        <!-- Recent Visit Dates -->
        ${visits.length > 0 ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:6px;">Recent Visit History</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${visitDates || '<span style="font-size:11px;color:var(--navy-400);">No visits yet</span>'}
          </div>
        </div>` : ''}

        <!-- Card Footer -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--navy-100);">
          <div style="font-size:11px;color:var(--navy-400);">${prop.city}, ${prop.state} · ${prop.square_footage ? prop.square_footage.toLocaleString() + ' sq ft' : ''}</div>
          <span style="font-size:12px;font-weight:600;color:var(--blue-600);display:flex;align-items:center;gap:4px;">
            View Details
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </div>
      </div>
    </div>`;
}

// ─── ADD VISIT DATE PILL CSS ──────────────────────────────────────────────────
(function injectPropStyles() {
  if (document.getElementById('prop-data-styles')) return;
  const s = document.createElement('style');
  s.id = 'prop-data-styles';
  s.textContent = `
    .prop-visit-date-pill {
      display: inline-flex; align-items: center;
      font-size: 10px; font-weight: 500;
      padding: 2px 8px; border-radius: 20px;
      background: var(--navy-100); color: var(--navy-600);
    }
    .property-main-card:hover { box-shadow: 0 8px 30px rgba(0,30,80,.1); transform: translateY(-2px); }
  `;
  document.head.appendChild(s);
})();
