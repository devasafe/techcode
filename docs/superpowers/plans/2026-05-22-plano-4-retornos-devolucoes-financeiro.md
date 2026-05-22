# Plano 4 — Retornos de Garantia, Devoluções e Dashboard Financeiro

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar registro de retornos de garantia, devoluções/substituições em OS concluídas, e as páginas de Dashboard executivo e Financeiro com KPIs e relatórios por período.

**Architecture:** Duas novas funções no OS service (`adicionarRetornoGarantia`, `registrarDevolucao`) + novo `dashboard.service.ts` com aggregation queries. Quatro novas API routes. UI: dialogs de retorno e devolução adicionados à página de detalhe da OS; placeholders do Dashboard home e Financeiro substituídos. Comissões de técnicos ficam para o Plano 5.

**Tech Stack:** Next.js 16 App Router, TypeScript, Mongoose 9, NextAuth v5, Jest + mongodb-memory-server, shadcn/ui (button, card, dialog, input, label, select), Lucide React, Tailwind CSS.

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `lib/services/os.service.ts` | Modificar | Adicionar `adicionarRetornoGarantia` e `registrarDevolucao` |
| `__tests__/services/os.service.test.ts` | Modificar | Testes para as duas novas funções |
| `app/api/os/[id]/retorno/route.ts` | Criar | POST registrar retorno de garantia |
| `app/api/os/[id]/devolucao/route.ts` | Criar | POST registrar devolução/substituição |
| `lib/services/dashboard.service.ts` | Criar | Aggregation queries (estatísticas + relatório financeiro) |
| `__tests__/services/dashboard.service.test.ts` | Criar | Testes do serviço de estatísticas |
| `app/api/dashboard/route.ts` | Criar | GET estatísticas do dashboard |
| `app/api/financeiro/route.ts` | Criar | GET relatório financeiro com filtro de período |
| `app/(dashboard)/os/[id]/page.tsx` | Modificar | Adicionar seções de retorno e devolução |
| `app/(dashboard)/page.tsx` | Substituir | Dashboard com KPIs do mês e últimas OS |
| `app/(dashboard)/financeiro/page.tsx` | Substituir | Relatório financeiro com filtro de período |

---

## Task 1: Serviços de retorno de garantia e devolução

**Files:**
- Modify: `lib/services/os.service.ts`
- Modify: `__tests__/services/os.service.test.ts`

### Contexto do model OS

O modelo `OS.ts` já tem os campos:
```ts
retornos_garantia: [{ data: Date, descricao: string, tecnico_id?: ObjectId }]
devolucao?: { tipo: "reembolso"|"substituicao", motivo, valor_reembolsado?, central_adquirida?, custo_central?, novo_valor_cobrado?, data }
```

### Contexto do arquivo atual `os.service.ts`

O arquivo atual (`lib/services/os.service.ts`) exporta: `CreateOSInput`, `UpdateOSInput`, `listarOS`, `buscarOSPorId`, `criarOS`, `atualizarOS`, `listarOSFila`. Adicione ao final do arquivo, sem remover nada.

- [ ] **Step 1: Escrever os testes (adicionar ao final de `__tests__/services/os.service.test.ts`)**

