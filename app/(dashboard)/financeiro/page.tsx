"use client"

import { useEffect, useState } from "react"

type Periodo = "este_mes" | "mes_anterior" | "este_ano" | "tudo"

type OSFinanceiro = {
  _id: string
  numero_os: number
  status: string
  valor_cobrado: number
  custo_total_pecas: number
  lucro_liquido: number
  valor_comissao: number
  devolucao?: { novo_valor_cobrado?: number; custo_central?: number; data?: string }
  closed_at?: string
  cliente_id: { nome: string } | null
  central_id: { marca: string; modelo: string } | null
}

type Relatorio = {
  periodo: Periodo
  totais: { receita: number; custo: number; lucro: number; comissoes: number; count: number }
  os: OSFinanceiro[]
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

  const t = relatorio?.totais

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold uppercase tracking-wide text-[#F0F0F0]">
          Financeiro
        </h1>
        <div className="flex gap-1">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-colors rounded-sm ${
                periodo === p.value
                  ? "text-[#E8FF47] border-b border-[#E8FF47]"
                  : "text-[#B4B4B4] hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="text-sm text-[#FF4444]">{erro}</p>}

      {carregando ? (
        <p className="text-sm uppercase tracking-wide text-[#B4B4B4]">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 min-h-28 flex flex-col justify-between">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">Receita</p>
              <div>
                <p className="font-mono text-xl font-bold text-[#F0F0F0]">{moeda(t?.receita ?? 0)}</p>
                <p className="font-mono text-[12px] text-[#B4B4B4] mt-0.5">{t?.count ?? 0} OS</p>
              </div>
            </div>

            <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 min-h-28 flex flex-col justify-between">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">Custo de peças</p>
              <p className="font-mono text-xl font-bold text-[#F0F0F0]">{moeda(t?.custo ?? 0)}</p>
            </div>

            <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 min-h-28 flex flex-col justify-between">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">Comissões</p>
              <p className="font-mono text-xl font-bold text-[#FB923C]">{moeda(t?.comissoes ?? 0)}</p>
            </div>

            <div className="bg-[#111111] border border-[#1C1C1C] rounded-sm p-4 min-h-28 flex flex-col justify-between">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">Lucro líquido</p>
              <p className={`font-mono text-xl font-bold ${(t?.lucro ?? 0) >= 0 ? "text-[#22C55E]" : "text-[#FF4444]"}`}>
                {moeda(t?.lucro ?? 0)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#111111] border-b border-[#1C1C1C]">
                  <th className="py-2 px-4 text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4]">#</th>
                  <th className="py-2 px-4 text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] hidden sm:table-cell">Cliente</th>
                  <th className="py-2 px-4 text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] hidden lg:table-cell">Central</th>
                  <th className="py-2 px-4 text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] text-right">Receita</th>
                  <th className="py-2 px-4 text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] text-right hidden md:table-cell">Custo</th>
                  <th className="py-2 px-4 text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] text-right hidden md:table-cell">Comissão</th>
                  <th className="py-2 px-4 text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] text-right">Lucro</th>
                  <th className="py-2 px-4 text-[12px] font-bold uppercase tracking-wide text-[#B4B4B4] text-right hidden sm:table-cell">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {relatorio?.os.map((o) => {
                  const substituida = o.status === "substituida"
                  const receita = substituida ? (o.devolucao?.novo_valor_cobrado ?? 0) : o.valor_cobrado
                  const custo   = substituida ? (o.devolucao?.custo_central ?? 0)      : o.custo_total_pecas
                  const lucro   = (substituida ? receita - custo : o.lucro_liquido) - o.valor_comissao
                  const data    = substituida ? o.devolucao?.data : o.closed_at
                  return (
                    <tr key={o._id} className="hover:bg-[#141414] transition-colors">
                      <td className="py-3 px-4 font-mono text-base text-[#E8FF47]">
                        #{o.numero_os}
                        {substituida && (
                          <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-[#FB923C]">subst.</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-base text-[#F0F0F0] hidden sm:table-cell">{o.cliente_id?.nome ?? "—"}</td>
                      <td className="py-3 px-4 text-base text-[#B4B4B4] hidden lg:table-cell">
                        {o.central_id ? `${o.central_id.marca} ${o.central_id.modelo}` : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-base text-right text-[#F0F0F0]">{moeda(receita)}</td>
                      <td className="py-3 px-4 font-mono text-base text-right text-[#B4B4B4] hidden md:table-cell">{moeda(custo)}</td>
                      <td className="py-3 px-4 font-mono text-base text-right text-[#FB923C] hidden md:table-cell">
                        {o.valor_comissao > 0 ? moeda(o.valor_comissao) : "—"}
                      </td>
                      <td className={`py-3 px-4 font-mono text-base text-right font-medium ${lucro >= 0 ? "text-[#22C55E]" : "text-[#FF4444]"}`}>
                        {moeda(lucro)}
                      </td>
                      <td className="py-3 px-4 font-mono text-base text-right text-[#B4B4B4] hidden sm:table-cell">
                        {data ? new Date(data).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!relatorio?.os.length && !carregando && (
              <p className="text-sm text-[#B4B4B4] text-center py-8">Nenhuma OS concluída no período selecionado.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
