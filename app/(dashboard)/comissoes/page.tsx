"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Periodo = "este_mes" | "mes_anterior" | "este_ano" | "tudo"

type Tecnico = { _id: string; nome: string }

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

const PERIODO_LABELS: Record<Periodo, string> = {
  este_mes: "Este mês",
  mes_anterior: "Mês anterior",
  este_ano: "Este ano",
  tudo: "Todo o período",
}

function moeda(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`
}

export default function ComissoesPage() {
  const [periodo, setPeriodo] = useState<Periodo>("este_mes")
  const [tecnicoId, setTecnicoId] = useState("")
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [pagando, setPagando] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/usuarios", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: (Tecnico & { perfis: string[] })[]) =>
        setTecnicos(lista.filter((u) => u.perfis.includes("tecnico")))
      )
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setCarregando(true)
    setErro("")
    const params = new URLSearchParams({ periodo })
    if (tecnicoId) params.set("tecnico_id", tecnicoId)
    fetch(`/api/comissoes?${params}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) { setErro("Erro ao carregar comissões."); return }
        setComissoes(await r.json())
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") setErro("Erro ao carregar comissões.")
      })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false) })
    return () => controller.abort()
  }, [periodo, tecnicoId])

  async function pagar(id: string) {
    setPagando(id)
    try {
      const r = await fetch(`/api/comissoes/${id}/pagar`, { method: "POST" })
      if (!r.ok) return
      const atualizada: Comissao = await r.json()
      setComissoes((prev) => prev.map((c) => (c._id === id ? atualizada : c)))
    } finally {
      setPagando(null)
    }
  }

  const pendentes = comissoes.filter((c) => !c.pago)
  const pagas = comissoes.filter((c) => c.pago)
  const totalPendente = pendentes.reduce((s, c) => s + c.valor_comissao, 0)
  const totalPago = pagas.reduce((s, c) => s + c.valor_comissao, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Comissões</h1>

        <div className="flex gap-3 flex-wrap items-center">
          <Select value={tecnicoId} onValueChange={(v) => setTecnicoId(!v || v === "todos" ? "" : v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white w-48">
              <SelectValue placeholder="Todos os técnicos" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="todos">Todos os técnicos</SelectItem>
              {tecnicos.map((t) => (
                <SelectItem key={t._id} value={t._id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
      </div>

      {erro && <p className="text-red-400 text-sm">{erro}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">
              A pagar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-yellow-400">{moeda(totalPendente)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{pendentes.length} comissão{pendentes.length !== 1 ? "ões" : ""}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">
              Já pago
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-green-400">{moeda(totalPago)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{pagas.length} comissão{pagas.length !== 1 ? "ões" : ""}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">
              Total gerado
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-white">{moeda(totalPendente + totalPago)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{comissoes.length} comissão{comissoes.length !== 1 ? "ões" : ""}</p>
          </CardContent>
        </Card>
      </div>

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
                <th className="text-left py-2 pr-4 font-normal">Data</th>
                <th className="text-left py-2 pr-4 font-normal">Status</th>
                <th className="text-left py-2 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {comissoes.map((c) => (
                <tr key={c._id} className="border-b border-zinc-900 text-zinc-300">
                  <td className="py-2 pr-4 text-white font-medium">
                    #{c.os_id?.numero_os ?? "—"}
                  </td>
                  <td className="py-2 pr-4">{c.tecnico_id?.nome ?? "—"}</td>
                  <td className="py-2 pr-4 text-right">{moeda(c.valor_os)}</td>
                  <td className="py-2 pr-4 text-right">{c.pct_comissao}%</td>
                  <td className="py-2 pr-4 text-right font-medium text-white">
                    {moeda(c.valor_comissao)}
                  </td>
                  <td className="py-2 pr-4 text-zinc-500">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-2 pr-4">
                    {c.pago ? (
                      <span className="text-green-400 text-xs">
                        Pago {c.data_pagamento
                          ? new Date(c.data_pagamento).toLocaleDateString("pt-BR")
                          : ""}
                      </span>
                    ) : (
                      <span className="text-yellow-400 text-xs">Pendente</span>
                    )}
                  </td>
                  <td className="py-2">
                    {!c.pago && (
                      <button
                        onClick={() => pagar(c._id)}
                        disabled={pagando === c._id}
                        className="px-3 py-1 rounded text-xs bg-green-700 hover:bg-green-600 text-white disabled:opacity-50 transition-colors"
                      >
                        {pagando === c._id ? "..." : "Pagar"}
                      </button>
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
