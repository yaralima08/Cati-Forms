const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

//Segredo do JWT 
function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = path.join(DATA_DIR, '.secret');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'));
  return fs.readFileSync(file, 'utf8');
}
const JWT_SECRET = getSecret();

//Banco de dados 
const db = new Database(process.env.DB_FILE || path.join(DATA_DIR, 'cati-forms.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  require_email INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text','multiple','single')),
  text TEXT NOT NULL,
  options TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  respondent_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  justification TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_form ON questions(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_form ON responses(form_id);
CREATE INDEX IF NOT EXISTS idx_answers_response ON answers(response_id);
`);

//Helpers 
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const newPublicId = () => crypto.randomBytes(6).toString('base64url');

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, username FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

function loadForm(where, param) {
  const form = db.prepare(`
    SELECT f.*, u.name AS author_name
    FROM forms f JOIN users u ON u.id = f.created_by
    WHERE ${where} = ?`).get(param);
  if (!form) return null;
  form.require_email = !!form.require_email;
  form.questions = db.prepare('SELECT id, position, type, text, options FROM questions WHERE form_id = ? ORDER BY position')
    .all(form.id)
    .map((q) => ({ ...q, options: JSON.parse(q.options) }));
  return form;
}

function loadResponses(formId, questions) {
  const responses = db.prepare('SELECT id, respondent_email, created_at FROM responses WHERE form_id = ? ORDER BY id').all(formId);
  const answersStmt = db.prepare('SELECT question_id, value, justification FROM answers WHERE response_id = ?');
  return responses.map((r) => {
    const byQ = {};
    for (const a of answersStmt.all(r.id)) byQ[a.question_id] = a;
    return {
      id: r.id,
      respondent_email: r.respondent_email,
      created_at: r.created_at,
      answers: questions.map((q) => {
        const a = byQ[q.id];
        return {
          question_id: q.id,
          value: a ? JSON.parse(a.value) : null,
          justification: a ? a.justification : null,
        };
      }),
    };
  });
}

function answerToText(q, ans) {
  if (!ans || ans.value == null) return '';
  if (q.type === 'multiple') return ans.value.join(' | ');
  return String(ans.value);
}

const app = express();

//RN07: Bloqueia edição e exclusão
app.use((req, res, next) => {
  if (['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Formulários não podem ser editados ou excluídos (RN07)' });
  }
  next();
});

app.use(express.json({ limit: '1mb' }));

const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
app.get('/config.js', (req, res) => {
  res.type('application/javascript').set('Cache-Control', 'no-store')
    .send(`window.CATI_PUBLIC_URL = ${JSON.stringify(PUBLIC_URL)};`);
});
app.use(express.static(path.join(__dirname, 'public')));

//Autenticação 
app.post('/api/auth/register', (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const username = str(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (name.length < 2) return res.status(400).json({ error: 'Informe seu nome (mín. 2 caracteres)' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Informe um e-mail válido' });
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Username inválido (3-30 caracteres: letras, números, _ ou .)' });
  if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });

  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username))
    return res.status(409).json({ error: 'Este username já está em uso' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email))
    return res.status(409).json({ error: 'Este e-mail já está cadastrado' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, username, password_hash) VALUES (?, ?, ?, ?)')
    .run(name, email, username, hash);
  const user = { id: info.lastInsertRowid, name, email, username };
  res.status(201).json({ token: signToken(user), user });
});

app.post('/api/auth/login', (req, res) => {
  const identifier = str(req.body.identifier);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!identifier || !password) return res.status(400).json({ error: 'Informe usuário/e-mail e senha' });

  const row = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(identifier, identifier);
  if (!row || !bcrypt.compareSync(password, row.password_hash))
    return res.status(401).json({ error: 'Credenciais inválidas' });

  const user = { id: row.id, name: row.name, email: row.email, username: row.username };
  res.json({ token: signToken(user), user });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));

//  Formulários 
app.get('/api/forms', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT f.id, f.public_id, f.title, f.description, f.require_email, f.created_at,
           u.name AS author_name,
           (SELECT COUNT(*) FROM questions q WHERE q.form_id = f.id) AS question_count,
           (SELECT COUNT(*) FROM responses r WHERE r.form_id = f.id) AS response_count
    FROM forms f JOIN users u ON u.id = f.created_by
    ORDER BY f.id DESC`).all();
  res.json(rows.map((r) => ({ ...r, require_email: !!r.require_email })));
});

