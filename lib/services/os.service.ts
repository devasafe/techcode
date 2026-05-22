import { connectDB } from "@/lib/db"
import OS from "@/models/OS"
import type { OSStatus } from "@/types"

export type CreateOSInput = {
  cliente_id: string
  central_id: string
  defeito_descricao: string
  tecnico_id?: string
}

export type UpdateOSInput = {
  status?: OSStatus
  solucao_descricao?: string
  pecas?: { nome: string; custo: number }[]
  valor_cobrado?: number
  garantia_dias?: number
  tecnico_id?: string
}

export async function listarOS(filtros?: { status?: OSStatus; cliente_id?: string }) {
  await connectDB()
  const query: Record<string, unknown> = {}
  if (filtros?.status) query.status = filtros.status
  if (filtros?.cliente_id) query.cliente_id = filtros.cliente_id
  return OS.find(query)
    .populate("cliente_id", "nome telefone")
    .populate("central_id", "marca modelo codigo")
    .sort({ created_at: -1 })
    .lean()
}

export async function buscarOSPorId(id: string) {
  await connectDB()
  return OS.findById(id)
    .populate("cliente_id", "nome telefone")
    .populate("central_id", "marca modelo codigo")
    .lean()
}

export async function criarOS(data: CreateOSInput) {
  await connectDB()
  return OS.create(data)
}

export async function atualizarOS(id: string, data: UpdateOSInput) {
  await connectDB()
  const update: Record<string, unknown> = {}

  if (data.status !== undefined) update.status = data.status
  if (data.solucao_descricao !== undefined) update.solucao_descricao = data.solucao_descricao
  if (data.tecnico_id !== undefined) update.tecnico_id = data.tecnico_id
  if (data.valor_cobrado !== undefined) update.valor_cobrado = data.valor_cobrado
  if (data.garantia_dias !== undefined) update.garantia_dias = data.garantia_dias

  if (data.pecas !== undefined) {
    update.pecas = data.pecas
    update.custo_total_pecas = data.pecas.reduce((s, p) => s + p.custo, 0)
  }

  if (data.status === "concluida") {
    const atual = await OS.findById(id).lean()
    if (!atual) return null // non-existent ID — findByIdAndUpdate will also return null

    if (atual.status !== "concluida") {
      // OS is not yet concluded — apply financial recalculation
      const now = new Date()
      update.closed_at = now

      const vCobrado = data.valor_cobrado ?? atual.valor_cobrado ?? 0
      const custo =
        data.pecas !== undefined
          ? data.pecas.reduce((s, p) => s + p.custo, 0)
          : atual.custo_total_pecas ?? 0

      update.lucro_liquido = vCobrado - custo
      if (update.valor_cobrado === undefined) update.valor_cobrado = vCobrado

      if ((data.garantia_dias ?? 0) > 0) {
        const garantia = new Date(now)
        garantia.setDate(garantia.getDate() + (data.garantia_dias ?? 0))
        update.garantia_ate = garantia
      }
    }
    // already concluded — skip financial recalculation, just update non-financial fields
  }

  return OS.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" })
    .populate("cliente_id", "nome telefone")
    .populate("central_id", "marca modelo codigo")
    .lean()
}

export async function listarOSFila() {
  await connectDB()
  return OS.find({ status: { $in: ["aberta", "na_fila", "em_andamento"] } })
    .populate("cliente_id", "nome")
    .populate("central_id", "marca modelo")
    .sort({ created_at: 1 })
    .lean()
}
