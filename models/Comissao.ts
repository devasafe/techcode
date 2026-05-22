import mongoose, { Schema, Document, Types } from "mongoose"

export interface IComissao extends Document {
  os_id: Types.ObjectId
  tecnico_id: Types.ObjectId
  valor_os: number
  pct_comissao: number
  valor_comissao: number
  pago: boolean
  data_pagamento?: Date
}

const ComissaoSchema = new Schema<IComissao>({
  os_id: { type: Schema.Types.ObjectId, ref: "OS", required: true },
  tecnico_id: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
  valor_os: { type: Number, required: true },
  pct_comissao: { type: Number, required: true },
  valor_comissao: { type: Number, required: true },
  pago: { type: Boolean, default: false },
  data_pagamento: Date,
})

export default mongoose.models.Comissao ||
  mongoose.model<IComissao>("Comissao", ComissaoSchema)
