(function () {
  if (Auth.token()) { location.href = '/dashboard.html'; return; }

  const $ = (id) => document.getElementById(id);
  const loginForm = $('loginForm');
  const registerForm = $('registerForm');
  const alertBox = $('alertBox');
  let mode = 'login';

  function showAlert(msg, type) {
    alertBox.textContent = msg;
    alertBox.className = 'alert show alert-' + (type || 'error');
  }
  function clearAlert() { alertBox.className = 'alert'; alertBox.textContent = ''; }

  function setField(form, name, ok, msg) {
    const f = form.querySelector(`.field[data-field="${name}"]`);
    if (!f) return ok;
    f.classList.toggle('invalid', !ok);
    f.classList.toggle('valid', ok);
    if (!ok && msg) f.querySelector('.field-error').textContent = msg;
    return ok;
  }

  // ---------- Alternar login/cadastro ----------
  $('switchMode').addEventListener('click', (e) => {
    e.preventDefault();
    clearAlert();
    mode = mode === 'login' ? 'register' : 'login';
    const isLogin = mode === 'login';
    loginForm.style.display = isLogin ? '' : 'none';
    registerForm.style.display = isLogin ? 'none' : '';
    $('title').textContent = isLogin ? 'Entrar' : 'Criar conta';
    $('switchText').textContent = isLogin ? 'Não tem conta?' : 'Já tem conta?';
    $('switchMode').textContent = isLogin ? 'Cadastre-se' : 'Entrar';
    (isLogin ? $('loginIdentifier') : $('regName')).focus();
  });

  // ---------- Mostrar/ocultar senha ----------
  document.querySelectorAll('.toggle-eye').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.target);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈' : '👁';
    });
  });

  // ---------- Força da senha ----------
  $('regPassword').addEventListener('input', (e) => {
    const p = e.target.value;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    const levels = [
      { w: '0%', c: 'transparent', t: '' },
      { w: '25%', c: '#e53e3e', t: 'Fraca' },
      { w: '50%', c: '#dd6b20', t: 'Razoável' },
      { w: '75%', c: '#d69e2e', t: 'Boa' },
      { w: '100%', c: '#38a169', t: 'Forte' },
    ];
    const l = p ? levels[Math.max(1, score)] : levels[0];
    $('strengthBar').style.width = l.w;
    $('strengthBar').style.background = l.c;
    $('strengthText').textContent = l.t;
    $('strengthText').style.color = l.c;
  });

  // ---------- Login ----------
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const identifier = $('loginIdentifier').value.trim();
    const password = $('loginPassword').value;
    const ok1 = setField(loginForm, 'identifier', !!identifier);
    const ok2 = setField(loginForm, 'password', !!password);
    if (!ok1 || !ok2) return;

    const btn = $('loginBtn');
    btn.disabled = true; btn.textContent = 'Entrando...';
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { identifier, password }, noRedirect: true });
      Auth.save(data.token, data.user);
      location.href = '/dashboard.html';
    } catch (err) {
      showAlert(err.message);
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });

  // ---------- Cadastro ----------
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const name = $('regName').value.trim();
    const email = $('regEmail').value.trim();
    const username = $('regUsername').value.trim();
    const password = $('regPassword').value;
    const confirm = $('regConfirm').value;

    const checks = [
      setField(registerForm, 'name', name.length >= 2),
      setField(registerForm, 'email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
      setField(registerForm, 'username', /^[A-Za-z0-9_.]{3,30}$/.test(username),
        'Use 3-30 caracteres: letras, números, _ ou .'),
      setField(registerForm, 'password', password.length >= 6),
      setField(registerForm, 'confirmPassword', password === confirm && confirm.length > 0),
    ];
    if (checks.includes(false)) return;

    const btn = $('registerBtn');
    btn.disabled = true; btn.textContent = 'Criando...';
    try {
      const data = await api('/api/auth/register', { method: 'POST', body: { name, email, username, password }, noRedirect: true });
      Auth.save(data.token, data.user);
      location.href = '/dashboard.html';
    } catch (err) {
      showAlert(err.message);
      btn.disabled = false; btn.textContent = 'Criar conta';
    }
  });

  // Limpa o estado de erro ao digitar
  document.querySelectorAll('.field input').forEach((i) =>
    i.addEventListener('input', () => i.closest('.field').classList.remove('invalid')));
})();
