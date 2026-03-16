/* ============================================================
   Satellite Home Watch — Mobile Navigation History Module
   js/nav.js  (v2 — history-based, no fake swipe gestures)
   v2 refresh — deployment bundle refresh
   ============================================================

   DESIGN GOALS
   ─────────────
   • All drill-down pages (detail views) are reached via real
     browser navigation (window.location.href / <a href>).
   • Every page therefore sits in the browser's history stack
     automatically — browser Back, Android back-button, and
     iOS swipe-back all work without any tricks.
   • This module adds three thin layers on top of that:
       1. SHWNav.back()  — intelligent back button helper used
          by in-app back buttons.  Falls back to a known safe
          URL if the user has no real history (e.g. arrived
          via a direct link / push notification).
       2. SHWNav.pushDetail()  — used by list → detail
          navigations that set a filter/scroll state so that
          pressing Back returns the list to the same context.
       3. Messages single-page split-view  — messages pages
          show a two-panel layout on desktop but a stacked
          "list → thread" pattern on mobile.  Opening a thread
          uses history.pushState so the browser Back button
          returns to the thread list naturally.

   WHAT THIS MODULE DOES NOT DO
   ─────────────────────────────
   • It does NOT fake swipe gestures — native browser/device
     swipe-back works automatically when history is correct.
   • It does NOT intercept or re-implement browser Back.
     history.back() is only called when the user taps an
     in-app back button.
   • It does NOT prevent default navigation anywhere.

   ============================================================ */

