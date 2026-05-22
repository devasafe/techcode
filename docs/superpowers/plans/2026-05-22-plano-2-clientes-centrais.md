# Plano 2 — Clientes e Centrais

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar CRUD completo de Clientes (com histórico de OS) e Centrais (com base de conhecimento de reparos por modelo).

**Architecture:** Segue o padrão do Plano 1 — service layer em `lib/services/` (testável sem HTTP), API routes finas em `app/api/`, páginas client-side com fetch. Modelos `Cliente.ts` e `Central.ts` já existem. O modelo `OS.ts` já existe e é usado nas queries de histórico/knowledge base.

**Tech Stack:** Next.js 16 App Router, Mongoose 9, NextAuth v5 (auth nas rotas), Jest + mongodb-memory-server (testes), Tailwind CSS + shadcn/ui (UI).

---

## Contexto do projeto (ler antes de começar)

```
techcode/
├── models/
│   ├── Cliente.ts       ← já existe (nome, telefone, email?, cpf_cnpj?, endereco?)
│   ├── Central.ts       ← já existe (marca, modelo, codigo, descricao?)
│   └── OS.ts            ← já existe (cliente_id, central_id, status, defeito_descricao, etc.)
├── lib/
│   ├── db.ts            ← connectDB() singleton
│   └── services/
│       └── usuario.service.ts  ← padrão a seguir
├── app/
│   ├── api/
│   │   └── usuarios/    ← padrão de rotas a seguir
│   └── (dashboard)/
│       ├── layout.tsx   ← server component, auth() + Sidebar
│       ├── clientes/page.tsx   ← placeholder, será substituído
│       └── centrais/page.tsx  ← placeholder, será substituído
├── components/
│   └── equipe/
│       └── UsuarioForm.tsx  ← padrão de formulário a seguir
└── __tests__/
    └── services/
        └── usuario.service.test.ts  ← padrão de teste a seguir
```

**Padrão de params em route handlers (Next.js 16):**
```ts
type Params = { params: Promise<{ id: string }> }
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  // ...
}
```

**Padrão de auth check:**
```ts
const session = await auth()
if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
// para restrição de perfil:
if (!session?.user?.perfis?.some(p => ["admin", "atendente"].includes(p))) {
  return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
}
```

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `lib/services/cliente.service.ts` | Criar |
| `lib/services/central.service.ts` | Criar |
| `__tests__/services/cliente.service.test.ts` | Criar |
| `__tests__/services/central.service.test.ts` | Criar |
| `app/api/clientes/route.ts` | Criar |
| `app/api/clientes/[id]/route.ts` | Criar |
| `app/api/clientes/[id]/os/route.ts` | Criar |
| `app/api/centrais/route.ts` | Criar |
| `app/api/centrais/[id]/route.ts` | Criar |
| `app/api/centrais/[id]/reparos/route.ts` | Criar |
| `components/clientes/ClienteForm.tsx` | Criar |
| `components/centrais/CentralForm.tsx` | Criar |
| `app/(dashboard)/clientes/page.tsx` | Substituir placeholder |
| `app/(dashboard)/clientes/[id]/page.tsx` | Criar |
| `app/(dashboard)/centrais/page.tsx` | Substituir placeholder |
| `app/(dashboard)/centrais/[id]/page.tsx` | Criar |

---

## Task 1: Serviço de clientes + testes

**Files:**
- Create: `lib/services/cliente.service.ts`
- Create: `__tests__/services/cliente.service.test.ts`

- [ ] **Step 1: Escrever o teste que vai falhar**

