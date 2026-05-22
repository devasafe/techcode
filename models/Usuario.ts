import mongoose, { Schema, Document } from "mongoose"
import type { Perfil } from "@/types"

export interface IUsuario extends Document {
  nome: string
  email: string
  senha: string
  perfis: Perfil[]
  comissao_pct: number
  ativo: boolean
  created_at: Date
}

const UsuarioSchema = new Schema<IUsuario>({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senha: { type: String, required: true },
  perfis: {
    type: [String],
    enum: ["admin", "atendente", "tecnico"],
    required: true,
    validate: (v: string[]) => v.length > 0,
  },
  comissao_pct: { type: Number, default: 0, min: 0, max: 100 },
  ativo: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
})

export default mongoose.models.Usuario ||
  mongoose.model<IUsuario>("Usuario", UsuarioSchema)
