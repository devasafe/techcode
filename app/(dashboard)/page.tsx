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
