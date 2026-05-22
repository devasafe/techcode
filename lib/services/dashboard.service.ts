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
