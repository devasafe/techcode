import { Types } from "mongoose"
import { connectDB } from "@/lib/db"
import Central from "@/models/Central"
import OS from "@/models/OS"
import "@/models/Cliente"
import { ADD_FINANCEIRO, ADD_LUCRO, matchFinanceiro } from "./financeiro.stages"

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

/**
 * Campos que um update de central pode tocar. Lista explícita de propósito:
 * passar o body cru para o `findByIdAndUpdate` permitiria injetar
 * `status_catalogo`, `criado_por`, `midias` ou operadores como `$unset`.
 */
function camposPermitidos(data: UpdateCentralInput) {
  const update: Record<string, unknown> = {}
  if (data.marca !== undefined) update.marca = data.marca
  if (data.modelo !== undefined) update.modelo = data.modelo
  if (data.codigo !== undefined) update.codigo = data.codigo
  if (data.apelido !== undefined) update.apelido = data.apelido
  if (data.tipo_modulo !== undefined) update.tipo_modulo = data.tipo_modulo
  if (data.descricao !== undefined) update.descricao = data.descricao
  return update
}

export async function atualizarCentral(id: string, data: UpdateCentralInput) {
  await connectDB()
  return Central.findByIdAndUpdate(id, { $set: camposPermitidos(data) }, {
    returnDocument: "after",
  }).lean()
}

/**
 * O histórico de reparos daquele modelo.
 *
 * Inclui `substituida` e `devolvida`, não só `concluida`: uma central que
 * precisou ser trocada, ou que voltou e foi reembolsada, é exatamente o
 * conhecimento que a bancada quer ver antes de aceitar a próxima igual.
 */
