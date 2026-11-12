(function () {
  const box = document.getElementById('formContainer');
  const publicId = new URLSearchParams(location.search).get('id');

  if (!publicId) {
    box.innerHTML = '<div class="card"><h2>Link inválido</h2><p class="muted">O endereço do formulário está incompleto.</p></div>';
    return;
  }

  function render(form) {
    document.title = `${form.title} — Cati Forms`;
    const qs = form.questions.map((q, i) => {
      let body = '';
      if (q.type === 'text') {
        body = `<textarea name="q${q.id}" rows="3" maxlength="5000"></textarea>`;
      } else if (q.type === 'multiple') {
        body = `<div class="choices">` + q.options.map((o) => `
          <label class="choice"><input type="checkbox" name="q${q.id}" value="${esc(o)}" /> <span>${esc(o)}</span></label>`).join('') + `</div>`;
      } else {
        body = `<div class="choices">` + q.options.map((o) => `
          <label class="choice"><input type="radio" name="q${q.id}" value="${esc(o)}" /> <span>${esc(o)}</span></label>`).join('') + `</div>
          <label for="j${q.id}" style="margin-top:.7rem;">Justifique sua escolha <span class="required">*</span></label>
          <textarea id="j${q.id}" name="j${q.id}" rows="2" maxlength="5000"></textarea>`;
      }
      return `<div class="answer-block" data-qid="${q.id}" data-type="${q.type}">
        <div class="q-title">${i + 1}. ${esc(q.text)} <span class="required">*</span></div>
        ${body}
      </div>`;
    }).join('');

    box.innerHTML = `
      <form class="card" id="answerForm" novalidate>
        <h2>${esc(form.title)}</h2>
        ${form.description ? `<p class="muted" style="white-space:pre-wrap">${esc(form.description)}</p>` : ''}
        <p class="hint"><span class="required">*</span> Todas as perguntas são obrigatórias.</p>
        ${form.require_email ? `
          <div class="answer-block" data-email="1">
            <div class="q-title">Seu e-mail de contato <span class="required">*</span></div>
            <input type="email" id="respEmail" autocomplete="email" />
          </div>` : ''}
        ${qs}
        <button type="submit" id="sendBtn">Enviar respostas</button>
        <p class="error" id="formError"></p>
      </form>`;

    const formEl = document.getElementById('answerForm');
    formEl.addEventListener('input', (e) => {
      const blk = e.target.closest('.answer-block');
      if (blk) blk.classList.remove('invalid');
    });
    formEl.addEventListener('submit', (e) => { e.preventDefault(); submit(form, formEl); });
  }

  async function submit(form, formEl) {
    const errEl = document.getElementById('formError');
    errEl.textContent = '';
    formEl.querySelectorAll('.answer-block').forEach((b) => b.classList.remove('invalid'));

    const answers = [];
    let firstInvalid = null;
    const fail = (blk, msg) => {
      blk.classList.add('invalid');
      if (!firstInvalid) { firstInvalid = blk; errEl.textContent = msg; }
    };

    let email = '';
    if (form.require_email) {
      const blk = formEl.querySelector('[data-email]');
      email = document.getElementById('respEmail').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(blk, 'Informe um e-mail de contato válido.');
    }

    for (const q of form.questions) {
      const blk = formEl.querySelector(`.answer-block[data-qid="${q.id}"]`);
      if (q.type === 'text') {
        const v = blk.querySelector('textarea').value.trim();
        if (!v) { fail(blk, 'Responda todas as perguntas.'); continue; }
        answers.push({ question_id: q.id, value: v });
      } else if (q.type === 'multiple') {
        const vals = [...blk.querySelectorAll('input:checked')].map((i) => i.value);
        if (!vals.length) { fail(blk, 'Marque pelo menos uma opção em cada pergunta de múltipla escolha.'); continue; }
        answers.push({ question_id: q.id, value: vals });
      } else {
        const sel = blk.querySelector('input:checked');
        const just = blk.querySelector('textarea').value.trim();
        if (!sel) { fail(blk, 'Escolha uma opção em cada pergunta de escolha única.'); continue; }
        if (!just) { fail(blk, 'A justificativa é obrigatória nas perguntas de escolha única.'); continue; }
        answers.push({ question_id: q.id, value: sel.value, justification: just });
      }
    }

    if (firstInvalid) { firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

    const btn = document.getElementById('sendBtn');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      await api(`/api/public/forms/${encodeURIComponent(publicId)}/responses`, { method: 'POST', body: { email, answers } });
      box.innerHTML = `<div class="card" style="text-align:center">
        <h2>✅ Resposta enviada!</h2>
        <p class="muted">Obrigado por participar. Você já pode fechar esta página.</p></div>`;
      window.scrollTo({ top: 0 });
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Enviar respostas';
    }
  }

  api(`/api/public/forms/${encodeURIComponent(publicId)}`, { noRedirect: true })
    .then(render)
    .catch((err) => {
      box.innerHTML = `<div class="card"><h2>Formulário indisponível</h2><p class="muted">${esc(err.message)}</p></div>`;
    });
})();