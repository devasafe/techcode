import mongoose, { Schema, Document } from "mongoose"

export interface ICliente extends Document {
  nome: string
  telefone: string
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
  telefone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  cpf_cnpj: String,
  endereco: String,
  observacao: String,
  flag_problematico: { type: Boolean, default: false },
  tipo_cliente: { type: String, enum: ["mecanico", "usuario"] },
  created_at: { type: Date, default: Date.now },
})

ClienteSchema.index({ nome: "text", telefone: "text" })

export default mongoose.models.Cliente ||
  mongoose.model<ICliente>("Cliente", ClienteSchema)
