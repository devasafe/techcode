"use client"

import { useEffect, useState } from "react"
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

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "este_mes",     label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "este_ano",     label: "Este ano" },
  { value: "tudo",         label: "Tudo" },
]

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
  const pagas     = comissoes.filter((c) => c.pago)
  const totalPendente = pendentes.reduce((s, c) => s + c.valor_comissao, 0)
  const totalPago     = pagas.reduce((s, c) => s + c.valor_comissao, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-sm font-semibold uppercase tracking-widest text-[#F0F0F0]">
          Comissões
        </h1>

        <div className="flex gap-3 flex-wrap items-center">
          <Select value={tecnicoId} onValueChange={(v) => setTecnicoId(!v || v === "todos" ? "" : v)}>
            <SelectTrigger className="bg-[#111111] border-[#1C1C1C] text-[#F0F0F0] text-xs w-44 rounded-sm focus:ring-0 focus:border-[#E8FF47]">
              <SelectValue placeholder="Todos os técnicos" />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-[#1C1C1C]">
              <SelectItem value="todos" className="text-[#555555] focus:bg-[#1C1C1C] focus:text-white text-xs">
                Todos os técnicos
              </SelectItem>
              {tecnicos.map((t) => (
                <SelectItem key={t._id} value={t._id} className="text-[#F0F0F0] focus:bg-[#1C1C1C] focus:text-white text-xs">
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-widest whitespace-nowrap transition-colors rounded-sm ${
                  periodo === p.value
                    ? "text-[#E8FF47] border-b border-[#E8FF47]"
                    : "text-[#555555] hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erro && <p className="text-xs text-[#FF4444]">{erro}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 h-28 flex flex-col justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">A pagar</p>
          <div>
            <p className="font-mono text-xl font-bold text-[#F59E0B]">{moeda(totalPendente)}</p>
            <p className="font-mono text-[10px] text-[#555555] mt-0.5">{pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 h-28 flex flex-col justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Já pago</p>
          <div>
            <p className="font-mono text-xl font-bold text-[#22C55E]">{moeda(totalPago)}</p>
            <p className="font-mono text-[10px] text-[#555555] mt-0.5">{pagas.length} pago{pagas.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 h-28 flex flex-col justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Total gerado</p>
          <div>
            <p className="font-mono text-xl font-bold text-[#F0F0F0]">{moeda(totalPendente + totalPago)}</p>
            <p className="font-mono text-[10px] text-[#555555] mt-0.5">{comissoes.length} comissão{comissoes.length !== 1 ? "ões" : ""}</p>
          </div>
        </div>
      </div>

      {carregando ? (
        <p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>
      ) : !comissoes.length ? (
        <p className="text-xs text-[#555555] text-center py-8">Nenhuma comissão no período selecionado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111111] border-b border-[#1C1C1C]">
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">OS</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Técnico</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] text-right hidden sm:table-cell">Valor OS</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] text-right hidden sm:table-cell">%</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] text-right">Comissão</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hidden md:table-cell">Data</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Status</th>
                <th className="py-2 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C1C]">
              {comissoes.map((c) => (
                <tr key={c._id} className="hover:bg-[#141414] transition-colors">
                  <td className="py-3 px-4 font-mono text-sm text-[#E8FF47]">
                    #{c.os_id?.numero_os ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#F0F0F0]">{c.tecnico_id?.nome ?? "—"}</td>
                  <td className="py-3 px-4 font-mono text-sm text-right text-[#555555] hidden sm:table-cell">{moeda(c.valor_os)}</td>
                  <td className="py-3 px-4 font-mono text-sm text-right text-[#555555] hidden sm:table-cell">{c.pct_comissao}%</td>
                  <td className="py-3 px-4 font-mono text-sm text-right font-medium text-[#F0F0F0]">
                    {moeda(c.valor_comissao)}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm text-[#555555] hidden md:table-cell">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 px-4">
                    {c.pago ? (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#22C55E]">
                        Pago {c.data_pagamento ? new Date(c.data_pagamento).toLocaleDateString("pt-BR") : ""}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F59E0B]">Pendente</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!c.pago && (
                      <button
                        onClick={() => pagar(c._id)}
                        disabled={pagando === c._id}
                        className="text-[10px] font-semibold uppercase tracking-widest text-[#22C55E] hover:brightness-125 disabled:opacity-40 transition-all"
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