```ts
// Adicionar ao final do arquivo, dentro do describe existente "OS service"
// Adicionar imports no topo do arquivo:
// import { adicionarRetornoGarantia, registrarDevolucao } from "@/lib/services/os.service"
// import type { TipoDevolucao } from "@/types"

  it("adiciona retorno de garantia a OS concluída", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Teste" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 100 })
    const atualizado = await adicionarRetornoGarantia(os._id.toString(), { descricao: "Voltou com mesmo defeito" })
    expect(atualizado?.retornos_garantia).toHaveLength(1)
    expect(atualizado?.retornos_garantia[0].descricao).toBe("Voltou com mesmo defeito")
  })

  it("adicionarRetornoGarantia retorna null para id inexistente", async () => {
    const result = await adicionarRetornoGarantia("000000000000000000000000", { descricao: "Teste" })
    expect(result).toBeNull()
  })

  it("registra devolução tipo reembolso e muda status para devolvida", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Teste" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 100 })
    const devolvida = await registrarDevolucao(os._id.toString(), {
      tipo: "reembolso",
      motivo: "Cliente insatisfeito",
      valor_reembolsado: 100,
    })
    expect(devolvida?.status).toBe("devolvida")
    expect(devolvida?.devolucao?.tipo).toBe("reembolso")
    expect(devolvida?.devolucao?.valor_reembolsado).toBe(100)
  })

  it("registra substituição e muda status para substituida", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Teste" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 100 })
    const sub = await registrarDevolucao(os._id.toString(), {
      tipo: "substituicao",
      motivo: "Central danificada",
      central_adquirida: "Bosch ME7",
      custo_central: 350,
      novo_valor_cobrado: 500,
    })
    expect(sub?.status).toBe("substituida")
    expect(sub?.devolucao?.tipo).toBe("substituicao")
    expect(sub?.devolucao?.central_adquirida).toBe("Bosch ME7")
  })

  it("registrarDevolucao retorna null para id inexistente", async () => {
    const result = await registrarDevolucao("000000000000000000000000", { tipo: "reembolso", motivo: "Teste" })
    expect(result).toBeNull()
  })

  it("registrarDevolucao retorna null se OS não estiver concluída", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "Teste" })
    const result = await registrarDevolucao(os._id.toString(), { tipo: "reembolso", motivo: "Teste" })
    expect(result).toBeNull()
  })
```

- [ ] **Step 2: Atualizar os imports no topo de `__tests__/services/os.service.test.ts`**

Localize a linha de import:
```ts
import {
  criarOS,
  listarOS,
  buscarOSPorId,
  atualizarOS,
  listarOSFila,
} from "@/lib/services/os.service"
```

Substitua por:
```ts
import {
  criarOS,
  listarOS,
  buscarOSPorId,
  atualizarOS,
  listarOSFila,
  adicionarRetornoGarantia,
  registrarDevolucao,
} from "@/lib/services/os.service"
import type { TipoDevolucao } from "@/types"
```

- [ ] **Step 3: Rodar e confirmar que falha**

```bash
npx jest __tests__/services/os.service.test.ts --no-coverage
```

Esperado: FAIL — "adicionarRetornoGarantia is not a function" (ou similar)

- [ ] **Step 4: Implementar as funções — adicionar ao final de `lib/services/os.service.ts`**

```ts
export type RetornoGarantiaInput = {
  descricao: string
}

export type DevolucaoInput = {
  tipo: TipoDevolucao
  motivo: string
  valor_reembolsado?: number
  central_adquirida?: string
  custo_central?: number
  novo_valor_cobrado?: number
}

export async function adicionarRetornoGarantia(id: string, data: RetornoGarantiaInput) {
  await connectDB()
  const os = await OS.findById(id).lean()
  if (!os) return null
  return OS.findByIdAndUpdate(
    id,
    { $push: { retornos_garantia: { data: new Date(), descricao: data.descricao } } },
    { returnDocument: "after" }
  )
    .populate("cliente_id", "nome telefone")
    .populate("central_id", "marca modelo codigo")
    .lean()
}

export async function registrarDevolucao(id: string, data: DevolucaoInput) {
  await connectDB()
  const os = await OS.findById(id).lean()
  if (!os) return null
  if (os.status !== "concluida") return null
  const novoStatus: OSStatus = data.tipo === "substituicao" ? "substituida" : "devolvida"
  return OS.findByIdAndUpdate(
    id,
    {
      $set: {
        status: novoStatus,
        devolucao: {
          tipo: data.tipo,
          motivo: data.motivo,
          valor_reembolsado: data.valor_reembolsado,
          central_adquirida: data.central_adquirida,
          custo_central: data.custo_central,
          novo_valor_cobrado: data.novo_valor_cobrado,
          data: new Date(),
        },
      },
    },
    { returnDocument: "after" }
  )
    .populate("cliente_id", "nome telefone")
    .populate("central_id", "marca modelo codigo")
    .lean()
}
```

