import { createHash } from "crypto"
import { Types } from "mongoose"
import { connectDB } from "@/lib/db"
import ArquivoECU, { type IArquivoECU, type MemoriaECU, type PapelArquivo } from "@/models/ArquivoECU"
import OS, { type IOS } from "@/models/OS"
import "@/models/Central"
import "@/models/Cliente"
import { guardar, remover, STORAGE_ATUAL } from "@/lib/storage"
import { nomeDeDownload } from "@/lib/nome-arquivo"

export type AnexarInput = {
  memoria: MemoriaECU
  papel: PapelArquivo
  buffer: Buffer
  nome_original: string
  mime?: string
  observacao?: string
}

export type ResultadoAnexo = {
  arquivo: IArquivoECU
  /** Já existia um binário idêntico nesta OS. O arquivo é gravado de todo jeito. */
  duplicado: boolean
}

/**
 * Anexa um binário lido da central a uma OS.
 *
 * `central_id` e `cliente_id` são lidos DA OS, nunca do corpo da requisição.
 * É essa regra que garante que o arquivo nunca se amarra ao carro errado — o
 * risco é gravar numa ECU o arquivo de outro veículo.
 */
export async function anexarArquivoECU(
  os_id: string,
  input: AnexarInput,
  ctx: { usuario_id?: string } = {}
): Promise<ResultadoAnexo> {
  await connectDB()

  const os = (await OS.findById(os_id)) as IOS | null
  if (!os) throw new Error("OS não encontrada")
  if (!os.central_id || !os.cliente_id) {
    throw new Error("OS sem central ou cliente — não dá para vincular o arquivo")
  }

  const sha256 = createHash("sha256").update(input.buffer).digest("hex")

  // Mesmo binário já anexado nesta OS: avisa, mas não impede (pode ser o mesmo
  // conteúdo com papel diferente, e barrar travaria a bancada).
  const jaExiste = await ArquivoECU.exists({ os_id, sha256 })

  const ref = await guardar(input.buffer, {
    pasta: `techcode/ecu/${String(os.central_id)}/os-${os.numero_os}`,
  })

  const arquivo = await ArquivoECU.create({
    os_id,
    central_id: os.central_id,
    cliente_id: os.cliente_id,
    memoria: input.memoria,
    papel: input.papel,
    nome_original: input.nome_original,
    url: ref.url,
    public_id: ref.public_id,
    storage: ref.storage || STORAGE_ATUAL,
    resource_type: ref.resource_type,
    bytes: ref.bytes,
    mime: input.mime,
    sha256,
    observacao: input.observacao,
    criado_por: ctx.usuario_id,
  })

  return { arquivo, duplicado: Boolean(jaExiste) }
}

/** Os arquivos de uma OS, na ordem em que a bancada pensa: flash antes de eeprom. */
export async function listarPorOS(os_id: string) {
  await connectDB()
  const arquivos = await ArquivoECU.find({ os_id }).sort({ created_at: 1 }).lean()
  const ordem: Record<string, number> = { flash: 0, eeprom: 1 }
  return arquivos.sort(
    (a, b) =>
      (ordem[a.memoria] ?? 9) - (ordem[b.memoria] ?? 9) ||
      (a.papel === "original" ? -1 : 1) - (b.papel === "original" ? -1 : 1)
  )
}

/**
 * Gaveta da central: os arquivos daquele MODELO, agrupados por OS.
 *
 * O agrupamento não é estético — é o requisito de segurança. Nenhum binário
 * aparece solto: cada grupo diz de qual OS, cliente e data veio.
 */
export async function listarPorCentral(central_id: string, limite = 50) {
  await connectDB()
  const arquivos = await ArquivoECU.find({ central_id })
    .populate("cliente_id", "nome telefone_e164")
    .populate("os_id", "numero_os created_at closed_at status")
    .sort({ created_at: -1 })
    .limit(limite * 4) // até 4 arquivos por leitura
    .lean()

  return agruparPorOS(arquivos)
}

/** Gaveta do cliente: os arquivos dele, agrupados por leitura. */
export async function listarPorCliente(cliente_id: string, limite = 50) {
  await connectDB()
  const arquivos = await ArquivoECU.find({ cliente_id })
    .populate("central_id", "marca modelo codigo apelido")
    .populate("os_id", "numero_os created_at closed_at status")
    .sort({ created_at: -1 })
    .limit(limite * 4)
    .lean()

  return agruparPorOS(arquivos)
}

type ArquivoPopulado = Record<string, unknown> & {
  os_id?: unknown
  cliente_id?: unknown
  central_id?: unknown
}

function agruparPorOS(arquivos: ArquivoPopulado[]) {
  const grupos = new Map<
    string,
    { os: unknown; cliente: unknown; central: unknown; arquivos: ArquivoPopulado[] }
  >()

  for (const a of arquivos) {
    const os = a.os_id as { _id?: unknown } | null
    const chave = String((os && os._id) ?? a.os_id ?? "sem-os")
    if (!grupos.has(chave)) {
      grupos.set(chave, {
        os: a.os_id,
        cliente: a.cliente_id,
        central: a.central_id,
        arquivos: [],
      })
    }
    grupos.get(chave)!.arquivos.push(a)
  }

  return Array.from(grupos.values())
}

/** Remove o arquivo do armazenamento e do banco. Só dentro da OS informada. */
export async function removerArquivoECU(os_id: string, arquivo_id: string) {
  await connectDB()
  if (!Types.ObjectId.isValid(arquivo_id)) return null

  // O filtro inclui `os_id`: o id de um arquivo de outra OS não serve aqui.
  const arquivo = await ArquivoECU.findOne({ _id: arquivo_id, os_id })
  if (!arquivo) return null

  try {
    await remover({
      public_id: arquivo.public_id,
      resource_type: arquivo.resource_type,
      storage: arquivo.storage,
    })
  } catch {
    // Falha no armazenamento não impede remover a referência do banco.
  }

  await ArquivoECU.deleteOne({ _id: arquivo._id })
  return arquivo
}

/** Nome do download, montado com os dados da OS. Ver `lib/storage`. */
export async function nomeParaDownload(arquivo_id: string): Promise<string | null> {
  await connectDB()
  const arquivo = await ArquivoECU.findById(arquivo_id)
    .populate("central_id", "marca modelo apelido")
    .populate("cliente_id", "nome")
    .populate("os_id", "numero_os")
    .lean()
  if (!arquivo) return null

  const central = arquivo.central_id as { modelo?: string; apelido?: string } | null
  const cliente = arquivo.cliente_id as { nome?: string } | null
  const os = arquivo.os_id as { numero_os?: number } | null

  return nomeDeDownload({
    numero_os: os?.numero_os ?? 0,
    modelo: central?.modelo || central?.apelido,
    cliente: cliente?.nome,
    memoria: arquivo.memoria,
    papel: arquivo.papel,
    nome_original: arquivo.nome_original,
  })
}
