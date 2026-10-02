import { connectDB } from "@/lib/db"
import OS from "@/models/OS"
import Comissao from "@/models/Comissao"
import {
  ADD_FINANCEIRO,
  ADD_LUCRO,
  matchFinanceiro,
} from "./financeiro.stages"
import "@/models/Cliente"
import "@/models/Usuario"
import Central from "@/models/Central"

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

  const em7dias = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [porStatusRaw, totaisGeral, totaisMes, recentes, comissoesGeralRaw, comissoesMesRaw, garantiasRaw, osPorTecnicoRaw, comissaoPorTecnicoRaw, abertoPorTecnicoRaw] =
    await Promise.all([
      OS.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      OS.aggregate([
        { $match: matchFinanceiro() },
        ADD_FINANCEIRO,
      ADD_LUCRO,
        ADD_LUCRO,
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
        { $match: matchFinanceiro({ $gte: inicioMes }) },
        ADD_FINANCEIRO,
      ADD_LUCRO,
        ADD_LUCRO,
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
        .populate("central_id", "marca modelo")
        .lean(),
      Comissao.aggregate([{ $group: { _id: null, total: { $sum: "$valor_comissao" } } }]),
      Comissao.aggregate([
        { $match: { created_at: { $gte: inicioMes } } },
        { $group: { _id: null, total: { $sum: "$valor_comissao" } } },
      ]),
      OS.find({ status: "concluida", garantia_ate: { $gte: now, $lte: em7dias } })
        .sort({ garantia_ate: 1 })
        .populate("cliente_id", "nome telefone")
        .populate("central_id", "marca modelo")
        .lean(),
      OS.aggregate([
        {
          $match: {
            tecnico_id: { $exists: true, $ne: null },
            $or: [
              { status: "concluida", closed_at: { $gte: inicioMes } },
              { status: "substituida", "devolucao.data": { $gte: inicioMes } },
            ],
          },
        },
        ADD_FINANCEIRO,
      ADD_LUCRO,
        ADD_LUCRO,
        {
          $group: {
            _id: "$tecnico_id",
            os_mes: { $sum: 1 },
            receita_mes: { $sum: "$_receita" },
            lucro_mes: { $sum: "$_lucro" },
          },
        },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "tecnico",
          },
        },
        { $unwind: "$tecnico" },
        {
          $project: {
            nome: "$tecnico.nome",
            os_mes: 1,
            receita_mes: 1,
            lucro_mes: 1,
          },
        },
        { $sort: { receita_mes: -1 } },
      ]),
      Comissao.aggregate([
        { $match: { created_at: { $gte: inicioMes } } },
        { $group: { _id: "$tecnico_id", comissao_mes: { $sum: "$valor_comissao" } } },
      ]),
      OS.aggregate([
        {
          $match: {
            tecnico_id: { $exists: true, $ne: null },
            status: { $in: ["aberta", "na_fila", "em_andamento"] },
          },
        },
        { $group: { _id: "$tecnico_id", em_aberto: { $sum: 1 } } },
      ]),
    ])

  const por_status = Object.fromEntries(
    porStatusRaw.map((r: { _id: string; count: number }) => [r._id, r.count])
  )

  const comissoesGeral = comissoesGeralRaw[0]?.total ?? 0
  const comissoesMes = comissoesMesRaw[0]?.total ?? 0
  const geral = totaisGeral[0] ?? { receita: 0, custo: 0, lucro: 0, total: 0 }
  const mes = totaisMes[0] ?? { receita: 0, lucro: 0, total: 0 }

  const comissaoTecnicoMap = new Map<string, number>()
  for (const c of comissaoPorTecnicoRaw) {
    comissaoTecnicoMap.set(c._id.toString(), c.comissao_mes)
  }
  const abertoPorTecnicoMap = new Map<string, number>()
  for (const a of abertoPorTecnicoRaw) {
    abertoPorTecnicoMap.set(a._id.toString(), a.em_aberto)
  }

  const por_tecnico = osPorTecnicoRaw.map((t: { _id: { toString(): string }; nome: string; os_mes: number; receita_mes: number; lucro_mes: number }) => {
    const comissao_mes = comissaoTecnicoMap.get(t._id.toString()) ?? 0
    return {
      _id: t._id.toString(),
      nome: t.nome,
      os_mes: t.os_mes,
      receita_mes: t.receita_mes,
      lucro_mes: t.lucro_mes - comissao_mes,
      comissao_mes,
      em_aberto: abertoPorTecnicoMap.get(t._id.toString()) ?? 0,
    }
  })

  return {
    por_status,
    totais: { ...geral, lucro: geral.lucro - comissoesGeral, comissoes: comissoesGeral },
    mes: { ...mes, lucro: mes.lucro - comissoesMes },
    recentes,
    garantias_proximas: garantiasRaw,
    por_tecnico,
  }
}

