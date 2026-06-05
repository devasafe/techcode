<h1 align="center">TechCode — Sistema de Ordens de Serviço</h1>

<p align="center">
  Gestão de ordens de serviço para assistência técnica de centrais eletrônicas — <b>em uso real</b> por um cliente.
  <br/>
  <i>Service-order management for an electronics repair shop — actually used in production by a client.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000?logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/NextAuth-000?logo=auth0&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white" />
</p>

<p align="center">🇧🇷 Português &nbsp;|&nbsp; <a href="#-english">🇺🇸 English</a></p>

<!-- 📸 Dica: adicione um print aqui → ![TechCode](docs/screenshot.png) -->

---

## 🇧🇷 Português

### Sobre
Sistema que controla todo o **ciclo de vida de uma ordem de serviço** (OS) — da abertura à conclusão — e o **status de pagamento** de cada serviço. Foi feito para uma assistência técnica e é **usado de verdade no dia a dia**.

### Funcionalidades
- 🧾 **Ciclo completo da OS**: aberta → na fila → em andamento → concluída (+ devolvida/substituída/cancelada)
- 💰 **Controle de pagamento** pós-conclusão (badge "pendente"/"pago")
- 🔎 Listagem, criação, edição e detalhe da OS
- 🔐 Autenticação com **NextAuth**
- 🎨 Interface dark com identidade própria

### Stack
**Next.js (App Router)** · **TypeScript** · **MongoDB/Mongoose** · **NextAuth** · **Tailwind CSS** · **Jest**

### Como rodar
```bash
npm install
cp .env.example .env.local   # configure MONGODB_URI e NEXTAUTH_SECRET
npm run dev                  # http://localhost:3000
```

---

## 🇺🇸 English

### About
A system that manages the full **service-order (SO) lifecycle** — from open to completed — and the **payment status** of each service. Built for a repair shop and **used in real daily operations**.

### Features
- 🧾 **Full SO lifecycle**: open → queued → in progress → completed (+ returned/replaced/cancelled)
- 💰 **Post-completion payment tracking** ("pending"/"paid" badge)
- 🔎 List, create, edit and detail views
- 🔐 Authentication with **NextAuth**

### Tech stack
**Next.js** · **TypeScript** · **MongoDB** · **NextAuth** · **Tailwind CSS** · **Jest**

### Getting started
```bash
npm install
cp .env.example .env.local   # set MONGODB_URI and NEXTAUTH_SECRET
npm run dev                  # http://localhost:3000
```

---

<p align="center">
  Feito por <b>Asafe Oliveira</b> · <a href="https://devasafe.vercel.app">Portfólio</a> · <a href="https://www.linkedin.com/in/devasafemota/">LinkedIn</a> · <a href="https://github.com/devasafe">GitHub</a>
</p>
