(function () {
  if (!Auth.require()) return;

  const user = Auth.user();
  if (user) document.getElementById('userName').textContent = '👤 ' + (user.name || user.username);
  document.getElementById('logoutBtn').addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); });

  const list = document.getElementById('formsList');

  function render(forms) {
    if (!forms.length) {
      list.innerHTML = '<div class="empty"><p>Nenhum formulário criado ainda.</p><p><a href="/create.html">Crie o primeiro formulário</a></p></div>';
      return;
    }
    list.innerHTML = forms.map((f) => `
      <div class="form-item">
        <h3>${esc(f.title)}</h3>
        ${f.description ? `<p>${esc(f.description)}</p>` : ''}
        <div class="meta">
          <span>👤 ${esc(f.author_name)}</span>
          <span>🗓 ${esc(fmtDate(f.created_at))}</span>
          <span>${f.question_count} pergunta${f.question_count === 1 ? '' : 's'}</span>
          <span class="badge">${f.response_count} resposta${f.response_count === 1 ? '' : 's'}</span>
          ${f.require_email ? '<span>✉ Solicita e-mail</span>' : ''}
        </div>
        <div class="actions">
          <a href="/responses.html?id=${f.id}"><button type="button" class="btn-small">Ver respostas</button></a>
          <button type="button" class="btn-small btn-secondary" data-copy="${esc(f.public_id)}">Copiar link</button>
          <a href="/form.html?id=${encodeURIComponent(f.public_id)}" target="_blank" rel="noopener"><button type="button" class="btn-small btn-secondary">Abrir formulário</button></a>
        </div>
      </div>`).join('');
  }

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const ok = await copyText(formLink(btn.dataset.copy));
    const old = btn.textContent;
    btn.textContent = ok ? '✓ Link copiado!' : 'Copie manualmente';
    setTimeout(() => (btn.textContent = old), 1800);
  });

  api('/api/forms')
    .then(render)
    .catch((err) => { list.innerHTML = `<p class="error">${esc(err.message)}</p>`; });
})();
