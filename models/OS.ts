import mongoose, { Schema, Document, Types } from "mongoose"
import type { OSStatus, TipoDevolucao } from "@/types"
import { MidiaSchema, type IMidia } from "./Midia"
import { proximoNumero } from "./Contador"

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
  defeito_descricao?: string
  /** Escrito pela transcricao. Separado para nunca sobrescrever o texto do humano. */
  defeito_transcrito?: string
  tipo_cliente?: "mecanico" | "usuario"
  tipo_os?: "reparo" | "teste"
  solucao_descricao?: string
  /** Rótulo curto do serviço, normalizado — é o que alimenta os chips de saída.
   *  Convive com `solucao_descricao`, que é texto livre. */
  servico_tag?: string
  motivo_cancelamento?: string
  /** Legado: so URLs. Midia nova vai em `midias`, que guarda public_id. */
  fotos: string[]
  midias: IMidia[]
  pecas: { nome: string; custo: number }[]
  valor_cobrado: number
  custo_total_pecas: number
  lucro_liquido: number
  garantia_dias: number
  garantia_ate?: Date
  retornos_garantia: IRetornoGarantia[]
  devolucao?: IDevolucao
  pago: boolean
  created_at: Date
  closed_at?: Date
  /** Enviada pelo cliente para que duplo toque ou retry nao criem duas OS. */
  chave_idempotencia?: string
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
  defeito_descricao: String,
  defeito_transcrito: String,
  tipo_cliente: { type: String, enum: ["mecanico", "usuario"] },
  tipo_os: { type: String, enum: ["reparo", "teste"] },
  solucao_descricao: String,
  servico_tag: { type: String, trim: true },
  motivo_cancelamento: String,
  fotos: [String],
  midias: { type: [MidiaSchema], default: [] },
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
  pago: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  closed_at: Date,
  chave_idempotencia: { type: String, unique: true, sparse: true },
})

// Filtro de listarOSDoCliente, listarReparosDaCentral, buscarStatsOS e das duas
// gavetas. Antes só existia índice em numero_os e chave_idempotencia.
OSSchema.index({ cliente_id: 1, created_at: -1 })
OSSchema.index({ central_id: 1, closed_at: -1 })

OSSchema.pre("save", async function () {
  if (this.isNew && this.numero_os == null) {
    this.numero_os = await proximoNumero("os")
  }
})

export default mongoose.models.OS || mongoose.model<IOS>("OS", OSSchema)
