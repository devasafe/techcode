import mongoose, { Schema, Document } from "mongoose"

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

export interface ICentral extends Document {
  marca: string
  modelo: string
  codigo: string
  tipo_modulo?: TipoModulo
  descricao?: string
  arquivos: IArquivoCentral[]
}

const ArquivoSchema = new Schema<IArquivoCentral>({
  nome: { type: String, required: true },
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  tipo: { type: String, enum: ["imagem", "pdf", "outro"], default: "outro" },
  tamanho: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
})

const CentralSchema = new Schema<ICentral>({
  marca: { type: String, required: true, trim: true },
  modelo: { type: String, required: true, trim: true },
  codigo: { type: String, required: true, trim: true, uppercase: true },
  tipo_modulo: { type: String, enum: ["central", "abs", "painel", "body_computer", "airbag", "outro"] },
  descricao: String,
  arquivos: { type: [ArquivoSchema], default: [] },
})

CentralSchema.index({ modelo: "text", codigo: "text", marca: "text" })

export default mongoose.models.Central ||
  mongoose.model<ICentral>("Central", CentralSchema)
