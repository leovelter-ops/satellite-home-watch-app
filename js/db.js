/**
 * ═══════════════════════════════════════════════════════════════════
 *  SATELLITE HOME WATCH — BACKEND DATA SERVICE LAYER
 *  db.js — Core API abstraction for all client portal pages
 *  v2 — deployment bundle refresh
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Architecture:
 *  - All pages call this service layer — never raw fetch() directly
 *  - Handles all table API communication with proper error handling
 *  - Provides join/enrichment helpers that simulate relational queries
 *  - Role-based data filtering enforced at service layer
 *  - Consistent data normalization before UI consumption
 *
 *  Session Context:
 *  - Current session user is defined in SHW_SESSION at page load
 *  - All queries automatically scope to the current client's data
 *
 *  Table API Base:  tables/{tableName}
 *  RESTful Methods: GET / POST / PUT / PATCH / DELETE
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── SESSION CONTEXT ──────────────────────────────────────────────────────────
// Session context is injected at runtime by the backend after authentication.
// In production this comes from a verified JWT / server-side session.
// The frontend reads it from window.SHW_SESSION_DATA if available.
const SHW_SESSION = window.SHW_SESSION_DATA || {
  userId:   '',
  clientId: '',
  role:     'client',
  name:     '',
  initials: '',
};

// ─── API BASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://kwkdhlrtfghuokqwtoqt.supabase.co';
const SUPABASE_KEY = 'sb_publishable__3RmKaLuVGp7jn9FjcjRiw_Y-1oQv63';

const API_BASE = `${SUPABASE_URL}/rest/v1`;

// ─── SUPABASE CONFIG (browser-safe) ──────────────────────────────────────────
// Populate these at deploy/runtime (for example, via an injected script block).
const SHW_SUPABASE = window.SHW_SUPABASE || {
  url: SUPABASE_URL,
  anonKey: SUPABASE_KEY,
};
window.SHW_SUPABASE = SHW_SUPABASE;

// ─── PERMISSION RULES ─────────────────────────────────────────────────────────
const PERMISSIONS = {
  client:    ['read_own'],
  inspector: ['read_assigned', 'write_visits', 'write_reports', 'write_alerts'],
  manager:   ['read_all', 'write_all'],
  corporate: ['read_all', 'write_all', 'admin'],
};

// ─── UTILITY HELPERS ──────────────────────────────────────────────────────────

/**
 * Generic fetch wrapper with error handling.
 * Returns { data, error } format consistently.
 */
