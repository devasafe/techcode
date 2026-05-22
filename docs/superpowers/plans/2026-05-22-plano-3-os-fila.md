# Plano 3 — OS & Fila de Serviços

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de Ordens de Serviço (CRUD completo, transições de status, peças, conclusão) e a Fila de Serviços (kanban por status).

**Architecture:** Service layer em `lib/services/os.service.ts` expõe funções puras testadas com mongodb-memory-server. API routes em `app/api/os/` consomem o service. Páginas React (client components) consomem as API routes via fetch. Fora do escopo: upload de fotos, PDF, devoluções e retornos de garantia (Plano 4).

**Tech Stack:** Next.js 16 App Router, TypeScript, Mongoose 9, NextAuth v5, Jest + mongodb-memory-server, shadcn/ui (button, card, input, label, dialog, select), Lucide React, Tailwind CSS.

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `lib/services/os.service.ts` | Criar | CRUD + transições de status + cálculos |
| `__tests__/services/os.service.test.ts` | Criar | 8 testes de integração real |
| `app/api/os/route.ts` | Criar | GET lista + POST criar |
| `app/api/os/[id]/route.ts` | Criar | GET por id + PUT atualizar |
| `components/os/StatusBadge.tsx` | Criar | Badge reutilizável de status |
| `components/os/OSForm.tsx` | Criar | Formulário de criação de OS |
| `app/(dashboard)/os/page.tsx` | Substituir | Listagem com filtro por status |
| `app/(dashboard)/os/nova/page.tsx` | Criar | Página de criação |
| `app/(dashboard)/os/[id]/page.tsx` | Criar | Detalhe com ações e conclusão |
| `app/(dashboard)/fila/page.tsx` | Substituir | Kanban por status |
| `app/(dashboard)/clientes/[id]/page.tsx` | Modificar | Habilitar botão "Nova OS" |

---

## Task 1: OS Service + testes

**Files:**
- Create: `lib/services/os.service.ts`
- Create: `__tests__/services/os.service.test.ts`

- [ ] **Step 1: Escrever os testes**

```ts
// __tests__/services/os.service.test.ts
import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import Central from "@/models/Central"
import OS from "@/models/OS"
import {
  criarOS,
  listarOS,
  buscarOSPorId,
  atualizarOS,
  listarOSFila,
} from "@/lib/services/os.service"

let clienteId: string
let centralId: string

beforeAll(async () => {
  await connectDB()
})

beforeEach(async () => {
  const cli = await Cliente.create({ nome: "João Teste", telefone: "11999990000" })
  clienteId = cli._id.toString()
  const cen = await Central.create({ marca: "Bosch", modelo: "ME17.9.53", codigo: "4CFR" })
  centralId = cen._id.toString()
})

describe("OS service", () => {
  it("cria OS com numero_os auto-incrementado", async () => {
    const os1 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Não liga" })
    expect(os1.numero_os).toBe(1)
    expect(os1.status).toBe("aberta")
    const os2 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Falha sensor" })
    expect(os2.numero_os).toBe(2)
  })

  it("listarOS retorna todas ordenadas por created_at desc", async () => {
    await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Defeito A" })
    await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Defeito B" })
    const lista = await listarOS()
    expect(lista.length).toBe(2)
    expect(lista[0].defeito_descricao).toBe("Defeito B")
  })

  it("listarOS filtra por status", async () => {
    const os1 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    const os2 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "B" })
    await atualizarOS(os2._id.toString(), { status: "na_fila" })
    const abertas = await listarOS({ status: "aberta" })
    expect(abertas.length).toBe(1)
    expect(abertas[0]._id.toString()).toBe(os1._id.toString())
  })

  it("buscarOSPorId retorna OS com populate", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Teste" })
    const found = await buscarOSPorId(os._id.toString())
    expect(found?.defeito_descricao).toBe("Teste")
    expect((found?.cliente_id as { nome: string })?.nome).toBe("João Teste")
    expect((found?.central_id as { marca: string })?.marca).toBe("Bosch")
  })

  it("buscarOSPorId retorna null para id inexistente", async () => {
    const found = await buscarOSPorId("000000000000000000000000")
    expect(found).toBeNull()
  })

  it("atualizarOS muda status", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Teste" })
    const atualizado = await atualizarOS(os._id.toString(), { status: "na_fila" })
    expect(atualizado?.status).toBe("na_fila")
  })

  it("atualizarOS para concluida seta closed_at, custo_total_pecas, lucro_liquido e garantia_ate", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Teste" })
    const atualizado = await atualizarOS(os._id.toString(), {
      status: "concluida",
      solucao_descricao: "Reprogramado",
      pecas: [{ nome: "Capacitor", custo: 5 }],
      valor_cobrado: 150,
      garantia_dias: 90,
    })
    expect(atualizado?.status).toBe("concluida")
    expect(atualizado?.closed_at).toBeDefined()
    expect(atualizado?.custo_total_pecas).toBe(5)
    expect(atualizado?.lucro_liquido).toBe(145)
    expect(atualizado?.garantia_ate).toBeDefined()
  })

  it("listarOSFila retorna apenas OS com status ativo", async () => {
    const osAtiva = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Ativa" })
    const osConc = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Concluída" })
    await atualizarOS(osConc._id.toString(), { status: "concluida", valor_cobrado: 100 })
    const fila = await listarOSFila()
    expect(fila.length).toBe(1)
    expect(fila[0]._id.toString()).toBe(osAtiva._id.toString())
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx jest __tests__/services/os.service.test.ts --no-coverage
```

