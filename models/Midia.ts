import { Schema, Document, Types } from "mongoose"

export type TipoMidia = "foto" | "audio"
/** O que o áudio descreve. Define para onde a transcrição vai. */
export type PapelMidia = "peca" | "defeito"
export type OrigemMidia = "camera" | "upload" | "whatsapp"
export type StatusTranscricao = "pendente" | "processando" | "concluida" | "falhou"

export interface ITranscricao {
  status: StatusTranscricao
  texto?: string
  texto_original?: string
  provedor?: string
  modelo?: string
  tentativas: number
  claim_at?: Date
  erro?: string
  corrigida_por?: Types.ObjectId
}

export interface IMidia extends Document {
  _id: Types.ObjectId
  tipo: TipoMidia
  /** Só em áudio. Ausente nas mídias criadas antes disto = "defeito". */
  papel?: PapelMidia
  url: string
  public_id: string
  /** Guardado porque o delete no Cloudinary precisa dele. O código antigo deduzia por regex. */
  resource_type: "image" | "video" | "raw"
  mime?: string
  tamanho: number
  duracao_s?: number
  origem: OrigemMidia
  wa_media_id?: string
  transcricao?: ITranscricao
  criado_por?: Types.ObjectId
  created_at: Date
}

const TranscricaoSchema = new Schema<ITranscricao>(
  {
    status: {
      type: String,
      enum: ["pendente", "processando", "concluida", "falhou"],
      default: "pendente",
    },
    texto: String,
    texto_original: String,
    provedor: String,
    modelo: String,
    tentativas: { type: Number, default: 0 },
    claim_at: Date,
    erro: String,
    corrigida_por: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  { _id: false }
)

export const MidiaSchema = new Schema<IMidia>({
  tipo: { type: String, enum: ["foto", "audio"], required: true },
  papel: { type: String, enum: ["peca", "defeito"] },
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  resource_type: { type: String, enum: ["image", "video", "raw"], required: true },
  mime: String,
  tamanho: { type: Number, default: 0 },
  duracao_s: Number,
  origem: { type: String, enum: ["camera", "upload", "whatsapp"], default: "upload" },
  wa_media_id: String,
  transcricao: TranscricaoSchema,
  criado_por: { type: Schema.Types.ObjectId, ref: "Usuario" },
  created_at: { type: Date, default: Date.now },
})
