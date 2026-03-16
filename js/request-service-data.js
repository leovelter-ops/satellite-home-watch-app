/**
 * ═══════════════════════════════════════════════════════════════════
 *  SATELLITE HOME WATCH — REQUEST SERVICE PAGE CONTROLLER
 *  request-service-data.js — Wires backend to client-request-service.html
 *  v2 — deployment bundle refresh
 * ═══════════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initRequestServicePage();
});

async function initRequestServicePage() {
  try {
    const [properties, existingRequests] = await Promise.all([
      SHW.Properties.getClientProperties(),
      SHW.ServiceRequests.getClientRequests(),
    ]);

    populatePropertySelector(properties.data || []);
    renderExistingRequests(existingRequests.data || []);
    bindServiceRequestForm(properties.data || []);
    await SHWUI.updateSidebarBadges();
  } catch (err) {
    SHWUI.showToast('Unable to load service request data.', 'error');
  }
}

// ─── POPULATE PROPERTY SELECTOR ───────────────────────────────────────────────

function populatePropertySelector(properties) {
  // Find property select elements in the form
  const selectors = [
    document.getElementById('serviceProperty'),
    document.getElementById('requestProperty'),
    document.querySelector('select[name="property"]'),
    document.querySelector('select[data-field="property"]'),
  ];
  const select = selectors.find(s => s !== null);
  if (!select) return;

  // Clear existing options except placeholder
  const placeholder = select.querySelector('option[value=""], option:first-child');
  select.innerHTML = '';
  if (placeholder) select.appendChild(placeholder);
  else {
    const ph = document.createElement('option');
    ph.value = ''; ph.textContent = 'Select a property...'; ph.disabled = true; ph.selected = true;
    select.appendChild(ph);
  }

  properties.forEach(prop => {
    const opt = document.createElement('option');
    opt.value = prop.id;
    opt.textContent = `${prop.property_name} — ${prop.address_line1}, ${prop.city}, ${prop.state}`;
    opt.dataset.propertyName = prop.property_name;
    select.appendChild(opt);
  });

  // Also populate any radio-button style property selectors
  const radioGroup = document.querySelector('.property-radio-group, .property-selector-group, #propertyRadioGroup');
  if (radioGroup && properties.length > 0) {
    radioGroup.innerHTML = properties.map((prop, i) => `
      <label class="property-radio-item ${i === 0 ? 'selected' : ''}"
        style="display:flex;align-items:center;gap:10px;padding:12px 16px;border:1px solid var(--navy-200);
          border-radius:10px;cursor:pointer;transition:all .15s;margin-bottom:8px;">
        <input type="radio" name="property_id" value="${prop.id}" ${i === 0 ? 'checked' : ''}
          style="accent-color:var(--blue-600);" />
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--navy-800);">${prop.property_name}</div>
          <div style="font-size:11px;color:var(--navy-400);">${prop.address_line1}, ${prop.city}, ${prop.state}</div>
        </div>
      </label>`).join('');

    // Radio change handler
    radioGroup.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        radioGroup.querySelectorAll('.property-radio-item').forEach(el => el.classList.remove('selected'));
        radio.closest('.property-radio-item')?.classList.add('selected');
      });
    });
  }
}

// ─── EXISTING REQUESTS LIST ───────────────────────────────────────────────────

function renderExistingRequests(requests) {
  const container = document.querySelector(
    '.existing-requests, #existingRequests, .my-requests-list, [data-section="my-requests"]'
  );
  if (!container || requests.length === 0) return;

  const statusColors = {
    submitted:    { bg: '#eff6ff', color: '#2563eb', label: 'Submitted' },
    under_review: { bg: '#fffbeb', color: '#d97706', label: 'Under Review' },
    approved:     { bg: '#f0fdf4', color: '#16a34a', label: 'Approved' },
    scheduled:    { bg: '#f0fdf4', color: '#16a34a', label: 'Scheduled' },
    in_progress:  { bg: '#eff6ff', color: '#2563eb', label: 'In Progress' },
    completed:    { bg: '#f0fdf4', color: '#16a34a', label: 'Completed' },
    cancelled:    { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
  };

  container.innerHTML = `
    <div style="margin-top:24px;">
      <h3 style="font-size:14px;font-weight:700;color:var(--navy-800);margin-bottom:12px;">My Submitted Requests</h3>
      ${requests.map(r => {
        const st = statusColors[r.status] || { bg: '#f9fafb', color: '#6b7280', label: r.status };
        return `
          <div style="background:#fff;border:1px solid var(--navy-100);border-radius:12px;padding:16px 20px;
            margin-bottom:10px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;
                  background:${st.bg};color:${st.color};">${st.label}</span>
                <span style="font-size:11px;color:var(--navy-400);">
                  ${SHW.utils.snakeToTitle(r.urgency)} Priority
                </span>
              </div>
              <div style="font-size:14px;font-weight:600;color:var(--navy-900);margin-bottom:3px;">
                ${SHW.utils.snakeToTitle(r.service_type)}
              </div>
              <div style="font-size:12px;color:var(--navy-500);">
                Submitted ${SHW.fmt.date(r.created_at)}
                ${r.preferred_date ? ` · Preferred: ${SHW.fmt.date(r.preferred_date)}` : ''}
              </div>
              ${r.manager_notes ? `
                <div style="margin-top:8px;padding:8px 12px;background:var(--blue-50);border-radius:8px;
                  font-size:12px;color:var(--navy-700);">
                  <strong>Update:</strong> ${r.manager_notes}
                </div>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ─── FORM BINDING ─────────────────────────────────────────────────────────────

function bindServiceRequestForm(properties) {
  const forms = [
    document.getElementById('serviceRequestForm'),
    document.getElementById('requestServiceForm'),
    document.querySelector('form.service-request-form'),
    document.querySelector('form[data-form="service-request"]'),
  ];
  const form = forms.find(f => f !== null);

  if (!form) {
    // Try to bind submit button directly
    const submitBtn = document.querySelector(
      '#submitRequestBtn, .submit-request-btn, button[data-action="submit-request"]'
    );
    if (submitBtn) {
      submitBtn.addEventListener('click', handleFormSubmit);
    }
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(e, form, properties);
  });

  // Also find standalone submit buttons that might be outside the form
  const submitBtns = document.querySelectorAll(
    '[data-action="submit-request"], .request-submit-btn'
  );
  submitBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleFormSubmit(e, form, properties);
    });
  });
}

async function handleFormSubmit(e, form, properties) {
  // Gather form data from various possible field names
  const getField = (...ids) => {
    for (const id of ids) {
      const el = form
        ? (form.querySelector(`#${id}, [name="${id}"], [data-field="${id}"]`) ||
           document.getElementById(id))
        : document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el) return el.value;
    }
    return '';
  };

  const getRadioValue = (name) => {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : '';
  };

  const propertyId   = getField('serviceProperty', 'requestProperty', 'property_id') ||
                       getRadioValue('property_id');
  const serviceType  = getField('serviceType', 'service_type', 'requestType') || 'routine_inspection';
  const urgency      = getField('urgencyLevel', 'urgency', 'requestUrgency') || 'standard';
  const timing       = getField('preferredTiming', 'preferred_timing', 'timing') || 'flexible';
  const details      = getField('requestNotes', 'details', 'notes', 'requestDetails') || '';
  const preferredDate = getField('preferredDate', 'preferred_date', 'requestDate') || null;

  if (!propertyId) {
    SHWUI.showToast('Please select a property.', 'warning');
    return;
  }
  if (!serviceType) {
    SHWUI.showToast('Please select a service type.', 'warning');
    return;
  }

  // Disable submit button
  const submitBtn = form
    ? (form.querySelector('[type="submit"], .submit-btn, .request-submit-btn') ||
       document.querySelector('.request-submit-btn'))
    : document.querySelector('.request-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  try {
    const requestData = {
      property_id:      propertyId,
      service_type:     serviceType,
      urgency:          urgency,
      preferred_timing: timing,
      details:          details,
      preferred_date:   preferredDate || null,
    };

    const { data, error } = await SHW.ServiceRequests.submitRequest(requestData);

    if (error) {
      SHWUI.showToast('Failed to submit request. Please try again.', 'error');
      return;
    }

    // Show success state
    showSubmissionSuccess(data);

    // Reset form
    if (form) form.reset();

    // Reload existing requests
    const { data: updated } = await SHW.ServiceRequests.getClientRequests();
    renderExistingRequests(updated || []);

    SHWUI.showToast('Service request submitted successfully!', 'success');

  } catch (err) {
    SHWUI.showToast('An error occurred. Please try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Request';
    }
  }
}

// ─── SUCCESS STATE ────────────────────────────────────────────────────────────

function showSubmissionSuccess(request) {
  // Look for a success panel or confirmation section in the existing UI
  const successPanel = document.querySelector(
    '.request-success, .submission-success, #requestSuccess, [data-section="success"]'
  );

  if (successPanel) {
    successPanel.style.display = '';
    successPanel.innerHTML = `
      <div style="text-align:center;padding:32px;">
        <div style="width:56px;height:56px;border-radius:50%;background:#f0fdf4;
          display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style="font-size:18px;font-weight:700;color:var(--navy-900);margin-bottom:8px;">
          Request Submitted Successfully
        </div>
        <div style="font-size:13px;color:var(--navy-500);line-height:1.6;">
          Your ${SHW.utils.snakeToTitle(request.service_type)} request has been submitted.<br>
          Our team will review and contact you shortly.
        </div>
        <div style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <a href="client-visits.html"
            style="padding:10px 20px;border-radius:8px;background:var(--navy-900);
              color:#fff;font-size:13px;font-weight:600;text-decoration:none;">
            View My Visits
          </a>
          <button onclick="this.closest('[data-section=success],[class*=success]').style.display='none'"
            style="padding:10px 20px;border-radius:8px;background:var(--navy-100);
              color:var(--navy-700);font-size:13px;font-weight:600;border:none;cursor:pointer;">
            Submit Another
          </button>
        </div>
      </div>`;
    return;
  }

  // Inject a success notification overlay
  const existing = document.getElementById('requestSuccessOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'requestSuccessOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:1000;background:rgba(10,25,50,.5);
    display:flex;align-items:center;justify-content:center;padding:20px;`;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:32px;text-align:center;
      box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="width:56px;height:56px;border-radius:50%;background:#f0fdf4;
        display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div style="font-size:20px;font-weight:700;color:var(--navy-900);margin-bottom:10px;">
        Request Submitted!
      </div>
      <div style="font-size:13px;color:var(--navy-500);line-height:1.6;margin-bottom:24px;">
        Your <strong>${SHW.utils.snakeToTitle(request.service_type)}</strong> request has been received.
        Our team will review it and be in touch within 24 hours.
      </div>
      <div style="font-size:11px;color:var(--navy-400);margin-bottom:24px;">
        Request ID: ${request.id}
      </div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <a href="client-visits.html"
          style="padding:10px 20px;border-radius:8px;background:var(--navy-900);
            color:#fff;font-size:13px;font-weight:600;text-decoration:none;">
          View Visits
        </a>
        <button onclick="document.getElementById('requestSuccessOverlay').remove()"
          style="padding:10px 20px;border-radius:8px;background:var(--navy-100);
            color:var(--navy-700);font-size:13px;font-weight:600;border:none;cursor:pointer;">
          Close
        </button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}