Esperado: FAIL com "Cannot find module '@/lib/services/os.service'"

- [ ] **Step 3: Implementar o serviço**

```ts
// lib/services/os.service.ts
import { connectDB } from "@/lib/db"
import OS from "@/models/OS"
import type { OSStatus } from "@/types"

export type CreateOSInput = {
  cliente_id: string
  central_id: string
  defeito_descricao: string
  tecnico_id?: string
}

export type UpdateOSInput = {
  status?: OSStatus
  solucao_descricao?: string
  pecas?: { nome: string; custo: number }[]
  valor_cobrado?: number
  garantia_dias?: number
  tecnico_id?: string
}

export async function listarOS(filtros?: { status?: OSStatus; cliente_id?: string }) {
  await connectDB()
  const query: Record<string, unknown> = {}
  if (filtros?.status) query.status = filtros.status
  if (filtros?.cliente_id) query.cliente_id = filtros.cliente_id
  return OS.find(query)
    .populate("cliente_id", "nome telefone")
    .populate("central_id", "marca modelo codigo")
    .sort({ created_at: -1 })
    .lean()
}

export async function buscarOSPorId(id: string) {
  await connectDB()
  return OS.findById(id)
    .populate("cliente_id", "nome telefone")
    .populate("central_id", "marca modelo codigo")
    .lean()
}

export async function criarOS(data: CreateOSInput) {
  await connectDB()
  return OS.create(data)
}

export async function atualizarOS(id: string, data: UpdateOSInput) {
  await connectDB()
  const update: Record<string, unknown> = {}

  if (data.status !== undefined) update.status = data.status
  if (data.solucao_descricao !== undefined) update.solucao_descricao = data.solucao_descricao
  if (data.tecnico_id !== undefined) update.tecnico_id = data.tecnico_id
  if (data.valor_cobrado !== undefined) update.valor_cobrado = data.valor_cobrado
  if (data.garantia_dias !== undefined) update.garantia_dias = data.garantia_dias

  if (data.pecas !== undefined) {
    update.pecas = data.pecas
    update.custo_total_pecas = data.pecas.reduce((s, p) => s + p.custo, 0)
  }

  if (data.status === "concluida") {
    const now = new Date()
    update.closed_at = now

    const atual = await OS.findById(id).lean()
    const vCobrado = data.valor_cobrado ?? atual?.valor_cobrado ?? 0
    const custo =
      data.pecas !== undefined
        ? data.pecas.reduce((s, p) => s + p.custo, 0)
        : atual?.custo_total_pecas ?? 0

    update.lucro_liquido = vCobrado - custo
    if (update.valor_cobrado === undefined) update.valor_cobrado = vCobrado

    if ((data.garantia_dias ?? 0) > 0) {
      const garantia = new Date(now)
      garantia.setDate(garantia.getDate() + (data.garantia_dias ?? 0))
      update.garantia_ate = garantia
    }
  }

  return OS.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" })
    .populate("cliente_id", "nome telefone")
    .populate("central_id", "marca modelo codigo")
    .lean()
}

export async function listarOSFila() {
  await connectDB()
  return OS.find({ status: { $in: ["aberta", "na_fila", "em_andamento"] } })
    .populate("cliente_id", "nome")
    .populate("central_id", "marca modelo")
    .sort({ created_at: 1 })
    .lean()
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx jest __tests__/services/os.service.test.ts --no-coverage
```

