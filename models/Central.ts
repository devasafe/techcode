import mongoose, { Schema, Document } from "mongoose"

export interface ICentral extends Document {
  marca: string
  modelo: string
  codigo: string
  descricao?: string
}

const CentralSchema = new Schema<ICentral>({
  marca: { type: String, required: true, trim: true },
  modelo: { type: String, required: true, trim: true },
  codigo: { type: String, required: true, trim: true, uppercase: true },
  descricao: String,
})

CentralSchema.index({ modelo: "text", codigo: "text", marca: "text" })

export default mongoose.models.Central ||
  mongoose.model<ICentral>("Central", CentralSchema)
