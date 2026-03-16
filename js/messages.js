/* ============================================================
   Satellite Home Watch — Messages Page JS  (v2)
   Handles: thread selection, search filter,
   compose/send, modals, auto-resize, toasts,
   v2 refresh — deployment bundle refresh
   history-based mobile back navigation
   ============================================================

   MOBILE NAVIGATION BEHAVIOUR
   ────────────────────────────
   On mobile (≤ 768 px) the messages page shows a stacked
   layout: thread list first, conversation view second.

   Opening a thread calls history.pushState({ thread: id })
   which adds a real browser history entry.  Pressing the
   device Back button (or browser Back / swipe-back) fires a
   popstate event that we catch here to return to the list —
   no page reload required, no fake gestures.

   On desktop (> 768 px) both panels are visible simultaneously
   and we use history.replaceState so the thread list is never
   "hidden" behind a history entry.

   ============================================================ */

/* ────────────────────────────────────────
   State
──────────────────────────────────────── */
let activeThreadId  = null;
let activeConvoId   = null;
let toastTimer      = null;

/* ────────────────────────────────────────
   Helpers
──────────────────────────────────────── */
function _isMsgMobile() {
  return window.innerWidth <= 768;
}

/* ────────────────────────────────────────
   Init
──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {

  // Initialise textarea auto-resize
  document.querySelectorAll('.msg-composer-textarea').forEach(function (ta) {
    autoResizeTextarea(ta);
  });

  // Keyboard: close modal on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeContactModal();
  });

  // Click outside modal to close
  var overlay = document.getElementById('contactModal');
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeContactModal();
    });
  }

  // ── History-based navigation initialisation ──────────────
  // Delegate to SHWNav if available, otherwise fall back to
  // the legacy behaviour (desktop default thread).
  if (typeof SHWNav !== 'undefined' && SHWNav.initMessagesHistory) {
    SHWNav.initMessagesHistory({
      openThreadFn: function(threadId, opts) {
        // Derive convoId from threadId (thread-N → convo-N)
        var convoId = threadId.replace('thread-', 'convo-');
        _activateThread(threadId, convoId, opts && opts.pushHistory === false ? false : true);
      },
      closeThreadFn: function() {
        _showList();
      },
      defaultThreadId: 'thread-1',
      isMobile: _isMsgMobile,
    });
  } else {
    // Fallback: desktop selects thread-1, mobile shows list
    if (!_isMsgMobile()) {
      _activateThread('thread-1', 'convo-1', false);
    } else {
      _showList();
    }
  }

  // Ensure the scroll position in the default active convo
  if (activeConvoId) {
    scrollConvoToBottom(activeConvoId + '-scroll');
  }
});

/* ────────────────────────────────────────
   Core: Activate a thread in the UI
   (internal — does not push history)
──────────────────────────────────────── */
function _activateThread(threadId, convoId, pushHistory) {
  // Deactivate all threads
  document.querySelectorAll('.msg-thread-card').forEach(function (card) {
    card.classList.remove('active');
  });

  // Hide all conversations
  document.querySelectorAll('.msg-convo-view').forEach(function (convo) {
    convo.style.display = 'none';
  });

  // Hide empty state
  var emptyState = document.getElementById('msgEmptyState');
  if (emptyState) emptyState.style.display = 'none';

  // Activate selected thread card
  var thread = document.getElementById(threadId);
  if (thread) {
    thread.classList.add('active');
    thread.classList.remove('unread');
    var badge = thread.querySelector('.msg-unread-badge');
    if (badge) badge.remove();
  }

  // Show selected conversation
  var convo = document.getElementById(convoId);
  if (convo) {
    convo.style.display = 'flex';
    convo.style.flexDirection = 'column';
    convo.style.flex = '1';
    convo.style.overflow = 'hidden';
    convo.style.height = '100%';
  }

  // Update state
  activeThreadId = threadId;
  activeConvoId  = convoId;

  // Scroll conversation to bottom
  scrollConvoToBottom(convoId + '-scroll');

  // ── History ────────────────────────────────────────────
  if (pushHistory && _isMsgMobile()) {
    // Push a real history entry so browser Back returns to list
    if (typeof SHWNav !== 'undefined') {
      SHWNav.pushThread(threadId);
    } else {
      history.pushState({ thread: threadId }, '', '#' + threadId);
    }
  } else if (!_isMsgMobile()) {
    // Desktop: replace state (no extra history entry)
    if (typeof SHWNav !== 'undefined') {
      SHWNav.replaceThread(threadId);
    } else {
      history.replaceState({ thread: threadId }, '', '#' + threadId);
    }
  }

  // ── Mobile panel switch ──────────────────────────────
  if (_isMsgMobile()) {
    var rightPanel = document.getElementById('msgRightPanel');
    if (rightPanel) rightPanel.classList.add('mobile-visible');
    var layout = document.querySelector('.messages-layout');
    if (layout) layout.classList.add('thread-open');

    // Show in-panel back button (mobile back arrow inside thread header)
    _showMobileThreadBackBtn();
  }
}