```ts
// __tests__/services/cliente.service.test.ts
import {
  criarCliente,
  listarClientes,
  buscarClientePorId,
  atualizarCliente,
  listarOSDoCliente,
} from "@/lib/services/cliente.service"

describe("cliente.service", () => {
  const dadosBase = {
    nome: "Maria Silva",
    telefone: "11999990000",
  }

  it("cria cliente com campos obrigatórios", async () => {
    const cliente = await criarCliente(dadosBase)
    expect(cliente.nome).toBe("Maria Silva")
    expect(cliente.telefone).toBe("11999990000")
  })

  it("lista todos os clientes ordenados por nome", async () => {
    await criarCliente({ nome: "Zé Costa", telefone: "11888880000" })
    await criarCliente(dadosBase)
    const lista = await listarClientes()
    expect(lista.length).toBe(2)
    expect(lista[0].nome).toBe("Maria Silva")
  })

  it("filtra clientes por nome", async () => {
    await criarCliente(dadosBase)
    await criarCliente({ nome: "João Costa", telefone: "11888880000" })
    const lista = await listarClientes("Maria")
    expect(lista.length).toBe(1)
    expect(lista[0].nome).toBe("Maria Silva")
  })

  it("filtra clientes por telefone", async () => {
    await criarCliente(dadosBase)
    await criarCliente({ nome: "João Costa", telefone: "11888880000" })
    const lista = await listarClientes("8888")
    expect(lista.length).toBe(1)
    expect(lista[0].nome).toBe("João Costa")
  })

  it("busca cliente por id", async () => {
    const criado = await criarCliente(dadosBase)
    const encontrado = await buscarClientePorId(criado._id.toString())
    expect(encontrado?.nome).toBe("Maria Silva")
  })

  it("retorna null para id inexistente", async () => {
    const encontrado = await buscarClientePorId("000000000000000000000000")
    expect(encontrado).toBeNull()
  })

  it("atualiza dados do cliente", async () => {
    const criado = await criarCliente(dadosBase)
    const atualizado = await atualizarCliente(criado._id.toString(), { nome: "Maria Santos" })
    expect(atualizado?.nome).toBe("Maria Santos")
    expect(atualizado?.telefone).toBe("11999990000")
  })

  it("listarOSDoCliente retorna array vazio quando não há OS", async () => {
    const criado = await criarCliente(dadosBase)
    const os = await listarOSDoCliente(criado._id.toString())
    expect(os).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx jest __tests__/services/cliente.service.test.ts --no-coverage
```

Esperado: FAIL com "Cannot find module '@/lib/services/cliente.service'"

- [ ] **Step 3: Implementar o serviço**

```ts
// lib/services/cliente.service.ts
import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import OS from "@/models/OS"

export type CreateClienteInput = {
  nome: string
  telefone: string
  email?: string
  cpf_cnpj?: string
  endereco?: string
}

export type UpdateClienteInput = Partial<CreateClienteInput>

export async function listarClientes(q?: string) {
  await connectDB()
  const filtro = q
    ? { $or: [{ nome: new RegExp(q, "i") }, { telefone: new RegExp(q, "i") }] }
    : {}
  return Cliente.find(filtro).sort({ nome: 1 }).lean()
}

export async function buscarClientePorId(id: string) {
  await connectDB()
  return Cliente.findById(id).lean()
}

export async function criarCliente(data: CreateClienteInput) {
  await connectDB()
  return Cliente.create(data)
}

export async function atualizarCliente(id: string, data: UpdateClienteInput) {
  await connectDB()
  return Cliente.findByIdAndUpdate(id, data, { returnDocument: "after" }).lean()
}

export async function listarOSDoCliente(clienteId: string) {
  await connectDB()
  return OS.find({ cliente_id: clienteId })
    .populate("central_id", "marca modelo codigo")
    .sort({ created_at: -1 })
    .lean()
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx jest __tests__/services/cliente.service.test.ts --no-coverage
```

Esperado: PASS — 8 testes passando

- [ ] **Step 5: Commit**

```bash
git add lib/services/cliente.service.ts __tests__/services/cliente.service.test.ts
git commit -m "feat: cliente service com CRUD e histórico de OS"
```

---

## Task 2: API routes de clientes

**Files:**
- Create: `app/api/clientes/route.ts`
- Create: `app/api/clientes/[id]/route.ts`
- Create: `app/api/clientes/[id]/os/route.ts`

- [ ] **Step 1: Criar `app/api/clientes/route.ts`**

```ts
// app/api/clientes/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarClientes, criarCliente } from "@/lib/services/cliente.service"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? undefined
  const clientes = await listarClientes(q)
  return NextResponse.json(clientes)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.perfis?.some((p) => ["admin", "atendente"].includes(p))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  try {
    const body = await req.json()
    const cliente = await criarCliente(body)
    return NextResponse.json(cliente, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar cliente"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
```