Também adicione `TipoDevolucao` ao import de types no topo do arquivo. A linha atual é:
```ts
import type { OSStatus } from "@/types"
```
Substitua por:
```ts
import type { OSStatus, TipoDevolucao } from "@/types"
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

```bash
npx jest __tests__/services/os.service.test.ts --no-coverage
```

Esperado: PASS — 15 testes passando (10 anteriores + 5 novos)

- [ ] **Step 6: Rodar suite completa**

```bash
npx jest --no-coverage
```

Esperado: todos passando

- [ ] **Step 7: Commit**

```bash
git add lib/services/os.service.ts __tests__/services/os.service.test.ts
git commit -m "feat: serviços de retorno de garantia e devolução de OS"
```

---

## Task 2: API routes para retorno e devolução

**Files:**
- Create: `app/api/os/[id]/retorno/route.ts`
- Create: `app/api/os/[id]/devolucao/route.ts`

- [ ] **Step 1: Criar `app/api/os/[id]/retorno/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { adicionarRetornoGarantia } from "@/lib/services/os.service"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    const os = await adicionarRetornoGarantia(id, body)
    if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 })
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao registrar retorno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
```

- [ ] **Step 2: Criar `app/api/os/[id]/devolucao/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { registrarDevolucao } from "@/lib/services/os.service"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!session.user?.perfis?.some((p) => ["admin", "atendente"].includes(p))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    const os = await registrarDevolucao(id, body)
    if (!os) return NextResponse.json({ error: "OS não encontrada ou não está concluída" }, { status: 404 })
    return NextResponse.json(os)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao registrar devolução"
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
git add "app/api/os/[id]/retorno/" "app/api/os/[id]/devolucao/"
git commit -m "feat: API routes de retorno de garantia e devolução de OS"
```

---

## Task 3: UI de retorno e devolução na página de detalhe da OS

**Files:**
- Modify: `app/(dashboard)/os/[id]/page.tsx`

A página já existe com ~330 linhas. Adicione suporte a retornos e devoluções com dois dialogs.

### Modificação 1 — atualizar o tipo `OS`

Localize o tipo `OS` no topo do arquivo (começa em `type OS = {`). Adicione os dois campos ao final, antes do fechamento `}`:

```tsx
  retornos_garantia: { _id: string; data: string; descricao: string }[]
  devolucao?: {
    tipo: string
    motivo: string
    valor_reembolsado?: number
    central_adquirida?: string
    custo_central?: number
    novo_valor_cobrado?: number
    data: string
  }
```

### Modificação 2 — adicionar imports

Adicione `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` aos imports de shadcn. Localize a linha:
```tsx
import { Input } from "@/components/ui/input"
```
Substitua por:
```tsx
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

### Modificação 3 — adicionar estado dos dois dialogs

Localize a linha:
```tsx
  const [atualizando, setAtualizando] = useState(false)
```
Logo após ela (linha seguinte), adicione:
```tsx
  const [abrirRetorno, setAbrirRetorno] = useState(false)
  const [descricaoRetorno, setDescricaoRetorno] = useState("")
  const [salvandoRetorno, setSalvandoRetorno] = useState(false)
  const [erroRetorno, setErroRetorno] = useState("")

  const [abrirDevolucao, setAbrirDevolucao] = useState(false)
  const [tipoDevolucao, setTipoDevolucao] = useState<"reembolso" | "substituicao">("reembolso")
  const [motivoDevolucao, setMotivoDevolucao] = useState("")
  const [valorReembolsado, setValorReembolsado] = useState("0")
  const [centralAdquirida, setCentralAdquirida] = useState("")
  const [custoCentral, setCustoCentral] = useState("0")
  const [novoValorCobrado, setNovoValorCobrado] = useState("0")
  const [salvandoDevolucao, setSalvandoDevolucao] = useState(false)
  const [erroDevolucao, setErroDevolucao] = useState("")
```

### Modificação 4 — adicionar as duas funções

Localize a função `adicionarPeca()`. Logo antes dela, adicione:

