import { connectDB } from "@/lib/db"
import OS from "@/models/OS"
import Comissao from "@/models/Comissao"

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

// OS substituídas têm valores financeiros no subdoc devolucao, não nos campos raiz.
// Esses stages calculam os valores efetivos de receita/custo/lucro para ambos os status.
const ADD_FINANCEIRO = {
  $addFields: {
    _receita: {
      $cond: [
        { $eq: ["$status", "substituida"] },
        { $ifNull: ["$devolucao.novo_valor_cobrado", 0] },
        "$valor_cobrado",
      ],
    },
    _custo: {
      $cond: [
        { $eq: ["$status", "substituida"] },
        { $ifNull: ["$devolucao.custo_central", 0] },
        "$custo_total_pecas",
      ],
    },
    _lucro: {
      $cond: [
        { $eq: ["$status", "substituida"] },
        {
          $subtract: [
            { $ifNull: ["$devolucao.novo_valor_cobrado", 0] },
            { $ifNull: ["$devolucao.custo_central", 0] },
          ],
        },
        "$lucro_liquido",
      ],
    },
  },
}

export async function buscarEstatisticas() {
  await connectDB()
  const now = new Date()
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)

  const [porStatusRaw, totaisGeral, totaisMes, recentes, comissoesGeralRaw, comissoesMesRaw] =
    await Promise.all([
      OS.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      OS.aggregate([
        { $match: { status: { $in: ["concluida", "substituida"] } } },
        ADD_FINANCEIRO,
        {
          $group: {
            _id: null,
            receita: { $sum: "$_receita" },
            custo: { $sum: "$_custo" },
            lucro: { $sum: "$_lucro" },
            total: { $sum: 1 },
          },
        },
      ]),
      OS.aggregate([
        {
          $match: {
            $or: [
              { status: "concluida", closed_at: { $gte: inicioMes } },
              { status: "substituida", "devolucao.data": { $gte: inicioMes } },
            ],
          },
        },
        ADD_FINANCEIRO,
        {
          $group: {
            _id: null,
            receita: { $sum: "$_receita" },
            lucro: { $sum: "$_lucro" },
            total: { $sum: 1 },
          },
        },
      ]),
      OS.find({ status: "concluida" })
        .sort({ closed_at: -1 })
        .limit(5)
        .populate("cliente_id", "nome")
        .lean(),
      Comissao.aggregate([{ $group: { _id: null, total: { $sum: "$valor_comissao" } } }]),
      Comissao.aggregate([
        { $match: { created_at: { $gte: inicioMes } } },
        { $group: { _id: null, total: { $sum: "$valor_comissao" } } },
      ]),
    ])

  const por_status = Object.fromEntries(
    porStatusRaw.map((r: { _id: string; count: number }) => [r._id, r.count])
  )

  const comissoesGeral = comissoesGeralRaw[0]?.total ?? 0
  const comissoesMes = comissoesMesRaw[0]?.total ?? 0
  const geral = totaisGeral[0] ?? { receita: 0, custo: 0, lucro: 0, total: 0 }
  const mes = totaisMes[0] ?? { receita: 0, lucro: 0, total: 0 }

  return {
    por_status,
    totais: { ...geral, lucro: geral.lucro - comissoesGeral, comissoes: comissoesGeral },
    mes: { ...mes, lucro: mes.lucro - comissoesMes },
    recentes,
  }
}

export async function buscarRelatorioFinanceiro(periodo: Periodo) {
  await connectDB()
  const range = rangeParaPeriodo(periodo)

  const matchBase = range
    ? {
        $or: [
          { status: "concluida", closed_at: range },
          { status: "substituida", "devolucao.data": range },
        ],
      }
    : { status: { $in: ["concluida", "substituida"] } }

  const [totaisRaw, osRaw] = await Promise.all([
    OS.aggregate([
      { $match: matchBase },
      ADD_FINANCEIRO,
      {
        $group: {
          _id: null,
          receita: { $sum: "$_receita" },
          custo: { $sum: "$_custo" },
          lucro: { $sum: "$_lucro" },
          count: { $sum: 1 },
        },
      },
    ]),
    OS.find(matchBase)
      .sort({ closed_at: -1 })
      .populate("cliente_id", "nome")
      .populate("central_id", "marca modelo")
      .lean(),
  ])

  const osIds = osRaw.map((o) => o._id)
  const comissoesRaw = await Comissao.find({ os_id: { $in: osIds } })
    .select("os_id valor_comissao")
    .lean()

  const comissaoMap = new Map<string, number>()
  for (const c of comissoesRaw) {
    const key = c.os_id.toString()
    comissaoMap.set(key, (comissaoMap.get(key) ?? 0) + c.valor_comissao)
  }

  const os = osRaw.map((o) => ({
    ...o,
    valor_comissao: comissaoMap.get(o._id.toString()) ?? 0,
  }))

  const totalComissoes = comissoesRaw.reduce((s, c) => s + c.valor_comissao, 0)
  const totaisBase = totaisRaw[0] ?? { receita: 0, custo: 0, lucro: 0, count: 0 }

  return {
    periodo,
    totais: { ...totaisBase, comissoes: totalComissoes, lucro: totaisBase.lucro - totalComissoes },
    os,
  }
}