- [ ] **Step 2: Criar `app/api/clientes/[id]/route.ts`**

```ts
// app/api/clientes/[id]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarClientePorId, atualizarCliente } from "@/lib/services/cliente.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  const cliente = await buscarClientePorId(id)
  if (!cliente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(cliente)
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.perfis?.some((p) => ["admin", "atendente"].includes(p))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    const cliente = await atualizarCliente(id, body)
    if (!cliente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(cliente)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar cliente"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
```

- [ ] **Step 3: Criar `app/api/clientes/[id]/os/route.ts`**

```ts
// app/api/clientes/[id]/os/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarOSDoCliente } from "@/lib/services/cliente.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  const os = await listarOSDoCliente(id)
  return NextResponse.json(os)
}
```

- [ ] **Step 4: Testar as rotas manualmente**

Com o servidor rodando (`npm run dev`), testar no browser:
- `GET /api/clientes` → deve retornar `[]` (banco vazio)
- `POST /api/clientes` com body `{"nome":"João","telefone":"11999990000"}` via fetch no console do browser:

```js
fetch('/api/clientes', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({nome: 'João Silva', telefone: '11999990000'})
}).then(r => r.json()).then(console.log)
```

Esperado: objeto cliente com `_id` gerado

- [ ] **Step 5: Commit**

```bash
git add app/api/clientes/
git commit -m "feat: API routes de clientes (CRUD + histórico de OS)"
```

---

## Task 3: Componente ClienteForm (criar e editar)

**Files:**
- Create: `components/clientes/ClienteForm.tsx`

- [ ] **Step 1: Criar o componente**

O componente suporta dois modos:
- Sem `cliente` prop → cria (POST `/api/clientes`)
- Com `cliente` prop → edita (PUT `/api/clientes/:id`)

```tsx
// components/clientes/ClienteForm.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ClienteData = {
  _id: string
  nome: string
  telefone: string
  email?: string
  cpf_cnpj?: string
  endereco?: string
}

type ClienteFormProps = {
  cliente?: ClienteData
  onSalvo: () => void
  onCancelar: () => void
}

export function ClienteForm({ cliente, onSalvo, onCancelar }: ClienteFormProps) {
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const editando = !!cliente

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro("")
    setCarregando(true)
    const form = new FormData(e.currentTarget)
    const body = {
      nome: form.get("nome") as string,
      telefone: form.get("telefone") as string,
      email: (form.get("email") as string) || undefined,
      cpf_cnpj: (form.get("cpf_cnpj") as string) || undefined,
      endereco: (form.get("endereco") as string) || undefined,
    }
    const res = await fetch(
      editando ? `/api/clientes/${cliente._id}` : "/api/clientes",
      {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )
    setCarregando(false)
    if (!res.ok) {
      const data = await res.json()
      setErro(data.error ?? "Erro ao salvar.")
      return
    }
    onSalvo()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input
          name="nome"
          required
          defaultValue={cliente?.nome}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Telefone *</Label>
        <Input
          name="telefone"
          required
          defaultValue={cliente?.telefone}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          name="email"
          type="email"
          defaultValue={cliente?.email}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>CPF / CNPJ</Label>
        <Input
          name="cpf_cnpj"
          defaultValue={cliente?.cpf_cnpj}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Endereço</Label>
        <Input
          name="endereco"
          defaultValue={cliente?.endereco}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      {erro && <p className="text-red-400 text-sm">{erro}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={carregando}>
          {carregando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verificar que TypeScript compila sem erro**

```bash
npx tsc --noEmit
```

Esperado: sem erros em `components/clientes/ClienteForm.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/clientes/ClienteForm.tsx
git commit -m "feat: componente ClienteForm (criar e editar)"
```

---

## Task 4: Página de listagem de clientes

**Files:**
- Modify: `app/(dashboard)/clientes/page.tsx`

- [ ] **Step 1: Substituir o placeholder**

```tsx
// app/(dashboard)/clientes/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClienteForm } from "@/components/clientes/ClienteForm"
import { Search, UserPlus, ChevronRight } from "lucide-react"

