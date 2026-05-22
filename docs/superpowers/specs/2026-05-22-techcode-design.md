# Tech Code — Design Spec
**Data:** 2026-05-22  
**Projeto:** Sistema de gestão para laboratório de eletrônica automotiva  
**Stack:** Next.js 15 + MongoDB Atlas + Cloudinary + NextAuth.js v5

---

## 1. Visão Geral

Sistema web PWA para organizar serviços de reparo de centrais de injeção eletrônica (ECUs). Permite gestão de clientes, ordens de serviço com fila de trabalho, base de conhecimento por modelo de central, controle financeiro com comissões e sistema de garantia.

Referência de mercado: Reparador Inteligente AI — o Tech Code terá os mesmos recursos base acrescidos de fila de OS, base de conhecimento por ECU, controle detalhado de garantias e devolução de serviço. Interface web responsiva (mobile-first), sem necessidade de instalação — funciona perfeitamente no celular via navegador.

---

## 2. Plataforma e Deploy

| Item | Escolha |
|---|---|
| Plataforma | Web responsivo (mobile-first, funciona no celular via navegador) |
| Frontend | Next.js 15 com App Router |
| Hospedagem | Vercel (free tier) |
| Banco de dados | MongoDB Atlas M0 (free tier) |
| Armazenamento de fotos | Cloudinary (free tier, 25 GB) |
| Deploy | Automático via Vercel + GitHub |

**Custo inicial: R$ 0.** Tiers gratuitos suficientes para volume de laboratório pequeno/médio.

---

## 3. Stack Técnica

```
Frontend
├── Next.js 15 (App Router)
├── Tailwind CSS
├── shadcn/ui (componentes)
└── react-pdf (geração de PDF da OS)

Backend
├── Next.js API Routes (REST)
├── Mongoose (ODM)
├── NextAuth.js v5 (autenticação + sessões)
└── Cloudinary SDK (upload de fotos)

Infraestrutura
├── MongoDB Atlas (nuvem)
├── Cloudinary (nuvem)
└── Vercel (deploy + HTTPS automático)
```

---

## 4. Módulos do Sistema

| Módulo | Acesso |
|---|---|
| Dashboard | Admin |
| Clientes | Admin, Atendente, Técnico |
| Ordens de Serviço | Admin, Atendente, Técnico |
| Fila de Serviços | Admin, Atendente, Técnico |
| Centrais — Base de Conhecimento | Todos |
| Financeiro | Admin |
| Equipe | Admin |

---

## 5. Modelo de Dados (MongoDB)

### 5.1 Usuario
```js
{
  nome: String,
  email: String,           // único
  senha: String,           // bcrypt hash
  perfis: [String],        // ["admin", "tecnico"] — múltiplos permitidos
  comissao_pct: Number,    // % comissão (relevante se perfil inclui "tecnico")
  ativo: Boolean,
  created_at: Date
}
```

### 5.2 Cliente
```js
{
  nome: String,
  telefone: String,
  email: String,
  cpf_cnpj: String,        // opcional
  endereco: String,        // opcional
  created_at: Date
}
```

### 5.3 Central (ECU)
```js
{
  marca: String,           // ex: Bosch
  modelo: String,          // ex: ME17.9.53
  codigo: String,          // ex: 4CFR
  descricao: String        // opcional
}
```

### 5.4 Ordem de Serviço (OS)
```js
{
  numero_os: Number,       // auto-incremento
  cliente_id: ObjectId,
  central_id: ObjectId,
  tecnico_id: ObjectId,    // null quando na_fila
  status: String,          // "aberta" | "na_fila" | "em_andamento" | "concluida" | "devolvida" | "substituida"
  defeito_descricao: String,
  solucao_descricao: String,
  fotos: [String],         // URLs Cloudinary
  pecas: [{
    nome: String,
    custo: Number
  }],
  valor_cobrado: Number,
  custo_total_pecas: Number,  // calculado: soma de pecas[].custo
  lucro_liquido: Number,      // calculado: valor_cobrado - custo_total_pecas (negativo em devoluções)
  garantia_dias: Number,      // 0 = sem garantia
  garantia_ate: Date,         // calculado: closed_at + garantia_dias
  retornos_garantia: [{
    data: Date,
    descricao: String,
    tecnico_id: ObjectId
  }],
  devolucao: {
    tipo: String,             // "reembolso" | "substituicao"
    motivo: String,
    // reembolso
    valor_reembolsado: Number,
    // substituicao
    central_adquirida: String,
    custo_central: Number,
    novo_valor_cobrado: Number,
    data: Date
  },
  created_at: Date,
  closed_at: Date             // preenchido ao concluir ou devolver
}
```

### 5.5 Comissão
```js
{
  os_id: ObjectId,
  tecnico_id: ObjectId,
  valor_os: Number,
  pct_comissao: Number,
  valor_comissao: Number,     // calculado: valor_os * pct_comissao / 100
  pago: Boolean,              // admin marca quando pagar
  data_pagamento: Date
}
```

---

## 6. Fluxo de Status da OS

```
Aberta → Na Fila → Em Andamento → Concluída
                                 ↘ Devolvida (reembolso)
                                 ↘ Substituída (nova central)
```

