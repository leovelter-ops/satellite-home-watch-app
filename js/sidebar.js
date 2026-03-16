/**
 * Shared sidebar/mobile topbar helpers used by client/employee/admin pages.
 */

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar || !overlay) return;

  const isOpen = sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar || !overlay) return;

  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function injectMobileTopbar(labelText) {
  if (document.getElementById('mobileTopbar')) return;

  const wrapper = document.querySelector('.app-wrapper');
  if (!wrapper) return;

  const bar = document.createElement('div');
  bar.id = 'mobileTopbar';
  bar.className = 'mobile-topbar';
  bar.innerHTML = `
    <button id="mobileTopbarBackBtn" class="mobile-topbar-back-btn" type="button" aria-label="Back" style="display:none;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <button class="mobile-topbar-menu-btn" type="button" aria-label="Open navigation menu" onclick="toggleSidebar()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <div class="mobile-topbar-title">${labelText || 'Portal'}</div>
  `;

  wrapper.insertBefore(bar, wrapper.firstChild);
}

window.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeSidebar();
  }
});

window.addEventListener('resize', function() {
  if (window.innerWidth > 1024) {
    closeSidebar();
  }
});
