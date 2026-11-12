// Utilitários compartilhados por todas as páginas
(function () {
  const TOKEN_KEY = 'cati_token';
  const USER_KEY = 'cati_user';

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };

  window.Auth = {
    token: () => store.get(TOKEN_KEY),
    user() { try { return JSON.parse(store.get(USER_KEY) || 'null'); } catch { return null; } },
    save(token, user) { store.set(TOKEN_KEY, token); store.set(USER_KEY, JSON.stringify(user)); },
    clear() { store.del(TOKEN_KEY); store.del(USER_KEY); },
    require() {
      if (!store.get(TOKEN_KEY)) { location.href = '/index.html'; return false; }
      return true;
    },
    logout() { this.clear(); location.href = '/index.html'; },
  };

  window.api = async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const token = Auth.token();
    if (token) headers.Authorization = 'Bearer ' + token;

    let res;
    try {
      res = await fetch(path, { ...options, headers, body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body });
    } catch {
      throw new Error('Não foi possível conectar ao servidor');
    }
    if (options.raw) return res;

    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      if (res.status === 401 && token && !options.noRedirect) { Auth.clear(); location.href = '/index.html'; }
      const err = new Error((data && data.error) || 'Erro inesperado');
      err.status = res.status;
      throw err;
    }
    return data;
  };

  window.esc = function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  // O servidor salva datas em UTC ("YYYY-MM-DD HH:MM:SS")
  window.fmtDate = function fmtDate(s) {
    if (!s) return '';
    const d = new Date(s.replace(' ', 'T') + 'Z');
    return isNaN(d) ? s : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  window.formLink = (publicId) =>
    `${window.CATI_PUBLIC_URL || location.origin}/form.html?id=${encodeURIComponent(publicId)}`;

  window.copyText = async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      ta.remove();
      return ok;
    }
  };

  window.TYPE_LABEL = { text: 'Discursiva', multiple: 'Múltipla escolha', single: 'Escolha única c/ justificativa' };
})();
