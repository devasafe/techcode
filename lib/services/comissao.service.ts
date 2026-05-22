import { connectDB } from "@/lib/db"
import Comissao from "@/models/Comissao"
import OS from "@/models/OS"
import Usuario from "@/models/Usuario"

export type Periodo = "este_mes" | "mes_anterior" | "este_ano" | "tudo"

function rangeParaPeriodo(periodo: Periodo): { $gte: Date; $lte?: Date } | null {
  const now = new Date()
  switch (periodo) {
    case "este_mes":
      return { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
    case "mes_anterior":
      return {
        $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        $lte: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      }
    case "este_ano":
      return { $gte: new Date(now.getFullYear(), 0, 1) }
    case "tudo":
      return null
  }
}

export async function gerarComissao(osId: string, tecnicoId: string) {
  await connectDB()
  const [os, tecnico] = await Promise.all([
    OS.findById(osId).lean(),
    Usuario.findById(tecnicoId).lean(),
  ])
  if (!os || !tecnico) return null
  if (!tecnico.comissao_pct || tecnico.comissao_pct === 0) return null
  const valor_comissao = (os.valor_cobrado * tecnico.comissao_pct) / 100
  return Comissao.create({
    os_id: osId,
    tecnico_id: tecnicoId,
    valor_os: os.valor_cobrado,
    pct_comissao: tecnico.comissao_pct,
    valor_comissao,
  })
}

export type ComissaoFiltros = {
  tecnico_id?: string
  periodo?: Periodo
}

export async function listarComissoes(filtros?: ComissaoFiltros) {
  await connectDB()
  const query: Record<string, unknown> = {}
  if (filtros?.tecnico_id) query.tecnico_id = filtros.tecnico_id
  if (filtros?.periodo) {
    const range = rangeParaPeriodo(filtros.periodo)
    if (range) query.created_at = range
  }
  return Comissao.find(query)
    .populate("os_id", "numero_os valor_cobrado")
    .populate("tecnico_id", "nome")
    .sort({ created_at: -1 })
    .lean()
}

export async function marcarComoPago(id: string) {
  await connectDB()
  return Comissao.findByIdAndUpdate(
    id,
    { $set: { pago: true, data_pagamento: new Date() } },
    { returnDocument: "after" }
  )
    .populate("os_id", "numero_os valor_cobrado")
    .populate("tecnico_id", "nome")
    .lean()
}