```tsx
  async function enviarRetorno() {
    if (!descricaoRetorno.trim()) return
    setSalvandoRetorno(true)
    setErroRetorno("")
    try {
      const res = await fetch(`/api/os/${id}/retorno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: descricaoRetorno }),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try { data = await res.json() } catch { /* ignore */ }
        setErroRetorno(data.error ?? "Erro ao registrar retorno.")
        return
      }
      setAbrirRetorno(false)
      setDescricaoRetorno("")
      carregar()
    } catch {
      setErroRetorno("Erro de conexão. Tente novamente.")
    } finally {
      setSalvandoRetorno(false)
    }
  }

  async function enviarDevolucao() {
    if (!motivoDevolucao.trim()) return
    setSalvandoDevolucao(true)
    setErroDevolucao("")
    try {
      const body: Record<string, unknown> = { tipo: tipoDevolucao, motivo: motivoDevolucao }
      if (tipoDevolucao === "reembolso") {
        body.valor_reembolsado = parseFloat(valorReembolsado) || 0
      } else {
        body.central_adquirida = centralAdquirida
        body.custo_central = parseFloat(custoCentral) || 0
        body.novo_valor_cobrado = parseFloat(novoValorCobrado) || 0
      }
      const res = await fetch(`/api/os/${id}/devolucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        let data: { error?: string } = {}
        try { data = await res.json() } catch { /* ignore */ }
        setErroDevolucao(data.error ?? "Erro ao registrar devolução.")
        return
      }
      setAbrirDevolucao(false)
      carregar()
    } catch {
      setErroDevolucao("Erro de conexão. Tente novamente.")
    } finally {
      setSalvandoDevolucao(false)
    }
  }
```

### Modificação 5 — adicionar seções de retorno e devolução no JSX

Localize o bloco:
```tsx
      {/* Dialog — Concluir OS */}
```

Imediatamente **antes** desse bloco (no JSX, entre o Card de Resultado e o Dialog de Concluir), adicione:

```tsx
      {/* Retornos de garantia */}
      {os.status === "concluida" && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">
                Retornos de garantia ({os.retornos_garantia.length})
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setAbrirRetorno(true)}>
                + Registrar retorno
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {os.retornos_garantia.length === 0 ? (
              <p className="text-zinc-600 text-xs">Nenhum retorno registrado.</p>
            ) : (
              <div className="space-y-2">
                {os.retornos_garantia.map((r) => (
                  <div key={r._id} className="text-sm">
                    <p className="text-zinc-300">{r.descricao}</p>
                    <p className="text-xs text-zinc-500">{new Date(r.data).toLocaleDateString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Devolução */}
      {os.devolucao && (
        <Card className="bg-zinc-900 border-red-900/40">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-red-400 font-normal uppercase tracking-wide">
              {os.devolucao.tipo === "reembolso" ? "Devolução — Reembolso" : "Devolução — Substituição"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-sm space-y-1">
            <p className="text-zinc-300">{os.devolucao.motivo}</p>
            {os.devolucao.valor_reembolsado != null && (
              <p className="text-zinc-400">Reembolso: R$ {os.devolucao.valor_reembolsado.toFixed(2).replace(".", ",")}</p>
            )}
            {os.devolucao.central_adquirida && (
              <p className="text-zinc-400">Central substituta: {os.devolucao.central_adquirida}</p>
            )}
            <p className="text-zinc-500 text-xs">{new Date(os.devolucao.data).toLocaleDateString("pt-BR")}</p>
          </CardContent>
        </Card>
      )}
      {os.status === "concluida" && !os.devolucao && (
        <div>
          <Button variant="outline" className="text-red-400 border-red-900/40 hover:bg-red-900/20"
            onClick={() => setAbrirDevolucao(true)}>
            Registrar devolução
          </Button>
        </div>
      )}
```

### Modificação 6 — adicionar os dois dialogs no JSX

Localize o fechamento `</div>` final do componente (a última linha antes do `}`). Imediatamente **antes** desse `</div>` final, adicione:

```tsx
      {/* Dialog — Retorno de garantia */}
      <Dialog open={abrirRetorno} onOpenChange={setAbrirRetorno}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar retorno de garantia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição do problema *</Label>
              <textarea
                value={descricaoRetorno}
                onChange={(e) => setDescricaoRetorno(e.target.value)}
                rows={3}
                placeholder="Descreva o que o cliente relatou..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>
            {erroRetorno && <p className="text-red-400 text-sm">{erroRetorno}</p>}
            <div className="flex gap-2">
              <Button onClick={enviarRetorno} disabled={salvandoRetorno || !descricaoRetorno.trim()}>
                {salvandoRetorno ? "Salvando..." : "Confirmar"}
              </Button>
              <Button variant="outline" onClick={() => setAbrirRetorno(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Devolução */}
      <Dialog open={abrirDevolucao} onOpenChange={setAbrirDevolucao}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar devolução</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de devolução</Label>
              <Select value={tipoDevolucao} onValueChange={(v) => setTipoDevolucao(v as "reembolso" | "substituicao")}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="reembolso">Reembolso</SelectItem>
                  <SelectItem value="substituicao">Substituição de central</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <textarea
                value={motivoDevolucao}
                onChange={(e) => setMotivoDevolucao(e.target.value)}
                rows={2}
                placeholder="Motivo da devolução..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>
            {tipoDevolucao === "reembolso" && (
              <div className="space-y-2">
                <Label>Valor reembolsado (R$)</Label>
                <Input value={valorReembolsado} onChange={(e) => setValorReembolsado(e.target.value)}
                  type="number" step="0.01" min="0"
                  className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            )}
            {tipoDevolucao === "substituicao" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Central substituta</Label>
                  <Input value={centralAdquirida} onChange={(e) => setCentralAdquirida(e.target.value)}
                    placeholder="Ex: Bosch ME17 recondicionada"
                    className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Custo da central (R$)</Label>
                    <Input value={custoCentral} onChange={(e) => setCustoCentral(e.target.value)}
                      type="number" step="0.01" min="0"
                      className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>Novo valor cobrado (R$)</Label>
                    <Input value={novoValorCobrado} onChange={(e) => setNovoValorCobrado(e.target.value)}
                      type="number" step="0.01" min="0"
                      className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                </div>
              </div>
            )}
            {erroDevolucao && <p className="text-red-400 text-sm">{erroDevolucao}</p>}
            <div className="flex gap-2">
              <Button onClick={enviarDevolucao} disabled={salvandoDevolucao || !motivoDevolucao.trim()}>
                {salvandoDevolucao ? "Salvando..." : "Confirmar devolução"}
              </Button>
              <Button variant="outline" onClick={() => setAbrirDevolucao(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 1: Aplicar a Modificação 1** (tipo OS — adicionar `retornos_garantia` e `devolucao`)
- [ ] **Step 2: Aplicar a Modificação 2** (import de Select)
- [ ] **Step 3: Aplicar a Modificação 3** (estado dos dois dialogs)
- [ ] **Step 4: Aplicar a Modificação 4** (funções `enviarRetorno` e `enviarDevolucao`)
- [ ] **Step 5: Aplicar a Modificação 5** (seções JSX de retorno e devolução)
- [ ] **Step 6: Aplicar a Modificação 6** (dois novos dialogs)

- [ ] **Step 7: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 8: Commit**

```bash
git add "app/(dashboard)/os/[id]/page.tsx"
git commit -m "feat: retorno de garantia e devolução no detalhe da OS"
```

---

## Task 4: Serviço de estatísticas + testes + API routes

**Files:**
- Create: `lib/services/dashboard.service.ts`
- Create: `__tests__/services/dashboard.service.test.ts`
- Create: `app/api/dashboard/route.ts`
- Create: `app/api/financeiro/route.ts`

- [ ] **Step 1: Escrever os testes**

```ts
// __tests__/services/dashboard.service.test.ts
import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import Central from "@/models/Central"
import { buscarEstatisticas, buscarRelatorioFinanceiro } from "@/lib/services/dashboard.service"
import { criarOS, atualizarOS } from "@/lib/services/os.service"

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

describe("dashboard service", () => {
  it("buscarEstatisticas retorna contagens corretas por status", async () => {
    const os1 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    const os2 = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "B" })
    await atualizarOS(os2._id.toString(), { status: "na_fila" })
    const stats = await buscarEstatisticas()
    expect(stats.por_status["aberta"]).toBe(1)
    expect(stats.por_status["na_fila"]).toBe(1)
  })

  it("buscarEstatisticas retorna totais financeiros das OS concluídas", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), {
      status: "concluida",
      valor_cobrado: 200,
      pecas: [{ nome: "Capacitor", custo: 50 }],
    })
    const stats = await buscarEstatisticas()
    expect(stats.totais.receita).toBe(200)
    expect(stats.totais.custo).toBe(50)
    expect(stats.totais.lucro).toBe(150)
  })

  it("buscarEstatisticas retorna lista de recentes com até 5 OS", async () => {
    for (let i = 0; i < 3; i++) {
      const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: `OS ${i}` })
      await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 100 })
    }
    const stats = await buscarEstatisticas()
    expect(stats.recentes.length).toBe(3)
  })

  it("buscarRelatorioFinanceiro filtra OS concluídas no mês atual", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 300 })
    const rel = await buscarRelatorioFinanceiro("este_mes")
    expect(rel.totais.receita).toBeGreaterThanOrEqual(300)
    expect(rel.os.length).toBeGreaterThanOrEqual(1)
  })

  it("buscarRelatorioFinanceiro tudo retorna todas as concluídas", async () => {
    const os = await criarOS({ cliente_id: clienteId, central_id: centralId, defeito_descricao: "A" })
    await atualizarOS(os._id.toString(), { status: "concluida", valor_cobrado: 150 })
    const rel = await buscarRelatorioFinanceiro("tudo")
    expect(rel.os.length).toBeGreaterThanOrEqual(1)
    expect(rel.totais.count).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx jest __tests__/services/dashboard.service.test.ts --no-coverage
```

Esperado: FAIL — "Cannot find module '@/lib/services/dashboard.service'"

- [ ] **Step 3: Criar `lib/services/dashboard.service.ts`**

```ts
import { connectDB } from "@/lib/db"
import OS from "@/models/OS"

export type Periodo = "este_mes" | "mes_anterior" | "este_ano" | "tudo"

function rangeParaPeriodo(periodo: Periodo): { $gte: Date; $lte?: Date } | null {
  const now = new Date()
  switch (periodo) {
    case "este_mes": {
      return { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
    }
    case "mes_anterior": {
      return {
        $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        $lte: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      }
    }
    case "este_ano": {
      return { $gte: new Date(now.getFullYear(), 0, 1) }
    }
    case "tudo":
      return null
  }
}

export async function buscarEstatisticas() {
  await connectDB()
  const now = new Date()
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)

  const [porStatusRaw, totaisGeral, totaisMes, recentes] = await Promise.all([
    OS.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    OS.aggregate([
      { $match: { status: "concluida" } },
      {
        $group: {
          _id: null,
          receita: { $sum: "$valor_cobrado" },
          custo: { $sum: "$custo_total_pecas" },
          lucro: { $sum: "$lucro_liquido" },
          total: { $sum: 1 },
        },
      },
    ]),
    OS.aggregate([
      { $match: { status: "concluida", closed_at: { $gte: inicioMes } } },
      {
        $group: {
          _id: null,
          receita: { $sum: "$valor_cobrado" },
          lucro: { $sum: "$lucro_liquido" },
          total: { $sum: 1 },
        },
      },
    ]),
    OS.find({ status: "concluida" })
      .sort({ closed_at: -1 })
      .limit(5)
      .populate("cliente_id", "nome")
      .lean(),
  ])

  const por_status = Object.fromEntries(
    porStatusRaw.map((r: { _id: string; count: number }) => [r._id, r.count])
  )

  return {
    por_status,
    totais: totaisGeral[0] ?? { receita: 0, custo: 0, lucro: 0, total: 0 },
    mes: totaisMes[0] ?? { receita: 0, lucro: 0, total: 0 },
    recentes,
  }
}

export async function buscarRelatorioFinanceiro(periodo: Periodo) {
  await connectDB()
  const range = rangeParaPeriodo(periodo)
  const matchConcluida: Record<string, unknown> = { status: "concluida" }
  if (range) matchConcluida.closed_at = range

  const [totaisRaw, os] = await Promise.all([
    OS.aggregate([
      { $match: matchConcluida },
      {
        $group: {
          _id: null,
          receita: { $sum: "$valor_cobrado" },
          custo: { $sum: "$custo_total_pecas" },
          lucro: { $sum: "$lucro_liquido" },
          count: { $sum: 1 },
        },
      },
    ]),
    OS.find(matchConcluida)
      .sort({ closed_at: -1 })
      .populate("cliente_id", "nome")
      .populate("central_id", "marca modelo")
      .lean(),
  ])

  return {
    periodo,
    totais: totaisRaw[0] ?? { receita: 0, custo: 0, lucro: 0, count: 0 },
    os,
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passam**

```bash
npx jest __tests__/services/dashboard.service.test.ts --no-coverage
```

Esperado: PASS — 5 testes passando

- [ ] **Step 5: Criar `app/api/dashboard/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarEstatisticas } from "@/lib/services/dashboard.service"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  try {
    const dados = await buscarEstatisticas()
    return NextResponse.json(dados)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 6: Criar `app/api/financeiro/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buscarRelatorioFinanceiro } from "@/lib/services/dashboard.service"
import type { Periodo } from "@/lib/services/dashboard.service"

const PERIODOS_VALIDOS: Periodo[] = ["este_mes", "mes_anterior", "este_ano", "tudo"]

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!session.user?.perfis?.includes("admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const periodo = (searchParams.get("periodo") ?? "este_mes") as Periodo
  if (!PERIODOS_VALIDOS.includes(periodo)) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 })
  }
  try {
    const dados = await buscarRelatorioFinanceiro(periodo)
    return NextResponse.json(dados)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 7: Rodar suite completa**

```bash
npx jest --no-coverage
```

Esperado: todos passando (37 anteriores + 5 novos = 42 total)

- [ ] **Step 8: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros

- [ ] **Step 9: Commit**

```bash
git add lib/services/dashboard.service.ts __tests__/services/dashboard.service.test.ts app/api/dashboard/ app/api/financeiro/
git commit -m "feat: serviço de estatísticas e API routes de dashboard e financeiro"
```

---

## Task 5: Dashboard home + Página Financeiro

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Modify: `app/(dashboard)/financeiro/page.tsx`

- [ ] **Step 1: Substituir `app/(dashboard)/page.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Estatisticas = {
  por_status: Record<string, number>
  totais: { receita: number; custo: number; lucro: number; total: number }
  mes: { receita: number; lucro: number; total: number }
  recentes: Array<{
    _id: string
    numero_os: number
    valor_cobrado: number
    closed_at?: string
    cliente_id: { nome: string } | null
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Estatisticas | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/dashboard", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setStats(data) })
      .catch((err) => { if (err?.name !== "AbortError") {} })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false) })
    return () => controller.abort()
  }, [])

  const emAberto =
    (stats?.por_status["aberta"] ?? 0) +
    (stats?.por_status["na_fila"] ?? 0) +
    (stats?.por_status["em_andamento"] ?? 0)

  if (carregando) return <p className="text-zinc-400 text-sm">Carregando...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">OS este mês</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-white">{stats?.mes.total ?? 0}</p>
            <p className="text-xs text-zinc-500 mt-0.5">concluídas</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Receita do mês</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-white">
              R$ {(stats?.mes.receita ?? 0).toFixed(2).replace(".", ",")}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">OS concluídas</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Lucro do mês</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-2xl font-bold ${(stats?.mes.lucro ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
              R$ {(stats?.mes.lucro ?? 0).toFixed(2).replace(".", ",")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Em aberto</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-white">{emAberto}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {stats?.por_status["aberta"] ?? 0} abertas ·{" "}
              {stats?.por_status["na_fila"] ?? 0} na fila ·{" "}
              {stats?.por_status["em_andamento"] ?? 0} em andamento
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Últimas OS concluídas</h2>
        {!stats?.recentes.length ? (
          <p className="text-zinc-500 text-sm">Nenhuma OS concluída ainda.</p>
        ) : (
          <div className="grid gap-2">
            {stats.recentes.map((o) => (
              <Link key={o._id} href={`/os/${o._id}`}>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <span className="text-white text-sm font-medium">OS #{o.numero_os}</span>
                      {o.cliente_id && (
                        <span className="text-zinc-400 text-sm ml-2">— {o.cliente_id.nome}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">
                        R$ {o.valor_cobrado.toFixed(2).replace(".", ",")}
                      </p>
                      {o.closed_at && (
                        <p className="text-xs text-zinc-500">
                          {new Date(o.closed_at).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Substituir `app/(dashboard)/financeiro/page.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Periodo = "este_mes" | "mes_anterior" | "este_ano" | "tudo"

type OSFinanceiro = {
  _id: string
  numero_os: number
  valor_cobrado: number
  custo_total_pecas: number
  lucro_liquido: number
  closed_at?: string
  cliente_id: { nome: string } | null
  central_id: { marca: string; modelo: string } | null
}

type Relatorio = {
  periodo: Periodo
  totais: { receita: number; custo: number; lucro: number; count: number }
  os: OSFinanceiro[]
}

const PERIODO_LABELS: Record<Periodo, string> = {
  este_mes: "Este mês",
  mes_anterior: "Mês anterior",
  este_ano: "Este ano",
  tudo: "Todo o período",
}

export default function FinanceiroPage() {
  const [periodo, setPeriodo] = useState<Periodo>("este_mes")
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    setCarregando(true)
    setErro("")
    fetch(`/api/financeiro?periodo=${periodo}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) { setErro("Erro ao carregar relatório."); return }
        setRelatorio(await r.json())
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") setErro("Erro ao carregar relatório.")
      })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false) })
    return () => controller.abort()
  }, [periodo])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Financeiro</h1>
        <div className="flex gap-2 flex-wrap">
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

      {erro && <p className="text-red-400 text-sm">{erro}</p>}

      {carregando ? (
        <p className="text-zinc-400 text-sm">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Receita</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-white">
                  R$ {(relatorio?.totais.receita ?? 0).toFixed(2).replace(".", ",")}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{relatorio?.totais.count ?? 0} OS concluídas</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Custo de peças</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-white">
                  R$ {(relatorio?.totais.custo ?? 0).toFixed(2).replace(".", ",")}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Lucro líquido</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={`text-2xl font-bold ${(relatorio?.totais.lucro ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  R$ {(relatorio?.totais.lucro ?? 0).toFixed(2).replace(".", ",")}
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-3">OS concluídas no período</h2>
            {!relatorio?.os.length ? (
              <p className="text-zinc-500 text-sm">Nenhuma OS concluída no período selecionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800">
                      <th className="text-left py-2 pr-4 font-normal">OS</th>
                      <th className="text-left py-2 pr-4 font-normal">Cliente</th>
                      <th className="text-left py-2 pr-4 font-normal">Central</th>
                      <th className="text-right py-2 pr-4 font-normal">Receita</th>
                      <th className="text-right py-2 pr-4 font-normal">Custo</th>
                      <th className="text-right py-2 pr-4 font-normal">Lucro</th>
                      <th className="text-right py-2 font-normal">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.os.map((o) => (
                      <tr key={o._id} className="border-b border-zinc-900 text-zinc-300">
                        <td className="py-2 pr-4 text-white font-medium">#{o.numero_os}</td>
                        <td className="py-2 pr-4">{o.cliente_id?.nome ?? "—"}</td>
                        <td className="py-2 pr-4">
                          {o.central_id ? `${o.central_id.marca} ${o.central_id.modelo}` : "—"}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          R$ {o.valor_cobrado.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          R$ {o.custo_total_pecas.toFixed(2).replace(".", ",")}
                        </td>
                        <td className={`py-2 pr-4 text-right font-medium ${o.lucro_liquido >= 0 ? "text-green-400" : "text-red-400"}`}>
                          R$ {o.lucro_liquido.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-2 text-right text-zinc-500">
                          {o.closed_at ? new Date(o.closed_at).toLocaleDateString("pt-BR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript e testes**

```bash
npx tsc --noEmit
npx jest --no-coverage
```

Esperado: TypeScript limpo, 42 testes passando

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/page.tsx" "app/(dashboard)/financeiro/page.tsx"
git commit -m "feat: dashboard executivo com KPIs e página de relatório financeiro"
```
