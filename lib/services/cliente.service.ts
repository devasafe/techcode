import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import OS from "@/models/OS"
import "@/models/Central"
import type { Types } from "mongoose"

export type CreateClienteInput = {
  nome: string
  telefone: string
  email?: string
  cpf_cnpj?: string
  endereco?: string
  tipo_cliente?: "mecanico" | "usuario"
}

export type UpdateClienteInput = Partial<CreateClienteInput> & {
  observacao?: string
  flag_problematico?: boolean
}

export type ScoreCliente = "verde" | "amarelo" | "vermelho"

type StatsOS = { total: number; devolvidas: number; canceladas: number; retornos: number; testes: number }

function calcularScore(stats: StatsOS, flagProblematico: boolean): ScoreCliente {
  if (flagProblematico) return "vermelho"
  if (stats.total === 0) return "verde"
  // devoluções pesam menos (1.5) pois podem acontecer por motivos legítimos
  // testes frequentes indicam diagnóstico errado (1.5 cada)
  const pontos = stats.devolvidas * 1.5 + stats.testes * 1.5 + stats.retornos * 1 + stats.canceladas * 0.3
  if (pontos === 0) return "verde"
  if (pontos < 4) return "amarelo"
  return "vermelho"
}

async function buscarStatsOS(clienteIds: Types.ObjectId[]) {
  return OS.aggregate<StatsOS & { _id: Types.ObjectId }>([
    { $match: { cliente_id: { $in: clienteIds } } },
    {
      $group: {
        _id: "$cliente_id",
        total: { $sum: 1 },
        devolvidas: { $sum: { $cond: [{ $eq: ["$status", "devolvida"] }, 1, 0] } },
        canceladas: { $sum: { $cond: [{ $eq: ["$status", "cancelada"] }, 1, 0] } },
        retornos: { $sum: { $size: { $ifNull: ["$retornos_garantia", []] } } },
        testes: { $sum: { $cond: [{ $eq: ["$tipo_os", "teste"] }, 1, 0] } },
      },
    },
  ])
}

export async function listarClientes(q?: string) {
  await connectDB()
  if (!q) return Cliente.find({}).sort({ nome: 1 }).lean()
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(escaped, "i")
  return Cliente.find({ $or: [{ nome: regex }, { telefone: regex }] }).sort({ nome: 1 }).lean()
}

export async function listarClientesComScore(q?: string) {
  await connectDB()
  const clientes = await listarClientes(q)
  if (clientes.length === 0) return []

  const ids = clientes.map((c) => c._id as Types.ObjectId)
  const statsRaw = await buscarStatsOS(ids)
  const statsMap = new Map(statsRaw.map((s) => [s._id.toString(), s]))

  return clientes.map((c) => {
    const stats = statsMap.get(c._id.toString()) ?? { total: 0, devolvidas: 0, canceladas: 0, retornos: 0 }
    return { ...c, score: calcularScore(stats, c.flag_problematico ?? false), _stats: stats }
  })
}

export async function buscarClientePorId(id: string) {
  await connectDB()
  const cliente = await Cliente.findById(id).lean()
  if (!cliente) return null

  const statsRaw = await buscarStatsOS([cliente._id as Types.ObjectId])
  const stats = statsRaw[0] ?? { total: 0, devolvidas: 0, canceladas: 0, retornos: 0 }
  return { ...cliente, score: calcularScore(stats, cliente.flag_problematico ?? false), _stats: stats }
}

export async function criarCliente(data: CreateClienteInput) {
  await connectDB()
  return Cliente.create(data)
}

export async function atualizarCliente(id: string, data: UpdateClienteInput) {
  await connectDB()
  return Cliente.findByIdAndUpdate(id, data, { new: true }).lean()
}

export async function listarOSDoCliente(clienteId: string) {
  await connectDB()
  return OS.find({ cliente_id: clienteId })
    .populate("central_id", "marca modelo codigo")
    .sort({ created_at: -1 })
    .lean()
}
