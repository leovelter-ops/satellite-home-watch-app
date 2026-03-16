/**
 * ═══════════════════════════════════════════════════════════════════
 *  SATELLITE HOME WATCH — ALL REPORTS PAGE CONTROLLER
 *  reports-data.js — Wires backend to client-reports.html
 *  v2 — deployment bundle refresh
 * ═══════════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initReportsPage();
});

let _allReports = [];

async function initReportsPage() {
  try {
    const reports = await SHW.Reports.getEnrichedReports(3);
    _allReports = reports;
    window._allReports = reports; // expose for modal/filter helpers in page script

    renderReportsSummaryBar(reports);
    renderReportsList(reports);
    bindReportFilters(reports);
    await SHWUI.updateSidebarBadges();
  } catch (err) {
    SHWUI.showToast('Unable to load reports.', 'error');
  }
}

// ─── SUMMARY BAR ──────────────────────────────────────────────────────────────

function renderReportsSummaryBar(reports) {
  const total = reports.length;
  const isNew = reports.filter(r => {
    const d = new Date(r.created_at || r.visit_date || r.published_at || 0);
    if (Number.isNaN(d.getTime())) return false;
    const ageDays = (Date.now() - d.getTime()) / 86400000;
    return ageDays <= 14;
  }).length;
  const propCount = new Set(reports.map(r => r.property_id).filter(Boolean)).size;

  const statEls = document.querySelectorAll('.reports-summary-stat');
  if (statEls[0]) statEls[0].querySelector('.reports-summary-stat-value').textContent = String(total);
  if (statEls[1]) statEls[1].querySelector('.reports-summary-stat-value').textContent = String(isNew);
  if (statEls[2]) statEls[2].querySelector('.reports-summary-stat-value').textContent = String(propCount);

  const updatedEl = document.querySelector('.reports-summary-updated');
  if (updatedEl) {
    const last = reports[0]?.created_at || reports[0]?.visit_date || reports[0]?.published_at;
    const txt = last ? `Last Updated ${SHW.fmt.date(last)}` : 'Last Updated —';
    updatedEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      ${txt}`;
  }

  const visible = document.getElementById('visibleCount');
  if (visible) visible.textContent = String(total);
}

// ─── REPORTS LIST ─────────────────────────────────────────────────────────────

function renderReportsList(reports) {
  const containers = [
    document.querySelector('.reports-feed'),
    document.querySelector('.reports-list'),
    document.getElementById('reportsFeed'),
    document.querySelector('[data-reports-list]'),
  ];
  const container = containers.find(c => c !== null);

  if (!container) {
    renderReportsInline(reports);
    return;
  }

  const empty = document.getElementById('reportsEmpty');
  const visible = document.getElementById('visibleCount');

  if (reports.length === 0) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    if (visible) visible.textContent = '0';
    return;
  }

  if (empty) empty.style.display = 'none';
  container.innerHTML = reports.map(r => buildReportCard(r)).join('');
  if (visible) visible.textContent = String(reports.length);
}

function buildReportCard(r) {
  const resultColors = {
    all_clear:              { border: '#16a34a', bg: 'rgba(22,163,74,.06)', icon: '#16a34a' },
    attention_needed:       { border: '#d97706', bg: 'rgba(217,119,6,.06)', icon: '#d97706' },
    issues_found:           { border: '#dc2626', bg: 'rgba(220,38,38,.06)', icon: '#dc2626' },
    urgent_action_required: { border: '#dc2626', bg: 'rgba(220,38,38,.08)', icon: '#dc2626' },
  };
  const res = resultColors[r.overall_result] || { border: '#94a3b8', bg: '#f9fafb', icon: '#94a3b8' };

  return `
    <article class="report-card" tabindex="0" role="listitem"
      onclick="openReportDetail('${r.id}')"
      onkeydown="if(event.key==='Enter')openReportDetail('${r.id}')"
      style="background:#fff;border:1px solid var(--navy-100);border-left:4px solid ${res.border};
        border-radius:12px;padding:20px;cursor:pointer;transition:box-shadow .2s,transform .2s;margin-bottom:10px;"
      aria-label="${r.report_title}">

      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">

        <!-- Left: Report info -->
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
            ${SHWUI.reportResultBadge(r.overall_result)}
            <span style="font-size:11px;color:var(--navy-400);">${r.visit_type_label}</span>
          </div>
          <div style="font-size:15px;font-weight:700;color:var(--navy-900);margin-bottom:4px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.report_title}</div>
          <div style="font-size:12px;color:var(--navy-500);margin-bottom:8px;">
            ${r.property_name}
            ${r.property_address ? `<span style="color:var(--navy-300);"> · </span>${r.property_address}` : ''}
          </div>

          <!-- Report summary -->
          ${r.report_summary ? `
            <div style="font-size:12px;color:var(--navy-600);line-height:1.5;
              display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
              ${r.report_summary}
            </div>` : ''}

          <!-- Meta row -->
          <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap;">
            <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--navy-400);">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/>
              </svg>
              ${r.inspector_name}
            </span>
            <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--navy-400);">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              </svg>
              ${r.date_label}
            </span>
            <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--navy-400);">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              ${r.photo_count} photo${r.photo_count !== 1 ? 's' : ''}
            </span>
            ${r.issue_count > 0 ? `
              <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:#dc2626;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                ${r.issue_count} issue${r.issue_count !== 1 ? 's' : ''} found
              </span>` : ''}
          </div>
        </div>

        <!-- Right: Actions -->
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
          <button onclick="event.stopPropagation();previewReport('${r.id}')"
            style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;
              background:var(--blue-50);color:var(--blue-700);border:1px solid var(--blue-200);
              font-size:12px;font-weight:600;cursor:pointer;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Preview
          </button>
          <button onclick="event.stopPropagation();downloadReport('${r.id}')"
            style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;
              background:var(--navy-50);color:var(--navy-600);border:1px solid var(--navy-200);
              font-size:12px;font-weight:600;cursor:pointer;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            PDF
          </button>
        </div>
      </div>
    </article>`;
}

function renderReportsInline(reports) {
  const main = document.querySelector('main.dashboard-content');
  if (!main) return;

  let feed = main.querySelector('.reports-feed-data');
  if (!feed) {
    feed = document.createElement('div');
    feed.className = 'reports-feed-data';
    feed.setAttribute('data-reports-list', 'true');
    const filterSection = main.querySelector('.reports-filters, .filter-section');
    if (filterSection) filterSection.after(feed);
    else main.appendChild(feed);
    const origFeed = main.querySelector('.reports-feed:not(.reports-feed-data)');
    if (origFeed) origFeed.style.display = 'none';
  }

  feed.innerHTML = reports.map(r => buildReportCard(r)).join('');
}

// ─── FILTER BINDING ───────────────────────────────────────────────────────────

function bindReportFilters(reports) {
  const searchInput  = document.querySelector('input[placeholder*="Search"], #reportsSearch, .reports-search');
  const resultFilter = document.querySelector('#filterResult, select[data-filter="result"]');
  const propFilter   = document.querySelector('#filterProperty, select[data-filter="property"]');

  function applyFilters() {
    const search = searchInput?.value.toLowerCase().trim() || '';
    const result = resultFilter?.value || 'all';
    const prop   = propFilter?.value   || 'all';

    const filtered = _allReports.filter(r => {
      const matchSearch = !search ||
        r.report_title.toLowerCase().includes(search) ||
        r.property_name.toLowerCase().includes(search) ||
        r.inspector_name.toLowerCase().includes(search);
      const matchResult = result === 'all' || r.overall_result === result;
      const matchProp   = prop   === 'all' || r.property_name === prop;
      return matchSearch && matchResult && matchProp;
    });

    renderReportsList(filtered);
  }

  if (searchInput)  searchInput.addEventListener('input',   applyFilters);
  if (resultFilter) resultFilter.addEventListener('change', applyFilters);
  if (propFilter)   propFilter.addEventListener('change',   applyFilters);
}

// ─── REPORT ACTIONS ──────────────────────────────────────────────────────────

window.previewReport = function(reportId) {
  const report = _allReports.find(r => r.id === reportId);
  if (!report) return;
  openReportDetail(reportId);
};

window.downloadReport = function(reportId) {
  const report = _allReports.find(r => r.id === reportId);
  if (!report) return;
  SHWUI.showToast(`Downloading: ${report.report_title}`, 'info');
  // In production: window.open(report.pdf_url)
};

window.openReportDetail = async function(reportId) {
  const report = _allReports.find(r => r.id === reportId);
  if (!report) return;

  const existing = document.getElementById('reportDetailModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'reportDetailModal';
  modal.style.cssText = `position:fixed;inset:0;z-index:1000;background:rgba(10,25,50,.5);
    display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;`;

  const resultMap = {
    all_clear:              { label: 'All Clear',    color: '#16a34a', bg: '#f0fdf4' },
    attention_needed:       { label: 'Attention Needed', color: '#d97706', bg: '#fffbeb' },
    issues_found:           { label: 'Issues Found', color: '#dc2626', bg: '#fef2f2' },
    urgent_action_required: { label: 'Urgent Action', color: '#dc2626', bg: '#fef2f2' },
  };
  const res = resultMap[report.overall_result] || { label: 'Pending', color: '#6b7280', bg: '#f9fafb' };

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:640px;width:100%;max-height:85vh;overflow-y:auto;
      box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="padding:20px 24px;border-bottom:1px solid var(--navy-100);display:flex;justify-content:space-between;">
        <div>
          <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;
            color:${res.color};background:${res.bg};">${res.label}</span>
          <div style="font-size:17px;font-weight:700;color:var(--navy-900);margin-top:8px;">${report.report_title}</div>
          <div style="font-size:12px;color:var(--navy-500);margin-top:3px;">
            ${report.property_name} · ${report.date_label} · By ${report.inspector_name}
          </div>
        </div>
        <button onclick="document.getElementById('reportDetailModal').remove()"
          style="background:none;border:none;cursor:pointer;color:var(--navy-400);padding:4px;flex-shrink:0;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div style="padding:20px 24px;">
        <div style="background:var(--navy-50);border-radius:10px;padding:14px;margin-bottom:16px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:6px;">Report Summary</div>
          <div style="font-size:13px;color:var(--navy-700);line-height:1.6;">${report.report_summary || 'No summary available.'}</div>
        </div>
        ${report.major_findings ? `
          <div style="background:var(--navy-50);border-radius:10px;padding:14px;margin-bottom:16px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-400);margin-bottom:6px;">Major Findings</div>
            <div style="font-size:13px;color:var(--navy-700);line-height:1.6;">${report.major_findings}</div>
          </div>` : ''}
        <div style="display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap;">
          <span style="font-size:12px;color:var(--navy-400);">${report.photo_count} photos · ${report.issue_count} issues</span>
          <button onclick="downloadReport('${report.id}')"
            style="display:flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;
              background:var(--navy-900);color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </button>
        </div>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};

// Card hover effect
document.addEventListener('mouseover', e => {
  const card = e.target.closest('.report-card');
  if (card) { card.style.boxShadow = '0 6px 24px rgba(0,30,80,.1)'; card.style.transform = 'translateY(-2px)'; }
});
document.addEventListener('mouseout', e => {
  const card = e.target.closest('.report-card');
  if (card) { card.style.boxShadow = ''; card.style.transform = ''; }
});
