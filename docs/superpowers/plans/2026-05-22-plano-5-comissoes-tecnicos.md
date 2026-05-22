# Plano 5 — Comissões de Técnicos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar geração automática de comissões ao concluir OS, listagem com filtros por técnico e período, e marcação de pagamento.

**Architecture:** Novo `comissao.service.ts` com três funções (`gerarComissao`, `listarComissoes`, `marcarComoPago`). A API route `PUT /api/os/[id]` chama `gerarComissao` após concluir a OS. Duas novas API routes. Seletor de técnico adicionado ao dialog de conclusão da OS. Nova página `/comissoes` acessível apenas a admin.

**Tech Stack:** Next.js 16 App Router, TypeScript, Mongoose 9, NextAuth v5, Jest + mongodb-memory-server, shadcn/ui (select, card, button), Lucide React, Tailwind CSS.

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `models/Comissao.ts` | Modificar | Adicionar `created_at` ao schema e interface |
| `lib/services/comissao.service.ts` | Criar | `gerarComissao`, `listarComissoes`, `marcarComoPago` |
| `__tests__/services/comissao.service.test.ts` | Criar | Testes TDD do serviço |
| `lib/services/os.service.ts` | Modificar | Adicionar `tecnico_id?` ao `UpdateOSInput` |
| `app/api/os/[id]/route.ts` | Modificar | Chamar `gerarComissao` após concluir OS |
| `app/api/comissoes/route.ts` | Criar | GET com filtros (admin only) |
| `app/api/comissoes/[id]/pagar/route.ts` | Criar | POST marcar como pago (admin only) |
| `app/(dashboard)/os/[id]/page.tsx` | Modificar | Seletor de técnico no dialog de conclusão |
| `components/layout/Sidebar.tsx` | Modificar | Adicionar link Comissões (admin only) |
| `app/(dashboard)/comissoes/page.tsx` | Criar | Página de listagem de comissões |

---

## Task 1: Serviço de comissões + model + testes

**Files:**
- Modify: `models/Comissao.ts`
- Create: `__tests__/services/comissao.service.test.ts`
- Create: `lib/services/comissao.service.ts`

- [ ] **Step 1: Adicionar `created_at` ao model `models/Comissao.ts`**

Substitua o arquivo completo por:

```ts
import mongoose, { Schema, Document, Types } from "mongoose"

export interface IComissao extends Document {
  os_id: Types.ObjectId
  tecnico_id: Types.ObjectId
  valor_os: number
  pct_comissao: number
  valor_comissao: number
  pago: boolean
  data_pagamento?: Date
  created_at: Date
}

const ComissaoSchema = new Schema<IComissao>({
  os_id: { type: Schema.Types.ObjectId, ref: "OS", required: true },
  tecnico_id: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
  valor_os: { type: Number, required: true },
  pct_comissao: { type: Number, required: true },
  valor_comissao: { type: Number, required: true },
  pago: { type: Boolean, default: false },
  data_pagamento: Date,
  created_at: { type: Date, default: Date.now },
})

export default mongoose.models.Comissao ||
  mongoose.model<IComissao>("Comissao", ComissaoSchema)
```

- [ ] **Step 2: Escrever os testes em `__tests__/services/comissao.service.test.ts`**

