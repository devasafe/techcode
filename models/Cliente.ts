import mongoose, { Schema, Document } from "mongoose"

export type OrigemCliente = "manual" | "entrada_rapida" | "whatsapp"

export interface ICliente extends Document {
  /** Continua obrigatório: telas e impressão dependem dele. Quando ninguém
   *  digitou nada, o service preenche com o telefone formatado. */
  nome: string
  /** Marca se um humano confirmou o nome. Protege contra a máquina sobrescrever. */
  nome_confirmado: boolean
  nome_whatsapp?: string
  telefone: string
  /** Telefone normalizado (E.164). É a chave de deduplicação. */
  telefone_e164?: string
  origem: OrigemCliente
  email?: string
  cpf_cnpj?: string
  endereco?: string
  observacao?: string
  flag_problematico: boolean
  tipo_cliente?: "mecanico" | "usuario"
  created_at: Date
}

const ClienteSchema = new Schema<ICliente>({
  nome: { type: String, required: true, trim: true },
  nome_confirmado: { type: Boolean, default: false },
  nome_whatsapp: String,
  telefone: { type: String, required: true, trim: true },
  telefone_e164: { type: String, trim: true },
  origem: { type: String, enum: ["manual", "entrada_rapida", "whatsapp"], default: "manual" },
  email: { type: String, trim: true, lowercase: true },
  cpf_cnpj: String,
  endereco: String,
  observacao: String,
  flag_problematico: { type: Boolean, default: false },
  tipo_cliente: { type: String, enum: ["mecanico", "usuario"] },
  created_at: { type: Date, default: Date.now },
})

ClienteSchema.index({ nome: "text", telefone: "text" })
// Unique + sparse: medido em producao (19 clientes, 0 duplicatas apos normalizar).
// Os 4 telefones que nao normalizam ficam sem o campo, e sparse os ignora.
ClienteSchema.index({ telefone_e164: 1 }, { unique: true, sparse: true })

export default mongoose.models.Cliente ||
  mongoose.model<ICliente>("Cliente", ClienteSchema)