async function apiRequest(method, path, body = null) {
  try {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}/${path}`, opts);
    if (!res.ok) {
      const err = await res.text();
      return { data: null, error: `HTTP ${res.status}: ${err}` };
    }
    if (res.status === 204) return { data: null, error: null };
    const data = await res.json();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

/** GET all records from a table (with optional query string params) */
async function dbGetAll(table, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `${table}?${qs}` : table;
  return apiRequest('GET', path);
}

/** GET single record by ID */
async function dbGetOne(table, id) {
  return apiRequest('GET', `${table}/${id}`);
}

/** POST — create new record */
async function dbCreate(table, data) {
  return apiRequest('POST', table, data);
}

/** PATCH — partial update */
async function dbUpdate(table, id, data) {
  return apiRequest('PATCH', `${table}/${id}`, data);
}

/** DELETE — remove record */
async function dbDelete(table, id) {
  return apiRequest('DELETE', `${table}/${id}`);
}

/** Fetch all pages of a table up to maxLimit records */
async function dbGetAllPages(table, params = {}, maxLimit = 500) {
  const { data, error } = await dbGetAll(table, { ...params, limit: maxLimit, page: 1 });
  if (error) return { data: [], error };
  return { data: data.data || [], error: null };
}

// ─── LOOKUP MAPS (in-memory caches for join enrichment) ──────────────────────
let _cache = {};

async function getCached(table) {
  if (_cache[table]) return _cache[table];
  const { data } = await dbGetAllPages(table);
  _cache[table] = data;
  return data;
}

function clearCache() { _cache = {}; }


function _mkResponseLike(ok, status, payload) {
  return {
    ok,
    status,
    async json() { return payload; },
    async text() { return typeof payload === 'string' ? payload : JSON.stringify(payload); },
  };
}

async function shwTableFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const raw = String(url || '');
  const path = raw.startsWith('tables/') ? raw.slice(7) : raw;
  const [pathOnly, queryString = ''] = path.split('?');
  const parts = pathOnly.split('/').filter(Boolean);
  const table = parts[0];
  const id = parts[1] || null;
  if (!table) return _mkResponseLike(false, 400, { error: 'Missing table name' });

  let body = null;
  if (typeof options.body === 'string' && options.body) {
    try { body = JSON.parse(options.body); } catch (_) { body = null; }
  } else if (options.body && typeof options.body === 'object') {
    body = options.body;
  }

  try {
    if (method === 'GET' && id) {
      const { data, error } = await dbGetOne(table, id);
      return error ? _mkResponseLike(false, 500, { error }) : _mkResponseLike(true, 200, data);
    }
    if (method === 'GET') {
      const params = Object.fromEntries(new URLSearchParams(queryString));
      const { data, error } = await dbGetAll(table, params);
      return error ? _mkResponseLike(false, 500, { error }) : _mkResponseLike(true, 200, data);
    }
    if (method === 'POST') {
      const { data, error } = await dbCreate(table, body || {});
      return error ? _mkResponseLike(false, 500, { error }) : _mkResponseLike(true, 200, data);
    }
    if ((method === 'PATCH' || method === 'PUT') && id) {
      const { data, error } = await dbUpdate(table, id, body || {});
      return error ? _mkResponseLike(false, 500, { error }) : _mkResponseLike(true, 200, data);
    }
    if (method === 'DELETE' && id) {
      const { error } = await dbDelete(table, id);
      return error ? _mkResponseLike(false, 500, { error }) : _mkResponseLike(true, 204, null);
    }
    return _mkResponseLike(false, 405, { error: 'Unsupported method/path' });
  } catch (e) {
    return _mkResponseLike(false, 500, { error: e.message });
  }
}
window.shwTableFetch = shwTableFetch;

/** Build a lookup map from array by ID field */
function buildLookup(arr, key = 'id') {
  return arr.reduce((acc, item) => { acc[item[key]] = item; return acc; }, {});
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

/** Format ISO datetime to display string: "Mar 11, 2026" */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format ISO datetime to display string: "Mar 11, 2026 · 9:15 AM" */
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Format ISO datetime to short time: "9:15 AM" */
function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Days since a date string */
function daysSince(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** File size bytes to human readable */
function fmtFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/** Capitalize first letter */
function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Convert snake_case to Title Case */
function snakeToTitle(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Get inspector display name from employee record  */
function getInspectorShortName(user) {
  if (!user) return 'Unassigned';
  const parts = user.full_name.split(' ');
  if (parts.length >= 2) return parts[0][0] + '. ' + parts[parts.length - 1];
  return user.full_name;
}

// ─── PERMISSION CHECKS ────────────────────────────────────────────────────────

/** Enforce client can only see their own client_id data */
function assertClientScope(record, clientId = SHW_SESSION.clientId) {
  if (!record) return false;
  if (record.client_id && record.client_id !== clientId) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════════

const PropertiesService = {

  /** Get all properties for current client */
  async getClientProperties() {
    const { data, error } = await dbGetAllPages('properties');
    if (error) return { data: [], error };
    // Filter by client_id (role-based scope)
    const filtered = data.filter(p => p.client_id === SHW_SESSION.clientId);
    return { data: filtered, error: null };
  },

  /** Get single property by ID (with access check) */
  async getProperty(propertyId) {
    const { data, error } = await dbGetOne('properties', propertyId);
    if (error) return { data: null, error };
    if (!assertClientScope(data)) return { data: null, error: 'Access denied' };
    return { data, error: null };
  },

  /** Get enriched property cards with last visit, next visit, alert count */
  async getEnrichedProperties() {
    const [propsRes, visitsRes, alertsRes, plansRes] = await Promise.all([
      this.getClientProperties(),
      VisitsService.getClientVisits(),
      AlertsService.getClientAlerts(),
      dbGetAllPages('property_service_plans'),
    ]);

    const props    = propsRes.data   || [];
    const visits   = visitsRes.data  || [];
    const alerts   = alertsRes.data  || [];
    const plans    = (plansRes.data  || []).filter(p => p.client_id === SHW_SESSION.clientId);

    return props.map(prop => {
      const propVisits = visits.filter(v => v.property_id === prop.id);
      const propAlerts = alerts.filter(a => a.property_id === prop.id && a.status !== 'resolved' && a.status !== 'closed');

      const completed = propVisits
        .filter(v => v.status === 'completed')
        .sort((a, b) => new Date(b.actual_end) - new Date(a.actual_end));

      const upcoming = propVisits
        .filter(v => ['scheduled', 'en_route', 'arrived', 'in_progress'].includes(v.status))
        .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));

      const plan = plans.find(p => p.property_id === prop.id);

      return {
        ...prop,
        activeAlertCount:  propAlerts.length,
        lastVisit:         completed[0] || null,
        nextVisit:         upcoming[0]  || null,
        recentVisits:      completed.slice(0, 5),
        plan:              plan || null,
        addressFull:       [prop.address_line1, prop.city, prop.state, prop.zip].filter(Boolean).join(', '),
      };
    });
  },

  /** Update property record */
  async updateProperty(propertyId, updates) {
    return dbUpdate('properties', propertyId, { ...updates, updated_at: new Date().toISOString() });
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: VISITS
// ═══════════════════════════════════════════════════════════════════════════════

const VisitsService = {

  /** Get all visits for properties owned by current client */
  async getClientVisits(propertyId = null) {
    const { data, error } = await dbGetAllPages('visits');
    if (error) return { data: [], error };

    // Get client property IDs first
    const { data: props } = await PropertiesService.getClientProperties();
    const propIds = new Set((props || []).map(p => p.id));

    let filtered = data.filter(v => propIds.has(v.property_id));
    if (propertyId) filtered = filtered.filter(v => v.property_id === propertyId);

    // Sort by scheduled_start desc
    filtered.sort((a, b) => new Date(b.scheduled_start) - new Date(a.scheduled_start));
    return { data: filtered, error: null };
  },

  /** Get recent visits (last N months) */
  async getRecentVisits(months = 3, propertyId = null) {
    const { data, error } = await this.getClientVisits(propertyId);
    if (error) return { data: [], error };
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const filtered = data.filter(v => new Date(v.scheduled_start) >= cutoff);
    return { data: filtered, error: null };
  },

  /** Get single visit (with access check) */
  async getVisit(visitId) {
    const { data, error } = await dbGetOne('visits', visitId);
    if (error) return { data: null, error };
    // Verify property belongs to client
    const { data: prop } = await PropertiesService.getProperty(data.property_id);
    if (!prop) return { data: null, error: 'Access denied' };
    return { data, error: null };
  },

  /** Get active in-progress visit for current client */
  async getActiveVisit() {
    const { data, error } = await this.getClientVisits();
    if (error) return { data: null, error };
    const active = data.find(v => ['en_route', 'arrived', 'in_progress'].includes(v.status));
    return { data: active || null, error: null };
  },

  /** Get enriched visits with inspector name and property name */
  async getEnrichedVisits(months = 3, propertyId = null) {
    const [visitsRes, propsAll, usersAll, empsAll] = await Promise.all([
      this.getRecentVisits(months, propertyId),
      getCached('properties'),
      getCached('users'),
      getCached('employees'),
    ]);

    const visits = visitsRes.data || [];
    const propMap = buildLookup(propsAll);
    const empMap  = buildLookup(empsAll);
    const userMap = buildLookup(usersAll);

    return visits.map(v => {
      const prop     = propMap[v.property_id]       || {};
      const emp      = empMap[v.assigned_employee_id] || {};
      const empUser  = userMap[emp.user_id]          || {};
      return {
        ...v,
        property_name:     prop.property_name   || '—',
        property_address:  prop.address_line1   || '—',
        inspector_name:    empUser.full_name     || 'Unassigned',
        inspector_short:   getInspectorShortName(empUser),
        visit_type_label:  snakeToTitle(v.visit_type),
        status_label:      snakeToTitle(v.status),
        scheduled_date:    fmtDate(v.scheduled_start),
        scheduled_time:    fmtTime(v.scheduled_start),
        completion_time:   fmtDateTime(v.actual_end),
        duration_label:    v.actual_start && v.actual_end
          ? Math.round((new Date(v.actual_end) - new Date(v.actual_start)) / 60000) + ' min'
          : '—',
      };
    });
  },

  /** Get tracking events for a visit */
  async getTrackingEvents(visitId) {
    const { data, error } = await dbGetAllPages('visit_tracking_events');
    if (error) return { data: [], error };
    const events = data
      .filter(e => e.visit_id === visitId && e.client_visible !== false)
      .sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
    return { data: events, error: null };
  },

  /** Create tracking event (inspector workflow) */
  async createTrackingEvent(visitId, eventData) {
    return dbCreate('visit_tracking_events', {
      ...eventData,
      visit_id:      visitId,
      employee_id:   SHW_SESSION.userId,
      client_visible: true,
      event_time:    new Date().toISOString(),
    });
  },

  /** Update visit status */
  async updateVisitStatus(visitId, status, extraFields = {}) {
    const statusFields = {
      en_route:    { updated_at: new Date().toISOString() },
      arrived:     { actual_arrival: new Date().toISOString(), updated_at: new Date().toISOString() },
      in_progress: { actual_start:   new Date().toISOString(), updated_at: new Date().toISOString() },
      completed:   { actual_end:     new Date().toISOString(), updated_at: new Date().toISOString() },
    };
    const fields = statusFields[status] || { updated_at: new Date().toISOString() };
    return dbUpdate('visits', visitId, { status, ...fields, ...extraFields });
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

const AlertsService = {

  /** Get single alert (with access check) */
  async getAlert(alertId) {
    const { data, error } = await dbGetOne('alerts', alertId);
    if (error) return { data: null, error };
    if (!data) return { data: null, error: 'Not found' };

    const { data: prop } = await PropertiesService.getProperty(data.property_id);
    if (!prop) return { data: null, error: 'Access denied' };

    return { data, error: null };
  },

  /** Get all alerts for current client's properties */
  async getClientAlerts(propertyId = null) {
    const [alertsRes, propsRes] = await Promise.all([
      dbGetAllPages('alerts'),
      PropertiesService.getClientProperties(),
    ]);
    if (alertsRes.error) return { data: [], error: alertsRes.error };

    const propIds = new Set((propsRes.data || []).map(p => p.id));
    let filtered = (alertsRes.data || []).filter(a => propIds.has(a.property_id));
    if (propertyId) filtered = filtered.filter(a => a.property_id === propertyId);

    filtered.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
    return { data: filtered, error: null };
  },

  /** Get open/in-progress alerts only */
  async getActiveAlerts(propertyId = null) {
    const { data, error } = await this.getClientAlerts(propertyId);
    if (error) return { data: [], error };
    const active = data.filter(a => ['open', 'in_progress', 'pending_client_decision', 'scheduled_for_repair'].includes(a.status));
    return { data: active, error: null };
  },

  /** Get enriched alerts with property, inspector, visit info */
  async getEnrichedAlerts(propertyId = null) {
    const [alertsRes, propsAll, empsAll, usersAll, visitsAll] = await Promise.all([
      this.getClientAlerts(propertyId),
      getCached('properties'),
      getCached('employees'),
      getCached('users'),
      getCached('visits'),
    ]);

    const alerts   = alertsRes.data || [];
    const propMap  = buildLookup(propsAll);
    const empMap   = buildLookup(empsAll);
    const userMap  = buildLookup(usersAll);
    const visitMap = buildLookup(visitsAll);

    return alerts.map(a => {
      const prop    = propMap[a.property_id]              || {};
      const emp     = empMap[a.created_by_employee_id]    || {};
      const empUser = userMap[emp.user_id]                || {};
      const visit   = visitMap[a.related_visit_id]        || {};
      const age     = daysSince(a.date_created);

      return {
        ...a,
        property_name:     prop.property_name     || '—',
        property_address:  prop.address_line1     || '—',
        inspector_name:    empUser.full_name       || '—',
        inspector_short:   getInspectorShortName(empUser),
        related_visit_type: visit.visit_type ? snakeToTitle(visit.visit_type) : '—',
        severity_label:    capitalize(a.severity),
        status_label:      snakeToTitle(a.status),
        category_label:    snakeToTitle(a.category),
        date_label:        fmtDate(a.date_created),
        age_label:         age === null ? '—' : age === 0 ? 'Today' : age === 1 ? '1 day' : `${age} days`,
      };
    });
  },

  /** Get timeline events for an alert */
  async getAlertTimeline(alertId) {
    const { data, error } = await dbGetAllPages('alert_timeline_events');
    if (error) return { data: [], error };
    const events = data
      .filter(e => e.alert_id === alertId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return { data: events, error: null };
  },

  /** Create new alert (inspector workflow) */
  async createAlert(alertData) {
    const now = new Date().toISOString();
    return dbCreate('alerts', {
      ...alertData,
      created_at:  now,
      updated_at:  now,
      date_created: now,
      status:      alertData.status || 'open',
      client_decision: 'pending',
    });
  },

  /** Update alert */
  async updateAlert(alertId, updates) {
    return dbUpdate('alerts', alertId, { ...updates, updated_at: new Date().toISOString() });
  },

  /** Add timeline event to alert */
  async addTimelineEvent(alertId, eventData) {
    return dbCreate('alert_timeline_events', {
      ...eventData,
      alert_id:           alertId,
      created_by_user_id: SHW_SESSION.userId,
      created_at:         new Date().toISOString(),
    });
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

const ReportsService = {

  /** Get all reports for current client's properties */
  async getClientReports(propertyId = null) {
    const [reportsRes, propsRes] = await Promise.all([
      dbGetAllPages('visit_reports'),
      PropertiesService.getClientProperties(),
    ]);
    if (reportsRes.error) return { data: [], error: reportsRes.error };

    const propIds = new Set((propsRes.data || []).map(p => p.id));
    let filtered = (reportsRes.data || []).filter(r =>
      propIds.has(r.property_id) && r.report_status === 'published'
    );
    if (propertyId) filtered = filtered.filter(r => r.property_id === propertyId);
    filtered.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    return { data: filtered, error: null };
  },

  /** Get recent reports (last N months) */
  async getRecentReports(months = 3, propertyId = null) {
    const { data, error } = await this.getClientReports(propertyId);
    if (error) return { data: [], error };
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const filtered = data.filter(r => new Date(r.published_at) >= cutoff);
    return { data: filtered, error: null };
  },

  /** Get enriched reports with property, inspector, visit info */
  async getEnrichedReports(months = 3, propertyId = null) {
    const [reportsRes, propsAll, empsAll, usersAll, visitsAll] = await Promise.all([
      this.getRecentReports(months, propertyId),
      getCached('properties'),
      getCached('employees'),
      getCached('users'),
      getCached('visits'),
    ]);

    const reports  = reportsRes.data || [];
    const propMap  = buildLookup(propsAll);
    const empMap   = buildLookup(empsAll);
    const userMap  = buildLookup(usersAll);
    const visitMap = buildLookup(visitsAll);

    return reports.map(r => {
      const prop    = propMap[r.property_id]    || {};
      const emp     = empMap[r.employee_id]     || {};
      const empUser = userMap[emp.user_id]      || {};
      const visit   = visitMap[r.visit_id]      || {};

      return {
        ...r,
        property_name:     prop.property_name   || '—',
        property_address:  [prop.address_line1, prop.city, prop.state].filter(Boolean).join(', '),
        inspector_name:    empUser.full_name     || '—',
        inspector_short:   getInspectorShortName(empUser),
        visit_type_label:  visit.visit_type ? snakeToTitle(visit.visit_type) : '—',
        date_label:        fmtDate(r.published_at),
        overall_label:     snakeToTitle(r.overall_result),
      };
    });
  },

  /** Get photos for a report */
  async getReportPhotos(reportId) {
    const { data, error } = await dbGetAllPages('visit_report_photos');
    if (error) return { data: [], error };
    const photos = data
      .filter(p => p.report_id === reportId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return { data: photos, error: null };
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════════

const DocumentsService = {

  /** Get all documents for current client */
  async getClientDocuments(propertyId = null) {
    const [docsRes, readStatusRes] = await Promise.all([
      dbGetAllPages('documents'),
      dbGetAllPages('document_read_status'),
    ]);
    if (docsRes.error) return { data: [], error: docsRes.error };

    let filtered = (docsRes.data || []).filter(d => d.client_id === SHW_SESSION.clientId);
    if (propertyId) filtered = filtered.filter(d => d.property_id === propertyId || !d.property_id);

    const readMap = buildLookup(
      (readStatusRes.data || []).filter(r => r.user_id === SHW_SESSION.userId),
      'document_id'
    );

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return {
      data: filtered.map(d => ({
        ...d,
        read_status: readMap[d.id]?.status || 'unread',
        read_at:     readMap[d.id]?.read_at || null,
      })),
      error: null,
    };
  },

  /** Get recent documents (last N months) */
  async getRecentDocuments(months = 3, propertyId = null) {
    const { data, error } = await this.getClientDocuments(propertyId);
    if (error) return { data: [], error };
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const filtered = data.filter(d => new Date(d.created_at) >= cutoff);
    return { data: filtered, error: null };
  },

  /** Get enriched documents with property name, uploader name, read status */
  async getEnrichedDocuments(months = 3, propertyId = null) {
    const [docsRes, propsAll, usersAll] = await Promise.all([
      this.getRecentDocuments(months, propertyId),
      getCached('properties'),
      getCached('users'),
    ]);

    const docs     = docsRes.data || [];
    const propMap  = buildLookup(propsAll);
    const userMap  = buildLookup(usersAll);

    return docs.map(d => {
      const prop     = propMap[d.property_id]       || {};
      const uploader = userMap[d.uploaded_by_user_id] || {};

      return {
        ...d,
        property_name:    prop.property_name   || 'All Properties',
        property_address: prop.address_line1   || '',
        owner_name:       prop.owner_name      || '—',
        uploader_name:    uploader.full_name   || '—',
        type_label:       snakeToTitle(d.document_type),
        date_label:       fmtDate(d.created_at),
        file_size_label:  fmtFileSize(d.file_size_bytes),
      };
    });
  },

  /** Mark document as read */
  async markRead(documentId) {
    const { data } = await dbGetAllPages('document_read_status');
    const existing = (data || []).find(
      r => r.document_id === documentId && r.user_id === SHW_SESSION.userId
    );
    if (existing && existing.status === 'read') return { data: existing, error: null };
    if (existing) {
      return dbUpdate('document_read_status', existing.id, {
        status:  'read',
        read_at: new Date().toISOString(),
      });
    }
    return dbCreate('document_read_status', {
      document_id: documentId,
      user_id:     SHW_SESSION.userId,
      status:      'read',
      read_at:     new Date().toISOString(),
    });
  },

  /** Count unread documents for current user */
  async getUnreadCount() {
    const { data, error } = await this.getClientDocuments();
    if (error) return 0;
    return data.filter(d => d.read_status === 'unread').length;
  },

  /** Upload document (manager/admin workflow) */
  async uploadDocument(docData) {
    const now = new Date().toISOString();
    const { data: newDoc, error } = await dbCreate('documents', {
      ...docData,
      client_id:          docData.client_id || SHW_SESSION.clientId,
      uploaded_by_user_id: SHW_SESSION.userId,
      created_at:         now,
      updated_at:         now,
    });
    if (error || !newDoc) return { data: null, error };
    // Create unread status for client
    await dbCreate('document_read_status', {
      document_id: newDoc.id,
      user_id:     SHW_SESSION.userId,
      status:      'unread',
      read_at:     null,
    });
    return { data: newDoc, error: null };
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

const MessagesService = {

  /** Get all message threads for current client */
  async getClientThreads() {
    const [threadsRes, participantsRes] = await Promise.all([
      dbGetAllPages('message_threads'),
      dbGetAllPages('thread_participants'),
    ]);
    if (threadsRes.error) return { data: [], error: threadsRes.error };

    const myParticipations = (participantsRes.data || []).filter(
      p => p.user_id === SHW_SESSION.userId
    );
    const myThreadIds = new Set(myParticipations.map(p => p.thread_id));
    const partByThread = myParticipations.reduce((acc, p) => {
      acc[p.thread_id] = p; return acc;
    }, {});

    const threads = (threadsRes.data || [])
      .filter(t => myThreadIds.has(t.id) && !t.is_archived)
      .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

    return {
      data: threads.map(t => ({
        ...t,
        participation: partByThread[t.id] || null,
        has_unread:    partByThread[t.id]
          ? new Date(t.last_message_at) > new Date(partByThread[t.id].last_read_at || 0)
          : true,
      })),
      error: null,
    };
  },

  /** Get enriched threads with property name and unread status */
  async getEnrichedThreads() {
    const [threadsRes, propsAll, usersAll] = await Promise.all([
      this.getClientThreads(),
      getCached('properties'),
      getCached('users'),
    ]);

    const threads  = threadsRes.data || [];
    const propMap  = buildLookup(propsAll);
    const userMap  = buildLookup(usersAll);

    return threads.map(t => {
      const prop    = propMap[t.property_id]        || {};
      const creator = userMap[t.created_by_user_id] || {};
      return {
        ...t,
        property_name: prop.property_name || 'General',
        created_by_name: creator.full_name || '—',
        type_label:    snakeToTitle(t.thread_type),
        date_label:    fmtDate(t.last_message_at),
        time_label:    fmtTime(t.last_message_at),
      };
    });
  },

  /** Get all messages in a thread */
  async getThreadMessages(threadId) {
    const { data, error } = await dbGetAllPages('messages');
    if (error) return { data: [], error };
    const msgs = (data || [])
      .filter(m => m.thread_id === threadId && !m.is_deleted)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return { data: msgs, error: null };
  },

  /** Get enriched messages with sender info */
  async getEnrichedMessages(threadId) {
    const [msgsRes, usersAll, attachmentsRes] = await Promise.all([
      this.getThreadMessages(threadId),
      getCached('users'),
      dbGetAllPages('message_attachments'),
    ]);

    const messages   = msgsRes.data || [];
    const userMap    = buildLookup(usersAll);
    const attachMap  = {};
    (attachmentsRes.data || []).forEach(a => {
      if (!attachMap[a.message_id]) attachMap[a.message_id] = [];
      attachMap[a.message_id].push(a);
    });

    return messages.map(m => {
      const sender = userMap[m.sender_user_id] || {};
      return {
        ...m,
        sender_name:     sender.full_name    || 'System',
        sender_initials: sender.avatar_initials || '??',
        sender_role:     sender.role         || 'system',
        is_mine:         m.sender_user_id === SHW_SESSION.userId,
        time_label:      fmtDateTime(m.created_at),
        attachments:     attachMap[m.id]     || [],
      };
    });
  },

  /** Send a message */
  async sendMessage(threadId, body, messageType = 'text') {
    const now = new Date().toISOString();
    const { data: msg, error } = await dbCreate('messages', {
      thread_id:      threadId,
      sender_user_id: SHW_SESSION.userId,
      body,
      message_type:   messageType,
      is_deleted:     false,
      created_at:     now,
      updated_at:     now,
    });
    if (error) return { data: null, error };
    // Update thread's last_message fields
    await dbUpdate('message_threads', threadId, {
      last_message_at:      now,
      last_message_preview: body.substring(0, 120),
      updated_at:           now,
    });
    return { data: msg, error: null };
  },

  /** Mark thread as read for current user */
  async markThreadRead(threadId) {
    const { data } = await dbGetAllPages('thread_participants');
    const part = (data || []).find(
      p => p.thread_id === threadId && p.user_id === SHW_SESSION.userId
    );
    if (part) {
      return dbUpdate('thread_participants', part.id, {
        last_read_at: new Date().toISOString(),
      });
    }
    return { data: null, error: 'Participant record not found' };
  },

  /** Get unread thread count */
  async getUnreadThreadCount() {
    const { data, error } = await this.getClientThreads();
    if (error) return 0;
    return (data || []).filter(t => t.has_unread).length;
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: SERVICE REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

const ServiceRequestsService = {

  /** Get all service requests for current client */
  async getClientRequests(propertyId = null) {
    const { data, error } = await dbGetAllPages('service_requests');
    if (error) return { data: [], error };
    let filtered = (data || []).filter(r => r.client_id === SHW_SESSION.clientId);
    if (propertyId) filtered = filtered.filter(r => r.property_id === propertyId);
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { data: filtered, error: null };
  },

  /** Submit new service request */
  async submitRequest(formData) {
    const now = new Date().toISOString();
    const { data: req, error } = await dbCreate('service_requests', {
      ...formData,
      client_id:         SHW_SESSION.clientId,
      created_by_user_id: SHW_SESSION.userId,
      status:            'submitted',
      created_at:        now,
      updated_at:        now,
    });
    if (error) return { data: null, error };

    // Create activity feed event
    await dbCreate('activity_feed_events', {
      client_id:          SHW_SESSION.clientId,
      property_id:        formData.property_id || null,
      related_entity_type: 'service_request',
      related_entity_id:  req.id,
      event_type:         'service_request_submitted',
      title:              'Service Request Submitted',
      description:        `${snakeToTitle(formData.service_type)} request submitted`,
      icon_type:          'wrench',
      created_by_user_id: SHW_SESSION.userId,
      created_at:         now,
    });

    return { data: req, error: null };
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const NotificationsService = {

  /** Get notifications for current user */
  async getUserNotifications(limit = 20) {
    const { data, error } = await dbGetAllPages('notifications');
    if (error) return { data: [], error };
    const userNotifs = (data || [])
      .filter(n => n.user_id === SHW_SESSION.userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
    return { data: userNotifs, error: null };
  },

  /** Get unread notification count */
  async getUnreadCount() {
    const { data, error } = await this.getUserNotifications(100);
    if (error) return 0;
    return (data || []).filter(n => n.read_status === 'unread').length;
  },

  /** Mark notification as read */
  async markRead(notificationId) {
    return dbUpdate('notifications', notificationId, { read_status: 'read' });
  },

  /** Mark all as read */
  async markAllRead() {
    const { data } = await this.getUserNotifications(100);
    const unread = (data || []).filter(n => n.read_status === 'unread');
    await Promise.all(unread.map(n => this.markRead(n.id)));
    return { count: unread.length };
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: ACTIVITY FEED
// ═══════════════════════════════════════════════════════════════════════════════

const ActivityFeedService = {

  /** Get activity feed events for current client */
  async getClientActivity(limit = 15, propertyId = null) {
    const { data, error } = await dbGetAllPages('activity_feed_events');
    if (error) return { data: [], error };

    let filtered = (data || []).filter(e => e.client_id === SHW_SESSION.clientId);
    if (propertyId) filtered = filtered.filter(e => e.property_id === propertyId);
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      data: filtered.slice(0, limit).map(e => ({
        ...e,
        date_label: fmtDate(e.created_at),
        time_label: fmtTime(e.created_at),
      })),
      error: null,
    };
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

const DashboardService = {

  /**
   * Load the complete dashboard data set in one optimized parallel call.
   * Returns all data needed to render the client dashboard.
   */
  async loadDashboard() {
    const [
      properties,
      activeAlerts,
      recentVisits,
      recentReports,
      recentDocs,
      activityFeed,
      activeVisit,
      notifications,
      unreadMessages,
    ] = await Promise.all([
      PropertiesService.getEnrichedProperties(),
      AlertsService.getActiveAlerts(),
      VisitsService.getEnrichedVisits(3),
      ReportsService.getEnrichedReports(3),
      DocumentsService.getEnrichedDocuments(3),
      ActivityFeedService.getClientActivity(10),
      VisitsService.getActiveVisit(),
      NotificationsService.getUserNotifications(5),
      MessagesService.getUnreadThreadCount(),
    ]);

    const visits = recentVisits || [];
    const upcoming = visits.filter(v =>
      ['scheduled', 'en_route', 'arrived', 'in_progress'].includes(v.status)
    ).slice(0, 3);
    const completed = visits.filter(v => v.status === 'completed').slice(0, 5);

    return {
      client:          { ...SHW_SESSION },
      properties,
      activeAlerts:    activeAlerts.data || [],
      upcomingVisits:  upcoming,
      completedVisits: completed,
      recentReports:   (recentReports || []).slice(0, 4),
      recentDocuments: (recentDocs    || []).slice(0, 5),
      activityFeed:    activityFeed.data || [],
      activeVisit:     activeVisit.data  || null,
      notifications:   notifications.data || [],
      unreadMessages,
      summary: {
        totalProperties:   properties.length,
        activeAlertCount:  (activeAlerts.data || []).length,
        upcomingVisitCount: upcoming.length,
        unreadDocCount:    (recentDocs || []).filter(d => d.read_status === 'unread').length,
        unreadMsgCount:    unreadMessages,
      },
    };
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: ADMIN / MANAGER WORKFLOWS
// ═══════════════════════════════════════════════════════════════════════════════

const AdminService = {

  /** Create client (manager/corporate only) */
  async createClient(clientData) {
    const now = new Date().toISOString();
    return dbCreate('clients', { ...clientData, created_at: now, updated_at: now });
  },

  /** Create property and assign to client */
  async createProperty(propertyData) {
    const now = new Date().toISOString();
    const { data: prop, error } = await dbCreate('properties', {
      ...propertyData, created_at: now, updated_at: now,
    });
    if (error || !prop) return { data: null, error };
    // Grant owner access
    if (propertyData.owner_user_id) {
      await dbCreate('property_user_access', {
        property_id:       prop.id,
        user_id:           propertyData.owner_user_id,
        access_level:      'owner',
        granted_by_user_id: SHW_SESSION.userId,
        granted_at:        now,
      });
    }
    return { data: prop, error: null };
  },

  /** Schedule a visit */
  async scheduleVisit(visitData) {
    const now = new Date().toISOString();
    return dbCreate('visits', {
      ...visitData,
      created_by_user_id: SHW_SESSION.userId,
      status:             'scheduled',
      report_published:   false,
      created_at:         now,
      updated_at:         now,
    });
  },

  /** Assign inspector to visit */
  async assignInspector(visitId, employeeId) {
    return dbUpdate('visits', visitId, {
      assigned_employee_id: employeeId,
      updated_at:           new Date().toISOString(),
    });
  },

  /** Convert service request to visit */
  async convertRequestToVisit(serviceRequestId, visitData) {
    const { data: visit, error } = await this.scheduleVisit(visitData);
    if (error) return { data: null, error };
    await dbUpdate('service_requests', serviceRequestId, {
      status:              'scheduled',
      converted_to_visit_id: visit.id,
      updated_at:          new Date().toISOString(),
    });
    return { data: visit, error: null };
  },

  /** Get operational overview for manager/corporate dashboards */
  async getOperationalOverview() {
    const [clients, properties, visits, alerts, reports, requests] = await Promise.all([
      dbGetAllPages('clients'),
      dbGetAllPages('properties'),
      dbGetAllPages('visits'),
      dbGetAllPages('alerts'),
      dbGetAllPages('visit_reports'),
      dbGetAllPages('service_requests'),
    ]);

    const v = visits.data    || [];
    const a = alerts.data    || [];
    const r = reports.data   || [];
    const s = requests.data  || [];

    return {
      totals: {
        clients:       (clients.data    || []).length,
        properties:    (properties.data || []).length,
        visits_total:  v.length,
        visits_active: v.filter(x => ['en_route','arrived','in_progress'].includes(x.status)).length,
        alerts_open:   a.filter(x => ['open','in_progress'].includes(x.status)).length,
        reports_published: r.filter(x => x.report_status === 'published').length,
        requests_pending:  s.filter(x => ['submitted','under_review'].includes(x.status)).length,
      },
      activeVisits:   v.filter(x => ['en_route','arrived','in_progress'].includes(x.status)),
      pendingRequests: s.filter(x => ['submitted','under_review'].includes(x.status)),
      openAlerts:     a.filter(x => ['open','in_progress'].includes(x.status)),
    };
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
//  SERVICE: INSPECTOR WORKFLOWS
// ═══════════════════════════════════════════════════════════════════════════════

const InspectorService = {

  /** Get visits assigned to a specific inspector */
  async getAssignedVisits(employeeId) {
    const { data, error } = await dbGetAllPages('visits');
    if (error) return { data: [], error };
    const filtered = (data || [])
      .filter(v => v.assigned_employee_id === employeeId)
      .sort((a, b) => new Date(b.scheduled_start) - new Date(a.scheduled_start));
    return { data: filtered, error: null };
  },

  /** Start visit workflow: mark en_route */
  async departForVisit(visitId, lat, lng) {
    await VisitsService.updateVisitStatus(visitId, 'en_route');
    return VisitsService.createTrackingEvent(visitId, {
      event_type:    'departed_office',
      display_label: 'Inspector Departed',
      latitude:      lat,
      longitude:     lng,
      notes:         'Inspector departed for property',
    });
  },

  /** Mark arrived at property */
  async markArrived(visitId, lat, lng) {
    await VisitsService.updateVisitStatus(visitId, 'arrived');
    return VisitsService.createTrackingEvent(visitId, {
      event_type:    'arrived',
      display_label: 'Arrived at Property',
      latitude:      lat,
      longitude:     lng,
      notes:         'Inspector arrived on-site',
    });
  },

  /** Begin inspection */
  async startInspection(visitId, lat, lng, notes = '') {
    await VisitsService.updateVisitStatus(visitId, 'in_progress');
    return VisitsService.createTrackingEvent(visitId, {
      event_type:    'inspection_started',
      display_label: 'Inspection In Progress',
      latitude:      lat,
      longitude:     lng,
      notes:         notes || 'Inspection begun',
    });
  },

  /** Add checkpoint during inspection */
  async addCheckpoint(visitId, label, notes, lat, lng) {
    return VisitsService.createTrackingEvent(visitId, {
      event_type:    'checkpoint',
      display_label: label,
      notes,
      latitude:      lat,
      longitude:     lng,
    });
  },

  /** Complete visit */
  async completeVisit(visitId, summary) {
    await VisitsService.updateVisitStatus(visitId, 'completed', { summary });
    return VisitsService.createTrackingEvent(visitId, {
      event_type:    'inspection_completed',
      display_label: 'Inspection Completed',
      notes:         'Inspection completed. Report being prepared.',
    });
  },

  /** Submit inspection report */
  async submitReport(visitId, propertyId, reportData) {
    const now = new Date().toISOString();
    const { data: report, error } = await dbCreate('visit_reports', {
      ...reportData,
      visit_id:      visitId,
      property_id:   propertyId,
      employee_id:   SHW_SESSION.userId,
      report_status: 'submitted',
      created_at:    now,
      updated_at:    now,
    });
    if (error) return { data: null, error };
    await dbUpdate('visits', visitId, {
      report_published: false,
      updated_at:       now,
    });
    return { data: report, error: null };
  },

  /** Publish report to client */
  async publishReport(reportId, visitId) {
    const now = new Date().toISOString();
    const { data, error } = await dbUpdate('visit_reports', reportId, {
      report_status: 'published',
      published_at:  now,
      updated_at:    now,
    });
    if (error) return { data: null, error };
    await dbUpdate('visits', visitId, { report_published: true, updated_at: now });
    await VisitsService.createTrackingEvent(visitId, {
      event_type:    'report_published',
      display_label: 'Report Published',
      notes:         'Inspection report published and available to client',
    });
    return { data, error: null };
  },
};


// ─── EXPORT TO GLOBAL SCOPE ────────────────────────────────────────────────────
// All services available globally on window for page scripts
window.SHW = {
  session:  SHW_SESSION,
  supabaseConfig: SHW_SUPABASE,
  // Utilities
  fmt: { date: fmtDate, dateTime: fmtDateTime, time: fmtTime, fileSize: fmtFileSize },
  utils: { daysSince, capitalize, snakeToTitle, buildLookup, clearCache },
  // Services
  Properties:      PropertiesService,
  Visits:          VisitsService,
  Alerts:          AlertsService,
  Reports:         ReportsService,
  Documents:       DocumentsService,
  Messages:        MessagesService,
  ServiceRequests: ServiceRequestsService,
  Notifications:   NotificationsService,
  Activity:        ActivityFeedService,
  Dashboard:       DashboardService,
  Admin:           AdminService,
  Inspector:       InspectorService,
  // Low-level table access for legacy/admin pages migrating to service methods
  DB: {
    list: dbGetAll,
    listAll: dbGetAllPages,
    get: dbGetOne,
    create: dbCreate,
    update: dbUpdate,
    remove: dbDelete,
  },
};