```ts
import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import Central from "@/models/Central"
import Usuario from "@/models/Usuario"
import {
  gerarComissao,
  listarComissoes,
  marcarComoPago,
} from "@/lib/services/comissao.service"
import { criarOS, atualizarOS } from "@/lib/services/os.service"

let clienteId: string
let centralId: string
let tecnicoId: string

beforeAll(async () => {
  await connectDB()
})

beforeEach(async () => {
  const cli = await Cliente.create({ nome: "João", telefone: "11999990000" })
  clienteId = cli._id.toString()
  const cen = await Central.create({ marca: "Bosch", modelo: "ME17", codigo: "X1" })
  centralId = cen._id.toString()
  const tec = await Usuario.create({
    nome: "Técnico A",
    email: `tec${Date.now()}@teste.com`,
    senha: "hash",
    perfis: ["tecnico"],
    comissao_pct: 20,
  })
  tecnicoId = tec._id.toString()
})

describe("comissao service", () => {
  it("gerarComissao cria registro com valores corretos", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 500 })
    const comissao = await gerarComissao(os._id.toString(), tecnicoId)
    expect(comissao?.valor_os).toBe(500)
    expect(comissao?.pct_comissao).toBe(20)
    expect(comissao?.valor_comissao).toBe(100)
    expect(comissao?.pago).toBe(false)
  })

  it("gerarComissao retorna null para técnico com comissao_pct 0", async () => {
    const tec0 = await Usuario.create({
      nome: "Sem comissão",
      email: `sem${Date.now()}@teste.com`,
      senha: "hash",
      perfis: ["tecnico"],
      comissao_pct: 0,
    })
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 500 })
    const result = await gerarComissao(os._id.toString(), tec0._id.toString())
    expect(result).toBeNull()
  })

  it("gerarComissao retorna null para OS id inexistente", async () => {
    const result = await gerarComissao("000000000000000000000000", tecnicoId)
    expect(result).toBeNull()
  })

  it("listarComissoes retorna lista com populate de os_id e tecnico_id", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 300 })
    await gerarComissao(os._id.toString(), tecnicoId)
    const lista = await listarComissoes()
    expect(lista.length).toBeGreaterThanOrEqual(1)
    expect((lista[0].tecnico_id as { nome: string }).nome).toBe("Técnico A")
    expect((lista[0].os_id as { numero_os: number }).numero_os).toBeDefined()
  })

  it("listarComissoes filtra por tecnico_id", async () => {
    const outroTec = await Usuario.create({
      nome: "Outro Técnico",
      email: `outro${Date.now()}@teste.com`,
      senha: "hash",
      perfis: ["tecnico"],
      comissao_pct: 10,
    })
    const os1 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os1._id.toString(), { status: "concluida", valor_cobrado: 100 })
    await gerarComissao(os1._id.toString(), tecnicoId)
    const os2 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "B" })
    await atualizarOS(os2._id.toString(), { status: "concluida", valor_cobrado: 100 })
    await gerarComissao(os2._id.toString(), outroTec._id.toString())
    const lista = await listarComissoes({ tecnico_id: tecnicoId })
    expect(lista.length).toBe(1)
    expect((lista[0].tecnico_id as { nome: string }).nome).toBe("Técnico A")
  })

  it("marcarComoPago atualiza pago e data_pagamento", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 200 })
    const comissao = await gerarComissao(os._id.toString(), tecnicoId)
    const paga = await marcarComoPago(comissao!._id.toString())
    expect(paga?.pago).toBe(true)
    expect(paga?.data_pagamento).toBeDefined()
  })

  it("marcarComoPago retorna null para id inexistente", async () => {
    const result = await marcarComoPago("000000000000000000000000")
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 3: Rodar e confirmar que falha**

```bash
cd C:\Users\00asa\Desktop\techcode && npx jest __tests__/services/comissao.service.test.ts --no-coverage
```

Esperado: FAIL — "Cannot find module '@/lib/services/comissao.service'"

- [ ] **Step 4: Criar `lib/services/comissao.service.ts`**

```ts
import { connectDB } from "@/lib/db"
import Comissao from "@/models/Comissao"
import OS from "@/models/OS"
import Usuario from "@/models/Usuario"

export type Periodo = "este_mes" | "mes_anterior" | "este_ano" | "tudo"