const SHWNav = (() => {

  // ─── FALLBACK MAP ─────────────────────────────────────────
  // If the user has no real history entry before the current
  // page (e.g. opened a deep-link), we need a safe place to
  // go. Map each filename to its logical parent list page.

  const FALLBACK = {
    // Client portal
    'client-visit-detail.html':     'client-visits.html',
    'client-alert-detail.html':     'client-alerts.html',
    'client-property-detail.html':  'client-properties.html',

    // Staff portal
    'employee-visit-detail.html':   'employee-visits.html',

    // CRM / Admin
    'crm-customer-profile.html':    'crm-customers.html',
    'crm-lead-profile.html':        'crm-leads.html',
    'crm-request-detail.html':      'crm-requests.html',

    // Admin sub-pages
    'admin-schedule.html':          'admin-schedule.html',
    'admin-visit-detail.html':      'admin-all-visits.html',
  };

  // ─── CURRENT PAGE ─────────────────────────────────────────
  function currentFile() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  // ─── BACK NAVIGATION ──────────────────────────────────────
  // Used by in-app back buttons.
  // Strategy:
  //   1. If there is a real previous entry in this session
  //      (history.length > 1 AND document.referrer is within
  //      the same origin), use history.back().
  //   2. Otherwise navigate to the known fallback URL (or
  //      dashboard.html if unknown).
  //
  // The optional `fallbackUrl` param lets individual pages
  // override the default fallback (e.g. a "back to list with
  // filter" URL).

  function back(fallbackUrl) {
    const file     = currentFile();
    const safeFall = fallbackUrl
                  || FALLBACK[file]
                  || 'dashboard.html';

    // Check: did the user navigate here from within this app
    // (same origin)?  If so, a real history entry exists and
    // history.back() is the right move.
    const referrer = document.referrer;
    const sameOrigin = referrer &&
      (new URL(referrer, window.location.href).origin === window.location.origin);

    if (history.length > 1 && sameOrigin) {
      history.back();
    } else {
      // Deep-linked or opened fresh: go to the safe fallback
      window.location.href = safeFall;
    }
  }

  // ─── PUSH DETAIL ─────────────────────────────────────────
  // Navigate from a list to a detail page, preserving the
  // list URL (with current query params / scroll position)
  // in history so that pressing Back returns to it exactly.
  //
  // Usage:
  //   SHWNav.pushDetail('client-visit-detail.html?id=VIS-047')
  //
  // This is just a thin wrapper around window.location.href.
  // The browser handles history automatically — the only
  // reason this helper exists is to be a named convention
  // that makes intent explicit in calling code.

  function pushDetail(url) {
    window.location.href = url;
  }

  // ─── MESSAGES: PUSH THREAD ───────────────────────────────
  // On mobile, opening a message thread should push a history
  // entry so that browser/device Back returns to the thread
  // list without a full page reload.
  //
  // We do this by storing the thread state in the URL hash:
  //   messages.html              → thread list view
  //   messages.html#thread-1     → thread-1 open
  //
  // Calling this function updates the hash (pushState) and
  // then triggers the visual switch already implemented in
  // the messages page JS.
  //
  // The messages page registers a popstate listener (see
  // initMessagesHistory()) that catches browser Back and
  // reverses the switch.

  function pushThread(threadId) {
    if (!threadId) return;
    history.pushState({ thread: threadId }, '', '#' + threadId);
  }

  // Replace current history entry for thread (no back entry)
  function replaceThread(threadId) {
    history.replaceState({ thread: threadId || null }, '', threadId ? '#' + threadId : window.location.pathname);
  }

  // ─── MESSAGES: INIT HISTORY ───────────────────────────────
  // Called once by each messages page on DOMContentLoaded.
  //
  // Parameters:
  //   openThreadFn(threadId)   — function that switches the UI
  //                               to show a given thread
  //   closeThreadFn()          — function that shows the list
  //   defaultThreadId          — thread to open on first load
  //                               (desktop default, null on mobile)
  //   isMobile()               — function returning bool
  //
  // Behaviour:
  //   • On load, if the URL has a hash matching a thread id,
  //     open that thread.
  //   • On load (mobile, no hash), show the list.
  //   • On load (desktop), open the default thread.
  //   • On popstate, respond to Back/Forward correctly.

  function initMessagesHistory({ openThreadFn, closeThreadFn, defaultThreadId, isMobile }) {
    const hash = window.location.hash.replace('#', '');

    // Replace the initial history state so we can identify
    // the "list" state by checking state.thread === null.
    if (!hash) {
      history.replaceState({ thread: null }, '', window.location.href);
    }

    // Decide what to show on initial load
    if (hash) {
      // URL has a thread hash — open that thread directly
      openThreadFn(hash, { pushHistory: false });
    } else if (isMobile && isMobile()) {
      // Mobile, no hash → show thread list
      closeThreadFn();
    } else {
      // Desktop (or tablet) — open the default thread
      if (defaultThreadId) {
        openThreadFn(defaultThreadId, { pushHistory: false });
      } else {
        closeThreadFn();
      }
    }

    // Listen for browser Back / Forward
    window.addEventListener('popstate', function(e) {
      const state = e.state;
      if (!state) return;

      if (state.thread) {
        // Moving forward to a thread
        openThreadFn(state.thread, { pushHistory: false });
      } else {
        // Moving back to the list
        closeThreadFn();
      }
    });
  }

  // ─── MOBILE BACK BUTTON VISIBILITY ───────────────────────
  // Detail pages call this to show/hide the mobile topbar
  // back button.  The back button is injected by injectMobileTopbar()
  // in sidebar.js with class .mobile-topbar-back-btn.

  function showMobileBackBtn(fallbackUrl) {
    const btn = document.getElementById('mobileTopbarBackBtn');
    if (!btn) return;
    btn.style.display = 'flex';
    btn.onclick = function(e) {
      e.preventDefault();
      back(fallbackUrl);
    };
  }

  function hideMobileBackBtn() {
    const btn = document.getElementById('mobileTopbarBackBtn');
    if (btn) btn.style.display = 'none';
  }

  // ─── SCROLL POSITION PERSISTENCE ─────────────────────────
  // List pages can call SHWNav.saveScroll() before navigating
  // to a detail page.  When the user returns, SHWNav.restoreScroll()
  // is called on DOMContentLoaded to jump back to the saved position.
  //
  // Key is based on the page filename so multiple lists can
  // coexist independently.

  function saveScroll(key) {
    const k = key || currentFile();
    const scrollY = window.scrollY
                 || (document.documentElement && document.documentElement.scrollTop)
                 || 0;
    try {
      sessionStorage.setItem('shw_scroll_' + k, scrollY);
    } catch(e) {}
  }

  function restoreScroll(key) {
    const k = key || currentFile();
    try {
      const saved = sessionStorage.getItem('shw_scroll_' + k);
      if (saved !== null) {
        // Small timeout to let the page render first
        setTimeout(function() {
          window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' });
        }, 60);
        sessionStorage.removeItem('shw_scroll_' + k);
      }
    } catch(e) {}
  }

  // ─── PUBLIC API ───────────────────────────────────────────
  return {
    back,
    pushDetail,
    pushThread,
    replaceThread,
    initMessagesHistory,
    showMobileBackBtn,
    hideMobileBackBtn,
    saveScroll,
    restoreScroll,
    currentFile,
  };

})();

// Make available globally
window.SHWNav = SHWNav;
