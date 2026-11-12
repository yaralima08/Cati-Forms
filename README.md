# Cati Forms

Plataforma de criação, compartilhamento e análise de formulários para o Banco de Talentos 2026 da CATI Jr.

O Cati Forms foi desenvolvido para ser uma ferramenta interna de alta performance, com interface moderna (Dark Mode), foco na experiência do usuário e uma API preparada para integrações futuras.

---

## O Desafio (O que foi pedido)

Segundo o documento de requisitos do Banco de Talentos, a CATI Jr. precisava de uma plataforma web para:

1. Criar formulários dinâmicos (Discursiva, Múltipla Escolha e Escolha Única com Justificativa).
2. Compartilhar links públicos para pessoas responderem sem necessidade de cadastro.
3. Garantir que todas as perguntas fossem obrigatórias e validadas no servidor (anti-fraude).
4. Armazenar as respostas de forma segura e independente.
5. Exportar os dados coletados em CSV (para o Excel) e PDF (para relatórios).
6. Ter uma interface simples, responsiva e que não exigisse treinamento prévio.

---

## O que foi construído (A Solução)

Entregamos um sistema completo, com backend e frontend separados, seguro e modular.

### Design e Usabilidade (RNF01, RNF02)

*   **Dark Mode Premium:** Fugimos do visual genérico de formulários brancos. Usamos uma paleta escura inspirada nas melhores ferramentas do mercado (Linear, Vercel, GitHub) com os detalhes nas cores da CATI Jr. (Azul e Magenta).
*   **Zero Curva de Aprendizado:** O criador clica em "+ Discursiva", preenche o campo e o sistema já foca automaticamente na próxima etapa.
*   **Responsivo:** O layout se adapta a telas de celulares e computadores através de media queries no CSS, garantindo botões acessíveis, fontes legíveis e quebra correta de texto.

### Segurança e Integridade (RNs e RNF05)

*   **Senhas Seguras:** Hash de senhas usando `bcrypt`.
*   **Sessões à Prova de Falhas:** Autenticação via `JWT` (JSON Web Token) com expiração.
*   **Blindagem do Formulário (RN07):** Formulários são imutáveis após a criação. O backend bloqueia qualquer tentativa de edição ou exclusão (`PUT`, `PATCH`, `DELETE`).
*   **Validação Dupla:** As regras de negócio (perguntas obrigatórias, justificativa obrigatória) são validadas no frontend para a experiência do usuário, e também no backend (para impedir burlas via Postman ou scripts).

### Arquitetura Técnica (RNF07, RNF08)

*   **Backend:** Node.js + Express.
*   **Banco de Dados:** SQLite (persistente em arquivo), modelado com entidades independentes (`forms`, `questions`, `responses`, `answers`) e integridade referencial (`ON DELETE CASCADE`).
*   **Frontend:** HTML5, CSS3 puro (sem frameworks pesados) e JavaScript Vanilla (ES6+).
*   **Exportação Nativa:** Geração de CSV com separador `;` e BOM UTF-8 (abre perfeitamente no Excel brasileiro) e PDF gerado dinamicamente com `PDFKit`.

---

## Como rodar na sua máquina

### Pré-requisitos

*   Node.js (v18 ou superior) instalado.
*   NPM instalado.

### Passo a passo

1. Clone este repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Acesse no navegador:
   ```text
   http://localhost:3000
   ```

O banco de dados (`cati-forms.db`) será criado automaticamente na pasta `data/` na primeira execução.

---

## Como testar a Responsividade (RNF02)

A página de resposta (`form.html`) foi desenvolvida com design responsivo, atendendo ao requisito RNF02.

Para testar no seu computador (sem precisar de um celular físico):

1. Abra o formulário público no navegador.
2. Pressione `F12` para abrir as ferramentas de desenvolvedor.
3. Ative o modo de dispositivo móvel (`Ctrl + Shift + M` no Chrome/Firefox).
4. Selecione um modelo de celular (ex: iPhone 12) e verifique o layout.

O CSS adapta os botões, tamanhos de fonte (16px nos inputs para evitar zoom no iOS) e margens para telas menores.

---

## Como testar o link público (Compartilhamento)

Como o sistema foi projetado para rodar localmente, o link gerado pelo formulário será `http://localhost:3000/...`. Para compartilhar com alguém fora da sua máquina (ou testar no celular usando dados móveis), utilize um túnel.

### Opção rápida: Cloudflare Tunnel

Com o projeto rodando (`npm start`), abra um segundo terminal e execute:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

O terminal gerará um link público (ex: `https://...trycloudflare.com`). Abra esse link no navegador para criar o formulário, e o link de compartilhamento gerado pelo sistema usará automaticamente essa URL pública. A banca poderá acessar esse link de qualquer dispositivo.

---

## Organização do Projeto

```text
cati-forms/
├── data/                 # Banco de dados SQLite (gerado automaticamente)
├── public/               # Frontend
│   ├── css/style.css     # Design System (Dark Mode)
│   ├── js/               # Scripts da interface (fetch API)
│   ├── index.html        # Tela de Login e Cadastro
│   ├── dashboard.html    # Painel com a lista de formulários
│   ├── create.html       # Construtor de formulários
│   ├── form.html         # Página pública (onde o candidato responde)
│   └── responses.html    # Painel de respostas e exportação
├── server.js             # API REST + Banco de Dados
├── package.json          # Dependências
└── README.md             # Documentação
```

---

## Checklist do Escopo Concluído

- [x] **RF01-RF02:** Cadastro, Login e Logout (username/e-mail único).
- [x] **RF03-RF07:** Criação com os 3 tipos de perguntas e flag de e-mail opcional.
- [x] **RF08-RF09:** Geração de link público para resposta externa.
- [x] **RF10-RF11:** Validação de obrigatoriedade total e de justificativa.
- [x] **RF12-RF13:** Armazenamento independente e relacionado.
- [x] **RF14:** Visualização de respostas por qualquer usuário logado.
- [x] **RF15-RF16:** Exportação impecável em CSV e PDF.
- [x] **RN01-RN11:** Todas as regras de negócio implementadas.
- [x] **RNF01-RNF08:** Design, responsividade, segurança e arquitetura.

---

## Decisões de Projeto e Evoluções Futuras

*   **Sem botão de editar/excluir?** Foi uma decisão intencional para cumprir a RN07. O banco guarda o histórico imutável. Para uma v2.0, planejamos um sistema de arquivamento (soft delete).
*   **Próximos passos:** Integração direta com o módulo de Controle de Pessoas da CATI Jr., upload de imagens de capa, perfis de acesso e novos tipos de perguntas (escala, upload de arquivo).

---
Desenvolvido para o Banco de Talentos CATI Jr. 2026.
```

Pode copiar o bloco todo de uma vez e colar no GitHub. Ele vai renderizar perfeitamente, com todos os títulos, listas, blocos de código e caixas de seleção formatados corretamente.