/* ────────────────────────────────────────
   Public: Select Thread
   Called by onclick in HTML.
   Adds a history entry on mobile.
──────────────────────────────────────── */
function selectThread(threadId, convoId) {
  _activateThread(threadId, convoId, true);
}

/* ────────────────────────────────────────
   Show thread list (mobile back)
   Called by in-panel back button AND
   by popstate handler via SHWNav
──────────────────────────────────────── */
function showThreadList() {
  _showList();
}

function _showList() {
  var rightPanel = document.getElementById('msgRightPanel');
  if (rightPanel) rightPanel.classList.remove('mobile-visible');

  var layout = document.querySelector('.messages-layout');
  if (layout) layout.classList.remove('thread-open');

  // Clear active thread highlight (keeps last-read styling though)
  // We do NOT clear activeThreadId here — user can see which was last open
}

/* ────────────────────────────────────────
   Mobile back button (inside thread header)
──────────────────────────────────────── */
function _showMobileThreadBackBtn() {
  // Each conversation header has a .msg-mobile-back button.
  // Ensure it calls showThreadList() — already wired in HTML.
  // Nothing extra to do here; wiring is in the HTML onclick.
}

/* ────────────────────────────────────────
   Scroll a conversation to bottom
──────────────────────────────────────── */
function scrollConvoToBottom(scrollId) {
  setTimeout(function () {
    var el = document.getElementById(scrollId);
    if (el) el.scrollTop = el.scrollHeight;
  }, 50);
}