function rangeParaPeriodo(periodo: Periodo): { $gte: Date; $lte?: Date } | null {
  const now = new Date()
  switch (periodo) {
    case "este_mes":
      return { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
    case "mes_anterior":
      return {
        $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        $lte: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      }
    case "este_ano":
      return { $gte: new Date(now.getFullYear(), 0, 1) }
    case "tudo":
      return null
  }
}

export async function gerarComissao(osId: string, tecnicoId: string) {
  await connectDB()
  const [os, tecnico] = await Promise.all([
    OS.findById(osId).lean(),
    Usuario.findById(tecnicoId).lean(),
  ])
  if (!os || !tecnico) return null
  if (!tecnico.comissao_pct || tecnico.comissao_pct === 0) return null
  const valor_comissao = (os.valor_cobrado * tecnico.comissao_pct) / 100
  return Comissao.create({
    os_id: osId,
    tecnico_id: tecnicoId,
    valor_os: os.valor_cobrado,
    pct_comissao: tecnico.comissao_pct,
    valor_comissao,
  })
}

export type ComissaoFiltros = {
  tecnico_id?: string
  periodo?: Periodo
}

export async function listarComissoes(filtros?: ComissaoFiltros) {
  await connectDB()
  const query: Record<string, unknown> = {}
  if (filtros?.tecnico_id) query.tecnico_id = filtros.tecnico_id
  if (filtros?.periodo) {
    const range = rangeParaPeriodo(filtros.periodo)
    if (range) query.created_at = range
  }
  return Comissao.find(query)
    .populate("os_id", "numero_os valor_cobrado")
    .populate("tecnico_id", "nome")
    .sort({ created_at: -1 })
    .lean()
}

export async function marcarComoPago(id: string) {
  await connectDB()
  return Comissao.findByIdAndUpdate(
    id,
    { $set: { pago: true, data_pagamento: new Date() } },
    { returnDocument: "after" }
  )
    .populate("os_id", "numero_os valor_cobrado")
    .populate("tecnico_id", "nome")
    .lean()
}
```

- [ ] **Step 5: Rodar e confirmar que passam**

```bash
cd C:\Users\00asa\Desktop\techcode && npx jest __tests__/services/comissao.service.test.ts --no-coverage
```

Esperado: PASS — 6 testes passando

- [ ] **Step 6: Rodar suite completa**

```bash
cd C:\Users\00asa\Desktop\techcode && npx jest --no-coverage
```

Esperado: todos passando (48 anteriores + 6 novos = 54 total)

- [ ] **Step 7: Commit**

```bash
cd C:\Users\00asa\Desktop\techcode && git add models/Comissao.ts lib/services/comissao.service.ts "__tests__/services/comissao.service.test.ts" && git commit -m "feat: serviço de comissões de técnicos"
```

---

## Task 2: Integrar geração de comissão na conclusão da OS

**Files:**
- Modify: `lib/services/os.service.ts`
- Modify: `app/api/os/[id]/route.ts`

- [ ] **Step 1: Adicionar `tecnico_id?` ao `UpdateOSInput` em `lib/services/os.service.ts`**

Localize o tipo:
```ts
export type UpdateOSInput = {
  status?: OSStatus
  solucao_descricao?: string
  pecas?: { nome: string; custo: number }[]
  valor_cobrado?: number
  garantia_dias?: number
  tecnico_id?: string
}
```

Substitua por (já tem `tecnico_id` — confirme que está presente; se não estiver, adicione-o):
```ts
export type UpdateOSInput = {
  status?: OSStatus
  solucao_descricao?: string
  pecas?: { nome: string; custo: number }[]
  valor_cobrado?: number
  garantia_dias?: number
  tecnico_id?: string
}
```

Se `tecnico_id` já consta no tipo (verifique o arquivo), pule esta etapa. Caso não esteja, adicione ao final do tipo.

- [ ] **Step 2: Garantir que `atualizarOS` persiste `tecnico_id`**

Localize o bloco de update em `atualizarOS` em `lib/services/os.service.ts`:
```ts
  if (data.status !== undefined) update.status = data.status
  if (data.solucao_descricao !== undefined) update.solucao_descricao = data.solucao_descricao
  if (data.tecnico_id !== undefined) update.tecnico_id = data.tecnico_id
```

A linha `if (data.tecnico_id !== undefined) update.tecnico_id = data.tecnico_id` deve estar presente. Se não estiver, adicione após a linha de `solucao_descricao`.

- [ ] **Step 3: Modificar `app/api/os/[id]/route.ts` para chamar `gerarComissao` após concluir**

Substitua o arquivo completo:

```ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarOSPorId, atualizarOS } from "@/lib/services/os.service"
import { gerarComissao } from "@/lib/services/comissao.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const os = await buscarOSPorId(id)
    if (!os) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    const os = await atualizarOS(id, body)
    if (!os) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    if (body.status === "concluida" && body.tecnico_id) {
      try {
        await gerarComissao(id, body.tecnico_id)
      } catch {
        // falha na comissão não reverte conclusão da OS
      }
    }
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar OS"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd C:\Users\00asa\Desktop\techcode && npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 5: Rodar suite completa**

