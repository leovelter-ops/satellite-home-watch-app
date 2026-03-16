/**
 * Track visit page data wiring (backend-backed, no mock placeholders).
 */
document.addEventListener('DOMContentLoaded', async () => {
  const activeView = document.getElementById('activeVisitView');
  const emptyView = document.getElementById('noActiveVisitView');

  try {
    const activeRes = await SHW.Visits.getActiveVisit();
    const activeVisit = activeRes?.data || null;

    if (!activeVisit) {
      if (activeView) activeView.style.display = 'none';
      if (emptyView) emptyView.style.display = '';
      await fillNextScheduledVisit();
      return;
    }

    if (activeView) activeView.style.display = '';
    if (emptyView) emptyView.style.display = 'none';
    await renderActiveVisit(activeVisit);
  } catch (_) {
    if (activeView) activeView.style.display = 'none';
    if (emptyView) emptyView.style.display = '';
  }
});

async function fillNextScheduledVisit() {
  const visits = await SHW.Visits.getEnrichedVisits(6);
  const next = (visits || [])
    .filter(v => v.status === 'scheduled' && new Date(v.scheduled_start) >= new Date())
    .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start))[0];

  document.getElementById('tvNextVisitType').textContent = next ? next.visit_type_label : 'No scheduled visit';
  document.getElementById('tvNextVisitProperty').textContent = next ? next.property_name : '—';
  document.getElementById('tvNextVisitDate').textContent = next ? SHW.fmt.dateTime(next.scheduled_start) : '—';
}

async function renderActiveVisit(visit) {
  const enriched = (await SHW.Visits.getEnrichedVisits(6)).find(v => v.id === visit.id) || visit;
  const eventsRes = await SHW.Visits.getTrackingEvents(visit.id);
  const events = eventsRes?.data || [];

  document.getElementById('tvVisitType').textContent = enriched.visit_type_label || 'Visit In Progress';
  document.getElementById('tvPropertyName').textContent = enriched.property_name || '—';
  document.getElementById('tvSummaryInspector').textContent = enriched.inspector_name || '—';
  document.getElementById('tvSummaryScheduled').textContent = SHW.fmt.dateTime(enriched.scheduled_start);
  document.getElementById('tvSummaryStatus').textContent = enriched.status_label || 'In Progress';
  document.getElementById('tvSummaryDuration').textContent = enriched.duration_label || '—';

  document.getElementById('tvEtaTime').textContent = '—';
  document.getElementById('tvEtaSub').textContent = enriched.status === 'en_route' ? 'Inspector is en route' : 'On-site';

  const timeline = document.getElementById('tvTimeline');
  if (timeline) {
    if (!events.length) {
      timeline.innerHTML = '<p style="font-size:12px;color:var(--navy-400);text-align:center;padding:16px 0;">No live updates yet for this visit.</p>';
    } else {
      timeline.innerHTML = events.map(e => `
        <div class="tv-timeline-item" role="listitem" style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--navy-100);">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--navy-700);">${e.display_label || 'Status Update'}</div>
            <div style="font-size:12px;color:var(--navy-500);">${e.notes || ''}</div>
          </div>
          <div style="font-size:11px;color:var(--navy-400);white-space:nowrap;">${SHW.fmt.time(e.event_time)}</div>
        </div>
      `).join('');
    }
  }
}
