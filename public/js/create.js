(function () {
  if (!Auth.require()) return;

  const container = document.getElementById('questionsContainer');
  const message = document.getElementById('message');
  const createBtn = document.getElementById('createBtn');
  let nextId = 1;

  function renumber() {
    container.querySelectorAll('.question-card').forEach((card, i) => {
      card.querySelector('.q-num').textContent = `Pergunta ${i + 1}`;
    });
  }

  function addOptionRow(card, value = '') {
    const wrap = card.querySelector('.options');
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `<input type="text" class="opt-input" placeholder="Texto da opção" maxlength="200" />
      <button type="button" class="btn-danger btn-small" data-remove-option title="Remover opção">✕</button>`;
    row.querySelector('input').value = value;
    wrap.appendChild(row);
    return row;
  }

  function addQuestion(type) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.dataset.type = type;
    card.dataset.qid = nextId++;
    const hasOptions = type !== 'text';
    card.innerHTML = `
      <div class="question-head">
        <strong><span class="q-num"></span> · <span class="badge">${esc(TYPE_LABEL[type])}</span></strong>
        <button type="button" class="btn-danger btn-small" data-remove-question>Remover</button>
      </div>
      <label>Enunciado *</label>
      <input type="text" class="q-text" maxlength="500" placeholder="Digite a pergunta" />
      ${hasOptions ? `
        <label>Opções *</label>
        <div class="options"></div>
        <button type="button" class="btn-secondary btn-small" data-add-option>+ Adicionar opção</button>
        <p class="hint">${type === 'multiple'
          ? 'O respondente poderá marcar quantas opções quiser (mín. 1).'
          : 'O respondente escolherá uma opção e deverá justificar a escolha.'}</p>` : `
        <p class="hint">O respondente escreverá uma resposta livre.</p>`}`;
    container.appendChild(card);
    if (hasOptions) { addOptionRow(card); addOptionRow(card); }
    renumber();
    card.querySelector('.q-text').focus();
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.question-card');
    if (!card) return;
    if (e.target.closest('[data-remove-question]')) { card.remove(); renumber(); }
    else if (e.target.closest('[data-add-option]')) addOptionRow(card).querySelector('input').focus();
    else if (e.target.closest('[data-remove-option]')) {
      const rows = card.querySelectorAll('.option-row');
      if (rows.length > 2) e.target.closest('.option-row').remove();
      else showError('Cada pergunta de escolha precisa de pelo menos 2 opções.');
    }
  });

  document.getElementById('addTextBtn').addEventListener('click', () => addQuestion('text'));
  document.getElementById('addMultipleBtn').addEventListener('click', () => addQuestion('multiple'));
  document.getElementById('addSingleBtn').addEventListener('click', () => addQuestion('single'));

  function showError(msg) { message.className = 'error'; message.textContent = msg; }

  function collect() {
    const title = document.getElementById('title').value.trim();
    if (!title) return { error: 'Informe o título do formulário.' };
    const cards = [...container.querySelectorAll('.question-card')];
    if (!cards.length) return { error: 'Adicione pelo menos uma pergunta.' };

    const questions = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const type = card.dataset.type;
      const text = card.querySelector('.q-text').value.trim();
      if (!text) return { error: `Pergunta ${i + 1}: informe o enunciado.` };
      let options = [];
      if (type !== 'text') {
        options = [...card.querySelectorAll('.opt-input')].map((o) => o.value.trim()).filter(Boolean);
        if (options.length < 2) return { error: `Pergunta ${i + 1}: informe pelo menos 2 opções.` };
        if (new Set(options.map((o) => o.toLowerCase())).size !== options.length)
          return { error: `Pergunta ${i + 1}: há opções repetidas.` };
      }
      questions.push({ type, text, options });
    }
    return {
      payload: {
        title,
        description: document.getElementById('description').value.trim(),
        requireEmail: document.getElementById('requireEmail').checked,
        questions,
      },
    };
  }

  createBtn.addEventListener('click', async () => {
    message.textContent = '';
    const { error, payload } = collect();
    if (error) return showError(error);

    if (!confirm('Depois de criado, o formulário NÃO poderá ser editado nem excluído. Deseja criar?')) return;

    createBtn.disabled = true; createBtn.textContent = 'Criando...';
    try {
      const res = await api('/api/forms', { method: 'POST', body: payload });
      const link = formLink(res.public_id);
      const card = createBtn.closest('.card');
      card.innerHTML = `
        <h2>✅ Formulário criado!</h2>
        <p>Compartilhe o link abaixo — qualquer pessoa pode responder, sem cadastro.</p>
        <div class="link-box">
          <input type="text" id="linkInput" readonly value="${esc(link)}" />
          <button type="button" id="copyBtn">Copiar</button>
        </div>
        <div class="actions">
          <a href="/responses.html?id=${res.id}"><button type="button">Ver respostas</button></a>
          <a href="${esc(link)}" target="_blank" rel="noopener"><button type="button" class="btn-secondary">Abrir formulário</button></a>
          <a href="/create.html"><button type="button" class="btn-secondary">Criar outro</button></a>
          <a href="/dashboard.html"><button type="button" class="btn-secondary">Ir para o painel</button></a>
        </div>`;
      card.querySelector('#copyBtn').addEventListener('click', async (e) => {
        const ok = await copyText(link);
        e.target.textContent = ok ? '✓ Copiado!' : 'Copie manualmente';
      });
      card.querySelector('#linkInput').addEventListener('focus', (e) => e.target.select());
    } catch (err) {
      showError(err.message);
      createBtn.disabled = false; createBtn.textContent = 'Criar Formulário';
    }
  });

  addQuestion('text');
  document.getElementById('title').focus();
})();