```bash
cd C:\Users\00asa\Desktop\techcode && npx jest --no-coverage
```

Esperado: todos passando

- [ ] **Step 6: Commit**

```bash
cd C:\Users\00asa\Desktop\techcode && git add lib/services/os.service.ts "app/api/os/[id]/route.ts" && git commit -m "feat: integração de comissão na conclusão de OS"
```

---

## Task 3: API routes de comissões

**Files:**
- Create: `app/api/comissoes/route.ts`
- Create: `app/api/comissoes/[id]/pagar/route.ts`

- [ ] **Step 1: Criar `app/api/comissoes/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarComissoes } from "@/lib/services/comissao.service"
import type { Periodo, ComissaoFiltros } from "@/lib/services/comissao.service"

const PERIODOS_VALIDOS: Periodo[] = ["este_mes", "mes_anterior", "este_ano", "tudo"]

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!session.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const filtros: ComissaoFiltros = {}
  const tecnico_id = searchParams.get("tecnico_id")
  if (tecnico_id) filtros.tecnico_id = tecnico_id
  const periodo = searchParams.get("periodo") as Periodo | null
  if (periodo && PERIODOS_VALIDOS.includes(periodo)) filtros.periodo = periodo
  try {
    const dados = await listarComissoes(filtros)
    return NextResponse.json(dados)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Criar `app/api/comissoes/[id]/pagar/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { marcarComoPago } from "@/lib/services/comissao.service"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!session.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  try {
    const comissao = await marcarComoPago(id)
    if (!comissao) return NextResponse.json({ error: "Comissão não encontrada" }, { status: 404 })
    return NextResponse.json(comissao)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao registrar pagamento"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd C:\Users\00asa\Desktop\techcode && npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 4: Commit**

```bash
cd C:\Users\00asa\Desktop\techcode && git add "app/api/comissoes/" && git commit -m "feat: API routes de listagem e pagamento de comissões"
```

---

## Task 4: UI — seletor de técnico no dialog de conclusão + link no sidebar

**Files:**
- Modify: `app/(dashboard)/os/[id]/page.tsx`
- Modify: `components/layout/Sidebar.tsx`

### Modificação 1 — estado do técnico no dialog

Localize o bloco de estados do dialog de conclusão em `app/(dashboard)/os/[id]/page.tsx`. Encontre a linha:
```tsx
  const [erroConcluir, setErroConcluir] = useState("")
```

Logo após ela, adicione:
```tsx
  const [tecnicos, setTecnicos] = useState<{ _id: string; nome: string; comissao_pct: number }[]>([])
  const [tecnicoId, setTecnicoId] = useState("")
```

### Modificação 2 — carregar técnicos na montagem

Localize o `useEffect` de carregamento da OS:
```tsx
  useEffect(() => { carregar() }, [id])
```

Logo após ele, adicione:
```tsx
  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: { _id: string; nome: string; perfis: string[]; comissao_pct: number }[]) => {
        setTecnicos(lista.filter((u) => u.perfis.includes("tecnico")))
      })
      .catch(() => {})
  }, [])
```

### Modificação 3 — enviar `tecnico_id` na conclusão

Localize dentro da função `concluirOS()` o `JSON.stringify` do body:
```tsx
        body: JSON.stringify({
          status: "concluida",
          solucao_descricao: solucao,
          pecas,
          valor_cobrado: parseFloat(valorCobrado) || 0,
          garantia_dias: parseInt(garantiaDias) || 0,
        }),
```

Substitua por:
```tsx
        body: JSON.stringify({
          status: "concluida",
          solucao_descricao: solucao,
          pecas,
          valor_cobrado: parseFloat(valorCobrado) || 0,
          garantia_dias: parseInt(garantiaDias) || 0,
          ...(tecnicoId && { tecnico_id: tecnicoId }),
        }),
```

### Modificação 4 — campo de técnico no dialog JSX

No dialog de conclusão, localize:
```tsx
            <div className="space-y-2">
              <Label>Solução aplicada *</Label>
```

Imediatamente **antes** desse bloco, adicione:
```tsx
            {tecnicos.length > 0 && (
              <div className="space-y-2">
                <Label>Técnico responsável</Label>
                <Select value={tecnicoId} onValueChange={setTecnicoId}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Sem técnico (sem comissão)" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {tecnicos.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.nome} — {t.comissao_pct}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
```

### Modificação 5 — link Comissões no Sidebar

Em `components/layout/Sidebar.tsx`, localize o import de lucide-react:
```tsx
import {
  LayoutDashboard,
  Users,
  FileText,
  ListTodo,
  Cpu,
  DollarSign,
  UserCog,
  LogOut,
} from "lucide-react"
```

Substitua por:
```tsx
import {
  LayoutDashboard,
  Users,
  FileText,
  ListTodo,
  Cpu,
  DollarSign,
  UserCog,
  Receipt,
  LogOut,
} from "lucide-react"
```

Em seguida, localize o item de Financeiro em `NAV_ITEMS`:
```tsx
  { href: "/financeiro", label: "Financeiro", icon: DollarSign, roles: ["admin"] },
```

Logo após ele, adicione:
```tsx
  { href: "/comissoes", label: "Comissões", icon: Receipt, roles: ["admin"] },
```

- [ ] **Step 1: Aplicar Modificação 1** (estado `tecnicos` e `tecnicoId`)
- [ ] **Step 2: Aplicar Modificação 2** (useEffect para carregar técnicos)
- [ ] **Step 3: Aplicar Modificação 3** (`tecnico_id` no body de `concluirOS`)
- [ ] **Step 4: Aplicar Modificação 4** (campo Select no dialog JSX)
- [ ] **Step 5: Aplicar Modificação 5** (link Comissões no Sidebar)

- [ ] **Step 6: Verificar TypeScript**

```bash
cd C:\Users\00asa\Desktop\techcode && npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 7: Commit**

```bash
cd C:\Users\00asa\Desktop\techcode && git add "app/(dashboard)/os/[id]/page.tsx" "components/layout/Sidebar.tsx" && git commit -m "feat: seletor de técnico na conclusão de OS e link de comissões no menu"
```

---

## Task 5: Página de comissões

**Files:**
- Create: `app/(dashboard)/comissoes/page.tsx`

- [ ] **Step 1: Criar `app/(dashboard)/comissoes/page.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Periodo = "este_mes" | "mes_anterior" | "este_ano" | "tudo"

const PERIODO_LABELS: Record<Periodo, string> = {
  este_mes: "Este mês",
  mes_anterior: "Mês anterior",
  este_ano: "Este ano",
  tudo: "Todo o período",
}

type Tecnico = { _id: string; nome: string; perfis: string[] }

type Comissao = {
  _id: string
  os_id: { _id: string; numero_os: number; valor_cobrado: number } | null
  tecnico_id: { _id: string; nome: string } | null
  valor_os: number
  pct_comissao: number
  valor_comissao: number
  pago: boolean
  data_pagamento?: string
  created_at: string
}

export default function ComissoesPage() {
  const [periodo, setPeriodo] = useState<Periodo>("este_mes")
  const [tecnicoFiltro, setTecnicoFiltro] = useState("")
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [pagando, setPagando] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: Tecnico[]) => setTecnicos(lista.filter((u) => u.perfis.includes("tecnico"))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setCarregando(true)
    setErro("")
    const params = new URLSearchParams({ periodo })
    if (tecnicoFiltro) params.set("tecnico_id", tecnicoFiltro)
    fetch(`/api/comissoes?${params.toString()}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) { setErro("Erro ao carregar comissões."); return }
        setComissoes(await r.json())
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") setErro("Erro ao carregar comissões.")
      })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false) })
    return () => controller.abort()
  }, [periodo, tecnicoFiltro])

  async function pagar(id: string) {
    setPagando(id)
    try {
      const res = await fetch(`/api/comissoes/${id}/pagar`, { method: "POST" })
      if (res.ok) {
        const atualizada = await res.json()
        setComissoes((prev) => prev.map((c) => (c._id === id ? atualizada : c)))
      }
    } finally {
      setPagando(null)
    }
  }

  const totalPendente = comissoes.filter((c) => !c.pago).reduce((s, c) => s + c.valor_comissao, 0)
  const totalPago = comissoes.filter((c) => c.pago).reduce((s, c) => s + c.valor_comissao, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Comissões</h1>
        <div className="flex gap-2 flex-wrap items-center">
          {tecnicos.length > 0 && (
            <select
              value={tecnicoFiltro}
              onChange={(e) => setTecnicoFiltro(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none"
            >
              <option value="">Todos os técnicos</option>
              {tecnicos.map((t) => (
                <option key={t._id} value={t._id}>{t.nome}</option>
              ))}
            </select>
          )}
          {(Object.entries(PERIODO_LABELS) as [Periodo, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                periodo === p
                  ? "bg-white text-zinc-900 font-medium"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-amber-400 font-normal uppercase tracking-wide">Pendente</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-white">
              R$ {totalPendente.toFixed(2).replace(".", ",")}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-green-400 font-normal uppercase tracking-wide">Pago</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-white">
              R$ {totalPago.toFixed(2).replace(".", ",")}
            </p>
          </CardContent>
        </Card>
      </div>

      {erro && <p className="text-red-400 text-sm">{erro}</p>}

      {carregando ? (
        <p className="text-zinc-400 text-sm">Carregando...</p>
      ) : !comissoes.length ? (
        <p className="text-zinc-500 text-sm">Nenhuma comissão no período selecionado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 pr-4 font-normal">OS</th>
                <th className="text-left py-2 pr-4 font-normal">Técnico</th>
                <th className="text-right py-2 pr-4 font-normal">Valor OS</th>
                <th className="text-right py-2 pr-4 font-normal">%</th>
                <th className="text-right py-2 pr-4 font-normal">Comissão</th>
                <th className="text-center py-2 pr-4 font-normal">Status</th>
                <th className="text-right py-2 pr-4 font-normal">Data</th>
                <th className="text-right py-2 font-normal">Ação</th>
              </tr>
            </thead>
            <tbody>
              {comissoes.map((c) => (
                <tr key={c._id} className="border-b border-zinc-900 text-zinc-300">
                  <td className="py-2 pr-4 text-white font-medium">
                    {c.os_id ? `#${c.os_id.numero_os}` : "—"}
                  </td>
                  <td className="py-2 pr-4">{c.tecnico_id?.nome ?? "—"}</td>
                  <td className="py-2 pr-4 text-right">
                    R$ {c.valor_os.toFixed(2).replace(".", ",")}
                  </td>
                  <td className="py-2 pr-4 text-right">{c.pct_comissao}%</td>
                  <td className="py-2 pr-4 text-right font-medium text-white">
                    R$ {c.valor_comissao.toFixed(2).replace(".", ",")}
                  </td>
                  <td className="py-2 pr-4 text-center">
                    {c.pago ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">Pago</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400">Pendente</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right text-zinc-500">
                    {c.data_pagamento
                      ? new Date(c.data_pagamento).toLocaleDateString("pt-BR")
                      : new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-2 text-right">
                    {!c.pago && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pagar(c._id)}
                        disabled={pagando === c._id}
                        className="text-xs"
                      >
                        {pagando === c._id ? "..." : "Pagar"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd C:\Users\00asa\Desktop\techcode && npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 3: Rodar suite completa**

```bash
cd C:\Users\00asa\Desktop\techcode && npx jest --no-coverage
```

Esperado: 54 testes passando

- [ ] **Step 4: Commit**

```bash
cd C:\Users\00asa\Desktop\techcode && git add "app/(dashboard)/comissoes/" && git commit -m "feat: página de comissões com filtros e marcação de pagamento"
```