Esperado: PASS — 8 testes passando

- [ ] **Step 5: Rodar suite completa**

```bash
npx jest --no-coverage
```

Esperado: todos passando (27 anteriores + 8 novos = 35 total)

- [ ] **Step 6: Commit**

```bash
git add lib/services/os.service.ts __tests__/services/os.service.test.ts
git commit -m "feat: OS service com CRUD, status e cálculos de conclusão"
```

---

## Task 2: API routes de OS

**Files:**
- Create: `app/api/os/route.ts`
- Create: `app/api/os/[id]/route.ts`

- [ ] **Step 1: Criar `app/api/os/route.ts`**

```ts
// app/api/os/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarOS, listarOSFila, criarOS } from "@/lib/services/os.service"
import type { OSStatus } from "@/types"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  try {
    if (searchParams.get("fila") === "true") {
      const os = await listarOSFila()
      return NextResponse.json(os)
    }
    const status = (searchParams.get("status") ?? undefined) as OSStatus | undefined
    const cliente_id = searchParams.get("cliente_id") ?? undefined
    const os = await listarOS({ status, cliente_id })
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.perfis?.some((p) => ["admin", "atendente"].includes(p))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  try {
    const body = await req.json()
    const os = await criarOS(body)
    return NextResponse.json(os, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar OS"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
```

- [ ] **Step 2: Criar `app/api/os/[id]/route.ts`**

```ts
// app/api/os/[id]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarOSPorId, atualizarOS } from "@/lib/services/os.service"

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
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar OS"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 4: Commit**

```bash
git add app/api/os/
git commit -m "feat: API routes de OS (lista, criação, detalhe, atualização)"
```

---

## Task 3: Componentes StatusBadge e OSForm

**Files:**
- Create: `components/os/StatusBadge.tsx`
- Create: `components/os/OSForm.tsx`

- [ ] **Step 1: Criar `components/os/StatusBadge.tsx`**

```tsx
// components/os/StatusBadge.tsx
import type { OSStatus } from "@/types"

const STATUS_LABEL: Record<OSStatus, string> = {
  aberta: "Aberta",
  na_fila: "Na fila",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  devolvida: "Devolvida",
  substituida: "Substituída",
}

const STATUS_COLOR: Record<OSStatus, string> = {
  aberta: "bg-zinc-700 text-zinc-300",
  na_fila: "bg-amber-900/40 text-amber-400",
  em_andamento: "bg-violet-900/40 text-violet-400",
  concluida: "bg-green-900/40 text-green-400",
  devolvida: "bg-red-900/40 text-red-400",
  substituida: "bg-orange-900/40 text-orange-400",
}

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status as OSStatus] ?? status
  const color = STATUS_COLOR[status as OSStatus] ?? "bg-zinc-700 text-zinc-300"
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Criar `components/os/OSForm.tsx`**

Formulário de criação de OS com busca de cliente e central via typeahead.

