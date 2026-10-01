import { connectDB } from "@/lib/db"
import Cliente from "@/models/Cliente"
import OS from "@/models/OS"
import "@/models/Central"
import type { Types } from "mongoose"
import { normalizarE164, formatarBR } from "@/lib/telefone"

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

type StatsOS = { total: number; devolvidas: number; canceladas: number; retornos: number; testes: number; concluidas: number }

function calcularScore(stats: StatsOS, flagProblematico: boolean): ScoreCliente {
  if (flagProblematico) return "vermelho"
  if (stats.total === 0) return "verde"
  const ruim = stats.devolvidas * 1.5 + stats.testes * 1.5 + stats.retornos * 1 + stats.canceladas * 0.3
  const bom = stats.concluidas * 0.5
  const pontos = Math.max(0, ruim - bom)
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
        concluidas: { $sum: { $cond: [{ $eq: ["$status", "concluida"] }, 1, 0] } },
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
    const stats = statsMap.get(c._id.toString()) ?? { total: 0, devolvidas: 0, canceladas: 0, retornos: 0, testes: 0, concluidas: 0 }
    return { ...c, score: calcularScore(stats, c.flag_problematico ?? false), _stats: stats }
  })
}

export async function buscarClientePorId(id: string) {
  await connectDB()
  const cliente = await Cliente.findById(id).lean()
  if (!cliente) return null

  const statsRaw = await buscarStatsOS([cliente._id as Types.ObjectId])
  const stats = statsRaw[0] ?? { total: 0, devolvidas: 0, canceladas: 0, retornos: 0, testes: 0, concluidas: 0 }
  return { ...cliente, score: calcularScore(stats, cliente.flag_problematico ?? false), _stats: stats }
}

export async function criarCliente(data: CreateClienteInput) {
  await connectDB()
  return Cliente.create(data)
}

export async function atualizarCliente(id: string, data: UpdateClienteInput) {
  await connectDB()
  return Cliente.findByIdAndUpdate(id, data, { returnDocument: "after" }).lean()
}

export async function listarOSDoCliente(clienteId: string) {
  await connectDB()
  return OS.find({ cliente_id: clienteId })
    .populate("central_id", "marca modelo codigo apelido status_catalogo")
    .sort({ created_at: -1 })
    .lean()
}

/**
 * Cria (ou reaproveita) cliente a partir do telefone, que é a única informação
 * que a bancada tem quando chega mensagem de número desconhecido.
 *
 * O nome não é exigido: fica o telefone formatado até alguém confirmar. E nome
 * confirmado por humano nunca é sobrescrito pela máquina — é o que protege o
 * cadastro do `profile.name` do WhatsApp, que o usuário escolhe e pode mudar.
 *
 * Depende de `telefone_e164` estar preenchido nos clientes antigos; quem faz
 * isso é `scripts/migrar-fase0.ts`.
 */
export async function obterOuCriarClientePorTelefone(
  telefoneBruto: string,
  opts: {
    nome?: string
    origem?: "manual" | "entrada_rapida" | "whatsapp"
    nome_whatsapp?: string
  } = {}
) {
  await connectDB()

  const e164 = normalizarE164(telefoneBruto)
  if (!e164) throw new Error("Telefone inválido")

  const nomeInformado = opts.nome?.trim() || ""

  const upsert = {
    $setOnInsert: {
      telefone_e164: e164,
      telefone: formatarBR(e164),
      nome: nomeInformado || formatarBR(e164),
      nome_confirmado: Boolean(nomeInformado),
      origem: opts.origem ?? "manual",
      ...(opts.nome_whatsapp ? { nome_whatsapp: opts.nome_whatsapp } : {}),
      created_at: new Date(),
    },
  }

  let cliente
  try {
    cliente = await Cliente.findOneAndUpdate({ telefone_e164: e164 }, upsert, {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    })
  } catch (err) {
    // Dois operadores registrando o mesmo número novo no mesmo instante: o
    // índice único deixa passar um só, e o outro relê o que acabou de ser criado.
    if ((err as { code?: number }).code !== 11000) throw err
    cliente = await Cliente.findOne({ telefone_e164: e164 })
  }
  if (!cliente) throw new Error("Falha ao obter cliente por telefone")

  // Nome chegou depois, num cliente que ainda não tinha nome de gente.
  if (nomeInformado && !cliente.nome_confirmado) {
    cliente.nome = nomeInformado
    cliente.nome_confirmado = true
    await cliente.save()
  }

  return cliente
}

/** Marca o nome como conferido por humano, blindando-o contra a máquina. */
export async function confirmarNomeCliente(id: string, nome: string) {
  await connectDB()
  return Cliente.findByIdAndUpdate(
    id,
    { nome: nome.trim(), nome_confirmado: true },
    { returnDocument: "after" }
  ).lean()
}

/** Os que a bancada mais usa, para o seletor já vir preenchido sem digitar nada. */
export async function listarClientesRecentes(limite = 5) {
  await connectDB()
  const recentes = await OS.aggregate<{ _id: Types.ObjectId; ultima: Date }>([
    { $group: { _id: "$cliente_id", ultima: { $max: "$created_at" } } },
    { $sort: { ultima: -1 } },
    { $limit: limite },
  ])
  if (!recentes.length) return []
  const ids = recentes.map((r) => r._id)
  const clientes = await Cliente.find({ _id: { $in: ids } }).lean()
  const porId = new Map(clientes.map((c) => [String(c._id), c]))
  return ids.map((id) => porId.get(String(id))).filter(Boolean)
}
