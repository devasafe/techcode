import mongoose, { Schema, Document, Types } from "mongoose"
import type { OSStatus, TipoDevolucao } from "@/types"

export interface IRetornoGarantia {
  data: Date
  descricao: string
  tecnico_id: Types.ObjectId
}

export interface IDevolucao {
  tipo: TipoDevolucao
  motivo: string
  valor_reembolsado?: number
  central_adquirida?: string
  custo_central?: number
  novo_valor_cobrado?: number
  data: Date
}

export interface IOS extends Document {
  numero_os: number
  cliente_id: Types.ObjectId
  central_id: Types.ObjectId
  tecnico_id?: Types.ObjectId
  status: OSStatus
  defeito_descricao: string
  solucao_descricao?: string
  motivo_cancelamento?: string
  fotos: string[]
  pecas: { nome: string; custo: number }[]
  valor_cobrado: number
  custo_total_pecas: number
  lucro_liquido: number
  garantia_dias: number
  garantia_ate?: Date
  retornos_garantia: IRetornoGarantia[]
  devolucao?: IDevolucao
  created_at: Date
  closed_at?: Date
}

const OSSchema = new Schema<IOS>({
  numero_os: { type: Number, unique: true },
  cliente_id: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
  central_id: { type: Schema.Types.ObjectId, ref: "Central", required: true },
  tecnico_id: { type: Schema.Types.ObjectId, ref: "Usuario" },
  status: {
    type: String,
    enum: ["aberta", "na_fila", "em_andamento", "concluida", "devolvida", "substituida", "cancelada"],
    default: "aberta",
  },
  defeito_descricao: { type: String, required: true },
  solucao_descricao: String,
  motivo_cancelamento: String,
  fotos: [String],
  pecas: [{ nome: String, custo: Number }],
  valor_cobrado: { type: Number, default: 0 },
  custo_total_pecas: { type: Number, default: 0 },
  lucro_liquido: { type: Number, default: 0 },
  garantia_dias: { type: Number, default: 0 },
  garantia_ate: Date,
  retornos_garantia: [
    {
      data: { type: Date, default: Date.now },
      descricao: String,
      tecnico_id: { type: Schema.Types.ObjectId, ref: "Usuario" },
    },
  ],
  devolucao: {
    tipo: { type: String, enum: ["reembolso", "substituicao"] },
    motivo: String,
    valor_reembolsado: Number,
    central_adquirida: String,
    custo_central: Number,
    novo_valor_cobrado: Number,
    data: Date,
  },
  created_at: { type: Date, default: Date.now },
  closed_at: Date,
})

OSSchema.pre("save", async function () {
  if (this.isNew) {
    const last = await mongoose
      .model("OS")
      .findOne({}, { numero_os: 1 }, { sort: { numero_os: -1 } })
    this.numero_os = last ? last.numero_os + 1 : 1
  }
})

export default mongoose.models.OS || mongoose.model<IOS>("OS", OSSchema)