export async function listarReparosDaCentral(centralId: string) {
  await connectDB()
  return OS.find({
    central_id: centralId,
    status: { $in: ["concluida", "substituida", "devolvida"] },
  })
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

/**
 * Promove rascunho a item de catálogo, quando a bancada está parada.
 *
 * Só age sobre documento que ESTÁ em rascunho: é o que permite liberar esta
 * ação para qualquer perfil sem abrir edição de catálogo já confirmado.
 * Devolve null se a peça não existe ou já foi confirmada.
 */
export async function confirmarCentral(id: string, data: UpdateCentralInput) {
  await connectDB()
  return Central.findOneAndUpdate(
    { _id: id, status_catalogo: "rascunho" },
    { $set: { ...camposPermitidos(data), status_catalogo: "confirmada" } },
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

/**
 * Busca no acervo. Usa o índice de texto (que cobre apelido, marca, modelo,
 * código e `termos_busca` — onde as transcrições vão), com queda para regex
 * quando o termo é curto demais para o `$text` ser útil.
 *
 * `$text` roda no mongodb-memory-server, então é testável. Atlas Search seria
 * mais poderoso, mas ficaria fora do harness de testes e exige configurar
 * índice no painel — para centenas ou milhares de peças não se paga.
 */
export async function buscarAcervo(
  q?: string,
  opts: { incluirRascunhos?: boolean; limite?: number } = {}
) {
  await connectDB()
  const limite = opts.limite ?? 60
  const base = opts.incluirRascunhos ? {} : { status_catalogo: { $ne: "rascunho" } }

  const termo = (q ?? "").trim()
  if (!termo) {
    return Central.find(base).sort({ created_at: -1 }).limit(limite).lean()
  }

  // Termo curto: regex acha "4GV" ou "Gol" melhor que a busca por palavra.
  if (termo.length < 4) {
    const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(escapado, "i")
    return Central.find({
      ...base,
      $or: [
        { apelido: regex },
        { marca: regex },
        { modelo: regex },
        { codigo: regex },
        { termos_busca: regex },
      ],
    })
      .limit(limite)
      .lean()
  }

  const porTexto = await Central.find(
    { ...base, $text: { $search: termo } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limite)
    .lean()

  if (porTexto.length) return porTexto

  // `$text` casa palavra inteira; "capacit" não acha "capacitor". O regex pega.
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(escapado, "i")
  return Central.find({
    ...base,
    $or: [
      { apelido: regex },
      { marca: regex },
      { modelo: regex },
      { codigo: regex },
      { termos_busca: regex },
    ],
  })
    .limit(limite)
    .lean()
}

/** Quantas peças esperam identificação — para o badge na navegação. */
export async function contarRascunhos() {
  await connectDB()
  return Central.countDocuments({ status_catalogo: "rascunho" })
}

/**
 * Rascunhos com o que ajuda a identificar: as fotos e os áudios transcritos das
 * OS que passaram por essa peça. Sem isso a fila de identificação seria uma
 * lista de "Peça #26" sem contexto nenhum.
 */
export async function listarRascunhosComContexto(limite = 50) {
  await connectDB()
  const rascunhos = await Central.find({ status_catalogo: "rascunho" })
    .sort({ created_at: -1 })
    .limit(limite)
    .lean()

  if (!rascunhos.length) return []

  const ids = rascunhos.map((r) => r._id)
  const oss = await OS.find({ central_id: { $in: ids } })
    // Só o nome: a fila de identificação não precisa de telefone, e expor
    // menos é melhor que expor por descuido.
    .populate("cliente_id", "nome")
    .sort({ created_at: -1 })
    .lean()

  return rascunhos.map((r) => {
    const minhas = oss.filter((o) => String(o.central_id) === String(r._id))
    const midias = minhas.flatMap((o) => o.midias ?? [])
    return {
      ...r,
      os: minhas.map((o) => ({
        _id: String(o._id),
        numero_os: o.numero_os,
        cliente: o.cliente_id,
        defeito: o.defeito_descricao || o.defeito_transcrito || null,
        created_at: o.created_at,
      })),
      fotos: [
        ...midias.filter((m) => m.tipo === "foto").map((m) => m.url),
        ...minhas.flatMap((o) => o.fotos ?? []),
      ],
      audios: midias
        .filter((m) => m.tipo === "audio")
        .map((m) => ({
          url: m.url,
          papel: m.papel ?? "defeito",
          texto: m.transcricao?.texto ?? null,
        })),
    }
  })
}

/**
 * Resumo da gaveta da central: quantas vezes passou, para quantos clientes
 * diferentes, e quanto esse modelo já rendeu.
 *
 * Usa os mesmos stages do /financeiro — reembolso desconta, substituída usa os
 * valores da devolução. Número de gaveta tem de fechar com número de relatório.
 */
export async function resumoDaCentral(central_id: string) {
  await connectDB()

  const [resumo] = await OS.aggregate<{
    n_reparos: number
    receita: number
    custo: number
    lucro: number
    clientes: unknown[]
  }>([
    { $match: { central_id: new Types.ObjectId(central_id), ...matchFinanceiro() } },
    ADD_FINANCEIRO,
    ADD_LUCRO,
    {
      $group: {
        _id: null,
        n_reparos: { $sum: 1 },
        receita: { $sum: "$_receita" },
        custo: { $sum: "$_custo" },
        lucro: { $sum: "$_lucro" },
        clientes: { $addToSet: "$cliente_id" },
      },
    },
  ])

  const defeitos = await OS.aggregate<{ _id: string; n: number }>([
    {
      $match: {
        central_id: new Types.ObjectId(central_id),
        servico_tag: { $nin: [null, ""] },
      },
    },
    { $group: { _id: "$servico_tag", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 3 },
  ])

  return {
    n_reparos: resumo?.n_reparos ?? 0,
    n_clientes: resumo?.clientes?.length ?? 0,
    receita: resumo?.receita ?? 0,
    custo: resumo?.custo ?? 0,
    lucro: resumo?.lucro ?? 0,
    servicos_comuns: defeitos.map((d) => ({ servico: d._id, vezes: d.n })),
  }
}