app.post('/api/forms', auth, (req, res) => {
  const title = str(req.body.title);
  const description = str(req.body.description);
  const requireEmail = !!req.body.requireEmail;
  const questions = Array.isArray(req.body.questions) ? req.body.questions : [];

  if (!title) return res.status(400).json({ error: 'Informe o título do formulário' });
  if (title.length > 200) return res.status(400).json({ error: 'Título muito longo (máx. 200 caracteres)' });
  if (questions.length === 0) return res.status(400).json({ error: 'Adicione pelo menos uma pergunta' });
  if (questions.length > 100) return res.status(400).json({ error: 'Máximo de 100 perguntas por formulário' });

  const clean = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] || {};
    const text = str(q.text);
    const type = q.type;
    if (!['text', 'multiple', 'single'].includes(type))
      return res.status(400).json({ error: `Pergunta ${i + 1}: tipo inválido` });
    if (!text) return res.status(400).json({ error: `Pergunta ${i + 1}: informe o enunciado` });
    let options = [];
    if (type !== 'text') {
      options = (Array.isArray(q.options) ? q.options : []).map(str).filter(Boolean);
      if (options.length < 2) return res.status(400).json({ error: `Pergunta ${i + 1}: informe pelo menos 2 opções` });
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length)
        return res.status(400).json({ error: `Pergunta ${i + 1}: há opções repetidas` });
    }
    clean.push({ type, text, options });
  }

  const publicId = newPublicId();
  const tx = db.transaction(() => {
    const info = db.prepare('INSERT INTO forms (public_id, title, description, require_email, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(publicId, title, description, requireEmail ? 1 : 0, req.user.id);
    const ins = db.prepare('INSERT INTO questions (form_id, position, type, text, options) VALUES (?, ?, ?, ?, ?)');
    clean.forEach((q, idx) => ins.run(info.lastInsertRowid, idx + 1, q.type, q.text, JSON.stringify(q.options)));
    return info.lastInsertRowid;
  });
  const id = tx();
  res.status(201).json({ id, public_id: publicId, link: `/form.html?id=${publicId}` });
});

app.get('/api/forms/:id', auth, (req, res) => {
  const form = loadForm('f.id', req.params.id);
  if (!form) return res.status(404).json({ error: 'Formulário não encontrado' });
  res.json(form);
});

app.get('/api/forms/:id/responses', auth, (req, res) => {
  const form = loadForm('f.id', req.params.id);
  if (!form) return res.status(404).json({ error: 'Formulário não encontrado' });
  res.json({ form, responses: loadResponses(form.id, form.questions) });
});

//Exportação 
function safeName(title) {
  return title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'formulario';
}

app.get('/api/forms/:id/export.csv', auth, (req, res) => {
  const form = loadForm('f.id', req.params.id);
  if (!form) return res.status(404).json({ error: 'Formulário não encontrado' });
  const responses = loadResponses(form.id, form.questions);

  const esc = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['#', 'Data/Hora'];
  if (form.require_email) header.push('E-mail');
  form.questions.forEach((q) => {
    header.push(q.text);
    if (q.type === 'single') header.push(`${q.text} (justificativa)`);
  });
  const lines = [header.map(esc).join(';')];
  responses.forEach((r, i) => {
    const row = [i + 1, r.created_at];
    if (form.require_email) row.push(r.respondent_email || '');
    form.questions.forEach((q, qi) => {
      const a = r.answers[qi];
      row.push(answerToText(q, a));
      if (q.type === 'single') row.push(a.justification || '');
    });
    lines.push(row.map(esc).join(';'));
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName(form.title)}_respostas.csv"`);
  res.send('﻿' + lines.join('\r\n'));
});

app.get('/api/forms/:id/export.pdf', auth, (req, res) => {
  const form = loadForm('f.id', req.params.id);
  if (!form) return res.status(404).json({ error: 'Formulário não encontrado' });
  const responses = loadResponses(form.id, form.questions);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName(form.title)}_respostas.pdf"`);

  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  doc.pipe(res);
  const BLUE = '#2b3fd6', GRAY = '#4a5568';

  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(20).text('Cati Forms — Respostas');
  doc.moveDown(0.4).fillColor('#000').fontSize(16).text(form.title);
  if (form.description) doc.moveDown(0.2).font('Helvetica').fontSize(11).fillColor(GRAY).text(form.description);
  doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor(GRAY)
    .text(`Total de respostas: ${responses.length}   |   Perguntas: ${form.questions.length}`);
  doc.moveDown(0.8);

  if (responses.length === 0) {
    doc.fillColor('#000').fontSize(12).text('Nenhuma resposta recebida ainda.');
  }

  responses.forEach((r, i) => {
    if (doc.y > 650) doc.addPage();
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(13).text(`Resposta #${i + 1}`, { continued: false });
    doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(`Enviada em ${r.created_at} (UTC)`);
    if (form.require_email) doc.text(`E-mail: ${r.respondent_email || '-'}`);
    doc.moveDown(0.4);
    form.questions.forEach((q, qi) => {
      const a = r.answers[qi];
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(10.5).text(`${qi + 1}. ${q.text}`);
      doc.font('Helvetica').fontSize(10.5).fillColor('#222').text(answerToText(q, a) || '—', { indent: 12 });
      if (q.type === 'single') {
        doc.fillColor(GRAY).font('Helvetica-Oblique').text(`Justificativa: ${a.justification || '—'}`, { indent: 12 });
      }
      doc.moveDown(0.4);
    });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e0').lineWidth(0.5).stroke();
    doc.moveDown(0.8);
  });

  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(p);
    doc.font('Helvetica').fontSize(8).fillColor('#718096')
      .text(`Cati Forms — página ${p + 1} de ${range.count}`, 50, 800, { align: 'center', lineBreak: false });
  }
  doc.end();
});

