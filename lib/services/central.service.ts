import { connectDB } from "@/lib/db"
import Central from "@/models/Central"
import OS from "@/models/OS"
import "@/models/Cliente"

export type CreateCentralInput = {
  marca?: string
  modelo?: string
  codigo?: string
  apelido?: string
  tipo_modulo?: string
  descricao?: string
  status_catalogo?: "rascunho" | "confirmada"
  origem?: "manual" | "entrada_rapida" | "whatsapp"
  criado_por?: string
}

export type UpdateCentralInput = Partial<CreateCentralInput>

/**
 * Por padrão esconde rascunhos, senão "Peça #47" polui o autocomplete de OS.
 * Usa `$ne: "rascunho"` em vez de `$eq: "confirmada"` de propósito: documentos
 * criados antes desta fase não têm o campo e precisam continuar aparecendo.
 */
export async function listarCentrais(
  q?: string,
  opts: { incluirRascunhos?: boolean } = {}
) {
  await connectDB()
  const base = opts.incluirRascunhos ? {} : { status_catalogo: { $ne: "rascunho" } }
  if (!q) return Central.find(base).sort({ marca: 1, modelo: 1 }).lean()
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(escaped, "i")
  return Central.find({
    ...base,
    $or: [{ marca: regex }, { modelo: regex }, { codigo: regex }, { apelido: regex }],
  }).sort({ marca: 1, modelo: 1 }).lean()
}

export async function buscarCentralPorId(id: string) {
  await connectDB()
  const central = await Central.findById(id).lean()
  if (!central) return null
  return { ...central, arquivos: central.arquivos ?? [] }
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

/**
 * Peça que entra na bancada sem identificação: nenhum campo é obrigatório.
 * É o que destrava "chegou um 4GV sem etiqueta legível".
 */
export async function criarCentralRascunho(data: {
  apelido?: string
  descricao?: string
  origem?: "manual" | "entrada_rapida" | "whatsapp"
  criado_por?: string
}) {
  await connectDB()
  return Central.create({
    apelido: data.apelido,
    descricao: data.descricao,
    status_catalogo: "rascunho",
    origem: data.origem ?? "entrada_rapida",
    criado_por: data.criado_por,
  })
}

/** Promove rascunho a item de catálogo, quando a bancada está parada. */
export async function confirmarCentral(
  id: string,
  data: { marca?: string; modelo?: string; codigo?: string; tipo_modulo?: string; apelido?: string }
) {
  await connectDB()
  return Central.findByIdAndUpdate(
    id,
    { ...data, status_catalogo: "confirmada" },
    { returnDocument: "after" }
  ).lean()
}

/** A fila de "peças a identificar". */
export async function listarRascunhos() {
  await connectDB()
  return Central.find({ status_catalogo: "rascunho" }).sort({ created_at: -1 }).lean()
}

/** Acrescenta termos ao blob que o índice de texto varre (transcrição, etiqueta). */
export async function acrescentarTermosBusca(id: string, termos: string) {
  await connectDB()
  if (!termos.trim()) return null
  const central = await Central.findById(id)
  if (!central) return null
  central.termos_busca = [central.termos_busca, termos].filter(Boolean).join(" ")
  await central.save()
  return central
}
