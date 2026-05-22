import { connectDB } from "@/lib/db"
import Central from "@/models/Central"
import OS from "@/models/OS"

export type CreateCentralInput = {
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

export type UpdateCentralInput = Partial<CreateCentralInput>

export async function listarCentrais(q?: string) {
  await connectDB()
  if (!q) return Central.find({}).sort({ marca: 1, modelo: 1 }).lean()
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(escaped, "i")
  return Central.find({
    $or: [{ marca: regex }, { modelo: regex }, { codigo: regex }],
  }).sort({ marca: 1, modelo: 1 }).lean()
}

export async function buscarCentralPorId(id: string) {
  await connectDB()
  return Central.findById(id).lean()
}

export async function criarCentral(data: CreateCentralInput) {
  await connectDB()
  return Central.create(data)
}

export async function atualizarCentral(id: string, data: UpdateCentralInput) {
  await connectDB()
  return Central.findByIdAndUpdate(id, data, { returnDocument: "after" }).lean()
}

export async function listarReparosDaCentral(centralId: string) {
  await connectDB()
  return OS.find({ central_id: centralId, status: "concluida" })
    .populate("cliente_id", "nome")
    .sort({ closed_at: -1 })
    .lean()
}