/* ────────────────────────────────────────
   Thread Search / Filter
──────────────────────────────────────── */
function filterThreads(query) {
  var q = query.toLowerCase().trim();
  var threads = document.querySelectorAll('.msg-thread-card');
  threads.forEach(function (card) {
    var searchText = card.getAttribute('data-search') || '';
    var name = card.querySelector('.msg-thread-name')
      ? card.querySelector('.msg-thread-name').textContent.toLowerCase()
      : '';
    var preview = card.querySelector('.msg-thread-preview')
      ? card.querySelector('.msg-thread-preview').textContent.toLowerCase()
      : '';
    var property = card.querySelector('.msg-property-badge')
      ? card.querySelector('.msg-property-badge').textContent.toLowerCase()
      : '';
    var combined = searchText + ' ' + name + ' ' + preview + ' ' + property;
    if (q === '' || combined.includes(q)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

/* ────────────────────────────────────────
   Auto-resize Textarea
──────────────────────────────────────── */
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  var newHeight = Math.min(el.scrollHeight, 140);
  el.style.height = newHeight + 'px';
}

/* ────────────────────────────────────────
   Toggle Send Button state
──────────────────────────────────────── */
function toggleSendBtn(composerId, sendBtnId) {
  var composer = document.getElementById(composerId);
  var sendBtn  = document.getElementById(sendBtnId);
  if (!composer || !sendBtn) return;
  var input = composer.querySelector('.msg-composer-textarea');
  if (!input) return;
  sendBtn.disabled = input.value.trim() === '';
}

/* ────────────────────────────────────────
   Send Message
──────────────────────────────────────── */
function sendMessage(inputId, scrollId, sendBtnId) {
  var input   = document.getElementById(inputId);
  var scroll  = document.getElementById(scrollId);
  var sendBtn = document.getElementById(sendBtnId);
  if (!input || !scroll) return;

  var text = input.value.trim();
  if (!text) return;

  // Build client message bubble
  var now      = new Date();
  var timeStr  = formatTime(now);
  var msgGroup = document.createElement('div');
  msgGroup.className = 'msg-group from-client';
  msgGroup.innerHTML =
    '<div class="msg-row">' +
      '<div class="msg-bubble-wrap">' +
        '<div class="msg-bubble">' + escapeHtml(text) + '</div>' +
        '<div class="msg-time">' + timeStr + '</div>' +
      '</div>' +
    '</div>';

  scroll.appendChild(msgGroup);

  // Clear input and reset height
  input.value = '';
  input.style.height = 'auto';
  if (sendBtn) sendBtn.disabled = true;

  // Scroll to bottom
  scroll.scrollTop = scroll.scrollHeight;

  // Show toast
  showToast('Message sent');
}

/* ────────────────────────────────────────
   Attachment Handling (Client Portal)
──────────────────────────────────────── */
function showAttachToast() {
  // Trigger the file input for the current active composer
  var activeConvo = document.querySelector('.msg-convo-view[style*="flex"], .msg-convo-view:not([style])');
  if (activeConvo) {
    var fileInput = activeConvo.querySelector('.msg-attach-file-input');
    if (fileInput) { fileInput.click(); return; }
  }
  showToast('Use the attachment button to select files');
}

function handleClientAttach(input, composerId) {
  var files = Array.from(input.files || []);
  if (!files.length) return;
  var preview = document.getElementById(composerId + '-attach-preview');
  if (!preview) return;
  var existing = preview.dataset.files ? JSON.parse(preview.dataset.files) : [];
  var updated = existing.concat(files.map(f => ({ name: f.name, size: f.size })));
  preview.dataset.files = JSON.stringify(updated);
  preview.style.display = 'flex';
  preview.innerHTML = updated.map((f, i) => `
    <span style="display:inline-flex;align-items:center;gap:5px;background:#f0f5ff;border:1px solid #c7d8f5;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;color:#162d56;">
      📎 ${f.name}
      <button onclick="removeClientAttach('${composerId}',${i})" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:0;font-size:13px;line-height:1;">×</button>
    </span>`).join('');
  input.value = '';
  // Enable send button
  var sendBtn = document.querySelector(`#${composerId} .msg-send-btn`);
  if (sendBtn) sendBtn.disabled = false;
}

function removeClientAttach(composerId, idx) {
  var preview = document.getElementById(composerId + '-attach-preview');
  if (!preview) return;
  var files = preview.dataset.files ? JSON.parse(preview.dataset.files) : [];
  files.splice(idx, 1);
  preview.dataset.files = JSON.stringify(files);
  if (!files.length) { preview.style.display = 'none'; preview.innerHTML = ''; return; }
  preview.innerHTML = files.map((f, i) => `
    <span style="display:inline-flex;align-items:center;gap:5px;background:#f0f5ff;border:1px solid #c7d8f5;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;color:#162d56;">
      📎 ${f.name}
      <button onclick="removeClientAttach('${composerId}',${i})" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:0;font-size:13px;line-height:1;">×</button>
    </span>`).join('');
}

/* ────────────────────────────────────────
   Archive / Delete thread (Client Portal)
──────────────────────────────────────── */
var _archivedThreadIds = [];

function archiveClientThread(threadId) {
  if (!confirm('Archive this conversation? You can view it in the Archived tab.')) return;
  _archivedThreadIds.push(threadId);
  var card = document.getElementById(threadId);
  if (card) card.dataset.archived = 'true';
  // Hide if not in archived view
  if (!_showingArchived) {
    if (card) card.style.display = 'none';
    showToast('Conversation archived');
    showThreadList();
  } else {
    showToast('Conversation archived');
  }
}

function unarchiveClientThread(threadId) {
  _archivedThreadIds = _archivedThreadIds.filter(id => id !== threadId);
  var card = document.getElementById(threadId);
  if (card) { card.dataset.archived = ''; card.style.display = ''; }
  showToast('Conversation unarchived');
}

var _showingArchived = false;

function toggleArchivedView() {
  _showingArchived = !_showingArchived;
  var allCards = document.querySelectorAll('.msg-thread-card');
  var toggleBtn = document.getElementById('clientArchivedToggleBtn');
  if (_showingArchived) {
    allCards.forEach(function(c) {
      c.style.display = c.dataset.archived === 'true' ? 'flex' : 'none';
    });
    if (toggleBtn) { toggleBtn.textContent = '← Active'; toggleBtn.style.background = '#162d56'; toggleBtn.style.color = '#fff'; }
  } else {
    allCards.forEach(function(c) {
      c.style.display = c.dataset.archived === 'true' ? 'none' : 'flex';
    });
    if (toggleBtn) { toggleBtn.textContent = 'Archived'; toggleBtn.style.background = ''; toggleBtn.style.color = ''; }
  }
  showThreadList();
}

function deleteClientMessage(msgEl) {
  if (!msgEl) return;
  if (!confirm('Delete this message?')) return;
  msgEl.remove();
  showToast('Message deleted');
}

/* ────────────────────────────────────────
   Toast Notification
──────────────────────────────────────── */
function showToast(message, duration) {
  var toast = document.getElementById('msgToast');
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  toastTimer = setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(80px)';
  }, duration || 3000);
}

/* ────────────────────────────────────────
   Contact Team Modal
──────────────────────────────────────── */
function openContactModal() {
  var modal = document.getElementById('contactModal');
  if (modal) {
    modal.classList.add('open');
    setTimeout(function () {
      var firstInput = modal.querySelector('select, input, textarea');
      if (firstInput) firstInput.focus();
    }, 150);
  }
}

function closeContactModal() {
  var modal = document.getElementById('contactModal');
  if (modal) modal.classList.remove('open');
}

function submitContactModal() {
  var subject   = document.getElementById('modal-subject');
  var message   = document.getElementById('modal-message');
  var recipient = document.getElementById('modal-recipient');

  if (!message || message.value.trim() === '') {
    showToast('Please write a message before sending.');
    if (message) message.focus();
    return;
  }

  closeContactModal();

  if (subject)   subject.value = '';
  if (message)   message.value = '';
  if (recipient) recipient.selectedIndex = 0;

  showToast('Your message has been sent. We\'ll respond within 12 hours.');
}

/* ────────────────────────────────────────
   Utility: Format time as h:mm AM/PM
──────────────────────────────────────── */
function formatTime(date) {
  var h    = date.getHours();
  var m    = date.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

/* ────────────────────────────────────────
   Utility: Escape HTML to prevent XSS
──────────────────────────────────────── */
function escapeHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;')
    .replace(/\n/g, '<br>');
}
