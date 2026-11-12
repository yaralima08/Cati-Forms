

# Cati Forms

**Plataforma de formulários dinâmicos para o Banco de Talentos 2026**

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Licença](https://img.shields.io/badge/Licen%C3%A7a-ISC-blue?style=for-the-badge)]()

</div>

---

## Sobre o Projeto

O **Cati Forms** nasceu da necessidade da CATI Jr. em centralizar a coleta de dados do seu Banco de Talentos. Mais do que um clone do Google Forms, o sistema foi projetado com uma arquitetura modular, interface moderna e foco na integridade dos dados.

> **Objetivo:** Oferecer uma ferramenta interna simples, segura e visualmente agradável para criação de formulários, compartilhamento de links públicos e análise de respostas.

---

## Principais Funcionalidades

*   **Criação Flexível:** Suporte a perguntas discursivas, múltipla escolha (ilimitada) e escolha única com justificativa obrigatória.
*   **Compartilhamento Descomplicado:** Geração de links públicos únicos. Qualquer pessoa pode responder sem precisar criar conta.
*   **Segurança em Primeiro Lugar:** Senhas com hash (`bcrypt`), autenticação via `JWT` e validação anti-fraude no lado do servidor.
*   **Imutabilidade (RN07):** Após a criação, o formulário não pode ser editado ou excluído, garantindo a integridade histórica dos dados.
*   **Exportação Nativa:** Respostas disponíveis em **CSV** (formatado para Excel brasileiro) e **PDF** (gerado dinamicamente).
*   **Design Responsivo:** Interface Dark Mode adaptada para desktop e dispositivos móveis.

---

## Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Backend** | Node.js, Express, JWT, Bcrypt |
| **Banco de Dados** | SQLite (persistente em arquivo) |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Exportação** | PDFKit, CSV com BOM UTF-8 |

---

## Como Rodar o Projeto

### Requisitos
*   Node.js (v18+)
*   NPM

### Instalação e Execução

```bash
# 1. Clone o repositório
git clone https://github.com/yaralima08/Cati-Forms.git

# 2. Acesse a pasta
cd Cati-Forms

# 3. Instale as dependências
npm install

# 4. Inicie o servidor
npm start
```

Acesse em seu navegador: `http://localhost:3000`

> O banco de dados (`cati-forms.db`) será criado automaticamente na pasta `data/`.

---

## Acesso Rápido (Demonstração)

Para facilitar a avaliação, o sistema está temporariamente disponível em um link público gerado pelo Cloudflare Tunnel.

**Link de Acesso:**
`https://victory-screenshot-warcraft-alert.trycloudflare.com`

**Instruções para Teste:**
1. Abra o link acima no seu navegador (computador ou celular).
2. Crie uma conta, faça login e crie um formulário de teste.
3. Copie o link público gerado pelo sistema e abra em outra aba para simular um respondente externo.

> **Aviso Importante:** Este link é um túnel temporário e só permanecerá online enquanto o servidor local e o túnel estiverem rodando na máquina do desenvolvedor. Para executar o projeto de forma definitiva, siga as instruções da seção "Como rodar o projeto".

---

## Testando Recursos Específicos

### Responsividade (RNF02)
A página de resposta é adaptável a celulares. Para testar no navegador:
1. Abra um formulário público.
2. Pressione `F12` e ative o modo de dispositivo móvel (`Ctrl + Shift + M`).
3. Verifique a usabilidade dos inputs e botões em telas pequenas.

### Compartilhamento Público
Como o sistema roda localmente por padrão, para compartilhar o link com pessoas externas utilize um túnel:

```bash
# Em um terminal separado (com o projeto rodando)
npx cloudflared tunnel --url http://localhost:3000
```

O terminal gerará uma URL pública (ex: `https://...trycloudflare.com`). Crie o formulário a partir desse link para que o compartilhamento funcione externamente.

---

## Estrutura de Pastas

```text
cati-forms/
├── data/                 # Banco de dados SQLite (gerado automaticamente)
├── public/               # Frontend
│   ├── css/              # Estilos (Dark Mode)
│   ├── js/               # Lógica das páginas
│   └── *.html            # Telas do sistema
├── server.js             # API REST + Regras de Negócio
└── package.json          # Dependências
```

---

## Requisitos Atendidos

<details>
<summary><strong>Clique para expandir o checklist completo</strong></summary>

### Funcionais
- [x] RF01-RF02: Cadastro, Login e Logout.
- [x] RF03-RF07: Criação de formulários e tipos de perguntas.
- [x] RF08-RF09: Link público para resposta externa.
- [x] RF10-RF11: Validação de obrigatoriedade e justificativa.
- [x] RF12-RF13: Armazenamento independente e relacionado.
- [x] RF14: Visualização de respostas.
- [x] RF15-RF16: Exportação em CSV e PDF.

### Regras de Negócio
- [x] RN01-RN03: Usuário único e criação autenticada.
- [x] RN04-RN06: Perguntas obrigatórias, justificativa e múltipla escolha ilimitada.
- [x] RN07: Formulários imutáveis (bloqueio no backend).
- [x] RN08-RN11: E-mail opcional, respondentes externos e exportação.

### Não Funcionais
- [x] RNF01-RNF02: Usabilidade e responsividade.
- [x] RNF03-RNF04: Desempenho e acesso via navegador.
- [x] RNF05: Senhas criptografadas (hash).
- [x] RNF06: Sem níveis de acesso nesta versão.
- [x] RNF07-RNF08: Modularidade e modelagem de banco.

</details>

---

## Decisões de Projeto

*   **Sem botão de editar/excluir?** Decisão intencional para cumprir a RN07. O histórico de dados é preservado. Para versões futuras, planeja-se um sistema de arquivamento.
*   **Evoluções futuras:** Integração com o módulo de Controle de Pessoas, upload de imagens de capa, perfis de acesso e novos tipos de perguntas.

---

<p align="center">
  <i>Desenvolvido para o Banco de Talentos CATI Jr. 2026.</i>
</p>
```
