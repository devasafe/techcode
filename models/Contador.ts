import mongoose, { Schema, Document } from "mongoose"

/**
 * Sequências atômicas. Existe porque o antigo `findOne(sort: -1)` para calcular
 * `numero_os` não é atômico: dois operadores registrando entrada ao mesmo tempo
 * liam o mesmo último número e a segunda gravação estourava o unique index.
 */
export interface IContador extends Document<string> {
  _id: string
  seq: number
}

const ContadorSchema = new Schema<IContador>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
})

const Contador =
  (mongoose.models.Contador as mongoose.Model<IContador>) ||
  mongoose.model<IContador>("Contador", ContadorSchema)

export async function proximoNumero(nome: string): Promise<number> {
  const doc = await Contador.findOneAndUpdate(
    { _id: nome },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  )
  return doc.seq
}

export default Contador
