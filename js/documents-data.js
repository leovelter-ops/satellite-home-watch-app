/**
 * ═══════════════════════════════════════════════════════════════════
 *  SATELLITE HOME WATCH — ALL DOCUMENTS PAGE CONTROLLER
 *  documents-data.js — Wires backend to client-documents.html
 *  v2 — deployment bundle refresh
 *
 *  NOTE: The page uses a single table-style document list defined
 *  statically in client-documents.html (.docs-table-wrap).
 *  This controller handles:
 *    • updating the summary bar counts from the backend
 *    • wiring the search/filter controls to show/hide table rows
 *    • document action handlers (read, download)
 *  It does NOT render any additional card-style document layouts.
 * ═══════════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initDocumentsPage();
});

let _allDocuments = [];

async function initDocumentsPage() {
  try {
    const docs = await SHW.Documents.getEnrichedDocuments(3);
    _allDocuments = docs;

    renderDocumentsSummaryBar(docs);
    bindDocumentFilters();
    await SHWUI.updateSidebarBadges();
  } catch (err) {
    // Non-fatal: static table rows remain visible
  }
}

// ─── SUMMARY BAR ──────────────────────────────────────────────────────────────

function renderDocumentsSummaryBar(docs) {
  const unread = docs.filter(d => d.read_status === 'unread').length;

  // Update the docs-summary-bar counts (selects by label text)
  document.querySelectorAll('.docs-summary-item').forEach(el => {
    const label = el.querySelector('.docs-summary-label')?.textContent?.toLowerCase() || '';
    const countEl = el.querySelector('.docs-summary-count');
    if (!countEl) return;
    if (label.includes('total'))   countEl.textContent = docs.length;
    if (label.includes('unread'))  countEl.textContent = unread;
    // "Recent Uploads" and "Properties" counts are static from the HTML
  });
}

// ─── FILTER BINDING ───────────────────────────────────────────────────────────
// Filters operate on the static .doc-row elements already in the DOM.

function bindDocumentFilters() {
  const searchInput = document.getElementById('docsSearch');
  const propFilter  = document.getElementById('filterProperty');
  const typeFilter  = document.getElementById('filterType');
  const statusFilter = document.getElementById('filterStatus');

  function applyFilters() {
    const search = (searchInput?.value || '').toLowerCase().trim();
    const prop   = (propFilter?.value  || '').toLowerCase();
    const type   = (typeFilter?.value  || '').toLowerCase();
    const status = (statusFilter?.value || '').toLowerCase();

    const rows = document.querySelectorAll('.docs-table-wrap .doc-row');
    let visible = 0;

    rows.forEach(row => {
      const name     = (row.querySelector('.doc-name')?.textContent        || '').toLowerCase();
      const propText = (row.querySelector('.doc-property-badge')?.textContent || '').toLowerCase();
      const typeText = (row.querySelector('.doc-type-badge')?.textContent   || '').toLowerCase();
      const owner    = (row.querySelector('.doc-owner')?.textContent        || '').toLowerCase();
      const isUnread = row.classList.contains('is-unread');
      const rowStatus = isUnread ? 'unread' : 'read';

      const matchSearch = !search || name.includes(search) || propText.includes(search) || typeText.includes(search) || owner.includes(search);
      const matchProp   = !prop   || propText.includes(prop);
      const matchType   = !type   || typeText.includes(type) || name.includes(type);
      const matchStatus = !status || rowStatus === status;

      const show = matchSearch && matchProp && matchType && matchStatus;
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    // Update visible count
    const countEl = document.getElementById('visibleCount');
    if (countEl) countEl.textContent = visible;

    // Show / hide empty state
    const emptyState = document.getElementById('docsEmptyState');
    if (emptyState) emptyState.style.display = visible === 0 ? '' : 'none';

    // Show / hide group headers — hide a group label if all its rows are hidden
    document.querySelectorAll('.docs-group-row').forEach(groupRow => {
      let sibling = groupRow.nextElementSibling;
      let hasVisible = false;
      while (sibling && !sibling.classList.contains('docs-group-row')) {
        if (sibling.classList.contains('doc-row') && sibling.style.display !== 'none') {
          hasVisible = true;
          break;
        }
        sibling = sibling.nextElementSibling;
      }
      groupRow.style.display = hasVisible ? '' : 'none';
    });
  }

  if (searchInput)  searchInput.addEventListener('input',  applyFilters);
  if (propFilter)   propFilter.addEventListener('change',  applyFilters);
  if (typeFilter)   typeFilter.addEventListener('change',  applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
}

// ─── DOCUMENT ACTIONS ─────────────────────────────────────────────────────────

window.openDocument = async function(docId) {
  try {
    await SHW.Documents.markRead(docId);
  } catch (_) { /* non-fatal */ }

  // Update the static table row's read-status badge
  _markRowRead(docId);
  SHWUI.showToast('Document opened', 'info');
  SHWUI.updateSidebarBadges();
};

window.readDocument = async function(docId) {
  try {
    await SHW.Documents.markRead(docId);
  } catch (_) { /* non-fatal */ }

  _markRowRead(docId);
  SHWUI.updateSidebarBadges();
  SHWUI.showToast('Document marked as read', 'success');
};

window.downloadDocument = function(docId) {
  SHWUI.showToast('Preparing PDF download…', 'info');
  // In production: window.open(doc.file_url)
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function _markRowRead(docId) {
  // Find the doc-row whose onclick references the given docId and update it
  const rows = document.querySelectorAll('.doc-row');
  rows.forEach(row => {
    const onclick = row.getAttribute('onclick') || '';
    if (!onclick.includes(docId)) return;

    // Remove unread styling
    row.classList.remove('is-unread');
    row.removeAttribute('aria-label');

    // Update the read-status badge
    const badge = row.querySelector('.doc-read-status');
    if (badge) {
      badge.className = 'doc-read-status is-read';
      badge.setAttribute('aria-label', 'Read');
      badge.innerHTML = 'Read';
    }

    // Remove the unread dot from the document icon area if present
    const dot = row.querySelector('.status-dot');
    if (dot) dot.remove();
  });
}
