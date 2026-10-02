import mongoose, { Schema, Document, Types } from "mongoose"

/**
 * Arquivo lido de uma central: o binário da ECU.
 *
 * É o ativo mais valioso do laboratório, e tem uma regra de segurança do mundo
 * real por trás da modelagem: o arquivo pertence à LEITURA, não ao modelo. O
 * original de um 7.4.9R lido do Peugeot do João carrega o imobilizador, o km e
 * o VIN DELE — gravar esse arquivo no carro do Pedro pode estragar o carro.
 *
 * Por isso `os_id`, `central_id` e `cliente_id` são sempre preenchidos a partir
 * da OS pelo service, nunca a partir do corpo da requisição, e nenhuma tela
 * mostra um binário sem dizer de qual carro ele veio.
 *
 * Coleção própria (e não subdocumento de OS ou Central) porque as duas gavetas
 * consultam por caminhos diferentes — por central e por cliente — e porque o
 * ativo merece histórico próprio em vez de viver dentro de um documento que
 * outras rotinas atualizam.
 *
 * Isto NÃO substitui `Central.arquivos`, que guarda material do MODELO
 * (datasheet, pinagem, esquema): aquilo não pertence a carro nenhum.
 */

/** As duas memórias são físicas e distintas; não se misturam. */
export type MemoriaECU = "flash" | "eeprom"
/** Como veio, e como ficou. */
export type PapelArquivo = "original" | "modificado"

export interface IArquivoECU extends Document {
  _id: Types.ObjectId
  os_id: Types.ObjectId
  central_id: Types.ObjectId
  cliente_id: Types.ObjectId
  memoria: MemoriaECU
  papel: PapelArquivo
  /** Nome que o arquivo tinha na máquina. Guardado, mas não é o nome do download. */
  nome_original: string
  url: string
  public_id: string
  /** Qual backend guardou. Permite Cloudinary e MinIO coexistirem numa migração. */
  storage: string
  resource_type: string
  bytes: number
  mime?: string
  /** Para avisar quando o mesmo binário é anexado duas vezes. */
  sha256: string
  observacao?: string
  criado_por?: Types.ObjectId
  created_at: Date
}

const ArquivoECUSchema = new Schema<IArquivoECU>({
  os_id: { type: Schema.Types.ObjectId, ref: "OS", required: true },
  central_id: { type: Schema.Types.ObjectId, ref: "Central", required: true },
  cliente_id: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
  memoria: { type: String, enum: ["flash", "eeprom"], required: true },
  papel: { type: String, enum: ["original", "modificado"], required: true },
  nome_original: { type: String, required: true },
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  storage: { type: String, default: "cloudinary" },
  resource_type: { type: String, default: "raw" },
  bytes: { type: Number, default: 0 },
  mime: String,
  sha256: { type: String, required: true },
  observacao: String,
  criado_por: { type: Schema.Types.ObjectId, ref: "Usuario" },
  created_at: { type: Date, default: Date.now },
})

// As duas gavetas: por central e por cliente. Índice direto em cada caminho.
ArquivoECUSchema.index({ central_id: 1, created_at: -1 })
ArquivoECUSchema.index({ cliente_id: 1, created_at: -1 })
ArquivoECUSchema.index({ os_id: 1, memoria: 1, papel: 1 })
// Detecta o mesmo binário anexado duas vezes na mesma OS.
ArquivoECUSchema.index({ os_id: 1, sha256: 1 })

export default mongoose.models.ArquivoECU ||
  mongoose.model<IArquivoECU>("ArquivoECU", ArquivoECUSchema)
