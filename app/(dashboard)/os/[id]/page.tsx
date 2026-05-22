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

  const [solucao, setSolucao] = useState("")
  const [valorCobrado, setValorCobrado] = useState("0")
  const [garantiaDias, setGarantiaDias] = useState("90")
  const [pecas, setPecas] = useState<Peca[]>([])
  const [nomePeca, setNomePeca] = useState("")
  const [custoPeca, setCustoPeca] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erroConcluir, setErroConcluir] = useState("")
  const [atualizando, setAtualizando] = useState(false)

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
    if (atualizando) return
    setAtualizando(true)
    try {
      const res = await fetch(`/api/os/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (res.ok) carregar()
    } finally {
      setAtualizando(false)
    }
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
        let data: { error?: string } = {}
        try { data = await res.json() } catch { /* ignore */ }
        setErroConcluir(data.error ?? "Erro ao concluir OS.")
        return
      }
      setAbrirConcluir(false)
      carregar()
    } catch {
      setErroConcluir("Erro de conexão. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <p className="text-zinc-400 text-sm">Carregando...</p>
  if (!os) return null

  const custoTotal = pecas.reduce((s, p) => s + p.custo, 0)

  return (
    <div className="space-y-6 max-w-2xl">
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

      {os.status === "aberta" && (
        <Button onClick={() => atualizarStatus("na_fila")} disabled={atualizando}>Colocar na fila</Button>
      )}
      {os.status === "na_fila" && (
        <Button onClick={() => atualizarStatus("em_andamento")} disabled={atualizando}>Iniciar serviço</Button>
      )}
      {os.status === "em_andamento" && (
        <Button onClick={() => setAbrirConcluir(true)}>Concluir OS</Button>
      )}

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

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Defeito relatado</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-white text-sm">{os.defeito_descricao}</p>
        </CardContent>
      </Card>

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
              <div className={`flex justify-between ${os.lucro_liquido >= 0 ? "text-green-400" : "text-red-400"}`}>
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

            {parseFloat(valorCobrado) > 0 && (() => {
              const lucro = parseFloat(valorCobrado) - custoTotal
              return (
                <p className={`text-xs ${lucro >= 0 ? "text-green-400" : "text-red-400"}`}>
                  Lucro estimado: R$ {lucro.toFixed(2).replace(".", ",")}
                </p>
              )
            })()}

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
