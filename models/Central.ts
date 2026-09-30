import mongoose, { Schema, Document, Types } from "mongoose"
import { MidiaSchema, type IMidia } from "./Midia"

export interface IArquivoCentral {
  _id?: mongoose.Types.ObjectId
  nome: string
  url: string
  public_id: string
  tipo: "imagem" | "pdf" | "outro"
  tamanho: number
  created_at: Date
}

export type TipoModulo = "central" | "abs" | "painel" | "body_computer" | "airbag" | "outro"
export type StatusCatalogo = "rascunho" | "confirmada"
export type OrigemCentral = "manual" | "entrada_rapida" | "whatsapp"

/** Leitura de etiqueta. Fica separada dos campos canônicos: sugestão não vira dado. */
export interface IEtiquetaSugerida {
  marca?: string
  modelo?: string
  codigo?: string
  confianca?: number
  caracteres_duvidosos: string[]
  raw_texto?: string
  provedor?: string
  created_at: Date
}

export interface ICentral extends Document {
  /** Sem `required`: peça velha sem etiqueta legível precisa entrar na bancada. */
  marca?: string
  modelo?: string
  codigo?: string
  /** Nome humano livre: "painel Gol 2010 chicote diferente". */
  apelido?: string
  tipo_modulo?: TipoModulo
  descricao?: string
  status_catalogo: StatusCatalogo
  origem: OrigemCentral
  criado_por?: Types.ObjectId
  /** Blob denormalizado (apelido + transcrições + etiqueta) que o índice de texto varre. */
  termos_busca?: string
  etiqueta_sugerida?: IEtiquetaSugerida
  arquivos: IArquivoCentral[]
  midias: IMidia[]
  created_at: Date
}

const ArquivoSchema = new Schema<IArquivoCentral>({
  nome: { type: String, required: true },
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  tipo: { type: String, enum: ["imagem", "pdf", "outro"], default: "outro" },
  tamanho: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
})

const EtiquetaSugeridaSchema = new Schema<IEtiquetaSugerida>(
  {
    marca: String,
    modelo: String,
    codigo: String,
    confianca: Number,
    caracteres_duvidosos: { type: [String], default: [] },
    raw_texto: String,
    provedor: String,
    created_at: { type: Date, default: Date.now },
  },
  { _id: false }
)

const CentralSchema = new Schema<ICentral>({
  marca: { type: String, trim: true },
  modelo: { type: String, trim: true },
  codigo: { type: String, trim: true, uppercase: true },
  apelido: { type: String, trim: true },
  tipo_modulo: { type: String, enum: ["central", "abs", "painel", "body_computer", "airbag", "outro"] },
  descricao: String,
  // Default "confirmada" de propósito: só quem chama criarCentralRascunho
  // quer uma peça escondida do autocomplete.
  status_catalogo: { type: String, enum: ["rascunho", "confirmada"], default: "confirmada" },
  origem: { type: String, enum: ["manual", "entrada_rapida", "whatsapp"], default: "manual" },
  criado_por: { type: Schema.Types.ObjectId, ref: "Usuario" },
  termos_busca: String,
  etiqueta_sugerida: EtiquetaSugeridaSchema,
  arquivos: { type: [ArquivoSchema], default: [] },
  midias: { type: [MidiaSchema], default: [] },
  created_at: { type: Date, default: Date.now },
})

// MongoDB aceita UM índice de texto por coleção. O antigo (modelo/codigo/marca) é
// dropado em scripts/migrar-fase0.ts antes deste ser criado.
CentralSchema.index({
  apelido: "text",
  marca: "text",
  modelo: "text",
  codigo: "text",
  termos_busca: "text",
})
CentralSchema.index({ status_catalogo: 1, created_at: -1 })

export default mongoose.models.Central ||
  mongoose.model<ICentral>("Central", CentralSchema)
