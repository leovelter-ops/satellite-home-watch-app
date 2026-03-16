/**
 * ═══════════════════════════════════════════════════════════════════
 *  SATELLITE HOME WATCH — ALL ALERTS PAGE CONTROLLER
 *  alerts-data.js — Wires backend to client-alerts.html
 *  v2 — deployment bundle refresh
 * ═══════════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initAlertsPage();
});

let _allAlerts = [];

async function initAlertsPage() {
  try {
    const alerts = await SHW.Alerts.getEnrichedAlerts();
    _allAlerts = alerts;

    renderAlertsSummaryBar(alerts);
    renderAlertsList(alerts);
    bindAlertFilters(alerts);
    await SHWUI.updateSidebarBadges();
  } catch (err) {
    SHWUI.showToast('Unable to load alerts.', 'error');
  }
}

// ─── SUMMARY BAR ──────────────────────────────────────────────────────────────

function renderAlertsSummaryBar(alerts) {
  const open      = alerts.filter(a => ['open', 'in_progress', 'pending_client_decision'].includes(a.status));
  const urgent    = alerts.filter(a => a.severity === 'urgent' && a.status !== 'resolved');
  const resolved  = alerts.filter(a => a.status === 'resolved' || a.status === 'closed');

  // Update summary stat elements (look for standard patterns used in the page)
  const statEls = document.querySelectorAll('.alerts-stat-item, .alert-summary-item');
  statEls.forEach(el => {
    const label = el.querySelector('.alerts-stat-label, .summary-label')?.textContent?.toLowerCase() || '';
    const valEl = el.querySelector('.alerts-stat-value, .summary-value');
    if (!valEl) return;
    if (label.includes('open') || label.includes('active')) valEl.textContent = open.length;
    else if (label.includes('urgent'))                       valEl.textContent = urgent.length;
    else if (label.includes('resolved'))                     valEl.textContent = resolved.length;
    else if (label.includes('total'))                        valEl.textContent = alerts.length;
  });

  // Update page subtitle
  const subtitle = document.querySelector('.alerts-page-subtitle');
  if (subtitle) {
    subtitle.textContent = open.length === 0
      ? 'All properties are clear — no active alerts'
      : `${open.length} active alert${open.length !== 1 ? 's' : ''} across your properties`;
  }

  // Update alerts count badge
  const countBadge = document.querySelector('.alerts-count-badge, #alertsCount');
  if (countBadge) countBadge.textContent = open.length;
}

// ─── ALERTS LIST ──────────────────────────────────────────────────────────────

function renderAlertsList(alerts) {
  // Find the alerts feed/list container
  const containers = [
    document.getElementById('alertsFeed'),
    document.querySelector('.alerts-feed'),
    document.querySelector('.alerts-list'),
    document.querySelector('[data-alerts-list]'),
  ];
  const container = containers.find(c => c !== null);

  if (!container) {
    // Try inline update of existing cards
    renderAlertsInline(alerts);
    return;
  }

  if (alerts.length === 0) {
    container.innerHTML = `
      <div style="padding:48px 24px;text-align:center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5"
          style="margin:0 auto 16px;display:block;opacity:.7;">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
        </svg>
        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:var(--navy-700);">All Clear — No Active Alerts</p>
        <p style="margin:0;font-size:13px;color:var(--navy-500);">All properties are in good standing</p>
      </div>`;
    return;
  }

  container.innerHTML = alerts.map(a => buildAlertCard(a)).join('');
}

function buildAlertCard(a) {
  return `
    <article class="alert-card sev-${a.severity}" role="listitem" tabindex="0"
      onclick="openAlertDetail('${a.id}')"
      onkeydown="if(event.key==='Enter')openAlertDetail('${a.id}')"
      aria-label="${a.title} — ${a.severity} severity at ${a.property_name}">

      ${SHWUI.alertCategoryIcon(a.category)}

      <div class="alert-card-body">
        <div class="alert-title-row">
          <span class="alert-title">${a.title}</span>
          <span class="alert-property-badge">${a.property_name}</span>
        </div>
        <p class="alert-description">${a.description?.substring(0, 200) || ''}${(a.description?.length || 0) > 200 ? '...' : ''}</p>
        <div class="alert-meta-row">
          <span class="alert-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="2"/>
            </svg>
            Detected During: ${a.related_visit_type}
          </span>
          <span class="alert-meta-dot"></span>
          <span class="alert-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Created: ${a.date_label}
          </span>
          <span class="alert-meta-dot"></span>
          <span class="alert-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Open for: ${a.age_label}
          </span>
        </div>
        <div class="alert-meta-row" style="margin-top:4px;">
          <span class="alert-related-visit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="2"/>
            </svg>
            Related Visit: ${a.related_visit_type}
          </span>
          ${a.category === 'water' || a.category === 'structural' ? `
            <span class="alert-photo-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Photo Evidence Available
            </span>` : ''}
        </div>
      </div>

      <div class="alert-card-right">
        ${SHWUI.alertSeverityPill(a.severity)}
        ${SHWUI.alertStatusPill(a.status)}
        ${a.recommended_vendor ? `
          <div style="font-size:10px;color:var(--navy-400);margin-top:6px;max-width:120px;text-align:right;line-height:1.3;">
            Vendor: ${a.recommended_vendor}
          </div>` : ''}
        <div class="alert-card-cta">
          View Details
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </div>
      </div>
    </article>`;
}

// ─── INLINE FALLBACK ──────────────────────────────────────────────────────────

function renderAlertsInline(alerts) {
  // The page has hardcoded cards — inject a new data-driven feed after the header
  const main = document.querySelector('main.dashboard-content');
  if (!main) return;

  let feed = main.querySelector('.alerts-feed-data');
  if (!feed) {
    feed = document.createElement('div');
    feed.className = 'alerts-feed-data';
    // Find best insertion point
    const filterBar = main.querySelector('.alerts-filters, .filter-section');
    if (filterBar) filterBar.after(feed);
    else {
      const header = main.querySelector('.alerts-page-header');
      if (header) header.after(feed);
      else main.prepend(feed);
    }
    // Hide original hardcoded feed
    const origFeed = main.querySelector('.alerts-feed:not(.alerts-feed-data)');
    if (origFeed) origFeed.style.display = 'none';
  }

  if (alerts.length === 0) {
    feed.innerHTML = `
      <div style="padding:48px;text-align:center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5"
          style="margin:0 auto 14px;display:block;opacity:.7;">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
        </svg>
        <p style="margin:0;font-size:15px;font-weight:700;color:var(--navy-700);">All Clear — No Active Alerts</p>
      </div>`;
    return;
  }

  feed.innerHTML = alerts.map(a => buildAlertCard(a)).join('');
}

// ─── FILTER BINDING ───────────────────────────────────────────────────────────

function bindAlertFilters(alerts) {
  const searchInput  = document.querySelector('input[placeholder*="Search"], #alertsSearch, .alerts-search');
  const statusFilter = document.querySelector('#filterStatus, select[data-filter="status"]');
  const sevFilter    = document.querySelector('#filterSeverity, select[data-filter="severity"]');
  const propFilter   = document.querySelector('#filterProperty, select[data-filter="property"]');

  function applyFilters() {
    const search  = searchInput?.value.toLowerCase().trim() || '';
    const status  = statusFilter?.value || 'all';
    const sev     = sevFilter?.value    || 'all';
    const prop    = propFilter?.value   || 'all';

    const filtered = _allAlerts.filter(a => {
      const matchSearch = !search ||
        a.title.toLowerCase().includes(search) ||
        a.property_name.toLowerCase().includes(search) ||
        a.description?.toLowerCase().includes(search);
      const matchStatus = status === 'all' || a.status === status;
      const matchSev    = sev    === 'all' || a.severity === sev;
      const matchProp   = prop   === 'all' || a.property_name === prop;
      return matchSearch && matchStatus && matchSev && matchProp;
    });

    renderAlertsList(filtered);

    const countEl = document.querySelector('.alerts-count, #alertsVisibleCount');
    if (countEl) countEl.textContent = filtered.length;
  }

  if (searchInput)  searchInput.addEventListener('input',   applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
  if (sevFilter)    sevFilter.addEventListener('change',    applyFilters);
  if (propFilter) {
    // Populate property options from real data
    const propNames = [...new Set(alerts.map(a => a.property_name))];
    propNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      propFilter.appendChild(opt);
    });
    propFilter.addEventListener('change', applyFilters);
  }
}

// ─── ALERT DETAIL MODAL ───────────────────────────────────────────────────────

window.openAlertDetail = async function(alertId) {
  const alert = _allAlerts.find(a => a.id === alertId);
  if (!alert) return;

  // Get timeline events
  const { data: timeline } = await SHW.Alerts.getAlertTimeline(alertId);

  const existing = document.getElementById('alertDetailModal');
  if (existing) existing.remove();

  const timelineHTML = (timeline || []).map(e => `
    <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--navy-50);">
      <div style="width:24px;height:24px;border-radius:50%;background:var(--blue-50);display:flex;align-items:center;
        justify-content:center;flex-shrink:0;margin-top:2px;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </div>
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--navy-800);">${e.event_label}</div>
        ${e.event_notes ? `<div style="font-size:11px;color:var(--navy-500);margin-top:2px;">${e.event_notes}</div>` : ''}
        <div style="font-size:10px;color:var(--navy-400);margin-top:2px;">${SHW.fmt.date(e.created_at)}</div>
      </div>
    </div>`).join('');

  const modal = document.createElement('div');
  modal.id = 'alertDetailModal';
  modal.style.cssText = `position:fixed;inset:0;z-index:1000;background:rgba(10,25,50,.5);
    display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;`;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:600px;width:100%;max-height:85vh;overflow-y:auto;
      box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="padding:20px 24px;border-bottom:1px solid var(--navy-100);display:flex;align-items:flex-start;justify-content:space-between;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            ${SHWUI.alertSeverityPill(alert.severity)}
            ${SHWUI.alertStatusPill(alert.status)}
          </div>
          <div style="font-size:17px;font-weight:700;color:var(--navy-900);margin-top:8px;">${alert.title}</div>
          <div style="font-size:12px;color:var(--navy-500);margin-top:3px;">${alert.property_name} · ${alert.date_label}</div>
        </div>
        <button onclick="document.getElementById('alertDetailModal').remove()"
          style="background:none;border:none;cursor:pointer;color:var(--navy-400);padding:4px;flex-shrink:0;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div style="padding:20px 24px;">
        <div style="background:var(--navy-50);border-radius:10px;padding:12px;margin-bottom:16px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:6px;">Description</div>
          <div style="font-size:13px;color:var(--navy-700);line-height:1.5;">${alert.description || '—'}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <div style="background:var(--navy-50);border-radius:10px;padding:10px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:3px;">Category</div>
            <div style="font-size:12px;font-weight:600;color:var(--navy-700);">${alert.category_label}</div>
          </div>
          <div style="background:var(--navy-50);border-radius:10px;padding:10px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:3px;">Age</div>
            <div style="font-size:12px;font-weight:600;color:var(--navy-700);">${alert.age_label}</div>
          </div>
          ${alert.recommended_vendor ? `
            <div style="background:var(--navy-50);border-radius:10px;padding:10px;grid-column:span 2;">
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:3px;">Recommended Vendor</div>
              <div style="font-size:12px;font-weight:600;color:var(--navy-700);">${alert.recommended_vendor}</div>
            </div>` : ''}
        </div>
        ${timeline && timeline.length > 0 ? `
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--navy-800);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em;">Alert Timeline</div>
            ${timelineHTML}
          </div>` : ''}
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};
