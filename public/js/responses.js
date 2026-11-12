(function () {
  if (!Auth.require()) return;

  const content = document.getElementById('content');
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { content.innerHTML = '<div class="card"><p class="error">Formulário não informado.</p></div>'; return; }

  let data = null;
  let view = 'respondent';

  async function download(kind, btn) {
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = 'Gerando...';
    try {
      const res = await api(`/api/forms/${encodeURIComponent(id)}/export.${kind}`, { raw: true });
      if (!res.ok) throw new Error('Falha ao exportar');
      const blob = await res.blob();
      const m = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = m ? m[1] : `respostas.${kind}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false; btn.textContent = old;
    }
  }

  function answerHtml(q, a) {
    if (!a || a.value == null) return '<div class="a muted">—</div>';
    if (q.type === 'multiple') return `<div class="a">${a.value.map((v) => '• ' + esc(v)).join('<br>')}</div>`;
    return `<div class="a">${esc(a.value)}</div>` +
      (q.type === 'single' ? `<div class="j">Justificativa: ${esc(a.justification || '—')}</div>` : '');
  }

  function byRespondent() {
    const { form, responses } = data;
    if (!responses.length) return '<p class="muted">Nenhuma resposta recebida ainda.</p>';
    return responses.map((r, i) => `
      <div class="resp-card">
        <h4>Resposta #${i + 1}</h4>
        <div class="meta" style="margin-bottom:.6rem">
          <span>🗓 ${esc(fmtDate(r.created_at))}</span>
          ${form.require_email ? `<span>✉ ${esc(r.respondent_email || '—')}</span>` : ''}
        </div>
        ${form.questions.map((q, qi) => `
          <div class="qa"><div class="q">${qi + 1}. ${esc(q.text)}</div>${answerHtml(q, r.answers[qi])}</div>`).join('')}
      </div>`).join('');
  }

  function byQuestion() {
    const { form, responses } = data;
    if (!responses.length) return '<p class="muted">Nenhuma resposta recebida ainda.</p>';
    return form.questions.map((q, qi) => {
      let body = '';
      if (q.type === 'text') {
        body = responses.map((r) => `<div class="resp-card" style="padding:.6rem .8rem;margin-bottom:.4rem">
          ${answerHtml(q, r.answers[qi])}${form.require_email ? `<div class="meta">✉ ${esc(r.respondent_email || '')}</div>` : ''}</div>`).join('');
      } else {
        const counts = new Map(q.options.map((o) => [o, 0]));
        responses.forEach((r) => {
          const v = r.answers[qi].value;
          (Array.isArray(v) ? v : [v]).forEach((x) => counts.has(x) && counts.set(x, counts.get(x) + 1));
        });
        const total = responses.length;
        body = [...counts].map(([o, n]) => `
          <div class="bar-row"><span class="bar-label">${esc(o)}</span>
            <span class="bar-track"><span class="bar-fill" style="display:block;width:${total ? (n / total) * 100 : 0}%"></span></span>
            <span class="bar-count">${n} (${total ? Math.round((n / total) * 100) : 0}%)</span></div>`).join('');
        if (q.type === 'single') {
          body += '<h4 style="margin:1rem 0 .4rem;color:var(--muted);font-size:.85rem">Justificativas</h4>' +
            responses.map((r) => `<div class="resp-card" style="padding:.5rem .8rem;margin-bottom:.35rem">
              <strong>${esc(r.answers[qi].value)}</strong><div class="j" style="margin-left:0;font-style:normal">${esc(r.answers[qi].justification || '—')}</div></div>`).join('');
        }
      }
      return `<div class="card" style="box-shadow:none"><h3 style="margin-top:0">${qi + 1}. ${esc(q.text)} <span class="badge">${esc(TYPE_LABEL[q.type])}</span></h3>${body}</div>`;
    }).join('');
  }

  function render() {
    const { form, responses } = data;
    document.title = `Respostas — ${form.title}`;
    content.innerHTML = `
      <div class="card">
        <h2>${esc(form.title)}</h2>
        ${form.description ? `<p class="muted" style="white-space:pre-wrap">${esc(form.description)}</p>` : ''}
        <div class="meta">
          <span>👤 ${esc(form.author_name)}</span><span>🗓 ${esc(fmtDate(form.created_at))}</span>
          <span class="badge">${responses.length} resposta${responses.length === 1 ? '' : 's'}</span>
        </div>
        <label>Link para responder</label>
        <div class="link-box" style="margin-top:.3rem">
          <input type="text" readonly value="${esc(formLink(form.public_id))}" id="linkInput" />
          <button type="button" id="copyBtn">Copiar</button>
        </div>
        <div class="toolbar">
          <button type="button" id="csvBtn">⬇ Exportar CSV</button>
          <button type="button" id="pdfBtn">⬇ Exportar PDF</button>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">Perguntas do formulário</h3>
        <ol style="padding-left:1.2rem;margin:0">
          ${form.questions.map((q) => `<li>${esc(q.text)} <span class="badge">${esc(TYPE_LABEL[q.type])}</span>
            ${q.options.length ? `<div class="muted" style="font-size:.85rem">Opções: ${q.options.map(esc).join(' · ')}</div>` : ''}</li>`).join('')}
        </ol>
      </div>
      <div class="card">
        <h3 style="margin-top:0">Respostas</h3>
        <div class="tabs">
          <button type="button" class="tab ${view === 'respondent' ? 'active' : ''}" data-view="respondent">Por respondente</button>
          <button type="button" class="tab ${view === 'question' ? 'active' : ''}" data-view="question">Por pergunta</button>
        </div>
        <div id="resultsArea">${view === 'respondent' ? byRespondent() : byQuestion()}</div>
      </div>`;

    document.getElementById('csvBtn').addEventListener('click', (e) => download('csv', e.currentTarget));
    document.getElementById('pdfBtn').addEventListener('click', (e) => download('pdf', e.currentTarget));
    document.getElementById('copyBtn').addEventListener('click', async (e) => {
      const ok = await copyText(formLink(form.public_id));
      e.currentTarget.textContent = ok ? '✓ Copiado!' : 'Copie manualmente';
    });
    document.getElementById('linkInput').addEventListener('focus', (e) => e.target.select());
    content.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { view = t.dataset.view; render(); }));
  }

  api(`/api/forms/${encodeURIComponent(id)}/responses`)
    .then((d) => { data = d; render(); })
    .catch((err) => { content.innerHTML = `<div class="card"><p class="error">${esc(err.message)}</p></div>`; });
})();
