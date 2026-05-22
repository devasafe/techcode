# Design — Comissões de Técnicos (Plano 5)

**Data:** 2026-05-22
**Projeto:** Tech Code — sistema de gestão para laboratório de reparo de ECUs

---

## Objetivo

Implementar o sistema de comissões de técnicos: geração automática ao concluir uma OS, listagem com filtros e marcação de pagamento.

---

## Modelos existentes (não modificar)

**`models/Comissao.ts`** — já existe com os campos:
- `os_id` (ref OS)
- `tecnico_id` (ref Usuario)
- `valor_os` — valor cobrado da OS
- `pct_comissao` — percentual aplicado
- `valor_comissao` — valor calculado
- `pago` — boolean, default false
- `data_pagamento` — Date opcional

**`models/Usuario.ts`** — já tem `comissao_pct: Number` (0–100)

**`models/OS.ts`** — já tem `tecnico_id?: ObjectId`

---

## Arquitetura

### Serviço de comissões (`lib/services/comissao.service.ts`)

Três funções públicas:

**`gerarComissao(osId: string, tecnicoId: string)`**
- Busca a OS pelo ID para obter `valor_cobrado`
- Busca o técnico pelo ID para obter `comissao_pct`
- Se técnico não encontrado ou `comissao_pct === 0`, retorna `null` (sem criar registro)
- Cria `Comissao` com `valor_os`, `pct_comissao`, `valor_comissao = valor_cobrado * pct / 100`
- Retorna o documento criado

**`listarComissoes(filtros?)`**
- Aceita filtros opcionais: `tecnico_id: string` e `periodo: "este_mes" | "mes_anterior" | "este_ano" | "tudo"`
- Filtra por `createdAt` da própria Comissao (criada no momento da conclusão da OS)
- Popula `os_id` (campos: numero_os, valor_cobrado) e `tecnico_id` (campo: nome)
- Ordena por `createdAt` desc (mais recentes primeiro)

**`marcarComoPago(id: string)`**
- `findByIdAndUpdate` com `$set: { pago: true, data_pagamento: new Date() }`
- Retorna `null` se não encontrado
- Retorna o documento atualizado

### Integração na conclusão da OS (`app/api/os/[id]/route.ts`)

- O `PUT` existente chama `atualizarOS`
- `UpdateOSInput` (em `os.service.ts`) precisa receber `tecnico_id?: string` — adicionar ao tipo e ao bloco de update
- Se o body contiver `tecnico_id` e `status === "concluida"`, após o update bem-sucedido chama `gerarComissao(id, tecnico_id)`
- Falha na geração de comissão não reverte a conclusão da OS (log only)

### API routes

**`GET /api/comissoes`**
- Auth: admin only (403 para outros perfis)
- Query params: `tecnico_id` (opcional), `periodo` (opcional, default "tudo")
- Retorna array de comissões com populate

**`POST /api/comissoes/[id]/pagar`**
- Auth: admin only
- Chama `marcarComoPago(id)`
- 404 se não encontrado

**`GET /api/usuarios`** (já existe)
- Retorna todos os usuários (admin only)
- A página de comissões filtra os técnicos no frontend (`perfis.includes("tecnico")`)
- Também usado no dialog de conclusão da OS para o typeahead de técnico

### UI — Dialog de conclusão da OS

Modificar `app/(dashboard)/os/[id]/page.tsx`:
- Adicionar campo "Técnico responsável" no dialog de conclusão, usando typeahead igual ao de cliente/central no `OSForm`
- Campo opcional — OS pode ser concluída sem técnico (sem comissão)
- Ao confirmar, envia `tecnico_id` no body do PUT

### UI — Página de comissões (`app/(dashboard)/comissoes/page.tsx`)

- Filtro de técnico: dropdown `<select>` com lista de técnicos ativos (busca via `/api/usuarios?perfil=tecnico`)
- Filtro de período: pills igual ao Financeiro (este_mes, mes_anterior, este_ano, tudo)
- Tabela: OS # | Técnico | Valor OS | % | Comissão | Status | Data pagamento | Ação
- Status: badge verde "Pago" ou badge âmbar "Pendente"
- Ação: botão "Pagar" visível apenas nas pendentes; após clicar, confirma inline (disabled durante request)
- Totais no rodapé da tabela: total pendente e total pago no período

### UI — Menu lateral

Adicionar link "Comissões" no layout do dashboard, visível apenas para admin.

---

## Fluxo de dados

```
Conclusão da OS
  └─ PUT /api/os/[id] { status: "concluida", tecnico_id, valor_cobrado, ... }
       ├─ atualizarOS(id, data)         → OS atualizada
       └─ gerarComissao(id, tecnico_id) → Comissao criada (se pct > 0)

Listagem
  └─ GET /api/comissoes?tecnico_id=&periodo=
       └─ listarComissoes(filtros) → array populado

Pagamento
  └─ POST /api/comissoes/[id]/pagar
       └─ marcarComoPago(id) → Comissao atualizada
```

---

## Controle de acesso

| Rota | Perfil mínimo |
|---|---|
| GET /api/comissoes | admin |
| POST /api/comissoes/[id]/pagar | admin |
| Página /comissoes | admin |
| Link no menu | admin |

---

## O que não está no escopo

- Relatório de comissões por período no dashboard financeiro (pode ser Plano 6)
- Comissão por retorno de garantia ou substituição
- Edição de percentual por OS (sempre usa o `comissao_pct` do técnico)
- Histórico de alterações de pagamento