export async function buscarRelatorioFinanceiro(periodo: Periodo) {
  await connectDB()
  const range = rangeParaPeriodo(periodo)

  const matchBase = matchFinanceiro(range)

  const [totaisRaw, osRaw] = await Promise.all([
    OS.aggregate([
      { $match: matchBase },
      ADD_FINANCEIRO,
      ADD_LUCRO,
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

/**
 * Medição de adoção. Existe porque a v1 deste sistema foi ABANDONADA, e a
 * explicação ("era fricção no cadastro") é hipótese declarada, não medida.
 *
 * Sem este número, duas semanas de uso não produzem informação nenhuma — só a
 * impressão de quem lembrar. Com ele dá para responder três perguntas:
 *  1. estão registrando? (entradas por dia)
 *  2. estão usando a entrada nova ou o formulário antigo? (origem da peça)
 *  3. estão gravando áudio e foto, ou pulando? (uso da captura)
 */
export async function medirAdocao(dias = 14) {
  await connectDB()
  const desde = new Date()
  desde.setDate(desde.getDate() - dias)
  desde.setHours(0, 0, 0, 0)

  const [porDia, porUsuario, captura, viaEntradaRapida, aIdentificar] = await Promise.all([
    OS.aggregate<{ _id: string; n: number }>([
      { $match: { created_at: { $gte: desde } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          n: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    OS.aggregate<{ _id: unknown; nome: string; n: number }>([
      { $match: { created_at: { $gte: desde } } },
      { $group: { _id: "$tecnico_id", n: { $sum: 1 } } },
      { $lookup: { from: "usuarios", localField: "_id", foreignField: "_id", as: "u" } },
      { $project: { n: 1, nome: { $ifNull: [{ $first: "$u.nome" }, "sem técnico"] } } },
      { $sort: { n: -1 } },
    ]),

    // Quantas entradas tiveram foto, áudio da peça e áudio do defeito.
    OS.aggregate<{
      total: number
      com_foto: number
      com_audio: number
      com_audio_peca: number
      com_defeito_escrito: number
    }>([
      { $match: { created_at: { $gte: desde } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          com_foto: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: { $ifNull: ["$midias", []] },
                          cond: { $eq: ["$$this.tipo", "foto"] },
                        },
                      },
                    },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
          com_audio: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: { $ifNull: ["$midias", []] },
                          cond: { $eq: ["$$this.tipo", "audio"] },
                        },
                      },
                    },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
          com_audio_peca: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: { $ifNull: ["$midias", []] },
                          cond: { $eq: ["$$this.papel", "peca"] },
                        },
                      },
                    },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
          com_defeito_escrito: {
            $sum: {
              $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$defeito_descricao", ""] } }, 0] }, 1, 0],
            },
          },
        },
      },
    ]),

    // `origem: entrada_rapida` só é gravado pela tela nova — é o que distingue
    // "estão usando a entrada" de "voltaram para o formulário antigo".
    Central.countDocuments({ origem: "entrada_rapida", created_at: { $gte: desde } }),

    Central.countDocuments({ status_catalogo: "rascunho" }),
  ])

  const c = captura[0] ?? {
    total: 0,
    com_foto: 0,
    com_audio: 0,
    com_audio_peca: 0,
    com_defeito_escrito: 0,
  }

  return {
    dias,
    desde,
    por_dia: porDia.map((d) => ({ dia: d._id, n: d.n })),
    por_usuario: porUsuario.map((u) => ({ nome: u.nome, n: u.n })),
    total: c.total,
    media_por_dia: Number((c.total / dias).toFixed(1)),
    com_foto: c.com_foto,
    com_audio: c.com_audio,
    com_audio_peca: c.com_audio_peca,
    com_defeito_escrito: c.com_defeito_escrito,
    via_entrada_rapida: viaEntradaRapida,
    a_identificar: aIdentificar,
  }
}
