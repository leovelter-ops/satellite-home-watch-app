(function () {
  let _client = null;

  function getSupabaseConfig() {
    const configFromDb = window.SHW?.supabaseConfig || window.SHW_SUPABASE || {};
    return {
      url: configFromDb.url || '',
      anonKey: configFromDb.anonKey || '',
    };
  }

  function getSupabaseClient() {
    if (_client) return _client;
    const { url, anonKey } = getSupabaseConfig();
    if (!url || !anonKey || !window.supabase?.createClient) return null;
    _client = window.supabase.createClient(url, anonKey);
    return _client;
  }

  function isAuthReady() {
    return !!getSupabaseClient();
  }

  async function fetchProfileByUserId(userId) {
    const client = getSupabaseClient();
    if (!client || !userId) return { data: null, error: 'Authentication service is not configured.' };

    const byId = await client
      .from('profiles')
      .select('id, user_id, role, first_name, last_name, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (byId.data) return { data: byId.data, error: null };

    const byUserId = await client
      .from('profiles')
      .select('id, user_id, role, first_name, last_name, full_name')
      .eq('user_id', userId)
      .maybeSingle();

    return { data: byUserId.data, error: byUserId.error ? byUserId.error.message : null };
  }

  function normalizeRole(role) {
    return String(role || '').toLowerCase();
  }

  function getRoleRedirect(role) {
    const normalizedRole = normalizeRole(role);
    if (['admin', 'manager', 'corporate', 'executive'].includes(normalizedRole)) return 'admin-dashboard.html';
    if (['employee', 'inspector'].includes(normalizedRole)) return 'employee-dashboard.html';
    return 'dashboard.html';
  }

  function roleLabel(role) {
    const normalizedRole = normalizeRole(role);
    if (['admin', 'manager'].includes(normalizedRole)) return 'Manager';
    if (normalizedRole === 'corporate') return 'Corporate';
    if (['employee', 'inspector'].includes(normalizedRole)) return 'Inspector';
    return 'Client';
  }

  function initialsFor(name, email) {
    if (name && name.trim()) {
      return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() || '')
        .join('');
    }
    return (email || '?').slice(0, 2).toUpperCase();
  }

  function persistLegacySession(user, profile) {
    const role = normalizeRole(profile?.role);
    const name = profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || user?.email || 'User';
    const sessionData = {
      userId: user?.id || '',
      role: role || 'client',
      name,
      initials: initialsFor(name, user?.email),
    };

    sessionStorage.removeItem('shw_admin_session');
    sessionStorage.removeItem('shw_emp_session');

    if (['admin', 'manager', 'corporate', 'executive'].includes(role)) {
      sessionStorage.setItem('shw_admin_session', JSON.stringify(sessionData));
    } else if (['employee', 'inspector'].includes(role)) {
      sessionStorage.setItem('shw_emp_session', JSON.stringify(sessionData));
    }

    return sessionData;
  }

  function authErrorMessage(error) {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('invalid login credentials')) return 'Invalid email or password. Please try again.';
    if (msg.includes('email not confirmed')) return 'Please confirm your email before signing in.';
    if (msg.includes('network')) return 'Unable to reach the authentication service. Please try again.';
    return error?.message || 'Sign in failed. Please try again.';
  }

  window.SHWAuth = {
    getSupabaseClient,
    isAuthReady,
    fetchProfileByUserId,
    getRoleRedirect,
    persistLegacySession,
    authErrorMessage,
    roleLabel,
  };
})();