- **Aberta**: OS criada, ainda não encaminhada
- **Na fila**: visível para todos os técnicos aceitarem
- **Em andamento**: técnico aceitou ou foi atribuído diretamente — OS pertence a ele
- **Concluída**: admin fecha, define garantia, gera PDF e comissão é criada automaticamente
- **Devolvida**: reparo não foi possível, valor reembolsado ao cliente — lucro negativo registrado no financeiro
- **Substituída**: reparo não foi possível, central substituída — novo valor cobrado registrado, comissão calculada sobre novo valor

---

## 7. Sistema de Fila

Ao criar uma OS, admin ou atendente escolhe:

1. **Adicionar à fila geral** → status vira `na_fila`, `tecnico_id = null`
2. **Atribuir direto a um técnico** → status vira `em_andamento`, `tecnico_id` preenchido

**Tela do técnico — aba "Fila":**
- Lista todas OS com status `na_fila`
- Botão "Aceitar" em cada card
- Ao aceitar: `tecnico_id` = usuário logado, status → `em_andamento`

**Tela do técnico — aba "Minhas OS":**
- Lista OS com `tecnico_id` = usuário logado e status `em_andamento`

---

## 8. Sistema de Garantia

**Ao fechar a OS** o admin define o prazo: sem garantia / 30 / 60 / 90 dias / personalizado.

`garantia_ate` é calculado automaticamente: `closed_at + garantia_dias`.

**OS dentro do prazo de garantia** exibe:
- Badge "🛡️ Garantia até DD/MM/AAAA"
- Botão "Registrar Retorno em Garantia"

**Ao registrar retorno:**
- Modal com campo de descrição do que foi feito + técnico responsável
- Retorno salvo em `retornos_garantia[]` na OS original
- Não gera nova cobrança nem nova comissão

---

## 9. Permissões

Usuários podem ter múltiplos perfis simultaneamente (ex: dono = admin + técnico). Permissões são aditivas.

| Funcionalidade | Admin | Atendente | Técnico |
|---|:---:|:---:|:---:|
| Dashboard financeiro | ✓ | — | — |
| Cadastrar / editar clientes | ✓ | ✓ | — |
| Ver histórico de OS do cliente | ✓ | ✓ | ✓ |
| Abrir nova OS | ✓ | ✓ | — |
| Atribuir OS a técnico | ✓ | ✓ | — |
| Ver fila de OS | ✓ | ✓ | ✓ |
| Aceitar OS da fila | ✓ | — | ✓ |
| Preencher defeito / solução / fotos / peças | ✓ | — | ✓ |
| Fechar OS e gerar PDF | ✓ | — | — |
| Definir garantia | ✓ | — | — |
| Registrar retorno em garantia | ✓ | ✓ | ✓ |
| Registrar devolução de serviço | ✓ | — | — |
| Base de conhecimento (centrais) | ✓ | ✓ | ✓ |
| Cadastrar novos modelos de central | ✓ | — | — |
| Ver financeiro completo | ✓ | — | — |
| Ver própria comissão | ✓ | — | ✓ |
| Gerenciar equipe | ✓ | — | — |

---

## 10. Telas Principais

### Dashboard (Admin)
- Cards: receita do mês, lucro líquido, OS abertas, comissões a pagar
- Lista de OS recentes com status colorido

### Clientes
- Lista com busca por nome/telefone
- Perfil: dados de contato + histórico completo de OS + botão "Nova OS"

### Ordens de Serviço
- Lista com filtros por status, cliente, central, técnico e período
- Formulário de criação: cliente, central (select), defeito, valor, peças, fotos, destino (fila ou técnico)
- Detalhe da OS: todas as informações, histórico de retornos em garantia, botão de PDF

### Fila de Serviços
- Aba "Na fila": cards com cliente, central, defeito e botão Aceitar
- Aba "Minhas OS": OS em andamento do técnico logado

### Centrais — Base de Conhecimento
- Lista de modelos com busca
- Detalhe: todos os reparos realizados naquele modelo com defeito, solução, cliente e data

### Financeiro (Admin)
- Receita, custo de peças e lucro por período
- Relatório mensal exportável
- Painel de comissões: valor por técnico, pago/pendente, marcar como pago

### Equipe (Admin)
- Lista de usuários com perfis e status ativo/inativo
- Cadastro: nome, email, senha inicial, perfis (múltiplos), comissão %

---

## 11. PDF da OS

Gerado com `react-pdf` ao fechar a OS. Contém:
- Logo e dados do laboratório
- Número da OS, data e cliente
- Modelo da central (ECU)
- Defeito relatado e solução aplicada
- Peças utilizadas com valores
- Valor total cobrado
- Prazo de garantia (se houver)
- Assinatura (campo)

---

## 12. Fora do Escopo

- Nota fiscal eletrônica (NF-e / NFS-e) — requer CNPJ, certificado digital e integração SEFAZ
- App nativo iOS/Android — web responsivo cobre o caso de uso mobile
- PWA / instalação no celular — desnecessário, o navegador já atende
- Integração com scanner automotivo
- Módulo de estoque de peças
