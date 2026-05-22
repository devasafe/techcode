"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Receita</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-white">
                  R$ {(relatorio?.totais.receita ?? 0).toFixed(2).replace(".", ",")}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{relatorio?.totais.count ?? 0} OS</p>
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
                <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">Comissões</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-orange-400">
                  R$ {(relatorio?.totais.comissoes ?? 0).toFixed(2).replace(".", ",")}
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
                      <th className="text-right py-2 pr-4 font-normal">Comissão</th>
                      <th className="text-right py-2 pr-4 font-normal">Lucro</th>
                      <th className="text-right py-2 font-normal">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.os.map((o) => {
                      const substituida = o.status === "substituida"
                      const receita = substituida ? (o.devolucao?.novo_valor_cobrado ?? 0) : o.valor_cobrado
                      const custo = substituida ? (o.devolucao?.custo_central ?? 0) : o.custo_total_pecas
                      const lucro = (substituida ? receita - custo : o.lucro_liquido) - o.valor_comissao
                      const data = substituida ? o.devolucao?.data : o.closed_at
                      return (
                        <tr key={o._id} className="border-b border-zinc-900 text-zinc-300">
                          <td className="py-2 pr-4 text-white font-medium">
                            #{o.numero_os}
                            {substituida && (
                              <span className="ml-2 text-xs text-orange-400 font-normal">subst.</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">{o.cliente_id?.nome ?? "—"}</td>
                          <td className="py-2 pr-4">
                            {o.central_id ? `${o.central_id.marca} ${o.central_id.modelo}` : "—"}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            R$ {receita.toFixed(2).replace(".", ",")}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            R$ {custo.toFixed(2).replace(".", ",")}
                          </td>
                          <td className="py-2 pr-4 text-right text-orange-400">
                            {o.valor_comissao > 0 ? `R$ ${o.valor_comissao.toFixed(2).replace(".", ",")}` : "—"}
                          </td>
                          <td className={`py-2 pr-4 text-right font-medium ${lucro >= 0 ? "text-green-400" : "text-red-400"}`}>
                            R$ {lucro.toFixed(2).replace(".", ",")}
                          </td>
                          <td className="py-2 text-right text-zinc-500">
                            {data ? new Date(data).toLocaleDateString("pt-BR") : "—"}
                          </td>
                        </tr>
                      )
                    })}
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
