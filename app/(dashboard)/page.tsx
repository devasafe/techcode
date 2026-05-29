"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AlertTriangle } from "lucide-react"

const moeda = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`

type GarantiaOS = {
  _id: string
  numero_os: number
  garantia_ate: string
  defeito_descricao: string
  cliente_id: { nome: string; telefone: string } | null
  central_id: { marca: string; modelo: string } | null
}

type TecnicoStats = {
  _id: string
  nome: string
  os_mes: number
  receita_mes: number
  lucro_mes: number
  comissao_mes: number
  em_aberto: number
}

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
    central_id?: { marca: string; modelo: string } | null
  }>
  garantias_proximas: GarantiaOS[]
  por_tecnico: TecnicoStats[]
}

function diasRestantes(data: string) {
  const diff = new Date(data).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
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

  const isAdmin = session?.user?.perfis?.some((p) => ["admin", "atendente"].includes(p)) ?? false
  const porTecnico = isAdmin
    ? (stats?.por_tecnico ?? [])
    : (stats?.por_tecnico ?? []).filter((t) => t._id === session?.user?.id)

  const aberta      = stats?.por_status["aberta"] ?? 0
  const naFila      = stats?.por_status["na_fila"] ?? 0
  const emAndamento = stats?.por_status["em_andamento"] ?? 0
  const emAberto    = aberta + naFila + emAndamento

  if (carregando) return (
    <p className="text-xs uppercase tracking-widest text-[#555555]">Carregando...</p>
  )

  return (
    <div className="space-y-8">
      {/* Alertas de garantia */}
      {(stats?.garantias_proximas.length ?? 0) > 0 && (
        <div className="space-y-2">
          {stats!.garantias_proximas.map((g) => {
            const dias = diasRestantes(g.garantia_ate)
            return (
              <div
                key={g._id}
                onClick={() => router.push(`/os/${g._id}`)}
                className="flex items-start gap-3 bg-[#2A1800] border border-[#F59E0B]/30 rounded-sm px-4 py-3 cursor-pointer hover:border-[#F59E0B]/60 transition-colors"
              >
                <AlertTriangle size={14} className="text-[#F59E0B] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#F59E0B] font-semibold">
                    OS #{g.numero_os} — garantia vence em {dias === 0 ? "hoje" : `${dias} dia${dias !== 1 ? "s" : ""}`}
                  </p>
                  <p className="text-xs text-[#888888] truncate">
                    {g.cliente_id?.nome ?? "—"} · {g.central_id ? `${g.central_id.marca} ${g.central_id.modelo}` : "—"}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-[#555555] shrink-0">
                  {new Date(g.garantia_ate).toLocaleDateString("pt-BR")}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-[#111111] border border-[#1C1C1C] p-4 flex flex-col justify-between h-28">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">
            OS este mês
          </span>
          <span className="font-mono text-4xl font-bold text-[#E8FF47]">
            {stats?.mes.total ?? 0}
          </span>
        </div>

        <div className="bg-[#111111] border border-[#1C1C1C] p-4 flex flex-col justify-between h-28">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">
            Receita
          </span>
          <span className="font-mono text-xl text-white">
            {moeda(stats?.mes.receita ?? 0)}
          </span>
        </div>

        <div className="bg-[#111111] border border-[#1C1C1C] p-4 flex flex-col justify-between h-28">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">
            Lucro
          </span>
          <span className={`font-mono text-xl ${(stats?.mes.lucro ?? 0) >= 0 ? "text-[#22C55E]" : "text-[#FF4444]"}`}>
            {moeda(stats?.mes.lucro ?? 0)}
          </span>
        </div>

        <div className="bg-[#111111] border border-[#1C1C1C] p-4 flex flex-col justify-between h-28">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">
            Em aberto
          </span>
          <span className="font-mono text-4xl font-bold text-[#F59E0B]">
            {emAberto}
          </span>
        </div>
      </div>

      {/* Breakdown de abertos */}
      {emAberto > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Abertas",       valor: aberta,      cls: "text-[#888888]" },
            { label: "Na fila",       valor: naFila,      cls: "text-[#60A5FA]" },
            { label: "Em andamento",  valor: emAndamento, cls: "text-[#F59E0B]" },
          ].map(({ label, valor, cls }) => (
            <div key={label} className="bg-[#111111] border border-[#1C1C1C] px-4 py-3 flex items-center justify-between rounded-sm">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">{label}</span>
              <span className={`font-mono text-lg font-bold ${cls}`}>{valor}</span>
            </div>
          ))}
        </div>
      )}

      {/* Últimas OS */}
      <div>
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-4">
          Últimas OS concluídas
        </h2>

        {!stats?.recentes.length ? (
          <p className="text-xs text-[#555555]">Nenhuma OS concluída ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#111111] border-b border-[#1C1C1C]">
                  <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">#</th>
                  <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555]">Cliente</th>
                  <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] hidden sm:table-cell">Central</th>
                  <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] text-right">Valor</th>
                  <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-[#555555] text-right hidden md:table-cell">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {stats.recentes.map((o) => (
                  <tr
                    key={o._id}
                    className="hover:bg-[#141414] transition-colors cursor-pointer"
                    onClick={() => router.push(`/os/${o._id}`)}
                  >
                    <td className="py-3 px-4 font-mono text-sm text-[#E8FF47]">#{o.numero_os}</td>
                    <td className="py-3 px-4 text-sm text-[#F0F0F0]">{o.cliente_id?.nome ?? "—"}</td>
                    <td className="py-3 px-4 text-sm text-[#555555] hidden sm:table-cell">
                      {o.central_id ? `${o.central_id.marca} ${o.central_id.modelo}` : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-right text-white">{moeda(o.valor_cobrado)}</td>
                    <td className="py-3 px-4 font-mono text-sm text-right text-[#555555] hidden md:table-cell">
                      {o.closed_at ? new Date(o.closed_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Por técnico */}
      {porTecnico.length > 0 && (
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-4">
            {isAdmin ? "Desempenho por técnico — este mês" : "Meu desempenho — este mês"}
          </h2>
          <div className="space-y-2">
            {porTecnico.map((t) => (
              <div key={t._id} className="bg-[#111111] border border-[#1C1C1C] rounded-sm px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#F0F0F0]">{t.nome}</span>
                  {t.em_aberto > 0 && (
                    <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm bg-[#2A2000] text-[#F59E0B]">
                      {t.em_aberto} em aberto
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#555555] mb-0.5">OS concluídas</p>
                    <p className="font-mono text-lg font-bold text-[#E8FF47]">{t.os_mes}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#555555] mb-0.5">Receita</p>
                    <p className="font-mono text-sm text-white">{moeda(t.receita_mes)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#555555] mb-0.5">Lucro</p>
                    <p className={`font-mono text-sm ${t.lucro_mes >= 0 ? "text-[#22C55E]" : "text-[#FF4444]"}`}>
                      {moeda(t.lucro_mes)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#555555] mb-0.5">Comissão</p>
                    <p className="font-mono text-sm text-[#60A5FA]">{moeda(t.comissao_mes)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