```tsx
// components/os/OSForm.tsx
"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ClienteOpcao = { _id: string; nome: string; telefone: string }
type CentralOpcao = { _id: string; marca: string; modelo: string; codigo: string }

type OSFormProps = {
  clientePreenchido?: ClienteOpcao
  onSalvo: (osId: string) => void
  onCancelar: () => void
}

export function OSForm({ clientePreenchido, onSalvo, onCancelar }: OSFormProps) {
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)

  const [clienteId, setClienteId] = useState(clientePreenchido?._id ?? "")
  const [clienteDisplay, setClienteDisplay] = useState(
    clientePreenchido ? `${clientePreenchido.nome} — ${clientePreenchido.telefone}` : ""
  )
  const [buscaCliente, setBuscaCliente] = useState("")
  const [resultadosCliente, setResultadosCliente] = useState<ClienteOpcao[]>([])
  const timerCliente = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [centralId, setCentralId] = useState("")
  const [centralDisplay, setCentralDisplay] = useState("")
  const [buscaCentral, setBuscaCentral] = useState("")
  const [resultadosCentral, setResultadosCentral] = useState<CentralOpcao[]>([])
  const timerCentral = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleBuscaCliente(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setBuscaCliente(q)
    setClienteId("")
    setClienteDisplay("")
    if (timerCliente.current) clearTimeout(timerCliente.current)
    timerCliente.current = setTimeout(async () => {
      if (!q) { setResultadosCliente([]); return }
      try {
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`)
        if (res.ok) setResultadosCliente(await res.json())
      } catch { /* ignore */ }
    }, 300)
  }

  function selecionarCliente(c: ClienteOpcao) {
    setClienteId(c._id)
    setClienteDisplay(`${c.nome} — ${c.telefone}`)
    setBuscaCliente("")
    setResultadosCliente([])
  }

  function handleBuscaCentral(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setBuscaCentral(q)
    setCentralId("")
    setCentralDisplay("")
    if (timerCentral.current) clearTimeout(timerCentral.current)
    timerCentral.current = setTimeout(async () => {
      if (!q) { setResultadosCentral([]); return }
      try {
        const res = await fetch(`/api/centrais?q=${encodeURIComponent(q)}`)
        if (res.ok) setResultadosCentral(await res.json())
      } catch { /* ignore */ }
    }, 300)
  }

  function selecionarCentral(c: CentralOpcao) {
    setCentralId(c._id)
    setCentralDisplay(`${c.marca} ${c.modelo} — ${c.codigo}`)
    setBuscaCentral("")
    setResultadosCentral([])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!clienteId) { setErro("Selecione um cliente."); return }
    if (!centralId) { setErro("Selecione uma central."); return }
    setErro("")
    setCarregando(true)
    const form = new FormData(e.currentTarget)
    const body = {
      cliente_id: clienteId,
      central_id: centralId,
      defeito_descricao: form.get("defeito_descricao") as string,
    }
    try {
      const res = await fetch("/api/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setErro(data.error ?? "Erro ao criar OS.")
        return
      }
      const os = await res.json()
      onSalvo(os._id)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cliente */}
      <div className="space-y-2">
        <Label>Cliente *</Label>
        {clienteId ? (
          <div className="flex items-center gap-2">
            <p className="text-white text-sm flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2">
              {clienteDisplay}
            </p>
            <Button type="button" variant="outline" size="sm"
              onClick={() => { setClienteId(""); setClienteDisplay("") }}>
              Trocar
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              value={buscaCliente}
              onChange={handleBuscaCliente}
              placeholder="Buscar por nome ou telefone..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            {resultadosCliente.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-auto">
                {resultadosCliente.map((c) => (
                  <button key={c._id} type="button" onClick={() => selecionarCliente(c)}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700">
                    {c.nome} — {c.telefone}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Central */}
      <div className="space-y-2">
        <Label>Central *</Label>
        {centralId ? (
          <div className="flex items-center gap-2">
            <p className="text-white text-sm flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2">
              {centralDisplay}
            </p>
            <Button type="button" variant="outline" size="sm"
              onClick={() => { setCentralId(""); setCentralDisplay("") }}>
              Trocar
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              value={buscaCentral}
              onChange={handleBuscaCentral}
              placeholder="Buscar por marca, modelo ou código..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            {resultadosCentral.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-auto">
                {resultadosCentral.map((c) => (
                  <button key={c._id} type="button" onClick={() => selecionarCentral(c)}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700">
                    {c.marca} {c.modelo} — {c.codigo}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Defeito */}
      <div className="space-y-2">
        <Label>Descrição do defeito *</Label>
        <textarea
          name="defeito_descricao"
          required
          rows={3}
          placeholder="Descreva o defeito relatado pelo cliente..."
          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
      </div>

      {erro && <p className="text-red-400 text-sm">{erro}</p>}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={carregando}>
          {carregando ? "Criando..." : "Criar OS"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 4: Commit**

```bash
git add components/os/
git commit -m "feat: componentes StatusBadge e OSForm"
```

---

## Task 4: Página de listagem de OS

**Files:**
- Modify: `app/(dashboard)/os/page.tsx`

- [ ] **Step 1: Substituir o placeholder**

```tsx
// app/(dashboard)/os/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/os/StatusBadge"
import { Plus, ChevronRight } from "lucide-react"
import type { OSStatus } from "@/types"

type OSResumo = {
  _id: string
  numero_os: number
  status: OSStatus
  defeito_descricao: string
  valor_cobrado: number
  created_at: string
  cliente_id: { nome: string; telefone: string } | null
  central_id: { marca: string; modelo: string; codigo: string } | null
}

const STATUS_TABS: { value: OSStatus | ""; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "aberta", label: "Abertas" },
  { value: "na_fila", label: "Na fila" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluídas" },
]

export default function OSPage() {
  const router = useRouter()
  const [os, setOS] = useState<OSResumo[]>([])
  const [status, setStatus] = useState<OSStatus | "">("")
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  async function carregar(s: OSStatus | "") {
    setCarregando(true)
    setErro("")
    try {
      const params = s ? `?status=${s}` : ""
      const res = await fetch(`/api/os${params}`)
      if (!res.ok) { setErro("Erro ao carregar OS."); return }
      setOS(await res.json())
    } catch {
      setErro("Erro ao carregar OS.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar(status) }, [status])

  if (carregando && os.length === 0) {
    return <p className="text-zinc-400 text-sm py-8 text-center">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Ordens de Serviço</h1>
        <Button onClick={() => router.push("/os/nova")}>
          <Plus size={16} className="mr-2" />
          Nova OS
        </Button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              status === tab.value
                ? "bg-white text-zinc-900 font-medium"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {erro && <p className="text-red-400 text-sm text-center py-4">{erro}</p>}

      <div className="grid gap-3">
        {os.map((o) => (
          <Link key={o._id} href={`/os/${o._id}`}>
            <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">OS #{o.numero_os}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    {o.cliente_id && (
                      <p className="text-sm text-zinc-300">{o.cliente_id.nome}</p>
                    )}
                    {o.central_id && (
                      <p className="text-xs text-zinc-500">
                        {o.central_id.marca} {o.central_id.modelo}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 truncate mt-1">{o.defeito_descricao}</p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    {o.valor_cobrado > 0 && (
                      <p className="text-sm text-white">
                        R$ {o.valor_cobrado.toFixed(2).replace(".", ",")}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!carregando && os.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">
            {status ? "Nenhuma OS com este status." : "Nenhuma OS cadastrada ainda."}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/os/page.tsx"
git commit -m "feat: página de listagem de OS com filtro por status"
```

---

## Task 5: Página de criação de OS

**Files:**
- Create: `app/(dashboard)/os/nova/page.tsx`
- Modify: `app/(dashboard)/clientes/[id]/page.tsx` (habilitar botão "Nova OS")

- [ ] **Step 1: Criar `app/(dashboard)/os/nova/page.tsx`**

`useSearchParams` requer `Suspense` no Next.js 16.

```tsx
// app/(dashboard)/os/nova/page.tsx
"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { OSForm } from "@/components/os/OSForm"
import { ArrowLeft } from "lucide-react"

type ClienteOpcao = { _id: string; nome: string; telefone: string }

function NovaOSContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdParam = searchParams.get("cliente")
  const [clientePreenchido, setClientePreenchido] = useState<ClienteOpcao | undefined>()

  useEffect(() => {
    if (!clienteIdParam) return
    fetch(`/api/clientes/${clienteIdParam}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setClientePreenchido(data) })
  }, [clienteIdParam])

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-bold text-white">Nova Ordem de Serviço</h1>
      </div>
      <OSForm
        clientePreenchido={clientePreenchido}
        onSalvo={(id) => router.push(`/os/${id}`)}
        onCancelar={() => router.back()}
      />
    </div>
  )
}

export default function NovaOSPage() {
  return (
    <Suspense fallback={<p className="text-zinc-400 text-sm">Carregando...</p>}>
      <NovaOSContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Habilitar botão "Nova OS" em `app/(dashboard)/clientes/[id]/page.tsx`**

Localizar o trecho atual (linhas ~131-135):

```tsx
          <Button size="sm" disabled>
            <Plus size={14} className="mr-1" />
            Nova OS
          </Button>
```

Substituir por:

```tsx
          <Link href={`/os/nova?cliente=${id}`}>
            <Button size="sm">
              <Plus size={14} className="mr-1" />
              Nova OS
            </Button>
          </Link>
```

O import de `Link` já existe no topo do arquivo.

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/os/nova/page.tsx" "app/(dashboard)/clientes/[id]/page.tsx"
git commit -m "feat: página de criação de OS e habilitar link Nova OS no perfil do cliente"
```

---

## Task 6: Página de detalhe da OS

**Files:**
- Create: `app/(dashboard)/os/[id]/page.tsx`

A página mostra os dados completos da OS. Ações disponíveis dependem do status:
- `aberta` → botão "Colocar na fila"
- `na_fila` → botão "Iniciar serviço"
- `em_andamento` → botão "Concluir OS" (abre dialog)
- `concluida` → read-only com resultados financeiros

O dialog "Concluir OS" coleta: solução, peças, valor cobrado, dias de garantia.

- [ ] **Step 1: Criar `app/(dashboard)/os/[id]/page.tsx`**

```tsx
// app/(dashboard)/os/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/os/StatusBadge"
import { ArrowLeft, Trash2 } from "lucide-react"
import type { OSStatus } from "@/types"

type Peca = { nome: string; custo: number }

type OS = {
  _id: string
  numero_os: number
  status: OSStatus
  defeito_descricao: string
  solucao_descricao?: string
  pecas: Peca[]
  valor_cobrado: number
  custo_total_pecas: number
  lucro_liquido: number
  garantia_dias: number
  garantia_ate?: string
  created_at: string
  closed_at?: string
  cliente_id: { _id: string; nome: string; telefone: string } | null
  central_id: { _id: string; marca: string; modelo: string; codigo: string } | null
}

export default function OSDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [os, setOS] = useState<OS | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [abrirConcluir, setAbrirConcluir] = useState(false)

  // Estado do dialog de conclusão
  const [solucao, setSolucao] = useState("")
  const [valorCobrado, setValorCobrado] = useState("0")
  const [garantiaDias, setGarantiaDias] = useState("90")
  const [pecas, setPecas] = useState<Peca[]>([])
  const [nomePeca, setNomePeca] = useState("")
  const [custoPeca, setCustoPeca] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erroConcluir, setErroConcluir] = useState("")

  async function carregar() {
    setCarregando(true)
    try {
      const res = await fetch(`/api/os/${id}`)
      if (!res.ok) { router.push("/os"); return }
      const data = await res.json()
      setOS(data)
      setPecas(data.pecas ?? [])
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  async function atualizarStatus(novoStatus: OSStatus) {
    const res = await fetch(`/api/os/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    })
    if (res.ok) carregar()
  }

  function adicionarPeca() {
    if (!nomePeca.trim() || !custoPeca) return
    setPecas((prev) => [...prev, { nome: nomePeca.trim(), custo: parseFloat(custoPeca) || 0 }])
    setNomePeca("")
    setCustoPeca("")
  }

  async function concluirOS() {
    setErroConcluir("")
    setSalvando(true)
    try {
      const res = await fetch(`/api/os/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "concluida",
          solucao_descricao: solucao,
          pecas,
          valor_cobrado: parseFloat(valorCobrado) || 0,
          garantia_dias: parseInt(garantiaDias) || 0,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setErroConcluir(data.error ?? "Erro ao concluir OS.")
        return
      }
      setAbrirConcluir(false)
      carregar()
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <p className="text-zinc-400 text-sm">Carregando...</p>
  if (!os) return null

  const custoTotal = pecas.reduce((s, p) => s + p.custo, 0)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/os")}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">OS #{os.numero_os}</h1>
            <StatusBadge status={os.status} />
          </div>
          <p className="text-xs text-zinc-500">
            Aberta em {new Date(os.created_at).toLocaleDateString("pt-BR")}
            {os.closed_at && ` · Concluída em ${new Date(os.closed_at).toLocaleDateString("pt-BR")}`}
          </p>
        </div>
      </div>

      {/* Ações de status */}
      {os.status === "aberta" && (
        <Button onClick={() => atualizarStatus("na_fila")}>Colocar na fila</Button>
      )}
      {os.status === "na_fila" && (
        <Button onClick={() => atualizarStatus("em_andamento")}>Iniciar serviço</Button>
      )}
      {os.status === "em_andamento" && (
        <Button onClick={() => setAbrirConcluir(true)}>Concluir OS</Button>
      )}

      {/* Cliente + Central */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {os.cliente_id ? (
              <Link href={`/clientes/${os.cliente_id._id}`}
                className="text-white text-sm hover:underline font-medium">
                {os.cliente_id.nome}
              </Link>
            ) : (
              <p className="text-zinc-500 text-sm">—</p>
            )}
            {os.cliente_id && (
              <p className="text-xs text-zinc-500 mt-0.5">{os.cliente_id.telefone}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Central</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {os.central_id ? (
              <Link href={`/centrais/${os.central_id._id}`}
                className="text-white text-sm hover:underline font-medium">
                {os.central_id.marca} {os.central_id.modelo}
              </Link>
            ) : (
              <p className="text-zinc-500 text-sm">—</p>
            )}
            {os.central_id && (
              <p className="text-xs text-zinc-500 mt-0.5">Cód: {os.central_id.codigo}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Defeito */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Defeito relatado</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-white text-sm">{os.defeito_descricao}</p>
        </CardContent>
      </Card>

      {/* Solução (quando concluída) */}
      {os.solucao_descricao && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Solução aplicada</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-white text-sm">{os.solucao_descricao}</p>
          </CardContent>
        </Card>
      )}

      {/* Peças e resultado financeiro (quando concluída) */}
      {os.status === "concluida" && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Resultado</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2 text-sm">
            {os.pecas.length > 0 && (
              <div>
                <p className="text-zinc-400 text-xs mb-1">Peças utilizadas</p>
                {os.pecas.map((p, i) => (
                  <div key={i} className="flex justify-between text-zinc-300">
                    <span>{p.nome}</span>
                    <span>R$ {p.custo.toFixed(2).replace(".", ",")}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-zinc-800 pt-2 space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Custo de peças</span>
                <span>R$ {os.custo_total_pecas.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-white font-medium">
                <span>Valor cobrado</span>
                <span>R$ {os.valor_cobrado.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>Lucro líquido</span>
                <span>R$ {os.lucro_liquido.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>
            {os.garantia_ate && (
              <p className="text-zinc-400 text-xs">
                Garantia até {new Date(os.garantia_ate).toLocaleDateString("pt-BR")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog — Concluir OS */}
      <Dialog open={abrirConcluir} onOpenChange={setAbrirConcluir}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Concluir OS #{os.numero_os}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Solução aplicada *</Label>
              <textarea
                value={solucao}
                onChange={(e) => setSolucao(e.target.value)}
                rows={3}
                required
                placeholder="Descreva o que foi feito..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <Label>Peças utilizadas</Label>
              {pecas.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-zinc-300">{p.nome}</span>
                  <span className="text-zinc-400">R$ {p.custo.toFixed(2).replace(".", ",")}</span>
                  <button type="button" onClick={() => setPecas(pecas.filter((_, idx) => idx !== i))}>
                    <Trash2 size={14} className="text-zinc-500 hover:text-red-400" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={nomePeca} onChange={(e) => setNomePeca(e.target.value)}
                  placeholder="Nome da peça" className="bg-zinc-800 border-zinc-700 text-white flex-1" />
                <Input value={custoPeca} onChange={(e) => setCustoPeca(e.target.value)}
                  placeholder="Custo (R$)" type="number" step="0.01" min="0"
                  className="bg-zinc-800 border-zinc-700 text-white w-28" />
                <Button type="button" variant="outline" onClick={adicionarPeca}>+</Button>
              </div>
              {pecas.length > 0 && (
                <p className="text-xs text-zinc-500">
                  Total peças: R$ {custoTotal.toFixed(2).replace(".", ",")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor cobrado (R$) *</Label>
                <Input value={valorCobrado} onChange={(e) => setValorCobrado(e.target.value)}
                  type="number" step="0.01" min="0"
                  className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label>Garantia (dias)</Label>
                <Input value={garantiaDias} onChange={(e) => setGarantiaDias(e.target.value)}
                  type="number" min="0"
                  className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>

            {parseFloat(valorCobrado) > 0 && (
              <p className="text-xs text-zinc-400">
                Lucro estimado: R$ {(parseFloat(valorCobrado) - custoTotal).toFixed(2).replace(".", ",")}
              </p>
            )}

            {erroConcluir && <p className="text-red-400 text-sm">{erroConcluir}</p>}

            <div className="flex gap-2 pt-2">
              <Button onClick={concluirOS} disabled={salvando || !solucao.trim()}>
                {salvando ? "Salvando..." : "Confirmar conclusão"}
              </Button>
              <Button variant="outline" onClick={() => setAbrirConcluir(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/os/[id]/page.tsx"
git commit -m "feat: página de detalhe da OS com transições de status e conclusão"
```

---

## Task 7: Página da Fila de Serviços

**Files:**
- Modify: `app/(dashboard)/fila/page.tsx`

A fila mostra OS ativas (aberta, na_fila, em_andamento) agrupadas em colunas. Clicando num card navega para o detalhe da OS.

- [ ] **Step 1: Substituir o placeholder**

```tsx
// app/(dashboard)/fila/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/os/StatusBadge"
import type { OSStatus } from "@/types"

type OSFila = {
  _id: string
  numero_os: number
  status: OSStatus
  defeito_descricao: string
  created_at: string
  cliente_id: { nome: string } | null
  central_id: { marca: string; modelo: string } | null
}

const COLUNAS: { status: OSStatus; label: string }[] = [
  { status: "aberta", label: "Abertas" },
  { status: "na_fila", label: "Na fila" },
  { status: "em_andamento", label: "Em andamento" },
]

export default function FilaPage() {
  const [os, setOS] = useState<OSFila[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  async function carregar() {
    setCarregando(true)
    setErro("")
    try {
      const res = await fetch("/api/os?fila=true")
      if (!res.ok) { setErro("Erro ao carregar fila."); return }
      setOS(await res.json())
    } catch {
      setErro("Erro ao carregar fila.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  if (carregando) return <p className="text-zinc-400 text-sm py-8 text-center">Carregando...</p>

  const porStatus = (status: OSStatus) => os.filter((o) => o.status === status)

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Fila de Serviços</h1>

      {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}

      <div className="grid grid-cols-3 gap-4">
        {COLUNAS.map((col) => {
          const lista = porStatus(col.status)
          return (
            <div key={col.status}>
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={col.status} />
                <span className="text-zinc-400 text-sm">({lista.length})</span>
              </div>
              <div className="space-y-2">
                {lista.map((o) => (
                  <Link key={o._id} href={`/os/${o._id}`}>
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                      <CardContent className="py-3 px-3">
                        <p className="text-white text-sm font-medium mb-1">OS #{o.numero_os}</p>
                        {o.cliente_id && (
                          <p className="text-xs text-zinc-400">{o.cliente_id.nome}</p>
                        )}
                        {o.central_id && (
                          <p className="text-xs text-zinc-500">
                            {o.central_id.marca} {o.central_id.modelo}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 truncate mt-1">{o.defeito_descricao}</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {new Date(o.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {lista.length === 0 && (
                  <p className="text-zinc-600 text-xs text-center py-4">Nenhuma</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript e testes**

```bash
npx tsc --noEmit
npx jest --no-coverage
```

Esperado: TypeScript limpo, todos os 35 testes passando

- [ ] **Step 3: Commit final**

```bash
git add "app/(dashboard)/fila/page.tsx"
git commit -m "feat: página da fila de serviços (kanban por status)"
```