//Área pública 
app.get('/api/public/forms/:publicId', (req, res) => {
  const form = loadForm('f.public_id', req.params.publicId);
  if (!form) return res.status(404).json({ error: 'Formulário não encontrado' });
  res.json({
    public_id: form.public_id,
    title: form.title,
    description: form.description,
    require_email: form.require_email,
    questions: form.questions.map(({ id, position, type, text, options }) => ({ id, position, type, text, options })),
  });
});

app.post('/api/public/forms/:publicId/responses', (req, res) => {
  const form = loadForm('f.public_id', req.params.publicId);
  if (!form) return res.status(404).json({ error: 'Formulário não encontrado' });

  const email = str(req.body.email).toLowerCase();
  if (form.require_email && !EMAIL_RE.test(email))
    return res.status(400).json({ error: 'Informe um e-mail de contato válido' });

  const given = new Map((Array.isArray(req.body.answers) ? req.body.answers : []).map((a) => [Number(a && a.question_id), a]));
  const rows = [];
  for (const q of form.questions) {
    const a = given.get(q.id);
    const label = `Pergunta ${q.position}`;
    if (!a) return res.status(400).json({ error: `${label}: resposta obrigatória` });
    if (q.type === 'text') {
      const v = str(a.value);
      if (!v) return res.status(400).json({ error: `${label}: resposta obrigatória` });
      if (v.length > 5000) return res.status(400).json({ error: `${label}: resposta muito longa` });
      rows.push({ q, value: v, justification: null });
    } else if (q.type === 'multiple') {
      const arr = Array.isArray(a.value) ? a.value.map(String) : [];
      if (arr.length === 0) return res.status(400).json({ error: `${label}: marque pelo menos uma opção` });
      if (!arr.every((o) => q.options.includes(o))) return res.status(400).json({ error: `${label}: opção inválida` });
      rows.push({ q, value: [...new Set(arr)], justification: null });
    } else {
      const v = String(a.value ?? '');
      if (!q.options.includes(v)) return res.status(400).json({ error: `${label}: escolha uma opção` });
      const just = str(a.justification);
      if (!just) return res.status(400).json({ error: `${label}: a justificativa é obrigatória` });
      if (just.length > 5000) return res.status(400).json({ error: `${label}: justificativa muito longa` });
      rows.push({ q, value: v, justification: just });
    }
  }

  const tx = db.transaction(() => {
    const info = db.prepare('INSERT INTO responses (form_id, respondent_email) VALUES (?, ?)')
      .run(form.id, form.require_email ? email : null);
    const ins = db.prepare('INSERT INTO answers (response_id, question_id, value, justification) VALUES (?, ?, ?, ?)');
    for (const r of rows) ins.run(info.lastInsertRowid, r.q.id, JSON.stringify(r.value), r.justification);
  });
  tx();
  res.status(201).json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.get('/', (req, res) => res.redirect('/index.html'));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Cati Forms rodando em http://localhost:${PORT}`));
}
module.exports = app;