type Cliente = {
  _id: string
  nome: string
  telefone: string
  email?: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState("")
  const [abrirForm, setAbrirForm] = useState(false)

  async function carregar(q?: string) {
    const params = q ? `?q=${encodeURIComponent(q)}` : ""
    const res = await fetch(`/api/clientes${params}`)
    if (!res.ok) return
    setClientes(await res.json())
  }

  useEffect(() => { carregar() }, [])

  function handleBusca(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setBusca(q)
    carregar(q)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <Button onClick={() => setAbrirForm(true)}>
          <UserPlus size={16} className="mr-2" />
          Novo cliente
        </Button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
        <Input
          value={busca}
          onChange={handleBusca}
          placeholder="Buscar por nome ou telefone..."
          className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
        />
      </div>

      <div className="grid gap-3">
        {clientes.map((c) => (
          <Link key={c._id} href={`/clientes/${c._id}`}>
            <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-white">{c.nome}</p>
                  <p className="text-sm text-zinc-400">{c.telefone}</p>
                  {c.email && <p className="text-sm text-zinc-500">{c.email}</p>}
                </div>
                <ChevronRight size={16} className="text-zinc-500" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {clientes.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">
            {busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
          </p>
        )}
      </div>

      <Dialog open={abrirForm} onOpenChange={setAbrirForm}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Novo cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm
            onSalvo={() => { setAbrirForm(false); carregar(busca) }}
            onCancelar={() => setAbrirForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Testar no browser**

Navegar para `/clientes`. Deve aparecer:
- Input de busca com ícone de lupa
- Mensagem "Nenhum cliente cadastrado ainda."
- Botão "Novo cliente" → abre dialog → preencher → salvar → card aparece na lista
- Buscar pelo nome cadastrado → filtro funciona
- Clicar no card → navega para `/clientes/[id]` (404 por enquanto — página criada na Task 5)

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/clientes/page.tsx
git commit -m "feat: página de listagem de clientes com busca e criação"
```

---

## Task 5: Página de perfil do cliente

**Files:**
- Create: `app/(dashboard)/clientes/[id]/page.tsx`

- [ ] **Step 1: Criar a página**

```tsx
// app/(dashboard)/clientes/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClienteForm } from "@/components/clientes/ClienteForm"
import { ArrowLeft, Pencil, Plus } from "lucide-react"

type Cliente = {
  _id: string
  nome: string
  telefone: string
  email?: string
  cpf_cnpj?: string
  endereco?: string
}

type OSResumo = {
  _id: string
  numero_os: number
  status: string
  defeito_descricao: string
  valor_cobrado: number
  created_at: string
  central_id: { marca: string; modelo: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  na_fila: "Na fila",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  devolvida: "Devolvida",
  substituida: "Substituída",
}

const STATUS_COLOR: Record<string, string> = {
  aberta: "bg-zinc-700 text-zinc-300",
  na_fila: "bg-amber-900/40 text-amber-400",
  em_andamento: "bg-violet-900/40 text-violet-400",
  concluida: "bg-green-900/40 text-green-400",
  devolvida: "bg-red-900/40 text-red-400",
  substituida: "bg-orange-900/40 text-orange-400",
}

export default function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [os, setOS] = useState<OSResumo[]>([])
  const [editando, setEditando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    const [resCliente, resOS] = await Promise.all([
      fetch(`/api/clientes/${id}`),
      fetch(`/api/clientes/${id}/os`),
    ])
    if (!resCliente.ok) { router.push("/clientes"); return }
    const [dadosCliente, dadosOS] = await Promise.all([
      resCliente.json(),
      resOS.ok ? resOS.json() : [],
    ])
    setCliente(dadosCliente)
    setOS(dadosOS)
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [id])

  if (carregando) return <p className="text-zinc-400 text-sm">Carregando...</p>
  if (!cliente) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/clientes")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-bold text-white flex-1">{cliente.nome}</h1>
        <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
          <Pencil size={14} className="mr-1" />
          Editar
        </Button>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400 font-normal">Dados de contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-zinc-500 w-24">Telefone</span>
            <span className="text-white">{cliente.telefone}</span>
          </div>
          {cliente.email && (
            <div className="flex gap-2">
              <span className="text-zinc-500 w-24">Email</span>
              <span className="text-white">{cliente.email}</span>
            </div>
          )}
          {cliente.cpf_cnpj && (
            <div className="flex gap-2">
              <span className="text-zinc-500 w-24">CPF/CNPJ</span>
              <span className="text-white">{cliente.cpf_cnpj}</span>
            </div>
          )}
          {cliente.endereco && (
            <div className="flex gap-2">
              <span className="text-zinc-500 w-24">Endereço</span>
              <span className="text-white">{cliente.endereco}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">
            Histórico de OS
            {os.length > 0 && (
              <span className="ml-2 text-sm text-zinc-500 font-normal">({os.length})</span>
            )}
          </h2>
          <Link href={`/os/nova?cliente=${id}`}>
            <Button size="sm">
              <Plus size={14} className="mr-1" />
              Nova OS
            </Button>
          </Link>
        </div>

        <div className="grid gap-3">
          {os.map((o) => (
            <Link key={o._id} href={`/os/${o._id}`}>
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium text-sm">OS #{o.numero_os}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status] ?? "bg-zinc-700 text-zinc-300"}`}
                        >
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </div>
                      {o.central_id && (
                        <p className="text-xs text-zinc-500">
                          {o.central_id.marca} {o.central_id.modelo}
                        </p>
                      )}
                      <p className="text-xs text-zinc-400 truncate mt-1">{o.defeito_descricao}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-white">
                        R$ {o.valor_cobrado.toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {os.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-6">Nenhuma OS encontrada.</p>
          )}
        </div>
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Editar cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm
            cliente={cliente}
            onSalvo={() => { setEditando(false); carregar() }}
            onCancelar={() => setEditando(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Testar no browser**

1. Cadastrar um cliente na lista → clicar no card → perfil abre com dados
2. Clicar em "Editar" → dialog abre com campos preenchidos → alterar nome → salvar → nome atualiza
3. Link "Nova OS" → navega para `/os/nova?cliente=[id]` (404 por enquanto — será criado no Plano 3)
4. Testar `GET /api/clientes/id-inexistente` → retorna 404

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/clientes/
git commit -m "feat: página de perfil do cliente com histórico de OS"
```

---

## Task 6: Serviço de centrais + testes

**Files:**
- Create: `lib/services/central.service.ts`
- Create: `__tests__/services/central.service.test.ts`

- [ ] **Step 1: Escrever o teste que vai falhar**

```ts
// __tests__/services/central.service.test.ts
import {
  criarCentral,
  listarCentrais,
  buscarCentralPorId,
  atualizarCentral,
  listarReparosDaCentral,
} from "@/lib/services/central.service"

describe("central.service", () => {
  const dadosBase = {
    marca: "Bosch",
    modelo: "ME17.9.53",
    codigo: "4CFR",
  }

  it("cria central com campos obrigatórios", async () => {
    const central = await criarCentral(dadosBase)
    expect(central.marca).toBe("Bosch")
    expect(central.modelo).toBe("ME17.9.53")
    expect(central.codigo).toBe("4CFR")
  })

  it("lista todas as centrais ordenadas por marca e modelo", async () => {
    await criarCentral({ marca: "Siemens", modelo: "5WY", codigo: "ABC1" })
    await criarCentral(dadosBase)
    const lista = await listarCentrais()
    expect(lista.length).toBe(2)
    expect(lista[0].marca).toBe("Bosch")
  })

  it("filtra centrais por modelo", async () => {
    await criarCentral(dadosBase)
    await criarCentral({ marca: "Delphi", modelo: "MT80", codigo: "XYZ1" })
    const lista = await listarCentrais("MT80")
    expect(lista.length).toBe(1)
    expect(lista[0].marca).toBe("Delphi")
  })

  it("filtra centrais por marca", async () => {
    await criarCentral(dadosBase)
    await criarCentral({ marca: "Delphi", modelo: "MT80", codigo: "XYZ1" })
    const lista = await listarCentrais("Bosch")
    expect(lista.length).toBe(1)
    expect(lista[0].modelo).toBe("ME17.9.53")
  })

  it("filtra centrais por código", async () => {
    await criarCentral(dadosBase)
    await criarCentral({ marca: "Delphi", modelo: "MT80", codigo: "XYZ1" })
    const lista = await listarCentrais("XYZ")
    expect(lista.length).toBe(1)
    expect(lista[0].modelo).toBe("MT80")
  })

  it("busca central por id", async () => {
    const criada = await criarCentral(dadosBase)
    const encontrada = await buscarCentralPorId(criada._id.toString())
    expect(encontrada?.modelo).toBe("ME17.9.53")
  })

  it("retorna null para id inexistente", async () => {
    const encontrada = await buscarCentralPorId("000000000000000000000000")
    expect(encontrada).toBeNull()
  })

  it("atualiza dados da central", async () => {
    const criada = await criarCentral(dadosBase)
    const atualizada = await atualizarCentral(criada._id.toString(), { descricao: "Motor 1.0 Flex" })
    expect(atualizada?.descricao).toBe("Motor 1.0 Flex")
    expect(atualizada?.modelo).toBe("ME17.9.53")
  })

  it("listarReparosDaCentral retorna array vazio quando não há OS concluídas", async () => {
    const criada = await criarCentral(dadosBase)
    const reparos = await listarReparosDaCentral(criada._id.toString())
    expect(reparos).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx jest __tests__/services/central.service.test.ts --no-coverage
```

Esperado: FAIL com "Cannot find module '@/lib/services/central.service'"

- [ ] **Step 3: Implementar o serviço**

```ts
// lib/services/central.service.ts
import { connectDB } from "@/lib/db"
import Central from "@/models/Central"
import OS from "@/models/OS"

export type CreateCentralInput = {
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

export type UpdateCentralInput = Partial<CreateCentralInput>

export async function listarCentrais(q?: string) {
  await connectDB()
  const filtro = q
    ? {
        $or: [
          { marca: new RegExp(q, "i") },
          { modelo: new RegExp(q, "i") },
          { codigo: new RegExp(q, "i") },
        ],
      }
    : {}
  return Central.find(filtro).sort({ marca: 1, modelo: 1 }).lean()
}

export async function buscarCentralPorId(id: string) {
  await connectDB()
  return Central.findById(id).lean()
}

export async function criarCentral(data: CreateCentralInput) {
  await connectDB()
  return Central.create(data)
}

export async function atualizarCentral(id: string, data: UpdateCentralInput) {
  await connectDB()
  return Central.findByIdAndUpdate(id, data, { returnDocument: "after" }).lean()
}

export async function listarReparosDaCentral(centralId: string) {
  await connectDB()
  return OS.find({ central_id: centralId, status: "concluida" })
    .populate("cliente_id", "nome")
    .sort({ closed_at: -1 })
    .lean()
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx jest __tests__/services/central.service.test.ts --no-coverage
```

Esperado: PASS — 9 testes passando

- [ ] **Step 5: Rodar toda a suite para garantir regressão zero**

```bash
npx jest --no-coverage
```

Esperado: todos os testes passando (9 cliente + 9 central + testes existentes do Plano 1)

- [ ] **Step 6: Commit**

```bash
git add lib/services/central.service.ts __tests__/services/central.service.test.ts
git commit -m "feat: central service com CRUD e base de conhecimento"
```

---

## Task 7: API routes de centrais

**Files:**
- Create: `app/api/centrais/route.ts`
- Create: `app/api/centrais/[id]/route.ts`
- Create: `app/api/centrais/[id]/reparos/route.ts`

- [ ] **Step 1: Criar `app/api/centrais/route.ts`**

```ts
// app/api/centrais/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarCentrais, criarCentral } from "@/lib/services/central.service"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? undefined
  const centrais = await listarCentrais(q)
  return NextResponse.json(centrais)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  try {
    const body = await req.json()
    const central = await criarCentral(body)
    return NextResponse.json(central, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar central"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
```

- [ ] **Step 2: Criar `app/api/centrais/[id]/route.ts`**

```ts
// app/api/centrais/[id]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarCentralPorId, atualizarCentral } from "@/lib/services/central.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  const central = await buscarCentralPorId(id)
  if (!central) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(central)
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    const central = await atualizarCentral(id, body)
    if (!central) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(central)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar central"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
```

- [ ] **Step 3: Criar `app/api/centrais/[id]/reparos/route.ts`**

```ts
// app/api/centrais/[id]/reparos/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listarReparosDaCentral } from "@/lib/services/central.service"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  const reparos = await listarReparosDaCentral(id)
  return NextResponse.json(reparos)
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/centrais/
git commit -m "feat: API routes de centrais (CRUD + knowledge base)"
```

---

## Task 8: Componente CentralForm

**Files:**
- Create: `components/centrais/CentralForm.tsx`

- [ ] **Step 1: Criar o componente**

Suporta criar (sem `central` prop) e editar (com `central` prop).

```tsx
// components/centrais/CentralForm.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CentralData = {
  _id: string
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

type CentralFormProps = {
  central?: CentralData
  onSalvo: () => void
  onCancelar: () => void
}

export function CentralForm({ central, onSalvo, onCancelar }: CentralFormProps) {
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const editando = !!central

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro("")
    setCarregando(true)
    const form = new FormData(e.currentTarget)
    const body = {
      marca: form.get("marca") as string,
      modelo: form.get("modelo") as string,
      codigo: form.get("codigo") as string,
      descricao: (form.get("descricao") as string) || undefined,
    }
    const res = await fetch(
      editando ? `/api/centrais/${central._id}` : "/api/centrais",
      {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )
    setCarregando(false)
    if (!res.ok) {
      const data = await res.json()
      setErro(data.error ?? "Erro ao salvar.")
      return
    }
    onSalvo()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Marca *</Label>
        <Input
          name="marca"
          required
          placeholder="ex: Bosch"
          defaultValue={central?.marca}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Modelo *</Label>
        <Input
          name="modelo"
          required
          placeholder="ex: ME17.9.53"
          defaultValue={central?.modelo}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Código *</Label>
        <Input
          name="codigo"
          required
          placeholder="ex: 4CFR"
          defaultValue={central?.codigo}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input
          name="descricao"
          placeholder="ex: Motor 1.0 Flex"
          defaultValue={central?.descricao}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      {erro && <p className="text-red-400 text-sm">{erro}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={carregando}>
          {carregando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros em `components/centrais/CentralForm.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/centrais/CentralForm.tsx
git commit -m "feat: componente CentralForm (criar e editar)"
```

---

## Task 9: Página de listagem de centrais

**Files:**
- Modify: `app/(dashboard)/centrais/page.tsx`

- [ ] **Step 1: Substituir o placeholder**

```tsx
// app/(dashboard)/centrais/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CentralForm } from "@/components/centrais/CentralForm"
import { Search, Plus, ChevronRight, Cpu } from "lucide-react"

type Central = {
  _id: string
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

export default function CentraisPage() {
  const [centrais, setCentrais] = useState<Central[]>([])
  const [busca, setBusca] = useState("")
  const [abrirForm, setAbrirForm] = useState(false)

  async function carregar(q?: string) {
    const params = q ? `?q=${encodeURIComponent(q)}` : ""
    const res = await fetch(`/api/centrais${params}`)
    if (!res.ok) return
    setCentrais(await res.json())
  }

  useEffect(() => { carregar() }, [])

  function handleBusca(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setBusca(q)
    carregar(q)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Centrais</h1>
        <Button onClick={() => setAbrirForm(true)}>
          <Plus size={16} className="mr-2" />
          Nova central
        </Button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
        <Input
          value={busca}
          onChange={handleBusca}
          placeholder="Buscar por marca, modelo ou código..."
          className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
        />
      </div>

      <div className="grid gap-3">
        {centrais.map((c) => (
          <Link key={c._id} href={`/centrais/${c._id}`}>
            <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Cpu size={18} className="text-zinc-500 shrink-0" />
                  <div>
                    <p className="font-medium text-white">
                      {c.marca} {c.modelo}
                    </p>
                    <p className="text-sm text-zinc-400">Código: {c.codigo}</p>
                    {c.descricao && (
                      <p className="text-sm text-zinc-500">{c.descricao}</p>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-500" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {centrais.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">
            {busca ? "Nenhuma central encontrada." : "Nenhuma central cadastrada ainda."}
          </p>
        )}
      </div>

      <Dialog open={abrirForm} onOpenChange={setAbrirForm}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Nova central</DialogTitle>
          </DialogHeader>
          <CentralForm
            onSalvo={() => { setAbrirForm(false); carregar(busca) }}
            onCancelar={() => setAbrirForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Testar no browser**

1. Navegar para `/centrais`
2. Clicar em "Nova central" → preencher Bosch / ME17.9.53 / 4CFR → salvar → card aparece
3. Buscar por "Bosch" → filtra corretamente
4. Clicar no card → navega para `/centrais/[id]` (404 até Task 10)

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/centrais/page.tsx
git commit -m "feat: página de listagem de centrais com busca e criação"
```

---

## Task 10: Página de detalhe da central (base de conhecimento)

**Files:**
- Create: `app/(dashboard)/centrais/[id]/page.tsx`

- [ ] **Step 1: Criar a página**

```tsx
// app/(dashboard)/centrais/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CentralForm } from "@/components/centrais/CentralForm"
import { ArrowLeft, Pencil, Wrench } from "lucide-react"

type Central = {
  _id: string
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

type Reparo = {
  _id: string
  numero_os: number
  defeito_descricao: string
  solucao_descricao?: string
  closed_at: string
  cliente_id: { nome: string } | null
}

export default function CentralDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [central, setCentral] = useState<Central | null>(null)
  const [reparos, setReparos] = useState<Reparo[]>([])
  const [editando, setEditando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    const [resCentral, resReparos] = await Promise.all([
      fetch(`/api/centrais/${id}`),
      fetch(`/api/centrais/${id}/reparos`),
    ])
    if (!resCentral.ok) { router.push("/centrais"); return }
    const [dadosCentral, dadosReparos] = await Promise.all([
      resCentral.json(),
      resReparos.ok ? resReparos.json() : [],
    ])
    setCentral(dadosCentral)
    setReparos(dadosReparos)
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [id])

  if (carregando) return <p className="text-zinc-400 text-sm">Carregando...</p>
  if (!central) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/centrais")}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {central.marca} {central.modelo}
          </h1>
          <p className="text-sm text-zinc-400">Código: {central.codigo}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
          <Pencil size={14} className="mr-1" />
          Editar
        </Button>
      </div>

      {central.descricao && (
        <p className="text-zinc-400 text-sm">{central.descricao}</p>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wrench size={16} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">
            Base de Conhecimento
          </h2>
          {reparos.length > 0 && (
            <span className="text-sm text-zinc-500">
              ({reparos.length} {reparos.length === 1 ? "reparo" : "reparos"})
            </span>
          )}
        </div>

        <div className="grid gap-3">
          {reparos.map((r) => (
            <Card key={r._id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-white">
                    OS #{r.numero_os}
                    {r.cliente_id && (
                      <span className="font-normal text-zinc-400 ml-2">
                        — {r.cliente_id.nome}
                      </span>
                    )}
                  </CardTitle>
                  {r.closed_at && (
                    <span className="text-xs text-zinc-500">
                      {new Date(r.closed_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2 text-sm">
                <div>
                  <span className="text-zinc-500 text-xs uppercase tracking-wide">Defeito</span>
                  <p className="text-zinc-300 mt-0.5">{r.defeito_descricao}</p>
                </div>
                {r.solucao_descricao && (
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wide">Solução</span>
                    <p className="text-zinc-300 mt-0.5">{r.solucao_descricao}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {reparos.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800 border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-zinc-500 text-sm">
                  Nenhum reparo concluído registrado para este modelo ainda.
                </p>
                <p className="text-zinc-600 text-xs mt-1">
                  Reparos aparecerão aqui quando OS forem concluídas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Editar central</DialogTitle>
          </DialogHeader>
          <CentralForm
            central={central}
            onSalvo={() => { setEditando(false); carregar() }}
            onCancelar={() => setEditando(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Rodar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 3: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Esperado: todos passando

- [ ] **Step 5: Testar no browser**

1. Cadastrar uma central (ex: Bosch ME17.9.53) → clicar → página de detalhe abre
2. Página mostra "Nenhum reparo concluído registrado" (correto — não há OS ainda)
3. Clicar "Editar" → dialog abre com dados → alterar descrição → salvar → atualiza
4. Cadastrar outra central → buscar por nome → funciona

- [ ] **Step 6: Commit final**

```bash
git add app/\(dashboard\)/centrais/ components/centrais/ app/api/centrais/
git commit -m "feat: página de detalhe da central com base de conhecimento"
```
