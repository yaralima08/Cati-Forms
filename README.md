# 🚀 Cati Forms

> **Plataforma de criação, compartilhamento e análise de formulários.**  
> *Projeto desenvolvido para o Banco de Talentos 2026 da CATI Jr.*

O **Cati Forms** não é apenas um clone do Google Forms. Ele foi desenhado para ser uma ferramenta interna de alta performance, com uma interface moderna (Dark Mode), foco na experiência do usuário e uma API preparada para o futuro.

---

## 🎯 O Desafio (O que foi pedido)

Segundo o documento de requisitos do Banco de Talentos, a CATI Jr. precisava de uma plataforma web para:
1. Criar formulários dinâmicos (Discursiva, Múltipla Escolha e Escolha Única c/ Justificativa).
2. Compartilhar links públicos para pessoas responderem **sem precisar de cadastro**.
3. Garantir que **todas as perguntas fossem obrigatórias** e validadas no servidor (anti-fraude).
4. Armazenar as respostas de forma segura e independente.
5. Exportar os dados coletados em **CSV** (para o Excel) e **PDF** (para relatórios).
6. Ter uma interface simples, responsiva e que não exigisse treinamento prévio.

---

## 💡 O que foi construído (A Solução)

Entregamos um sistema completo, com backend e frontend separados, seguro e modular.

### 🎨 Design & Usabilidade (RNF01, RNF02)
*   **Dark Mode Premium:** Fugimos do visual genérico de formulários brancos. Usamos uma paleta escura inspirada nas melhores ferramentas do mercado (Linear, Vercel, GitHub) com os detalhes nas cores da CATI Jr. (Azul e Magenta).
*   **Zero Curva de Aprendizado:** O criador clica em "+ Discursiva", preenche o campo e o sistema já foca automaticamente na próxima etapa.
*   **Responsivo:** Testado para funcionar perfeitamente desde o monitor do escritório até o celular do candidato.

### 🛡️ Segurança e Integridade (RNs e RNF05)
*   **Senhas Seguras:** Hash de senhas usando `bcrypt`.
*   **Sessões à Prova de Falhas:** Autenticação via `JWT` (JSON Web Token) com expiração.
*   **Blindagem do Formulário (RN07):** Formulários são imutáveis após a criação. O backend bloqueia qualquer tentativa de edição ou exclusão (`PUT`, `PATCH`, `DELETE`).
*   **Validação Dupla:** As regras de negócio (perguntas obrigatórias, justificativa obrigatória) são validadas no frontend para a experiência do usuário, e **também no backend** (para impedir burlas via Postman ou scripts).

### ⚙️ Arquitetura Técnica (RNF07, RNF08)
*   **Backend:** Node.js + Express.
*   **Banco de Dados:** SQLite (persistente em arquivo), modelado com entidades independentes (`forms`, `questions`, `responses`, `answers`) e integridade referencial (`ON DELETE CASCADE`).
*   **Frontend:** HTML5, CSS3 puro (sem frameworks pesados) e JavaScript Vanilla (ES6+).
*   **Exportação Nativa:** Geração de CSV com separador `;` e BOM UTF-8 (abre perfeitamente no Excel brasileiro) e PDF gerado dinamicamente com `PDFKit`.

---

## 🚀 Como rodar na sua máquina

### Pré-requisitos
*   Node.js (v18 ou superior) instalado.
*   NPM instalado.

### Passo a passo

1. Clone este repositório.
2. Instale as dependências:
   ```bash
   npm install
